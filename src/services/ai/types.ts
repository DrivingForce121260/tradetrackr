/**
 * AI Client Types
 * 
 * Defines interfaces for the AI abstraction layer.
 * All AI operations must go through the AIClient interface.
 * 
 * @see /docs/sovereignty/definition.md - Section B (AI via internal gateway)
 */

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Input for email summarization.
 */
export interface SummarizeEmailInput {
  /** Email subject */
  subject: string;
  
  /** Email body text (plain text) */
  bodyText: string;
  
  /** Attachment metadata (no content) */
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    size?: number;
  }>;
  
  /** Target language for summary */
  language?: 'de' | 'en';
}

/**
 * Output from email summarization.
 */
export interface SummarizeEmailOutput {
  /** Email category classification */
  category: 'INVOICE' | 'ORDER' | 'SHIPPING' | 'CLAIM' | 'COMPLAINT' | 'KYC' | 'GENERAL' | 'SPAM';
  
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  
  /** Identified document types in attachments */
  documentTypes: string[];
  
  /** Summary bullets (max 3, in target language) */
  summaryBullets: string[];
  
  /** Priority level */
  priority: 'high' | 'normal' | 'low';
}

/**
 * Input for reply draft generation.
 */
export interface DraftReplyInput {
  /** Original email subject */
  originalSubject: string;
  
  /** Original sender */
  originalFrom: string;
  
  /** Original recipients */
  originalTo: string[];
  
  /** Original email body text */
  originalBodyText: string;
  
  /** Summary bullets from analysis (optional) */
  summaryBullets?: string[];
  
  /** Desired tone */
  tone?: 'neutral' | 'friendly' | 'formal';
  
  /** Target language */
  language?: 'de' | 'en';
  
  /** Additional instructions for the reply */
  instructions?: string;
}

/**
 * Output from reply draft generation.
 */
export interface DraftReplyOutput {
  /** Reply subject */
  subject: string;
  
  /** Reply body (plain text) */
  bodyText: string;
  
  /** Reply body (HTML, optional) */
  bodyHtml?: string;
  
  /** Suggested recipients */
  to: string[];
  
  /** Suggested CC recipients */
  cc: string[];
}

/**
 * Input for document classification.
 */
export interface ClassifyDocumentInput {
  /** Extracted document text */
  text: string;
  
  /** Optional filename for context */
  filename?: string;
  
  /** Optional MIME type */
  mimeType?: string;
}

/**
 * Output from document classification.
 */
export interface ClassifyDocumentOutput {
  /** Document type slug */
  type?: string;
  
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  
  /** Reason for classification */
  reason: string;
  
  /** Model used for classification */
  model: string;
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Supported AI providers.
 */
export type AIProvider = 'IONOS' | 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

/**
 * AI client configuration.
 */
export interface AIClientConfig {
  /** Which provider to use */
  provider: AIProvider;
  
  /** API key (if direct provider access) */
  apiKey?: string;
  
  /** Model name override */
  model?: string;
  
  /** Internal gateway URL (for IONOS mode) */
  gatewayUrl?: string;
  
  /** Request timeout in ms */
  timeout?: number;
}

// ============================================================================
// Client Interface
// ============================================================================

/**
 * AI Client interface.
 * 
 * All AI operations in the application must go through this interface.
 * This ensures:
 * - Centralized provider switching
 * - Sovereignty mode enforcement
 * - Consistent logging and error handling
 */
export interface AIClient {
  /** Current provider */
  readonly provider: AIProvider;
  
  /**
   * Summarize an email.
   */
  summarizeEmail(input: SummarizeEmailInput): Promise<SummarizeEmailOutput>;
  
  /**
   * Generate a reply draft.
   */
  draftReply(input: DraftReplyInput): Promise<DraftReplyOutput>;
  
  /**
   * Classify a document.
   */
  classifyDocument(input: ClassifyDocumentInput): Promise<ClassifyDocumentOutput>;
}

