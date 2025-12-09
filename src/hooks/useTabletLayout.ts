import { useState, useEffect } from 'react';

export interface UseTabletLayoutOptions {
  breakpoint?: number; // Tablet breakpoint in pixels (default: 768)
  twoColumnBreakpoint?: number; // Breakpoint for two-column layout (default: 1024)
}

export interface UseTabletLayoutReturn {
  isTablet: boolean;
  isTwoColumn: boolean;
  isMobile: boolean;
  isDesktop: boolean;
}

/**
 * Hook for detecting tablet and optimizing layout accordingly
 * 
 * @example
 * ```tsx
 * const { isTablet, isTwoColumn } = useTabletLayout();
 * 
 * return (
 *   <div className={isTwoColumn ? 'grid grid-cols-2 gap-4' : 'flex flex-col'}>
 *     Content here
 *   </div>
 * );
 * ```
 */
export function useTabletLayout({
  breakpoint = 768,
  twoColumnBreakpoint = 1024,
}: UseTabletLayoutOptions = {}): UseTabletLayoutReturn {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isMobile = windowWidth < breakpoint;
  const isTablet = windowWidth >= breakpoint && windowWidth < twoColumnBreakpoint;
  const isTwoColumn = windowWidth >= twoColumnBreakpoint;
  const isDesktop = windowWidth >= 1280; // Large desktop

  return {
    isTablet,
    isTwoColumn,
    isMobile,
    isDesktop,
  };
}

