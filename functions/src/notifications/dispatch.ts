import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const dispatchFCM = functions.pubsub.schedule('every 1 minutes').onRun(async () => {
  const snap = await db.collection('notifications').where('status','==','queued').limit(50).get();
  if (snap.empty) return null;
  const messaging = admin.messaging();
  for (const doc of snap.docs) {
    const n = doc.data() as any;
    try {
      const tokens: string[] = (n.recipients || []).map((uid:string)=>`/topics/user:${uid}`);
      const message = {
        notification: { title: n.title, body: n.body },
        data: { type: n.type, entity: n.entity, entityId: n.entityId },
      } as any;

      // Send to topics one by one
      for (const t of tokens) {
        await messaging.send({ ...message, topic: t.replace('/topics/','') });
      }

      await doc.ref.update({ status: 'sent', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (e) {
      await doc.ref.update({ status: 'error', error: String(e), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }
  return null;
});















