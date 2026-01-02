/**
 * Keycloak JWT Verification for Firebase Functions
 * 
 * Verifies JWTs issued by Keycloak using JWKS.
 * This is a copy for Firebase Functions which cannot import from src/.
 * 
 * @see /docs/sovereignty/PHASE3_PLAN.md
 */

import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import type { Request, Response, NextFunction } from 'express';

// ============================================================================
// Configuration
// ============================================================================

// Import functions config for Firebase (deprecated but still works until March 2026)
let functionsConfig: any = {};
try {
  const functions = require('firebase-functions');
  functionsConfig = functions.config();
} catch {
  // Not in Firebase Functions environment
}

/**
 * Get Keycloak configuration from environment.
 * Checks: 1) process.env, 2) functions.config(), 3) defaults
 */
export function getKeycloakConfig(): {
  issuer: string;
  jwksUri: string;
  audience: string;
} {
  const issuer = process.env.KEYCLOAK_ISSUER || 
    functionsConfig?.keycloak?.issuer ||
    'https://auth.tradetrackr.de/realms/tradetrackr';
  
  const jwksUri = process.env.KEYCLOAK_JWKS_URI || 
    functionsConfig?.keycloak?.jwks_uri ||
    `${issuer}/protocol/openid-connect/certs`;
  
  const audience = process.env.KEYCLOAK_AUDIENCE || 
    functionsConfig?.keycloak?.audience ||
    'tradetrackr-api';
  
  return { issuer, jwksUri, audience };
}

// ============================================================================
// Types
// ============================================================================

/**
 * TradeTrackr-specific JWT claims.
 */
export interface TradeTrackrJWTPayload extends JWTPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  tenant_id?: string;
  roles?: string[];
  preferred_username?: string;
  typ?: string;
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

/**
 * Express request with user attached.
 */
export interface AuthenticatedRequest extends Request {
  user?: VerifiedUser;
}

// ============================================================================
// JWKS Cache
// ============================================================================

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const config = getKeycloakConfig();
    jwks = createRemoteJWKSet(new URL(config.jwksUri));
  }
  return jwks;
}

export function clearJWKSCache(): void {
  jwks = null;
}

// ============================================================================
// Verification
// ============================================================================

/**
 * Verify a Keycloak JWT.
 */
export async function verifyKeycloakJWT(token: string): Promise<VerifiedUser> {
  const config = getKeycloakConfig();
  
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: config.issuer,
      audience: config.audience,
    });
    
    const claims = payload as TradeTrackrJWTPayload;
    
    if (!claims.sub) {
      throw new Error('Token fehlt: sub (Benutzer-ID)');
    }
    
    // Note: tenant_id check moved to requireTenant middleware
    // to allow 401 vs 403 distinction
    
    return {
      userId: claims.sub,
      email: claims.email || claims.preferred_username || '',
      tenantId: claims.tenant_id || '',
      roles: claims.roles || [],
      emailVerified: claims.email_verified || false,
    };
    
  } catch (error: any) {
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
    
    if (error.message?.includes('Token fehlt')) {
      throw error;
    }
    
    throw new Error('Authentifizierung fehlgeschlagen. Bitte erneut anmelden.');
  }
}

/**
 * Extract bearer token from Authorization header.
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
 * Returns 401 if token is missing or invalid.
 */
export function keycloakAuth() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

/**
 * Guard that requires tenant_id claim.
 * Returns 403 if tenant_id is missing.
 * Must be used AFTER keycloakAuth middleware.
 */
export function requireTenant() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht autorisiert.' });
    }
    
    if (!req.user.tenantId) {
      return res.status(403).json({ 
        error: 'Zugriff verweigert: Kein Mandant zugewiesen (tenant_id fehlt).' 
      });
    }
    
    next();
  };
}

/**
 * Utility to check tenant_id in request.
 * Throws if missing.
 */
export function assertTenant(req: AuthenticatedRequest): string {
  if (!req.user?.tenantId) {
    throw new Error('Zugriff verweigert: Kein Mandant zugewiesen.');
  }
  return req.user.tenantId;
}

/**
 * Check if user has any of the required roles.
 */
export function hasAnyRole(user: VerifiedUser, requiredRoles: string[]): boolean {
  if (!user.roles || user.roles.length === 0) return false;
  return requiredRoles.some(role => user.roles.includes(role));
}

/**
 * Guard that requires specific roles.
 * Returns 403 if user lacks all required roles.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht autorisiert.' });
    }
    
    if (!hasAnyRole(req.user, roles)) {
      return res.status(403).json({ 
        error: `Zugriff verweigert: Erforderliche Rolle: ${roles.join(' oder ')}` 
      });
    }
    
    next();
  };
}

