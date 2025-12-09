// ============================================================================
// ANALYZE BUSINESS CARD - Cloud Function with OCR + AI
// ============================================================================

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AnalyzeBusinessCardRequest {
  accountId: string;
  imagePath: string;
  documentId: string;
  qrCodeData?: string;
}

interface BusinessCardFields {
  company?: string;
  contact?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
  };
  title?: string;
  department?: string;
  phones?: Array<{ number: string; type: 'work' | 'mobile' | 'other' }>;
  email?: string;
  website?: string;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  extras?: {
    note?: string;
  };
}

interface AnalyzeBusinessCardResponse {
  fields: BusinessCardFields;
  rawText: string;
  confidence: number;
  model: string;
  needs_review: boolean;
}

export const analyzeBusinessCard = functions.https.onCall(
  async (data: AnalyzeBusinessCardRequest, context): Promise<AnalyzeBusinessCardResponse> => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { accountId, imagePath, documentId, qrCodeData } = data;

    if (!accountId || !imagePath || !documentId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    console.log('📱 QR Code data provided:', qrCodeData ? 'Yes' : 'No');

    try {
      // Get image from Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(imagePath);
      
      const [fileBuffer] = await file.download();
      const base64Image = fileBuffer.toString('base64');

      // Initialize Gemini AI
      const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
      
      if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      // Use gemini-pro-vision or gemini-1.5-pro for vision tasks
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      // Add QR code data to prompt if available
      const qrCodeContext = qrCodeData 
        ? `\n\nADDITIONAL INFO: A QR code was detected on this card with the following data:\n${qrCodeData}\n\nPlease incorporate this QR code information into the extracted fields (e.g., if it's a vCard, parse it; if it's a URL, include it as website).`
        : '';

      // Create prompt for business card analysis
      const prompt = `Analyze this business card image and extract the following information in JSON format:

{
  "company": "Company name",
  "contact": {
    "fullName": "Full name of the person",
    "firstName": "First name",
    "lastName": "Last name"
  },
  "title": "Job title/position",
  "department": "Department if mentioned",
  "phones": [
    {"number": "phone number", "type": "work|mobile|other"}
  ],
  "email": "email address",
  "website": "website URL",
  "address": {
    "street": "Street address",
    "postalCode": "Postal/ZIP code",
    "city": "City",
    "country": "Country"
  },
  "rawText": "All text found on the card",
  "confidence": 0.0-1.0
}

Rules:
- Only extract information that is clearly visible
- Use "type": "work" for office phone numbers, "mobile" for cell phones
- Return confidence between 0.0 and 1.0 based on text clarity
- If a field is not visible or unclear, omit it or set to null
- Confidence < 0.8 means needs review
- Format phone numbers as found on the card
- Return valid JSON only, no markdown${qrCodeContext}`;

      // Call Gemini Vision API
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      console.log('Gemini response:', text);

      // Parse JSON response
      let parsedData: any;
      try {
        // Remove markdown code blocks if present
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedData = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new functions.https.HttpsError('internal', 'Failed to parse AI response');
      }

      const confidence = parsedData.confidence || 0.5;
      const needs_review = confidence < 0.8;

      // Extract fields
      const fields: BusinessCardFields = {
        company: parsedData.company,
        contact: parsedData.contact,
        title: parsedData.title,
        department: parsedData.department,
        phones: parsedData.phones,
        email: parsedData.email,
        website: parsedData.website,
        address: parsedData.address,
        extras: {
          note: parsedData.extras?.note
        }
      };

      // Update document in Firestore
      await admin.firestore().doc(`documents/${documentId}`).update({
        status: needs_review ? 'needs_review' : 'processed',
        'meta.ocrApplied': true,
        'meta.textSample': parsedData.rawText?.substring(0, 200),
        'meta.confidence': confidence,
        'meta.aiModel': 'gemini-1.5-pro',
        'meta.extractedFields': fields,
        'meta.qrCodeDetected': !!qrCodeData,
        'meta.qrCodeData': qrCodeData || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        fields,
        rawText: parsedData.rawText || '',
        confidence,
        model: 'gemini-1.5-pro',
        needs_review
      };

    } catch (error: any) {
      console.error('Error analyzing business card:', error);
      
      // Update document status to error
      try {
        await admin.firestore().doc(`documents/${documentId}`).update({
          status: 'error',
          'meta.error': error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (updateError) {
        console.error('Error updating document status:', updateError);
      }

      throw new functions.https.HttpsError('internal', error.message || 'Failed to analyze business card');
    }
  }
);

