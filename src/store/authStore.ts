/**
 * Authentication Store (Zustand)
 * 
 * Phase 03 Sovereignty Migration: Firebase Auth → Keycloak OIDC
 * 
 * This store now delegates to the OIDC client for authentication.
 * Firebase Auth has been completely removed.
 * 
 * @see /docs/sovereignty/PHASE3_PLAN.md
 */

import { create } from 'zustand';
import { 
  login as oidcLogin, 
  logout as oidcLogout, 
  getUser,
  getAccessToken,
} from '../lib/auth/oidc-client';
import { logInfo, logError } from '../services/logger';
import { AuthSession } from '../types';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  
  // Actions
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  resetPassword: (email: string) => Promise<void>;
  initFromOIDC: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isAuthenticated: false,

  /**
   * Initialize auth state from existing OIDC session.
   * Call this on app startup.
   */
  initFromOIDC: async () => {
    try {
      const user = await getUser();
      if (user) {
        const session: AuthSession = {
          userId: user.userId,
          concernID: user.tenantId,
          email: user.email,
          token: user.accessToken,
          expiresAt: user.expiresAt,
        };
        
        set({
          session,
          isAuthenticated: true,
        });
        
        logInfo('Authentication: Session restored from OIDC', {
          userId: session.userId,
          concernID: session.concernID,
        });
      }
    } catch (error) {
      logError('Authentication: Failed to restore OIDC session', error);
    }
  },

  /**
   * Sign in - redirects to Keycloak.
   * Email/password params are ignored (handled by Keycloak).
   */
  signInWithEmailPassword: async (_email: string, _password: string) => {
    logInfo('Authentication: Redirecting to Keycloak login...');
    await oidcLogin();
  },

  /**
   * Sign out - redirects to Keycloak logout.
   */
  signOut: async () => {
    try {
      set({
        session: null,
        isAuthenticated: false,
      });

      logInfo('Authentication: Signing out via Keycloak...');
      await oidcLogout();
    } catch (error) {
      logError('Authentication: Sign out failed', error);
      // Still clear local state
      set({
        session: null,
        isAuthenticated: false,
      });
    }
  },

  /**
   * Reset password - redirect to Keycloak.
   * Keycloak handles password reset flow.
   */
  resetPassword: async (email: string) => {
    if (!email) {
      throw new Error('E-Mail-Adresse erforderlich');
    }

    logInfo('Authentication: Password reset requested', { email });
    
    // Redirect to Keycloak with login hint
    // User will use "Forgot password" link on Keycloak login page
    await oidcLogin();
  },
}));
