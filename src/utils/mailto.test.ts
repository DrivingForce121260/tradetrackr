/**
 * Unit Tests for mailto utility
 */

import { describe, it, expect } from 'vitest';
import { buildMailtoUrl, MAX_MAILTO_BODY_LEN, LONG_BODY_PLACEHOLDER } from './mailto';

describe('buildMailtoUrl', () => {
  describe('basic functionality', () => {
    it('should build a simple mailto URL', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test body',
      });

      expect(result.url).toContain('mailto:test%40example.com');
      expect(result.url).toContain('subject=Re%3A%20Test%20Subject');
      expect(result.url).toContain('body=Test%20body');
      expect(result.bodyTruncated).toBe(false);
    });

    it('should handle multiple recipients', () => {
      const result = buildMailtoUrl({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test',
        body: 'Body',
      });

      expect(result.url).toContain('mailto:test1%40example.com%2Ctest2%40example.com');
    });

    it('should handle CC and BCC', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Body',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
      });

      expect(result.url).toContain('cc=cc%40example.com');
      expect(result.url).toContain('bcc=bcc1%40example.com%2Cbcc2%40example.com');
    });
  });

  describe('Re: prefix handling', () => {
    it('should add Re: prefix if not present', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Body',
      });

      expect(result.url).toContain('subject=Re%3A%20Test%20Subject');
    });

    it('should not add Re: prefix if already present (case insensitive)', () => {
      const tests = [
        'Re: Test',
        'RE: Test',
        're: Test',
        'AW: Test', // German
      ];

      tests.forEach(subject => {
        const result = buildMailtoUrl({
          to: 'test@example.com',
          subject,
          body: 'Body',
        });

        // Should not double-prefix
        expect(result.url).not.toContain('Re%3A%20Re%3A');
        expect(result.url).not.toContain('Re%3A%20RE%3A');
        expect(result.url).not.toContain('Re%3A%20AW%3A');
      });
    });
  });

  describe('encoding', () => {
    it('should encode German umlauts correctly', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Äöü ÄÖÜ ß',
        body: 'Grüße aus München',
      });

      expect(result.url).toContain('%C3%84%C3%B6%C3%BC'); // Äöü
      expect(result.url).toContain('Gr%C3%BC%C3%9Fe'); // Grüße
    });

    it('should encode emoji correctly', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test 🎉',
        body: 'Hello 👋 World 🌍',
      });

      expect(result.url).toContain('%F0%9F%8E%89'); // 🎉
      expect(result.url).toContain('%F0%9F%91%8B'); // 👋
    });

    it('should handle special characters', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test & Test',
        body: 'Price: $100 & €50',
      });

      expect(result.url).toContain('%26'); // &
      expect(result.url).toContain('%24'); // $
      expect(result.url).toContain('%E2%82%AC'); // €
    });
  });

  describe('newline normalization', () => {
    it('should normalize LF to CRLF', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Line 1\nLine 2\nLine 3',
      });

      expect(result.fullBody).toContain('\r\n');
      expect(result.fullBody).not.toMatch(/(?<!\r)\n/); // No LF without CR
    });

    it('should normalize CR to CRLF', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Line 1\rLine 2\rLine 3',
      });

      expect(result.fullBody).toContain('\r\n');
    });

    it('should not double-convert existing CRLF', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Line 1\r\nLine 2\r\nLine 3',
      });

      expect(result.fullBody).toBe('Line 1\r\nLine 2\r\nLine 3');
    });
  });

  describe('length handling', () => {
    it('should not truncate short bodies', () => {
      const shortBody = 'This is a short body';
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: shortBody,
      });

      expect(result.bodyTruncated).toBe(false);
      expect(result.url).toContain(encodeURIComponent(shortBody));
    });

    it('should truncate long bodies', () => {
      const longBody = 'a'.repeat(MAX_MAILTO_BODY_LEN + 100);
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: longBody,
      });

      expect(result.bodyTruncated).toBe(true);
      expect(result.fullBody).toBe(longBody);
      expect(result.url).toContain(encodeURIComponent(LONG_BODY_PLACEHOLDER));
      expect(result.url).not.toContain(encodeURIComponent(longBody));
    });

    it('should handle body exactly at limit', () => {
      const exactBody = 'a'.repeat(MAX_MAILTO_BODY_LEN);
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: exactBody,
      });

      expect(result.bodyTruncated).toBe(false);
    });

    it('should handle body one character over limit', () => {
      const overBody = 'a'.repeat(MAX_MAILTO_BODY_LEN + 1);
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: overBody,
      });

      expect(result.bodyTruncated).toBe(true);
    });
  });

  describe('sanitization', () => {
    it('should remove null bytes', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test\0Subject',
        body: 'Body\0with\0nulls',
      });

      expect(result.fullBody).not.toContain('\0');
      expect(result.url).not.toContain('%00');
    });

    it('should remove HTML tags', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: '<b>Bold</b> Subject',
        body: '<p>Paragraph</p><script>alert("xss")</script>',
      });

      expect(result.fullBody).not.toContain('<');
      expect(result.fullBody).not.toContain('>');
      expect(result.fullBody).toContain('Paragraph');
      expect(result.fullBody).not.toContain('script');
    });

    it('should trim whitespace', () => {
      const result = buildMailtoUrl({
        to: '  test@example.com  ',
        subject: '  Test Subject  ',
        body: '  Body text  ',
      });

      expect(result.fullBody).toBe('Body text');
    });
  });

  describe('validation', () => {
    it('should throw error if "to" is missing', () => {
      expect(() => {
        buildMailtoUrl({
          to: '',
          subject: 'Test',
          body: 'Body',
        });
      }).toThrow('mailto: "to" parameter is required');
    });

    it('should throw error if "to" is empty array', () => {
      expect(() => {
        buildMailtoUrl({
          to: [],
          subject: 'Test',
          body: 'Body',
        });
      }).toThrow('mailto: "to" parameter is required');
    });

    it('should throw error if subject is missing', () => {
      expect(() => {
        buildMailtoUrl({
          to: 'test@example.com',
          subject: '',
          body: 'Body',
        });
      }).toThrow('mailto: "subject" parameter is required');
    });

    it('should throw error if body is missing', () => {
      expect(() => {
        buildMailtoUrl({
          to: 'test@example.com',
          subject: 'Test',
          body: '',
        });
      }).toThrow('mailto: "body" parameter is required');
    });
  });

  describe('edge cases', () => {
    it('should handle empty CC and BCC', () => {
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Body',
        cc: '',
        bcc: [],
      });

      expect(result.url).not.toContain('cc=');
      expect(result.url).not.toContain('bcc=');
    });

    it('should handle whitespace-only recipients', () => {
      const result = buildMailtoUrl({
        to: ['test@example.com', '  ', 'test2@example.com'],
        subject: 'Test',
        body: 'Body',
      });

      expect(result.url).toContain('test%40example.com%2Ctest2%40example.com');
      expect(result.url).not.toContain('%2C%2C'); // No double commas
    });

    it('should handle very long subject', () => {
      const longSubject = 'a'.repeat(500);
      const result = buildMailtoUrl({
        to: 'test@example.com',
        subject: longSubject,
        body: 'Body',
      });

      expect(result.url).toContain('subject=Re%3A%20');
      expect(result.url.length).toBeGreaterThan(500);
    });
  });
});




