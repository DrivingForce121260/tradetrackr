/**
 * Project Document Suffix Allocation Cloud Function
 * 
 * Allocates unique per-project document suffixes (0001-9999).
 * Uses Firestore transaction for concurrency safety.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Maximum suffix per project
const MAX_SUFFIX = 9999;

interface AllocateProjectDocumentSuffixRequest {
  concernId: string;
  projectId: string;
}

interface AllocateProjectDocumentSuffixResponse {
  suffix: number;
  allocated: boolean;
}

/**
 * Allocate a unique document suffix for a project
 * 
 * Uses Firestore transaction to ensure uniqueness under concurrent allocation.
 * Counter stored in: projectDocumentCounters/{concernId}_{projectId}
 * 
 * Suffix range: 1-9999 (formatted as 0001-9999 in designation)
 */
export const allocateProjectDocumentSuffix = functions
  .region('europe-west1')
  .https.onCall(async (data: AllocateProjectDocumentSuffixRequest, context): Promise<AllocateProjectDocumentSuffixResponse> => {
    // ============================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ============================================
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer muss angemeldet sein');
    }

    const { concernId, projectId } = data;

    if (!concernId || !projectId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId und projectId sind erforderlich');
    }

    functions.logger.info('[allocateProjectDocumentSuffix] Request:', { concernId, projectId, userId: context.auth.uid });

    // ============================================
    // 2. ALLOCATE SUFFIX IN TRANSACTION
    // ============================================
    
    const counterDocId = `${concernId}_${projectId}`;
    const counterRef = db.collection('projectDocumentCounters').doc(counterDocId);

    try {
      const result = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let nextSuffix: number;
        
        if (!counterDoc.exists) {
          // First document for this project
          nextSuffix = 1;
          functions.logger.info('[allocateProjectDocumentSuffix] First document for project:', { projectId, suffix: nextSuffix });
        } else {
          const data = counterDoc.data();
          const lastSuffix = data?.lastSuffix ?? 0;
          nextSuffix = lastSuffix + 1;
          
          functions.logger.info('[allocateProjectDocumentSuffix] Incrementing suffix:', {
            projectId,
            lastSuffix,
            nextSuffix,
          });
        }

        // Check maximum limit
        if (nextSuffix > MAX_SUFFIX) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            `Maximale Dokumentanzahl pro Projekt erreicht (${MAX_SUFFIX}).`
          );
        }

        // Write back the new counter
        transaction.set(counterRef, {
          key: counterDocId,
          concernId: concernId,
          projectId: projectId,
          lastSuffix: nextSuffix,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: counterDoc.exists ? undefined : admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        functions.logger.info('[allocateProjectDocumentSuffix] Suffix allocated:', {
          projectId,
          suffix: nextSuffix,
        });

        return {
          suffix: nextSuffix,
          allocated: true,
        };
      });

      return result;
    } catch (error: any) {
      functions.logger.error('[allocateProjectDocumentSuffix] Error:', {
        error: error.message,
        concernId,
        projectId,
      });

      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new functions.https.HttpsError(
        'internal',
        `Fehler beim Zuweisen der Dokumentnummer: ${error.message}`
      );
    }
  });

/**
 * Helper function: Format suffix as 4-digit string (0001-9999)
 */
export function formatSuffix(suffix: number): string {
  if (suffix < 1 || suffix > MAX_SUFFIX) {
    throw new Error(`Suffix must be 1-${MAX_SUFFIX}, got ${suffix}`);
  }
  return suffix.toString().padStart(4, '0');
}

/**
 * Helper function: Build document designation
 * Format: {projectNumber}-{suffix4}
 * Example: PN-0AA012-0001
 */
export function buildDocumentDesignation(projectNumber: string, suffix: number): string {
  const suffix4 = formatSuffix(suffix);
  return `${projectNumber}-${suffix4}`;
}



