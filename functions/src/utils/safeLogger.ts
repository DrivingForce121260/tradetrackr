/**
 * Safe Logger - Content-Safe Logging Wrapper (Backend)
 * 
 * Ensures no sensitive customer content is logged in production.
 * All metadata is sanitized through redaction utilities before logging.
 * 
 * Uses Firebase Functions logger as the underlying logging mechanism.
 * 
 * @see /docs/sovereignty/definition.md - Section E.5 (No Raw Content in Logs)
 */

import * as functions from 'firebase-functions';
import { sanitizeLogMeta, getContentSummary, hashText } from '../security/redaction';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Check if sovereignty mode is IONOS_ONLY.
 * This is a hard block - no content logging allowed regardless of other flags.
 */
function isSovereigntyModeActive(): boolean {
  return process.env.SOVEREIGNTY_MODE === 'IONOS_ONLY';
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
  
  const logContent = process.env.LOG_CONTENT;
  const nodeEnv = process.env.NODE_ENV;
  
  // Default to false (safe) in production, allow in dev if explicitly enabled
  if (logContent === '1' || logContent === 'true') {
    return nodeEnv !== 'production';
  }
  
  return false;
}

/**
 * Check if we're in production environment.
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || 
         process.env.FUNCTIONS_EMULATOR !== 'true';
}

// ============================================================================
// Safe Logging Functions
// ============================================================================

/**
 * Log info message with sanitized metadata.
 */
export function safeInfo(event: string, meta?: any): void {
  const safeMeta = meta ? sanitizeLogMeta(meta) : undefined;
  functions.logger.info(event, safeMeta);
}

/**
 * Log warning message with sanitized metadata.
 */
export function safeWarn(event: string, meta?: any): void {
  const safeMeta = meta ? sanitizeLogMeta(meta) : undefined;
  functions.logger.warn(event, safeMeta);
}

/**
 * Log error message with sanitized metadata.
 * In production, error stacks are sanitized if they may contain content.
 */
export function safeError(event: string, err?: any, meta?: any): void {
  const safeMeta = meta ? sanitizeLogMeta(meta) : undefined;
  
  let safeErr = err;
  if (err && isProduction()) {
    safeErr = {
      name: err.name || 'Error',
      message: err.message || String(err),
      code: err.code,
      stack: isContentLoggingAllowed() ? err.stack : undefined,
    };
  }
  
  functions.logger.error(event, { error: safeErr, ...safeMeta });
}

/**
 * Log debug message with sanitized metadata.
 * Only logs in development/emulator mode.
 */
export function safeDebug(event: string, meta?: any): void {
  if (isProduction()) {
    return;
  }
  
  const safeMeta = meta ? sanitizeLogMeta(meta) : undefined;
  functions.logger.debug(event, safeMeta);
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
    subjectHash?: string;
    status?: string;
    timing?: number;
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
    subjectHash: data.subjectHash,
    status: data.status,
    timing: data.timing,
  };
  
  if (data.error) {
    safeError(event, data.error, safeMeta);
  } else {
    safeInfo(event, safeMeta);
  }
}

/**
 * Log LLM/AI operation event without exposing prompts/responses.
 */
export function logLLMEvent(
  event: string,
  data: {
    provider?: string;
    model?: string;
    operation?: string;
    inputLength?: number;
    outputLength?: number;
    durationMs?: number;
    status?: string;
    error?: any;
  }
): void {
  const safeMeta = {
    provider: data.provider,
    model: data.model,
    operation: data.operation,
    inputLength: data.inputLength,
    outputLength: data.outputLength,
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
 * Log OAuth flow event without exposing tokens.
 */
export function logOAuthEvent(
  event: string,
  data: {
    tenantId?: string;
    emailAccountId?: string;
    provider?: string;
    action?: string;
    success?: boolean;
    error?: any;
  }
): void {
  const safeMeta = {
    tenantId: data.tenantId,
    emailAccountId: data.emailAccountId,
    provider: data.provider,
    action: data.action,
    success: data.success,
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
export { getContentSummary, hashText };

