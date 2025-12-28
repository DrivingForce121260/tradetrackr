/**
 * Tests for client-side sanitizeForFirestore utility
 * 
 * Run with: npx vitest run src/utils/sanitizeForFirestore.test.ts
 * Or: npm test -- --run sanitizeForFirestore
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeForFirestore,
  normalizeString,
  normalizeArray,
  isPlainObject,
  findUndefinedPaths,
  createIdempotencyKey,
  getSyncErrorMessage,
} from './sanitizeForFirestore';

describe('sanitizeForFirestore', () => {
  it('should remove undefined values from objects', () => {
    const input = {
      name: 'Test',
      bodyHtml: undefined,
      bodyText: 'Hello',
    };

    const result = sanitizeForFirestore(input);

    expect(result).toEqual({
      name: 'Test',
      bodyText: 'Hello',
    });
    expect('bodyHtml' in result).toBe(false);
  });

  it('should preserve null values', () => {
    const input = {
      name: 'Test',
      assignedTo: null,
    };

    const result = sanitizeForFirestore(input);

    expect(result).toEqual({
      name: 'Test',
      assignedTo: null,
    });
  });

  it('should filter undefined from arrays', () => {
    const input = {
      items: ['a', undefined, 'b', undefined, 'c'],
    };

    const result = sanitizeForFirestore(input);

    expect(result).toEqual({
      items: ['a', 'b', 'c'],
    });
  });

  it('should handle nested objects with undefined', () => {
    const input = {
      level1: {
        level2: {
          value: 'exists',
          missing: undefined,
        },
        alsoMissing: undefined,
      },
    };

    const result = sanitizeForFirestore(input);

    expect(result).toEqual({
      level1: {
        level2: {
          value: 'exists',
        },
      },
    });
  });

  it('should preserve primitive values', () => {
    expect(sanitizeForFirestore('string')).toBe('string');
    expect(sanitizeForFirestore(42)).toBe(42);
    expect(sanitizeForFirestore(true)).toBe(true);
    expect(sanitizeForFirestore(null)).toBe(null);
  });

  it('should convert NaN to null', () => {
    expect(sanitizeForFirestore(NaN)).toBe(null);
  });

  it('should convert Infinity to null', () => {
    expect(sanitizeForFirestore(Infinity)).toBe(null);
    expect(sanitizeForFirestore(-Infinity)).toBe(null);
  });

  it('should handle empty objects', () => {
    expect(sanitizeForFirestore({})).toEqual({});
  });

  it('should handle empty arrays', () => {
    expect(sanitizeForFirestore([])).toEqual([]);
  });

  it('should handle arrays of objects', () => {
    const input = {
      items: [
        { name: 'Item1', value: undefined },
        { name: 'Item2', value: 'exists' },
      ],
    };

    const result = sanitizeForFirestore(input);

    expect(result).toEqual({
      items: [
        { name: 'Item1' },
        { name: 'Item2', value: 'exists' },
      ],
    });
  });

  it('should remove functions from objects', () => {
    const input = {
      name: 'Test',
      callback: () => console.log('test'),
    };

    const result = sanitizeForFirestore(input);

    expect(result).toEqual({
      name: 'Test',
    });
    expect('callback' in result).toBe(false);
  });

  it('should preserve Date objects', () => {
    const date = new Date('2025-01-01');
    const input = { createdAt: date };

    const result = sanitizeForFirestore(input);

    expect(result.createdAt).toBe(date);
  });
});

describe('isPlainObject', () => {
  it('should return true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ key: 'value' })).toBe(true);
  });

  it('should return false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
  });

  it('should return false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });

  it('should return false for Date', () => {
    expect(isPlainObject(new Date())).toBe(false);
  });
});

describe('findUndefinedPaths', () => {
  it('should find top-level undefined', () => {
    const paths = findUndefinedPaths({ name: 'test', missing: undefined });
    expect(paths).toContain('missing');
  });

  it('should find nested undefined', () => {
    const paths = findUndefinedPaths({
      level1: { level2: { missing: undefined } },
    });
    expect(paths).toContain('level1.level2.missing');
  });

  it('should find undefined in arrays', () => {
    const paths = findUndefinedPaths({
      items: ['a', undefined, 'b'],
    });
    expect(paths).toContain('items[1]');
  });

  it('should return empty array for clean objects', () => {
    const paths = findUndefinedPaths({
      name: 'test',
      value: null,
      items: ['a', 'b'],
    });
    expect(paths).toEqual([]);
  });
});

describe('normalizeString', () => {
  it('should return the value if defined', () => {
    expect(normalizeString('Hello')).toBe('Hello');
  });

  it('should return empty string for undefined', () => {
    expect(normalizeString(undefined)).toBe('');
  });

  it('should return empty string for null', () => {
    expect(normalizeString(null)).toBe('');
  });

  it('should use custom fallback', () => {
    expect(normalizeString(undefined, '(no content)')).toBe('(no content)');
  });
});

describe('normalizeArray', () => {
  it('should return the array if defined', () => {
    expect(normalizeArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('should return empty array for undefined', () => {
    expect(normalizeArray(undefined)).toEqual([]);
  });

  it('should return empty array for null', () => {
    expect(normalizeArray(null)).toEqual([]);
  });
});

describe('createIdempotencyKey', () => {
  it('should create correct format', () => {
    const key = createIdempotencyKey('email123', 1);
    expect(key).toBe('email123:v1');
  });

  it('should handle different versions', () => {
    const key = createIdempotencyKey('email123', 5);
    expect(key).toBe('email123:v5');
  });
});

describe('getSyncErrorMessage', () => {
  it('should return German message for unauthenticated', () => {
    const msg = getSyncErrorMessage({ code: 'functions/unauthenticated' });
    expect(msg).toContain('nicht angemeldet');
  });

  it('should return German message for permission-denied', () => {
    const msg = getSyncErrorMessage({ code: 'functions/permission-denied' });
    expect(msg).toContain('verweigert');
  });

  it('should return German message for not-found', () => {
    const msg = getSyncErrorMessage({ code: 'functions/not-found' });
    expect(msg).toContain('nicht gefunden');
  });

  it('should return German message for quota errors', () => {
    const msg = getSyncErrorMessage({ code: 'resource-exhausted', message: 'quota exceeded' });
    expect(msg).toContain('Kontingent');
  });

  it('should return German message for timeout', () => {
    const msg = getSyncErrorMessage({ code: 'deadline-exceeded' });
    expect(msg).toContain('Zeitüberschreitung');
  });

  it('should return default German message for unknown errors', () => {
    const msg = getSyncErrorMessage({ code: 'unknown' });
    expect(msg).toContain('fehlgeschlagen');
  });
});

describe('Integration: Real email payload', () => {
  it('should handle email structure with missing bodyHtml', () => {
    const rawEmailPayload = {
      orgId: 'org123',
      accountId: 'acc456',
      provider: 'imap',
      providerMessageId: 'msg789',
      threadId: undefined,
      from: 'sender@example.com',
      to: ['recipient@example.com'],
      cc: undefined,
      subject: 'Test Subject',
      bodyText: 'Plain text content',
      bodyHtml: undefined,
      receivedAt: new Date(),
      hasAttachments: false,
      processed: false,
    };

    const sanitized = sanitizeForFirestore(rawEmailPayload);

    expect('bodyHtml' in sanitized).toBe(false);
    expect('threadId' in sanitized).toBe(false);
    expect('cc' in sanitized).toBe(false);
    expect(sanitized.orgId).toBe('org123');
    expect(sanitized.bodyText).toBe('Plain text content');
    expect(sanitized.from).toBe('sender@example.com');
  });

  it('should handle procurement offer payload', () => {
    const offerPayload = {
      concernId: 'concern123',
      ownerUid: 'user456',
      source: 'email_ai',
      status: 'neu',
      supplierEmail: 'supplier@example.com',
      supplierName: undefined, // Missing
      aiSummary: ['Item 1', undefined, 'Item 2'], // With undefined
      aiConfidence: 0.85,
      extractedData: {
        requestNumber: 'REQ-001',
        orderNumber: undefined, // Missing
      },
      attachmentRefs: undefined, // Missing
    };

    const sanitized = sanitizeForFirestore(offerPayload);

    expect('supplierName' in sanitized).toBe(false);
    expect('attachmentRefs' in sanitized).toBe(false);
    expect(sanitized.aiSummary).toEqual(['Item 1', 'Item 2']);
    expect('orderNumber' in (sanitized.extractedData as any)).toBe(false);
    expect((sanitized.extractedData as any).requestNumber).toBe('REQ-001');
  });
});



