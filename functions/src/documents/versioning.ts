import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

// Maintains simple versioning and trims to last 5 versions (metadata copy)
export const onProjectDocumentCreate = functions.firestore
  .document('project_documents/{documentId}')
  .onCreate(async (snap, context) => {
    const data = snap.data() as any;
    const { concernID, projectId, originalFileName } = data || {};
    if (!concernID || !projectId || !originalFileName) return;

    // Find existing docs with same filename in same project
    const existing = await db.collection('project_documents')
      .where('concernID', '==', concernID)
      .where('projectId', '==', projectId)
      .where('originalFileName', '==', originalFileName)
      .orderBy('uploadDate', 'desc')
      .get();

    // If this is the first, ensure version is 1
    if (existing.empty) {
      await snap.ref.update({ version: 1 });
      return;
    }

    // Determine next version number
    let maxVersion = 0;
    existing.forEach(d => {
      const v = (d.data().version as number) || 1;
      if (v > maxVersion) maxVersion = v;
    });

    const nextVersion = Math.max(1, maxVersion + 1);
    await snap.ref.update({ version: nextVersion });

    // Keep only last 5 versions by archiving older ones
    const sameDocs = await db.collection('project_documents')
      .where('concernID', '==', concernID)
      .where('projectId', '==', projectId)
      .where('originalFileName', '==', originalFileName)
      .orderBy('version', 'desc')
      .get();

    const toArchive = sameDocs.docs.slice(5); // older than 5 newest versions
    const batch = db.batch();
    toArchive.forEach(docSnap => {
      batch.update(docSnap.ref, { isArchived: true, status: 'archived' });
    });
    if (!toArchive.length) return;
    await batch.commit();
  });














