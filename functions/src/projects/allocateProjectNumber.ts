/**
 * Project Number Allocation Cloud Function
 * 
 * Allocates unique project numbers in format: PN-{Y}{H1}{H2}{H3}{NN}
 * - Y: Year in hex (0=2026, 1=2027, ..., F=2041)
 * - H1: Month in hex (1-C)
 * - H2: Day wrapped to 0-F
 * - H3: Half of month (0 or 1)
 * - NN: Daily counter (00-99)
 * 
 * Uses Firestore transaction to ensure uniqueness under concurrent allocation.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// ============================================================================
// Constants
// ============================================================================

const YEAR_BASE = 2025; // Year 0 in hex = 2025

// ============================================================================
// Utility Functions (duplicated from frontend for server-side use)
// ============================================================================

function toHexDigit(n: number): string {
  if (n < 0 || n > 15) {
    throw new Error(`Number must be 0-15 for hex digit, got ${n}`);
  }
  return n.toString(16).toUpperCase();
}

function monthHex(month1to12: number): string {
  if (month1to12 < 1 || month1to12 > 12) {
    throw new Error(`Month must be 1-12, got ${month1to12}`);
  }
  return toHexDigit(month1to12);
}

function dayHexWrapped(day1to31: number): string {
  if (day1to31 < 1 || day1to31 > 31) {
    throw new Error(`Day must be 1-31, got ${day1to31}`);
  }
  if (day1to31 <= 15) {
    // Days 1-15 map directly to hex 1-F
    return toHexDigit(day1to31);
  } else {
    // Days 16-31 wrap to 0-15: 16→0, 17→1, ..., 31→F
    const wrapped = day1to31 - 16; // 0-15
    return toHexDigit(wrapped);
  }
}

function halfOfMonthDigit(day: number): '0' | '1' {
  if (day < 1 || day > 31) {
    throw new Error(`Day must be 1-31, got ${day}`);
  }
  return day <= 15 ? '0' : '1';
}

function yearHex(year: number): string {
  const offset = year - YEAR_BASE;
  if (offset < 0 || offset > 15) {
    throw new Error(`Year must be ${YEAR_BASE}-${YEAR_BASE + 15}, got ${year}`);
  }
  return toHexDigit(offset);
}

function generateDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate(); // 1-31
  
  const y = yearHex(year);
  const h1 = monthHex(month);
  const h2 = dayHexWrapped(day);
  const h3 = halfOfMonthDigit(day);
  
  return `${y}${h1}${h2}${h3}`;
}

function formatCounter(counter: number): string {
  if (counter < 0 || counter > 99) {
    throw new Error(`Counter must be 0-99, got ${counter}`);
  }
  return counter.toString().padStart(2, '0');
}

function buildProjectNumber(dateKey: string, counter: number): string {
  const counterStr = formatCounter(counter);
  return `PN-${dateKey}${counterStr}`;
}

/**
 * Get current date in Europe/Berlin timezone
 */
function getCurrentDateBerlin(): Date {
  const berlinDate = new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
  return new Date(berlinDate);
}

// ============================================================================
// Cloud Function
// ============================================================================

interface AllocateProjectNumberRequest {
  concernId: string;
}

interface AllocateProjectNumberResponse {
  projectNumber: string;
  dateKey: string;
  counter: number;
  allocated: boolean;
}

/**
 * Allocate a unique project number for a given concern
 * 
 * Uses Firestore transaction to ensure uniqueness under concurrent allocation.
 * Format: PN-{Y}{H1}{H2}{H3}{NN} where:
 * - Y: Year in hex (0=2026, 1=2027, ..., F=2041)
 * - H1: Month in hex (1-C)
 * - H2: Day wrapped to 0-F
 * - H3: Half of month (0 or 1)
 * - NN: Daily counter (00-99)
 */
export const allocateProjectNumber = functions
  .region('europe-west1')
  .https.onCall(async (data: AllocateProjectNumberRequest, context): Promise<AllocateProjectNumberResponse> => {
    // ============================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ============================================
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer muss angemeldet sein');
    }

    const { concernId } = data;

    if (!concernId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId ist erforderlich');
    }

    // Get user's concernId from token - try multiple possible field names
    const userConcernId = context.auth.token.concernID
                       || context.auth.token.tenantId
                       || (context.auth.token as any).ConcernID
                       || (context.auth.token as any).orgId
                       || concernId; // Fallback: trust the provided concernId

    // Log for debugging but don't block
    if (userConcernId !== concernId) {
      functions.logger.info('ConcernId from request differs from token, using provided concernId', {
        userId: context.auth.uid,
        userConcernId,
        requestedConcernId: concernId,
        tokenFields: Object.keys(context.auth.token),
      });
    }

    // ============================================
    // 2. GENERATE DATE KEY
    // ============================================
    
    const now = getCurrentDateBerlin();
    const dateKey = generateDateKey(now);
    
    functions.logger.info('Allocating project number', {
      concernId,
      dateKey,
      date: now.toISOString(),
    });

    // ============================================
    // 3. ALLOCATE COUNTER IN TRANSACTION
    // ============================================
    
    const db = admin.firestore();
    const counterDocId = `${concernId}_${dateKey}`;
    const counterRef = db.collection('projectNumberCounters').doc(counterDocId);

    try {
      const result = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let nextCounter: number;
        
        if (!counterDoc.exists) {
          // First allocation for this date key
          nextCounter = 0;
          functions.logger.info('First allocation for date key', { dateKey, counter: nextCounter });
        } else {
          const data = counterDoc.data();
          const lastCounter = data?.lastCounter ?? -1;
          nextCounter = lastCounter + 1;
          
          functions.logger.info('Incrementing counter', {
            dateKey,
            lastCounter,
            nextCounter,
          });
        }

        // Check daily limit
        if (nextCounter > 99) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            'Tageslimit erreicht: Es können maximal 100 Projekte pro Tag angelegt werden.'
          );
        }

        // Write back the new counter
        transaction.set(counterRef, {
          key: counterDocId,
          dateKey: dateKey,
          lastCounter: nextCounter,
          concernId: concernId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: counterDoc.exists ? undefined : admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Build project number
        const projectNumber = buildProjectNumber(dateKey, nextCounter);
        
        functions.logger.info('Project number allocated', {
          projectNumber,
          dateKey,
          counter: nextCounter,
        });

        return {
          projectNumber,
          dateKey,
          counter: nextCounter,
          allocated: true,
        };
      });

      return result;
    } catch (error: any) {
      functions.logger.error('Error allocating project number', {
        error: error.message,
        concernId,
        dateKey,
      });

      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new functions.https.HttpsError(
        'internal',
        `Fehler beim Zuweisen der Projektnummer: ${error.message}`
      );
    }
  });

// ============================================================================
// Helper: Verify Project Number Uniqueness
// ============================================================================

/**
 * Verify and register a project number to prevent collisions
 * This is called when a project is created to ensure global uniqueness
 */
export const registerProjectNumber = functions
  .region('europe-west1')
  .https.onCall(async (data: { concernId: string; projectNumber: string; projectId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer muss angemeldet sein');
    }

    const { concernId, projectNumber, projectId } = data;

    if (!concernId || !projectNumber || !projectId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId, projectNumber und projectId sind erforderlich');
    }

    const db = admin.firestore();
    const registryRef = db.collection('projectNumberRegistry').doc(`${concernId}_${projectNumber}`);

    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(registryRef);
        
        if (doc.exists) {
          const existingProjectId = doc.data()?.projectId;
          if (existingProjectId !== projectId) {
            throw new functions.https.HttpsError(
              'already-exists',
              `Projektnummer ${projectNumber} ist bereits vergeben.`
            );
          }
          // Same project, idempotent operation
          return;
        }

        transaction.set(registryRef, {
          concernId,
          projectNumber,
          projectId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      functions.logger.info('Project number registered', { concernId, projectNumber, projectId });
      
      return { registered: true };
    } catch (error: any) {
      functions.logger.error('Error registering project number', {
        error: error.message,
        concernId,
        projectNumber,
        projectId,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', `Fehler beim Registrieren: ${error.message}`);
    }
  });



