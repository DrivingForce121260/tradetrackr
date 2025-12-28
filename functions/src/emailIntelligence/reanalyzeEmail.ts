/**
 * Re-analyze Email Cloud Function
 * 
 * UPDATED: Now uses canonical message-based analysis.
 * Redirects to the canonical retryEmailAnalysis function.
 * 
 * Legacy support: Also updates the old emailSummaries collection
 * if LEGACY_EMAIL_SUMMARIES=true.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { safeRetryAnalysis, enqueueEmailAnalysis, processEmailAnalysis, generateEventId } from './analyzeEmailMessage';
import { CURRENT_ANALYSIS_VERSION } from './canonicalMessage';

const db = admin.firestore();

// Feature flag for legacy summary updates
const LEGACY_EMAIL_SUMMARIES = process.env.LEGACY_EMAIL_SUMMARIES === 'true';

/**
 * Re-analyze a specific email
 * 
 * Now works with canonical messages:
 * 1. Looks up the messageKey from the email document
 * 2. Triggers re-analysis via canonical message system
 * 3. Optionally updates legacy emailSummaries (if enabled)
 */
export const reanalyzeEmail = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Nicht angemeldet');
    }

    const { emailId, messageKey: providedMessageKey, concernId: providedConcernId } = data;

    // Must have either emailId (legacy) or messageKey (canonical)
    if (!emailId && !providedMessageKey) {
      throw new functions.https.HttpsError('invalid-argument', 'emailId oder messageKey erforderlich');
    }

    try {
      let messageKey = providedMessageKey;
      let concernId = providedConcernId;

      // If emailId provided, look up messageKey from email document
      if (emailId && !messageKey) {
        const emailDoc = await db.collection('emails').doc(emailId).get();

        if (!emailDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'E-Mail nicht gefunden');
        }

        const emailData = emailDoc.data()!;
        messageKey = emailData.messageKey;
        concernId = emailData.orgId;

        // Verify user has access to this org
        const userDoc = await db.collection('users').doc(context.auth.uid).get();
        const userData = userDoc.data();
        const userOrgId = userData?.concernID || userData?.ConcernID;

        if (userOrgId !== concernId) {
          throw new functions.https.HttpsError('permission-denied', 'Kein Zugriff auf diese E-Mail');
        }

        // If email doesn't have messageKey, it's truly legacy - fall back to old behavior
        if (!messageKey) {
          functions.logger.warn('reanalyzeEmail: email has no messageKey, using legacy analysis', {
            emailId,
          });
          return await legacyReanalyze(emailId, emailData, context.auth.uid);
        }
      }

      if (!messageKey || !concernId) {
        throw new functions.https.HttpsError('invalid-argument', 'messageKey und concernId erforderlich');
      }

      functions.logger.info('reanalyzeEmail: using canonical analysis', {
        messageKey: messageKey.substring(0, 8),
        concernId,
      });

      // Check canonical message exists and needs re-analysis
      const canonicalRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);
      const canonicalDoc = await canonicalRef.get();

      if (!canonicalDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Kanonische Nachricht nicht gefunden');
      }

      const canonicalData = canonicalDoc.data()!;

      // Check if already done with current version
      if (
        canonicalData.analysis?.status === 'done' &&
        canonicalData.analysis?.version === CURRENT_ANALYSIS_VERSION
      ) {
        // Check if user explicitly wants to force re-analysis
        if (!data.force) {
          return {
            success: true,
            status: 'already_done',
            category: canonicalData.analysisResult?.category,
            priority: canonicalData.analysisResult?.priority,
            message: 'Analyse bereits mit aktueller Version abgeschlossen',
          };
        }
        // Force flag set - reset to allow re-analysis
        await canonicalRef.update({
          'analysis.status': 'none',
          'analysis.error': null,
          analysisLock: null,
        });
      }

      // Safe retry (resets status if error or lock expired)
      const retryResult = await safeRetryAnalysis(concernId, messageKey);

      if (!retryResult.canRetry && retryResult.reason === 'locked_by_another_worker') {
        return {
          success: true,
          status: 'processing',
          message: 'Analyse läuft bereits',
        };
      }

      // Enqueue and process
      const eventId = generateEventId(messageKey, `reanalyze_${context.auth.uid}`);
      const enqueueResult = await enqueueEmailAnalysis(concernId, messageKey, eventId);

      if (enqueueResult.status !== 'queued') {
        return {
          success: true,
          status: enqueueResult.status,
          message: 'Analyse wird verarbeitet',
        };
      }

      const processResult = await processEmailAnalysis(concernId, messageKey, eventId);

      // If legacy mode, also update emailSummaries
      if (LEGACY_EMAIL_SUMMARIES && emailId && processResult.status === 'done') {
        try {
          const updatedCanonical = await canonicalRef.get();
          const analysisResult = updatedCanonical.data()?.analysisResult;

          if (analysisResult) {
            const summaryRef = db.collection('emailSummaries').doc(emailId);
            const summaryDoc = await summaryRef.get();

            if (summaryDoc.exists) {
              await summaryRef.update({
                category: analysisResult.category,
                summaryBullets: analysisResult.summary,
                priority: analysisResult.priority,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              functions.logger.info('Legacy emailSummaries updated', { emailId });
            }
          }
        } catch (legacyError) {
          functions.logger.warn('Failed to update legacy emailSummaries', { error: legacyError });
        }
      }

      if (processResult.status === 'done') {
        return {
          success: true,
          status: 'done',
          category: processResult.category,
          priority: processResult.priority,
          message: 'E-Mail erfolgreich neu analysiert',
        };
      }

      return {
        success: false,
        status: processResult.status,
        message: processResult.status === 'error' 
          ? (processResult as { message: string }).message 
          : 'Analyse fehlgeschlagen',
      };

    } catch (error: any) {
      functions.logger.error('reanalyzeEmail error:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Fehler bei der Neu-Analyse: ${error.message || 'Unbekannter Fehler'}`
      );
    }
  });

/**
 * Legacy re-analyze for emails without messageKey
 * This is only used for very old emails that were processed before
 * the canonical message system was introduced.
 */
async function legacyReanalyze(
  emailId: string,
  emailData: any,
  uid: string
): Promise<any> {
  const { runLLMAnalysis } = require('./llmAnalysis');

  // Get attachments
  const attachmentsSnapshot = await db
    .collection('emailAttachments')
    .where('emailId', '==', emailId)
    .get();

  const attachmentMeta = attachmentsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      fileName: data.fileName,
      mimeType: data.mimeType,
    };
  });

  // Run AI analysis
  const analysis = await runLLMAnalysis(
    emailData.subject || '(Kein Betreff)',
    emailData.bodyText || '',
    attachmentMeta
  );

  // Update email document
  await db.collection('emails').doc(emailId).update({
    category: analysis.category,
    categoryConfidence: analysis.confidence,
    reanalyzedAt: admin.firestore.FieldValue.serverTimestamp(),
    reanalyzedBy: uid,
  });

  // Update email summary (legacy)
  const summaryDoc = await db.collection('emailSummaries').doc(emailId).get();

  if (summaryDoc.exists) {
    await summaryDoc.ref.update({
      category: analysis.category,
      summaryBullets: analysis.summary_bullets,
      priority: analysis.priority,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await db.collection('emailSummaries').doc(emailId).set({
      orgId: emailData.orgId,
      emailId: emailId,
      category: analysis.category,
      summaryBullets: analysis.summary_bullets,
      priority: analysis.priority,
      status: 'open',
      assignedTo: null,
      archived: false,
      isNew: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {
    success: true,
    status: 'done',
    category: analysis.category,
    priority: analysis.priority,
    confidence: analysis.confidence,
    summaryBullets: analysis.summary_bullets,
    message: 'E-Mail erfolgreich neu analysiert (Legacy-Modus)',
    isLegacy: true,
  };
}



