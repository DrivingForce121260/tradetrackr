import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import type { Request, Response } from 'express';
import * as zlib from 'zlib';

const db = admin.firestore();
const app = express();
app.use(express.json());

async function fetchCollection(col: string, field: string, value: string) {
	const qs = await db.collection(col).where(field, '==', value).limit(5000).get();
	return qs.docs.map(d => ({ id: d.id, ...d.data() }));
}

app.get('/export/:scope/:id', async (req: Request, res: Response) => {
	try {
		const { scope, id } = req.params as any;
		const requester = (req as any).user || {};
		// Basic permission: admin can export all; office may export clients
		// In callable setups you'd check auth; for simplicity assume CF behind auth proxy
		const chunks: Record<string, any> = {};

		if (scope === 'user') {
			chunks.user = (await db.collection('users').doc(id).get()).data() || null;
			chunks.punches = await fetchCollection('punches', 'uid', id);
			chunks.timesheets = await fetchCollection('timesheets', 'uid', id).catch(()=>[]);
			chunks.tasks = await fetchCollection('tasks', 'ownerUid', id).catch(()=>[]);
			chunks.auditSubset = (await db.collection('auditLogs').where('actorId','==',id).orderBy('timestamp','desc').limit(1000).get()).docs.map(d=>({id:d.id,...d.data()}));
		} else if (scope === 'client') {
			chunks.client = (await db.collection('clients').doc(id).get()).data() || null;
			chunks.contacts = await fetchCollection('crm_contacts', 'clientId', id).catch(()=>[]);
			chunks.projects = await fetchCollection('projects', 'clientId', id).catch(()=>[]);
			chunks.offers = await fetchCollection('offers', 'clientId', id).catch(()=>[]);
			chunks.orders = await fetchCollection('orders', 'clientId', id).catch(()=>[]);
			chunks.invoices = await fetchCollection('invoices', 'clientId', id).catch(()=>[]);
			chunks.auditSubset = (await db.collection('auditLogs').where('entityType','in',['clients','invoices','orders','offers','projects']).orderBy('timestamp','desc').limit(2000).get()).docs.map(d=>({id:d.id,...d.data()}));
		} else {
			return res.status(400).json({ error: 'Invalid scope' });
		}

		const readme = `GDPR Export for ${scope}:${id}\nGenerated: ${new Date().toISOString()}\nParts: ${Object.keys(chunks).join(', ')}\n`;
		const bundle = { readme, generatedAt: new Date().toISOString(), scope, id, chunks };
		const json = JSON.stringify(bundle, null, 2);
		const gz = zlib.gzipSync(Buffer.from(json, 'utf-8'));
		res.setHeader('Content-Type', 'application/gzip');
		res.setHeader('Content-Disposition', `attachment; filename="gdpr_${scope}_${id}_${Date.now()}.json.gz"`);
		res.status(200).send(gz);

		// Audit export action
		await db.collection('auditLogs').add({
			entityType: scope === 'user' ? 'users' : 'clients',
			entityId: id,
			action: 'EXPORT',
			actorId: requester.uid || null,
			timestamp: admin.firestore.FieldValue.serverTimestamp(),
			after: null,
			before: null,
		});
	} catch (e: any) {
		console.error('GDPR export error', e);
		res.status(500).json({ error: e.message });
	}
});

export const gdprApi = functions.https.onRequest(app);
