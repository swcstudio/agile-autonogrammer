import type { Column, Table } from '@tanstack/react-table';
import React from 'react';
import { cn } from '../../../utils/cn';

// Text filter component
export function TextFilter<TData>({
  column,
  placeholder = 'Search...',
  className,
}: {
  column: Column<TData, unknown>;
  placeholder?: string;
  className?: string;
}) {
  const columnFilterValue = column.getFilterValue();

  return (
    <input
      type="text"
      value={(columnFilterValue ?? '') as string}
      onChange={(e) => column.setFilterValue(e.target.value)}
      placeholder={placeholder}
      className={cn('w-full px-2 py-1 text-sm border rounded', className)}
    />
  );
}

// Number range filter
export function NumberRangeFilter<TData>({
  column,
  min,
  max,
  step = 1,
  className,
}: {
  column: Column<TData, unknown>;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const columnFilterValue = column.getFilterValue() as [number, number] | undefined;
  const [localValue, setLocalValue] = React.useState<[number | '', number | '']>([
    columnFilterValue?.[0] ?? '',
    columnFilterValue?.[1] ?? '',
  ]);

  React.useEffect(() => {
    setLocalValue([columnFilterValue?.[0] ?? '', columnFilterValue?.[1] ?? '']);
  }, [columnFilterValue]);

  const handleChange = (index: number, value: string) => {
    const newValue: [number | '', number | ''] = [...localValue];
    newValue[index] = value === '' ? '' : Number(value);
    setLocalValue(newValue);

    // Debounced update
    const timeoutId = setTimeout(() => {
      if (newValue[0] === '' && newValue[1] === '') {
        column.setFilterValue(undefined);
      } else {
        column.setFilterValue(newValue);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <input
        type="number"
        value={localValue[0]}
        onChange={(e) => handleChange(0, e.target.value)}
        placeholder={`Min${min !== undefined ? ` (${min})` : ''}`}
        min={min}
        max={max}
        step={step}
        className="w-20 px-2 py-1 text-sm border rounded"
      />
      <span className="text-sm">to</span>
      <input
        type="number"
        value={localValue[1]}
        onChange={(e) => handleChange(1, e.target.value)}
        placeholder={`Max${max !== undefined ? ` (${max})` : ''}`}
        min={min}
        max={max}
        step={step}
        className="w-20 px-2 py-1 text-sm border rounded"
      />
    </div>
  );
}

// Select filter
export function SelectFilter<TData>({
  column,
  options,
  placeholder = 'All',
  className,
}: {
  column: Column<TData, unknown>;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const columnFilterValue = column.getFilterValue();

  return (
    <select
      value={(columnFilterValue as string) ?? ''}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      className={cn('w-full px-2 py-1 text-sm border rounded', className)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Multi-select filter
export function MultiSelectFilter<TData>({
  column,
  options,
  placeholder = 'Select...',
  className,
}: {
  column: Column<TData, unknown>;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const columnFilterValue = (column.getFilterValue() as string[] | undefined) || [];
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleOption = (value: string) => {
    const newValue = columnFilterValue.includes(value)
      ? columnFilterValue.filter((v) => v !== value)
      : [...columnFilterValue, value];

    column.setFilterValue(newValue.length > 0 ? newValue : undefined);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full px-2 py-1 text-sm border rounded text-left flex items-center justify-between',
          className
        )}
      >
        <span>
          {columnFilterValue.length > 0 ? `${columnFilterValue.length} selected` : placeholder}
        </span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-2 py-1 hover:bg-muted cursor-pointer"
            >
              <input
                type="checkbox"
                checked={columnFilterValue.includes(option.value)}
                onChange={() => toggleOption(option.value)}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Date range filter
export function DateRangeFilter<TData>({
  column,
  className,
}: {
  column: Column<TData, unknown>;
  className?: string;
}) {
  const columnFilterValue = column.getFilterValue() as [string, string] | undefined;
  const [localValue, setLocalValue] = React.useState<[string, string]>([
    columnFilterValue?.[0] ?? '',
    columnFilterValue?.[1] ?? '',
  ]);

  React.useEffect(() => {
    setLocalValue([columnFilterValue?.[0] ?? '', columnFilterValue?.[1] ?? '']);
  }, [columnFilterValue]);

  const handleChange = (index: number, value: string) => {
    const newValue: [string, string] = [...localValue];
    newValue[index] = value;
    setLocalValue(newValue);

    // Update filter
    if (newValue[0] === '' && newValue[1] === '') {
      column.setFilterValue(undefined);
    } else {
      column.setFilterValue(newValue);
    }
  };

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <input
        type="date"
        value={localValue[0]}
        onChange={(e) => handleChange(0, e.target.value)}
        className="px-2 py-1 text-sm border rounded"
      />
      <span className="text-sm">to</span>
      <input
        type="date"
        value={localValue[1]}
        onChange={(e) => handleChange(1, e.target.value)}
        className="px-2 py-1 text-sm border rounded"
      />
    </div>
  );
}

// Faceted filter
export function FacetedFilter<TData>({
  column,
  title,
  options,
  className,
}: {
  column: Column<TData, unknown>;
  title?: string;
  options?: { value: string; label: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  const facets = column.getFacetedUniqueValues();
  const selectedValues = new Set(column.getFilterValue() as string[]);

  // Auto-generate options from facets if not provided
  const filterOptions = React.useMemo(() => {
    if (options) return options;

    const entries = Array.from(facets.entries());
    return entries.map(([value, count]) => ({
      value: String(value),
      label: `${value} (${count})`,
    }));
  }, [options, facets]);

  return (
    <div className={cn('space-y-2', className)}>
      {title && <h4 className="font-medium text-sm">{title}</h4>}
      <div className="space-y-1">
        {filterOptions.map((option) => {
          const isSelected = selectedValues.has(option.value);
          const count = facets.get(option.value) ?? 0;

          return (
            <button
              key={option.value}
              onClick={() => {
                if (isSelected) {
                  selectedValues.delete(option.value);
                } else {
                  selectedValues.add(option.value);
                }
                const filterValues = Array.from(selectedValues);
                column.setFilterValue(filterValues.length ? filterValues : undefined);
              }}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1 text-sm rounded hover:bg-muted',
                isSelected && 'bg-primary/10'
              )}
            >
              {option.icon}
              <span className="flex-1 text-left">{option.label}</span>
              {!options && <span className="text-xs text-muted-foreground">({count})</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Column filter popover
export function ColumnFilter<TData>({
  column,
  filterComponent,
}: {
  column: Column<TData, unknown>;
  filterComponent?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const isFiltered = column.getIsFiltered();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn('p-1 rounded hover:bg-muted', isFiltered && 'text-primary')}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4.5L6.5 9V14L9.5 12.5V9L14 4.5V2H2V4.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-64 bg-background border rounded shadow-lg p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filter {column.id}</h4>
              {isFiltered && (
                <button
                  onClick={() => column.setFilterValue(undefined)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            {filterComponent || <TextFilter column={column} />}
          </div>
        </div>
      )}
    </div>
  );
}

// Advanced filter builder
export interface FilterRule {
  column: string;
  operator: 'equals' | 'contains' | 'starts' | 'ends' | 'gt' | 'lt' | 'between';
  value: any;
}

export function AdvancedFilterBuilder<TData>({
  table,
  onApply,
  className,
}: {
  table: Table<TData>;
  onApply?: (rules: FilterRule[]) => void;
  className?: string;
}) {
  const [rules, setRules] = React.useState<FilterRule[]>([]);
  const columns = table.getAllLeafColumns().filter((col) => col.getCanFilter());

  const addRule = () => {
    setRules([
      ...rules,
      {
        column: columns[0]?.id || '',
        operator: 'contains',
        value: '',
      },
    ]);
  };

  const updateRule = (index: number, updates: Partial<FilterRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const applyFilters = () => {
    // Apply filters to table
    rules.forEach((rule) => {
      const column = table.getColumn(rule.column);
      if (column) {
        column.setFilterValue(rule.value);
      }
    });

    onApply?.(rules);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={rule.column}
              onChange={(e) => updateRule(index, { column: e.target.value })}
              className="px-2 py-1 text-sm border rounded"
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.id}
                </option>
              ))}
            </select>

            <select
              value={rule.operator}
              onChange={(e) => updateRule(index, { operator: e.target.value as any })}
              className="px-2 py-1 text-sm border rounded"
            >
              <option value="contains">Contains</option>
              <option value="equals">Equals</option>
              <option value="starts">Starts with</option>
              <option value="ends">Ends with</option>
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
              <option value="between">Between</option>
            </select>

            <input
              value={rule.value}
              onChange={(e) => updateRule(index, { value: e.target.value })}
              placeholder="Value"
              className="flex-1 px-2 py-1 text-sm border rounded"
            />

            <button
              onClick={() => removeRule(index)}
              className="p-1 text-destructive hover:bg-destructive/10 rounded"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={addRule} className="px-3 py-1 text-sm border rounded hover:bg-muted">
          Add Rule
        </button>
        <button
          onClick={applyFilters}
          disabled={rules.length === 0}
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
