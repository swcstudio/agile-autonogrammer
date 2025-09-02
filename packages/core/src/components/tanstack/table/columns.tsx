import {
  CellContext,
  type ColumnDef,
  HeaderContext,
  type Row,
  type RowData,
  createColumnHelper,
} from '@tanstack/react-table';
import React from 'react';
import { cn } from '../../../utils/cn';

// Column helper factory
export function createTypedColumns<TData extends RowData>() {
  return createColumnHelper<TData>();
}

// Selection column
export function createSelectionColumn<TData extends RowData>(): ColumnDef<TData> {
  return {
    id: 'select',
    size: 40,
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        className="cursor-pointer"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

// Expander column
export function createExpanderColumn<TData extends RowData>(): ColumnDef<TData> {
  return {
    id: 'expander',
    size: 40,
    header: () => null,
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <button onClick={row.getToggleExpandedHandler()} className="cursor-pointer p-1">
          {row.getIsExpanded() ? '▼' : '▶'}
        </button>
      ) : null;
    },
    enableSorting: false,
    enableHiding: false,
  };
}

// Actions column
export interface ActionItem<TData> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: Row<TData>) => void;
  show?: (row: Row<TData>) => boolean;
  disabled?: (row: Row<TData>) => boolean;
  className?: string;
}

export function createActionsColumn<TData extends RowData>(
  actions: ActionItem<TData>[]
): ColumnDef<TData> {
  return {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        {actions.map((action, index) => {
          if (action.show && !action.show(row)) return null;

          const isDisabled = action.disabled?.(row) ?? false;

          return (
            <button
              key={index}
              onClick={() => !isDisabled && action.onClick(row)}
              disabled={isDisabled}
              className={cn(
                'px-2 py-1 text-sm rounded hover:bg-muted',
                isDisabled && 'opacity-50 cursor-not-allowed',
                action.className
              )}
              title={action.label}
            >
              {action.icon || action.label}
            </button>
          );
        })}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

// Editable cell component
export interface EditableCellProps<TData extends RowData> {
  getValue: () => any;
  row: Row<TData>;
  column: any;
  table: any;
}

export function EditableCell<TData extends RowData>({
  getValue,
  row,
  column,
  table,
}: EditableCellProps<TData>) {
  const initialValue = getValue();
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);

  const onBlur = () => {
    if (value !== initialValue) {
      table.options.meta?.updateData?.(row.index, column.id, value);
    }
    setIsEditing(false);
  };

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (isEditing) {
    return (
      <input
        value={value as string}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onBlur();
          } else if (e.key === 'Escape') {
            setValue(initialValue);
            setIsEditing(false);
          }
        }}
        autoFocus
        className="w-full px-1 py-0 border rounded"
      />
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-text hover:bg-muted/50 px-1 rounded">
      {value}
    </div>
  );
}

// Status column with badges
export interface StatusConfig {
  value: string;
  label: string;
  color: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function createStatusColumn<TData extends RowData>(
  accessor: keyof TData | ((row: TData) => string),
  statuses: StatusConfig[]
): ColumnDef<TData> {
  const colorClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };

  return {
    id: typeof accessor === 'string' ? accessor : 'status',
    accessorFn: typeof accessor === 'function' ? accessor : (row) => row[accessor],
    header: 'Status',
    cell: ({ getValue }) => {
      const value = getValue() as string;
      const status = statuses.find((s) => s.value === value) || {
        label: value,
        color: 'default' as const,
      };

      return (
        <span
          className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            colorClasses[status.color]
          )}
        >
          {status.label}
        </span>
      );
    },
    filterFn: 'equals',
    enableSorting: true,
  };
}

// Date column with formatting
export function createDateColumn<TData extends RowData>(
  accessor: keyof TData | ((row: TData) => Date | string | null),
  options?: {
    format?: 'short' | 'medium' | 'long' | 'relative';
    header?: string;
  }
): ColumnDef<TData> {
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    switch (options?.format) {
      case 'short':
        return dateObj.toLocaleDateString();
      case 'long':
        return dateObj.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'relative':
        return formatRelativeTime(dateObj);
      case 'medium':
      default:
        return dateObj.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
    }
  };

  return {
    id: typeof accessor === 'string' ? accessor : 'date',
    accessorFn: typeof accessor === 'function' ? accessor : (row) => row[accessor],
    header: options?.header || 'Date',
    cell: ({ getValue }) => formatDate(getValue() as Date | string | null),
    sortingFn: 'datetime',
  };
}

// Number column with formatting
export function createNumberColumn<TData extends RowData>(
  accessor: keyof TData | ((row: TData) => number | null),
  options?: {
    header?: string;
    format?: 'decimal' | 'currency' | 'percent';
    decimals?: number;
    currency?: string;
    prefix?: string;
    suffix?: string;
  }
): ColumnDef<TData> {
  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return '-';

    let formatted: string;

    switch (options?.format) {
      case 'currency':
        formatted = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: options.currency || 'USD',
          minimumFractionDigits: options.decimals ?? 2,
          maximumFractionDigits: options.decimals ?? 2,
        }).format(value);
        break;
      case 'percent':
        formatted = new Intl.NumberFormat(undefined, {
          style: 'percent',
          minimumFractionDigits: options.decimals ?? 0,
          maximumFractionDigits: options.decimals ?? 0,
        }).format(value / 100);
        break;
      case 'decimal':
      default:
        formatted = new Intl.NumberFormat(undefined, {
          minimumFractionDigits: options?.decimals ?? 0,
          maximumFractionDigits: options?.decimals ?? 2,
        }).format(value);
    }

    if (options?.prefix) formatted = options.prefix + formatted;
    if (options?.suffix) formatted = formatted + options.suffix;

    return formatted;
  };

  return {
    id: typeof accessor === 'string' ? accessor : 'number',
    accessorFn: typeof accessor === 'function' ? accessor : (row) => row[accessor],
    header: options?.header || 'Number',
    cell: ({ getValue }) => (
      <div className="text-right">{formatNumber(getValue() as number | null)}</div>
    ),
    sortingFn: 'basic',
  };
}

// Image column
export function createImageColumn<TData extends RowData>(
  accessor: keyof TData | ((row: TData) => string | null),
  options?: {
    header?: string;
    alt?: (row: TData) => string;
    size?: 'sm' | 'md' | 'lg';
    rounded?: boolean;
    fallback?: string | React.ReactNode;
  }
): ColumnDef<TData> {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return {
    id: typeof accessor === 'string' ? accessor : 'image',
    accessorFn: typeof accessor === 'function' ? accessor : (row) => row[accessor],
    header: options?.header || 'Image',
    cell: ({ getValue, row }) => {
      const src = getValue() as string | null;

      if (!src) {
        return options?.fallback || <div className={sizeClasses[options?.size || 'md']} />;
      }

      return (
        <img
          src={src}
          alt={options?.alt?.(row.original) || ''}
          className={cn(
            sizeClasses[options?.size || 'md'],
            options?.rounded && 'rounded-full',
            'object-cover'
          )}
        />
      );
    },
    enableSorting: false,
  };
}

// Link column
export function createLinkColumn<TData extends RowData>(
  accessor: keyof TData | ((row: TData) => string | null),
  options: {
    header?: string;
    href: (row: TData) => string;
    label?: (row: TData) => string;
    external?: boolean;
    className?: string;
  }
): ColumnDef<TData> {
  return {
    id: typeof accessor === 'string' ? accessor : 'link',
    accessorFn: typeof accessor === 'function' ? accessor : (row) => row[accessor],
    header: options.header || 'Link',
    cell: ({ getValue, row }) => {
      const value = getValue() as string | null;
      if (!value) return '-';

      const href = options.href(row.original);
      const label = options.label?.(row.original) || value;

      return (
        <a
          href={href}
          target={options.external ? '_blank' : undefined}
          rel={options.external ? 'noopener noreferrer' : undefined}
          className={cn('text-primary hover:underline', options.className)}
        >
          {label}
        </a>
      );
    },
  };
}

// Progress column
export function createProgressColumn<TData extends RowData>(
  accessor: keyof TData | ((row: TData) => number),
  options?: {
    header?: string;
    max?: number;
    showLabel?: boolean;
    color?: 'primary' | 'success' | 'warning' | 'error';
  }
): ColumnDef<TData> {
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return {
    id: typeof accessor === 'string' ? accessor : 'progress',
    accessorFn: typeof accessor === 'function' ? accessor : (row) => row[accessor],
    header: options?.header || 'Progress',
    cell: ({ getValue }) => {
      const value = getValue() as number;
      const max = options?.max || 100;
      const percentage = (value / max) * 100;

      return (
        <div className="w-full">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                colorClasses[options?.color || 'primary']
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          {options?.showLabel && (
            <span className="text-xs text-muted-foreground mt-1">{Math.round(percentage)}%</span>
          )}
        </div>
      );
    },
    sortingFn: 'basic',
  };
}

// Helper function for relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
