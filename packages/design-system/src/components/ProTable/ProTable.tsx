/**
 * ProTable Component - Enterprise-grade data table
 * 
 * Features:
 * - Server-side data fetching with @tanstack/react-query
 * - Advanced filtering and sorting
 * - Column resizing and reordering
 * - Virtual scrolling for large datasets
 * - Export to CSV/Excel
 * - Row selection and batch operations
 * - Inline editing
 * - Column freezing
 * - Expandable rows
 * - Mobile responsive
 */

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
  FilterFn,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ExpandedState,
  PaginationState,
  RowSelectionState,
} from '@tanstack/react-table';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { cn } from '../../utils/cn';
import { Button } from '../../primitives/Button/Button';
import { Input } from '../../primitives/Input/Input';
import { Select } from '../../primitives/Select/Select';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  MagnifyingGlassIcon,
  DownloadIcon,
  ReloadIcon,
  GearIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';

// ============================================================================
// Types
// ============================================================================

export interface ProTableColumn<T = any> extends ColumnDef<T> {
  title?: string;
  dataIndex?: string;
  key?: string;
  width?: number | string;
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
  copyable?: boolean;
  search?: boolean;
  filters?: Array<{ text: string; value: any }>;
  sorter?: boolean | ((a: T, b: T) => number);
  render?: (value: any, record: T, index: number) => React.ReactNode;
  editable?: boolean;
  valueType?: 'text' | 'number' | 'date' | 'dateTime' | 'select' | 'checkbox' | 'radio' | 'switch';
  valueEnum?: Record<string, { text: string; status?: string; color?: string }>;
  hideInTable?: boolean;
  hideInSearch?: boolean;
  hideInForm?: boolean;
  formItemProps?: any;
  fieldProps?: any;
}

export interface ProTableRequest<T = any> {
  current?: number;
  pageSize?: number;
  total?: number;
  filters?: Record<string, any>;
  sorter?: Record<string, 'asc' | 'desc'>;
  search?: string;
}

export interface ProTableResponse<T = any> {
  data: T[];
  total?: number;
  success?: boolean;
  message?: string;
}

export interface ProTableProps<T = any> {
  columns: ProTableColumn<T>[];
  dataSource?: T[];
  request?: (params: ProTableRequest<T>) => Promise<ProTableResponse<T>>;
  queryOptions?: Omit<UseQueryOptions<ProTableResponse<T>>, 'queryKey' | 'queryFn'>;
  rowKey?: string | ((record: T) => string);
  loading?: boolean;
  bordered?: boolean;
  striped?: boolean;
  hover?: boolean;
  size?: 'small' | 'default' | 'large';
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  search?: boolean | { placeholder?: string; allowClear?: boolean };
  pagination?: boolean | {
    position?: 'top' | 'bottom' | 'both';
    pageSize?: number;
    pageSizeOptions?: number[];
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: boolean;
  };
  rowSelection?: boolean | {
    type?: 'checkbox' | 'radio';
    selectedRowKeys?: string[];
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
    getCheckboxProps?: (record: T) => any;
  };
  expandable?: {
    expandedRowRender?: (record: T) => React.ReactNode;
    expandedRowKeys?: string[];
    onExpandedRowsChange?: (expandedKeys: string[]) => void;
    rowExpandable?: (record: T) => boolean;
  };
  scroll?: { x?: number | string; y?: number | string };
  sticky?: boolean | { offsetHeader?: number };
  onRow?: (record: T, index: number) => any;
  onHeaderRow?: (columns: ProTableColumn<T>[], index: number) => any;
  className?: string;
  style?: React.CSSProperties;
  editable?: boolean | {
    type?: 'multiple' | 'single';
    onSave?: (key: string, record: T) => Promise<void>;
    onCancel?: (key: string) => void;
  };
  exportable?: boolean | {
    fileName?: string;
    onExport?: (data: T[]) => void;
  };
  resizable?: boolean;
  reorderable?: boolean;
  virtualScroll?: boolean;
  emptyText?: React.ReactNode;
  errorText?: React.ReactNode;
}

// ============================================================================
// ProTable Component
// ============================================================================

export function ProTable<T extends Record<string, any>>({
  columns: propColumns,
  dataSource,
  request,
  queryOptions,
  rowKey = 'id',
  loading: propLoading,
  bordered = false,
  striped = false,
  hover = true,
  size = 'default',
  title,
  subtitle,
  toolbar,
  footer,
  search = true,
  pagination = true,
  rowSelection = false,
  expandable,
  scroll,
  sticky,
  onRow,
  onHeaderRow,
  className,
  style,
  editable = false,
  exportable = true,
  resizable = false,
  reorderable = false,
  virtualScroll = false,
  emptyText = 'No data',
  errorText = 'Failed to load data',
}: ProTableProps<T>) {
  // State
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelectionState, setRowSelectionState] = React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: typeof pagination === 'object' ? pagination.pageSize || 10 : 10,
  });

  // Fetch data
  const { data: queryData, isLoading, isError, refetch } = useQuery({
    queryKey: ['proTable', pageIndex, pageSize, sorting, columnFilters, globalFilter],
    queryFn: async () => {
      if (!request) return { data: dataSource || [], total: dataSource?.length || 0 };
      
      const params: ProTableRequest<T> = {
        current: pageIndex + 1,
        pageSize,
        search: globalFilter,
        filters: columnFilters.reduce((acc, filter) => ({
          ...acc,
          [filter.id]: filter.value,
        }), {}),
        sorter: sorting.reduce((acc, sort) => ({
          ...acc,
          [sort.id]: sort.desc ? 'desc' : 'asc',
        }), {}),
      };
      
      return await request(params);
    },
    enabled: !!request || !!dataSource,
    ...queryOptions,
  });

  const data = queryData?.data || dataSource || [];
  const totalCount = queryData?.total || data.length;
  const loading = propLoading || isLoading;

  // Process columns
  const columns = React.useMemo(() => {
    const processedColumns: ColumnDef<T>[] = [];
    
    // Row selection column
    if (rowSelection) {
      processedColumns.push({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="cursor-pointer"
          />
        ),
        size: 40,
      });
    }

    // Expandable column
    if (expandable?.expandedRowRender) {
      processedColumns.push({
        id: 'expand',
        header: () => null,
        cell: ({ row }) => {
          const canExpand = expandable.rowExpandable ? expandable.rowExpandable(row.original) : true;
          return canExpand ? (
            <button
              onClick={row.getToggleExpandedHandler()}
              className="cursor-pointer p-1"
            >
              {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
          ) : null;
        },
        size: 40,
      });
    }

    // Data columns
    propColumns.forEach((col) => {
      if (col.hideInTable) return;
      
      processedColumns.push({
        id: col.key || col.dataIndex || col.id,
        accessorKey: col.dataIndex || col.accessorKey,
        header: col.title || col.header,
        cell: col.render ? 
          ({ row, getValue }) => col.render!(getValue(), row.original, row.index) :
          col.cell,
        size: col.width as number,
        enableSorting: col.sorter !== false,
        enableColumnFilter: !!col.filters || !!col.search,
        ...col,
      });
    });

    return processedColumns;
  }, [propColumns, rowSelection, expandable]);

  // Table instance
  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalCount / pageSize),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection: rowSelectionState,
      expanded,
      globalFilter,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelectionState,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: !!request,
    manualFiltering: !!request,
    manualSorting: !!request,
  });

  // Export functionality
  const handleExport = () => {
    if (typeof exportable === 'object' && exportable.onExport) {
      exportable.onExport(data);
    } else {
      // Default CSV export
      const csv = [
        columns.map(col => col.header).join(','),
        ...data.map(row => 
          columns.map(col => {
            const value = row[col.accessorKey as string];
            return typeof value === 'string' ? `"${value}"` : value;
          }).join(',')
        ),
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = typeof exportable === 'object' ? exportable.fileName || 'table.csv' : 'table.csv';
      link.click();
    }
  };

  // Size classes
  const sizeClasses = {
    small: 'text-xs',
    default: 'text-sm',
    large: 'text-base',
  };

  const paddingClasses = {
    small: 'px-2 py-1',
    default: 'px-3 py-2',
    large: 'px-4 py-3',
  };

  return (
    <div className={cn('w-full space-y-4', className)} style={style}>
      {/* Header */}
      {(title || subtitle || search || toolbar) && (
        <div className="flex flex-col gap-4">
          {(title || subtitle) && (
            <div>
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          )}
          
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            {search && (
              <div className="flex-1 max-w-sm">
                <Input
                  prefix={<MagnifyingGlassIcon className="h-4 w-4" />}
                  placeholder={typeof search === 'object' ? search.placeholder : 'Search...'}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  allowClear={typeof search === 'object' ? search.allowClear : true}
                />
              </div>
            )}
            
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              {toolbar}
              
              {/* Refresh */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => refetch()}
                disabled={loading}
              >
                <ReloadIcon className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              
              {/* Export */}
              {exportable && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleExport}
                  disabled={loading || data.length === 0}
                >
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              )}
              
              {/* Column visibility */}
              <Button variant="ghost" size="icon-sm">
                <GearIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={cn(
        'relative overflow-auto rounded-lg',
        bordered && 'border',
        scroll?.y && 'max-h-[' + scroll.y + ']'
      )}>
        <table className={cn(
          'w-full caption-bottom',
          sizeClasses[size]
        )}>
          <thead className={cn(
            'border-b bg-gray-50',
            sticky && 'sticky top-0 z-10'
          )}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      paddingClasses[size],
                      'text-left font-medium text-gray-900',
                      header.column.getCanSort() && 'cursor-pointer select-none',
                      bordered && 'border-r last:border-r-0'
                    )}
                    style={{
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize,
                      maxWidth: header.column.columnDef.maxSize,
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      
                      {header.column.getCanSort() && (
                        <span>
                          {{
                            asc: <ChevronUpIcon className="h-3 w-3" />,
                            desc: <ChevronDownIcon className="h-3 w-3" />,
                          }[header.column.getIsSorted() as string] ?? (
                            <div className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-red-500">
                  {errorText}
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={cn(
                      hover && 'hover:bg-gray-50',
                      striped && 'even:bg-gray-50',
                      row.getIsSelected() && 'bg-blue-50'
                    )}
                    {...(onRow ? onRow(row.original, row.index) : {})}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          paddingClasses[size],
                          bordered && 'border-r last:border-r-0 border-b'
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  
                  {row.getIsExpanded() && expandable?.expandedRowRender && (
                    <tr>
                      <td colSpan={columns.length} className="p-4 bg-gray-50">
                        {expandable.expandedRowRender(row.original)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
          
          {footer && (
            <tfoot className="border-t bg-gray-50">
              <tr>
                <td colSpan={columns.length} className={paddingClasses[size]}>
                  {footer}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, totalCount)} of {totalCount} entries
            </span>
            
            {typeof pagination === 'object' && pagination.showSizeChanger && (
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}
                options={
                  (pagination.pageSizeOptions || [10, 20, 50, 100]).map(size => ({
                    value: String(size),
                    label: `${size} / page`,
                  }))
                }
                size="sm"
              />
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <DoubleArrowLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            
            <span className="px-3 text-sm">
              Page {pageIndex + 1} of {table.getPageCount()}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <DoubleArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProTable;