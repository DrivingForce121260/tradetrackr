/**
 * Cleanup Script: Remove duplicate emails based on providerMessageId
 * Run this once after deploying the duplicate check fix
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface EmailDoc {
  id: string;
  accountId: string;
  providerMessageId: string;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Cloud Function to clean up duplicate emails
 * Can be triggered manually via Cloud Console or HTTP
 */
export const cleanupDuplicateEmails = functions
  .region('europe-west1')
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
        'Only admins can run this cleanup'
      );
    }

    try {
      functions.logger.info('Starting duplicate email cleanup...');

      // Get all emails
      const emailsSnapshot = await db.collection('emails').get();
      
      functions.logger.info(`Found ${emailsSnapshot.size} total emails`);

      // Group by accountId + providerMessageId
      const emailMap = new Map<string, EmailDoc[]>();

      for (const doc of emailsSnapshot.docs) {
        const data = doc.data();
        const key = `${data.accountId}__${data.providerMessageId}`;
        
        const emailDoc: EmailDoc = {
          id: doc.id,
          accountId: data.accountId,
          providerMessageId: data.providerMessageId,
          createdAt: data.createdAt,
        };

        if (!emailMap.has(key)) {
          emailMap.set(key, []);
        }
        emailMap.get(key)!.push(emailDoc);
      }

      // Find duplicates
      let duplicateCount = 0;
      let deletedCount = 0;
      let batch = db.batch();
      let batchSize = 0;

      for (const [key, emails] of emailMap.entries()) {
        if (emails.length > 1) {
          duplicateCount += emails.length - 1;
          
          // Sort by createdAt, keep the oldest one
          emails.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return aTime - bTime;
          });

          functions.logger.info(
            `Found ${emails.length} duplicates for ${key}, keeping ${emails[0].id}`
          );

          // Delete all except the first (oldest) one
          for (let i = 1; i < emails.length; i++) {
            const emailId = emails[i].id;
            
            // Delete email document
            batch.delete(db.collection('emails').doc(emailId));
            
            // Delete related emailSummaries
            const summaryRef = db.collection('emailSummaries').doc(emailId);
            const summarySnap = await summaryRef.get();
            if (summarySnap.exists) {
              batch.delete(summaryRef);
            }

            // Delete related attachments
            const attachmentsSnap = await db
              .collection('emailAttachments')
              .where('emailId', '==', emailId)
              .get();
            
            for (const attDoc of attachmentsSnap.docs) {
              batch.delete(attDoc.ref);
            }

            deletedCount++;
            batchSize++;

            // Firestore batch limit is 500
            if (batchSize >= 450) {
              await batch.commit();
              functions.logger.info(`Committed batch (${deletedCount} deleted so far)`);
              // Create new batch for next operations
              batch = db.batch();
              batchSize = 0;
            }
          }
        }
      }

      // Commit remaining deletes
      if (batchSize > 0) {
        await batch.commit();
      }

      functions.logger.info(
        `Cleanup complete: Found ${duplicateCount} duplicates, deleted ${deletedCount} emails`
      );

      return {
        success: true,
        totalEmails: emailsSnapshot.size,
        duplicatesFound: duplicateCount,
        duplicatesDeleted: deletedCount,
      };
    } catch (error) {
      functions.logger.error('Cleanup error:', error);
      throw new functions.https.HttpsError('internal', 'Cleanup failed');
    }
  });

