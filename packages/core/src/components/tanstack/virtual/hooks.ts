import {
  type Virtualizer,
  type VirtualizerOptions,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  useVirtualizer,
} from '@tanstack/react-virtual';
import React from 'react';

// Enhanced virtualizer hook with persistence
export interface UseVirtualizerOptions<TScrollElement extends Element | Window>
  extends VirtualizerOptions<TScrollElement, any> {
  persistKey?: string;
  onScrollEnd?: (offset: number) => void;
  scrollEndDelay?: number;
}

export function useEnhancedVirtualizer<TScrollElement extends Element | Window = HTMLDivElement>(
  options: UseVirtualizerOptions<TScrollElement>
) {
  const {
    persistKey,
    onScrollEnd,
    scrollEndDelay = 150,
    initialOffset,
    ...virtualizerOptions
  } = options;

  // Load persisted offset
  const loadPersistedOffset = (): number => {
    if (!persistKey || typeof window === 'undefined') return initialOffset || 0;

    try {
      const saved = localStorage.getItem(`virtualizer-${persistKey}`);
      return saved ? Number(saved) : initialOffset || 0;
    } catch {
      return initialOffset || 0;
    }
  };

  const persistedOffset = loadPersistedOffset();
  const scrollEndTimeoutRef = React.useRef<NodeJS.Timeout>();

  const virtualizer = useVirtualizer({
    ...virtualizerOptions,
    initialOffset: persistedOffset,
  });

  // Persist scroll offset
  React.useEffect(() => {
    if (!persistKey || typeof window === 'undefined') return;

    const persistOffset = () => {
      localStorage.setItem(`virtualizer-${persistKey}`, String(virtualizer.scrollOffset));
    };

    const handleScroll = () => {
      persistOffset();

      // Handle scroll end
      if (onScrollEnd) {
        if (scrollEndTimeoutRef.current) {
          clearTimeout(scrollEndTimeoutRef.current);
        }

        scrollEndTimeoutRef.current = setTimeout(() => {
          onScrollEnd(virtualizer.scrollOffset ?? 0);
        }, scrollEndDelay);
      }
    };

    const element = virtualizer.scrollElement;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, [virtualizer, persistKey, onScrollEnd, scrollEndDelay]);

  return virtualizer;
}

// Hook for infinite scrolling
export interface UseInfiniteVirtualizerOptions<TScrollElement extends Element | Window>
  extends UseVirtualizerOptions<TScrollElement> {
  loadMore?: () => void | Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
  threshold?: number;
  direction?: 'forward' | 'backward' | 'both';
}

export function useInfiniteVirtualizer<TScrollElement extends Element | Window = HTMLDivElement>(
  options: UseInfiniteVirtualizerOptions<TScrollElement>
) {
  const {
    loadMore,
    hasMore = false,
    isLoading = false,
    threshold = 5,
    direction = 'forward',
    ...virtualizerOptions
  } = options;

  const loadingRef = React.useRef(false);
  const virtualizer = useEnhancedVirtualizer(virtualizerOptions);

  React.useEffect(() => {
    if (!loadMore || !hasMore || isLoading || loadingRef.current) return;

    const items = virtualizer.getVirtualItems();
    if (!items.length) return;

    const lastItem = items[items.length - 1];
    const firstItem = items[0];

    const shouldLoadForward =
      direction !== 'backward' && lastItem.index >= virtualizer.options.count - threshold;

    const shouldLoadBackward = direction !== 'forward' && firstItem.index <= threshold - 1;

    if (shouldLoadForward || shouldLoadBackward) {
      loadingRef.current = true;

      Promise.resolve(loadMore()).finally(() => {
        setTimeout(() => {
          loadingRef.current = false;
        }, 100);
      });
    }
  }, [virtualizer, loadMore, hasMore, isLoading, threshold, direction]);

  return virtualizer;
}

// Hook for bidirectional infinite scrolling
export interface UseBidirectionalInfiniteOptions<TScrollElement extends Element | Window>
  extends Omit<UseInfiniteVirtualizerOptions<TScrollElement>, 'direction'> {
  loadMoreForward?: () => void | Promise<void>;
  loadMoreBackward?: () => void | Promise<void>;
  hasMoreForward?: boolean;
  hasMoreBackward?: boolean;
}

export function useBidirectionalInfiniteVirtualizer<
  TScrollElement extends Element | Window = HTMLDivElement,
>(options: UseBidirectionalInfiniteOptions<TScrollElement>) {
  const {
    loadMoreForward,
    loadMoreBackward,
    hasMoreForward = false,
    hasMoreBackward = false,
    isLoading = false,
    threshold = 5,
    ...virtualizerOptions
  } = options;

  const loadingForwardRef = React.useRef(false);
  const loadingBackwardRef = React.useRef(false);
  const virtualizer = useEnhancedVirtualizer(virtualizerOptions);

  React.useEffect(() => {
    if (isLoading) return;

    const items = virtualizer.getVirtualItems();
    if (!items.length) return;

    const lastItem = items[items.length - 1];
    const firstItem = items[0];

    // Load forward
    if (
      loadMoreForward &&
      hasMoreForward &&
      !loadingForwardRef.current &&
      lastItem.index >= virtualizer.options.count - threshold
    ) {
      loadingForwardRef.current = true;

      Promise.resolve(loadMoreForward()).finally(() => {
        setTimeout(() => {
          loadingForwardRef.current = false;
        }, 100);
      });
    }

    // Load backward
    if (
      loadMoreBackward &&
      hasMoreBackward &&
      !loadingBackwardRef.current &&
      firstItem.index <= threshold - 1
    ) {
      loadingBackwardRef.current = true;

      Promise.resolve(loadMoreBackward()).finally(() => {
        setTimeout(() => {
          loadingBackwardRef.current = false;
        }, 100);
      });
    }
  }, [
    virtualizer,
    loadMoreForward,
    loadMoreBackward,
    hasMoreForward,
    hasMoreBackward,
    isLoading,
    threshold,
  ]);

  return virtualizer;
}

// Hook for dynamic size caching
export function useSizeCache(key?: string) {
  const cacheRef = React.useRef<Map<number, number>>(new Map());

  // Load from localStorage if key provided
  React.useEffect(() => {
    if (!key || typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(`size-cache-${key}`);
      if (saved) {
        const data = JSON.parse(saved);
        cacheRef.current = new Map(data);
      }
    } catch {
      // Ignore errors
    }
  }, [key]);

  const setSize = React.useCallback(
    (index: number, size: number) => {
      cacheRef.current.set(index, size);

      // Persist if key provided
      if (key && typeof window !== 'undefined') {
        try {
          const data = Array.from(cacheRef.current.entries());
          localStorage.setItem(`size-cache-${key}`, JSON.stringify(data));
        } catch {
          // Ignore errors
        }
      }
    },
    [key]
  );

  const getSize = React.useCallback((index: number, defaultSize: number): number => {
    return cacheRef.current.get(index) ?? defaultSize;
  }, []);

  const clearCache = React.useCallback(() => {
    cacheRef.current.clear();

    if (key && typeof window !== 'undefined') {
      localStorage.removeItem(`size-cache-${key}`);
    }
  }, [key]);

  return {
    setSize,
    getSize,
    clearCache,
    cache: cacheRef.current,
  };
}

// Hook for scroll sync between multiple virtualizers
export function useScrollSync<TScrollElement extends Element | Window = HTMLDivElement>(
  virtualizers: Array<Virtualizer<TScrollElement, any>>,
  options?: {
    syncHorizontal?: boolean;
    syncVertical?: boolean;
    disabled?: boolean;
  }
) {
  const { syncHorizontal = true, syncVertical = true, disabled = false } = options || {};

  const syncingRef = React.useRef(false);

  React.useEffect(() => {
    if (disabled || virtualizers.length < 2) return;

    const syncScroll = (sourceIndex: number) => {
      if (syncingRef.current) return;

      syncingRef.current = true;
      const sourceVirtualizer = virtualizers[sourceIndex];
      const sourceElement = sourceVirtualizer.scrollElement;

      if (!sourceElement) {
        syncingRef.current = false;
        return;
      }

      virtualizers.forEach((virtualizer, index) => {
        if (index === sourceIndex) return;

        const element = virtualizer.scrollElement;
        if (!element) return;

        if (syncHorizontal && sourceVirtualizer.options.horizontal) {
          virtualizer.scrollToOffset(sourceVirtualizer.scrollOffset ?? 0, {
            align: 'start',
            behavior: 'auto',
          });
        }

        if (syncVertical && !sourceVirtualizer.options.horizontal) {
          virtualizer.scrollToOffset(sourceVirtualizer.scrollOffset ?? 0, {
            align: 'start',
            behavior: 'auto',
          });
        }
      });

      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    };

    const handlers = virtualizers.map((virtualizer, index) => {
      const handler = () => syncScroll(index);
      const element = virtualizer.scrollElement;

      if (element) {
        element.addEventListener('scroll', handler, { passive: true });
      }

      return { element, handler };
    });

    return () => {
      handlers.forEach(({ element, handler }) => {
        if (element) {
          element.removeEventListener('scroll', handler);
        }
      });
    };
  }, [virtualizers, syncHorizontal, syncVertical, disabled]);
}

// Hook for virtual scroller with dynamic content
export function useDynamicVirtualizer<TScrollElement extends Element | Window = HTMLDivElement>(
  options: UseVirtualizerOptions<TScrollElement> & {
    onItemsRendered?: (startIndex: number, endIndex: number) => void;
    scrollToFn?: (offset: number, behavior?: ScrollBehavior) => void;
  }
) {
  const { onItemsRendered, scrollToFn, ...virtualizerOptions } = options;
  const previousRangeRef = React.useRef<{ start: number; end: number }>({ start: -1, end: -1 });

  const virtualizer = useEnhancedVirtualizer({
    ...virtualizerOptions,
    onChange: (instance) => {
      virtualizerOptions.onChange?.(instance);

      const items = instance.getVirtualItems();
      if (items.length > 0) {
        const start = items[0].index;
        const end = items[items.length - 1].index;

        if (start !== previousRangeRef.current.start || end !== previousRangeRef.current.end) {
          previousRangeRef.current = { start, end };
          onItemsRendered?.(start, end);
        }
      }
    },
  });

  // Custom scroll function
  React.useImperativeHandle(
    scrollToFn ? { current: virtualizer } : null,
    () => ({
      scrollTo: (offset: number, behavior: ScrollBehavior = 'auto') => {
        if (scrollToFn) {
          scrollToFn(offset, behavior);
        } else {
          virtualizer.scrollToOffset(offset, { behavior });
        }
      },
    }),
    [virtualizer, scrollToFn]
  );

  return virtualizer;
}

// Performance monitoring hook
export function useVirtualizerPerformance(virtualizer: Virtualizer<any, any>) {
  const [metrics, setMetrics] = React.useState({
    fps: 0,
    renderTime: 0,
    visibleItems: 0,
    totalItems: 0,
    scrollVelocity: 0,
  });

  const frameCountRef = React.useRef(0);
  const lastFrameTimeRef = React.useRef(performance.now());
  const lastScrollOffsetRef = React.useRef(0);
  const lastScrollTimeRef = React.useRef(performance.now());

  React.useEffect(() => {
    let animationFrameId: number;

    const measurePerformance = () => {
      const now = performance.now();
      const deltaTime = now - lastFrameTimeRef.current;

      // Calculate FPS
      frameCountRef.current++;
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;

        // Calculate scroll velocity
        const scrollDelta = Math.abs((virtualizer.scrollOffset ?? 0) - lastScrollOffsetRef.current);
        const timeDelta = now - lastScrollTimeRef.current;
        const velocity = timeDelta > 0 ? Math.round((scrollDelta / timeDelta) * 1000) : 0;

        lastScrollOffsetRef.current = virtualizer.scrollOffset ?? 0;
        lastScrollTimeRef.current = now;

        const items = virtualizer.getVirtualItems();

        setMetrics({
          fps,
          renderTime: Math.round(virtualizer.measurementsCache.length),
          visibleItems: items.length,
          totalItems: virtualizer.options.count,
          scrollVelocity: velocity,
        });
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    animationFrameId = requestAnimationFrame(measurePerformance);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [virtualizer]);

  return metrics;
}
