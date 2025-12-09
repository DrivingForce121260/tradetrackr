import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const cleanupOldNotifications = functions.pubsub.schedule('0 2 * * *').onRun(async () => {
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const snap = await db.collection('notifications').where('createdAt','<', admin.firestore.Timestamp.fromDate(cutoff)).limit(500).get();
  const batch = db.batch();
  for (const d of snap.docs) batch.delete(d.ref);
  if ((snap.docs.length||0) > 0) await batch.commit();
  return null;
});















