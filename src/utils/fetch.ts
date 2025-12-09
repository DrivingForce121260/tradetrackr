/**
 * Fetch Utilities
 * 
 * Hardened fetch with timeout and retry support.
 */

import { logError, logWarn } from '../services/logger';

/**
 * Fetch with timeout
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30s)
 * @returns Response
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      logWarn('Fetch: Request timeout', { url, timeoutMs });
      throw new Error('Anfrage hat zu lange gedauert. Bitte erneut versuchen.');
    }

    throw error;
  }
}

/**
 * Fetch with retry
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum retry attempts (default: 2)
 * @param timeoutMs - Timeout per attempt (default: 30s)
 * @returns Response
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  timeoutMs: number = 30000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      // Only retry on 5xx errors or network errors
      if (response.ok || response.status < 500) {
        return response;
      }

      logWarn('Fetch: Server error, retrying', {
        url,
        status: response.status,
        attempt: attempt + 1,
        maxRetries,
      });

      lastError = new Error(`Server error: ${response.status}`);

      // Exponential backoff
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (error.message?.includes('Authentifizierung') || error.message?.includes('401')) {
        throw error;
      }

      if (attempt < maxRetries) {
        logWarn('Fetch: Request failed, retrying', {
          url,
          error: error.message,
          attempt: attempt + 1,
          maxRetries,
        });

        // Exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  logError('Fetch: All retry attempts failed', lastError, { url, maxRetries });
  throw lastError || new Error('Anfrage fehlgeschlagen');
}








