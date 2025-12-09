import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

export const onProjectDocumentWrite = functions.firestore
  .document('project_documents/{documentId}')
  .onWrite(async (change, context) => {
    const docId = context.params.documentId as string;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let action: 'create' | 'update' | 'delete' = 'update';
    if (!before && after) action = 'create';
    else if (before && !after) action = 'delete';

    const entry = {
      documentId: docId,
      action,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: (after || before)?.uploadedBy || null,
      userEmail: (after || before)?.uploadedByEmail || null,
      details: {
        concernID: (after || before)?.concernID,
        projectId: (after || before)?.projectId,
        version: (after || before)?.version,
      },
      previousValue: before || null,
      newValue: after || null,
    };

    await db.collection('audits').add(entry);
  });














