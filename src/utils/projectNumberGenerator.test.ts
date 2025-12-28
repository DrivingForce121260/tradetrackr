/**
 * Unit Tests for Project Number Generator
 * Testing date encoding logic with year support
 * 
 * Format: PN-{Y}{H1}{H2}{H3}{NN}
 * - Y: Year hex (0=2026, 1=2027, ..., F=2041)
 * - H1: Month hex (1-C)
 * - H2: Day hex wrapped
 * - H3: Half of month (0 or 1)
 * - NN: Counter (00-99)
 */

import { describe, it, expect } from 'vitest';
import {
  toHexDigit,
  monthHex,
  dayHexWrapped,
  halfOfMonthDigit,
  yearHex,
  generateDateKey,
  formatCounter,
  buildProjectNumber,
  parseProjectNumber,
} from './projectNumberGenerator';

describe('projectNumberGenerator', () => {
  describe('toHexDigit', () => {
    it('should convert 0-15 to hex digits', () => {
      expect(toHexDigit(0)).toBe('0');
      expect(toHexDigit(9)).toBe('9');
      expect(toHexDigit(10)).toBe('A');
      expect(toHexDigit(15)).toBe('F');
    });

    it('should throw for invalid input', () => {
      expect(() => toHexDigit(-1)).toThrow();
      expect(() => toHexDigit(16)).toThrow();
    });
  });

  describe('monthHex', () => {
    it('should convert month 1-12 to hex', () => {
      expect(monthHex(1)).toBe('1');  // January
      expect(monthHex(9)).toBe('9');  // September
      expect(monthHex(10)).toBe('A'); // October
      expect(monthHex(11)).toBe('B'); // November
      expect(monthHex(12)).toBe('C'); // December
    });

    it('should throw for invalid month', () => {
      expect(() => monthHex(0)).toThrow();
      expect(() => monthHex(13)).toThrow();
    });
  });

  describe('dayHexWrapped', () => {
    it('should handle days 1-15 directly', () => {
      expect(dayHexWrapped(1)).toBe('1');
      expect(dayHexWrapped(10)).toBe('A');
      expect(dayHexWrapped(15)).toBe('F');
    });

    it('should wrap day 16 to 0', () => {
      // Day 16 wraps to 0 (second half of month)
      expect(dayHexWrapped(16)).toBe('0');
    });

    it('should wrap days 17-31', () => {
      expect(dayHexWrapped(17)).toBe('1'); // 17 wraps to 1
      expect(dayHexWrapped(18)).toBe('2'); // 18 wraps to 2
      expect(dayHexWrapped(25)).toBe('9'); // 25 wraps to 9
      expect(dayHexWrapped(26)).toBe('A'); // 26 wraps to 10 (A in hex)
      expect(dayHexWrapped(31)).toBe('F'); // 31 wraps to 15 (F in hex)
    });

    it('should throw for invalid day', () => {
      expect(() => dayHexWrapped(0)).toThrow();
      expect(() => dayHexWrapped(32)).toThrow();
    });
  });

  describe('halfOfMonthDigit', () => {
    it('should return 0 for days 1-15', () => {
      expect(halfOfMonthDigit(1)).toBe('0');
      expect(halfOfMonthDigit(10)).toBe('0');
      expect(halfOfMonthDigit(15)).toBe('0');
    });

    it('should return 1 for days 16-31', () => {
      expect(halfOfMonthDigit(16)).toBe('1');
      expect(halfOfMonthDigit(20)).toBe('1');
      expect(halfOfMonthDigit(31)).toBe('1');
    });
  });

  describe('yearHex', () => {
    it('should convert year 2025-2040 to hex 0-F', () => {
      expect(yearHex(2025)).toBe('0'); // Year base
      expect(yearHex(2026)).toBe('1');
      expect(yearHex(2030)).toBe('5');
      expect(yearHex(2035)).toBe('A');
      expect(yearHex(2040)).toBe('F'); // Max year
    });

    it('should throw for year before 2025', () => {
      expect(() => yearHex(2024)).toThrow();
      expect(() => yearHex(2020)).toThrow();
    });

    it('should throw for year after 2040', () => {
      expect(() => yearHex(2041)).toThrow();
      expect(() => yearHex(2050)).toThrow();
    });
  });

  describe('generateDateKey', () => {
    it('should generate correct date key for 2025 October 10', () => {
      // Year 2025 = 0, October 10 = Month 10 (A), Day 10 (A), First half (0)
      const date = new Date(2025, 9, 10); // Month is 0-indexed
      expect(generateDateKey(date)).toBe('0AA0');
    });

    it('should generate correct date key for 2025 October 16', () => {
      // Year 2025 = 0, October 16 = Month 10 (A), Day 16 wraps to 0, Second half (1)
      const date = new Date(2025, 9, 16);
      expect(generateDateKey(date)).toBe('0A01');
    });

    it('should generate correct date key for day 17', () => {
      // Year 2025 = 0, Day 17 wraps to 1
      // October 17 = Month 10 (A), Day 1 (1), Second half (1)
      const date = new Date(2025, 9, 17);
      expect(generateDateKey(date)).toBe('0A11');
    });

    it('should generate correct date key for day 31', () => {
      // Year 2025 = 0, Day 31 wraps to 15 (F)
      // October 31 = Month 10 (A), Day 15 (F), Second half (1)
      const date = new Date(2025, 9, 31);
      expect(generateDateKey(date)).toBe('0AF1');
    });

    it('should handle January 1, 2025', () => {
      // Year 2025 = 0, January 1 = Month 1 (1), Day 1 (1), First half (0)
      const date = new Date(2025, 0, 1);
      expect(generateDateKey(date)).toBe('0110');
    });

    it('should handle December 31, 2025', () => {
      // Year 2025 = 0, December 31 = Month 12 (C), Day 31 wraps to 15 (F), Second half (1)
      const date = new Date(2025, 11, 31);
      expect(generateDateKey(date)).toBe('0CF1');
    });

    it('should handle year 2030', () => {
      // Year 2030 = 5, March 15 = Month 3, Day 15 (F), First half (0)
      const date = new Date(2030, 2, 15);
      expect(generateDateKey(date)).toBe('53F0');
    });

    it('should handle year 2040 (max)', () => {
      // Year 2040 = F, June 20 = Month 6, Day 20 wraps to 4, Second half (1)
      const date = new Date(2040, 5, 20);
      expect(generateDateKey(date)).toBe('F641');
    });
  });

  describe('formatCounter', () => {
    it('should format counter with leading zero', () => {
      expect(formatCounter(0)).toBe('00');
      expect(formatCounter(9)).toBe('09');
      expect(formatCounter(10)).toBe('10');
      expect(formatCounter(99)).toBe('99');
    });

    it('should throw for invalid counter', () => {
      expect(() => formatCounter(-1)).toThrow();
      expect(() => formatCounter(100)).toThrow();
    });
  });

  describe('buildProjectNumber', () => {
    it('should build complete project number with year', () => {
      expect(buildProjectNumber('0AA0', 0)).toBe('PN-0AA000');
      expect(buildProjectNumber('0AA0', 1)).toBe('PN-0AA001');
      expect(buildProjectNumber('0AA0', 99)).toBe('PN-0AA099');
      expect(buildProjectNumber('0CF1', 42)).toBe('PN-0CF142');
      expect(buildProjectNumber('F641', 7)).toBe('PN-F64107');
    });
  });

  describe('parseProjectNumber', () => {
    it('should parse valid project numbers (new format with year)', () => {
      expect(parseProjectNumber('PN-0AA000')).toEqual({ dateKey: '0AA0', counter: 0 });
      expect(parseProjectNumber('PN-0AA099')).toEqual({ dateKey: '0AA0', counter: 99 });
      expect(parseProjectNumber('PN-0CF142')).toEqual({ dateKey: '0CF1', counter: 42 });
      expect(parseProjectNumber('PN-F64107')).toEqual({ dateKey: 'F641', counter: 7 });
    });

    it('should parse legacy project numbers (without year)', () => {
      expect(parseProjectNumber('PN-AA000')).toEqual({ dateKey: 'AA0', counter: 0 });
      expect(parseProjectNumber('PN-CF142')).toEqual({ dateKey: 'CF1', counter: 42 });
    });

    it('should return null for invalid format', () => {
      expect(parseProjectNumber('INVALID')).toBeNull();
      expect(parseProjectNumber('PN-AA')).toBeNull();
      expect(parseProjectNumber('PN-0AA0100')).toBeNull(); // Counter > 99
    });
  });

  describe('Real-world date examples', () => {
    it('should handle the example from spec: 2025 October 10 -> 0AA0xx', () => {
      const date = new Date(2025, 9, 10);
      const dateKey = generateDateKey(date);
      const projectNumber = buildProjectNumber(dateKey, 5);
      expect(dateKey).toBe('0AA0');
      expect(projectNumber).toBe('PN-0AA005');
    });

    it('should handle multiple projects on same day', () => {
      const date = new Date(2025, 9, 10);
      const dateKey = generateDateKey(date);
      
      expect(buildProjectNumber(dateKey, 0)).toBe('PN-0AA000');
      expect(buildProjectNumber(dateKey, 1)).toBe('PN-0AA001');
      expect(buildProjectNumber(dateKey, 50)).toBe('PN-0AA050');
      expect(buildProjectNumber(dateKey, 99)).toBe('PN-0AA099');
    });

    it('should handle projects across different years', () => {
      const date2026 = new Date(2026, 5, 15);
      const date2035 = new Date(2035, 11, 25);
      
      expect(generateDateKey(date2026)).toBe('16F0'); // Year 1, June, Day 15
      expect(generateDateKey(date2035)).toBe('AC91'); // Year A (10), December, Day 25 (wraps to 9)
    });
  });
});



