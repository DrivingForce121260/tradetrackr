/**
 * CSV Utility Functions for DATEV Export
 * 
 * Handles safe CSV generation with proper escaping,
 * configurable delimiters, and German Excel compatibility.
 * 
 * German Excel Requirements:
 * - Delimiter: ';' (semicolon)
 * - Decimal separator: ',' (comma)
 * - Line ending: CRLF (\r\n)
 * - Encoding: UTF-8 with BOM
 * - Quoting: Fields with delimiter, quotes, or newlines
 */

export interface CsvOptions {
  delimiter?: string;      // Default: ';' (German Excel standard)
  lineEnding?: string;     // Default: '\r\n' (Windows CRLF)
  quoteAll?: boolean;      // Default: false (only quote when necessary)
  bom?: boolean;           // Default: true (add UTF-8 BOM for Excel)
  decimalComma?: boolean;  // Default: true (use comma as decimal separator for German)
}

const DEFAULT_OPTIONS: Required<CsvOptions> = {
  delimiter: ';',
  lineEnding: '\r\n',
  quoteAll: false,
  bom: true,
  decimalComma: true,
};

/**
 * Escape a single CSV field value.
 * Handles quotes, delimiters, and line breaks according to RFC 4180.
 * 
 * Rules:
 * - Fields containing delimiter, double-quotes, or newlines must be quoted
 * - Double-quotes within quoted fields must be escaped by doubling (" -> "")
 */
export function escapeCsvField(
  value: string | number | null | undefined, 
  delimiter: string, 
  quoteAll: boolean
): string {
  // Handle null/undefined -> empty string (never write undefined to CSV)
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // Check if quoting is needed:
  // - Contains delimiter
  // - Contains double-quote
  // - Contains newline (CR or LF)
  // - Or quoteAll is true
  const needsQuoting = quoteAll || 
    str.includes('"') || 
    str.includes(delimiter) || 
    str.includes('\n') || 
    str.includes('\r');
  
  if (!needsQuoting) {
    return str;
  }
  
  // Escape quotes by doubling them and wrap in quotes
  return '"' + str.replace(/"/g, '""') + '"';
}

/**
 * Format a number for German CSV (decimal comma, no thousands separator).
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns String with comma as decimal separator (e.g., "1234,56")
 */
export function formatNumberForGermanCsv(value: number, decimals: number = 2): string {
  // Handle edge cases
  if (!Number.isFinite(value)) {
    return '0' + ',' + '0'.repeat(decimals);
  }
  
  // Format with fixed decimals, then replace dot with comma
  const fixed = value.toFixed(decimals);
  return fixed.replace('.', ',');
}

/**
 * Format a number for CSV based on locale settings.
 * 
 * @param value - Number to format
 * @param useDecimalComma - Use comma as decimal separator (German style)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatNumberForCsv(
  value: number, 
  useDecimalComma: boolean = true, 
  decimals: number = 2
): string {
  if (useDecimalComma) {
    return formatNumberForGermanCsv(value, decimals);
  }
  return value.toFixed(decimals);
}

/**
 * Build a CSV string from an array of row objects.
 * 
 * @param rows - Array of objects with consistent keys
 * @param headers - Array of {key, label} for column order and headers
 * @param options - CSV formatting options
 * @returns CSV string ready for download
 */
export function buildCsv<T extends Record<string, any>>(
  rows: T[],
  headers: Array<{ key: keyof T; label: string }>,
  options: CsvOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { delimiter, lineEnding, quoteAll, bom } = opts;
  
  const lines: string[] = [];
  
  // Header row
  const headerLine = headers
    .map(h => escapeCsvField(h.label, delimiter, quoteAll))
    .join(delimiter);
  lines.push(headerLine);
  
  // Data rows
  for (const row of rows) {
    const rowLine = headers
      .map(h => escapeCsvField(row[h.key], delimiter, quoteAll))
      .join(delimiter);
    lines.push(rowLine);
  }
  
  // Join with CRLF for Windows/Excel compatibility
  let csv = lines.join(lineEnding) + lineEnding;
  
  // Add UTF-8 BOM for Excel compatibility
  // BOM allows Excel to recognize UTF-8 encoding automatically
  if (bom) {
    csv = '\uFEFF' + csv;
  }
  
  return csv;
}

/**
 * Build a simple CSV from 2D array (rows of string values).
 * Useful when you've already pre-formatted all values.
 */
export function buildSimpleCsv(
  headerRow: string[],
  dataRows: string[][],
  options: CsvOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { delimiter, lineEnding, quoteAll, bom } = opts;
  
  const lines: string[] = [];
  
  // Header row
  lines.push(headerRow.map(h => escapeCsvField(h, delimiter, quoteAll)).join(delimiter));
  
  // Data rows
  for (const row of dataRows) {
    lines.push(row.map(cell => escapeCsvField(cell, delimiter, quoteAll)).join(delimiter));
  }
  
  let csv = lines.join(lineEnding) + lineEnding;
  
  if (bom) {
    csv = '\uFEFF' + csv;
  }
  
  return csv;
}

/**
 * Build a CSV with automatic number formatting for German Excel.
 * 
 * This version automatically converts number fields to German format
 * (decimal comma, no thousands separator).
 * 
 * @param rows - Array of row objects
 * @param headers - Column definitions with optional number format config
 * @param options - CSV options
 */
export function buildGermanCsv<T extends Record<string, any>>(
  rows: T[],
  headers: Array<{ 
    key: keyof T; 
    label: string; 
    isNumber?: boolean; 
    decimals?: number;
  }>,
  options: CsvOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { delimiter, lineEnding, quoteAll, bom, decimalComma } = opts;
  
  const lines: string[] = [];
  
  // Header row
  const headerLine = headers
    .map(h => escapeCsvField(h.label, delimiter, quoteAll))
    .join(delimiter);
  lines.push(headerLine);
  
  // Data rows with automatic number formatting
  for (const row of rows) {
    const rowValues: string[] = [];
    
    for (const h of headers) {
      const value = row[h.key];
      
      // Format numbers appropriately
      if (h.isNumber && typeof value === 'number') {
        const formatted = formatNumberForCsv(value, decimalComma, h.decimals ?? 2);
        rowValues.push(escapeCsvField(formatted, delimiter, quoteAll));
      } else {
        // Convert null/undefined to empty string, otherwise use string value
        const strValue = value === null || value === undefined ? '' : String(value);
        rowValues.push(escapeCsvField(strValue, delimiter, quoteAll));
      }
    }
    
    lines.push(rowValues.join(delimiter));
  }
  
  let csv = lines.join(lineEnding) + lineEnding;
  
  if (bom) {
    csv = '\uFEFF' + csv;
  }
  
  return csv;
}

/**
 * Trigger a CSV file download in the browser.
 * Creates a Blob with proper encoding and triggers download.
 */
export function downloadCsv(csv: string, filename: string): void {
  // Use UTF-8 encoding (BOM should already be in the csv string if needed)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

