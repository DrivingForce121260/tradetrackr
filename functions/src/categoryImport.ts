/**
 * AI Category 2 Import Functions
 * Handles AI-assisted import of Category Type 2 data
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as ExcelJS from 'exceljs';
import * as Papa from 'papaparse';
import pdf from 'pdf-parse';
import { z } from 'zod';
import { getStorage } from 'firebase-admin/storage';
import { Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin Storage
const storage = getStorage();

// AI Schema for validation
const AICategory2PayloadSchema = z.object({
  category: z.object({
    title: z.string().min(1),
    slug: z.string().optional(),
    notes: z.string().optional(),
  }),
  options: z.array(
    z.object({
      familyID: z.string().min(1),
      key: z.string().min(1),
      label: z.string().min(1),
      order: z.number().optional(),
      attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    })
  ).min(1),
  warnings: z.array(z.string()).optional(),
});

type AICategory2Payload = z.infer<typeof AICategory2PayloadSchema>;

// Constants
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_FAMILIES = 20; // Increased limit for larger files
const MAX_OPTIONS = 500; // Increased limit for larger files
const JOB_EXPIRY_HOURS = 24;

// AI Prompt
const AI_SYSTEM_PROMPT = `Convert semi-structured files into valid JSON for a Category-2 catalog.

CRITICAL: Output ONLY valid JSON. No markdown, no comments, no code blocks, no explanations.

Required JSON structure:
{
  "category": {
    "title": "string",
    "slug": "string (optional)",
    "notes": "string (optional)"
  },
  "options": [
    {
      "familyID": "string",
      "key": "string",
      "label": "string",
      "order": number (optional),
      "attributes": object (optional)
    }
  ],
  "warnings": ["string"] (optional)
}

Rules:
- Identify logical families (familyID) from headings, columns, or recurring patterns.
- Generate stable machine 'key' from label: lowercase, kebab-case, ASCII, unique within its family.
- Preserve human labels in 'label'.
- Infer 'attributes' only if they appear explicit in the source.
- Use ONLY valid JSON syntax: all property names in double quotes, no trailing commas.

Output ONLY the JSON object, nothing else.`;

/**
 * Detect file type from extension and content
 */
function detectFileType(fileName: string, buffer: Buffer): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  if (['pdf'].includes(ext)) return 'pdf';
  if (['csv'].includes(ext)) return 'csv';
  if (['xlsx', 'xls'].includes(ext)) return 'excel';
  if (['json'].includes(ext)) return 'json';
  if (['txt'].includes(ext)) return 'txt';
  if (['xml'].includes(ext)) return 'xml';
  
  // Sniff content
  if (buffer.slice(0, 4).toString() === '%PDF') return 'pdf';
  if (buffer.slice(0, 2).toString() === 'PK') return 'excel'; // ZIP-based
  if (buffer.slice(0, 5).toString().startsWith('<?xml')) return 'xml';
  if (buffer.slice(0, 5).toString().startsWith('<xml')) return 'xml';
  
  return 'text';
}

/**
 * Parse file content based on type
 */
async function parseFileContent(fileName: string, buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType) {
    case 'csv':
      const csvResult = Papa.parse(buffer.toString('utf-8'), {
        header: false,
        skipEmptyLines: true,
      });
      return csvResult.data.map((row: any) => {
        if (Array.isArray(row)) {
          return row.join(',');
        }
        return String(row);
      }).join('\n');
    
    case 'excel':
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any); // Type compatibility fix
      const worksheet = workbook.worksheets[0];
      
      // Convert worksheet to CSV format
      let csvOutput = '';
      worksheet.eachRow((row, rowNumber) => {
        const values = row.values as any[];
        // Skip the first element (index 0) as ExcelJS includes it as undefined
        const rowData = values.slice(1).map(cell => {
          if (cell === null || cell === undefined) return '';
          // Handle rich text
          if (typeof cell === 'object' && cell.richText) {
            return cell.richText.map((t: any) => t.text).join('');
          }
          return String(cell);
        });
        csvOutput += rowData.join(',') + '\n';
      });
      
      return csvOutput;
    
    case 'pdf':
      const pdfData = await pdf(buffer);
      return pdfData.text;
    
    case 'json':
      try {
        const json = JSON.parse(buffer.toString('utf-8'));
        return JSON.stringify(json, null, 2);
      } catch {
        return buffer.toString('utf-8');
      }
    
    case 'xml':
      // Parse XML to text format for AI analysis
      const xmlText = buffer.toString('utf-8');
      // Remove XML processing instructions and comments
      let cleanedXml = xmlText
        .replace(/<\?xml[^>]*\?>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();
      
      // Convert XML to a more readable format
      // This is a simple XML to text converter
      let textOutput = '';
      const lines = cleanedXml.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Extract tag names and values
        const tagMatch = trimmed.match(/<([^>]+)>/);
        if (tagMatch && !trimmed.startsWith('</')) {
          const content = trimmed.replace(/<[^>]*>/g, '').trim();
          if (content) {
            const tagName = tagMatch[1].split(/\s+/)[0];
            textOutput += `${tagName}: ${content}\n`;
          }
        }
      }
      
      return textOutput || cleanedXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    default:
      return buffer.toString('utf-8');
  }
}

/**
 * Call Gemini AI to analyze content
 */
async function analyzeWithAI(content: string): Promise<AICategory2Payload> {
  // Support both new (environment variables) and legacy (functions.config) methods
  const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `${AI_SYSTEM_PROMPT}\n\nFile content:\n${content.substring(0, 100000)}`; // Limit to 100k chars

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from response (may have markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '');
    }
    
    // Try to fix common JSON issues
    jsonText = jsonText
      // Remove trailing commas before closing braces/brackets
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix unquoted property names
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Remove any control characters that might cause issues
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();
    
    console.log('Parsing JSON response, length:', jsonText.length);
    
    // Try to find JSON object in the text if it's wrapped
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonText);
    return AICategory2PayloadSchema.parse(parsed);
  } catch (error: any) {
    console.error('AI parsing error:', error.message);
    throw new functions.https.HttpsError('internal', `AI analysis failed: ${error.message}`);
  }
}


/**
 * Validate payload
 */
function validatePayload(payload: AICategory2Payload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check category title
  if (!payload.category.title || payload.category.title.trim().length === 0) {
    errors.push('Category title is required');
  }

  // Check options count
  if (payload.options.length === 0) {
    errors.push('At least one option is required');
  }
  if (payload.options.length > MAX_OPTIONS) {
    errors.push(`Maximum ${MAX_OPTIONS} options allowed, found ${payload.options.length}`);
  }

  // Check families count
  const uniqueFamilies = new Set(payload.options.map(opt => opt.familyID));
  if (uniqueFamilies.size > MAX_FAMILIES) {
    errors.push(`Maximum ${MAX_FAMILIES} families allowed, found ${uniqueFamilies.size}`);
  }

  // Check uniqueness of [familyID, key] pairs
  const keyMap = new Map<string, Set<string>>();
  for (const opt of payload.options) {
    if (!keyMap.has(opt.familyID)) {
      keyMap.set(opt.familyID, new Set());
    }
    const keys = keyMap.get(opt.familyID)!;
    if (keys.has(opt.key)) {
      errors.push(`Duplicate key "${opt.key}" in family "${opt.familyID}"`);
    }
    keys.add(opt.key);
  }

  // Check for empty labels
  for (const opt of payload.options) {
    if (!opt.label || opt.label.trim().length === 0) {
      errors.push('All options must have non-empty labels');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * aiCategory2Import - Analyzes uploaded file and returns preview
 */
export const aiCategory2Import = functions.https.onCall(async (data, context) => {
  // Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { filePath, userId, projectId } = data;

  if (!filePath || !userId) {
    throw new functions.https.HttpsError('invalid-argument', 'filePath and userId are required');
  }

  if (userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'User can only import their own files');
  }

  try {
    // Download file from Storage
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new functions.https.HttpsError('not-found', 'File not found in storage');
    }

    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) > MAX_FILE_SIZE) {
      throw new functions.https.HttpsError('invalid-argument', `File size exceeds ${MAX_FILE_SIZE} bytes`);
    }

    const buffer = await file.download();
    const fileBuffer = Buffer.concat(buffer);

    // Detect and parse file
    const fileName = filePath.split('/').pop() || '';
    const fileType = detectFileType(fileName, fileBuffer);
    const content = await parseFileContent(fileName, fileBuffer, fileType);

    // Analyze with AI
    const payload = await analyzeWithAI(content);

    // Validate
    const validation = validatePayload(payload);
    if (!validation.valid) {
      throw new functions.https.HttpsError('invalid-argument', `Validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate job ID
    const jobId = admin.firestore().collection('imports').doc().id;

    // Calculate stats
    const uniqueFamilies = new Set(payload.options.map(opt => opt.familyID));
    const stats = {
      familiesCount: uniqueFamilies.size,
      optionsCount: payload.options.length,
      warningsCount: payload.warnings?.length || 0,
    };

    // Store job in Firestore
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + JOB_EXPIRY_HOURS * 60 * 60 * 1000));
    await admin.firestore().collection('imports').doc(jobId).set({
      jobId,
      preview: payload,
      stats,
      sourceFile: filePath,
      ownerId: userId,
      projectId: projectId || null,
      createdAt: Timestamp.now(),
      expiresAt,
    });

    return {
      jobId,
      preview: payload,
      stats,
    };
  } catch (error: any) {
    console.error('AI Import error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Import failed: ${error.message}`);
  }
});

/**
 * aiCategory2Commit - Commits the analyzed preview to Firestore
 */
export const aiCategory2Commit = functions.https.onCall(async (data, context) => {
  // Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId, applyMode, concernID, categoryName } = data;

  if (!jobId || !applyMode || !categoryName) {
    throw new functions.https.HttpsError('invalid-argument', 'jobId, applyMode, and categoryName are required');
  }

  if (!['upsert', 'insertOnly'].includes(applyMode)) {
    throw new functions.https.HttpsError('invalid-argument', 'applyMode must be "upsert" or "insertOnly"');
  }

  try {
    // Load job
    const jobDoc = await admin.firestore().collection('imports').doc(jobId).get();

    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Import job not found');
    }

    const jobData = jobDoc.data()!;

    // Check ownership
    if (jobData.ownerId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'User can only commit their own imports');
    }

    // Check expiry
    const now = Timestamp.now();
    if (jobData.expiresAt.toMillis() < now.toMillis()) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Import job has expired');
    }

    // Check if already committed
    if (jobData.committedAt) {
      throw new functions.https.HttpsError('failed-precondition', 'Import job already committed');
    }

    const preview: AICategory2Payload = jobData.preview;
    
    // Get concernID from request or job data
    const concernId = concernID || jobData.concernID || jobData.projectId || 'default-concern';
    
    if (!concernId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernID is required for Category Type 2');
    }

    // Create a single family for all options - ignore AI's family grouping
    const familyId = categoryName; // Use the category name as the family ID
    
    // Create lookupFamilies document for this single category
    const batch = admin.firestore().batch();
    let familiesCreated = 0;
    let optionsCreated = 0;
    let optionsUpdated = 0;
    
    // Determine level0, level1, level2 from attributes or use defaults
    let level0 = 'Level 0';
    let level1 = 'Level 1';
    let level2 = 'Level 2';
    
    if (preview.options[0]?.attributes) {
      const attrs = preview.options[0].attributes;
      if (attrs.level0) level0 = String(attrs.level0);
      if (attrs.level1) level1 = String(attrs.level1);
      if (attrs.level2) level2 = String(attrs.level2);
    }

    // Create single lookupFamilies entry
    const familyRef = admin.firestore().collection('lookupFamilies').doc();
    batch.set(familyRef, {
      concernId,
      familyId,
      familyName: categoryName,
      level0,
      level1,
      level2,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: 1,
    });
    
    familiesCreated = 1;
    
    // Now create lookupOptions for all options under this single family
    for (let idx = 0; idx < preview.options.length; idx++) {
      const option = preview.options[idx];
      const lookupOptionId = `${familyId}_${option.key}_${idx}`;
      const lookupOptionRef = admin.firestore().collection('lookupOptions').doc(lookupOptionId);
      
      // Map the option to the lookupOptions structure
      const lookupData = {
        concernId,
        familyId,
        key: option.key,
        level: 1, // Default level, can be adjusted based on attributes
        order: idx + 1,
        parent_Type: level0,
        value: option.label,
        valueNumber: typeof option.attributes?.value === 'number' ? option.attributes.value : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      // Update level if specified in attributes
      if (option.attributes?.level) {
        lookupData.level = Number(option.attributes.level);
      }
      
      if (applyMode === 'upsert') {
        const existing = await lookupOptionRef.get();
        if (existing.exists) {
          batch.update(lookupOptionRef, {
            value: option.label,
            valueNumber: lookupData.valueNumber,
            order: idx + 1,
            updatedAt: Timestamp.now(),
          });
          optionsUpdated++;
        } else {
          batch.set(lookupOptionRef, lookupData);
          optionsCreated++;
        }
      } else {
        // insertOnly
        const existing = await lookupOptionRef.get();
        if (!existing.exists) {
          batch.set(lookupOptionRef, lookupData);
          optionsCreated++;
        }
      }
    }

    // Commit batch
    await batch.commit();

    // Mark job as committed
    const committedCounts = {
      familiesCreated,
      optionsCreated,
      optionsUpdated,
    };

    await admin.firestore().collection('imports').doc(jobId).update({
      committedAt: Timestamp.now(),
      committedCounts,
    });

    return {
      committedCounts,
    };
  } catch (error: any) {
    console.error('AI Commit error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Commit failed: ${error.message}`);
  }
});
