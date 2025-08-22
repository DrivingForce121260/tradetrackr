// ============================================================================
// OPTIMIZED RESPONSIVE HOOKS
// ============================================================================
// Erweiterte und optimierte responsive Design-Hooks

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// BREAKPOINT CONFIGURATION
// ============================================================================

export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ============================================================================
// MAIN MOBILE HOOK
// ============================================================================

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return !!isMobile;
};

// ============================================================================
// BREAKPOINT HOOK
// ============================================================================

export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('md');
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });
      
      // Bestimme aktuellen Breakpoint
      if (width >= BREAKPOINTS['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= BREAKPOINTS.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= BREAKPOINTS.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= BREAKPOINTS.md) {
        setCurrentBreakpoint('md');
      } else if (width >= BREAKPOINTS.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const isBreakpoint = useCallback((breakpoint: Breakpoint): boolean => {
    return currentBreakpoint === breakpoint;
  }, [currentBreakpoint]);

  const isBreakpointOrAbove = useCallback((breakpoint: Breakpoint): boolean => {
    return windowSize.width >= BREAKPOINTS[breakpoint];
  }, [windowSize.width]);

  const isBreakpointOrBelow = useCallback((breakpoint: Breakpoint): boolean => {
    return windowSize.width <= BREAKPOINTS[breakpoint];
  }, [windowSize.width]);

  const isBetweenBreakpoints = useCallback((
    min: Breakpoint, 
    max: Breakpoint
  ): boolean => {
    return windowSize.width >= BREAKPOINTS[min] && windowSize.width < BREAKPOINTS[max];
  }, [windowSize.width]);

  return {
    currentBreakpoint,
    windowSize,
    isBreakpoint,
    isBreakpointOrAbove,
    isBreakpointOrBelow,
    isBetweenBreakpoints,
    isMobile: currentBreakpoint === 'xs' || currentBreakpoint === 'sm',
    isTablet: currentBreakpoint === 'md',
    isDesktop: currentBreakpoint === 'lg' || currentBreakpoint === 'xl' || currentBreakpoint === '2xl',
  };
};

// ============================================================================
// MEDIA QUERY HOOK
// ============================================================================

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

// ============================================================================
// RESPONSIVE UTILITIES HOOK
// ============================================================================

export const useResponsiveUtils = () => {
  const { currentBreakpoint, windowSize } = useBreakpoint();

  const getResponsiveValue = useCallback(<T>(
    values: Partial<Record<Breakpoint, T>>,
    defaultValue: T
  ): T => {
    // Versuche den aktuellen Breakpoint
    if (values[currentBreakpoint] !== undefined) {
      return values[currentBreakpoint]!;
    }

    // Fallback: Nimm den nächstkleineren verfügbaren Wert
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const breakpoint = breakpointOrder[i];
      if (values[breakpoint] !== undefined) {
        return values[breakpoint]!;
      }
    }

    return defaultValue;
  }, [currentBreakpoint]);

  const getResponsiveClass = useCallback((
    baseClass: string,
    responsiveClasses: Partial<Record<Breakpoint, string>>
  ): string => {
    const responsiveClass = getResponsiveValue(responsiveClasses, '');
    return `${baseClass} ${responsiveClass}`.trim();
  }, [getResponsiveValue]);

  const isLandscape = useMemo(() => {
    return windowSize.width > windowSize.height;
  }, [windowSize.width, windowSize.height]);

  const isPortrait = useMemo(() => {
    return windowSize.height > windowSize.width;
  }, [windowSize.width, windowSize.height]);

  const aspectRatio = useMemo(() => {
    return windowSize.width / windowSize.height;
  }, [windowSize.width, windowSize.height]);

  return {
    getResponsiveValue,
    getResponsiveClass,
    isLandscape,
    isPortrait,
    aspectRatio,
  };
};

// ============================================================================
// ORIENTATION HOOK
// ============================================================================

export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
};
