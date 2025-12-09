import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

export const importDatanormCsv = functions.storage.object().onFinalize(async (object) => {
  const path = object.name || '';
  if (!path.endsWith('.csv') || !path.includes('/datanorm/')) return;
  const [_, concernId] = path.match(/concerns\/(.*?)\//) || [];
  if (!concernId) return;

  const bucket = admin.storage().bucket(object.bucket);
  const file = bucket.file(path);
  const [contents] = await file.download();
  const text = contents.toString('utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);

  const batch = db.batch();
  let count = 0;
  for (const line of lines.slice(0, 10000)) {
    const [supplier, articleNumber, description, priceStr, unit, group] = line.split(';');
    if (!supplier || !articleNumber) continue;
    const price = Number(priceStr || 0);
    const id = `${supplier}_${articleNumber}`;
    const ref = db.collection('materials_library').doc(id);
    batch.set(ref, {
      concernId,
      supplier,
      articleNumber,
      description,
      unit,
      group,
      price,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (++count % 400 === 0) await batch.commit();
  }
  if (count % 400 !== 0) await batch.commit();

  await db.collection('interfaceJobs').add({
    type: 'DATANORM_IMPORT',
    concernId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: 'success',
    logText: `Imported ${count} articles from ${path}`,
  });
});

export const refreshIdsCatalog = functions.pubsub.schedule('every day 03:00').onRun(async () => {
  const suppliers = await db.collection('suppliers').get();
  for (const sup of suppliers.docs) {
    const { idsSandboxUrl, idsApiToken, concernId } = sup.data() as any;
    if (!idsSandboxUrl || !idsApiToken) continue;
    // Simulate fetch
    const articles = [] as Array<{ supplier: string; articleNumber: string; description: string; price: number; unit: string; group?: string }>;
    // Upsert to materials_library
    const batch = db.batch();
    for (const a of articles) {
      const id = `${sup.id}_${a.articleNumber}`;
      batch.set(db.collection('materials_library').doc(id), {
        concernId,
        supplier: sup.id,
        ...a,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
    await db.collection('interfaceJobs').add({
      type: 'IDS_REFRESH',
      concernId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'success',
      logText: `Refreshed ${articles.length} articles for supplier ${sup.id}`,
    });
  }
  return null;
});














