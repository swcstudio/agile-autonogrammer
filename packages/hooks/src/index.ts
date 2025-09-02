/**
 * 🚀 KATALYST HOOKS - UNIFIED INTERFACE
 * =====================================
 * 
 * THE ONLY HOOK YOU NEED: useKatalyst()
 * 
 * Example usage:
 * ```tsx
 * import { useKatalyst } from '@katalyst/hooks';
 * 
 * function MyComponent() {
 *   const k = useKatalyst();
 *   
 *   // Use any hook through the unified interface
 *   const [state, setState] = k.state('initial');
 *   const debouncedValue = k.utils.debounce(state, 500);
 *   const { width, height } = k.dom.windowSize();
 *   const runtime = k.runtime();
 *   
 *   // Quick access with $
 *   const [count, setCount] = k.$.state(0);
 *   const isMobile = k.$.mediaQuery('(max-width: 768px)');
 *   
 *   // Common patterns
 *   const modal = k.patterns.modal();
 *   const { filtered } = k.patterns.search(items, 'name');
 *   const { currentPage, nextPage } = k.patterns.pagination(100, 10);
 * }
 * ```
 */

// ========================================
// 🎯 PRIMARY EXPORT - USE THIS!
// ========================================
export { 
  useKatalyst, 
  type KatalystHook,
  katalystCore,
  katalystDOM,
  katalystUtils 
} from './use-katalyst-unified';

// ========================================
// 🚀 REACT COMPATIBILITY LAYER
// ========================================
export * as React from './react';
export * from './react-compat';

// ========================================
// 🔧 CORE HOOKS (Available via useKatalyst)
// ========================================
export * from './core/common-hooks';
export * from './core/dom-hooks';
export * from './core/utility-hooks';

// ========================================
// 🚀 KATALYST RUNTIME & INTEGRATIONS
// ========================================
export { useKatalystRuntime, type KatalystRuntimeConfig } from './use-katalyst-runtime';
export * from './use-multithreading';

// ========================================
// 🌟 ELIXIR/PHOENIX-INSPIRED HOOKS
// ========================================
export * from './use-actor-system';
export * from './use-genserver';
export * from './use-pubsub';
export * from './use-registry';
export * from './use-channels';
export * from './use-ets';
export * from './use-presence';

// ========================================
// 📦 LEGACY EXPORTS (For backward compatibility)
// ========================================
export * from './use-config';
export * from './use-emp';
export * from './use-hydration';
export * from './use-integration';
export * from './use-katalyst';
export * from './use-rspack';
export * from './use-sails';
export * from './use-inspector';
export * from './use-server-actions';
export * from './use-unified-builder';
export * from './use-zephyr';
export * from './use-umi';
export * from './use-rspeedy';
export * from './use-arco';
export * from './use-trpc';
export * from './use-typia';
export * from './use-tapable';

// ========================================
// 📚 HOOK USAGE GUIDE
// ========================================

/**
 * QUICK REFERENCE:
 * 
 * useKatalyst() provides:
 * 
 * 1. CORE REACT (Enhanced):
 *    - k.state()       → useState with persistence & history
 *    - k.effect()      → useEffect with debounce/throttle
 *    - k.callback()    → useCallback
 *    - k.memo()        → useMemo
 *    - k.ref()         → useRef
 * 
 * 2. DOM & BROWSER:
 *    - k.dom.windowSize()       → Window dimensions
 *    - k.dom.mediaQuery()       → Media query matching
 *    - k.dom.outsideClick()     → Click outside detection
 *    - k.dom.scrollPosition()   → Scroll position tracking
 *    - k.dom.inView()          → Intersection observer
 *    - k.dom.localStorage()     → Local storage with sync
 *    - k.dom.clipboard()        → Clipboard operations
 *    - k.dom.keyPress()         → Keyboard event handling
 *    - k.dom.scrollDirection()  → Scroll direction detection
 *    - k.dom.onlineStatus()     → Online/offline status
 * 
 * 3. UTILITIES:
 *    - k.utils.debounce()      → Debounced values
 *    - k.utils.throttle()      → Throttled values
 *    - k.utils.toggle()        → Boolean toggle
 *    - k.utils.counter()       → Counter operations
 *    - k.utils.previous()      → Previous value tracking
 *    - k.utils.async()         → Async operation handling
 *    - k.utils.interval()      → Interval management
 *    - k.utils.timeout()       → Timeout management
 *    - k.utils.fetch()         → Data fetching
 *    - k.utils.mount()         → Mount callback
 *    - k.utils.unmount()       → Unmount callback
 *    - k.utils.updateEffect()  → Effect skipping first render
 * 
 * 4. BUILD TOOLS:
 *    - k.build.emp()           → EMP integration
 *    - k.build.umi()           → UMI integration
 *    - k.build.rspack()        → RSPack integration
 *    - k.build.zephyr()        → Zephyr integration
 *    - k.build.unified()       → Unified builder
 * 
 * 5. INTEGRATIONS:
 *    - k.integrations.arco()   → Arco Design
 *    - k.integrations.trpc()   → tRPC
 *    - k.integrations.typia()  → Typia validation
 *    - k.integrations.sails()  → Sails framework
 * 
 * 6. COMMON PATTERNS:
 *    - k.patterns.query()      → Data fetching
 *    - k.patterns.store()      → Persistent state
 *    - k.patterns.modal()      → Modal management
 *    - k.patterns.pagination() → Pagination logic
 *    - k.patterns.search()     → Search filtering
 *    - k.patterns.filter()     → Multi-filter logic
 *    - k.patterns.sort()       → Sorting logic
 * 
 * 7. QUICK ACCESS ($):
 *    - k.$.state()            → Most used hooks
 *    - k.$.effect()           → for quick access
 *    - k.$.fetch()
 *    - k.$.debounce()
 *    - k.$.localStorage()
 */

// ========================================
// 🎨 TYPE EXPORTS
// ========================================
export type {
  // Multithreading types
  AdvancedThreadTask,
  AdvancedTaskResult,
  ThreadPoolMetrics,
  SystemMetrics,
  ThreadLifecycleConfig,
} from './use-multithreading';

// Re-export for convenience
export type { KatalystConfig } from '../types/index';

// ========================================
// 🌟 MIGRATION HELPER
// ========================================

/**
 * Migrate from individual hooks to useKatalyst:
 * 
 * OLD:
 * ```tsx
 * import { useState, useEffect } from 'react';
 * import { useWindowSize, useDebounce } from '@katalyst/hooks';
 * import { useEMP } from '@katalyst/hooks';
 * 
 * function Component() {
 *   const [value, setValue] = useState('');
 *   const debouncedValue = useDebounce(value, 500);
 *   const { width } = useWindowSize();
 *   const emp = useEMP();
 * }
 * ```
 * 
 * NEW:
 * ```tsx
 * import { useKatalyst } from '@katalyst/hooks';
 * 
 * function Component() {
 *   const k = useKatalyst();
 *   const [value, setValue] = k.state('');
 *   const debouncedValue = k.utils.debounce(value, 500);
 *   const { width } = k.dom.windowSize();
 *   const emp = k.build.emp();
 * }
 * ```
 */