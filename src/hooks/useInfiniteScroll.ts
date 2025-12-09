import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => Promise<void> | void;
  threshold?: number; // Distance from bottom to trigger load (default: 200px)
  enabled?: boolean; // Enable/disable infinite scroll (default: true)
  rootMargin?: string; // IntersectionObserver rootMargin (default: '200px')
}

export interface UseInfiniteScrollReturn {
  isLoadingMore: boolean;
  hasMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for implementing infinite scroll functionality
 * 
 * @example
 * ```tsx
 * const { isLoadingMore, sentinelRef } = useInfiniteScroll({
 *   hasMore: currentPage < totalPages,
 *   loading: isLoading,
 *   onLoadMore: async () => {
 *     await loadNextPage();
 *   },
 * });
 * 
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={sentinelRef} />
 *     {isLoadingMore && <Spinner />}
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  threshold = 200,
  enabled = true,
  rootMargin = '200px',
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isLoadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || loading) return;
    
    isLoadingRef.current = true;
    setIsLoadingMore(true);
    
    try {
      await onLoadMore();
    } catch (error) {
      console.error('Infinite scroll load error:', error);
    } finally {
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [hasMore, loading, onLoadMore]);

  useEffect(() => {
    if (!enabled || !hasMore) {
      // Clean up observer if disabled or no more items
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Create IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingRef.current && !loading) {
          loadMore();
        }
      },
      {
        root: null, // Use viewport as root
        rootMargin,
        threshold: 0.1,
      }
    );

    observerRef.current.observe(sentinel);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [enabled, hasMore, loading, loadMore, rootMargin]);

  return {
    isLoadingMore,
    hasMore,
    sentinelRef,
  };
}







