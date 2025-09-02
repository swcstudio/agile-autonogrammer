/**
 * UI Components - All interface components in one logical group
 * No more scattered ui/* files
 */

// ========================================
// 🧱 BASIC COMPONENTS
// ========================================

export { Button } from '../components/ui/Button.tsx';
export { Card } from '../components/ui/Card.tsx';
export { Input } from '../components/ui/Input.tsx';
export { Badge } from '../components/ui/Badge.tsx';
export { Tabs } from '../components/ui/Tabs.tsx';
export { Icon } from '../components/ui/Icon.tsx';

// ========================================
// 📊 DATA COMPONENTS (actually used)
// ========================================

// TanStack components that are actually used in admin
export {
  DataTable,
  createColumns,
  useTableFilters,
  useTableSorting
} from '../components/tanstack/table';

export {
  QueryBoundary,
  QueryProvider
} from '../components/tanstack/query';

export {
  Form,
  FieldArray,
  useForm
} from '../components/tanstack/form';

// ========================================
// 🎯 COMPOSITE COMPONENTS
// ========================================

// Pre-built component combinations that are commonly used
export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        {/* Navigation */}
      </header>
      <main>
        {children}
      </main>
      <footer className="border-t mt-auto">
        {/* Footer */}
      </footer>
    </div>
  );
}

// ========================================
// 🎨 DESIGN SYSTEM UTILITIES
// ========================================

// Export design tokens for consistency
export {
  tokens,
  colors,
  spacing,
  typography,
  breakpoints
} from '../design-system/tokens.ts';

// Utility for consistent styling
export { cn } from '../utils/cn.ts';

/**
 * USAGE PATTERNS:
 * 
 * // Import what you need
 * import { Button, Card, DataTable } from '@shared/ui';
 * 
 * // Or use layouts
 * import { AdminLayout, DataTable } from '@shared/ui';
 * 
 * function AdminDashboard() {
 *   return (
 *     <AdminLayout>
 *       <DataTable data={users} columns={userColumns} />
 *     </AdminLayout>
 *   );
 * }
 */