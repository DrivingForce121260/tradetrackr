// ============================================================================
// OPTIMIZED PERFORMANCE HOOKS
// ============================================================================
// Erweiterte und optimierte Performance-Hooks für Debouncing und Throttling

import { useCallback, useRef, useEffect, useState } from 'react';

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
) => {
  const {
    leading = false,
    trailing = true,
    maxWait,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastCallArgsRef = useRef<Parameters<T>>();

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;

    // Leading call
    if (leading && timeSinceLastCall >= delay) {
      lastCallTimeRef.current = now;
      callback(...args);
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Store arguments for trailing call
    lastCallArgsRef.current = args;

    // Set new timeout
    const timeoutDelay = maxWait 
      ? Math.min(delay, Math.max(0, maxWait - timeSinceLastCall))
      : delay;

    timeoutRef.current = setTimeout(() => {
      if (trailing && lastCallArgsRef.current) {
        lastCallTimeRef.current = Date.now();
        callback(...lastCallArgsRef.current);
        lastCallArgsRef.current = undefined;
      }
    }, timeoutDelay);
  }, [callback, delay, leading, trailing, maxWait]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Cancel function
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    lastCallArgsRef.current = undefined;
  }, []);

  // Flush function (execute immediately)
  const flush = useCallback(() => {
    if (lastCallArgsRef.current) {
      callback(...lastCallArgsRef.current);
      lastCallArgsRef.current = undefined;
    }
    cancel();
  }, [callback, cancel]);

  return {
    callback: debouncedCallback,
    cancel,
    flush,
    isPending: !!timeoutRef.current,
  };
};

// ============================================================================
// THROTTLE HOOK
// ============================================================================

export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
) => {
  const {
    leading = true,
    trailing = true,
  } = options;

  const lastCallTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCallArgsRef = useRef<Parameters<T>>();

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;

    // Leading call
    if (leading && timeSinceLastCall >= delay) {
      lastCallTimeRef.current = now;
      callback(...args);
      return;
    }

    // Store arguments for trailing call
    lastCallArgsRef.current = args;

    // If no timeout is set, set one for trailing call
    if (!timeoutRef.current && trailing) {
      timeoutRef.current = setTimeout(() => {
        if (lastCallArgsRef.current) {
          lastCallTimeRef.current = Date.now();
          callback(...lastCallArgsRef.current);
          lastCallArgsRef.current = undefined;
        }
        timeoutRef.current = undefined;
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay, leading, trailing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Cancel function
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    lastCallArgsRef.current = undefined;
  }, []);

  // Flush function (execute immediately)
  const flush = useCallback(() => {
    if (lastCallArgsRef.current) {
      callback(...lastCallArgsRef.current);
      lastCallArgsRef.current = undefined;
    }
    cancel();
  }, [callback, cancel]);

  return {
    callback: throttledCallback,
    cancel,
    flush,
    isPending: !!timeoutRef.current,
  };
};

// ============================================================================
// RAF THROTTLE HOOK (RequestAnimationFrame)
// ============================================================================

export const useRAFThrottle = <T extends (...args: any[]) => any>(
  callback: T
) => {
  const rafIdRef = useRef<number>();
  const lastCallArgsRef = useRef<Parameters<T>>();

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    lastCallArgsRef.current = args;

    if (rafIdRef.current) {
      return; // Already scheduled
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (lastCallArgsRef.current) {
        callback(...lastCallArgsRef.current);
        lastCallArgsRef.current = undefined;
      }
      rafIdRef.current = undefined;
    });
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Cancel function
  const cancel = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = undefined;
    }
    lastCallArgsRef.current = undefined;
  }, []);

  // Flush function (execute immediately)
  const flush = useCallback(() => {
    if (lastCallArgsRef.current) {
      callback(...lastCallArgsRef.current);
      lastCallArgsRef.current = undefined;
    }
    cancel();
  }, [callback, cancel]);

  return {
    callback: throttledCallback,
    cancel,
    flush,
    isPending: !!rafIdRef.current,
  };
};

// ============================================================================
// PERFORMANCE UTILITIES HOOK
// ============================================================================

export const usePerformanceUtils = () => {
  const measureExecution = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    label?: string
  ) => {
    return (...args: Parameters<T>): ReturnType<T> => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      if (label) {
        console.log(`${label} execution time: ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    };
  }, []);

  const createMemoizedCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    deps: any[] = []
  ) => {
    const memoized = useCallback(callback, deps);
    return memoized;
  }, []);

  const batchUpdates = useCallback((updates: (() => void)[]) => {
    // In React 18+ würde man hier React.startTransition verwenden
    // Für ältere Versionen verwenden wir setTimeout mit 0
    setTimeout(() => {
      updates.forEach(update => update());
    }, 0);
  }, []);

  return {
    measureExecution,
    createMemoizedCallback,
    batchUpdates,
  };
};

// ============================================================================
// MEMORY HOOK
// ============================================================================

export const useMemory = () => {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    if ('memory' in performance) {
      const updateMemoryInfo = () => {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      };

      // Only update in development mode to avoid unnecessary overhead
      if (import.meta.env.DEV) {
        updateMemoryInfo();
        const interval = setInterval(updateMemoryInfo, 10000); // Reduced from 1s to 10s
        return () => clearInterval(interval);
      } else {
        // In production, only update once
        updateMemoryInfo();
      }
    }
  }, []);

  const getMemoryUsage = useCallback(() => {
    if (!memoryInfo) return null;
    
    return {
      used: memoryInfo.usedJSHeapSize,
      total: memoryInfo.totalJSHeapSize,
      limit: memoryInfo.jsHeapSizeLimit,
      percentage: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100,
    };
  }, [memoryInfo]);

  return {
    memoryInfo,
    getMemoryUsage,
  };
};
