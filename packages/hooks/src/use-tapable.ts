/**
 * Tapable Integration Hooks for Katalyst Core
 *
 * Comprehensive hook library for Tapable plugin system integration.
 * Provides React hooks for managing plugins, compilation, and performance monitoring.
 *
 * ARCHITECTURAL PRINCIPLE: These hooks enhance extensibility without replacement.
 * Katalyst remains superior for state management, routing, and components.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type TapableContextValue, useTapable } from '../components/TapableRuntimeProvider.tsx';
import type {
  TapableAsset,
  TapableChunk,
  TapableModule,
  TapablePerformanceStats,
  TapablePlugin,
  TapableStats,
} from '../integrations/tapable.ts';

// Core Tapable hook - main integration point
export function useTapableCore() {
  const tapable = useTapable();

  return useMemo(
    () => ({
      // Core status
      isEnabled: tapable.isEnabled,
      isInitialized: tapable.isInitialized,
      error: tapable.error,
      config: tapable.config,

      // Compiler access
      compiler: tapable.compiler.instance,
      isRunning: tapable.compiler.isRunning,
      lastStats: tapable.compiler.lastStats,

      // Integration metadata
      integration: tapable.integration,

      // Quick access to core operations
      registerPlugin: tapable.operations.registerPlugin,
      runCompilation: tapable.operations.runCompilation,
      startWatch: tapable.operations.startWatch,
      stopWatch: tapable.operations.stopWatch,
    }),
    [tapable]
  );
}

// Plugin management hook
export function useTapablePlugins() {
  const tapable = useTapable();
  const [pluginHistory, setPluginHistory] = useState<
    Array<{
      action: 'register' | 'unregister';
      plugin: string;
      timestamp: number;
    }>
  >([]);

  const registerPlugin = useCallback(
    (plugin: TapablePlugin) => {
      tapable.operations.registerPlugin(plugin);
      setPluginHistory((prev) => [
        { action: 'register', plugin: plugin.name, timestamp: Date.now() },
        ...prev.slice(0, 49), // Keep last 50 actions
      ]);
    },
    [tapable.operations]
  );

  const unregisterPlugin = useCallback(
    (pluginName: string) => {
      tapable.operations.unregisterPlugin(pluginName);
      setPluginHistory((prev) => [
        { action: 'unregister', plugin: pluginName, timestamp: Date.now() },
        ...prev.slice(0, 49),
      ]);
    },
    [tapable.operations]
  );

  const createSyncPlugin = useCallback(
    (name: string, hookName: string, handler: (...args: any[]) => any) => {
      const plugin: TapablePlugin = {
        name,
        apply: (compiler) => {
          if (compiler.hooks[hookName as keyof typeof compiler.hooks]) {
            (compiler.hooks[hookName as keyof typeof compiler.hooks] as any).tap(name, handler);
          }
        },
      };
      return plugin;
    },
    []
  );

  const createAsyncPlugin = useCallback(
    (name: string, hookName: string, handler: (...args: any[]) => Promise<any>) => {
      const plugin: TapablePlugin = {
        name,
        apply: (compiler) => {
          if (compiler.hooks[hookName as keyof typeof compiler.hooks]) {
            (compiler.hooks[hookName as keyof typeof compiler.hooks] as any).tapPromise(
              name,
              handler
            );
          }
        },
      };
      return plugin;
    },
    []
  );

  const createCallbackPlugin = useCallback(
    (name: string, hookName: string, handler: (...args: any[]) => void) => {
      const plugin: TapablePlugin = {
        name,
        apply: (compiler) => {
          if (compiler.hooks[hookName as keyof typeof compiler.hooks]) {
            (compiler.hooks[hookName as keyof typeof compiler.hooks] as any).tapAsync(
              name,
              handler
            );
          }
        },
      };
      return plugin;
    },
    []
  );

  return {
    // Plugin state
    registered: tapable.plugins.registered,
    active: tapable.plugins.active,
    failed: tapable.plugins.failed,

    // Plugin history
    history: pluginHistory,
    clearHistory: () => setPluginHistory([]),

    // Plugin operations
    registerPlugin,
    unregisterPlugin,

    // Plugin factories
    createSyncPlugin,
    createAsyncPlugin,
    createCallbackPlugin,

    // Utility
    getPlugin: (name: string) => tapable.plugins.registered.get(name),
    hasPlugin: (name: string) => tapable.plugins.registered.has(name),
    getPluginCount: () => tapable.plugins.registered.size,
  };
}

// Compilation management hook
export function useTapableCompilation() {
  const tapable = useTapable();
  const [compilationHistory, setCompilationHistory] = useState<TapableStats[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);

  const runCompilation = useCallback(async () => {
    if (isCompiling) return null;

    setIsCompiling(true);
    try {
      const stats = await tapable.operations.runCompilation();
      setCompilationHistory((prev) => [stats, ...prev.slice(0, 9)]); // Keep last 10
      return stats;
    } finally {
      setIsCompiling(false);
    }
  }, [tapable.operations, isCompiling]);

  const getModulesByType = useCallback(
    (type: string) => {
      const stats = tapable.compiler.lastStats;
      if (!stats) return [];

      return stats.compilation.modules.filter((module) => module.type === type);
    },
    [tapable.compiler.lastStats]
  );

  const getAssetsByExtension = useCallback(
    (extension: string) => {
      const stats = tapable.compiler.lastStats;
      if (!stats) return [];

      return Object.entries(stats.compilation.assets)
        .filter(([name]) => name.endsWith(extension))
        .map(([name, asset]) => ({ name, ...asset }));
    },
    [tapable.compiler.lastStats]
  );

  const getCompilationSummary = useCallback(() => {
    const stats = tapable.compiler.lastStats;
    if (!stats) return null;

    return {
      modules: stats.modules,
      chunks: stats.chunks,
      assets: stats.assets,
      errors: stats.errors.length,
      warnings: stats.warnings.length,
      time: stats.time,
      hash: stats.hash,
    };
  }, [tapable.compiler.lastStats]);

  return {
    // Compilation state
    isCompiling,
    lastStats: tapable.compiler.lastStats,
    compilationHistory,

    // Compilation operations
    runCompilation,
    clearStats: tapable.operations.clearStats,
    clearHistory: () => setCompilationHistory([]),

    // Analysis utilities
    getModulesByType,
    getAssetsByExtension,
    getCompilationSummary,

    // Quick access to compilation data
    modules: tapable.compiler.lastStats?.compilation.modules || [],
    chunks: tapable.compiler.lastStats?.compilation.chunks || [],
    assets: tapable.compiler.lastStats?.compilation.assets || {},
    errors: tapable.compiler.lastStats?.errors || [],
    warnings: tapable.compiler.lastStats?.warnings || [],
  };
}

// Performance monitoring hook
export function useTapablePerformance() {
  const tapable = useTapable();
  const [performanceSnapshots, setPerformanceSnapshots] = useState<
    Array<{
      timestamp: number;
      stats: TapablePerformanceStats;
    }>
  >([]);

  const takeSnapshot = useCallback(() => {
    if (tapable.performance.stats) {
      setPerformanceSnapshots((prev) => [
        {
          timestamp: Date.now(),
          stats: { ...tapable.performance.stats! },
        },
        ...prev.slice(0, 9), // Keep last 10 snapshots
      ]);
    }
  }, [tapable.performance.stats]);

  const getSlowHooks = useCallback(
    (threshold = 10) => {
      const hookExecutions = tapable.performance.hookExecutions;
      return Array.from(hookExecutions.entries())
        .filter(([, time]) => time > threshold)
        .sort(([, a], [, b]) => b - a)
        .map(([hook, time]) => ({ hook, time }));
    },
    [tapable.performance.hookExecutions]
  );

  const getSlowPlugins = useCallback(
    (threshold = 5) => {
      const pluginExecutions = tapable.performance.pluginExecutions;
      return Array.from(pluginExecutions.entries())
        .filter(([, time]) => time > threshold)
        .sort(([, a], [, b]) => b - a)
        .map(([plugin, time]) => ({ plugin, time }));
    },
    [tapable.performance.pluginExecutions]
  );

  const getTotalHookTime = useCallback(() => {
    return Array.from(tapable.performance.hookExecutions.values()).reduce(
      (total, time) => total + time,
      0
    );
  }, [tapable.performance.hookExecutions]);

  const getTotalPluginTime = useCallback(() => {
    return Array.from(tapable.performance.pluginExecutions.values()).reduce(
      (total, time) => total + time,
      0
    );
  }, [tapable.performance.pluginExecutions]);

  return {
    // Performance state
    enabled: tapable.performance.enabled,
    stats: tapable.performance.stats,
    totalExecutionTime: tapable.performance.totalExecutionTime,

    // Snapshots
    snapshots: performanceSnapshots,
    takeSnapshot,
    clearSnapshots: () => setPerformanceSnapshots([]),

    // Analysis
    getSlowHooks,
    getSlowPlugins,
    getTotalHookTime,
    getTotalPluginTime,

    // Hook performance
    hookExecutions: tapable.performance.hookExecutions,
    pluginExecutions: tapable.performance.pluginExecutions,

    // Utilities
    getAverageHookTime: () => {
      const hooks = Array.from(tapable.performance.hookExecutions.values());
      return hooks.length > 0 ? hooks.reduce((a, b) => a + b, 0) / hooks.length : 0;
    },
    getAveragePluginTime: () => {
      const plugins = Array.from(tapable.performance.pluginExecutions.values());
      return plugins.length > 0 ? plugins.reduce((a, b) => a + b, 0) / plugins.length : 0;
    },
  };
}

// Watch mode hook
export function useTapableWatch() {
  const tapable = useTapable();
  const [isWatching, setIsWatching] = useState(false);
  const [watchedFiles, setWatchedFiles] = useState<string[]>([]);
  const [watchEvents, setWatchEvents] = useState<
    Array<{
      type: 'change' | 'add' | 'remove';
      file: string;
      timestamp: number;
    }>
  >([]);

  const startWatch = useCallback(
    (files?: string[]) => {
      if (files) {
        setWatchedFiles(files);
      }
      tapable.operations.startWatch(files);
      setIsWatching(true);

      setWatchEvents((prev) => [
        { type: 'add', file: 'watch-started', timestamp: Date.now() },
        ...prev.slice(0, 49),
      ]);
    },
    [tapable.operations]
  );

  const stopWatch = useCallback(() => {
    tapable.operations.stopWatch();
    setIsWatching(false);

    setWatchEvents((prev) => [
      { type: 'remove', file: 'watch-stopped', timestamp: Date.now() },
      ...prev.slice(0, 49),
    ]);
  }, [tapable.operations]);

  const addWatchedFile = useCallback((file: string) => {
    setWatchedFiles((prev) => [...prev, file]);
    setWatchEvents((prev) => [{ type: 'add', file, timestamp: Date.now() }, ...prev.slice(0, 49)]);
  }, []);

  const removeWatchedFile = useCallback((file: string) => {
    setWatchedFiles((prev) => prev.filter((f) => f !== file));
    setWatchEvents((prev) => [
      { type: 'remove', file, timestamp: Date.now() },
      ...prev.slice(0, 49),
    ]);
  }, []);

  return {
    // Watch state
    isWatching,
    watchedFiles,
    watchEvents,

    // Watch operations
    startWatch,
    stopWatch,
    addWatchedFile,
    removeWatchedFile,

    // Event management
    clearEvents: () => setWatchEvents([]),
    getEventsByType: (type: 'change' | 'add' | 'remove') =>
      watchEvents.filter((event) => event.type === type),
  };
}

// Hook system integration hook
export function useTapableHooks() {
  const tapable = useTapable();
  const [hookCalls, setHookCalls] = useState<
    Array<{
      hook: string;
      args: any[];
      timestamp: number;
    }>
  >([]);

  const trackHookCall = useCallback(
    (hookName: string, args: any[]) => {
      if (tapable.hooks.debugging) {
        setHookCalls((prev) => [
          { hook: hookName, args, timestamp: Date.now() },
          ...prev.slice(0, 99), // Keep last 100 calls
        ]);
      }
    },
    [tapable.hooks.debugging]
  );

  const getHooksByPattern = useCallback(
    (pattern: string) => {
      return tapable.hooks.available.filter((hook) =>
        hook.toLowerCase().includes(pattern.toLowerCase())
      );
    },
    [tapable.hooks.available]
  );

  const getKatalystHooks = useCallback(() => {
    return tapable.hooks.available.filter((hook) => hook.startsWith('katalyst'));
  }, [tapable.hooks.available]);

  const getLifecycleHooks = useCallback(() => {
    return tapable.hooks.available.filter((hook) =>
      [
        'environment',
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
      ].includes(hook)
    );
  }, [tapable.hooks.available]);

  return {
    // Hook system state
    available: tapable.hooks.available,
    interceptors: tapable.hooks.interceptors,
    debugging: tapable.hooks.debugging,
    performance: tapable.hooks.performance,

    // Hook call tracking
    hookCalls,
    trackHookCall,
    clearHookCalls: () => setHookCalls([]),

    // Hook discovery
    getHooksByPattern,
    getKatalystHooks,
    getLifecycleHooks,

    // Utilities
    hasHook: (hookName: string) => tapable.hooks.available.includes(hookName),
    getHookCallCount: (hookName: string) =>
      hookCalls.filter((call) => call.hook === hookName).length,
  };
}

// Plugin development helper hook
export function useTapablePluginDevelopment() {
  const { registerPlugin, createSyncPlugin, createAsyncPlugin, createCallbackPlugin } =
    useTapablePlugins();
  const [developmentPlugins, setDevelopmentPlugins] = useState<Map<string, TapablePlugin>>(
    new Map()
  );

  const createAndRegisterPlugin = useCallback(
    (
      name: string,
      type: 'sync' | 'async' | 'callback',
      hookName: string,
      handler: (...args: any[]) => any
    ) => {
      let plugin: TapablePlugin;

      switch (type) {
        case 'sync':
          plugin = createSyncPlugin(name, hookName, handler);
          break;
        case 'async':
          plugin = createAsyncPlugin(name, hookName, handler);
          break;
        case 'callback':
          plugin = createCallbackPlugin(name, hookName, handler);
          break;
        default:
          throw new Error(`Unknown plugin type: ${type}`);
      }

      setDevelopmentPlugins((prev) => new Map(prev).set(name, plugin));
      registerPlugin(plugin);

      return plugin;
    },
    [registerPlugin, createSyncPlugin, createAsyncPlugin, createCallbackPlugin]
  );

  const createLoggerPlugin = useCallback(
    (name: string, hooks: string[]) => {
      const plugin: TapablePlugin = {
        name: `${name}-logger`,
        apply: (compiler) => {
          hooks.forEach((hookName) => {
            if (compiler.hooks[hookName as keyof typeof compiler.hooks]) {
              (compiler.hooks[hookName as keyof typeof compiler.hooks] as any).tap(
                `${name}-logger`,
                (...args: any[]) => {
                  console.log(`[${name}] Hook ${hookName} called with:`, args);
                }
              );
            }
          });
        },
      };

      setDevelopmentPlugins((prev) => new Map(prev).set(plugin.name, plugin));
      registerPlugin(plugin);

      return plugin;
    },
    [registerPlugin]
  );

  const createPerformancePlugin = useCallback(
    (name: string) => {
      const plugin: TapablePlugin = {
        name: `${name}-performance`,
        apply: (compiler) => {
          const timings = new Map<string, number>();

          // Measure compilation time
          compiler.hooks.beforeRun.tap(`${name}-performance`, () => {
            timings.set('compilation-start', performance.now());
          });

          compiler.hooks.done.tap(`${name}-performance`, () => {
            const start = timings.get('compilation-start');
            if (start) {
              const duration = performance.now() - start;
              console.log(`[${name}] Compilation completed in ${duration.toFixed(2)}ms`);
            }
          });
        },
      };

      setDevelopmentPlugins((prev) => new Map(prev).set(plugin.name, plugin));
      registerPlugin(plugin);

      return plugin;
    },
    [registerPlugin]
  );

  return {
    // Development plugins
    developmentPlugins,

    // Plugin creation helpers
    createAndRegisterPlugin,
    createLoggerPlugin,
    createPerformancePlugin,

    // Quick plugin templates
    createDebugPlugin: (name: string) =>
      createLoggerPlugin(name, ['beforeRun', 'afterCompile', 'done']),
    createValidationPlugin: (name: string, validator: (compilation: any) => boolean) =>
      createSyncPlugin(name, 'afterCompile', (compilation) => {
        if (!validator(compilation)) {
          throw new Error(`Validation failed in ${name}`);
        }
      }),

    // Cleanup
    clearDevelopmentPlugins: () => setDevelopmentPlugins(new Map()),
  };
}

// Export all hooks
export {
  useTapableCore,
  useTapablePlugins,
  useTapableCompilation,
  useTapablePerformance,
  useTapableWatch,
  useTapableHooks,
  useTapablePluginDevelopment,
};

// Re-export the main useTapable hook for convenience
export { useTapable };
