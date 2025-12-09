/**
 * Delete incomingEmails Collection
 * Removes the unused test-only collection from Firestore
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const deleteIncomingEmailsCollection = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Only authenticated users can delete (no admin check for simplicity)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    functions.logger.info(`User ${context.auth.uid} requesting deletion of incomingEmails`);

    try {
      functions.logger.info('Starting deletion of incomingEmails collection');

      // Get all documents
      const snapshot = await db.collection('incomingEmails').get();
      
      if (snapshot.empty) {
        return {
          success: true,
          message: 'Collection is already empty',
          deletedCount: 0,
        };
      }

      functions.logger.info(`Found ${snapshot.size} documents to delete`);

      let deletedCount = 0;
      let batch = db.batch();
      let batchSize = 0;

      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        deletedCount++;
        batchSize++;

        // Firestore batch limit is 500
        if (batchSize >= 450) {
          await batch.commit();
          functions.logger.info(`Committed batch (${deletedCount} deleted so far)`);
          batch = db.batch();
          batchSize = 0;
        }
      }

      // Commit remaining deletes
      if (batchSize > 0) {
        await batch.commit();
      }

      functions.logger.info(`Successfully deleted ${deletedCount} documents`);

      return {
        success: true,
        message: `Erfolgreich ${deletedCount} Dokumente aus incomingEmails gelöscht`,
        deletedCount,
      };
    } catch (error: any) {
      functions.logger.error('Error deleting incomingEmails:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

