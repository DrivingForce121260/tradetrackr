import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onWorkOrderWrite = functions.firestore
	.document('workOrders/{orderId}')
	.onWrite(async (change, context) => {
		const after = change.after.exists ? change.after.data() : null;
		const before = change.before.exists ? change.before.data() : null;
		if (!after) return;

		const updates: any = {};
		// Auto-complete timestamp
		if (after.status === 'completed' && (!after.completedAt)) {
			updates.completedAt = admin.firestore.FieldValue.serverTimestamp();
		}

		// Notification on assignment
		if ((!before || (before.assignedUsers || []).join(',') !== (after.assignedUsers || []).join(',')) && (after.assignedUsers || []).length) {
			const recipients: string[] = after.assignedUsers || [];
			const notifRef = db.collection('notifications').doc();
			await notifRef.set({
				recipients,
				topic: 'workorder.assigned',
				title: `Neuer Arbeitsauftrag: ${after.title || after.orderNumber || ''}`,
				body: `Fällig: ${after.dueDate ? new Date(after.dueDate).toLocaleDateString('de-DE') : '-'}`,
				data: { type: 'workorder', orderId: context.params.orderId },
				createdAt: admin.firestore.FieldValue.serverTimestamp(),
				read: false,
			});
		}

		if (Object.keys(updates).length) {
			await change.after.ref.update(updates);
		}
	});












