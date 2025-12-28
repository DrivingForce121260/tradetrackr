/**
 * Money Utility Functions
 * 
 * Handles safe conversion between cents (integer) and euros (display).
 * All storage should use cents to avoid floating-point issues.
 * 
 * German Formatting:
 * - Decimal separator: comma (,)
 * - Thousands separator: dot (.) - only for display, not CSV
 * - Currency symbol: € (after amount)
 */

/**
 * Convert cents (integer) to euros (number).
 * @param cents - Amount in cents
 * @returns Amount in euros
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Convert euros (number) to cents (integer).
 * Rounds to nearest cent.
 * @param euros - Amount in euros
 * @returns Amount in cents (integer)
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Format cents as German currency string with thousands separator.
 * e.g. 123456 cents -> "1.234,56 €"
 * 
 * @param cents - Amount in cents
 * @param showCurrency - Whether to show € symbol (default true)
 * @returns Formatted string for display
 */
export function formatCentsDE(cents: number, showCurrency: boolean = true): string {
  const euros = centsToEuros(cents);
  const formatted = euros.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showCurrency ? `${formatted} €` : formatted;
}

/**
 * Format euros as German currency string with thousands separator.
 * e.g. 1234.56 -> "1.234,56 €"
 * 
 * @param euros - Amount in euros
 * @param showCurrency - Whether to show € symbol (default true)
 * @returns Formatted string for display
 */
export function formatEurosDE(euros: number, showCurrency: boolean = true): string {
  const formatted = euros.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showCurrency ? `${formatted} €` : formatted;
}

/**
 * Format euros for CSV export (dot decimal, no thousands separator).
 * This is the INTERNATIONAL format used by some systems.
 * 
 * @param euros - Amount in euros
 * @returns Formatted string (e.g. "1234.56")
 */
export function formatEurosForCsv(euros: number): string {
  // Handle edge cases
  if (!Number.isFinite(euros)) {
    return '0.00';
  }
  return euros.toFixed(2);
}

/**
 * Format cents for CSV export (converts to euros with dot decimal).
 * This is the INTERNATIONAL format used by some systems.
 * 
 * @param cents - Amount in cents
 * @returns Formatted string (e.g. "1234.56")
 */
export function formatCentsForCsv(cents: number): string {
  return formatEurosForCsv(centsToEuros(cents));
}

/**
 * Format euros for GERMAN CSV export (comma decimal, no thousands separator).
 * DATEV and German Excel require comma as decimal separator.
 * 
 * @param euros - Amount in euros
 * @returns Formatted string (e.g. "1234,56")
 */
export function formatEurosForGermanCsv(euros: number): string {
  // Handle edge cases
  if (!Number.isFinite(euros)) {
    return '0,00';
  }
  // Format with 2 decimals, then replace dot with comma
  return euros.toFixed(2).replace('.', ',');
}

/**
 * Format cents for GERMAN CSV export (comma decimal, no thousands separator).
 * DATEV and German Excel require comma as decimal separator.
 * 
 * @param cents - Amount in cents
 * @returns Formatted string (e.g. "1234,56")
 */
export function formatCentsForGermanCsv(cents: number): string {
  return formatEurosForGermanCsv(centsToEuros(cents));
}

/**
 * Format a number for German CSV with configurable precision.
 * Supports negative values (e.g., "-123,45").
 * 
 * @param value - Number to format (can be negative)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with comma decimal
 */
export function formatNumberGermanCsv(value: number, decimals: number = 2): string {
  // Handle edge cases
  if (!Number.isFinite(value)) {
    return '0' + ',' + '0'.repeat(decimals);
  }
  
  // toFixed handles negative numbers correctly
  return value.toFixed(decimals).replace('.', ',');
}

/**
 * Parse a German-formatted amount string to euros.
 * Handles both comma and dot as decimal separators.
 * 
 * @param str - Input string (e.g. "1.234,56" or "1234.56" or "1234,56")
 * @returns Amount in euros, or NaN if invalid
 */
export function parseGermanAmount(str: string): number {
  if (!str || typeof str !== 'string') return NaN;
  
  // Remove currency symbol and whitespace
  let cleaned = str.replace(/[€\s]/g, '').trim();
  
  // Detect German format (comma as decimal separator)
  // German: "1.234,56" or "1234,56"
  // International: "1,234.56" or "1234.56"
  
  const commaPos = cleaned.lastIndexOf(',');
  const dotPos = cleaned.lastIndexOf('.');
  
  if (commaPos > dotPos) {
    // German format: comma is the decimal separator
    // Remove dots (thousands separators), replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (dotPos > commaPos && commaPos !== -1) {
    // International format: dot is decimal, comma is thousands
    cleaned = cleaned.replace(/,/g, '');
  }
  // If only dot or neither, assume dot decimal (or integer)
  
  return parseFloat(cleaned);
}

/**
 * Safely convert amount to cents, handling various input formats.
 * Useful for normalizing user input before storage.
 * 
 * @param value - Input value (number in euros, or string)
 * @returns Amount in cents (integer), or 0 if invalid
 */
export function toSafeCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  
  let euros: number;
  if (typeof value === 'string') {
    euros = parseGermanAmount(value);
  } else {
    euros = value;
  }
  
  if (!Number.isFinite(euros)) return 0;
  
  return eurosToCents(euros);
}

