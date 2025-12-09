import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const checkTaskReminders = functions.pubsub.schedule('every 60 minutes').onRun(async () => {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 3600 * 1000);
  const tasksSnap = await db.collection('tasks')
    .where('status', 'in', ['todo','in_progress','blocked'])
    .where('dueAt', '<=', admin.firestore.Timestamp.fromDate(soon))
    .get();

  const batch = db.batch();
  let updates = 0;
  for (const docSnap of tasksSnap.docs) {
    const data = docSnap.data() as any;
    const dueAt = data.dueAt?.toDate ? data.dueAt.toDate() : null;
    if (!dueAt) continue;

    // Reminder window
    // TODO: integrate FCM/email (feature #6)
    const isOverdue = now.getTime() > (dueAt.getTime() + 1 * 3600 * 1000) && data.status !== 'done' && data.status !== 'archived';
    if (isOverdue && data.status !== 'blocked') {
      batch.update(docSnap.ref, { status: 'blocked', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      updates++;
    }
  }
  if (updates > 0) {
    await batch.commit();
  }

  return null;
});



