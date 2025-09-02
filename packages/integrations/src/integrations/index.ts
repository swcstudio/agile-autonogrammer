/**
 * Integrations - All third-party tool integrations grouped by business purpose
 * Instead of scattered alphabetical technical files
 */

// ========================================
// 🏗️ BUILD & DEVELOPMENT TOOLS - Core stack  
// ========================================

// Primary build toolchain (production ready)
export * from './rspack.ts';
export * from './tanstack.ts';
export * from './fast-refresh.ts';
export * from './biome.ts';

// ========================================
// 🎨 UI & DESIGN SYSTEMS - Production ready
// ========================================

// Design and component libraries actually used
export * from './tailwind.ts';
export * from './stylex.ts'; 
export * from './arco.ts';
export * from './svgr.ts';

// ========================================
// 🧪 TESTING & QUALITY - Production tools
// ========================================

// Testing stack that's actually used
export * from './playwright.ts';
export * from './storybook.ts';
export * from './midscene.ts';

// ========================================
// 📦 BUNDLING & OPTIMIZATION - Active tools
// ========================================

// Build optimization (used in production)
export * from './nx.ts';
export * from './asset-manifest.ts';
export * from './virtual-modules.ts';

// ========================================
// 🔧 DEVELOPMENT TOOLING - Dev productivity  
// ========================================

// Developer experience tools
export * from './ngrok.ts';
export * from './inspector.ts';

// ========================================
// 🚀 PERFORMANCE & THREADING - Core capabilities
// ========================================

// Multithreading and performance (actively developed)
export * from './multithreading.ts';
export * from './zustand.ts';

// ========================================
// 🔒 AUTHENTICATION & SECURITY - Business needs
// ========================================

// User management (production ready)
export * from './clerk.ts';

// ========================================
// 🌐 EXPERIMENTAL INTEGRATIONS - Dev only
// ========================================

// Conditional loading for experimental features
export const ExperimentalIntegrations = {
  // Module federation experiments
  emp: () => import('./emp.ts'),
  repack: () => import('./repack.ts'),
  
  // Framework experiments  
  umi: () => import('./umi.ts'),
  sails: () => import('./sails.ts'),
  
  // Build tool experiments
  rspeedy: () => import('./rspeedy.ts'),
  esmx: () => import('./esmx.ts'),
  pareto: () => import('./pareto.ts'),
  
  // Runtime experiments
  tapable: () => import('./tapable.ts'),
  typia: () => import('./typia.ts'),
  nitro: () => import('./nitro.ts'),
  
  // Platform experiments
  tauri: () => import('./tauri.ts'),
  webxr: () => import('./webxr.ts'),
  
  // Analysis experiments  
  cosmos: () => import('./cosmos.ts')
};

// ========================================
// 🎯 INTEGRATION GROUPS - By use case
// ========================================

/**
 * Pre-configured integration groups for common scenarios
 */
export const IntegrationGroups = {
  /**
   * Core React app integrations
   * Used by: Basic marketing sites, simple apps
   */
  coreApp: [
    'rspack',
    'tanstack', 
    'fast-refresh',
    'tailwind',
    'biome'
  ],

  /**
   * Admin dashboard integrations  
   * Used by: Data-heavy admin interfaces
   */
  adminDashboard: [
    'rspack',
    'tanstack',
    'arco', 
    'zustand',
    'clerk',
    'playwright'
  ],

  /**
   * Development environment
   * Used by: Local development setup
   */
  development: [
    'rspack',
    'fast-refresh', 
    'biome',
    'storybook',
    'ngrok',
    'inspector'
  ],

  /**
   * Production build  
   * Used by: Production deployment
   */
  production: [
    'rspack',
    'nx',
    'asset-manifest',
    'biome'
  ]
};

/**
 * FOCUSED ON ACTUAL BUSINESS NEEDS:
 * 
 * ✅ RSpack build system (primary)
 * ✅ TanStack data management (actively used)
 * ✅ Tailwind/StyleX styling (production ready)
 * ✅ Playwright testing (established workflow)
 * ✅ Arco components (used in admin)
 * ✅ Clerk authentication (business requirement)
 * 
 * MOVED TO EXPERIMENTAL:
 * 🧪 EMP federation (experimental)
 * 🧪 Umi framework (not actively used)
 * 🧪 Repack mobile (incomplete)
 * 🧪 Tauri desktop (future consideration)
 * 🧪 WebXR (research project)
 * 
 * USAGE PATTERNS:
 * 
 * // Import production-ready integrations directly
 * import { rspackConfig, tanstackQuery } from '@shared/integrations';
 * 
 * // Use integration groups for common setups
 * import { IntegrationGroups } from '@shared/integrations';  
 * const coreIntegrations = IntegrationGroups.coreApp;
 * 
 * // Conditionally load experimental features
 * if (process.env.NODE_ENV === 'development') {
 *   const { emp } = await import('@shared/integrations').ExperimentalIntegrations;
 *   const empConfig = await emp();
 * }
 */