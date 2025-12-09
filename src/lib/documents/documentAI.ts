// ============================================================================
// DOCUMENT AI SERVICE - Client-side integration with Cloud Functions
// ============================================================================

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

export interface AnalyzeDocumentRequest {
  docId: string;
  performOCR?: boolean;
}

export interface AnalyzeDocumentResponse {
  decision: 'stored' | 'needs_review';
  type?: string;
  confidence?: number;
  reason?: string;
  ocrApplied?: boolean;
  extractedData?: Record<string, any>;
}

// Cloud Function callable
const analyzeDocumentFunction = httpsCallable<AnalyzeDocumentRequest, AnalyzeDocumentResponse>(
  functions,
  'analyzeDocument'
);

/**
 * Analyze document using AI (Gemini Vision)
 * This triggers the Cloud Function which:
 * 1. Downloads the file from Storage
 * 2. Extracts text (OCR for images, text extraction for PDFs)
 * 3. Classifies using Gemini AI
 * 4. Updates Firestore with results
 * 
 * @param docId - Document ID to analyze
 * @returns AI analysis result
 */
export async function analyzeDocumentWithAI(docId: string): Promise<AnalyzeDocumentResponse> {
  console.log('[documentAI] Calling Cloud Function analyzeDocument for:', docId);
  
  try {
    const result = await analyzeDocumentFunction({ docId, performOCR: true });
    
    console.log('[documentAI] AI analysis result:', result.data);
    
    return result.data;
  } catch (error: any) {
    console.error('[documentAI] AI analysis failed:', error);
    
    // Parse Firebase error
    let errorMessage = 'AI-Analyse fehlgeschlagen';
    
    if (error.code === 'functions/unauthenticated') {
      errorMessage = 'Sie sind nicht authentifiziert. Bitte melden Sie sich an.';
    } else if (error.code === 'functions/not-found') {
      errorMessage = 'Dokument nicht gefunden.';
    } else if (error.code === 'functions/failed-precondition') {
      errorMessage = 'Gemini API nicht konfiguriert. Bitte kontaktieren Sie den Administrator.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

