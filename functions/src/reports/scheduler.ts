import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { executeReport } from './executeReport';

const db = admin.firestore();
const storage = admin.storage();

function toCsv(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(',')].concat(rows.map((r) => headers.map((h) => esc((r as any)[h])).join(',')));
  return lines.join('\n');
}

export const scheduledReportRunner = functions.pubsub.schedule('every 15 minutes').onRun(async () => {
  const now = Date.now();
  const snap = await db
    .collection('scheduledReports')
    .where('active', '==', true)
    .where('nextRunAt', '<=', now)
    .limit(50)
    .get();

  for (const doc of snap.docs) {
    const sched = doc.data() as any;
    try {
      // Impersonation minimal: fetch template
      const tRef = db.collection('reportTemplates').doc(sched.templateId);
      const tSnap = await tRef.get();
      if (!tSnap.exists) continue;
      const template = { id: tSnap.id, ...(tSnap.data() as any) };

      // Execute via admin context: construct fake context for permission logic
      const fakeContext: any = { auth: { uid: sched.createdBy } };
      const result: any = await (executeReport as any).run({ data: { template, preview: false, limit: 5000 }, context: fakeContext });

      // Store CSV in Storage
      const rows = result?.rows || [];
      const csv = toCsv(rows);
      const bucket = storage.bucket();
      const filePath = `reports/${template.concernID}/${template.id}_${Date.now()}.csv`;
      const file = bucket.file(filePath);
      await file.save(csv, { contentType: 'text/csv;charset=utf-8' });
      const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });

      // Save result reference
      await db.collection('reportResults').add({
        templateId: template.id,
        runBy: sched.createdBy,
        runAt: Date.now(),
        rowCount: rows.length,
        concernID: template.concernID,
        storagePaths: { csv: filePath },
      });

      // Email recipients simple
      const recipients: string[] = sched.recipients || [];
      if (recipients.length) {
        await admin
          .firestore()
          .collection('outbox')
          .add({
            type: 'reportEmail',
            concernID: template.concernID,
            to: recipients,
            subject: `Report: ${template.name}`,
            html: `<p>Ihr Report ist bereit.</p><p><a href="${url}">CSV herunterladen</a></p>`,
            createdAt: Date.now(),
          });
      }

      // Update nextRunAt
      const next = new Date(now);
      if (sched.frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (sched.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else next.setMonth(next.getMonth() + 1);
      await doc.ref.update({ lastRunAt: now, nextRunAt: next.getTime() });
    } catch (e) {
      // mark error
      await doc.ref.update({ lastError: String(e), lastErrorAt: Date.now() });
    }
  }

  return null;
});














