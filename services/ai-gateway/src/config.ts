/**
 * AI Gateway Configuration
 * 
 * Environment variables:
 * - AI_GATEWAY_PORT: Port to listen on (default: 8787)
 * - AI_GATEWAY_TOKEN: Required Bearer token for authentication
 * - AI_UPSTREAM_MODE: MOCK | IONOS (default: MOCK)
 * - LOG_LEVEL: debug | info | warn | error (default: info)
 * - NODE_ENV: development | production
 */

export interface GatewayConfig {
  port: number;
  token: string;
  upstreamMode: 'MOCK' | 'IONOS';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  isDev: boolean;
  version: string;
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
  
  return {
    port: parseInt(process.env.AI_GATEWAY_PORT || '8787', 10),
    token: token || 'dev-token', // Allow empty token in dev
    upstreamMode: upstreamMode as 'MOCK' | 'IONOS',
    logLevel: logLevel as 'debug' | 'info' | 'warn' | 'error',
    isDev,
    version: '1.0.0',
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

