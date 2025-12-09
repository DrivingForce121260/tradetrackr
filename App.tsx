/**
 * TradeTrackr Field App (Lean Edition)
 * Root Application Component
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { initializeAutoSync } from './src/services/offlineQueue';
import { checkClientHealth } from './src/services/health';
import { logInfo, logWarn } from './src/services/logger';

export default function App() {
  useEffect(() => {
    // Run health check on startup (DEV only)
    if (__DEV__) {
      checkClientHealth()
        .then((result) => {
          if (!result.ok) {
            logWarn('App Startup: Health check issues detected', result.issues);
          } else {
            logInfo('App Startup: Health check passed');
          }
        })
        .catch((error) => {
          logWarn('App Startup: Health check failed to run', error);
        });
    }

    // Initialize auto-sync for offline queue
    const unsubscribe = initializeAutoSync();

    return () => {
      // Clean up network listener on unmount
      unsubscribe();
    };
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}

