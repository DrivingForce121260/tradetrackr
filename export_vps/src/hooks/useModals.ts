// ============================================================================
// OPTIMIZED MODAL MANAGEMENT HOOKS
// ============================================================================
// Erweiterte und optimierte Modal-Management-Hooks

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ModalState {
  isOpen: boolean;
  data?: any;
}

export interface ModalConfig {
  name: string;
  initialState?: ModalState;
}

export interface ModalActions {
  open: (data?: any) => void;
  close: () => void;
  toggle: () => void;
  setData: (data: any) => void;
}

export interface UseModalsReturn {
  modals: Record<string, ModalState>;
  actions: Record<string, ModalActions>;
  openModal: (name: string, data?: any) => void;
  closeModal: (name: string) => void;
  closeAllModals: () => void;
  isAnyModalOpen: boolean;
  openModalCount: number;
}

// ============================================================================
// SINGLE MODAL HOOK
// ============================================================================

export const useModal = (initialState: ModalState = { isOpen: false }) => {
  const [state, setState] = useState<ModalState>(initialState);

  const open = useCallback((data?: any) => {
    setState({ isOpen: true, data });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, data: undefined });
  }, []);

  const toggle = useCallback(() => {
    setState(prev => ({ 
      isOpen: !prev.isOpen, 
      data: prev.isOpen ? undefined : prev.data 
    }));
  }, []);

  const setData = useCallback((data: any) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const isOpen = useMemo(() => state.isOpen, [state.isOpen]);

  return {
    isOpen,
    data: state.data,
    open,
    close,
    toggle,
    setData,
  };
};

// ============================================================================
// MULTIPLE MODALS HOOK
// ============================================================================

export const useModals = (configs: ModalConfig[]): UseModalsReturn => {
  const [modals, setModals] = useState<Record<string, ModalState>>(() => {
    const initialModals: Record<string, ModalState> = {};
    configs.forEach(config => {
      initialModals[config.name] = config.initialState || { isOpen: false };
    });
    return initialModals;
  });

  const openModal = useCallback((name: string, data?: any) => {
    setModals(prev => ({
      ...prev,
      [name]: { isOpen: true, data }
    }));
  }, []);

  const closeModal = useCallback((name: string) => {
    setModals(prev => ({
      ...prev,
      [name]: { isOpen: false, data: undefined }
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(prev => {
      const closedModals: Record<string, ModalState> = {};
      Object.keys(prev).forEach(name => {
        closedModals[name] = { isOpen: false, data: undefined };
      });
      return closedModals;
    });
  }, []);

  const actions = useMemo(() => {
    const modalActions: Record<string, ModalActions> = {};
    
    configs.forEach(config => {
      modalActions[config.name] = {
        open: (data?: any) => openModal(config.name, data),
        close: () => closeModal(config.name),
        toggle: () => {
          const currentState = modals[config.name];
          if (currentState.isOpen) {
            closeModal(config.name);
          } else {
            openModal(config.name);
          }
        },
        setData: (data: any) => {
          setModals(prev => ({
            ...prev,
            [config.name]: { ...prev[config.name], data }
          }));
        }
      };
    });

    return modalActions;
  }, [configs, modals, openModal, closeModal]);

  const isAnyModalOpen = useMemo(() => 
    Object.values(modals).some(modal => modal.isOpen), 
    [modals]
  );

  const openModalCount = useMemo(() => 
    Object.values(modals).filter(modal => modal.isOpen).length, 
    [modals]
  );

  return {
    modals,
    actions,
    openModal,
    closeModal,
    closeAllModals,
    isAnyModalOpen,
    openModalCount,
  };
};

// ============================================================================
// CONFIRMATION MODAL HOOK
// ============================================================================

export interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export const useConfirmationModal = () => {
  const [state, setState] = useState<ConfirmationModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Bestätigen',
    cancelText: 'Abbrechen',
    type: 'info'
  });

  const showConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options: Partial<Omit<ConfirmationModalState, 'isOpen' | 'title' | 'message' | 'onConfirm'>> = {}
  ) => {
    setState({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText: options.confirmText || 'Bestätigen',
      cancelText: options.cancelText || 'Abbrechen',
      type: options.type || 'info'
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    state.onConfirm?.();
    hideConfirmation();
  }, [state.onConfirm, hideConfirmation]);

  const handleCancel = useCallback(() => {
    state.onCancel?.();
    hideConfirmation();
  }, [state.onCancel, hideConfirmation]);

  return {
    ...state,
    showConfirmation,
    hideConfirmation,
    handleConfirm,
    handleCancel,
  };
};

// ============================================================================
// MODAL UTILITIES HOOK
// ============================================================================

export const useModalUtils = () => {
  const createModalGroup = useCallback((names: string[]) => {
    return names.reduce((acc, name) => {
      acc[name] = useModal();
      return acc;
    }, {} as Record<string, ReturnType<typeof useModal>>);
  }, []);

  const createSequentialModals = useCallback((names: string[]) => {
    const modals = createModalGroup(names);
    
    const openNext = useCallback((currentName: string) => {
      const currentIndex = names.indexOf(currentName);
      if (currentIndex < names.length - 1) {
        modals[currentName].close();
        modals[names[currentIndex + 1]].open();
      }
    }, [names, modals]);

    const openPrevious = useCallback((currentName: string) => {
      const currentIndex = names.indexOf(currentName);
      if (currentIndex > 0) {
        modals[currentName].close();
        modals[names[currentIndex - 1]].open();
      }
    }, [names, modals]);

    return {
      modals,
      openNext,
      openPrevious,
    };
  }, [createModalGroup]);

  return {
    createModalGroup,
    createSequentialModals,
  };
};
