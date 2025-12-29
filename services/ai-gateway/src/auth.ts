/**
 * AI Gateway Authentication
 * 
 * Simple Bearer token authentication.
 * In production, requires AI_GATEWAY_TOKEN to be set.
 */

import { getConfig } from './config.js';

/**
 * Authentication result.
 */
export interface AuthResult {
  authenticated: boolean;
  error?: string;
  tenantId?: string;
}

/**
 * Validate Bearer token from Authorization header.
 * 
 * @param authHeader - Authorization header value
 * @returns Authentication result
 */
export function validateAuth(authHeader: string | null): AuthResult {
  const config = getConfig();
  
  // No auth header
  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Nicht autorisiert.',
    };
  }
  
  // Must be Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Nicht autorisiert.',
    };
  }
  
  const token = authHeader.slice(7).trim();
  
  // Empty token
  if (!token) {
    return {
      authenticated: false,
      error: 'Nicht autorisiert.',
    };
  }
  
  // In dev mode, accept any non-empty token
  if (config.isDev && token.length > 0) {
    return {
      authenticated: true,
      tenantId: extractTenantId(token),
    };
  }
  
  // Validate token
  if (token !== config.token) {
    return {
      authenticated: false,
      error: 'Nicht autorisiert.',
    };
  }
  
  return {
    authenticated: true,
    tenantId: extractTenantId(token),
  };
}

/**
 * Extract tenant ID from token if encoded.
 * For now, returns undefined. Can be extended for JWT.
 */
function extractTenantId(token: string): string | undefined {
  // Simple implementation - in future could decode JWT
  // For now, tenant ID should be passed in request body
  return undefined;
}

