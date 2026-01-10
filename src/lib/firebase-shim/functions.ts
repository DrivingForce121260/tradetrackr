/**
 * Firebase Functions Shim
 * 
 * Workstream B2: Firebase removal
 * 
 * This shim replaces firebase/functions imports and routes
 * callable function invocations to /api/v1/functions/:name
 */

import { getAccessToken } from '@/lib/auth/oidc-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface HttpsCallableResult<T> {
  data: T;
}

export interface HttpsCallable<RequestData, ResponseData> {
  (data?: RequestData): Promise<HttpsCallableResult<ResponseData>>;
}

export interface Functions {
  app: any;
  region: string;
  customDomain: string | null;
}

// Shim Functions instance
const shimFunctions: Functions = {
  app: { name: '[SHIM]' },
  region: 'europe-west1',
  customDomain: null,
};

/**
 * Get a Functions instance (no-op, returns shim)
 */
export function getFunctions(_app?: any, _region?: string): Functions {
  return shimFunctions;
}

/**
 * Create a callable function reference that calls the API
 */
export function httpsCallable<RequestData = any, ResponseData = any>(
  _functions: Functions,
  name: string,
  _options?: any
): HttpsCallable<RequestData, ResponseData> {
  return async (data?: RequestData): Promise<HttpsCallableResult<ResponseData>> => {
    const token = await getAccessToken();
    
    const response = await fetch(`${API_BASE}/api/v1/functions/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Function ${name} failed: ${response.status}`);
    }

    const result = await response.json();
    return { data: result.result ?? result.data ?? result };
  };
}

/**
 * Connect to functions emulator (no-op in shim)
 */
export function connectFunctionsEmulator(
  _functions: Functions,
  _host: string,
  _port: number
): void {
  console.debug('[Firebase Shim] connectFunctionsEmulator called - ignored');
}

export default shimFunctions;

