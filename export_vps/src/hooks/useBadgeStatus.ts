// ============================================================================
// OPTIMIZED BADGE AND STATUS HOOKS
// ============================================================================
// Erweiterte und optimierte Badge- und Status-Hooks

import { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type BadgeType = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg' | 'xl';
export type BadgeVariant = 'solid' | 'outline' | 'soft' | 'ghost';

export interface BadgeConfig {
  type: BadgeType;
  size: BadgeSize;
  variant: BadgeVariant;
  showCount?: boolean;
  maxCount?: number;
  dot?: boolean;
  pulse?: boolean;
  animated?: boolean;
}

export interface StatusConfig {
  type: 'online' | 'offline' | 'away' | 'busy' | 'pending' | 'completed' | 'error' | 'warning' | 'info';
  label: string;
  color: string;
  icon?: string;
  description?: string;
}

export interface BadgeState {
  count: number;
  isVisible: boolean;
  isAnimated: boolean;
  lastUpdate: number;
}

export interface UseBadgeReturn {
  // State
  count: number;
  isVisible: boolean;
  isAnimated: boolean;
  
  // Actions
  increment: (amount?: number) => void;
  decrement: (amount?: number) => void;
  setCount: (count: number) => void;
  reset: () => void;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  animate: (duration?: number) => void;
  
  // Computed values
  displayCount: string;
  hasBadge: boolean;
  badgeType: BadgeType;
  badgeSize: BadgeSize;
  badgeVariant: BadgeVariant;
}

export interface UseStatusReturn {
  // State
  status: StatusConfig;
  isActive: boolean;
  lastChange: number;
  
  // Actions
  setStatus: (status: StatusConfig['type']) => void;
  setCustomStatus: (status: StatusConfig) => void;
  reset: () => void;
  
  // Computed values
  statusColor: string;
  statusLabel: string;
  statusIcon: string;
  statusDescription: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const BADGE_TYPES: Record<BadgeType, { label: string; color: string; bgColor: string }> = {
  default: { label: 'Standard', color: '#6B7280', bgColor: '#F3F4F6' },
  primary: { label: 'Primär', color: '#3B82F6', bgColor: '#DBEAFE' },
  secondary: { label: 'Sekundär', color: '#6B7280', bgColor: '#F3F4F6' },
  success: { label: 'Erfolg', color: '#10B981', bgColor: '#D1FAE5' },
  warning: { label: 'Warnung', color: '#F59E0B', bgColor: '#FEF3C7' },
  danger: { label: 'Gefahr', color: '#EF4444', bgColor: '#FEE2E2' },
  info: { label: 'Info', color: '#06B6D4', bgColor: '#CFFAFE' },
};

export const BADGE_SIZES: Record<BadgeSize, { size: string; fontSize: string; padding: string }> = {
  sm: { size: '16px', fontSize: '12px', padding: '2px 6px' },
  md: { size: '20px', fontSize: '14px', padding: '4px 8px' },
  lg: { size: '24px', fontSize: '16px', padding: '6px 12px' },
  xl: { size: '32px', fontSize: '18px', padding: '8px 16px' },
};

export const BADGE_VARIANTS: Record<BadgeVariant, { style: string }> = {
  solid: { style: 'solid' },
  outline: { style: 'outline' },
  soft: { style: 'soft' },
  ghost: { style: 'ghost' },
};

export const STATUS_TYPES: Record<StatusConfig['type'], StatusConfig> = {
  online: {
    type: 'online',
    label: 'Online',
    color: '#10B981',
    icon: '🟢',
    description: 'Benutzer ist verfügbar',
  },
  offline: {
    type: 'offline',
    label: 'Offline',
    color: '#6B7280',
    icon: '⚫',
    description: 'Benutzer ist nicht verfügbar',
  },
  away: {
    type: 'away',
    label: 'Abwesend',
    color: '#F59E0B',
    icon: '🟡',
    description: 'Benutzer ist abwesend',
  },
  busy: {
    type: 'busy',
    label: 'Beschäftigt',
    color: '#EF4444',
    icon: '🔴',
    description: 'Benutzer ist beschäftigt',
  },
  pending: {
    type: 'pending',
    label: 'Ausstehend',
    color: '#F59E0B',
    icon: '⏳',
    description: 'Aktion ist ausstehend',
  },
  completed: {
    type: 'completed',
    label: 'Abgeschlossen',
    color: '#10B981',
    icon: '✅',
    description: 'Aktion ist abgeschlossen',
  },
  error: {
    type: 'error',
    label: 'Fehler',
    color: '#EF4444',
    icon: '❌',
    description: 'Ein Fehler ist aufgetreten',
  },
  warning: {
    type: 'warning',
    label: 'Warnung',
    color: '#F59E0B',
    icon: '⚠️',
    description: 'Warnung ist aufgetreten',
  },
  info: {
    type: 'info',
    label: 'Information',
    color: '#06B6D4',
    icon: 'ℹ️',
    description: 'Information verfügbar',
  },
};

// ============================================================================
// MAIN BADGE HOOK
// ============================================================================

export const useBadge = (
  initialCount: number = 0,
  config: Partial<BadgeConfig> = {}
): UseBadgeReturn => {
  const {
    type = 'primary',
    size = 'md',
    variant = 'solid',
    showCount = true,
    maxCount = 99,
    dot = false,
    pulse = false,
    animated = false,
  } = config;

  const [state, setState] = useState<BadgeState>({
    count: initialCount,
    isVisible: initialCount > 0,
    isAnimated: animated,
    lastUpdate: Date.now(),
  });

  // Actions
  const increment = useCallback((amount: number = 1) => {
    setState(prev => ({
      ...prev,
      count: Math.min(prev.count + amount, maxCount),
      isVisible: true,
      lastUpdate: Date.now(),
    }));
  }, [maxCount]);

  const decrement = useCallback((amount: number = 1) => {
    setState(prev => {
      const newCount = Math.max(prev.count - amount, 0);
      return {
        ...prev,
        count: newCount,
        isVisible: newCount > 0,
        lastUpdate: Date.now(),
      };
    });
  }, []);

  const setCount = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      count: Math.max(0, Math.min(count, maxCount)),
      isVisible: count > 0,
      lastUpdate: Date.now(),
    }));
  }, [maxCount]);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      count: 0,
      isVisible: false,
      lastUpdate: Date.now(),
    }));
  }, []);

  const show = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: true }));
  }, []);

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: !prev.isVisible }));
  }, []);

  const animate = useCallback((duration: number = 1000) => {
    setState(prev => ({ ...prev, isAnimated: true }));
    
    setTimeout(() => {
      setState(prev => ({ ...prev, isAnimated: false }));
    }, duration);
  }, []);

  // Computed values
  const displayCount = useMemo(() => {
    if (!showCount) return '';
    if (dot) return '';
    if (state.count > maxCount) return `${maxCount}+`;
    return state.count.toString();
  }, [state.count, showCount, maxCount, dot]);

  const hasBadge = useMemo(() => {
    return state.isVisible && (state.count > 0 || dot);
  }, [state.isVisible, state.count, dot]);

  const badgeType = useMemo(() => type, [type]);
  const badgeSize = useMemo(() => size, [size]);
  const badgeVariant = useMemo(() => variant, [variant]);

  return {
    // State
    count: state.count,
    isVisible: state.isVisible,
    isAnimated: state.isAnimated,
    
    // Actions
    increment,
    decrement,
    setCount,
    reset,
    show,
    hide,
    toggle,
    animate,
    
    // Computed values
    displayCount,
    hasBadge,
    badgeType,
    badgeSize,
    badgeVariant,
  };
};

// ============================================================================
// STATUS HOOK
// ============================================================================

export const useStatus = (
  initialStatus: StatusConfig['type'] = 'offline'
): UseStatusReturn => {
  const [status, setStatusState] = useState<StatusConfig>(STATUS_TYPES[initialStatus]);
  const [isActive, setIsActive] = useState(false);
  const [lastChange, setLastChange] = useState(Date.now());

  // Actions
  const setStatus = useCallback((newStatus: StatusConfig['type']) => {
    const statusConfig = STATUS_TYPES[newStatus];
    setStatusState(statusConfig);
    setIsActive(newStatus === 'online' || newStatus === 'busy');
    setLastChange(Date.now());
  }, []);

  const setCustomStatus = useCallback((customStatus: StatusConfig) => {
    setStatusState(customStatus);
    setIsActive(customStatus.type === 'online' || customStatus.type === 'busy');
    setLastChange(Date.now());
  }, []);

  const reset = useCallback(() => {
    setStatusState(STATUS_TYPES.offline);
    setIsActive(false);
    setLastChange(Date.now());
  }, []);

  // Computed values
  const statusColor = useMemo(() => status.color, [status.color]);
  const statusLabel = useMemo(() => status.label, [status.label]);
  const statusIcon = useMemo(() => status.icon || '', [status.icon]);
  const statusDescription = useMemo(() => status.description || '', [status.description]);

  return {
    // State
    status,
    isActive,
    lastChange,
    
    // Actions
    setStatus,
    setCustomStatus,
    reset,
    
    // Computed values
    statusColor,
    statusLabel,
    statusIcon,
    statusDescription,
  };
};

// ============================================================================
// SPECIALIZED BADGE HOOKS
// ============================================================================

// Hook for notification badges
export const useNotificationBadge = (initialCount: number = 0) => {
  const badge = useBadge(initialCount, {
    type: 'danger',
    size: 'md',
    variant: 'solid',
    showCount: true,
    maxCount: 999,
    pulse: true,
  });

  const markAsRead = useCallback(() => {
    badge.reset();
  }, [badge]);

  const markAllAsRead = useCallback(() => {
    badge.reset();
  }, [badge]);

  const addNotification = useCallback(() => {
    badge.increment();
  }, [badge]);

  return {
    ...badge,
    markAsRead,
    markAllAsRead,
    addNotification,
  };
};

// Hook for progress badges
export const useProgressBadge = (initialProgress: number = 0) => {
  const [progress, setProgress] = useState(initialProgress);
  
  const badge = useBadge(Math.round(progress), {
    type: progress >= 100 ? 'success' : progress >= 50 ? 'warning' : 'primary',
    size: 'lg',
    variant: 'solid',
    showCount: true,
    maxCount: 100,
  });

  const updateProgress = useCallback((newProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    setProgress(clampedProgress);
    badge.setCount(Math.round(clampedProgress));
  }, [badge]);

  const incrementProgress = useCallback((amount: number = 1) => {
    updateProgress(progress + amount);
  }, [progress, updateProgress]);

  const resetProgress = useCallback(() => {
    updateProgress(0);
  }, [updateProgress]);

  return {
    ...badge,
    progress,
    updateProgress,
    incrementProgress,
    resetProgress,
    isComplete: progress >= 100,
    percentage: `${Math.round(progress)}%`,
  };
};

// Hook for priority badges
export const usePriorityBadge = (initialPriority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
  const priorityConfigs = {
    low: { type: 'info' as BadgeType, label: 'Niedrig', color: '#06B6D4' },
    medium: { type: 'warning' as BadgeType, label: 'Mittel', color: '#F59E0B' },
    high: { type: 'danger' as BadgeType, label: 'Hoch', color: '#EF4444' },
    urgent: { type: 'danger' as BadgeType, label: 'Dringend', color: '#DC2626', pulse: true },
  };

  const [priority, setPriority] = useState(initialPriority);
  const config = priorityConfigs[priority];

  const badge = useBadge(1, {
    type: config.type,
    size: 'md',
    variant: 'solid',
    showCount: false,
    pulse: config.pulse,
  });

  const setPriority = useCallback((newPriority: keyof typeof priorityConfigs) => {
    setPriority(newPriority);
  }, []);

  const upgradePriority = useCallback(() => {
    const priorities: Array<keyof typeof priorityConfigs> = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(priority);
    if (currentIndex < priorities.length - 1) {
      setPriority(priorities[currentIndex + 1]);
    }
  }, [priority]);

  const downgradePriority = useCallback(() => {
    const priorities: Array<keyof typeof priorityConfigs> = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(priority);
    if (currentIndex > 0) {
      setPriority(priorities[currentIndex - 1]);
    }
  }, [priority]);

  return {
    ...badge,
    priority,
    priorityLabel: config.label,
    priorityColor: config.color,
    setPriority,
    upgradePriority,
    downgradePriority,
    isUrgent: priority === 'urgent',
    isHigh: priority === 'high' || priority === 'urgent',
  };
};

// ============================================================================
// BADGE UTILITIES HOOK
// ============================================================================

export const useBadgeUtils = () => {
  const getBadgeStyle = useCallback((type: BadgeType, variant: BadgeVariant) => {
    const badgeType = BADGE_TYPES[type];
    const badgeVariant = BADGE_VARIANTS[variant];
    
    switch (badgeVariant.style) {
      case 'solid':
        return {
          backgroundColor: badgeType.bgColor,
          color: badgeType.color,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: badgeType.color,
          border: `1px solid ${badgeType.color}`,
        };
      case 'soft':
        return {
          backgroundColor: badgeType.bgColor,
          color: badgeType.color,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: badgeType.color,
        };
      default:
        return {};
    }
  }, []);

  const getBadgeSizeStyle = useCallback((size: BadgeSize) => {
    return BADGE_SIZES[size];
  }, []);

  const formatBadgeCount = useCallback((count: number, maxCount: number = 99) => {
    if (count <= 0) return '';
    if (count > maxCount) return `${maxCount}+`;
    return count.toString();
  }, []);

  const getBadgeTypeFromValue = useCallback((value: any): BadgeType => {
    if (typeof value === 'number') {
      if (value > 0) return 'success';
      if (value < 0) return 'danger';
      return 'default';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'success' : 'danger';
    }
    
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes('error') || lowerValue.includes('fail')) return 'danger';
      if (lowerValue.includes('success') || lowerValue.includes('complete')) return 'success';
      if (lowerValue.includes('warning') || lowerValue.includes('warn')) return 'warning';
      if (lowerValue.includes('info') || lowerValue.includes('information')) return 'info';
    }
    
    return 'default';
  }, []);

  return {
    getBadgeStyle,
    getBadgeSizeStyle,
    formatBadgeCount,
    getBadgeTypeFromValue,
  };
};
