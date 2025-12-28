/**
 * Permission utilities for TradeTrackr
 * 
 * Centralized permission checks for CRM and Procurement access.
 * Uses existing role system: admin, manager, office, project_manager, employee, service_technician
 */

// Roles that have CRM write access (create/update inquiries, link projects)
const CRM_WRITE_ROLES = ['admin', 'manager', 'office', 'project_manager'];

// Roles that have CRM read access
const CRM_READ_ROLES = ['admin', 'manager', 'office', 'project_manager', 'employee'];

// Roles that can write procurement records
const PROCUREMENT_WRITE_ROLES = ['admin', 'manager', 'office', 'project_manager'];

/**
 * User object shape (minimal interface for permission checks)
 */
interface PermissionUser {
  role?: string;
  rechte?: number;
  uid?: string;
}

/**
 * Check if user can view CRM features
 */
export function canViewCrm(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  return CRM_READ_ROLES.includes(user.role || '');
}

/**
 * Check if user can write CRM data (create/update inquiries, link projects)
 */
export function canWriteCrm(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  return CRM_WRITE_ROLES.includes(user.role || '');
}

/**
 * Check if user can use CRM features (alias for canViewCrm)
 */
export function canUseCrm(user: PermissionUser | null | undefined): boolean {
  return canViewCrm(user);
}

/**
 * Check if user can write procurement data
 */
export function canWriteProcurement(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  return PROCUREMENT_WRITE_ROLES.includes(user.role || '');
}

/**
 * Check if user is admin
 */
export function isAdmin(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * Get German label for permission denial
 */
export function getPermissionDeniedMessage(): string {
  return 'Keine Berechtigung für diese Aktion.';
}

/**
 * Get German tooltip for disabled CRM actions
 */
export function getCrmPermissionTooltip(user: PermissionUser | null | undefined): string | undefined {
  if (canWriteCrm(user)) return undefined;
  return 'Keine Berechtigung. Nur Office, Admin oder Projektleiter können diese Aktion ausführen.';
}

// ============================================
// SALES INQUIRY CONVERSION PERMISSIONS
// ============================================

// Roles that can convert email inquiries to sales offers
const SALES_CONVERSION_ROLES = ['admin', 'manager', 'office', 'project_manager'];

/**
 * Check if user can convert email inquiries to sales offers
 */
export function canConvertSalesInquiry(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  
  // Check role first
  if (SALES_CONVERSION_ROLES.includes(user.role || '')) return true;
  
  // Legacy fallback: rechte >= 4
  if ((user.rechte ?? 0) >= 4) return true;
  
  return false;
}

/**
 * Get German tooltip for disabled sales conversion actions
 */
export function getSalesConversionTooltip(user: PermissionUser | null | undefined): string | undefined {
  if (canConvertSalesInquiry(user)) return undefined;
  return 'Keine Berechtigung. Nur Office, Admin oder Projektleiter können Angebote aus E-Mail-Anfragen erstellen.';
}

