// ============================================================================
// FLEXIBLE DASHBOARD HOOKS - EXTENDED FUNCTIONALITY
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuth from '@/contexts/AuthContext';
import { 
  FlexibleDashboardConfig, 
  DashboardSection, 
  StatCard, 
  ActionButton 
} from '@/types/common';
import { dashboardFactory } from '@/factories/dashboardFactory';

// ============================================================================
// ADVANCED DASHBOARD HOOK
// ============================================================================

export interface UseAdvancedDashboardOptions {
  // Performance options
  enableVirtualization?: boolean;
  enableLazyLoading?: boolean;
  enableDebouncing?: boolean;
  debounceDelay?: number;
  
  // Data options
  enableRealTimeUpdates?: boolean;
  updateInterval?: number;
  enableDataPersistence?: boolean;
  
  // UI options
  enableResponsiveLayout?: boolean;
  enableAccessibility?: boolean;
  enableKeyboardNavigation?: boolean;
  
  // Analytics options
  enableUsageTracking?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export interface UseAdvancedDashboardReturn {
  // Core functionality
  config: FlexibleDashboardConfig;
  loading: boolean;
  error: string | null;
  
  // Advanced features
  isFullscreen: boolean;
  currentLayout: 'grid' | 'stack' | 'sidebar';
  activeTab: string;
  
  // Actions
  refresh: () => void;
  updateSection: (sectionId: string, updates: Partial<DashboardSection>) => void;
  addSection: (section: DashboardSection) => void;
  removeSection: (sectionId: string) => void;
  
  // Layout management
  setLayout: (layout: 'grid' | 'stack' | 'sidebar') => void;
  toggleFullscreen: () => void;
  setActiveTab: (tab: string) => void;
  
  // Data management
  exportData: (format: 'json' | 'csv' | 'pdf') => void;
  importData: (data: any) => void;
  
  // Performance metrics
  performanceMetrics: {
    renderTime: number;
    dataLoadTime: number;
    memoryUsage: number;
  };
}

export const useAdvancedDashboard = (
  type: 'admin' | 'project' | 'task' | 'auftraggeber' | 'custom',
  customConfig?: FlexibleDashboardConfig,
  options: UseAdvancedDashboardOptions = {}
): UseAdvancedDashboardReturn => {
  console.log('useAdvancedDashboard called with:', { type, customConfig, options });
  
  let user, hasPermission;
  try {
    const authResult = useAuth();
    user = authResult.user;
    hasPermission = authResult.hasPermission;
    console.log('useAuth result:', { user, hasPermission });
  } catch (error) {
    console.error('Error in useAuth:', error);
    user = null;
    hasPermission = () => false;
  }
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [config, setConfig] = useState<FlexibleDashboardConfig>(() => {
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
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<'grid' | 'stack' | 'sidebar'>('grid');
  const [activeTab, setActiveTab] = useState('overview');
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    dataLoadTime: 0,
    memoryUsage: 0
  });

  // ============================================================================
  // OPTIONS WITH DEFAULTS
  // ============================================================================
  
  const {
    enableVirtualization = false,
    enableLazyLoading = true,
    enableDebouncing = true,
    debounceDelay = 300,
    enableRealTimeUpdates = false,
    updateInterval = 5000,
    enableDataPersistence = true,
    enableResponsiveLayout = true,
    enableAccessibility = true,
    enableKeyboardNavigation = true,
    enableUsageTracking = false,
    enablePerformanceMonitoring = true
  } = options;

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================
  
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        setPerformanceMetrics(prev => ({
          ...prev,
          renderTime: endTime - startTime
        }));
      };
    }
  }, [enablePerformanceMonitoring]);

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================
  
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const interval = setInterval(() => {
      refresh();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [enableRealTimeUpdates, updateInterval]);

  // ============================================================================
  // DATA PERSISTENCE
  // ============================================================================
  
  useEffect(() => {
    if (enableDataPersistence) {
      const savedConfig = localStorage.getItem(`dashboard-${type}-config`);
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setConfig(parsed);
        } catch (err) {
          console.warn('Failed to parse saved dashboard config:', err);
        }
      }
    }
  }, [type, enableDataPersistence]);

  const saveConfig = useCallback((newConfig: FlexibleDashboardConfig) => {
    if (enableDataPersistence) {
      localStorage.setItem(`dashboard-${type}-config`, JSON.stringify(newConfig));
    }
  }, [type, enableDataPersistence]);

  // ============================================================================
  // CORE FUNCTIONS
  // ============================================================================
  
  const refresh = useCallback(() => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);
    
    // Simulate refresh delay
    setTimeout(() => {
      setLoading(false);
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        dataLoadTime: endTime - startTime
      }));
      saveConfig(config);
    }, 500);
  }, [config, saveConfig]);

  const updateSection = useCallback((sectionId: string, updates: Partial<DashboardSection>) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId ? { ...section, ...updates } : section
        )
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  const addSection = useCallback((section: DashboardSection) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        sections: [...prev.sections, section]
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  const removeSection = useCallback((sectionId: string) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        sections: prev.sections.filter(section => section.id !== sectionId)
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  // ============================================================================
  // LAYOUT MANAGEMENT
  // ============================================================================
  
  const setLayout = useCallback((layout: 'grid' | 'stack' | 'sidebar') => {
    setCurrentLayout(layout);
    setConfig(prev => ({
      ...prev,
      layout
    }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // ============================================================================
  // DATA EXPORT/IMPORT
  // ============================================================================
  
  const exportData = useCallback((format: 'json' | 'csv' | 'pdf') => {
    switch (format) {
      case 'json':
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-${type}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        break;
        
      case 'csv':
        // Convert dashboard data to CSV format
        const csvData = convertToCSV(config);
        const csvBlob = new Blob([csvData], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `dashboard-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        csvLink.click();
        URL.revokeObjectURL(csvUrl);
        break;
        
      case 'pdf':
        // PDF export would require a library like jsPDF
        console.log('PDF export not implemented yet');
        break;
    }
  }, [config, type]);

  const importData = useCallback((data: any) => {
    try {
      if (data.sections && Array.isArray(data.sections)) {
        setConfig(data);
        saveConfig(data);
      }
    } catch (err) {
      setError('Failed to import dashboard data');
    }
  }, [saveConfig]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const convertToCSV = (dashboardConfig: FlexibleDashboardConfig): string => {
    const sections = dashboardConfig.sections || [];
    let csv = 'Section,Type,Title\n';
    
    sections.forEach(section => {
      csv += `${section.title},${section.type},${section.title}\n`;
    });
    
    return csv;
  };

  // ============================================================================
  // MEMORY USAGE MONITORING
  // ============================================================================
  
  useEffect(() => {
    if (enablePerformanceMonitoring && 'memory' in performance) {
      const updateMemoryUsage = () => {
        const memory = (performance as any).memory;
        if (memory) {
          setPerformanceMetrics(prev => ({
            ...prev,
            memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
          }));
        }
      };
      
      // Only monitor in development mode
      if (import.meta.env.DEV) {
        updateMemoryUsage();
        const interval = setInterval(updateMemoryUsage, 30000); // Reduced to 30 seconds
        return () => clearInterval(interval);
      } else {
        // In production, single update only
        updateMemoryUsage();
      }
    }
  }, [enablePerformanceMonitoring]);

  // ============================================================================
  // USAGE TRACKING
  // ============================================================================
  
  useEffect(() => {
    if (enableUsageTracking) {
      const trackUsage = () => {
        const usage = {
          timestamp: new Date().toISOString(),
          type,
          layout: currentLayout,
          activeTab,
          sectionsCount: config.sections?.length || 0
        };
        
        const existingUsage = localStorage.getItem('dashboard-usage') || '[]';
        const usageArray = JSON.parse(existingUsage);
        usageArray.push(usage);
        
        // Keep only last 100 entries
        if (usageArray.length > 100) {
          usageArray.splice(0, usageArray.length - 100);
        }
        
        localStorage.setItem('dashboard-usage', JSON.stringify(usageArray));
      };
      
      trackUsage();
    }
  }, [enableUsageTracking, type, currentLayout, activeTab, config.sections?.length]);

  return {
    config,
    loading,
    error,
    isFullscreen,
    currentLayout,
    activeTab,
    refresh,
    updateSection,
    addSection,
    removeSection,
    setLayout,
    toggleFullscreen,
    setActiveTab,
    exportData,
    importData,
    performanceMetrics
  };
};

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

export const useDashboardAnalytics = (dashboardType: string) => {
  const [analytics, setAnalytics] = useState({
    views: 0,
    interactions: 0,
    exports: 0,
    customizations: 0
  });

  const trackView = useCallback(() => {
    setAnalytics(prev => ({ ...prev, views: prev.views + 1 }));
  }, []);

  const trackInteraction = useCallback(() => {
    setAnalytics(prev => ({ ...prev, interactions: prev.interactions + 1 }));
  }, []);

  const trackExport = useCallback(() => {
    setAnalytics(prev => ({ ...prev, exports: prev.exports + 1 }));
  }, []);

  const trackCustomization = useCallback(() => {
    setAnalytics(prev => ({ ...prev, customizations: prev.customizations + 1 }));
  }, []);

  return {
    analytics,
    trackView,
    trackInteraction,
    trackExport,
    trackCustomization
  };
};

export const useDashboardResponsiveness = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkResponsiveness = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkResponsiveness();
    window.addEventListener('resize', checkResponsiveness);
    
    return () => window.removeEventListener('resize', checkResponsiveness);
  }, []);

  const getOptimalLayout = useCallback(() => {
    if (isMobile) return 'stack';
    if (isTablet) return 'grid';
    return 'grid';
  }, [isMobile, isTablet]);

  return {
    isMobile,
    isTablet,
    isDesktop,
    getOptimalLayout
  };
};
