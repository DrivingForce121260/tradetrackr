/**
 * Session Service
 * 
 * Manages single active session per user.
 * Prevents simultaneous logins on multiple devices.
 */

import { httpsCallable } from 'firebase/functions';
import { functionsEU } from '@/config/firebase';

// Session configuration
const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds
const SESSION_TTL_MINUTES = 5;

let currentSessionId: string | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Generate a random session ID
 */
export function createSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Get the current session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/**
 * Claim a session for the current user.
 * @returns { success: true } if session was claimed
 * @returns { success: false, message: string } if blocked by existing session
 * @throws Error for unexpected errors
 */
export async function claimSession(
  concernId: string,
  uid: string,
  sessionId: string
): Promise<{ success: boolean; message?: string }> {
  // Guard: ensure we have required params
  if (!concernId || !uid || !sessionId) {
    console.error('❌ [SessionService] claimSession called with missing params:', { 
      hasConcernId: !!concernId, 
      hasUid: !!uid, 
      hasSessionId: !!sessionId 
    });
    throw new Error('Missing session parameters');
  }

  // Diagnostic log (single entry per claim attempt)
  console.log('🔐 [SessionService] Claiming session:', {
    uid: uid.substring(0, 8),
    concernId,
    sessionId: sessionId.substring(0, 8),
    region: 'europe-west1',
  });

  try {
    const claimFn = httpsCallable<
      { concernId: string; uid: string; sessionId: string; userAgent?: string },
      { success: boolean; message?: string; expiresAt?: string }
    >(functionsEU, 'claimUserSession');

    const result = await claimFn({
      concernId,
      uid,
      sessionId,
      userAgent: navigator.userAgent,
    });

    if (result.data.success) {
      currentSessionId = sessionId;
      console.log('✅ [SessionService] Session claimed successfully');
      return { success: true };
    } else {
      // This branch shouldn't be reached - server throws on deny
      console.log('🚫 [SessionService] Session claim denied (unexpected path):', result.data.message);
      return { success: false, message: result.data.message };
    }
  } catch (error: unknown) {
    const err = error as Error & { code?: string; details?: unknown };
    
    console.error('❌ [SessionService] Session claim error:', {
      code: err.code,
      message: err.message,
    });
    
    // Check for SESSION_ALREADY_ACTIVE error
    // Firebase SDK uses 'functions/failed-precondition' format
    const isSessionBlocked = 
      err.code === 'functions/failed-precondition' ||
      err.code === 'functions/already-exists' ||
      err.message?.includes('SESSION_ALREADY_ACTIVE');

    if (isSessionBlocked) {
      console.log('🚫 [SessionService] Session blocked - another device is active');
      return {
        success: false,
        message: 'Dieses Konto ist bereits angemeldet. Bitte melden Sie sich zuerst auf dem anderen Gerät ab.',
      };
    }
    
    // Re-throw unexpected errors
    throw err;
  }
}

// Callback for when session is invalidated (another device took over)
let onSessionInvalidated: (() => void) | null = null;

/**
 * Set callback for when session is invalidated by another device
 */
export function setSessionInvalidatedCallback(callback: () => void): void {
  onSessionInvalidated = callback;
}

/**
 * Start the heartbeat to keep the session alive
 */
export function startHeartbeat(concernId: string, uid: string): void {
  if (heartbeatInterval) {
    console.log('⚠️ [SessionService] Heartbeat already running');
    return;
  }

  if (!currentSessionId) {
    console.error('❌ [SessionService] Cannot start heartbeat without session');
    return;
  }

  console.log('💓 [SessionService] Starting heartbeat');

  const sendHeartbeat = async () => {
    if (!currentSessionId) {
      stopHeartbeat();
      return;
    }

    try {
      const heartbeatFn = httpsCallable<
        { concernId: string; uid: string; sessionId: string },
        { success: boolean }
      >(functionsEU, 'claimUserSession');

      // Reuse claimUserSession for heartbeat (it extends the session)
      await heartbeatFn({
        concernId,
        uid,
        sessionId: currentSessionId,
      });

      console.log('💓 [SessionService] Heartbeat OK');
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      console.error('❌ [SessionService] Heartbeat failed:', err.code, err.message);
      
      // If session was taken by another device, stop heartbeat and notify
      const isSessionLost = 
        err.code === 'functions/failed-precondition' ||
        err.message?.includes('SESSION_ALREADY_ACTIVE');
      
      if (isSessionLost) {
        console.log('🚫 [SessionService] Session lost to another device, stopping');
        stopHeartbeat();
        currentSessionId = null;
        
        if (onSessionInvalidated) {
          onSessionInvalidated();
        }
      }
      // For other errors, continue - session will expire naturally if needed
    }
  };

  // Send initial heartbeat after a short delay (avoid race with claim)
  setTimeout(sendHeartbeat, 2000);

  // Schedule regular heartbeats
  heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
}

/**
 * Stop the heartbeat
 */
export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    console.log('💔 [SessionService] Stopping heartbeat');
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Release the current session
 */
export async function releaseSession(concernId: string, uid: string): Promise<void> {
  stopHeartbeat();

  if (!currentSessionId) {
    console.log('⚠️ [SessionService] No session to release');
    return;
  }

  try {
    const releaseFn = httpsCallable<
      { concernId: string; uid: string; sessionId: string },
      { success: boolean }
    >(functionsEU, 'releaseUserSession');

    await releaseFn({
      concernId,
      uid,
      sessionId: currentSessionId,
    });

    console.log('✅ [SessionService] Session released');
  } catch (error) {
    console.error('❌ [SessionService] Session release error:', error);
    // Continue anyway - session will expire
  } finally {
    currentSessionId = null;
  }
}

/**
 * Best-effort release on tab close
 */
export function setupTabCloseHandler(concernId: string, uid: string): () => void {
  const handleBeforeUnload = () => {
    if (currentSessionId) {
      // Use sendBeacon for best-effort release (doesn't block tab close)
      // Since we can't call Cloud Functions synchronously, we just log
      // The session will expire after TTL
      console.log('🚪 [SessionService] Tab closing, session will expire in', SESSION_TTL_MINUTES, 'minutes');
      
      // Try to release via sendBeacon if we had an HTTP endpoint
      // For now, rely on TTL expiry
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}

/**
 * Check if session is currently active
 */
export function isSessionActive(): boolean {
  return currentSessionId !== null && heartbeatInterval !== null;
}

