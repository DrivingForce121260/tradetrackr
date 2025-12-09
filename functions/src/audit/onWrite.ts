import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'DELETE_CONFIRMED';

interface AuditEntry {
	entityType: string;
	entityId: string;
	action: AuditAction;
	actorId?: string;
	actorName?: string;
	timestamp: FirebaseFirestore.FieldValue;
	before?: any;
	after?: any;
	ipAddress?: string;
}

async function writeAudit(entityType: string, entityId: string, action: AuditAction, before: any, after: any, context: functions.EventContext) {
	const actorId = context.auth?.uid;
	const entry: AuditEntry = {
		entityType,
		entityId,
		action,
		actorId,
		timestamp: admin.firestore.FieldValue.serverTimestamp(),
		before: before ?? null,
		after: after ?? null,
	};
	await db.collection('auditLogs').add(entry);
}

function makeOnWrite(path: string, entityType: string) {
	return functions.firestore.document(path).onWrite(async (change, context) => {
		const before = change.before.exists ? change.before.data() : null;
		const after = change.after.exists ? change.after.data() : null;
		let action: AuditAction = 'UPDATE';
		if (!before && after) action = 'CREATE';
		else if (before && !after) action = 'DELETE';
		await writeAudit(entityType, context.params?.[Object.keys(context.params)[0]] as string, action, before, after, context);
	});
}

export const onProjectsWrite = makeOnWrite('projects/{id}', 'projects');
export const onMaterialsWrite = makeOnWrite('materials/{id}', 'materials');
export const onPersonnelWrite = makeOnWrite('personnel/{id}', 'personnel');
export const onClientsWrite = makeOnWrite('clients/{id}', 'clients');
export const onInvoicesWrite = makeOnWrite('invoices/{id}', 'invoices');
export const onTasksWrite = makeOnWrite('tasks/{id}', 'tasks');
export const onPunchesWrite = makeOnWrite('punches/{id}', 'timeEntries');












