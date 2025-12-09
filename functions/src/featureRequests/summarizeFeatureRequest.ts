/**
 * Feature Request AI Summarization
 * Generates structured summary from AI-guided dialog steps using Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import { FeatureRequestDialogStep } from './types';

export interface SummarizeFeatureRequestInput {
  concernId: string;
  userId: string;
  userEmail?: string;
  route: string;
  module?: string;
  entityId?: string;
  steps: FeatureRequestDialogStep[];
  language?: string;
}

export interface SummarizeFeatureRequestOutput {
  title: string;
  description: string;
  useCases: string[];
  category?: string;
  impactRating?: 'low' | 'medium' | 'high';
}

/**
 * Generate AI summary from dialog steps
 */
export async function summarizeFeatureRequest(
  input: SummarizeFeatureRequestInput
): Promise<SummarizeFeatureRequestOutput> {
  try {
    // Get Gemini API key
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    
    if (!apiKey) {
      functions.logger.warn('Gemini API key not configured, using fallback');
      return generateFallbackSummary(input);
    }

    functions.logger.info(`Generating feature request summary for user ${input.userId}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800,
      },
    });

    // Build prompt
    const prompt = buildSummarizationPrompt(input);

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON response
    const summary = parseSummaryResponse(text);
    
    functions.logger.info(`Successfully generated summary: ${summary.title}`);

    return summary;
  } catch (error: any) {
    functions.logger.error('Error generating feature request summary:', error);
    // Fallback to deterministic summary
    return generateFallbackSummary(input);
  }
}

/**
 * Build prompt for Gemini
 */
function buildSummarizationPrompt(input: SummarizeFeatureRequestInput): string {
  const dialogText = input.steps
    .map((step, idx) => `${idx + 1}. ${step.question}\n   Antwort: ${step.answer}`)
    .join('\n\n');

  return `Du bist ein Experte für Software-Anforderungen und Produktmanagement.

Analysiere die folgenden Antworten eines Nutzers zu Fragen über einen Feature-Wunsch für TradeTrackr (ein Bau-/Handwerks-Management-System) und erstelle eine strukturierte Zusammenfassung.

DIALOG:
${dialogText}

KONTEXT:
- Route: ${input.route}
- Modul: ${input.module || 'Nicht angegeben'}
- Entity ID: ${input.entityId || 'Nicht angegeben'}

AUFGABE:
Erstelle eine präzise, umsetzbare Feature-Anforderung mit:

1. **Titel** (max 80 Zeichen): Kurze, prägnante Überschrift
2. **Beschreibung** (5-8 Sätze): Klare Beschreibung des Features, was es tut, für wen es ist, und warum es nützlich ist
3. **Use Cases** (3-5 Bulletpoints): Konkrete Anwendungsfälle, wie das Feature genutzt wird
4. **Kategorie** (optional): Eine der folgenden: "Zeiterfassung", "Projekte", "Dokumente", "Rechnungen", "KI", "Dashboard", "Berichte", "Sonstiges"
5. **Wichtigkeit** (optional): "low", "medium", oder "high" basierend auf den Antworten

REGELN:
- Verwende präzise, technische Sprache
- Fokussiere auf konkrete Funktionalität, nicht auf vage Wünsche
- Die Beschreibung soll für Entwickler verständlich sein
- Use Cases sollen realistisch und spezifisch sein
- Wenn Informationen fehlen, verwende sinnvolle Annahmen basierend auf dem Kontext

ANTWORTE NUR MIT VALIDEM JSON IN DIESEM FORMAT:
{
  "title": "Kurzer Titel (max 80 Zeichen)",
  "description": "Detaillierte Beschreibung in 5-8 Sätzen...",
  "useCases": [
    "Use Case 1",
    "Use Case 2",
    "Use Case 3"
  ],
  "category": "Zeiterfassung",
  "impactRating": "high"
}

KEIN ANDERER TEXT. NUR JSON.`;
}

/**
 * Parse and validate Gemini response
 */
function parseSummaryResponse(text: string): SummarizeFeatureRequestOutput {
  try {
    // Extract JSON from response
    let jsonText = text.trim();
    
    // Remove markdown code blocks
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/m, '');
      jsonText = jsonText.replace(/\s*```\s*$/m, '');
      jsonText = jsonText.trim();
    }
    
    // Extract JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Validate and normalize
    return {
      title: (parsed.title || '').substring(0, 80).trim(),
      description: (parsed.description || '').trim(),
      useCases: Array.isArray(parsed.useCases) 
        ? parsed.useCases.filter((uc: any) => typeof uc === 'string').slice(0, 5)
        : [],
      category: parsed.category || undefined,
      impactRating: ['low', 'medium', 'high'].includes(parsed.impactRating)
        ? parsed.impactRating
        : undefined,
    };
  } catch (error) {
    functions.logger.error('Error parsing summary response:', error);
    functions.logger.error('Response text:', text);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Generate fallback summary when AI is unavailable
 */
function generateFallbackSummary(input: SummarizeFeatureRequestInput): SummarizeFeatureRequestOutput {
  const answers = input.steps.map(s => s.answer).join(' ');
  
  // Extract key information
  const bereich = input.steps.find(s => s.question.includes('Bereich'))?.answer || '';
  const problem = input.steps.find(s => s.question.includes('verbessert'))?.answer || '';
  const ergebnis = input.steps.find(s => s.question.includes('Ergebnis'))?.answer || '';
  
  // Generate title from first meaningful answer
  const title = problem.substring(0, 80) || answers.substring(0, 80) || 'Feature-Anfrage';
  
  // Build description
  const description = [
    problem && `Der Nutzer wünscht: ${problem}`,
    bereich && `Bereich: ${bereich}`,
    ergebnis && `Erwartetes Ergebnis: ${ergebnis}`,
    `Route: ${input.route}`,
    input.module && `Modul: ${input.module}`,
  ].filter(Boolean).join('. ') + '.';

  // Extract use cases from answers
  const useCases = input.steps
    .filter(s => s.answer.length > 20)
    .slice(0, 5)
    .map(s => s.answer.substring(0, 150));

  return {
    title: title.length > 80 ? title.substring(0, 77) + '...' : title,
    description,
    useCases: useCases.length > 0 ? useCases : ['Bitte manuell überprüfen'],
    category: undefined,
    impactRating: undefined,
  };
}







