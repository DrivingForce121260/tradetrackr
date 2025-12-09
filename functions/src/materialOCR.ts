/**
 * Material OCR - AI-powered invoice scanning for material creation
 * 
 * Analyzes scanned invoices/receipts and extracts material information
 * using Google Gemini Vision API
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

const db = admin.firestore();
const storage = admin.storage();

const AI_SYSTEM_PROMPT = `You are an AI assistant specialized in comprehensive OCR and data extraction from German business documents (invoices, delivery notes, order confirmations).

CRITICAL: Analyze the VISIBLE TEXT and CONTENT in the image, NOT metadata (EXIF, camera settings, etc.).

TASK: Extract ALL information from the document in structured format.

## DOCUMENT IDENTIFICATION
Identify document type by looking for keywords:
- "Rechnung" / "Invoice" → Rechnung
- "Auftragsbestätigung" / "Order Confirmation" → Auftragsbestätigung  
- "Lieferschein" / "Delivery Note" → Lieferschein
- If unclear → Unbekannt

## SUPPLIER INFORMATION (the company that SENT the invoice - usually at top with logo)
CRITICAL: Extract the SENDER/ISSUER address, NOT the recipient/customer address!
- The supplier is the company that created the invoice (usually has logo, header, "Von:" or sender info)
- DO NOT extract the "Rechnungsadresse", "An:", "Kunde:", or recipient address
- Look for company header, logo, or "Absender" information

Extract from SUPPLIER section only:
- Company name (of the invoice sender)
- Street address (of the sender)
- Postal code and city (of the sender)
- Country (of the sender)
- Phone number (Tel., Telefon of sender)
- Email address (of sender)
- Website (of sender)
- Tax number (Steuernummer, St.-Nr. of sender)
- VAT ID (USt-IdNr., VAT-ID, UID of sender)

IGNORE any address labeled as:
- "Rechnungsadresse", "Lieferadresse", "An:", "Kunde:", "Empfänger", "Rechnungsempfänger"

EXAMPLE of correct extraction on a typical invoice:

HEADER (top of page):
  [LOGO] Elektro Mueller GmbH    <- SUPPLIER (extract this!)
  Hauptstrasse 123
  10115 Berlin
  Tel: 030-123456
  info@elektro-mueller.de

MIDDLE SECTION:
  Rechnung an:
  3D Systems GmbH               <- CUSTOMER (DO NOT extract as supplier!)
  Musterweg 456
  12345 Hamburg

In this case, extract ONLY "Elektro Mueller GmbH, Hauptstrasse 123, 10115 Berlin, Tel: 030-123456, info@elektro-mueller.de" as supplier information.

## DOCUMENT METADATA
Extract:
- Document number (Rechnungsnr., Lieferscheinnr., Auftragsnr.)
- Document date (Rechnungsdatum, Lieferdatum, Datum)
- Customer number (Kundennummer, Kunden-Nr.)
- Order date (Bestelldatum)
- Order number (Bestellnummer)

## LINE ITEMS (ALL products/materials)
For EACH line item, extract:
- Product name/description
- Article/item number (Art.-Nr., Artikelnr., Item No.)
- Quantity
- Unit (Stk, Stück, m, kg, Karton, Paar, etc.)
- Unit price (Einzelpreis, Preis/Einheit)
- Total line price (Gesamtpreis, Betrag)
- Category (if mentioned: Kabel, Schalter, Leuchte, etc.)
- Additional specs (color, size, model, etc.)

## FINANCIAL TOTALS
Extract:
- Subtotal (Zwischensumme, Netto)
- Tax rate (MwSt., USt. - usually 19% or 7%)
- Tax amount (Steuerbetrag)
- Grand total (Gesamtbetrag, Brutto)

## BANK DETAILS (usually at bottom)
Extract:
- Bank name
- IBAN
- BIC/SWIFT

## MISSING DATA HANDLING
- If a field is not visible/readable, use empty string "" or 0
- Add a note to the "notes" array describing what is missing
- Example: "Lieferantenkontaktdaten nicht sichtbar"
- Example: "Steuernummer fehlt"

RESPOND with valid JSON in this EXACT format:
{
  "materials": [
    {
      "name": "Product name",
      "supplier": "Supplier company name",
      "itemNumber": "ART-12345",
      "quantity": 5,
      "unit": "Stk",
      "unitPrice": 12.50,
      "totalPrice": 62.50,
      "category": "Elektroinstallation",
      "description": "Additional specs",
      "confidence": 0.95
    }
  ],
  "documentInfo": {
    "documentType": "Rechnung",
    "documentNumber": "RE-2025-0042",
    "documentDate": "2025-01-15",
    "customerNumber": "KD-789",
    "orderDate": "2025-01-10",
    "orderNumber": "BST-456"
  },
  "supplierInfo": {
    "name": "Elektro Müller GmbH",
    "street": "Hauptstraße 123",
    "postalCode": "10115",
    "city": "Berlin",
    "country": "Deutschland",
    "phone": "+49 30 12345678",
    "email": "info@elektro-mueller.de",
    "website": "www.elektro-mueller.de",
    "taxNumber": "DE123456789",
    "vatNumber": "DE987654321"
  },
  "bankDetails": {
    "bankName": "Sparkasse Berlin",
    "iban": "DE89370400440532013000",
    "bic": "COBADEFFXXX"
  },
  "totals": {
    "subtotal": 100.00,
    "taxRate": 19,
    "taxAmount": 19.00,
    "total": 119.00
  },
  "notes": [
    "Bestellnummer nicht auf Dokument sichtbar",
    "Email-Adresse nicht lesbar"
  ]
}

RULES:
- Extract ALL line items (3 items → 3 entries in materials array)
- DO NOT make up data
- Confidence: 0.9-1.0 (clear), 0.7-0.9 (partial), 0.5-0.7 (unclear)
- For missing fields: use "" or 0, and add note
- Always respond with valid JSON only, no explanations`;

interface MaterialOCRResult {
  materials: Array<{
    name: string;
    supplier: string;
    itemNumber: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    category: string;
    description: string;
    confidence: number;
  }>;
  documentInfo: {
    documentType: 'Rechnung' | 'Auftragsbestätigung' | 'Lieferschein' | 'Unbekannt';
    documentNumber: string;
    documentDate: string;
    customerNumber: string;
    orderDate: string;
    orderNumber: string;
  };
  supplierInfo: {
    name: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    taxNumber: string;
    vatNumber: string;
  };
  bankDetails: {
    bankName: string;
    iban: string;
    bic: string;
  };
  totals: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  };
  notes: string[]; // Missing or unclear fields
}

/**
 * Analyze image or PDF using Gemini Vision
 */
export const analyzeMaterialInvoice = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { filePath, concernID } = data;

  if (!filePath || !concernID) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: filePath, concernID');
  }

  // Verify user has permission
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData || userData.concernID !== concernID) {
    throw new functions.https.HttpsError('permission-denied', 'User does not belong to this concern');
  }

  // Get Gemini API key
  const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
  }

  try {
    console.log('📥 Downloading file from Storage:', filePath);
    
    // Download file from Storage
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    const [fileBuffer] = await file.download();
    const [metadata] = await file.getMetadata();
    
    console.log('📄 File metadata:', { contentType: metadata.contentType, size: metadata.size });

    // Convert to base64
    const base64Data = fileBuffer.toString('base64');
    const mimeType = metadata.contentType || 'image/jpeg';

    console.log('🤖 Calling Gemini Vision API...');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Prepare the request with vision
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: AI_SYSTEM_PROMPT },
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

    console.log('📝 AI Response (first 500 chars):', text.substring(0, 500));

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

    const parsed: MaterialOCRResult = JSON.parse(jsonText);

    console.log('✅ Parsed materials:', parsed.materials?.length || 0);

    // Validate required invoice fields (German §14 UStG)
    if (!parsed.notes) parsed.notes = [];
    
    // Supplier mandatory fields
    if (!parsed.supplierInfo?.name) parsed.notes.push('Pflichtangabe fehlt: Vollständiger Name des Lieferanten');
    if (!parsed.supplierInfo?.street) parsed.notes.push('Pflichtangabe fehlt: Anschrift des Lieferanten (Straße)');
    if (!parsed.supplierInfo?.postalCode || !parsed.supplierInfo?.city) {
      parsed.notes.push('Pflichtangabe fehlt: Vollständige Anschrift des Lieferanten (PLZ und Ort)');
    }
    if (!parsed.supplierInfo?.vatNumber && !parsed.supplierInfo?.taxNumber) {
      parsed.notes.push('Pflichtangabe fehlt: Steuernummer oder USt-IdNr. des Lieferanten');
    }
    
    // Document mandatory fields
    if (!parsed.documentInfo?.documentNumber) {
      parsed.notes.push('Pflichtangabe fehlt: Fortlaufende Rechnungsnummer');
    }
    if (!parsed.documentInfo?.documentDate) {
      parsed.notes.push('Pflichtangabe fehlt: Ausstellungsdatum der Rechnung');
    }
    
    // Totals validation
    if (!parsed.totals?.taxRate || parsed.totals.taxRate === 0) {
      parsed.notes.push('Pflichtangabe fehlt: Steuersatz (MwSt. in %)');
    }
    if (!parsed.totals?.taxAmount || parsed.totals.taxAmount === 0) {
      parsed.notes.push('Pflichtangabe fehlt: Steuerbetrag (MwSt. in EUR)');
    }
    if (!parsed.totals?.subtotal || parsed.totals.subtotal === 0) {
      parsed.notes.push('Pflichtangabe fehlt: Netto-Betrag');
    }
    if (!parsed.totals?.total || parsed.totals.total === 0) {
      parsed.notes.push('Pflichtangabe fehlt: Brutto-Gesamtbetrag');
    }
    
    // Materials/Line items validation
    if (!parsed.materials || parsed.materials.length === 0) {
      parsed.notes.push('Pflichtangabe fehlt: Leistungsbeschreibung (keine Positionen gefunden)');
    }
    // Note: Material field validation is handled visually in the UI table (red highlighting)
    
    console.log('⚠️ Validation notes:', parsed.notes.length);

    // Log the analysis for audit
    await db.collection('audits').add({
      entityType: 'material_ocr',
      action: 'ANALYZE',
      actorId: context.auth.uid,
      actorName: userData.displayName || userData.email || 'Unknown',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      concernID,
      metadata: {
        materialsFound: parsed.materials?.length || 0,
        documentNumber: parsed.documentInfo?.documentNumber,
        supplier: parsed.supplierInfo?.name,
        filePath
      }
    });

    // Clean up uploaded file
    try {
      await file.delete();
      console.log('🗑️ Temporary file deleted');
    } catch (cleanupError) {
      console.warn('⚠️ Could not delete temporary file:', cleanupError);
    }

    return {
      success: true,
      data: parsed
    };
  } catch (error: any) {
    console.error('❌ Material OCR error:', error);
    throw new functions.https.HttpsError('internal', `OCR analysis failed: ${error.message}`);
  }
});

