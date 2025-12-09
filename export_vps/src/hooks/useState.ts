// ============================================================================
// OPTIMIZED STATE HOOKS
// ============================================================================
// Erweiterte und optimierte State-Hooks

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ============================================================================
// TOGGLE HOOK
// ============================================================================

export const useToggle = (initialValue: boolean = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  const setValueWithCallback = useCallback((newValue: boolean | ((prev: boolean) => boolean)) => {
    setValue(newValue);
  }, []);

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    setValue: setValueWithCallback,
  };
};

// ============================================================================
// BOOLEAN HOOK
// ============================================================================

export const useBoolean = (initialValue: boolean = false) => {
  const [value, setValue] = useState(initialValue);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setValueWithCallback = useCallback((newValue: boolean | ((prev: boolean) => boolean)) => {
    setValue(newValue);
  }, []);

  return {
    value,
    setTrue,
    setFalse,
    toggle,
    setValue: setValueWithCallback,
  };
};

// ============================================================================
// COUNTER HOOK
// ============================================================================

export const useCounter = (initialValue: number = 0, options: {
  min?: number;
  max?: number;
  step?: number;
} = {}) => {
  const { min = -Infinity, max = Infinity, step = 1 } = options;
  
  const [value, setValue] = useState(initialValue);

  const increment = useCallback(() => {
    setValue(prev => Math.min(max, prev + step));
  }, [max, step]);

  const decrement = useCallback(() => {
    setValue(prev => Math.max(min, prev - step));
  }, [min, step]);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  const setValueWithCallback = useCallback((newValue: number | ((prev: number) => number)) => {
    setValue(prev => {
      const nextValue = typeof newValue === 'function' ? newValue(prev) : newValue;
      return Math.max(min, Math.min(max, nextValue));
    });
  }, [min, max]);

  const isAtMin = useMemo(() => value <= min, [value, min]);
  const isAtMax = useMemo(() => value >= max, [value, max]);

  return {
    value,
    increment,
    decrement,
    reset,
    setValue: setValueWithCallback,
    isAtMin,
    isAtMax,
    min,
    max,
    step,
  };
};

// ============================================================================
// ARRAY STATE HOOK
// ============================================================================

export const useArray = <T>(initialValue: T[] = []) => {
  const [array, setArray] = useState<T[]>(initialValue);

  const push = useCallback((item: T) => {
    setArray(prev => [...prev, item]);
  }, []);

  const pop = useCallback(() => {
    setArray(prev => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const shift = useCallback(() => {
    setArray(prev => {
      if (prev.length === 0) return prev;
      return prev.slice(1);
    });
  }, []);

  const unshift = useCallback((item: T) => {
    setArray(prev => [item, ...prev]);
  }, []);

  const insert = useCallback((index: number, item: T) => {
    setArray(prev => {
      if (index < 0 || index > prev.length) return prev;
      return [...prev.slice(0, index), item, ...prev.slice(index)];
    });
  }, []);

  const remove = useCallback((index: number) => {
    setArray(prev => {
      if (index < 0 || index >= prev.length) return prev;
      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
  }, []);

  const update = useCallback((index: number, item: T) => {
    setArray(prev => {
      if (index < 0 || index >= prev.length) return prev;
      return prev.map((val, i) => i === index ? item : val);
    });
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  const reset = useCallback(() => {
    setArray(initialValue);
  }, [initialValue]);

  const setArrayWithCallback = useCallback((newArray: T[] | ((prev: T[]) => T[])) => {
    setArray(newArray);
  }, []);

  const length = useMemo(() => array.length, [array]);
  const isEmpty = useMemo(() => array.length === 0, [array]);
  const isNotEmpty = useMemo(() => array.length > 0, [array]);

  return {
    array,
    push,
    pop,
    shift,
    unshift,
    insert,
    remove,
    update,
    clear,
    reset,
    setArray: setArrayWithCallback,
    length,
    isEmpty,
    isNotEmpty,
  };
};

// ============================================================================
// OBJECT STATE HOOK
// ============================================================================

export const useObject = <T extends Record<string, any>>(initialValue: T) => {
  const [object, setObject] = useState<T>(initialValue);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setObject(prev => ({ ...prev, [key]: value }));
  }, []);

  const setMultiple = useCallback((updates: Partial<T>) => {
    setObject(prev => ({ ...prev, ...updates }));
  }, []);

  const remove = useCallback((key: keyof T) => {
    setObject(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest as T;
    });
  }, []);

  const reset = useCallback(() => {
    setObject(initialValue);
  }, [initialValue]);

  const clear = useCallback(() => {
    setObject({} as T);
  }, []);

  const setObjectWithCallback = useCallback((newObject: T | ((prev: T) => T)) => {
    setObject(newObject);
  }, []);

  const hasKey = useCallback((key: keyof T) => {
    return key in object;
  }, [object]);

  const getValue = useCallback(<K extends keyof T>(key: K, defaultValue?: T[K]) => {
    return object[key] ?? defaultValue;
  }, [object]);

  return {
    object,
    set,
    setMultiple,
    remove,
    reset,
    clear,
    setObject: setObjectWithCallback,
    hasKey,
    getValue,
  };
};

// ============================================================================
// PREVIOUS VALUE HOOK
// ============================================================================

export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

// ============================================================================
// STATE UTILITIES HOOK
// ============================================================================

export const useStateUtils = () => {
  const createStateWithHistory = useCallback(<T>(
    initialValue: T,
    maxHistory: number = 10
  ) => {
    const [current, setCurrent] = useState<T>(initialValue);
    const [history, setHistory] = useState<T[]>([]);

    const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
      setCurrent(prev => {
        const nextValue = typeof newValue === 'function' ? newValue(prev) : newValue;
        setHistory(prevHistory => [prev, ...prevHistory.slice(0, maxHistory - 1)]);
        return nextValue;
      });
    }, [maxHistory]);

    const undo = useCallback(() => {
      if (history.length > 0) {
        const [previous, ...rest] = history;
        setCurrent(previous);
        setHistory(rest);
      }
    }, [history]);

    const canUndo = useMemo(() => history.length > 0, [history]);

    return {
      value: current,
      setValue,
      undo,
      canUndo,
      history,
    };
  }, []);

  const createStateWithValidation = useCallback(<T>(
    initialValue: T,
    validator: (value: T) => string | null
  ) => {
    const [value, setValue] = useState<T>(initialValue);
    const [error, setError] = useState<string | null>(null);

    const setValueWithValidation = useCallback((newValue: T | ((prev: T) => T)) => {
      const nextValue = typeof newValue === 'function' ? newValue(value) : newValue;
      const validationError = validator(nextValue);
      
      setError(validationError);
      setValue(nextValue);
    }, [value, validator]);

    const isValid = useMemo(() => error === null, [error]);

    return {
      value,
      setValue: setValueWithValidation,
      error,
      isValid,
      clearError: () => setError(null),
    };
  }, []);

  return {
    createStateWithHistory,
    createStateWithValidation,
  };
};
