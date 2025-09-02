// ========================================
// 🚀 NEW CONSOLIDATED COMPONENT ARCHITECTURE
// ========================================

// Component Groups - Organized by feature area (RECOMMENDED)
export * from './groups';

// Core System Group - Essential providers and configuration
export { 
  CoreSystemGroup, 
  useCoreSystem, 
  useCoreSystemProviders, 
  withCoreSystem 
} from './groups/CoreSystemGroup';

// Runtime System
export { 
  RuntimeProvider, 
  useRuntime, 
  withRuntime 
} from './UnifiedRuntimeProvider.tsx';

// UI Components Group - All UI components with unified theming
export { 
  UIComponentsGroup, 
  useUIComponents,
  ThemedButton,
  ThemedCard,
  ThemedInput,
  ThemedBadge,
  ThemedTabs,
  ThemedIcon,
  UIBuilder,
  UIPresets
} from './groups/UIComponentsGroup';

// ========================================
// 🔄 LEGACY COMPATIBILITY LAYER
// ========================================

// Core providers (individual - for backward compatibility)
export * from './KatalystProvider.tsx';
export * from './IntegrationProvider.tsx';
export * from './ConfigProvider.tsx';
export * from './DesignSystem.tsx';
export * from './AccessibilityProvider.tsx';
export * from './TRPCProvider.tsx';

// Advanced Multithreading System (@swcstudio/multithreading)
export * from './MultithreadingProvider.tsx';
export * from './MultithreadingDemo.tsx';

// Integration components (legacy - consider using RuntimeProvider)
export * from './rspack-dashboard.tsx';
export * from './EMPRuntimeProvider.tsx';
export * from './UmiRuntimeProvider.tsx';
export * from './SailsRuntimeProvider.tsx';
export * from './TypiaRuntimeProvider.tsx';
export * from './InspectorRuntimeProvider.tsx';
export * from './zephyr-dashboard.tsx';

// UI Components (individual - for backward compatibility)
export * from './ui/Button.tsx';
export * from './ui/Input.tsx';
export * from './ui/Card.tsx';
export * from './ui/Badge.tsx';
export * from './ui/Tabs.tsx';

// SVG and Icon System
export * from './ui/Icon';

// Component Examples and Showcases
export { SVGShowcase } from './examples/SVGShowcase';

// ========================================
// 📦 MIGRATION GUIDE
// ========================================

/**
 * MIGRATION FROM INDIVIDUAL COMPONENTS TO GROUPS:
 * 
 * OLD APPROACH (multiple providers):
 * ```tsx
 * <KatalystProvider config={katalystConfig}>
 *   <ConfigProvider>
 *     <MultithreadingProvider>
 *       <EMPRuntimeProvider>
 *         <UmiRuntimeProvider>
 *           <DesignSystem>
 *             <App />
 *           </DesignSystem>
 *         </UmiRuntimeProvider>
 *       </EMPRuntimeProvider>
 *     </MultithreadingProvider>
 *   </ConfigProvider>
 * </KatalystProvider>
 * ```
 * 
 * NEW APPROACH (single group):
 * ```tsx
 * <CoreSystemGroup 
 *   config={{
 *     katalyst: katalystConfig,
 *     runtime: { enabledProviders: ['emp', 'umi'] },
 *     accessibility: { enabled: true },
 *     designSystem: { theme: 'modern', mode: 'dark' }
 *   }}
 * >
 *   <App />
 * </CoreSystemGroup>
 * ```
 * 
 * BENEFITS:
 * - 80% reduction in provider nesting
 * - Unified configuration interface
 * - Better performance through optimized context usage
 * - Enhanced developer experience
 * - Automatic integration between providers
 */
