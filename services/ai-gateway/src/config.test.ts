/**
 * Tests for AI Gateway configuration
 * 
 * Run: cd services/ai-gateway && npx vitest run src/config.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig } from './config.js';

describe('AI Gateway Config', () => {
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    // Reset to clean state
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.AI_GATEWAY_TOKEN = 'test-token';
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  describe('loadConfig', () => {
    
    it('should load valid config with defaults', () => {
      const config = loadConfig();
      expect(config.port).toBe(8787);
      expect(config.upstreamMode).toBe('MOCK');
      expect(config.logLevel).toBe('info');
    });
    
    it('should accept IONOS upstream mode', () => {
      process.env.AI_UPSTREAM_MODE = 'IONOS';
      process.env.IONOS_AI_TOKEN = 'ionos-token';
      const config = loadConfig();
      expect(config.upstreamMode).toBe('IONOS');
    });
    
    it('should reject invalid upstream mode', () => {
      process.env.AI_UPSTREAM_MODE = 'OPENAI';
      expect(() => loadConfig()).toThrow('AI_UPSTREAM_MODE muss MOCK oder IONOS sein');
    });
    
  });
  
  describe('IONOS endpoint validation', () => {
    
    beforeEach(() => {
      process.env.AI_UPSTREAM_MODE = 'IONOS';
      process.env.IONOS_AI_TOKEN = 'ionos-token';
    });
    
    it('should accept valid IONOS AI base URL', () => {
      process.env.IONOS_AI_BASE_URL = 'https://openai.inference.de-txl.ionos.com/v1';
      expect(() => loadConfig()).not.toThrow();
    });
    
    it('should reject non-IONOS base URL', () => {
      process.env.IONOS_AI_BASE_URL = 'https://api.openai.com/v1';
      expect(() => loadConfig()).toThrow('IONOS_AI_BASE_URL muss auf *.ionos.com');
    });
    
    it('should reject anthropic base URL', () => {
      process.env.IONOS_AI_BASE_URL = 'https://api.anthropic.com/v1';
      expect(() => loadConfig()).toThrow('IONOS_AI_BASE_URL muss auf *.ionos.com');
    });
    
    it('should accept ionoscloud.com base URL', () => {
      process.env.IONOS_AI_BASE_URL = 'https://s3.eu-central-3.ionoscloud.com';
      expect(() => loadConfig()).not.toThrow();
    });
    
    it('should reject invalid URL', () => {
      process.env.IONOS_AI_BASE_URL = 'not-a-url';
      expect(() => loadConfig()).toThrow('keine gültige URL');
    });
    
  });
  
  describe('production requirements', () => {
    
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });
    
    it('should require AI_GATEWAY_TOKEN in production', () => {
      delete process.env.AI_GATEWAY_TOKEN;
      expect(() => loadConfig()).toThrow('AI_GATEWAY_TOKEN ist erforderlich');
    });
    
    it('should require IONOS_AI_TOKEN when IONOS mode in production', () => {
      process.env.AI_GATEWAY_TOKEN = 'gateway-token';
      process.env.AI_UPSTREAM_MODE = 'IONOS';
      delete process.env.IONOS_AI_TOKEN;
      expect(() => loadConfig()).toThrow('IONOS_AI_TOKEN ist erforderlich');
    });
    
    it('should allow MOCK mode without IONOS token', () => {
      process.env.AI_GATEWAY_TOKEN = 'gateway-token';
      process.env.AI_UPSTREAM_MODE = 'MOCK';
      expect(() => loadConfig()).not.toThrow();
    });
    
  });
});

