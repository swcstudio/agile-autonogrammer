import {
  type VirtualItem,
  Virtualizer,
  VirtualizerOptions,
  useVirtualizer,
} from '@tanstack/react-virtual';
import React from 'react';
import { cn } from '../../../utils/cn';

export interface VirtualListProps<T> {
  items: T[];
  height?: number | string;
  width?: number | string;
  itemHeight?: number | ((index: number, item: T) => number);
  overscan?: number;
  gap?: number;
  horizontal?: boolean;
  className?: string;
  containerClassName?: string;
  itemClassName?: string;
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  scrollToIndex?: number;
  scrollToAlignment?: 'start' | 'center' | 'end' | 'auto';
  scrollToBehavior?: 'auto' | 'smooth';
  loadMore?: () => void;
  hasMore?: boolean;
  loadMoreThreshold?: number;
  isLoading?: boolean;
  renderLoader?: () => React.ReactNode;
  debug?: boolean;
}

export function VirtualList<T>({
  items,
  height = 400,
  width = '100%',
  itemHeight = 50,
  overscan = 5,
  gap = 0,
  horizontal = false,
  className,
  containerClassName,
  itemClassName,
  renderItem,
  renderEmpty,
  onScroll,
  scrollToIndex,
  scrollToAlignment = 'auto',
  scrollToBehavior = 'auto',
  loadMore,
  hasMore = false,
  loadMoreThreshold = 200,
  isLoading = false,
  renderLoader,
  debug = false,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const scrollingRef = React.useRef(false);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: React.useCallback(
      (index: number) => {
        if (typeof itemHeight === 'function') {
          return itemHeight(index, items[index]);
        }
        return itemHeight;
      },
      [itemHeight, items]
    ),
    overscan,
    horizontal,
    gap,
    scrollPaddingStart: 0,
    scrollPaddingEnd: 0,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Handle scroll to index
  React.useEffect(() => {
    if (scrollToIndex !== undefined && scrollToIndex >= 0 && scrollToIndex < items.length) {
      virtualizer.scrollToIndex(scrollToIndex, {
        align: scrollToAlignment,
        behavior: scrollToBehavior,
      });
    }
  }, [scrollToIndex, scrollToAlignment, scrollToBehavior, virtualizer, items.length]);

  // Handle infinite scroll
  React.useEffect(() => {
    if (!loadMore || !hasMore || isLoading || !parentRef.current) return;

    const handleScroll = () => {
      if (!parentRef.current || scrollingRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;

      if (scrollBottom < loadMoreThreshold) {
        scrollingRef.current = true;
        loadMore();
        setTimeout(() => {
          scrollingRef.current = false;
        }, 100);
      }
    };

    const scrollElement = parentRef.current;
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [loadMore, hasMore, isLoading, loadMoreThreshold]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(event);
  };

  if (items.length === 0 && renderEmpty) {
    return (
      <div
        className={cn('flex items-center justify-center', containerClassName)}
        style={{ height, width }}
      >
        {renderEmpty()}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn(
        'overflow-auto',
        horizontal ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden',
        containerClassName
      )}
      style={{ height, width }}
      onScroll={handleScroll}
    >
      <div
        className={cn('relative', className)}
        style={{
          [horizontal ? 'width' : 'height']: `${totalSize}px`,
          [horizontal ? 'height' : 'width']: '100%',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              className={cn('absolute top-0 left-0', itemClassName)}
              style={{
                [horizontal ? 'left' : 'top']: `${virtualItem.start}px`,
                [horizontal ? 'width' : 'height']: `${virtualItem.size}px`,
                [horizontal ? 'height' : 'width']: '100%',
              }}
            >
              {renderItem(item, virtualItem.index, virtualItem)}
            </div>
          );
        })}

        {isLoading && renderLoader && (
          <div
            className="absolute"
            style={{
              [horizontal ? 'left' : 'top']: `${totalSize}px`,
              [horizontal ? 'width' : 'height']: '100px',
              [horizontal ? 'height' : 'width']: '100%',
            }}
          >
            {renderLoader()}
          </div>
        )}
      </div>

      {debug && (
        <div className="absolute top-0 right-0 bg-black/75 text-white text-xs p-2 m-2 rounded">
          <div>Total: {items.length}</div>
          <div>Visible: {virtualItems.length}</div>
          <div>Start: {virtualItems[0]?.index ?? 0}</div>
          <div>End: {virtualItems[virtualItems.length - 1]?.index ?? 0}</div>
        </div>
      )}
    </div>
  );
}

// Window virtualizer for full-page lists
export interface WindowVirtualListProps<T> extends Omit<VirtualListProps<T>, 'height' | 'width'> {
  scrollElement?: HTMLElement | Window;
  scrollMargin?: number;
}

export function WindowVirtualList<T>({
  items,
  itemHeight = 50,
  overscan = 5,
  gap = 0,
  horizontal = false,
  className,
  itemClassName,
  renderItem,
  renderEmpty,
  scrollElement,
  scrollMargin = 0,
  debug = false,
  ...props
}: WindowVirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement || window,
    estimateSize: React.useCallback(
      (index: number) => {
        if (typeof itemHeight === 'function') {
          return itemHeight(index, items[index]);
        }
        return itemHeight;
      },
      [itemHeight, items]
    ),
    overscan,
    horizontal,
    gap,
    scrollMargin,
    observeElementRect: (instance, cb) => {
      if (!parentRef.current) return;

      const element = parentRef.current;
      const observer = new ResizeObserver(() => {
        cb(element.getBoundingClientRect());
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    },
    observeElementOffset: (instance, cb) => {
      const element = instance.scrollElement;
      if (!element) return;

      const handler = () => {
        if (element === window) {
          cb(window.scrollY);
        } else if (element instanceof HTMLElement) {
          cb(element.scrollTop);
        }
      };

      handler();
      element.addEventListener('scroll', handler, { passive: true });

      return () => {
        element.removeEventListener('scroll', handler);
      };
    },
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0 && renderEmpty) {
    return <div className="flex items-center justify-center py-20">{renderEmpty()}</div>;
  }

  return (
    <div ref={parentRef} className={cn('relative', className)}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              className={cn('absolute top-0 left-0 w-full', itemClassName)}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
                height: `${virtualItem.size}px`,
              }}
            >
              {renderItem(item, virtualItem.index, virtualItem)}
            </div>
          );
        })}
      </div>

      {debug && (
        <div className="fixed top-0 right-0 bg-black/75 text-white text-xs p-2 m-2 rounded z-50">
          <div>Total: {items.length}</div>
          <div>Visible: {virtualItems.length}</div>
          <div>Start: {virtualItems[0]?.index ?? 0}</div>
          <div>End: {virtualItems[virtualItems.length - 1]?.index ?? 0}</div>
          <div>Scroll: {virtualizer.scrollOffset ?? 0}</div>
        </div>
      )}
    </div>
  );
}

// Masonry virtualizer for Pinterest-like layouts
export interface VirtualMasonryProps<T> {
  items: T[];
  columnCount?: number;
  columnWidth?: number;
  gap?: number;
  overscan?: number;
  height?: number | string;
  width?: number | string;
  className?: string;
  containerClassName?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateItemHeight: (item: T, index: number) => number;
  renderEmpty?: () => React.ReactNode;
}

export function VirtualMasonry<T>({
  items,
  columnCount: fixedColumnCount,
  columnWidth = 250,
  gap = 16,
  overscan = 5,
  height = 600,
  width = '100%',
  className,
  containerClassName,
  renderItem,
  estimateItemHeight,
  renderEmpty,
}: VirtualMasonryProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Calculate column count based on container width
  const calculatedColumnCount = React.useMemo(() => {
    if (fixedColumnCount) return fixedColumnCount;
    if (!containerWidth) return 1;
    return Math.max(1, Math.floor((containerWidth + gap) / (columnWidth + gap)));
  }, [fixedColumnCount, containerWidth, columnWidth, gap]);

  // Observe container width
  React.useEffect(() => {
    if (!parentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(parentRef.current);
    setContainerWidth(parentRef.current.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  // Calculate item positions
  const itemPositions = React.useMemo(() => {
    const columns: number[] = new Array(calculatedColumnCount).fill(0);
    const positions: Array<{ top: number; left: number; height: number }> = [];

    items.forEach((item, index) => {
      const shortestColumnIndex = columns.indexOf(Math.min(...columns));
      const itemHeight = estimateItemHeight(item, index);

      positions.push({
        top: columns[shortestColumnIndex],
        left: shortestColumnIndex * (columnWidth + gap),
        height: itemHeight,
      });

      columns[shortestColumnIndex] += itemHeight + gap;
    });

    return { positions, totalHeight: Math.max(...columns) };
  }, [items, calculatedColumnCount, columnWidth, gap, estimateItemHeight]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => itemPositions.positions[index]?.height || 100,
    overscan,
    measureElement:
      typeof window !== 'undefined' && window.ResizeObserver
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0 && renderEmpty) {
    return (
      <div
        className={cn('flex items-center justify-center', containerClassName)}
        style={{ height, width }}
      >
        {renderEmpty()}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', containerClassName)}
      style={{ height, width }}
    >
      <div
        className={cn('relative', className)}
        style={{
          height: `${itemPositions.totalHeight}px`,
          width: `${calculatedColumnCount * columnWidth + (calculatedColumnCount - 1) * gap}px`,
          margin: '0 auto',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          const position = itemPositions.positions[virtualItem.index];

          if (!position) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              className="absolute"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${columnWidth}px`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
