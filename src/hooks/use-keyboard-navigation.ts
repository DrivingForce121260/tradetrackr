import { useEffect, useCallback, useRef } from 'react';

export interface UseKeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
  trapFocus?: boolean;
  focusableSelector?: string;
}

/**
 * Hook for keyboard navigation support
 * Handles Escape key, Enter key, and focus trapping
 */
export function useKeyboardNavigation({
  onEscape,
  onEnter,
  enabled = true,
  trapFocus = false,
  focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
}: UseKeyboardNavigationOptions = {}) {
  const containerRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Escape key
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      // Enter key (only on form elements or buttons)
      if (e.key === 'Enter' && onEnter) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'BUTTON' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT'
        ) {
          // Don't trigger if it's a textarea (allow line breaks)
          if (target.tagName === 'TEXTAREA') {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          onEnter();
        }
      }

      // Tab key - focus trapping
      if (trapFocus && e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          focusableSelector
        ) as NodeListOf<HTMLElement>;

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [enabled, onEscape, onEnter, trapFocus, focusableSelector]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return { containerRef };
}

/**
 * Hook for focus trap in modals/dialogs
 */
export function useFocusTrap(enabled: boolean = true) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    // Focus first element when trap is enabled
    const firstElement = focusableElements[0];
    firstElement.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => {
      container.removeEventListener('keydown', handleTab);
    };
  }, [enabled]);

  return containerRef;
}







