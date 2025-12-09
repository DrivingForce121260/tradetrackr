/**
 * Re-analyze existing emails
 * Re-runs LLM analysis on existing emails that have fallback summaries
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { runLLMAnalysis } from './llmAnalysis';

const db = admin.firestore();

/**
 * Cloud Function to re-analyze existing emails
 */
export const reanalyzeEmails = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    // Check admin permission
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    if (userData?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied', 
        'Only admins can run this re-analysis'
      );
    }

    try {
      functions.logger.info('Starting email re-analysis...');

      // Get ALL email summaries and filter for fallback text
      const summariesSnapshot = await db.collection('emailSummaries').get();
      
      functions.logger.info(`Checking ${summariesSnapshot.size} total email summaries`);
      
      // Filter for summaries with fallback text
      const fallbackDocs = summariesSnapshot.docs.filter(doc => {
        const data = doc.data();
        const bullets = data.summaryBullets || [];
        return bullets.some(b => 
          b.includes('manuelle Überprüfung erforderlich') || 
          b.includes('manual Überprüfung eforderlich') ||
          b.includes('E-Mail erhalten -')
        );
      });
      
      functions.logger.info(`Found ${fallbackDocs.length} emails with fallback summaries`);

      let successCount = 0;
      let failureCount = 0;

      for (const summaryDoc of fallbackDocs) {
        try {
          const summaryData = summaryDoc.data();
          const emailId = summaryData.emailId;

          // Get email details
          const emailDoc = await db.collection('emails').doc(emailId).get();
          
          if (!emailDoc.exists) {
            functions.logger.warn(`Email ${emailId} not found, skipping`);
            failureCount++;
            continue;
          }

          const emailData = emailDoc.data() as any;

          // Get attachments
          const attachmentsSnap = await db.collection('emailAttachments')
            .where('emailId', '==', emailId)
            .get();

          const attachmentMeta = attachmentsSnap.docs.map(doc => {
            const data = doc.data();
            return {
              fileName: data.fileName,
              mimeType: data.mimeType,
            };
          });

          // Re-run LLM analysis
          functions.logger.info(`Re-analyzing email ${emailId}: "${emailData.subject}"`);
          
          const analysis = await runLLMAnalysis(
            emailData.subject || '',
            emailData.bodyText || '',
            attachmentMeta
          );

          functions.logger.info(`Analysis result: ${analysis.category} (confidence: ${analysis.confidence})`);

          // Update email category
          await emailDoc.ref.update({
            category: analysis.category,
            categoryConfidence: analysis.confidence,
          });

          // Update email summary
          await summaryDoc.ref.update({
            category: analysis.category,
            summaryBullets: analysis.summary_bullets,
            priority: analysis.priority,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update attachment document types
          if (analysis.document_types.length > 0 && attachmentsSnap.docs.length > 0) {
            let docTypeIndex = 0;
            for (const attDoc of attachmentsSnap.docs) {
              if (docTypeIndex < analysis.document_types.length) {
                await attDoc.ref.update({
                  docType: analysis.document_types[docTypeIndex],
                });
                docTypeIndex++;
              }
            }
          }

          successCount++;
          
          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: any) {
          functions.logger.error(`Error re-analyzing email ${summaryDoc.id}:`, error);
          failureCount++;
        }
      }

      functions.logger.info(
        `Re-analysis complete: ${successCount} successful, ${failureCount} failed`
      );

      return {
        success: true,
        totalProcessed: summariesSnapshot.size,
        successful: successCount,
        failed: failureCount,
      };
    } catch (error) {
      functions.logger.error('Re-analysis error:', error);
      throw new functions.https.HttpsError('internal', 'Re-analysis failed');
    }
  });

