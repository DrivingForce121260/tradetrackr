/**
 * Mailto URL Builder Utility
 * 
 * Handles proper encoding and length limitations for mailto: URLs
 * to open the user's default email client with pre-filled data.
 */

// Maximum safe length for mailto body (many clients truncate beyond this)
export const MAX_MAILTO_BODY_LEN = 1800;

// Placeholder text when body is too long
export const LONG_BODY_PLACEHOLDER = 
  'Antworttext ist zu lang. Bitte im TradeTrackr-Editor kopieren und einfügen.';

export interface MailtoParams {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string | string[];
  bcc?: string | string[];
  /** If true, skip the "Re:" prefix (for new emails, not replies) */
  skipRePrefix?: boolean;
}

export interface MailtoResult {
  url: string;
  bodyTruncated: boolean;
  fullBody: string;
}

/**
 * Normalize line breaks to CRLF for email compatibility
 */
function normalizeLineBreaks(text: string): string {
  // First normalize all to LF, then convert to CRLF
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
}

/**
 * Sanitize text for mailto URL
 * - Remove null bytes
 * - Normalize line breaks
 * - Keep plain text only
 */
function sanitizeMailtoText(text: string): string {
  if (!text) return '';
  
  // Remove null bytes
  let sanitized = text.replace(/\0/g, '');
  
  // Normalize line breaks
  sanitized = normalizeLineBreaks(sanitized);
  
  // Remove any HTML tags (basic sanitization)
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  return sanitized.trim();
}

/**
 * Encode text for mailto URL parameter
 * Uses encodeURIComponent for proper UTF-8 encoding
 */
function encodeMailtoParam(text: string): string {
  return encodeURIComponent(sanitizeMailtoText(text));
}

/**
 * Ensure subject has "Re:" prefix if not already present
 */
function ensureRePrefix(subject: string): string {
  const trimmed = subject.trim();
  const upperSubject = trimmed.toUpperCase();
  
  // Check if already has Re:, RE:, or AW: (German)
  if (upperSubject.startsWith('RE:') || upperSubject.startsWith('AW:')) {
    return trimmed;
  }
  
  return `Re: ${trimmed}`;
}

/**
 * Convert string or array to comma-separated email list
 */
function formatEmailList(emails: string | string[] | undefined): string {
  if (!emails) return '';
  if (typeof emails === 'string') return emails.trim();
  return emails.filter(e => e.trim()).join(',');
}

/**
 * Build a mailto: URL with proper encoding and length handling
 * 
 * @param params - Email parameters (to, subject, body, cc, bcc)
 * @returns MailtoResult with URL, truncation flag, and full body
 * 
 * @example
 * const result = buildMailtoUrl({
 *   to: 'customer@example.com',
 *   subject: 'Your inquiry',
 *   body: 'Thank you for contacting us...'
 * });
 * 
 * if (result.bodyTruncated) {
 *   // Copy full body to clipboard
 *   await copyToClipboard(result.fullBody);
 * }
 * 
 * window.location.href = result.url;
 */
export function buildMailtoUrl(params: MailtoParams): MailtoResult {
  const { to, subject, body, cc, bcc, skipRePrefix = false } = params;
  
  // Validate required fields
  if (!to || (Array.isArray(to) && to.length === 0)) {
    throw new Error('mailto: "to" parameter is required');
  }
  
  if (!subject) {
    throw new Error('mailto: "subject" parameter is required');
  }
  
  if (!body) {
    throw new Error('mailto: "body" parameter is required');
  }
  
  // Format email addresses
  const toList = formatEmailList(to);
  const ccList = formatEmailList(cc);
  const bccList = formatEmailList(bcc);
  
  // Apply Re: prefix only for replies (not new emails)
  const finalSubject = skipRePrefix ? subject.trim() : ensureRePrefix(subject);
  
  // Sanitize body
  const sanitizedBody = sanitizeMailtoText(body);
  
  // Check if body needs truncation
  const bodyTruncated = sanitizedBody.length > MAX_MAILTO_BODY_LEN;
  const mailtoBody = bodyTruncated ? LONG_BODY_PLACEHOLDER : sanitizedBody;
  
  // Build mailto URL
  const params_array: string[] = [];
  
  // Subject is always first
  params_array.push(`subject=${encodeMailtoParam(finalSubject)}`);
  
  // Body
  params_array.push(`body=${encodeMailtoParam(mailtoBody)}`);
  
  // Optional CC
  if (ccList) {
    params_array.push(`cc=${encodeURIComponent(ccList)}`);
  }
  
  // Optional BCC
  if (bccList) {
    params_array.push(`bcc=${encodeURIComponent(bccList)}`);
  }
  
  // Construct final URL
  const url = `mailto:${encodeURIComponent(toList)}?${params_array.join('&')}`;
  
  return {
    url,
    bodyTruncated,
    fullBody: sanitizedBody,
  };
}

/**
 * Copy text to clipboard with proper error handling
 * 
 * @param text - Text to copy
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern Clipboard API (requires HTTPS)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Open mailto URL in user's default email client
 * 
 * @param url - The mailto: URL to open
 * @param useWindowOpen - If true, use window.open instead of location.href
 */
export function openMailtoUrl(url: string, useWindowOpen: boolean = false): void {
  try {
    if (useWindowOpen) {
      // Fallback: open in same window
      window.open(url, '_self');
    } else {
      // Preferred: direct navigation
      window.location.href = url;
    }
  } catch (error) {
    console.error('Failed to open mailto URL:', error);
    // Last resort fallback
    window.open(url, '_blank');
  }
}



