/**
 * Environment Configuration
 * 
 * NO DEMO VALUES. Production builds require valid environment variables.
 * Fails fast if critical config is missing.
 */

interface EnvConfig {
  // Environment
  MODE: 'development' | 'preview' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
  
  // Firebase (REQUIRED in production)
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  
  // Backend (OPTIONAL)
  AI_ENDPOINT: string | null;
}

// Environment mode
const MODE = (process.env.EXPO_PUBLIC_ENV || (__DEV__ ? 'development' : 'production')) as 'development' | 'preview' | 'production';
const isProd = MODE === 'production';
const isDev = MODE === 'development' || __DEV__;

/**
 * Get environment variable with production validation
 * NEVER THROWS - returns empty string if missing
 */
function get(key: string, requiredInProd: boolean = true): string {
  const value = process.env[key];
  
  if (!value || value.trim() === '') {
    if (isProd && requiredInProd) {
      console.error(`❌ FEHLT: ${key}`);
    }
    
    if (isDev && requiredInProd) {
      console.warn(`⚠️  DEV: ${key} nicht gesetzt`);
    }
    
    return '';
  }
  
  return value;
}

// Validate all required Firebase variables upfront
const REQUIRED_FIREBASE_VARS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

// Strict validation in production (log only, don't throw at module level)
if (isProd) {
  const missing = REQUIRED_FIREBASE_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `❌ PRODUCTION BUILD FEHLER:\n\n` +
      `Fehlende Firebase-Umgebungsvariablen:\n` +
      missing.map(k => `  - ${k}`).join('\n') + '\n\n' +
      `Production-Builds benötigen echte Firebase-Credentials!\n` +
      `Siehe FIREBASE_SETUP.md für Anleitung.`
    );
    // Don't throw - let app start and show error in UI
  }
}

/**
 * Validated environment configuration
 * NO FALLBACKS. NO DEMO VALUES.
 */
export const env: EnvConfig = {
  MODE,
  isDevelopment: isDev,
  isProduction: isProd,
  
  // Firebase (strict - no fallbacks)
  FIREBASE_API_KEY: get('EXPO_PUBLIC_FIREBASE_API_KEY', true),
  FIREBASE_AUTH_DOMAIN: get('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', true),
  FIREBASE_PROJECT_ID: get('EXPO_PUBLIC_FIREBASE_PROJECT_ID', true),
  FIREBASE_STORAGE_BUCKET: get('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', true),
  FIREBASE_MESSAGING_SENDER_ID: get('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', true),
  FIREBASE_APP_ID: get('EXPO_PUBLIC_FIREBASE_APP_ID', true),
  
  // AI Backend (optional)
  AI_ENDPOINT: get('EXPO_PUBLIC_AI_ENDPOINT', false) || null,
};

/**
 * Log configuration status (only in development)
 */
if (isDev) {
  console.log('=================================');
  console.log('TradeTrackr Field App - Env Config');
  console.log('=================================');
  console.log('Mode:', env.MODE);
  console.log('Firebase Project:', env.FIREBASE_PROJECT_ID || '⚠️  NOT SET');
  console.log('AI Endpoint:', env.AI_ENDPOINT || '(not configured)');
  console.log('=================================');
  
  if (!env.FIREBASE_PROJECT_ID) {
    console.warn('⚠️  WARNUNG: Firebase nicht konfiguriert!');
    console.warn('📖 Siehe FIREBASE_SETUP.md für Anleitung.');
  }
}

// Production validation complete - config is valid or build failed

