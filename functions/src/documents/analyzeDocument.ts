/**
 * Cloud Function: Analyze Document with AI
 * 
 * Performs OCR (if needed) and AI classification.
 * Only called when user explicitly requests it.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

const db = admin.firestore();
const storage = admin.storage();

// AI Prompt for document classification
const DOCUMENT_CLASSIFICATION_PROMPT = `You are an AI assistant specialized in classifying German business documents.

TASK: Analyze the document and determine its type from this list:

**PROJECT DOCUMENTS:**
- project.site_daily_report: Tagesbericht, Baustellenbericht, Daily Report
- project.task_work_order: Arbeitsauftrag, Work Order
- project.handover: Übergabeprotokoll, Projektübergabe, Handover Protocol
- project.change_order: Änderungsauftrag, Nachtrag, Change Order
- project.risk_assessment: Gefährdungsbeurteilung, Risk Assessment

**PERSONNEL DOCUMENTS:**
- personnel.timesheet: Stundenzettel, Arbeitszeitnachweis, Timesheet
- personnel.travel_log: Fahrtenbuch, Reisekosten, Travel Log
- personnel.expense_claim: Spesenabrechnung, Auslagen, Expense Claim

**MATERIAL DOCUMENTS:**
- material.requisition: Materialanforderung, Material Request
- material.delivery_note: Lieferschein, Delivery Note
- material.goods_receipt: Wareneingang, Goods Receipt
- material.inventory_sheet: Inventarliste, Bestandsliste, Inventory

**CLIENT DOCUMENTS:**
- client.offer_quote: Angebot, Kostenvoranschlag, Quote
- client.contract: Vertrag, Contract
- client.invoice: Rechnung, Invoice
- client.credit_note: Gutschrift, Credit Note
- client.acceptance_report: Abnahmeprotokoll, Acceptance Report

**QUALITY DOCUMENTS:**
- quality.commissioning_report: Inbetriebnahmeprotokoll, Commissioning Report
- quality.measurement_test: Mess- und Prüfprotokoll, VDE-Protokoll, Test Report
- quality.maintenance_log: Wartungsprotokoll, Maintenance Log
- quality.photo_doc: Foto-Dokumentation, Photo Documentation

**COMPLIANCE DOCUMENTS:**
- compliance.certificate: Zertifikat, Certificate
- compliance.insurance: Versicherungsnachweis, Insurance Document
- compliance.vehicle_equipment_inspection: TÜV, UVV-Prüfung, Vehicle Inspection
- compliance.training_record: Schulungsnachweis, Training Certificate
- compliance.gdpr_consent: DSGVO-Einwilligung, GDPR Consent

INSTRUCTIONS:
1. Read ALL visible text in the document
2. Look for keywords, document structure, headers, form fields
3. Identify the most likely document type
4. Provide confidence score (0.0 to 1.0)
5. NEVER guess - if unclear, return confidence < 0.6

RESPONSE FORMAT (JSON only):
{
  "type": "client.invoice",
  "confidence": 0.95,
  "reason": "Document contains 'Rechnungsnummer', invoice line items, and total amount. Clear invoice structure.",
  "extractedKeywords": ["Rechnung", "Rechnungsnummer", "Gesamtbetrag"],
  "extractedData": {
    // Common fields (for all types)
    "documentNumber": "RE-2025-001",
    "documentDate": "2025-11-04",
    "description": "Extracted description or subject",
    
    // Type-specific fields (extract based on document type):
    // For invoices/quotes/delivery notes:
    "supplierName": "Company Name",
    "customerName": "Customer Name",
    "totalAmount": 1234.56,
    "lineItems": [
      {"description": "Item 1", "quantity": 2, "unitPrice": 10.50, "total": 21.00}
    ],
    
    // For timesheets/personnel:
    "employeeName": "John Doe",
    "period": "KW 45 2025",
    "totalHours": 40.0,
    
    // For project documents:
    "projectName": "Project XYZ",
    "projectNumber": "P-2025-001",
    "location": "Baustelle ABC",
    
    // Add any other relevant fields found in the document
  }
}

EXTRACTION RULES:
- Extract ALL visible data that might be relevant
- For invoices: supplier, customer, items, amounts, dates, numbers
- For timesheets: employee, period, hours, dates
- For delivery notes: supplier, items, quantities, delivery date
- For contracts: parties, contract number, effective date, term
- For certificates: holder, issuer, valid from/to, certificate number
- Always include documentNumber and documentDate if found
- Use null for fields not found

CRITICAL RULES:
- Confidence ≥ 0.85 → Accept
- Confidence < 0.85 → User must choose manually
- DO NOT make up data
- If multiple types possible, choose most likely and explain in reason
- Always respond with valid JSON only`;


interface AnalyzeDocumentRequest {
  docId: string;
  performOCR?: boolean;
}

interface AnalyzeDocumentResponse {
  decision: 'stored' | 'needs_review';
  type?: string;
  confidence?: number;
  reason?: string;
  ocrApplied?: boolean;
  extractedData?: Record<string, any>;
}

export const analyzeDocument = functions.https.onCall(
  async (data: AnalyzeDocumentRequest, context): Promise<AnalyzeDocumentResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { docId, performOCR = true } = data;

    try {
      // Fetch document
      const docsQuery = await db.collection('documents')
        .where('docId', '==', docId)
        .limit(1)
        .get();

      if (docsQuery.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          'Document not found'
        );
      }

      const docRef = docsQuery.docs[0].ref;
      const docData = docsQuery.docs[0].data();

      console.log('[analyzeDocument] Processing document:', { docId, mimeType: docData.mimeType });

      // Update status to processing
      await docRef.update({ status: 'ai_processing' });

      // Get Gemini API key
      const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
      if (!apiKey) {
        console.error('[analyzeDocument] Gemini API key not configured');
        await docRef.update({ status: 'needs_review' });
        throw new functions.https.HttpsError(
          'failed-precondition', 
          'Gemini API key not configured. Please set GEMINI_API_KEY in environment.'
        );
      }

      // Extract storage path (remove gs:// prefix and bucket name)
      const storagePath = docData.storagePath.replace(/^gs:\/\/[^\/]+\//, '');
      
      console.log('[analyzeDocument] Downloading file from Storage:', storagePath);
      
      // Download file from Storage
      const bucket = storage.bucket();
      const file = bucket.file(storagePath);
      const [fileBuffer] = await file.download();
      const [metadata] = await file.getMetadata();
      
      console.log('[analyzeDocument] File metadata:', { 
        contentType: metadata.contentType, 
        size: metadata.size 
      });

      // Convert to base64
      const base64Data = fileBuffer.toString('base64');
      const mimeType = metadata.contentType || docData.mimeType;

      console.log('[analyzeDocument] Calling Gemini Vision API...');

      // Call Gemini API
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Prepare the request with vision
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: DOCUMENT_CLASSIFICATION_PROMPT },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            }
          ]
        }]
      });

      const response = result.response;
      const text = response.text().trim();

      console.log('[analyzeDocument] AI Response:', text.substring(0, 500));

      // Extract JSON from response
      let jsonText = text;
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '');
      }

      // Clean up JSON
      jsonText = jsonText
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim();

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const aiResult = JSON.parse(jsonText);

      console.log('[analyzeDocument] Parsed AI result:', aiResult);

      // Store OCR text sample if extracted
      const extractedKeywords = aiResult.extractedKeywords || [];
      const textSample = extractedKeywords.join(' ').substring(0, 5000);
      const extractedData = aiResult.extractedData || {};

      // Update document with AI decision
      const updates: any = {
        aiDecision: {
          model: 'gemini-2.0-flash-exp',
          reason: aiResult.reason || 'AI classification completed',
          extractedData: extractedData // Store all extracted fields
        },
        'meta.ocrApplied': true,
        'meta.textSample': textSample
      };

      // Store document number and date if found
      if (extractedData.documentNumber) {
        updates['meta.number'] = extractedData.documentNumber;
      }
      if (extractedData.documentDate) {
        updates['meta.date'] = extractedData.documentDate;
      }

      if (aiResult.confidence >= 0.85 && aiResult.type) {
        // High confidence - auto-store
        updates.type = aiResult.type;
        updates.typeConfidence = aiResult.confidence;
        updates.status = 'stored';
        
        console.log('[analyzeDocument] High confidence, auto-storing as:', aiResult.type);
      } else {
        // Low confidence - needs manual review
        if (aiResult.type) {
          updates.type = aiResult.type;
          updates.typeConfidence = aiResult.confidence;
        }
        updates.status = 'needs_review';
        
        console.log('[analyzeDocument] Low confidence, needs manual review');
      }

      await docRef.update(updates);

      return {
        decision: updates.status,
        type: aiResult.type,
        confidence: aiResult.confidence,
        reason: aiResult.reason,
        ocrApplied: true,
        extractedData: extractedData // Return extracted data to client
      };

    } catch (error: any) {
      console.error('[analyzeDocument] Error:', error);
      
      // Update status to needs_review on error
      try {
        const docsQuery = await db.collection('documents')
          .where('docId', '==', docId)
          .limit(1)
          .get();
        if (!docsQuery.empty) {
          await docsQuery.docs[0].ref.update({ status: 'needs_review' });
        }
      } catch (updateError) {
        console.error('[analyzeDocument] Failed to update status:', updateError);
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to analyze document: ${error.message || 'Unknown error'}`
      );
    }
  }
);


