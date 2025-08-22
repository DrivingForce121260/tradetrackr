// ============================================================================
// OPTIMIZED UNDO/REDO HOOKS
// ============================================================================
// Erweiterte und optimierte Undo/Redo-Hooks

import { useState, useCallback, useMemo, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface HistoryEntry<T> {
  id: string;
  timestamp: number;
  data: T;
  description?: string;
  type?: 'create' | 'update' | 'delete' | 'custom';
}

export interface UndoRedoOptions {
  maxHistory?: number;
  debounceMs?: number;
  autoSave?: boolean;
  onHistoryChange?: (history: HistoryEntry<any>[]) => void;
}

export interface UndoRedoState<T> {
  current: T;
  history: HistoryEntry<T>[];
  future: HistoryEntry<T>[];
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;
  futureSize: number;
}

export interface UndoRedoActions<T> {
  update: (newData: T, description?: string, type?: HistoryEntry<T>['type']) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  clearFuture: () => void;
  jumpToHistory: (index: number) => void;
  getHistoryEntry: (index: number) => HistoryEntry<T> | undefined;
  addToHistory: (data: T, description?: string, type?: HistoryEntry<T>['type']) => void;
}

// ============================================================================
// MAIN UNDO/REDO HOOK
// ============================================================================

export const useUndoRedo = <T>(
  initialValue: T,
  options: UndoRedoOptions = {}
): [T, UndoRedoActions<T>] => {
  const {
    maxHistory = 50,
    debounceMs = 300,
    autoSave = true,
    onHistoryChange,
  } = options;

  const [state, setState] = useState<UndoRedoState<T>>({
    current: initialValue,
    history: [],
    future: [],
    canUndo: false,
    canRedo: false,
    historySize: 0,
    futureSize: 0,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<T>(initialValue);

  // Memoized computed values
  const canUndo = useMemo(() => state.history.length > 0, [state.history.length]);
  const canRedo = useMemo(() => state.future.length > 0, [state.future.length]);

  // Update computed values when state changes
  const updateComputedValues = useCallback(() => {
    setState(prev => ({
      ...prev,
      canUndo: prev.history.length > 0,
      canRedo: prev.future.length > 0,
      historySize: prev.history.length,
      futureSize: prev.future.length,
    }));
  }, []);

  // Add entry to history
  const addToHistory = useCallback((
    data: T,
    description?: string,
    type: HistoryEntry<T>['type'] = 'update'
  ) => {
    const entry: HistoryEntry<T> = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data,
      description,
      type,
    };

    setState(prev => {
      const newHistory = [entry, ...prev.history].slice(0, maxHistory);
      const newState = {
        ...prev,
        history: newHistory,
        future: [], // Clear future when new action is performed
      };

      // Notify about history change
      onHistoryChange?.(newHistory);

      return newState;
    });

    updateComputedValues();
  }, [maxHistory, onHistoryChange, updateComputedValues]);

  // Update current value and add to history
  const update = useCallback((
    newData: T,
    description?: string,
    type: HistoryEntry<T>['type'] = 'update'
  ) => {
    // Skip if data hasn't changed
    if (JSON.stringify(newData) === JSON.stringify(lastUpdateRef.current)) {
      return;
    }

    lastUpdateRef.current = newData;

    // Clear debounce timer if exists
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounced update
    debounceTimerRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, current: newData }));
      addToHistory(newData, description, type);
    }, debounceMs);
  }, [debounceMs, addToHistory]);

  // Undo last action
  const undo = useCallback(() => {
    if (!canUndo) return;

    setState(prev => {
      const [lastEntry, ...remainingHistory] = prev.history;
      const newFuture = [lastEntry, ...prev.future];

      return {
        ...prev,
        current: lastEntry.data,
        history: remainingHistory,
        future: newFuture,
      };
    });

    updateComputedValues();
  }, [canUndo, updateComputedValues]);

  // Redo last undone action
  const redo = useCallback(() => {
    if (!canRedo) return;

    setState(prev => {
      const [nextEntry, ...remainingFuture] = prev.future;
      const newHistory = [nextEntry, ...prev.history];

      return {
        ...prev,
        current: nextEntry.data,
        history: newHistory,
        future: remainingFuture,
      };
    });

    updateComputedValues();
  }, [canRedo, updateComputedValues]);

  // Clear history
  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      history: [],
      future: [],
    }));
    updateComputedValues();
  }, [updateComputedValues]);

  // Clear future
  const clearFuture = useCallback(() => {
    setState(prev => ({
      ...prev,
      future: [],
    }));
    updateComputedValues();
  }, [updateComputedValues]);

  // Jump to specific history entry
  const jumpToHistory = useCallback((index: number) => {
    if (index < 0 || index >= state.history.length) return;

    setState(prev => {
      const targetEntry = prev.history[index];
      const newHistory = prev.history.slice(index + 1);
      const newFuture = [
        { ...prev.current, timestamp: Date.now() } as HistoryEntry<T>,
        ...prev.history.slice(0, index).reverse(),
        ...prev.future,
      ];

      return {
        ...prev,
        current: targetEntry.data,
        history: newHistory,
        future: newFuture,
      };
    });

    updateComputedValues();
  }, [state.history.length, updateComputedValues]);

  // Get history entry by index
  const getHistoryEntry = useCallback((index: number) => {
    return state.history[index];
  }, [state.history]);

  // Actions object
  const actions: UndoRedoActions<T> = useMemo(() => ({
    update,
    undo,
    redo,
    clearHistory,
    clearFuture,
    jumpToHistory,
    getHistoryEntry,
    addToHistory,
  }), [
    update,
    undo,
    redo,
    clearHistory,
    clearFuture,
    jumpToHistory,
    getHistoryEntry,
    addToHistory,
  ]);

  return [state.current, actions];
};

// ============================================================================
// SPECIALIZED UNDO/REDO HOOKS
// ============================================================================

// Hook for form data with undo/redo
export const useFormUndoRedo = <T extends Record<string, any>>(
  initialFormData: T,
  options: UndoRedoOptions = {}
) => {
  const [formData, actions] = useUndoRedo(initialFormData, {
    debounceMs: 500, // Longer debounce for forms
    ...options,
  });

  const updateField = useCallback(<K extends keyof T>(
    field: K,
    value: T[K],
    description?: string
  ) => {
    const newData = { ...formData, [field]: value };
    actions.update(newData, description || `Updated ${String(field)}`);
  }, [formData, actions]);

  const updateMultipleFields = useCallback((
    updates: Partial<T>,
    description?: string
  ) => {
    const newData = { ...formData, ...updates };
    actions.update(newData, description || 'Updated multiple fields');
  }, [formData, actions]);

  return {
    formData,
    updateField,
    updateMultipleFields,
    ...actions,
  };
};

// Hook for list operations with undo/redo
export const useListUndoRedo = <T>(
  initialList: T[],
  options: UndoRedoOptions = {}
) => {
  const [list, actions] = useUndoRedo(initialList, options);

  const addItem = useCallback((item: T, description?: string) => {
    const newList = [...list, item];
    actions.update(newList, description || 'Added item');
  }, [list, actions]);

  const removeItem = useCallback((index: number, description?: string) => {
    const newList = list.filter((_, i) => i !== index);
    actions.update(newList, description || 'Removed item');
  }, [list, actions]);

  const updateItem = useCallback((index: number, item: T, description?: string) => {
    const newList = list.map((existing, i) => i === index ? item : existing);
    actions.update(newList, description || 'Updated item');
  }, [list, actions]);

  const moveItem = useCallback((fromIndex: number, toIndex: number, description?: string) => {
    const newList = [...list];
    const [movedItem] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, movedItem);
    actions.update(newList, description || 'Moved item');
  }, [list, actions]);

  const clearList = useCallback((description?: string) => {
    actions.update([], description || 'Cleared list');
  }, [actions]);

  return {
    list,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    clearList,
    ...actions,
  };
};

// ============================================================================
// UNDO/REDO UTILITIES HOOK
// ============================================================================

export const useUndoRedoUtils = () => {
  const createSnapshot = useCallback(<T>(data: T, description?: string) => {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data,
      description,
      type: 'custom' as const,
    };
  }, []);

  const mergeHistoryEntries = useCallback(<T>(
    entries: HistoryEntry<T>[],
    mergeStrategy: 'latest' | 'earliest' | 'custom' = 'latest'
  ) => {
    if (entries.length === 0) return null;
    if (entries.length === 1) return entries[0];

    switch (mergeStrategy) {
      case 'latest':
        return entries[entries.length - 1];
      case 'earliest':
        return entries[0];
      case 'custom':
        // Custom merge logic - could be extended based on needs
        return entries[entries.length - 1];
      default:
        return entries[entries.length - 1];
    }
  }, []);

  const filterHistoryByType = useCallback(<T>(
    history: HistoryEntry<T>[],
    type: HistoryEntry<T>['type']
  ) => {
    return history.filter(entry => entry.type === type);
  }, []);

  const filterHistoryByTimeRange = useCallback(<T>(
    history: HistoryEntry<T>[],
    startTime: number,
    endTime: number
  ) => {
    return history.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }, []);

  return {
    createSnapshot,
    mergeHistoryEntries,
    filterHistoryByType,
    filterHistoryByTimeRange,
  };
};
