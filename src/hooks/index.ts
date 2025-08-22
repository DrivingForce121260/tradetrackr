// ============================================================================
// DASHBOARD HOOKS - OPTIMIZED AND CONSOLIDATED
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuth from '@/contexts/AuthContext';
import { 
  FlexibleDashboardConfig, 
  DashboardSection, 
  StatCard, 
  ActionButton 
} from '@/types/common';

// ============================================================================
// MAIN DASHBOARD HOOK
// ============================================================================

export interface UseDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCaching?: boolean;
  cacheKey?: string;
}

export interface UseDashboardReturn {
  config: FlexibleDashboardConfig;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateSection: (sectionId: string, updates: Partial<DashboardSection>) => void;
  addSection: (section: DashboardSection) => void;
  removeSection: (sectionId: string) => void;
}

export const useDashboard = (
  baseConfig: FlexibleDashboardConfig,
  options: UseDashboardOptions = {}
): UseDashboardReturn => {
  const { user, hasPermission } = useAuth();
  const [config, setConfig] = useState<FlexibleDashboardConfig>(baseConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    autoRefresh = false,
    refreshInterval = 30000,
    enableCaching = true,
    cacheKey = 'dashboard-cache'
  } = options;

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Cache management
  useEffect(() => {
    if (enableCaching && cacheKey) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setConfig(parsed);
        } catch (err) {
          console.warn('Failed to parse cached dashboard config:', err);
        }
      }
    }
  }, [enableCaching, cacheKey]);

  const saveToCache = useCallback((config: FlexibleDashboardConfig) => {
    if (enableCaching && cacheKey) {
      localStorage.setItem(cacheKey, JSON.stringify(config));
    }
  }, [enableCaching, cacheKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    
    // Simulate refresh delay
    setTimeout(() => {
      setLoading(false);
      saveToCache(config);
    }, 500);
  }, [config, saveToCache]);

  const updateSection = useCallback((sectionId: string, updates: Partial<DashboardSection>) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        sections: prev.sections.map(section =>
          section.id === sectionId ? { ...section, ...updates } : section
        )
      };
      saveToCache(newConfig);
      return newConfig;
    });
  }, [saveToCache]);

  const addSection = useCallback((section: DashboardSection) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        sections: [...prev.sections, section]
      };
      saveToCache(newConfig);
      return newConfig;
    });
  }, [saveToCache]);

  const removeSection = useCallback((sectionId: string) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        sections: prev.sections.filter(section => section.id !== sectionId)
      };
      saveToCache(newConfig);
      return newConfig;
    });
  }, [saveToCache]);

  return {
    config,
    loading,
    error,
    refresh,
    updateSection,
    addSection,
    removeSection
  };
};

// ============================================================================
// SPECIALIZED DASHBOARD HOOKS
// ============================================================================

export interface UseAdminDashboardReturn extends UseDashboardReturn {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  };
  systemStats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalRevenue: number;
  };
}

export const useAdminDashboard = (): UseAdminDashboardReturn => {
  const { user, hasPermission } = useAuth();
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0
  });
  const [systemStats, setSystemStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalRevenue: 0
  });

  // Load admin statistics
  useEffect(() => {
    if (hasPermission?.('admin_access')) {
      loadAdminStats();
    }
  }, [hasPermission]);

  const loadAdminStats = () => {
    // Load from localStorage or API
    const savedUsers = localStorage.getItem('users');
    const savedProjects = localStorage.getItem('projects');
    
    if (savedUsers) {
      const users = JSON.parse(savedUsers);
      setUserStats({
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.status === 'active').length,
        newUsersThisMonth: users.filter((u: any) => {
          const userDate = new Date(u.createdAt);
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return userDate > monthAgo;
        }).length
      });
    }

    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      setSystemStats({
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'in-progress').length,
        completedProjects: projects.filter((p: any) => p.status === 'completed').length,
        totalRevenue: projects.reduce((sum: number, p: any) => sum + (parseFloat(p.budget) || 0), 0)
      });
    }
  };

  const baseConfig: FlexibleDashboardConfig = {
    title: 'Administrator Dashboard',
    subtitle: 'Systemübersicht und Verwaltung',
    showHeader: true,
    maxWidth: '7xl',
    sections: []
  };

  const dashboardHook = useDashboard(baseConfig, {
    autoRefresh: true,
    refreshInterval: 60000,
    enableCaching: true,
    cacheKey: 'admin-dashboard'
  });

  return {
    ...dashboardHook,
    userStats,
    systemStats
  };
};

export interface UseProjectDashboardReturn extends UseDashboardReturn {
  projectStats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalBudget: number;
    highPriorityProjects: number;
  };
  projectData: any[];
}

export const useProjectDashboard = (): UseProjectDashboardReturn => {
  const [projectStats, setProjectStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalBudget: 0,
    highPriorityProjects: 0
  });
  const [projectData, setProjectData] = useState<any[]>([]);

  // Load project data
  useEffect(() => {
    loadProjectData();
  }, []);

  const loadProjectData = () => {
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      setProjectData(projects);
      
      setProjectStats({
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'in-progress').length,
        completedProjects: projects.filter((p: any) => p.status === 'completed').length,
        totalBudget: projects.reduce((sum: number, p: any) => sum + (parseFloat(p.budget) || 0), 0),
        highPriorityProjects: projects.filter((p: any) => p.priority === 'high').length
      });
    }
  };

  const baseConfig: FlexibleDashboardConfig = {
    title: 'Projekt Dashboard',
    subtitle: 'Projektübersicht und -verwaltung',
    showHeader: true,
    maxWidth: '7xl',
    sections: []
  };

  const dashboardHook = useDashboard(baseConfig, {
    autoRefresh: true,
    refreshInterval: 45000,
    enableCaching: true,
    cacheKey: 'project-dashboard'
  });

  return {
    ...dashboardHook,
    projectStats,
    projectData
  };
};

// ============================================================================
// UTILITY HOOKS FOR DASHBOARD COMPONENTS
// ============================================================================

export const useDashboardPermissions = () => {
  const { hasPermission } = useAuth();
  
  const canViewSection = useCallback((permission?: string) => {
    if (!permission) return true;
    return hasPermission ? hasPermission(permission) : true;
  }, [hasPermission]);

  const canPerformAction = useCallback((action: string) => {
    return hasPermission ? hasPermission(action) : false;
  }, [hasPermission]);

  return {
    canViewSection,
    canPerformAction
  };
};

export const useDashboardNavigation = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['dashboard']);

  const navigateTo = useCallback((page: string) => {
    setCurrentPage(page);
    setNavigationHistory(prev => [...prev, page]);
  }, []);

  const goBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousPage = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentPage(previousPage);
    }
  }, [navigationHistory]);

  const goToPage = useCallback((page: string) => {
    setCurrentPage(page);
    setNavigationHistory(prev => [...prev, page]);
  }, []);

  return {
    currentPage,
    navigationHistory,
    navigateTo,
    goBack,
    goToPage
  };
};

// ============================================================================
// DASHBOARD DATA TRANSFORMATION HOOKS
// ============================================================================

export const useDashboardDataTransform = () => {
  const transformStatsData = useCallback((rawData: any[], config: any) => {
    return rawData.map(item => ({
      id: item.id || item.key,
      title: item.title || item.name,
      value: item.value || item.count || '0',
      subtitle: item.subtitle || item.description,
      icon: config.icon || null,
      color: config.color || 'blue',
      trend: item.trend || null
    }));
  }, []);

  const transformActionData = useCallback((rawData: any[], config: any) => {
    return rawData.map(item => ({
      id: item.id || item.key,
      label: item.label || item.name,
      icon: config.icon || null,
      onClick: item.onClick || (() => {}),
      variant: item.variant || 'default',
      size: item.size || 'md',
      disabled: item.disabled || false,
      permission: item.permission || null
    }));
  }, []);

  const transformTableData = useCallback((rawData: any[], columns: any[]) => {
    return rawData.map(item => {
      const row: any = {};
      columns.forEach(col => {
        row[col.key] = item[col.key] || item[col.dataKey] || '';
      });
      return row;
    });
  }, []);

  return {
    transformStatsData,
    transformActionData,
    transformTableData
  };
};

// ============================================================================
// FLEXIBLE DASHBOARD HOOKS EXPORTS
// ============================================================================

export * from './useFlexibleDashboard';
