import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

async function createNotification(payload: {
  type: string;
  entity: string;
  entityId: string;
  recipients: string[];
  title: string;
  body: string;
  meta?: any;
}) {
  const doc = await db.collection('notifications').add({
    ...payload,
    readBy: [],
    deletedBy: [],
    status: 'queued',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return doc.id;
}

export const onTaskWrite = functions.firestore
  .document('tasks/{taskId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() as any : null;
    const before = change.before.exists ? change.before.data() as any : null;
    if (!after) return;
    const recipients: string[] = after.assigneeIds || [];
    if (!recipients.length) return;
    const isCreate = !before;
    const title = isCreate ? 'Neue Aufgabe' : 'Aufgabe aktualisiert';
    const body = after.title || 'Aufgabe aktualisiert';
    await createNotification({ type: 'task', entity: 'tasks', entityId: context.params.taskId, recipients, title, body, meta: { status: after.status, priority: after.priority } });
  });

export const onScheduleWrite = functions.firestore
  .document('scheduleSlots/{slotId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() as any : null;
    if (!after) return;
    const recipients: string[] = after.assigneeIds || [];
    if (!recipients.length) return;
    const title = 'Termin aktualisiert';
    const body = `Projekt ${after.projectId}: ${new Date((after.start?.toDate?.()||new Date(after.start))).toLocaleString()} - ${new Date((after.end?.toDate?.()||new Date(after.end))).toLocaleString()}`;
    await createNotification({ type: 'schedule', entity: 'scheduleSlots', entityId: context.params.slotId, recipients, title, body, meta: { projectId: after.projectId } });
  });

export const onInvoiceWrite = functions.firestore
  .document('invoices/{invoiceId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() as any : null;
    if (!after) return;
    const recipients: string[] = (after.recipients || after.customerUserIds || []).slice(0, 50);
    if (!recipients.length) return;
    const title = 'Rechnungsstatus aktualisiert';
    const body = `Rechnung ${after.number || context.params.invoiceId}: ${after.state || after.status}`;
    await createNotification({ type: 'invoice', entity: 'invoices', entityId: context.params.invoiceId, recipients, title, body, meta: { state: after.state || after.status } });
  });

export const onVacationRequestWrite = functions.firestore
  .document('personnel/{empId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() as any : null;
    const before = change.before.exists ? change.before.data() as any : null;
    if (!after) return;
    const requests: any[] = after.vacationRequests || [];
    const prev = (before?.vacationRequests || []) as any[];
    // Detect newly approved or status changes and notify the employee
    for (const r of requests) {
      const old = prev.find(x=>x.id===r.id);
      if (!old || old.status !== r.status) {
        const title = 'Urlaubsantrag aktualisiert';
        const body = `${new Date((r.start?.toDate?.()||new Date(r.start))).toLocaleDateString()} - ${new Date((r.end?.toDate?.()||new Date(r.end))).toLocaleDateString()}: ${r.status}`;
        await createNotification({ type: 'vacation', entity: 'personnel', entityId: context.params.empId, recipients: [context.params.empId], title, body, meta: { requestId: r.id, status: r.status } });
      }
    }
  });















