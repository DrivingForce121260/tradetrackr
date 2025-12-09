import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const storage = admin.storage();

export const gdprExport = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
  const { clientId, concernID } = data || {};
  if (!clientId || !concernID) throw new functions.https.HttpsError('invalid-argument', 'clientId und concernID erforderlich');

  // Permission check
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const user = userDoc.data() || {};
  if (user.concernID !== concernID || !['admin', 'office'].includes(user.role)) {
    throw new functions.https.HttpsError('permission-denied', 'Keine Berechtigung');
  }

  const result: any = { client: null, contacts: [], offers: [], orders: [], invoices: [], projects: [] };

  const clientSnap = await db.collection('clients').doc(clientId).get();
  if (!clientSnap.exists) throw new functions.https.HttpsError('not-found', 'Client nicht gefunden');
  result.client = { id: clientSnap.id, ...clientSnap.data() };

  const contactsSnap = await db.collection('clients').doc(clientId).collection('contacts').get();
  result.contacts = contactsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const collections = [
    { name: 'offers', field: 'clientId' },
    { name: 'orders', field: 'clientId' },
    { name: 'invoices', field: 'clientId' },
    { name: 'projects', field: 'clientId' },
  ];
  for (const col of collections) {
    const qs = await db.collection(col.name).where(col.field, '==', clientId).limit(2000).get();
    (result as any)[col.name] = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Store JSON in Storage and return signed URL
  const bucket = storage.bucket();
  const path = `gdpr/${concernID}/${clientId}_${Date.now()}.json`;
  await bucket.file(path).save(JSON.stringify(result, null, 2), { contentType: 'application/json;charset=utf-8' });
  const [url] = await bucket.file(path).getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
  return { url, path };
});














