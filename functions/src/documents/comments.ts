import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

export const onCommentWrite = functions.firestore
  .document('project_documents/{documentId}/comments/{commentId}')
  .onWrite(async (change, context) => {
    const documentId = context.params.documentId as string;
    const parentRef = db.collection('project_documents').doc(documentId);

    if (!change.before.exists && change.after.exists) {
      await parentRef.update({ commentCount: admin.firestore.FieldValue.increment(1) });
    } else if (change.before.exists && !change.after.exists) {
      await parentRef.update({ commentCount: admin.firestore.FieldValue.increment(-1) });
    }
  });














