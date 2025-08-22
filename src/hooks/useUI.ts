// ============================================================================
// OPTIMIZED UI HOOKS
// ============================================================================
import { useState, useCallback, useRef, useEffect } from 'react';

// Modal management hook
export interface ModalConfig {
  id: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  onClose?: () => void;
}

export function useModal() {
  const [modals, setModals] = useState<ModalConfig[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = useCallback((config: ModalConfig) => {
    setModals(prev => [...prev, config]);
    setActiveModal(config.id);
  }, []);

  const closeModal = useCallback((id: string) => {
    const modal = modals.find(m => m.id === id);
    modal?.onClose?.();
    
    setModals(prev => prev.filter(m => m.id !== id));
    setActiveModal(prev => prev === id ? null : prev);
  }, [modals]);

  const closeAllModals = useCallback(() => {
    modals.forEach(modal => modal.onClose?.());
    setModals([]);
    setActiveModal(null);
  }, [modals]);

  const isModalOpen = useCallback((id: string) => {
    return modals.some(m => m.id === id);
  }, [modals]);

  return {
    modals,
    activeModal,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    hasOpenModals: modals.length > 0,
  };
}

// Notification management hook
export interface NotificationConfig {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }>;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);

  const addNotification = useCallback((config: Omit<NotificationConfig, 'id'>) => {
    const id = Date.now().toString();
    const notification: NotificationConfig = {
      ...config,
      id,
      duration: config.duration ?? 5000,
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove non-persistent notifications
    if (!config.persistent && notification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearNotificationsByType = useCallback((type: NotificationConfig['type']) => {
    setNotifications(prev => prev.filter(n => n.type !== type));
  }, []);

  // Convenience methods
  const notify = useCallback((type: NotificationConfig['type'], title: string, message?: string) => {
    return addNotification({ type, title, message });
  }, [addNotification]);

  const notifyInfo = useCallback((title: string, message?: string) => {
    return notify('info', title, message);
  }, [notify]);

  const notifySuccess = useCallback((title: string, message?: string) => {
    return notify('success', title, message);
  }, [notify]);

  const notifyWarning = useCallback((title: string, message?: string) => {
    return notify('warning', title, message);
  }, [notify]);

  const notifyError = useCallback((title: string, message?: string) => {
    return notify('error', title, message);
  }, [notify]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    clearNotificationsByType,
    notify,
    notifyInfo,
    notifySuccess,
    notifyWarning,
    notifyError,
    hasNotifications: notifications.length > 0,
  };
}

// Confirmation dialog hook
export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
}

export function useConfirmation() {
  const [config, setConfig] = useState<ConfirmationConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const confirm = useCallback((config: ConfirmationConfig) => {
    setConfig(config);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setConfig(null);
  }, []);

  const handleConfirm = useCallback(() => {
    config?.onConfirm();
    close();
  }, [config, close]);

  const handleCancel = useCallback(() => {
    config?.onCancel?.();
    close();
  }, [config, close]);

  return {
    isOpen,
    config,
    confirm,
    close,
    handleConfirm,
    handleCancel,
  };
}

// Tooltip hook
export function useTooltip() {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [content, setContent] = useState<string>('');

  const showTooltip = useCallback((content: string, x: number, y: number) => {
    setContent(content);
    setPosition({ x, y });
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setIsVisible(false);
  }, []);

  const updatePosition = useCallback((x: number, y: number) => {
    setPosition({ x, y });
  }, []);

  return {
    isVisible,
    position,
    content,
    showTooltip,
    hideTooltip,
    updatePosition,
  };
}

// Loading state hook
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoadingState = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  }, []);

  const startLoadingState = useCallback((key: string) => {
    setLoadingState(key, true);
  }, [setLoadingState]);

  const stopLoadingState = useCallback((key: string) => {
    setLoadingState(key, false);
  }, [setLoadingState]);

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    startLoading();
    try {
      return await asyncFn();
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  const withLoadingState = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    startLoadingState(key);
    try {
      return await asyncFn();
    } finally {
      stopLoadingState(key);
    }
  }, [startLoadingState, stopLoadingState]);

  return {
    isLoading,
    loadingStates,
    startLoading,
    stopLoading,
    setLoadingState,
    startLoadingState,
    stopLoadingState,
    withLoading,
    withLoadingState,
    getLoadingState: (key: string) => loadingStates[key] || false,
  };
}

// Scroll position hook
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollX, scrollY } = window;
      setScrollPosition({ x: scrollX, y: scrollY });

      // Determine scroll direction
      if (scrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else if (scrollY < lastScrollY.current) {
        setScrollDirection('up');
      }

      lastScrollY.current = scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToElement = useCallback((element: HTMLElement | string) => {
    const target = typeof element === 'string' ? document.querySelector(element) : element;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return {
    scrollPosition,
    scrollDirection,
    scrollToTop,
    scrollToElement,
    isAtTop: scrollPosition.y === 0,
    isAtBottom: scrollPosition.y + window.innerHeight >= document.documentElement.scrollHeight,
  };
}

// Keyboard shortcuts hook
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = s.ctrl === event.ctrlKey;
        const shiftMatch = s.shift === event.shiftKey;
        const altMatch = s.alt === event.altKey;
        const metaMatch = s.meta === event.metaKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return {
    shortcuts,
    getShortcutDescription: (key: string) => {
      const shortcut = shortcuts.find(s => s.key === key);
      return shortcut?.description;
    },
  };
}
