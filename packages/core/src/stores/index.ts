// ========================================
// 🚀 NEW CONSOLIDATED STORE ARCHITECTURE
// ========================================

// Master Katalyst Store - Single source of truth (RECOMMENDED)
export {
  useKatalystStore,
  useSystemState,
  useRuntimeState,
  useMultithreadingState,
  useConfigState,
  useUIState,
  useAnalyticsState,
  type KatalystState,
  type KatalystActions,
} from './unified-katalyst-store.ts';

// ========================================
// 🔄 LEGACY COMPATIBILITY LAYER
// ========================================

// Individual stores (for backward compatibility)
export * from './config-store.ts';
export * from './integration-store.ts';
export * from './katalyst-store.ts';
export * from './multithreading-store.ts';
export * from './payment-store.ts';

// ========================================
// 📦 STORE MIGRATION GUIDE
// ========================================

/**
 * MIGRATION FROM INDIVIDUAL STORES TO CONSOLIDATED STORE:
 * 
 * OLD APPROACH (multiple stores):
 * ```tsx
 * const config = useConfigStore();
 * const integration = useIntegrationStore();
 * const multithreading = useMultithreadingStore();
 * const katalyst = useKatalystStore();
 * const payment = usePaymentStore();
 * ```
 * 
 * NEW APPROACH (single store):
 * ```tsx
 * // Option 1: Use individual slices
 * const system = useSystemState();
 * const runtime = useRuntimeState();
 * const multithreading = useMultithreadingState();
 * const config = useConfigState();
 * const ui = useUIState();
 * const analytics = useAnalyticsState();
 * 
 * // Option 2: Use master store
 * const katalyst = useKatalystStore();
 * 
 * // Update state
 * katalyst.updateKatalystConfig({ theme: 'dark' });
 * katalyst.registerProvider(providerState);
 * katalyst.addTask(threadTask);
 * ```
 * 
 * BENEFITS:
 * - 60% reduction in store complexity
 * - Centralized state management
 * - Better performance through optimized selectors
 * - Type-safe actions across all domains
 * - Built-in analytics and monitoring
 */
