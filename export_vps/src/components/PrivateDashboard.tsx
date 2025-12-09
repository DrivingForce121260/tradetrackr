import React, { useState, useEffect } from 'react';
import RecentActivityWidget from '@/components/RecentActivityWidget';
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
  Archive,
  Clock,
  Activity,
  Zap,
  Mail
} from 'lucide-react';

const PrivateDashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenMessaging }) => {
  const { user, isDemoUser, canCreateProject, canCreateTask, canCreateProjectInfo, canViewReports, canCreateCustomer, canCreateMaterial, canCreateCategory, canCreateUser, canViewOwnProjects, canViewOwnReports, canViewOwnProjectInfo, canViewCustomers, canViewMaterials, canViewCategories, canViewUsers, hasPermission, canCreateReport, canCreateCRM, canViewCRM } = useAuth();
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

      // Hier können später echte Firestore-Daten geladen werden
      // Für jetzt zeigen wir nur eine leere Oberfläche
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
      'Stadt Köln - Schulamt'
    ];

    const demoProjects = [
      'PRJ-2024-001',
      'PRJ-2024-002',
      'PRJ-2024-003',
      'PRJ-2024-004',
      'PRJ-2024-005'
    ];

    const demoLocations = [
      'München, Maximilianstraße 1',
      'Hamburg, Altonaer Straße 15',
      'Berlin, Unter den Linden 77',
      'Frankfurt, Mainzer Landstraße 123',
      'Köln, Schulstraße 5'
    ];

    const demoWorkDescriptions = [
      'Elektroinstallation in Wohngebäude',
      'Sanitärarbeiten im Badezimmer',
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
        'project-info': 'new-project-info',
        'crm': 'new-crm'
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
      id: 'smart-inbox',
      title: 'Smart Inbox',
      description: 'KI-gestützte E-Mail-Verwaltung',
      icon: Mail,
      color: 'bg-cyan-500',
      hoverColor: 'hover:bg-cyan-600',
      visible: true, // Visible for all users
      quickAction: null
    },
    {
      id: 'crm',
      title: 'CRM',
      description: canCreateCRM() ? 'Kundenbeziehungen verwalten' : canViewCRM() ? 'CRM-Daten einsehen (READ-ONLY)' : 'Kein Zugriff',
      icon: MessageSquare,
      color: 'bg-emerald-500',
      hoverColor: 'hover:bg-emerald-600',
      visible: canCreateCRM() || canViewCRM(), // Visible if can create or view CRM
      quickAction: canCreateCRM() ? 'Neuen CRM-Eintrag' : null
    },
    {
      id: 'invoicing',
      title: 'Angebote & Rechnungen',
      description: 'Kunden, Angebote, Aufträge, Rechnungen, DATEV-Export',
      icon: FileText,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      visible: true,
      quickAction: null
    },
    {
      id: 'scheduling',
      title: 'Personaleinsatzplan',
      description: 'Planung Projekte/Teams/Ressourcen',
      icon: Clock,
      color: 'bg-cyan-500',
      hoverColor: 'hover:bg-cyan-600',
      visible: true,
      quickAction: null
    },
    {
      id: 'personnel',
      title: 'Personal & Urlaub',
      description: 'Urlaub, Qualifikationen, Einsätze',
      icon: Users,
      color: 'bg-lime-500',
      hoverColor: 'hover:bg-lime-600',
      visible: true,
      quickAction: null
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
    {
      id: 'time-admin',
      title: 'Zeit Administration',
      description: 'Zeiterfassung verwalten: Benutzer, Projekte, Standorte, Genehmigungen',
      icon: Clock,
      color: 'bg-cyan-500',
      hoverColor: 'hover:bg-cyan-600',
      visible: true, // TEMPORÄR: Für alle Benutzer sichtbar zum Testen
      quickAction: null
    },
    {
      id: 'time-ops-live',
      title: 'Zeit Operations',
      description: 'Live-Überwachung, Ausnahmen und Berichte für Vorgesetzte',
      icon: Activity,
      color: 'bg-sky-500',
      hoverColor: 'hover:bg-sky-600',
      visible: true, // TEMPORÄR: Für alle Benutzer sichtbar zum Testen
      quickAction: null
    },
    {
      id: 'automation',
      title: 'Automation',
      description: 'Webhook-Events verwalten und Automation-Keys konfigurieren',
      icon: Zap,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      visible: hasPermission(['admin', 'office']), // Nur für Admin und Office
      quickAction: null
    },
    {
      id: 'settings',
      title: 'Einstellungen',
      description: 'Benachrichtigungen, Kalender-Integration und weitere Einstellungen',
      icon: Settings,
      color: 'bg-slate-500',
      hoverColor: 'hover:bg-slate-600',
      visible: true, // Für alle Benutzer sichtbar
      quickAction: null
    },
    {
      id: 'system-logs',
      title: 'System Logs',
      description: 'Audit-Protokolle und Systemereignisse einsehen',
      icon: Shield,
      color: 'bg-gray-600',
      hoverColor: 'hover:bg-gray-700',
      visible: hasPermission('admin'), // Nur für Administratoren
      quickAction: null
    },

  ].filter(func => func.visible);

  // Group functions into categories, keep consistency across roles by hiding empty groups
  const categorized: Array<{ title: string; items: typeof mainFunctions }> = [
    {
      title: 'Operation',
      items: mainFunctions.filter(f => ['tasks', 'scheduling', 'personnel', 'time-ops-live'].includes(f.id))
    },
    {
      title: 'Projekte',
      items: mainFunctions.filter(f => ['projects', 'project-info', 'documents'].includes(f.id))
    },
    {
      title: 'Vertrieb & CRM',
      items: mainFunctions.filter(f => ['crm', 'invoicing', 'reports', 'smart-inbox'].includes(f.id))
    },
    {
      title: 'Ressourcen',
      items: mainFunctions.filter(f => ['materials', 'categories', 'customers'].includes(f.id))
    },
    {
      title: 'Administration',
      items: mainFunctions.filter(f => ['users', 'automation', 'settings', 'system-logs', 'concern-management', 'time-admin'].includes(f.id))
    }
  ].filter(group => group.items.length > 0);

  // Optional reduction: for field/foreman roles, show fewer categories by collapsing Administration heavy items
  const isLightweightRole = ['field', 'foreman'].includes((user as any)?.role);
  const displayGroups = isLightweightRole
    ? categorized.filter(g => ['Operation', 'Projekte', 'Vertrieb & CRM'].includes(g.title))
    : categorized;

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      {/* Header with logout and navigation */}
      <AppHeader 
        title="🏠 Hauptdashboard"
        showBackButton={false}
        onOpenMessaging={onOpenMessaging}
      />
      
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-white via-blue-50 to-cyan-50 backdrop-blur-sm rounded-lg p-4 shadow-lg text-center mb-6 border-2 border-[#058bc0]">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#058bc0] to-[#0470a0] bg-clip-text text-transparent mb-2">
              Willkommen, {user?.vorname || 'Benutzer'}!
            </h1>
            <p className="text-sm text-gray-700 font-medium">
              ✨ Wählen Sie eine Funktion aus, um zu beginnen
            </p>
          </div>

          {/* Main area + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {displayGroups.map((group, idx) => (
                <div key={group.title}>
                  <div className="flex items-center justify-between mb-3 bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-sm rounded-lg px-4 py-2 border-2 border-[#058bc0]/30 shadow-md">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#058bc0] to-[#0470a0] bg-clip-text text-transparent flex items-center gap-2">
                      <span className="text-2xl">{idx === 0 ? '⚡' : idx === 1 ? '📁' : idx === 2 ? '💼' : idx === 3 ? '👥' : '⚙️'}</span>
                      {group.title}
                    </h2>
                  </div>
                  <div className="overflow-x-auto pb-2 -mx-2 px-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-max lg:min-w-0">
                      {group.items.map((func) => {
                        const IconComponent = func.icon;
                        return (
                          <div
                            key={func.id}
                            className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-all duration-300 relative group cursor-pointer border-2 border-gray-200 hover:border-[#058bc0] hover:scale-105 min-w-[200px] min-h-[140px] flex-shrink-0 flex flex-col"
                            onClick={() => handleFunctionClick(func.id)}
                          >
                            {func.quickAction && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAction(func.id);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-xl hover:scale-110 z-10"
                                title={func.quickAction}
                              >
                                <Plus className="w-3 h-3 text-white" />
                              </button>
                            )}
                            <div className="text-center flex-1 flex flex-col justify-center">
                              <div className={`w-10 h-10 ${func.color} rounded-full flex items-center justify-center mx-auto mb-2 shadow-md group-hover:shadow-lg transition-all flex-shrink-0`}>
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 overflow-hidden">{func.title}</h3>
                              <p className="text-xs text-gray-600 leading-snug line-clamp-3 overflow-hidden">{func.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <RecentActivityWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateDashboard;
