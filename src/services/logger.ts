/**
 * Centralized Logging Service
 * 
 * Environment-aware logging with remote logging extension point.
 * Use this instead of direct console.log for production-safe logging.
 */

import { env } from '../config/env';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry structure for remote logging
 */
interface LogEntry {
  level: LogLevel;
  context: string;
  timestamp: number;
  details?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Log debug information (DEV only)
 * Completely suppressed in production builds
 */
export function logDebug(context: string, details?: any): void {
  if (!env.isDevelopment || env.isProduction) {
    return; // Skip debug logs in production
  }

  console.log(`[DEBUG] ${context}`, details !== undefined ? details : '');
}

/**
 * Log informational messages
 */
export function logInfo(context: string, details?: any): void {
  if (env.isDevelopment) {
    console.log(`[INFO] ${context}`, details !== undefined ? details : '');
  } else if (env.isProduction) {
    // In production, suppress console and send to remote only
    sendToRemote({
      level: LogLevel.INFO,
      context,
      timestamp: Date.now(),
      details,
    });
  } else {
    // Preview/staging: log to console
    console.log(`[INFO] ${context}`, details !== undefined ? details : '');
  }
}

/**
 * Log warnings
 */
export function logWarn(context: string, details?: any): void {
  console.warn(`[WARN] ${context}`, details !== undefined ? details : '');

  if (env.isProduction) {
    // TODO: Send to remote logging service
    sendToRemote({
      level: LogLevel.WARN,
      context,
      timestamp: Date.now(),
      details,
    });
  }
}

/**
 * Log errors
 */
export function logError(context: string, error: unknown, extra?: any): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[ERROR] ${context}`, {
    error: errorMessage,
    stack: errorStack,
    extra,
  });

  if (env.isProduction) {
    // TODO: Send to remote logging service (Sentry, etc.)
    sendToRemote({
      level: LogLevel.ERROR,
      context,
      timestamp: Date.now(),
      error: {
        message: errorMessage,
        stack: errorStack,
      },
      details: extra,
    });
  }
}

/**
 * Send log entry to remote logging service
 * 
 * TODO: Integrate with your logging backend:
 * - Sentry: Sentry.captureException() / Sentry.captureMessage()
 * - Datadog: DD.logger.log()
 * - Custom backend: fetch POST to logging endpoint
 * 
 * Example with Sentry:
 * ```
 * import * as Sentry from '@sentry/react-native';
 * 
 * if (entry.level === LogLevel.ERROR && entry.error) {
 *   Sentry.captureException(new Error(entry.error.message));
 * } else {
 *   Sentry.captureMessage(entry.context, entry.level as any);
 * }
 * ```
 */
function sendToRemote(entry: LogEntry): void {
  // TODO: Implement remote logging
  // For now, this is a no-op in production
  
  if (env.isDevelopment) {
    console.log('[REMOTE_LOG]', entry);
  }
}

/**
 * Sanitize sensitive data before logging
 * Use this to strip passwords, tokens, etc. from log data
 */
export function sanitize(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }

  return sanitized;
}

