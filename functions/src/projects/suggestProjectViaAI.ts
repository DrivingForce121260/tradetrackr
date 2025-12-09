/**
 * AI-based Project Suggestion
 * Optional fallback when deterministic rules fail
 * Only suggests - never auto-assigns with low confidence
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProjectLinkDecision } from './linkProject';

const db = admin.firestore();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || functions.config().gemini?.api_key || '');

export async function suggestProjectViaAI(input: {
  orgId: string;
  concernId?: string;
  filename: string;
  textSample?: string | null;
  docType?: string | null;
  existingCandidates?: Array<{ projectId: string; projectName: string; confidence: number }>;
}): Promise<ProjectLinkDecision> {
  
  const concernId = input.concernId || input.orgId;
  
  try {
    // Get available projects
    const projectsSnapshot = await db.collection('projects')
      .where('concernID', '==', concernId)
      .where('projectStatus', '==', 'active')
      .limit(100)
      .get();

    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().projectName,
      number: doc.data().projectNumber,
      customer: doc.data().projectCustomer,
      type: doc.data().type || 'external',
      category: doc.data().internalCategory
    }));

    // Build AI prompt
    const prompt = buildProjectSuggestionPrompt(input, projects);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }

    const aiResult = JSON.parse(jsonMatch[0]);

    // Validate AI response
    if (!aiResult.projectId || !aiResult.confidence) {
      throw new Error('Invalid AI response format');
    }

    // Find full project details
    const suggestedProject = projects.find(p => p.id === aiResult.projectId || p.number === aiResult.projectNumber);

    if (!suggestedProject) {
      functions.logger.warn('AI suggested project not found:', aiResult.projectId);
      return {
        projectId: null,
        confidence: 0,
        source: 'ai',
        reason: 'AI suggestion could not be validated'
      };
    }

    // Only return if confidence is reasonable
    const confidence = parseFloat(aiResult.confidence);
    
    if (confidence < 0.6) {
      return {
        projectId: null,
        confidence,
        source: 'ai',
        candidates: input.existingCandidates || [],
        reason: aiResult.reason || 'AI confidence too low for auto-assignment'
      };
    }

    return {
      projectId: suggestedProject.id,
      confidence,
      source: 'ai',
      reason: aiResult.reason || 'AI-suggested project match'
    };

  } catch (error: any) {
    functions.logger.error('AI project suggestion error:', error);
    
    // Return existing candidates as fallback
    return {
      projectId: null,
      confidence: 0,
      source: 'ai',
      candidates: input.existingCandidates || [],
      reason: `AI error: ${error.message}`
    };
  }
}

function buildProjectSuggestionPrompt(
  input: {
    filename: string;
    textSample?: string | null;
    docType?: string | null;
  },
  projects: Array<{
    id: string;
    name: string;
    number: number;
    customer: string;
    type: string;
    category?: string;
  }>
): string {
  
  const externalProjects = projects.filter(p => p.type !== 'internal');
  const internalProjects = projects.filter(p => p.type === 'internal');

  return `You are an AI assistant helping to link documents to projects.

**TASK:** Analyze this document and determine which project it belongs to.

**DOCUMENT INFORMATION:**
- Filename: ${input.filename}
- Document Type: ${input.docType || 'Unknown'}
${input.textSample ? `- Text Sample:\n${input.textSample.substring(0, 1000)}` : ''}

**AVAILABLE EXTERNAL PROJECTS (Customer Projects):**
${externalProjects.slice(0, 20).map(p => 
  `- Project ${p.number}: "${p.name}" (Customer: ${p.customer}) [ID: ${p.id}]`
).join('\n')}

**AVAILABLE INTERNAL PROJECTS (Non-Customer):**
${internalProjects.map(p => 
  `- ${p.category}: "${p.name}" [ID: ${p.id}]`
).join('\n')}

**INSTRUCTIONS:**
1. Look for project numbers, project names, or customer names in the filename and text
2. Match keywords to determine if it's an internal or external project document
3. For invoices/receipts/HR docs without clear project reference → suggest internal project
4. If a clear external project is identified → return it with high confidence
5. If unclear → return low confidence (<0.6) and explain why

**RESPONSE FORMAT (JSON only):**
{
  "projectId": "project-doc-id-here",
  "projectNumber": 12345,
  "confidence": 0.85,
  "reason": "Project number 12345 found in filename. Customer name matches 'ABC GmbH'.",
  "isInternal": false
}

**CRITICAL RULES:**
- Confidence >= 0.8: Clear match
- Confidence < 0.8: Needs manual review
- If multiple possible projects: Return the most likely one with confidence < 0.7
- Always explain your reasoning
- Respond with valid JSON only`;
}

/**
 * Callable Cloud Function for AI project suggestion
 */
export const suggestProjectWithAI = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { orgId, concernId, filename, textSample, docType, existingCandidates } = data;

    if (!orgId && !concernId) {
      throw new functions.https.HttpsError('invalid-argument', 'orgId or concernId is required');
    }

    if (!filename) {
      throw new functions.https.HttpsError('invalid-argument', 'filename is required');
    }

    const result = await suggestProjectViaAI({
      orgId: orgId || concernId,
      concernId,
      filename,
      textSample,
      docType,
      existingCandidates
    });

    return result;
  });


