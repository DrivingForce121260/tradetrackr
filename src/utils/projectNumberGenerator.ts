/**
 * Project Number Generator - PN-{Y}{H1}{H2}{H3}{NN} Format
 * 
 * Format: PN-{Y}{H1}{H2}{H3}{NN}
 * - Y: Year in hex (0=2026, 1=2027, ..., F=2041)
 * - H1: Month in hex (1..C for Jan..Dec)
 * - H2: Day of month wrapped to 0..F (see dayHexWrapped)
 * - H3: Half of month (0 for days 1-15, 1 for days 16-31)
 * - NN: Daily counter (00-99)
 * 
 * Example: PN-0AA000 = 2026, October 10th, first project of the day
 */

const YEAR_BASE = 2025; // Year 0 in hex = 2025

/**
 * Convert number to uppercase hex digit
 */
export function toHexDigit(n: number): string {
  if (n < 0 || n > 15) {
    throw new Error(`Number must be 0-15 for hex digit, got ${n}`);
  }
  return n.toString(16).toUpperCase();
}

/**
 * Convert month (1-12) to hex digit (1-C)
 */
export function monthHex(month1to12: number): string {
  if (month1to12 < 1 || month1to12 > 12) {
    throw new Error(`Month must be 1-12, got ${month1to12}`);
  }
  return toHexDigit(month1to12);
}

/**
 * Convert day of month (1-31) to hex digit with wrapping
 * Days 1-15 map directly to hex 1-F
 * Days 16-31 wrap: 16→0, 17→1, 18→2, ..., 31→F
 */
export function dayHexWrapped(day1to31: number): string {
  if (day1to31 < 1 || day1to31 > 31) {
    throw new Error(`Day must be 1-31, got ${day1to31}`);
  }
  if (day1to31 <= 15) {
    // Days 1-15 map directly to hex 1-F
    return toHexDigit(day1to31);
  } else {
    // Days 16-31 wrap to 0-15: 16→0, 17→1, ..., 31→F
    const wrapped = day1to31 - 16; // 0-15
    return toHexDigit(wrapped);
  }
}

/**
 * Determine half of month digit (0 for days 1-15, 1 for days 16-31)
 */
export function halfOfMonthDigit(day: number): '0' | '1' {
  if (day < 1 || day > 31) {
    throw new Error(`Day must be 1-31, got ${day}`);
  }
  return day <= 15 ? '0' : '1';
}

/**
 * Convert year to hex digit (0=2026, 1=2027, ..., F=2041)
 */
export function yearHex(year: number): string {
  const offset = year - YEAR_BASE;
  if (offset < 0 || offset > 15) {
    throw new Error(`Year must be ${YEAR_BASE}-${YEAR_BASE + 15}, got ${year}`);
  }
  return toHexDigit(offset);
}

/**
 * Generate the date key (YH1H2H3) for a given date
 * Includes year hex digit for uniqueness across years
 */
export function generateDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate(); // 1-31
  
  const y = yearHex(year);
  const h1 = monthHex(month);
  const h2 = dayHexWrapped(day);
  const h3 = halfOfMonthDigit(day);
  
  return `${y}${h1}${h2}${h3}`;
}

/**
 * Format counter as two-digit decimal string (00-99)
 */
export function formatCounter(counter: number): string {
  if (counter < 0 || counter > 99) {
    throw new Error(`Counter must be 0-99, got ${counter}`);
  }
  return counter.toString().padStart(2, '0');
}

/**
 * Build complete project number: PN-{dateKey}{counter}
 */
export function buildProjectNumber(dateKey: string, counter: number): string {
  const counterStr = formatCounter(counter);
  return `PN-${dateKey}${counterStr}`;
}

/**
 * Parse a project number to extract dateKey and counter
 * Returns null if format is invalid
 * 
 * Supports both old format (PN-{H1H2H3}{NN}) and new format (PN-{YH1H2H3}{NN})
 */
export function parseProjectNumber(projectNumber: string): { dateKey: string; counter: number } | null {
  // New format: PN-{Y}{H1}{H2}{H3}{NN} = 4 hex digits + 2 decimal
  const newMatch = projectNumber.match(/^PN-([0-9A-F]{4})(\d{2})$/);
  if (newMatch) {
    return {
      dateKey: newMatch[1],
      counter: parseInt(newMatch[2], 10),
    };
  }
  
  // Legacy format: PN-{H1}{H2}{H3}{NN} = 3 hex digits + 2 decimal
  const legacyMatch = projectNumber.match(/^PN-([0-9A-F]{3})(\d{2})$/);
  if (legacyMatch) {
    return {
      dateKey: legacyMatch[1],
      counter: parseInt(legacyMatch[2], 10),
    };
  }
  
  return null;
}

/**
 * Get current date in Europe/Berlin timezone
 * This is the default timezone for project number generation
 */
export function getCurrentDateBerlin(): Date {
  // Use Intl API to get date in Berlin timezone
  const berlinDate = new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' });
  return new Date(berlinDate);
}

// ============================================================================
// LEGACY FUNCTIONS (Keep for backward compatibility)
// ============================================================================

/**
 * Generates a 3-letter abbreviation from a project name
 * Takes the first letter of each word, or first 3 consonants/vowels if less than 3 words
 */
export function generateProjectAbbreviation(projectName: string): string {
  if (!projectName || projectName.trim().length === 0) {
    return 'PRJ'; // Default abbreviation
  }

  // Remove special characters and split into words
  const words = projectName
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .split(/\s+/)
    .filter(word => word.length > 0);

  // If we have 3 or more words, take first letter of first 3 words
  if (words.length >= 3) {
    return words
      .slice(0, 3)
      .map(word => word[0].toUpperCase())
      .join('');
  }

  // If we have 2 words, take first letter of each
  if (words.length === 2) {
    const first = words[0][0].toUpperCase();
    const second = words[1][0].toUpperCase();
    // Take first consonant or vowel from second word if needed
    const third = words[1].length > 1 ? words[1][1].toUpperCase() : words[0].length > 1 ? words[0][1].toUpperCase() : 'X';
    return first + second + third;
  }

  // If we have 1 word, take first 3 letters (prioritize consonants)
  if (words.length === 1) {
    const word = words[0].toUpperCase();
    if (word.length >= 3) {
      return word.substring(0, 3);
    }
    // Pad with 'X' if less than 3 characters
    return word.padEnd(3, 'X');
  }

  return 'PRJ'; // Fallback
}

/**
 * Generates project number for internal projects
 * Format: concernID + 3-letter abbreviation
 * Example: DE689E0F2D-ADM
 */
export function generateInternalProjectNumber(
  concernID: string,
  projectName: string
): string {
  const abbreviation = generateProjectAbbreviation(projectName);
  return `${concernID}-${abbreviation}`;
}

/**
 * Generates project number for external projects (LEGACY)
 * Format: PRJ-YYYYMMDD-HHMMSS (timestamp-based)
 * 
 * @deprecated Use allocateProjectNumber Cloud Function instead for new projects
 */
export function generateExternalProjectNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `PRJ-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Checks if a project number is auto-generated (for external projects)
 */
export function isAutoGeneratedProjectNumber(projectNumber: string): boolean {
  // New format with year: PN-{Y}{H1}{H2}{H3}{NN} (4 hex + 2 decimal)
  if (projectNumber.match(/^PN-[0-9A-F]{4}\d{2}$/)) {
    return true;
  }
  // Old format without year: PN-{H1}{H2}{H3}{NN} (3 hex + 2 decimal)
  if (projectNumber.match(/^PN-[0-9A-F]{3}\d{2}$/)) {
    return true;
  }
  // Legacy format: PRJ-YYYYMMDD-HHMMSS
  return projectNumber.startsWith('PRJ-') && projectNumber.length === 20;
}
