// ============================================================================
// OPTIMIZED LOCAL STORAGE SYNC HOOKS
// ============================================================================
// Erweiterte und optimierte LocalStorage-Synchronisations-Hooks

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface StorageSyncOptions {
  syncAcrossTabs?: boolean;
  debounceMs?: number;
  onSync?: (key: string, value: any, source: 'local' | 'external') => void;
  onError?: (error: Error) => void;
  validate?: (value: any) => boolean;
  transform?: {
    serialize?: (value: any) => string;
    deserialize?: (value: string) => any;
  };
}

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  version?: string;
  metadata?: Record<string, any>;
}

export interface UseLocalStorageSyncReturn<T> {
  // State
  value: T;
  isSynced: boolean;
  lastSync: number | null;
  error: Error | null;
  
  // Actions
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
  refresh: () => void;
  
  // Utilities
  hasValue: boolean;
  isStale: boolean;
  getMetadata: () => Record<string, any> | null;
  setMetadata: (metadata: Record<string, any>) => void;
}

export interface StorageManager {
  getItem: <T>(key: string, defaultValue: T) => T;
  setItem: <T>(key: string, value: T) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  getKeys: () => string[];
  getSize: () => number;
  hasItem: (key: string) => boolean;
}

// ============================================================================
// MAIN LOCAL STORAGE SYNC HOOK
// ============================================================================

export const useLocalStorageSync = <T>(
  key: string,
  defaultValue: T,
  options: StorageSyncOptions = {}
): UseLocalStorageSyncReturn<T> => {
  const {
    syncAcrossTabs = true,
    debounceMs = 300,
    onSync,
    onError,
    validate,
    transform,
  } = options;

  const [value, setValueState] = useState<T>(defaultValue);
  const [isSynced, setIsSynced] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const isInitializedRef = useRef(false);
  const lastValueRef = useRef<T>(defaultValue);

  // Serialization helpers
  const serialize = useCallback((data: T): string => {
    try {
      const item: StorageItem<T> = {
        value: data,
        timestamp: Date.now(),
        version: '1.0',
      };
      
      if (transform?.serialize) {
        return transform.serialize(item);
      }
      
      return JSON.stringify(item);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Serialization failed');
      onError?.(error);
      throw error;
    }
  }, [transform, onError]);

  const deserialize = useCallback((data: string): StorageItem<T> => {
    try {
      if (transform?.deserialize) {
        return transform.deserialize(data);
      }
      
      return JSON.parse(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Deserialization failed');
      onError?.(error);
      throw error;
    }
  }, [transform, onError]);

  // Load value from localStorage
  const loadFromStorage = useCallback((): T => {
    try {
      if (typeof window === 'undefined') {
        return defaultValue;
      }

      const stored = localStorage.getItem(key);
      if (!stored) {
        return defaultValue;
      }

      const item = deserialize(stored);
      
      // Validate if validator is provided
      if (validate && !validate(item.value)) {
        console.warn(`Invalid value for key "${key}", using default`);
        return defaultValue;
      }

      // Check if data is stale (older than 24 hours)
      const isStale = Date.now() - item.timestamp > 24 * 60 * 60 * 1000;
      if (isStale) {
        console.warn(`Stale data for key "${key}", using default`);
        return defaultValue;
      }

      setLastSync(item.timestamp);
      return item.value;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load from storage: ${key}`);
      setError(error);
      onError?.(error);
      return defaultValue;
    }
  }, [key, defaultValue, validate, deserialize, onError]);

  // Save value to localStorage
  const saveToStorage = useCallback((newValue: T) => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const serialized = serialize(newValue);
      localStorage.setItem(key, serialized);
      
      setLastSync(Date.now());
      setIsSynced(true);
      setError(null);
      
      // Notify about sync
      onSync?.(key, newValue, 'local');
      
      // Dispatch custom event for cross-tab sync
      if (syncAcrossTabs) {
        window.dispatchEvent(new CustomEvent('storage-sync', {
          detail: { key, value: newValue, source: 'local' }
        }));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to save to storage: ${key}`);
      setError(error);
      onError?.(error);
    }
  }, [key, serialize, syncAcrossTabs, onSync, onError]);

  // Debounced save
  const debouncedSave = useCallback((newValue: T) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveToStorage(newValue);
    }, debounceMs);
  }, [debounceMs, saveToStorage]);

  // Set value with storage sync
  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(value)
      : newValue;

    // Skip if value hasn't changed
    if (JSON.stringify(nextValue) === JSON.stringify(lastValueRef.current)) {
      return;
    }

    lastValueRef.current = nextValue;
    setValueState(nextValue);
    
    // Save to storage (debounced)
    debouncedSave(nextValue);
  }, [value, debouncedSave]);

  // Remove value from storage
  const removeValue = useCallback(() => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      localStorage.removeItem(key);
      setValueState(defaultValue);
      setIsSynced(false);
      setLastSync(null);
      setError(null);
      
      // Dispatch removal event
      if (syncAcrossTabs) {
        window.dispatchEvent(new CustomEvent('storage-sync', {
          detail: { key, value: null, source: 'local', action: 'remove' }
        }));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to remove from storage: ${key}`);
      setError(error);
      onError?.(error);
    }
  }, [key, defaultValue, syncAcrossTabs, onError]);

  // Refresh from storage
  const refresh = useCallback(() => {
    const storedValue = loadFromStorage();
    setValueState(storedValue);
    setIsSynced(true);
  }, [loadFromStorage]);

  // Initialize on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const storedValue = loadFromStorage();
    setValueState(storedValue);
    setIsSynced(true);
    isInitializedRef.current = true;
  }, [loadFromStorage]);

  // Cross-tab synchronization
  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === localStorage) {
        try {
          if (e.newValue === null) {
            // Item was removed
            setValueState(defaultValue);
            setIsSynced(false);
            setLastSync(null);
          } else {
            // Item was updated
            const item = deserialize(e.newValue);
            setValueState(item.value);
            setLastSync(item.timestamp);
            setIsSynced(true);
          }
          
          onSync?.(key, e.newValue ? deserialize(e.newValue).value : null, 'external');
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Storage sync error');
          setError(error);
          onError?.(error);
        }
      }
    };

    const handleCustomSync = (e: CustomEvent) => {
      if (e.detail.key === key && e.detail.source === 'external') {
        setValueState(e.detail.value);
        setIsSynced(true);
        setLastSync(Date.now());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage-sync', handleCustomSync as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage-sync', handleCustomSync as EventListener);
    };
  }, [key, defaultValue, syncAcrossTabs, deserialize, onSync, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Computed values
  const hasValue = useMemo(() => {
    return value !== defaultValue && value !== null && value !== undefined;
  }, [value, defaultValue]);

  const isStale = useMemo(() => {
    if (!lastSync) return true;
    return Date.now() - lastSync > 24 * 60 * 60 * 1000; // 24 hours
  }, [lastSync]);

  const getMetadata = useCallback(() => {
    try {
      if (typeof window === 'undefined') return null;
      
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const item = deserialize(stored);
      return item.metadata || null;
    } catch {
      return null;
    }
  }, [key, deserialize]);

  const setMetadata = useCallback((metadata: Record<string, any>) => {
    try {
      if (typeof window === 'undefined') return;
      
      const stored = localStorage.getItem(key);
      if (!stored) return;
      
      const item = deserialize(stored);
      item.metadata = { ...item.metadata, ...metadata };
      
      localStorage.setItem(key, serialize(item));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update metadata');
      setError(error);
      onError?.(error);
    }
  }, [key, serialize, deserialize, onError]);

  return {
    value,
    isSynced,
    lastSync,
    error,
    setValue,
    removeValue,
    refresh,
    hasValue,
    isStale,
    getMetadata,
    setMetadata,
  };
};

// ============================================================================
// STORAGE MANAGER HOOK
// ============================================================================

export const useStorageManager = (): StorageManager => {
  const getItem = useCallback(<T>(key: string, defaultValue: T): T => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      
      const stored = localStorage.getItem(key);
      if (!stored) return defaultValue;
      
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  }, []);

  const setItem = useCallback(<T>(key: string, value: T): void => {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('Failed to set storage item:', err);
    }
  }, []);

  const removeItem = useCallback((key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.removeItem(key);
    } catch (err) {
      console.error('Failed to remove storage item:', err);
    }
  }, []);

  const clear = useCallback((): void => {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.clear();
    } catch (err) {
      console.error('Failed to clear storage:', err);
    }
  }, []);

  const getKeys = useCallback((): string[] => {
    try {
      if (typeof window === 'undefined') return [];
      
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }, []);

  const getSize = useCallback((): number => {
    try {
      if (typeof window === 'undefined') return 0;
      
      return localStorage.length;
    } catch {
      return 0;
    }
  }, []);

  const hasItem = useCallback((key: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }, []);

  return {
    getItem,
    setItem,
    removeItem,
    clear,
    getKeys,
    getSize,
    hasItem,
  };
};

// ============================================================================
// SPECIALIZED STORAGE HOOKS
// ============================================================================

// Hook for syncing arrays with localStorage
export const useArrayStorage = <T>(
  key: string,
  defaultValue: T[] = [],
  options: StorageSyncOptions = {}
) => {
  const [array, actions] = useLocalStorageSync<T[]>(key, defaultValue, options);

  const addItem = useCallback((item: T) => {
    actions.setValue(prev => [...prev, item]);
  }, [actions]);

  const removeItem = useCallback((index: number) => {
    actions.setValue(prev => prev.filter((_, i) => i !== index));
  }, [actions]);

  const updateItem = useCallback((index: number, item: T) => {
    actions.setValue(prev => prev.map((existing, i) => i === index ? item : existing));
  }, [actions]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    actions.setValue(prev => {
      const newArray = [...prev];
      const [movedItem] = newArray.splice(fromIndex, 1);
      newArray.splice(toIndex, 0, movedItem);
      return newArray;
    });
  }, [actions]);

  const clearArray = useCallback(() => {
    actions.setValue([]);
  }, [actions]);

  return {
    array,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    clearArray,
    ...actions,
  };
};

// Hook for syncing objects with localStorage
export const useObjectStorage = <T extends Record<string, any>>(
  key: string,
  defaultValue: T,
  options: StorageSyncOptions = {}
) => {
  const [object, actions] = useLocalStorageSync<T>(key, defaultValue, options);

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    actions.setValue(prev => ({ ...prev, [field]: value }));
  }, [actions]);

  const setMultipleFields = useCallback((updates: Partial<T>) => {
    actions.setValue(prev => ({ ...prev, ...updates }));
  }, [actions]);

  const removeField = useCallback((field: keyof T) => {
    actions.setValue(prev => {
      const { [field]: removed, ...rest } = prev;
      return rest as T;
    });
  }, [actions]);

  const resetToDefault = useCallback(() => {
    actions.setValue(defaultValue);
  }, [actions, defaultValue]);

  return {
    object,
    setField,
    setMultipleFields,
    removeField,
    resetToDefault,
    ...actions,
  };
};
