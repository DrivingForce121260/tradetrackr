/**
 * Email Intelligence Agent - LLM Analysis
 * Analyzes emails using Gemini API
 * 
 * NOTE: This module is in functions/src/emailIntelligence/ which is the only
 * location allowed to make direct calls to external AI providers.
 * @see /docs/sovereignty/definition.md
 */

import { GoogleGenerativeAI } from '@google/generative-ai'; // sovereignty:allow reason="mailbox connector module" ticket="TT-001"
import * as functions from 'firebase-functions';
import { LLMAnalysisResult, EmailCategory, EmailPriority, DocumentType } from './types';
import { safeInfo, safeError, logLLMEvent, hashText } from '../utils/safeLogger';

/**
 * Analyze email content using Gemini AI
 */
export async function runLLMAnalysis(
  subject: string,
  bodyText: string,
  attachments: Array<{ fileName: string; mimeType: string }>
): Promise<LLMAnalysisResult> {
  const startTime = Date.now();
  
  try {
    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    
    if (!apiKey) {
      safeError('LLM analysis: API key not configured');
      return getFallbackResult();
    }

    // Safe logging: only log subject hash and lengths, never content
    logLLMEvent('LLM analysis starting', {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      operation: 'email-analysis',
      inputLength: bodyText.length,
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    });

    // Build prompt
    const prompt = buildAnalysisPrompt(subject, bodyText, attachments);

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const durationMs = Date.now() - startTime;
    
    // Safe logging: only log response length, never content
    logLLMEvent('LLM analysis completed', {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      operation: 'email-analysis',
      outputLength: text.length,
      durationMs,
      status: 'success',
    });

    // Parse JSON response
    const analysis = parseAnalysisResponse(text);
    
    return analysis;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    
    // Safe error logging: only log error type and message, never content
    logLLMEvent('LLM analysis failed', {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      operation: 'email-analysis',
      durationMs,
      status: 'error',
      error: { name: error.name, message: error.message, code: error.code },
    });
    
    return getFallbackResult();
  }
}

/**
 * Build analysis prompt for Gemini
 */
function buildAnalysisPrompt(
  subject: string,
  bodyText: string,
  attachments: Array<{ fileName: string; mimeType: string }>
): string {
  const attachmentInfo = attachments.length > 0
    ? `\nAttachments: ${attachments.map(a => `${a.fileName} (${a.mimeType})`).join(', ')}`
    : '';

  return `You are an email intelligence assistant for a construction/trades management system (TradeTrackr).

Analyze the following email and provide a structured JSON response.

EMAIL SUBJECT: ${subject}

EMAIL BODY:
${bodyText.substring(0, 2000)}${bodyText.length > 2000 ? '...' : ''}
${attachmentInfo}

INSTRUCTIONS:
1. Classify the email into ONE of these categories:
   - INVOICE: Bills, invoices, payment requests
   - ORDER: Purchase orders, material orders, equipment orders
   - SHIPPING: Delivery notifications, tracking updates
   - CLAIM: Insurance claims, warranty claims
   - COMPLAINT: Customer complaints, issues
   - KYC: Identity documents, compliance documents
   - GENERAL: General correspondence
   - SPAM: Promotional, irrelevant emails

2. Identify document types in attachments (if any):
   - INVOICE: Invoice documents
   - PO: Purchase order documents
   - CONTRACT: Contracts, agreements
   - ID: Identity documents
   - OTHER: Other documents

3. Create 1-3 short, actionable summary bullets in German (max 80 chars each)

4. Assign priority:
   - high: Urgent, requires immediate action, payment due, complaint
   - normal: Standard business correspondence
   - low: Informational, promotional

5. Provide confidence score (0.0 to 1.0)

OUTPUT FORMAT (strict JSON):
{
  "category": "INVOICE",
  "confidence": 0.95,
  "document_types": ["INVOICE"],
  "summary_bullets": [
    "Rechnung XYZ über 1.500€ erhalten",
    "Zahlungsfrist: 14 Tage",
    "Lieferant: Baumarkt AG"
  ],
  "priority": "high"
}

RESPOND ONLY WITH VALID JSON. NO OTHER TEXT.`;
}

/**
 * Parse and validate LLM response
 */
function parseAnalysisResponse(text: string): LLMAnalysisResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      // Remove opening markdown fence with optional 'json' tag
      jsonText = jsonText.replace(/^```(?:json)?\s*/m, '');
      // Remove closing markdown fence
      jsonText = jsonText.replace(/\s*```\s*$/m, '');
      jsonText = jsonText.trim();
    }
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Safe logging: log parsing status without content
    safeInfo('LLM response parsing', { responseLength: jsonText.length });

    const parsed = JSON.parse(jsonText);

    // Validate and normalize
    const category = validateCategory(parsed.category);
    const confidence = Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5));
    const document_types = validateDocumentTypes(parsed.document_types || []);
    const summary_bullets = validateSummaryBullets(parsed.summary_bullets || []);
    const priority = validatePriority(parsed.priority);

    safeInfo('LLM response parsed successfully', { 
      category, 
      confidence, 
      bulletCount: summary_bullets.length,
      priority 
    });

    return {
      category,
      confidence,
      document_types,
      summary_bullets,
      priority,
    };
  } catch (error: any) {
    // Safe error logging: never log the actual response text
    safeError('LLM response parsing failed', error, { 
      responseLength: text?.length 
    });
    
    // Return fallback
    return getFallbackResult();
  }
}

/**
 * Validate email category
 */
function validateCategory(category: string): EmailCategory {
  const validCategories: EmailCategory[] = [
    'INVOICE', 'ORDER', 'SHIPPING', 'CLAIM', 'COMPLAINT', 'KYC', 'GENERAL', 'SPAM'
  ];
  return validCategories.includes(category as EmailCategory) 
    ? (category as EmailCategory) 
    : 'GENERAL';
}

/**
 * Validate document types
 */
function validateDocumentTypes(types: string[]): DocumentType[] {
  const validTypes: DocumentType[] = ['INVOICE', 'PO', 'CONTRACT', 'ID', 'OTHER'];
  return types
    .filter(t => validTypes.includes(t as DocumentType))
    .map(t => t as DocumentType);
}

/**
 * Validate summary bullets
 */
function validateSummaryBullets(bullets: string[]): string[] {
  return bullets
    .filter(b => typeof b === 'string' && b.length > 0)
    .map(b => b.substring(0, 150))
    .slice(0, 3);
}

/**
 * Validate priority
 */
function validatePriority(priority: string): EmailPriority {
  const validPriorities: EmailPriority[] = ['high', 'normal', 'low'];
  return validPriorities.includes(priority as EmailPriority) 
    ? (priority as EmailPriority) 
    : 'normal';
}

/**
 * Get fallback result when LLM fails
 */
function getFallbackResult(): LLMAnalysisResult {
  return {
    category: 'GENERAL',
    confidence: 0.3,
    document_types: [],
    summary_bullets: ['E-Mail erhalten - manuelle Überprüfung erforderlich'],
    priority: 'normal',
  };
}


