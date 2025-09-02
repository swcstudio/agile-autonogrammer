import { type VirtualItem, useVirtualizer } from '@tanstack/react-virtual';
import React from 'react';
import { cn } from '../../../utils/cn';

export interface VirtualGridProps<T> {
  items: T[];
  columnCount?: number;
  rowHeight?: number | ((rowIndex: number) => number);
  columnWidth?: number | ((columnIndex: number) => number);
  height?: number | string;
  width?: number | string;
  gap?: number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  cellClassName?: string;
  renderCell: (
    item: T,
    rowIndex: number,
    columnIndex: number,
    virtualRow: VirtualItem,
    virtualColumn: VirtualItem
  ) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  scrollToRow?: number;
  scrollToColumn?: number;
  scrollToAlignment?: 'start' | 'center' | 'end' | 'auto';
  scrollToBehavior?: 'auto' | 'smooth';
  debug?: boolean;
}

export function VirtualGrid<T>({
  items,
  columnCount = 3,
  rowHeight = 100,
  columnWidth,
  height = 600,
  width = '100%',
  gap = 0,
  overscan = 5,
  className,
  containerClassName,
  cellClassName,
  renderCell,
  renderEmpty,
  scrollToRow,
  scrollToColumn,
  scrollToAlignment = 'auto',
  scrollToBehavior = 'auto',
  debug = false,
}: VirtualGridProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Calculate dimensions
  const rowCount = Math.ceil(items.length / columnCount);

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: React.useCallback(
      (index: number) => {
        if (typeof rowHeight === 'function') {
          return rowHeight(index);
        }
        return rowHeight;
      },
      [rowHeight]
    ),
    overscan,
    gap,
  });

  // Column virtualizer
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columnCount,
    getScrollElement: () => parentRef.current,
    estimateSize: React.useCallback(
      (index: number) => {
        if (typeof columnWidth === 'function') {
          return columnWidth(index);
        }
        if (columnWidth) {
          return columnWidth;
        }
        // Auto-calculate column width based on container
        if (parentRef.current) {
          const containerWidth = parentRef.current.clientWidth;
          return (containerWidth - gap * (columnCount - 1)) / columnCount;
        }
        return 100;
      },
      [columnWidth, columnCount, gap]
    ),
    overscan,
    gap,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();

  // Handle scroll to cell
  React.useEffect(() => {
    if (scrollToRow !== undefined && scrollToRow >= 0 && scrollToRow < rowCount) {
      rowVirtualizer.scrollToIndex(scrollToRow, {
        align: scrollToAlignment,
        behavior: scrollToBehavior,
      });
    }
  }, [scrollToRow, scrollToAlignment, scrollToBehavior, rowVirtualizer, rowCount]);

  React.useEffect(() => {
    if (scrollToColumn !== undefined && scrollToColumn >= 0 && scrollToColumn < columnCount) {
      columnVirtualizer.scrollToIndex(scrollToColumn, {
        align: scrollToAlignment,
        behavior: scrollToBehavior,
      });
    }
  }, [scrollToColumn, scrollToAlignment, scrollToBehavior, columnVirtualizer, columnCount]);

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
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize()}px`,
        }}
      >
        {virtualRows.map((virtualRow) => (
          <React.Fragment key={virtualRow.key}>
            {virtualColumns.map((virtualColumn) => {
              const itemIndex = virtualRow.index * columnCount + virtualColumn.index;
              const item = items[itemIndex];

              if (!item) return null;

              return (
                <div
                  key={`${virtualRow.key}-${virtualColumn.key}`}
                  className={cn('absolute', cellClassName)}
                  style={{
                    top: `${virtualRow.start}px`,
                    left: `${virtualColumn.start}px`,
                    width: `${virtualColumn.size}px`,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  {renderCell(
                    item,
                    virtualRow.index,
                    virtualColumn.index,
                    virtualRow,
                    virtualColumn
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {debug && (
        <div className="absolute top-0 right-0 bg-black/75 text-white text-xs p-2 m-2 rounded">
          <div>Total Items: {items.length}</div>
          <div>
            Grid: {rowCount}x{columnCount}
          </div>
          <div>Visible Rows: {virtualRows.length}</div>
          <div>Visible Cols: {virtualColumns.length}</div>
          <div>
            Row Range: {virtualRows[0]?.index ?? 0}-
            {virtualRows[virtualRows.length - 1]?.index ?? 0}
          </div>
          <div>
            Col Range: {virtualColumns[0]?.index ?? 0}-
            {virtualColumns[virtualColumns.length - 1]?.index ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}

// Dynamic grid with responsive columns
export interface DynamicVirtualGridProps<T> extends Omit<VirtualGridProps<T>, 'columnCount'> {
  minColumnWidth?: number;
  maxColumnWidth?: number;
  minColumns?: number;
  maxColumns?: number;
}

export function DynamicVirtualGrid<T>({
  items,
  minColumnWidth = 200,
  maxColumnWidth = 400,
  minColumns = 1,
  maxColumns = 10,
  gap = 16,
  ...props
}: DynamicVirtualGridProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = React.useState(minColumns);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;

        // Calculate optimal column count
        let columns = Math.floor((containerWidth + gap) / (minColumnWidth + gap));
        columns = Math.max(minColumns, Math.min(maxColumns, columns));

        // Adjust column width to fit container
        const columnWidth = (containerWidth - gap * (columns - 1)) / columns;

        if (columnWidth <= maxColumnWidth) {
          setColumnCount(columns);
        } else {
          // If columns are too wide, add more columns
          columns = Math.ceil((containerWidth + gap) / (maxColumnWidth + gap));
          columns = Math.min(maxColumns, columns);
          setColumnCount(columns);
        }
      }
    });

    observer.observe(containerRef.current);

    // Initial calculation
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    let columns = Math.floor((containerWidth + gap) / (minColumnWidth + gap));
    columns = Math.max(minColumns, Math.min(maxColumns, columns));
    setColumnCount(columns);

    return () => observer.disconnect();
  }, [minColumnWidth, maxColumnWidth, minColumns, maxColumns, gap]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <VirtualGrid {...props} items={items} columnCount={columnCount} gap={gap} />
    </div>
  );
}

// Table virtualizer for large tables
export interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T | string;
    header: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    render?: (value: any, item: T, rowIndex: number) => React.ReactNode;
  }>;
  rowHeight?: number;
  headerHeight?: number;
  height?: number | string;
  width?: number | string;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  cellClassName?: string | ((item: T, columnKey: string, index: number) => string);
  stickyHeader?: boolean;
  onRowClick?: (item: T, index: number) => void;
  debug?: boolean;
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 50,
  headerHeight = 50,
  height = 600,
  width = '100%',
  overscan = 5,
  className,
  containerClassName,
  headerClassName,
  rowClassName,
  cellClassName,
  stickyHeader = true,
  onRowClick,
  debug = false,
}: VirtualTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => columns[index].width || 150,
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();

  // Sync horizontal scroll between header and body
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current && parentRef.current) {
      headerRef.current.scrollLeft = parentRef.current.scrollLeft;
    }
  };

  const totalWidth = columnVirtualizer.getTotalSize();

  return (
    <div className={cn('relative', containerClassName)} style={{ height, width }}>
      {/* Header */}
      {stickyHeader && (
        <div
          ref={headerRef}
          className={cn('overflow-hidden border-b bg-background', headerClassName)}
          style={{ height: headerHeight }}
        >
          <div className="relative" style={{ width: totalWidth, height: headerHeight }}>
            {virtualColumns.map((virtualColumn) => {
              const column = columns[virtualColumn.index];
              return (
                <div
                  key={virtualColumn.key}
                  className="absolute top-0 flex items-center px-4 font-medium"
                  style={{
                    left: `${virtualColumn.start}px`,
                    width: `${virtualColumn.size}px`,
                    height: `${headerHeight}px`,
                  }}
                >
                  {column.header}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <div
        ref={parentRef}
        className={cn('overflow-auto', className)}
        style={{
          height: stickyHeader ? `calc(100% - ${headerHeight}px)` : '100%',
          width: '100%',
        }}
        onScroll={handleScroll}
      >
        <div
          className="relative"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${totalWidth}px`,
          }}
        >
          {virtualRows.map((virtualRow) => {
            const item = data[virtualRow.index];
            const rowClassNameValue =
              typeof rowClassName === 'function'
                ? rowClassName(item, virtualRow.index)
                : rowClassName;

            return (
              <div
                key={virtualRow.key}
                className={cn(
                  'absolute top-0 left-0 w-full',
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                  rowClassNameValue
                )}
                style={{
                  top: `${virtualRow.start}px`,
                  height: `${virtualRow.size}px`,
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
              >
                {virtualColumns.map((virtualColumn) => {
                  const column = columns[virtualColumn.index];
                  const value = (item as any)[column.key];
                  const cellClassNameValue =
                    typeof cellClassName === 'function'
                      ? cellClassName(item, column.key as string, virtualRow.index)
                      : cellClassName;

                  return (
                    <div
                      key={virtualColumn.key}
                      className={cn('absolute top-0 flex items-center px-4', cellClassNameValue)}
                      style={{
                        left: `${virtualColumn.start}px`,
                        width: `${virtualColumn.size}px`,
                        height: '100%',
                      }}
                    >
                      {column.render
                        ? column.render(value, item, virtualRow.index)
                        : String(value ?? '')}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {debug && (
        <div className="absolute top-0 right-0 bg-black/75 text-white text-xs p-2 m-2 rounded z-10">
          <div>Total Rows: {data.length}</div>
          <div>Visible Rows: {virtualRows.length}</div>
          <div>
            Row Range: {virtualRows[0]?.index ?? 0}-
            {virtualRows[virtualRows.length - 1]?.index ?? 0}
          </div>
          <div>Visible Cols: {virtualColumns.length}</div>
        </div>
      )}
    </div>
  );
}
