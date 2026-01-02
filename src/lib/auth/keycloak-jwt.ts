/**
 * Keycloak JWT Verification
 * 
 * Verifies JWTs issued by Keycloak using JWKS.
 * For use in API middleware (Firebase Functions or standalone API).
 * 
 * @see /docs/sovereignty/PHASE3_PLAN.md
 */

import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get Keycloak configuration from environment.
 */
export function getKeycloakConfig(): {
  issuer: string;
  jwksUri: string;
  audience: string;
} {
  const issuer = process.env.KEYCLOAK_ISSUER || 
    process.env.VITE_OIDC_AUTHORITY || 
    'https://auth.tradetrackr.de/realms/tradetrackr';
  
  const jwksUri = process.env.KEYCLOAK_JWKS_URI || 
    `${issuer}/protocol/openid-connect/certs`;
  
  const audience = process.env.KEYCLOAK_AUDIENCE || 'tradetrackr-api';
  
  return { issuer, jwksUri, audience };
}

// ============================================================================
// Types
// ============================================================================

/**
 * TradeTrackr-specific JWT claims.
 */
export interface TradeTrackrJWTPayload extends JWTPayload {
  /** User ID (Keycloak subject) */
  sub: string;
  
  /** Email address */
  email?: string;
  
  /** Email verified flag */
  email_verified?: boolean;
  
  /** Tenant ID (concernID) - REQUIRED for multi-tenancy */
  tenant_id?: string;
  
  /** User roles */
  roles?: string[];
  
  /** Preferred username */
  preferred_username?: string;
  
  /** Token type (access_token) */
  typ?: string;
  
  /** Authorized party (client ID) */
  azp?: string;
}

/**
 * Verified user context extracted from JWT.
 */
export interface VerifiedUser {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  emailVerified: boolean;
}

// ============================================================================
// JWKS Cache
// ============================================================================

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Get cached JWKS (remote key set).
 */
function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const config = getKeycloakConfig();
    jwks = createRemoteJWKSet(new URL(config.jwksUri));
  }
  return jwks;
}

/**
 * Clear JWKS cache (for testing or key rotation).
 */
export function clearJWKSCache(): void {
  jwks = null;
}

// ============================================================================
// Verification
// ============================================================================

/**
 * Verify a Keycloak JWT.
 * 
 * @param token - The JWT string (without "Bearer " prefix)
 * @returns Verified user context
 * @throws Error if token is invalid
 * 
 * @example
 * ```typescript
 * const user = await verifyKeycloakJWT(token);
 * console.log(user.tenantId); // concernID
 * ```
 */
export async function verifyKeycloakJWT(token: string): Promise<VerifiedUser> {
  const config = getKeycloakConfig();
  
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: config.issuer,
      audience: config.audience,
    });
    
    const claims = payload as TradeTrackrJWTPayload;
    
    // Validate required claims
    if (!claims.sub) {
      throw new Error('Token fehlt: sub (Benutzer-ID)');
    }
    
    if (!claims.tenant_id) {
      throw new Error('Token fehlt: tenant_id (Mandanten-ID). Bitte Admin kontaktieren.');
    }
    
    return {
      userId: claims.sub,
      email: claims.email || claims.preferred_username || '',
      tenantId: claims.tenant_id,
      roles: claims.roles || [],
      emailVerified: claims.email_verified || false,
    };
    
  } catch (error: any) {
    // Provide user-friendly error messages (German)
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Sitzung abgelaufen. Bitte erneut anmelden.');
    }
    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Ungültiges Token. Bitte erneut anmelden.');
    }
    if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      if (error.claim === 'iss') {
        throw new Error('Token-Aussteller ungültig.');
      }
      if (error.claim === 'aud') {
        throw new Error('Token-Empfänger ungültig.');
      }
    }
    
    // Re-throw our custom errors
    if (error.message?.includes('Token fehlt')) {
      throw error;
    }
    
    throw new Error('Authentifizierung fehlgeschlagen. Bitte erneut anmelden.');
  }
}

/**
 * Extract bearer token from Authorization header.
 * 
 * @param authHeader - Full Authorization header value
 * @returns Token string or null
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

// ============================================================================
// Express Middleware
// ============================================================================

/**
 * Express middleware for Keycloak JWT verification.
 * Attaches verified user to request object.
 */
export function keycloakAuthMiddleware() {
  return async (
    req: { headers: { authorization?: string }; user?: VerifiedUser },
    res: { status: (code: number) => { json: (body: any) => void } },
    next: () => void
  ) => {
    const token = extractBearerToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: 'Nicht autorisiert. Token fehlt.' });
    }
    
    try {
      const user = await verifyKeycloakJWT(token);
      req.user = user;
      next();
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Nicht autorisiert.' });
    }
  };
}

// ============================================================================
// Tenant Guard
// ============================================================================

/**
 * Verify tenant access.
 * Ensures the user's tenantId matches the requested resource's tenant.
 * 
 * @param user - Verified user from JWT
 * @param resourceTenantId - Tenant ID of the resource being accessed
 * @throws Error if access denied
 */
export function assertTenantAccess(user: VerifiedUser, resourceTenantId: string): void {
  if (!user.tenantId) {
    throw new Error('Zugriff verweigert: Kein Mandant zugewiesen.');
  }
  
  if (user.tenantId !== resourceTenantId) {
    throw new Error('Zugriff verweigert: Falscher Mandant.');
  }
}

/**
 * Check if user has any of the required roles.
 * 
 * @param user - Verified user from JWT
 * @param requiredRoles - Array of allowed roles
 * @returns true if user has at least one required role
 */
export function hasAnyRole(user: VerifiedUser, requiredRoles: string[]): boolean {
  if (!user.roles || user.roles.length === 0) return false;
  return requiredRoles.some(role => user.roles.includes(role));
}

/**
 * Assert user has required role.
 * 
 * @param user - Verified user from JWT
 * @param requiredRoles - Array of allowed roles
 * @throws Error if user lacks all required roles
 */
export function assertRole(user: VerifiedUser, requiredRoles: string[]): void {
  if (!hasAnyRole(user, requiredRoles)) {
    throw new Error(`Zugriff verweigert: Erforderliche Rolle: ${requiredRoles.join(' oder ')}`);
  }
}

