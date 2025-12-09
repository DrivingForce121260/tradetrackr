/**
 * Feature Flags
 * 
 * Centralized feature toggles for the Field App.
 * These are static flags - no remote config yet.
 * 
 * Can be controlled via environment variables for different builds.
 */

/**
 * Check if running in production environment
 */
function isProduction(): boolean {
  const env = process.env.EXPO_PUBLIC_ENV;
  return env === 'production';
}

/**
 * Parse boolean from environment variable
 */
function envFlag(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

/**
 * Feature flags configuration
 */
export const featureFlags = {
  /**
   * Enable AI Help Assistant
   * Requires EXPO_PUBLIC_AI_ENDPOINT to be configured
   */
  aiHelp: envFlag('EXPO_PUBLIC_FEATURE_AI_HELP', true),

  /**
   * Enable offline queue for mutations
   * Disable for debugging or if causing issues
   */
  offlineQueue: envFlag('EXPO_PUBLIC_FEATURE_OFFLINE_QUEUE', true),

  /**
   * Enable QR code scanner
   * Requires camera permissions
   */
  qrScanner: envFlag('EXPO_PUBLIC_FEATURE_QR_SCANNER', true),

  /**
   * Enable photo capture
   * Requires camera and storage permissions
   */
  photoCapture: envFlag('EXPO_PUBLIC_FEATURE_PHOTO_CAPTURE', true),

  /**
   * Enable debug screen
   * CRITICAL: Forced to false in production builds for security
   * Only available in development or via explicit env override
   */
  debugScreen: isProduction() 
    ? false 
    : envFlag('EXPO_PUBLIC_FEATURE_DEBUG_SCREEN', __DEV__),
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Get all feature flags as object
 */
export function getAllFeatureFlags(): typeof featureFlags {
  return featureFlags;
}

/**
 * Log feature flags status (development only)
 */
if (__DEV__) {
  console.log('=================================');
  console.log('Feature Flags Configuration');
  console.log('=================================');
  Object.entries(featureFlags).forEach(([key, value]) => {
    console.log(`${key}: ${value ? '✅ ENABLED' : '❌ DISABLED'}`);
  });
  console.log('=================================');
}

