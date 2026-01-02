/**
 * AI Gateway Configuration
 * 
 * Environment variables:
 * - AI_GATEWAY_PORT: Port to listen on (default: 8787)
 * - AI_GATEWAY_TOKEN: Required Bearer token for authentication
 * - AI_UPSTREAM_MODE: MOCK | IONOS (default: MOCK)
 * - IONOS_AI_BASE_URL: IONOS AI endpoint (must be *.ionos.com or *.ionoscloud.com)
 * - IONOS_AI_TOKEN: Token for IONOS AI Model Hub
 * - LOG_LEVEL: debug | info | warn | error (default: info)
 * - NODE_ENV: development | production
 */

/**
 * Allowed IONOS AI endpoint host patterns.
 * These are the only hosts permitted for AI upstream in IONOS mode.
 */
const ALLOWED_IONOS_HOSTS = [
  'openai.inference.de-txl.ionos.com',
  'openai.inference.de-fra.ionos.com',
];

export interface GatewayConfig {
  port: number;
  token: string;
  upstreamMode: 'MOCK' | 'IONOS';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  isDev: boolean;
  version: string;
  ionos: {
    baseUrl: string;
    token: string;
  };
}

/**
 * Validate that an IONOS base URL is allowed.
 * Only permits known IONOS AI Model Hub endpoints.
 */
function validateIONOSBaseUrl(baseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`IONOS_AI_BASE_URL ist keine gültige URL: "${baseUrl}"`);
  }
  
  const host = parsed.hostname.toLowerCase();
  
  // Must end with ionos.com or ionoscloud.com
  if (!host.endsWith('.ionos.com') && !host.endsWith('.ionoscloud.com')) {
    throw new Error(
      `IONOS_AI_BASE_URL muss auf *.ionos.com oder *.ionoscloud.com zeigen. ` +
      `Aktuell: "${host}". ` +
      `Erlaubte Hosts: ${ALLOWED_IONOS_HOSTS.join(', ')}. ` +
      `Direkter Zugriff auf OpenAI/Anthropic ist nicht erlaubt.`
    );
  }
  
  // In production, must be exact match to known endpoints
  if (process.env.NODE_ENV === 'production') {
    if (!ALLOWED_IONOS_HOSTS.includes(host)) {
      throw new Error(
        `IONOS_AI_BASE_URL muss ein bekannter IONOS-Endpunkt sein. ` +
        `"${host}" ist nicht in der Allowlist. ` +
        `Erlaubte Hosts: ${ALLOWED_IONOS_HOSTS.join(', ')}.`
      );
    }
  }
}

/**
 * Load configuration from environment variables.
 * Validates required settings in production.
 */
export function loadConfig(): GatewayConfig {
  const isDev = process.env.NODE_ENV !== 'production';
  const token = process.env.AI_GATEWAY_TOKEN || '';
  
  // Require token in production
  if (!isDev && !token) {
    throw new Error(
      'AI_GATEWAY_TOKEN ist erforderlich in Produktion. ' +
      'Setzen Sie die Umgebungsvariable AI_GATEWAY_TOKEN.'
    );
  }
  
  const upstreamMode = (process.env.AI_UPSTREAM_MODE || 'MOCK').toUpperCase();
  if (upstreamMode !== 'MOCK' && upstreamMode !== 'IONOS') {
    throw new Error(
      `AI_UPSTREAM_MODE muss MOCK oder IONOS sein, nicht "${upstreamMode}".`
    );
  }
  
  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new Error(`LOG_LEVEL ungültig: ${logLevel}`);
  }
  
  // IONOS configuration
  const ionosBaseUrl = process.env.IONOS_AI_BASE_URL || 'https://openai.inference.de-txl.ionos.com/v1';
  const ionosToken = process.env.IONOS_AI_TOKEN || '';
  
  // Validate IONOS endpoint if in IONOS mode
  if (upstreamMode === 'IONOS') {
    validateIONOSBaseUrl(ionosBaseUrl);
    
    if (!isDev && !ionosToken) {
      throw new Error(
        'IONOS_AI_TOKEN ist erforderlich wenn AI_UPSTREAM_MODE=IONOS. ' +
        'Setzen Sie die Umgebungsvariable IONOS_AI_TOKEN.'
      );
    }
  }
  
  return {
    port: parseInt(process.env.AI_GATEWAY_PORT || '8787', 10),
    token: token || 'dev-token', // Allow empty token in dev
    upstreamMode: upstreamMode as 'MOCK' | 'IONOS',
    logLevel: logLevel as 'debug' | 'info' | 'warn' | 'error',
    isDev,
    version: '1.0.0',
    ionos: {
      baseUrl: ionosBaseUrl,
      token: ionosToken,
    },
  };
}

// Singleton config
let config: GatewayConfig | null = null;

export function getConfig(): GatewayConfig {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

