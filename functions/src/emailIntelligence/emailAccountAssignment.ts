/**
 * Email Account Assignment Cloud Functions
 * 
 * Enforces that each email account can only be assigned to one user per concern.
 * Region: europe-west1
 * 
 * CRITICAL: This is the ONLY authority for email uniqueness.
 * All email account creation must go through assignEmailAccount first.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();

interface AssignEmailRequest {
  concernId: string;
  email: string;
  provider?: 'gmail' | 'imap' | 'm365';
  accountId?: string;
}

interface UnassignEmailRequest {
  concernId: string;
  email: string;
}

interface EmailIndexDocument {
  email: string;
  emailKey: string;
  assignedToUid: string;
  assignedAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  provider: string;
  accountId?: string;
  status: 'assigned' | 'revoked';
}

/**
 * Normalize email address for consistent indexing
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Create a safe document ID from email address using SHA256 hash
 * This avoids any illegal characters in Firestore document IDs
 */
function emailToDocId(email: string): string {
  const normalized = normalizeEmail(email);
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

/**
 * Assign an email account to a user.
 * Fails if the email is already assigned to another user in the same concern.
 * 
 * CRITICAL: This is the ONLY entry point for email assignment.
 * Must be called BEFORE storing any email account.
 */
export const assignEmailAccount = functions
  .region('europe-west1')
  .https.onCall(async (data: AssignEmailRequest, context) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer nicht angemeldet');
    }

    const callerUid = context.auth.uid;
    const { concernId, email, provider, accountId } = data;

    // Validate input
    if (!concernId || !email) {
      throw new functions.https.HttpsError('invalid-argument', 'Fehlende Parameter: concernId und email erforderlich');
    }

    const normalizedEmail = normalizeEmail(email);
    const emailKey = emailToDocId(email);
    const indexRef = db.doc(`concerns/${concernId}/emailAccountIndex/${emailKey}`);
    const now = admin.firestore.Timestamp.now();

    // Log the assignment attempt
    functions.logger.info('assignEmailAccount: attempt', {
      concernId,
      emailKey: emailKey.substring(0, 8),
      callerUid: callerUid.substring(0, 8),
      provider: provider || 'unknown',
    });

    // Use transaction to ensure atomicity
    const result = await db.runTransaction(async (transaction) => {
      const indexDoc = await transaction.get(indexRef);

      if (indexDoc.exists) {
        const indexData = indexDoc.data() as EmailIndexDocument;

        // Log existing state for debugging
        functions.logger.info('assignEmailAccount: existing index found', {
          concernId,
          emailKey: emailKey.substring(0, 8),
          existingUid: indexData.assignedToUid.substring(0, 8),
          callerUid: callerUid.substring(0, 8),
          status: indexData.status,
        });

        // CRITICAL: Check if already assigned to a DIFFERENT user AND active
        if (indexData.assignedToUid !== callerUid && indexData.status === 'assigned') {
          functions.logger.warn('assignEmailAccount: DENY - already assigned to another user', {
            concernId,
            emailKey: emailKey.substring(0, 8),
            existingUid: indexData.assignedToUid.substring(0, 8),
            callerUid: callerUid.substring(0, 8),
            decision: 'DENY',
          });

          return { decision: 'DENY' as const };
        }

        // Already assigned to this user - just update
        if (indexData.assignedToUid === callerUid) {
          functions.logger.info('assignEmailAccount: ALLOW - already owned, updating', {
            concernId,
            emailKey: emailKey.substring(0, 8),
            decision: 'ALLOW_UPDATE',
          });

          transaction.update(indexRef, {
            status: 'assigned',
            updatedAt: now,
            provider: provider || indexData.provider,
            accountId: accountId || indexData.accountId,
          });

          return { decision: 'ALLOW' as const, emailKey };
        }

        // Previously revoked - can reassign
        if (indexData.status === 'revoked') {
          functions.logger.info('assignEmailAccount: ALLOW - reassigning revoked', {
            concernId,
            emailKey: emailKey.substring(0, 8),
            decision: 'ALLOW_REASSIGN',
          });

          transaction.update(indexRef, {
            assignedToUid: callerUid,
            assignedAt: now,
            updatedAt: now,
            provider: provider || 'unknown',
            accountId: accountId || null,
            status: 'assigned',
          });

          return { decision: 'ALLOW' as const, emailKey };
        }
      }

      // New assignment
      functions.logger.info('assignEmailAccount: ALLOW - new assignment', {
        concernId,
        emailKey: emailKey.substring(0, 8),
        callerUid: callerUid.substring(0, 8),
        decision: 'ALLOW_NEW',
      });

      const newIndex: EmailIndexDocument = {
        email: normalizedEmail,
        emailKey,
        assignedToUid: callerUid,
        assignedAt: now,
        updatedAt: now,
        provider: provider || 'unknown',
        accountId: accountId || null, // Use null instead of undefined for Firestore
        status: 'assigned',
      };

      transaction.set(indexRef, newIndex);

      return { decision: 'ALLOW' as const, emailKey };
    });

    // Handle deny OUTSIDE the transaction
    if (result.decision === 'DENY') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'EMAIL_ALREADY_ASSIGNED'
      );
    }

    return { ok: true, emailKey: result.emailKey };
  });

/**
 * Unassign an email account from a user.
 */
export const unassignEmailAccount = functions
  .region('europe-west1')
  .https.onCall(async (data: UnassignEmailRequest, context) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer nicht angemeldet');
    }

    const callerUid = context.auth.uid;
    const { concernId, email } = data;

    // Validate input
    if (!concernId || !email) {
      throw new functions.https.HttpsError('invalid-argument', 'Fehlende Parameter');
    }

    const normalizedEmail = normalizeEmail(email);
    const emailKey = emailToDocId(email);
    const indexRef = db.doc(`concerns/${concernId}/emailAccountIndex/${emailKey}`);
    const now = admin.firestore.Timestamp.now();

    await db.runTransaction(async (transaction) => {
      const indexDoc = await transaction.get(indexRef);

      if (!indexDoc.exists) {
        functions.logger.info('unassignEmailAccount: no index found', {
          concernId,
          emailKey: emailKey.substring(0, 8),
        });
        return;
      }

      const indexData = indexDoc.data() as EmailIndexDocument;

      // Only unassign if owned by this user
      if (indexData.assignedToUid !== callerUid) {
        functions.logger.warn('unassignEmailAccount: not owned by caller', {
          concernId,
          emailKey: emailKey.substring(0, 8),
          ownerUid: indexData.assignedToUid.substring(0, 8),
          callerUid: callerUid.substring(0, 8),
        });
        throw new functions.https.HttpsError('permission-denied', 'Nicht Ihr E-Mail-Konto');
      }

      functions.logger.info('unassignEmailAccount: releasing', {
        concernId,
        emailKey: emailKey.substring(0, 8),
        callerUid: callerUid.substring(0, 8),
      });

      transaction.update(indexRef, {
        status: 'revoked',
        updatedAt: now,
      });
    });

    return { ok: true };
  });

/**
 * Verify email ownership for sync operations.
 * Returns true if the email is assigned to the given user.
 * 
 * IMPORTANT: This is called from syncEmailAccount and other handlers
 * to ensure only the owner can sync/access the email.
 */
export async function verifyEmailOwnership(
  concernId: string,
  uid: string,
  email: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const emailKey = emailToDocId(email);
  const indexRef = db.doc(`concerns/${concernId}/emailAccountIndex/${emailKey}`);

  const indexDoc = await indexRef.get();

  if (!indexDoc.exists) {
    functions.logger.warn('verifyEmailOwnership: no index found', {
      concernId,
      emailKey: emailKey.substring(0, 8),
      uid: uid.substring(0, 8),
    });
    return false;
  }

  const indexData = indexDoc.data() as EmailIndexDocument;
  const isOwner = indexData.assignedToUid === uid && indexData.status === 'assigned';

  if (!isOwner) {
    functions.logger.warn('verifyEmailOwnership: not owner or not assigned', {
      concernId,
      emailKey: emailKey.substring(0, 8),
      ownerUid: indexData.assignedToUid?.substring(0, 8),
      callerUid: uid.substring(0, 8),
      status: indexData.status,
    });
  }

  return isOwner;
}

/**
 * Server-side assignment check for storeImapAccount and other entry points.
 * This performs the same check as assignEmailAccount but returns result instead of throwing.
 */
export async function checkEmailAvailability(
  concernId: string,
  callerUid: string,
  email: string
): Promise<{ available: boolean; reason?: string }> {
  const normalizedEmail = normalizeEmail(email);
  const emailKey = emailToDocId(email);
  const indexRef = db.doc(`concerns/${concernId}/emailAccountIndex/${emailKey}`);

  const indexDoc = await indexRef.get();

  if (!indexDoc.exists) {
    return { available: true };
  }

  const indexData = indexDoc.data() as EmailIndexDocument;

  // Owned by caller = available
  if (indexData.assignedToUid === callerUid) {
    return { available: true };
  }

  // Revoked = available for reassignment
  if (indexData.status === 'revoked') {
    return { available: true };
  }

  // Assigned to someone else = not available
  return {
    available: false,
    reason: 'EMAIL_ALREADY_ASSIGNED',
  };
}

