import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const deleteClientCascade = functions.https.onCall(async (data: any, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
  const { clientId, concernID, mode = 'anonymize' } = data || {};
  if (!clientId || !concernID) throw new functions.https.HttpsError('invalid-argument', 'clientId und concernID erforderlich');

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const user = userDoc.data() || {};
  if (user.concernID !== concernID || !['admin', 'office'].includes(user.role)) {
    throw new functions.https.HttpsError('permission-denied', 'Keine Berechtigung');
  }

  const batch = db.batch();
  const clientRef = db.collection('clients').doc(clientId);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists) throw new functions.https.HttpsError('not-found', 'Client nicht gefunden');

  // Handle linked collections: set clientId to null and store clientNameSnapshot
  const collections = ['offers', 'orders', 'invoices', 'projects'];
  for (const col of collections) {
    const qs = await db.collection(col).where('clientId', '==', clientId).limit(500).get();
    for (const doc of qs.docs) {
      const ref = doc.ref;
      batch.update(ref, {
        clientId: mode === 'remove' ? admin.firestore.FieldValue.delete() : null,
        clientNameSnapshot: clientSnap.get('companyName') || clientSnap.get('name') || 'Anonymisiert',
        updatedAt: Date.now(),
      });
    }
  }

  // Delete or anonymize contacts
  const contactsSnap = await clientRef.collection('contacts').get();
  for (const c of contactsSnap.docs) {
    if (mode === 'remove') batch.delete(c.ref);
    else batch.update(c.ref, { email: null, phone: null, firstName: null, lastName: null, gdprConsent: false, updatedAt: Date.now() });
  }

  // Finally, delete or anonymize client
  if (mode === 'remove') {
    batch.delete(clientRef);
  } else {
    batch.update(clientRef, {
      companyName: 'Anonymisierter Kunde',
      email: null,
      phone: null,
      address: null,
      vatId: null,
      gdprConsent: false,
      updatedAt: Date.now(),
    });
  }

  await batch.commit();
  return { success: true };
});














