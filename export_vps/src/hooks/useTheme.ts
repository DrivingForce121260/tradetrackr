// ============================================================================
// OPTIMIZED THEME HOOKS
// ============================================================================
// Erweiterte und optimierte Theme-Management-Hooks

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// THEME TYPES
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface ThemeOptions {
  storageKey?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  enableTransition?: boolean;
}

// ============================================================================
// MAIN THEME HOOK
// ============================================================================

export const useTheme = (options: ThemeOptions = {}) => {
  const {
    storageKey = 'theme',
    defaultTheme = 'system',
    enableSystem = true,
    enableTransition = true,
  } = options;

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    
    try {
      const stored = localStorage.getItem(storageKey) as Theme;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
    }
    
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Resolve system theme
  useEffect(() => {
    if (theme !== 'system' || !enableSystem) {
      setResolvedTheme(theme === 'dark' ? 'dark' : 'light');
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme, enableSystem]);

  // Apply theme to document
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    if (enableTransition) {
      root.style.transition = 'color-scheme 0.3s ease, background-color 0.3s ease';
    }

    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;

    // Remove transition after animation
    if (enableTransition) {
      const timer = setTimeout(() => {
        root.style.transition = '';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [resolvedTheme, enableTransition]);

  // Save theme to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, [theme, storageKey]);

  const setThemeWithCallback = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'light';
    });
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return enableSystem ? 'system' : 'light';
      return 'light';
    });
  }, [enableSystem]);

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeWithCallback,
    toggleTheme,
    cycleTheme,
    isLight: resolvedTheme === 'light',
    isDark: resolvedTheme === 'dark',
    isSystem: theme === 'system',
  };
};

// ============================================================================
// THEME CONFIGURATION HOOK
// ============================================================================

export const useThemeConfig = (config: ThemeConfig) => {
  const { resolvedTheme } = useTheme();

  const currentTheme = useMemo(() => {
    return config[resolvedTheme] || config.light;
  }, [config, resolvedTheme]);

  const getThemeValue = useCallback((key: string, fallback?: string) => {
    return currentTheme[key] || fallback || '';
  }, [currentTheme]);

  const getThemeValues = useCallback((keys: string[]) => {
    return keys.reduce((acc, key) => {
      acc[key] = currentTheme[key] || '';
      return acc;
    }, {} as Record<string, string>);
  }, [currentTheme]);

  return {
    currentTheme,
    getThemeValue,
    getThemeValues,
    resolvedTheme,
  };
};

// ============================================================================
// THEME UTILITIES HOOK
// ============================================================================

export const useThemeUtils = () => {
  const { resolvedTheme } = useTheme();

  const isSystemDark = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  const getContrastColor = useCallback((backgroundColor: string): 'light' | 'dark' => {
    // Einfache Kontrastberechnung (YIQ-Formel)
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'dark' : 'light';
  }, []);

  const getThemeAwareColor = useCallback((
    lightColor: string,
    darkColor: string
  ): string => {
    return resolvedTheme === 'dark' ? darkColor : lightColor;
  }, [resolvedTheme]);

  const createThemeAwareStyle = useCallback((
    lightStyles: Record<string, string>,
    darkStyles: Record<string, string>
  ) => {
    return resolvedTheme === 'dark' ? darkStyles : lightStyles;
  }, [resolvedTheme]);

  const getThemeTransition = useCallback((duration: string = '0.3s') => {
    return `all ${duration} ease`;
  }, []);

  return {
    isSystemDark,
    getContrastColor,
    getThemeAwareColor,
    createThemeAwareStyle,
    getThemeTransition,
    resolvedTheme,
  };
};

// ============================================================================
// THEME PREFERENCE HOOK
// ============================================================================

export const useThemePreference = () => {
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updatePreference = () => {
      setSystemPreference(mediaQuery.matches ? 'dark' : 'light');
    };

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  const prefersLight = useMemo(() => systemPreference === 'light', [systemPreference]);
  const prefersDark = useMemo(() => systemPreference === 'dark', [systemPreference]);

  return {
    systemPreference,
    prefersLight,
    prefersDark,
  };
};

// ============================================================================
// THEME FACTORY HOOK
// ============================================================================

export const createThemeHook = (defaultOptions: ThemeOptions = {}) => {
  return (options: ThemeOptions = {}) => {
    return useTheme({ ...defaultOptions, ...options });
  };
};

// ============================================================================
// THEME CONTEXT HOOK
// ============================================================================

export const useThemeContext = () => {
  const theme = useTheme();
  const themeUtils = useThemeUtils();
  const themePreference = useThemePreference();

  return {
    ...theme,
    ...themeUtils,
    ...themePreference,
  };
};
