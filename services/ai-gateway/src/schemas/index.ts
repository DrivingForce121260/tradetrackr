/**
 * AI Gateway Request/Response Schemas
 * 
 * Simple runtime validation without external dependencies.
 * Matches types from /src/services/ai/types.ts
 */

// ============================================================================
// Request Schemas
// ============================================================================

export interface SummarizeEmailRequest {
  subject: string;
  bodyText: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    size?: number;
  }>;
  language?: 'de' | 'en';
  tenantId?: string;
}

export interface DraftReplyRequest {
  originalSubject: string;
  originalFrom: string;
  originalTo: string[];
  originalBodyText: string;
  summaryBullets?: string[];
  tone?: 'neutral' | 'friendly' | 'formal';
  language?: 'de' | 'en';
  instructions?: string;
  tenantId?: string;
}

export interface ClassifyDocumentRequest {
  text: string;
  filename?: string;
  mimeType?: string;
  tenantId?: string;
}

// ============================================================================
// Response Schemas
// ============================================================================

export interface SummarizeEmailResponse {
  category: 'INVOICE' | 'ORDER' | 'SHIPPING' | 'CLAIM' | 'COMPLAINT' | 'KYC' | 'GENERAL' | 'SPAM';
  confidence: number;
  documentTypes: string[];
  summaryBullets: string[];
  priority: 'high' | 'normal' | 'low';
}

export interface DraftReplyResponse {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  to: string[];
  cc: string[];
}

export interface ClassifyDocumentResponse {
  type?: string;
  confidence: number;
  reason: string;
  model: string;
}

export interface HealthResponse {
  ok: boolean;
  mode: 'MOCK' | 'IONOS';
  version: string;
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate summarizeEmail request.
 */
export function validateSummarizeEmailRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Anfrage-Body fehlt.' };
  }
  
  const data = body as Record<string, unknown>;
  
  if (typeof data.subject !== 'string') {
    return { valid: false, error: 'Feld "subject" fehlt oder ist ungültig.' };
  }
  
  if (typeof data.bodyText !== 'string') {
    return { valid: false, error: 'Feld "bodyText" fehlt oder ist ungültig.' };
  }
  
  return { valid: true };
}

/**
 * Validate draftReply request.
 */
export function validateDraftReplyRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Anfrage-Body fehlt.' };
  }
  
  const data = body as Record<string, unknown>;
  
  if (typeof data.originalSubject !== 'string') {
    return { valid: false, error: 'Feld "originalSubject" fehlt oder ist ungültig.' };
  }
  
  if (typeof data.originalFrom !== 'string') {
    return { valid: false, error: 'Feld "originalFrom" fehlt oder ist ungültig.' };
  }
  
  if (typeof data.originalBodyText !== 'string') {
    return { valid: false, error: 'Feld "originalBodyText" fehlt oder ist ungültig.' };
  }
  
  return { valid: true };
}

/**
 * Validate classifyDocument request.
 */
export function validateClassifyDocumentRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Anfrage-Body fehlt.' };
  }
  
  const data = body as Record<string, unknown>;
  
  if (typeof data.text !== 'string') {
    return { valid: false, error: 'Feld "text" fehlt oder ist ungültig.' };
  }
  
  return { valid: true };
}

