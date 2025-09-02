/**
 * Fast Refresh Integration for Katalyst
 * 
 * Main exports for the Fast Refresh package
 */

// Core provider and hooks
export {
  KatalystFastRefreshProvider,
  useFastRefresh,
} from './KatalystFastRefreshProvider';

export type {
  FastRefreshConfig,
  FastRefreshContextValue,
  FastRefreshError,
  FastRefreshStats,
  RefreshUpdate,
  FastRefreshIntegration,
} from './KatalystFastRefreshProvider';

// Runtime engine
export { FastRefreshRuntime } from './fast-refresh-runtime';

// Integration modules
export { TanStackFastRefresh, useQueryStatePreservation, useRouterStatePreservation } from './integrations/tanstack-fast-refresh';
export { StyleXFastRefresh, useStyleXThemePreservation, useStyleXTokenPreservation } from './integrations/stylex-fast-refresh';
export { RePackFastRefresh, useFederatedModulePreservation, useMobileStatePreservation } from './integrations/repack-fast-refresh';
export { NgrokFastRefresh, useTeamFastRefresh } from './integrations/ngrok-fast-refresh';

// Configuration presets
export const createWebFastRefreshConfig = (debugMode = false): FastRefreshConfig => ({
  platform: 'web',
  bundler: 'vite',
  preserveState: true,
  errorRecovery: true,
  crossPlatformSync: true,
  debugMode,
  
  tanstack: {
    refreshQueries: true,
    preserveRouterState: true,
    refreshTables: true,
    refreshForms: true,
  },
  
  stylex: {
    hotThemes: true,
    preserveThemeState: true,
    refreshTokens: true,
  },
  
  ngrok: {
    broadcastChanges: true,
    teamSync: true,
    tunnelRefresh: true,
  },
  
  debounceMs: 100,
  maxRetries: 3,
  fallbackToReload: true,
});

export const createMobileFastRefreshConfig = (debugMode = false): FastRefreshConfig => ({
  platform: 'mobile',
  bundler: 'repack',
  preserveState: true,
  errorRecovery: true,
  crossPlatformSync: true,
  debugMode,
  
  tanstack: {
    refreshQueries: true,
    preserveRouterState: true,
    refreshTables: false, // Tables less common on mobile
    refreshForms: true,
  },
  
  repack: {
    federatedModules: true,
    mobileSync: true,
    chunkRefresh: true,
  },
  
  ngrok: {
    broadcastChanges: true,
    teamSync: true,
    tunnelRefresh: true,
  },
  
  debounceMs: 150, // Slightly higher for mobile
  maxRetries: 5,
  fallbackToReload: true,
});

export const createKatalystFastRefreshConfig = (
  platform: 'web' | 'mobile' = 'web',
  debugMode = false
): FastRefreshConfig => {
  const baseConfig = platform === 'mobile' 
    ? createMobileFastRefreshConfig(debugMode)
    : createWebFastRefreshConfig(debugMode);

  return {
    ...baseConfig,
    // Katalyst-specific optimizations
    tanstack: {
      ...baseConfig.tanstack,
      refreshQueries: true,
      preserveRouterState: true,
      refreshTables: true,
      refreshForms: true,
    },
    
    stylex: {
      ...baseConfig.stylex,
      hotThemes: true,
      preserveThemeState: true,
      refreshTokens: true,
    },
    
    repack: platform === 'mobile' ? {
      federatedModules: true,
      mobileSync: true,
      chunkRefresh: true,
    } : undefined,
    
    ngrok: {
      broadcastChanges: true,
      teamSync: true,
      tunnelRefresh: true,
    },
  };
};

// Utility functions
export const detectBundler = (): 'vite' | 'webpack' | 'repack' | 'metro' => {
  if (typeof window !== 'undefined') {
    if ((window as any).__vite_plugin_react_preamble_installed__) {
      return 'vite';
    }
    if ((window as any).__webpack_require__) {
      return 'webpack';
    }
  }
  
  if (typeof global !== 'undefined') {
    if ((global as any).__REPACK__) {
      return 'repack';
    }
    if ((global as any).__METRO_GLOBAL_PREFIX__) {
      return 'metro';
    }
  }
  
  return 'vite'; // Default fallback
};

export const detectPlatform = (): 'web' | 'mobile' | 'electron' | 'ssr' => {
  if (typeof window !== 'undefined') {
    // Check for Electron
    if ((window as any).require && (window as any).process?.type) {
      return 'electron';
    }
    return 'web';
  }
  
  if (typeof global !== 'undefined') {
    // Check for React Native
    if ((global as any).__METRO_GLOBAL_PREFIX__ || (global as any).navigator?.product === 'ReactNative') {
      return 'mobile';
    }
    
    // Check for Node.js SSR
    if ((global as any).process?.versions?.node) {
      return 'ssr';
    }
  }
  
  return 'web'; // Default fallback
};

export const createAutoDetectedConfig = (debugMode = false): FastRefreshConfig => {
  const platform = detectPlatform();
  const bundler = detectBundler();
  
  return {
    platform,
    bundler,
    preserveState: true,
    errorRecovery: true,
    crossPlatformSync: true,
    debugMode,
    
    tanstack: {
      refreshQueries: true,
      preserveRouterState: true,
      refreshTables: platform !== 'mobile', // Skip tables on mobile
      refreshForms: true,
    },
    
    stylex: {
      hotThemes: true,
      preserveThemeState: true,
      refreshTokens: true,
    },
    
    repack: platform === 'mobile' ? {
      federatedModules: true,
      mobileSync: true,
      chunkRefresh: true,
    } : undefined,
    
    ngrok: {
      broadcastChanges: true,
      teamSync: true,
      tunnelRefresh: true,
    },
    
    debounceMs: platform === 'mobile' ? 150 : 100,
    maxRetries: platform === 'mobile' ? 5 : 3,
    fallbackToReload: true,
  };
};

// Helper components
export const FastRefreshDevtools = ({ config }: { config?: FastRefreshConfig }) => {
  const fastRefresh = useFastRefresh();
  const stats = fastRefresh.getRefreshStats();
  
  if (!config?.debugMode) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      <div>🔥 Fast Refresh</div>
      <div>Refreshes: {stats.totalRefreshes}</div>
      <div>Avg {Math.round(stats.averageRefreshTime)}ms</div>
      <div>Errors: {stats.errorCount}</div>
      <div>Platform: {stats.platform}</div>
      {fastRefresh.isRefreshing && <div>⚡ Refreshing...</div>}
    </div>
  );
};

// Global setup function
export const setupKatalystFastRefresh = (config?: Partial<FastRefreshConfig>) => {
  const autoConfig = createAutoDetectedConfig(config?.debugMode);
  const finalConfig = { ...autoConfig, ...config };
  
  // Set up global Fast Refresh
  if (typeof window !== 'undefined') {
    (window as any).__KATALYST_FAST_REFRESH_CONFIG__ = finalConfig;
    
    // Auto-initialize if React is available
    if ((window as any).React) {
      console.log('🔥 Katalyst Fast Refresh auto-initialized');
    }
  }
  
  return finalConfig;
};

// Performance monitoring
export const FastRefreshPerformanceMonitor = () => {
  const fastRefresh = useFastRefresh();
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      const stats = fastRefresh.getRefreshStats();
      
      if (stats.averageRefreshTime > 500) {
        console.warn('🐌 Fast Refresh performance degraded:', {
          averageTime: stats.averageRefreshTime,
          totalRefreshes: stats.totalRefreshes,
          errorRate: stats.errorCount / stats.totalRefreshes,
        });
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [fastRefresh]);
  
  return null;
};

// Error boundary for Fast Refresh
export class FastRefreshErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Fast Refresh Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>🔥 Fast Refresh Error</h2>
          <p>An error occurred during Fast Refresh. The page will reload automatically.</p>
          <pre style=textAlign: 'left', fontSize: '12px', overflow: 'auto' >this.state.error?.stack
          </pre>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// React import for components
import React from 'react';