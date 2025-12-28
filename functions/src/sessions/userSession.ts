/**
 * User Session Management Cloud Functions
 * 
 * Enforces single active session per user.
 * Region: europe-west1
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Configuration
const SESSION_TTL_MINUTES = 5;

interface ClaimSessionRequest {
  concernId: string;
  uid: string;
  sessionId: string;
  userAgent?: string;
}

interface ReleaseSessionRequest {
  concernId: string;
  uid: string;
  sessionId: string;
}

interface SessionDocument {
  uid: string;
  concernId: string;
  sessionId: string;
  claimedAt: admin.firestore.Timestamp;
  lastSeenAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
  userAgent: string;
  isActive: boolean;
}

/**
 * Claim a user session.
 * - If no active session exists, claim it.
 * - If an active session exists with different sessionId, DENY (throw error).
 * - If an active session exists with same sessionId (heartbeat), extend it.
 * 
 * IMPORTANT: Uses 'failed-precondition' error code for blocked sessions.
 * The client MUST handle this error and sign out the user.
 */
export const claimUserSession = functions
  .region('europe-west1')
  .https.onCall(async (data: ClaimSessionRequest, context) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer nicht angemeldet');
    }

    const { concernId, uid, sessionId, userAgent } = data;

    // Validate input
    if (!concernId || !uid || !sessionId) {
      functions.logger.warn('claimUserSession: missing params', { concernId, uid, sessionId: sessionId?.substring(0, 8) });
      throw new functions.https.HttpsError('invalid-argument', 'Fehlende Parameter');
    }

    // Ensure the caller is claiming their own session
    if (context.auth.uid !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Ungültige Benutzer-ID');
    }

    const sessionRef = db.doc(`concerns/${concernId}/userSessions/${uid}`);

    // Use transaction to ensure atomicity
    const result = await db.runTransaction(async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      const now = admin.firestore.Timestamp.now();
      const expiresAt = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + SESSION_TTL_MINUTES * 60 * 1000
      );

      // Log the decision context
      const existingSession = sessionDoc.exists ? sessionDoc.data() as SessionDocument : null;
      
      functions.logger.info('claimUserSession: evaluating', {
        uid,
        concernId,
        incomingSessionId: sessionId.substring(0, 8),
        existingSessionId: existingSession?.sessionId?.substring(0, 8) || null,
        existingIsActive: existingSession?.isActive || false,
        existingExpiresAt: existingSession?.expiresAt?.toDate()?.toISOString() || null,
        nowMs: now.toMillis(),
        existingExpiresAtMs: existingSession?.expiresAt?.toMillis() || 0,
      });

      if (existingSession) {
        const isActive = existingSession.isActive === true;
        const isNotExpired = existingSession.expiresAt.toMillis() > now.toMillis();
        const isDifferentSession = existingSession.sessionId !== sessionId;

        // CRITICAL: Block if active, not expired, AND different session
        if (isActive && isNotExpired && isDifferentSession) {
          functions.logger.warn('claimUserSession: DENY - session already active', {
            uid,
            concernId,
            existingSessionId: existingSession.sessionId.substring(0, 8),
            newSessionId: sessionId.substring(0, 8),
            decision: 'DENY',
          });

          // Return deny result - will throw outside transaction
          return { decision: 'DENY' as const };
        }

        // Same session ID = heartbeat, extend the session
        if (!isDifferentSession) {
          functions.logger.info('claimUserSession: ALLOW - heartbeat extend', {
            uid,
            concernId,
            sessionId: sessionId.substring(0, 8),
            decision: 'ALLOW_HEARTBEAT',
          });

          transaction.update(sessionRef, {
            lastSeenAt: now,
            expiresAt,
          });

          return { decision: 'ALLOW' as const, extended: true };
        }
      }

      // No active session or expired - claim it
      functions.logger.info('claimUserSession: ALLOW - new claim', {
        uid,
        concernId,
        sessionId: sessionId.substring(0, 8),
        decision: 'ALLOW_NEW',
      });

      const newSession: SessionDocument = {
        uid,
        concernId,
        sessionId,
        claimedAt: now,
        lastSeenAt: now,
        expiresAt,
        userAgent: userAgent || 'unknown',
        isActive: true,
      };

      transaction.set(sessionRef, newSession);

      return { decision: 'ALLOW' as const, claimed: true };
    });

    // Handle deny OUTSIDE the transaction to properly throw HttpsError
    if (result.decision === 'DENY') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'SESSION_ALREADY_ACTIVE'
      );
    }

    return {
      success: true,
      expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000).toISOString(),
    };
  });

/**
 * Release a user session.
 */
export const releaseUserSession = functions
  .region('europe-west1')
  .https.onCall(async (data: ReleaseSessionRequest, context) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer nicht angemeldet');
    }

    const { concernId, uid, sessionId } = data;

    // Validate input
    if (!concernId || !uid || !sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Fehlende Parameter');
    }

    // Ensure the caller is releasing their own session
    if (context.auth.uid !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Ungültige Benutzer-ID');
    }

    const sessionRef = db.doc(`concerns/${concernId}/userSessions/${uid}`);

    try {
      await db.runTransaction(async (transaction) => {
        const sessionDoc = await transaction.get(sessionRef);

        if (!sessionDoc.exists) {
          functions.logger.info('Session release - no session found', { uid, concernId });
          return;
        }

        const session = sessionDoc.data() as SessionDocument;

        // Only release if sessionId matches
        if (session.sessionId !== sessionId) {
          functions.logger.info('Session release - sessionId mismatch, ignoring', {
            uid,
            concernId,
            currentSessionId: session.sessionId.substring(0, 8),
            requestedSessionId: sessionId.substring(0, 8),
          });
          return;
        }

        functions.logger.info('Session released', {
          uid,
          concernId,
          sessionId: sessionId.substring(0, 8),
        });

        transaction.update(sessionRef, {
          isActive: false,
          expiresAt: admin.firestore.Timestamp.now(),
        });
      });

      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      functions.logger.error('Session release failed', {
        uid,
        concernId,
        error: err.message,
      });

      // Don't throw - best effort release
      return { success: false };
    }
  });

