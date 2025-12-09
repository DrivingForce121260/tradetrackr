import { useState, useRef, useEffect, useCallback } from 'react';

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance in pixels to trigger refresh (default: 80)
  enabled?: boolean; // Enable/disable pull-to-refresh (default: true)
  resistance?: number; // Resistance factor for pull (default: 2.5)
}

export interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    style?: React.CSSProperties;
  };
}

/**
 * Hook for implementing pull-to-refresh functionality on mobile devices
 * 
 * @example
 * ```tsx
 * const { isRefreshing, containerProps } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await loadData();
 *   },
 *   threshold: 80,
 * });
 * 
 * return (
 *   <div {...containerProps}>
 *     {isRefreshing && <Spinner />}
 *     Your content here
 *   </div>
 * );
 * ```
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
  resistance = 2.5,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [canRefresh, setCanRefresh] = useState(false);
  
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);
  const scrollTop = useRef<number>(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const target = e.currentTarget as HTMLElement;
    containerRef.current = target;
    startY.current = e.touches[0].clientY;
    scrollTop.current = target.scrollTop;
    isPulling.current = false;
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    const target = e.currentTarget as HTMLElement;
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    // Only allow pull-to-refresh if scrolled to top
    if (scrollTop.current <= 0 && deltaY > 0) {
      isPulling.current = true;
      e.preventDefault(); // Prevent default scroll behavior
      
      // Apply resistance
      const distance = Math.min(deltaY / resistance, threshold * 1.5);
      setPullDistance(distance);
      setCanRefresh(distance >= threshold);
    } else if (isPulling.current && deltaY <= 0) {
      // Reset if user scrolls back up
      setPullDistance(0);
      setCanRefresh(false);
      isPulling.current = false;
    }
  }, [enabled, isRefreshing, threshold, resistance]);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!enabled || !isPulling.current) return;
    
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setCanRefresh(false);
        isPulling.current = false;
      }
    } else {
      // Snap back if not enough pull distance
      setPullDistance(0);
      setCanRefresh(false);
      isPulling.current = false;
    }
  }, [enabled, canRefresh, isRefreshing, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    canRefresh,
    containerProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      style: {
        transform: `translateY(${pullDistance}px)`,
        transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
      },
    },
  };
}

