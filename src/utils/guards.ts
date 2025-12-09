/**
 * Authentication and Authorization Guards
 * 
 * Lightweight role and session validation for the Field App.
 * These are CLIENT-SIDE checks only - backend must enforce via Security Rules.
 */

import { AuthSession } from '../types';

/**
 * Validate that a session is complete and valid
 */
function validateSession(session: AuthSession): void {
  if (!session.userId || !session.concernID || !session.email || !session.token) {
    throw new Error('Ungültige Session: fehlende Daten');
  }
  
  if (Date.now() > session.expiresAt) {
    throw new Error('Session ist abgelaufen');
  }
}

/**
 * User roles in the TradeTrackr system
 */
export type UserRole = 'field_tech' | 'foreman' | 'manager' | 'admin';

/**
 * Roles that should have access to the Field App
 */
const FIELD_APP_ROLES: UserRole[] = ['field_tech', 'foreman'];

/**
 * Roles that have administrative/management capabilities
 */
const ADMIN_ROLES: UserRole[] = ['admin', 'manager'];

/**
 * Require that a session exists and is valid
 * Throws if session is missing or invalid
 * 
 * Use at the start of API functions or critical operations.
 */
export function requireSession(session: AuthSession | null | undefined): asserts session is AuthSession {
  if (!session) {
    throw new Error('Keine Sitzung gefunden. Bitte melden Sie sich erneut an.');
  }

  try {
    validateSession(session);
  } catch (error: any) {
    throw new Error(error.message || 'Ungültige Sitzung. Bitte melden Sie sich erneut an.');
  }
}

/**
 * Check if a session represents a field user (technician or foreman)
 * 
 * @param session - Auth session to check
 * @returns true if user has a field role
 */
export function isFieldUser(session: AuthSession | null | undefined): boolean {
  if (!session) {
    return false;
  }

  // Note: In a full implementation, role would come from token claims or user profile
  // For now, we assume field users are the primary audience
  // Backend Security Rules enforce actual permissions
  return true;
}

/**
 * Check if a session represents an admin or manager
 * 
 * @param session - Auth session to check
 * @returns true if user has admin/manager role
 */
export function isAdminUser(session: AuthSession | null | undefined): boolean {
  if (!session) {
    return false;
  }

  // Note: In a full implementation, role would come from token claims
  // For now, this is a placeholder for future role-based UI
  return false;
}

/**
 * Assert that the current session has field user access
 * 
 * In production, this could restrict app usage to field roles only.
 * Currently logs warning but allows access (Field App is intended for field users).
 * 
 * @param session - Auth session to check
 */
export function assertFieldAccess(session: AuthSession | null | undefined): void {
  requireSession(session);

  if (!isFieldUser(session)) {
    console.warn(
      'Warnung: Dieser Benutzer hat möglicherweise keine Field-App-Berechtigung.',
      'Zugriff wird trotzdem gewährt, aber Backend Security Rules enforced Berechtigungen.'
    );

    // In a stricter implementation, you could throw here:
    // throw new Error('Zugriff verweigert. Diese App ist nur für Monteure verfügbar.');
  }
}

/**
 * Get a user-friendly display name for a session
 * 
 * @param session - Auth session
 * @returns Display name (email or userId)
 */
export function getDisplayName(session: AuthSession | null | undefined): string {
  if (!session) {
    return 'Nicht angemeldet';
  }

  return session.email || session.userId;
}

/**
 * Check if a session is expired
 * 
 * @param session - Auth session
 * @returns true if session is expired
 */
export function isSessionExpired(session: AuthSession | null | undefined): boolean {
  if (!session) {
    return true;
  }

  return Date.now() > session.expiresAt;
}

/**
 * Validate that session belongs to a specific concern
 * Throws if session concern doesn't match
 * 
 * @param session - Auth session
 * @param concernID - Expected concern ID
 */
export function assertConcern(
  session: AuthSession | null | undefined,
  concernID: string
): void {
  requireSession(session);

  if (session.concernID !== concernID) {
    throw new Error(
      'Zugriff verweigert. Sitzung gehört zu einer anderen Firma.'
    );
  }
}

/**
 * Validate that session belongs to a specific user
 * Throws if session user doesn't match
 * 
 * @param session - Auth session
 * @param userId - Expected user ID
 */
export function assertUser(
  session: AuthSession | null | undefined,
  userId: string
): void {
  requireSession(session);

  if (session.userId !== userId) {
    throw new Error(
      'Zugriff verweigert. Sie können nur Ihre eigenen Daten bearbeiten.'
    );
  }
}


