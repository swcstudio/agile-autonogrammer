/**
 * @katalyst/data - Data management feature module
 * 
 * Used by: remix admin dashboard, analytics views
 * Contains: TanStack React Query, Tables, Forms, API clients
 */

// ========================================
// 🔌 DATA PROVIDERS
// ========================================

export { TRPCProvider } from '../../components/TRPCProvider.tsx';

// ========================================
// 📊 DATA COMPONENTS - Actually used in production
// ========================================

// TanStack Query components (used in admin dashboard)
export {
  QueryBoundary,
  QueryProvider,
  createApiClient,
  useInfiniteQuery,
  useMutation,
  useQuery
} from '../../components/tanstack/query';

// TanStack Table (heavily used in admin)
export {
  DataTable,
  createColumns,
  useTableFilters,
  useTableSorting
} from '../../components/tanstack/table';

// TanStack Form (used in admin forms)
export {
  Form,
  FieldArray,
  useForm,
  useFormValidation
} from '../../components/tanstack/form';

// ========================================
// 🪝 DATA HOOKS
// ========================================

export { useServerActions } from '../../hooks/use-server-actions.ts';
export { useTRPC } from '../../hooks/use-trpc.ts';

// ========================================
// 🏪 DATA STORES
// ========================================

// Analytics store (used in admin dashboard)
export { 
  useAnalyticsStore,
  type AnalyticsState 
} from '../../stores/analytics-store.ts';

/**
 * REAL USAGE PATTERNS:
 * 
 * ✅ Admin Dashboard: DataTable + QueryBoundary + Forms
 * ✅ Analytics Views: useQuery + Charts + Filters  
 * ✅ User Management: TRPC + Forms + Mutations
 * 
 * Bundle size: ~25KB (TanStack suite)
 * Dependencies: @tanstack/react-query, @tanstack/react-table
 */