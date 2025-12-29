/**
 * AI Gateway Routes
 * 
 * Handles AI operation requests and routes to upstream (MOCK or IONOS).
 */

import { getConfig } from './config.js';
import { logInfo, logAIOperation, logError } from './logging.js';
import {
  validateSummarizeEmailRequest,
  validateDraftReplyRequest,
  validateClassifyDocumentRequest,
  type SummarizeEmailRequest,
  type SummarizeEmailResponse,
  type DraftReplyRequest,
  type DraftReplyResponse,
  type ClassifyDocumentRequest,
  type ClassifyDocumentResponse,
  type HealthResponse,
  type ErrorResponse,
} from './schemas/index.js';
import {
  mockSummarizeEmail,
  mockDraftReply,
  mockClassifyDocument,
} from './mock/mockResponses.js';

// ============================================================================
// Route Handler Types
// ============================================================================

export interface RouteContext {
  requestId: string;
  tenantId?: string;
}

export interface RouteResult<T> {
  status: number;
  body: T | ErrorResponse;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /healthz
 */
export function handleHealthz(): RouteResult<HealthResponse> {
  const config = getConfig();
  
  return {
    status: 200,
    body: {
      ok: true,
      mode: config.upstreamMode,
      version: config.version,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Summarize Email
// ============================================================================

/**
 * POST /ai/summarizeEmail
 */
export async function handleSummarizeEmail(
  body: unknown,
  ctx: RouteContext
): Promise<RouteResult<SummarizeEmailResponse>> {
  const startTime = Date.now();
  const config = getConfig();
  
  // Validate request
  const validation = validateSummarizeEmailRequest(body);
  if (!validation.valid) {
    return {
      status: 400,
      body: { error: validation.error || 'Ungültige Anfrage.' },
    };
  }
  
  const request = body as SummarizeEmailRequest;
  
  try {
    let response: SummarizeEmailResponse;
    
    if (config.upstreamMode === 'MOCK') {
      response = mockSummarizeEmail(request);
    } else {
      // IONOS mode - not implemented yet
      return {
        status: 501,
        body: { 
          error: 'IONOS-Upstream noch nicht implementiert. Verwenden Sie AI_UPSTREAM_MODE=MOCK.',
          code: 'IONOS_NOT_READY',
        },
      };
    }
    
    const durationMs = Date.now() - startTime;
    logAIOperation(ctx.requestId, 'summarizeEmail', config.upstreamMode, durationMs, 'success');
    
    return { status: 200, body: response };
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logAIOperation(ctx.requestId, 'summarizeEmail', config.upstreamMode, durationMs, 'error');
    logError('summarizeEmail:error', error, { requestId: ctx.requestId });
    
    return {
      status: 500,
      body: { error: 'Interner Serverfehler bei der E-Mail-Analyse.' },
    };
  }
}

// ============================================================================
// Draft Reply
// ============================================================================

/**
 * POST /ai/draftReply
 */
export async function handleDraftReply(
  body: unknown,
  ctx: RouteContext
): Promise<RouteResult<DraftReplyResponse>> {
  const startTime = Date.now();
  const config = getConfig();
  
  // Validate request
  const validation = validateDraftReplyRequest(body);
  if (!validation.valid) {
    return {
      status: 400,
      body: { error: validation.error || 'Ungültige Anfrage.' },
    };
  }
  
  const request = body as DraftReplyRequest;
  
  try {
    let response: DraftReplyResponse;
    
    if (config.upstreamMode === 'MOCK') {
      response = mockDraftReply(request);
    } else {
      // IONOS mode - not implemented yet
      return {
        status: 501,
        body: { 
          error: 'IONOS-Upstream noch nicht implementiert. Verwenden Sie AI_UPSTREAM_MODE=MOCK.',
          code: 'IONOS_NOT_READY',
        },
      };
    }
    
    const durationMs = Date.now() - startTime;
    logAIOperation(ctx.requestId, 'draftReply', config.upstreamMode, durationMs, 'success');
    
    return { status: 200, body: response };
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logAIOperation(ctx.requestId, 'draftReply', config.upstreamMode, durationMs, 'error');
    logError('draftReply:error', error, { requestId: ctx.requestId });
    
    return {
      status: 500,
      body: { error: 'Interner Serverfehler bei der Antwort-Generierung.' },
    };
  }
}

// ============================================================================
// Classify Document
// ============================================================================

/**
 * POST /ai/classifyDocument
 */
export async function handleClassifyDocument(
  body: unknown,
  ctx: RouteContext
): Promise<RouteResult<ClassifyDocumentResponse>> {
  const startTime = Date.now();
  const config = getConfig();
  
  // Validate request
  const validation = validateClassifyDocumentRequest(body);
  if (!validation.valid) {
    return {
      status: 400,
      body: { error: validation.error || 'Ungültige Anfrage.' },
    };
  }
  
  const request = body as ClassifyDocumentRequest;
  
  try {
    let response: ClassifyDocumentResponse;
    
    if (config.upstreamMode === 'MOCK') {
      response = mockClassifyDocument(request);
    } else {
      // IONOS mode - not implemented yet
      return {
        status: 501,
        body: { 
          error: 'IONOS-Upstream noch nicht implementiert. Verwenden Sie AI_UPSTREAM_MODE=MOCK.',
          code: 'IONOS_NOT_READY',
        },
      };
    }
    
    const durationMs = Date.now() - startTime;
    logAIOperation(ctx.requestId, 'classifyDocument', config.upstreamMode, durationMs, 'success');
    
    return { status: 200, body: response };
    
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logAIOperation(ctx.requestId, 'classifyDocument', config.upstreamMode, durationMs, 'error');
    logError('classifyDocument:error', error, { requestId: ctx.requestId });
    
    return {
      status: 500,
      body: { error: 'Interner Serverfehler bei der Dokumenten-Klassifizierung.' },
    };
  }
}

