/**
 * @swcstudio/katalyst-shared - Public API
 * 
 * This is the ONLY file that should be imported by consumers.
 * All internal file structure is hidden from the public API.
 */

// ========================================
// 🏗️ CORE FRAMEWORK - Always available
// ========================================

// Essential providers and components
export { KatalystProvider, useKatalystContext } from './components/KatalystProvider.tsx';
export { ConfigProvider } from './components/ConfigProvider.tsx';
export { DesignSystem } from './components/DesignSystem.tsx';

// Master app wrapper (most common usage)
export { KatalystApp, DesignProvider, DataProvider } from './providers';

// Core UI components  
export { 
  Button, Card, Input, Badge, Tabs, Icon,
  AdminLayout, MarketingLayout,
  tokens, colors, spacing, typography, breakpoints,
  cn
} from './ui';

// ========================================
// 📊 DATA MANAGEMENT - Feature module
// ========================================

export const Data = {
  // TanStack suite
  DataTable: () => import('./ui').then(m => m.DataTable),
  createColumns: () => import('./ui').then(m => m.createColumns),
  useTableFilters: () => import('./ui').then(m => m.useTableFilters),
  
  QueryBoundary: () => import('./ui').then(m => m.QueryBoundary),
  QueryProvider: () => import('./ui').then(m => m.QueryProvider),
  
  Form: () => import('./ui').then(m => m.Form),
  FieldArray: () => import('./ui').then(m => m.FieldArray),
  useForm: () => import('./ui').then(m => m.useForm),
  
  // Data hooks
  useQuery: () => import('./hooks/use-trpc.ts').then(m => m.useQuery),
  useMutation: () => import('./hooks/use-trpc.ts').then(m => m.useMutation),
  
  // Store
  useKatalystStore: () => import('./stores/unified-katalyst-store.ts').then(m => m.useKatalystStore)
};

// ========================================
// 🏗️ BUILD TOOLS - Feature module  
// ========================================

export const Build = {
  // RSpack configurations (most common)
  createCoreConfig: () => import('./plugins').then(m => m.BuildConfigs.core),
  createRemixConfig: () => import('./plugins').then(m => m.BuildConfigs.remix),
  createAdminConfig: () => import('./plugins').then(m => m.BuildConfigs.admin),
  
  // Advanced configurations
  KatalystBuildPresets: () => import('./plugins').then(m => m.KatalystBuildPresets),
  RSpackPluginManager: () => import('./plugins').then(m => m.RSpackPluginManager),
  
  // Integrations
  integrations: () => import('./integrations').then(m => m.IntegrationGroups)
};

// ========================================
// 💳 COMMERCE - Feature module
// ========================================

export const Commerce = {
  // Payment components
  CheckoutForm: () => import('./features/commerce').then(m => m.CheckoutForm),
  PaymentButton: () => import('./features/commerce').then(m => m.PaymentButton),
  
  // Payment hooks
  usePayment: () => import('./features/commerce').then(m => m.usePayment),
  useCart: () => import('./features/commerce').then(m => m.useCart),
  
  // Providers
  HyperswitchProvider: () => import('./features/commerce').then(m => m.HyperswitchProvider),
  WalletConnectProvider: () => import('./features/commerce').then(m => m.WalletConnectProvider)
};

// ========================================
// 🚀 MULTITHREADING - Advanced feature
// ========================================

export const Threading = {
  // Core multithreading
  useMultithreading: () => import('./hooks/use-multithreading.ts').then(m => m.useMultithreading),
  useAdvancedMultithreading: () => import('./hooks/use-multithreading.ts').then(m => m.useAdvancedMultithreading),
  
  // AI processing
  useAITaskProcessor: () => import('./hooks/use-multithreading.ts').then(m => m.useAITaskProcessor),
  
  // Provider (conditional)
  MultithreadingProvider: () => import('./components/MultithreadingProvider.tsx').then(m => m.MultithreadingProvider)
};

// ========================================
// 🔧 DEV TOOLS - Development only
// ========================================

export const DevTools = process.env.NODE_ENV === 'development' ? {
  // Development demos
  MultithreadingDemo: () => import('./dev-tools').then(m => m.MultithreadingDemo),
  RspackDashboard: () => import('./dev-tools').then(m => m.RspackDashboard),
  
  // Performance tools
  createBenchmark: () => import('./dev-tools').then(m => m.createBenchmark),
  takeScreenshot: () => import('./dev-tools').then(m => m.takeScreenshot),
  
  // Experimental providers (lazy loaded)
  experimental: () => import('./dev-tools').then(m => ({
    EMPRuntimeProvider: m.EMPRuntimeProvider,
    UmiRuntimeProvider: m.UmiRuntimeProvider,
    SailsRuntimeProvider: m.SailsRuntimeProvider
  }))
} : {};

// ========================================
// 📦 TYPE EXPORTS - TypeScript support
// ========================================

// Core types that consumers might need
export type { 
  KatalystConfig,
  IntegrationConfig 
} from './types';

// Build types
export type {
  RSpackPluginConfig,
  BuildVariant
} from './plugins/rspack-plugins.ts';

// ========================================
// 🎯 VERSION & METADATA
// ========================================

export const VERSION = '1.0.0';
export const PACKAGE_NAME = '@swcstudio/katalyst-shared';

/**
 * ========================================
 * 📖 USAGE GUIDE
 * ========================================
 * 
 * SIMPLE CORE APP:
 * ```typescript
 * import { KatalystApp, Button, Card } from '@swcstudio/katalyst-shared';
 * 
 * function App() {
 *   return (
 *     <KatalystApp>
 *       <Card>
 *         <Button>Click me</Button>
 *       </Card>
 *     </KatalystApp>
 *   );
 * }
 * ```
 * 
 * ADMIN DASHBOARD:
 * ```typescript
 * import { KatalystApp, Data } from '@swcstudio/katalyst-shared';
 * 
 * function AdminApp() {
 *   const { DataTable, useQuery } = Data;
 *   return (
 *     <KatalystApp features={{ data: true }}>
 *       <DataTable data={users} />
 *     </KatalystApp>
 *   );
 * }
 * ```
 * 
 * BUILD CONFIGURATION:
 * ```typescript
 * import { Build } from '@swcstudio/katalyst-shared';
 * 
 * // rspack.config.js
 * export default await Build.createCoreConfig();
 * ```
 * 
 * DEVELOPMENT ONLY:
 * ```typescript
 * if (process.env.NODE_ENV === 'development') {
 *   const { DevTools } = await import('@swcstudio/katalyst-shared');
 *   const { MultithreadingDemo } = DevTools;
 * }
 * ```
 */