/**
 * Firestore Sanitization Utilities (Client-side)
 * 
 * Prevents `undefined` values from being written to Firestore.
 * Firestore does not allow `undefined` values in documents.
 * 
 * This is a client-side version of the functions/src/utils/sanitizeForFirestore.ts
 * for use in React components and services.
 */

import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Type guard to check if a value is a plain object (not Date, Timestamp, Buffer, etc.)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  
  // Preserve special Firestore types
  if (value instanceof Date) return false;
  if (value instanceof Timestamp) return false;
  // Check for FieldValue (serverTimestamp, arrayUnion, etc.)
  if (value && typeof value === 'object' && 'isEqual' in value) return false;
  if (ArrayBuffer.isView(value)) return false;
  if (Array.isArray(value)) return false;
  
  // Check for plain object prototype
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively sanitizes an object for Firestore by:
 * - Removing `undefined` values (they cause Firestore errors)
 * - Filtering `undefined` from arrays
 * - Converting NaN/Infinity to null
 * - Preserving `null`, Dates, Timestamps, and FieldValue
 * 
 * Does NOT mutate the input object - returns a new sanitized copy.
 * 
 * @param value - The value to sanitize
 * @returns A sanitized copy safe for Firestore writes
 */
export function sanitizeForFirestore<T>(value: T): T {
  // Primitives: return as-is (except undefined at root which shouldn't happen)
  if (value === undefined) {
    return null as unknown as T;
  }
  
  if (value === null) {
    return null as unknown as T;
  }
  
  // Handle NaN and Infinity
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return null as unknown as T;
    }
    return value;
  }
  
  // Preserve special types
  if (typeof value !== 'object') {
    return value;
  }
  
  // Date, Timestamp, FieldValue - return as-is
  if (value instanceof Date) {
    return value;
  }
  
  if (value instanceof Timestamp) {
    return value;
  }
  
  // Check for FieldValue (serverTimestamp, arrayUnion, etc.)
  if (value && typeof value === 'object' && 'isEqual' in value) {
    return value;
  }
  
  // Arrays: filter undefined, recursively sanitize items
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  
  // Plain objects: recursively sanitize, omit undefined keys
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        // Also skip functions and symbols
        if (typeof val === 'function' || typeof val === 'symbol') {
          continue;
        }
        result[key] = sanitizeForFirestore(val);
      }
      // Skip undefined keys entirely
    }
    
    return result as unknown as T;
  }
  
  // Unknown object type - return as-is (e.g., custom classes)
  return value;
}

/**
 * Normalizes optional string fields for Firestore.
 * Ensures strings are never undefined.
 * 
 * @param value - The string value (may be undefined)
 * @param fallback - Fallback value (default: empty string)
 * @returns The value or fallback
 */
export function normalizeString(
  value: string | undefined | null,
  fallback = ''
): string {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value;
}

/**
 * Normalizes an optional array field.
 * Ensures the field is always an array, never undefined.
 * 
 * @param value - The array value (may be undefined)
 * @returns The value or empty array
 */
export function normalizeArray<T>(value: T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return value;
}

/**
 * Creates an idempotency key for email pipeline processing.
 * 
 * @param emailId - The email document ID
 * @param analysisVersion - Current analysis version
 * @returns Idempotency key string
 */
export function createIdempotencyKey(emailId: string, analysisVersion: number): string {
  return `${emailId}:v${analysisVersion}`;
}

/**
 * Deep check for undefined values in an object.
 * Returns list of paths containing undefined.
 * 
 * @param obj - Object to check
 * @param path - Current path (for recursion)
 * @returns Array of paths with undefined values
 */
export function findUndefinedPaths(obj: Record<string, unknown>, path = ''): string[] {
  const undefinedPaths: string[] = [];
  
  for (const key of Object.keys(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = obj[key];
    
    if (value === undefined) {
      undefinedPaths.push(currentPath);
    } else if (isPlainObject(value)) {
      undefinedPaths.push(...findUndefinedPaths(value, currentPath));
    } else if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (item === undefined) {
          undefinedPaths.push(`${currentPath}[${idx}]`);
        } else if (isPlainObject(item)) {
          undefinedPaths.push(...findUndefinedPaths(item, `${currentPath}[${idx}]`));
        }
      });
    }
  }
  
  return undefinedPaths;
}

/**
 * German error message mapper for sync errors.
 * 
 * @param error - Firebase error object
 * @returns German error message
 */
export function getSyncErrorMessage(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';
  
  // Check for specific error codes
  if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
    return 'Sie sind nicht angemeldet. Bitte melden Sie sich erneut an.';
  }
  
  if (code === 'functions/permission-denied' || code === 'permission-denied') {
    return 'Zugriff verweigert. Sie haben keine Berechtigung für dieses Konto.';
  }
  
  if (code === 'functions/not-found' || code === 'not-found') {
    return 'E-Mail-Konto nicht gefunden. Bitte Konto erneut verbinden.';
  }
  
  if (code === 'functions/unavailable' || code === 'unavailable') {
    return 'E-Mail-Server nicht erreichbar. Bitte später erneut versuchen.';
  }
  
  if (code === 'functions/resource-exhausted' || code === 'resource-exhausted') {
    return 'API-Kontingent erschöpft. Bitte später erneut versuchen.';
  }
  
  if (code === 'functions/deadline-exceeded' || code === 'deadline-exceeded') {
    return 'Zeitüberschreitung. Bitte erneut versuchen mit weniger E-Mails.';
  }
  
  if (code === 'functions/failed-precondition' || code === 'failed-precondition') {
    return 'Konto unvollständig konfiguriert. Bitte erneut verbinden.';
  }
  
  // Check for specific messages
  if (message.includes('quota') || message.includes('429')) {
    return 'API-Kontingent erschöpft. Bitte später erneut versuchen.';
  }
  
  if (message.includes('OAuth') || message.includes('token')) {
    return 'Authentifizierung abgelaufen. Bitte Konto erneut verbinden.';
  }
  
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return 'Verbindung zum E-Mail-Server zeitüberschritten.';
  }
  
  // Default message
  return 'Synchronisierung fehlgeschlagen. Bitte erneut versuchen oder Support kontaktieren.';
}



