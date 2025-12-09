/**
 * Deterministic Project Linking Logic
 * Links documents to projects using rule-based decisions
 * No AI guessing - clear rules only
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

export interface ProjectLinkDecision {
  projectId: string | null;
  confidence: number;  // 0.0 to 1.0
  source: 'context' | 'filename' | 'content' | 'internalRule' | 'ai' | 'default';
  candidates?: Array<{ projectId: string; projectName: string; confidence: number }>;
  reason?: string;
}

export interface LinkInput {
  orgId: string;
  concernId?: string;  // Alias for orgId
  filename: string;
  mimeType: string;
  docType?: string | null;
  textSample?: string | null;
  explicitProjectId?: string | null;
  employeeId?: string | null;
  clientId?: string | null;
}

/**
 * Main function: Determine which project a document belongs to
 */
export async function determineProjectForDocument(input: LinkInput): Promise<ProjectLinkDecision> {
  const concernId = input.concernId || input.orgId;
  
  if (!concernId) {
    throw new Error('orgId or concernId is required');
  }

  functions.logger.info('Determining project for document', { concernId, filename: input.filename });

  // RULE 1: Explicit context - highest priority
  if (input.explicitProjectId) {
    functions.logger.info(`Using explicit projectId: ${input.explicitProjectId}`);
    return {
      projectId: input.explicitProjectId,
      confidence: 1.0,
      source: 'context',
      reason: 'Explicitly assigned project ID'
    };
  }

  // RULE 2: Document type-based internal routing
  const typeBasedResult = await routeByDocumentType(concernId, input.docType, input.filename);
  if (typeBasedResult.projectId) {
    return typeBasedResult;
  }

  // RULE 3: Filename pattern matching (project numbers, codes)
  const filenameResult = await routeByFilename(concernId, input.filename);
  if (filenameResult.projectId && filenameResult.confidence >= 0.7) {
    return filenameResult;
  }

  // RULE 4: Content keywords (if textSample available)
  if (input.textSample) {
    const contentResult = await routeByContent(concernId, input.textSample, input.filename);
    if (contentResult.projectId && contentResult.confidence >= 0.7) {
      return contentResult;
    }
  }

  // RULE 5: Get candidates for manual review
  const candidates = await findProjectCandidates(concernId, input.filename, input.textSample);
  
  if (candidates.length > 0) {
    return {
      projectId: null,
      confidence: 0.5,
      source: 'filename',
      candidates,
      reason: 'Multiple possible projects found - needs manual review'
    };
  }

  // RULE 6: Default fallback - Admin internal project
  const defaultProjectId = `${concernId}-internal-admin`;
  return {
    projectId: defaultProjectId,
    confidence: 0.4,
    source: 'default',
    reason: 'No clear match found - assigned to Admin for review'
  };
}

/**
 * Route by document type to internal projects
 */
async function routeByDocumentType(
  concernId: string,
  docType: string | null | undefined,
  filename: string
): Promise<ProjectLinkDecision> {
  
  if (!docType) {
    return { projectId: null, confidence: 0, source: 'internalRule' };
  }

  const typeToCategory: Record<string, string> = {
    // Personnel documents
    'personnel.timesheet': 'personnel',
    'personnel.travel_log': 'personnel',
    'personnel.expense_claim': 'personnel',
    
    // Finance documents (default to finance unless clearly customer-related)
    'client.invoice': 'finance',  // Incoming invoices go to finance
    'material.delivery_note': 'finance',
    'material.requisition': 'finance',
    'material.goods_receipt': 'finance',
    'material.inventory_sheet': 'finance',
    
    // Compliance documents
    'compliance.certificate': 'compliance',
    'compliance.insurance': 'compliance',
    'compliance.vehicle_equipment_inspection': 'compliance',
    'compliance.training_record': 'training',
    'compliance.gdpr_consent': 'compliance',
    
    // Training
    'personnel.training_record': 'training',
  };

  const category = typeToCategory[docType];
  
  if (category) {
    const projectId = `${concernId}-internal-${category}`;
    
    // Check if project exists
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (projectDoc.exists) {
      return {
        projectId,
        confidence: 0.9,
        source: 'internalRule',
        reason: `Document type '${docType}' automatically routed to ${category} internal project`
      };
    }
  }

  return { projectId: null, confidence: 0, source: 'internalRule' };
}

/**
 * Route by filename patterns (project numbers, codes)
 */
async function routeByFilename(concernId: string, filename: string): Promise<ProjectLinkDecision> {
  
  // Extract potential project numbers from filename
  // Common patterns: "P-12345", "PR-123", "Project 456", "12345-document"
  const patterns = [
    /P-?(\d{3,6})/i,
    /PR-?(\d{3,6})/i,
    /Project[_\s-]?(\d{3,6})/i,
    /^(\d{3,6})[_-]/,
    /Projekt[_\s-]?(\d{3,6})/i
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      const projectNumber = parseInt(match[1], 10);
      
      // Search for project by number
      const projectsSnapshot = await db.collection('projects')
        .where('concernID', '==', concernId)
        .where('projectNumber', '==', projectNumber)
        .limit(1)
        .get();

      if (!projectsSnapshot.empty) {
        const project = projectsSnapshot.docs[0];
        return {
          projectId: project.id,
          confidence: 0.85,
          source: 'filename',
          reason: `Matched project number ${projectNumber} from filename`
        };
      }
    }
  }

  return { projectId: null, confidence: 0, source: 'filename' };
}

/**
 * Route by content keywords
 */
async function routeByContent(
  concernId: string,
  textSample: string,
  filename: string
): Promise<ProjectLinkDecision> {
  
  // Check for internal document keywords first
  const lowerText = textSample.toLowerCase();
  
  const internalKeywords = {
    personnel: ['stundenzettel', 'timesheet', 'reisekosten', 'spesen', 'urlaubsantrag', 'arbeitszeit'],
    finance: ['rechnung', 'invoice', 'buchung', 'konto', 'zahlung', 'gutschrift', 'lieferschein'],
    compliance: ['zertifikat', 'certificate', 'versicherung', 'insurance', 'prüfung', 'inspection', 'tüv', 'uvv'],
    training: ['schulung', 'training', 'kurs', 'course', 'zertifikat', 'weiterbildung'],
    admin: ['richtlinie', 'policy', 'vorlage', 'template', 'memo', 'rundschreiben']
  };

  for (const [category, keywords] of Object.entries(internalKeywords)) {
    const matchCount = keywords.filter(keyword => lowerText.includes(keyword)).length;
    if (matchCount >= 2) {  // At least 2 matching keywords
      const projectId = `${concernId}-internal-${category}`;
      
      const projectRef = db.collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();
      
      if (projectDoc.exists) {
        return {
          projectId,
          confidence: 0.75,
          source: 'content',
          reason: `Content keywords suggest ${category} category (${matchCount} matches)`
        };
      }
    }
  }

  // Try to find project names/numbers in content
  const projectsSnapshot = await db.collection('projects')
    .where('concernID', '==', concernId)
    .where('type', '==', 'external')
    .limit(100)
    .get();

  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();
    const projectName = project.projectName?.toLowerCase() || '';
    const projectNumber = project.projectNumber?.toString() || '';
    
    if (projectName && projectName.length > 5 && lowerText.includes(projectName)) {
      return {
        projectId: projectDoc.id,
        confidence: 0.8,
        source: 'content',
        reason: `Project name "${project.projectName}" found in document content`
      };
    }
    
    if (projectNumber && lowerText.includes(projectNumber)) {
      return {
        projectId: projectDoc.id,
        confidence: 0.75,
        source: 'content',
        reason: `Project number ${projectNumber} found in document content`
      };
    }
  }

  return { projectId: null, confidence: 0, source: 'content' };
}

/**
 * Find project candidates for manual selection
 */
async function findProjectCandidates(
  concernId: string,
  filename: string,
  textSample?: string | null
): Promise<Array<{ projectId: string; projectName: string; confidence: number }>> {
  
  const candidates: Array<{ projectId: string; projectName: string; confidence: number }> = [];
  
  // Get recent active external projects
  const projectsSnapshot = await db.collection('projects')
    .where('concernID', '==', concernId)
    .where('projectStatus', '==', 'active')
    .limit(50)
    .get();

  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();
    
    // Skip internal projects
    if (project.type === 'internal') continue;
    
    let confidence = 0.3;  // Base confidence for active projects
    
    const projectName = project.projectName?.toLowerCase() || '';
    const filenameLower = filename.toLowerCase();
    
    // Boost confidence if name appears in filename
    if (projectName && filenameLower.includes(projectName)) {
      confidence += 0.3;
    }
    
    // Boost confidence if customer name matches
    if (project.projectCustomer && filenameLower.includes(project.projectCustomer.toLowerCase())) {
      confidence += 0.2;
    }
    
    // Add if some relevance
    if (confidence > 0.4) {
      candidates.push({
        projectId: projectDoc.id,
        projectName: project.projectName,
        confidence
      });
    }
  }

  // Sort by confidence
  candidates.sort((a, b) => b.confidence - a.confidence);
  
  return candidates.slice(0, 5);  // Return top 5
}

