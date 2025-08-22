import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Save, Edit, Trash2, Search, Building, MapPin, Users, Package, User, CheckSquare, AlertCircle, Info, FileText, Eye, ArrowUpDown, ArrowUp, ArrowDown, X, Table as TableIcon, Clock, FolderOpen, BarChart3, Building2, ClipboardList, MessageSquare, RefreshCw, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from './AppHeader';
import Categories from './Categories';

import { ExtendedProject, Task, ProjectManagementProps, Project, ProjectStatus } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';

import { customerService } from '@/services/firestoreService';
import { projectService } from '@/services/firestoreService';
import { Customer } from '@/types/customer';
import QuickActionButtons from './QuickActionButtons';

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { isQuickAction, quickActionType } = useQuickAction();
  const [projects, setProjects] = useState<ExtendedProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ExtendedProject | null>(null);
  const [viewingProject, setViewingProject] = useState<ExtendedProject | null>(null);
  const viewingProjectRef = useRef<ExtendedProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectType, setProjectType] = useState<'project' | 'smallProject'>('project');
  
  // Undo functionality
  const [deletedProject, setDeletedProject] = useState<Project | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  
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
    plannedEndDate: ''
  });
  
  // Mock data for employees
  const employees = [
    { id: 'emp1', name: 'Max Mustermann' },
    { id: 'emp2', name: 'Anna Schmidt' },
    { id: 'emp3', name: 'Tom Weber' },
    { id: 'emp4', name: 'Lisa Müller' }
  ];
  
  // Load material groups from Categories component
  const [materialGroups, setMaterialGroups] = useState<{ id: string; name: string }[]>([]);
  const [materialGroupsLoaded, setMaterialGroupsLoaded] = useState(false);
  
  // Load customers from localStorage (like in CustomerManagement)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);

  // Load customers when component mounts
  useEffect(() => {
    const loadCustomers = () => {
      const savedCustomers = localStorage.getItem('customers');
      if (savedCustomers) {
        try {
          setCustomers(JSON.parse(savedCustomers));
          setCustomersLoaded(true);
        } catch (error) {

          setCustomers([]);
        }
      }
    };

    loadCustomers();
  }, []);

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

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'project') {
      setShowForm(true);
    }
  }, [isQuickAction, quickActionType]);

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
        
        return {
          id: firestoreProject.uid || firestoreProject.id || '',
          projectNumber: firestoreProject.projectNumber?.toString() || '',
          customerReference: firestoreProject.projectCustomer || '',
          name: firestoreProject.name || firestoreProject.projectName || '',
          description: firestoreProject.description || firestoreProject.projectDes || '',
          status: firestoreProject.status || firestoreProject.projectStatus || 'planned',
          createdAt: safeParseDate(firestoreProject.createdAt) || new Date().toISOString(),
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
          plannedEndDate: safeParseDateOnly(firestoreProject.plannedEndDate || firestoreProject.endDate)
        };
      });
      

      
      // Update state with Firestore projects
      setProjects(convertedProjects);
      
      // Also save to localStorage for offline access
      localStorage.setItem('projects', JSON.stringify(convertedProjects));
      

      
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

  // Filter projects based on search, status, and project
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesProject = projectFilter === 'all' || project.category === projectFilter;
    
    // Apply user permission filtering
    if (canViewOwnProjects) {
      return matchesSearch && matchesStatus && matchesProject && project.assignedManager === (user?.displayName || 'Unbekannt');
    }
    
    return matchesSearch && matchesStatus && matchesProject;
  });





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

  // Handle back navigation
  const handleBack = () => {
    onBack();
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

  return (
    <div className="min-h-screen tradetrackr-gradient-blue flex flex-col">
      <AppHeader 
        title={canViewOwnProjects ? "Meine Projekte" : "Projektmanagement"} 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
      <div className="p-6 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Projektverwaltung
              </h1>
              <p className="text-gray-600">
                Verwalten Sie Projekte, weisen Sie Mitarbeiter zu und verfolgen Sie den Fortschritt
              </p>
            </div>
            <div className="flex items-center justify-end gap-4 mb-6">
              <Button
                variant="outline"
                onClick={async () => {

                  
                  // Check collection first
                  await checkProjectsCollection();
                  
                  // Clear localStorage and reload from DB
                  await clearAndReload();
                  

                }}
                className="text-blue-600 hover:text-blue-800 border-blue-300"
                title="Collection prüfen, localStorage leeren und aus Firestore neu laden"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Neues Projekt
              </Button>
            </div>
          </div>



          {/* Controls Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {t('project.title')} ({filteredProjects.length})
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Projekte</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.projectNumber}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder={t('project.searchProjects')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('project.allStatuses')}</SelectItem>
                    <SelectItem value="planned">{t('project.planned')}</SelectItem>
                    <SelectItem value="active">{t('project.active')}</SelectItem>
                    <SelectItem value="completed">{t('project.completed')}</SelectItem>
                    <SelectItem value="archived">{t('project.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {(searchTerm || statusFilter !== 'all' || projectFilter !== 'all') && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setProjectFilter('all');
                    }}
                    className="text-xs h-8 px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Alle Filter zurücksetzen
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
                          {sortedProjects.map((project) => (
                            <TableRow 
                              key={project.id} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleProjectClick(project)}
                            >
                              <TableCell className="text-sm text-gray-600">
                                {new Date(project.createdAt).toLocaleDateString('de-DE')}
                              </TableCell>
                              <TableCell className="font-medium">{project.projectNumber}</TableCell>
                              <TableCell>{project.name}</TableCell>
                              <TableCell>{project.customerName}</TableCell>
                              <TableCell>{project.assignedManager}</TableCell>
                              <TableCell>
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
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
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
                                  >
                                    <Eye className="h-5 w-5 mr-1" />
                                    Projektinformationen
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open task form with pre-filled project number
                                      setSelectedProjectForTask(project);
                                      setTaskFormData(prev => ({
                                        ...prev,
                                        projectNumber: project.projectNumber
                                      }));
                                      setShowTaskForm(true);
                                    }}
                                  >
                                    <CheckSquare className="h-5 w-5 mr-1" />
                                    Neue Aufgabe
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navigate to documents page with project context

                                      onNavigate('documents');
                                      // Store the project context for the DocumentManagement component
                                      localStorage.setItem('selectedProjectForDocuments', JSON.stringify(project));
                                    }}
                                  >
                                    <Archive className="h-5 w-5 mr-1" />
                                    Dokumente
                                  </Button>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedProjects.map((project) => (
                        <Card 
                          key={project.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleProjectClick(project)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <FileText className="h-5 w-5 text-blue-600" />
                              {project.name}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {project.projectNumber}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {project.description}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{project.customerName}</span>
                                <span>{project.assignedManager}</span>
                              </div>
                              <div className="flex items-center gap-2">
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
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
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
                                  className="flex-1"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Projektinformationen
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Navigate to documents page with project context

                                    onNavigate('documents');
                                      // Store the project context for the DocumentManagement component
                                      localStorage.setItem('selectedProjectForDocuments', JSON.stringify(project));
                                  }}
                                >
                                  <Archive className="h-3 w-3 mr-1" />
                                  Dokumente
                                </Button>
                              </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Projekt: {viewingProject?.name}
            </DialogTitle>
            <DialogDescription>
              Projektnummer: {viewingProject?.projectNumber}
            </DialogDescription>
          </DialogHeader>
          
          {viewingProject && (
            <div className="space-y-6">
              {/* Project Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Projektübersicht</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Projektnummer</Label>
                      <p className="text-lg font-semibold">{viewingProject.projectNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Status</Label>
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
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Projektmanager</Label>
                      <p className="text-lg">{viewingProject.assignedManager}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Erstellt am</Label>
                      <p className="text-lg">{new Date(viewingProject.createdAt).toLocaleDateString('de-DE')}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Beschreibung</Label>
                    <p className="text-lg">{viewingProject.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Kundeninformationen</CardTitle>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Projektdetails</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assignedManager">Projektmanager *</Label>
                      <Input
                        id="assignedManager"
                        name="assignedManager"
                        defaultValue={editingProject?.assignedManager || (user?.displayName || 'Unbekannt')}
                        required
                      />
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

              {/* Assigned Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Zugewiesene Ressourcen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Mitarbeiter</Label>
                      <div className="space-y-1">
                        {viewingProject.assignedEmployees && viewingProject.assignedEmployees.length > 0 ? (
                          viewingProject.assignedEmployees.map((employee, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {employee}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-gray-500">Keine Mitarbeiter zugewiesen</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Materialgruppen</Label>
                      <div className="space-y-1">
                        {viewingProject.assignedMaterialGroups && viewingProject.assignedMaterialGroups.length > 0 ? (
                          viewingProject.assignedMaterialGroups.map((group, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {group}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-gray-500">Keine Materialgruppen zugewiesen</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {

                    setViewingProject(null);
                    setIsModalOpen(false);
                  }}
                >
                  SchlieöŸen
                </Button>
                <Button
                  onClick={() => {

                    setEditingProject(viewingProject);
                    setViewingProject(null);
                    setIsModalOpen(false);
                    setShowForm(true);
                  }}
                >
                  Bearbeiten
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Project Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Projekt bearbeiten' : 
               projectType === 'smallProject' ? 'Kleines Projekt erstellen' : 'Neues Projekt erstellen'}
            </DialogTitle>
            <DialogDescription>
              {editingProject ? 'Bearbeiten Sie die Projektdetails.' :
               projectType === 'smallProject' 
                 ? 'Erstellen Sie ein kleines Projekt mit den wichtigsten Informationen.'
                 : 'Erstellen Sie ein neues Projekt mit allen Details.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {/* Extended Project Form */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            // Create or update project
            const projectData: Partial<ExtendedProject> = {
              name: formData.get('name') as string || '',
              description: formData.get('description') as string || '',
              status: (formData.get('status') as any) || 'planned',
              projectNumber: formData.get('projectNumber') as string || '',
              customerReference: formData.get('customerReference') as string || '',
              customerName: formData.get('customerName') as string || '',
              customerPhone: formData.get('customerPhone') as string || '',
              customerEmail: formData.get('customerEmail') as string || '',
              customerAddress: formData.get('customerAddress') as string || '',
              category: formData.get('category') as string || '',
              assignedManager: formData.get('assignedManager') as string || (user?.displayName || 'Unbekannt'),
              city: formData.get('city') as string || '',
              postalCode: formData.get('postalCode') as string || '',
              workLocation: formData.get('workLocation') as string || '',
              workAddress: formData.get('workAddress') as string || '',
              workCity: formData.get('workCity') as string || '',
              workPostalCode: formData.get('workPostalCode') as string || '',
              workLocationNotes: formData.get('workLocationNotes') as string || '',
              notes: formData.get('notes') as string || '',
              projectStartDate: formData.get('projectStartDate') as string || '',
              plannedEndDate: formData.get('plannedEndDate') as string || ''
            };

            if (editingProject) {
              // Update existing project
              const updatedProject: ExtendedProject = {
                ...editingProject,
                ...projectData
              };
              
              try {
                // Create Firestore project object - use type assertion to resolve conflicts
                const firestoreProject = {
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
                  assignedMaterialGroups: updatedProject.assignedMaterialGroups
                } as any; // Type assertion to resolve conflicts
                
                // Update in Firestore
                await projectService.update(updatedProject.id, firestoreProject);
                
                // Update local state immediately
                const updatedProjects = projects.map(p => p.id === editingProject.id ? updatedProject : p);
                setProjects(updatedProjects);
                
                // Save to localStorage with updated state
                localStorage.setItem('projects', JSON.stringify(updatedProjects));
                
                toast({
                  title: "Erfolg",
                  description: `Projekt "${updatedProject.name}" wurde erfolgreich in Firestore und lokal aktualisiert.`,
                });
              } catch (error) {

                toast({
                  title: "Fehler",
                  description: "Projekt konnte nicht in Firestore aktualisiert werden.",
                  variant: "destructive"
                });
              }
            } else {
              // Create new project
              const newProject: ExtendedProject = {
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                assignedEmployees: [],
                assignedMaterialGroups: [],
                name: projectData.name || 'Neues Projekt',
                description: projectData.description || '',
                status: projectData.status || 'planned',
                projectNumber: projectData.projectNumber || '',
                customerReference: projectData.customerReference || '',
                customerName: projectData.customerName || '',
                customerPhone: projectData.customerPhone || '',
                customerEmail: projectData.customerEmail || '',
                customerAddress: projectData.customerAddress || '',
                category: projectData.category || '',
                assignedManager: projectData.assignedManager || (user?.displayName || 'Unbekannt'),
                city: projectData.city || '',
                postalCode: projectData.postalCode || '',
                workLocation: projectData.workLocation || '',
                workAddress: projectData.workAddress || '',
                workCity: projectData.workCity || '',
                workPostalCode: projectData.workPostalCode || '',
                workLocationNotes: projectData.workLocationNotes || '',
                notes: projectData.notes || '',
                projectStartDate: projectData.projectStartDate || '',
                plannedEndDate: projectData.plannedEndDate || ''
              };
              
              try {
                // Create Firestore project object
                const firestoreProject = {
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
                  assignedMaterialGroups: newProject.assignedMaterialGroups
                };
                
                // Save to Firestore
                await projectService.create(firestoreProject as any);
                
                // Update local state immediately
                const updatedProjects = [newProject, ...projects];
                setProjects(updatedProjects);
                
                // Save to localStorage with updated state
                localStorage.setItem('projects', JSON.stringify(updatedProjects));
                
                toast({
                  title: "Erfolg",
                  description: `Projekt "${newProject.name}" wurde erfolgreich in Firestore und lokal erstellt.`,
                });
              } catch (error) {

                toast({
                  title: "Fehler",
                  description: "Projekt konnte nicht in Firestore erstellt werden.",
                  variant: "destructive"
                });
              }
            }
            
            setShowForm(false);
            setEditingProject(null);
            setProjectType('project');
          }} className="space-y-6">
            
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Grundinformationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Projektname *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingProject?.name || ''}
                      placeholder="Projektname eingeben"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectNumber">Projektnummer *</Label>
                    <Input
                      id="projectNumber"
                      name="projectNumber"
                      defaultValue={editingProject?.projectNumber || ''}
                      placeholder="Projektnummer eingeben"
                      required
                    />
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
                    <Select name="category" defaultValue={editingProject?.category || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie auswö¤hlen" />
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
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Kundeninformationen</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle>Projektdetails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assignedManager">Projektmanager *</Label>
                    <Input
                      id="assignedManager"
                      name="assignedManager"
                      defaultValue={editingProject?.assignedManager || (user?.displayName || 'Unbekannt')}
                      required
                    />
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
                }}
              >
                Abbrechen
              </Button>
              <Button type="submit">
                {editingProject ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Aufgabe für das Projekt {selectedProjectForTask?.projectNumber}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            const newTask: Task = {
              id: Date.now().toString(),
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              assignedTo: formData.get('assignedTo') as string,
              dueDate: formData.get('dueDate') as string,
              priority: formData.get('priority') as 'low' | 'medium' | 'high',
              projectNumber: formData.get('projectNumber') as string,
              status: 'pending',
              createdAt: new Date().toISOString(),
              taskNumber: `TASK-${Date.now()}`,
              employee: formData.get('assignedTo') as string,
              customer: selectedProjectForTask?.customerName || '',
              workLocation: selectedProjectForTask?.workLocation || ''
            };

            setTasks(prev => [newTask, ...prev]);
            localStorage.setItem('tasks', JSON.stringify([newTask, ...tasks]));
            
            toast({
              title: "Erfolg",
              description: `Aufgabe "${newTask.title}" wurde erfolgreich erstellt.`,
            });
            
            setShowTaskForm(false);
            setSelectedProjectForTask(null);
            setTaskFormData({
              title: '',
              description: '',
              assignedTo: '',
              dueDate: '',
              priority: 'medium',
              projectNumber: ''
            });
          }} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectNumber">Projektnummer</Label>
                <Input
                  id="projectNumber"
                  name="projectNumber"
                  value={taskFormData.projectNumber}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  name="title"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                name="description"
                value={taskFormData.description}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedTo">Zugewiesen an</Label>
                <Select 
                  name="assignedTo" 
                  value={taskFormData.assignedTo}
                  onValueChange={(value) => setTaskFormData(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.name}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">Fö¤lligkeitsdatum</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="priority">Prioritö¤t</Label>
              <Select 
                name="priority" 
                value={taskFormData.priority}
                onValueChange={(value) => setTaskFormData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTaskForm(false);
                  setSelectedProjectForTask(null);
                  setTaskFormData({
                    title: '',
                    description: '',
                    assignedTo: '',
                    dueDate: '',
                    priority: 'medium',
                    projectNumber: ''
                  });
                }}
              >
                Abbrechen
              </Button>
              <Button type="submit">
                Aufgabe erstellen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

  
      {/* Quick Action Buttons */}
      <QuickActionButtons onNavigate={onNavigate} hasPermission={hasPermission} currentPage="projects" />
    </div>
  );
};

export default ProjectManagement;




