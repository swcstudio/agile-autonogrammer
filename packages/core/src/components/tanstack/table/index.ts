// Main table component
export { Table } from './Table';
export type { TableProps } from './Table';

// Column helpers
export {
  createTypedColumns,
  createSelectionColumn,
  createExpanderColumn,
  createActionsColumn,
  createStatusColumn,
  createDateColumn,
  createNumberColumn,
  createImageColumn,
  createLinkColumn,
  createProgressColumn,
  EditableCell,
} from './columns';
export type {
  ActionItem,
  EditableCellProps,
  StatusConfig,
} from './columns';

// Filter components
export {
  TextFilter,
  NumberRangeFilter,
  SelectFilter,
  MultiSelectFilter,
  DateRangeFilter,
  FacetedFilter,
  ColumnFilter,
  AdvancedFilterBuilder,
} from './filters';
export type { FilterRule } from './filters';

// Hooks
export {
  useTable,
  useBulkActions,
  useTableExport,
  useColumnPresets,
  useTableKeyboardNavigation,
  useVirtualTable,
} from './hooks';
export type { UseTableOptions } from './hooks';

// Re-export commonly used types from @tanstack/react-table
export type {
  ColumnDef,
  RowData,
  Table as TanStackTable,
  Row,
  Cell,
  Header,
  Column,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowSelectionState,
  GroupingState,
  ExpandedState,
  PaginationState,
  ColumnOrderState,
  ColumnSizingState,
  ColumnPinningState,
  TableState,
  TableOptions,
  CellContext,
  HeaderContext,
} from '@tanstack/react-table';

// Export utility functions
export { flexRender } from '@tanstack/react-table';

// Example table setup
import { createTypedColumns } from './columns';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  role: string;
  joinDate: Date;
  lastLogin: Date;
  posts: number;
  avatar?: string;
}

export const exampleUserColumns = () => {
  const columnHelper = createTypedColumns<User>();

  return [
    createSelectionColumn<User>(),
    columnHelper.accessor('avatar', {
      header: 'Avatar',
      cell: info => (
        <img
          src={info.getValue() || '/placeholder-avatar.png'}
          alt=""
          className="w-10 h-10 rounded-full"
        />
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('name', 
      header: 'Name',
      cell: info => <span className="font-medium">info.getValue()</span>,),
    columnHelper.accessor('email', 
      header: 'Email',),
    columnHelper.accessor('status', 
      header: 'Status',
      cell: info => {
        const status = info.getValue();
        return (
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {status}
          </span>
        );
      },
      filterFn: 'equals',
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      filterFn: 'equals',
    }),
    columnHelper.accessor('joinDate', {
      header: 'Join Date',
      cell: info => new Date(info.getValue()).toLocaleDateString(),
      sortingFn: 'datetime',
    }),
    columnHelper.accessor('posts', {
      header: 'Posts',
      cell: info => info.getValue().toLocaleString(),
    }),
    createActionsColumn<User>([
      {
        label: 'Edit',
        onClick: row => console.log('Edit', row.original),
      },
      {
        label: 'Delete',
        onClick: row => console.log('Delete', row.original),
        className: 'text-destructive',
      },
    ]),
  ];
};