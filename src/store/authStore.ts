/**
 * Authentication Store (Zustand)
 * Handles user authentication and session management
 * 
 * CRITICAL: This uses the SAME authentication flow as the TradeTrackr portal.
 * Uses concernID from user document (flat structure).
 */

import { create } from 'zustand';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserConcernID } from '../services/api';
import { logInfo, logWarn, logError } from '../services/logger';
import { AuthSession } from '../types';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  
  // Actions
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isAuthenticated: false,

  signInWithEmailPassword: async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email und Passwort erforderlich');
    }

    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get concernID from user document (same as old mobile app)
      const concernID = await getUserConcernID(user.uid);

      if (!concernID) {
        throw new Error('Benutzer hat keine gültige Firma zugewiesen. Bitte kontaktieren Sie den Administrator.');
      }

      // Get Firebase token for API authentication
      const token = await user.getIdToken();

      // Build session - matches portal's session structure with concernID
      const session: AuthSession = {
        userId: user.uid,
        concernID,
        email: user.email || email,
        token,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour (Firebase handles refresh)
      };

      set({
        session,
        isAuthenticated: true,
      });

      logInfo('Authentication: User logged in successfully', {
        userId: session.userId,
        concernID: session.concernID,
      });
    } catch (error: any) {
      logError('Authentication: Login failed', error, { email });
      
      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Falsche E-Mail oder Passwort');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Ungültige E-Mail-Adresse');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('Benutzer wurde deaktiviert');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Zu viele fehlgeschlagene Anmeldeversuche. Bitte später erneut versuchen.');
      } else {
        throw new Error(error.message || 'Anmeldung fehlgeschlagen');
      }
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      
      set({
        session: null,
        isAuthenticated: false,
      });

      logInfo('Authentication: User signed out');
    } catch (error) {
      logError('Authentication: Sign out failed', error);
      // Still clear local state even if Firebase signOut fails
      set({
        session: null,
        isAuthenticated: false,
      });
    }
  },

  resetPassword: async (email: string) => {
    if (!email) {
      throw new Error('E-Mail-Adresse erforderlich');
    }

    try {
      await sendPasswordResetEmail(auth, email);
      logInfo('Authentication: Password reset email sent', { email });
    } catch (error: any) {
      logError('Authentication: Password reset failed', error, { email });
      
      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('Kein Konto mit dieser E-Mail-Adresse gefunden');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Ungültige E-Mail-Adresse');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Zu viele Anfragen. Bitte später erneut versuchen.');
      } else {
        throw new Error(error.message || 'Passwort-Reset fehlgeschlagen');
      }
    }
  },
}));
