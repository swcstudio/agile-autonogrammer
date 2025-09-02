import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ExpandedState,
  type GroupingState,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
  flexRender,
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
import { cn } from '../../../utils/cn';

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void;
    removeRow?: (rowIndex: number) => void;
    addRow?: (data: TData) => void;
    revertData?: (rowIndex: number, revert: boolean) => void;
  }
}

export interface TableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  className?: string;
  containerClassName?: string;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  enableColumnResizing?: boolean;
  enableColumnOrdering?: boolean;
  enableColumnPinning?: boolean;
  enableGrouping?: boolean;
  enableExpanding?: boolean;
  enableGlobalFilter?: boolean;
  enableMultiSort?: boolean;
  enableSubRowSelection?: boolean;
  stickyHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  loading?: boolean;
  error?: Error | null;
  emptyMessage?: string;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  onDataChange?: (data: TData[]) => void;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;
  showColumnVisibility?: boolean;
  initialState?: {
    sorting?: SortingState;
    columnFilters?: ColumnFiltersState;
    globalFilter?: string;
    pagination?: PaginationState;
    rowSelection?: RowSelectionState;
    expanded?: ExpandedState;
    grouping?: GroupingState;
    columnVisibility?: VisibilityState;
    columnOrder?: ColumnOrderState;
    columnSizing?: ColumnSizingState;
    columnPinning?: ColumnPinningState;
  };
}

export function Table<TData extends RowData>({
  data,
  columns,
  className,
  containerClassName,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableRowSelection = false,
  enableColumnResizing = false,
  enableColumnOrdering = false,
  enableColumnPinning = false,
  enableGrouping = false,
  enableExpanding = false,
  enableGlobalFilter = true,
  enableMultiSort = true,
  enableSubRowSelection = true,
  stickyHeader = false,
  striped = false,
  bordered = true,
  hoverable = true,
  compact = false,
  loading = false,
  error = null,
  emptyMessage = 'No data available',
  loadingComponent,
  errorComponent,
  onDataChange,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  showPagination = true,
  showColumnVisibility = true,
  initialState = {},
}: TableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialState.sorting || []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState.columnFilters || []
  );
  const [globalFilter, setGlobalFilter] = React.useState(initialState.globalFilter || '');
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialState.columnVisibility || {}
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState.rowSelection || {}
  );
  const [expanded, setExpanded] = React.useState<ExpandedState>(initialState.expanded || {});
  const [grouping, setGrouping] = React.useState<GroupingState>(initialState.grouping || []);
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    initialState.columnOrder || []
  );
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
    initialState.columnSizing || {}
  );
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialState.columnPinning || {}
  );
  const [pagination, setPagination] = React.useState<PaginationState>(
    initialState.pagination || {
      pageIndex: 0,
      pageSize: defaultPageSize,
    }
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      expanded,
      grouping,
      columnOrder,
      columnSizing,
      columnPinning,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onGroupingChange: setGrouping,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getGroupedRowModel: enableGrouping ? getGroupedRowModel() : undefined,
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
    getFacetedRowModel: enableFiltering ? getFacetedRowModel() : undefined,
    getFacetedUniqueValues: enableFiltering ? getFacetedUniqueValues() : undefined,
    getFacetedMinMaxValues: enableFiltering ? getFacetedMinMaxValues() : undefined,
    enableSorting,
    enableMultiSort,
    enableFilters: enableFiltering,
    enableColumnResizing,
    enableGrouping,
    enableRowSelection,
    enableSubRowSelection,
    enableGlobalFilter,
    columnResizeMode: 'onChange',
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        const updatedData = [...data];
        updatedData[rowIndex] = {
          ...updatedData[rowIndex],
          [columnId]: value,
        };
        onDataChange?.(updatedData);
      },
      removeRow: (rowIndex: number) => {
        const updatedData = data.filter((_, index) => index !== rowIndex);
        onDataChange?.(updatedData);
      },
      addRow: (newRow: TData) => {
        const updatedData = [...data, newRow];
        onDataChange?.(updatedData);
      },
    },
  });

  if (loading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading table data...</p>
          </div>
        </div>
      )
    );
  }

  if (error) {
    return (
      errorComponent || (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-destructive font-medium">Error loading table</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>
      )
    );
  }

  const isEmpty = table.getRowModel().rows.length === 0;

  return (
    <div className={cn('space-y-4', containerClassName)}>
      {/* Global Filter */}
      {enableGlobalFilter && (
        <div className="flex items-center gap-4">
          <input
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm px-3 py-2 border rounded-md"
            placeholder="Search all columns..."
          />
          {showColumnVisibility && <ColumnVisibilityToggle table={table} />}
        </div>
      )}

      {/* Table */}
      <div className={cn('overflow-auto', stickyHeader && 'max-h-[600px]')}>
        <table
          className={cn(
            'w-full',
            bordered && 'border',
            compact ? 'text-sm' : 'text-base',
            className
          )}
        >
          <thead className={cn(stickyHeader && 'sticky top-0 bg-background z-10')}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'text-left font-medium',
                      compact ? 'px-2 py-1' : 'px-4 py-2',
                      header.column.getCanSort() && 'cursor-pointer select-none',
                      header.column.getIsSorted() && 'text-primary'
                    )}
                    style={{
                      width: header.getSize(),
                      position: header.column.getIsPinned() ? 'sticky' : 'relative',
                      left:
                        header.column.getIsPinned() === 'left'
                          ? `${header.getStart()}px`
                          : undefined,
                      right:
                        header.column.getIsPinned() === 'right'
                          ? `${header.getAfter()}px`
                          : undefined,
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          header.column.getCanSort() && 'hover:text-primary'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <SortIndicator column={header.column} />}
                      </div>
                    )}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute right-0 top-0 h-full w-1 bg-border cursor-col-resize select-none touch-none hover:bg-primary"
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn('text-center text-muted-foreground', compact ? 'py-8' : 'py-12')}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    bordered && 'border-b',
                    striped && index % 2 === 0 && 'bg-muted/50',
                    hoverable && 'hover:bg-muted/50',
                    row.getIsSelected() && 'bg-primary/10'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(compact ? 'px-2 py-1' : 'px-4 py-2')}
                      style={{
                        position: cell.column.getIsPinned() ? 'sticky' : 'relative',
                        left:
                          cell.column.getIsPinned() === 'left'
                            ? `${cell.column.getStart()}px`
                            : undefined,
                        right:
                          cell.column.getIsPinned() === 'right'
                            ? `${cell.column.getAfter()}px`
                            : undefined,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && enablePagination && (
        <TablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  );
}

// Helper Components
function SortIndicator({ column }: { column: any }) {
  if (!column.getIsSorted()) {
    return <span className="text-muted-foreground">↕</span>;
  }
  return column.getIsSorted() === 'asc' ? '↑' : '↓';
}

function ColumnVisibilityToggle({ table }: { table: TanStackTable<any> }) {
  return (
    <div className="relative">
      <button className="px-3 py-2 border rounded-md">Columns</button>
      <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg p-2 space-y-1 z-20">
        {table.getAllLeafColumns().map((column) => (
          <label
            key={column.id}
            className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={column.getIsVisible()}
              onChange={column.getToggleVisibilityHandler()}
            />
            <span className="text-sm">{column.id}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TablePagination({
  table,
  pageSizeOptions,
}: {
  table: TanStackTable<any>;
  pageSizeOptions: number[];
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="px-2 py-1 border rounded"
        >
          {pageSizeOptions.map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ⟨⟨
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ⟨
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ⟩
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ⟩⟩
          </button>
        </div>
      </div>
    </div>
  );
}
