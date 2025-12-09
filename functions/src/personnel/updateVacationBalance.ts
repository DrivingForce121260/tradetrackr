import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const updateVacationBalance = functions.pubsub.schedule('0 3 * * *').onRun(async () => {
  const now = new Date();
  if (now.getMonth() !== 0 || now.getDate() !== 1) return null; // Jan 1
  const snap = await db.collection('personnel').get();
  const batch = db.batch();
  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const balance = Number(data.vacationBalance||0);
    const carry = Math.min(balance, 5); // example carry-over cap
    batch.update(doc.ref, { vacationBalance: carry, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  await batch.commit();
  return null;
});















