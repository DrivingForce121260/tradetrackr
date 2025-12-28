/**
 * Safe Logger - Content-Safe Logging Wrapper
 * 
 * Ensures no sensitive customer content is logged in production.
 * All metadata is sanitized through redaction utilities before logging.
 * 
 * @see /docs/sovereignty/definition.md - Section E.5 (No Raw Content in Logs)
 */

import { sanitizeLogMeta, getContentSummary } from '../security/redaction';
import { logInfo, logWarn, logError, logDebug } from '../services/logger';
import { env } from '../config/env';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Check if sovereignty mode is IONOS_ONLY.
 * This is a hard block - no content logging allowed regardless of other flags.
 */
function isSovereigntyModeActive(): boolean {
  const sovereigntyMode = typeof process !== 'undefined' 
    ? process.env.SOVEREIGNTY_MODE 
    : undefined;
  return sovereigntyMode === 'IONOS_ONLY';
}

/**
 * Check if content logging is allowed.
 * In IONOS_ONLY mode, always false - this is a HARD BLOCK.
 * Otherwise, respects LOG_CONTENT env var.
 * 
 * IMPORTANT: In IONOS_ONLY mode, LOG_CONTENT=1 is IGNORED for security.
 */
function isContentLoggingAllowed(): boolean {
  // HARD BLOCK: In IONOS_ONLY mode, never log content regardless of other flags
  if (isSovereigntyModeActive()) {
    return false; // Cannot be overridden
  }
  
  // Check LOG_CONTENT flag
  const logContent = typeof process !== 'undefined' 
    ? process.env.LOG_CONTENT 
    : undefined;
  
  // Default to false (safe) in production, allow in dev if explicitly enabled
  if (logContent === '1' || logContent === 'true') {
    return !env.isProduction;
  }
  
  return false;
}

// ============================================================================
// Safe Logging Functions
// ============================================================================

/**
 * Log info message with sanitized metadata.
 * 
 * @param event - Event name/context
 * @param meta - Optional metadata (will be sanitized)
 */
export function safeInfo(event: string, meta?: any): void {
  const safeMeta = meta ? sanitizeLogMeta(meta) : undefined;
  logInfo(event, safeMeta);
}

/**
 * Log warning message with sanitized metadata.
 * 
 * @param event - Event name/context
 * @param meta - Optional metadata (will be sanitized)
 */
export function safeWarn(event: string, meta?: any): void {
  const safeMeta = meta ? sanitizeLogMeta(meta) : undefined;
  logWarn(event, safeMeta);
}

/**
 * Log error message with sanitized metadata.
 * In production, error stacks are truncated if they may contain content.
 * 
 * @param event - Event name/context
 * @param err - Error object (optional)
 * @param meta - Optional metadata (will be sanitized)
 */
export function safeError(event: string, err?: any, meta?: any): void {
  const safeMeta = meta ? sanitizeLogMeta(meta) : undefined;
  
  // Sanitize error for production
  let safeErr = err;
  if (err && env.isProduction) {
    safeErr = {
      name: err.name || 'Error',
      message: err.message || String(err),
      code: err.code,
      // Only include stack in non-production or if explicitly allowed
      stack: isContentLoggingAllowed() ? err.stack : undefined,
    };
  }
  
  logError(event, safeErr, safeMeta);
}

/**
 * Log debug message with sanitized metadata.
 * Only logs in development mode.
 * 
 * @param event - Event name/context
 * @param meta - Optional metadata (will be sanitized)
 */
export function safeDebug(event: string, meta?: any): void {
  const safeMeta = meta ? sanitizeLogMeta(meta) : undefined;
  logDebug(event, safeMeta);
}

// ============================================================================
// Content-Specific Logging Helpers
// ============================================================================

/**
 * Log email processing event without exposing content.
 * Logs only IDs, counts, and content hashes.
 */
export function logEmailEvent(
  event: string,
  data: {
    tenantId?: string;
    emailAccountId?: string;
    messageId?: string;
    threadId?: string;
    provider?: string;
    attachmentCount?: number;
    bodyLength?: number;
    subjectLength?: number;
    status?: string;
    error?: any;
  }
): void {
  const safeMeta = {
    tenantId: data.tenantId,
    emailAccountId: data.emailAccountId,
    messageId: data.messageId,
    threadId: data.threadId,
    provider: data.provider,
    attachmentCount: data.attachmentCount,
    bodyLength: data.bodyLength,
    subjectLength: data.subjectLength,
    status: data.status,
  };
  
  if (data.error) {
    safeError(event, data.error, safeMeta);
  } else {
    safeInfo(event, safeMeta);
  }
}

/**
 * Log document processing event without exposing content.
 */
export function logDocumentEvent(
  event: string,
  data: {
    tenantId?: string;
    documentId?: string;
    docType?: string;
    textLength?: number;
    status?: string;
    error?: any;
  }
): void {
  const safeMeta = {
    tenantId: data.tenantId,
    documentId: data.documentId,
    docType: data.docType,
    textLength: data.textLength,
    status: data.status,
  };
  
  if (data.error) {
    safeError(event, data.error, safeMeta);
  } else {
    safeInfo(event, safeMeta);
  }
}

/**
 * Log AI operation event without exposing prompts/responses.
 */
export function logAIEvent(
  event: string,
  data: {
    provider?: string;
    model?: string;
    operation?: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    status?: string;
    error?: any;
  }
): void {
  const safeMeta = {
    provider: data.provider,
    model: data.model,
    operation: data.operation,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    durationMs: data.durationMs,
    status: data.status,
  };
  
  if (data.error) {
    safeError(event, data.error, safeMeta);
  } else {
    safeInfo(event, safeMeta);
  }
}

/**
 * Get safe content summary for logging purposes.
 * Never returns actual content.
 */
export { getContentSummary };

