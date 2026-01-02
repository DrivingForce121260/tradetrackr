/**
 * OIDC Client for TradeTrackr Web Portal
 * 
 * Uses Authorization Code + PKCE flow with Keycloak.
 * Replaces Firebase Auth for Sovereignty Phase 03.
 * 
 * @see /docs/sovereignty/PHASE3_PLAN.md
 */

import { UserManager, User, WebStorageStateStore, Log } from 'oidc-client-ts';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get OIDC configuration from environment variables.
 */
function getOIDCConfig() {
  const authority = import.meta.env.VITE_OIDC_AUTHORITY || 
    'https://auth.tradetrackr.de/realms/tradetrackr';
  
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID || 'tradetrackr-web';
  
  const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI || 
    `${window.location.origin}/callback`;
  
  const postLogoutRedirectUri = import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI || 
    window.location.origin;
  
  return {
    authority,
    clientId,
    redirectUri,
    postLogoutRedirectUri,
  };
}

// ============================================================================
// Types
// ============================================================================

/**
 * TradeTrackr user profile from OIDC claims.
 */
export interface TradeTrackrUser {
  /** Keycloak user ID */
  userId: string;
  
  /** Email address */
  email: string;
  
  /** Tenant ID (concernID) */
  tenantId: string;
  
  /** User roles */
  roles: string[];
  
  /** Access token for API calls */
  accessToken: string;
  
  /** Token expiration timestamp (ms) */
  expiresAt: number;
  
  /** Display name */
  displayName?: string;
}

/**
 * Authentication state.
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: TradeTrackrUser | null;
  error: string | null;
}

// ============================================================================
// User Manager Singleton
// ============================================================================

let userManager: UserManager | null = null;

/**
 * Get or create the UserManager instance.
 */
function getUserManager(): UserManager {
  if (userManager) return userManager;
  
  const config = getOIDCConfig();
  
  // Enable logging in development
  if (import.meta.env.DEV) {
    Log.setLogger(console);
    Log.setLevel(Log.INFO);
  }
  
  userManager = new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    post_logout_redirect_uri: config.postLogoutRedirectUri,
    
    // PKCE is enabled by default in oidc-client-ts
    response_type: 'code',
    scope: 'openid profile email',
    
    // Token handling
    automaticSilentRenew: true,
    silentRequestTimeoutInSeconds: 10,
    
    // Storage (sessionStorage for security)
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    
    // Don't load user info from userinfo endpoint (we get claims in token)
    loadUserInfo: false,
    
    // Filter protocol claims from profile
    filterProtocolClaims: true,
  });
  
  // Event handlers
  userManager.events.addUserLoaded((user) => {
    console.log('OIDC: User loaded');
  });
  
  userManager.events.addUserUnloaded(() => {
    console.log('OIDC: User unloaded');
  });
  
  userManager.events.addSilentRenewError((error) => {
    console.error('OIDC: Silent renew error', error);
  });
  
  userManager.events.addAccessTokenExpired(() => {
    console.warn('OIDC: Access token expired');
  });
  
  return userManager;
}

// ============================================================================
// User Transformation
// ============================================================================

/**
 * Transform OIDC User to TradeTrackr user.
 */
function toTradeTrackrUser(oidcUser: User): TradeTrackrUser {
  const profile = oidcUser.profile;
  
  // Extract custom claims
  const tenantId = (profile as any).tenant_id || '';
  const roles = (profile as any).roles || [];
  
  if (!tenantId) {
    console.warn('OIDC: User has no tenant_id claim');
  }
  
  return {
    userId: profile.sub,
    email: profile.email || profile.preferred_username || '',
    tenantId,
    roles: Array.isArray(roles) ? roles : [roles],
    accessToken: oidcUser.access_token,
    expiresAt: oidcUser.expires_at ? oidcUser.expires_at * 1000 : 0,
    displayName: profile.name || profile.preferred_username,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize and check for existing session.
 * Call this on app startup.
 */
export async function initAuth(): Promise<TradeTrackrUser | null> {
  const um = getUserManager();
  
  try {
    const user = await um.getUser();
    if (user && !user.expired) {
      return toTradeTrackrUser(user);
    }
    return null;
  } catch (error) {
    console.error('OIDC: Failed to get user', error);
    return null;
  }
}

/**
 * Start login flow.
 * Redirects to Keycloak login page.
 */
export async function login(): Promise<void> {
  const um = getUserManager();
  
  // Store current location for redirect after login
  sessionStorage.setItem('oidc_return_url', window.location.href);
  
  await um.signinRedirect();
}

/**
 * Handle login callback.
 * Call this on the callback page.
 */
export async function handleCallback(): Promise<TradeTrackrUser> {
  const um = getUserManager();
  
  const user = await um.signinRedirectCallback();
  
  if (!user) {
    throw new Error('Login fehlgeschlagen');
  }
  
  const ttUser = toTradeTrackrUser(user);
  
  if (!ttUser.tenantId) {
    // Clear session and throw
    await um.removeUser();
    throw new Error('Kein Mandant zugewiesen. Bitte Admin kontaktieren.');
  }
  
  return ttUser;
}

/**
 * Get stored return URL after callback.
 */
export function getReturnUrl(): string {
  const url = sessionStorage.getItem('oidc_return_url');
  sessionStorage.removeItem('oidc_return_url');
  return url || '/';
}

/**
 * Logout.
 * Redirects to Keycloak logout page.
 */
export async function logout(): Promise<void> {
  const um = getUserManager();
  await um.signoutRedirect();
}

/**
 * Get current user (synchronous check).
 * Returns null if not authenticated.
 */
export async function getUser(): Promise<TradeTrackrUser | null> {
  const um = getUserManager();
  
  try {
    const user = await um.getUser();
    if (user && !user.expired) {
      return toTradeTrackrUser(user);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get current access token.
 * Attempts silent refresh if expired.
 */
export async function getAccessToken(): Promise<string | null> {
  const um = getUserManager();
  
  try {
    let user = await um.getUser();
    
    // Try silent refresh if expired
    if (user?.expired) {
      try {
        user = await um.signinSilent();
      } catch {
        // Silent refresh failed, need full re-auth
        return null;
      }
    }
    
    return user?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to user changes.
 */
export function onUserChange(callback: (user: TradeTrackrUser | null) => void): () => void {
  const um = getUserManager();
  
  const handleLoaded = (oidcUser: User) => {
    callback(toTradeTrackrUser(oidcUser));
  };
  
  const handleUnloaded = () => {
    callback(null);
  };
  
  const handleExpired = () => {
    callback(null);
  };
  
  um.events.addUserLoaded(handleLoaded);
  um.events.addUserUnloaded(handleUnloaded);
  um.events.addAccessTokenExpired(handleExpired);
  
  // Return cleanup function
  return () => {
    um.events.removeUserLoaded(handleLoaded);
    um.events.removeUserUnloaded(handleUnloaded);
    um.events.removeAccessTokenExpired(handleExpired);
  };
}

/**
 * Check if user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  return user !== null;
}

