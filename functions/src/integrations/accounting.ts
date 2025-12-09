import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

function toCsvRow(values: (string|number)[]) {
  return values.map(v => typeof v === 'string' && v.includes(',') ? '"' + v.replace('"','""') + '"' : v).join(',');
}

export const exportDatev = functions.https.onRequest(async (req, res) => {
  try {
    const concernId = (req.query.concernId as string) || '';
    if (!concernId) { res.status(400).send('concernId required'); return; }
    const qs = await db.collection('invoices').where('concernID', '==', concernId).get();
    const rows: string[] = [];
    rows.push('Belegdatum,Belegfeld1,Konto,Gegenkonto,Betrag,BU-Schlüssel,Beleginfo');
    qs.forEach(d => {
      const inv: any = d.data();
      const date = new Date(inv.date || Date.now()).toISOString().slice(0,10);
      const beleg = inv.number || d.id;
      const konto = inv.account || '8400';
      const gegen = inv.debtorAccount || '10000';
      const betrag = Number(inv.total || 0).toFixed(2);
      rows.push(toCsvRow([date, beleg, konto, gegen, betrag, '', inv.customerName || '']));
    });
    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="datev.csv"');
    res.status(200).send(csv);
    return;
  } catch (e: any) {
    res.status(500).send(e?.message || 'Error');
    return;
  }
});

export const exportLexware = functions.https.onRequest(async (req, res) => {
  try {
    const concernId = (req.query.concernId as string) || '';
    if (!concernId) { res.status(400).send('concernId required'); return; }
    const qs = await db.collection('invoices').where('concernID', '==', concernId).get();
    const rows: string[] = [];
    rows.push('Datum;Beleg;Konto;Gegenkonto;Betrag;Name');
    qs.forEach(d => {
      const inv: any = d.data();
      const date = new Date(inv.date || Date.now()).toISOString().slice(0,10);
      const beleg = inv.number || d.id;
      const konto = inv.account || '8400';
      const gegen = inv.debtorAccount || '10000';
      const betrag = Number(inv.total || 0).toFixed(2);
      const name = inv.customerName || '';
      rows.push([date, beleg, konto, gegen, betrag, name].join(';'));
    });
    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="lexware.csv"');
    res.status(200).send(csv);
    return;
  } catch (e: any) {
    res.status(500).send(e?.message || 'Error');
    return;
  }
});


