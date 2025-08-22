// ============================================================================
// OPTIMIZED EVENT HOOKS
// ============================================================================
// Erweiterte und optimierte Event-Handling-Hooks

import { useEffect, useRef, useCallback, useState } from 'react';

// ============================================================================
// CLICK OUTSIDE HOOK
// ============================================================================

export const useClickOutside = (
  ref: React.RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void,
  options: {
    enabled?: boolean;
    eventType?: 'mousedown' | 'mouseup' | 'click';
  } = {}
) => {
  const { enabled = true, eventType = 'mousedown' } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener(eventType, listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener(eventType, listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled, eventType]);
};

// ============================================================================
// KEY PRESS HOOK
// ============================================================================

export const useKeyPress = (
  targetKey: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: {
    target?: EventTarget;
    event?: 'keydown' | 'keyup' | 'keypress';
    enabled?: boolean;
    modifier?: 'ctrl' | 'alt' | 'shift' | 'meta';
  } = {}
) => {
  const { target = document, event = 'keydown', enabled = true, modifier } = options;
  const targetKeys = Array.isArray(targetKey) ? targetKey : [targetKey];

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasModifier = !modifier || event[`${modifier}Key`];

      if (targetKeys.some(target => target.toLowerCase() === key) && hasModifier) {
        handler(event);
      }
    };

    target.addEventListener(event, listener);
    return () => target.removeEventListener(event, listener);
  }, [targetKeys, handler, target, event, enabled, modifier]);
};

// ============================================================================
// SCROLL HOOK
// ============================================================================

export const useScroll = (
  options: {
    target?: EventTarget;
    enabled?: boolean;
    throttle?: number;
  } = {}
) => {
  const { target = window, enabled = true, throttle = 16 } = options;
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const currentPosition = {
        x: target === window ? window.pageXOffset : (target as Element).scrollLeft || 0,
        y: target === window ? window.pageYOffset : (target as Element).scrollTop || 0,
      };

      // Determine scroll direction
      if (currentPosition.y > lastScrollPosition.current.y) {
        setScrollDirection('down');
      } else if (currentPosition.y < lastScrollPosition.current.y) {
        setScrollDirection('up');
      } else if (currentPosition.x > lastScrollPosition.current.x) {
        setScrollDirection('right');
      } else if (currentPosition.x < lastScrollPosition.current.x) {
        setScrollDirection('left');
      }

      setScrollPosition(currentPosition);
      lastScrollPosition.current = currentPosition;
      setIsScrolling(true);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to mark scrolling as stopped
      timeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        setScrollDirection(null);
      }, throttle);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [target, enabled, throttle]);

  const scrollTo = useCallback((x: number, y: number, behavior: ScrollBehavior = 'smooth') => {
    if (target === window) {
      window.scrollTo({ left: x, top: y, behavior });
    } else {
      (target as Element).scrollTo({ left: x, top: y, behavior });
    }
  }, [target]);

  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollTo(0, 0, behavior);
  }, [scrollTo]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (target === window) {
      const height = document.documentElement.scrollHeight;
      window.scrollTo({ top: height, behavior });
    } else {
      const element = target as Element;
      element.scrollTo({ top: element.scrollHeight, behavior });
    }
  }, [target, scrollTo]);

  return {
    scrollPosition,
    scrollDirection,
    isScrolling,
    scrollTo,
    scrollToTop,
    scrollToBottom,
  };
};

// ============================================================================
// RESIZE HOOK
// ============================================================================

export const useResize = (
  options: {
    target?: EventTarget;
    enabled?: boolean;
    debounce?: number;
  } = {}
) => {
  const { target = window, enabled = true, debounce = 100 } = options;
  const [dimensions, setDimensions] = useState({
    width: target === window ? window.innerWidth : (target as Element).clientWidth || 0,
    height: target === window ? window.innerHeight : (target as Element).clientHeight || 0,
  });
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) return;

    const handleResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const newDimensions = {
          width: target === window ? window.innerWidth : (target as Element).clientWidth || 0,
          height: target === window ? window.innerHeight : (target as Element).clientHeight || 0,
        };
        setDimensions(newDimensions);
      }, debounce);
    };

    target.addEventListener('resize', handleResize);
    return () => {
      target.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [target, enabled, debounce]);

  return dimensions;
};

// ============================================================================
// FOCUS HOOK
// ============================================================================

export const useFocus = (
  ref: React.RefObject<HTMLElement>,
  options: {
    enabled?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
  } = {}
) => {
  const { enabled = true, onFocus, onBlur } = options;
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;

    const handleFocus = () => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, [ref, enabled, onFocus, onBlur]);

  const focus = useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  const blur = useCallback(() => {
    ref.current?.blur();
  }, [ref]);

  return {
    isFocused,
    focus,
    blur,
  };
};

// ============================================================================
// HOVER HOOK
// ============================================================================

export const useHover = (
  ref: React.RefObject<HTMLElement>,
  options: {
    enabled?: boolean;
    onEnter?: () => void;
    onLeave?: () => void;
  } = {}
) => {
  const { enabled = true, onEnter, onLeave } = options;
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;

    const handleMouseEnter = () => {
      setIsHovered(true);
      onEnter?.();
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      onLeave?.();
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, enabled, onEnter, onLeave]);

  return { isHovered };
};

// ============================================================================
// EVENT UTILITIES HOOK
// ============================================================================

export const useEventUtils = () => {
  const preventDefault = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  const stopPropagation = useCallback((event: Event) => {
    event.stopPropagation();
  }, []);

  const stopImmediatePropagation = useCallback((event: Event) => {
    event.stopImmediatePropagation();
  }, []);

  const createEventWrapper = useCallback(<T extends Event>(
    handler: (event: T) => void,
    options: {
      preventDefault?: boolean;
      stopPropagation?: boolean;
      stopImmediatePropagation?: boolean;
    } = {}
  ) => {
    return (event: T) => {
      if (options.preventDefault) preventDefault(event);
      if (options.stopPropagation) stopPropagation(event);
      if (options.stopImmediatePropagation) stopImmediatePropagation(event);
      handler(event);
    };
  }, [preventDefault, stopPropagation, stopImmediatePropagation]);

  return {
    preventDefault,
    stopPropagation,
    stopImmediatePropagation,
    createEventWrapper,
  };
};
