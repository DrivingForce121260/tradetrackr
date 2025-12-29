/**
 * AI Client Implementation
 * 
 * Provides a centralized abstraction for all AI operations.
 * Enforces sovereignty mode and routes to appropriate providers.
 * 
 * IMPORTANT:
 * - All AI calls in frontend code MUST go through this client.
 * - Direct imports of provider SDKs (openai, @google/generative-ai) are forbidden.
 * - In IONOS_ONLY mode, only IONOS gateway is allowed.
 * 
 * Phase 2: Gateway Integration
 * - If AI_GATEWAY_URL is set, calls are routed to the AI Gateway.
 * - If SOVEREIGNTY_MODE=IONOS_ONLY, AI_GATEWAY_URL is REQUIRED.
 * 
 * @see /docs/sovereignty/definition.md
 * @see /docs/sovereignty/phase-2-ai-gateway.md
 */

import { getProviderPolicy } from '../../config/providerPolicy';
import { safeInfo, safeError, logAIEvent } from '../../utils/safeLogger';
import type {
  AIClient,
  AIClientConfig,
  AIProvider,
  SummarizeEmailInput,
  SummarizeEmailOutput,
  DraftReplyInput,
  DraftReplyOutput,
  ClassifyDocumentInput,
  ClassifyDocumentOutput,
} from './types';

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Get AI Gateway configuration from environment.
 */
function getGatewayConfig(): { url: string | null; token: string | null } {
  // Browser environment
  if (typeof window !== 'undefined') {
    return {
      url: (import.meta as any).env?.VITE_AI_GATEWAY_URL || null,
      token: (import.meta as any).env?.VITE_AI_GATEWAY_TOKEN || null,
    };
  }
  
  // Node environment
  return {
    url: process.env.AI_GATEWAY_URL || null,
    token: process.env.AI_GATEWAY_TOKEN || null,
  };
}

/**
 * Check if gateway is configured.
 */
function isGatewayConfigured(): boolean {
  const { url, token } = getGatewayConfig();
  return !!(url && token);
}

// ============================================================================
// Error Messages (German)
// ============================================================================

const ERROR_MESSAGES = {
  SOVEREIGNTY_BLOCKED: 'Souveränitätsmodus aktiv: KI-Anbieter nicht erlaubt.',
  NOT_CONFIGURED: 'KI-Client nicht konfiguriert. Bitte API-Schlüssel prüfen.',
  GATEWAY_NOT_READY: 'IONOS KI-Gateway noch nicht implementiert. Wird in Phase 2 aktiviert.',
  GATEWAY_NOT_CONFIGURED: 'Souveränitätsmodus aktiv: AI-Gateway ist nicht konfiguriert.',
  GATEWAY_AUTH_FAILED: 'AI-Gateway Authentifizierung fehlgeschlagen.',
  GATEWAY_ERROR: 'AI-Gateway Fehler. Bitte später erneut versuchen.',
  REQUEST_FAILED: 'KI-Anfrage fehlgeschlagen. Bitte später erneut versuchen.',
} as const;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create an AI client instance.
 * 
 * @param config - Optional configuration override
 * @returns AIClient instance
 * 
 * @example
 * ```typescript
 * const ai = createAIClient();
 * const summary = await ai.summarizeEmail({ subject, bodyText });
 * ```
 */
export function createAIClient(config?: Partial<AIClientConfig>): AIClient {
  const policy = getProviderPolicy();
  const gatewayConfigured = isGatewayConfigured();
  
  // Determine provider
  let provider: AIProvider = config?.provider || 'GEMINI';
  
  // In IONOS_ONLY mode, force IONOS provider and require gateway
  if (policy.sovereigntyMode === 'IONOS_ONLY') {
    // Gateway MUST be configured in IONOS_ONLY mode
    if (!gatewayConfigured) {
      throw new Error(ERROR_MESSAGES.GATEWAY_NOT_CONFIGURED);
    }
    
    if (provider !== 'IONOS') {
      safeInfo('AI client: Switching to IONOS provider due to sovereignty mode', {
        requestedProvider: provider,
        enforcedProvider: 'IONOS',
      });
    }
    provider = 'IONOS';
  }
  
  // If gateway is configured, use it regardless of provider setting
  const useGateway = gatewayConfigured;
  
  // Check if provider is allowed (skip if using gateway)
  if (!useGateway && !policy.allowedAIProviders.includes(provider)) {
    throw new Error(ERROR_MESSAGES.SOVEREIGNTY_BLOCKED);
  }
  
  return new AIClientImpl(provider, config, useGateway);
}

/**
 * Internal AI client implementation.
 */
class AIClientImpl implements AIClient {
  readonly provider: AIProvider;
  private readonly config?: Partial<AIClientConfig>;
  private readonly useGateway: boolean;
  
  constructor(provider: AIProvider, config?: Partial<AIClientConfig>, useGateway: boolean = false) {
    this.provider = provider;
    this.config = config;
    this.useGateway = useGateway;
  }
  
  /**
   * Summarize an email.
   */
  async summarizeEmail(input: SummarizeEmailInput): Promise<SummarizeEmailOutput> {
    const startTime = Date.now();
    
    try {
      this.assertProviderAllowed();
      
      logAIEvent('AI: summarizeEmail starting', {
        provider: this.provider,
        operation: 'summarizeEmail',
        inputTokens: Math.ceil(input.bodyText.length / 4), // Rough estimate
      });
      
      // Route to appropriate provider
      const result = await this.routeSummarizeEmail(input);
      
      logAIEvent('AI: summarizeEmail completed', {
        provider: this.provider,
        operation: 'summarizeEmail',
        durationMs: Date.now() - startTime,
        status: 'success',
      });
      
      return result;
      
    } catch (error: any) {
      logAIEvent('AI: summarizeEmail failed', {
        provider: this.provider,
        operation: 'summarizeEmail',
        durationMs: Date.now() - startTime,
        status: 'error',
        error: { name: error.name, message: error.message },
      });
      throw error;
    }
  }
  
  /**
   * Generate a reply draft.
   */
  async draftReply(input: DraftReplyInput): Promise<DraftReplyOutput> {
    const startTime = Date.now();
    
    try {
      this.assertProviderAllowed();
      
      logAIEvent('AI: draftReply starting', {
        provider: this.provider,
        operation: 'draftReply',
        inputTokens: Math.ceil(input.originalBodyText.length / 4),
      });
      
      const result = await this.routeDraftReply(input);
      
      logAIEvent('AI: draftReply completed', {
        provider: this.provider,
        operation: 'draftReply',
        durationMs: Date.now() - startTime,
        status: 'success',
      });
      
      return result;
      
    } catch (error: any) {
      logAIEvent('AI: draftReply failed', {
        provider: this.provider,
        operation: 'draftReply',
        durationMs: Date.now() - startTime,
        status: 'error',
        error: { name: error.name, message: error.message },
      });
      throw error;
    }
  }
  
  /**
   * Classify a document.
   */
  async classifyDocument(input: ClassifyDocumentInput): Promise<ClassifyDocumentOutput> {
    const startTime = Date.now();
    
    try {
      this.assertProviderAllowed();
      
      logAIEvent('AI: classifyDocument starting', {
        provider: this.provider,
        operation: 'classifyDocument',
        inputTokens: Math.ceil(input.text.length / 4),
      });
      
      const result = await this.routeClassifyDocument(input);
      
      logAIEvent('AI: classifyDocument completed', {
        provider: this.provider,
        operation: 'classifyDocument',
        durationMs: Date.now() - startTime,
        status: 'success',
      });
      
      return result;
      
    } catch (error: any) {
      logAIEvent('AI: classifyDocument failed', {
        provider: this.provider,
        operation: 'classifyDocument',
        durationMs: Date.now() - startTime,
        status: 'error',
        error: { name: error.name, message: error.message },
      });
      throw error;
    }
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  /**
   * Assert that the current provider is allowed by sovereignty policy.
   */
  private assertProviderAllowed(): void {
    const policy = getProviderPolicy();
    
    if (!policy.allowedAIProviders.includes(this.provider)) {
      throw new Error(ERROR_MESSAGES.SOVEREIGNTY_BLOCKED);
    }
  }
  
  /**
   * Route summarizeEmail to the appropriate provider.
   */
  private async routeSummarizeEmail(input: SummarizeEmailInput): Promise<SummarizeEmailOutput> {
    // If gateway is configured, use it
    if (this.useGateway) {
      return this.callGateway('/ai/summarizeEmail', input);
    }
    
    switch (this.provider) {
      case 'IONOS':
        // Phase 2: Requires gateway
        throw new Error(ERROR_MESSAGES.GATEWAY_NOT_CONFIGURED);
        
      case 'GEMINI':
      case 'OPENAI':
      case 'ANTHROPIC':
        // NOTE: Direct provider calls should go through backend Cloud Functions,
        // not from frontend. This is a placeholder for the routing logic.
        return this.callBackendAI('summarizeEmail', input);
        
      default:
        throw new Error(ERROR_MESSAGES.NOT_CONFIGURED);
    }
  }
  
  /**
   * Route draftReply to the appropriate provider.
   */
  private async routeDraftReply(input: DraftReplyInput): Promise<DraftReplyOutput> {
    // If gateway is configured, use it
    if (this.useGateway) {
      return this.callGateway('/ai/draftReply', input);
    }
    
    switch (this.provider) {
      case 'IONOS':
        throw new Error(ERROR_MESSAGES.GATEWAY_NOT_CONFIGURED);
        
      case 'GEMINI':
      case 'OPENAI':
      case 'ANTHROPIC':
        return this.callBackendAI('draftReply', input);
        
      default:
        throw new Error(ERROR_MESSAGES.NOT_CONFIGURED);
    }
  }
  
  /**
   * Route classifyDocument to the appropriate provider.
   */
  private async routeClassifyDocument(input: ClassifyDocumentInput): Promise<ClassifyDocumentOutput> {
    // If gateway is configured, use it
    if (this.useGateway) {
      return this.callGateway('/ai/classifyDocument', input);
    }
    
    switch (this.provider) {
      case 'IONOS':
        throw new Error(ERROR_MESSAGES.GATEWAY_NOT_CONFIGURED);
        
      case 'GEMINI':
      case 'OPENAI':
      case 'ANTHROPIC':
        return this.callBackendAI('classifyDocument', input);
        
      default:
        throw new Error(ERROR_MESSAGES.NOT_CONFIGURED);
    }
  }
  
  /**
   * Call AI Gateway endpoint.
   * 
   * @param endpoint - Gateway endpoint path (e.g., /ai/summarizeEmail)
   * @param input - Request payload
   * @returns Response from gateway
   */
  private async callGateway<T>(endpoint: string, input: any): Promise<T> {
    const { url, token } = getGatewayConfig();
    
    if (!url || !token) {
      throw new Error(ERROR_MESSAGES.GATEWAY_NOT_CONFIGURED);
    }
    
    safeInfo('AI client: Calling gateway', { 
      endpoint, 
      provider: this.provider,
      gatewayUrl: url.replace(/\/\/.*@/, '//***@'), // Hide credentials if in URL
    });
    
    try {
      const response = await fetch(`${url}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      
      if (response.status === 401) {
        throw new Error(ERROR_MESSAGES.GATEWAY_AUTH_FAILED);
      }
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = (errorBody as any).error || ERROR_MESSAGES.GATEWAY_ERROR;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data as T;
      
    } catch (error: any) {
      // Re-throw our own errors
      if (error.message.includes('Gateway') || error.message.includes('Souveränität')) {
        throw error;
      }
      
      // Network or other errors
      safeError('AI client: Gateway call failed', error, { endpoint });
      throw new Error(ERROR_MESSAGES.GATEWAY_ERROR);
    }
  }
  
  /**
   * Call backend AI endpoint (fallback when gateway not configured).
   * 
   * In the current architecture, AI operations are performed by Cloud Functions.
   * This method provides a unified interface for frontend code.
   */
  private async callBackendAI<T>(operation: string, input: any): Promise<T> {
    // For now, return a fallback result.
    // This will be replaced with actual backend calls in production.
    
    safeInfo('AI client: Backend call placeholder', { operation, provider: this.provider });
    
    // Return fallback based on operation type
    switch (operation) {
      case 'summarizeEmail':
        return {
          category: 'GENERAL',
          confidence: 0.3,
          documentTypes: [],
          summaryBullets: ['E-Mail erhalten – manuelle Überprüfung erforderlich'],
          priority: 'normal',
        } as unknown as T;
        
      case 'draftReply':
        return {
          subject: `Re: ${(input as DraftReplyInput).originalSubject || 'Ihre Nachricht'}`,
          bodyText: '[TODO: Antwort verfassen]\n\nMit freundlichen Grüßen',
          bodyHtml: '',
          to: [(input as DraftReplyInput).originalFrom],
          cc: [],
        } as unknown as T;
        
      case 'classifyDocument':
        return {
          confidence: 0.3,
          reason: 'Placeholder - Backend-Integration erforderlich',
          model: 'placeholder',
        } as unknown as T;
        
      default:
        throw new Error(ERROR_MESSAGES.REQUEST_FAILED);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultClient: AIClient | null = null;

/**
 * Get the default AI client instance.
 * Creates a new instance if not already initialized.
 */
export function getAIClient(): AIClient {
  if (!defaultClient) {
    defaultClient = createAIClient();
  }
  return defaultClient;
}

/**
 * Reset the default AI client.
 * Useful for testing or reconfiguration.
 */
export function resetAIClient(): void {
  defaultClient = null;
}

