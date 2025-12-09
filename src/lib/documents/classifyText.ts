// ============================================================================
// AI CLASSIFICATION - Pluggable Interface
// ============================================================================

import { DocumentType, AIDecision } from '@/types/documents';

/**
 * Classify document text using AI.
 * This is a pluggable interface - implement with your preferred AI provider.
 * 
 * IMPORTANT: Must never guess. If low signal, return confidence < 0.6.
 * 
 * @param text - Extracted text from document
 * @param context - Optional context (filename, etc.)
 * @returns AI decision with type, confidence, reason, and model
 */
export async function classifyText(
  text: string,
  context?: { filename?: string; mimeType?: string }
): Promise<AIDecision> {
  
  // This is a placeholder implementation.
  // Replace with actual AI service call (e.g., Google Gemini, OpenAI, etc.)
  
  try {
    // Example: Call to AI service
    // const response = await callAIService(text, context);
    
    // For now, return a low confidence to trigger manual review
    console.log('[classifyText] AI classification requested', { textLength: text.length, context });
    
    // Placeholder: Analyze text with simple keyword matching as fallback
    const result = await analyzeWithKeywords(text, context);
    
    return {
      type: result.type,
      confidence: result.confidence,
      reason: result.reason,
      model: 'keyword-fallback-v1' // Replace with actual model name when implemented
    };
    
  } catch (error) {
    console.error('[classifyText] AI classification error:', error);
    return {
      confidence: 0.0,
      reason: 'AI classification failed',
      model: 'error'
    };
  }
}

/**
 * Fallback keyword-based analysis
 * This is NOT true AI - just a safety net until real AI is implemented
 */
async function analyzeWithKeywords(
  text: string,
  context?: { filename?: string; mimeType?: string }
): Promise<{ type?: DocumentType; confidence: number; reason: string }> {
  
  const lowerText = text.toLowerCase();
  const filename = context?.filename?.toLowerCase() || '';
  
  // High-confidence patterns
  if (lowerText.includes('rechnungsnummer') || lowerText.includes('invoice number')) {
    if (lowerText.includes('gutschrift') || lowerText.includes('credit note')) {
      return { type: 'client.credit_note', confidence: 0.88, reason: 'Credit note keywords found' };
    }
    return { type: 'client.invoice', confidence: 0.89, reason: 'Invoice keywords found' };
  }
  
  if (lowerText.includes('lieferschein') || lowerText.includes('delivery note')) {
    return { type: 'material.delivery_note', confidence: 0.87, reason: 'Delivery note keywords found' };
  }
  
  if (lowerText.includes('angebotsnummer') || (lowerText.includes('angebot') && lowerText.includes('datum'))) {
    return { type: 'client.offer_quote', confidence: 0.86, reason: 'Quote keywords found' };
  }
  
  if (lowerText.includes('vde 0100') || lowerText.includes('prüfprotokoll')) {
    return { type: 'quality.measurement_test', confidence: 0.85, reason: 'Test protocol keywords found' };
  }
  
  if (lowerText.includes('abnahmeprotokoll') || lowerText.includes('acceptance')) {
    return { type: 'client.acceptance_report', confidence: 0.84, reason: 'Acceptance report keywords found' };
  }
  
  // Medium-confidence patterns
  if (lowerText.includes('tagesbericht') || lowerText.includes('baustellenbericht')) {
    return { type: 'project.site_daily_report', confidence: 0.78, reason: 'Daily report keywords found' };
  }
  
  if (lowerText.includes('stundennachweis') || lowerText.includes('arbeitszeitnachweis')) {
    return { type: 'personnel.timesheet', confidence: 0.76, reason: 'Timesheet keywords found' };
  }
  
  if (lowerText.includes('wartungsprotokoll') || lowerText.includes('maintenance log')) {
    return { type: 'quality.maintenance_log', confidence: 0.75, reason: 'Maintenance log keywords found' };
  }
  
  // Low confidence - insufficient signal
  return {
    confidence: 0.3,
    reason: 'Insufficient keywords to classify document with confidence'
  };
}

/**
 * TODO: Implement real AI classification
 * 
 * Example integration with Google Gemini:
 * 
 * ```typescript
 * import { GoogleGenerativeAI } from '@google/generative-ai';
 * 
 * const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
 * const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
 * 
 * const prompt = `Classify this document text into one of these types:
 * ${DOCUMENT_TYPE_CONFIGS.map(c => `- ${c.slug}: ${c.descriptionDe}`).join('\n')}
 * 
 * Text:
 * ${text}
 * 
 * Return JSON: { "type": "slug", "confidence": 0.0-1.0, "reason": "explanation" }
 * 
 * IMPORTANT: Do not guess. If unsure, return confidence < 0.6.`;
 * 
 * const result = await model.generateContent(prompt);
 * const response = JSON.parse(result.response.text());
 * ```
 */













