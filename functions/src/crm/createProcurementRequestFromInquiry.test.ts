/**
 * Tests for createProcurementRequestFromInquiry Cloud Function
 * 
 * Run with: npx ts-node src/crm/createProcurementRequestFromInquiry.test.ts
 * Or after build: node lib/crm/createProcurementRequestFromInquiry.test.js
 */

import * as crypto from 'crypto';

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
    toHaveLength(expectedLength: number) {
      if (!Array.isArray(actual) && typeof actual !== 'string') {
        throw new Error('Expected array or string');
      }
      if ((actual as string | unknown[]).length !== expectedLength) {
        throw new Error(`Expected length ${expectedLength}, got ${(actual as string | unknown[]).length}`);
      }
    },
    toMatch(pattern: RegExp) {
      if (typeof actual !== 'string') {
        throw new Error('Expected string');
      }
      if (!pattern.test(actual)) {
        throw new Error(`Expected ${actual} to match ${pattern}`);
      }
    }
  };
}

console.log('\n🧪 Running createProcurementRequestFromInquiry tests...\n');

// ==========================================
// deterministicId tests
// ==========================================

/**
 * Generate deterministic ID from string (SHA-1 hash, first 20 chars)
 * Same implementation as in the Cloud Function
 */
function deterministicId(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex').substring(0, 20);
}

test('deterministicId should generate consistent hash', () => {
  const input = 'concernId123:inquiryId456:procurement_request:v1';
  const id1 = deterministicId(input);
  const id2 = deterministicId(input);
  
  expect(id1).toBe(id2);
});

test('deterministicId should generate 20 character IDs', () => {
  const id = deterministicId('test-input');
  expect(id).toHaveLength(20);
});

test('deterministicId should only contain hex characters', () => {
  const id = deterministicId('test-input');
  expect(id).toMatch(/^[a-f0-9]+$/);
});

test('deterministicId should generate different IDs for different inputs', () => {
  const id1 = deterministicId('input1');
  const id2 = deterministicId('input2');
  
  if (id1 === id2) {
    throw new Error(`Expected different IDs, got same: ${id1}`);
  }
});

// ==========================================
// idempotencyKey format tests
// ==========================================

test('idempotencyKey format should be consistent', () => {
  const inquiryId = 'abc123';
  const key1 = `${inquiryId}:procurement_request:v1`;
  const key2 = `${inquiryId}:procurement_request:v1`;
  
  expect(key1).toBe(key2);
});

test('same inquiryId should produce same requestId', () => {
  const concernId = 'DE689E0F2D';
  const inquiryId = 'inquiry123';
  
  const idempotencyKey = `${inquiryId}:procurement_request:v1`;
  const requestId1 = deterministicId(`${concernId}:${idempotencyKey}`);
  const requestId2 = deterministicId(`${concernId}:${idempotencyKey}`);
  
  expect(requestId1).toBe(requestId2);
});

test('different inquiryIds should produce different requestIds', () => {
  const concernId = 'DE689E0F2D';
  
  const key1 = `inquiry1:procurement_request:v1`;
  const key2 = `inquiry2:procurement_request:v1`;
  
  const requestId1 = deterministicId(`${concernId}:${key1}`);
  const requestId2 = deterministicId(`${concernId}:${key2}`);
  
  if (requestId1 === requestId2) {
    throw new Error(`Expected different request IDs for different inquiries`);
  }
});

test('different concernIds should produce different requestIds for same inquiry', () => {
  const inquiryId = 'inquiry123';
  const key = `${inquiryId}:procurement_request:v1`;
  
  const requestId1 = deterministicId(`concernA:${key}`);
  const requestId2 = deterministicId(`concernB:${key}`);
  
  if (requestId1 === requestId2) {
    throw new Error(`Expected different request IDs for different concerns`);
  }
});

// ==========================================
// Immutable fields validation tests
// ==========================================

interface ImmutableFields {
  concernId: string;
  createdByUid: string;
  source: string;
  sourceEmailId: string | null;
  sourceCrmNoteId: string | null;
  sourceInquiryId: string;
  idempotencyKey: string;
}

function validateImmutableFieldsUnchanged(
  before: ImmutableFields,
  after: ImmutableFields
): { valid: boolean; changedFields: string[] } {
  const changedFields: string[] = [];
  
  if (before.concernId !== after.concernId) changedFields.push('concernId');
  if (before.createdByUid !== after.createdByUid) changedFields.push('createdByUid');
  if (before.source !== after.source) changedFields.push('source');
  if (before.sourceEmailId !== after.sourceEmailId) changedFields.push('sourceEmailId');
  if (before.sourceCrmNoteId !== after.sourceCrmNoteId) changedFields.push('sourceCrmNoteId');
  if (before.sourceInquiryId !== after.sourceInquiryId) changedFields.push('sourceInquiryId');
  if (before.idempotencyKey !== after.idempotencyKey) changedFields.push('idempotencyKey');
  
  return {
    valid: changedFields.length === 0,
    changedFields,
  };
}

test('validateImmutableFieldsUnchanged should pass for identical fields', () => {
  const before: ImmutableFields = {
    concernId: 'DE689E0F2D',
    createdByUid: 'user123',
    source: 'crm_email',
    sourceEmailId: 'email456',
    sourceCrmNoteId: 'note789',
    sourceInquiryId: 'inquiry123',
    idempotencyKey: 'inquiry123:procurement_request:v1',
  };
  
  const result = validateImmutableFieldsUnchanged(before, { ...before });
  
  expect(result.valid).toBe(true);
  expect(result.changedFields).toEqual([]);
});

test('validateImmutableFieldsUnchanged should detect concernId change', () => {
  const before: ImmutableFields = {
    concernId: 'DE689E0F2D',
    createdByUid: 'user123',
    source: 'crm_email',
    sourceEmailId: 'email456',
    sourceCrmNoteId: 'note789',
    sourceInquiryId: 'inquiry123',
    idempotencyKey: 'inquiry123:procurement_request:v1',
  };
  
  const after = { ...before, concernId: 'DIFFERENT' };
  const result = validateImmutableFieldsUnchanged(before, after);
  
  expect(result.valid).toBe(false);
  expect(result.changedFields).toEqual(['concernId']);
});

test('validateImmutableFieldsUnchanged should detect multiple changed fields', () => {
  const before: ImmutableFields = {
    concernId: 'DE689E0F2D',
    createdByUid: 'user123',
    source: 'crm_email',
    sourceEmailId: 'email456',
    sourceCrmNoteId: 'note789',
    sourceInquiryId: 'inquiry123',
    idempotencyKey: 'inquiry123:procurement_request:v1',
  };
  
  const after: ImmutableFields = {
    ...before,
    createdByUid: 'hacker',
    source: 'manual',
  };
  
  const result = validateImmutableFieldsUnchanged(before, after);
  
  expect(result.valid).toBe(false);
  if (!result.changedFields.includes('createdByUid')) {
    throw new Error('Expected createdByUid in changedFields');
  }
  if (!result.changedFields.includes('source')) {
    throw new Error('Expected source in changedFields');
  }
});

// ==========================================
// CRM role validation tests
// ==========================================

const CRM_WRITE_ROLES = ['admin', 'manager', 'office', 'project_manager'];

function hasCrmWriteRole(role: string, rechte?: number): boolean {
  if (CRM_WRITE_ROLES.includes(role)) return true;
  // Legacy: rechte >= 4 means manager or higher
  if (rechte !== undefined && rechte >= 4) return true;
  return false;
}

test('hasCrmWriteRole should allow admin', () => {
  expect(hasCrmWriteRole('admin')).toBe(true);
});

test('hasCrmWriteRole should allow manager', () => {
  expect(hasCrmWriteRole('manager')).toBe(true);
});

test('hasCrmWriteRole should allow office', () => {
  expect(hasCrmWriteRole('office')).toBe(true);
});

test('hasCrmWriteRole should allow project_manager', () => {
  expect(hasCrmWriteRole('project_manager')).toBe(true);
});

test('hasCrmWriteRole should deny employee', () => {
  expect(hasCrmWriteRole('employee')).toBe(false);
});

test('hasCrmWriteRole should deny unknown role', () => {
  expect(hasCrmWriteRole('unknown')).toBe(false);
});

test('hasCrmWriteRole should allow legacy rechte >= 4', () => {
  expect(hasCrmWriteRole('', 4)).toBe(true);
  expect(hasCrmWriteRole('', 5)).toBe(true);
});

test('hasCrmWriteRole should deny legacy rechte < 4', () => {
  expect(hasCrmWriteRole('', 3)).toBe(false);
  expect(hasCrmWriteRole('', 1)).toBe(false);
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



