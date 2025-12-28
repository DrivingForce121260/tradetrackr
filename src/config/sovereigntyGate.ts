/**
 * Sovereignty Gate - Runtime Assertion for IONOS_ONLY Mode
 * 
 * This module provides a startup assertion that prevents accidental
 * enabling of IONOS_ONLY mode while still configured for Firebase/3rd parties.
 * 
 * The gate does NOT block mailbox connector env vars (those are legitimate).
 * It blocks infrastructure-level configs that would violate sovereignty.
 * 
 * @see /docs/sovereignty/definition.md for full documentation
 */

import { getProviderPolicy, getForbiddenEnvVars, ProviderPolicy } from './providerPolicy';

// ============================================================================
// Types
// ============================================================================

export interface SovereigntyGateResult {
  /** Whether the gate passed (no violations) */
  passed: boolean;
  
  /** Current sovereignty mode */
  mode: string;
  
  /** List of violations found */
  violations: string[];
  
  /** Human-readable summary */
  summary: string;
}

// ============================================================================
// Gate Implementation
// ============================================================================

/**
 * Assert that the current environment is compatible with sovereignty mode.
 * 
 * This function should be called at server startup. In IONOS_ONLY mode,
 * it checks that no forbidden environment variables are set.
 * 
 * @param policy - Provider policy to check against (defaults to current env)
 * @throws Error if IONOS_ONLY mode is enabled with forbidden configuration
 * 
 * @example
 * ```typescript
 * // At server startup
 * import { assertSovereigntyMode } from '@/config/sovereigntyGate';
 * 
 * assertSovereigntyMode();
 * // Server continues if check passes
 * ```
 */
export function assertSovereigntyMode(policy?: ProviderPolicy): void {
  // Skip in test mode
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  
  const result = checkSovereigntyMode(policy);
  
  if (!result.passed) {
    const errorMessage = [
      '═══════════════════════════════════════════════════════════════════',
      '  SOVEREIGNTY GATE FAILED - IONOS_ONLY MODE MISCONFIGURATION',
      '═══════════════════════════════════════════════════════════════════',
      '',
      result.summary,
      '',
      'Violations found:',
      ...result.violations.map((v) => `  ❌ ${v}`),
      '',
      'To fix:',
      '  1. Remove the forbidden environment variables, OR',
      '  2. Set SOVEREIGNTY_MODE=OFF to disable sovereignty mode',
      '',
      'See: /docs/sovereignty/definition.md',
      '═══════════════════════════════════════════════════════════════════',
    ].join('\n');
    
    console.error(errorMessage);
    throw new Error(`Sovereignty gate failed: ${result.violations.length} violation(s) found`);
  }
}

/**
 * Check sovereignty mode without throwing.
 * Useful for diagnostics and testing.
 * 
 * @param policy - Provider policy to check against (defaults to current env)
 * @returns Gate result with pass/fail status and details
 */
export function checkSovereigntyMode(policy?: ProviderPolicy): SovereigntyGateResult {
  const effectivePolicy = policy || getProviderPolicy();
  const violations: string[] = [];
  
  // If not in IONOS_ONLY mode, gate always passes
  if (effectivePolicy.sovereigntyMode !== 'IONOS_ONLY') {
    return {
      passed: true,
      mode: effectivePolicy.sovereigntyMode,
      violations: [],
      summary: 'Sovereignty mode is OFF - all providers allowed',
    };
  }
  
  // Check for forbidden environment variables
  const forbiddenEnvVars = getForbiddenEnvVars();
  
  for (const envVar of forbiddenEnvVars) {
    // Special case: Allow GOOGLE_APPLICATION_CREDENTIALS if it points to a local file
    // (used for local development with emulators)
    if (envVar === 'GOOGLE_APPLICATION_CREDENTIALS') {
      const value = process.env[envVar];
      if (value && (value.includes('localhost') || value.includes('emulator'))) {
        continue;
      }
    }
    
    violations.push(`Environment variable ${envVar} is set but forbidden in IONOS_ONLY mode`);
  }
  
  // Check for Firebase config in common locations
  if (process.env.FIREBASE_CONFIG) {
    violations.push('FIREBASE_CONFIG is set - remove Firebase configuration for IONOS_ONLY mode');
  }
  
  const passed = violations.length === 0;
  
  return {
    passed,
    mode: effectivePolicy.sovereigntyMode,
    violations,
    summary: passed
      ? 'Sovereignty mode IONOS_ONLY - all checks passed'
      : `Sovereignty mode IONOS_ONLY - ${violations.length} violation(s) detected`,
  };
}

/**
 * Log sovereignty gate status at startup (non-blocking).
 * Useful for debugging and monitoring.
 */
export function logSovereigntyStatus(): void {
  const result = checkSovereigntyMode();
  
  if (result.mode === 'OFF') {
    console.log('[Sovereignty] Mode: OFF (standard mode, all providers allowed)');
    return;
  }
  
  if (result.passed) {
    console.log('[Sovereignty] Mode: IONOS_ONLY ✓ (all checks passed)');
  } else {
    console.warn('[Sovereignty] Mode: IONOS_ONLY ⚠ VIOLATIONS DETECTED:');
    result.violations.forEach((v) => console.warn(`  - ${v}`));
  }
}

// ============================================================================
// Initialization Helper
// ============================================================================

/**
 * Initialize sovereignty gate at server startup.
 * 
 * This is the recommended way to integrate the gate:
 * - Logs status for monitoring
 * - Throws in IONOS_ONLY mode if misconfigured
 * - No-op in test mode
 * 
 * @example
 * ```typescript
 * // At server entrypoint
 * import { initSovereigntyGate } from '@/config/sovereigntyGate';
 * 
 * initSovereigntyGate();
 * // Continue with server initialization
 * ```
 */
export function initSovereigntyGate(): void {
  // Skip entirely in test mode
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  
  // Log status for monitoring
  logSovereigntyStatus();
  
  // Assert (throws if IONOS_ONLY with violations)
  assertSovereigntyMode();
}

