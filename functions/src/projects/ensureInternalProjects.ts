/**
 * Ensure Internal Projects for Organization
 * Creates reserved internal projects for document linking
 * These act as containers for non-customer documents
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Reserved internal project definitions
const INTERNAL_PROJECTS = [
  {
    id: 'internal-personnel',
    name: 'Personal & HR',
    nameDe: 'Personal & HR',
    category: 'personnel' as const,
    description: 'Timesheets, travel logs, expense claims, HR documents'
  },
  {
    id: 'internal-finance',
    name: 'Finance & Accounting',
    nameDe: 'Finanzen & Buchhaltung',
    category: 'finance' as const,
    description: 'Invoices, receipts, financial reports, accounting documents'
  },
  {
    id: 'internal-admin',
    name: 'Administration',
    nameDe: 'Administration',
    category: 'admin' as const,
    description: 'General administration, policies, templates, internal memos'
  },
  {
    id: 'internal-compliance',
    name: 'Compliance & Quality',
    nameDe: 'Compliance & Qualität',
    category: 'compliance' as const,
    description: 'Certificates, insurance, inspections, compliance documents'
  },
  {
    id: 'internal-training',
    name: 'Training & Development',
    nameDe: 'Schulung & Weiterbildung',
    category: 'training' as const,
    description: 'Training records, certificates, educational materials'
  },
  {
    id: 'internal-it',
    name: 'IT & Systems',
    nameDe: 'IT & Systeme',
    category: 'it' as const,
    description: 'IT documentation, system manuals, technical specifications'
  }
];

/**
 * Ensure internal projects exist for an organization
 * Called during org setup or as maintenance
 */
export const ensureInternalProjectsForOrg = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { concernId } = data;
    
    if (!concernId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId is required');
    }

    functions.logger.info(`Ensuring internal projects for org: ${concernId}`);

    try {
      const created: string[] = [];
      const existing: string[] = [];

      for (const project of INTERNAL_PROJECTS) {
        const projectId = `${concernId}-${project.id}`;
        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();

        if (projectDoc.exists) {
          existing.push(project.name);
          functions.logger.info(`Internal project already exists: ${project.name}`);
          continue;
        }

        // Create internal project
        const projectData = {
          concernID: concernId,
          projectName: project.nameDe,
          projectNumber: 0,  // Internal projects have no number
          projectAddendum: 0,
          projectDes: project.description,
          projectStatus: 'active',
          projectCategory: 999,  // Special category for internal
          projectCustomer: 'Internal',
          projectAddr: '',
          projectContact: '',
          projectCity: '',
          postCode: '',
          projectTel: '',
          projectEmail: '',
          mitarbeiterID: '',
          priority: 'normal',
          projectElementLoaded: false,
          projectAufmassGen: false,
          dateCreated: admin.firestore.FieldValue.serverTimestamp() as any,
          lastModified: admin.firestore.FieldValue.serverTimestamp() as any,
          
          // New fields for document linking
          type: 'internal',
          internalCategory: project.category,
          active: true,
          isSystemProject: true
        };

        await projectRef.set(projectData);
        created.push(project.name);
        functions.logger.info(`Created internal project: ${project.name}`);
      }

      return {
        success: true,
        created,
        existing,
        message: `Ensured ${INTERNAL_PROJECTS.length} internal projects. Created: ${created.length}, Already existed: ${existing.length}`
      };

    } catch (error: any) {
      functions.logger.error('Error ensuring internal projects:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Maintenance: Run for all existing organizations
 */
export const ensureInternalProjectsForAllOrgs = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Admin only
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    functions.logger.info('Running ensureInternalProjects for all orgs');

    try {
      // Get all unique concernIDs from users collection
      const usersSnapshot = await db.collection('users').get();
      const concernIds = new Set<string>();

      usersSnapshot.docs.forEach(doc => {
        const concernID = doc.data().concernID || doc.data().ConcernID;
        if (concernID) {
          concernIds.add(concernID);
        }
      });

      functions.logger.info(`Found ${concernIds.size} unique organizations`);

      const results: Record<string, any> = {};

      for (const concernId of concernIds) {
        try {
          const created: string[] = [];
          const existing: string[] = [];

          for (const project of INTERNAL_PROJECTS) {
            const projectId = `${concernId}-${project.id}`;
            const projectRef = db.collection('projects').doc(projectId);
            const projectDoc = await projectRef.get();

            if (projectDoc.exists) {
              existing.push(project.name);
              continue;
            }

            const projectData = {
              concernID: concernId,
              projectName: project.nameDe,
              projectNumber: 0,
              projectAddendum: 0,
              projectDes: project.description,
              projectStatus: 'active',
              projectCategory: 999,
              projectCustomer: 'Internal',
              projectAddr: '',
              projectContact: '',
              projectCity: '',
              postCode: '',
              projectTel: '',
              projectEmail: '',
              mitarbeiterID: '',
              priority: 'normal',
              projectElementLoaded: false,
              projectAufmassGen: false,
              dateCreated: admin.firestore.FieldValue.serverTimestamp() as any,
              lastModified: admin.firestore.FieldValue.serverTimestamp() as any,
              type: 'internal',
              internalCategory: project.category,
              active: true,
              isSystemProject: true
            };

            await projectRef.set(projectData);
            created.push(project.name);
          }

          results[concernId] = { created: created.length, existing: existing.length };

        } catch (error: any) {
          functions.logger.error(`Error for org ${concernId}:`, error);
          results[concernId] = { error: error.message };
        }
      }

      return {
        success: true,
        orgsProcessed: concernIds.size,
        results
      };

    } catch (error: any) {
      functions.logger.error('Error in batch internal projects creation:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

