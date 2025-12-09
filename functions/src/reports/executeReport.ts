import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

type Dataset = 'projects' | 'timeEntries' | 'materials' | 'invoices' | 'personnel';

interface Filter {
  field: string;
  op: FirebaseFirestore.WhereFilterOp | 'between' | 'contains';
  value: any;
  valueTo?: any;
}

interface AggregationConfig {
  op: 'sum' | 'avg' | 'count' | 'groupBy';
  field?: string;
  groupBy?: string[];
}

interface TemplateInput {
  id?: string;
  name: string;
  createdBy: string;
  concernID: string;
  dataset: Dataset;
  fields: string[];
  filters: Filter[];
  aggregation?: AggregationConfig;
}

interface ExecuteInput {
  template: TemplateInput;
  preview?: boolean;
  limit?: number;
}

function getCollectionForDataset(dataset: Dataset): string {
  switch (dataset) {
    case 'projects':
      return 'projects';
    case 'timeEntries':
      return 'timeEntries';
    case 'materials':
      return 'materials';
    case 'invoices':
      return 'invoices';
    case 'personnel':
      return 'users';
    default:
      return dataset;
  }
}

function applyFilters(q: FirebaseFirestore.Query, filters: Filter[]): FirebaseFirestore.Query {
  let query = q;
  for (const f of filters || []) {
    if (f.op === 'between') {
      if (f.value != null) query = query.where(f.field, '>=', f.value);
      if (f.valueTo != null) query = query.where(f.field, '<=', f.valueTo);
    } else if (f.op === 'contains') {
      // naive text contains: requires preindexed fields; skip server-side
      // will filter client side below
      continue;
    } else {
      query = query.where(f.field, f.op as FirebaseFirestore.WhereFilterOp, f.value);
    }
  }
  return query;
}

function filterClientSide(rows: any[], filters: Filter[]): any[] {
  return rows.filter((row) => {
    return (filters || []).every((f) => {
      if (f.op !== 'contains') return true;
      const v = row[f.field];
      if (v == null) return false;
      return String(v).toLowerCase().includes(String(f.value).toLowerCase());
    });
  });
}

function aggregateRows(rows: any[], cfg?: AggregationConfig) {
  if (!cfg) return {};
  if (cfg.op === 'count') return { count: rows.length };
  if ((cfg.op === 'sum' || cfg.op === 'avg') && cfg.field) {
    const nums = rows.map((r) => Number(r[cfg.field!]) || 0);
    const sum = nums.reduce((a, b) => a + b, 0);
    if (cfg.op === 'sum') return { [cfg.field]: sum };
    return { [cfg.field]: nums.length ? sum / nums.length : 0 };
  }
  if (cfg.op === 'groupBy' && cfg.groupBy && cfg.groupBy.length) {
    const groups: Record<string, number> = {};
    for (const r of rows) {
      const key = cfg.groupBy.map((k) => r[k]).join('|');
      groups[key] = (groups[key] || 0) + 1;
    }
    return groups;
  }
  return {};
}

export const executeReport = functions.https.onCall(async (data: ExecuteInput, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
  const { template, preview, limit = 500 } = data || {};
  if (!template) throw new functions.https.HttpsError('invalid-argument', 'Template erforderlich');

  // Permissions
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const user = userDoc.data() || {};
  const role = user.role as string;
  const concernID = user.concernID as string;
  if (!['admin', 'office', 'foreman', 'field'].includes(role)) {
    throw new functions.https.HttpsError('permission-denied', 'Rolle nicht erlaubt');
  }
  // Only allow within same concern
  if (template.concernID !== concernID) {
    throw new functions.https.HttpsError('permission-denied', 'Falscher Mandant');
  }

  // Build base query
  const collection = getCollectionForDataset(template.dataset);
  let query: FirebaseFirestore.Query = db.collection(collection);

  // Role-based restrictions: foreman/field limited to own projects/personnel
  if (['foreman', 'field'].includes(role)) {
    if (collection === 'projects') {
      query = query.where('assignedUsers', 'array-contains', context.auth.uid);
    }
    if (collection === 'timeEntries') {
      query = query.where('userId', '==', context.auth.uid);
    }
  }

  query = applyFilters(query, template.filters || []);
  // Cap preview size
  query = query.limit(preview ? Math.min(100, limit) : limit);
  const snap = await query.get();
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows = filterClientSide(rows, template.filters || []);

  // Project only selected fields
  if (template.fields && template.fields.length) {
    rows = rows.map((r) => {
      const projected: any = {};
      for (const f of template.fields) projected[f] = (r as any)[f];
      return projected;
    });
  }

  const aggregates = aggregateRows(rows, template.aggregation);

  // Save result metadata if not preview
  if (!preview) {
    const meta = {
      templateId: template.id || null,
      runBy: context.auth.uid,
      runAt: Date.now(),
      rowCount: rows.length,
      concernID,
    };
    const resRef = await db.collection('reportResults').add(meta);
    // Keep only latest 20 per user
    const old = await db
      .collection('reportResults')
      .where('runBy', '==', context.auth.uid)
      .orderBy('runAt', 'desc')
      .offset(20)
      .limit(100)
      .get();
    const batch = db.batch();
    old.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return { id: resRef.id, rows, aggregates };
  }

  return { rows, aggregates };
});














