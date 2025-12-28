/**
 * Content Redaction Utilities
 * 
 * Provides functions to redact sensitive data from logs and telemetry.
 * Used to ensure no PII or customer content is logged in production.
 * 
 * @see /docs/sovereignty/definition.md - Section E.5 (No Raw Content in Logs)
 */

import { createHash } from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Keys that should be redacted from log metadata.
 * These typically contain customer content.
 */
const SENSITIVE_KEYS = [
  // Email content
  'body',
  'text',
  'html',
  'subject',
  'snippet',
  'message',
  'content',
  'attachment',
  'attachments',
  'raw',
  'payload',
  'ocrText',
  'ocrResult',
  'emailBody',
  'emailText',
  'emailHtml',
  'draftText',
  'replyText',
  'documentText',
  'extractedText',
  'preview',
  'description',
  'note',
  'notes',
  'comment',
  'comments',
  
  // LLM/AI specific (Phase 1 hardening)
  'draft',
  'reply',
  'prompt',
  'completion',
  'messages',
  'toolCalls',
  'response',
  'choices',
  'inputText',
  'outputText',
  
  // Email MIME specific
  'rawMime',
  'mime',
  'headers',
  'parts',
  'htmlBody',
  'textBody',
  'attachmentNames',
  'base64',
  
  // Credentials (extra safety)
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'accessToken',
  'refreshToken',
];

/**
 * Regex patterns for PII detection.
 */
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  
  // German phone numbers (various formats)
  phoneDE: /(?:\+49|0049|0)\s*[1-9]\d{1,4}[\s/-]?\d{3,}[\s/-]?\d{0,}/gi,
  
  // International phone (generic)
  phoneIntl: /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/gi,
  
  // IBAN (German format primarily)
  iban: /\b[A-Z]{2}\d{2}[\s]?(?:\d{4}[\s]?){4,7}\d{0,2}\b/gi,
  
  // Credit card-like sequences (13-19 digits)
  creditCard: /\b(?:\d{4}[\s-]?){3,4}\d{1,4}\b/g,
  
  // German postal codes with street
  addressDE: /\b\d{5}\s+[A-Za-zäöüÄÖÜß]+\b/gi,
  
  // Long digit sequences (potential IDs, account numbers)
  longDigits: /\b\d{8,}\b/g,
  
  // Names in common patterns (Herr/Frau + Name)
  germanName: /(?:Herr|Frau|Hr\.|Fr\.)\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?/gi,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Redact sensitive patterns from text.
 * Replaces PII with [REDACTED] markers.
 * 
 * @param text - Input text that may contain PII
 * @returns Text with PII redacted
 * 
 * @example
 * ```typescript
 * redactText('Email: test@example.com, Phone: +49 123 456789');
 * // Returns: 'Email: [EMAIL], Phone: [PHONE]'
 * ```
 */
export function redactText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let result = text;
  
  // Apply redactions in order of specificity
  result = result.replace(PII_PATTERNS.email, '[EMAIL]');
  result = result.replace(PII_PATTERNS.iban, '[IBAN]');
  result = result.replace(PII_PATTERNS.creditCard, '[CARD]');
  result = result.replace(PII_PATTERNS.phoneDE, '[PHONE]');
  result = result.replace(PII_PATTERNS.phoneIntl, '[PHONE]');
  result = result.replace(PII_PATTERNS.germanName, '[NAME]');
  result = result.replace(PII_PATTERNS.addressDE, '[ADDRESS]');
  result = result.replace(PII_PATTERNS.longDigits, '[ID]');
  
  return result;
}

/**
 * Generate a stable hash for text correlation.
 * Useful for tracking items across logs without exposing content.
 * 
 * @param text - Text to hash
 * @returns First 12 characters of SHA-256 hash
 * 
 * @example
 * ```typescript
 * hashText('Sensitive email content');
 * // Returns: 'a1b2c3d4e5f6'
 * ```
 */
export function hashText(text: string): string {
  if (!text || typeof text !== 'string') {
    return 'empty';
  }
  
  // For browser environment, use Web Crypto API
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // Return a sync hash using simple algorithm for browser
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 12);
  }
  
  // For Node.js environment
  try {
    return createHash('sha256').update(text).digest('hex').substring(0, 12);
  } catch {
    // Fallback for environments without crypto
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 12);
  }
}

/**
 * Sanitize metadata object for safe logging.
 * Removes or replaces sensitive keys with [REDACTED] or hashes.
 * 
 * @param meta - Metadata object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized metadata safe for logging
 * 
 * @example
 * ```typescript
 * sanitizeLogMeta({ userId: '123', body: 'Secret content' });
 * // Returns: { userId: '123', body: '[REDACTED]', bodyHash: 'a1b2c3d4e5f6' }
 * ```
 */
export function sanitizeLogMeta(
  meta: any,
  options: { includeHashes?: boolean; maxDepth?: number } = {}
): any {
  const { includeHashes = true, maxDepth = 5 } = options;
  
  if (meta === null || meta === undefined) {
    return meta;
  }
  
  if (typeof meta !== 'object') {
    return meta;
  }
  
  if (Array.isArray(meta)) {
    return meta.map((item) => sanitizeLogMeta(item, { ...options, maxDepth: maxDepth - 1 }));
  }
  
  if (maxDepth <= 0) {
    return '[MAX_DEPTH]';
  }
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive key
    const isSensitive = SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk.toLowerCase()));
    
    if (isSensitive) {
      result[key] = '[REDACTED]';
      
      // Optionally add hash for correlation
      if (includeHashes && typeof value === 'string' && value.length > 0) {
        result[`${key}Hash`] = hashText(value);
        result[`${key}Length`] = value.length;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeLogMeta(value, { ...options, maxDepth: maxDepth - 1 });
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Check if a key name indicates sensitive content.
 * 
 * @param key - Key name to check
 * @returns true if key likely contains sensitive data
 */
export function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk.toLowerCase()));
}

/**
 * Get a safe summary of content for logging.
 * Returns length and hash, never the actual content.
 * 
 * @param content - Content to summarize
 * @returns Safe summary object
 */
export function getContentSummary(content: string | null | undefined): {
  length: number;
  hash: string;
  preview: string;
} {
  if (!content) {
    return { length: 0, hash: 'empty', preview: '[empty]' };
  }
  
  return {
    length: content.length,
    hash: hashText(content),
    preview: `[${content.length} chars]`,
  };
}

