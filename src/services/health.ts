/**
 * Health Check Service
 * 
 * Verifies client-side system health on startup.
 * Useful for debugging and deployment verification.
 */

import { env } from '../config/env';
import { auth, db, storage } from './firebase';
import { useAuthStore } from '../store/authStore';
import { isSessionExpired } from '../utils/guards';
import { logInfo, logWarn, logError } from './logger';

export interface HealthCheckResult {
  ok: boolean;
  issues: string[];
  checks: {
    [key: string]: {
      passed: boolean;
      message?: string;
    };
  };
}

/**
 * Run comprehensive health check
 * 
 * Verifies:
 * - Environment configuration
 * - Firebase initialization
 * - Session validity (if logged in)
 * - Network connectivity (basic)
 */
export async function checkClientHealth(): Promise<HealthCheckResult> {
  const issues: string[] = [];
  const checks: HealthCheckResult['checks'] = {};

  logInfo('Health Check: Starting client health check');

  // 1. Check Environment Configuration
  try {
    // Basic env validation
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_API_KEY) {
      throw new Error('Firebase configuration incomplete');
    }
    checks.envConfig = { passed: true };
  } catch (error: any) {
    checks.envConfig = {
      passed: false,
      message: error.message,
    };
    issues.push(`Environment Config: ${error.message}`);
  }

  // 2. Check Firebase Initialization
  try {
    if (!auth || !db || !storage) {
      throw new Error('Firebase services not initialized');
    }
    checks.firebaseInit = { passed: true };
  } catch (error: any) {
    checks.firebaseInit = {
      passed: false,
      message: error.message,
    };
    issues.push(`Firebase Init: ${error.message}`);
  }

  // 3. Check Session (if logged in)
  try {
    const session = useAuthStore.getState().session;
    
    if (session) {
      if (isSessionExpired(session)) {
        checks.session = {
          passed: false,
          message: 'Session expired',
        };
        issues.push('Session: Token expired');
      } else if (!session.tenantId) {
        checks.session = {
          passed: false,
          message: 'Missing tenantId',
        };
        issues.push('Session: Missing tenantId');
      } else {
        checks.session = { passed: true };
      }
    } else {
      checks.session = {
        passed: true,
        message: 'Not logged in',
      };
    }
  } catch (error: any) {
    checks.session = {
      passed: false,
      message: error.message,
    };
    issues.push(`Session Check: ${error.message}`);
  }

  // 4. Check AI Endpoint Configuration
  try {
    if (env.AI_ENDPOINT) {
      checks.aiEndpoint = {
        passed: true,
        message: 'Configured',
      };
    } else {
      checks.aiEndpoint = {
        passed: false,
        message: 'Not configured (using mock)',
      };
      if (env.isProduction) {
        issues.push('AI Endpoint: Not configured in production');
      }
    }
  } catch (error: any) {
    checks.aiEndpoint = {
      passed: false,
      message: error.message,
    };
  }

  // 5. Check Network Connectivity (basic)
  try {
    // Simple check: can we reach Google DNS?
    const response = await fetch('https://dns.google', {
      method: 'HEAD',
      timeout: 5000,
    } as any);
    
    checks.network = {
      passed: response.ok,
      message: response.ok ? 'Online' : 'Connection issues',
    };
    
    if (!response.ok) {
      issues.push('Network: Connection issues detected');
    }
  } catch (error: any) {
    checks.network = {
      passed: false,
      message: 'Offline or connection failed',
    };
    // Network issues are not critical for offline-first app
    logWarn('Health Check: Network check failed', error.message);
  }

  const ok = issues.length === 0;

  if (!ok) {
    logWarn('Health Check: Issues detected', { issues, checks });
  } else {
    logInfo('Health Check: All checks passed');
  }

  return {
    ok,
    issues,
    checks,
  };
}

/**
 * Quick readiness check (lighter than full health check)
 * Returns true if app can start normally
 */
export function checkReadiness(): boolean {
  try {
    // Must have Firebase config
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_API_KEY) {
      return false;
    }
    
    // Must have Firebase services
    if (!auth || !db || !storage) {
      return false;
    }

    return true;
  } catch (error) {
    logError('Readiness Check: Failed', error);
    return false;
  }
}

/**
 * Get human-readable summary of health status
 */
export function getHealthSummary(result: HealthCheckResult): string {
  if (result.ok) {
    return '✅ Alle Systeme betriebsbereit';
  }

  const issueCount = result.issues.length;
  return `⚠️ ${issueCount} Problem${issueCount > 1 ? 'e' : ''} erkannt:\n${result.issues.join('\n')}`;
}

