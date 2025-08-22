import { 
  FlexibleDashboardConfig, 
  StatCard, 
  ActionButton, 
  DashboardSection 
} from '@/types/common';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Settings,
  Building,
  Package,
  Eye,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Download,
  Plus,
  DollarSign
} from 'lucide-react';


// ============================================================================
// DASHBOARD CONFIGURATIONS
// ============================================================================

// Admin Dashboard Configuration
export const adminDashboardConfig: FlexibleDashboardConfig = {
  title: 'Administrator Dashboard',
  subtitle: 'Verwalten Sie alle Bereiche und Benutzer',
  showHeader: true,
  maxWidth: '7xl',
  sections: [
    {
      id: 'quick-stats',
      title: 'Übersicht',
      type: 'stats',
      config: [
        {
          id: 'total-projects',
          title: 'Gesamt Projekte',
          value: '24',
          subtitle: 'Alle Projekte',
          icon: FileText,
          color: 'blue',
          trend: { value: '+2 seit letztem Monat', isPositive: true }
        },
        {
          id: 'active-projects',
          title: 'Aktive Projekte',
          value: '8',
          subtitle: 'In Bearbeitung',
          icon: Clock,
          color: 'orange'
        },
        {
          id: 'completed-projects',
          title: 'Abgeschlossen',
          value: '16',
          subtitle: 'Erfolgreich beendet',
          icon: CheckCircle,
          color: 'green'
        },
        {
          id: 'total-users',
          title: 'Benutzer',
          value: '12',
          subtitle: 'Aktive Benutzer',
          icon: Users,
          color: 'purple'
        }
      ]
    },
    {
      id: 'quick-actions',
      title: 'Schnellzugriff',
      type: 'actions',
      config: [
        {
          id: 'projects',
          label: 'Projektverwaltung',
          icon: FileText,
          onClick: () => {},
          permission: 'manage_projects'
        },
        {
          id: 'tasks',
          label: 'Aufgabenverwaltung',
          icon: CheckCircle,
          onClick: () => {},
          permission: 'manage_tasks'
        },
        {
          id: 'reports',
          label: 'Berichtswesen',
          icon: BarChart3,
          onClick: () => {},
          permission: 'view_reports'
        },
        {
          id: 'customers',
          label: 'Kundenverwaltung',
          icon: Building,
          onClick: () => {},
          permission: 'manage_customers'
        },
        {
          id: 'materials',
          label: 'Materialverwaltung',
          icon: Package,
          onClick: () => {},
          permission: 'manage_materials'
        },
        {
          id: 'users',
          label: 'Benutzerverwaltung',
          icon: Users,
          onClick: () => {},
          permission: 'admin'
        },
        {
          id: 'categories',
          label: 'Kategorien',
          icon: Settings,
          onClick: () => {},
          permission: 'manage_categories'
        }
      ]
    }
  ]
};

// Project Manager Dashboard Configuration
export const projectManagerDashboardConfig: FlexibleDashboardConfig = {
  title: 'Projektmanager Dashboard',
  subtitle: 'Verwalten Sie Ihre Projekte und Teams',
  showHeader: true,
  maxWidth: '7xl',
  sections: [
    {
      id: 'project-stats',
      title: 'Projektübersicht',
      type: 'stats',
      config: [
        {
          id: 'my-projects',
          title: 'Meine Projekte',
          value: '6',
          subtitle: 'Zugewiesene Projekte',
          icon: FileText,
          color: 'blue'
        },
        {
          id: 'active-projects',
          title: 'Aktive Projekte',
          value: '4',
          subtitle: 'In Bearbeitung',
          icon: Clock,
          color: 'orange'
        },
        {
          id: 'team-members',
          title: 'Team-Mitglieder',
          value: '18',
          subtitle: 'Unter meiner Leitung',
          icon: Users,
          color: 'purple'
        },
        {
          id: 'completion-rate',
          title: 'Abschlussrate',
          value: '85%',
          subtitle: 'Durchschnitt',
          icon: TrendingUp,
          color: 'green'
        }
      ]
    },
    {
      id: 'project-actions',
      title: 'Projektaktionen',
      type: 'actions',
      config: [
        {
          id: 'create-project',
          label: 'Neues Projekt',
          icon: FileText,
          onClick: () => {},
          variant: 'default'
        },
        {
          id: 'view-projects',
          label: 'Alle Projekte',
          icon: Eye,
          onClick: () => {},
          variant: 'outline'
        },
        {
          id: 'manage-tasks',
          label: 'Aufgaben verwalten',
          icon: CheckCircle,
          onClick: () => {},
          variant: 'outline'
        },
        {
          id: 'generate-reports',
          label: 'Berichte erstellen',
          icon: BarChart3,
          onClick: () => {},
          variant: 'outline'
        }
      ]
    }
  ]
};

// Employee Dashboard Configuration
export const employeeDashboardConfig: FlexibleDashboardConfig = {
  title: 'Mitarbeiter Dashboard',
  subtitle: 'Verwalten Sie Ihre Aufgaben und Projekte',
  showHeader: true,
  maxWidth: '7xl',
  sections: [
    {
      id: 'task-stats',
      title: 'Aufgabenübersicht',
      type: 'stats',
      config: [
        {
          id: 'assigned-tasks',
          title: 'Zugewiesene Aufgaben',
          value: '12',
          subtitle: 'Aktuelle Aufgaben',
          icon: CheckCircle,
          color: 'blue'
        },
        {
          id: 'in-progress',
          title: 'In Bearbeitung',
          value: '3',
          subtitle: 'Laufende Aufgaben',
          icon: Clock,
          color: 'orange'
        },
        {
          id: 'completed-tasks',
          title: 'Abgeschlossen',
          value: '9',
          subtitle: 'Diese Woche',
          icon: CheckCircle,
          color: 'green'
        },
        {
          id: 'overdue-tasks',
          title: 'Überfällig',
          value: '1',
          subtitle: 'Benötigt Aufmerksamkeit',
          icon: TrendingUp,
          color: 'red'
        }
      ]
    },
    {
      id: 'quick-actions',
      title: 'Schnellzugriff',
      type: 'actions',
      config: [
        {
          id: 'view-tasks',
          label: 'Meine Aufgaben',
          icon: CheckCircle,
          onClick: () => {},
          variant: 'default'
        },
        {
          id: 'view-projects',
          label: 'Meine Projekte',
          icon: FileText,
          onClick: () => {},
          variant: 'outline'
        },
        {
          id: 'create-report',
          label: 'Bericht erstellen',
          icon: BarChart3,
          onClick: () => {},
          variant: 'outline'
        }
      ]
    }
  ]
};

// Auftraggeber Dashboard Configuration
export const auftraggeberDashboardConfig: FlexibleDashboardConfig = {
  title: 'Auftraggeber Dashboard',
  subtitle: 'Überwachen Sie den Fortschritt Ihrer Projekte',
  showHeader: true,
  maxWidth: '7xl',
  sections: [
    {
      id: 'project-overview',
      title: 'Projektübersicht',
      type: 'stats',
      config: [
        {
          id: 'project-status',
          title: 'Projektstatus',
          value: 'Aktiv',
          subtitle: 'Schule Köln',
          icon: Building,
          color: 'green'
        },
        {
          id: 'progress',
          title: 'Fortschritt',
          value: '65%',
          subtitle: 'Geplante Fertigstellung',
          icon: TrendingUp,
          color: 'blue'
        },
        {
          id: 'team-size',
          title: 'Team',
          value: '2',
          subtitle: 'Zugewiesene Mitarbeiter',
          icon: Users,
          color: 'purple'
        },
        {
          id: 'completion-date',
          title: 'Fertigstellung',
          value: '30.11.2024',
          subtitle: 'Geplantes Datum',
          icon: Calendar,
          color: 'orange'
        }
      ]
    },
    {
      id: 'project-actions',
      title: 'Projektaktionen',
      type: 'actions',
      config: [
        {
          id: 'view-project',
          label: 'Projektdetails',
          icon: Eye,
          onClick: () => {},
          variant: 'default'
        },
        {
          id: 'view-reports',
          label: 'Berichte anzeigen',
          icon: BarChart3,
          onClick: () => {},
          variant: 'outline'
        },
        {
          id: 'contact-team',
          label: 'Team kontaktieren',
          icon: Users,
          onClick: () => {},
          variant: 'outline'
        }
      ]
    }
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get dashboard config based on user role
export const getDashboardConfig = (role: string): FlexibleDashboardConfig => {
  switch (role) {
    case 'admin':
      return adminDashboardConfig;
    case 'project_manager':
      return projectManagerDashboardConfig;
    case 'employee':
      return employeeDashboardConfig;
    case 'auftraggeber':
      return auftraggeberDashboardConfig;
    default:
      return employeeDashboardConfig;
  }
};

// Create custom dashboard config
export const createCustomDashboardConfig = (
  title: string,
  sections: DashboardSection[],
  options?: Partial<FlexibleDashboardConfig>
): FlexibleDashboardConfig => {
  return {
    title,
    showHeader: true,
    maxWidth: '7xl',
    sections,
    ...options
  };
};

// Create stats section
export const createStatsSection = (
  title: string,
  stats: StatCard[]
): DashboardSection => ({
  id: `stats-${title.toLowerCase().replace(/\s+/g, '-')}`,
  title,
  type: 'stats',
  config: stats
});

// Create actions section
export const createActionsSection = (
  title: string,
  actions: ActionButton[]
): DashboardSection => ({
  id: `actions-${title.toLowerCase().replace(/\s+/g, '-')}`,
  title,
  type: 'actions',
  config: actions
});

// Create table section
export const createTableSection = (
  title: string,
  columns: any[],
  data: any[],
  actions?: any[]
): DashboardSection => ({
  id: `table-${title.toLowerCase().replace(/\s+/g, '-')}`,
  title,
  type: 'table',
  config: { columns, data, actions }
});

// ============================================================================
// TASK DASHBOARD CONFIGURATION CREATOR
// ============================================================================

export const createTasksDashboardConfig = ({
  tasks,
  canManageTasks,
  onNavigate,
  getPriorityBadge,
  getStatusBadge
}: {
  tasks: any[];
  canManageTasks: boolean;
  onNavigate: (page: string) => void;
  getPriorityBadge: (priority: string) => React.ReactElement;
  getStatusBadge: (status: string) => React.ReactElement;
}): FlexibleDashboardConfig => {
  // Calculate statistics
  const statistics = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    highPriority: tasks.filter(t => t.priority === 'high').length,
    overdue: tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length
  };

  return {
    title: 'Aufgabenverwaltung',
    subtitle: 'Verwalten und überwachen Sie alle Aufgaben',
    showHeader: true,
    maxWidth: '7xl',
    sections: [
      {
        id: 'task-stats',
        title: 'Aufgabenstatistiken',
        type: 'stats',
        config: [
          {
            id: 'total-tasks',
            title: 'Gesamt Aufgaben',
            value: statistics.total.toString(),
            subtitle: 'Alle Aufgaben',
            icon: CheckCircle,
            color: 'blue'
          },
          {
            id: 'pending-tasks',
            title: 'Ausstehend',
            value: statistics.pending.toString(),
            subtitle: 'Warten auf Start',
            icon: Clock,
            color: 'orange'
          },
          {
            id: 'in-progress-tasks',
            title: 'In Bearbeitung',
            value: statistics.inProgress.toString(),
            subtitle: 'Laufende Aufgaben',
            icon: TrendingUp,
            color: 'blue'
          },
          {
            id: 'completed-tasks',
            title: 'Abgeschlossen',
            value: statistics.completed.toString(),
            subtitle: 'Erfolgreich beendet',
            icon: CheckCircle,
            color: 'green'
          },
          {
            id: 'high-priority-tasks',
            title: 'Hohe Priorität',
            value: statistics.highPriority.toString(),
            subtitle: 'Benötigt Aufmerksamkeit',
            icon: AlertCircle,
            color: 'red'
          },
          {
            id: 'overdue-tasks',
            title: 'Überfällig',
            value: statistics.overdue.toString(),
            subtitle: 'Fälligkeitsdatum überschritten',
            icon: Clock,
            color: 'red'
          }
        ]
      },
      {
        id: 'task-actions',
        title: 'Schnellzugriff',
        type: 'actions',
        config: [
          {
            id: 'export-tasks',
            label: 'Aufgaben exportieren',
            icon: Download,
            onClick: () => {
              // Export functionality would go here
              console.log('Export tasks');
            },
            variant: 'outline',
            permission: 'view_tasks'
          },
          {
            id: 'create-task',
            label: 'Neue Aufgabe erstellen',
            icon: Plus,
            onClick: () => onNavigate('tasks'),
            variant: 'default',
            permission: 'manage_tasks'
          }
        ]
      },
      {
        id: 'tasks-table',
        title: 'Aufgabenliste',
        type: 'table',
        config: {
          columns: [
            { key: 'taskNumber', label: 'Aufgabennummer', sortable: true },
            { key: 'dueDate', label: 'Fällig', sortable: true },
            { key: 'employee', label: 'Mitarbeiter', sortable: true },
            { key: 'customer', label: 'Kunde', sortable: true },
            { key: 'projectNumber', label: 'Projekt', sortable: true },
            { key: 'priority', label: 'Priorität', sortable: true },
            { key: 'status', label: 'Status', sortable: true },
            { key: 'actions', label: 'Aktionen', sortable: false }
          ],
          data: tasks.map(task => ({
            ...task,
            priority: getPriorityBadge(task.priority),
            status: getStatusBadge(task.status),
            dueDate: new Date(task.dueDate).toLocaleDateString('de-DE'),
            actions: canManageTasks ? 'view-edit' : null
          })),
          actions: canManageTasks ? [
            {
              label: 'Status ändern',
              onClick: (taskId: string) => console.log('Change status for task:', taskId),
              variant: 'outline' as const
            }
          ] : []
        }
      }
    ]
  };
};

// ============================================================================
// PROJECT STATS DASHBOARD CONFIGURATION CREATOR
// ============================================================================

export const createProjectStatsDashboardConfig = ({
  stats,
  statusCounts,
  completionRate,
  projects
}: {
  stats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalBudget: number;
    highPriorityProjects: number;
  };
  statusCounts: {
    planning: number;
    'in-progress': number;
    completed: number;
    'on-hold': number;
  };
  completionRate: number;
  projects: any[];
}): FlexibleDashboardConfig => {
  return {
    title: 'Projektübersicht',
    subtitle: 'Statistiken und Status aller Projekte',
    showHeader: false,
    maxWidth: '7xl',
    sections: [
      {
        id: 'project-stats',
        title: 'Projektstatistiken',
        type: 'stats',
        config: [
          {
            id: 'total-projects',
            title: 'Gesamt Projekte',
            value: stats.totalProjects.toString(),
            subtitle: 'Alle Projekte',
            icon: BarChart3,
            color: 'blue'
          },
          {
            id: 'active-projects',
            title: 'Aktive Projekte',
            value: stats.activeProjects.toString(),
            subtitle: 'In Bearbeitung',
            icon: Clock,
            color: 'orange'
          },
          {
            id: 'completed-projects',
            title: 'Abgeschlossen',
            value: stats.completedProjects.toString(),
            subtitle: `${completionRate.toFixed(1)}% Abschlussrate`,
            icon: TrendingUp,
            color: 'green'
          },
          {
            id: 'total-budget',
            title: 'Gesamt Budget',
            value: `$${stats.totalBudget.toLocaleString()}`,
            subtitle: 'Über alle Projekte',
            icon: DollarSign,
            color: 'purple'
          }
        ]
      },
      {
        id: 'project-status-overview',
        title: 'Projektstatus Übersicht',
        type: 'custom',
        config: {
          statusCounts,
          highPriorityProjects: stats.highPriorityProjects,
          averageBudget: stats.totalProjects > 0 ? stats.totalBudget / stats.totalProjects : 0
        }
      }
    ]
  };
};
