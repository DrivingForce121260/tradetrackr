/**
 * Email Intelligence Agent - Attachment Management
 * Handles attachment download and signed URL generation
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const storage = admin.storage();

/**
 * Generate signed URL for email attachment download
 */
export const getAttachmentDownloadUrl = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const { attachmentId } = data;

    if (!attachmentId) {
      throw new functions.https.HttpsError('invalid-argument', 'Attachment ID required');
    }

    try {
      // Get attachment metadata
      const attachmentDoc = await db.collection('emailAttachments').doc(attachmentId).get();

      if (!attachmentDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Attachment not found');
      }

      const attachment = attachmentDoc.data()!;

      // Verify user has access to this org
      const userDoc = await db.collection('users').doc(context.auth.uid).get();
      const userData = userDoc.data();
      const userOrgId = userData?.concernID || userData?.ConcernID;

      if (userOrgId !== attachment.orgId) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied to this attachment');
      }

      // Generate signed URL (valid for 1 hour)
      const bucket = storage.bucket();
      const file = bucket.file(attachment.storagePath);

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      functions.logger.info(`Generated download URL for attachment ${attachmentId}`);

      return {
        downloadUrl: signedUrl,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        expiresIn: 3600, // seconds
      };
    } catch (error: any) {
      functions.logger.error('Error generating download URL:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to generate download URL: ${error.message}`
      );
    }
  });

/**
 * Batch download multiple attachments
 */
export const getAttachmentDownloadUrls = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const { attachmentIds } = data;

    if (!attachmentIds || !Array.isArray(attachmentIds)) {
      throw new functions.https.HttpsError('invalid-argument', 'Attachment IDs array required');
    }

    try {
      const userDoc = await db.collection('users').doc(context.auth.uid).get();
      const userData = userDoc.data();
      const userOrgId = userData?.concernID || userData?.ConcernID;

      const results: any[] = [];
      const bucket = storage.bucket();

      for (const attachmentId of attachmentIds) {
        try {
          const attachmentDoc = await db.collection('emailAttachments').doc(attachmentId).get();

          if (!attachmentDoc.exists) {
            results.push({
              attachmentId,
              error: 'Not found',
            });
            continue;
          }

          const attachment = attachmentDoc.data()!;

          // Verify access
          if (userOrgId !== attachment.orgId) {
            results.push({
              attachmentId,
              error: 'Access denied',
            });
            continue;
          }

          // Generate signed URL
          const file = bucket.file(attachment.storagePath);
          const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
          });

          results.push({
            attachmentId,
            downloadUrl: signedUrl,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
          });
        } catch (error: any) {
          results.push({
            attachmentId,
            error: error.message,
          });
        }
      }

      return {
        attachments: results,
        expiresIn: 3600,
      };
    } catch (error: any) {
      functions.logger.error('Error generating batch download URLs:', error);
      throw new functions.https.HttpsError('internal', 'Failed to generate download URLs');
    }
  });









