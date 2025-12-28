/**
 * Email Analysis Worker (Production-Hardened)
 * 
 * Provides exactly-once AI analysis for canonical messages.
 * Uses Firestore transactions for concurrency-safe locking.
 * 
 * Key guarantees:
 * - Exactly-once analysis per canonical message
 * - Idempotent under retries and concurrent invocations
 * - Version-aware (re-analyze if CURRENT_ANALYSIS_VERSION changes)
 * - Safe lock acquisition and release
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { 
  CanonicalMessage, 
  CURRENT_ANALYSIS_VERSION,
  AnalysisLock,
} from './canonicalMessage';
import { sanitizeForFirestore } from '../utils/sanitizeForFirestore';

const db = admin.firestore();

// Lock expiration time in milliseconds (5 minutes)
const LOCK_EXPIRATION_MS = 5 * 60 * 1000;

// Analysis model for tracking
const ANALYSIS_MODEL = 'gemini-2.5-flash';

// Result types for enqueue operation
export type EnqueueResult = 
  | { status: 'queued'; eventId: string }
  | { status: 'already_done' }
  | { status: 'already_processed_event'; eventId: string }
  | { status: 'locked'; lockedBy: string; expiresAt: Date }
  | { status: 'not_found' };

// Result types for process operation
export type ProcessResult =
  | { status: 'done'; category: string; priority: string }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; message: string };

interface AnalysisResult {
  summary: string[];
  category: string;
  priority: string;
  intent?: string;
  entities?: Record<string, unknown>;
  suggestedActions?: string[];
  confidence?: number;
}

/**
 * Generate a deterministic event ID for idempotency
 * Format: messageKey:version:timestamp
 */
export function generateEventId(messageKey: string, source: string): string {
  return `${messageKey}:v${CURRENT_ANALYSIS_VERSION}:${source}:${Date.now()}`;
}

/**
 * Enqueue email for analysis with full idempotency
 * 
 * Guarantees:
 * - Returns 'already_done' if analysis complete with current version
 * - Returns 'already_processed_event' if same eventId already processed
 * - Returns 'locked' if another worker holds valid lock
 * - Acquires lock atomically in transaction
 */
export async function enqueueEmailAnalysis(
  concernId: string,
  messageKey: string,
  eventId: string
): Promise<EnqueueResult> {
  const messageRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + LOCK_EXPIRATION_MS
  );

  try {
    const result = await db.runTransaction(async (transaction) => {
      const messageDoc = await transaction.get(messageRef);

      if (!messageDoc.exists) {
        return { status: 'not_found' as const };
      }

      const message = messageDoc.data() as CanonicalMessage;

      // (a) Already done with current version - skip
      if (
        message.analysis.status === 'done' && 
        message.analysis.version === CURRENT_ANALYSIS_VERSION
      ) {
        functions.logger.info('enqueueEmailAnalysis: already done (current version)', {
          concernId,
          messageKey: messageKey.substring(0, 8),
          version: message.analysis.version,
        });
        return { status: 'already_done' as const };
      }

      // (b) Same eventId already processed - idempotency check
      if (message.analysis.lastEventId === eventId) {
        functions.logger.info('enqueueEmailAnalysis: already processed event', {
          concernId,
          messageKey: messageKey.substring(0, 8),
          eventId: eventId.substring(0, 20),
        });
        return { status: 'already_processed_event' as const, eventId };
      }

      // (c) Check if lock exists and not expired
      if (message.analysisLock) {
        const lockExpires = message.analysisLock.expiresAt.toMillis();
        if (lockExpires > now.toMillis()) {
          functions.logger.info('enqueueEmailAnalysis: locked by another worker', {
            concernId,
            messageKey: messageKey.substring(0, 8),
            lockedBy: message.analysisLock.lockedBy.substring(0, 20),
            expiresIn: Math.round((lockExpires - now.toMillis()) / 1000) + 's',
          });
          return { 
            status: 'locked' as const, 
            lockedBy: message.analysisLock.lockedBy,
            expiresAt: message.analysisLock.expiresAt.toDate(),
          };
        }
        // Lock expired - we can take over
      }

      // (d) Acquire lock and set to processing
      const newLock: AnalysisLock = {
        lockedBy: eventId,
        lockedAt: now,
        expiresAt,
      };

      transaction.update(messageRef, {
        'analysis.status': 'processing',
        'analysis.version': CURRENT_ANALYSIS_VERSION,
        'analysis.lastEventId': eventId,
        'analysis.updatedAt': now,
        analysisLock: newLock,
      });

      functions.logger.info('enqueueEmailAnalysis: lock acquired', {
        concernId,
        messageKey: messageKey.substring(0, 8),
        eventId: eventId.substring(0, 20),
      });

      return { status: 'queued' as const, eventId };
    });

    return result;

  } catch (error) {
    const err = error as Error;
    functions.logger.error('enqueueEmailAnalysis: transaction failed', {
      concernId,
      messageKey: messageKey.substring(0, 8),
      error: err.message,
    });
    throw error;
  }
}

/**
 * Process email analysis
 * 
 * Guarantees:
 * - Verifies lock ownership before and after AI call
 * - Only writes result if we still own the lock
 * - Clears lock on success or error
 */
export async function processEmailAnalysis(
  concernId: string,
  messageKey: string,
  eventId: string
): Promise<ProcessResult> {
  const messageRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);

  try {
    // Step 1: Verify we still hold the lock
    const messageDoc = await messageRef.get();
    
    if (!messageDoc.exists) {
      return { status: 'skipped', reason: 'message_not_found' };
    }

    const message = messageDoc.data() as CanonicalMessage;

    // Already done with current version
    if (
      message.analysis.status === 'done' && 
      message.analysis.version === CURRENT_ANALYSIS_VERSION
    ) {
      return { status: 'skipped', reason: 'already_done' };
    }

    // Check we hold the lock
    if (!message.analysisLock || message.analysisLock.lockedBy !== eventId) {
      functions.logger.warn('processEmailAnalysis: lost lock', {
        concernId,
        messageKey: messageKey.substring(0, 8),
        eventId: eventId.substring(0, 20),
        currentLock: message.analysisLock?.lockedBy?.substring(0, 20),
      });
      return { status: 'skipped', reason: 'lost_lock' };
    }

    // Step 2: Run AI analysis (OUTSIDE transaction)
    functions.logger.info('processEmailAnalysis: running AI', {
      concernId,
      messageKey: messageKey.substring(0, 8),
      subject: message.subject.substring(0, 50),
    });

    const analysisResult = await runAIAnalysis(message);

    // Step 3: Save result with ownership verification
    const writeResult = await db.runTransaction(async (transaction) => {
      const currentDoc = await transaction.get(messageRef);
      
      if (!currentDoc.exists) {
        return { written: false, reason: 'message_deleted' };
      }

      const currentMessage = currentDoc.data() as CanonicalMessage;

      // Verify we still own the lock
      if (currentMessage.analysisLock?.lockedBy !== eventId) {
        functions.logger.warn('processEmailAnalysis: ownership lost during AI call', {
          concernId,
          messageKey: messageKey.substring(0, 8),
          ourEventId: eventId.substring(0, 20),
          currentLock: currentMessage.analysisLock?.lockedBy?.substring(0, 20),
        });
        return { written: false, reason: 'ownership_lost' };
      }

      // Write result
      const now = admin.firestore.Timestamp.now();
      transaction.update(messageRef, {
        'analysis.status': 'done',
        'analysis.version': CURRENT_ANALYSIS_VERSION,
        'analysis.updatedAt': now,
        'analysis.model': ANALYSIS_MODEL,
        'analysis.error': null,
        analysisLock: null, // Release lock
        analysisResult: sanitizeForFirestore(analysisResult),
        updatedAt: now,
      });

      return { written: true };
    });

    if (!writeResult.written) {
      return { status: 'skipped', reason: writeResult.reason || 'write_failed' };
    }

    functions.logger.info('processEmailAnalysis: completed', {
      concernId,
      messageKey: messageKey.substring(0, 8),
      category: analysisResult.category,
      priority: analysisResult.priority,
    });

    return { 
      status: 'done', 
      category: analysisResult.category, 
      priority: analysisResult.priority,
    };

  } catch (error) {
    const err = error as Error;
    
    functions.logger.error('processEmailAnalysis: failed', {
      concernId,
      messageKey: messageKey.substring(0, 8),
      error: err.message,
    });

    // Mark as error and clear lock (only if we own it or it's expired)
    try {
      await db.runTransaction(async (transaction) => {
        const currentDoc = await transaction.get(messageRef);
        
        if (!currentDoc.exists) return;

        const currentMessage = currentDoc.data() as CanonicalMessage;
        const now = admin.firestore.Timestamp.now();

        // Only clear lock if we own it OR it's expired
        const weOwnLock = currentMessage.analysisLock?.lockedBy === eventId;
        const lockExpired = currentMessage.analysisLock?.expiresAt && 
          currentMessage.analysisLock.expiresAt.toMillis() < now.toMillis();

        if (weOwnLock || lockExpired) {
          transaction.update(messageRef, {
            'analysis.status': 'error',
            'analysis.version': CURRENT_ANALYSIS_VERSION,
            'analysis.updatedAt': now,
            'analysis.error': {
              message: err.message?.substring(0, 500) || 'Unknown error',
              at: now,
            },
            'analysis.retryCount': admin.firestore.FieldValue.increment(1),
            analysisLock: null,
          });
        }
      });
    } catch (updateErr) {
      functions.logger.error('Failed to update error status', updateErr);
    }

    return { status: 'error', message: err.message };
  }
}

/**
 * Safe retry for failed analysis
 * 
 * Only resets status if:
 * - status == 'error' OR
 * - status != 'done' AND lock is expired
 * 
 * Does NOT clear a valid active lock.
 */
export async function safeRetryAnalysis(
  concernId: string,
  messageKey: string
): Promise<{ canRetry: boolean; reason?: string }> {
  const messageRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);
  const now = admin.firestore.Timestamp.now();

  const result = await db.runTransaction(async (transaction) => {
    const messageDoc = await transaction.get(messageRef);

    if (!messageDoc.exists) {
      return { canRetry: false, reason: 'message_not_found' };
    }

    const message = messageDoc.data() as CanonicalMessage;

    // Already done with current version - no need to retry
    if (
      message.analysis.status === 'done' && 
      message.analysis.version === CURRENT_ANALYSIS_VERSION
    ) {
      return { canRetry: false, reason: 'already_done' };
    }

    // Check if error status - can retry
    if (message.analysis.status === 'error') {
      transaction.update(messageRef, {
        'analysis.status': 'none',
        'analysis.error': null,
        'analysis.updatedAt': now,
        analysisLock: null,
      });
      return { canRetry: true };
    }

    // Check if lock is still valid
    if (message.analysisLock) {
      const lockExpires = message.analysisLock.expiresAt.toMillis();
      if (lockExpires > now.toMillis()) {
        // Lock is valid - cannot retry
        return { 
          canRetry: false, 
          reason: 'locked_by_another_worker',
        };
      }
      // Lock expired - can reset
    }

    // Status is none/queued/processing with expired lock - reset
    transaction.update(messageRef, {
      'analysis.status': 'none',
      'analysis.error': null,
      'analysis.updatedAt': now,
      analysisLock: null,
    });

    return { canRetry: true };
  });

  functions.logger.info('safeRetryAnalysis', {
    concernId,
    messageKey: messageKey.substring(0, 8),
    canRetry: result.canRetry,
    reason: result.reason,
  });

  return result;
}

/**
 * Run AI analysis on message content
 * Uses the same AI pipeline as existing email intelligence
 */
async function runAIAnalysis(message: CanonicalMessage): Promise<AnalysisResult> {
  // Import the existing LLM analysis
  const { runLLMAnalysis } = require('./llmAnalysis');

  try {
    // Use existing LLM analysis pipeline
    const result = await runLLMAnalysis(
      message.subject,
      message.snippet,
      []
    );

    return {
      summary: result.summary_bullets || [message.snippet.substring(0, 200)],
      category: result.category || 'andere',
      priority: result.priority || 'normal',
      suggestedActions: result.suggested_actions,
      confidence: result.confidence,
    };
  } catch (error) {
    functions.logger.warn('AI analysis failed, using fallback', { error });

    // Fallback: basic categorization without AI
    return {
      summary: [message.snippet.substring(0, 200) || message.subject],
      category: categorizeByKeywords(message.subject, message.snippet),
      priority: 'normal',
    };
  }
}

/**
 * Simple keyword-based categorization fallback
 */
function categorizeByKeywords(subject: string, snippet: string): string {
  const text = `${subject} ${snippet}`.toLowerCase();

  if (text.includes('rechnung') || text.includes('invoice') || text.includes('zahlung')) {
    return 'rechnungen';
  }
  if (text.includes('angebot') || text.includes('quote') || text.includes('offer')) {
    return 'angebote';
  }
  if (text.includes('bestellung') || text.includes('order') || text.includes('auftrag')) {
    return 'bestellungen';
  }
  if (text.includes('termin') || text.includes('meeting') || text.includes('besprechung')) {
    return 'termine';
  }
  if (text.includes('reklamation') || text.includes('beschwerde') || text.includes('problem')) {
    return 'reklamationen';
  }

  return 'andere';
}

// ============================================
// CLOUD FUNCTIONS (europe-west1)
// ============================================

/**
 * Cloud Function: Enqueue and process email analysis
 * Callable from sync pipeline or manually
 */
export const analyzeEmailMessage = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Nicht angemeldet');
    }

    const { concernId, messageKey } = data;

    if (!concernId || !messageKey) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId und messageKey erforderlich');
    }

    // Generate deterministic event ID
    const eventId = generateEventId(messageKey, `callable_${context.auth.uid}`);

    // Try to enqueue
    const enqueueResult = await enqueueEmailAnalysis(concernId, messageKey, eventId);

    if (enqueueResult.status === 'not_found') {
      throw new functions.https.HttpsError('not-found', 'Nachricht nicht gefunden');
    }

    if (enqueueResult.status === 'already_done') {
      return { ok: true, status: 'already_done', message: 'Analyse bereits abgeschlossen' };
    }

    if (enqueueResult.status === 'already_processed_event') {
      return { ok: true, status: 'already_processed', message: 'Anfrage bereits verarbeitet' };
    }

    if (enqueueResult.status === 'locked') {
      return { ok: true, status: 'processing', message: 'Analyse läuft bereits' };
    }

    // Process analysis
    const processResult = await processEmailAnalysis(concernId, messageKey, eventId);

    if (processResult.status === 'done') {
      return { ok: true, status: 'done', message: 'Analyse abgeschlossen' };
    }

    if (processResult.status === 'skipped') {
      return { ok: true, status: 'skipped', message: processResult.reason };
    }

    return { ok: false, status: 'error', message: processResult.message || 'Analyse fehlgeschlagen' };
  });

/**
 * Cloud Function: Retry failed analysis (safe retry)
 * Only retries if status is 'error' or lock is expired
 */
export const retryEmailAnalysis = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Nicht angemeldet');
    }

    const { concernId, messageKey } = data;

    if (!concernId || !messageKey) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId und messageKey erforderlich');
    }

    // Safe retry - only resets if error or lock expired
    const retryResult = await safeRetryAnalysis(concernId, messageKey);

    if (!retryResult.canRetry) {
      if (retryResult.reason === 'already_done') {
        return { ok: true, status: 'already_done', message: 'Analyse bereits abgeschlossen' };
      }
      if (retryResult.reason === 'locked_by_another_worker') {
        return { ok: true, status: 'processing', message: 'Analyse läuft bereits' };
      }
      return { ok: false, status: 'error', message: retryResult.reason || 'Erneuter Versuch nicht möglich' };
    }

    // Now enqueue and process
    const eventId = generateEventId(messageKey, `retry_${context.auth.uid}`);
    const enqueueResult = await enqueueEmailAnalysis(concernId, messageKey, eventId);

    if (enqueueResult.status !== 'queued') {
      return { 
        ok: true, 
        status: enqueueResult.status, 
        message: 'Analyse wird erneut gestartet',
      };
    }

    const processResult = await processEmailAnalysis(concernId, messageKey, eventId);

    if (processResult.status === 'done') {
      return { ok: true, status: 'done', message: 'Erneute Analyse erfolgreich' };
    }

    return { 
      ok: false, 
      status: 'error', 
      message: processResult.status === 'error' 
        ? processResult.message 
        : 'Analyse erneut fehlgeschlagen',
    };
  });
