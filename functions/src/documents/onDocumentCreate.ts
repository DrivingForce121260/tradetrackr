/**
 * Cloud Function: On Document Create Trigger
 * 
 * Lightweight post-upload hook to enqueue routing.
 * Triggers automatically when a new document is added to Firestore.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onDocumentCreate = functions.firestore
  .document('documents/{docId}')
  .onCreate(async (snapshot, context) => {
    const docData = snapshot.data();
    const docId = context.params.docId;

    console.log('[onDocumentCreate] New document created:', docId);

    try {
      // Ensure status is set to 'uploaded' if missing
      if (!docData.status) {
        await snapshot.ref.update({ status: 'uploaded' });
        console.log('[onDocumentCreate] Set status to uploaded for:', docId);
      }

      // Optional: Auto-trigger routing if minimal fields are present
      // For now, we let the client trigger routing explicitly
      // This keeps the system predictable and reduces automatic processing

      // Log audit trail
      await db.collection('auditLogs').add({
        collection: 'documents',
        documentId: docId,
        action: 'created',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: docData.createdBy,
        concernId: docData.concernId,
        metadata: {
          filename: docData.originalFilename,
          mimeType: docData.mimeType,
          sizeBytes: docData.sizeBytes
        }
      });

      console.log('[onDocumentCreate] Audit log created for:', docId);

    } catch (error) {
      console.error('[onDocumentCreate] Error processing document:', error);
      // Don't throw - we don't want to fail the document creation
    }
  });













