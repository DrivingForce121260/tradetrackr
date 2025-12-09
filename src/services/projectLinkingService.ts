/**
 * Project Linking Service - Client Side
 * Determines which project a document should be linked to
 * Uses backend Cloud Functions for complex logic
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, limit, getFirestore } from 'firebase/firestore';
import { db } from '@/config/firebase';

const functions = getFunctions(undefined, 'europe-west1');

export interface ProjectLinkResult {
  projectId: string | null;
  confidence: number;
  source: 'context' | 'filename' | 'content' | 'internalRule' | 'ai' | 'default';
  candidates?: Array<{ projectId: string; projectName: string; confidence: number }>;
  reason?: string;
}

/**
 * Determine project for a document (client-side simple version)
 * For complex cases, falls back to Cloud Function
 */
export async function determineProjectForDocument(input: {
  concernId: string;
  filename: string;
  mimeType: string;
  docType?: string | null;
  textSample?: string | null;
  explicitProjectId?: string | null;
}): Promise<ProjectLinkResult> {
  
  // Rule 1: Explicit projectId provided
  if (input.explicitProjectId) {
    return {
      projectId: input.explicitProjectId,
      confidence: 1.0,
      source: 'context',
      reason: 'User-selected project'
    };
  }

  // Rule 2: Simple document type routing to internal projects
  const internalProjectId = await routeToInternalProject(input.concernId, input.docType);
  if (internalProjectId) {
    return {
      projectId: internalProjectId,
      confidence: 0.9,
      source: 'internalRule',
      reason: `Document type '${input.docType}' routed to internal project`
    };
  }

  // Rule 3: Try filename pattern matching
  const filenameResult = await matchProjectByFilename(input.concernId, input.filename);
  if (filenameResult.projectId && filenameResult.confidence >= 0.7) {
    return filenameResult;
  }

  // Rule 4: Get candidates for manual selection
  const candidates = await findProjectCandidates(input.concernId, input.filename);
  
  if (candidates.length > 0) {
    return {
      projectId: null,
      confidence: 0.5,
      source: 'filename',
      candidates,
      reason: 'Multiple possible projects found - needs manual review'
    };
  }

  // Rule 5: Default to admin internal project
  const defaultProjectId = `${input.concernId}-internal-admin`;
  return {
    projectId: defaultProjectId,
    confidence: 0.4,
    source: 'default',
    reason: 'No clear match - assigned to Admin for review'
  };
}

/**
 * Route to internal project based on document type
 */
async function routeToInternalProject(concernId: string, docType?: string | null): Promise<string | null> {
  if (!docType) return null;

  const typeToCategory: Record<string, string> = {
    'personnel.timesheet': 'personnel',
    'personnel.travel_log': 'personnel',
    'personnel.expense_claim': 'personnel',
    'client.invoice': 'finance',
    'material.delivery_note': 'finance',
    'material.requisition': 'finance',
    'material.goods_receipt': 'finance',
    'compliance.certificate': 'compliance',
    'compliance.insurance': 'compliance',
    'compliance.vehicle_equipment_inspection': 'compliance',
    'compliance.training_record': 'training',
  };

  const category = typeToCategory[docType];
  if (category) {
    const projectId = `${concernId}-internal-${category}`;
    
    // Verify project exists
    const projectRef = await getDocs(
      query(collection(db, 'projects'), where('__name__', '==', projectId), limit(1))
    );
    
    if (!projectRef.empty) {
      return projectId;
    }
  }

  return null;
}

/**
 * Match project by filename patterns
 */
async function matchProjectByFilename(concernId: string, filename: string): Promise<ProjectLinkResult> {
  // Extract potential project numbers
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
      
      // Search for project
      const projectsQuery = query(
        collection(db, 'projects'),
        where('concernID', '==', concernId),
        where('projectNumber', '==', projectNumber),
        limit(1)
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
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

  return {
    projectId: null,
    confidence: 0,
    source: 'filename'
  };
}

/**
 * Find project candidates for manual selection
 */
async function findProjectCandidates(
  concernId: string,
  filename: string
): Promise<Array<{ projectId: string; projectName: string; confidence: number }>> {
  
  const candidates: Array<{ projectId: string; projectName: string; confidence: number }> = [];
  
  // Get recent active external projects
  const projectsQuery = query(
    collection(db, 'projects'),
    where('concernID', '==', concernId),
    where('projectStatus', '==', 'active'),
    limit(50)
  );
  
  const projectsSnapshot = await getDocs(projectsQuery);

  for (const projectDoc of projectsSnapshot.docs) {
    const project = projectDoc.data();
    
    // Skip internal projects
    if (project.type === 'internal') continue;
    
    let confidence = 0.3;
    
    const projectName = project.projectName?.toLowerCase() || '';
    const filenameLower = filename.toLowerCase();
    
    if (projectName && filenameLower.includes(projectName)) {
      confidence += 0.3;
    }
    
    if (project.projectCustomer && filenameLower.includes(project.projectCustomer.toLowerCase())) {
      confidence += 0.2;
    }
    
    if (confidence > 0.4) {
      candidates.push({
        projectId: projectDoc.id,
        projectName: project.projectName,
        confidence
      });
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates.slice(0, 5);
}

/**
 * Call Cloud Function for AI-based project suggestion
 */
export async function suggestProjectWithAI(input: {
  concernId: string;
  filename: string;
  textSample?: string | null;
  docType?: string | null;
  existingCandidates?: Array<{ projectId: string; projectName: string; confidence: number }>;
}): Promise<ProjectLinkResult> {
  
  try {
    const suggestFunction = httpsCallable<any, ProjectLinkResult>(functions, 'suggestProjectWithAI');
    const result = await suggestFunction({
      orgId: input.concernId,
      concernId: input.concernId,
      filename: input.filename,
      textSample: input.textSample,
      docType: input.docType,
      existingCandidates: input.existingCandidates
    });
    
    return result.data;
  } catch (error: any) {
    console.error('AI project suggestion error:', error);
    return {
      projectId: null,
      confidence: 0,
      source: 'ai',
      reason: `AI suggestion failed: ${error.message}`
    };
  }
}

/**
 * Ensure internal projects exist for the organization
 */
export async function ensureInternalProjects(concernId: string): Promise<void> {
  try {
    const ensureFunction = httpsCallable(functions, 'ensureInternalProjectsForOrg');
    await ensureFunction({ concernId });
  } catch (error) {
    console.error('Error ensuring internal projects:', error);
    // Don't throw - this is a best-effort operation
  }
}

/**
 * Get all internal projects for an organization
 */
export async function getInternalProjects(concernId: string) {
  const projectsQuery = query(
    collection(db, 'projects'),
    where('concernID', '==', concernId),
    where('type', '==', 'internal'),
    where('active', '!=', false)
  );
  
  const snapshot = await getDocs(projectsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Get all external (customer) projects for an organization
 */
export async function getExternalProjects(concernId: string) {
  const projectsQuery = query(
    collection(db, 'projects'),
    where('concernID', '==', concernId),
    where('projectStatus', 'in', ['active', 'planning', 'in-progress'])
  );
  
  const snapshot = await getDocs(projectsQuery);
  return snapshot.docs
    .filter(doc => doc.data().type !== 'internal')
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
}








