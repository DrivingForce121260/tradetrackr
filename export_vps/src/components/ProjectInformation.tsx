import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  File, 
  Package, 
  Table as TableIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  FolderOpen,
  CheckSquare,
  BarChart3,
  User,
  Users,
  Building2,
  ClipboardList,
  Upload,
  Archive,
  RefreshCw,
  AlertCircle,
  Grid3X3,
  List,
  Download,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectInfo, ExtendedProject } from '@/types/project';
import { ManagementWithNavigationProps } from '@/types/common';
import AppHeader from './AppHeader';
import { useQuickAction } from '@/contexts/QuickActionContext';
import { cleanupDemoData } from '@/utils/demoDataCleanup';
import DocumentUploadModal from './DocumentUploadModal';
import { documentService, FirebaseDocument } from '@/services/documentService';
import { projectService } from '@/services/firestoreService';

interface ProjectInformationProps extends ManagementWithNavigationProps {}

export default function ProjectInformation({ onBack, onNavigate, onOpenMessaging }: ProjectInformationProps) {
  const { user, hasPermission } = useAuth();
  const { isQuickAction, quickActionType } = useQuickAction();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingInfo, setViewingInfo] = useState<ProjectInfo | null>(null);
  const [editingInfo, setEditingInfo] = useState<ProjectInfo | null>(null);
  const [sortBy, setSortBy] = useState<keyof ProjectInfo>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // State for the project selected from ProjectManagement
  const [selectedProjectFromPM, setSelectedProjectFromPM] = useState<ExtendedProject | null>(null);
  const [returnToPage, setReturnToPage] = useState<string | null>(null);

  // Document upload modal state
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  // Document management state
  const [documents, setDocuments] = useState<FirebaseDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentViewMode, setDocumentViewMode] = useState<'grid' | 'list' | 'table'>('grid');

  // Load selected project from localStorage when component mounts
  useEffect(() => {
    const savedProject = localStorage.getItem('selectedProjectForInfo');
    const savedReturnPage = localStorage.getItem('returnToPage');
    
    if (savedProject) {
      try {
        const project = JSON.parse(savedProject);
        setSelectedProjectFromPM(project);
        setSelectedProject(project.id); // Also set the selectedProject state for filtering

        // Clear the localStorage after loading to prevent persistence
        localStorage.removeItem('selectedProjectForInfo');
      } catch (error) {

      }
    }
    
    if (savedReturnPage) {
      setReturnToPage(savedReturnPage);

    }
  }, []);

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'project-info') {
      setShowAddDialog(true);
    }
  }, [isQuickAction, quickActionType]);

  // Permission checks
  const canAddInfo = hasPermission('create_project_info') || hasPermission('manage_project_info');
  const canEditInfo = hasPermission('edit_project_info') || hasPermission('manage_project_info');
  const canDeleteInfo = hasPermission('delete_project_info') || hasPermission('manage_project_info');
  const canViewOwnProjectInfo = hasPermission('view_own_project_info');
  const canManageInfo = canAddInfo || canEditInfo || canDeleteInfo;
  const canUploadDocuments = hasPermission('create_document');

  // Load projects and project infos from localStorage
  const [projects, setProjects] = useState<ExtendedProject[]>([]);
  const [projectInfos, setProjectInfos] = useState<ProjectInfo[]>([]);

  // Auto-reload projects when add dialog is opened if no projects are available
  useEffect(() => {
    if (showAddDialog && projects.length === 0) {
      // Don't auto-reload to prevent infinite loops
      // Just show the warning message

    }
  }, [showAddDialog, projects.length]);

  // Load documents when a project is selected
  useEffect(() => {
    if (selectedProject && user?.concernID) {
      loadProjectDocuments(selectedProject);
    } else {
      setDocuments([]);
    }
  }, [selectedProject, user?.concernID]);

  // Function to load documents for a project
  const loadProjectDocuments = async (projectId: string) => {
    if (!user?.concernID) {

      return;
    }
    


    
    setIsLoadingDocuments(true);
    try {
      const projectDocuments = await documentService.getProjectDocuments(
        user.concernID,
        projectId
      );
      setDocuments(projectDocuments);


    } catch (error) {

      setDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Helper function to format Firestore Timestamps
  const formatTimestamp = (timestamp: any): string => {
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('de-DE');
    }
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('de-DE');
    }
    if (timestamp) {
      return new Date(timestamp).toLocaleDateString('de-DE');
    }
    return 'Unbekannt';
  };

  // Handle document upload success
  const handleDocumentUploadSuccess = () => {
    if (selectedProject) {
      loadProjectDocuments(selectedProject);
    }
    setShowDocumentUpload(false);
  };

  useEffect(() => {
    if (user) {
      // For authenticated users, try to load from Firebase first, then localStorage as fallback
      const loadProjectsFromFirebase = async () => {
        try {
          if (user.concernID) {

            const firebaseProjects = await projectService.getAll(user.concernID);

            setProjects(firebaseProjects as any);
            
            // Update localStorage for offline access
            localStorage.setItem('projects', JSON.stringify(firebaseProjects));
          } else {

            throw new Error('No concernID available');
          }
        } catch (error) {

          try {
            const savedProjects = localStorage.getItem('projects');
            if (savedProjects) {
              const parsedProjects = JSON.parse(savedProjects);
              setProjects(parsedProjects);

            } else {

              setProjects([]);
            }
          } catch (localError) {

            setProjects([]);
          }
        }
      };

      loadProjectsFromFirebase();
      setProjectInfos([]);
    } else {
      // For non-authenticated users, load demo data
      const demoProjects: ExtendedProject[] = [
        { 
          id: '1', 
          name: 'Bürogebäude Renovierung', 
          description: 'Renovierung des Bürogebäudes',
          status: 'active',
          createdAt: '2024-01-01',
          projectNumber: 'PRJ-001', 
          customerReference: 'ABC001',
          customerName: 'ABC GmbH', 
          customerPhone: '+49 89 123456',
          customerEmail: 'info@abc-gmbh.de',
          customerAddress: 'Münchener Str. 1',
          category: 'Elektroinstallation',
          assignedManager: 'Max Mustermann',
          city: 'München',
          postalCode: '80331',
          workLocation: 'Bürogebäude München',
          workAddress: 'Münchener Str. 1',
          workCity: 'München',
          workPostalCode: '80331',
          workLocationNotes: 'Hauptgebäude, 3. Stock',
          notes: 'Elektroinstallation für Bürogebäude',
          assignedEmployees: ['Max Mustermann', 'Anna Schmidt'],
          assignedMaterialGroups: ['Elektro', 'Beleuchtung'],
          projectStartDate: '2024-01-15',
          plannedEndDate: '2024-06-30'
        },
        { 
          id: '2', 
          name: 'Wohnungsbau', 
          description: 'Neubau von Wohnungen',
          status: 'active',
          createdAt: '2024-01-01',
          projectNumber: 'PRJ-002', 
          customerReference: 'XYZ002',
          customerName: 'XYZ AG', 
          customerPhone: '+49 40 654321',
          customerEmail: 'info@xyz-ag.de',
          customerAddress: 'Hamburger Str. 2',
          category: 'Elektroinstallation',
          assignedManager: 'Anna Schmidt',
          city: 'Hamburg',
          postalCode: '20095',
          workLocation: 'Wohnanlage Hamburg',
          workAddress: 'Hamburger Str. 2',
          workCity: 'Hamburg',
          workPostalCode: '20095',
          workLocationNotes: 'Neubaugebiet, Block A',
          notes: 'Elektroinstallation für Wohnanlage',
          assignedEmployees: ['Anna Schmidt', 'Tom Weber'],
          assignedMaterialGroups: ['Elektro', 'Beleuchtung', 'Sicherheit'],
          projectStartDate: '2024-02-01',
          plannedEndDate: '2024-08-31'
        },
        { 
          id: '3', 
          name: 'Industriehalle', 
          description: 'Elektroinstallation in Industriehalle',
          status: 'completed',
          createdAt: '2024-01-01',
          projectNumber: 'PRJ-003', 
          customerReference: 'DEF003',
          customerName: 'DEF KG', 
          customerPhone: '+49 30 987654',
          customerEmail: 'info@def-kg.de',
          customerAddress: 'Berliner Str. 3',
          category: 'Elektroinstallation',
          assignedManager: 'Tom Weber',
          city: 'Berlin',
          postalCode: '10115',
          workLocation: 'Industriehalle Berlin',
          workAddress: 'Berliner Str. 3',
          workCity: 'Berlin',
          workPostalCode: '10115',
          workLocationNotes: 'Industriegebiet, Halle 5',
          notes: 'Elektroinstallation für Industriehalle',
          assignedEmployees: ['Tom Weber', 'Max Mustermann'],
          assignedMaterialGroups: ['Elektro', 'Industrie', 'Sicherheit'],
          projectStartDate: '2023-09-01',
          plannedEndDate: '2024-01-31'
        },
      ];

      const demoProjectInfos: ProjectInfo[] = [
        {
          id: '1',
          projectId: '1',
          projectNumber: 'PRJ-001',
          title: 'Grundriss Plan',
          description: 'Detaillierter Grundriss des Bürogebäudes mit allen Räumen und Abmessungen',
          type: 'diagram',
          content: 'Technische Zeichnung mit allen relevanten Details',
          uploadedBy: 'Max Mustermann',
          uploadedAt: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          projectId: '1',
          projectNumber: 'PRJ-001',
          title: 'Materialliste',
          description: 'Vollständige Liste aller benötigten Materialien mit Mengen und Preisen',
          type: 'checklist',
                      content: '1. Kabel und Leitungen\n2. Schalter und Steckdosen\n3. Sicherungskästen\n4. Beleuchtungskörper\n5. Werkzeuge',
          uploadedBy: 'Anna Schmidt',
          uploadedAt: '2024-01-16T14:30:00Z'
        },
        {
          id: '3',
          projectId: '2',
          projectNumber: 'PRJ-002',
          title: 'Zeitplan',
          description: 'Detaillierter Zeitplan für alle Bauphasen des Wohnungsbaus',
          type: 'diagram',
          content: 'Detaillierter Zeitplan für alle Bauphasen',
          uploadedBy: 'Tom Weber',
          uploadedAt: '2024-01-17T09:15:00Z'
        },
        {
          id: '4',
          projectId: '3',
          projectNumber: 'PRJ-003',
          title: 'Abschlussbericht',
          description: 'Vollständiger Abschlussbericht der Industriehalle mit Fotos und Dokumentation',
          type: 'pdf',
                      content: 'Vollständiger Abschlussbericht mit Fotos und Dokumentation',
          uploadedBy: 'Max Mustermann',
          uploadedAt: '2024-01-18T16:45:00Z'
        }
      ];

      setProjects(demoProjects);
      setProjectInfos(demoProjectInfos);
    }
  }, [user]);

  // Filter project infos based on user permissions
  const filteredInfos = projectInfos.filter(info => {
    // For now, all users can see all project infos
    // In the future, this could be filtered based on user permissions
    return true;
  });

  // Filter projects based on user permissions
  const filteredProjects = projects.filter(project => {
    // For now, all users can see all projects
    // In the future, this could be filtered based on user permissions
    return true;
  });

  // Search and filter
  const filteredAndSearchedInfos = filteredInfos.filter(info => {
    const matchesSearch = info.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         info.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         info.projectNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = !selectedProject || info.projectId === selectedProject;
    
    return matchesSearch && matchesProject;
  });

  // Sorting
  const sortedInfos = [...filteredAndSearchedInfos].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortBy === 'uploadedAt') {
      const aDate = new Date(aValue as string);
      const bDate = new Date(bValue as string);
      return sortOrder === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  // Handle back navigation
  const handleBackNavigation = () => {
    // Check if there's a stored return page
    if (returnToPage) {

      localStorage.removeItem('returnToPage'); // Clean up
      setReturnToPage(null); // Reset state
      onNavigate(returnToPage);
    } else {
      // Default fallback to dashboard

      onBack();
    }
  };

  // Handle sort column
  const handleSortColumn = (column: keyof ProjectInfo) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (column: keyof ProjectInfo) => {
    if (sortBy !== column) return <ArrowUpDown className="h-5 w-5" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />;
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <File className="h-5 w-5 text-red-600" />;
      case 'diagram':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'checklist':
        return <FileText className="h-5 w-5 text-green-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF';
      case 'diagram':
        return 'Diagramm';
      case 'checklist':
        return 'Checkliste';
      default:
        return type;
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    type: 'pdf'
  });

  // Handle add new info
  const handleAddInfo = () => {
    // In a real app, this would save to an API

    setShowAddDialog(false);
    setFormData({ projectId: '', title: '', description: '', type: 'pdf' });
  };

  // Handle edit info
  const handleEdit = (info: ProjectInfo) => {
    setEditingInfo(info);
    setFormData({
      projectId: info.projectId,
      title: info.title,
      description: info.description,
      type: info.type
    });
    setShowEditDialog(true);
  };

  // Handle delete info
  const handleDelete = (info: ProjectInfo) => {
    if (window.confirm(`Möchten Sie "${info.title}" wirklich löschen?`)) {
      // In a real app, this would delete from an API

    }
  };

  // Handle delete info (for cards view)
  const handleDeleteInfo = (info: ProjectInfo) => {
    if (window.confirm(`Möchten Sie "${info.title}" wirklich löschen?`)) {
      // In a real app, this would delete from an API

    }
  };

  // Open edit dialog
  const openEditDialog = (info: ProjectInfo) => {
    setEditingInfo(info);
    setFormData({
      projectId: info.projectId,
      title: info.title,
      description: info.description,
      type: info.type
    });
    setShowEditDialog(true);
  };

  // Handle edit save
  const handleEditSave = () => {
    if (editingInfo) {
      // In a real app, this would update via an API

      setShowEditDialog(false);
      setEditingInfo(null);
      setFormData({ projectId: '', title: '', description: '', type: 'pdf' });
    }
  };

  // Function to reload projects from Firebase
  const reloadProjects = async () => {
    try {

      setIsLoadingDocuments(true);
      
      if (user?.concernID) {
        const firebaseProjects = await projectService.getAll(user.concernID);

        
        // Use the projects directly from Firebase
        setProjects(firebaseProjects as any);
        
        // Also update localStorage for offline access
        localStorage.setItem('projects', JSON.stringify(firebaseProjects));
      } else {

        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) {
          const parsedProjects = JSON.parse(savedProjects);
          setProjects(parsedProjects);

        } else {

          setProjects([]);
        }
      }
    } catch (error) {

      
      // Fallback to localStorage
      try {
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) {
          const parsedProjects = JSON.parse(savedProjects);
          setProjects(parsedProjects);

        } else {
          setProjects([]);
        }
      } catch (localError) {

        setProjects([]);
      }
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="📋 Projektinformationen"
        showBackButton={true}
        onBack={handleBackNavigation}
        onOpenMessaging={onOpenMessaging}
      >
        {canAddInfo && (
          <div className="flex items-center gap-2">
            <Button
              onClick={reloadProjects}
              variant="outline"
              className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all"
              title="Projekte neu laden"
            >
              🔄 Neu laden
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              ✨ Neue Information
            </Button>
          </div>
        )}
      </AppHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Read-Only Notice */}
          {!canManageInfo && (
            <Card className="border-2 border-blue-300 shadow-lg overflow-hidden">
              <CardContent className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">
                    👁️ Sie haben nur Lesezugriff auf Projektinformationen.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Project Display */}
          {selectedProjectFromPM && (
            <Card className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 pt-4 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  🎯 Ausgewähltes Projekt
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                    <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      📋 Projektnummer
                    </Label>
                    <p className="text-lg font-bold text-gray-900 mt-1">{selectedProjectFromPM.projectNumber}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                    <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      📁 Projektname
                    </Label>
                    <p className="text-lg font-bold text-gray-900 mt-1">{selectedProjectFromPM.name}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                    <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      🏷️ Status
                    </Label>
                    <Badge className={`mt-1 ${
                      selectedProjectFromPM.status === 'active' ? 'bg-green-500' :
                      selectedProjectFromPM.status === 'planned' ? 'bg-blue-500' :
                      selectedProjectFromPM.status === 'completed' ? 'bg-purple-500' :
                      'bg-gray-500'
                    } text-white font-semibold`}>
                      {selectedProjectFromPM.status === 'active' ? '⚡ Aktiv' :
                       selectedProjectFromPM.status === 'planned' ? '📝 Geplant' :
                       selectedProjectFromPM.status === 'completed' ? '✅ Abgeschlossen' :
                       selectedProjectFromPM.status}
                    </Badge>
                  </div>
                  <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                    <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      👤 Kunde
                    </Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedProjectFromPM.customerName}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                    <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      👔 Projektmanager
                    </Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedProjectFromPM.assignedManager}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                    <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      📝 Beschreibung
                    </Label>
                    <p className="text-sm text-gray-700 line-clamp-2 mt-1">{selectedProjectFromPM.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Projects Warning */}
          {projects.length === 0 && (
            <Card className="border-2 border-amber-400 shadow-xl overflow-hidden">
              <CardContent className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6">
                <div className="flex items-center gap-4">
                  <AlertCircle className="h-8 w-8 text-amber-600" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-900">
                      ⚠️ Keine Projekte verfügbar
                    </h3>
                    <p className="text-amber-700 mt-1">
                      Es sind keine Projekte geladen. Klicken Sie auf "Projekte neu laden" oder laden Sie zuerst Projekte in der Projektverwaltung.
                    </p>
                  </div>
                  <Button
                    onClick={reloadProjects}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Neu laden
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controls Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Filter & Suche
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {sortedInfos.length} {sortedInfos.length === 1 ? 'Eintrag' : 'Einträge'}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-4">
              {/* Search and Project Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">📁</div>
                  <select 
                    value={selectedProject} 
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full pl-10 p-2 border-2 border-gray-300 rounded-md bg-white focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  >
                    <option key="all-projects" value="">🎯 Alle Projekte anzeigen</option>
                    {filteredProjects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                  <Input
                    placeholder="Projektinformationen suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || selectedProject) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedProject('');
                    }}
                    className="text-xs h-8 px-3 border-2 border-red-300 hover:border-red-500 hover:bg-red-50 transition-all"
                  >
                    <X className="h-3 w-3 mr-1" />
                    ❌ Alle Filter zurücksetzen
                  </Button>
                </div>
              )}

              {/* Document Display Section - Right below the filter reset button */}
              {selectedProject && documents.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Projekt-Dokumente</h2>
                      <p className="text-gray-600">
                        Alle für das ausgewählte Projekt hochgeladenen Dokumente
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentViewMode('grid')}
                        className={documentViewMode === 'grid' ? 'bg-blue-50 border-blue-300' : ''}
                      >
                        <Grid3X3 className="h-4 w-4 mr-2" />
                        Grid
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentViewMode('list')}
                        className={documentViewMode === 'list' ? 'bg-blue-50 border-blue-300' : ''}
                      >
                        <List className="h-4 w-4 mr-2" />
                        Liste
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentViewMode('table')}
                        className={documentViewMode === 'table' ? 'bg-blue-50 border-blue-300' : ''}
                      >
                        <TableIcon className="h-4 w-4 mr-2" />
                        Tabelle
                      </Button>
                    </div>
                  </div>

                  {/* Document Content */}
                  {isLoadingDocuments ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Dokumente werden geladen...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documentViewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {documents.map((doc) => (
                            <div key={doc.documentId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-blue-600" />
                                  <span className="font-medium text-sm">{doc.displayName}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {doc.fileType}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{doc.description || 'Keine Beschreibung'}</p>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{documentService.formatFileSize(doc.fileSize)}</span>
                                <span>{formatTimestamp(doc.uploadDate)}</span>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.downloadUrl, '_blank')}
                                  className="flex-1"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Anzeigen
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.downloadUrl, '_blank')}
                                  className="flex-1"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {documentViewMode === 'list' && (
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div key={doc.documentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">{doc.displayName}</p>
                                  <p className="text-sm text-gray-600">{doc.description || 'Keine Beschreibung'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{doc.fileType}</Badge>
                                <span className="text-sm text-gray-500">{documentService.formatFileSize(doc.fileSize)}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.downloadUrl, '_blank')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {documentViewMode === 'table' && (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Typ</TableHead>
                                <TableHead>Größe</TableHead>
                                <TableHead>Hochgeladen</TableHead>
                                <TableHead>Aktionen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {documents.map((doc) => (
                                <TableRow key={doc.documentId}>
                                  <TableCell className="font-medium">{doc.displayName}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{doc.fileType}</Badge>
                                  </TableCell>
                                  <TableCell>{documentService.formatFileSize(doc.fileSize)}</TableCell>
                                  <TableCell>{formatTimestamp(doc.uploadDate)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(doc.downloadUrl, '_blank')}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(doc.downloadUrl, '_blank')}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Project Information Content */}
              {sortedInfos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedProjectFromPM
                      ? 'Keine Informationen für dieses Projekt gefunden'
                      : 'Keine Projektinformationen vorhanden'}
                  </h3>
                  <p className="text-gray-600">
                    {selectedProjectFromPM
                      ? 'Erstellen Sie die erste Information für dieses Projekt.'
                      : 'Erstellen Sie Ihre erste Projektinformation.'}
                  </p>
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
                              onClick={() => handleSortColumn('projectNumber')}
                            >
                              <div className="flex items-center gap-1">
                                Projekt {getSortIcon('projectNumber')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('title')}
                            >
                              <div className="flex items-center gap-1">
                                Titel {getSortIcon('title')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('type')}
                            >
                              <div className="flex items-center gap-1">
                                Typ {getSortIcon('type')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('description')}
                            >
                              <div className="flex items-center gap-1">
                                Beschreibung {getSortIcon('description')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('uploadedBy')}
                            >
                              <div className="flex items-center gap-1">
                                Erstellt von {getSortIcon('uploadedBy')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSortColumn('uploadedAt')}
                            >
                              <div className="flex items-center gap-1">
                                Erstellt am {getSortIcon('uploadedAt')}
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 w-20">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedInfos.map((info) => (
                            <TableRow 
                              key={info.id} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => setViewingInfo(info)}
                            >
                              <TableCell className="font-mono text-sm">
                                {info.projectNumber}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(info.type)}
                                  <div className="font-medium">{info.title}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{getTypeLabel(info.type)}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[200px]">
                                  <div className="font-medium">{info.description}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{info.uploadedBy}</div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatTimestamp(info.uploadedAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(info);
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </Button>
                                  {canDeleteInfo && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(info);
                                      }}
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedInfos.map((info) => (
                        <Card key={info.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              {getTypeIcon(info.type)}
                              {info.title}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Projekt: {info.projectNumber}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {info.description}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{info.uploadedBy}</span>
                                <span>{formatTimestamp(info.uploadedAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingInfo(info)}
                                  className="flex-1"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Anzeigen
                                </Button>
                                {canEditInfo && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditDialog(info)}
                                      className="h-8 w-8 p-0"
                                      aria-label={`Projektinformation "${info.title || info.id}" bearbeiten`}
                                      title="Bearbeiten"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteInfo(info)}
                                      className="h-8 w-8 p-0"
                                      aria-label={`Projektinformation "${info.title || info.id}" löschen`}
                                      title="Löschen"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
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

      {/* Add Dialog */}
      {canAddInfo && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-50 via-white to-blue-50 border-4 border-[#058bc0] shadow-2xl">
            <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-purple-600 to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
              {/* Animated background decoration */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              
              <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
                <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
                  ✨
                </div>
                <div className="flex-1">
                  Neue Projektinformation hinzufügen
                  <div className="text-xs font-normal text-white/80 mt-1">
                    Erstellen Sie strukturierte Projektinformationen mit Dokumenten
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 pt-4">
              {/* Project Selection */}
              <div className="space-y-3 p-5 bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-xl border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                <Label htmlFor="project" className="text-base font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">📁</span>
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Projekt auswählen *
                  </span>
                </Label>
                <select
                  id="project"
                  value={formData.projectId}
                  onChange={(e) => {
                    const projectId = e.target.value;

                    setFormData(prev => ({ ...prev, projectId }));
                    // Also load documents for the selected project
                    if (projectId && user?.concernID) {

                      loadProjectDocuments(projectId);
                    } else {

                      setDocuments([]);
                    }
                  }}
                  className="w-full p-3 border-3 border-blue-300 rounded-lg shadow-md focus:border-[#058bc0] focus:ring-4 focus:ring-[#058bc0]/30 text-gray-900 font-semibold text-base"
                >
                  <option key="select-project" value="">Projekt auswählen</option>
                  {filteredProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>
                {filteredProjects.length === 0 && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm text-amber-800 font-medium">
                      Keine Projekte verfügbar. Bitte laden Sie zuerst Projekte.
                    </p>
                  </div>
                )}
              </div>

              {/* Document Upload Section */}
              {canUploadDocuments && formData.projectId && (
                <div className="space-y-4 p-5 bg-gradient-to-br from-orange-100 via-orange-50 to-white rounded-xl border-3 border-orange-300 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <span className="text-3xl">📎</span>
                        <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                          Dokumente hochladen
                        </span>
                      </h3>
                      <p className="text-sm text-gray-700 mt-1 ml-12">
                        Laden Sie Dateien für dieses Projekt hoch
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowDocumentUpload(true)}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 px-6 py-3"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Hochladen
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 bg-white border-2 border-blue-200 rounded-lg p-3 shadow-sm">
                      <Archive className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-800">PDF, Bilder, Dokumente</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white border-2 border-green-200 rounded-lg p-3 shadow-sm">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-gray-800">Automatische Kategorisierung</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Display Section */}
              {formData.projectId && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Projekt-Dokumente</h3>
                      <p className="text-sm text-gray-600">
                        Alle für dieses Projekt hochgeladenen Dokumente
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentViewMode('grid')}
                        className={documentViewMode === 'grid' ? 'bg-blue-50 border-blue-300' : ''}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentViewMode('list')}
                        className={documentViewMode === 'list' ? 'bg-blue-50 border-blue-300' : ''}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentViewMode('table')}
                        className={documentViewMode === 'table' ? 'bg-blue-50 border-blue-300' : ''}
                      >
                        <TableIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Document Content */}
                  {isLoadingDocuments ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Dokumente werden geladen...</p>
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-4">
                      {documentViewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {documents.map((doc) => (
                            <div key={doc.documentId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-blue-600" />
                                  <span className="font-medium text-sm">{doc.displayName}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {doc.fileType}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{doc.description || 'Keine Beschreibung'}</p>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{documentService.formatFileSize(doc.fileSize)}</span>
                                <span>{formatTimestamp(doc.uploadDate)}</span>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.downloadUrl, '_blank')}
                                  className="flex-1"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Anzeigen
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.downloadUrl, '_blank')}
                                  className="flex-1"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {documentViewMode === 'list' && (
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div key={doc.documentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">{doc.displayName}</p>
                                  <p className="text-sm text-gray-600">{doc.description || 'Keine Beschreibung'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{doc.fileType}</Badge>
                                <span className="text-sm text-gray-500">{documentService.formatFileSize(doc.fileSize)}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.downloadUrl, '_blank')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {documentViewMode === 'table' && (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Typ</TableHead>
                                <TableHead>Größe</TableHead>
                                <TableHead>Hochgeladen</TableHead>
                                <TableHead>Aktionen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {documents.map((doc) => (
                                <TableRow key={doc.documentId}>
                                  <TableCell className="font-medium">{doc.displayName}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{doc.fileType}</Badge>
                                  </TableCell>
                                  <TableCell>{documentService.formatFileSize(doc.fileSize)}</TableCell>
                                  <TableCell>{formatTimestamp(doc.uploadDate)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(doc.downloadUrl, '_blank')}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(doc.downloadUrl, '_blank')}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Archive className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Keine Dokumente für dieses Projekt vorhanden</p>
                      <p className="text-sm">Laden Sie das erste Dokument hoch, um zu beginnen</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Basic Information Section */}
              <div className="space-y-5 p-5 bg-gradient-to-br from-green-100 via-green-50 to-white rounded-xl border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">📝</span>
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Grundinformationen
                  </span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="text-xl">✍️</span>
                      Titel *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Titel der Projektinformation"
                      className="bg-white border-3 border-green-300 focus:border-green-600 focus:ring-4 focus:ring-green-500/30 text-gray-900 font-semibold shadow-md text-lg h-12"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="text-xl">📄</span>
                      Beschreibung
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detaillierte Beschreibung"
                      rows={5}
                      className="bg-white border-3 border-green-300 focus:border-green-600 focus:ring-4 focus:ring-green-500/30 text-gray-900 shadow-md"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type" className="text-base font-bold text-gray-900 flex items-center gap-2 mb-2">
                      <span className="text-xl">🏷️</span>
                      Typ
                    </Label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full p-3 border-3 border-green-300 rounded-lg shadow-md focus:border-green-600 focus:ring-4 focus:ring-green-500/30 text-gray-900 font-semibold text-base"
                    >
                      <option key="type-pdf" value="pdf">📄 PDF</option>
                      <option key="type-diagram" value="diagram">📊 Diagramm</option>
                      <option key="type-checklist" value="checklist">✅ Checkliste</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 pt-6 border-t-4 border-[#058bc0] mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
              >
                <span className="text-xl mr-2">❌</span> Abbrechen
              </Button>
              <Button 
                onClick={handleAddInfo} 
                className="bg-gradient-to-r from-[#058bc0] via-purple-600 to-[#058bc0] hover:from-purple-600 hover:via-[#058bc0] hover:to-purple-600 text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-purple-700"
              >
                <span className="text-xl mr-2">✨</span> Hinzufügen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Document Upload Modal */}
      {canUploadDocuments && (
        <DocumentUploadModal
          isOpen={showDocumentUpload}
          onClose={() => setShowDocumentUpload(false)}
          onSuccess={handleDocumentUploadSuccess}
          projectId={formData.projectId}
          categories={[]} // Will be loaded from documentService
          concernID={user?.concernID || ''}
        />
      )}

      {/* Edit Dialog */}
      {editingInfo && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Projektinformation bearbeiten</DialogTitle>
              <DialogDescription>
                Bearbeiten Sie die Projektinformation und laden Sie zugehörige Dokumente hoch.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Project Selection */}
              <div>
                <Label htmlFor="edit-project">Projekt auswählen</Label>
                <select
                  id="edit-project"
                  value={formData.projectId}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {filteredProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>
                {filteredProjects.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Keine Projekte verfügbar. Bitte laden Sie zuerst Projekte.
                  </p>
                )}
              </div>

              {/* Document Upload Section */}
              {canUploadDocuments && formData.projectId && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Dokumente hochladen</h3>
                      <p className="text-sm text-gray-600">
                        Laden Sie Dateien für dieses Projekt hoch
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowDocumentUpload(true)}
                      className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Dokumente hochladen
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-blue-600" />
                      <span>Unterstützte Formate: PDF, Bilder, Dokumente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span>Automatische Kategorisierung</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Basic Information Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Grundinformationen</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-title">Titel</Label>
                    <Input
                      id="edit-title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Titel der Projektinformation"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-description">Beschreibung</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detaillierte Beschreibung"
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-type">Typ</Label>
                    <select
                      id="edit-type"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option key="edit-type-pdf" value="pdf">PDF</option>
                      <option key="edit-type-diagram" value="diagram">Diagramm</option>
                      <option key="edit-type-checklist" value="checklist">Checkliste</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleEditSave} className="bg-[#058bc0] hover:bg-[#047aa0]">
                Speichern
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      {viewingInfo && (
        <Dialog open={!!viewingInfo} onOpenChange={() => setViewingInfo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getTypeIcon(viewingInfo.type)}
                {viewingInfo.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Projekt:</span> {viewingInfo.projectNumber}
                </div>
                <div>
                  <span className="font-medium">Typ:</span> {getTypeLabel(viewingInfo.type)}
                </div>
                <div>
                  <span className="font-medium">Erstellt von:</span> {viewingInfo.uploadedBy}
                </div>
                <div>
                  <span className="font-medium">Erstellt am:</span> {formatTimestamp(viewingInfo.uploadedAt)}
                </div>
              </div>
              
              <div>
                <Label className="font-medium">Beschreibung</Label>
                <p className="mt-2 text-gray-700">{viewingInfo.description}</p>
              </div>
              
              {viewingInfo.content && (
                <div>
                  <Label className="font-medium">Inhalt</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">{viewingInfo.content}</pre>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              {canEditInfo && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setViewingInfo(null);
                    openEditDialog(viewingInfo);
                  }}
                >
                  Bearbeiten
                </Button>
              )}
              <Button onClick={() => setViewingInfo(null)}>
                SchlieöŸen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
