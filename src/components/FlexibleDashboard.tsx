// ============================================================================
// FLEXIBLE DASHBOARD - RESTORED ADVANCED VERSION
// ============================================================================

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Settings, 
  Download, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Grid3X3,
  List,
  Layout,
  Clock,
  Database,
  MemoryStick,
  Activity,
  ArrowLeft,
  Home
} from 'lucide-react';
import { 
  FlexibleDashboardConfig, 
  StatCard, 
  ActionButton, 
  DashboardSection 
} from '@/types/common';
import { dashboardFactory } from '@/factories/dashboardFactory';
import { useDashboardNavigation, useDashboardPermissions } from '@/hooks';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface FlexibleDashboardProps {
  // Dashboard type and configuration
  type: 'admin' | 'project' | 'task' | 'auftraggeber' | 'custom';
  customConfig?: FlexibleDashboardConfig;
  
  // Navigation and callbacks
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onExport?: (format: 'pdf' | 'csv' | 'json') => void;
  
  // User and permissions
  user?: any;
  hasPermission?: (permission: string) => boolean;
  
  // Feature toggles
  enableCustomization?: boolean;
  enableExport?: boolean;
  enableRefresh?: boolean;
  enableLayoutSwitch?: boolean;
  enableFullscreen?: boolean;
  
  // Styling and layout
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  layout?: 'grid' | 'stack' | 'sidebar' | 'auto';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
  
  // Data and state
  initialData?: any;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const FlexibleDashboard: React.FC<FlexibleDashboardProps> = ({
  type,
  customConfig,
  onBack,
  onNavigate,
  onExport,
  user,
  hasPermission: propHasPermission,
  enableCustomization = true,
  enableExport = true,
  enableRefresh = true,
  enableLayoutSwitch = true,
  enableFullscreen = true,
  className = '',
  theme = 'auto',
  layout: initialLayout = 'grid',
  maxWidth = '7xl',
  initialData,
  autoRefresh = false,
  refreshInterval = 30000
}) => {

  
  // ============================================================================
  // ADVANCED HOOKS
  // ============================================================================
  
  // Navigation hook for internal navigation
  const { goBack, navigateTo, currentPage } = useDashboardNavigation();
  
  // Permissions hook
  const { canViewSection, canPerformAction } = useDashboardPermissions();
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<'grid' | 'stack' | 'sidebar' | 'auto'>(initialLayout);
  const [customizedSections, setCustomizedSections] = useState<DashboardSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    dataLoadTime: 0,
    memoryUsage: 0
  });
  
  // Analytics data
  const [analytics, setAnalytics] = useState({
    views: 0,
    interactions: 0,
    exports: 0,
    customizations: 0
  });

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================
  
  // Get base configuration based on type
  const baseConfig = useMemo(() => {
    try {
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
    } catch (err) {

      return dashboardFactory.createCustomDashboard('Dashboard', []);
    }
  }, [type, customConfig]);

  // Merge custom sections with base config
  const finalConfig = useMemo(() => {

    
    if (!baseConfig) {

      return null;
    }
    
    const config = {
      ...baseConfig,
      sections: [...(baseConfig.sections || []), ...customizedSections],
      layout: currentLayout,
      maxWidth
    };
    

    return config;
  }, [baseConfig, customizedSections, currentLayout, maxWidth]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshDashboard();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);
  
  // Track dashboard view
  useEffect(() => {
    setAnalytics(prev => ({ ...prev, views: prev.views + 1 }));
  }, []);
  
  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        renderTime: Math.round(endTime - startTime)
      }));
    };
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleLayoutChange = useCallback((newLayout: 'grid' | 'stack' | 'sidebar' | 'auto') => {
    setCurrentLayout(newLayout);
    setAnalytics(prev => ({ ...prev, customizations: prev.customizations + 1 }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const refreshDashboard = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    // Simulate refresh delay
    setTimeout(() => {
      setIsLoading(false);
      setAnalytics(prev => ({ ...prev, interactions: prev.interactions + 1 }));
    }, 500);
  }, []);

  const handleExport = useCallback((format: 'pdf' | 'csv' | 'json') => {
    if (onExport) {
      onExport(format);
    } else {

    }
    setAnalytics(prev => ({ ...prev, exports: prev.exports + 1 }));
  }, [onExport]);
  
  const handleBackNavigation = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  }, [onBack, goBack]);
  
  const handleNavigation = useCallback((page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      navigateTo(page);
    }
  }, [onNavigate, navigateTo]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderStatCard = (stat: StatCard) => (
    <Card key={stat.id} className="flex-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
          {stat.icon && <stat.icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value}</div>
        <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
        {stat.trend && (
          <div className="flex items-center mt-2">
            <Badge variant={stat.trend.isPositive ? 'default' : 'secondary'}>
              {stat.trend.value}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderActionButton = (action: ActionButton) => {
    const Icon = action.icon;
    
    const handleClick = () => {
      if (action.onClick) {
        action.onClick();
      }
      setAnalytics(prev => ({ ...prev, interactions: prev.interactions + 1 }));
    };
    
    return (
      <Button
        key={action.id}
        variant="outline"
        className="flex items-center gap-2"
        onClick={handleClick}
        disabled={action.permission && !canPerformAction(action.permission)}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {action.label}
      </Button>
    );
  };

  const renderTableSection = (section: DashboardSection) => {
    const data = section.config?.data || [];
    const columns = section.config?.columns || [];
    
    return (
      <Card key={section.id} className="col-span-full">
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                {columns.map((col: any) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any, index: number) => (
                <TableRow key={row.id || index}>
                  {columns.map((col: any) => (
                    <TableCell key={col.key}>{row[col.key]}</TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSection = (section: DashboardSection) => {
    // Check permissions for section
    if (!canViewSection(section.permission)) {
      return null;
    }
    
    switch (section.type) {
      case 'stats':
        return (
          <div key={section.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(section.config as StatCard[])?.map(renderStatCard)}
          </div>
        );
      
      case 'actions':
        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(section.config as ActionButton[])?.map(renderActionButton)}
              </div>
            </CardContent>
          </Card>
        );
      
      case 'table':
        return renderTableSection(section);
      
      case 'chart':
        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Chart wird geladen...
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                Unbekannter Sektionstyp: {section.type}
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  const renderDashboardContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-destructive">
            <p className="text-lg font-semibold">Fehler beim Laden des Dashboards</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }

    if (!finalConfig?.sections || finalConfig.sections.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold">Keine Daten verfügbar</p>
            <p className="text-sm">Das Dashboard enthö¤lt derzeit keine Sektionen.</p>
          </div>
        </div>
      );
    }

    const sections = finalConfig.sections;

    switch (currentLayout) {
      case 'sidebar':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              {sections.slice(0, 2).map(renderSection)}
            </div>
            <div className="lg:col-span-3 space-y-6">
              {sections.slice(2).map(renderSection)}
            </div>
          </div>
        );
      
      case 'stack':
        return (
          <div className="space-y-6">
            {sections.map(renderSection)}
          </div>
        );
      
      case 'auto':
        // Auto layout based on screen size and content
        const screenWidth = window.innerWidth;
        if (screenWidth < 768) {
          return (
            <div className="space-y-6">
              {sections.map(renderSection)}
            </div>
          );
        } else if (screenWidth < 1024) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map(renderSection)}
            </div>
          );
        } else {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sections.map(renderSection)}
            </div>
          );
        }
      
      case 'grid':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sections.map(renderSection)}
          </div>
        );
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  // Safety check - don't render if config is not ready
  if (!finalConfig) {

    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${className}`}>
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Navigation Back Button */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleBackNavigation}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleNavigation('dashboard')}>
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold">{finalConfig.title}</h1>
                {finalConfig.subtitle && (
                  <p className="text-muted-foreground">{finalConfig.subtitle}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Layout Switcher */}
              {enableLayoutSwitch && (
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={currentLayout === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleLayoutChange('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={currentLayout === 'stack' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleLayoutChange('stack')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={currentLayout === 'sidebar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleLayoutChange('sidebar')}
                  >
                    <Layout className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={currentLayout === 'auto' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleLayoutChange('auto')}
                  >
                    <Activity className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Fullscreen Toggle */}
              {enableFullscreen && (
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              )}
              
              {/* Settings */}
              {enableCustomization && (
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              
              {/* Refresh */}
              {enableRefresh && (
                <Button variant="ghost" size="sm" onClick={refreshDashboard} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className={`mx-auto ${maxWidth === '7xl' ? 'max-w-7xl' : `max-w-${maxWidth}`}`}>
          {/* Dashboard Content with Conditional Tabs */}
          {finalConfig?.sections && finalConfig.sections.length > 3 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                <TabsTrigger value="overview">Übersicht</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="analytics">Analysen</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                {renderDashboardContent()}
              </TabsContent>
              
              <TabsContent value="details" className="space-y-6">
                <div className="text-center text-muted-foreground py-12">
                  Detaillierte Ansicht wird geladen...
                </div>
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Dashboard-Aufrufe</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.views}</div>
                      <p className="text-xs text-muted-foreground">Gesamtaufrufe</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Interaktionen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.interactions}</div>
                      <p className="text-xs text-muted-foreground">Benutzeraktionen</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Exporte</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.exports}</div>
                      <p className="text-xs text-muted-foreground">Datenexporte</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Anpassungen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.customizations}</div>
                      <p className="text-xs text-muted-foreground">Dashboard-ö„nderungen</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Performance-Metriken</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Render-Zeit:</span>
                        <span className="font-mono">{performanceMetrics.renderTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daten-Ladezeit:</span>
                        <span className="font-mono">{performanceMetrics.dataLoadTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Speicherverbrauch:</span>
                        <span className="font-mono">{performanceMetrics.memoryUsage}MB</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            /* Simple view without tabs */
            <div className="space-y-6">
              {renderDashboardContent()}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && enableCustomization && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Dashboard-Einstellungen</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Layout</label>
                <select 
                  value={currentLayout}
                  onChange={(e) => handleLayoutChange(e.target.value as 'grid' | 'stack' | 'sidebar' | 'auto')}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="grid">Grid</option>
                  <option value="stack">Stack</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="auto">Automatisch</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowSettings(false)}>SchlieöŸen</Button>
                <Button variant="outline" onClick={() => setShowSettings(false)}>öbernehmen</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlexibleDashboard;
