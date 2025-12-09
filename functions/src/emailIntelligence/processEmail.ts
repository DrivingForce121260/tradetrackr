/**
 * Email Intelligence Agent - Email Processing
 * Processes normalized emails: stores in Firestore, uploads attachments, runs LLM analysis
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { NormalizedEmail, IncomingEmail, EmailAttachment, EmailSummary } from './types';
import { runLLMAnalysis } from './llmAnalysis';
import { randomUUID } from 'crypto';

const db = admin.firestore();
const storage = admin.storage();

/**
 * Process a normalized email:
 * 1. Store email document in Firestore
 * 2. Upload attachments to Storage
 * 3. Run LLM analysis
 * 4. Create email summary
 */
export async function processEmail(normalized: NormalizedEmail): Promise<void> {
  try {
    // Check for duplicate by providerMessageId
    const existingEmailQuery = await db.collection('emails')
      .where('accountId', '==', normalized.accountId)
      .where('providerMessageId', '==', normalized.providerMessageId)
      .limit(1)
      .get();

    if (!existingEmailQuery.empty) {
      functions.logger.info(`Email already exists (providerMessageId: ${normalized.providerMessageId}), skipping`);
      return;
    }

    const emailId = randomUUID().replace(/-/g, '');
    
    functions.logger.info(`Processing email ${emailId} from ${normalized.from}`);

    // Step 1: Create base email record
    const emailData: IncomingEmail = {
      orgId: normalized.orgId,
      accountId: normalized.accountId,
      provider: normalized.provider,
      providerMessageId: normalized.providerMessageId,
      threadId: normalized.threadId,
      from: normalized.from,
      to: normalized.to,
      cc: normalized.cc,
      subject: normalized.subject,
      bodyText: normalized.bodyText,
      bodyHtml: normalized.bodyHtml,
      receivedAt: admin.firestore.Timestamp.fromDate(normalized.receivedAt),
      hasAttachments: normalized.attachments.length > 0,
      processed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };

    await db.collection('emails').doc(emailId).set(emailData);

    // Step 2: Process attachments
    const attachmentMeta: Array<{ fileName: string; mimeType: string }> = [];
    
    for (const attachment of normalized.attachments) {
      try {
        const attachmentId = randomUUID().replace(/-/g, '');
        const storagePath = `emails/${normalized.orgId}/${emailId}/${attachment.fileName}`;

        // Upload to Cloud Storage
        const bucket = storage.bucket();
        const file = bucket.file(storagePath);
        
        await file.save(attachment.data, {
          metadata: {
            contentType: attachment.mimeType,
          },
        });

        functions.logger.info(`Uploaded attachment: ${storagePath}`);

        // Create attachment record
        const attachmentData: EmailAttachment = {
          orgId: normalized.orgId,
          emailId: emailId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          storagePath: storagePath,
          createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        };

        await db.collection('emailAttachments').doc(attachmentId).set(attachmentData);

        attachmentMeta.push({
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
        });
      } catch (error) {
        functions.logger.error(`Error processing attachment ${attachment.fileName}:`, error);
      }
    }

    // Step 3: Run LLM Analysis
    const analysis = await runLLMAnalysis(
      normalized.subject,
      normalized.bodyText,
      attachmentMeta
    );

    functions.logger.info(`LLM analysis result: ${analysis.category} (${analysis.confidence})`);

    // Step 4: Update email with category
    await db.collection('emails').doc(emailId).update({
      category: analysis.category,
      categoryConfidence: analysis.confidence,
    });

    // Step 5: Create email summary
    const summaryData: EmailSummary = {
      orgId: normalized.orgId,
      emailId: emailId,
      category: analysis.category,
      summaryBullets: analysis.summary_bullets,
      priority: analysis.priority,
      status: 'open',
      assignedTo: null,
      archived: false, // Not archived by default
      isNew: true, // Mark new emails
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };

    await db.collection('emailSummaries').doc(emailId).set(summaryData);

    // Step 6: Update attachment document types (if identified)
    if (analysis.document_types.length > 0) {
      const attachments = await db
        .collection('emailAttachments')
        .where('emailId', '==', emailId)
        .get();

      let docTypeIndex = 0;
      for (const doc of attachments.docs) {
        if (docTypeIndex < analysis.document_types.length) {
          await doc.ref.update({
            docType: analysis.document_types[docTypeIndex],
          });
          docTypeIndex++;
        }
      }
    }

    // Step 7: Mark email as processed
    await db.collection('emails').doc(emailId).update({
      processed: true,
    });

    functions.logger.info(`Successfully processed email ${emailId}`);
  } catch (error) {
    functions.logger.error('Error processing email:', error);
    throw error;
  }
}

/**
 * Batch process multiple emails
 */
export async function processEmailBatch(emails: NormalizedEmail[]): Promise<void> {
  functions.logger.info(`Processing batch of ${emails.length} emails`);
  
  // Process in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    await Promise.all(batch.map(email => processEmail(email)));
  }
}

