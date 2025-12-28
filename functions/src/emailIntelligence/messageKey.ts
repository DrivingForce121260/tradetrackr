/**
 * Message Key Generation
 * 
 * Computes deterministic messageKey for email deduplication.
 * Same email delivered to multiple users yields same messageKey.
 */

import * as crypto from 'crypto';

/**
 * Compute SHA256 hash and return first 32 hex chars
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

/**
 * Normalize Message-ID header
 * Removes angle brackets, whitespace, and lowercases
 */
export function normalizeMessageId(messageId: string): string {
  if (!messageId) return '';
  return messageId
    .trim()
    .replace(/^</, '')
    .replace(/>$/, '')
    .toLowerCase();
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalize subject line
 * Removes RE:, FW:, AW:, WG: prefixes and extra whitespace
 */
export function normalizeSubject(subject: string): string {
  if (!subject) return '';
  return subject
    .trim()
    .replace(/^(re|fw|fwd|aw|wg|antwort|weitergeleitet):\s*/gi, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Round date to nearest minute for consistent hashing
 */
export function roundDateToMinute(date: Date): string {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d.toISOString();
}

/**
 * Compute canonical body hash
 * Strips HTML, normalizes whitespace
 */
export function computeBodyHash(body: string): string {
  if (!body) return sha256('');
  
  // Strip HTML tags
  let text = body.replace(/<[^>]*>/g, ' ');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Normalize whitespace
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  // Take first 2000 chars to avoid huge hashes
  text = text.substring(0, 2000);
  
  return sha256(text);
}

/**
 * Check if Message-ID looks valid
 */
export function isValidMessageId(messageId: string | undefined | null): boolean {
  if (!messageId) return false;
  const normalized = normalizeMessageId(messageId);
  // Must contain @ and be reasonable length
  return normalized.includes('@') && normalized.length >= 10 && normalized.length <= 500;
}

export interface MessageKeyInput {
  messageId?: string | null;     // Message-ID header
  from: string;                   // From email address
  subject?: string | null;
  date: Date;
  bodyText?: string | null;
  bodyHtml?: string | null;
}

/**
 * Compute deterministic messageKey for an email
 * 
 * Priority:
 * 1. If valid Message-ID exists: sha256("mid:" + normalizedMessageId)
 *    - NO body hash computed (performance optimization)
 * 2. Fallback: sha256("fallback:" + from + "|" + subject + "|" + date + "|" + bodyHash)
 *    - Body hash computed only in fallback path
 * 
 * Performance note: Body hashing is expensive for large emails.
 * When Message-ID is present and valid, we skip it entirely.
 */
export function computeMessageKey(input: MessageKeyInput): string {
  const { messageId, from, subject, date, bodyText, bodyHtml } = input;

  // Priority 1: Use Message-ID if valid (FAST PATH - no body hashing)
  if (isValidMessageId(messageId)) {
    const normalized = normalizeMessageId(messageId!);
    // Early return - skip expensive body hash computation
    return sha256(`mid:${normalized}`);
  }

  // Priority 2: Fallback hash (SLOW PATH - requires body hash)
  const normalizedFrom = normalizeEmail(from);
  const normalizedSubject = normalizeSubject(subject || '');
  const roundedDate = roundDateToMinute(date);
  
  // Only compute body hash in fallback path (expensive operation)
  const body = bodyText || bodyHtml || '';
  const bodyHash = computeBodyHash(body);

  const fallbackInput = `fallback:${normalizedFrom}|${normalizedSubject}|${roundedDate}|${bodyHash}`;
  return sha256(fallbackInput);
}

/**
 * Extract Message-ID from email headers
 * Handles various header formats
 */
export function extractMessageIdFromHeaders(headers: Record<string, string> | undefined): string | null {
  if (!headers) return null;
  
  // Common header key variations
  const keys = ['message-id', 'Message-ID', 'Message-Id', 'messageid'];
  
  for (const key of keys) {
    if (headers[key]) {
      return headers[key];
    }
  }
  
  return null;
}

