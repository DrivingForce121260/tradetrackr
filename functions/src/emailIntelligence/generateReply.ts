/**
 * Email Intelligence Agent - Generate Reply Draft
 * Uses LLM to generate a draft reply to an email
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import { LLMReplyGenerationResult } from './types';

/**
 * Generate a reply draft using Gemini AI
 */
export async function generateReplyDraft(
  originalSubject: string,
  originalFrom: string,
  originalTo: string[],
  originalBodyText: string,
  summaryBullets: string[],
  tone: 'neutral' | 'friendly' | 'formal' = 'neutral',
  language: 'de' | 'en' = 'de',
  instructions?: string
): Promise<LLMReplyGenerationResult> {
  try {
    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    
    if (!apiKey) {
      functions.logger.error('❌ Gemini API key not configured');
      return getFallbackReply(originalFrom, originalSubject);
    }

    functions.logger.info(`🔍 Generating reply draft for email: "${originalSubject.substring(0, 50)}..."`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    });

    // Build prompt
    const prompt = buildReplyPrompt(
      originalSubject,
      originalFrom,
      originalTo,
      originalBodyText,
      summaryBullets,
      tone,
      language,
      instructions
    );
    
    functions.logger.info(`📤 Sending reply generation request to Gemini API`);

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    functions.logger.info(`📥 Received reply draft from Gemini API (${text.length} chars)`);

    // Parse JSON response
    const replyDraft = parseReplyResponse(text, originalFrom, originalSubject);
    
    return replyDraft;
  } catch (error: any) {
    functions.logger.error('❌ Reply generation error:', error);
    if (error.message) {
      functions.logger.error('Error message:', error.message);
    }
    return getFallbackReply(originalFrom, originalSubject);
  }
}

/**
 * Build reply generation prompt for Gemini
 */
function buildReplyPrompt(
  originalSubject: string,
  originalFrom: string,
  originalTo: string[],
  originalBodyText: string,
  summaryBullets: string[],
  tone: 'neutral' | 'friendly' | 'formal',
  language: 'de' | 'en',
  instructions?: string
): string {
  const toneDescriptions = {
    neutral: language === 'de' ? 'professionell und sachlich' : 'professional and matter-of-fact',
    friendly: language === 'de' ? 'freundlich und zugänglich' : 'friendly and approachable',
    formal: language === 'de' ? 'sehr formell und höflich' : 'very formal and polite'
  };

  const languageName = language === 'de' ? 'Deutsch' : 'English';

  const summarySection = summaryBullets.length > 0
    ? `\n\nKEY POINTS FROM AI ANALYSIS:\n${summaryBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}`
    : '';

  const instructionsSection = instructions
    ? `\n\nADDITIONAL INSTRUCTIONS:\n${instructions}`
    : '';

  return `You are an email assistant for a construction/trades management system (TradeTrackr).

Generate a professional reply to the following email.

ORIGINAL EMAIL:
From: ${originalFrom}
To: ${originalTo.join(', ')}
Subject: ${originalSubject}

Body:
${originalBodyText.substring(0, 2000)}${originalBodyText.length > 2000 ? '...' : ''}
${summarySection}
${instructionsSection}

REPLY REQUIREMENTS:
1. Language: ${languageName}
2. Tone: ${toneDescriptions[tone]}
3. Reply-To: ${originalFrom}
4. Subject: Use "Re: ${originalSubject}" unless the original already starts with "Re:"
5. Keep the reply concise and professional (2-4 paragraphs maximum)
6. Address the main points from the original email
7. If you cannot determine the appropriate recipient, leave "to" as an empty array and include a note in the body like "[TODO: Empfänger prüfen]"
8. Do NOT make up information - only respond based on the original email content
9. Use a professional email signature placeholder: "Mit freundlichen Grüßen" (German) or "Best regards" (English)

OUTPUT FORMAT (strict JSON only, no other text):
{
  "subject": "Re: ...",
  "bodyText": "Full reply text in plain text format",
  "bodyHtml": "Full reply text in HTML format (optional, can be empty string)",
  "to": ["email@example.com"],
  "cc": []
}

RESPOND ONLY WITH VALID JSON. NO OTHER TEXT BEFORE OR AFTER.`;
}

/**
 * Parse and validate LLM reply response
 */
function parseReplyResponse(
  text: string,
  fallbackTo: string,
  fallbackSubject: string
): LLMReplyGenerationResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/m, '');
      jsonText = jsonText.replace(/\s*```\s*$/m, '');
      jsonText = jsonText.trim();
    }
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    functions.logger.info('Attempting to parse reply JSON:', jsonText.substring(0, 200));

    const parsed = JSON.parse(jsonText);

    // Validate and normalize
    const subject = parsed.subject || `Re: ${fallbackSubject}`;
    const bodyText = parsed.bodyText || '';
    const bodyHtml = parsed.bodyHtml || '';
    const to = Array.isArray(parsed.to) ? parsed.to : [fallbackTo];
    const cc = Array.isArray(parsed.cc) ? parsed.cc : [];

    // Ensure subject starts with Re: if not already
    const finalSubject = subject.startsWith('Re:') || subject.startsWith('RE:') || subject.startsWith('AW:')
      ? subject
      : `Re: ${subject}`;

    functions.logger.info(`Successfully parsed reply: to=${to.length}, subject="${finalSubject.substring(0, 50)}..."`);

    return {
      subject: finalSubject,
      bodyText,
      bodyHtml,
      to,
      cc,
    };
  } catch (error) {
    functions.logger.error('Error parsing reply response:', error);
    functions.logger.error('Response text:', text);
    
    // Return fallback
    return getFallbackReply(fallbackTo, fallbackSubject);
  }
}

/**
 * Get fallback reply when LLM fails
 */
function getFallbackReply(to: string, originalSubject: string): LLMReplyGenerationResult {
  return {
    subject: `Re: ${originalSubject}`,
    bodyText: '[TODO: Antwort verfassen]\n\nDie automatische Antwortgenerierung ist fehlgeschlagen. Bitte verfassen Sie die Antwort manuell.\n\nMit freundlichen Grüßen',
    bodyHtml: '',
    to: [to],
    cc: [],
  };
}




