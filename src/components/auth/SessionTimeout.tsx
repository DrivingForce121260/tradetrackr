// ============================================================================
// SESSION TIMEOUT COMPONENT
// ============================================================================
// Handles automatic logout after 30 minutes of inactivity
// Resets timer on user activity events

import { useEffect, useRef, useState, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';

interface SessionTimeoutProps {
  disabled?: boolean;
  timeoutMinutes?: number;
  warningSeconds?: number;
}

const DEFAULT_TIMEOUT_MINUTES = 30;
const DEFAULT_WARNING_SECONDS = 60; // Show warning 1 minute before logout

export default function SessionTimeout({
  disabled = false,
  timeoutMinutes: propTimeoutMinutes,
  warningSeconds: propWarningSeconds
}: SessionTimeoutProps) {
  const { user, logout } = useAuth();
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);
  const [warningSeconds, setWarningSeconds] = useState(DEFAULT_WARNING_SECONDS);
  const [enabled, setEnabled] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(warningSeconds);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const orgId = user?.concernID || user?.ConcernID || '';

  // Load configuration from Firestore
  useEffect(() => {
    const loadConfig = async () => {
      if (!orgId || propTimeoutMinutes !== undefined || propWarningSeconds !== undefined) {
        // Use props if provided, or defaults
        if (propTimeoutMinutes !== undefined) setTimeoutMinutes(propTimeoutMinutes);
        if (propWarningSeconds !== undefined) setWarningSeconds(propWarningSeconds);
        setConfigLoaded(true);
        return;
      }

      try {
        const configDoc = await getDoc(doc(db, 'orgSettings', orgId));
        if (configDoc.exists()) {
          const data = configDoc.data();
          setTimeoutMinutes(data.sessionTimeoutMinutes || DEFAULT_TIMEOUT_MINUTES);
          setWarningSeconds(data.sessionTimeoutWarningSeconds || DEFAULT_WARNING_SECONDS);
          setEnabled(data.sessionTimeoutEnabled !== false); // Default to true
        } else {
          // Use defaults
          setTimeoutMinutes(DEFAULT_TIMEOUT_MINUTES);
          setWarningSeconds(DEFAULT_WARNING_SECONDS);
          setEnabled(true);
        }
      } catch (error) {
        console.error('[SessionTimeout] Failed to load config:', error);
        // Use defaults on error
        setTimeoutMinutes(DEFAULT_TIMEOUT_MINUTES);
        setWarningSeconds(DEFAULT_WARNING_SECONDS);
        setEnabled(true);
      } finally {
        setConfigLoaded(true);
      }
    };

    loadConfig();
  }, [orgId, propTimeoutMinutes, propWarningSeconds]);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = timeoutMs - (warningSeconds * 1000);

  const handleLogout = useCallback(async () => {
    try {
      // Clear all timers
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      // Sign out from Firebase
      await signOut(auth);
      
      // Also call logout from AuthContext if available
      if (logout) {
        await logout();
      }

      // Redirect to landing page with timeout parameter
      window.location.href = '/?timeout=true';
    } catch (error) {
      console.error('[SessionTimeout] Error during logout:', error);
    }
  }, [logout]);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Hide warning if it was showing
    setShowWarning(false);
    setCountdown(warningSeconds); // Use current warningSeconds state

    // Set warning timer (fires before logout)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(warningSeconds);

      // Start countdown interval
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningMs);

    // Set logout timer
    timerRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [timeoutMs, warningMs, warningSeconds, handleLogout]);

  const handleContinueSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const handleLogoutNow = useCallback(() => {
    handleLogout();
  }, [handleLogout]);

  useEffect(() => {
    // Don't activate if disabled, no user, config not loaded, or timeout disabled
    if (disabled || !user || !configLoaded || !enabled) {
      return;
    }

    // Start timer when component mounts or user changes
    resetTimer();

    // Activity events that reset the timer
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'mousedown', 'keypress'];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Also reset on visibility change (when user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, disabled, enabled, configLoaded, resetTimer, timeoutMs, warningMs, warningSeconds]);

  // Don't render anything if disabled, no user, config not loaded, or timeout disabled
  if (disabled || !user || !configLoaded || !enabled) {
    return null;
  }

  return (
    <>
      <Dialog open={showWarning} onOpenChange={(open) => !open && handleContinueSession()}>
        <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <DialogTitle className="text-xl">Session läuft ab</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Sie waren inaktiv. Ihre Sitzung wird in{' '}
              <span className="font-bold text-amber-600">{countdown}</span> Sekunden
              automatisch beendet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-4 px-4 bg-amber-50 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
            <span className="text-sm text-amber-800">
              Bitte bestätigen Sie, dass Sie weiterarbeiten möchten.
            </span>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleLogoutNow}
              className="flex-1 sm:flex-initial"
            >
              Jetzt abmelden
            </Button>
            <Button
              onClick={handleContinueSession}
              className="flex-1 sm:flex-initial bg-[#058bc0] hover:bg-[#0470a0]"
            >
              Session fortsetzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

