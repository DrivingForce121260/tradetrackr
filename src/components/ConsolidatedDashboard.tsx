// ============================================================================
// CONSOLIDATED DASHBOARD - UNIFIED DASHBOARD COMPONENT
// ============================================================================

import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Settings, Download, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import AppHeader from './AppHeader';
import { 
  FlexibleDashboardConfig, 
  StatCard, 
  ActionButton, 
  DashboardSection 
} from '@/types/common';
import { useDashboard, useDashboardPermissions, useDashboardNavigation } from '@/hooks';
import { dashboardFactory } from '@/factories/dashboardFactory';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface ConsolidatedDashboardProps {
  type: 'admin' | 'project' | 'task' | 'auftraggeber' | 'custom';
  customConfig?: FlexibleDashboardConfig;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  user?: any;
  hasPermission?: (permission: string) => boolean;
  enableCustomization?: boolean;
  enableExport?: boolean;
  enableRefresh?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ConsolidatedDashboard: React.FC<ConsolidatedDashboardProps> = ({
  type,
  customConfig,
  onBack,
  onNavigate,
  user,
  hasPermission,
  enableCustomization = false,
  enableExport = false,
  enableRefresh = true
}) => {
  const { canViewSection, canPerformAction } = useDashboardPermissions();
  const { currentPage, navigateTo } = useDashboardNavigation();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);

  // Get base configuration based on type
  const baseConfig = useMemo(() => {
    switch (type) {
      case 'admin':
        return dashboardFactory.createAdminDashboard();
      case 'project':
        return dashboardFactory.createProjectDashboard();
      case 'task':
        return dashboardFactory.createTaskDashboard();
      case 'auftraggeber':
        return dashboardFactory.createAuftraggeberDashboard();
      case 'custom':
        return customConfig || dashboardFactory.createCustomDashboard('Custom Dashboard', []);
      default:
        return dashboardFactory.createCustomDashboard('Dashboard', []);
    }
  }, [type, customConfig]);

  // Use the dashboard hook
  const {
    config,
    loading,
    error,
    refresh,
    updateSection,
    addSection,
    removeSection
  } = useDashboard(baseConfig, {
    autoRefresh: enableRefresh,
    refreshInterval: 30000,
    enableCaching: true,
    cacheKey: `${type}-dashboard`
  });

  // Handle action button clicks
  const handleActionClick = useCallback((actionId: string) => {
    if (onNavigate) {
      onNavigate(actionId);
    }
    
    // Default navigation logic
    switch (actionId) {
      case 'projects':
      case 'view-projects':
      case 'create-project':
        navigateTo('projects');
        break;
      case 'tasks':
      case 'view-tasks':
      case 'create-task':
        navigateTo('tasks');
        break;
      case 'reports':
      case 'view-reports':
        navigateTo('reports');
        break;
      case 'users':
      case 'manage-users':
        navigateTo('users');
        break;
      case 'customers':
        navigateTo('customers');
        break;
      case 'materials':
        navigateTo('materials');
        break;
      case 'categories':
        navigateTo('categories');
        break;
      default:

    }
  }, [onNavigate, navigateTo]);

  // Render stat card
  const renderStatCard = (stat: StatCard) => (
    <Card key={stat.id} className="tradetrackr-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{stat.title}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            {stat.subtitle && (
              <p className="text-sm text-gray-500">{stat.subtitle}</p>
            )}
            {stat.trend && (
              <div className={`flex items-center mt-2 text-sm ${
                stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{stat.trend.value}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
            <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render action button
  const renderActionButton = (action: ActionButton) => {
    if (action.permission && !canPerformAction(action.permission)) {
      return null;
    }

    return (
      <Button
        key={action.id}
        variant={action.variant || 'default'}
        size={action.size || 'md'}
        disabled={action.disabled}
        onClick={() => handleActionClick(action.id)}
        className="w-full sm:w-auto"
      >
        <action.icon className="h-4 w-4 mr-2" />
        {action.label}
      </Button>
    );
  };

  // Render table section
  const renderTableSection = (section: DashboardSection) => {
    const { columns, data, actions } = section.config;
    
    return (
      <Card key={section.id} className="tradetrackr-card">
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                {columns.map((column: any) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                {actions && actions.length > 0 && (
                  <TableHead>Aktionen</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any, index: number) => (
                <TableRow key={index}>
                  {columns.map((column: any) => (
                    <TableCell key={column.key}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </TableCell>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableCell>
                      <div className="flex space-x-2">
                        {actions.map((action: any) => (
                          <Button
                            key={action.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => action.onClick(row)}
                          >
                            {action.icon && <action.icon className="h-4 w-4" />}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render section based on type
  const renderSection = (section: DashboardSection) => {
    if (!canViewSection(section.permission)) return null;

    switch (section.type) {
      case 'stats':
        return (
          <div key={section.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {section.config.map((stat: StatCard) => renderStatCard(stat))}
          </div>
        );
      case 'actions':
        return (
          <Card key={section.id} className="tradetrackr-card">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {section.config.map((action: ActionButton) => renderActionButton(action))}
              </div>
            </CardContent>
          </Card>
        );
      case 'table':
        return renderTableSection(section);
      case 'custom':
        const { component: CustomComponent, props } = section.config;
        if (CustomComponent) {
          return <CustomComponent key={section.id} {...props} />;
        }
        return null;
      default:
        return (
          <Card key={section.id} className="tradetrackr-card">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Unbekannter Sektionstyp: {section.type}</p>
            </CardContent>
          </Card>
        );
    }
  };

  // Render dashboard content
  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Dashboard wird geladen...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600">Fehler beim Laden des Dashboards: {error}</p>
            <Button onClick={refresh} className="mt-4">
              Erneut versuchen
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {config.sections.map(section => renderSection(section))}
      </div>
    );
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      {/* Header */}
      {config.showHeader && (
        <AppHeader
          title={config.title}
          subtitle={config.subtitle}
          onBack={onBack}
          actions={
            <div className="flex items-center space-x-2">
              {enableRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </Button>
              )}
              {enableExport && (
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportieren
                </Button>
              )}
              {enableCustomization && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Einstellungen
                </Button>
              )}
            </div>
          }
        />
      )}

      {/* Main Content */}
      <main className={`max-w-${config.maxWidth || '7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        {/* Dashboard Tabs */}
        {config.sections.length > 2 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Übersicht</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="actions">Aktionen</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Dashboard Content */}
        <TabsContent value="overview" className="space-y-6">
          {renderDashboardContent()}
        </TabsContent>

        {config.sections.length > 2 && (
          <>
            <TabsContent value="details" className="space-y-6">
              <Card className="tradetrackr-card">
                <CardHeader>
                  <CardTitle>Detaillierte Informationen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Hier werden detaillierte Informationen zu den Dashboard-Daten angezeigt.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="space-y-6">
              <Card className="tradetrackr-card">
                <CardHeader>
                  <CardTitle>Verfügbare Aktionen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20">
                      <Plus className="h-6 w-6 mr-2" />
                      Neues Element erstellen
                    </Button>
                    <Button variant="outline" className="h-20">
                      <Eye className="h-6 w-6 mr-2" />
                      Alle Elemente anzeigen
                    </Button>
                    <Button variant="outline" className="h-20">
                      <Edit className="h-6 w-6 mr-2" />
                      Element bearbeiten
                    </Button>
                    <Button variant="outline" className="h-20">
                      <Trash2 className="h-6 w-6 mr-2" />
                      Element lö¶schen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </main>
    </div>
  );
};

export default ConsolidatedDashboard;
