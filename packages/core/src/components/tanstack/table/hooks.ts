import {
  ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type GroupingState,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table,
  type TableOptions,
  type VisibilityState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import React from 'react';

// Enhanced table hook with persistence
export interface UseTableOptions<TData extends RowData>
  extends Omit<TableOptions<TData>, 'getCoreRowModel'> {
  persistKey?: string;
  onStateChange?: (state: any) => void;
}

export function useTable<TData extends RowData>(options: UseTableOptions<TData>) {
  const { persistKey, onStateChange, ...tableOptions } = options;

  // Load persisted state
  const loadPersistedState = () => {
    if (!persistKey || typeof window === 'undefined') return {};

    try {
      const saved = localStorage.getItem(`table-state-${persistKey}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const persistedState = loadPersistedState();

  // Initialize state with persisted values
  const [sorting, setSorting] = React.useState<SortingState>(persistedState.sorting || []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    persistedState.columnFilters || []
  );
  const [globalFilter, setGlobalFilter] = React.useState(persistedState.globalFilter || '');
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    persistedState.columnVisibility || {}
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    persistedState.rowSelection || {}
  );
  const [expanded, setExpanded] = React.useState<ExpandedState>(persistedState.expanded || {});
  const [grouping, setGrouping] = React.useState<GroupingState>(persistedState.grouping || []);
  const [pagination, setPagination] = React.useState<PaginationState>(
    persistedState.pagination || {
      pageIndex: 0,
      pageSize: 10,
    }
  );

  // Create table instance
  const table = useReactTable({
    ...tableOptions,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      expanded,
      grouping,
      pagination,
      ...tableOptions.state,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onGroupingChange: setGrouping,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  });

  // Persist state changes
  React.useEffect(() => {
    if (!persistKey || typeof window === 'undefined') return;

    const state = {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      expanded,
      grouping,
      pagination,
    };

    localStorage.setItem(`table-state-${persistKey}`, JSON.stringify(state));
    onStateChange?.(state);
  }, [
    persistKey,
    sorting,
    columnFilters,
    globalFilter,
    columnVisibility,
    rowSelection,
    expanded,
    grouping,
    pagination,
    onStateChange,
  ]);

  return {
    table,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      expanded,
      grouping,
      pagination,
    },
    resetState: () => {
      setSorting([]);
      setColumnFilters([]);
      setGlobalFilter('');
      setColumnVisibility({});
      setRowSelection({});
      setExpanded({});
      setGrouping([]);
      setPagination({ pageIndex: 0, pageSize: 10 });

      if (persistKey && typeof window !== 'undefined') {
        localStorage.removeItem(`table-state-${persistKey}`);
      }
    },
  };
}

// Hook for bulk actions
export function useBulkActions<TData extends RowData>(table: Table<TData>) {
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedData = selectedRows.map((row) => row.original);

  const selectAll = () => table.toggleAllRowsSelected(true);
  const deselectAll = () => table.toggleAllRowsSelected(false);
  const invertSelection = () => table.toggleAllRowsSelected();

  const selectRows = (predicate: (row: TData) => boolean) => {
    table.getRowModel().rows.forEach((row) => {
      if (predicate(row.original)) {
        row.toggleSelected(true);
      }
    });
  };

  const deselectRows = (predicate: (row: TData) => boolean) => {
    table.getRowModel().rows.forEach((row) => {
      if (predicate(row.original)) {
        row.toggleSelected(false);
      }
    });
  };

  return {
    selectedRows,
    selectedCount,
    selectedData,
    hasSelection: selectedCount > 0,
    selectAll,
    deselectAll,
    invertSelection,
    selectRows,
    deselectRows,
  };
}

// Hook for table export
export function useTableExport<TData extends RowData>(table: Table<TData>) {
  const exportToCSV = (options?: {
    filename?: string;
    includeHeaders?: boolean;
    visibleColumnsOnly?: boolean;
  }) => {
    const {
      filename = 'table-export.csv',
      includeHeaders = true,
      visibleColumnsOnly = true,
    } = options || {};

    const columns = visibleColumnsOnly ? table.getVisibleLeafColumns() : table.getAllLeafColumns();

    const rows = table.getFilteredRowModel().rows;

    // Build CSV content
    let csv = '';

    // Headers
    if (includeHeaders) {
      csv += columns.map((col) => `"${col.id}"`).join(',') + '\n';
    }

    // Data
    rows.forEach((row) => {
      csv +=
        columns
          .map((col) => {
            const value = row.getValue(col.id);
            const stringValue = value == null ? '' : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(',') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToJSON = (options?: {
    filename?: string;
    prettyPrint?: boolean;
  }) => {
    const { filename = 'table-export.json', prettyPrint = true } = options || {};

    const rows = table.getFilteredRowModel().rows;
    const data = rows.map((row) => row.original);

    const json = prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);

    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const copyToClipboard = async (format: 'csv' | 'json' = 'csv') => {
    const columns = table.getVisibleLeafColumns();
    const rows = table.getFilteredRowModel().rows;

    let content = '';

    if (format === 'csv') {
      // Headers
      content += columns.map((col) => col.id).join('\t') + '\n';

      // Data
      rows.forEach((row) => {
        content +=
          columns
            .map((col) => {
              const value = row.getValue(col.id);
              return value == null ? '' : String(value);
            })
            .join('\t') + '\n';
      });
    } else {
      const data = rows.map((row) => row.original);
      content = JSON.stringify(data, null, 2);
    }

    await navigator.clipboard.writeText(content);
  };

  return {
    exportToCSV,
    exportToJSON,
    copyToClipboard,
  };
}

// Hook for column visibility presets
export function useColumnPresets<TData extends RowData>(
  table: Table<TData>,
  presets: Record<string, string[]>
) {
  const [activePreset, setActivePreset] = React.useState<string | null>(null);

  const applyPreset = (presetName: string) => {
    const preset = presets[presetName];
    if (!preset) return;

    const visibility: VisibilityState = {};
    table.getAllLeafColumns().forEach((column) => {
      visibility[column.id] = preset.includes(column.id);
    });

    table.setColumnVisibility(visibility);
    setActivePreset(presetName);
  };

  const saveCurrentAsPreset = (name: string) => {
    const visibleColumns = table.getVisibleLeafColumns().map((col) => col.id);

    return visibleColumns;
  };

  return {
    activePreset,
    applyPreset,
    saveCurrentAsPreset,
    presets: Object.keys(presets),
  };
}

// Hook for keyboard navigation
export function useTableKeyboardNavigation<TData extends RowData>(
  table: Table<TData>,
  options?: {
    enableArrowNavigation?: boolean;
    enablePageNavigation?: boolean;
    enableSelection?: boolean;
    onEnter?: (row: TData) => void;
    onSpace?: (row: TData) => void;
  }
) {
  const {
    enableArrowNavigation = true,
    enablePageNavigation = true,
    enableSelection = true,
    onEnter,
    onSpace,
  } = options || {};

  const [focusedRowIndex, setFocusedRowIndex] = React.useState(0);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const rows = table.getRowModel().rows;
      if (rows.length === 0) return;

      const currentRow = rows[focusedRowIndex];

      switch (e.key) {
        case 'ArrowUp':
          if (enableArrowNavigation && focusedRowIndex > 0) {
            e.preventDefault();
            setFocusedRowIndex(focusedRowIndex - 1);
          }
          break;

        case 'ArrowDown':
          if (enableArrowNavigation && focusedRowIndex < rows.length - 1) {
            e.preventDefault();
            setFocusedRowIndex(focusedRowIndex + 1);
          }
          break;

        case 'PageUp':
          if (enablePageNavigation) {
            e.preventDefault();
            table.previousPage();
          }
          break;

        case 'PageDown':
          if (enablePageNavigation) {
            e.preventDefault();
            table.nextPage();
          }
          break;

        case 'Enter':
          if (currentRow && onEnter) {
            e.preventDefault();
            onEnter(currentRow.original);
          }
          break;

        case ' ':
          if (currentRow) {
            if (enableSelection && !onSpace) {
              e.preventDefault();
              currentRow.toggleSelected();
            } else if (onSpace) {
              e.preventDefault();
              onSpace(currentRow.original);
            }
          }
          break;

        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            table.toggleAllRowsSelected();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    table,
    focusedRowIndex,
    enableArrowNavigation,
    enablePageNavigation,
    enableSelection,
    onEnter,
    onSpace,
  ]);

  return {
    focusedRowIndex,
    setFocusedRowIndex,
  };
}

// Hook for virtual scrolling integration
export function useVirtualTable<TData extends RowData>(
  table: Table<TData>,
  containerRef: React.RefObject<HTMLDivElement>,
  estimateSize: (index: number) => number
) {
  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize,
    overscan: 5,
  });

  const virtualRows = virtualizer.getVirtualItems();

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0].start ?? 0) : 0;

  const paddingBottom =
    virtualRows.length > 0
      ? virtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1].end ?? 0)
      : 0;

  return {
    virtualRows,
    totalSize: virtualizer.getTotalSize(),
    paddingTop,
    paddingBottom,
  };
}

// Import for virtual scrolling
import { useVirtualizer } from '@tanstack/react-virtual';
