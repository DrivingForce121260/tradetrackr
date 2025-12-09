/**
 * Email Intelligence Agent - LLM Analysis
 * Analyzes emails using Gemini API
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import { LLMAnalysisResult, EmailCategory, EmailPriority, DocumentType } from './types';

/**
 * Analyze email content using Gemini AI
 */
export async function runLLMAnalysis(
  subject: string,
  bodyText: string,
  attachments: Array<{ fileName: string; mimeType: string }>
): Promise<LLMAnalysisResult> {
  try {
    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    
    if (!apiKey) {
      functions.logger.error('❌ Gemini API key not configured - set GEMINI_API_KEY environment variable or firebase config gemini.api_key');
      return getFallbackResult();
    }

    functions.logger.info(`🔍 Starting LLM analysis for email: "${subject.substring(0, 50)}..."`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    });

    // Build prompt
    const prompt = buildAnalysisPrompt(subject, bodyText, attachments);
    
    functions.logger.info(`📤 Sending request to Gemini API (model: gemini-2.0-flash-exp)`);

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    functions.logger.info(`📥 Received response from Gemini API (${text.length} chars)`);

    // Parse JSON response
    const analysis = parseAnalysisResponse(text);
    
    return analysis;
  } catch (error: any) {
    functions.logger.error('❌ LLM analysis error:', error);
    if (error.message) {
      functions.logger.error('Error message:', error.message);
    }
    if (error.response) {
      functions.logger.error('API response:', error.response);
    }
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

    functions.logger.info('Attempting to parse JSON:', jsonText.substring(0, 200));

    const parsed = JSON.parse(jsonText);

    // Validate and normalize
    const category = validateCategory(parsed.category);
    const confidence = Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5));
    const document_types = validateDocumentTypes(parsed.document_types || []);
    const summary_bullets = validateSummaryBullets(parsed.summary_bullets || []);
    const priority = validatePriority(parsed.priority);

    functions.logger.info(`Successfully parsed LLM response: category=${category}, confidence=${confidence}, bullets=${summary_bullets.length}`);

    return {
      category,
      confidence,
      document_types,
      summary_bullets,
      priority,
    };
  } catch (error) {
    functions.logger.error('Error parsing LLM response:', error);
    functions.logger.error('Response text:', text);
    
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


