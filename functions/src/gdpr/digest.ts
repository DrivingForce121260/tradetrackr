import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const weeklyAuditDigest = functions.pubsub.schedule('every monday 09:00').timeZone('Europe/Berlin').onRun(async () => {
	const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
	const logs = await db.collection('auditLogs').where('timestamp', '>=', admin.firestore.Timestamp.fromDate(weekAgo)).limit(10000).get();
	
	const stats: Record<string, { CREATE: number; UPDATE: number; DELETE: number; EXPORT: number }> = {};
	const deletions: any[] = [];
	
	logs.docs.forEach(d => {
		const data = d.data();
		const et = data.entityType || 'unknown';
		const act = data.action || 'UPDATE';
		if (!stats[et]) stats[et] = { CREATE: 0, UPDATE: 0, DELETE: 0, EXPORT: 0 };
		stats[et][act as keyof typeof stats[string]] = (stats[et][act as keyof typeof stats[string]] || 0) + 1;
		if (act === 'DELETE' || act === 'DELETE_CONFIRMED') {
			deletions.push({ type: et, id: data.entityId, actor: data.actorId, when: data.timestamp });
		}
	});

	const admins = await db.collection('users').where('role', '==', 'admin').limit(50).get();
	const emails = admins.docs.map(d => d.data().email).filter(Boolean);
	
	const summary = `Audit Digest (last 7 days)\n\nActions by entity:\n${Object.entries(stats).map(([k, v]) => `  ${k}: ${v.CREATE} creates, ${v.UPDATE} updates, ${v.DELETE} deletes, ${v.EXPORT} exports`).join('\n')}\n\nDeletions (${deletions.length}):\n${deletions.slice(0, 20).map(d => `  ${d.type}/${d.id} by ${d.actor} at ${d.when?.toDate?.()?.toISOString?.() || d.when}`).join('\n')}`;

	// Store digest in Firestore; in production, send email via your email service
	await db.collection('auditDigests').add({
		generatedAt: admin.firestore.FieldValue.serverTimestamp(),
		summary,
		recipients: emails,
		stats,
		deletionCount: deletions.length,
	});

	return null;
});













