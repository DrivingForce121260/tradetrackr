/**
 * Cloud Function: Generate Email Reply Draft
 * 
 * UPDATED: Now uses canonical messages first.
 * Creates an AI-generated draft reply and stores it in the canonical message.
 * 
 * Fallback to legacy emailSummaries only if:
 * - messageKey is missing AND
 * - LEGACY_EMAIL_SUMMARIES=true
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateReplyDraft } from './generateReply';
import { sanitizeForFirestore, normalizeEmailString, normalizeArray } from '../utils/sanitizeForFirestore';
import { CanonicalMessage, ReplyDraft, ReplyStatus } from './canonicalMessage';

// Feature flags
const LEGACY_EMAIL_SUMMARIES = process.env.LEGACY_EMAIL_SUMMARIES === 'true';
const PRIVATE_DRAFTS = process.env.PRIVATE_DRAFTS === 'true'; // If true, drafts are user-private

interface GenerateReplyDraftRequest {
  concernId: string;
  messageKey?: string;  // Preferred: canonical messageKey
  emailId?: string;     // Legacy: emailId for backward compatibility
  tone?: 'neutral' | 'friendly' | 'formal';
  language?: 'de' | 'en';
  instructions?: string;
}

interface GenerateReplyDraftResponse {
  replyId?: string;     // Legacy: ID in emailReplies collection
  messageKey?: string;  // Canonical: messageKey
  status: 'generated' | 'error';
  draft?: {
    subject: string;
    bodyText: string;
    to: string[];
  };
}

const db = admin.firestore();

/**
 * Callable function to generate an AI draft reply
 */
export const generateEmailReplyDraft = functions
  .region('europe-west1')
  .https.onCall(async (data: GenerateReplyDraftRequest, context): Promise<GenerateReplyDraftResponse> => {
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer muss angemeldet sein');
    }

    const { concernId, messageKey, emailId, tone = 'neutral', language = 'de', instructions } = data;
    const userId = context.auth.uid;

    if (!concernId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId ist erforderlich');
    }

    if (!messageKey && !emailId) {
      throw new functions.https.HttpsError('invalid-argument', 'messageKey oder emailId ist erforderlich');
    }

    functions.logger.info('generateEmailReplyDraft: starting', {
      concernId,
      messageKey: messageKey?.substring(0, 8),
      emailId,
      userId: userId.substring(0, 8),
    });

    try {
      // ============================================
      // 2. TRY CANONICAL PATH FIRST
      // ============================================
      
      if (messageKey) {
        return await generateReplyFromCanonical(
          concernId, 
          messageKey, 
          userId, 
          tone, 
          language, 
          instructions
        );
      }

      // ============================================
      // 3. LOOKUP messageKey FROM emailId
      // ============================================
      
      if (emailId) {
        const emailDoc = await db.collection('emails').doc(emailId).get();
        
        if (!emailDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'E-Mail nicht gefunden');
        }

        const emailData = emailDoc.data()!;
        
        // Verify concernId matches
        const emailConcernId = emailData.concernId || emailData.orgId;
        if (emailConcernId !== concernId) {
          throw new functions.https.HttpsError('permission-denied', 'E-Mail gehört nicht zu diesem Concern');
        }

        // Check if email has messageKey (canonical)
        if (emailData.messageKey) {
          return await generateReplyFromCanonical(
            concernId,
            emailData.messageKey,
            userId,
            tone,
            language,
            instructions
          );
        }

        // ============================================
        // 4. LEGACY FALLBACK (only if enabled)
        // ============================================
        
        if (!LEGACY_EMAIL_SUMMARIES) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'Diese E-Mail hat kein kanonisches Dokument. Legacy-Modus ist deaktiviert.'
          );
        }

        functions.logger.warn('generateEmailReplyDraft: using legacy path', { emailId });
        return await generateReplyLegacy(emailId, emailData, concernId, userId, tone, language, instructions);
      }

      throw new functions.https.HttpsError('invalid-argument', 'messageKey oder emailId erforderlich');

    } catch (error: any) {
      functions.logger.error('generateEmailReplyDraft error:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      throw new functions.https.HttpsError(
        'internal',
        `Fehler beim Generieren der Antwort: ${error.message}`
      );
    }
  });

/**
 * Generate reply from canonical message
 */
async function generateReplyFromCanonical(
  concernId: string,
  messageKey: string,
  userId: string,
  tone: 'neutral' | 'friendly' | 'formal',
  language: 'de' | 'en',
  instructions?: string
): Promise<GenerateReplyDraftResponse> {
  const canonicalRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);
  const canonicalDoc = await canonicalRef.get();

  if (!canonicalDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Kanonische Nachricht nicht gefunden');
  }

  const canonical = canonicalDoc.data() as CanonicalMessage;

  // Get analysis context
  const summaryBullets = canonical.analysisResult?.summary || [];

  // Generate AI reply
  const replyDraft = await generateReplyDraft(
    canonical.subject || '',
    canonical.from.email || '',
    canonical.to || [],
    canonical.snippet || '',
    summaryBullets,
    tone,
    language,
    instructions
  );

  functions.logger.info('generateReplyFromCanonical: AI generated', {
    messageKey: messageKey.substring(0, 8),
    subject: replyDraft.subject.substring(0, 30),
  });

  const now = admin.firestore.Timestamp.now();

  // Create draft structure - use null instead of undefined for Firestore
  const bodyHtmlValue = normalizeEmailString(replyDraft.bodyHtml, '');
  const draft: ReplyDraft = {
    subject: normalizeEmailString(replyDraft.subject, '(Kein Betreff)'),
    body: normalizeEmailString(replyDraft.bodyText, ''),
    bodyHtml: bodyHtmlValue || null, // Use null instead of undefined
    to: normalizeArray(replyDraft.to),
    cc: normalizeArray(replyDraft.cc),
    createdAt: now,
    createdBy: userId,
    model: 'gemini-2.5-flash',
    version: 1,
    tone,
    language,
  };

  const status: ReplyStatus = {
    state: 'drafted',
    updatedAt: now,
    updatedBy: userId,
  };

  // Decide where to store draft
  if (PRIVATE_DRAFTS) {
    // Store in user-private location
    const userDraftRef = db.doc(
      `concerns/${concernId}/users/${userId}/emailDrafts/${messageKey}`
    );
    await userDraftRef.set(sanitizeForFirestore({
      messageKey,
      draft,
      status,
      createdAt: now,
      updatedAt: now,
    }));

    functions.logger.info('generateReplyFromCanonical: private draft stored', {
      messageKey: messageKey.substring(0, 8),
    });
  } else {
    // Store in canonical message (shared)
    await canonicalRef.update(sanitizeForFirestore({
      'reply.draft': draft,
      'reply.status': status,
      updatedAt: now,
    }));

    functions.logger.info('generateReplyFromCanonical: shared draft stored', {
      messageKey: messageKey.substring(0, 8),
    });
  }

  // Also create legacy emailReplies doc for backward compatibility with send flow
  const replyRef = db.collection('emailReplies').doc();
  const replyData = {
    concernId,
    messageKey, // Link to canonical
    accountId: null, // Will be filled on send
    provider: null,
    threadId: null,
    providerMessageId: null,
    providerDraftId: null,
    providerSentId: null,
    to: draft.to,
    cc: draft.cc || [],
    bcc: [],
    subject: draft.subject,
    bodyText: draft.body,
    bodyHtml: draft.bodyHtml || null,
    status: 'generated',
    lastError: null,
    generatedBy: {
      model: draft.model,
      temperature: 0.1,
    },
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        at: now,
        by: userId,
        action: 'generated',
        note: `Generated with tone: ${tone}, language: ${language}`,
      },
    ],
  };

  await replyRef.set(sanitizeForFirestore(replyData));

  // Update canonical with replyId reference
  await canonicalRef.update({
    'reply.status.replyId': replyRef.id,
  });

  return {
    replyId: replyRef.id,
    messageKey,
    status: 'generated',
    draft: {
      subject: draft.subject,
      bodyText: draft.body,
      to: draft.to,
    },
  };
}

/**
 * Legacy: Generate reply from emailSummaries
 * Only used when LEGACY_EMAIL_SUMMARIES=true
 */
async function generateReplyLegacy(
  emailId: string,
  emailData: any,
  concernId: string,
  userId: string,
  tone: 'neutral' | 'friendly' | 'formal',
  language: 'de' | 'en',
  instructions?: string
): Promise<GenerateReplyDraftResponse> {
  // Load email summary for AI context
  const summaryDoc = await db.collection('emailSummaries').doc(emailId).get();
  const summaryData = summaryDoc.exists ? summaryDoc.data() : null;
  const summaryBullets = summaryData?.summaryBullets || [];

  // Generate AI reply
  const replyDraft = await generateReplyDraft(
    emailData.subject || '',
    emailData.from || '',
    emailData.to || [],
    emailData.bodyText || '',
    summaryBullets,
    tone,
    language,
    instructions
  );

  const now = admin.firestore.Timestamp.now();
  const replyRef = db.collection('emailReplies').doc();
  
  const replyData = {
    concernId,
    emailId,
    accountId: emailData.accountId,
    provider: emailData.provider,
    threadId: normalizeEmailString(emailData.threadId, '') || null,
    providerMessageId: normalizeEmailString(emailData.providerMessageId, '') || null,
    providerDraftId: null,
    providerSentId: null,
    to: normalizeArray(replyDraft.to),
    cc: normalizeArray(replyDraft.cc),
    bcc: [],
    subject: normalizeEmailString(replyDraft.subject, '(Kein Betreff)'),
    bodyText: normalizeEmailString(replyDraft.bodyText, ''),
    bodyHtml: normalizeEmailString(replyDraft.bodyHtml, '') || null,
    status: 'generated',
    lastError: null,
    generatedBy: {
      model: 'gemini-2.5-flash',
      temperature: 0.1,
    },
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        at: now,
        by: userId,
        action: 'generated',
        note: `Generated with tone: ${tone}, language: ${language} (legacy)`,
      },
    ],
  };

  await replyRef.set(sanitizeForFirestore(replyData));

  // Update legacy emailSummaries
  if (summaryDoc.exists) {
    await db.collection('emailSummaries').doc(emailId).update({
      replyId: replyRef.id,
      replyStatus: 'draft',
    });
  }

  return {
    replyId: replyRef.id,
    status: 'generated',
    draft: {
      subject: replyDraft.subject,
      bodyText: replyDraft.bodyText,
      to: replyDraft.to,
    },
  };
}
