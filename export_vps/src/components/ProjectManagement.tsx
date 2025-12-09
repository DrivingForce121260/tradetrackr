import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Save, Edit, Trash2, Search, Building, MapPin, Users, Package, User, CheckSquare, AlertCircle, Info, FileText, Eye, ArrowUpDown, ArrowUp, ArrowDown, X, Table as TableIcon, Clock, FolderOpen, BarChart3, Building2, ClipboardList, MessageSquare, RefreshCw, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from './AppHeader';
import Categories from './Categories';
import TaskModal from '@/components/tasks/TaskModal';
import { useResponsiveViewMode } from '@/hooks/use-responsive-view-mode';
import { useFormValidation, validationRules } from '@/hooks/use-form-validation';
import { FormInput, FormTextarea, FormSelect } from '@/components/ui/form-input';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import ContextualNavigation from './ContextualNavigation';
import { useAutoSave } from '@/hooks/useAutoSave';
import AutoCompleteInput from './AutoCompleteInput';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { cn } from '@/lib/utils';

import { ExtendedProject, Task, ProjectManagementProps, Project, ProjectStatus } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';

import { customerService } from '@/services/firestoreService';
import { projectService } from '@/services/firestoreService';
import { Customer } from '@/types/customer';
import { generateInternalProjectNumber, generateExternalProjectNumber } from '@/utils/projectNumberGenerator';
import { updateInternalProjectNumbers } from '@/utils/updateInternalProjects';

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { isQuickAction, quickActionType } = useQuickAction();
  const [projects, setProjects] = useState<ExtendedProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [includeInternalProjects, setIncludeInternalProjects] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode, isMobile] = useResponsiveViewMode('table');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ExtendedProject | null>(null);
  const [viewingProject, setViewingProject] = useState<ExtendedProject | null>(null);
  const viewingProjectRef = useRef<ExtendedProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectType, setProjectType] = useState<'project' | 'smallProject'>('project');
  
  // State for managing assigned employees in view modal
  const [assignedEmployeesInView, setAssignedEmployeesInView] = useState<string[]>([]);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  
  // Undo functionality
  const [deletedProject, setDeletedProject] = useState<Project | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  
  // Infinite scroll state
  const [displayedProjectsCount, setDisplayedProjectsCount] = useState(20);
  const itemsPerPage = 20;
  
  // Tablet layout
  const { isTablet, isTwoColumn } = useTabletLayout();
  
  // Pull-to-refresh
  const handleRefresh = async () => {
    setIsLoadingProjects(true);
    try {
      await loadProjectsFromFirestore();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };
  
  const { isRefreshing, pullDistance, canRefresh, containerProps } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: isMobile,
  });
  
  // Assignment dropdowns
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState<string | null>(null);
  const [showMaterialGroupDropdown, setShowMaterialGroupDropdown] = useState<string | null>(null);
  const [showMaterialGroupsForm, setShowMaterialGroupsForm] = useState(false);
  
  // Beautiful modals state
  const [showAuftraggeberInfoModal, setShowAuftraggeberInfoModal] = useState(false);
  const [showCreateAuftraggeberModal, setShowCreateAuftraggeberModal] = useState(false);
  const [showCreateAuftraggeberConfirmModal, setShowCreateAuftraggeberConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [auftraggeberInfo, setAuftraggeberInfo] = useState<any>(null);
  const [newAuftraggeberCredentials, setNewAuftraggeberCredentials] = useState<any>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [newProjectForAuftraggeber, setNewProjectForAuftraggeber] = useState<Project | null>(null);
  
  // Task management state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<ExtendedProject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    projectNumber: ''
  });
  
  // Customer creation modal state (for inline customer creation from project form)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const preventDialogCloseRef = useRef(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    contactPerson: '',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'prospect'
  });
  
  // Project form state
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    description: '',
    status: 'planned' as ProjectStatus,
    projectNumber: '',
    customerReference: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    category: '',
    assignedManager: '',
    city: '',
    postalCode: '',
    workLocation: '',
    workAddress: '',
    workCity: '',
    workPostalCode: '',
    workLocationNotes: '',
    notes: '',
    projectStartDate: '',
    plannedEndDate: '',
    isInternal: false, // Default: external project
    internalCategory: undefined as 'personnel' | 'finance' | 'training' | 'admin' | 'compliance' | 'it' | undefined
  });

  // Form validation hook for critical fields
  const {
    values: validationValues,
    errors: validationErrors,
    touched: validationTouched,
    isValid: isFormValid,
    allErrors: formAllErrors,
    getFieldProps,
    handleSubmit: handleFormSubmit,
    reset: resetValidation,
    setValues: setValidationValues,
  } = useFormValidation({
    initialValues: {
      name: projectFormData.name || editingProject?.name || '',
      projectNumber: projectFormData.projectNumber || editingProject?.projectNumber || '',
      customerName: projectFormData.customerName || editingProject?.customerName || '',
      customerEmail: projectFormData.customerEmail || editingProject?.customerEmail || '',
    },
    validationRules: {
      name: [
        validationRules.required('Der Projektname ist erforderlich'),
        validationRules.minLength(3, 'Der Projektname muss mindestens 3 Zeichen lang sein'),
        validationRules.maxLength(100, 'Der Projektname darf maximal 100 Zeichen lang sein'),
      ],
      projectNumber: [
        validationRules.required('Die Projektnummer ist erforderlich'),
        validationRules.minLength(2, 'Die Projektnummer muss mindestens 2 Zeichen lang sein'),
        validationRules.maxLength(50, 'Die Projektnummer darf maximal 50 Zeichen lang sein'),
      ],
      customerName: [
        validationRules.required('Der Kundenname ist erforderlich'),
        validationRules.minLength(2, 'Der Kundenname muss mindestens 2 Zeichen lang sein'),
      ],
      customerEmail: [
        validationRules.email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
      ],
    },
    onSubmit: async (values) => {
      // Validation passed, continue with form submission
      // The actual submit is handled by the form's onSubmit handler
    },
    validateOnBlur: true,
    validateOnChange: false,
  });

  // Sync projectFormData with validation values when editingProject changes
  useEffect(() => {
    if (editingProject) {
      setValidationValues({
        name: editingProject.name || '',
        projectNumber: editingProject.projectNumber || '',
        customerName: editingProject.customerName || '',
        customerEmail: editingProject.customerEmail || '',
      });
      // Sync all project fields to projectFormData when editingProject is set
      // Only set values from editingProject, don't overwrite user input
      setProjectFormData(prev => ({
        ...prev,
        name: editingProject.name !== undefined ? editingProject.name : prev.name,
        projectNumber: editingProject.projectNumber !== undefined ? editingProject.projectNumber : prev.projectNumber,
        customerName: editingProject.customerName !== undefined ? editingProject.customerName : prev.customerName,
        customerEmail: editingProject.customerEmail !== undefined ? editingProject.customerEmail : prev.customerEmail,
        customerReference: editingProject.customerReference !== undefined ? editingProject.customerReference : prev.customerReference,
        customerPhone: editingProject.customerPhone !== undefined ? editingProject.customerPhone : prev.customerPhone,
        customerAddress: editingProject.customerAddress !== undefined ? editingProject.customerAddress : prev.customerAddress,
        city: editingProject.city !== undefined ? editingProject.city : prev.city,
        postalCode: editingProject.postalCode !== undefined ? editingProject.postalCode : prev.postalCode,
        assignedManager: editingProject.assignedManager !== undefined ? editingProject.assignedManager : prev.assignedManager,
        isInternal: editingProject.isInternal !== undefined ? editingProject.isInternal : prev.isInternal,
        internalCategory: editingProject.internalCategory !== undefined ? editingProject.internalCategory : prev.internalCategory
      }));
    }
  }, [editingProject, setValidationValues]); // Removed projectFormData from dependencies to prevent overwriting user input

  // Sync validation values with projectFormData when not editing
  useEffect(() => {
    if (!editingProject) {
      setValidationValues({
        name: projectFormData.name,
        projectNumber: projectFormData.projectNumber,
        customerName: projectFormData.customerName,
        customerEmail: projectFormData.customerEmail,
      });
    }
  }, [projectFormData, editingProject, setValidationValues]);
  
  // Load employees/users for autocomplete
  const [employees, setEmployees] = useState<Array<{ id: string; uid?: string; name: string; displayName?: string; email?: string }>>([]);
  
  useEffect(() => {
    const loadEmployees = async () => {
      if (!user?.concernID) return;
      
      try {
        const { userService } = await import('@/services/firestoreService');
        const users = await userService.getAll(user.concernID);
        const employeeList = users
          .filter(u => u.isActive !== false)
          .map(u => ({
            id: u.uid || '',
            uid: u.uid || '',
            name: u.displayName || `${u.vorname} ${u.nachname}`,
            displayName: u.displayName || `${u.vorname} ${u.nachname}`,
            email: u.email || undefined,
          }));
        setEmployees(employeeList);
      } catch (error) {
        console.error('Error loading employees:', error);
        // Fallback to mock data
        setEmployees([
          { id: 'emp1', uid: 'emp1', name: 'Max Mustermann' },
          { id: 'emp2', uid: 'emp2', name: 'Anna Schmidt' },
          { id: 'emp3', uid: 'emp3', name: 'Tom Weber' },
          { id: 'emp4', uid: 'emp4', name: 'Lisa Müller' }
        ]);
      }
    };
    
    loadEmployees();
  }, [user?.concernID]);
  
  // Load material groups from Categories component
  const [materialGroups, setMaterialGroups] = useState<{ id: string; name: string }[]>([]);
  const [materialGroupsLoaded, setMaterialGroupsLoaded] = useState(false);
  
  // Load customers from Firestore
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);

  // Load customers from Firestore when component mounts or form opens
  useEffect(() => {
    console.log('🔄 [ProjectManagement] useEffect triggered - user.concernID:', user?.concernID, 'showForm:', showForm);
    const loadCustomers = async () => {
      console.log('🔄 [ProjectManagement] Loading customers, user.concernID:', user?.concernID, 'showForm:', showForm);
      if (!user?.concernID) {
        console.log('⚠️ [ProjectManagement] No concernID, skipping customer load');
        setCustomersLoaded(true); // Mark as loaded even if no concernID
        return;
      }
      
      try {
        // When form opens, always invalidate cache and fetch fresh data from Firestore
        if (showForm) {
          console.log('🔄 [ProjectManagement] Form opened - invalidating cache and fetching fresh data...');
          const { cacheService } = await import('@/services/cacheService');
          await cacheService.invalidate('customers', user.concernID);
        }
        
        // Load from Firestore - skip cache when form is opened to ensure fresh data
        const customersData = await customerService.getAll(user.concernID, showForm ? true : false); // Pass skipCache flag
        console.log('📋 [ProjectManagement] Loaded customers:', customersData?.length || 0, customersData);
        
        if (customersData && Array.isArray(customersData)) {
          // Filter out any invalid customers and ensure they have concernID
          const validCustomers = customersData.filter(c => {
            const hasConcernID = c.concernID === user.concernID;
            const hasName = c.name && c.name.trim().length > 0;
            const hasCompany = c.company && c.company.trim().length > 0;
            return hasConcernID && (hasName || hasCompany);
          });
          
          console.log('📋 [ProjectManagement] Valid customers after filtering:', validCustomers.length);
          setCustomers(validCustomers);
          
          // Update localStorage with fresh data
          localStorage.setItem('customers', JSON.stringify(validCustomers));
          console.log('✅ [ProjectManagement] Customers saved to localStorage');
        } else {
          console.warn('⚠️ [ProjectManagement] Invalid customers data format:', customersData);
          setCustomers([]);
        }
        
        setCustomersLoaded(true);
        
        // Debug: Log customer details
        if (customersData && customersData.length > 0) {
          customersData.forEach((c, idx) => {
            console.log(`📋 Customer ${idx}:`, {
              id: c.id,
              concernID: c.concernID,
              name: c.name,
              company: c.company,
              hasName: !!c.name,
              hasCompany: !!c.company
            });
          });
        }
      } catch (error) {
        console.error('❌ [ProjectManagement] Error loading customers:', error);
        // Fallback to localStorage
        const savedCustomers = localStorage.getItem('customers');
        if (savedCustomers) {
          try {
            setCustomers(JSON.parse(savedCustomers));
            setCustomersLoaded(true);
          } catch (parseError) {
            console.error('Error parsing saved customers:', parseError);
            setCustomers([]);
          }
        } else {
          setCustomers([]);
          setCustomersLoaded(true); // Mark as loaded even if empty
        }
      }
    };

    // Always load customers when component mounts or concernID changes
    // Also reload when form opens to get latest customers
    console.log('🔄 [ProjectManagement] Calling loadCustomers()...');
    loadCustomers();
  }, [user?.concernID, showForm]); // Reload when form opens to get latest customers

  // Load material groups from localStorage
  useEffect(() => {
    const loadMaterialGroups = () => {
      const savedCategories = localStorage.getItem('categories');
      if (savedCategories) {
        const categories = JSON.parse(savedCategories);
        const groups = categories.map((cat: any) => ({
          id: cat.id,
          name: cat.title
        }));
        setMaterialGroups(groups);
        setMaterialGroupsLoaded(true);

      }
    };

    // Load initially
    loadMaterialGroups();

    // Listen for storage changes
    const handleStorageChange = () => {
      loadMaterialGroups();
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Autocomplete hooks - MUST be called at top level, not conditionally
  const projectNumberAutocomplete = useAutocomplete({
    data: projects.filter(p => p.projectNumber),
    getLabel: (p) => p.projectNumber || '',
    getValue: (p) => p.projectNumber || '',
    getDescription: (p) => p.name ? `📁 ${p.name}` : undefined,
    storageKey: 'project_number',
    maxRecentItems: 5,
  });

  const customerAutocomplete = useAutocomplete({
    data: customers,
    getLabel: (c) => c.name || c.companyName || '',
    getValue: (c) => c.name || c.companyName || '',
    getDescription: (c) => c.email ? `📧 ${c.email}` : c.phone ? `📞 ${c.phone}` : undefined,
    storageKey: 'project_customer',
    maxRecentItems: 5,
  });

  const managerAutocomplete = useAutocomplete({
    data: employees,
    getLabel: (e) => e.name || e.displayName || '',
    getValue: (e) => e.name || e.displayName || '',
    storageKey: 'project_manager',
    maxRecentItems: 5,
  });

  // Autocomplete for assigning employees to projects (uses UIDs)
  const employeeAssignmentAutocomplete = useAutocomplete({
    data: employees,
    getLabel: (e) => e.name || e.displayName || '',
    getValue: (e) => e.id || e.uid || e.name || '', // Use ID/UID for assignment
    getDescription: (e) => (e as any).email ? `📧 ${(e as any).email}` : undefined,
    storageKey: 'project_employee_assignment',
    maxRecentItems: 5,
  });

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'project') {
      // Reset form data when opening via quick action
      setEditingProject(null);
      setProjectType('project');
      setProjectFormData({
        name: '',
        description: '',
        status: 'planned' as ProjectStatus,
        projectNumber: '',
        customerReference: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        category: '',
        assignedManager: '',
        city: '',
        postalCode: '',
        workLocation: '',
        workAddress: '',
        workCity: '',
        workPostalCode: '',
        workLocationNotes: '',
        notes: '',
        projectStartDate: '',
        plannedEndDate: '',
        isInternal: false,
        internalCategory: undefined
      });
      resetValidation();
      setShowForm(true);
    }
  }, [isQuickAction, quickActionType, resetValidation]);

  // Function to load projects from Firestore
  const loadProjectsFromFirestore = useCallback(async () => {
    if (!user?.concernID) {

      return;
    }

    try {
      setIsLoadingProjects(true);

      
      // Load projects from Firestore using the projectService
      const firestoreProjects = await projectService.getAll(user.concernID);

      
      if (!firestoreProjects || firestoreProjects.length === 0) {

        setProjects([]);
        localStorage.removeItem('projects');
        
        // Show info toast that no projects exist
        toast({
          title: "Keine Projekte gefunden",
          description: `Keine Projekte in der Datenbank für Concern ID: ${user.concernID}`,
          variant: "default"
        });
        return;
      }
      
      // Convert Firestore projects to ExtendedProject format
      const convertedProjects: ExtendedProject[] = firestoreProjects.map((firestoreProject: any) => {

        
        // Safe date parsing function
        const safeParseDate = (dateValue: any): string => {
          try {
            if (!dateValue) return '';
            
            // If it's already a string, try to parse it
            if (typeof dateValue === 'string') {
              const parsed = new Date(dateValue);
              if (!isNaN(parsed.getTime())) {
                return parsed.toISOString();
              }
            }
            
            // If it's a Firestore Timestamp, convert it
            if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
              return dateValue.toDate().toISOString();
            }
            
            // If it's a Date object
            if (dateValue instanceof Date) {
              return dateValue.toISOString();
            }
            
            // If it's a number (timestamp)
            if (typeof dateValue === 'number') {
              const parsed = new Date(dateValue);
              if (!isNaN(parsed.getTime())) {
                return parsed.toISOString();
              }
            }
            

            return '';
          } catch (error) {

            return '';
          }
        };
        
        // Safe date parsing for start/end dates (return only date part)
        const safeParseDateOnly = (dateValue: any): string => {
          try {
            const isoString = safeParseDate(dateValue);
            if (isoString) {
              return isoString.split('T')[0];
            }
            return '';
          } catch (error) {

            return '';
          }
        };
        
        // Parse createdAt - preserve original date, only use current date as last resort for new projects
        let parsedCreatedAt = safeParseDate(firestoreProject.createdAt);
        if (!parsedCreatedAt && firestoreProject.dateCreated) {
          parsedCreatedAt = safeParseDate(firestoreProject.dateCreated);
        }
        // Only use current date if absolutely no date exists (should only happen for brand new projects)
        // For existing projects, preserve the original date even if parsing fails
        const createdAt = parsedCreatedAt || (firestoreProject.createdAt || firestoreProject.dateCreated || new Date().toISOString());
        
        return {
          id: firestoreProject.uid || firestoreProject.id || '',
          projectNumber: firestoreProject.projectNumber?.toString() || '',
          customerReference: firestoreProject.projectCustomer || '',
          name: firestoreProject.name || firestoreProject.projectName || '',
          description: firestoreProject.description || firestoreProject.projectDes || '',
          status: firestoreProject.status || firestoreProject.projectStatus || 'planned',
          createdAt: createdAt,
          category: firestoreProject.category || firestoreProject.projectCategory?.toString() || '',
          customerName: firestoreProject.customerName || firestoreProject.projectCustomer || '',
          customerPhone: firestoreProject.customerPhone || firestoreProject.projectTel || '',
          customerEmail: firestoreProject.customerEmail || firestoreProject.projectEmail || '',
          customerAddress: firestoreProject.customerAddress || firestoreProject.projectAddr || '',
          city: firestoreProject.city || firestoreProject.projectCity || '',
          postalCode: firestoreProject.postalCode || firestoreProject.postCode || '',
          workLocation: firestoreProject.workLocation || firestoreProject.projectAddr || '',
          workAddress: firestoreProject.workAddress || firestoreProject.projectAddr || '',
          workCity: firestoreProject.workCity || firestoreProject.projectCity || '',
          workPostalCode: firestoreProject.workPostalCode || firestoreProject.postCode || '',
          workLocationNotes: firestoreProject.workLocationNotes || '',
          notes: firestoreProject.notes || '',
          assignedManager: firestoreProject.assignedManager || firestoreProject.mitarbeiterID || '',
          assignedEmployees: firestoreProject.assignedEmployees || [],
          assignedMaterialGroups: firestoreProject.assignedMaterialGroups || [],
          projectStartDate: safeParseDateOnly(firestoreProject.projectStartDate || firestoreProject.startDate),
          plannedEndDate: safeParseDateOnly(firestoreProject.plannedEndDate || firestoreProject.endDate),
          // Preserve internal project fields
          internalCategory: firestoreProject.internalCategory,
          isInternal: firestoreProject.isInternal,
          // Preserve all other fields that might be needed
          ...firestoreProject
        };
      });
      

      
      // Update state with Firestore projects
      setProjects(convertedProjects);
      
      // Also save to localStorage for offline access
      localStorage.setItem('projects', JSON.stringify(convertedProjects));
      
      // Update internal project numbers if needed (run in background, don't block UI)
      updateInternalProjectNumbers(user.concernID, convertedProjects).then(({ updated, errors }) => {
        if (updated > 0) {
          console.log(`✅ Updated ${updated} internal project numbers`);
          // Reload projects after update
          loadProjectsFromFirestore();
        }
        if (errors > 0) {
          console.warn(`⚠️ ${errors} errors occurred while updating project numbers`);
        }
      }).catch((error) => {
        console.error('Error updating internal project numbers:', error);
      });
      
      // Show success toast
      toast({
        title: "Projekte geladen",
        description: `${convertedProjects.length} Projekte aus der Datenbank geladen`,
        variant: "default"
      });
      
    } catch (error) {

      
      // Clear localStorage and set empty projects
      localStorage.removeItem('projects');
      setProjects([]);
      
      // Show error toast
      toast({
        title: "Fehler beim Laden der Projekte",
        description: "Projekte konnten nicht aus der Datenbank geladen werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user?.concernID, toast]);

  // Function to check if projects collection exists
  const checkProjectsCollection = useCallback(async () => {
    if (!user?.concernID) return;
    
    try {

      
      // Try to get one document from the projects collection
      const { collection, query, where, limit, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, where('concernID', '==', user.concernID), limit(1));
      const querySnapshot = await getDocs(q);
      
      console.log('ðŸ” [ProjectManagement] Projects collection check result:', {
        exists: !querySnapshot.empty,
        size: querySnapshot.size,
        concernID: user.concernID
      });
      
      if (querySnapshot.empty) {
        toast({
          title: "Projekte-Collection leer",
          description: `Keine Projekte in der 'projects' Collection für Concern ID: ${user.concernID}`,
          variant: "default"
        });
      }
      
    } catch (error) {

      
      if (error.code === 'permission-denied') {
        toast({
          title: "Zugriff verweigert",
          description: "Keine Berechtigung, auf die Projekte-Collection zuzugreifen",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Fehler beim öberprüfen der Collection",
          description: "Konnte nicht auf die Projekte-Collection zugreifen",
          variant: "destructive"
        });
      }
    }
  }, [user?.concernID, toast]);

  // Function to clear localStorage and reload from Firestore
  const clearAndReload = useCallback(() => {

    localStorage.removeItem('projects');
    setProjects([]);
    
    if (user?.concernID) {
      loadProjectsFromFirestore();
    }
  }, [user?.concernID, loadProjectsFromFirestore]);

  // Function to reload projects from localStorage
  const reloadProjects = useCallback(() => {
    // Try to load from Firestore first, fallback to localStorage
    if (user?.concernID) {
      loadProjectsFromFirestore();
    } else {
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        try {
          const parsedProjects = JSON.parse(savedProjects);
          setProjects(parsedProjects);

        } catch (error) {

        }
      } else {

        setProjects([]);
      }
    }
  }, [user?.concernID, loadProjectsFromFirestore]);

  // Load projects and tasks from localStorage
  useEffect(() => {
    const loadProjects = () => {
      const savedProjects = localStorage.getItem('projects');

      if (savedProjects) {
        try {
          const parsedProjects = JSON.parse(savedProjects);

          // Only load if they are real projects, not demo data
          if (parsedProjects.length > 0 && !parsedProjects[0].id?.startsWith('proj')) {
            setProjects(parsedProjects);
          } else {

            localStorage.removeItem('projects');
            setProjects([]);
          }
        } catch (error) {

          setProjects([]);
        }
      } else {

        setProjects([]);
      }
    };

    const loadTasks = () => {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    };

    // Clear any existing demo data first
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        if (parsedProjects.length > 0 && parsedProjects[0].id?.startsWith('proj')) {

          localStorage.removeItem('projects');
        }
      } catch (error) {

        localStorage.removeItem('projects');
      }
    }

    // Try to load from Firestore first, fallback to localStorage
    if (user?.concernID) {

      loadProjectsFromFirestore();
    } else {

      loadProjects();
    }
    
    loadTasks();

    // Listen for storage changes
    const handleStorageChange = () => {

      if (user?.concernID) {
        loadProjectsFromFirestore();
      } else {
        loadProjects();
      }
      loadTasks();
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.concernID, loadProjectsFromFirestore]);

  // No demo data generation - projects are loaded only from localStorage or created by user

  // Update ref when state changes
  useEffect(() => {
    viewingProjectRef.current = viewingProject;
  }, [viewingProject]);

  // Focus on title field when task form opens
  useEffect(() => {
    if (showTaskForm) {
      const titleInput = document.getElementById('title') as HTMLInputElement;
      if (titleInput) {
        setTimeout(() => titleInput.focus(), 100);
      }
    }
  }, [showTaskForm]);
  
  // Control modal open state
  useEffect(() => {
    const shouldBeOpen = !!viewingProject;

    
    if (shouldBeOpen !== isModalOpen) {

      setIsModalOpen(shouldBeOpen);
    }
  }, [viewingProject, isModalOpen]);

  // Check permissions
  const canViewOwnProjects = hasPermission('view_own_projects') && !hasPermission('view_all_projects');
  const canManageProjects = hasPermission('create_project') || hasPermission('edit_project') || hasPermission('delete_project');
  const canDeleteProjects = hasPermission('delete_project');

  // Password confirmation state for deletion
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isValidatingPassword, setIsValidatingPassword] = useState(false);
  const [isPasswordFieldActive, setIsPasswordFieldActive] = useState(false);

  // Handle project deletion
  const handleDeleteProject = async (project: ExtendedProject) => {
    setProjectToDelete(project);
    setDeletePassword('');
    setPasswordError('');
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete || !user?.concernID || !user?.uid || !user?.email) {
      setShowDeleteConfirmModal(false);
      setProjectToDelete(null);
      setDeletePassword('');
      setPasswordError('');
      return;
    }

    // Validate password is provided
    if (!deletePassword || deletePassword.trim() === '') {
      setPasswordError('Bitte geben Sie Ihr Passwort ein, um die Löschung zu bestätigen.');
      return;
    }

    setIsValidatingPassword(true);
    setPasswordError('');

    try {
      // Re-authenticate user with password
      const { reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/config/firebase');
      
      if (!auth.currentUser) {
        throw new Error('Kein angemeldeter Benutzer gefunden');
      }

      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      console.log('✅ [ProjectManagement] Password verified successfully');

      // Password verified, proceed with deletion
      // Log deletion to auditLogs
      try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');
        await addDoc(collection(db, 'auditLogs'), {
          entityType: 'projects',
          entityId: projectToDelete.id,
          action: 'DELETE',
          timestamp: serverTimestamp(),
          actorId: user.uid,
          actorName: user.displayName || user.email || 'Unknown',
          concernID: user.concernID,
          before: {
            projectNumber: projectToDelete.projectNumber,
            name: projectToDelete.name,
            customerName: projectToDelete.customerName,
          },
          after: null,
        });
        console.log('✅ [ProjectManagement] Project deletion logged to auditLogs');
      } catch (logError) {
        console.error('❌ [ProjectManagement] Error logging deletion to auditLogs:', logError);
        // Continue with deletion even if logging fails
      }

      // Delete project from Firestore
      await projectService.delete(projectToDelete.id);
      
      // Remove from local state
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      
      // Remove from localStorage
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        try {
          const parsedProjects = JSON.parse(savedProjects);
          const updatedProjects = parsedProjects.filter((p: ExtendedProject) => p.id !== projectToDelete.id);
          localStorage.setItem('projects', JSON.stringify(updatedProjects));
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
      }

      toast({
        title: "Projekt gelöscht",
        description: `Projekt "${projectToDelete.projectNumber} - ${projectToDelete.name}" wurde erfolgreich gelöscht. Die Löschung wurde in den Logs vermerkt.`,
        variant: "default"
      });

      setShowDeleteConfirmModal(false);
      setProjectToDelete(null);
      setDeletePassword('');
      setPasswordError('');
    } catch (error: any) {
      console.error('❌ [ProjectManagement] Error deleting project:', error);
      
      // Check if it's a password/auth error
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-mismatch') {
        setPasswordError('Falsches Passwort. Bitte versuchen Sie es erneut.');
      } else if (error.code === 'auth/too-many-requests') {
        setPasswordError('Zu viele fehlgeschlagene Versuche. Bitte versuchen Sie es später erneut.');
      } else if (error.code === 'auth/network-request-failed') {
        setPasswordError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      } else {
        setPasswordError(error.message || 'Fehler bei der Passwort-Validierung. Bitte versuchen Sie es erneut.');
        toast({
          title: "Fehler beim Löschen",
          description: error.message || "Das Projekt konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
          variant: "destructive"
        });
      }
    } finally {
      setIsValidatingPassword(false);
    }
  };

  // Filter projects based on search, status, and project
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesProject = projectFilter === 'all' || project.category === projectFilter;
      
      // Filter internal projects based on checkbox (if checked, exclude internal projects)
      // Check multiple ways a project might be marked as internal
      const isInternal = !!(project as any).internalCategory || 
                        (project as any).isInternal === true ||
                        (project.category?.toLowerCase() === 'internal' || 
                         project.category?.toLowerCase() === 'intern' ||
                         project.category?.toLowerCase()?.includes('internal'));
      
      // If checkbox is checked (includeInternalProjects = true), exclude internal projects (show only non-internal)
      // If checkbox is unchecked (includeInternalProjects = false), show all projects (including internal)
      const matchesInternalFilter = includeInternalProjects ? !isInternal : true;
      
      // Apply user permission filtering
      if (canViewOwnProjects) {
        return matchesSearch && matchesStatus && matchesProject && matchesInternalFilter && project.assignedManager === (user?.displayName || 'Unbekannt');
      }
      
      return matchesSearch && matchesStatus && matchesProject && matchesInternalFilter;
    });
  }, [projects, searchTerm, statusFilter, projectFilter, includeInternalProjects, canViewOwnProjects, user?.displayName]);





  // Sort projects based on current sort settings
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'projectNumber':
        aValue = a.projectNumber.toLowerCase();
        bValue = b.projectNumber.toLowerCase();
        break;
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'customerName':
        aValue = a.customerName.toLowerCase();
        bValue = b.customerName.toLowerCase();
        break;
      case 'status':
        const statusOrder = { planned: 1, active: 2, completed: 3, archived: 4 };
        aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
        bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
        break;
      case 'assignedManager':
        aValue = a.assignedManager.toLowerCase();
        bValue = b.assignedManager.toLowerCase();
        break;
      default:
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Infinite scroll - initialized after sortedProjects
  const hasMoreProjects = displayedProjectsCount < sortedProjects.length;
  const { isLoadingMore, sentinelRef } = useInfiniteScroll({
    hasMore: hasMoreProjects,
    loading: isLoadingProjects,
    onLoadMore: async () => {
      setDisplayedProjectsCount(prev => Math.min(prev + itemsPerPage, sortedProjects.length));
    },
    enabled: isMobile || isTablet,
  });
  
  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedProjectsCount(itemsPerPage);
  }, [searchTerm, statusFilter, projectFilter, sortBy, sortOrder]);
  
  // Get displayed projects
  const displayedProjects = sortedProjects.slice(0, displayedProjectsCount);

  const handleSortColumn = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-5 w-5 text-gray-400" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-5 w-5 text-blue-600" /> : <ArrowDown className="h-5 w-5 text-blue-600" />;
  };

  // Handle project click
  const handleProjectClick = useCallback((project: ExtendedProject) => {


    
    // Set both states together to prevent race conditions
    setViewingProject(project);
    setIsModalOpen(true);
    viewingProjectRef.current = project; // Update ref immediately
    
    // Also populate the projectFormData with the selected project's data
    setProjectFormData({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'planned',
      projectNumber: project.projectNumber || '',
      customerReference: project.customerReference || '',
      customerName: project.customerName || '',
      customerPhone: project.customerPhone || '',
      customerEmail: project.customerEmail || '',
      customerAddress: project.customerAddress || '',
      category: project.category || '',
      assignedManager: project.assignedManager || '',
      city: project.city || '',
      postalCode: project.postalCode || '',
      workLocation: project.workLocation || '',
      workAddress: project.workAddress || '',
      workCity: project.workCity || '',
      workPostalCode: project.workPostalCode || '',
      workLocationNotes: project.workLocationNotes || '',
      notes: project.notes || '',
      projectStartDate: project.projectStartDate || '',
      plannedEndDate: project.plannedEndDate || ''
    });
    




  }, []);

  // Debug logging for viewingProject state
  useEffect(() => {
    

  }, [viewingProject]);

  // Initialize assigned employees when viewing a project
  useEffect(() => {
    if (viewingProject) {
      setAssignedEmployeesInView(viewingProject.assignedEmployees || []);
    } else {
      setAssignedEmployeesInView([]);
    }
  }, [viewingProject]);

  // Handle back navigation
  const handleBack = () => {
    onBack();
  };

  // Save assigned employees to project
  const handleSaveAssignedEmployees = async () => {
    if (!viewingProject?.id) return;
    
    setIsSavingAssignments(true);
    try {
      // Update project in Firestore
      await projectService.update(viewingProject.id, {
        assignedEmployees: assignedEmployeesInView,
      } as any);

      // Update local state
      const updatedProject = {
        ...viewingProject,
        assignedEmployees: assignedEmployeesInView,
      };
      setViewingProject(updatedProject);
      
      // Update projects list
      const updatedProjects = projects.map(p => 
        p.id === viewingProject.id ? updatedProject : p
      );
      setProjects(updatedProjects);
      localStorage.setItem('projects', JSON.stringify(updatedProjects));

      toast({
        title: "Erfolg",
        description: "Zugewiesene Mitarbeiter wurden erfolgreich aktualisiert.",
      });
    } catch (error) {
      console.error('Error saving assigned employees:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Speichern der zugewiesenen Mitarbeiter.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAssignments(false);
    }
  };

  // Toggle employee assignment
  const toggleEmployeeAssignment = (employeeId: string) => {
    setAssignedEmployeesInView(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Customer selection handler
  const handleCustomerSelection = (customerId: string) => {
    if (customerId) {
      const selectedCustomer = customers.find(c => c.id === customerId);
      if (selectedCustomer) {

        
        // Update the projectFormData state with customer information
        setProjectFormData(prev => ({
          ...prev,
          customerName: selectedCustomer.name || '',
          customerReference: selectedCustomer.company || '',
          customerPhone: selectedCustomer.phone || '',
          customerEmail: selectedCustomer.email || '',
          customerAddress: selectedCustomer.address || '',
          city: selectedCustomer.city || '',
          postalCode: selectedCustomer.postalCode || ''
        }));
        

      }
    }
  };

  const stats = {
    total: filteredProjects.length,
    planned: filteredProjects.filter(p => p.status === 'planned').length,
    active: filteredProjects.filter(p => p.status === 'active').length,
    completed: filteredProjects.filter(p => p.status === 'completed').length,
  };

  // Get special styling for internal project categories
  const getProjectCardStyle = (project: ExtendedProject) => {
    const name = project.name?.toLowerCase() || '';
    const category = (project as any).internalCategory?.toLowerCase() || '';
    
    // Check for specific project names or categories
    if (name.includes('administration') || name.includes('admin') || category === 'admin') {
      return {
        cardClass: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white border-2 border-slate-500 shadow-xl hover:shadow-2xl',
        headerClass: 'bg-gradient-to-r from-slate-700 to-slate-900 text-white',
        iconClass: 'text-slate-200',
        badgeClass: 'bg-slate-500/30 text-white border-slate-400',
      };
    }
    if (name.includes('compliance') || name.includes('qualität') || category === 'compliance') {
      return {
        cardClass: 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-2 border-indigo-500 shadow-xl hover:shadow-2xl',
        headerClass: 'bg-gradient-to-r from-indigo-700 to-indigo-900 text-white',
        iconClass: 'text-indigo-200',
        badgeClass: 'bg-indigo-500/30 text-white border-indigo-400',
      };
    }
    if (name.includes('finanzen') || name.includes('buchhaltung') || category === 'finance') {
      return {
        cardClass: 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-2 border-emerald-500 shadow-xl hover:shadow-2xl',
        headerClass: 'bg-gradient-to-r from-emerald-700 to-emerald-900 text-white',
        iconClass: 'text-emerald-200',
        badgeClass: 'bg-emerald-500/30 text-white border-emerald-400',
      };
    }
    if (name.includes('it') || name.includes('systeme') || category === 'it') {
      return {
        cardClass: 'bg-gradient-to-br from-cyan-600 to-cyan-800 text-white border-2 border-cyan-500 shadow-xl hover:shadow-2xl',
        headerClass: 'bg-gradient-to-r from-cyan-700 to-cyan-900 text-white',
        iconClass: 'text-cyan-200',
        badgeClass: 'bg-cyan-500/30 text-white border-cyan-400',
      };
    }
    if (name.includes('personal') || name.includes('hr') || category === 'personnel') {
      return {
        cardClass: 'bg-gradient-to-br from-rose-600 to-rose-800 text-white border-2 border-rose-500 shadow-xl hover:shadow-2xl',
        headerClass: 'bg-gradient-to-r from-rose-700 to-rose-900 text-white',
        iconClass: 'text-rose-200',
        badgeClass: 'bg-rose-500/30 text-white border-rose-400',
      };
    }
    if (name.includes('schulung') || name.includes('weiterbildung') || category === 'training') {
      return {
        cardClass: 'bg-gradient-to-br from-amber-600 to-amber-800 text-white border-2 border-amber-500 shadow-xl hover:shadow-2xl',
        headerClass: 'bg-gradient-to-r from-amber-700 to-amber-900 text-white',
        iconClass: 'text-amber-200',
        badgeClass: 'bg-amber-500/30 text-white border-amber-400',
      };
    }
    
    // Default styling for regular projects
    return {
      cardClass: 'bg-white hover:shadow-lg border-2 border-gray-200 hover:border-[#058bc0]',
      headerClass: '',
      iconClass: 'text-blue-600',
      badgeClass: '',
    };
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue flex flex-col">
      <AppHeader 
        title={canViewOwnProjects ? "📂 Meine Projekte" : "📂 Projektmanagement"} 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          <Button
            variant="outline"
            onClick={async () => {
              await checkProjectsCollection();
              await clearAndReload();
            }}
            className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex-shrink-0 w-full sm:w-auto"
            title="Collection prüfen, localStorage leeren und aus Firestore neu laden"
          >
            🔄 Aktualisieren
          </Button>
          <Button
            onClick={() => {
              // Reset form data when opening new project dialog
              setEditingProject(null);
              setProjectType('project');
              setProjectFormData({
                name: '',
                description: '',
                status: 'planned' as ProjectStatus,
                projectNumber: '',
                customerReference: '',
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                customerAddress: '',
                category: '',
                assignedManager: '',
                city: '',
                postalCode: '',
                workLocation: '',
                workAddress: '',
                workCity: '',
                workPostalCode: '',
                workLocationNotes: '',
                notes: '',
                projectStartDate: '',
                plannedEndDate: '',
                isInternal: false,
                internalCategory: undefined
              });
              resetValidation();
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex-shrink-0 w-full sm:w-auto"
            aria-label="Neues Projekt erstellen"
          >
            ✨ Neues Projekt
          </Button>
        </div>
      </AppHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <p className="text-xs text-white/80">Projekte</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Geplant
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.planned}</div>
                <p className="text-xs text-white/80">In Planung</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Aktiv
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.active}</div>
                <p className="text-xs text-white/80">In Arbeit</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Abgeschlossen
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.completed}</div>
                <p className="text-xs text-white/80">Fertig</p>
              </CardContent>
            </Card>
          </div>



          {/* Controls Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <span className="text-2xl">🔍</span>
                    Filter & Suche
                    <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                      {filteredProjects.length} {filteredProjects.length === 1 ? 'Projekt' : 'Projekte'}
                    </Badge>
                  </CardTitle>
                  {/* Internal Projects Checkbox - in header */}
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="checkbox"
                      id="includeInternalProjects"
                      checked={includeInternalProjects}
                      onChange={(e) => setIncludeInternalProjects(e.target.checked)}
                      className="w-5 h-5 text-[#058bc0] border-2 border-white/50 rounded focus:ring-2 focus:ring-white/50 cursor-pointer bg-white/10 checked:bg-white checked:border-white"
                    />
                    <label 
                      htmlFor="includeInternalProjects" 
                      className="text-sm font-medium text-white cursor-pointer flex items-center gap-2 hover:text-yellow-200 transition-colors"
                    >
                      <span className="text-lg">🏢</span>
                      Interne ausblenden
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isMobile ? (
                    <div className="text-xs text-white/80 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>Mobile Ansicht</span>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className={`h-8 px-3 transition-all ${viewMode === 'table' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                      >
                        <TableIcon className="h-4 w-4 mr-1" />
                        Tabelle
                      </Button>
                      <Button
                        variant={viewMode === 'cards' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('cards')}
                        className={`h-8 px-3 transition-all ${viewMode === 'cards' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Karten
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📁</div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Projekt auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Projekte</SelectItem>
                    {projects
                      .filter((project) => project.projectNumber && project.projectNumber.trim() !== '')
                      .map((project) => (
                        <SelectItem key={project.id} value={project.projectNumber}>
                          {project.projectNumber} - {project.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                  <Input
                    placeholder={t('project.searchProjects')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🏷️</div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Status filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎯 {t('project.allStatuses')}</SelectItem>
                      <SelectItem value="planned">📝 {t('project.planned')}</SelectItem>
                      <SelectItem value="active">⚡ {t('project.active')}</SelectItem>
                      <SelectItem value="completed">✅ {t('project.completed')}</SelectItem>
                      <SelectItem value="archived">📦 {t('project.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


              {/* Clear Filters - Only show if there are other filters besides the checkbox */}
              {(searchTerm || statusFilter !== 'all' || projectFilter !== 'all') && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setProjectFilter('all');
                      setIncludeInternalProjects(false);
                    }}
                    className="text-xs h-8 px-3 border-2 border-red-300 hover:border-red-500 hover:bg-red-50 transition-all"
                    aria-label="Alle Filter zurücksetzen"
                  >
                    <X className="h-3 w-3 mr-1" />
                    ❌ Alle Filter zurücksetzen
                  </Button>
                </div>
              )}



              {/* Projects Display */}
              {isLoadingProjects ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Projekte werden geladen...
                  </h3>
                  <p className="text-gray-600">
                    Lade Projekte aus der Datenbank
                  </p>
                </div>
              ) : sortedProjects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Projekte gefunden
                  </h3>
                  <p className="text-gray-600">
                    {projects.length === 0 
                      ? 'Erstellen Sie Ihr erstes Projekt oder laden Sie Projekte neu.'
                      : 'Versuchen Sie, Ihre Suchkriterien zu ö¤ndern.'
                    }
                  </p>
                  {projects.length === 0 && (
                    <Button
                      onClick={reloadProjects}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Projekte neu laden
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
                            <TableHead
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('createdAt')}
                            >
                              <div className="flex items-center gap-1">
                                Erstellt {getSortIcon('createdAt')}
                              </div>
                            </TableHead>
                            <TableHead
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('projectNumber')}
                            >
                              <div className="flex items-center gap-1">
                                Projekt {getSortIcon('projectNumber')}
                              </div>
                            </TableHead>
                            <TableHead
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('name')}
                            >
                              <div className="flex items-center gap-1">
                                Name {getSortIcon('name')}
                              </div>
                            </TableHead>
                            <TableHead
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('customerName')}
                            >
                              <div className="flex items-center gap-1">
                                Kunde {getSortIcon('customerName')}
                              </div>
                            </TableHead>
                            <TableHead
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('assignedManager')}
                            >
                              <div className="flex items-center gap-1">
                                Zugewiesen an {getSortIcon('assignedManager')}
                              </div>
                            </TableHead>
                            <TableHead
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('status')}
                            >
                              <div className="flex items-center gap-1">
                                Status {getSortIcon('status')}
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedProjects.map((project) => {
                            const projectStyle = getProjectCardStyle(project);
                            const isSpecialProject = projectStyle.cardClass.includes('gradient-to-br');
                            
                            return (
                              <TableRow 
                                key={project.id} 
                                className={cn(
                                  "cursor-pointer transition-all",
                                  isSpecialProject 
                                    ? `${projectStyle.cardClass} hover:opacity-90` 
                                    : "hover:bg-gray-50"
                                )}
                                onClick={() => handleProjectClick(project)}
                              >
                                <TableCell className={cn("text-sm", isSpecialProject ? "text-white/90" : "text-gray-600")}>
                                  {new Date(project.createdAt).toLocaleDateString('de-DE')}
                                </TableCell>
                                <TableCell className={cn("font-medium", isSpecialProject && "text-white")}>
                                  {project.projectNumber}
                                </TableCell>
                                <TableCell className={cn(isSpecialProject && "text-white font-semibold")}>
                                  {project.name}
                                </TableCell>
                                <TableCell className={cn(isSpecialProject ? "text-white/80" : "")}>
                                  {project.customerName}
                                </TableCell>
                                <TableCell className={cn(isSpecialProject ? "text-white/80" : "")}>
                                  {project.assignedManager}
                                </TableCell>
                                <TableCell>
                                  {isSpecialProject ? (
                                    <Badge className={cn("border", projectStyle.badgeClass)}>
                                      {project.status === 'active' ? 'Aktiv' :
                                       project.status === 'planned' ? 'Geplant' :
                                       project.status === 'completed' ? 'Abgeschlossen' :
                                       project.status}
                                    </Badge>
                                  ) : (
                                    <Badge variant={
                                      project.status === 'active' ? 'default' :
                                      project.status === 'planned' ? 'secondary' :
                                      project.status === 'completed' ? 'success' :
                                      'outline'
                                    }>
                                      {project.status === 'active' ? 'Aktiv' :
                                       project.status === 'planned' ? 'Geplant' :
                                       project.status === 'completed' ? 'Abgeschlossen' :
                                       project.status}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant={isSpecialProject ? "secondary" : "outline"}
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Navigate to project-info page with selected project

                                        // Store the current page (projects) so we can return here
                                        localStorage.setItem('returnToPage', 'projects');
                                        onNavigate('project-info');
                                        // Store the selected project in localStorage for the ProjectInformation component
                                        localStorage.setItem('selectedProjectForInfo', JSON.stringify(project));
                                      }}
                                      className={cn(
                                        isSpecialProject && "bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50"
                                      )}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      <span className="min-w-[3rem] text-center">Info</span>
                                    </Button>
                                    <Button
                                      variant={isSpecialProject ? "secondary" : "outline"}
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Open task form with pre-filled project number
                                        setSelectedProjectForTask(project);
                                        setSelectedProjectForTask(project);
                                        setShowTaskForm(true);
                                      }}
                                      className={cn(
                                        isSpecialProject && "bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50"
                                      )}
                                    >
                                      <CheckSquare className="h-4 w-4 mr-1" />
                                      <span className="min-w-[3rem] text-center">Task</span>
                                    </Button>
                                    <Button
                                      variant={isSpecialProject ? "secondary" : "outline"}
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Navigate to documents page with project context

                                        onNavigate('documents');
                                        // Store the project context for the DocumentManagement component
                                        localStorage.setItem('selectedProjectForDocuments', JSON.stringify(project));
                                      }}
                                      className={cn(
                                        isSpecialProject && "bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50"
                                      )}
                                    >
                                      <Archive className="h-4 w-4 mr-1" />
                                      <span className="min-w-[3rem] text-center">Docs</span>
                                    </Button>
                                    {canDeleteProjects && (
                                      <Button
                                        variant={isSpecialProject ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteProject(project);
                                        }}
                                        className={cn(
                                          "flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400",
                                          isSpecialProject && "bg-white/20 hover:bg-red-500/30 text-white border-white/30 hover:border-red-400/50"
                                        )}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        <span className="min-w-[3rem] text-center">Löschen</span>
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Cards View */}
                  {viewMode === 'cards' && (
                    <div 
                      {...(isMobile ? containerProps : {})}
                      className={cn(
                        "grid gap-4",
                        isTwoColumn ? "grid-cols-2" : isTablet ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      )}
                    >
                      {isMobile && (
                        <PullToRefreshIndicator
                          pullDistance={pullDistance}
                          threshold={80}
                          isRefreshing={isRefreshing}
                          canRefresh={canRefresh}
                        />
                      )}
                      {displayedProjects.map((project) => {
                        const projectStyle = getProjectCardStyle(project);
                        const isSpecialProject = projectStyle.cardClass.includes('gradient-to-br');
                        
                        return (
                          <Card 
                            key={project.id} 
                            className={cn(
                              "transition-all cursor-pointer transform hover:scale-[1.02]",
                              projectStyle.cardClass,
                              !isSpecialProject && "hover:shadow-md"
                            )}
                            onClick={() => handleProjectClick(project)}
                          >
                            <CardHeader className={cn("pb-3", projectStyle.headerClass, isSpecialProject && "text-white")}>
                              <CardTitle className={cn("flex items-center gap-2 text-base", isSpecialProject && "text-white")}>
                                <FileText className={cn("h-5 w-5", projectStyle.iconClass)} />
                                {project.name}
                              </CardTitle>
                              <CardDescription className={cn("text-sm", isSpecialProject ? "text-white/80" : "")}>
                                {project.projectNumber}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                <div>
                                  <p className={cn("text-sm line-clamp-2", isSpecialProject ? "text-white/90" : "text-gray-600")}>
                                    {project.description}
                                  </p>
                                </div>
                                <div className={cn("flex items-center justify-between text-xs", isSpecialProject ? "text-white/80" : "text-gray-500")}>
                                  <span>{project.customerName}</span>
                                  <span>{project.assignedManager}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSpecialProject ? (
                                    <Badge className={cn("border", projectStyle.badgeClass)}>
                                      {project.status === 'active' ? 'Aktiv' :
                                       project.status === 'planned' ? 'Geplant' :
                                       project.status === 'completed' ? 'Abgeschlossen' :
                                       project.status}
                                    </Badge>
                                  ) : (
                                    <Badge variant={
                                      project.status === 'active' ? 'default' :
                                      project.status === 'planned' ? 'secondary' :
                                      project.status === 'completed' ? 'success' :
                                      'outline'
                                    }>
                                      {project.status === 'active' ? 'Aktiv' :
                                       project.status === 'planned' ? 'Geplant' :
                                       project.status === 'completed' ? 'Abgeschlossen' :
                                       project.status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant={isSpecialProject ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navigate to project-info page with selected project

                                      // Store the current page (projects) so we can return here
                                      localStorage.setItem('returnToPage', 'projects');
                                      onNavigate('project-info');
                                      // Store the selected project in localStorage for the ProjectInformation component
                                      localStorage.setItem('selectedProjectForInfo', JSON.stringify(project));
                                    }}
                                    className={cn(
                                      "flex-1 transition-all",
                                      isSpecialProject ? "bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50" : ""
                                    )}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    <span className="min-w-[3rem] text-center">Info</span>
                                  </Button>
                                  <Button
                                    variant={isSpecialProject ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navigate to documents page with project context

                                      onNavigate('documents');
                                        // Store the project context for the DocumentManagement component
                                        localStorage.setItem('selectedProjectForDocuments', JSON.stringify(project));
                                    }}
                                    className={cn(
                                      "transition-all",
                                      isSpecialProject ? "bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50" : ""
                                    )}
                                  >
                                    <Archive className="h-4 w-4 mr-1" />
                                    <span className="min-w-[3rem] text-center">Docs</span>
                                  </Button>
                                  {canDeleteProjects && (
                                    <Button
                                      variant={isSpecialProject ? "secondary" : "outline"}
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProject(project);
                                      }}
                                      className={cn(
                                        "flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400 transition-all",
                                        isSpecialProject ? "bg-white/20 hover:bg-red-500/30 text-white border-white/30 hover:border-red-400/50" : ""
                                      )}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      <span className="min-w-[3rem] text-center">Löschen</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {/* Infinite Scroll Sentinel */}
                      {(isMobile || isTablet) && (
                        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                          {isLoadingMore && (
                            <div className="flex items-center gap-2 text-gray-500">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="text-sm">Lade weitere Projekte...</span>
                            </div>
                          )}
                          {!hasMoreProjects && displayedProjects.length > 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Alle Projekte geladen ({displayedProjects.length} von {sortedProjects.length})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Information Modal */}
      <Dialog 
        open={isModalOpen} 
        onOpenChange={(open) => {

          
          // Only close if explicitly requested AND we have a project to view
          if (!open && viewingProject) {

            setViewingProject(null);
            setIsModalOpen(false);
          } else if (open && !viewingProject) {
            // This shouldn't happen, but if it does, prevent it

            setIsModalOpen(false);
          }
        }}
      >
        {viewingProject && (
          <DialogContent 
            key={viewingProject.id}
            className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl"
          >
            <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                <FileText className="h-6 w-6 text-white" />
                Projekt: {viewingProject?.name}
              </DialogTitle>
              <DialogDescription className="text-white/80">
                Projektnummer: {viewingProject?.projectNumber}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Contextual Navigation */}
              <ContextualNavigation
                type="project"
                entityId={viewingProject.id || ''}
                entityName={viewingProject.name}
              />
              
              {/* Project Overview */}
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    Projektübersicht
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Projektnummer
                      </Label>
                      <p className="text-lg font-semibold mt-1 text-gray-900">
                        {viewingProject.projectNumber}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Status
                      </Label>
                      <div className="mt-1">
                        <Badge variant={
                          viewingProject.status === 'active' ? 'default' :
                          viewingProject.status === 'planned' ? 'secondary' :
                          viewingProject.status === 'completed' ? 'success' :
                          'outline'
                        }>
                          {viewingProject.status === 'active' ? 'Aktiv' :
                           viewingProject.status === 'planned' ? 'Geplant' :
                           viewingProject.status === 'completed' ? 'Abgeschlossen' :
                           viewingProject.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Projektmanager
                      </Label>
                      <p className="text-lg mt-1 text-gray-900">
                        {viewingProject.assignedManager}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Erstellt am
                      </Label>
                      <p className="text-lg mt-1 text-gray-900">
                        {new Date(viewingProject.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Beschreibung
                    </Label>
                    <p className="text-lg mt-1 text-gray-700">
                      {viewingProject.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">👤</span>
                    Kundeninformationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Kundenname *</Label>
                      <Input
                        id="customerName"
                        name="customerName"
                        value={projectFormData.customerName}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerReference">Kundenreferenz</Label>
                      <Input
                        id="customerReference"
                        name="customerReference"
                        value={projectFormData.customerReference}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, customerReference: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerPhone">Telefon</Label>
                      <Input
                        id="customerPhone"
                        name="customerPhone"
                        value={projectFormData.customerPhone}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">E-Mail</Label>
                      <Input
                        id="customerEmail"
                        name="customerEmail"
                        value={projectFormData.customerEmail}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerAddress">Kundenadresse</Label>
                    <Input
                      id="customerAddress"
                      name="customerAddress"
                      value={projectFormData.customerAddress}
                      onChange={(e) => setProjectFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Stadt</Label>
                      <Input
                        id="city"
                        name="city"
                        value={projectFormData.city}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">PLZ</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={projectFormData.postalCode}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Details */}
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">⚙️</span>
                    Projektdetails
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assignedManager">Projektmanager *</Label>
                      <Input
                        id="assignedManager"
                        name="assignedManager"
                        defaultValue={viewingProject?.assignedManager || (user?.displayName || 'Unbekannt')}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="workLocation">Arbeitsort</Label>
                      <Input
                        id="workLocation"
                        name="workLocation"
                        defaultValue={viewingProject?.workLocation || ''}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectStartDate">Projektstart</Label>
                      <Input
                        id="projectStartDate"
                        name="projectStartDate"
                        type="date"
                        defaultValue={viewingProject?.projectStartDate || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="plannedEndDate">Geplantes Ende</Label>
                      <Input
                        id="plannedEndDate"
                        name="plannedEndDate"
                        type="date"
                        defaultValue={viewingProject?.plannedEndDate || ''}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="workAddress">Arbeitsadresse</Label>
                    <Input
                      id="workAddress"
                      name="workAddress"
                      defaultValue={viewingProject?.workAddress || ''}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="workCity">Arbeitsstadt</Label>
                      <Input
                        id="workCity"
                        name="workCity"
                        defaultValue={viewingProject?.workCity || ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="workPostalCode">Arbeits-PLZ</Label>
                      <Input
                        id="workPostalCode"
                        name="workPostalCode"
                        defaultValue={viewingProject?.workPostalCode || ''}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="workLocationNotes">Arbeitsort-Notizen</Label>
                    <Textarea
                      id="workLocationNotes"
                      name="workLocationNotes"
                      defaultValue={viewingProject?.workLocationNotes || ''}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Projektnotizen</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={viewingProject?.notes || ''}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Resources */}
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">👥</span>
                    Zugewiesene Ressourcen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Assigned Employees - Interactive */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Mitarbeiter zuweisen
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (Auto-Vervollständigung verfügbar)
                        </span>
                      </Label>
                      
                      {/* Autocomplete for adding employees */}
                      <AutoCompleteInput
                        label=""
                        placeholder="Mitarbeiter suchen und hinzufügen..."
                        value=""
                        onChange={() => {}}
                        onSelect={(option) => {
                          const empId = option.value;
                          if (!assignedEmployeesInView.includes(empId)) {
                            toggleEmployeeAssignment(empId);
                            employeeAssignmentAutocomplete.trackUsage(option.id);
                          }
                        }}
                        options={employeeAssignmentAutocomplete.options.filter(
                          opt => !assignedEmployeesInView.includes(opt.value)
                        )}
                        filterFn={employeeAssignmentAutocomplete.filterFn}
                        showRecentFirst={true}
                        showUsageCount={true}
                        maxSuggestions={5}
                        icon={<Users className="h-4 w-4" />}
                        emptyMessage="Keine Mitarbeiter gefunden"
                      />
                      
                      {/* Display assigned employees with remove option */}
                      <div className="bg-white border-2 border-gray-200 rounded-lg max-h-[200px] overflow-y-auto p-3 shadow-sm">
                        {assignedEmployeesInView.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-2">
                            Keine Mitarbeiter zugewiesen
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {assignedEmployeesInView.map((empId) => {
                              // Try to find employee by ID/UID first, then by name (for legacy data)
                              const employee = employees.find(e => 
                                e.id === empId || 
                                e.uid === empId || 
                                e.name === empId ||
                                e.displayName === empId
                              );
                              const displayName = employee?.name || employee?.displayName || empId;
                              return (
                                <div
                                  key={empId}
                                  className="flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                    <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
                                    {employee?.email && (
                                      <span className="text-xs text-gray-500 truncate">({employee.email})</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleEmployeeAssignment(empId)}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                                  >
                                    ×
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Save button */}
                      {JSON.stringify(assignedEmployeesInView.sort()) !== JSON.stringify((viewingProject.assignedEmployees || []).sort()) && (
                        <Button
                          onClick={handleSaveAssignedEmployees}
                          disabled={isSavingAssignments}
                          className="w-full bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white"
                          size="sm"
                        >
                          {isSavingAssignments ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Speichern...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Änderungen speichern
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {/* Material Groups - Read-only for now */}
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Materialgruppen
                      </Label>
                      <div className="space-y-1 mt-1">
                        {viewingProject.assignedMaterialGroups && viewingProject.assignedMaterialGroups.length > 0 ? (
                          viewingProject.assignedMaterialGroups.map((group, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="mr-1"
                            >
                              {group}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-gray-500">
                            Keine Materialgruppen zugewiesen
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingProject(null);
                    setIsModalOpen(false);
                  }}
                >
                  Schließen
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setEditingProject(viewingProject);
                    setViewingProject(null);
                    setIsModalOpen(false);
                    setShowForm(true);
                  }}
                  className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white"
                >
                  ✏️ Bearbeiten
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Project Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        // Don't close if customer modal is open or if we're preventing close
        if (!open) {
          if (preventDialogCloseRef.current || showCustomerModal) {
            console.log('[ProjectManagement] Preventing dialog close - customer modal is open or prevent flag is set');
            return;
          }
          resetValidation();
        }
        setShowForm(open);
      }}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-4 border-[#058bc0] shadow-2xl"
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking outside if customer modal is open or prevent flag is set
            if (preventDialogCloseRef.current || showCustomerModal) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }}
          onEscape={() => {
            // Don't close if customer modal is open or prevent flag is set
            if (preventDialogCloseRef.current || showCustomerModal) {
              return;
            }
            resetValidation();
            setShowForm(false);
            setEditingProject(null);
            setProjectType('project');
            // Reset form data when closing dialog
            setProjectFormData({
              name: '',
              description: '',
              status: 'planned' as ProjectStatus,
              projectNumber: '',
              customerReference: '',
              customerName: '',
              customerPhone: '',
              customerEmail: '',
              customerAddress: '',
              category: '',
              assignedManager: '',
              city: '',
              postalCode: '',
              workLocation: '',
              workAddress: '',
              workCity: '',
              workPostalCode: '',
              workLocationNotes: '',
              notes: '',
              projectStartDate: '',
              plannedEndDate: '',
              isInternal: false,
              internalCategory: undefined
            });
          }}
          trapFocus={true}
        >
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 -mx-6 -mt-6 rounded-t-lg mb-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              {editingProject ? (
                <>
                  <span className="text-3xl">✏️</span>
                  Projekt bearbeiten
                </>
              ) : projectType === 'smallProject' ? (
                <>
                  <span className="text-3xl">📋</span>
                  Kleines Projekt erstellen
                </>
              ) : (
                <>
                  <span className="text-3xl">📁</span>
                  Neues Projekt erstellen
                </>
              )}
            </DialogTitle>
            <div className="text-sm text-blue-100 mt-1">
              {editingProject ? 'Bearbeiten Sie die Projektdetails.' :
               projectType === 'smallProject' 
                 ? 'Erstellen Sie ein kleines Projekt mit den wichtigsten Informationen.'
                 : 'Erstellen Sie ein neues Projekt mit allen Details.'
              }
            </div>
          </DialogHeader>
          
          {/* Extended Project Form (Single Page) */}
            <form onSubmit={async (e) => {
            e.preventDefault();
            
            // Validate critical fields first
            if (!isFormValid) {
              // Validation errors will be shown by FormErrorSummary
              return;
            }
            
            const formData = new FormData(e.currentTarget);
            
            // Create or update project
            // Use projectFormData for fields that are managed by state, fallback to formData for others
            const projectData: Partial<ExtendedProject> = {
              name: (formData.get('name') as string) || projectFormData.name || editingProject?.name || '',
              description: (formData.get('description') as string) || editingProject?.description || '',
              status: (formData.get('status') as any) || editingProject?.status || 'planned',
              projectNumber: projectFormData.projectNumber || editingProject?.projectNumber || (formData.get('projectNumber') as string) || '',
              customerReference: projectFormData.customerReference || editingProject?.customerReference || (formData.get('customerReference') as string) || '',
              customerName: projectFormData.customerName || editingProject?.customerName || (formData.get('customerName') as string) || '',
              customerPhone: projectFormData.customerPhone || editingProject?.customerPhone || (formData.get('customerPhone') as string) || '',
              customerEmail: projectFormData.customerEmail || editingProject?.customerEmail || (formData.get('customerEmail') as string) || '',
              customerAddress: projectFormData.customerAddress || editingProject?.customerAddress || (formData.get('customerAddress') as string) || '',
              category: (formData.get('category') as string) || editingProject?.category || '',
              assignedManager: (projectFormData.assignedManager?.trim() || editingProject?.assignedManager?.trim() || (formData.get('assignedManager') as string)?.trim() || user?.displayName?.trim() || (user?.vorname && user?.nachname ? `${user.vorname} ${user.nachname}`.trim() : 'Unbekannt')) || 'Unbekannt',
              city: projectFormData.city || editingProject?.city || (formData.get('city') as string) || '',
              postalCode: projectFormData.postalCode || editingProject?.postalCode || (formData.get('postalCode') as string) || '',
              workLocation: (formData.get('workLocation') as string) || editingProject?.workLocation || '',
              workAddress: (formData.get('workAddress') as string) || editingProject?.workAddress || '',
              workCity: (formData.get('workCity') as string) || editingProject?.workCity || '',
              workPostalCode: (formData.get('workPostalCode') as string) || editingProject?.workPostalCode || '',
              workLocationNotes: (formData.get('workLocationNotes') as string) || editingProject?.workLocationNotes || '',
              notes: (formData.get('notes') as string) || editingProject?.notes || '',
              projectStartDate: (formData.get('projectStartDate') as string) || editingProject?.projectStartDate || '',
              plannedEndDate: (formData.get('plannedEndDate') as string) || editingProject?.plannedEndDate || '',
              isInternal: projectFormData.isInternal !== undefined ? projectFormData.isInternal : (editingProject?.isInternal || false), // Default: external project
              internalCategory: projectFormData.internalCategory || editingProject?.internalCategory || undefined
            };

            if (editingProject) {
              // Update existing project
              const updatedProject: ExtendedProject = {
                ...editingProject,
                ...projectData
              };
              
              try {
                // Create Firestore project object - use type assertion to resolve conflicts
                // Remove undefined values - Firestore doesn't allow undefined
                const firestoreProject: any = {
                  id: updatedProject.id,
                  name: updatedProject.name,
                  description: updatedProject.description,
                  status: updatedProject.status,
                  projectNumber: updatedProject.projectNumber,
                  customerReference: updatedProject.customerReference,
                  customerName: updatedProject.customerName,
                  customerPhone: updatedProject.customerPhone,
                  customerEmail: updatedProject.customerEmail,
                  customerAddress: updatedProject.customerAddress,
                  category: updatedProject.category,
                  assignedManager: updatedProject.assignedManager,
                  city: updatedProject.city,
                  postalCode: updatedProject.postalCode,
                  workLocation: updatedProject.workLocation,
                  workAddress: updatedProject.workAddress,
                  workCity: updatedProject.workCity,
                  workPostalCode: updatedProject.workPostalCode,
                  workLocationNotes: updatedProject.workLocationNotes,
                  notes: updatedProject.notes,
                  projectStartDate: updatedProject.projectStartDate,
                  plannedEndDate: updatedProject.plannedEndDate,
                  concernID: user?.concernID || '',
                  createdAt: updatedProject.createdAt,
                  assignedEmployees: updatedProject.assignedEmployees,
                  assignedMaterialGroups: updatedProject.assignedMaterialGroups,
                  isInternal: updatedProject.isInternal || false,
                  type: updatedProject.isInternal ? 'internal' : 'external' // Set type based on isInternal
                };
                
                // Only add internalCategory if it has a value (not undefined)
                if (updatedProject.internalCategory) {
                  firestoreProject.internalCategory = updatedProject.internalCategory;
                }
                
                // Update in Firestore immediately
                await projectService.update(updatedProject.id, firestoreProject);
                
                // Reload projects from Firestore to ensure consistency
                await loadProjectsFromFirestore();
                
                toast({
                  title: "Erfolg",
                  description: `Projekt "${updatedProject.name}" wurde erfolgreich in Firestore aktualisiert.`,
                });
                
                // Only close form and reset data if project was successfully updated
                setShowForm(false);
                setEditingProject(null);
                setProjectType('project');
                // Reset form data including internal project fields
                setProjectFormData({
                  name: '',
                  description: '',
                  status: 'planned' as ProjectStatus,
                  projectNumber: '',
                  customerReference: '',
                  customerName: '',
                  customerPhone: '',
                  customerEmail: '',
                  customerAddress: '',
                  category: '',
                  assignedManager: '',
                  city: '',
                  postalCode: '',
                  workLocation: '',
                  workAddress: '',
                  workCity: '',
                  workPostalCode: '',
                  workLocationNotes: '',
                  notes: '',
                  projectStartDate: '',
                  plannedEndDate: '',
                  isInternal: false, // Reset to external (default)
                  internalCategory: undefined
                });
              } catch (error) {
                console.error('Error updating project:', error);
                toast({
                  title: "Fehler",
                  description: "Projekt konnte nicht in Firestore aktualisiert werden.",
                  variant: "destructive"
                });
                // Don't close form on error - keep it open so user can retry
              }
            } else {
              // Create new project
              // Generate project number automatically if not provided
              let generatedProjectNumber = projectData.projectNumber || '';
              if (!generatedProjectNumber.trim()) {
                if (projectData.isInternal) {
                  // Generate internal project number: concernID-ABBREVIATION
                  generatedProjectNumber = generateInternalProjectNumber(
                    user?.concernID || '',
                    projectData.name || 'Neues Projekt'
                  );
                } else {
                  // Generate external project number: PRJ-YYYYMMDD-HHMMSS
                  generatedProjectNumber = generateExternalProjectNumber();
                }
              }
              
              const newProject: ExtendedProject = {
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                assignedEmployees: [],
                assignedMaterialGroups: [],
                name: projectData.name || 'Neues Projekt',
                description: projectData.description || '',
                status: projectData.status || 'planned',
                projectNumber: generatedProjectNumber,
                customerReference: projectData.customerReference || '',
                customerName: projectData.customerName || '',
                customerPhone: projectData.customerPhone || '',
                customerEmail: projectData.customerEmail || '',
                customerAddress: projectData.customerAddress || '',
                category: projectData.category || '',
                assignedManager: (projectData.assignedManager?.trim() || user?.displayName?.trim() || (user?.vorname && user?.nachname ? `${user.vorname} ${user.nachname}`.trim() : 'Unbekannt')) || 'Unbekannt',
                city: projectData.city || '',
                postalCode: projectData.postalCode || '',
                workLocation: projectData.workLocation || '',
                workAddress: projectData.workAddress || '',
                workCity: projectData.workCity || '',
                workPostalCode: projectData.workPostalCode || '',
                workLocationNotes: projectData.workLocationNotes || '',
                notes: projectData.notes || '',
                projectStartDate: projectData.projectStartDate || '',
                plannedEndDate: projectData.plannedEndDate || '',
                isInternal: projectData.isInternal || false, // Default: external
                internalCategory: projectData.internalCategory || undefined
              };
              
              try {
                // Create Firestore project object
                // Remove undefined values - Firestore doesn't allow undefined
                const firestoreProject: any = {
                  id: newProject.id,
                  name: newProject.name,
                  description: newProject.description,
                  status: newProject.status,
                  projectNumber: newProject.projectNumber,
                  customerReference: newProject.customerReference,
                  customerName: newProject.customerName,
                  customerPhone: newProject.customerPhone,
                  customerEmail: newProject.customerEmail,
                  customerAddress: newProject.customerAddress,
                  category: newProject.category,
                  assignedManager: newProject.assignedManager,
                  city: newProject.city,
                  postalCode: newProject.postalCode,
                  workLocation: newProject.workLocation,
                  workAddress: newProject.workAddress,
                  workCity: newProject.workCity,
                  workPostalCode: newProject.workPostalCode,
                  workLocationNotes: newProject.workLocationNotes,
                  notes: newProject.notes,
                  projectStartDate: newProject.projectStartDate,
                  plannedEndDate: newProject.plannedEndDate,
                  concernID: user?.concernID || '',
                  createdAt: newProject.createdAt,
                  assignedEmployees: newProject.assignedEmployees,
                  assignedMaterialGroups: newProject.assignedMaterialGroups,
                  isInternal: newProject.isInternal || false, // Default: external
                  type: newProject.isInternal ? 'internal' : 'external' // Set type based on isInternal
                };
                
                // Only add internalCategory if it has a value (not undefined)
                if (newProject.internalCategory) {
                  firestoreProject.internalCategory = newProject.internalCategory;
                }
                
                // Save to Firestore
                await projectService.create(firestoreProject as any);
                
                // Reload projects from Firestore to ensure consistency
                await loadProjectsFromFirestore();
                
                toast({
                  title: "Erfolg",
                  description: `Projekt "${newProject.name}" wurde erfolgreich erstellt.`,
                });
                
                // Only close form and reset data if project was successfully created
                setShowForm(false);
                setEditingProject(null);
                setProjectType('project');
                // Reset form data including internal project fields
                setProjectFormData({
                  name: '',
                  description: '',
                  status: 'planned' as ProjectStatus,
                  projectNumber: '',
                  customerReference: '',
                  customerName: '',
                  customerPhone: '',
                  customerEmail: '',
                  customerAddress: '',
                  category: '',
                  assignedManager: '',
                  city: '',
                  postalCode: '',
                  workLocation: '',
                  workAddress: '',
                  workCity: '',
                  workPostalCode: '',
                  workLocationNotes: '',
                  notes: '',
                  projectStartDate: '',
                  plannedEndDate: '',
                  isInternal: false, // Reset to external (default)
                  internalCategory: undefined
                });
              } catch (error) {
                console.error('Error creating project:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
                console.error('Error details:', {
                  error,
                  projectData: newProject,
                  assignedManager: newProject.assignedManager,
                  internalCategory: newProject.internalCategory
                });
                toast({
                  title: "Fehler",
                  description: `Projekt konnte nicht in Firestore erstellt werden: ${errorMessage}`,
                  variant: "destructive"
                });
                // Don't close form on error - keep it open so user can retry
              }
            }
          }} className="space-y-6">
            
            {/* Error Summary */}
            {formAllErrors.length > 0 && (
              <FormErrorSummary
                errors={formAllErrors}
                title="Bitte korrigieren Sie die folgenden Fehler:"
              />
            )}

            {/* Basic Information */}
            <Card className="border-2 border-blue-300 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Grundinformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Projektname"
                    tooltip="Geben Sie einen aussagekräftigen Namen für das Projekt ein. Der Name sollte zwischen 3 und 100 Zeichen lang sein und klar beschreiben, worum es bei dem Projekt geht. Beispiel: 'Heizungsinstallation Wohngebäude Musterstraße 5'"
                    placeholder="Projektname eingeben"
                    maxLength={100}
                    showCharCount={true}
                    value={projectFormData.name || editingProject?.name || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProjectFormData(prev => {
                        const updated = { ...prev, name: value };
                        // Auto-generate project number for internal projects when name changes
                        if (prev.isInternal && !editingProject && (!prev.projectNumber || prev.projectNumber.trim() === '')) {
                          updated.projectNumber = generateInternalProjectNumber(
                            user?.concernID || '',
                            value || 'Neues Projekt'
                          );
                        }
                        return updated;
                      });
                      // Update validation values when user types
                      setValidationValues(prev => ({ ...prev, name: value }));
                      getFieldProps('name').onChange(value);
                    }}
                    onBlur={getFieldProps('name').onBlur}
                    error={getFieldProps('name').error}
                    touched={getFieldProps('name').touched}
                    isValid={getFieldProps('name').isValid}
                    helperText="Ein aussagekräftiger Name hilft bei der Identifikation des Projekts"
                  />
                  {/* Project Number with Autocomplete */}
                  <div>
                    <Label htmlFor="projectNumber" className="mb-2 block">
                      Projektnummer *
                      {projectFormData.isInternal && !editingProject && (
                        <span className="ml-2 text-xs text-blue-600 font-normal">
                          (Automatisch generiert)
                        </span>
                      )}
                      {!projectFormData.isInternal && (
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (Auto-Vervollständigung verfügbar)
                        </span>
                      )}
                    </Label>
                    {projectFormData.isInternal && !editingProject ? (
                      // Internal projects: read-only, auto-generated
                      <Input
                        value={projectFormData.projectNumber || ''}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    ) : (
                      // External projects: editable with autocomplete
                      <AutoCompleteInput
                        label=""
                        placeholder="Projektnummer eingeben oder auswählen"
                        value={projectFormData.projectNumber || editingProject?.projectNumber || ''}
                        onChange={(value) => {
                          setProjectFormData(prev => ({ ...prev, projectNumber: value }));
                          getFieldProps('projectNumber').onChange(value);
                        }}
                        onSelect={(option) => {
                          setProjectFormData(prev => ({ ...prev, projectNumber: option.value }));
                          getFieldProps('projectNumber').onChange(option.value);
                          projectNumberAutocomplete.trackUsage(option.id);
                        }}
                        options={projectNumberAutocomplete.options}
                        filterFn={projectNumberAutocomplete.filterFn}
                        showRecentFirst={true}
                        showUsageCount={true}
                        maxSuggestions={5}
                        icon={<FolderOpen className="h-4 w-4" />}
                        emptyMessage="Keine Projektnummern gefunden"
                      />
                    )}
                    {getFieldProps('projectNumber').error && (
                      <p className="text-sm text-red-600 mt-1">{getFieldProps('projectNumber').error}</p>
                    )}
                    {projectFormData.isInternal && !editingProject ? (
                      <p className="text-xs text-blue-600 mt-1">
                        ℹ️ Die Projektnummer wird automatisch aus der ConcernID und einer Abkürzung des Projektnamens generiert.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Eine eindeutige Projektnummer zur Identifikation. Zuletzt verwendete Nummern werden zuerst angezeigt.
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Beschreibung *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingProject?.description || ''}
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select name="status" defaultValue={editingProject?.status || 'planned'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Geplant</SelectItem>
                        <SelectItem value="active">Aktiv</SelectItem>
                        <SelectItem value="completed">Abgeschlossen</SelectItem>
                        <SelectItem value="archived">Archiviert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">Kategorie</Label>
                    <Select name="category" defaultValue={editingProject?.category || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wartung">Wartung</SelectItem>
                        <SelectItem value="Reparatur">Reparatur</SelectItem>
                        <SelectItem value="Installation">Installation</SelectItem>
                        <SelectItem value="Reklamation">Reklamation</SelectItem>
                        <SelectItem value="Notdienst">Notdienst</SelectItem>
                        <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Internal Project Toggle */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <Label htmlFor="isInternal" className="text-base font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        Internes Projekt
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Aktivieren Sie diese Option, wenn es sich um ein internes Organisationsprojekt handelt (z.B. Personal, Finanzen, IT).
                      </p>
                    </div>
                    <Switch
                      id="isInternal"
                      checked={editingProject?.isInternal || projectFormData.isInternal || false}
                      onCheckedChange={(checked) => {
                        setProjectFormData(prev => {
                          const updated = { 
                            ...prev, 
                            isInternal: checked,
                            internalCategory: checked ? prev.internalCategory : undefined // Clear category if unchecked
                          };
                          // Auto-generate project number for internal projects if not editing and no project number exists
                          if (checked && !editingProject && (!prev.projectNumber || prev.projectNumber.trim() === '')) {
                            updated.projectNumber = generateInternalProjectNumber(
                              user?.concernID || '',
                              prev.name || 'Neues Projekt'
                            );
                          }
                          return updated;
                        });
                      }}
                    />
                  </div>
                  
                  {/* Internal Category Select - Only show if internal is checked */}
                  {(editingProject?.isInternal || projectFormData.isInternal) && (
                    <div className="mt-4">
                      <Label htmlFor="internalCategory">Interne Kategorie *</Label>
                      <Select 
                        value={projectFormData.internalCategory || editingProject?.internalCategory || undefined}
                        onValueChange={(value) => {
                          setProjectFormData(prev => ({ 
                            ...prev, 
                            internalCategory: value as 'personnel' | 'finance' | 'training' | 'admin' | 'compliance' | 'it'
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Interne Kategorie auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personnel">Personal</SelectItem>
                          <SelectItem value="finance">Finanzen</SelectItem>
                          <SelectItem value="training">Schulung</SelectItem>
                          <SelectItem value="admin">Administration</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="it">IT</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Wählen Sie die Kategorie für das interne Projekt aus.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="border-2 border-green-300 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  Kundeninformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Inline Customer Creation Form - shown when "+ Neue Kunde" is clicked */}
                {showCustomerModal && (
                  <Card className="border-2 border-blue-400 bg-blue-50 mb-4">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-white">Neuen Kunden erstellen</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCustomerModal(false)}
                          className="text-white hover:bg-white/20 h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="inline-customer-name" className="text-sm font-semibold">Name *</Label>
                            <Input
                              id="inline-customer-name"
                              value={newCustomerData.name}
                              onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Kundenname"
                              required
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="inline-customer-company" className="text-sm font-semibold">Firma</Label>
                            <Input
                              id="inline-customer-company"
                              value={newCustomerData.company}
                              onChange={(e) => setNewCustomerData(prev => ({ ...prev, company: e.target.value }))}
                              placeholder="Firmenname"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="inline-customer-email" className="text-sm font-semibold">E-Mail</Label>
                            <Input
                              id="inline-customer-email"
                              type="email"
                              value={newCustomerData.email}
                              onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="email@beispiel.de"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="inline-customer-phone" className="text-sm font-semibold">Telefon</Label>
                            <Input
                              id="inline-customer-phone"
                              value={newCustomerData.phone}
                              onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+49 123 456789"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setNewCustomerData({
                                name: '',
                                company: '',
                                email: '',
                                phone: '',
                                address: '',
                                city: '',
                                postalCode: '',
                                contactPerson: '',
                                notes: '',
                                status: 'active'
                              });
                              setShowCustomerModal(false);
                            }}
                          >
                            Abbrechen
                          </Button>
                          <Button 
                            type="button" 
                            size="sm"
                            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              if (!newCustomerData.name.trim()) {
                                toast({
                                  title: "Fehler",
                                  description: "Der Kundenname ist erforderlich.",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              try {
                                const customerData = {
                                  ...newCustomerData,
                                  concernID: user?.concernID || '',
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString()
                                };
                                
                                const firestoreId = await customerService.create(customerData);
                                
                                // Reload customers list
                                const updatedCustomers = await customerService.getAll(user?.concernID || '', true);
                                const formattedCustomers = updatedCustomers.map((c: any) => ({
                                  id: c.id || c.uid || '',
                                  name: c.name || '',
                                  company: c.company || '',
                                  email: c.email || '',
                                  phone: c.phone || '',
                                  address: c.address || '',
                                  city: c.city || '',
                                  postalCode: c.postalCode || '',
                                  hasName: !!c.name,
                                  hasCompany: !!c.company
                                }));
                                setCustomers(formattedCustomers);
                                
                                // Update localStorage
                                localStorage.setItem('customers', JSON.stringify(updatedCustomers));
                                
                                // Select the newly created customer in the project form
                                const newCustomer = updatedCustomers.find((c: any) => (c.id || c.uid) === firestoreId);
                                if (newCustomer) {
                                  const customerDisplayName = (newCustomer.name || newCustomer.company || '').trim();
                                  setProjectFormData(prev => ({
                                    ...prev,
                                    customerName: customerDisplayName,
                                    customerEmail: newCustomer.email || prev.customerEmail,
                                    customerPhone: newCustomer.phone || prev.customerPhone,
                                    customerAddress: newCustomer.address || prev.customerAddress,
                                    city: newCustomer.city || prev.city,
                                    postalCode: newCustomer.postalCode || prev.postalCode
                                  }));
                                  
                                  // Also update validation values
                                  getFieldProps('customerName').onChange(customerDisplayName);
                                  if (newCustomer.email) {
                                    getFieldProps('customerEmail').onChange(newCustomer.email);
                                  }
                                }
                                
                                toast({
                                  title: "Erfolg",
                                  description: "Kunde wurde erfolgreich erstellt und im Projektformular ausgewählt."
                                });
                                
                                // Reset form and close inline form
                                setNewCustomerData({
                                  name: '',
                                  company: '',
                                  email: '',
                                  phone: '',
                                  address: '',
                                  city: '',
                                  postalCode: '',
                                  contactPerson: '',
                                  notes: '',
                                  status: 'active'
                                });
                                setShowCustomerModal(false);
                              } catch (error) {
                                console.error('Error creating customer:', error);
                                toast({
                                  title: "Fehler",
                                  description: "Kunde konnte nicht erstellt werden.",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Kunde erstellen
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Name with Select Dropdown */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="customerName" className="block">
                        Kundenname *
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Set flag to prevent dialog from closing
                          preventDialogCloseRef.current = true;
                          // Toggle the inline customer form
                          setShowCustomerModal(!showCustomerModal);
                          // Reset flag after a short delay
                          setTimeout(() => {
                            preventDialogCloseRef.current = false;
                          }, 200);
                        }}
                        className="flex items-center gap-1 text-xs h-7 px-2"
                      >
                        <Plus className="h-3 w-3" />
                        {showCustomerModal ? 'Abbrechen' : 'Neuer Kunde'}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={
                          (projectFormData.customerName?.trim() || editingProject?.customerName?.trim() || '') || ''
                        }
                        onValueChange={(value) => {
                          // Removed console.log to prevent performance issues
                          
                          // Find selected customer and auto-fill data
                          const selectedCustomer = customers.find(
                            c => {
                              const customerName = (c.name || c.company || '').trim();
                              return customerName === value.trim();
                            }
                          );
                          
                          // Removed console.log to prevent performance issues
                          
                          if (selectedCustomer) {
                            const customerDisplayName = (selectedCustomer.name || selectedCustomer.company || '').trim() || value;
                            setProjectFormData(prev => ({
                              ...prev,
                              customerName: customerDisplayName,
                              customerEmail: selectedCustomer.email || prev.customerEmail,
                              customerPhone: selectedCustomer.phone || prev.customerPhone,
                              customerAddress: selectedCustomer.address || prev.customerAddress,
                              city: selectedCustomer.city || prev.city,
                              postalCode: selectedCustomer.postalCode || prev.postalCode,
                            }));
                            getFieldProps('customerName').onChange(customerDisplayName);
                            if (selectedCustomer.email) {
                              getFieldProps('customerEmail').onChange(selectedCustomer.email);
                            }
                          } else {
                            setProjectFormData(prev => ({ ...prev, customerName: value }));
                            getFieldProps('customerName').onChange(value);
                          }
                        }}
                      >
                        <SelectTrigger id="customerName" className={getFieldProps('customerName').error ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Kunde auswählen..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          {!customersLoaded ? (
                            <SelectItem value="loading" disabled>
                              Lade Kunden...
                            </SelectItem>
                          ) : (() => {
                            // Filter and prepare customers
                            const validCustomers = [...customers]
                              .filter(c => {
                                const hasName = c.name && c.name.trim() !== '';
                                const hasCompany = c.company && c.company.trim() !== '';
                                return hasName || hasCompany;
                              })
                              .sort((a, b) => {
                                const nameA = (a.name || a.company || '').toLowerCase().trim();
                                const nameB = (b.name || b.company || '').toLowerCase().trim();
                                return nameA.localeCompare(nameB, 'de');
                              });
                            
                            // Removed console.log to prevent performance issues from excessive logging
                            
                            if (validCustomers.length > 0) {
                              return (
                                <>
                                  {validCustomers.map((customer) => {
                                    const displayName = customer.name?.trim() || customer.company?.trim() || 'Unbekannt';
                                    const selectValue = customer.name?.trim() || customer.company?.trim() || '';
                                    
                                    if (!selectValue) return null;
                                    
                                    return (
                                      <SelectItem 
                                        key={customer.id} 
                                        value={selectValue}
                                      >
                                        {displayName}
                                        {customer.company && customer.name && customer.company.trim() !== customer.name.trim() && ` (${customer.company})`}
                                      </SelectItem>
                                    );
                                  })}
                                </>
                              );
                            } else {
                              return (
                                <SelectItem value="no-customers" disabled>
                                  Keine Kunden gefunden. Bitte erstellen Sie zuerst einen Kunden.
                                </SelectItem>
                              );
                            }
                          })()}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Set flag to prevent dialog from closing
                          preventDialogCloseRef.current = true;
                          // Toggle the inline customer form
                          setShowCustomerModal(!showCustomerModal);
                          // Reset flag after a short delay
                          setTimeout(() => {
                            preventDialogCloseRef.current = false;
                          }, 200);
                        }}
                        className="flex-shrink-0"
                        title={showCustomerModal ? "Kundenerstellung abbrechen" : "Neuen Kunden erstellen"}
                      >
                        {showCustomerModal ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                    {getFieldProps('customerName').error && (
                      <p className="text-sm text-red-600 mt-1">{getFieldProps('customerName').error}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Wählen Sie einen Kunden aus der Liste oder erstellen Sie einen neuen.
                    </p>
                  </div>
                  <FormInput
                    label="Kundenreferenz"
                    tooltip="Geben Sie eine optionale Kundenreferenz ein. Dies kann eine interne Referenznummer oder ein Verweis auf ein anderes System sein."
                    placeholder="Kundenreferenz eingeben"
                    value={projectFormData.customerReference}
                    onChange={(e) => setProjectFormData(prev => ({ ...prev, customerReference: e.target.value }))}
                    helperText="Optionale interne Referenz"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Telefon"
                    type="tel"
                    tooltip="Geben Sie die Telefonnummer des Kunden ein. Format: +49 123 456789 oder 0123 456789"
                    placeholder="Telefonnummer eingeben"
                    value={projectFormData.customerPhone}
                    onChange={(e) => setProjectFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    helperText="Telefonnummer für Kontaktaufnahme"
                  />
                  <FormInput
                    label="E-Mail"
                    type="email"
                    tooltip="Geben Sie die E-Mail-Adresse des Kunden ein. Beispiel: max.mustermann@example.com. Die E-Mail-Adresse wird für Benachrichtigungen und Kommunikation verwendet."
                    placeholder="E-Mail-Adresse eingeben"
                    value={projectFormData.customerEmail || editingProject?.customerEmail || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProjectFormData(prev => ({ ...prev, customerEmail: value }));
                      getFieldProps('customerEmail').onChange(value);
                    }}
                    onBlur={getFieldProps('customerEmail').onBlur}
                    {...getFieldProps('customerEmail')}
                    helperText="E-Mail-Adresse für Benachrichtigungen"
                  />
                </div>
                <div>
                  <Label htmlFor="customerAddress">Kundenadresse</Label>
                  <Input
                    id="customerAddress"
                    name="customerAddress"
                    value={projectFormData.customerAddress}
                    onChange={(e) => setProjectFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Stadt</Label>
                    <Input
                      id="city"
                      name="city"
                      value={projectFormData.city}
                      onChange={(e) => setProjectFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">PLZ</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={projectFormData.postalCode}
                      onChange={(e) => setProjectFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Details */}
            <Card className="border-2 border-purple-300 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Projektdetails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Manager with Autocomplete */}
                  <div>
                    <Label htmlFor="assignedManager" className="mb-2 block">
                      Projektmanager *
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        (Auto-Vervollständigung verfügbar)
                      </span>
                    </Label>
                    <AutoCompleteInput
                      label=""
                      placeholder="Projektmanager auswählen"
                      value={projectFormData.assignedManager || editingProject?.assignedManager || (user?.displayName || (user?.vorname && user?.nachname 
                        ? `${user.vorname} ${user.nachname}` 
                        : 'Unbekannt'))}
                      onChange={(value) => {
                        const trimmedValue = value?.trim() || '';
                        setProjectFormData(prev => ({ ...prev, assignedManager: trimmedValue }));
                        // Also update validation values
                        setValidationValues(prev => ({ ...prev, assignedManager: trimmedValue }));
                      }}
                      onSelect={(option) => {
                        const trimmedValue = option.value?.trim() || '';
                        setProjectFormData(prev => ({ ...prev, assignedManager: trimmedValue }));
                        setValidationValues(prev => ({ ...prev, assignedManager: trimmedValue }));
                        managerAutocomplete.trackUsage(option.id);
                      }}
                      options={managerAutocomplete.options}
                      filterFn={managerAutocomplete.filterFn}
                      showRecentFirst={true}
                      showUsageCount={true}
                      maxSuggestions={5}
                      icon={<User className="h-4 w-4" />}
                      emptyMessage="Keine Mitarbeiter gefunden"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Wählen Sie den Projektmanager aus. Zuletzt verwendete Manager werden zuerst angezeigt.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="workLocation">Arbeitsort</Label>
                    <Input
                      id="workLocation"
                      name="workLocation"
                      defaultValue={editingProject?.workLocation || ''}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projectStartDate">Projektstart</Label>
                    <Input
                      id="projectStartDate"
                      name="projectStartDate"
                      type="date"
                      defaultValue={editingProject?.projectStartDate || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="plannedEndDate">Geplantes Ende</Label>
                    <Input
                      id="plannedEndDate"
                      name="plannedEndDate"
                      type="date"
                      defaultValue={editingProject?.plannedEndDate || ''}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="workAddress">Arbeitsadresse</Label>
                  <Input
                    id="workAddress"
                    name="workAddress"
                    defaultValue={editingProject?.workAddress || ''}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workCity">Arbeitsstadt</Label>
                    <Input
                      id="workCity"
                      name="workCity"
                      defaultValue={editingProject?.workCity || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="workPostalCode">Arbeits-PLZ</Label>
                    <Input
                      id="workPostalCode"
                      name="workPostalCode"
                      defaultValue={editingProject?.workPostalCode || ''}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="workLocationNotes">Arbeitsort-Notizen</Label>
                  <Textarea
                    id="workLocationNotes"
                    name="workLocationNotes"
                    defaultValue={editingProject?.workLocationNotes || ''}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Projektnotizen</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingProject?.notes || ''}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingProject(null);
                  setProjectType('project');
                  // Reset form data including internal project fields
                  setProjectFormData({
                    name: '',
                    description: '',
                    status: 'planned' as ProjectStatus,
                    projectNumber: '',
                    customerReference: '',
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    customerAddress: '',
                    category: '',
                    assignedManager: '',
                    city: '',
                    postalCode: '',
                    workLocation: '',
                    workAddress: '',
                    workCity: '',
                    workPostalCode: '',
                    workLocationNotes: '',
                    notes: '',
                    projectStartDate: '',
                    plannedEndDate: '',
                    isInternal: false, // Reset to external (default)
                    internalCategory: undefined
                  });
                }}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit"
                disabled={!isFormValid}
                className={!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {editingProject ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Form Dialog - Using shared TaskModal */}
      <TaskModal 
        open={showTaskForm} 
        onOpenChange={setShowTaskForm}
        presetProjectId={selectedProjectForTask?.id}
        presetProject={selectedProjectForTask ? {
          id: selectedProjectForTask.id,
          projectNumber: selectedProjectForTask.projectNumber,
          name: selectedProjectForTask.name,
          title: selectedProjectForTask.name || selectedProjectForTask.projectNumber
        } : undefined}
        onSave={async (taskData) => {
          // Create task in Firestore
          try {
            // Use TaskService from taskService.ts instead of firestoreService
            const { TaskService } = await import('@/services/taskService');
            const concernID = user?.concernID || user?.ConcernID;
            
            if (!concernID) {
              toast({ title: 'Fehler', description: 'Keine ConcernID gefunden', variant: 'destructive' });
              return;
            }

            const taskServiceInstance = new TaskService(concernID, user?.uid || '');
            
            const newTaskData = {
              projectId: taskData.projectId || selectedProjectForTask?.id || '',
              title: taskData.title || '',
              description: taskData.description || '',
              assigneeIds: taskData.assigneeIds || [],
              dueAt: taskData.dueAt,
              status: taskData.status || 'todo',
              priority: taskData.priority || 'medium',
              checklist: taskData.checklist || [],
              attachments: [],
              watchers: [],
            };

            await taskServiceInstance.create(newTaskData);
            
            toast({
              title: "Erfolg",
              description: `Aufgabe "${taskData.title}" wurde erfolgreich erstellt.`,
            });
            
            setShowTaskForm(false);
            setSelectedProjectForTask(null);
          } catch (error) {
            console.error('Error creating task:', error);
            toast({
              title: 'Fehler',
              description: 'Aufgabe konnte nicht erstellt werden',
              variant: 'destructive'
            });
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmModal} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteConfirmModal(false);
          setProjectToDelete(null);
          setDeletePassword('');
          setPasswordError('');
          setIsPasswordFieldActive(false);
        } else {
          setShowDeleteConfirmModal(true);
        }
      }}>
        <DialogContent className="max-w-md bg-white border-4 border-red-500 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              Projekt löschen
            </DialogTitle>
            <DialogDescription className="text-base mt-4">
              <div className="space-y-3">
                <p className="font-semibold text-gray-900">
                  Möchten Sie das Projekt wirklich löschen?
                </p>
                {projectToDelete && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Projekt: <span className="font-bold">{projectToDelete.projectNumber}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Name: <span className="font-semibold">{projectToDelete.name}</span>
                    </p>
                    {projectToDelete.customerName && (
                      <p className="text-sm text-gray-700">
                        Kunde: <span className="font-semibold">{projectToDelete.customerName}</span>
                      </p>
                    )}
                  </div>
                )}
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                  <p className="text-sm font-bold text-yellow-900 mb-1 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Wichtige Warnung:
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Diese Aktion kann <strong>nicht rückgängig gemacht</strong> werden</li>
                    <li>Die Löschung wird in den <strong>Logs vermerkt</strong></li>
                    <li>Alle zugehörigen Daten werden dauerhaft entfernt <strong>mit Ausnahme von Berichten und Rechnungen</strong></li>
                  </ul>
                </div>
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                  <p className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Sicherheitsbestätigung erforderlich:
                  </p>
                  <p className="text-sm text-blue-800 mb-3">
                    Zur Bestätigung der Löschung müssen Sie Ihr Passwort eingeben.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="deletePassword" className="text-sm font-semibold text-gray-900">
                      Passwort:
                    </Label>
                    {!isPasswordFieldActive ? (
                      <Input
                        id="deletePassword"
                        type="text"
                        value=""
                        onChange={(e) => {
                          // Convert to password field on first interaction
                          setIsPasswordFieldActive(true);
                          setDeletePassword(e.target.value);
                          setPasswordError('');
                          // Focus the new password field
                          setTimeout(() => {
                            const passwordInput = document.getElementById('deletePassword') as HTMLInputElement;
                            if (passwordInput) {
                              passwordInput.focus();
                              passwordInput.value = e.target.value;
                              // Move cursor to end
                              passwordInput.setSelectionRange(e.target.value.length, e.target.value.length);
                            }
                          }, 0);
                        }}
                        onFocus={(e) => {
                          setIsPasswordFieldActive(true);
                          // Clear the text field value
                          e.target.value = '';
                          setTimeout(() => {
                            const passwordInput = document.getElementById('deletePassword') as HTMLInputElement;
                            if (passwordInput) {
                              passwordInput.focus();
                            }
                          }, 0);
                        }}
                        placeholder="Klicken Sie hier, um Ihr Passwort einzugeben"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        className={cn(
                          "w-full",
                          passwordError && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={isValidatingPassword}
                      />
                    ) : (
                      <Input
                        id="deletePassword"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => {
                          setDeletePassword(e.target.value);
                          setPasswordError('');
                        }}
                        placeholder="Ihr Passwort eingeben"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        className={cn(
                          "w-full",
                          passwordError && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={isValidatingPassword}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isValidatingPassword && deletePassword.trim() !== '') {
                            confirmDeleteProject();
                          }
                        }}
                      />
                    )}
                    {passwordError && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {passwordError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setProjectToDelete(null);
                setDeletePassword('');
                setPasswordError('');
                setIsPasswordFieldActive(false);
              }}
              className="border-2 border-gray-300 hover:border-gray-400"
              disabled={isValidatingPassword}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProject}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              disabled={isValidatingPassword || !deletePassword.trim()}
            >
              {isValidatingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Überprüfe...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Endgültig löschen
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

  
      {/* Quick Action Sidebar */}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(ProjectManagement);




