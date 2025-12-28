/**
 * Email Intelligence Agent - Email Processing
 * Processes normalized emails: stores in Firestore, uploads attachments, runs LLM analysis
 * 
 * NEW: Uses canonical message deduplication for concern-wide email storage.
 * Same email received by multiple users is stored once with single AI analysis.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { NormalizedEmail, IncomingEmail, EmailAttachment, EmailSummary } from './types';
import { runLLMAnalysis } from './llmAnalysis';
import { randomUUID } from 'crypto';
import { sanitizeForFirestore, normalizeEmailString, normalizeArray, safeMergeWrite } from '../utils/sanitizeForFirestore';
import { upsertCanonicalMessage, upsertUserInboxItem } from './canonicalMessage';
import { enqueueEmailAnalysis, processEmailAnalysis } from './analyzeEmailMessage';
import { extractMessageIdFromHeaders } from './messageKey';

const db = admin.firestore();
const storage = admin.storage();

/**
 * Process a normalized email with canonical deduplication:
 * 1. Upsert canonical message (concern-scoped, deduplicated)
 * 2. Create user inbox item (user-scoped)
 * 3. Store raw email document for reference
 * 4. Upload attachments to Storage
 * 5. Enqueue exactly-once AI analysis
 * 6. Create legacy summary for backward compatibility
 */
export async function processEmail(normalized: NormalizedEmail): Promise<void> {
  try {
    const concernId = normalized.orgId;
    
    // Extract Message-ID from headers if available
    const messageId = extractMessageIdFromHeaders(normalized.headers) || normalized.providerMessageId;
    
    // Log diagnostic info
    functions.logger.info(`Processing email`, {
      concernId,
      from: normalized.from,
      subject: normalized.subject?.substring(0, 50),
      messageId: messageId?.substring(0, 30),
      bodyTextLength: normalized.bodyText?.length ?? 0,
      bodyHtmlLength: normalized.bodyHtml?.length ?? 0,
      attachmentCount: normalized.attachments?.length ?? 0,
    });

    // ============================================
    // Step 1: Upsert canonical message (dedup)
    // ============================================
    const snippet = (normalized.bodyText || normalized.subject || '').substring(0, 300);
    
    const { messageKey, isNew: isNewMessage } = await upsertCanonicalMessage({
      concernId,
      providerMessageId: messageId,
      from: normalized.from,
      fromName: null, // Use null instead of undefined for Firestore compatibility
      to: normalized.to || [],
      cc: normalized.cc,
      subject: normalized.subject || '(Kein Betreff)',
      date: normalized.receivedAt,
      bodyText: normalized.bodyText,
      bodyHtml: normalized.bodyHtml,
      snippet,
      attachmentsCount: normalized.attachments?.length || 0,
    });

    functions.logger.info(`Canonical message`, {
      messageKey: messageKey.substring(0, 8),
      isNewMessage,
    });

    // ============================================
    // Step 2: Create user inbox item
    // ============================================
    // Get ownerUid from the normalized email (passed from connector) or fallback to account lookup
    let ownerUid = normalized.ownerUid;
    
    if (!ownerUid) {
      // Legacy fallback: try to get from account document
      const accountDoc = await db.collection('emailAccounts').doc(normalized.accountId).get();
      const accountData = accountDoc.data();
      ownerUid = accountData?.ownerUid;
    }

    if (ownerUid) {
      await upsertUserInboxItem(
        concernId,
        ownerUid,
        normalized.accountId,
        messageKey,
        normalized.receivedAt,
        'INBOX'
      );
    } else {
      functions.logger.warn('No ownerUid found for email - cannot create user inbox item', {
        accountId: normalized.accountId,
      });
    }

    // ============================================
    // Step 3: Store raw email document (legacy)
    // ============================================
    // Check for duplicate by providerMessageId in legacy collection
    const existingEmailQuery = await db.collection('emails')
      .where('accountId', '==', normalized.accountId)
      .where('providerMessageId', '==', normalized.providerMessageId)
      .limit(1)
      .get();

    let emailId: string;
    let alreadyProcessed = false;

    if (!existingEmailQuery.empty) {
      emailId = existingEmailQuery.docs[0].id;
      alreadyProcessed = existingEmailQuery.docs[0].data().processed === true;
      functions.logger.info(`Using existing email doc ${emailId}`);
    } else {
      emailId = randomUUID().replace(/-/g, '');
      
      const emailData: IncomingEmail = {
        orgId: normalized.orgId,
        accountId: normalized.accountId,
        provider: normalized.provider,
        providerMessageId: normalized.providerMessageId,
        messageKey, // NEW: Link to canonical message
        threadId: normalizeEmailString(normalized.threadId, ''),
        from: normalizeEmailString(normalized.from, 'unknown'),
        to: normalizeArray(normalized.to),
        cc: normalizeArray(normalized.cc),
        subject: normalizeEmailString(normalized.subject, '(Kein Betreff)'),
        bodyText: normalizeEmailString(normalized.bodyText, ''),
        bodyHtml: normalizeEmailString(normalized.bodyHtml, ''),
        receivedAt: admin.firestore.Timestamp.fromDate(normalized.receivedAt),
        hasAttachments: (normalized.attachments?.length ?? 0) > 0,
        processed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      };

      const safeEmailData = sanitizeForFirestore(emailData);
      await db.collection('emails').doc(emailId).set(safeEmailData);
    }

    // ============================================
    // Step 4: Process attachments (if new email)
    // ============================================
    const attachmentMeta: Array<{ fileName: string; mimeType: string }> = [];
    
    if (!alreadyProcessed) {
      for (const attachment of normalized.attachments) {
        try {
          const attachmentId = randomUUID().replace(/-/g, '');
          const storagePath = `emails/${normalized.orgId}/${emailId}/${attachment.fileName}`;

          const bucket = storage.bucket();
          const file = bucket.file(storagePath);
          
          await file.save(attachment.data, {
            metadata: { contentType: attachment.mimeType },
          });

          const attachmentData: EmailAttachment = {
            orgId: normalized.orgId,
            emailId: emailId,
            messageKey, // NEW: Link to canonical message
            fileName: normalizeEmailString(attachment.fileName, 'attachment'),
            mimeType: normalizeEmailString(attachment.mimeType, 'application/octet-stream'),
            storagePath: storagePath,
            createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
          };

          await db.collection('emailAttachments').doc(attachmentId).set(sanitizeForFirestore(attachmentData));

          attachmentMeta.push({
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
          });
        } catch (error) {
          functions.logger.error(`Error processing attachment ${attachment.fileName}:`, error);
        }
      }
    }

    // ============================================
    // Step 5: Enqueue AI analysis (exactly-once)
    // ============================================
    if (isNewMessage) {
      const { generateEventId } = require('./analyzeEmailMessage');
      const eventId = generateEventId(messageKey, `sync_${emailId}`);
      const enqueueResult = await enqueueEmailAnalysis(concernId, messageKey, eventId);

      if (enqueueResult.status === 'queued') {
        // Process analysis inline (small emails)
        // For large scale, this could be moved to a separate Cloud Task
        const analysisResult = await processEmailAnalysis(concernId, messageKey, eventId);
        
        functions.logger.info(`AI analysis`, {
          messageKey: messageKey.substring(0, 8),
          status: analysisResult.status,
        });
      } else {
        functions.logger.info(`AI analysis skipped`, {
          messageKey: messageKey.substring(0, 8),
          reason: enqueueResult.status,
        });
      }
    }

    // ============================================
    // Step 6: Create email summary for Smart Inbox
    // ============================================
    // Always create emailSummaries for the Smart Inbox frontend
    if (!alreadyProcessed && ownerUid) {
      // Get analysis result from canonical message (may not exist yet for new emails)
      const canonicalDoc = await db.doc(`concerns/${concernId}/emailMessages/${messageKey}`).get();
      const canonicalData = canonicalDoc.data();
      const analysisResult = canonicalData?.analysisResult;

      const summaryData: EmailSummary = {
        orgId: normalized.orgId,
        accountId: normalized.accountId,
        messageKey,
        emailId: emailId,
        // HARDENED: Always include ownerUid for security scoping
        ownerUid: ownerUid,
        category: analysisResult?.category || 'andere',
        summaryBullets: normalizeArray(analysisResult?.summary),
        priority: analysisResult?.priority || 'normal',
        status: 'open',
        assignedTo: null,
        archived: false,
        isNew: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      };

      await db.collection('emailSummaries').doc(emailId).set(sanitizeForFirestore(summaryData));
      functions.logger.info('emailSummary created for Smart Inbox', {
        emailId: emailId.substring(0, 8),
        messageKey: messageKey.substring(0, 8),
        ownerUid: ownerUid.substring(0, 8),
        accountId: normalized.accountId.substring(0, 20),
      });
    }

    // Mark email as processed (always needed for legacy compatibility)
    if (!alreadyProcessed) {
      const canonicalDoc = await db.doc(`concerns/${concernId}/emailMessages/${messageKey}`).get();
      const canonicalData = canonicalDoc.data();
      const analysisResult = canonicalData?.analysisResult;

      // Use safeMergeWrite to avoid undefined values causing errors
      const emailRef = db.collection('emails').doc(emailId);
      await safeMergeWrite(emailRef, {
        processed: true,
        category: analysisResult?.category || 'andere',
        // Only include categoryConfidence if it's defined
        ...(analysisResult?.confidence !== undefined && { categoryConfidence: analysisResult.confidence }),
      }, 'processEmail:markProcessed');
    }

    // ============================================
    // Step 7: Run email pipeline (spam check, routing, procurement)
    // ============================================
    if (isNewMessage && ownerUid) {
      try {
        const { runEmailPipeline } = await import('./emailPipeline');
        
        const pipelineResult = await runEmailPipeline({
          emailId,
          messageKey,
          concernId,
          ownerUid,
          accountId: normalized.accountId,
        });
        
        functions.logger.info(`Pipeline completed`, {
          emailId: emailId.substring(0, 8),
          state: pipelineResult.state,
          ok: pipelineResult.ok,
        });
      } catch (pipelineError: any) {
        // Log but don't fail the email processing
        functions.logger.warn('Pipeline error (non-fatal)', {
          emailId: emailId.substring(0, 8),
          error: pipelineError.message?.substring(0, 100),
        });
      }
    }

    functions.logger.info(`Successfully processed email`, {
      emailId,
      messageKey: messageKey.substring(0, 8),
      isNewMessage,
    });
  } catch (error) {
    functions.logger.error('Error processing email:', error);
    throw error;
  }
}

/**
 * Batch process multiple emails
 * Now with proper error isolation - one failing email doesn't block others
 */
export async function processEmailBatch(emails: NormalizedEmail[]): Promise<{ 
  processed: number; 
  failed: number; 
  errors: string[];
}> {
  functions.logger.info(`Processing batch of ${emails.length} emails`);
  
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];
  
  // Process in parallel with rate limiting (reduced batch size for stability)
  const batchSize = 3; // Reduced from 5 to avoid overwhelming Gemini API
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    // Use Promise.allSettled to handle individual failures gracefully
    const results = await Promise.allSettled(
      batch.map(email => processEmail(email))
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        processed++;
      } else {
        failed++;
        const errorMsg = result.reason?.message || String(result.reason);
        errors.push(errorMsg.substring(0, 100)); // Limit error message length
        functions.logger.warn('Email processing failed (non-fatal):', {
          error: errorMsg.substring(0, 200),
        });
      }
    }
  }
  
  functions.logger.info(`Batch processing complete: ${processed} ok, ${failed} failed`);
  
  return { processed, failed, errors };
}

