/**
 * @katalyst/dev-tools - Development and debugging tools
 * 
 * Used by: Development environments only
 * Contains: Demos, benchmarks, debugging utilities
 * 
 * ⚠️ NOT FOR PRODUCTION - Development only
 */

// ========================================
// 🔬 DEVELOPMENT DEMOS
// ========================================

export { MultithreadingDemo } from '../components/MultithreadingDemo.tsx';
export { SVGShowcase } from '../components/examples/SVGShowcase.tsx';

// Dashboard demos (development only)
export { default as RspackDashboard } from '../components/rspack-dashboard.tsx';
export { default as ZephyrDashboard } from '../components/zephyr-dashboard.tsx';

// ========================================
// 🧪 EXPERIMENTAL FEATURES
// ========================================

// Multithreading (experimental - not production ready)
export {
  MultithreadingProvider,
  useMultithreading,
  useAdvancedMultithreading
} from '../components/MultithreadingProvider.tsx';

// Native module experiments
export * from '../native';

// ========================================
// 📊 PERFORMANCE TOOLS
// ========================================

// Benchmarking utilities
export {
  createBenchmark,
  measurePerformance,
  generateReport
} from '../test-utils/performance-tools.ts';

// Visual regression testing
export {
  takeScreenshot,
  compareScreenshots,
  generateVisualReport
} from '../test-utils/visual-regression.ts';

// ========================================
// 🔍 DEBUGGING UTILITIES
// ========================================

// WebSocket monitor for runtime inspection
export { WebSocketMonitor } from '../dev-tools/websocket-monitor.ts';

// Component test generator
export {
  generateComponentTests,
  createTestSuite,
  runTestAnalysis
} from '../test-utils/component-test-generator.ts';

// ========================================
// 🌐 EXPERIMENTAL RUNTIME PROVIDERS
// ========================================

// These are experimental and should NOT be used in production
export { EMPRuntimeProvider } from '../components/EMPRuntimeProvider.tsx';
export { UmiRuntimeProvider } from '../components/UmiRuntimeProvider.tsx';
export { SailsRuntimeProvider } from '../components/SailsRuntimeProvider.tsx';
export { InspectorRuntimeProvider } from '../components/InspectorRuntimeProvider.tsx';
export { TapableRuntimeProvider } from '../components/TapableRuntimeProvider.tsx';
export { TypiaRuntimeProvider } from '../components/TypiaRuntimeProvider.tsx';

// Experimental hooks
export { useEMP } from '../hooks/use-emp.ts';
export { useUmi } from '../hooks/use-umi.ts';
export { useSails } from '../hooks/use-sails.ts';
export { useInspector } from '../hooks/use-inspector.ts';
export { useTapable } from '../hooks/use-tapable.ts';
export { useRspeedy } from '../hooks/use-rspeedy.ts';

// ========================================
// 🎯 FUTURE/EXPERIMENTAL INTEGRATIONS
// ========================================

// WebXR (experimental)
export * from '../webxr';

// Mobile components (incomplete)
export * from '../mobile';

// Scraper utilities (dev tooling)
export * from '../scraper';

/**
 * ⚠️ DEVELOPMENT ONLY WARNING
 * 
 * This package should NEVER be imported in production code.
 * Use conditional imports or separate dev dependencies.
 * 
 * Example usage:
 * ```typescript
 * if (process.env.NODE_ENV === 'development') {
 *   const { MultithreadingDemo } = await import('@katalyst/dev-tools');
 *   // Use dev tools
 * }
 * ```
 * 
 * Bundle size: ~200KB (includes all experimental code)
 * Dependencies: Development only
 */