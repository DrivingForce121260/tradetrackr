/**
 * AuthContext - Keycloak OIDC Authentication
 * 
 * Phase 03 Sovereignty Migration: Firebase Auth → Keycloak OIDC
 * 
 * This module provides authentication using Keycloak with Authorization Code + PKCE.
 * Firebase Auth has been completely removed.
 * 
 * @see /docs/sovereignty/PHASE3_PLAN.md
 * @see /docs/sovereignty/auth.md
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  User, 
  userService, 
  concernService, 
  FirestoreService,
  projectService,
  taskService,
  reportService,
  customerService,
  materialService,
  categoryService
} from '@/services/firestoreService';
import { cleanupDemoData } from '@/utils/demoData';
import {
  createSessionId,
  claimSession,
  startHeartbeat,
  stopHeartbeat,
  releaseSession,
  setupTabCloseHandler,
  getCurrentSessionId,
  setSessionInvalidatedCallback,
} from '@/services/sessionService';

// OIDC Client imports (Keycloak)
import {
  initAuth,
  login as oidcLogin,
  logout as oidcLogout,
  handleCallback,
  getUser as getOIDCUser,
  getReturnUrl,
  onUserChange,
  type TradeTrackrUser as OIDCUser,
} from '@/lib/auth/oidc-client';

// ============================================================================
// Compatibility Type (replaces FirebaseUser)
// ============================================================================

/**
 * Compatibility shim for code that expects FirebaseUser.
 * Maps from Keycloak user to the expected shape.
 */
type FirebaseUserCompat = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
} | null;

// ============================================================================
// Context Types
// ============================================================================

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUserCompat;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  enterDemoMode: (role: string) => void;
  syncLocalDataToFirestore: () => Promise<void>;
  generateDemoDataForDemoUser: () => void;
  isDemoUser: () => boolean;
  getDefaultDashboard: () => string;

  canCreateProject: () => boolean;
  canCreateTask: () => boolean;
  canCreateProjectInfo: () => boolean;
  canViewReports: () => boolean;
  canCreateCustomer: () => boolean;
  canCreateMaterial: () => boolean;
  canCreateCategory: () => boolean;
  canCreateUser: () => boolean;
  canCreateCRM: () => boolean;
  canViewCRM: () => boolean;
  canViewOwnProjects: () => boolean;
  canViewOwnReports: () => boolean;
  canViewOwnProjectInfo: () => boolean;
  canViewCustomers: () => boolean;
  canViewMaterials: () => boolean;
  canViewCategories: () => boolean;
  canViewUsers: () => boolean;
  hasPermission: (permission: string) => boolean;
  canCreateReport: () => boolean;
  canUseMessaging: () => boolean;
  
  // Synchronisation
  startAutoSync: () => void;
  stopAutoSync: () => void;
  isAutoSyncActive: () => boolean;
  getLastSyncTime: () => Date | null;
  getSyncStatus: () => 'idle' | 'syncing' | 'error';
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// ============================================================================
// AuthProvider Implementation
// ============================================================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserCompat>(null);
  const [loading, setLoading] = useState(true);
  
  // OIDC state
  const [oidcUser, setOidcUser] = useState<OIDCUser | null>(null);
  
  // Session state
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [sessionBlockMessage, setSessionBlockMessage] = useState('');
  const tabCloseCleanup = useRef<(() => void) | null>(null);
  
  // Sync states
  const [autoSyncActive, setAutoSyncActive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [syncUnsubscribers, setSyncUnsubscribers] = useState<Array<() => void>>([]);

  // ============================================================================
  // OIDC Initialization
  // ============================================================================

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if this is a callback from Keycloak
        const urlParams = new URLSearchParams(window.location.search);
        const hasCode = urlParams.has('code') && urlParams.has('state');
        
        if (hasCode) {
          console.log('🔑 [Auth] Handling OIDC callback...');
          try {
            const oidcResult = await handleCallback();
            setOidcUser(oidcResult);
            
            // Load user from Firestore and setup session
            await loadFirestoreUser(oidcResult);
            
            // Clean up URL and redirect to return URL
            const returnUrl = getReturnUrl();
            window.history.replaceState({}, document.title, window.location.pathname);
            
            const defaultDashboard = getDefaultDashboard();
            window.location.href = `#${defaultDashboard}`;
          } catch (error: any) {
            console.error('🚫 [Auth] OIDC callback error:', error);
            setLoading(false);
          }
          return;
        }
        
        // Check for existing session
        console.log('🔍 [Auth] Checking for existing OIDC session...');
        const existingUser = await initAuth();
        
        if (existingUser) {
          console.log('✅ [Auth] Found existing OIDC session');
          setOidcUser(existingUser);
          await loadFirestoreUser(existingUser);
        } else {
          console.log('ℹ️ [Auth] No existing session');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ [Auth] Initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to OIDC user changes
    const unsubscribe = onUserChange((newUser) => {
      if (newUser) {
        setOidcUser(newUser);
        loadFirestoreUser(newUser);
      } else {
        setOidcUser(null);
        setUser(null);
        setFirebaseUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ============================================================================
  // Load Firestore User from OIDC Claims
  // ============================================================================

  const loadFirestoreUser = async (oidcUser: OIDCUser) => {
    try {
      const authSub = oidcUser.userId;
      const email = oidcUser.email;
      const tenantId = oidcUser.tenantId;
      
      console.log('🔍 [Auth] Loading Firestore user...', { authSub, email, tenantId });
      
      // Set compatibility firebaseUser
      setFirebaseUser({
        uid: authSub,
        email: email,
        displayName: oidcUser.displayName,
      });
      
      // Strategy 1: Look up by Keycloak subject (keycloakSub field)
      let firestoreUser: User | null = null;
      
      try {
        const usersRef = collection(db, 'users');
        const subQuery = query(usersRef, where('keycloakSub', '==', authSub));
        const subSnapshot = await getDocs(subQuery);
        
        if (!subSnapshot.empty) {
          const doc = subSnapshot.docs[0];
          firestoreUser = { ...doc.data(), uid: doc.id } as User;
          console.log('✅ [Auth] Found user by keycloakSub');
        }
      } catch (e) {
        console.log('⚠️ [Auth] keycloakSub query failed, trying other strategies');
      }
      
      // Strategy 2: Look up by email (and link keycloakSub)
      if (!firestoreUser && email) {
        try {
          const usersRef = collection(db, 'users');
          const emailQuery = query(usersRef, where('email', '==', email));
          const emailSnapshot = await getDocs(emailQuery);
          
          if (!emailSnapshot.empty) {
            // Find active user without verification code
            const activeUserDoc = emailSnapshot.docs.find(d => {
              const data = d.data();
              return !data.isDeleted && data.isActive !== false && !data.verificationCode;
            });
            
            if (activeUserDoc) {
              firestoreUser = { ...activeUserDoc.data(), uid: activeUserDoc.id } as User;
              console.log('✅ [Auth] Found user by email, linking keycloakSub');
              
              // Link keycloakSub for future lookups
              try {
                await updateDoc(doc(db, 'users', activeUserDoc.id), {
                  keycloakSub: authSub,
                  lastLogin: new Date(),
                });
              } catch (e) {
                console.warn('⚠️ [Auth] Failed to link keycloakSub:', e);
              }
            }
          }
        } catch (e) {
          console.error('❌ [Auth] Email query failed:', e);
        }
      }
      
      // Strategy 3: Look up by old uid field (Firebase UID)
      if (!firestoreUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', authSub));
          if (userDoc.exists()) {
            firestoreUser = { ...userDoc.data(), uid: authSub } as User;
            console.log('✅ [Auth] Found user by document ID');
          }
        } catch (e) {
          console.log('⚠️ [Auth] Document ID lookup failed');
        }
      }
      
      if (!firestoreUser) {
        console.error('❌ [Auth] No Firestore user found for:', email);
        throw new Error('Benutzer nicht in der Datenbank gefunden. Bitte Admin kontaktieren.');
      }
      
      // Check if user is deleted
      if (firestoreUser.isDeleted) {
        console.log('🚫 [Auth] User is marked as deleted');
        await oidcLogout();
        throw new Error('Dieser Benutzer-Account wurde gelöscht.');
      }
      
      // Clean up demo data for real users
      if (firestoreUser.email !== 'demo@tradetrackr.com') {
        cleanupDemoData();
      }
      
      // Override concernID with tenant_id from token if available
      if (tenantId && tenantId !== firestoreUser.concernID) {
        console.log('ℹ️ [Auth] Using tenant_id from token:', tenantId);
        firestoreUser.concernID = tenantId;
      }
      
      // Session claim
      if (firestoreUser.concernID && !firestoreUser.isDemoUser) {
        const sessionId = createSessionId();
        const sessionResult = await claimSession(
          firestoreUser.concernID,
          authSub,
          sessionId
        );

        if (!sessionResult.success) {
          console.log('🚫 [Auth] Session claim denied');
          setSessionBlocked(true);
          setSessionBlockMessage(
            sessionResult.message || 
            'Dieses Konto ist bereits angemeldet. Bitte melden Sie sich zuerst auf dem anderen Gerät ab.'
          );
          await oidcLogout();
          throw new Error(sessionResult.message || 'SESSION_BLOCKED');
        }

        // Setup session invalidation callback
        setSessionInvalidatedCallback(async () => {
          console.log('🚫 [Auth] Session invalidated by another device');
          setSessionBlocked(true);
          setSessionBlockMessage(
            'Ihre Sitzung wurde von einem anderen Gerät übernommen. Sie werden abgemeldet.'
          );
          await oidcLogout();
          setUser(null);
        });

        // Start heartbeat
        startHeartbeat(firestoreUser.concernID, authSub);

        // Setup tab close handler
        tabCloseCleanup.current = setupTabCloseHandler(
          firestoreUser.concernID,
          authSub
        );
      }
      
      // Update last login
      try {
        await updateDoc(doc(db, 'users', firestoreUser.uid), {
          lastLogin: new Date()
        });
      } catch (e) {
        console.warn('⚠️ [Auth] Failed to update lastLogin');
      }
      
      setUser(firestoreUser);
      setLoading(false);
      
    } catch (error) {
      console.error('❌ [Auth] loadFirestoreUser failed:', error);
      setLoading(false);
      throw error;
    }
  };

  // ============================================================================
  // Auto-Sync Effect
  // ============================================================================

  useEffect(() => {
    if (user && user.concernID && !user.isDemoUser) {
      const timer = setTimeout(() => {
        startAutoSync();
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        if (autoSyncActive) {
          stopAutoSync();
        }
      };
    }
  }, [user, user?.concernID, user?.isDemoUser]);

  // ============================================================================
  // Sign In (Redirects to Keycloak)
  // ============================================================================

  const signIn = async (_email: string, _password: string) => {
    // Parameters are ignored - Keycloak handles login
    console.log('🔑 [Auth] Redirecting to Keycloak login...');
    await oidcLogin();
  };

  // ============================================================================
  // Sign Up (Redirects to Keycloak Registration)
  // ============================================================================

  const signUp = async (_email: string, _password: string, _userData: Partial<User>) => {
    // Keycloak handles registration
    console.log('📝 [Auth] Redirecting to Keycloak registration...');
    // Use login redirect - Keycloak can be configured with registration hint
    await oidcLogin();
  };

  // ============================================================================
  // Logout
  // ============================================================================

  const logout = async () => {
    try {
      // Release session
      if (user?.concernID && !user?.isDemoUser && getCurrentSessionId()) {
        stopHeartbeat();
        await releaseSession(user.concernID, oidcUser?.userId || user.uid || '');
      }

      // Cleanup tab close handler
      if (tabCloseCleanup.current) {
        tabCloseCleanup.current();
        tabCloseCleanup.current = null;
      }

      // Stop sync
      if (autoSyncActive) {
        stopAutoSync();
      }

      // Clear state
      setUser(null);
      setFirebaseUser(null);
      setOidcUser(null);
      setSessionBlocked(false);
      setSessionBlockMessage('');

      // OIDC logout (redirects to Keycloak)
      await oidcLogout();
    } catch (error) {
      console.error('❌ [Auth] Logout error:', error);
      throw error;
    }
  };

  // ============================================================================
  // Sync Functions
  // ============================================================================

  const syncLocalDataToFirestore = async () => {
    if (!user) return;
    
    try {
      let hasLocalData = false;
      
      const concernKey = `concern_${user.concernID}`;
      const concernData = localStorage.getItem(concernKey);
      if (concernData) {
        hasLocalData = true;
        try {
          const concern = JSON.parse(concernData);
          const concernId = concern.uid;
          const { uid, ...concernWithoutUid } = concern;
          await concernService.createWithId(concernId, concernWithoutUid);
          localStorage.removeItem(concernKey);
        } catch (error) {
          console.error('Concern sync error:', error);
        }
      }
      
      const userKey = `user_${user.uid}`;
      const userData = localStorage.getItem(userKey);
      if (userData) {
        hasLocalData = true;
        try {
          const userToSync = JSON.parse(userData);
          const userId = userToSync.uid;
          const { uid, ...userWithoutUid } = userToSync;
          await userService.createWithId(userId, userWithoutUid);
          localStorage.removeItem(userKey);
        } catch (error) {
          console.error('User sync error:', error);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  // ============================================================================
  // Permission Checks
  // ============================================================================

  const canCreateProject = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'employee' || user.role === 'office';
  };

  const canCreateTask = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'employee' || user.role === 'service_technician' || user.role === 'office';
  };

  const canCreateProjectInfo = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'office';
  };

  const canViewReports = (): boolean => {
    if (!user) return false;
    return true;
  };

  const canCreateCustomer = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'office';
  };

  const canCreateMaterial = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'office';
  };

  const canCreateCategory = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager';
  };

  const canCreateUser = (): boolean => {
    if (!user) return false;
    return user.role === 'admin';
  };

  const canViewOwnProjects = (): boolean => {
    if (!user) return false;
    return true;
  };

  const canViewOwnReports = (): boolean => {
    if (!user) return false;
    return true;
  };

  const canViewOwnProjectInfo = (): boolean => {
    if (!user) return false;
    return true;
  };

  const canViewCustomers = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'employee' || user.role === 'office';
  };

  const canViewMaterials = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'employee' || user.role === 'service_technician' || user.role === 'office';
  };

  const canViewCategories = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'employee' || user.role === 'office';
  };

  const canViewUsers = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'office';
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    switch (user.role) {
      case 'admin':
        return true;
      case 'office':
        return [
          'view_tasks', 'create_task', 'edit_task', 'delete_task',
          'view_reports', 'view_all_reports',
          'view_users',
          'view_customers', 'create_customer', 'edit_customer', 'delete_customer',
          'view_categories',
          'view_materials', 'create_material', 'edit_material', 'delete_material',
          'view_projects', 'create_project', 'edit_project', 'delete_project',
          'view_project_info', 'create_project_info', 'edit_project_info',
          'view_documents', 'create_document', 'edit_document', 'delete_document',
        ].includes(permission);
      case 'manager':
        return [
          'create_user',
          'create_customer',
          'create_category',
          'create_material',
          'create_project_info',
          'create_document',
          'edit_document',
          'delete_document',
          'manage_document_categories'
        ].includes(permission) || (permission !== 'user_management' && permission !== 'system_settings');
      case 'employee':
        return [
          'view_own_project', 
          'view_own_project_reports', 
          'view_own_project_progress',
          'create_document',
          'edit_document',
          'delete_document',
          'manage_document_categories'
        ].includes(permission);
      case 'service_technician':
        return [
          'view_own_project', 
          'view_own_project_reports', 
          'view_own_project_progress', 
          'maintenance_work',
          'create_document',
          'edit_document',
          'delete_document'
        ].includes(permission);
      case 'auftraggeber':
        return [
          'view_own_project', 
          'view_own_project_reports', 
          'view_own_project_progress',
          'create_document',
          'edit_document'
        ].includes(permission);
      default:
        return false;
    }
  };

  const canCreateReport = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'employee' || user.role === 'service_technician';
  };

  const canCreateCRM = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'office';
  };

  const canViewCRM = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'manager' || user.role === 'office' || user.role === 'employee';
  };

  const canUseMessaging = (): boolean => {
    return !!user && user.isActive;
  };

  const isDemoUser = (): boolean => {
    if (!user) return false;
    return user.email === 'demo@tradetrackr.com';
  };

  const getDefaultDashboard = (): string => {
    if (!user) return 'dashboard';
    if (isDemoUser()) return 'dashboard';
    
    switch (user.role) {
      case 'auftraggeber':
        return 'auftraggeber';
      default:
        return 'dashboard';
    }
  };

  // ============================================================================
  // Demo Mode
  // ============================================================================

  const generateDemoDataForDemoUser = () => {
    if (!isDemoUser()) return;
    
    try {
      const demoProjects = [
        {
          id: 'demo-project-1',
          projectNumber: 'PRJ-2024-001',
          name: 'Solaranlage Installation München',
          status: 'active',
          priority: 'high',
          progress: 35
        },
        {
          id: 'demo-project-2', 
          projectNumber: 'PRJ-2024-002',
          name: 'Heizungsanlage Wartung Hamburg',
          status: 'planned',
          priority: 'medium',
          progress: 0
        }
      ];
      
      localStorage.setItem('projects', JSON.stringify(demoProjects));
      
      const demoReports = Array.from({ length: 15 }, (_, index) => ({
        id: `REP-${String(index + 1).padStart(3, '0')}`,
        employee: ['Max Mustermann', 'Anna Schmidt', 'Tom Weber'][index % 3],
        customer: ['München Immobilien GmbH', 'Hamburg Wohnbau AG', 'Berlin Shopping Center GmbH'][index % 3],
        project: demoProjects[index % demoProjects.length].projectNumber,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        hours: Math.floor(Math.random() * 8) + 4,
        status: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      }));
      
      localStorage.setItem('reports', JSON.stringify(demoReports));
    } catch (error) {
      console.error('Demo data generation error:', error);
    }
  };

  const enterDemoMode = (role: string) => {
    const demoUser: User = {
      uid: 'demo-user',
      concernID: 'DE0000000000',
      dateCreated: new Date(),
      email: 'demo@tradetrackr.com',
      displayName: `Demo ${role}`,
      photoUrl: '',
      tel: '+49 123 456789',
      passpin: 1234,
      vorname: 'Demo',
      mitarbeiterID: 9999,
      lastSync: new Date(),
      nachname: role.charAt(0).toUpperCase() + role.slice(1),
      generatedProjects: 0,
      rechte: 5,
      startDate: new Date(),
      role: role,
      isActive: true,
      isDemoUser: true,
    };
    
    setUser(demoUser);
    setFirebaseUser({ uid: 'demo-user', email: 'demo@tradetrackr.com', displayName: `Demo ${role}` });
    setLoading(false);
  };

  // ============================================================================
  // Auto-Sync Implementation
  // ============================================================================

  const startAutoSync = async () => {
    if (!user || !user.concernID) return;
    if (autoSyncActive) return;

    setAutoSyncActive(true);
    setSyncStatus('syncing');

    try {
      // Load initial data
      const [users, projects, tasks, reports, customers, materials, categories] = await Promise.all([
        userService.getAll(user.concernID).catch(() => []),
        projectService.getAll(user.concernID).catch(() => []),
        taskService.getAll(user.concernID).catch(() => []),
        reportService.getReportsByConcern(user.concernID).catch(() => []),
        customerService.getAll(user.concernID).catch(() => []),
        materialService.getAll(user.concernID).catch(() => []),
        categoryService.getAll(user.concernID).catch(() => []),
      ]);

      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('projects', JSON.stringify(projects));
      localStorage.setItem('tasks', JSON.stringify(tasks));
      localStorage.setItem('reports', JSON.stringify(reports));
      localStorage.setItem('customers', JSON.stringify(customers));
      localStorage.setItem('materials', JSON.stringify(materials));
      localStorage.setItem('categories', JSON.stringify(categories));

      // Set up listeners
      const unsubscribers: Array<() => void> = [];

      unsubscribers.push(FirestoreService.subscribeToCollection('users', user.concernID, (data) => {
        localStorage.setItem('users', JSON.stringify(data));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      }));

      unsubscribers.push(FirestoreService.subscribeToCollection('projects', user.concernID, (data) => {
        localStorage.setItem('projects', JSON.stringify(data));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      }));

      unsubscribers.push(FirestoreService.subscribeToCollection('tasks', user.concernID, (data) => {
        localStorage.setItem('tasks', JSON.stringify(data));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      }));

      unsubscribers.push(FirestoreService.subscribeToCollection('ProjectReports', user.concernID, (data) => {
        localStorage.setItem('reports', JSON.stringify(data));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      }));

      unsubscribers.push(FirestoreService.subscribeToCollection('customers', user.concernID, (data) => {
        localStorage.setItem('customers', JSON.stringify(data));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      }));

      unsubscribers.push(FirestoreService.subscribeToCollection('materials', user.concernID, (data) => {
        localStorage.setItem('materials', JSON.stringify(data));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      }));

      unsubscribers.push(FirestoreService.subscribeToCollection('categories', user.concernID, (data) => {
        localStorage.setItem('categories', JSON.stringify(data));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      }));

      setSyncUnsubscribers(unsubscribers);
      setLastSyncTime(new Date());
      setSyncStatus('idle');
    } catch (error) {
      console.error('Auto-sync error:', error);
      setSyncStatus('error');
      setAutoSyncActive(false);
    }
  };

  const stopAutoSync = () => {
    if (!autoSyncActive) return;
    
    syncUnsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Unsubscribe error:', error);
      }
    });

    setSyncUnsubscribers([]);
    setAutoSyncActive(false);
    setSyncStatus('idle');
  };

  const isAutoSyncActive = () => autoSyncActive;
  const getLastSyncTime = () => lastSyncTime;
  const getSyncStatus = () => syncStatus;

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    logout,
    enterDemoMode,
    syncLocalDataToFirestore,
    generateDemoDataForDemoUser,
    isDemoUser,
    canCreateProject,
    canCreateTask,
    canCreateProjectInfo,
    canViewReports,
    canCreateCustomer,
    canCreateMaterial,
    canCreateCategory,
    canCreateUser,
    canViewOwnProjects,
    canViewOwnReports,
    canViewOwnProjectInfo,
    canViewCustomers,
    canViewMaterials,
    canViewCategories,
    canViewUsers,
    hasPermission,
    canCreateReport,
    canCreateCRM,
    canViewCRM,
    canUseMessaging,
    getDefaultDashboard,
    startAutoSync,
    stopAutoSync,
    isAutoSyncActive,
    getLastSyncTime,
    getSyncStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
