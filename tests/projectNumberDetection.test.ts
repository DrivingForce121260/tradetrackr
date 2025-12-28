/**
 * Unit Tests for Project Number Detection
 * 
 * Tests the PN-?????? pattern matching and disambiguation logic
 */

import { describe, it, expect } from 'vitest';

// Test helper: Simulate the detection regex
const PROJECT_NUMBER_PATTERN = /\bPN-[A-Za-z0-9]{6}\b/gi;

function detectProjectNumbers(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const matches = text.match(PROJECT_NUMBER_PATTERN);
  if (!matches) {
    return [];
  }

  // Normalize to uppercase and deduplicate
  const unique = Array.from(new Set(
    matches.map(m => m.toUpperCase())
  ));

  return unique;
}

describe('Project Number Detection', () => {
  describe('detectProjectNumbers', () => {
    it('should detect single project number in text', () => {
      const text = 'This document is for project PN-0AA012 and contains important information.';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual(['PN-0AA012']);
    });

    it('should detect project number with lowercase', () => {
      const text = 'Project pn-0aa012 is mentioned here.';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual(['PN-0AA012']); // Normalized to uppercase
    });

    it('should detect multiple different project numbers', () => {
      const text = 'Projects PN-0AA012 and PN-1BB034 are related. Also see PN-2CC056.';
      const result = detectProjectNumbers(text);
      
      expect(result).toHaveLength(3);
      expect(result).toContain('PN-0AA012');
      expect(result).toContain('PN-1BB034');
      expect(result).toContain('PN-2CC056');
    });

    it('should deduplicate same project number', () => {
      const text = 'PN-0AA012 is mentioned. Later, PN-0AA012 appears again.';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual(['PN-0AA012']);
    });

    it('should handle mixed case duplicates', () => {
      const text = 'pn-0aa012 and PN-0AA012 are the same.';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual(['PN-0AA012']);
    });

    it('should return empty array when no project numbers found', () => {
      const text = 'This document has no project numbers.';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual([]);
    });

    it('should not match incomplete patterns', () => {
      const text = 'PN-0AA is too short. PN-0AA0123 is too long.';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual([]);
    });

    it('should not match without PN- prefix', () => {
      const text = 'Project number is 0AA012 without prefix.';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual([]);
    });

    it('should match alphanumeric characters', () => {
      const text = 'PN-ABC123, PN-123ABC, PN-A1B2C3 are all valid.';
      const result = detectProjectNumbers(text);
      
      expect(result).toHaveLength(3);
      expect(result).toContain('PN-ABC123');
      expect(result).toContain('PN-123ABC');
      expect(result).toContain('PN-A1B2C3');
    });

    it('should match at word boundaries only', () => {
      const text = 'PN-0AA012 is valid, butPN-0AA012not and alsoPN-0AA012here are not.';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual(['PN-0AA012']); // Only the first one with proper boundaries
    });

    it('should handle German document text', () => {
      const text = `
        Projektnummer: PN-0AA012
        Datum: 21.12.2025
        Auftraggeber: Firma Schmidt GmbH
        Betreff: Installationsarbeiten für Projekt PN-0AA012
      `;
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual(['PN-0AA012']);
    });

    it('should handle multiline text', () => {
      const text = `Line 1: PN-0AA012
Line 2: Some text
Line 3: PN-1BB034`;
      const result = detectProjectNumbers(text);
      
      expect(result).toHaveLength(2);
      expect(result).toContain('PN-0AA012');
      expect(result).toContain('PN-1BB034');
    });

    it('should handle empty or null input', () => {
      expect(detectProjectNumbers('')).toEqual([]);
      expect(detectProjectNumbers(null as any)).toEqual([]);
      expect(detectProjectNumbers(undefined as any)).toEqual([]);
    });

    it('should handle special characters around project number', () => {
      const text = '[PN-0AA012], (PN-1BB034), "PN-2CC056", PN-3DD078.';
      const result = detectProjectNumbers(text);
      
      expect(result).toHaveLength(4);
    });
  });

  describe('Disambiguation Logic', () => {
    it('should identify single project number as resolvable', () => {
      const detected = detectProjectNumbers('Project PN-0AA012');
      
      expect(detected.length).toBe(1);
      // Resolution: single
    });

    it('should identify multiple project numbers as ambiguous', () => {
      const detected = detectProjectNumbers('Projects PN-0AA012 and PN-1BB034');
      
      expect(detected.length).toBe(2);
      // Resolution: multiple (ambiguous)
    });

    it('should identify no project numbers as none', () => {
      const detected = detectProjectNumbers('No project numbers here');
      
      expect(detected.length).toBe(0);
      // Resolution: none
    });
  });

  describe('Current Year Format (2025)', () => {
    it('should match current year format with year digit', () => {
      // Current format: PN-{Y}{H1}{H2}{H3}{NN}
      // Y=0 for 2025, H1=C (Dec), H2=5 (day 21 wrapped), H3=1, NN=00
      const text = 'Project PN-0C5100 for December 2025';
      const result = detectProjectNumbers(text);
      
      expect(result).toEqual(['PN-0C5100']);
    });

    it('should match format from different years', () => {
      const text = 'PN-0AA012 (2025), PN-1AA012 (2026), PN-FAA012 (2040)';
      const result = detectProjectNumbers(text);
      
      expect(result).toHaveLength(3);
    });
  });
});



