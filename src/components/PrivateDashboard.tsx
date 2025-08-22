import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardProps } from '@/types/common';
import AppHeader from './AppHeader';
import { 
  FolderOpen, 
  CheckSquare, 
  FileText, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  Building2,
  ClipboardList,
  Calendar,
  ExternalLink,
  Plus,
  MessageSquare,
  Shield,
  Archive
} from 'lucide-react';

const PrivateDashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenMessaging }) => {
  const { user, isDemoUser, canCreateProject, canCreateTask, canCreateProjectInfo, canViewReports, canCreateCustomer, canCreateMaterial, canCreateCategory, canCreateUser, canViewOwnProjects, canViewOwnReports, canViewOwnProjectInfo, canViewCustomers, canViewMaterials, canViewCategories, canViewUsers, hasPermission, canCreateReport } = useAuth();
  const { toast } = useToast();

  // Special permissions for auftraggeber
  const canViewOwnProject = (): boolean => hasPermission('view_own_project');
  const canViewOwnProjectReports = (): boolean => hasPermission('view_own_project_reports');
  const canViewOwnProjectProgress = (): boolean => hasPermission('view_own_project_progress');

  // Generate demo reports only for demo users
  useEffect(() => {
    if (isDemoUser()) {
      const savedReports = localStorage.getItem('reports');
      if (!savedReports) {
        generateDemoReports();
      }
    } else {
      // Für echte Benutzer: Demo-Daten entfernen und echte Daten laden
      localStorage.removeItem('reports');

    }
  }, [isDemoUser]);

  // Funktion zum Laden echter Daten für registrierte Benutzer
  const loadRealData = async () => {
    if (!user || isDemoUser()) return;
    
    try {

      // Hier kö¶nnen spö¤ter echte Firestore-Daten geladen werden
      // Für jetzt zeigen wir nur eine leere Oberflö¤che
    } catch (error) {

    }
  };

  // Echte Daten laden, wenn Benutzer kein Demo-Benutzer ist
  useEffect(() => {
    if (user && !isDemoUser()) {
      loadRealData();
    }
  }, [user, isDemoUser]);

  const generateDemoReports = () => {
    const demoEmployees = [
      'Max Mustermann',
      'Anna Schmidt',
      'Tom Weber',
      'Lisa Müller',
      'Paul Fischer'
    ];

    const demoCustomers = [
      'München Immobilien GmbH',
      'Hamburg Wohnbau AG',
      'Berlin Shopping Center GmbH',
      'Frankfurt Kliniken AG',
      'Stadt Kö¶ln - Schulamt'
    ];

    const demoProjects = [
      'PRJ-2024-001',
      'PRJ-2024-002',
      'PRJ-2024-003',
      'PRJ-2024-004',
      'PRJ-2024-005'
    ];

    const demoLocations = [
      'München, MaximilianstraöŸe 1',
      'Hamburg, Altonaer StraöŸe 15',
      'Berlin, Unter den Linden 77',
      'Frankfurt, Mainzer LandstraöŸe 123',
      'Kö¶ln, SchulstraöŸe 5'
    ];

    const demoWorkDescriptions = [
      'Elektroinstallation in Wohngebö¤ude',
      'Sanitö¤rarbeiten im Badezimmer',
      'Heizungsinstallation im Keller',
      'Beleuchtungsanlage im Büro',
      'Klimaanlage Wartung',
      'Solaranlage Installation',
      'Smart Home System Einrichtung',
      'Notstromaggregat Installation',
      'Elektroverteiler Erneuerung',
      'Warmwasserbereiter Reparatur'
    ];

    const demoReports = Array.from({ length: 20 }, (_, index) => ({
      id: `REP-${String(index + 1).padStart(3, '0')}`,
      employee: demoEmployees[index % demoEmployees.length],
      customer: demoCustomers[index % demoCustomers.length],
      project: demoProjects[index % demoProjects.length],
      location: demoLocations[index % demoLocations.length],
      workDescription: demoWorkDescriptions[index % demoWorkDescriptions.length],
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      hours: Math.floor(Math.random() * 8) + 4,
      status: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    }));

    localStorage.setItem('reports', JSON.stringify(demoReports));
  };

  const handleFunctionClick = (functionName: string) => {
    if (onNavigate) {
      onNavigate(functionName);
    }
  };

  const handleQuickAction = (functionName: string) => {
    if (onNavigate) {
      // Navigate directly to the creation form for each function
      const quickActionRoutes = {
        'tasks': 'new-task',
        'reports': 'new-report', 
        'users': 'new-user',
        'customers': 'new-customer',
        'categories': 'new-category',
        'materials': 'new-material',
        'projects': 'new-project',
        'project-info': 'new-project-info'
      };
      
      const route = quickActionRoutes[functionName as keyof typeof quickActionRoutes];
      if (route) {
        onNavigate(route);
      } else {
        // Fallback to default navigation
        onNavigate(functionName);
      }
    }
  };

  // Main functions grid with permission-based filtering
  const mainFunctions = [
    {
      id: 'tasks',
      title: 'Aufgaben',
      description: canCreateTask() ? 'Aufgaben erstellen und verwalten' : 'Kein Zugriff',
      icon: CheckSquare,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      visible: canCreateTask(), // Only visible if can create tasks (no read-only access)
      quickAction: canCreateTask() ? 'Neue Aufgabe' : null
    },
    {
      id: 'reports',
      title: 'Berichte',
      description: canViewReports() ? 'Alle Berichte verwalten' : canViewOwnReports() ? 'Eigene Berichte verwalten' : canViewOwnProjectReports() ? 'Projektberichte einsehen' : 'Berichte einsehen',
      icon: BarChart3,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      visible: canViewReports() || canViewOwnReports() || canViewOwnProjectReports(), // Visible if can view all reports, own reports, or own project reports
      quickAction: canCreateReport() ? 'Bericht erstellen' : null
    },

    {
      id: 'users',
      title: 'Benutzer',
      description: canCreateUser() ? 'Benutzer erstellen und verwalten' : canViewUsers() ? 'Benutzer einsehen (READ-ONLY)' : 'Kein Zugriff',
      icon: Users,
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600',
      visible: canCreateUser() || canViewUsers(), // Visible if can create or view users
      quickAction: canCreateUser() ? 'Neuen Benutzer' : null
    },
    {
      id: 'customers',
      title: 'Kunden',
      description: canCreateCustomer() ? 'Kunden erstellen und verwalten' : canViewCustomers() ? 'Kunden einsehen (READ-ONLY)' : 'Kein Zugriff',
      icon: Building2,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
      visible: canCreateCustomer() || canViewCustomers(), // Visible if can create or view customers
      quickAction: canCreateCustomer() ? 'Neuen Kunden' : null
    },
    {
      id: 'categories',
      title: 'Kategorien',
      description: canCreateCategory() ? 'Kategorien erstellen und verwalten' : canViewCategories() ? 'Kategorien einsehen (READ-ONLY)' : 'Kein Zugriff',
      icon: ClipboardList,
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600',
      visible: canCreateCategory() || canViewCategories(), // Visible if can create or view categories
      quickAction: canCreateCategory() ? 'Neue Kategorie' : null
    },
    {
      id: 'materials',
      title: 'Materialien',
      description: canCreateMaterial() ? 'Materialien erstellen und verwalten' : canViewMaterials() ? 'Materialien einsehen (READ-ONLY)' : 'Kein Zugriff',
      icon: Package,
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600',
      visible: canCreateMaterial() || canViewMaterials(), // Visible if can create or view materials
      quickAction: canCreateMaterial() ? 'Neues Material' : null
    },
    {
      id: 'projects',
      title: 'Projekte',
      description: canCreateProject() ? 'Projekte erstellen und verwalten' : canViewOwnProjects() ? 'Eigene Projekte anzeigen' : 'Projekte einsehen',
      icon: FolderOpen,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      visible: canCreateProject() || canViewOwnProjects() || canViewOwnProject(), // Visible if can create, view all, or view own project
      quickAction: canCreateProject() ? 'Neues Projekt' : null
    },
    {
      id: 'project-info',
      title: 'Projektinformationen',
      description: canCreateProjectInfo() ? 'Projektinfos erstellen und verwalten' : canViewOwnProjectInfo() ? 'Eigene Projektinfos anzeigen' : 'Projektinfos einsehen',
      icon: FileText,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      visible: canCreateProjectInfo() || canViewOwnProjectInfo(), // Visible if can create or view own project info
      quickAction: canCreateProjectInfo() ? 'Neue Projektinfo' : null
    },
    {
      id: 'documents',
      title: 'Dokumentenverwaltung',
      description: hasPermission('create_document') ? 'Dokumente hochladen und verwalten' : hasPermission('view_document') ? 'Dokumente einsehen (READ-ONLY)' : 'Kein Zugriff',
      icon: Archive,
      color: 'bg-amber-500',
      hoverColor: 'hover:bg-amber-600',
      visible: hasPermission('create_document') || hasPermission('view_document'), // Visible if can create or view documents
      quickAction: hasPermission('create_document') ? 'Dokument hochladen' : null
    },
    {
      id: 'concern-management',
      title: 'Concern-Verwaltung',
      description: 'Zentrale Unternehmensdaten verwalten (nur Administratoren)',
      icon: Shield,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      visible: hasPermission('admin') || user?.role === 'admin' || user?.rechte >= 10, // Nur für Administratoren sichtbar
      quickAction: null // Keine Quick Action für Concern-Verwaltung
    },

  ].filter(func => func.visible);

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      {/* Header with logout and navigation */}
      <AppHeader 
        title="Hauptdashboard"
        showBackButton={false}
        onOpenMessaging={onOpenMessaging}
      />
      
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-8 shadow-lg text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Willkommen, {user?.vorname || 'Benutzer'}!
            </h1>
            <p className="text-xl text-gray-700">
              Wö¤hlen Sie eine Funktion aus, um zu beginnen
            </p>

          </div>

          {/* Main Functions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainFunctions.map((func) => {
              const IconComponent = func.icon;
              return (
                <div
                  key={func.id}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-200 relative group cursor-pointer"
                  onClick={() => handleFunctionClick(func.id)}
                >
                  {/* Quick Action Button - Only show if quickAction exists */}
                  {func.quickAction && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAction(func.id);
                      }}
                      className="absolute top-3 right-3 p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors duration-200 opacity-0 group-hover:opacity-100"
                      title={func.quickAction}
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                    </button>
                  )}

                  {/* Card Content */}
                  <div className="text-center">
                    <div className={`w-16 h-16 ${func.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{func.title}</h3>
                    <p className="text-sm text-gray-600">{func.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateDashboard;
