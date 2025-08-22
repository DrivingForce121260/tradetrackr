import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AppHeader from './AppHeader';
import QuickActionButtons from './QuickActionButtons';
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Building, Send, CheckCircle, Table as TableIcon, Package, X, ArrowUpDown, ArrowUp, ArrowDown, Filter, Eye, Calendar, FolderOpen, CheckSquare, BarChart3, Building2, ClipboardList, FileText, MapPin, Clock, RefreshCw, Archive } from 'lucide-react';
import { userService, concernService } from '@/services/firestoreService';
import { User as FirestoreUser } from '@/services/firestoreService';

import { UserManagementProps } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';

type UserRole = 'admin' | 'office' | 'project_manager' | 'service_technician' | 'auftraggeber';

// Hilfsfunktion fÃ¼r Rollenberechtigungen
const getRolePermissions = (role: UserRole): number => {
  const permissions = {
    admin: 5,
    office: 4,
    project_manager: 3,
    service_technician: 2,
    auftraggeber: 1
  };
  return permissions[role] || 1;
};

// Hilfsfunktion fÃ¼r Altersberechnung
const calculateAge = (birthday: string): number => {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Hilfsfunktion fÃ¼r eindeutige Mitarbeiternummer
const generateUniqueMitarbeiterID = (existingEmployees: Employee[]): number => {
  const usedIDs = new Set(existingEmployees.map(emp => emp.mitarbeiterID).filter(id => id !== undefined));
  let newID = 1;
  
  while (usedIDs.has(newID) && newID <= 9999) {
    newID++;
  }
  
  if (newID > 9999) {
    // Fallback: ZufÃ¤llige Nummer generieren
    newID = Math.floor(Math.random() * 9999) + 1;
  }
  
  return newID;
};

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  age: number;
  birthday: string;
  dateOfBirth?: Date;
  role: UserRole;
  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: Date;
  startDate: string; // Startdatum in der Firma
  createdAt: string;
  projectId?: string; // For auftraggeber users
  mitarbeiterID?: number; // Mitarbeiternummer
  verificationCodeSent?: boolean;
  verificationCodeSentAt?: string;
  verificationCode?: string; // Der generierte Verifizierungscode
  verificationCodeDate?: Date; // Wann der Code generiert wurde
  // Private Adressfelder
  privateAddress?: string;
  privateCity?: string;
  privatePostalCode?: string;
  privateCountry?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const { isQuickAction, quickActionType } = useQuickAction();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [sortField, setSortField] = useState<keyof Employee>('firstName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [projects, setProjects] = useState<Array<{id: string, projectNumber: string, name: string, customerName: string}>>([]);
  
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: '1',
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max@tradetrackr.com',
      phone: '+49 123 456789',
      address: 'MusterstraÃŸe 1, Berlin',
      age: 35,
      birthday: '1989-05-15',
      dateOfBirth: new Date('1989-05-15'),
      role: 'service_technician',
      isActive: true,
      startDate: '2024-01-15',
      createdAt: '2024-01-15',
      mitarbeiterID: 1,
      verificationCodeSent: true,
      verificationCodeSentAt: '2024-01-15T10:30:00.000Z',
      verificationCode: '12345678'
    },
    {
      id: '2',
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna@tradetrackr.com',
      phone: '+49 987 654321',
      address: 'Beispielweg 5, MÃ¼nchen',
      age: 28,
      birthday: '1996-03-22',
      dateOfBirth: new Date('1996-03-22'),
      role: 'project_manager',
      isActive: true,
      startDate: '2024-01-10',
      createdAt: '2024-01-10',
      mitarbeiterID: 2,
      verificationCodeSent: true,
      verificationCodeSentAt: '2024-01-10T14:15:00.000Z',
      verificationCode: '87654321'
    }
  ]);

  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    age: 0,
    birthday: '',
    role: 'service_technician',
    isActive: true,
    startDate: '',
    projectId: '',
    mitarbeiterID: undefined,
    // Private Adressfelder
    privateAddress: '',
    privateCity: '',
    privatePostalCode: '',
    privateCountry: ''
  });

  const [sendingCode, setSendingCode] = useState<string | null>(null);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingEmployee, setVerifyingEmployee] = useState<Employee | null>(null);
  const [showFilledRegistrationForm, setShowFilledRegistrationForm] = useState(false);
  const [filledFormData, setFilledFormData] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [concern, setConcern] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'conflict' | 'synced'>('idle');
  const [pendingChanges, setPendingChanges] = useState<{
    added: Employee[];
    updated: Employee[];
    deleted: string[];
  }>({ added: [], updated: [], deleted: [] });
  
  // Delete confirmation states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Funktion zum manuellen Aktualisieren der Daten aus localStorage oder direkt aus Firestore
  const refreshFromLocalStorage = async () => {
    if (isRefreshing) return; // Verhindere mehrfache Aufrufe
    
    setIsRefreshing(true);
    try {
      console.log('ðŸ”„ Starte manuelle Datenaktualisierung...');
      
              // Zuerst versuchen, aus localStorage zu laden
        const currentUsers = localStorage.getItem('users');
        if (currentUsers) {
          const updatedUsers = JSON.parse(currentUsers);
          const concernUsers = updatedUsers.filter((fsUser: any) => 
            fsUser.concernID === user?.concernID && !fsUser.isDemoUser
          );

          if (concernUsers.length > 0) {
            console.log('ðŸ”„ Aktualisiere UserManagement aus localStorage...');
            
            const firestoreEmployees: Employee[] = concernUsers.map((fsUser: any) => {
              const birthday = fsUser.dateOfBirth ? new Date(fsUser.dateOfBirth).toISOString().split('T')[0] : '';
              return {
                id: fsUser.uid,
                firstName: fsUser.vorname || '',
                lastName: fsUser.nachname || '',
                email: fsUser.email || '',
                phone: fsUser.tel || '',
                address: '',
                age: birthday ? calculateAge(birthday) : 0,
                position: '',
                birthday: birthday,
                role: (fsUser.role || 'service_technician') as UserRole,
                isActive: fsUser.isActive || true,
                startDate: fsUser.startDate ? new Date(fsUser.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                createdAt: fsUser.dateCreated ? new Date(fsUser.dateCreated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                projectId: '',
                mitarbeiterID: fsUser.mitarbeiterID,
                verificationCodeSent: false,
                verificationCodeSentAt: undefined,
                verificationCode: undefined
              };
            });

          setEmployees(firestoreEmployees);
          localStorage.setItem('employees', JSON.stringify(firestoreEmployees));
          
          console.log('âœ… UserManagement aus localStorage aktualisiert');
          
          toast({
            title: 'Daten aktualisiert',
            description: `${firestoreEmployees.length} Mitarbeiter wurden aus dem Cache geladen.`,
          });
          return;
        }
      }

      // Falls keine lokalen Daten vorhanden sind, direkt aus Firestore laden
      console.log('ðŸ”„ Keine lokalen Daten gefunden - lade direkt aus Firestore...');
      
      if (!user?.concernID) {
        toast({
          title: 'Fehler',
          description: 'Keine Concern-ID verfügbar.',
          variant: 'destructive',
        });
        return;
      }

      // Direkt aus Firestore laden
      const firestoreUsers = await userService.getAll(user.concernID);
      const concernUsers = firestoreUsers.filter(fsUser => !fsUser.isDemoUser);

      console.log('ðŸ“Š Firestore-Benutzer geladen:', concernUsers.length);

      if (concernUsers.length > 0) {
        const firestoreEmployees: Employee[] = concernUsers.map(fsUser => {
          const birthday = fsUser.dateOfBirth ? new Date(fsUser.dateOfBirth).toISOString().split('T')[0] : '';
          return {
            id: fsUser.uid,
            firstName: fsUser.vorname || '',
            lastName: fsUser.nachname || '',
            email: fsUser.email || '',
            phone: fsUser.tel || '',
            address: '',
            age: birthday ? calculateAge(birthday) : 0,
            birthday: birthday,
            role: (fsUser.role || 'service_technician') as UserRole,
            isActive: fsUser.isActive || true,
            startDate: fsUser.startDate ? new Date(fsUser.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            createdAt: fsUser.dateCreated ? new Date(fsUser.dateCreated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            projectId: '',
            verificationCodeSent: false,
            verificationCodeSentAt: undefined,
            verificationCode: undefined
          };
        });

        setEmployees(firestoreEmployees);
        localStorage.setItem('employees', JSON.stringify(firestoreEmployees));
        
        // Auch in localStorage 'users' speichern fÃ¼r Auto-Sync
        localStorage.setItem('users', JSON.stringify(concernUsers));
        
        console.log('âœ… UserManagement direkt aus Firestore aktualisiert');
        
        toast({
          title: 'Daten geladen',
          description: `${firestoreEmployees.length} Mitarbeiter wurden direkt aus der Datenbank geladen.`,
        });
      } else {
        console.log('â„¹ï¸ Keine Benutzer in Firestore gefunden');
        toast({
          title: 'Keine Daten',
          description: 'Es wurden keine Benutzer in der Datenbank gefunden.',
        });
      }

    } catch (error) {
      console.error('âŒ Fehler beim Aktualisieren der Daten:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Daten aus der Datenbank.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load projects for auftraggeber selection
  useEffect(() => {
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      const projectsData = JSON.parse(savedProjects);
      setProjects(projectsData.map((p: any) => ({
        id: p.id,
        projectNumber: p.projectNumber,
        name: p.name,
        customerName: p.customerName
      })));
    }
  }, []);

  // Load employees from Firestore and sync with localStorage
  useEffect(() => {
    const loadEmployeesFromFirestore = async () => {
      if (!user?.concernID) return;

      try {
        console.log('ðŸ”„ Loading employees from Firestore for concern:', user.concernID);
        
        // Alle Benutzer aus Firestore laden (gefiltert nach concernID)
        const firestoreUsers = await userService.getAll(user.concernID);
        
        // Nur echte Benutzer (keine Demo-User) filtern
        const concernUsers = firestoreUsers.filter(fsUser => !fsUser.isDemoUser);

        console.log('ðŸ“Š Found concern users:', concernUsers.length);

        // Firestore-Benutzer in Employee-Format konvertieren
        const firestoreEmployees: Employee[] = concernUsers.map(fsUser => ({
          id: fsUser.uid,
          firstName: fsUser.vorname || '',
          lastName: fsUser.nachname || '',
          email: fsUser.email || '',
          phone: fsUser.tel || '',
          address: '', // Nicht in Firestore verfÃ¼gbar
          age: fsUser.dateOfBirth ? calculateAge(fsUser.dateOfBirth.toISOString().split('T')[0]) : 0,
          birthday: fsUser.dateOfBirth ? fsUser.dateOfBirth.toISOString().split('T')[0] : '',
          dateOfBirth: fsUser.dateOfBirth,
          role: (fsUser.role || 'service_technician') as UserRole,
          isActive: fsUser.isActive ?? true,
          isDeleted: fsUser.isDeleted ?? false,
          deletedAt: fsUser.deletedAt,
          startDate: fsUser.startDate ? new Date(fsUser.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          createdAt: fsUser.dateCreated ? new Date(fsUser.dateCreated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          projectId: '',
          mitarbeiterID: fsUser.mitarbeiterID,
          verificationCodeSent: false,
          verificationCodeSentAt: undefined,
          verificationCode: undefined
        }));

        // Lokale Demo-Daten lÃ¶schen
        const localEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
        const demoEmployees = localEmployees.filter((emp: any) => 
          emp.email.includes('demo') || emp.email.includes('@tradetrackr.com')
        );
        
        if (demoEmployees.length > 0) {
          console.log('ðŸ—‘ï¸ Removing demo employees from localStorage:', demoEmployees.length);
          const nonDemoEmployees = localEmployees.filter((emp: any) => 
            !emp.email.includes('demo') && !emp.email.includes('@tradetrackr.com')
          );
          localStorage.setItem('employees', JSON.stringify(nonDemoEmployees));
        }

        // Firestore-Mitarbeiter in localStorage speichern
        localStorage.setItem('employees', JSON.stringify(firestoreEmployees));
        
        // State aktualisieren
        setEmployees(firestoreEmployees);
        
        console.log('âœ… Employees loaded from Firestore and synced to localStorage');
        
        toast({
          title: 'Daten synchronisiert',
          description: `${firestoreEmployees.length} Mitarbeiter aus der Datenbank geladen.`,
        });

      } catch (error) {
        console.error('âŒ Error loading employees from Firestore:', error);
        toast({
          title: 'Fehler beim Laden',
          description: 'Mitarbeiterdaten konnten nicht aus der Datenbank geladen werden.',
          variant: 'destructive',
        });
      }
    };

    // Nur laden wenn ein echter Benutzer (kein Demo) eingeloggt ist
    if (user && !user.isDemoUser) {
      loadEmployeesFromFirestore();
    }
  }, [user, user?.concernID, user?.isDemoUser]);

  // Neuer useEffect fÃ¼r automatische Synchronisation mit Firestore-Updates
  useEffect(() => {
    if (!user?.concernID || user.isDemoUser) return;

    // Funktion zum Ãœberwachen von localStorage-Ã„nderungen (die durch Auto-Sync verursacht werden)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'users' && e.newValue) {
        try {
          console.log('ðŸ”„ Firestore Auto-Sync Update erkannt - aktualisiere UserManagement...');
          
          const updatedUsers = JSON.parse(e.newValue);
          
          // Nur echte Benutzer (keine Demo-User) filtern
          const concernUsers = updatedUsers.filter((fsUser: any) => 
            fsUser.concernID === user.concernID && !fsUser.isDemoUser
          );

          // Firestore-Benutzer in Employee-Format konvertieren
          const firestoreEmployees: Employee[] = concernUsers.map((fsUser: any) => {
            const birthday = fsUser.dateOfBirth ? new Date(fsUser.dateOfBirth).toISOString().split('T')[0] : '';
            return {
              id: fsUser.uid,
              firstName: fsUser.vorname || '',
              lastName: fsUser.nachname || '',
              email: fsUser.email || '',
              phone: fsUser.tel || '',
              address: '',
              age: birthday ? calculateAge(birthday) : 0,
              birthday: birthday,
              role: (fsUser.role || 'service_technician') as UserRole,
              isActive: fsUser.isActive || true,
              startDate: fsUser.startDate ? new Date(fsUser.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              createdAt: fsUser.dateCreated ? new Date(fsUser.dateCreated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              projectId: '',
              mitarbeiterID: fsUser.mitarbeiterID,
              verificationCodeSent: false,
              verificationCodeSentAt: undefined,
              verificationCode: undefined
            };
          });

          // State aktualisieren
          setEmployees(firestoreEmployees);
          
          // localStorage aktualisieren
          localStorage.setItem('employees', JSON.stringify(firestoreEmployees));
          
          console.log('âœ… UserManagement automatisch mit Firestore-Updates synchronisiert');
          
          // Toast-Nachricht fÃ¼r den Benutzer
          toast({
            title: 'Automatische Synchronisation',
            description: `${firestoreEmployees.length} Mitarbeiter wurden aktualisiert.`,
          });

        } catch (error) {
          console.error('âŒ Fehler bei der automatischen Synchronisation:', error);
        }
      }
    };

    // Event-Listener fÃ¼r localStorage-Ã„nderungen hinzufÃ¼gen
    window.addEventListener('storage', handleStorageChange);

    // ZusÃ¤tzlich: Polling fÃ¼r localStorage-Ã„nderungen (fÃ¼r bessere KompatibilitÃ¤t)
    const pollInterval = setInterval(() => {
      const currentUsers = localStorage.getItem('users');
      if (currentUsers) {
        try {
          const updatedUsers = JSON.parse(currentUsers);
          const concernUsers = updatedUsers.filter((fsUser: any) => 
            fsUser.concernID === user.concernID && !fsUser.isDemoUser
          );

          // PrÃ¼fen, ob sich die Anzahl der Benutzer geÃ¤ndert hat
          if (concernUsers.length !== employees.length) {
            console.log('ðŸ”„ Anzahl der Benutzer hat sich geÃ¤ndert - aktualisiere UserManagement...');
            
            const firestoreEmployees: Employee[] = concernUsers.map((fsUser: any) => {
              const birthday = fsUser.dateOfBirth ? new Date(fsUser.dateOfBirth).toISOString().split('T')[0] : '';
              return {
                id: fsUser.uid,
                firstName: fsUser.vorname || '',
                lastName: fsUser.nachname || '',
                email: fsUser.email || '',
                phone: fsUser.tel || '',
                address: '',
                age: birthday ? calculateAge(birthday) : 0,
                position: '',
                birthday: birthday,
                role: (fsUser.role || 'service_technician') as UserRole,
                isActive: fsUser.isActive || true,
                startDate: fsUser.startDate ? new Date(fsUser.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                createdAt: fsUser.dateCreated ? new Date(fsUser.dateCreated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                projectId: '',
                mitarbeiterID: fsUser.mitarbeiterID,
                verificationCodeSent: false,
                verificationCodeSentAt: undefined,
                verificationCode: undefined
              };
            });

            setEmployees(firestoreEmployees);
            localStorage.setItem('employees', JSON.stringify(firestoreEmployees));
            
            console.log('âœ… UserManagement durch Polling aktualisiert');
          }
        } catch (error) {
          console.error('âŒ Fehler beim Polling:', error);
        }
      }
    }, 5000); // Alle 5 Sekunden prÃ¼fen

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [user, user?.concernID, user?.isDemoUser, employees.length]);

  // Firestore synchronization functions
  const syncWithFirestore = async () => {
    if (!user?.concernID) return;
    
    setSyncStatus('syncing');
    try {
      console.log('ðŸ”„ Starting Firestore synchronization...');
      
      // Get current Firestore data
      const firestoreUsers = await userService.getAll(user.concernID);
      const concernUsers = firestoreUsers.filter(fsUser => !fsUser.isDemoUser);
      
      // Convert to Employee format
      const firestoreEmployees: Employee[] = concernUsers.map(fsUser => {
        const birthday = fsUser.dateOfBirth ? new Date(fsUser.dateOfBirth).toISOString().split('T')[0] : '';
        return {
          id: fsUser.uid,
          firstName: fsUser.vorname || '',
          lastName: fsUser.nachname || '',
          email: fsUser.email || '',
          phone: fsUser.tel || '',
          address: '',
          age: birthday ? calculateAge(birthday) : 0,
          birthday: birthday,
          role: (fsUser.role || 'service_technician') as UserRole,
          isActive: fsUser.isActive || true,
          startDate: fsUser.startDate ? new Date(fsUser.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          createdAt: fsUser.dateCreated ? new Date(fsUser.dateCreated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          projectId: '',
          verificationCodeSent: false,
          verificationCodeSentAt: undefined,
          verificationCode: undefined
        };
      });

      // Compare with local data to find changes
      const localEmployees = employees;
      const changes = {
        added: firestoreEmployees.filter(fsEmp => 
          !localEmployees.find(localEmp => localEmp.id === fsEmp.id)
        ),
        updated: firestoreEmployees.filter(fsEmp => {
          const localEmp = localEmployees.find(local => local.id === fsEmp.id);
          return localEmp && (
            localEmp.firstName !== fsEmp.firstName ||
            localEmp.lastName !== fsEmp.lastName ||
            localEmp.email !== fsEmp.email ||
            localEmp.phone !== fsEmp.phone ||
            localEmp.role !== fsEmp.role ||
            localEmp.isActive !== fsEmp.isActive
          );
        }),
        deleted: localEmployees.filter(localEmp => 
          !firestoreEmployees.find(fsEmp => fsEmp.id === localEmp.id)
        ).map(emp => emp.id)
      };

      // If there are changes, show confirmation modal
      if (changes.added.length > 0 || changes.updated.length > 0 || changes.deleted.length > 0) {
        setPendingChanges(changes);
        setShowSyncModal(true);
        setSyncStatus('conflict');
      } else {
        // No changes, update last sync time
        setLastSyncTime(new Date());
        setSyncStatus('synced');
        toast({
          title: 'Synchronisation abgeschlossen',
          description: 'Alle Daten sind aktuell.',
        });
      }
    } catch (error) {
      console.error('âŒ Error during synchronization:', error);
      setSyncStatus('idle');
      toast({
        title: 'Synchronisationsfehler',
        description: 'Fehler beim Synchronisieren mit der Datenbank.',
        variant: 'destructive',
      });
    }
  };

  const applyFirestoreChanges = async () => {
    try {
      // Apply all pending changes
      let updatedEmployees = [...employees];
      
      // Add new employees
      updatedEmployees = [...updatedEmployees, ...pendingChanges.added];
      
      // Update existing employees
      updatedEmployees = updatedEmployees.map(emp => {
        const update = pendingChanges.updated.find(u => u.id === emp.id);
        return update || emp;
      });
      
      // Remove deleted employees
      updatedEmployees = updatedEmployees.filter(emp => 
        !pendingChanges.deleted.includes(emp.id)
      );
      
      // Update state and localStorage
      setEmployees(updatedEmployees);
      localStorage.setItem('employees', JSON.stringify(updatedEmployees));
      
      // Update last sync time
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      
      // Close modal and reset pending changes
      setShowSyncModal(false);
      setPendingChanges({ added: [], updated: [], deleted: [] });
      
      toast({
        title: 'Änderungen übernommen',
        description: `${pendingChanges.added.length} hinzugefügt, ${pendingChanges.updated.length} aktualisiert, ${pendingChanges.deleted.length} gelöscht.`,
      });
    } catch (error) {
      console.error('âŒ Error applying changes:', error);
      toast({
        title: 'Fehler beim Übernehmen',
        description: 'Änderungen konnten nicht übernommen werden.',
        variant: 'destructive',
      });
    }
  };

  const rejectFirestoreChanges = () => {
    setShowSyncModal(false);
    setPendingChanges({ added: [], updated: [], deleted: [] });
    setSyncStatus('idle');
    
    toast({
              title: 'Änderungen abgelehnt',
              description: 'Lokale Daten bleiben unverändert.',
    });
  };

  // Load concern data
  useEffect(() => {
    const loadConcernData = async () => {
      if (!user?.concernID) return;
      
      try {
        const concernData = await concernService.get(user.concernID);
        if (concernData) {
          setConcern(concernData);
        }
      } catch (error) {
        console.error('Error loading concern data:', error);
      }
    };

    loadConcernData();
  }, [user?.concernID]);

  // Reset form when form is opened
  useEffect(() => {
    if (showForm && !editingUser) {
      resetForm();
    }
  }, [showForm, editingUser]);

  // Auto-open create form for quick actions
  useEffect(() => {
    // Only open form automatically for quick actions, not on initial load
    if (isQuickAction && quickActionType === 'user') {
      setShowForm(true);
    }
  }, [isQuickAction, quickActionType]);



  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && employee.isActive && !employee.isDeleted) ||
      (statusFilter === 'inactive' && (!employee.isActive || employee.isDeleted)) ||
      (statusFilter === 'deleted' && employee.isDeleted);
    
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Employee) => {
    if (sortField !== field) return <ArrowUpDown className="h-5 w-5" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRoleFilter('all');
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      age: 0,
      birthday: '',
      role: 'service_technician',
      isActive: true,
      startDate: '',
      projectId: '',
      mitarbeiterID: undefined,
      // Private Adressfelder
      privateAddress: '',
      privateCity: '',
      privatePostalCode: '',
      privateCountry: '',
      // Unternehmensfelder
      
      // Verifikationsfelder
      verificationCode: '',
      verificationCodeSent: false,
      verificationCodeSentAt: undefined,
      verificationCodeDate: undefined,
      // Datumsfelder
      dateOfBirth: null,
      createdAt: ''
    });
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung: PrÃ¼fen, ob die Mitarbeiternummer bereits existiert
    if (formData.mitarbeiterID) {
      const existingEmployee = employees.find(emp => 
        emp.mitarbeiterID === formData.mitarbeiterID && emp.id !== editingUser?.id
      );
      
      if (existingEmployee) {
        toast({
          title: 'Fehler',
          description: `Die Mitarbeiternummer ${formData.mitarbeiterID ? formData.mitarbeiterID.toString().padStart(4, '0') : 'N/A'} wird bereits von ${existingEmployee.firstName} ${existingEmployee.lastName} verwendet.`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    if (editingUser) {
      console.log('ðŸ”„ [EDIT] Updating existing employee:', editingUser.id);
      console.log('ðŸ“ [EDIT] Form data to update:', formData);
      
      try {
        // Concern-Informationen laden
        if (!user?.concernID) {
          toast({ 
            title: "Fehler", 
            description: "Concern ID nicht gefunden. Bitte melden Sie sich erneut an.", 
            variant: "destructive" 
          });
          return;
        }

        console.log('ðŸ” [EDIT] Loading concern data for concernID:', user.concernID);
        const concern = await concernService.get(user.concernID);
        console.log('ðŸ“‹ [EDIT] Concern data loaded:', concern);
        
        if (!concern) {
          toast({ 
            title: "Fehler", 
            description: "Concern-Informationen nicht gefunden.", 
            variant: "destructive" 
          });
          return;
        }

        // VollstÃ¤ndige Benutzerdaten fÃ¼r Firestore erstellen
        const completeUserData: Omit<FirestoreUser, 'uid'> = {
          concernID: user.concernID,
          dateCreated: new Date(),
          email: formData.email || '',
          displayName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
          tel: formData.phone || '',
          passpin: 0,
          vorname: formData.firstName || '',
          mitarbeiterID: formData.mitarbeiterID || generateUniqueMitarbeiterID(employees),
          lastSync: new Date(),
          nachname: formData.lastName || '',
          generatedProjects: 0,
          rechte: getRolePermissions(formData.role || 'service_technician'),
          startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
          dateOfBirth: formData.birthday ? new Date(formData.birthday) : null,
          role: formData.role || 'service_technician',
          isActive: formData.isActive || true,
          isDemoUser: false,
          address: formData.address || ''
        };

        console.log('ðŸ“‹ [EDIT] Complete user data for Firestore update:', completeUserData);
        console.log('ðŸ†” [EDIT] Using mitarbeiterID:', completeUserData.mitarbeiterID);

        // Benutzer in Firestore aktualisieren
        console.log('ðŸ’¾ [EDIT] Updating user in Firestore...');
        await userService.update(editingUser.id, completeUserData);
        console.log('âœ… [EDIT] Firestore update completed successfully');

        // Lokalen State aktualisieren
        console.log('ðŸ†” [EDIT] Updating employee mitarbeiterID to:', formData.mitarbeiterID);
        setEmployees(prev => prev.map(emp => 
          emp.id === editingUser.id ? { ...emp, ...formData } as Employee : emp
        ));
        
        // localStorage aktualisieren
        const currentEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
        const updatedEmployees = currentEmployees.map((emp: any) => 
          emp.id === editingUser.id ? { ...emp, ...formData } : emp
        );
        localStorage.setItem('employees', JSON.stringify(updatedEmployees));
        
        toast({ 
          title: "Mitarbeiter aktualisiert", 
          description: `Die Änderungen wurden erfolgreich in der Datenbank gespeichert. Mitarbeiter-Nr.: ${formData.mitarbeiterID ? formData.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}` 
        });

        setShowForm(false);
        setEditingUser(null);
        resetForm();

      } catch (error) {
        console.error('Fehler beim Aktualisieren des Mitarbeiters:', error);
        toast({ 
          title: "Fehler", 
          description: "Der Mitarbeiter konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.", 
          variant: "destructive" 
        });
        return;
      }
    } else {
      try {
        // Neuen Mitarbeiter in Firestore erstellen
        if (!user?.concernID) {
          toast({ 
            title: "Fehler", 
            description: "Concern ID nicht gefunden. Bitte melden Sie sich erneut an.", 
            variant: "destructive" 
          });
          return;
        }

        // Concern-Informationen laden
        console.log('ðŸ” [CREATE] Loading concern data for concernID:', user.concernID);
        const concern = await concernService.get(user.concernID);
        console.log('ðŸ“‹ [CREATE] Concern data loaded:', concern);
        
        if (!concern) {
          toast({ 
            title: "Fehler", 
            description: "Concern-Informationen nicht gefunden.", 
            variant: "destructive" 
          });
          return;
        }

        const newUserData: Omit<FirestoreUser, 'uid'> = {
          concernID: user.concernID,
          dateCreated: new Date(),
          email: formData.email || '',
          displayName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
          tel: formData.phone || '',
          passpin: 0,
          vorname: formData.firstName || '',
          mitarbeiterID: formData.mitarbeiterID || generateUniqueMitarbeiterID(employees),
          lastSync: new Date(),
          nachname: formData.lastName || '',
          generatedProjects: 0,
          rechte: getRolePermissions(formData.role || 'service_technician'),
          startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
          dateOfBirth: formData.birthday ? new Date(formData.birthday) : null,
          role: formData.role || 'service_technician',
          isActive: formData.isActive || true,
          isDemoUser: false,
          address: formData.address || '',
          // Concern-Informationen werden nicht mehr in User gespeichert
        };
        
        console.log('ðŸ‘¤ [CREATE] New user data created successfully');
        console.log('ðŸ†” [CREATE] Using mitarbeiterID:', newUserData.mitarbeiterID);

        // Mitarbeiter in Firestore erstellen
        const newUserId = await userService.create(newUserData);
        
        // Concern aktualisieren (Mitgliederanzahl erhÃ¶hen)
        const currentConcern = await concernService.get(user.concernID);
        if (currentConcern) {
          await concernService.update(user.concernID, {
            members: (currentConcern.members || 0) + 1
          });
        }

        // Lokalen State aktualisieren
        const newEmployee: Employee = {
          ...formData as Employee,
          id: newUserId,
          startDate: formData.startDate || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString().split('T')[0],
          verificationCodeSent: false
        };
        
        // State aktualisieren
        setEmployees(prev => [...prev, newEmployee]);
        
        // localStorage aktualisieren
        const currentEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
        const updatedEmployees = [...currentEmployees, newEmployee];
        localStorage.setItem('employees', JSON.stringify(updatedEmployees));
        
        toast({ 
          title: "Mitarbeiter hinzugefügt", 
          description: `Der neue Mitarbeiter wurde erfolgreich in der Datenbank erstellt. Mitarbeiter-Nr.: ${newEmployee.mitarbeiterID ? newEmployee.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}. Senden Sie jetzt einen Verifizierungscode.` 
        });
        
        // Alle Formularfelder und States zurÃ¼cksetzen
        console.log('ðŸ§¹ [CREATE] Clearing all form data and states after successful creation...');
        console.log('ðŸ†” [CREATE] Final mitarbeiterID:', newEmployee.mitarbeiterID);
        
        // Hauptformular zurÃ¼cksetzen
        resetForm();
        
        // Formular schlieÃŸen
        setShowForm(false);
        
        // Bearbeitungsmodus zurÃ¼cksetzen
        setEditingUser(null);
        
        // Verifikations-Code zurÃ¼cksetzen
        setVerificationCode('');
        
        console.log('âœ… [CREATE] All form data and states cleared successfully');
        
      } catch (error) {
        console.error('Fehler beim Erstellen des Mitarbeiters:', error);
        toast({ 
          title: "Fehler", 
          description: "Der Mitarbeiter konnte nicht erstellt werden. Bitte versuchen Sie es erneut.", 
          variant: "destructive" 
        });
        return;
      }
    }
    
    // Fallback: Immer Formular zurÃ¼cksetzen (auch bei Fehlern)
    resetForm();
    setShowForm(false);
  };

    const handleSendVerificationCode = async (employee: Employee) => {
    setSendingCode(employee.id);
    
    try {
      // Generiere einen 8-stelligen Verifizierungscode
      const verificationCode = Math.floor(10000000 + Math.random() * 90000000).toString();
      
      // E-Mail-Inhalt vorbereiten
      const emailSubject = 'Verifizierungscode fÃ¼r TradeTrackr';
      const emailBody = `Hallo ${employee.firstName} ${employee.lastName},

Sie wurden erfolgreich in das TradeTrackr-System eingetragen.

Ihre Mitarbeiter-Nr.: ${employee.mitarbeiterID ? employee.mitarbeiterID.toString().padStart(4, '0') : 'Wird generiert'}
Ihr Verifizierungscode lautet: ${verificationCode}

Bitte verwenden Sie diesen Code, um sich in der Anwendung zu verifizieren.

Mit freundlichen GrÃ¼ÃŸen
Ihr TradeTrackr-Team`;

      // E-Mail-Programm Ã¶ffnen mit vorausgefÃ¼llten Daten
      const mailtoLink = `mailto:${employee.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink);
      
      // Update employee with verification code sent status
      const updatedEmployee = {
        ...employee,
        verificationCodeSent: true,
        verificationCodeSentAt: new Date().toISOString(),
        verificationCode: verificationCode,
        verificationCodeDate: new Date() // Wann der Code generiert wurde
      };
      
      setEmployees(prev => prev.map(emp => 
        emp.id === employee.id ? updatedEmployee : emp
      ));
      
      // localStorage aktualisieren
      const currentEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
      const updatedEmployees = currentEmployees.map((emp: any) => 
        emp.id === employee.id ? updatedEmployee : emp
      );
      localStorage.setItem('employees', JSON.stringify(updatedEmployees));
      
      // WICHTIG: UrsprÃ¼ngliche Formulardaten fÃ¼r spÃ¤tere Verifizierung speichern
      console.log('ðŸ’¾ [SEND_CODE] Saving original form data for verification:', employee);
      console.log('ðŸ†” [SEND_CODE] Employee mitarbeiterID:', employee.mitarbeiterID);
      localStorage.setItem('verificationFormData', JSON.stringify(employee));
      
      // Verifizierungscode in Firestore aktualisieren
      try {
        console.log('ðŸ’¾ [SEND_CODE] Updating verification code in Firestore...');
        await userService.update(employee.id, {
          verificationCode: verificationCode,
          verificationCodeDate: new Date(),
          verificationCodeSent: true,
          verificationCodeSentAt: new Date().toISOString()
        });
        console.log('âœ… [SEND_CODE] Verification code updated in Firestore successfully');
      } catch (error) {
        console.error('âŒ [SEND_CODE] Failed to update verification code in Firestore:', error);
        toast({
          title: 'Warnung',
          description: 'Verifizierungscode wurde gesendet, aber konnte nicht in der Datenbank gespeichert werden.',
          variant: 'destructive',
        });
      }
      
              toast({
          title: 'E-Mail-Programm geöffnet',
          description: `E-Mail-Programm wurde mit Verifizierungscode für ${employee.email} geöffnet. Mitarbeiter-Nr.: ${employee.mitarbeiterID ? employee.mitarbeiterID.toString().padStart(4, '0') : 'Wird generiert'}. Bitte senden Sie die E-Mail selbst.`,
        });
    } catch (error) {
      toast({
        title: 'Fehler beim Öffnen',
        description: 'Das E-Mail-Programm konnte nicht geöffnet werden.',
        variant: 'destructive',
      });
    } finally {
      setSendingCode(null);
    }
  };

  const handleVerifyCode = (employee: Employee) => {
    setVerifyingEmployee(employee);
    setShowVerificationForm(true);
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verifyingEmployee) return;
    
    console.log('ðŸ” [VERIFY] Checking verification code...');
    console.log('ðŸ” [VERIFY] Entered code:', verificationCode);
    console.log('ðŸ” [VERIFY] Stored code:', verifyingEmployee.verificationCode);
    
    // Verifizierungscode aus der Datenbank laden (aktueller als lokaler State)
    let currentVerificationCode = verifyingEmployee.verificationCode;
    let currentVerificationCodeDate = verifyingEmployee.verificationCodeDate;
    
    try {
      console.log('ðŸ” [VERIFY] Loading current verification data from Firestore...');
      const currentUser = await userService.get(verifyingEmployee.id);
      if (currentUser) {
        currentVerificationCode = currentUser.verificationCode;
        currentVerificationCodeDate = currentUser.verificationCodeDate;
        console.log('ðŸ“‹ [VERIFY] Current verification data from Firestore:', {
          code: currentVerificationCode,
          date: currentVerificationCodeDate
        });
      }
    } catch (error) {
      console.warn('âš ï¸ [VERIFY] Could not load verification data from Firestore, using local data');
    }
    
    // Verifizierungscode Ã¼berprÃ¼fen
    if (verificationCode === currentVerificationCode) {
      console.log('âœ… [VERIFY] Verification code is correct!');
      
      // ÃœberprÃ¼fen, ob der Code noch gÃ¼ltig ist (nicht Ã¤lter als 24 Stunden)
      if (currentVerificationCodeDate) {
        const codeAge = Date.now() - currentVerificationCodeDate.getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden
        
        if (codeAge > maxAge) {
          console.error('âŒ [VERIFY] Verification code has expired');
          toast({
            title: 'Verifizierungscode abgelaufen',
            description: 'Der Verifizierungscode ist älter als 24 Stunden. Bitte senden Sie einen neuen Code.',
            variant: 'destructive',
          });
          return;
        }
        
        console.log('âœ… [VERIFY] Verification code is still valid (age:', Math.round(codeAge / (1000 * 60 * 60)), 'hours)');
      }
      try {
        // Concern-Informationen laden
        if (!user?.concernID) {
          toast({ 
            title: "Fehler", 
            description: "Concern ID nicht gefunden.", 
            variant: "destructive" 
          });
          return;
        }

                    console.log('ðŸ” [VERIFY] Loading concern data for concernID:', user.concernID);
        const concern = await concernService.get(user.concernID);
            console.log('ðŸ“‹ [VERIFY] Concern data loaded:', concern);
            
            if (!concern) {
              toast({ 
                title: "Fehler", 
                description: "Concern-Informationen nicht gefunden.", 
                variant: "destructive" 
              });
              return;
            }

            // UrsprÃ¼ngliche Formulardaten aus localStorage laden
            console.log('ðŸ” [VERIFY] Loading original form data from localStorage...');
            const originalFormData = localStorage.getItem('verificationFormData');
            console.log('ðŸ“‹ [VERIFY] Original form data:', originalFormData);
            
            if (!originalFormData) {
              console.error('âŒ [VERIFY] No original form data found in localStorage');
              toast({
                title: 'Fehler',
                description: 'Ursprüngliche Formulardaten nicht gefunden. Bitte versuchen Sie es erneut.',
                variant: 'destructive',
              });
              return;
            }
            
            const originalEmployee = JSON.parse(originalFormData);
            console.log('ðŸ‘¤ [VERIFY] Parsed original employee data:', originalEmployee);
            
            // Mitarbeiterdaten mit Concern-Informationen anreichern
            const enrichedEmployeeData: Employee = {
              ...originalEmployee, // UrsprÃ¼ngliche Daten verwenden, nicht verifyingEmployee
                    // Concern-Informationen werden nicht mehr in User gespeichert,
              // dateOfBirth hinzufÃ¼gen
              dateOfBirth: originalEmployee.birthday ? new Date(originalEmployee.birthday) : null,
              // Verifizierungsstatus aktualisieren
              verificationCodeSent: true,
              verificationCodeSentAt: new Date().toISOString()
            };

            console.log('âœ… [VERIFY] Verification successful!');
            console.log('ðŸ“‹ [VERIFY] Enriched employee data:', enrichedEmployeeData);
            console.log('ðŸ†” [VERIFY] Employee mitarbeiterID:', enrichedEmployeeData.mitarbeiterID);
            console.log('ðŸ”„ [VERIFY] Setting filledFormData...');
            
            // AusgefÃ¼lltes Formular anzeigen
            setFilledFormData(enrichedEmployeeData);
            console.log('ðŸ”„ [VERIFY] Setting showFilledRegistrationForm to true...');
            setShowFilledRegistrationForm(true);
            
            console.log('ðŸ”„ [VERIFY] Closing verification form...');
            // Verifizierungsformular schlieÃŸen
            setShowVerificationForm(false);
            setVerificationCode('');
            setVerifyingEmployee(null);

            console.log('ðŸŽ‰ [VERIFY] All states updated, showing toast...');
            toast({
              title: 'Verifizierung erfolgreich',
              description: 'Bitte bestätigen Sie die Mitarbeiterdaten im Registrierungsformular.',
            });

      } catch (error) {
        console.error('Fehler bei der Verifizierung:', error);
        toast({
          title: 'Fehler bei der Verifizierung',
          description: 'Der Mitarbeiter konnte nicht verifiziert werden.',
          variant: 'destructive',
        });
      }
    } else {
      console.error('âŒ [VERIFY] Verification code is incorrect');
      console.error('âŒ [VERIFY] Expected:', currentVerificationCode);
      console.error('âŒ [VERIFY] Received:', verificationCode);
      
      toast({
        title: 'Falscher Verifizierungscode',
        description: 'Der eingegebene Code ist nicht korrekt. Bitte überprüfen Sie den Code aus der E-Mail.',
        variant: 'destructive',
      });
    }
  };

  // Hilfsfunktion zum Vergleichen von Werten
  const hasChanged = (oldValue: any, newValue: any): boolean => {
    if (oldValue === newValue) return false;
    if (oldValue == null && newValue == null) return false;
    if (oldValue == null || newValue == null) return true;
    
    // FÃ¼r Datumsvergleiche
    if (oldValue instanceof Date && newValue instanceof Date) {
      return oldValue.getTime() !== newValue.getTime();
    }
    if (oldValue instanceof Date && typeof newValue === 'string') {
      return oldValue.getTime() !== new Date(newValue).getTime();
    }
    if (typeof oldValue === 'string' && newValue instanceof Date) {
      return new Date(oldValue).getTime() !== newValue.getTime();
    }
    
    // FÃ¼r Arrays und Objekte
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    
    return oldValue !== newValue;
  };

  // Hilfsfunktion zum Erstellen der Update-Daten (nur geÃ¤nderte Felder)
  const createUpdateData = (existingUser: FirestoreUser, formData: Employee): Partial<FirestoreUser> => {
    const updateData: Partial<FirestoreUser> = {};
    let hasAnyChanges = false;

    // PersÃ¶nliche Informationen vergleichen
    if (hasChanged(existingUser.email, formData.email)) {
      updateData.email = formData.email;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.vorname, formData.firstName)) {
      updateData.vorname = formData.firstName;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.nachname, formData.lastName)) {
      updateData.nachname = formData.lastName;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.tel, formData.phone)) {
      updateData.tel = formData.phone;
      hasAnyChanges = true;
    }
    
    // Adressfeld vergleichen
    if (hasChanged(existingUser.address, formData.address)) {
      updateData.address = formData.address;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.role, formData.role)) {
      updateData.role = formData.role;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.isActive, formData.isActive)) {
      updateData.isActive = formData.isActive;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.startDate, formData.startDate ? new Date(formData.startDate) : null)) {
      updateData.startDate = formData.startDate ? new Date(formData.startDate) : null;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.dateOfBirth, formData.dateOfBirth || (formData.birthday ? new Date(formData.birthday) : null))) {
      updateData.dateOfBirth = formData.dateOfBirth || (formData.birthday ? new Date(formData.birthday) : null);
      hasAnyChanges = true;
    }
    
    // Unternehmensinformationen vergleichen
    // Unternehmensfelder werden nicht mehr in User gespeichert (aus Concern Collection)
    
    // Private Adressfelder vergleichen (falls vorhanden)
    if (hasChanged(existingUser.privateAddress, formData.privateAddress)) {
      updateData.privateAddress = formData.privateAddress;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.privateCity, formData.privateCity)) {
      updateData.privateCity = formData.privateCity;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.privatePostalCode, formData.privatePostalCode)) {
      updateData.privatePostalCode = formData.privatePostalCode;
      hasAnyChanges = true;
    }
    
    if (hasChanged(existingUser.privateCountry, formData.privateCountry)) {
      updateData.privateCountry = formData.privateCountry;
      hasAnyChanges = true;
    }
    
    // Berechtigungen aktualisieren, wenn sich die Rolle geÃ¤ndert hat
    if (hasChanged(existingUser.role, formData.role)) {
      updateData.rechte = getRolePermissions(formData.role);
      hasAnyChanges = true;
    }
    
    // Immer lastSync aktualisieren
    updateData.lastSync = new Date();
    
    return hasAnyChanges ? updateData : {};
  };

  const handleNewUser = () => {
    console.log('ðŸ§¹ [NEW_USER] Clearing form and opening for new user...');
    
    // Alle Formularfelder und States zurÃ¼cksetzen
    resetForm();
    
    // Neue eindeutige Mitarbeiter-ID generieren (0001-9999)
    const newMitarbeiterID = generateUniqueMitarbeiterID(employees);
    setFormData(prev => ({ ...prev, mitarbeiterID: newMitarbeiterID }));
    console.log('ðŸ†” [NEW_USER] Generated unique mitarbeiterID:', newMitarbeiterID);
    
    // Bearbeitungsmodus zurÃ¼cksetzen
    setEditingUser(null);
    
    // Verifikations-Code zurÃ¼cksetzen
    setVerificationCode('');
    
    // Filled form States zurÃ¼cksetzen
    setShowFilledRegistrationForm(false);
    setFilledFormData(null);
    
    // Formular Ã¶ffnen
    setShowForm(true);
    
    console.log('âœ… [NEW_USER] Form cleared and opened successfully');
  };

    const handleUpdateEmployee = async () => {
    console.log('ðŸš€ [UPDATE] Function called!');
    console.log('ðŸš€ [UPDATE] filledFormData exists:', !!filledFormData);
    
    if (!filledFormData) {
      console.log('âŒ [UPDATE] No filledFormData, returning early');
      return;
    }
    
    // Validierung: PrÃ¼fen, ob die Mitarbeiternummer bereits existiert
    if (filledFormData.mitarbeiterID) {
      const existingEmployee = employees.find(emp => 
        emp.mitarbeiterID === filledFormData.mitarbeiterID && emp.id !== filledFormData.id
      );
      
      if (existingEmployee) {
        toast({
          title: 'Fehler',
          description: `Die Mitarbeiternummer ${filledFormData.mitarbeiterID ? filledFormData.mitarbeiterID.toString().padStart(4, '0') : 'N/A'} wird bereits von ${existingEmployee.firstName} ${existingEmployee.lastName} verwendet.`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    console.log('ðŸ”„ [UPDATE] Starting employee update process...');
    console.log('ðŸ‘¤ [UPDATE] Employee data to update:', filledFormData);
    console.log('ðŸ†” [UPDATE] Employee mitarbeiterID:', filledFormData.mitarbeiterID);
    
    try {
      console.log('ðŸ”‘ [UPDATE] Current user:', user);
      
      if (!user?.concernID) {
        console.error('âŒ [UPDATE] No concern ID found');
        toast({ 
          title: "Fehler", 
          description: "Concern ID nicht gefunden.", 
          variant: "destructive" 
        });
        return;
      }

      // ÃœberprÃ¼fen, ob der Mitarbeiter bereits in Firestore existiert
      console.log('ðŸ” [UPDATE] Checking if employee exists in Firestore...');
      const existingUser = await userService.get(filledFormData.id);
      console.log('ðŸ‘¤ [UPDATE] Existing user in Firestore:', existingUser);

      if (existingUser) {
        // Benutzer existiert - Nur geÃ¤nderte Felder aktualisieren
        console.log('ðŸ’¾ [UPDATE] User exists, comparing data for selective update...');
        
        const updateData = createUpdateData(existingUser, filledFormData);
        
        if (Object.keys(updateData).length === 0) {
          console.log('â„¹ï¸ [UPDATE] No changes detected, skipping update');
          toast({ 
            title: "Keine Änderungen", 
            description: "Alle Daten sind bereits aktuell.", 
            variant: "default" 
          });
          return;
        }
        
        console.log('ðŸ“ [UPDATE] Changes detected, updating fields:', updateData);
        console.log('ðŸ“Š [UPDATE] Summary of changes:');
        
        // Ã„nderungen protokollieren
        Object.entries(updateData).forEach(([field, newValue]) => {
          if (field !== 'lastSync') { // lastSync immer aktualisieren
            const oldValue = existingUser[field as keyof FirestoreUser];
            console.log(`  ${field}: "${oldValue}" â†’ "${newValue}"`);
          }
        });
        
        // Selektive Aktualisierung durchfÃ¼hren
        await userService.update(filledFormData.id, updateData);
        console.log('âœ… [UPDATE] Firestore selective update completed successfully');
        console.log('ðŸ†” [UPDATE] Updated mitarbeiterID:', updateData.mitarbeiterID);
        
        toast({ 
          title: "Aktualisierung erfolgreich", 
          description: `${Object.keys(updateData).length - 1} Felder wurden aktualisiert.`, 
          variant: "default" 
        });
      } else {
        // Benutzer existiert nicht - Erstellen
        console.log('ðŸ†• [UPDATE] User does not exist, creating new user...');
        
        const completeUserData: Omit<FirestoreUser, 'uid'> = {
          concernID: user.concernID,
          dateCreated: new Date(),
          email: filledFormData.email,
          displayName: `${filledFormData.firstName} ${filledFormData.lastName}`,
          tel: filledFormData.phone,
          passpin: 0,
          vorname: filledFormData.firstName,
          mitarbeiterID: filledFormData.mitarbeiterID || generateUniqueMitarbeiterID(employees),
          lastSync: new Date(),
          nachname: filledFormData.lastName,
          generatedProjects: 0,
          rechte: getRolePermissions(filledFormData.role),
          startDate: filledFormData.startDate ? new Date(filledFormData.startDate) : new Date(),
          dateOfBirth: filledFormData.dateOfBirth || (filledFormData.birthday ? new Date(filledFormData.birthday) : null),
          role: filledFormData.role,
          isActive: filledFormData.isActive,
          isDemoUser: false,
          address: filledFormData.address || '',
          // Unternehmensfelder werden nicht mehr in User gespeichert (aus Concern Collection)
          // Private Adressfelder
          privateAddress: filledFormData.privateAddress || '',
          privateCity: filledFormData.privateCity || '',
          privatePostalCode: filledFormData.privatePostalCode || '',
          privateCountry: filledFormData.privateCountry || ''
        };
        
        const newUserId = await userService.create(completeUserData);
        console.log('âœ… [UPDATE] New user created with ID:', newUserId);
        console.log('ðŸ†” [UPDATE] Using mitarbeiterID:', completeUserData.mitarbeiterID);
        console.log('ðŸ†” [UPDATE] Created user mitarbeiterID:', completeUserData.mitarbeiterID);
        
        toast({ 
          title: "Neuer Benutzer erstellt", 
          description: `Der Benutzer wurde erfolgreich in der Datenbank angelegt. Mitarbeiter-Nr.: ${completeUserData.mitarbeiterID ? completeUserData.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}`, 
          variant: "default" 
        });
      }
      
              // Lokalen State aktualisieren
        console.log('ðŸ”„ [UPDATE] Updating local state...');
        console.log('ðŸ†” [UPDATE] Updating employee mitarbeiterID to:', filledFormData.mitarbeiterID);
        setEmployees(prev => prev.map(emp => 
          emp.id === filledFormData.id 
            ? { 
                ...emp, 
                ...filledFormData,
                verificationCodeSent: true, 
                verificationCodeSentAt: new Date().toISOString() 
              }
            : emp
      ));

              // localStorage aktualisieren
        console.log('ðŸ’¾ [UPDATE] Updating localStorage...');
        console.log('ðŸ†” [UPDATE] Updating localStorage mitarbeiterID to:', filledFormData.mitarbeiterID);
        const currentEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
        const updatedEmployees = currentEmployees.map((emp: any) => 
          emp.id === filledFormData.id 
            ? { 
                ...emp, 
                ...filledFormData,
                verificationCodeSent: true, 
                verificationCodeSentAt: new Date().toISOString() 
              }
            : emp
        );
        localStorage.setItem('employees', JSON.stringify(updatedEmployees));
        console.log('âœ… [UPDATE] localStorage updated successfully');

              toast({
          title: 'Änderungen gespeichert',
          description: `Die Mitarbeiterdaten wurden erfolgreich in der Datenbank aktualisiert. Mitarbeiter-Nr.: ${filledFormData.mitarbeiterID ? filledFormData.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}`,
        });

              // Alle Formularfelder und States zurÃ¼cksetzen
        console.log('ðŸ§¹ [UPDATE] Clearing all form data and states...');
        console.log('ðŸ†” [UPDATE] Final mitarbeiterID:', filledFormData.mitarbeiterID);
        
        // Hauptformular zurÃ¼cksetzen
        resetForm();
        
        // Filled form States zurÃ¼cksetzen
        setShowFilledRegistrationForm(false);
        setFilledFormData(null);
        
        // Bearbeitungsmodus zurÃ¼cksetzen
        setEditingUser(null);
        
        // Formular schlieÃŸen
        setShowForm(false);
        
        // Verifikations-Code zurÃ¼cksetzen
        setVerificationCode('');
        
        console.log('âœ… [UPDATE] All form data and states cleared successfully');

    } catch (error) {
      console.error('Fehler beim Speichern der Ã„nderungen:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Die Änderungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  const handleFinalRegistration = async () => {
    if (!filledFormData) return;
    
    try {
      if (!user?.concernID) {
        toast({ 
          title: "Fehler", 
          description: "Concern ID nicht gefunden.", 
          variant: "destructive" 
        });
        return;
      }

              // VollstÃ¤ndige Benutzerdaten fÃ¼r Firestore erstellen
        const completeUserData: Omit<FirestoreUser, 'uid'> = {
          concernID: user.concernID,
          dateCreated: new Date(),
          email: filledFormData.email,
          displayName: `${filledFormData.firstName} ${filledFormData.lastName}`,
          tel: filledFormData.phone,
          passpin: 0,
          vorname: filledFormData.firstName,
          mitarbeiterID: filledFormData.mitarbeiterID || generateUniqueMitarbeiterID(employees),
          lastSync: new Date(),
          nachname: filledFormData.lastName,
          generatedProjects: 0,
          rechte: getRolePermissions(filledFormData.role),
          startDate: filledFormData.startDate ? new Date(filledFormData.startDate) : new Date(),
          role: filledFormData.role,
          isActive: filledFormData.isActive,
          isDemoUser: false,
          // Unternehmensfelder werden nicht mehr in User gespeichert (aus Concern Collection)
        };

        console.log('ðŸ†” [FINAL_REG] Using mitarbeiterID:', completeUserData.mitarbeiterID);

      // Benutzer in Firestore aktualisieren
      await userService.update(filledFormData.id, completeUserData);
      
      // Mitarbeiter als verifiziert markieren
      setEmployees(prev => prev.map(emp => 
        emp.id === filledFormData.id 
          ? { ...emp, verificationCodeSent: true, verificationCodeSentAt: new Date().toISOString() }
          : emp
      ));

      // localStorage aktualisieren
      const currentEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
      const updatedEmployees = currentEmployees.map((emp: any) => 
        emp.id === filledFormData.id 
          ? { ...emp, verificationCodeSent: true, verificationCodeSentAt: new Date().toISOString() }
          : emp
      );
      localStorage.setItem('employees', JSON.stringify(updatedEmployees));

              toast({
          title: 'Registrierung erfolgreich',
          description: `Der Mitarbeiter wurde erfolgreich verifiziert und registriert. Mitarbeiter-Nr.: ${filledFormData.mitarbeiterID ? filledFormData.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}`,
        });

              // Alle Formularfelder und States zurÃ¼cksetzen
        console.log('ðŸ§¹ [FINAL_REG] Clearing all form data and states...');
        console.log('ðŸ†” [FINAL_REG] Final mitarbeiterID:', filledFormData.mitarbeiterID);
        
        // Hauptformular zurÃ¼cksetzen
        resetForm();
        
        // Filled form States zurÃ¼cksetzen
        setShowFilledRegistrationForm(false);
        setFilledFormData(null);
        
        // Bearbeitungsmodus zurÃ¼cksetzen
        setEditingUser(null);
        
        // Formular schlieÃŸen
        setShowForm(false);
        
        // Verifikations-Code zurÃ¼cksetzen
        setVerificationCode('');
        
        console.log('âœ… [FINAL_REG] All form data and states cleared successfully');

    } catch (error) {
      console.error('Fehler bei der finalen Registrierung:', error);
      toast({
        title: 'Fehler bei der Registrierung',
        description: 'Der Mitarbeiter konnte nicht registriert werden.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (employee: Employee) => {
    // Alter basierend auf dem aktuellen Geburtsdatum berechnen
    const updatedEmployee = {
      ...employee,
      age: employee.birthday ? calculateAge(employee.birthday) : 0
    };
    
    setEditingUser(updatedEmployee);
    setFormData({
      ...updatedEmployee,
      mitarbeiterID: employee.mitarbeiterID
    });
    console.log('âœï¸ [EDIT] Editing employee with mitarbeiterID:', employee.mitarbeiterID);
    setShowForm(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setViewingEmployee(employee);
    setShowEmployeeDetails(true);
  };

  const handleDelete = (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
      setEmployeeToDelete(employee);
      setShowDeleteConfirmation(true);
    }
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    
    try {
      // First delete from Firestore
      await userService.delete(employeeToDelete.id);
      
      // Then update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeToDelete.id 
          ? { ...emp, isDeleted: true, deletedAt: new Date(), isActive: false }
          : emp
      ));
      
      // Update localStorage
      const currentEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
      const updatedEmployees = currentEmployees.map((emp: any) => 
        emp.id === employeeToDelete.id 
          ? { ...emp, isDeleted: true, deletedAt: new Date(), isActive: false }
          : emp
      );
      localStorage.setItem('employees', JSON.stringify(updatedEmployees));
      
      toast({ 
        title: "Mitarbeiter gelöscht", 
        description: "Der Mitarbeiter wurde als gelöscht markiert." 
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({ 
        title: "Fehler beim Löschen", 
        description: "Der Mitarbeiter konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    } finally {
      setShowDeleteConfirmation(false);
      setEmployeeToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setEmployeeToDelete(null);
  };

  const handleRestore = async (id: string) => {
    try {
      // First update in Firestore
      await userService.update(id, { 
        isDeleted: false, 
        deletedAt: null, 
        isActive: true 
      });
      
      // Then update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === id 
          ? { ...emp, isDeleted: false, deletedAt: undefined, isActive: true }
          : emp
      ));
      
      // Update localStorage
      const currentEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
      const updatedEmployees = currentEmployees.map((emp: any) => 
        emp.id === id 
          ? { ...emp, isDeleted: false, deletedAt: null, isActive: true }
          : emp
      );
      localStorage.setItem('employees', JSON.stringify(updatedEmployees));
      
      toast({ 
        title: "Mitarbeiter wiederhergestellt", 
        description: "Der Mitarbeiter wurde erfolgreich wiederhergestellt." 
      });
    } catch (error) {
      console.error('Error restoring employee:', error);
      toast({ 
        title: "Fehler beim Wiederherstellen", 
        description: "Der Mitarbeiter konnte nicht wiederhergestellt werden.",
        variant: "destructive"
      });
    }
  };

  const toggleActiveStatus = async (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;
    
    const newActiveStatus = !employee.isActive;
    
    try {
      // First update in Firestore
      await userService.update(id, { isActive: newActiveStatus });
      
      // Then update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...emp, isActive: newActiveStatus } : emp
      ));
      
      // Update localStorage
      const currentEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
      const updatedEmployees = currentEmployees.map((emp: any) => 
        emp.id === id ? { ...emp, isActive: newActiveStatus } : emp
      );
      localStorage.setItem('employees', JSON.stringify(updatedEmployees));
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast({ 
        title: "Fehler beim Aktualisieren", 
        description: "Der Status konnte nicht geändert werden.",
        variant: "destructive"
      });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roleLabels = {
      admin: 'Administrator',
              office: 'Büro',
      project_manager: 'Projektleiter',
      service_technician: 'Mitarbeiter',
      auftraggeber: 'Auftraggeber'
    };
    return <Badge variant="outline">{roleLabels[role]}</Badge>;
  };

    console.log('ðŸ” [RENDER] Checking render condition...');
    console.log('ðŸ” [RENDER] showFilledRegistrationForm:', showFilledRegistrationForm);
    console.log('ðŸ” [RENDER] filledFormData:', filledFormData);
    
    if (showFilledRegistrationForm && filledFormData) {
      console.log('âœ… [RENDER] Rendering filled registration form!');
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Mitarbeiter-Registrierung bestätigen" 
          showBackButton={true} 
          onBack={() => setShowFilledRegistrationForm(false)}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Mitarbeiterdaten zur Bestätigung</CardTitle>
                <CardDescription>
                  Alle Daten wurden automatisch ausgefüllt. Bitte überprüfen Sie die Informationen und bestätigen Sie die Registrierung.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* PersÃ¶nliche Daten */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Persönliche Daten</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Vorname</Label>
                        <Input 
                          value={filledFormData.firstName}
                          onChange={(e) => setFilledFormData(prev => prev ? {...prev, firstName: e.target.value} : null)}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Nachname</Label>
                        <Input 
                          value={filledFormData.lastName}
                          onChange={(e) => setFilledFormData(prev => prev ? {...prev, lastName: e.target.value} : null)}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">E-Mail</Label>
                        <Input 
                          type="email"
                          value={filledFormData.email}
                          onChange={(e) => setFilledFormData(prev => prev ? {...prev, email: e.target.value} : null)}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Telefon</Label>
                        <Input 
                          value={filledFormData.phone || ''}
                          onChange={(e) => setFilledFormData(prev => prev ? {...prev, phone: e.target.value} : null)}
                          className="bg-white"
                          placeholder="Telefonnummer eingeben"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Geburtstag</Label>
                        <Input 
                          type="date"
                          value={filledFormData.birthday || ''}
                          onChange={(e) => {
                            const birthday = e.target.value;
                            const age = birthday ? calculateAge(birthday) : 0;
                            const dateOfBirth = birthday ? new Date(birthday) : null;
                            setFilledFormData(prev => prev ? {...prev, birthday, age, dateOfBirth} : null);
                          }}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Alter</Label>
                        <Input 
                          type="number"
                          value={filledFormData.age || 0}
                          readOnly
                          className="bg-gray-50"
                          placeholder="Wird automatisch ausgefüllt"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Startdatum in der Firma</Label>
                        <Input 
                          type="date"
                          value={filledFormData.startDate || ''}
                          onChange={(e) => setFilledFormData(prev => prev ? {...prev, startDate: e.target.value} : null)}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Mitarbeiter-Nr.</Label>
                        <Input 
                          type="number"
                          value={filledFormData.mitarbeiterID || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value >= 1 && value <= 9999) {
                              setFilledFormData(prev => prev ? {...prev, mitarbeiterID: value} : null);
                            }
                          }}
                          placeholder="0001-9999"
                          min="1"
                          max="9999"
                          className="bg-white font-mono"
                        />
                        <p className="text-xs text-gray-500">
                          Geben Sie eine Nummer zwischen 0001 und 9999 ein
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Adresse</Label>
                        <Input 
                          value={filledFormData.address || ''}
                          onChange={(e) => setFilledFormData(prev => prev ? {...prev, address: e.target.value} : null)}
                          className="bg-white"
                          placeholder="Adresse eingeben"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Berufliche Daten */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Berufliche Daten</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Rolle</Label>
                        <Select 
                          value={filledFormData.role} 
                          onValueChange={(value: UserRole) => setFilledFormData(prev => prev ? {...prev, role: value} : null)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Rolle auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="office">Büro-Mitarbeiter</SelectItem>
                            <SelectItem value="project_manager">Projektleiter</SelectItem>
                            <SelectItem value="service_technician">Außendienst-Mitarbeiter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Status</Label>
                        <div className="flex items-center space-x-2 pt-2">
                          <Switch 
                            checked={filledFormData.isActive} 
                            onCheckedChange={(checked) => setFilledFormData(prev => prev ? {...prev, isActive: checked} : null)} 
                          />
                          <Label>{filledFormData.isActive ? 'Aktiv' : 'Inaktiv'}</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Firmeninformationen aus Concern Collection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Firmeninformationen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Unternehmensname</Label>
                        <p className="text-gray-900 font-medium">{concern?.concernName || 'Wird geladen...'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Unternehmens-E-Mail</Label>
                        <p className="text-gray-900">{concern?.concernEmail || 'Wird geladen...'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Unternehmens-Telefon</Label>
                        <p className="text-gray-900">{concern?.concernTel || 'Wird geladen...'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Unternehmens-Adresse</Label>
                        <p className="text-gray-900">{concern?.concernAddress || 'Wird geladen...'}</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800 text-sm">
                        Diese Informationen werden zentral in der Concern Collection gespeichert und sind für alle Benutzer verfügbar.
                      </p>
                    </div>
                  </div>

                  {/* BestÃ¤tigungsbuttons */}
                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowFilledRegistrationForm(false)}
                    >
                      Abbrechen
                    </Button>
                    
                    {/* Test Button */}
                    <Button 
                      type="button" 
                      variant="outline"
                      className="bg-yellow-500 hover:bg-yellow-600"
                      onClick={() => {
                        console.log('ðŸ§ª [TEST] Simple test button clicked!');
                        alert('Test Button funktioniert!');
                      }}
                    >
                      ðŸ§ª Test Button
                    </Button>
                    
                    <Button 
                      type="button" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onMouseDown={(e) => {
                        console.log('ðŸ–±ï¸ [TEST] Mouse down event!');
                      }}
                      onMouseUp={(e) => {
                        console.log('ðŸ–±ï¸ [TEST] Mouse up event!');
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('ðŸ”˜ [TEST] Button clicked!');
                        console.log('ðŸ”˜ [TEST] filledFormData:', filledFormData);
                        console.log('ðŸ”˜ [TEST] Event:', e);
                        handleUpdateEmployee();
                      }}
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Ã„nderungen speichern
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (showVerificationForm && verifyingEmployee) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Mitarbeiter-Verifizierung" 
          showBackButton={true} 
          onBack={() => setShowVerificationForm(false)}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Verifizierungscode eingeben</CardTitle>
                <CardDescription>
                  Bitte geben Sie den Verifizierungscode ein, der an {verifyingEmployee.email} gesendet wurde.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerificationSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Verifizierungscode *</Label>
                    <Input 
                      id="verificationCode" 
                      value={verificationCode} 
                      onChange={(e) => setVerificationCode(e.target.value)} 
                      placeholder="8-stelligen Code eingeben"
                      required 
                      maxLength={8}
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Mitarbeiterdetails zur Bestätigung</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Name:</strong> {verifyingEmployee.firstName} {verifyingEmployee.lastName}
                        </div>
                        <div>
                          <strong>E-Mail:</strong> {verifyingEmployee.email}
                        </div>
                        <div>
                          <strong>Telefon:</strong> {verifyingEmployee.phone || 'Nicht angegeben'}
                        </div>
                        <div>
                          <strong>Rolle:</strong> {verifyingEmployee.role}
                        </div>
                        <div>
                          <strong>Startdatum:</strong> {verifyingEmployee.startDate || 'Nicht angegeben'}
                        </div>
                        <div>
                          <strong>Status:</strong> {verifyingEmployee.isActive ? 'Aktiv' : 'Inaktiv'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowVerificationForm(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Verifizierung bestätigen
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  console.log('ðŸ” [RENDER] showForm condition:', showForm);
  if (showForm) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title={editingUser ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter hinzufügen'} 
          showBackButton={true} 
          onBack={() => setShowForm(false)}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Mitarbeiterdetails</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input 
                        id="firstName" 
                        value={formData.firstName || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} 
                        placeholder="Vorname des Mitarbeiters eingeben"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input 
                        id="lastName" 
                        value={formData.lastName || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} 
                        placeholder="Nachname des Mitarbeiters eingeben"
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-Mail *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={formData.email || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
                        placeholder="E-Mail-Adresse eingeben"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input 
                        id="phone" 
                        value={formData.phone || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                        placeholder="Telefonnummer eingeben (optional)"
                      />
                    </div>
                  </div>
                  

                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="birthday">Geburtstag</Label>
                      <Input 
                        id="birthday" 
                        type="date" 
                        value={formData.birthday || ''} 
                        onChange={(e) => {
                          const birthday = e.target.value;
                          const age = birthday ? calculateAge(birthday) : 0;
                          setFormData(prev => ({ 
                            ...prev, 
                            birthday,
                            age
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Alter</Label>
                      <Input 
                        id="age" 
                        type="number" 
                        value={formData.age || 0} 
                        onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))} 
                        placeholder="Wird automatisch ausgefüllt"
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Startdatum in der Firma</Label>
                      <Input 
                        id="startDate" 
                        type="date" 
                        value={formData.startDate || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input 
                      id="address" 
                      value={formData.address || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} 
                      placeholder="Adresse eingeben (optional)"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="role">Rolle</Label>
                      <Select 
                        value={formData.role || 'service_technician'} 
                        onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rolle auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="office">Büro-Mitarbeiter</SelectItem>
                          <SelectItem value="project_manager">Projektleiter</SelectItem>
                          <SelectItem value="service_technician">Außendienst-Mitarbeiter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mitarbeiterID">Mitarbeiter-Nr.</Label>
                      <Input 
                        id="mitarbeiterID" 
                        type="number" 
                        value={formData.mitarbeiterID || ''} 
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 1 && value <= 9999) {
                            setFormData(prev => ({ ...prev, mitarbeiterID: value }));
                          }
                        }} 
                        placeholder="0001-9999"
                        min="1"
                        max="9999"
                        className="bg-white"
                      />
                      <p className="text-xs text-gray-500">
                        Geben Sie eine Nummer zwischen 0001 und 9999 ein
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch 
                      checked={formData.isActive || false} 
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))} 
                    />
                    <Label>Aktiv</Label>
                  </div>
                  
                  {/* Verification Code Section */}
                  {editingUser && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">Verifizierungscode Status</h4>
                          {editingUser.verificationCodeSent ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span>Verifizierungscode gesendet</span>
                              </div>
                              {editingUser.verificationCodeSentAt && (
                                <div className="text-xs text-gray-500 ml-6">
                                  <strong>Gesendet am:</strong> {new Date(editingUser.verificationCodeSentAt).toLocaleDateString('de-DE')}
                                </div>
                              )}
                                                              {editingUser.verificationCodeSentAt && (
                                  <div className="text-xs text-gray-500 ml-6">
                                    <strong>Gesendet um:</strong> {new Date(editingUser.verificationCodeSentAt).toLocaleTimeString('de-DE')}
                                  </div>
                                )}
                              {editingUser.verificationCode && (
                                <div className="text-xs text-gray-500 ml-6">
                                  <strong>Code:</strong> {editingUser.verificationCode}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-orange-600">
                              <span>Kein Verifizierungscode gesendet</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSendVerificationCode(editingUser)}
                            disabled={sendingCode === editingUser.id}
                            className={editingUser.verificationCodeSent 
                              ? "text-blue-600 border-blue-200 hover:bg-blue-50" 
                              : "text-green-600 border-green-200 hover:bg-green-50"
                            }
                          >
                            {sendingCode === editingUser.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            ) : (
                              <>
                                <Send className="h-3 w-3 mr-1" />
                                {editingUser.verificationCodeSent ? 'Erneut senden' : 'Code senden'}
                              </>
                            )}
                          </Button>
                          
                          {editingUser.verificationCodeSent && editingUser.verificationCode && (
                            <Button
                              type="button"
                              variant="default"
                              onClick={() => handleVerifyCode(editingUser)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verifizieren
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">
                      {editingUser ? 'Aktualisieren' : 'Hinzufügen'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Benutzerverwaltung" 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Benutzerverwaltung
                </h1>
                <p className="text-gray-600">
                  Verwalten Sie Benutzer, Rollen und Berechtigungen
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Sync Button */}
                <Button
                  onClick={syncWithFirestore}
                  disabled={syncStatus === 'syncing'}
                  variant={syncStatus === 'synced' ? 'outline' : 'default'}
                  className={`${
                    syncStatus === 'synced' 
                      ? 'border-green-500 text-green-600 hover:bg-green-50' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Clock className="h-5 w-5 mr-2" />
                  {syncStatus === 'syncing' ? 'Synchronisiere...' : 
                   syncStatus === 'synced' ? 'Synchronisiert' : 
                   syncStatus === 'conflict' ? 'Konflikte' : 'Synchronisieren'}
                </Button>
                
                {/* Last Sync Time */}
                {lastSyncTime && (
                  <div className="text-sm text-gray-500">
                    Letzte Sync: {lastSyncTime.toLocaleTimeString('de-DE')}
                  </div>
                )}

                {/* Neuer Button zum Aktualisieren der Daten */}
                <Button
                  onClick={refreshFromLocalStorage}
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                  title="Aktualisiere Daten aus dem Cache oder direkt aus der Datenbank"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Lade...' : 'Daten aktualisieren'}
                </Button>
                
                {hasPermission('create_user') && (
                  <Button
                    onClick={() => handleNewUser()}
                    className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Neuer Benutzer
                  </Button>
                )}
              </div>
            </div>
          </div>

          

          {/* Controls Card */}
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Mitarbeiter ({employees.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 px-3"
                  >
                    <TableIcon className="h-5 w-5 mr-1" />
                    Tabelle
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="h-8 px-3"
                  >
                    <Package className="h-5 w-5 mr-1" />
                    Karten
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    placeholder="Mitarbeiter durchsuchen..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10" 
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive' | 'deleted') => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                    <SelectItem value="deleted">Gelöscht</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rolle filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Rollen</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="office">Büro-Mitarbeiter</SelectItem>
                    <SelectItem value="project_manager">Projektleiter</SelectItem>
                    <SelectItem value="service_technician">Außendienst-Mitarbeiter</SelectItem>
                  </SelectContent>
                </Select>
                <div></div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || statusFilter !== 'all' || roleFilter !== 'all') && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setRoleFilter('all');
                    }}
                    className="text-xs h-8 px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Alle Filter zurücksetzen
                  </Button>
                </div>
              )}

              {/* Content */}
              {sortedEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter gefunden</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
                                      ? 'Versuchen Sie, Ihre Suchkriterien zu ändern.'
                : 'Fügen Sie Ihren ersten Mitarbeiter hinzu, um zu beginnen.'
                    }
                  </p>
                  {!searchTerm && statusFilter === 'all' && roleFilter === 'all' && hasPermission('create_user') && (
                    <Button onClick={() => handleNewUser()}>
                      <Plus className="h-5 w-5 mr-2" />
                      Mitarbeiter hinzufügen
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Table View */}
                  {viewMode === 'table' && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('firstName')}
                                className="h-8 flex items-center gap-1 hover:bg-gray-100"
                              >
                                Name
                                {getSortIcon('firstName')}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('email')}
                                className="h-8 flex items-center gap-1 hover:bg-gray-100"
                              >
                                E-Mail
                                {getSortIcon('email')}
                              </Button>
                            </TableHead>

                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('role')}
                                className="h-8 flex items-center gap-1 hover:bg-gray-100"
                              >
                                Rolle
                                {getSortIcon('role')}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('isActive')}
                                className="h-8 flex items-center gap-1 hover:bg-gray-100"
                              >
                                Status
                                {getSortIcon('isActive')}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('startDate')}
                                className="h-8 flex items-center gap-1 hover:bg-gray-100"
                              >
                                Startdatum
                                {getSortIcon('startDate')}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('age')}
                                className="h-8 flex items-center gap-1 hover:bg-gray-100"
                              >
                                Alter
                                {getSortIcon('age')}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                onClick={() => handleSort('mitarbeiterID')}
                                className="h-8 flex items-center gap-1 hover:bg-gray-100"
                              >
                                Mitarbeiter-Nr.
                                {getSortIcon('mitarbeiterID')}
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedEmployees.map((employee) => (
                            <TableRow 
                              key={employee.id} 
                              className="cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => handleViewEmployee(employee)}
                            >
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="h-8 w-8 rounded-full bg-[#058bc0] flex items-center justify-center">
                                    <User className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                                    <div className="text-sm text-gray-500">{employee.phone}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-5 w-5 text-gray-400" />
                                  <span>{employee.email}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getRoleBadge(employee.role)}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {employee.isDeleted ? (
                                    <>
                                      <Badge variant="destructive">Gelöscht</Badge>
                                      <Badge variant="secondary">Inaktiv</Badge>
                                    </>
                                  ) : employee.isActive ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">Aktiv</Badge>
                                  ) : (
                                    <Badge variant="secondary">Inaktiv</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {new Date(employee.startDate).toLocaleDateString('de-DE')}
                              </TableCell>
                              <TableCell>
                                {employee.age > 0 ? `${employee.age} Jahre` : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="font-mono">
                                    {employee.mitarbeiterID ? employee.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  {hasPermission('edit_user') && (
                                    <>
                                      {employee.isDeleted ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRestore(employee.id)}
                                          className="text-green-600 hover:text-green-700"
                                        >
                                          <RefreshCw className="h-5 w-5" />
                                        </Button>
                                      ) : (
                                        <>
                                          <div className="flex items-center space-x-2">
                                            <Switch 
                                              checked={employee.isActive} 
                                              onCheckedChange={() => toggleActiveStatus(employee.id)}
                                              className="cursor-pointer"
                                            />
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(employee)}
                                          >
                                            <Edit className="h-5 w-5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(employee.id)}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="h-5 w-5" />
                                          </Button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Cards View */}
                  {viewMode === 'cards' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sortedEmployees.map((employee) => (
                        <Card 
                          key={employee.id} 
                          className="tradetrackr-card cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handleViewEmployee(employee)}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center space-x-2">
                                <User className="h-5 w-5 text-[#058bc0]" />
                                <span>{employee.firstName} {employee.lastName}</span>
                              </CardTitle>
                              <div className="flex flex-wrap items-center gap-1">
                                {employee.isDeleted ? (
                                  <>
                                    <Badge variant="destructive">Gelöscht</Badge>
                                    <Badge variant="secondary">Inaktiv</Badge>
                                  </>
                                ) : employee.isActive ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">Aktiv</Badge>
                                ) : (
                                  <Badge variant="secondary">Inaktiv</Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Mail className="h-5 w-5 text-gray-400" />
                                <span className="text-sm">{employee.email}</span>
                              </div>
                              {employee.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-5 w-5 text-gray-400" />
                                  <span className="text-sm">{employee.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <span className="text-sm">Start: {new Date(employee.startDate).toLocaleDateString('de-DE')}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  Nr. {employee.mitarbeiterID ? employee.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                              {getRoleBadge(employee.role)}
                              {hasPermission('edit_user') && (
                                <div className="flex items-center space-x-2">
                                  {employee.isDeleted ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRestore(employee.id)}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <RefreshCw className="h-5 w-5" />
                                    </Button>
                                  ) : (
                                    <>
                                      <Switch 
                                        checked={employee.isActive} 
                                        onCheckedChange={() => toggleActiveStatus(employee.id)}
                                        className="cursor-pointer"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(employee)}
                                      >
                                        <Edit className="h-5 w-5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(employee.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Verification Code Section */}
                            {hasPermission('edit_user') && (
                              <div className="pt-2 border-t">
                                {employee.verificationCodeSent ? (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                      <CheckCircle className="h-5 w-5" />
                                      <span>Code gesendet</span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSendVerificationCode(employee)}
                                      disabled={sendingCode === employee.id}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                      {sendingCode === employee.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                      ) : (
                                        <>
                                          <Send className="h-3 w-3 mr-1" />
                                          Erneut senden
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-orange-600">
                                      <span>Kein Code gesendet</span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSendVerificationCode(employee)}
                                      disabled={sendingCode === employee.id}
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                      {sendingCode === employee.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                      ) : (
                                        <>
                                          <Send className="h-3 w-3 mr-1" />
                                          Code senden
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                                {employee.verificationCodeSentAt && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Gesendet: {new Date(employee.verificationCodeSentAt).toLocaleString('de-DE')}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="pt-2 border-t">
                              <div className="text-sm text-gray-600">Adresse: {employee.address}</div>
                              <div className="text-sm text-gray-600">Alter: {employee.age}</div>
                              <div className="text-sm text-gray-600">Mitarbeiter-Nr.: {employee.mitarbeiterID ? employee.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Employee Details Modal */}
      {showEmployeeDetails && viewingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Mitarbeiterdetails</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmployeeDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Header mit Avatar und Status */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="h-16 w-16 rounded-full bg-[#058bc0] flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {viewingEmployee.firstName} {viewingEmployee.lastName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {getRoleBadge(viewingEmployee.role)}
                      {viewingEmployee.isDeleted ? (
                        <>
                          <Badge variant="destructive">Gelöscht</Badge>
                          <Badge variant="secondary">Inaktiv</Badge>
                        </>
                      ) : viewingEmployee.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">Aktiv</Badge>
                      ) : (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kontaktdaten */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Kontaktdaten</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">E-Mail</p>
                        <p className="text-gray-900">{viewingEmployee.email}</p>
                      </div>
                    </div>
                    {viewingEmployee.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Telefon</p>
                          <p className="text-gray-900">{viewingEmployee.phone}</p>
                        </div>
                      </div>
                    )}
                    {viewingEmployee.address && (
                      <div className="flex items-center space-x-3 md:col-span-2">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Adresse</p>
                          <p className="text-gray-900">{viewingEmployee.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PersÃ¶nliche Daten */}
                <div className="space-y-4">
                                      <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Persönliche Daten</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingEmployee.birthday && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Geburtstag</p>
                          <p className="text-gray-900">{new Date(viewingEmployee.birthday).toLocaleDateString('de-DE')}</p>
                        </div>
                      </div>
                    )}
                    {viewingEmployee.age && (
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Alter</p>
                          <p className="text-gray-900">{viewingEmployee.age} Jahre</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Startdatum</p>
                        <p className="text-gray-900">{new Date(viewingEmployee.startDate).toLocaleDateString('de-DE')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Erstellt am</p>
                        <p className="text-gray-900">{new Date(viewingEmployee.createdAt).toLocaleDateString('de-DE')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="font-mono">
                        {viewingEmployee.mitarbeiterID ? viewingEmployee.mitarbeiterID.toString().padStart(4, '0') : 'N/A'}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Mitarbeiter-Nr.</p>
                        <p className="text-gray-900">{viewingEmployee.mitarbeiterID ? viewingEmployee.mitarbeiterID.toString().padStart(4, '0') : 'Nicht verfügbar'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verifikationsstatus */}
                {hasPermission('edit_user') && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Verifikationsstatus</h4>
                    <div className="space-y-3">
                      {viewingEmployee.verificationCodeSent ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-5 w-5" />
                            <span>Verifikationscode gesendet</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendVerificationCode(viewingEmployee)}
                            disabled={sendingCode === viewingEmployee.id}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            {sendingCode === viewingEmployee.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            ) : (
                              <>
                                <Send className="h-3 w-3 mr-1" />
                                Erneut senden
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center gap-2 text-orange-700">
                            <span>Kein Verifikationscode gesendet</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendVerificationCode(viewingEmployee)}
                            disabled={sendingCode === viewingEmployee.id}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            {sendingCode === viewingEmployee.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                            ) : (
                              <>
                                <Send className="h-3 w-3 mr-1" />
                                Code senden
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {viewingEmployee.verificationCodeSentAt && (
                        <div className="text-sm text-gray-600">
                          Gesendet: {new Date(viewingEmployee.verificationCodeSentAt).toLocaleString('de-DE')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Aktions-Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  {hasPermission('edit_user') && (
                    <>
                      {viewingEmployee.isDeleted ? (
                        <Button
                          variant="outline"
                          onClick={() => handleRestore(viewingEmployee.id)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <RefreshCw className="h-5 w-5 mr-2" />
                          Wiederherstellen
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowEmployeeDetails(false);
                              handleEdit(viewingEmployee);
                            }}
                          >
                            <Edit className="h-5 w-5 mr-2" />
                            Bearbeiten
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(viewingEmployee.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-5 w-5 mr-2" />
                            Löschen
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowEmployeeDetails(false)}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Firestore Sync Modal */}
      <Dialog open={showSyncModal} onOpenChange={setShowSyncModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Firestore-Synchronisation
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Es wurden Ã„nderungen in der Datenbank gefunden. MÃ¶chten Sie diese Ã„nderungen auf Ihren lokalen Computer Ã¼bernehmen?
            </p>
            
            {/* Changes Summary */}
            <div className="space-y-3">
              {pendingChanges.added.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    <Plus className="h-4 w-4 inline mr-1" />
                    Neue Benutzer ({pendingChanges.added.length})
                  </h4>
                  <div className="space-y-1">
                    {pendingChanges.added.map(user => (
                      <div key={user.id} className="text-sm text-green-700">
                        â€¢ {user.firstName} {user.lastName} ({user.email})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {pendingChanges.updated.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    <Edit className="h-4 w-4 inline mr-1" />
                    Aktualisierte Benutzer ({pendingChanges.updated.length})
                  </h4>
                  <div className="space-y-1">
                    {pendingChanges.updated.map(user => (
                      <div key={user.id} className="text-sm text-blue-700">
                        â€¢ {user.firstName} {user.lastName} ({user.email})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {pendingChanges.deleted.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">
                    <Trash2 className="h-4 w-4 inline mr-1" />
                    GelÃ¶schte Benutzer ({pendingChanges.deleted.length})
                  </h4>
                  <div className="space-y-1">
                    {pendingChanges.deleted.map(userId => {
                      const user = employees.find(emp => emp.id === userId);
                      return (
                        <div key={userId} className="text-sm text-red-700">
                          â€¢ {user ? `${user.firstName} ${user.lastName}` : `ID: ${userId}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={rejectFirestoreChanges}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Ã„nderungen ablehnen
              </Button>
              <Button
                onClick={applyFirestoreChanges}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Ã„nderungen Ã¼bernehmen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitarbeiter löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie den Mitarbeiter "{employeeToDelete?.firstName} {employeeToDelete?.lastName}" löschen möchten?
              <br />
              <br />
              Der Mitarbeiter wird als gelöscht markiert und kann nicht mehr auf das System zugreifen. Diese Aktion kann rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={cancelDelete}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Action Buttons */}
      <QuickActionButtons onNavigate={onNavigate} hasPermission={hasPermission} currentPage="users" />
    </div>
  );
};

export default UserManagement;
