/**
 * AI Services Export
 * 
 * Central export point for all AI-related functionality.
 * 
 * USAGE:
 * ```typescript
 * import { getAIClient } from '@/services/ai';
 * 
 * const ai = getAIClient();
 * const summary = await ai.summarizeEmail({ subject, bodyText });
 * ```
 * 
 * @see /docs/sovereignty/definition.md - All AI calls must use this interface.
 */

// Client factory and singleton
export { 
  createAIClient, 
  getAIClient, 
  resetAIClient 
} from './aiClient';

// Types
export type {
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

