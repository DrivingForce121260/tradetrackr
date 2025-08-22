// ============================================================================
// OPTIMIZED STORAGE HOOKS
// ============================================================================
// Erweiterte und optimierte Storage-Hooks für localStorage und sessionStorage

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// STORAGE TYPES
// ============================================================================

export type StorageType = 'localStorage' | 'sessionStorage';

export interface StorageOptions {
  type?: StorageType;
  serializer?: {
    stringify: (value: any) => string;
    parse: (value: string) => any;
  };
  onError?: (error: Error) => void;
}

// ============================================================================
// LOCAL STORAGE HOOK
// ============================================================================

export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  options?: StorageOptions
) => {
  return useStorage(key, initialValue, { ...options, type: 'localStorage' });
};

// ============================================================================
// SESSION STORAGE HOOK
// ============================================================================

export const useSessionStorage = <T>(
  key: string,
  initialValue: T,
  options?: StorageOptions
) => {
  return useStorage(key, initialValue, { ...options, type: 'sessionStorage' });
};

// ============================================================================
// GENERIC STORAGE HOOK
// ============================================================================

export const useStorage = <T>(
  key: string,
  initialValue: T,
  options: StorageOptions = {}
) => {
  const {
    type = 'localStorage',
    serializer = {
      stringify: JSON.stringify,
      parse: JSON.parse,
    },
    onError,
  } = options;

  // Ref für den aktuellen Wert, um Race Conditions zu vermeiden
  const valueRef = useRef<T>(initialValue);
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }

      const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
      const item = storage.getItem(key);
      
      if (item === null) {
        return initialValue;
      }

      const parsed = serializer.parse(item);
      valueRef.current = parsed;
      return parsed;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Storage error');
      onError?.(err);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
      
      const valueToStore = value instanceof Function ? value(valueRef.current) : value;
      valueRef.current = valueToStore;
      
      setStoredValue(valueToStore);
      storage.setItem(key, serializer.stringify(valueToStore));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Storage error');
      onError?.(err);
    }
  }, [key, type, serializer, onError]);

  const removeValue = useCallback(() => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
      storage.removeItem(key);
      valueRef.current = initialValue;
      setStoredValue(initialValue);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Storage error');
      onError?.(err);
    }
  }, [key, type, initialValue, onError]);

  const clearStorage = useCallback(() => {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
      storage.clear();
      valueRef.current = initialValue;
      setStoredValue(initialValue);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Storage error');
      onError?.(err);
    }
  }, [type, initialValue, onError]);

  // Synchronisierung zwischen Tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === (type === 'localStorage' ? window.localStorage : window.sessionStorage)) {
        try {
          const newValue = e.newValue ? serializer.parse(e.newValue) : initialValue;
          valueRef.current = newValue;
          setStoredValue(newValue);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Storage sync error');
          onError?.(err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, type, initialValue, serializer, onError]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    clearStorage,
    isPersisted: typeof window !== 'undefined',
  };
};

// ============================================================================
// STORAGE UTILITIES HOOK
// ============================================================================

export const useStorageUtils = () => {
  const getStorageSize = useCallback((type: StorageType = 'localStorage'): number => {
    if (typeof window === 'undefined') return 0;

    try {
      const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
      let total = 0;
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          total += (key.length + (value?.length || 0)) * 2; // UTF-16 characters
        }
      }
      
      return total;
    } catch (error) {
      return 0;
    }
  }, []);

  const getStorageKeys = useCallback((type: StorageType = 'localStorage'): string[] => {
    if (typeof window === 'undefined') return [];

    try {
      const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
      const keys: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) keys.push(key);
      }
      
      return keys;
    } catch (error) {
      return [];
    }
  }, []);

  const hasStorageKey = useCallback((key: string, type: StorageType = 'localStorage'): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
      return storage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }, []);

  const getStorageQuota = useCallback(async (): Promise<StorageEstimate | null> => {
    if (typeof navigator === 'undefined' || !('storage' in navigator)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate;
    } catch (error) {
      return null;
    }
  }, []);

  return {
    getStorageSize,
    getStorageKeys,
    hasStorageKey,
    getStorageQuota,
  };
};

// ============================================================================
// STORAGE FACTORY HOOK
// ============================================================================

export const createStorageHook = <T>(
  type: StorageType,
  defaultOptions?: StorageOptions
) => {
  return <K extends string>(
    key: K,
    initialValue: T,
    options?: StorageOptions
  ) => {
    return useStorage(key, initialValue, { ...defaultOptions, ...options, type });
  };
};

// ============================================================================
// TYPES
// ============================================================================

interface StorageEstimate {
  quota: number;
  usage: number;
  usageDetails?: {
    indexedDB?: number;
    caches?: number;
    serviceWorkerRegistrations?: number;
  };
}
