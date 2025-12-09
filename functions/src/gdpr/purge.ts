import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

const COLLECTIONS = ['projects','materials','personnel','clients','invoices','tasks','punches'];

export const purgeSoftDeleted = functions.pubsub.schedule('every 24 hours').onRun(async () => {
	const now = Date.now();
	for (const col of COLLECTIONS) {
		const qs = await db.collection(col).where('toBeDeletedAt', '<=', new Date(now)).limit(1000).get();
		for (const doc of qs.docs) {
			try {
				await doc.ref.delete();
				await db.collection('auditLogs').add({
					entityType: col,
					entityId: doc.id,
					action: 'DELETE_CONFIRMED',
					timestamp: admin.firestore.FieldValue.serverTimestamp(),
					before: null,
					after: null,
				});
			} catch (e) {
				console.error('Purge error', col, doc.id, e);
			}
		}
	}
	return null;
});












