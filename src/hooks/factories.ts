// ============================================================================
// HOOK FACTORIES
// ============================================================================
// Wiederverwendbare Factory-Funktionen für Custom Hooks

import React, { useContext, createContext, useCallback, useMemo } from 'react';

// ============================================================================
// CONTEXT HOOK FACTORY
// ============================================================================

/**
 * Factory für Context-Hooks mit automatischer Fehlerbehandlung
 * @param context React Context
 * @param hookName Name des Hooks für Fehlermeldungen
 * @returns Hook-Funktion mit Context-Wert
 */
export function createContextHook<T>(
  context: React.Context<T | undefined>,
  hookName: string
) {
  return function useContextHook(): T {
    const contextValue = useContext(context);
    
    if (contextValue === undefined) {
      throw new Error(
        `${hookName} must be used within a ${hookName.replace('use', '')}Provider`
      );
    }
    
    return contextValue;
  };
}

// ============================================================================
// LOCAL STORAGE HOOK FACTORY
// ============================================================================

/**
 * Factory für Local Storage Hooks mit Typisierung
 * @param key Storage-Schlüssel
 * @param defaultValue Standardwert
 * @param options Konfigurationsoptionen
 * @returns Hook-Funktion für Local Storage
 */
export function createLocalStorageHook<T>(
  key: string,
  defaultValue: T,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
    validate?: (value: T) => boolean;
  } = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    validate = () => true
  } = options;

  return function useLocalStorageHook(): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = React.useState<T>(() => {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          const parsed = deserialize(item);
          return validate(parsed) ? parsed : defaultValue;
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
      }
      return defaultValue;
    });

    const setValue = useCallback((value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        if (validate(valueToStore)) {
          setStoredValue(valueToStore);
          window.localStorage.setItem(key, serialize(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    }, [key, serialize, storedValue, validate]);

    return [storedValue, setValue];
  };
}

// ============================================================================
// STATE HOOK FACTORY
// ============================================================================

/**
 * Factory für State-Hooks mit Validierung
 * @param initialState Anfangszustand
 * @param validator Validierungsfunktion
 * @returns Hook-Funktion mit validiertem State
 */
export function createStateHook<T>(
  initialState: T,
  validator?: (value: T) => boolean
) {
  return function useStateHook(): [T, (value: T | ((prev: T) => T)) => void] {
    const [state, setState] = React.useState<T>(initialState);

    const setValidatedState = useCallback((value: T | ((prev: T) => T)) => {
      const newValue = value instanceof Function ? value(state) : value;
      
      if (!validator || validator(newValue)) {
        setState(newValue);
      } else {
        console.warn(`Invalid state value:`, newValue);
      }
    }, [state, validator]);

    return [state, setValidatedState];
  };
}

// ============================================================================
// EFFECT HOOK FACTORY
// ============================================================================

/**
 * Factory für Effect-Hooks mit Cleanup
 * @param effect Effect-Funktion
 * @param cleanup Cleanup-Funktion
 * @returns Hook-Funktion mit automatischem Cleanup
 */
export function createEffectHook(
  effect: () => void | (() => void),
  cleanup?: () => void
) {
  return function useEffectHook(dependencies: React.DependencyList = []) {
    React.useEffect(() => {
      const cleanupFn = effect();
      
      return () => {
        if (cleanupFn) cleanupFn();
        if (cleanup) cleanup();
      };
    }, dependencies);
  };
}

// ============================================================================
// CALLBACK HOOK FACTORY
// ============================================================================

/**
 * Factory für Callback-Hooks mit Memoization
 * @param callback Callback-Funktion
 * @param dependencies Abhängigkeiten
 * @returns Memoized Callback-Hook
 */
export function createCallbackHook<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList = []
) {
  return function useCallbackHook(): T {
    return useMemo(() => callback, dependencies);
  };
}

// ============================================================================
// UTILITY HOOK FACTORY
// ============================================================================

/**
 * Factory für Utility-Hooks mit Konfiguration
 * @param config Konfigurationsobjekt
 * @param factory Hook-Factory-Funktion
 * @returns Konfigurierter Hook
 */
export function createUtilityHook<TConfig, THook>(
  config: TConfig,
  factory: (config: TConfig) => THook
) {
  return function useUtilityHook(): THook {
    return useMemo(() => factory(config), [config]);
  };
}
