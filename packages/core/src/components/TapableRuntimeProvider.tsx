/**
 * Tapable Runtime Provider for Katalyst Core
 *
 * Integrates Tapable's plugin architecture with Katalyst's superior React framework.
 * Provides extensible hook-based system for build-time and runtime plugins.
 *
 * CRITICAL: This integration enhances extensibility without replacing Katalyst patterns:
 * - Frontend: React 19 + TanStack Router + Zustand (Katalyst remains supreme)
 * - Plugin System: Tapable hooks for extensibility and build-time integrations
 * - Architecture: Plugin hooks complement Katalyst's superior component patterns
 */

import type React from 'react';
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import type {
  TapableCompiler,
  TapableConfig,
  TapablePerformanceStats,
  TapablePlugin,
  TapableStats,
} from '../integrations/tapable.ts';

interface TapableRuntimeConfig {
  config: TapableConfig;
  onError?: (error: Error) => void;
  onStats?: (stats: TapableStats) => void;
  developmentOnly?: boolean;
  enableWatch?: boolean;
}

interface TapableContextValue {
  // Core integration status
  isEnabled: boolean;
  isInitialized: boolean;
  error: Error | null;

  // Configuration access
  config: TapableConfig;

  // Compiler and plugin system
  compiler: {
    instance: TapableCompiler | null;
    isRunning: boolean;
    lastStats: TapableStats | null;
    performance: TapablePerformanceStats | null;
  };

  // Plugin management
  plugins: {
    registered: Map<string, TapablePlugin>;
    active: TapablePlugin[];
    failed: Array<{ plugin: string; error: Error }>;
  };

  // Hook system access
  hooks: {
    available: string[];
    interceptors: boolean;
    debugging: boolean;
    performance: boolean;
  };

  // Runtime operations
  operations: {
    registerPlugin: (plugin: TapablePlugin) => void;
    unregisterPlugin: (pluginName: string) => void;
    runCompilation: () => Promise<TapableStats>;
    startWatch: (files?: string[]) => void;
    stopWatch: () => void;
    clearStats: () => void;
  };

  // Performance monitoring
  performance: {
    enabled: boolean;
    stats: TapablePerformanceStats | null;
    hookExecutions: Map<string, number>;
    pluginExecutions: Map<string, number>;
    totalExecutionTime: number;
  };

  // Integration metadata
  integration: {
    framework: 'katalyst-react';
    version: string;
    features: string[];
    preserveKatalystSuperiority: true;
    role: 'plugin-system-enhancement';
  };
}

const TapableContext = createContext<TapableContextValue | null>(null);

// Mock provider for production or when disabled
const createMockTapableProvider = (config: TapableConfig): TapableContextValue => {
  console.log('🔧 Tapable disabled - production mode or config disabled');

  return {
    isEnabled: false,
    isInitialized: true,
    error: null,
    config,
    compiler: {
      instance: null,
      isRunning: false,
      lastStats: null,
      performance: null,
    },
    plugins: {
      registered: new Map(),
      active: [],
      failed: [],
    },
    hooks: {
      available: [],
      interceptors: false,
      debugging: false,
      performance: false,
    },
    operations: {
      registerPlugin: () => {},
      unregisterPlugin: () => {},
      runCompilation: async () => ({
        compilation: {
          hooks: {} as any,
          compiler: {} as any,
          modules: [],
          chunks: [],
          assets: {},
          errors: [],
          warnings: [],
          context: {},
        },
        time: 0,
        hash: 'mock',
        errors: [],
        warnings: [],
        modules: 0,
        chunks: 0,
        assets: 0,
        performance: {
          hookExecutions: new Map(),
          pluginExecutions: new Map(),
          totalTime: 0,
          compilationTime: 0,
          pluginTime: 0,
        },
      }),
      startWatch: () => {},
      stopWatch: () => {},
      clearStats: () => {},
    },
    performance: {
      enabled: false,
      stats: null,
      hookExecutions: new Map(),
      pluginExecutions: new Map(),
      totalExecutionTime: 0,
    },
    integration: {
      framework: 'katalyst-react',
      version: '1.0.0',
      features: ['mock-tapable'],
      preserveKatalystSuperiority: true,
      role: 'plugin-system-enhancement',
    },
  };
};

// Real Tapable provider for development
const createRealTapableProvider = async (config: TapableConfig): Promise<TapableContextValue> => {
  try {
    // Dynamic import of Tapable integration
    const { TapableIntegration } = await import('../integrations/tapable.ts');

    const integration = new TapableIntegration(config);
    await integration.initialize();

    const compiler = integration.getCompiler();
    const registeredPlugins = new Map<string, TapablePlugin>();
    let lastStats: TapableStats | null = null;
    let isRunning = false;
    let watcher: any = null;

    return {
      isEnabled: true,
      isInitialized: true,
      error: null,
      config,
      compiler: {
        instance: compiler,
        isRunning,
        lastStats,
        performance: integration.getPerformanceStats(),
      },
      plugins: {
        registered: registeredPlugins,
        active: compiler?.plugins || [],
        failed: [],
      },
      hooks: {
        available: [
          'environment',
          'afterEnvironment',
          'initialize',
          'beforeRun',
          'run',
          'beforeCompile',
          'compile',
          'make',
          'afterCompile',
          'emit',
          'afterEmit',
          'done',
          'failed',
          'katalystInit',
          'katalystCompile',
          'katalystOptimize',
        ],
        interceptors: config.features.interceptors,
        debugging: config.features.debugging,
        performance: config.features.performance,
      },
      operations: {
        registerPlugin: (plugin: TapablePlugin) => {
          registeredPlugins.set(plugin.name, plugin);
          if (compiler) {
            compiler.apply(plugin);
          }
        },
        unregisterPlugin: (pluginName: string) => {
          registeredPlugins.delete(pluginName);
        },
        runCompilation: async () => {
          if (!compiler) throw new Error('Compiler not available');

          isRunning = true;
          try {
            const stats = await compiler.run();
            lastStats = stats;
            return stats;
          } finally {
            isRunning = false;
          }
        },
        startWatch: (files?: string[]) => {
          if (compiler) {
            watcher = compiler.watch({ aggregateTimeout: 300 });
            if (files) {
              watcher.watch(files);
            }
          }
        },
        stopWatch: () => {
          if (watcher) {
            watcher.close();
            watcher = null;
          }
        },
        clearStats: () => {
          lastStats = null;
        },
      },
      performance: {
        enabled: config.features.performance,
        stats: integration.getPerformanceStats(),
        hookExecutions: integration.getPerformanceStats().hookExecutions,
        pluginExecutions: integration.getPerformanceStats().pluginExecutions,
        totalExecutionTime: integration.getPerformanceStats().totalTime,
      },
      integration: {
        framework: 'katalyst-react',
        version: '2.2.1',
        features: [
          'sync-hooks',
          'async-hooks',
          'interceptors',
          'performance-monitoring',
          'plugin-system',
          'webpack-compatible',
          'katalyst-enhanced',
        ],
        preserveKatalystSuperiority: true,
        role: 'plugin-system-enhancement',
      },
    };
  } catch (error) {
    throw new Error(
      `Tapable integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export function TapableRuntimeProvider({
  config,
  onError,
  onStats,
  developmentOnly = true,
  enableWatch = false,
  children,
}: TapableRuntimeConfig & { children: ReactNode }) {
  const [contextValue, setContextValue] = useState<TapableContextValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const watcherRef = useRef<any>(null);

  useEffect(() => {
    const initializeTapable = async () => {
      try {
        setIsLoading(true);

        // Check if Tapable should be enabled
        const isProduction = process.env.NODE_ENV === 'production';
        const shouldEnable = config.enabled && (!developmentOnly || !isProduction);

        let provider: TapableContextValue;

        if (shouldEnable) {
          provider = await createRealTapableProvider(config);

          // Setup watch mode if enabled
          if (enableWatch && provider.operations.startWatch) {
            provider.operations.startWatch();
          }
        } else {
          provider = createMockTapableProvider(config);
        }

        setContextValue(provider);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Tapable initialization failed');

        if (onError) {
          onError(err);
        } else {
          console.error('Tapable Runtime Error:', err.message);
        }

        // Fallback to mock provider on error
        setContextValue(createMockTapableProvider(config));
      } finally {
        setIsLoading(false);
      }
    };

    initializeTapable();

    // Cleanup on unmount
    return () => {
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [config, developmentOnly, enableWatch, onError]);

  // Stats callback effect
  useEffect(() => {
    if (contextValue?.compiler.lastStats && onStats) {
      onStats(contextValue.compiler.lastStats);
    }
  }, [contextValue?.compiler.lastStats, onStats]);

  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
        }}
      >
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>🔗 Initializing Tapable</div>
        <div style={{ color: '#6c757d' }}>Setting up plugin system...</div>
      </div>
    );
  }

  if (!contextValue) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
        }}
      >
        <div style={{ fontSize: '18px', marginBottom: '10px', color: '#721c24' }}>
          ❌ Tapable Failed
        </div>
        <div>Tapable integration could not be initialized. Check configuration.</div>
      </div>
    );
  }

  return <TapableContext.Provider value={contextValue}>{children}</TapableContext.Provider>;
}

// Health check component
export function TapableHealthCheck({
  fallback,
  children,
  showDevWarning = true,
}: {
  fallback?: ReactNode;
  children: ReactNode;
  showDevWarning?: boolean;
}) {
  const tapable = useContext(TapableContext);

  if (!tapable?.isEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showDevWarning && tapable?.config.development === false) {
      return (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>🔗 Tapable Available</div>
          <div style={{ fontSize: '14px', color: '#856404' }}>
            Tapable plugin system is available but disabled. Enable in development for extensible
            plugin architecture.
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// HOC for enhanced components with Tapable
export function withTapable<P extends object>(
  Component: React.ComponentType<P & { tapable: TapableContextValue }>
) {
  return function TapableEnhancedComponent(props: P) {
    const tapable = useContext(TapableContext);

    if (!tapable) {
      throw new Error('withTapable must be used within TapableRuntimeProvider');
    }

    return <Component {...props} tapable={tapable} />;
  };
}

// Plugin creation HOC
export function createTapablePlugin<P extends object>(
  name: string,
  Component: React.ComponentType<P>,
  pluginFactory: (props: P) => TapablePlugin
) {
  return function TapablePluginComponent(props: P) {
    const tapable = useContext(TapableContext);

    useEffect(() => {
      if (tapable?.isEnabled) {
        const plugin = pluginFactory(props);
        plugin.name = name;

        tapable.operations.registerPlugin(plugin);

        return () => {
          tapable.operations.unregisterPlugin(name);
        };
      }
    }, [tapable, props]);

    return <Component {...props} />;
  };
}

// Hook to access Tapable context
export function useTapable(): TapableContextValue {
  const context = useContext(TapableContext);

  if (!context) {
    throw new Error('useTapable must be used within TapableRuntimeProvider');
  }

  return context;
}

// Export context for advanced usage
export { TapableContext };
export type { TapableContextValue, TapableRuntimeConfig };
