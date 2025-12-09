import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
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

// Funktion zur Generierung der Concern-ID
const generateConcernId = (): string => {
  const now = new Date();
  const millenniumTime = Math.floor(now.getTime() / 1000); // Unix Timestamp in Sekunden
  const hexTime = millenniumTime.toString(16).toUpperCase(); // Hex-String
  return `DE${hexTime}`; // Deutschland-Code + Hex-Timestamp
};

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
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
  
  // Neue Synchronisationsfunktionen
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Neue Synchronisations-States
  const [autoSyncActive, setAutoSyncActive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [syncUnsubscribers, setSyncUnsubscribers] = useState<Array<() => void>>([]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Benutzer aus Firestore abrufen - suche nach UID-Feld, nicht nach Dokument-ID
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          // Falls der Benutzer nicht direkt gefunden wurde, suche nach der UID im uid-Feld
          if (!userDoc.exists()) {
            console.log('🔍 User not found by document ID, searching by UID field...');
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/config/firebase');
            
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', firebaseUser.uid));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              // Verwende das erste gefundene Dokument
              const foundUserDoc = querySnapshot.docs[0];
              userDoc = { 
                exists: () => true, 
                data: () => foundUserDoc.data(),
                id: foundUserDoc.id 
              } as any;
              console.log('✅ User found by UID field search');
            }
          }
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            
            // Check if user is marked as deleted
            console.log('🔍 Checking user deletion status:', { 
              uid: firebaseUser.uid, 
              isDeleted: userData.isDeleted, 
              deletedAt: userData.deletedAt,
              isActive: userData.isActive 
            });
            
            if (userData.isDeleted) {
              console.log('🚫 User is marked as deleted, signing out');
              // Sign out the deleted user
              await signOut(auth);
              setUser(null);
              setFirebaseUser(null);
              return;
            }
            
            const userWithUid = {
              ...userData,
              uid: firebaseUser.uid
            };
            
            // Entferne den Verifizierungscode, wenn der Benutzer sich anmeldet
            if (userData.verificationCode) {
              try {

                await userService.update(firebaseUser.uid, {
                  verificationCode: null,
                  verificationCodeDate: null,
                  verificationCodeSent: false
                });

                
                // Aktualisiere den lokalen Benutzer-Status
                userWithUid.verificationCode = null;
                userWithUid.verificationCodeDate = null;
                userWithUid.verificationCodeSent = false;
              } catch (error) {

              }
            }
            

            setUser(userWithUid);

          }
        } catch (error) {

        }
      } else {
        setUser(null);

      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Neuer useEffect für automatische Synchronisation
  useEffect(() => {
    if (user && user.concernID && !user.isDemoUser) {

      
      // Kurze Verzögerung, um sicherzustellen, dass der Benutzer vollständig geladen ist
      const timer = setTimeout(() => {
        startAutoSync();
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        // Stoppe Auto-Sync beim Abmelden
        if (autoSyncActive) {
          stopAutoSync();
        }
      };
    } else if (user && user.isDemoUser) {

    } else {

    }
  }, [user, user?.concernID, user?.isDemoUser]);

  const signIn = async (email: string, password: string) => {
    try {


      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      

      
      // Benutzer aus Firestore abrufen

      let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      console.log('ðŸ” Firestore response received, exists:', userDoc.exists());
      
      if (userDoc.exists()) {

        const userData = userDoc.data() as User;

        // Check if user is marked as deleted
        console.log('🔍 SignIn - Checking user deletion status:', { 
          uid: firebaseUser.uid, 
          isDeleted: userData.isDeleted, 
          deletedAt: userData.deletedAt,
          isActive: userData.isActive 
        });
        
        if (userData.isDeleted) {
          console.log('🚫 SignIn - User is marked as deleted, throwing error');
          throw new Error('Dieser Benutzer-Account wurde gelöscht. Bitte kontaktieren Sie den Administrator.');
        }
        
        const userWithUid = {
          ...userData,
          uid: firebaseUser.uid
        };

        
        // Demo-Daten bereinigen, wenn es sich um einen echten Benutzer handelt
        if (userWithUid.email !== 'demo@tradetrackr.com') {

          cleanupDemoData();

        }
        
        // WICHTIG: öberprüfe, ob es doppelte Benutzer-Eintrö¤ge mit derselben E-Mail gibt
        // Wenn ja, verwende den mit der korrekten ConcernID (der, der den Verifizierungscode hatte)
        if (userWithUid.concernID && userWithUid.concernID !== 'DE0000000000') {

          
          try {
            // Suche nach allen Benutzern mit derselben E-Mail
            const duplicateUsers = await userService.getByEmail(email, userWithUid.concernID);
            
            if (duplicateUsers && Array.isArray(duplicateUsers) && duplicateUsers.length > 1) {

              
              // Finde den Benutzer mit der ursprünglichen ConcernID (der, der den Verifizierungscode hatte)
              const originalUser = duplicateUsers.find((u: any) => u.verificationCode === null && u.uid === firebaseUser.uid);
              
              if (originalUser) {

                userWithUid.concernID = originalUser.concernID;
              } else {

              }
            }
          } catch (error) {

          }
        }
        

        setUser(userWithUid);

        // lastLogin Feld aktualisieren
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            lastLogin: new Date()
          });
          console.log('✅ lastLogin erfolgreich aktualisiert');
        } catch (error) {
          console.error('❌ Fehler beim Aktualisieren des lastLogin:', error);
        }
        
        // Direkte Navigation nach erfolgreichem Login

        const defaultDashboard = getDefaultDashboard();

        
        // Navigation über window.location.href (direkt und zuverlö¤ssig)
        window.location.href = `#${defaultDashboard}`;

      } else {

        
        // WICHTIG: Bei Verifizierungscode-Registrierung NICHT automatisch Fallback-Benutzer erstellen
        // Der Benutzer sollte sich manuell anmelden, nachdem die Registrierung abgeschlossen ist

        
        // Prüfe, ob es sich um eine Verifizierungscode-Registrierung handelt
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('@/config/firebase');
          
          // Suche nach Benutzern mit dieser E-Mail, die möglicherweise noch einen Verifizierungscode haben
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const existingUsers = querySnapshot.docs.map(doc => ({
              ...doc.data(),
              uid: doc.id
            }));
            
            // Prüfe, ob es einen Benutzer mit Verifizierungscode gibt
            const userWithVerificationCode = existingUsers.find((u: any) => u.verificationCode);
            
            if (userWithVerificationCode) {

              throw new Error('Ihre Registrierung ist noch nicht vollständig abgeschlossen. Bitte warten Sie einen Moment und versuchen Sie es erneut, oder kontaktieren Sie den Administrator.');
            }
            
            // Prüfe, ob es einen Benutzer ohne Firebase UID gibt (nur Firestore-Dokument-ID)
            const userWithoutFirebaseUID = existingUsers.find((u: any) => !u.uid || u.uid === u.concernID);
            
            if (userWithoutFirebaseUID) {

              throw new Error('Ihre Registrierung konnte nicht vollständig abgeschlossen werden. Bitte kontaktieren Sie den Administrator oder versuchen Sie die Registrierung erneut.');
            }
          }
        } catch (verificationCheckError) {

          
          // Wenn es ein Verifizierungscode-Fehler ist, re-throw den Fehler
          if (verificationCheckError instanceof Error && 
              (verificationCheckError.message.includes('Registrierung') || 
               verificationCheckError.message.includes('Administrator'))) {
            throw verificationCheckError;
          }
        }
        
        // Nur wenn es sich definitiv NICHT um eine Verifizierungscode-Registrierung handelt,
        // erstelle einen Fallback-Benutzer

        
        // WICHTIG: Bevor wir einen Fallback-Benutzer erstellen, prüfen wir nochmals nach bestehenden Benutzern
        // Suche nach Benutzern mit derselben E-Mail (erweiterte Suche)
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('@/config/firebase');
          
          const usersRef = collection(db, 'users');
          const emailQuery = query(usersRef, where('email', '==', email));
          const emailSnapshot = await getDocs(emailQuery);
          
          if (!emailSnapshot.empty) {
            const existingUsers = emailSnapshot.docs.map(doc => ({
              ...doc.data(),
              docId: doc.id
            }));
            
            console.log('🔍 Found existing users with email before fallback:', existingUsers.length);
            
            // Suche nach einem aktiven Benutzer, der aktualisiert werden kann
            const updateableUser = existingUsers.find((u: any) => 
              !u.isDeleted && 
              u.isActive !== false
            );
            
            if (updateableUser) {
              console.log('✅ Found updateable user, updating with Firebase UID instead of creating new');
              
              // Aktualisiere den bestehenden Benutzer mit der korrekten Firebase UID
              const updatedUserData = {
                ...updateableUser,
                uid: firebaseUser.uid,
                lastSync: new Date(),
                verificationCode: null,
                verificationCodeDate: null,
                verificationCodeSent: false
              };
              
              // Aktualisiere in Firestore
              await userService.update(updateableUser.docId, {
                uid: firebaseUser.uid,
                lastSync: new Date(),
                verificationCode: null,
                verificationCodeDate: null,
                verificationCodeSent: false
              });
              
              console.log('✅ Existing user updated successfully with Firebase UID');
              
              // User-State setzen
              setUser(updatedUserData);
              
              // Navigation
              const defaultDashboard = getDefaultDashboard();
              window.location.href = `#${defaultDashboard}`;
              
              return; // Exit - kein Fallback-Benutzer nötig
            }
          }
        } catch (emailSearchError) {
          console.error('Error searching for existing users by email:', emailSearchError);
        }
        
        // Fallback: Benutzer in Firestore erstellen (nur wenn definitiv kein Benutzer existiert)
        console.log('📝 No existing user found, creating new user (should be very rare)');
        try {
          const fallbackUser: User = {
            uid: firebaseUser.uid,
            concernID: generateConcernId(),
            dateCreated: new Date(),
            email: firebaseUser.email || email,
            displayName: firebaseUser.displayName || '',
            photoUrl: firebaseUser.photoURL || '',
            tel: '',
            passpin: 0,
            vorname: firebaseUser.displayName?.split(' ')[0] || '',
            mitarbeiterID: Math.floor(Math.random() * 10000) + 1000,
            lastSync: new Date(),
            nachname: firebaseUser.displayName?.split(' ')[1] || '',
            generatedProjects: 0,
            rechte: 5,
            startDate: new Date(),
            role: 'admin', // Standardrolle
            isActive: true,
            isDemoUser: false,
                    // Unternehmensfelder werden nicht mehr in User gespeichert (aus Concern Collection)
          };
          
          // User in Firestore speichern (mit Firebase UID)
          const { uid, ...userWithoutUid } = fallbackUser;
          await userService.createWithId(firebaseUser.uid, userWithoutUid);

          
          // User-State setzen und navigieren

          setUser(fallbackUser);

          
          // Direkte Navigation

          const defaultDashboard = getDefaultDashboard();

          
          window.location.href = `#${defaultDashboard}`;

          
        } catch (fallbackError) {

          throw new Error('Benutzer konnte nicht in der Datenbank erstellt werden');
        }
      }
    } catch (error) {

      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    try {
      const concernId = generateConcernId();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      if (userData.displayName) {
        await updateProfile(firebaseUser, { displayName: userData.displayName });
      }

      const newUser: User = {
        uid: firebaseUser.uid,
        concernID: concernId,
        dateCreated: new Date(),
        email: email,
        displayName: userData.displayName || '',
        photoUrl: userData.photoUrl || '',
        tel: userData.tel || '',
        passpin: userData.passpin || 0,
        vorname: userData.vorname || '',
        mitarbeiterID: userData.mitarbeiterID || Math.floor(Math.random() * 10000) + 1000,
        lastSync: new Date(),
        nachname: userData.nachname || '',
        generatedProjects: 0,
        rechte: 5,
        startDate: userData.startDate || new Date(),
        dateOfBirth: userData.dateOfBirth,
        role: 'admin',
        isActive: true,
        isDemoUser: false,
        // Unternehmensfelder werden nicht mehr in User gespeichert (aus Concern Collection)
      };

      // Concern direkt in Firestore erstellen (mit benutzerdefinierter ID)
      const companyName = `${userData.vorname} ${userData.nachname} GmbH`;
      const concernData = {
        dateCreated: new Date(),
        concernName: companyName,
        concernAddress: 'Adresse wird spö¤ter hinzugefügt',
        concernTel: userData.tel || '',
        concernEmail: email,
        updateTime: new Date(),
        members: 1
      };
      

      
      try {



        
        const result = await concernService.createWithId(concernId, concernData);

      } catch (concernError) {


        
        // Detaillierte Fehleranalyse
        if (concernError instanceof Error) {


        }
        
        // Zusö¤tzliche Debug-Informationen

        console.error('âŒ Concern service methods:', Object.keys(concernService));

        
        // Fallback: Concern lokal speichern für spö¤tere Synchronisation
        const concernWithUid = { ...concernData, uid: concernId };
        localStorage.setItem(`concern_${concernId}`, JSON.stringify(concernWithUid));

      }

      // Kurze Verzögerung zwischen Concern- und User-Erstellung

      await new Promise(resolve => setTimeout(resolve, 500));
      
      // User direkt in Firestore erstellen (mit Firebase UID)

      
      try {
        const { uid, ...userWithoutUid } = newUser;
        const result = await userService.createWithId(firebaseUser.uid, userWithoutUid);

      } catch (userError) {


        
        // Detaillierte Fehleranalyse
        if (userError instanceof Error) {


        }
        
        // Fallback: User lokal speichern für spö¤tere Synchronisation
        localStorage.setItem(`user_${firebaseUser.uid}`, JSON.stringify(newUser));

      }

      setUser(newUser);
      
      // Direkte Navigation nach erfolgreicher Registrierung

      const defaultDashboard = getDefaultDashboard();

      
      // Navigation über window.location.href (direkt und zuverlö¤ssig)
      window.location.href = `#${defaultDashboard}`;

    } catch (error) {

      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {

      throw error;
    }
  };

  // Funktion zum Synchronisieren der lokalen Daten mit Firestore
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

        }
      }
      
      if (!hasLocalData) {

      }
    } catch (error) {

    }
  };

  // Berechtigungsprüfungen basierend auf Benutzerrolle
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
    return true; // Alle Benutzer können Berichte einsehen
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
    return true; // Alle Benutzer können ihre eigenen Projekte einsehen
  };

  const canViewOwnReports = (): boolean => {
    if (!user) return false;
    return true; // Alle Benutzer können ihre eigenen Berichte einsehen
  };

  const canViewOwnProjectInfo = (): boolean => {
    if (!user) return false;
    return true; // Alle Benutzer können ihre eigenen Projektinformationen einsehen
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
    
    // Rollenbasierte Berechtigungen
    switch (user.role) {
      case 'admin':
        return true; // Admin hat alle Berechtigungen
      case 'office':
        return [
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
    // Büro (office) kann keine Berichte erstellen, nur lesen
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
    // Alle authentifizierten Benutzer können das Messaging-System nutzen
    return !!user && user.isActive;
  };

  const isDemoUser = (): boolean => {
    // Prüfe, ob der Benutzer ein Demo-Benutzer ist
    // Demo-Benutzer haben eine spezifische E-Mail-Adresse
    if (!user) return false;
    return user.email === 'demo@tradetrackr.com';
  };

  const getDefaultDashboard = (): string => {
    if (!user) return 'dashboard'; // Standard-Dashboard für nicht angemeldete Benutzer
    
    // Demo-Benutzer gehen zum Haupt-Dashboard
    if (isDemoUser()) return 'dashboard';
    
    // Rollenbasierte Dashboard-Navigation
    switch (user.role) {
      case 'admin':
        return 'dashboard'; // Admin sieht alle Funktionen
      case 'manager':
        return 'dashboard'; // Manager sieht alle Funktionen
      case 'office':
        return 'dashboard'; // Büro sieht alle relevanten Funktionen
      case 'employee':
        return 'dashboard'; // Mitarbeiter sehen eingeschrö¤nkte Funktionen
      case 'service_technician':
        return 'dashboard'; // Servicetechniker sehen eingeschrö¤nkte Funktionen
      case 'auftraggeber':
        return 'auftraggeber'; // Auftraggeber haben eigenes Dashboard
      default:
        return 'dashboard'; // Standard-Dashboard
    }
  };

  // Funktion zum Generieren von Demo-Daten für Demo-Benutzer
  const generateDemoDataForDemoUser = () => {
    if (!isDemoUser()) return;
    
    try {

      
      // Demo-Projekte generieren
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
      
      // Demo-Berichte generieren
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
              // Unternehmensfelder werden nicht mehr in User gespeichert (aus Concern Collection)
    };
    
    setUser(demoUser);
    

  };

  // Neue Synchronisationsfunktionen
  const startAutoSync = async () => {
    if (!user || !user.concernID) {

      return;
    }

    if (autoSyncActive) {

      return;
    }


    setAutoSyncActive(true);
    setSyncStatus('syncing');

    try {
      // ZUERST: Alle Daten sofort laden (nicht nur auf Änderungen warten)

      
      // Users Collection sofort laden
      try {
        const users = await userService.getAll(user.concernID);

        localStorage.setItem('users', JSON.stringify(users));
        
        // Debug: öberprüfe den Inhalt
        console.log('ðŸ” Erste 3 Benutzer:', users.slice(0, 3).map(u => ({ 
          uid: u.uid, 
          email: u.email, 
          vorname: u.vorname, 
          nachname: u.nachname,
          concernID: u.concernID 
        })));
        
      } catch (error) {

      }

      // Projects Collection sofort laden
      try {
        const projects = await projectService.getAll(user.concernID);

        localStorage.setItem('projects', JSON.stringify(projects));
      } catch (error) {

      }

      // Tasks Collection sofort laden
      try {
        const tasks = await taskService.getAll(user.concernID);

        localStorage.setItem('tasks', JSON.stringify(tasks));
      } catch (error) {

      }

      // Reports Collection sofort laden
      try {
        const reports = await reportService.getReportsByConcern(user.concernID);

        localStorage.setItem('reports', JSON.stringify(reports));
      } catch (error) {

      }

      // Customers Collection sofort laden
      try {
        const customers = await customerService.getAll(user.concernID);

        localStorage.setItem('customers', JSON.stringify(customers));
      } catch (error) {

      }

      // Materials Collection sofort laden
      try {
        const materials = await materialService.getAll(user.concernID);

        localStorage.setItem('materials', JSON.stringify(materials));
      } catch (error) {

      }

      // Categories Collection sofort laden
      try {
        const categories = await categoryService.getAll(user.concernID);

        localStorage.setItem('categories', JSON.stringify(categories));
      } catch (error) {

      }

      // DANN: Firestore-Listener für Echtzeit-Updates starten

      const unsubscribers: Array<() => void> = [];

      // Users Collection Listener
      const usersUnsubscribe = FirestoreService.subscribeToCollection('users', user.concernID, (users) => {

        localStorage.setItem('users', JSON.stringify(users));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      });
      unsubscribers.push(usersUnsubscribe);

      // Projects Collection Listener
      const projectsUnsubscribe = FirestoreService.subscribeToCollection('projects', user.concernID, (projects) => {

        localStorage.setItem('projects', JSON.stringify(projects));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      });
      unsubscribers.push(projectsUnsubscribe);

      // Tasks Collection Listener
      const tasksUnsubscribe = FirestoreService.subscribeToCollection('tasks', user.concernID, (tasks) => {

        localStorage.setItem('tasks', JSON.stringify(tasks));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      });
      unsubscribers.push(tasksUnsubscribe);

      // Reports Collection Listener
      const reportsUnsubscribe = FirestoreService.subscribeToCollection('ProjectReports', user.concernID, (reports) => {

        localStorage.setItem('reports', JSON.stringify(reports));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      });
      unsubscribers.push(reportsUnsubscribe);

      // Customers Collection Listener
      const customersUnsubscribe = FirestoreService.subscribeToCollection('customers', user.concernID, (customers) => {

        localStorage.setItem('customers', JSON.stringify(customers));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      });
      unsubscribers.push(customersUnsubscribe);

      // Materials Collection Listener
      const materialsUnsubscribe = FirestoreService.subscribeToCollection('materials', user.concernID, (materials) => {

        localStorage.setItem('materials', JSON.stringify(materials));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      });
      unsubscribers.push(materialsUnsubscribe);

      // Categories Collection Listener
      const categoriesUnsubscribe = FirestoreService.subscribeToCollection('categories', user.concernID, (categories) => {

        localStorage.setItem('categories', JSON.stringify(categories));
        setLastSyncTime(new Date());
        setSyncStatus('idle');
      });
      unsubscribers.push(categoriesUnsubscribe);

      setSyncUnsubscribers(unsubscribers);
      setLastSyncTime(new Date());
      setSyncStatus('idle');


    } catch (error) {

      setSyncStatus('error');
      setAutoSyncActive(false);
    }
  };

  const stopAutoSync = () => {
    if (!autoSyncActive) {

      return;
    }


    
    // Alle Listener beenden
    syncUnsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {

      }
    });

    setSyncUnsubscribers([]);
    setAutoSyncActive(false);
    setSyncStatus('idle');

  };

  const isAutoSyncActive = () => autoSyncActive;
  const getLastSyncTime = () => lastSyncTime;
  const getSyncStatus = () => syncStatus;

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
    
    // Neue Synchronisationsfunktionen
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
