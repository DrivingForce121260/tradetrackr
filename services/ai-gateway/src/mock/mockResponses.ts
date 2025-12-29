/**
 * Mock AI Responses
 * 
 * Deterministic responses for MOCK mode.
 * Uses hash of input to generate stable outputs.
 */

import * as crypto from 'crypto';
import type {
  SummarizeEmailRequest,
  SummarizeEmailResponse,
  DraftReplyRequest,
  DraftReplyResponse,
  ClassifyDocumentRequest,
  ClassifyDocumentResponse,
} from '../schemas/index.js';

/**
 * Generate a stable hash from input for deterministic responses.
 */
function hashInput(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 8);
}

/**
 * Generate a deterministic number from hash.
 */
function hashToNumber(hash: string, max: number): number {
  const num = parseInt(hash.substring(0, 4), 16);
  return num % max;
}

// ============================================================================
// Mock Email Summaries
// ============================================================================

const MOCK_CATEGORIES: SummarizeEmailResponse['category'][] = [
  'INVOICE', 'ORDER', 'SHIPPING', 'GENERAL'
];

const MOCK_PRIORITIES: SummarizeEmailResponse['priority'][] = [
  'high', 'normal', 'low'
];

const MOCK_SUMMARY_TEMPLATES = {
  INVOICE: [
    'Rechnung erhalten - Prüfung erforderlich',
    'Zahlungserinnerung eingegangen',
    'Lieferantenrechnung zur Freigabe',
  ],
  ORDER: [
    'Bestellung wurde aufgegeben',
    'Materialanfrage eingegangen',
    'Auftragsbestätigung erhalten',
  ],
  SHIPPING: [
    'Lieferung angekündigt',
    'Sendungsverfolgung verfügbar',
    'Paket wurde versandt',
  ],
  GENERAL: [
    'Allgemeine Anfrage erhalten',
    'Informationsanfrage zur Bearbeitung',
    'E-Mail erhalten - manuelle Prüfung',
  ],
};

/**
 * Generate mock email summary response.
 */
export function mockSummarizeEmail(request: SummarizeEmailRequest): SummarizeEmailResponse {
  const hash = hashInput(request.subject + request.bodyText);
  
  const categoryIndex = hashToNumber(hash, MOCK_CATEGORIES.length);
  const category = MOCK_CATEGORIES[categoryIndex];
  
  const priorityIndex = hashToNumber(hash.substring(2), MOCK_PRIORITIES.length);
  const priority = MOCK_PRIORITIES[priorityIndex];
  
  const templates = MOCK_SUMMARY_TEMPLATES[category] || MOCK_SUMMARY_TEMPLATES.GENERAL;
  const bulletIndex = hashToNumber(hash.substring(4), templates.length);
  
  // Generate deterministic confidence
  const confidence = 0.7 + (hashToNumber(hash.substring(6), 30) / 100);
  
  return {
    category,
    confidence: Math.round(confidence * 100) / 100,
    documentTypes: category === 'INVOICE' ? ['INVOICE'] : [],
    summaryBullets: [
      templates[bulletIndex],
      `Betreff: ${request.subject.substring(0, 40)}...`,
    ],
    priority,
  };
}

// ============================================================================
// Mock Reply Drafts
// ============================================================================

const MOCK_REPLY_TEMPLATES = {
  de: {
    neutral: 'Vielen Dank für Ihre Nachricht.\n\nWir werden Ihr Anliegen schnellstmöglich bearbeiten und uns zeitnah bei Ihnen melden.\n\nMit freundlichen Grüßen',
    friendly: 'Herzlichen Dank für Ihre Nachricht!\n\nWir freuen uns über Ihr Interesse und kümmern uns gerne um Ihr Anliegen. Sie hören bald von uns!\n\nBeste Grüße',
    formal: 'Sehr geehrte Damen und Herren,\n\nwir bestätigen den Eingang Ihrer Nachricht und werden diese umgehend bearbeiten.\n\nMit vorzüglicher Hochachtung',
  },
  en: {
    neutral: 'Thank you for your message.\n\nWe will process your request as soon as possible and get back to you shortly.\n\nBest regards',
    friendly: 'Thank you so much for reaching out!\n\nWe appreciate your interest and will be happy to help. You\'ll hear from us soon!\n\nBest wishes',
    formal: 'Dear Sir or Madam,\n\nWe acknowledge receipt of your message and will process it promptly.\n\nYours sincerely',
  },
};

/**
 * Generate mock reply draft response.
 */
export function mockDraftReply(request: DraftReplyRequest): DraftReplyResponse {
  const language = request.language || 'de';
  const tone = request.tone || 'neutral';
  
  const templates = MOCK_REPLY_TEMPLATES[language] || MOCK_REPLY_TEMPLATES.de;
  const bodyText = templates[tone] || templates.neutral;
  
  // Generate subject
  let subject = request.originalSubject;
  if (!subject.toLowerCase().startsWith('re:') && !subject.toLowerCase().startsWith('aw:')) {
    subject = language === 'de' ? `AW: ${subject}` : `Re: ${subject}`;
  }
  
  return {
    subject,
    bodyText,
    bodyHtml: `<p>${bodyText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
    to: [request.originalFrom],
    cc: [],
  };
}

// ============================================================================
// Mock Document Classification
// ============================================================================

const MOCK_DOC_TYPES = [
  { type: 'client.invoice', keywords: ['rechnung', 'invoice', 'betrag', 'zahlung'] },
  { type: 'material.delivery_note', keywords: ['lieferschein', 'delivery', 'lieferung'] },
  { type: 'client.offer_quote', keywords: ['angebot', 'quote', 'offer', 'preis'] },
  { type: 'quality.measurement_test', keywords: ['protokoll', 'prüfung', 'messung'] },
  { type: 'project.site_daily_report', keywords: ['tagesbericht', 'baustelle', 'daily'] },
];

/**
 * Generate mock document classification response.
 */
export function mockClassifyDocument(request: ClassifyDocumentRequest): ClassifyDocumentResponse {
  const textLower = request.text.toLowerCase();
  const filenameLower = (request.filename || '').toLowerCase();
  
  // Find matching document type based on keywords
  for (const docType of MOCK_DOC_TYPES) {
    for (const keyword of docType.keywords) {
      if (textLower.includes(keyword) || filenameLower.includes(keyword)) {
        return {
          type: docType.type,
          confidence: 0.75 + (Math.random() * 0.15),
          reason: `Schlüsselwort "${keyword}" gefunden`,
          model: 'mock-classifier-v1',
        };
      }
    }
  }
  
  // No match - low confidence
  return {
    confidence: 0.3,
    reason: 'Keine eindeutige Klassifizierung möglich',
    model: 'mock-classifier-v1',
  };
}

