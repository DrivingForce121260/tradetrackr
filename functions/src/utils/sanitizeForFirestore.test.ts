/**
 * Tests for sanitizeForFirestore utility
 * 
 * Run with: npx ts-node src/utils/sanitizeForFirestore.test.ts
 * Or after build: node lib/utils/sanitizeForFirestore.test.js
 */

import { 
  sanitizeForFirestore, 
  assertNoUndefined, 
  normalizeEmailString, 
  normalizeArray 
} from './sanitizeForFirestore';

// Simple test harness
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    console.error(`❌ ${name}`);
    console.error(`   ${(error as Error).message}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toThrow(pattern?: RegExp) {
      if (typeof actual !== 'function') {
        throw new Error('Expected a function');
      }
      try {
        (actual as () => void)();
        throw new Error('Expected function to throw');
      } catch (e) {
        if (pattern && !pattern.test((e as Error).message)) {
          throw new Error(`Expected error to match ${pattern}, got: ${(e as Error).message}`);
        }
      }
    },
    not: {
      toThrow() {
        if (typeof actual !== 'function') {
          throw new Error('Expected a function');
        }
        try {
          (actual as () => void)();
        } catch (e) {
          throw new Error(`Expected function not to throw, but it threw: ${(e as Error).message}`);
        }
      }
    }
  };
}

console.log('\n🧪 Running sanitizeForFirestore tests...\n');

// ==========================================
// sanitizeForFirestore tests
// ==========================================

test('should remove undefined values from objects', () => {
  const input: Record<string, unknown> = {
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

test('should preserve null values', () => {
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

test('should filter undefined from arrays', () => {
  const input = {
    items: ['a', undefined, 'b', undefined, 'c'],
  };
  
  const result = sanitizeForFirestore(input);
  
  expect(result).toEqual({
    items: ['a', 'b', 'c'],
  });
});

test('should handle nested objects with undefined', () => {
  const input: Record<string, unknown> = {
    level1: {
      level2: {
        value: 'exists',
        missing: undefined,
      },
      alsoMissing: undefined,
    },
  };
  
  const result = sanitizeForFirestore(input) as Record<string, unknown>;
  
  expect(result).toEqual({
    level1: {
      level2: {
        value: 'exists',
      },
    },
  });
});

test('should preserve primitive values', () => {
  expect(sanitizeForFirestore('string')).toBe('string');
  expect(sanitizeForFirestore(42)).toBe(42);
  expect(sanitizeForFirestore(true)).toBe(true);
  expect(sanitizeForFirestore(null)).toBe(null);
});

test('should handle empty objects', () => {
  expect(sanitizeForFirestore({})).toEqual({});
});

test('should handle empty arrays', () => {
  expect(sanitizeForFirestore([])).toEqual([]);
});

test('should handle arrays of objects', () => {
  const input: Record<string, unknown> = {
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

// ==========================================
// assertNoUndefined tests
// ==========================================

test('assertNoUndefined should not throw for clean objects', () => {
  expect(() => assertNoUndefined({ name: 'Test', value: null })).not.toThrow();
});

test('assertNoUndefined should throw for objects with undefined', () => {
  expect(() => assertNoUndefined({ name: 'Test', bodyHtml: undefined }))
    .toThrow(/bodyHtml/);
});

test('assertNoUndefined should report nested undefined paths', () => {
  expect(() => assertNoUndefined({ 
    level1: { 
      level2: { missing: undefined } 
    } 
  })).toThrow(/level1\.level2\.missing/);
});

test('assertNoUndefined should report array index for undefined in arrays', () => {
  expect(() => assertNoUndefined({ 
    items: ['a', undefined, 'b'] 
  })).toThrow(/items\[1\]/);
});

// ==========================================
// normalizeEmailString tests
// ==========================================

test('normalizeEmailString should return the value if defined', () => {
  expect(normalizeEmailString('Hello')).toBe('Hello');
});

test('normalizeEmailString should return empty string for undefined', () => {
  expect(normalizeEmailString(undefined)).toBe('');
});

test('normalizeEmailString should return empty string for null', () => {
  expect(normalizeEmailString(null)).toBe('');
});

test('normalizeEmailString should use custom fallback', () => {
  expect(normalizeEmailString(undefined, '(no content)')).toBe('(no content)');
});

// ==========================================
// normalizeArray tests
// ==========================================

test('normalizeArray should return the array if defined', () => {
  expect(normalizeArray(['a', 'b'])).toEqual(['a', 'b']);
});

test('normalizeArray should return empty array for undefined', () => {
  expect(normalizeArray(undefined)).toEqual([]);
});

test('normalizeArray should return empty array for null', () => {
  expect(normalizeArray(null)).toEqual([]);
});

// ==========================================
// Integration test: real email payload
// ==========================================

test('should handle real email structure with missing bodyHtml', () => {
  const rawEmailPayload = {
    orgId: 'org123',
    accountId: 'acc456',
    provider: 'imap',
    providerMessageId: 'msg789',
    threadId: undefined, // missing
    from: 'sender@example.com',
    to: ['recipient@example.com'],
    cc: undefined, // missing
    subject: 'Test Subject',
    bodyText: 'Plain text content',
    bodyHtml: undefined, // THE BUG: this was causing the error
    receivedAt: new Date(),
    hasAttachments: false,
    processed: false,
  };

  const sanitized = sanitizeForFirestore(rawEmailPayload);

  // Should not contain undefined fields
  expect('bodyHtml' in sanitized).toBe(false);
  expect('threadId' in sanitized).toBe(false);
  expect('cc' in sanitized).toBe(false);
  
  // Should preserve defined fields
  expect(sanitized.orgId).toBe('org123');
  expect(sanitized.bodyText).toBe('Plain text content');
  expect(sanitized.from).toBe('sender@example.com');
});

test('should normalize email fields with helpers before sanitization', () => {
  const rawNormalized = {
    bodyText: undefined,
    bodyHtml: undefined,
    subject: undefined,
    to: undefined,
    cc: undefined,
  };

  const normalized = {
    bodyText: normalizeEmailString(rawNormalized.bodyText, ''),
    bodyHtml: normalizeEmailString(rawNormalized.bodyHtml, ''),
    subject: normalizeEmailString(rawNormalized.subject, '(Kein Betreff)'),
    to: normalizeArray(rawNormalized.to),
    cc: normalizeArray(rawNormalized.cc),
  };

  expect(normalized.bodyText).toBe('');
  expect(normalized.bodyHtml).toBe('');
  expect(normalized.subject).toBe('(Kein Betreff)');
  expect(normalized.to).toEqual([]);
  expect(normalized.cc).toEqual([]);

  // Should pass assertion now
  expect(() => assertNoUndefined(normalized)).not.toThrow();
});

// ==========================================
// Summary
// ==========================================

console.log('\n-----------------------------------');
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log('-----------------------------------\n');

if (failed > 0) {
  process.exit(1);
}
