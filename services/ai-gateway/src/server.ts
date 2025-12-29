/**
 * AI Gateway Server
 * 
 * HTTP server for AI operations.
 * Routes requests to MOCK or IONOS upstream.
 * 
 * Usage:
 *   npm run dev    # Development with watch
 *   npm run build && npm start  # Production
 * 
 * Environment:
 *   AI_GATEWAY_PORT=8787
 *   AI_GATEWAY_TOKEN=<secret>
 *   AI_UPSTREAM_MODE=MOCK|IONOS
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { config as dotenvConfig } from 'dotenv';

// Load .env file
dotenvConfig();

import { getConfig, loadConfig } from './config.js';
import { validateAuth } from './auth.js';
import { logInfo, logError, logRequest, logResponse } from './logging.js';
import {
  handleHealthz,
  handleSummarizeEmail,
  handleDraftReply,
  handleClassifyDocument,
  type RouteContext,
} from './routes.js';

// ============================================================================
// Request Parsing
// ============================================================================

/**
 * Parse JSON body from request.
 */
async function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      
      // Limit body size (1MB)
      const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
      if (totalSize > 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (!body) {
          resolve({});
          return;
        }
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    
    req.on('error', reject);
  });
}

/**
 * Generate unique request ID.
 */
function generateRequestId(): string {
  return crypto.randomUUID().substring(0, 8);
}

/**
 * Send JSON response.
 */
function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

// ============================================================================
// Request Handler
// ============================================================================

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  
  // Add CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Log request (no body content)
  logRequest(requestId, method, path);
  
  try {
    // Health check - no auth required
    if (path === '/healthz' && method === 'GET') {
      const result = handleHealthz();
      sendJson(res, result.status, result.body);
      logResponse(requestId, result.status, Date.now() - startTime);
      return;
    }
    
    // All other routes require auth
    const authResult = validateAuth(req.headers.authorization || null);
    if (!authResult.authenticated) {
      sendJson(res, 401, { error: authResult.error || 'Nicht autorisiert.' });
      logResponse(requestId, 401, Date.now() - startTime);
      return;
    }
    
    const ctx: RouteContext = {
      requestId,
      tenantId: authResult.tenantId,
    };
    
    // Parse body for POST requests
    let body: unknown = {};
    if (method === 'POST') {
      try {
        body = await parseBody(req);
      } catch (e) {
        sendJson(res, 400, { error: 'Ungültiger JSON-Body.' });
        logResponse(requestId, 400, Date.now() - startTime);
        return;
      }
    }
    
    // Route to handler
    let result: { status: number; body: unknown };
    
    switch (path) {
      case '/ai/summarizeEmail':
        if (method !== 'POST') {
          result = { status: 405, body: { error: 'Methode nicht erlaubt.' } };
        } else {
          result = await handleSummarizeEmail(body, ctx);
        }
        break;
        
      case '/ai/draftReply':
        if (method !== 'POST') {
          result = { status: 405, body: { error: 'Methode nicht erlaubt.' } };
        } else {
          result = await handleDraftReply(body, ctx);
        }
        break;
        
      case '/ai/classifyDocument':
        if (method !== 'POST') {
          result = { status: 405, body: { error: 'Methode nicht erlaubt.' } };
        } else {
          result = await handleClassifyDocument(body, ctx);
        }
        break;
        
      default:
        result = { status: 404, body: { error: 'Endpunkt nicht gefunden.' } };
    }
    
    sendJson(res, result.status, result.body);
    logResponse(requestId, result.status, Date.now() - startTime);
    
  } catch (error) {
    logError('request:error', error, { requestId, path });
    sendJson(res, 500, { error: 'Interner Serverfehler.' });
    logResponse(requestId, 500, Date.now() - startTime);
  }
}

// ============================================================================
// Server Startup
// ============================================================================

function startServer(): void {
  try {
    // Load and validate config
    const config = loadConfig();
    
    const server = http.createServer(handleRequest);
    
    server.listen(config.port, () => {
      logInfo('server:start', {
        port: config.port,
        mode: config.upstreamMode,
        version: config.version,
        environment: config.isDev ? 'development' : 'production',
      });
      
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           TradeTrackr AI Gateway v${config.version}                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:     ${String(config.port).padEnd(48)}║
║  Mode:     ${config.upstreamMode.padEnd(48)}║
║  Env:      ${(config.isDev ? 'development' : 'production').padEnd(48)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║    GET  /healthz           - Health check                     ║
║    POST /ai/summarizeEmail - Email analysis                   ║
║    POST /ai/draftReply     - Reply generation                 ║
║    POST /ai/classifyDocument - Document classification        ║
╚═══════════════════════════════════════════════════════════════╝
`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      logInfo('server:shutdown', { reason: 'SIGINT' });
      server.close(() => process.exit(0));
    });
    
    process.on('SIGTERM', () => {
      logInfo('server:shutdown', { reason: 'SIGTERM' });
      server.close(() => process.exit(0));
    });
    
  } catch (error) {
    logError('server:startup-error', error);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start
startServer();

