/**
 * AI Gateway Safe Logging
 * 
 * Logs ONLY metadata - never content, prompts, or responses.
 * Following Phase 1 safeLogger semantics.
 */

import { getConfig } from './config.js';

// Log level hierarchy
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

/**
 * Check if a log level should be output.
 */
function shouldLog(level: keyof typeof LOG_LEVELS): boolean {
  const config = getConfig();
  return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel];
}

/**
 * Format log entry as JSON for structured logging.
 */
function formatLog(
  level: string,
  event: string,
  meta?: Record<string, unknown>
): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  return JSON.stringify(entry);
}

/**
 * Log debug message (only in dev or debug level).
 */
export function logDebug(event: string, meta?: Record<string, unknown>): void {
  if (shouldLog('debug')) {
    console.log(formatLog('debug', event, meta));
  }
}

/**
 * Log info message.
 */
export function logInfo(event: string, meta?: Record<string, unknown>): void {
  if (shouldLog('info')) {
    console.log(formatLog('info', event, meta));
  }
}

/**
 * Log warning message.
 */
export function logWarn(event: string, meta?: Record<string, unknown>): void {
  if (shouldLog('warn')) {
    console.warn(formatLog('warn', event, meta));
  }
}

/**
 * Log error message.
 */
export function logError(
  event: string,
  error?: Error | unknown,
  meta?: Record<string, unknown>
): void {
  if (shouldLog('error')) {
    const errorMeta: Record<string, unknown> = { ...meta };
    
    if (error instanceof Error) {
      errorMeta.errorName = error.name;
      errorMeta.errorMessage = error.message;
      // Only include stack in dev
      if (getConfig().isDev) {
        errorMeta.stack = error.stack;
      }
    } else if (error) {
      errorMeta.errorMessage = String(error);
    }
    
    console.error(formatLog('error', event, errorMeta));
  }
}

/**
 * Log an incoming request (safe - no body content).
 */
export function logRequest(
  requestId: string,
  method: string,
  path: string,
  tenantId?: string
): void {
  logInfo('request:start', {
    requestId,
    method,
    path,
    tenantId: tenantId || undefined,
  });
}

/**
 * Log a completed request (safe - no response content).
 */
export function logResponse(
  requestId: string,
  statusCode: number,
  durationMs: number
): void {
  logInfo('request:complete', {
    requestId,
    statusCode,
    durationMs,
  });
}

/**
 * Log an AI operation (safe - only metadata).
 */
export function logAIOperation(
  requestId: string,
  operation: string,
  upstream: string,
  durationMs: number,
  status: 'success' | 'error'
): void {
  logInfo('ai:operation', {
    requestId,
    operation,
    upstream,
    durationMs,
    status,
  });
}

