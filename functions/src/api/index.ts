/**
 * TradeTrackr API
 * 
 * Phase 03 Sovereignty Migration: Firebase Auth → Keycloak JWT
 * 
 * Authentication is now handled via Keycloak JWTs verified using JWKS.
 * Firebase Admin Auth (verifyIdToken) has been completely removed.
 * 
 * @see /docs/sovereignty/PHASE3_PLAN.md
 * @see /docs/sovereignty/auth.md
 * 
 * Environment Variables Required:
 *   KEYCLOAK_ISSUER    - e.g., https://auth.tradetrackr.de/realms/tradetrackr
 *   KEYCLOAK_AUDIENCE  - e.g., tradetrackr-api
 *   KEYCLOAK_JWKS_URI  - (optional, defaults to {issuer}/protocol/openid-connect/certs)
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import express from 'express';
import type { Response } from 'express';

// Keycloak JWT verification (replaces Firebase Admin Auth)
import { 
  keycloakAuth, 
  requireTenant,
  type AuthenticatedRequest,
} from '../lib/auth/keycloak-jwt';

// Firestore (unchanged - Phase 4 will migrate to PostgreSQL)
const db = admin.firestore();
const app = express();

app.use(express.json());

// ============================================================================
// Protected Route Handler Factory
// ============================================================================

/**
 * Creates a read-only route handler for a Firestore collection.
 * Filters by tenant_id for multi-tenancy.
 */
function readOnlyTenantFiltered(collectionName: string) {
  return async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      
      // Query with tenant filter
      let queryRef = db.collection(collectionName).limit(100);
      
      // Add tenant filter if collection supports it
      // Note: Some collections may use 'concernID' instead of 'tenantId'
      // Adjust based on your data model
      if (tenantId) {
        queryRef = queryRef.where('concernID', '==', tenantId) as FirebaseFirestore.Query;
      }
      
      const qs = await queryRef.get();
      const items: any[] = [];
      qs.forEach(d => items.push({ id: d.id, ...d.data() }));
      
      res.json({ items });
    } catch (e: any) {
      console.error(`API Error [${collectionName}]:`, e?.message);
      res.status(500).json({ error: e?.message || 'Error' });
    }
  };
}

/**
 * Legacy read-only handler without tenant filter.
 * Used for collections that don't have tenant isolation.
 */
function readOnly(collectionName: string) {
  return async (req: AuthenticatedRequest, res: Response) => {
    try {
      const qs = await db.collection(collectionName).limit(100).get();
      const items: any[] = [];
      qs.forEach(d => items.push({ id: d.id, ...d.data() }));
      res.json({ items });
    } catch (e: any) {
      console.error(`API Error [${collectionName}]:`, e?.message);
      res.status(500).json({ error: e?.message || 'Error' });
    }
  };
}

// ============================================================================
// Routes
// ============================================================================

// All routes require Keycloak authentication + tenant claim
const authMiddleware = [keycloakAuth(), requireTenant()];

// Protected routes with tenant filtering
app.get('/api/v1/projects', ...authMiddleware, readOnlyTenantFiltered('projects'));
app.get('/api/v1/tasks', ...authMiddleware, readOnlyTenantFiltered('tasks'));
app.get('/api/v1/timeEntries', ...authMiddleware, readOnlyTenantFiltered('punches'));
app.get('/api/v1/documents', ...authMiddleware, readOnlyTenantFiltered('project_documents'));
app.get('/api/v1/materials', ...authMiddleware, readOnlyTenantFiltered('materials_library'));

// OpenAPI spec (public)
app.get('/api/v1/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { 
      title: 'TradeTrackr API', 
      version: '1.0.0',
      description: 'TradeTrackr API - Authenticated via Keycloak OIDC JWT'
    },
    servers: [
      { url: 'https://europe-west1-tradetrackr-de.cloudfunctions.net', description: 'Production' }
    ],
    paths: {
      '/api/v1/projects': { 
        get: { 
          summary: 'List projects for tenant',
          security: [{ bearerAuth: [] }], 
          responses: { 
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized - Token missing or invalid' },
            '403': { description: 'Forbidden - No tenant_id claim' },
          } 
        } 
      },
      '/api/v1/tasks': { 
        get: { 
          summary: 'List tasks for tenant',
          security: [{ bearerAuth: [] }], 
          responses: { 
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
          } 
        } 
      },
      '/api/v1/timeEntries': { 
        get: { 
          summary: 'List time entries for tenant',
          security: [{ bearerAuth: [] }], 
          responses: { 
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
          } 
        } 
      },
      '/api/v1/documents': { 
        get: { 
          summary: 'List documents for tenant',
          security: [{ bearerAuth: [] }], 
          responses: { 
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
          } 
        } 
      },
      '/api/v1/materials': { 
        get: { 
          summary: 'List materials for tenant',
          security: [{ bearerAuth: [] }], 
          responses: { 
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
          } 
        } 
      },
    },
    components: { 
      securitySchemes: { 
        bearerAuth: { 
          type: 'http', 
          scheme: 'bearer', 
          bearerFormat: 'JWT',
          description: 'Keycloak-issued JWT with tenant_id claim'
        } 
      } 
    },
  });
});

// Health check (public)
app.get('/api/v1/health', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    auth: 'keycloak',
  });
});

// ============================================================================
// Export
// ============================================================================

export const api = functions.https.onRequest(app);
