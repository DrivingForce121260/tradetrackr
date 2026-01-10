/**
 * Firebase App Shim
 * 
 * Workstream B2: Firebase removal
 * 
 * This shim replaces firebase/app imports with a no-op implementation.
 * The actual app initialization is handled by Keycloak authentication.
 */

// No-op Firebase app placeholder
const shimApp = {
  name: '[SHIM]',
  options: {},
  automaticDataCollectionEnabled: false,
};

export function initializeApp(_config?: any, _name?: string): typeof shimApp {
  console.debug('[Firebase Shim] initializeApp called - using API backend');
  return shimApp;
}

export function getApp(_name?: string): typeof shimApp {
  return shimApp;
}

export function getApps(): typeof shimApp[] {
  return [shimApp];
}

export function deleteApp(_app: any): Promise<void> {
  return Promise.resolve();
}

// Export the shim app as default
export default shimApp;

