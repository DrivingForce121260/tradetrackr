// ============================================================================
// OPTIMIZED AUTH HOOKS
// ============================================================================
// Erweiterte und optimierte Authentifizierungs-Hooks

import { useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import type { User, UserRole } from '@/types/auth';

// ============================================================================
// MAIN AUTH HOOK
// ============================================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// ============================================================================
// PERMISSION HOOK
// ============================================================================

export const usePermission = () => {
  const { hasPermission, user } = useAuth();
  
  const checkPermission = useCallback((permission: string): boolean => {
    return hasPermission(permission);
  }, [hasPermission]);
  
  const checkMultiplePermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);
  
  const checkAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);
  
  const userPermissions = useMemo(() => {
    if (!user) return [];
    
    // Hier würden die tatsächlichen Berechtigungen basierend auf der Rolle geladen
    const rolePermissions: Record<UserRole, string[]> = {
      admin: ['*'], // Admin hat alle Berechtigungen
      office: [
        // Aufgaben: Lesen (r) + Schreiben (w)
        'view_tasks', 'create_task', 'edit_task', 'delete_task',
        // Berichte: Nur Lesen (r) - KEINE Genehmigung/Ablehnung
        'view_reports', 'view_all_reports',
        // Benutzer: Nur Lesen (r)
        'view_users',
        // Kunden: Lesen (r) + Schreiben (w)
        'view_customers', 'create_customer', 'edit_customer', 'delete_customer',
        // Kategorien: Nur Lesen (r)
        'view_categories',
        // Materialien: Lesen (r) + Schreiben (w)
        'view_materials', 'create_material', 'edit_material', 'delete_material',
        // Projekte: Lesen (r) + Schreiben (w)
        'view_projects', 'create_project', 'edit_project', 'delete_project',
        // Projektinfo: Lesen (r) + Schreiben (w)
        'view_project_info', 'create_project_info', 'edit_project_info',
        // Dokumente: Lesen (r) + Schreiben (w)
        'view_documents', 'create_document', 'edit_document', 'delete_document',
        // Kein Zugriff auf Concernverwaltung
        // Kein Zugriff auf Berichtsgenehmigung/-ablehnung
      ],
      project_manager: ['create_project', 'view_project', 'edit_assigned_projects', 'manage_categories', 'view_categories', 'view_all_reports', 'manage_reports', 'view_reports', 'view_customers', 'create_task', 'manage_projects', 'view_materials', 'manage_materials', 'view_project_info'],
      field_worker: ['view_assigned_projects', 'view_categories', 'view_own_reports', 'view_reports', 'view_own_tasks', 'view_own_projects', 'view_project_info'],
      mitarbeiter: ['view_assigned_projects', 'view_categories', 'view_own_reports', 'view_reports', 'view_own_tasks', 'view_own_projects', 'view_project_info'],
      auftraggeber: ['view_own_project', 'view_own_project_reports', 'view_own_project_progress', 'view_materials', 'view_project_info']
    };
    
    return rolePermissions[user.role] || [];
  }, [user]);
  
  return {
    checkPermission,
    checkMultiplePermissions,
    checkAnyPermission,
    userPermissions,
    hasPermission: checkPermission,
  };
};

// ============================================================================
// ROLE HOOK
// ============================================================================

export const useRole = () => {
  const { user } = useAuth();
  
  const isRole = useCallback((role: UserRole): boolean => {
    return user?.role === role;
  }, [user]);
  
  const isAnyRole = useCallback((roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  }, [user]);
  
  const roleHierarchy = useMemo(() => {
    if (!user) return 0;
    
    const hierarchy: Record<UserRole, number> = {
      admin: 5,
      office: 4,
      project_manager: 3,
      field_worker: 2,
      mitarbeiter: 2,
      auftraggeber: 1,
    };
    
    return hierarchy[user.role] || 0;
  }, [user]);
  
  const canManageRole = useCallback((targetRole: UserRole): boolean => {
    if (!user) return false;
    
    const currentLevel = roleHierarchy;
    const targetLevel = roleHierarchy;
    
    return currentLevel > targetLevel;
  }, [user, roleHierarchy]);
  
  return {
    isRole,
    isAnyRole,
    roleHierarchy,
    canManageRole,
    currentRole: user?.role,
  };
};

// ============================================================================
// USER PROFILE HOOK
// ============================================================================

export const useUserProfile = () => {
  const { user } = useAuth();
  
  const fullName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`.trim();
  }, [user]);
  
  const initials = useMemo(() => {
    if (!user) return '';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }, [user]);
  
  const displayName = useMemo(() => {
    if (!user) return '';
    return user.firstName || user.username;
  }, [user]);
  
  const isProfileComplete = useMemo(() => {
    if (!user) return false;
    return !!(user.firstName && user.lastName && user.email);
  }, [user]);
  
  return {
    fullName,
    initials,
    displayName,
    isProfileComplete,
    profile: user,
  };
};
