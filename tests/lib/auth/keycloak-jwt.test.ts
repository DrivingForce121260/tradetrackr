/**
 * Tests for Keycloak JWT Verification
 * 
 * Run: npx vitest run src/lib/auth/keycloak-jwt.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractBearerToken,
  assertTenantAccess,
  hasAnyRole,
  assertRole,
  VerifiedUser,
} from '../../../src/lib/auth/keycloak-jwt';

describe('Keycloak JWT Utilities', () => {
  
  describe('extractBearerToken', () => {
    it('should extract token from valid header', () => {
      expect(extractBearerToken('Bearer abc123')).toBe('abc123');
    });
    
    it('should return null for missing header', () => {
      expect(extractBearerToken(undefined)).toBeNull();
    });
    
    it('should return null for non-Bearer header', () => {
      expect(extractBearerToken('Basic abc123')).toBeNull();
    });
    
    it('should return null for empty token', () => {
      expect(extractBearerToken('Bearer ')).toBeNull();
    });
    
    it('should handle token with spaces', () => {
      expect(extractBearerToken('Bearer  token-with-spaces  ')).toBe('token-with-spaces');
    });
  });
  
  describe('assertTenantAccess', () => {
    const baseUser: VerifiedUser = {
      userId: 'user-1',
      email: 'test@example.com',
      tenantId: 'tenant-abc',
      roles: ['staff'],
      emailVerified: true,
    };
    
    it('should pass when tenant matches', () => {
      expect(() => assertTenantAccess(baseUser, 'tenant-abc')).not.toThrow();
    });
    
    it('should throw when tenant does not match', () => {
      expect(() => assertTenantAccess(baseUser, 'tenant-xyz')).toThrow('Falscher Mandant');
    });
    
    it('should throw when user has no tenant', () => {
      const userWithoutTenant = { ...baseUser, tenantId: '' };
      expect(() => assertTenantAccess(userWithoutTenant, 'tenant-abc')).toThrow('Kein Mandant');
    });
  });
  
  describe('hasAnyRole', () => {
    const user: VerifiedUser = {
      userId: 'user-1',
      email: 'test@example.com',
      tenantId: 'tenant-abc',
      roles: ['admin', 'staff'],
      emailVerified: true,
    };
    
    it('should return true if user has one of the required roles', () => {
      expect(hasAnyRole(user, ['admin'])).toBe(true);
      expect(hasAnyRole(user, ['staff'])).toBe(true);
      expect(hasAnyRole(user, ['manager', 'admin'])).toBe(true);
    });
    
    it('should return false if user has none of the required roles', () => {
      expect(hasAnyRole(user, ['manager'])).toBe(false);
      expect(hasAnyRole(user, ['accounting', 'technician'])).toBe(false);
    });
    
    it('should return false if user has no roles', () => {
      const userNoRoles = { ...user, roles: [] };
      expect(hasAnyRole(userNoRoles, ['admin'])).toBe(false);
    });
  });
  
  describe('assertRole', () => {
    const adminUser: VerifiedUser = {
      userId: 'user-1',
      email: 'admin@example.com',
      tenantId: 'tenant-abc',
      roles: ['admin'],
      emailVerified: true,
    };
    
    const staffUser: VerifiedUser = {
      userId: 'user-2',
      email: 'staff@example.com',
      tenantId: 'tenant-abc',
      roles: ['staff'],
      emailVerified: true,
    };
    
    it('should pass when user has required role', () => {
      expect(() => assertRole(adminUser, ['admin'])).not.toThrow();
      expect(() => assertRole(staffUser, ['staff', 'admin'])).not.toThrow();
    });
    
    it('should throw when user lacks required role', () => {
      expect(() => assertRole(staffUser, ['admin'])).toThrow('Erforderliche Rolle');
    });
  });
});

describe('JWT Verification (integration)', () => {
  // Note: Full JWT verification tests require mocking jose or using test keys.
  // These are placeholder tests that document expected behavior.
  
  it.todo('should verify valid token from Keycloak');
  it.todo('should reject expired token');
  it.todo('should reject token with wrong issuer');
  it.todo('should reject token with wrong audience');
  it.todo('should reject token without tenant_id claim');
});

