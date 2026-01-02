/**
 * Tests for safeFetch egress allowlist
 * 
 * Run: cd services/ai-gateway && npx vitest run src/utils/safeFetch.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEgressUrl, _testExports } from './safeFetch.js';

const { isDeniedHost, isAllowedHost } = _testExports;

describe('safeFetch egress allowlist', () => {
  
  describe('isDeniedHost', () => {
    it('should deny googleapis.com', () => {
      expect(isDeniedHost('firestore.googleapis.com')).toBe(true);
      expect(isDeniedHost('generativelanguage.googleapis.com')).toBe(true);
    });
    
    it('should deny firebaseio.com', () => {
      expect(isDeniedHost('my-project.firebaseio.com')).toBe(true);
    });
    
    it('should deny firebase.com', () => {
      expect(isDeniedHost('console.firebase.com')).toBe(true);
    });
    
    it('should deny api.openai.com (direct OpenAI)', () => {
      expect(isDeniedHost('api.openai.com')).toBe(true);
    });
    
    it('should deny api.anthropic.com', () => {
      expect(isDeniedHost('api.anthropic.com')).toBe(true);
    });
    
    it('should deny amazonaws.com', () => {
      expect(isDeniedHost('s3.amazonaws.com')).toBe(true);
      expect(isDeniedHost('us-east-1.amazonaws.com')).toBe(true);
    });
    
    it('should NOT deny IONOS endpoints', () => {
      expect(isDeniedHost('openai.inference.de-txl.ionos.com')).toBe(false);
      expect(isDeniedHost('s3.eu-central-3.ionoscloud.com')).toBe(false);
    });
    
    it('should NOT deny tradetrackr.de', () => {
      expect(isDeniedHost('tradetrackr.de')).toBe(false);
      expect(isDeniedHost('ai.tradetrackr.de')).toBe(false);
    });
  });
  
  describe('isAllowedHost', () => {
    it('should allow IONOS AI endpoints', () => {
      expect(isAllowedHost('openai.inference.de-txl.ionos.com')).toBe(true);
      expect(isAllowedHost('openai.inference.de-fra.ionos.com')).toBe(true);
    });
    
    it('should allow IONOS S3 endpoints', () => {
      expect(isAllowedHost('s3.eu-central-3.ionoscloud.com')).toBe(true);
      expect(isAllowedHost('s3.eu-central-4.ionoscloud.com')).toBe(true);
    });
    
    it('should allow tradetrackr.de', () => {
      expect(isAllowedHost('tradetrackr.de')).toBe(true);
      expect(isAllowedHost('ai.tradetrackr.de')).toBe(true);
      expect(isAllowedHost('api.tradetrackr.de')).toBe(true);
    });
    
    it('should allow localhost', () => {
      expect(isAllowedHost('localhost')).toBe(true);
      expect(isAllowedHost('127.0.0.1')).toBe(true);
    });
    
    it('should NOT allow random hosts', () => {
      expect(isAllowedHost('example.com')).toBe(false);
      expect(isAllowedHost('some-api.io')).toBe(false);
    });
  });
  
  describe('validateEgressUrl', () => {
    const originalEnv = process.env.NODE_ENV;
    
    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });
    
    it('should throw on denied hosts', () => {
      expect(() => validateEgressUrl('https://api.openai.com/v1/chat')).toThrow('Egress blocked');
      expect(() => validateEgressUrl('https://firestore.googleapis.com/v1/projects')).toThrow('Egress blocked');
    });
    
    it('should allow IONOS hosts', () => {
      expect(() => validateEgressUrl('https://openai.inference.de-txl.ionos.com/v1/chat/completions')).not.toThrow();
    });
    
    it('should allow localhost', () => {
      expect(() => validateEgressUrl('http://localhost:8787/healthz')).not.toThrow();
    });
    
    it('should throw on non-allowed hosts in production', () => {
      process.env.NODE_ENV = 'production';
      expect(() => validateEgressUrl('https://example.com/api')).toThrow('Egress blocked');
    });
  });
});

