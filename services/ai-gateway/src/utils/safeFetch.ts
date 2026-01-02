/**
 * Safe Fetch with Egress Allowlist
 * 
 * Implements an app-level egress allowlist for the AI Gateway.
 * In production, only requests to explicitly allowed hosts are permitted.
 * 
 * @see /docs/sovereignty/definition.md
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Hosts that are always allowed for AI Gateway outbound requests.
 */
const ALLOWED_HOSTS: string[] = [
  // IONOS AI Model Hub (OpenAI-compatible endpoint)
  'openai.inference.de-txl.ionos.com',
  'openai.inference.de-fra.ionos.com',
  
  // IONOS Object Storage (Germany regions)
  's3.eu-central-3.ionoscloud.com',
  's3.eu-central-4.ionoscloud.com',
  
  // Own infrastructure
  'tradetrackr.de',
  'api.tradetrackr.de',
  'ai.tradetrackr.de',
  'ai-staging.tradetrackr.de',
  
  // Localhost (development/testing)
  'localhost',
  '127.0.0.1',
];

/**
 * Hosts that are explicitly denied, even if mistakenly in allowlist.
 * These would violate IONOS_ONLY sovereignty requirements.
 */
const DENIED_HOST_PATTERNS: RegExp[] = [
  /\.google\.com$/i,
  /\.googleapis\.com$/i,
  /\.firebaseio\.com$/i,
  /\.firebase\.com$/i,
  /\.firebaseapp\.com$/i,
  /\.gstatic\.com$/i,
  /\.openai\.com$/i,        // Direct OpenAI (not IONOS endpoint)
  /\.anthropic\.com$/i,
  /\.azure\.com$/i,
  /\.amazonaws\.com$/i,
  /\.cloudflare\.com$/i,
  /\.microsoft\.com$/i,     // Except specific approved endpoints
];

/**
 * Extended allowlist from environment variable.
 * Format: comma-separated hosts, e.g., "host1.com,host2.de"
 */
function getExtendedAllowlist(): string[] {
  const envHosts = process.env.AI_GATEWAY_ALLOWED_HOSTS || '';
  if (!envHosts.trim()) return [];
  return envHosts.split(',').map(h => h.trim()).filter(Boolean);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if a host is explicitly denied.
 */
function isDeniedHost(host: string): boolean {
  return DENIED_HOST_PATTERNS.some(pattern => pattern.test(host));
}

/**
 * Check if a host is in the allowlist.
 */
function isAllowedHost(host: string): boolean {
  const allAllowed = [...ALLOWED_HOSTS, ...getExtendedAllowlist()];
  return allAllowed.some(allowed => {
    // Exact match or subdomain match
    return host === allowed || host.endsWith('.' + allowed);
  });
}

/**
 * Validate that a URL is allowed for outbound requests.
 * Throws an error if the host is not permitted.
 */
export function validateEgressUrl(url: string | URL): void {
  const parsed = typeof url === 'string' ? new URL(url) : url;
  const host = parsed.hostname.toLowerCase();
  
  // Always deny explicitly banned hosts
  if (isDeniedHost(host)) {
    throw new Error(
      `Egress blocked: Host "${host}" ist explizit verboten. ` +
      `Dieser Request würde die Souveränitätsanforderungen verletzen.`
    );
  }
  
  // In production, require explicit allowlist
  if (process.env.NODE_ENV === 'production') {
    if (!isAllowedHost(host)) {
      throw new Error(
        `Egress blocked: Host "${host}" ist nicht in der Allowlist. ` +
        `Erlaubte Hosts: ${ALLOWED_HOSTS.join(', ')}. ` +
        `Erweitern Sie AI_GATEWAY_ALLOWED_HOSTS bei Bedarf.`
      );
    }
  }
}

// ============================================================================
// Safe Fetch Wrapper
// ============================================================================

/**
 * Type for fetch options (compatible with Node 18+ native fetch)
 */
export type SafeFetchOptions = RequestInit & {
  /** Skip egress validation (use with extreme caution) */
  _skipEgressCheck?: boolean;
};

/**
 * Safe fetch wrapper that validates egress before making requests.
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Promise<Response>
 * 
 * @example
 * ```typescript
 * // Allowed - IONOS AI endpoint
 * const response = await safeFetch('https://openai.inference.de-txl.ionos.com/v1/chat/completions', {
 *   method: 'POST',
 *   headers: { 'Authorization': 'Bearer ...' },
 *   body: JSON.stringify({ ... })
 * });
 * 
 * // Blocked - Direct OpenAI
 * await safeFetch('https://api.openai.com/v1/chat/completions', { ... }); // throws!
 * ```
 */
export async function safeFetch(
  url: string | URL,
  options?: SafeFetchOptions
): Promise<Response> {
  // Validate egress unless explicitly skipped
  if (!options?._skipEgressCheck) {
    validateEgressUrl(url);
  }
  
  // Use native fetch (Node 18+)
  return fetch(url, options);
}

// ============================================================================
// IONOS-Specific Helpers
// ============================================================================

/**
 * IONOS AI Model Hub configuration.
 */
export interface IONOSConfig {
  baseUrl: string;
  token: string;
}

/**
 * Get IONOS AI configuration from environment.
 * Validates that the endpoint is actually an IONOS endpoint.
 */
export function getIONOSConfig(): IONOSConfig {
  const baseUrl = process.env.IONOS_AI_BASE_URL || 'https://openai.inference.de-txl.ionos.com/v1';
  const token = process.env.IONOS_AI_TOKEN || '';
  
  // Validate the base URL is actually IONOS
  try {
    const parsed = new URL(baseUrl);
    const host = parsed.hostname.toLowerCase();
    
    if (!host.endsWith('.ionos.com') && !host.endsWith('.ionoscloud.com')) {
      throw new Error(
        `IONOS_AI_BASE_URL muss auf *.ionos.com oder *.ionoscloud.com zeigen. ` +
        `Aktuell: "${host}". Direkter Zugriff auf OpenAI/Anthropic ist nicht erlaubt.`
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`IONOS_AI_BASE_URL ist keine gültige URL: "${baseUrl}"`);
    }
    throw error;
  }
  
  if (!token && process.env.NODE_ENV === 'production') {
    throw new Error(
      'IONOS_AI_TOKEN ist erforderlich in Produktion. ' +
      'Setzen Sie die Umgebungsvariable IONOS_AI_TOKEN.'
    );
  }
  
  return { baseUrl, token };
}

/**
 * Make a request to IONOS AI Model Hub.
 * Automatically uses safeFetch with proper authentication.
 */
export async function ionosAIFetch(
  endpoint: string,
  options: Omit<SafeFetchOptions, 'headers'> & { headers?: Record<string, string> }
): Promise<Response> {
  const config = getIONOSConfig();
  const url = `${config.baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.token}`,
    ...options.headers,
  };
  
  return safeFetch(url, {
    ...options,
    headers,
  });
}

// ============================================================================
// Test Exports
// ============================================================================

export const _testExports = {
  ALLOWED_HOSTS,
  DENIED_HOST_PATTERNS,
  isDeniedHost,
  isAllowedHost,
};

