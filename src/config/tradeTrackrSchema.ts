/**
 * TradeTrackr Schema Definition
 * 
 * Single source of truth for all Firestore paths and collection names.
 * This schema is shared between:
 * - TradeTrackr Portal (web admin)
 * - TradeTrackr Field App (mobile)
 * 
 * ANY changes to Firestore structure must be reflected here and coordinated
 * with backend team to ensure consistency.
 */

export const TradeTrackrSchema = {
  // Root collections
  tenants: 'tenants',
  users: 'users',
  
  // Tenant-scoped collections (top-level under tenant)
  projects: 'projects',
  timeEntries: 'timeEntries',
  reports: 'reports',
  aiMessages: 'aiMessages',
  
  // Project sub-collections
  tasks: 'tasks',
  photos: 'photos',
  notes: 'notes',
  
  // ===========================
  // Path Helpers
  // ===========================
  
  /**
   * Get path to a tenant document
   */
  tenantDoc: (tenantId: string): string => 
    `tenants/${tenantId}`,
  
  /**
   * Get path to a user document
   */
  userDoc: (tenantId: string, userId: string): string => 
    `tenants/${tenantId}/users/${userId}`,
  
  /**
   * Get path to tenants collection (for queries)
   */
  tenantsCol: (): string => 
    'tenants',
  
  /**
   * Get path to projects collection for a tenant
   */
  projectsCol: (tenantId: string): string => 
    `tenants/${tenantId}/projects`,
  
  /**
   * Get path to a specific project document
   */
  projectDoc: (tenantId: string, projectId: string): string => 
    `tenants/${tenantId}/projects/${projectId}`,
  
  /**
   * Get path to tasks sub-collection for a project
   */
  projectTasksCol: (tenantId: string, projectId: string): string => 
    `tenants/${tenantId}/projects/${projectId}/tasks`,
  
  /**
   * Get path to a specific task document
   */
  projectTaskDoc: (tenantId: string, projectId: string, taskId: string): string => 
    `tenants/${tenantId}/projects/${projectId}/tasks/${taskId}`,
  
  /**
   * Get path to photos sub-collection for a project
   */
  projectPhotosCol: (tenantId: string, projectId: string): string => 
    `tenants/${tenantId}/projects/${projectId}/photos`,
  
  /**
   * Get path to notes sub-collection for a project
   */
  projectNotesCol: (tenantId: string, projectId: string): string => 
    `tenants/${tenantId}/projects/${projectId}/notes`,
  
  /**
   * Get path to time entries collection for a tenant
   */
  timeEntriesCol: (tenantId: string): string => 
    `tenants/${tenantId}/timeEntries`,
  
  /**
   * Get path to reports collection for a tenant
   */
  reportsCol: (tenantId: string): string => 
    `tenants/${tenantId}/reports`,
  
  /**
   * Get path to AI messages collection for a tenant
   */
  aiMessagesCol: (tenantId: string): string => 
    `tenants/${tenantId}/aiMessages`,
  
  // ===========================
  // Storage Paths
  // ===========================
  
  /**
   * Get Firebase Storage path for project photos
   */
  photoStoragePath: (tenantId: string, projectId: string, photoId: string): string => 
    `tenants/${tenantId}/projects/${projectId}/photos/${photoId}.jpg`,
} as const;

/**
 * Validate that a tenantId is present and non-empty
 * Throws clear error if missing
 */
export function validateTenantId(tenantId: string | null | undefined): asserts tenantId is string {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error('TenantId ist erforderlich. Bitte melden Sie sich erneut an.');
  }
}

/**
 * Validate that a session has required auth data
 */
export function validateSession(session: any): void {
  if (!session) {
    throw new Error('Keine Sitzung gefunden. Bitte melden Sie sich erneut an.');
  }
  validateTenantId(session.tenantId);
  if (!session.userId) {
    throw new Error('Keine Benutzer-ID gefunden. Bitte melden Sie sich erneut an.');
  }
}








