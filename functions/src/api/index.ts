import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import express from 'express';
import type { Request, Response } from 'express';

const db = admin.firestore();
const app = express();

app.use(express.json());

async function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function readOnly(collection: string) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const qs = await db.collection(collection).limit(100).get();
      const items: any[] = [];
      qs.forEach(d => items.push({ id: d.id, ...d.data() }));
      res.json({ items });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Error' });
    }
  };
}

app.get('/api/v1/projects', auth, readOnly('projects'));
app.get('/api/v1/tasks', auth, readOnly('tasks'));
app.get('/api/v1/timeEntries', auth, readOnly('punches'));
app.get('/api/v1/documents', auth, readOnly('project_documents'));
app.get('/api/v1/materials', auth, readOnly('materials_library'));

app.get('/api/v1/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'TradeTrackr API', version: '1.0.0' },
    paths: {
      '/api/v1/projects': { get: { security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } } },
      '/api/v1/tasks': { get: { security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } } },
      '/api/v1/timeEntries': { get: { security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } } },
      '/api/v1/documents': { get: { security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } } },
      '/api/v1/materials': { get: { security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } } },
    },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  });
});

export const api = functions.https.onRequest(app);


