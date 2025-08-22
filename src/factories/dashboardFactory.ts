// ============================================================================
// DASHBOARD FACTORY - CENTRALIZED DASHBOARD CREATION
// ============================================================================

import { 
  FlexibleDashboardConfig, 
  DashboardSection, 
  StatCard, 
  ActionButton 
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
  DollarSign,
  CheckSquare,
  Target,
  Zap
} from 'lucide-react';

// ============================================================================
// DASHBOARD FACTORY INTERFACES
// ============================================================================

export interface DashboardFactoryOptions {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
  layout?: 'grid' | 'stack' | 'sidebar';
  enableRefresh?: boolean;
  enableExport?: boolean;
  enableCustomization?: boolean;
}

export interface DashboardSectionFactory {
  createStatsSection: (title: string, stats: StatCard[]) => DashboardSection;
  createActionsSection: (title: string, actions: ActionButton[]) => DashboardSection;
  createTableSection: (title: string, columns: any[], data: any[], actions?: any[]) => DashboardSection;
  createChartSection: (title: string, chartType: string, data: any, options?: any) => DashboardSection;
  createCustomSection: (title: string, component: React.ComponentType<any>, props?: any) => DashboardSection;
}

// ============================================================================
// MAIN DASHBOARD FACTORY
// ============================================================================

export class DashboardFactory implements DashboardSectionFactory {
  private options: DashboardFactoryOptions;

  constructor(options: DashboardFactoryOptions = {}) {
    this.options = {
      title: 'Dashboard',
      subtitle: 'Übersicht und Verwaltung',
      showHeader: true,
      maxWidth: '7xl',
      layout: 'grid',
      enableRefresh: true,
      enableExport: false,
      enableCustomization: false,
      ...options
    };
  }

  // ============================================================================
  // SECTION CREATION METHODS
  // ============================================================================

  createStatsSection(title: string, stats: StatCard[]): DashboardSection {
    return {
      id: `stats-${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      type: 'stats',
      config: stats,
      permission: undefined
    };
  }

  createActionsSection(title: string, actions: ActionButton[]): DashboardSection {
    return {
      id: `actions-${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      type: 'actions',
      config: actions,
      permission: undefined
    };
  }

  createTableSection(title: string, columns: any[], data: any[], actions?: any[]): DashboardSection {
    return {
      id: `table-${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      type: 'table',
      config: { columns, data, actions },
      permission: undefined
    };
  }

  createChartSection(title: string, chartType: string, data: any, options?: any): DashboardSection {
    return {
      id: `chart-${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      type: 'chart',
      config: { chartType, data, options },
      permission: undefined
    };
  }

  createCustomSection(title: string, component: React.ComponentType<any>, props?: any): DashboardSection {
    return {
      id: `custom-${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      type: 'custom',
      config: { component, props },
      permission: undefined
    };
  }

  // ============================================================================
  // DASHBOARD CREATION METHODS
  // ============================================================================

  createAdminDashboard(): FlexibleDashboardConfig {

    const actionsSection = this.createActionsSection('Schnellzugriff', [
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
        id: 'users',
        label: 'Benutzerverwaltung',
        icon: Users,
        onClick: () => {},
        permission: 'manage_users'
      }
    ]);

    return {
      title: 'Administrator Dashboard',
      subtitle: 'Systemübersicht und Verwaltung',
      showHeader: this.options.showHeader,
      maxWidth: this.options.maxWidth,
      layout: this.options.layout,
      sections: [actionsSection]
    };
  }

  createProjectDashboard(): FlexibleDashboardConfig {

    const actionsSection = this.createActionsSection('Projektaktionen', [
      {
        id: 'create-project',
        label: 'Neues Projekt',
        icon: Plus,
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
        id: 'project-reports',
        label: 'Projektberichte',
        icon: BarChart3,
        onClick: () => {},
        variant: 'outline'
      }
    ]);

    return {
      title: 'Projekt Dashboard',
      subtitle: 'Projektübersicht und -verwaltung',
      showHeader: this.options.showHeader,
      maxWidth: this.options.maxWidth,
      layout: this.options.layout,
      sections: [actionsSection]
    };
  }

  createTaskDashboard(): FlexibleDashboardConfig {
    const actionsSection = this.createActionsSection('Aufgabenaktionen', [
      {
        id: 'create-task',
        label: 'Neue Aufgabe',
        icon: Plus,
        onClick: () => {},
        variant: 'default'
      },
      {
        id: 'view-tasks',
        label: 'Alle Aufgaben',
        icon: Eye,
        onClick: () => {},
        variant: 'outline'
      },
      {
        id: 'task-reports',
        label: 'Aufgabenberichte',
        icon: BarChart3,
        onClick: () => {},
        variant: 'outline'
      }
    ]);

    return {
      title: 'Aufgaben Dashboard',
      subtitle: 'Aufgabenverwaltung und -übersicht',
      showHeader: this.options.showHeader,
      maxWidth: this.options.maxWidth,
      layout: this.options.layout,
      sections: [actionsSection]
    };
  }

  createAuftraggeberDashboard(): FlexibleDashboardConfig {

    const actionsSection = this.createActionsSection('Projektaktionen', [
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
    ]);

    return {
      title: 'Auftraggeber Dashboard',
      subtitle: 'Überwachen Sie den Fortschritt Ihrer Projekte',
      showHeader: this.options.showHeader,
      maxWidth: this.options.maxWidth,
      layout: this.options.layout,
      sections: [actionsSection]
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  createCustomDashboard(
    title: string,
    sections: DashboardSection[],
    customOptions?: Partial<DashboardFactoryOptions>
  ): FlexibleDashboardConfig {
    const mergedOptions = { ...this.options, ...customOptions };
    
    return {
      title,
      subtitle: mergedOptions.subtitle,
      showHeader: mergedOptions.showHeader,
      maxWidth: mergedOptions.maxWidth,
      layout: mergedOptions.layout,
      sections
    };
  }

  addSectionToConfig(
    config: FlexibleDashboardConfig,
    section: DashboardSection
  ): FlexibleDashboardConfig {
    return {
      ...config,
      sections: [...config.sections, section]
    };
  }

  removeSectionFromConfig(
    config: FlexibleDashboardConfig,
    sectionId: string
  ): FlexibleDashboardConfig {
    return {
      ...config,
      sections: config.sections.filter(section => section.id !== sectionId)
    };
  }

  updateSectionInConfig(
    config: FlexibleDashboardConfig,
    sectionId: string,
    updates: Partial<DashboardSection>
  ): FlexibleDashboardConfig {
    return {
      ...config,
      sections: config.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    };
  }
}

// ============================================================================
// FACTORY INSTANCES
// ============================================================================

export const dashboardFactory = new DashboardFactory();
export const adminDashboardFactory = new DashboardFactory({ 
  title: 'Admin Dashboard',
  enableCustomization: true,
  enableExport: true
});
export const projectDashboardFactory = new DashboardFactory({ 
  title: 'Projekt Dashboard',
  layout: 'grid'
});
export const taskDashboardFactory = new DashboardFactory({ 
  title: 'Aufgaben Dashboard',
  layout: 'stack'
});

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const createAdminDashboard = () => adminDashboardFactory.createAdminDashboard();
export const createProjectDashboard = () => projectDashboardFactory.createProjectDashboard();
export const createTaskDashboard = () => taskDashboardFactory.createTaskDashboard();
export const createAuftraggeberDashboard = () => dashboardFactory.createAuftraggeberDashboard();

export const createCustomDashboard = (
  title: string,
  sections: DashboardSection[],
  options?: Partial<DashboardFactoryOptions>
) => dashboardFactory.createCustomDashboard(title, sections, options);
