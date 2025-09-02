/**
 * Re.Pack Components
 *
 * Advanced components for Re.Pack integration with RSpeedy
 */

// Core Re.Pack components
export { RepackProvider, useRepack, useRepackPerformance } from './RepackProvider';
export type {
  RepackConfig,
  RepackContextValue,
  BundleInfo,
  PerformanceMetrics,
} from './RepackProvider';

// Module federation components
export {
  ModuleFederationLoader,
  createFederatedComponent,
  FederatedModuleBatchLoader,
  useFederatedModule,
} from './ModuleFederationLoader';
export type { ModuleFederationLoaderProps } from './ModuleFederationLoader';

// Performance monitoring
export {
  PerformanceMonitor,
  PerformanceDashboard,
  usePerformanceThresholds,
} from './PerformanceMonitor';
export type {
  PerformanceThresholds,
  PerformanceMonitorProps,
  PerformanceDashboardProps,
} from './PerformanceMonitor';

// Re-export enhanced build system
export {
  RepackBuilder,
  RepackPresets,
  createRepackBuildConfig,
} from '../../build-system/repack-builder';
export type { RepackBuildConfig, RepackBuildResult } from '../../build-system/repack-builder';

// Utility components and hooks
export * from './utils';

// Example implementations
export * from './examples';
