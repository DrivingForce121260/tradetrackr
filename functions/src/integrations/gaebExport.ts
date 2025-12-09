import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { exportGaebXml, GaebNode } from './gaeb';

const db = admin.firestore();

// HTTP endpoint to export GAEB XML for an offer LV structure
export const exportGaebForOffer = functions.https.onRequest(async (req, res) => {
  try {
    const offerId = (req.query.offerId as string) || '';
    if (!offerId) { res.status(400).send('offerId required'); return; }
    const snap = await db.collection('offers').doc(offerId).get();
    if (!snap.exists) { res.status(404).send('Offer not found'); return; }
    const data = snap.data() as any;
    // Expect data.lv to be a hierarchical structure; fallback to empty
    const root: GaebNode = (data?.lv as GaebNode) || { id: 'ROOT', short: data?.name || 'LV', children: [] };
    const xml = exportGaebXml(root);
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
    return;
  } catch (e: any) {
    res.status(500).send(e?.message || 'Error');
    return;
  }
});


