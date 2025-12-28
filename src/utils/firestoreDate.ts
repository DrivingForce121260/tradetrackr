/**
 * Utility for normalizing Firestore date fields to ISO strings.
 * 
 * Firestore can store dates as:
 * - Firestore Timestamp objects (with toDate() method)
 * - ISO date strings (from JSON serialization or manual writes)
 * - JavaScript Date objects
 * - null/undefined
 * 
 * This helper normalizes all formats to ISO strings for consistent handling.
 */

/**
 * Convert a value that might be a Firestore Timestamp, Date, or ISO string to an ISO string.
 * 
 * @param value - Value to convert (Timestamp, Date, string, or null/undefined)
 * @returns ISO date string or null if the value is not a valid date
 */
export function toISODateTime(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Already an ISO string
  if (typeof value === 'string') {
    return value;
  }
  
  // Firestore Timestamp (has toDate method)
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate().toISOString();
    } catch {
      return null;
    }
  }
  
  // JavaScript Date
  if (value instanceof Date) {
    try {
      return value.toISOString();
    } catch {
      return null;
    }
  }
  
  // Object with seconds/nanoseconds (Firestore Timestamp-like structure from JSON)
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    try {
      const seconds = (value as any).seconds;
      const nanoseconds = (value as any).nanoseconds || 0;
      const date = new Date(seconds * 1000 + nanoseconds / 1000000);
      return date.toISOString();
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Convert a date value to ISO date format (YYYY-MM-DD only, no time).
 * Supports:
 * - ISO strings (YYYY-MM-DD or full ISO datetime)
 * - Legacy "DD/MM/YYYY" or "D/M/YYYY" format
 * - Firestore Timestamp / JavaScript Date
 * 
 * @param value - Value to convert
 * @returns ISO date string (YYYY-MM-DD) or null
 */
export function toISODate(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Already ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS...)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    
    // Legacy format: DD/MM/YYYY or D/M/YYYY
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const paddedDay = day.padStart(2, '0');
      const paddedMonth = month.padStart(2, '0');
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
    
    // Try to parse as date string
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    
    return null;
  }
  
  // Firestore Timestamp (has toDate method)
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate().toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }
  
  // JavaScript Date
  if (value instanceof Date) {
    try {
      return value.toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }
  
  // Object with seconds/nanoseconds (Firestore Timestamp-like structure from JSON)
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    try {
      const seconds = (value as any).seconds;
      const nanoseconds = (value as any).nanoseconds || 0;
      const date = new Date(seconds * 1000 + nanoseconds / 1000000);
      return date.toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Compare two ISO date strings for sorting (descending order).
 * Handles null, undefined, empty strings, and invalid dates by placing them at the end.
 * 
 * @param a - First ISO date string (or null/empty)
 * @param b - Second ISO date string (or null/empty)
 * @returns Negative if a > b, positive if a < b, 0 if equal (for descending sort)
 */
export function compareISODatesDesc(a: string | null | undefined, b: string | null | undefined): number {
  // Normalize: treat empty strings and undefined as null
  const normalizedA = (a && a.trim()) || null;
  const normalizedB = (b && b.trim()) || null;
  
  if (normalizedA === null && normalizedB === null) return 0;
  if (normalizedA === null) return 1; // nulls/empty at end
  if (normalizedB === null) return -1;
  
  // Validate dates are comparable (avoid NaN issues)
  const isValidA = /^\d{4}-\d{2}-\d{2}/.test(normalizedA) || /^\d{4}/.test(normalizedA);
  const isValidB = /^\d{4}-\d{2}-\d{2}/.test(normalizedB) || /^\d{4}/.test(normalizedB);
  
  if (!isValidA && !isValidB) return 0;
  if (!isValidA) return 1; // invalid at end
  if (!isValidB) return -1;
  
  return normalizedB.localeCompare(normalizedA);
}

