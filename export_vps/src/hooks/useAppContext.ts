// ============================================================================
// OPTIMIZED APP CONTEXT HOOKS
// ============================================================================
import { useContext, useCallback, useMemo } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useAppContext = () => {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }

  return context;
};

// Specialized app context hooks
export const useAppState = () => {
  const { state, dispatch } = useAppContext();
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    dispatch({ type: 'UPDATE_STATE', payload: updates });
  }, [dispatch]);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, [dispatch]);

  return {
    state,
    updateState,
    resetState,
  };
};

export const useAppSettings = () => {
  const { state, dispatch } = useAppContext();
  
  const updateSettings = useCallback((settings: Partial<typeof state.settings>) => {
    dispatch({ 
      type: 'UPDATE_SETTINGS', 
      payload: settings 
    });
  }, [dispatch]);

  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' });
  }, [dispatch]);

  return {
    settings: state.settings,
    updateSettings,
    resetSettings,
  };
};

export const useAppNavigation = () => {
  const { state, dispatch } = useAppContext();
  
  const navigateTo = useCallback((route: string, params?: Record<string, any>) => {
    dispatch({ 
      type: 'NAVIGATE', 
      payload: { route, params } 
    });
  }, [dispatch]);

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, [dispatch]);

  const goForward = useCallback(() => {
    dispatch({ type: 'GO_FORWARD' });
  }, [dispatch]);

  return {
    currentRoute: state.currentRoute,
    navigationHistory: state.navigationHistory,
    navigateTo,
    goBack,
    goForward,
  };
};
