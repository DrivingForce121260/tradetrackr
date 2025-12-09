import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { executeReport } from './executeReport';

const storage = admin.storage();

function rowsToHtml(title: string, rows: any[]): string {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const th = headers.map((h) => `<th style="text-align:left;border-bottom:1px solid #ddd;padding:8px">${h}</th>`).join('');
  const tr = rows
    .map((r, i) =>
      `<tr style="background:${i % 2 ? '#fafafa' : 'white'}">${headers
        .map((h) => `<td style="padding:8px;border-bottom:1px solid #eee">${(r as any)[h] ?? ''}</td>`)
        .join('')}</tr>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h2>${title}</h2><table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">${
    `<thead><tr>${th}</tr></thead><tbody>${tr}</tbody>`
  }</table></body></html>`;
}

export const exportReport = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
  const { template, format = 'csv' } = data || {};
  if (!template) throw new functions.https.HttpsError('invalid-argument', 'Template erforderlich');

  // Get rows
  const res: any = await (executeReport as any).run({ data: { template, preview: false, limit: 5000 }, context });
  const rows = res?.rows || [];

  const bucket = storage.bucket();
  const base = `reports/${template.concernID}/${template.id || 'adhoc'}_${Date.now()}`;
  let path = '';
  if (format === 'csv') {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const csv = [headers.join(',')].concat(rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))).join('\n');
    path = `${base}.csv`;
    await bucket.file(path).save(csv, { contentType: 'text/csv;charset=utf-8' });
  } else if (format === 'pdf' || format === 'html') {
    const html = rowsToHtml(template.name || 'Report', rows);
    path = `${base}.${format === 'pdf' ? 'pdf' : 'html'}`;
    if (format === 'pdf') {
      // fallback: store html if PDF engine is unavailable in runtime
      try {
        // Store HTML to be safe; a separate renderer can convert to PDF
        await bucket.file(`${base}.html`).save(html, { contentType: 'text/html;charset=utf-8' });
      } catch {}
    }
    await bucket.file(path).save(html, { contentType: 'text/html;charset=utf-8' });
  }

  const [url] = await bucket.file(path).getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return { url, path };
});














