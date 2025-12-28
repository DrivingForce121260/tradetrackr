/**
 * Provider Policy Configuration
 * 
 * Central source of truth for data sovereignty settings.
 * Controls which external providers/domains are allowed based on SOVEREIGNTY_MODE.
 * 
 * @see /docs/sovereignty/definition.md for full documentation
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Sovereignty mode determines data residency requirements.
 * - OFF: Standard mode, all providers allowed
 * - IONOS_ONLY: Strict mode, only IONOS Germany infrastructure permitted
 */
export type SovereigntyMode = 'OFF' | 'IONOS_ONLY';

/**
 * Allowed AI providers for LLM inference.
 * In IONOS_ONLY mode, only IONOS (via internal gateway) is permitted.
 */
export type AllowedAIProvider = 'IONOS' | 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

/**
 * Provider policy configuration interface.
 */
export interface ProviderPolicy {
  /** Current sovereignty mode */
  sovereigntyMode: SovereigntyMode;
  
  /** Whether external (non-IONOS) providers are allowed */
  allowExternal: boolean;
  
  /** Domains that are always allowed (e.g., own infrastructure) */
  allowedOutboundDomains: string[];
  
  /** Regex patterns for banned domains (scanned in CI and blocked at runtime) */
  bannedDomainPatterns: RegExp[];
  
  /** Raw string patterns for banned domains (used by CI scanner) */
  bannedDomainStrings: string[];
  
  /** File paths where banned domains are allowed (mailbox connector exception) */
  mailboxConnectorAllowedPaths: string[];
  
  /** AI providers allowed in current mode */
  allowedAIProviders: AllowedAIProvider[];
  
  /** Environment variables that must NOT be set in IONOS_ONLY mode */
  forbiddenEnvVarPrefixes: string[];
  
  /** Whether content logging is allowed (for debugging) */
  allowContentLogging: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Banned domain patterns for sovereignty scanning.
 * These domains indicate non-IONOS infrastructure usage.
 */
const BANNED_DOMAIN_STRINGS: string[] = [
  // Firebase/Google infrastructure
  'firebase',
  'firebaseio.com',
  'firestore.googleapis.com',
  'googleapis.com',
  'firebaseapp.com',
  'firebasestorage.googleapis.com',
  'crashlytics',
  'google-analytics',
  'googletagmanager',
  
  // Google AI
  'generativelanguage.googleapis.com',
  'aiplatform.googleapis.com',
  
  // OpenAI (direct calls)
  'api.openai.com',
  'openai.com',
  
  // Anthropic (direct calls)
  'api.anthropic.com',
  'anthropic.com',
  
  // Azure OpenAI
  'openai.azure.com',
  
  // AWS (if not IONOS-hosted)
  'amazonaws.com',
  's3.amazonaws.com',
  
  // Other Google services
  'storage.googleapis.com',
  'cloudfunctions.net',
  'run.app',
  'appspot.com',
];

/**
 * Convert string patterns to RegExp for runtime matching.
 */
const BANNED_DOMAIN_PATTERNS: RegExp[] = BANNED_DOMAIN_STRINGS.map(
  (pattern) => new RegExp(pattern.replace(/\./g, '\\.'), 'i')
);

/**
 * Paths where banned domains are ALLOWED (mailbox connector exception).
 * These paths may legally reference Google/Microsoft for upstream mailbox access.
 */
const MAILBOX_CONNECTOR_ALLOWED_PATHS: string[] = [
  'functions/src/emailIntelligence/',
  'functions/src/emailIntelligence\\', // Windows path separator
];

/**
 * Environment variable prefixes that indicate non-IONOS infrastructure.
 * These must NOT be set in production when IONOS_ONLY mode is enabled.
 */
const FORBIDDEN_ENV_VAR_PREFIXES: string[] = [
  'FIREBASE_',
  'GOOGLE_',
  'GCP_',
  'GCLOUD_',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'AZURE_OPENAI_',
];

/**
 * Domains that are always allowed (own infrastructure).
 */
const ALLOWED_OUTBOUND_DOMAINS: string[] = [
  'tradetrackr.de',
  'tradetrackr.com',
  'ionos.com',
  'ionos.de',
  'localhost',
  '127.0.0.1',
];

// ============================================================================
// Policy Factory
// ============================================================================

/**
 * Get the current provider policy based on environment configuration.
 * 
 * @returns ProviderPolicy configured for current sovereignty mode
 * 
 * @example
 * ```typescript
 * const policy = getProviderPolicy();
 * if (policy.sovereigntyMode === 'IONOS_ONLY') {
 *   // Use IONOS-only infrastructure
 * }
 * ```
 */
/**
 * Check if content logging is allowed.
 * 
 * - In IONOS_ONLY mode: always false (no content logging)
 * - Otherwise: respects LOG_CONTENT env var, defaults to false in production
 */
function isContentLoggingAllowed(): boolean {
  const sovereigntyMode = process.env.SOVEREIGNTY_MODE;
  const nodeEnv = process.env.NODE_ENV;
  const logContent = process.env.LOG_CONTENT;
  
  // In IONOS_ONLY mode, never allow content logging
  if (sovereigntyMode === 'IONOS_ONLY') {
    return false;
  }
  
  // If LOG_CONTENT is explicitly set
  if (logContent === '1' || logContent === 'true') {
    // Only allow in non-production
    return nodeEnv !== 'production';
  }
  
  // Default: no content logging
  return false;
}

export function getProviderPolicy(): ProviderPolicy {
  const rawMode = process.env.SOVEREIGNTY_MODE || 'OFF';
  const sovereigntyMode: SovereigntyMode = rawMode === 'IONOS_ONLY' ? 'IONOS_ONLY' : 'OFF';
  
  const isIONOSOnly = sovereigntyMode === 'IONOS_ONLY';
  
  return {
    sovereigntyMode,
    allowExternal: !isIONOSOnly,
    allowedOutboundDomains: ALLOWED_OUTBOUND_DOMAINS,
    bannedDomainPatterns: BANNED_DOMAIN_PATTERNS,
    bannedDomainStrings: BANNED_DOMAIN_STRINGS,
    mailboxConnectorAllowedPaths: MAILBOX_CONNECTOR_ALLOWED_PATHS,
    allowedAIProviders: isIONOSOnly ? ['IONOS'] : ['IONOS', 'OPENAI', 'GEMINI', 'ANTHROPIC'],
    forbiddenEnvVarPrefixes: FORBIDDEN_ENV_VAR_PREFIXES,
    allowContentLogging: isContentLoggingAllowed(),
  };
}

/**
 * Check if a file path is within the mailbox connector exception.
 * 
 * @param filePath - Path to check
 * @returns true if the path is allowed to reference banned domains
 */
export function isMailboxConnectorPath(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return MAILBOX_CONNECTOR_ALLOWED_PATHS.some((allowed) => {
    const normalizedAllowed = allowed.replace(/\\/g, '/');
    return normalizedPath.includes(normalizedAllowed);
  });
}

/**
 * Check if a domain matches any banned pattern.
 * 
 * @param domain - Domain or URL to check
 * @returns true if the domain is banned
 */
export function isBannedDomain(domain: string): boolean {
  return BANNED_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain));
}

/**
 * Get list of forbidden environment variables that are currently set.
 * Used by sovereignty gate to detect misconfiguration.
 * 
 * @returns Array of forbidden env var names that are set
 */
export function getForbiddenEnvVars(): string[] {
  const forbidden: string[] = [];
  
  for (const key of Object.keys(process.env)) {
    for (const prefix of FORBIDDEN_ENV_VAR_PREFIXES) {
      // Check for exact match (e.g., OPENAI_API_KEY) or prefix match (e.g., FIREBASE_*)
      if (key === prefix || key.startsWith(prefix)) {
        forbidden.push(key);
        break;
      }
    }
  }
  
  return forbidden;
}

// ============================================================================
// Exports for Testing
// ============================================================================

export const _testExports = {
  BANNED_DOMAIN_STRINGS,
  BANNED_DOMAIN_PATTERNS,
  MAILBOX_CONNECTOR_ALLOWED_PATHS,
  FORBIDDEN_ENV_VAR_PREFIXES,
  ALLOWED_OUTBOUND_DOMAINS,
};

