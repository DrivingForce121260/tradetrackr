/**
 * Firestore Sanitization Utilities
 * 
 * Prevents `undefined` values from being written to Firestore.
 * Firestore does not allow `undefined` values in documents.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Type guard to check if a value is a plain object (not Date, Timestamp, Buffer, etc.)
 * NOTE: This is also exported later in this file for use in other modules.
 */
function isPlainObjectInternal(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  
  // Preserve special Firestore types
  if (value instanceof Date) return false;
  if (value instanceof Timestamp) return false;
  if (value instanceof FieldValue) return false;
  if (Buffer.isBuffer(value)) return false;
  if (value instanceof Uint8Array) return false;
  if (ArrayBuffer.isView(value)) return false;
  
  // Check for plain object prototype
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively sanitizes an object for Firestore by:
 * - Removing `undefined` values (they cause Firestore errors)
 * - Filtering `undefined` from arrays
 * - Preserving `null`, Dates, Timestamps, Buffers, and FieldValue
 * 
 * Does NOT mutate the input object - returns a new sanitized copy.
 * 
 * @param value - The value to sanitize
 * @returns A sanitized copy safe for Firestore writes
 */
export function sanitizeForFirestore<T>(value: T): T {
  // Primitives: return as-is (except undefined at root which shouldn't happen)
  if (value === undefined) {
    // At root level, return null (or caller should handle this)
    return null as unknown as T;
  }
  
  if (value === null) {
    return null as unknown as T;
  }
  
  // Preserve special types
  if (typeof value !== 'object') {
    return value;
  }
  
  // Date, Timestamp, FieldValue, Buffer - return as-is
  if (
    value instanceof Date ||
    value instanceof Timestamp ||
    value instanceof FieldValue ||
    Buffer.isBuffer(value) ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  
  // Arrays: filter undefined, recursively sanitize items
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  
  // Plain objects: recursively sanitize, omit undefined keys
  if (isPlainObjectInternal(value)) {
    const result: Record<string, unknown> = {};
    
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
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
 * Asserts that a payload contains no `undefined` values.
 * Throws an error with the path to the first `undefined` found.
 * 
 * Use in development/testing to catch issues early.
 * 
 * @param payload - The object to check
 * @param context - Optional context string for error messages
 * @throws Error if `undefined` is found
 */
export function assertNoUndefined(
  payload: unknown,
  context = 'payload'
): void {
  const undefinedPaths: string[] = [];
  
  function findUndefined(value: unknown, path: string): void {
    if (value === undefined) {
      undefinedPaths.push(path);
      return;
    }
    
    if (value === null || typeof value !== 'object') {
      return;
    }
    
    // Skip special types
    if (
      value instanceof Date ||
      value instanceof Timestamp ||
      value instanceof FieldValue ||
      Buffer.isBuffer(value) ||
      value instanceof Uint8Array
    ) {
      return;
    }
    
    if (Array.isArray(value)) {
      value.forEach((item, idx) => findUndefined(item, `${path}[${idx}]`));
      return;
    }
    
    if (isPlainObjectInternal(value)) {
      for (const [key, val] of Object.entries(value)) {
        findUndefined(val, `${path}.${key}`);
      }
    }
  }
  
  findUndefined(payload, context);
  
  if (undefinedPaths.length > 0) {
    throw new Error(
      `Firestore-Schreibfehler: undefined-Werte gefunden in: ${undefinedPaths.join(', ')}`
    );
  }
}

/**
 * Normalizes email-specific optional string fields.
 * Ensures bodyHtml, bodyText, snippet etc. are never undefined.
 * 
 * @param value - The string value (may be undefined)
 * @param fallback - Fallback value (default: empty string)
 * @returns The value or fallback
 */
export function normalizeEmailString(
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
 * Check if a value is a plain object (not Date, Array, Firestore types, etc.)
 * Exported for use in other modules.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  
  // Preserve special Firestore types
  if (value instanceof Date) return false;
  if (value instanceof Timestamp) return false;
  if (value instanceof FieldValue) return false;
  if (Buffer.isBuffer(value)) return false;
  if (value instanceof Uint8Array) return false;
  if (ArrayBuffer.isView(value)) return false;
  if (Array.isArray(value)) return false;
  
  // Check for plain object prototype
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Safe merge write to Firestore.
 * - Sanitizes payload to remove undefined values
 * - Uses set() with merge:true instead of update()
 * - Logs the operation for debugging
 * - Never throws on empty payload (just logs warning)
 * 
 * @param docRef - Firestore document reference
 * @param rawData - Raw data to write (may contain undefined)
 * @param logLabel - Label for logging
 * @returns Promise that resolves when write completes
 */
export async function safeMergeWrite(
  docRef: FirebaseFirestore.DocumentReference,
  rawData: unknown,
  logLabel: string
): Promise<boolean> {
  // Ensure we have a plain object
  if (!isPlainObject(rawData)) {
    console.warn(`[safeMergeWrite] ${logLabel}: payload is not a plain object, skipping`, {
      type: typeof rawData,
      isArray: Array.isArray(rawData),
    });
    return false;
  }

  // Sanitize the payload
  const data = sanitizeForFirestore(rawData) as Record<string, unknown>;

  // Check if we have anything to write
  const keys = Object.keys(data);
  if (keys.length === 0) {
    console.warn(`[safeMergeWrite] ${logLabel}: empty payload after sanitization, skipping`, {
      originalKeys: Object.keys(rawData as object),
    });
    return false;
  }

  try {
    await docRef.set(data, { merge: true });
    console.info(`[safeMergeWrite] ${logLabel}: wrote ${keys.length} keys`, {
      keys: keys.slice(0, 10), // Log first 10 keys
      path: docRef.path,
    });
    return true;
  } catch (error) {
    console.error(`[safeMergeWrite] ${logLabel}: write failed`, {
      error: String(error),
      path: docRef.path,
      keys,
    });
    throw error;
  }
}

/**
 * Safely serialize an error for Firestore storage.
 * Extracts message, name, code, and truncated stack.
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error === null || error === undefined) {
    return { message: 'Unknown error', name: 'Error' };
  }

  const err = error as Error & { code?: string };
  
  return sanitizeForFirestore({
    message: String(err.message || err).substring(0, 500),
    name: err.name || 'Error',
    code: err.code,
    stack: err.stack?.substring(0, 300),
    at: new Date().toISOString(),
  });
}

