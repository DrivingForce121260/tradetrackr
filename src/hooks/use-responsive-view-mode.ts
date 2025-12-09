import { useState, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

/**
 * Hook to automatically switch between table and cards view based on screen size
 * On mobile (< 1024px), automatically shows cards view
 * On desktop (>= 1024px), respects user preference
 * 
 * @param defaultViewMode - Default view mode preference ('table' | 'cards')
 * @returns [effectiveViewMode, setViewMode, isMobile]
 */
export function useResponsiveViewMode(
  defaultViewMode: 'table' | 'cards' = 'table'
): ['table' | 'cards', (mode: 'table' | 'cards') => void, boolean] {
  const isMobile = useIsMobile();
  const [userPreference, setUserPreference] = useState<'table' | 'cards'>(defaultViewMode);

  // On mobile, always use cards view
  // On desktop, use user preference
  const effectiveViewMode = isMobile ? 'cards' : userPreference;

  // Update user preference
  const setViewMode = (mode: 'table' | 'cards') => {
    setUserPreference(mode);
    // Optionally save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('tradetrackr_view_mode_preference', mode);
    }
  };

  // Load user preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tradetrackr_view_mode_preference');
      if (saved === 'table' || saved === 'cards') {
        setUserPreference(saved);
      }
    }
  }, []);

  return [effectiveViewMode, setViewMode, isMobile];
}







