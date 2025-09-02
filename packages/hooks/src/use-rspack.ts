import { useCallback, useEffect, useState } from 'react';
import { integrationConfigs } from '../config/integrations.config.ts';
import { RSpackIntegration } from '../integrations/rspack.ts';
import { type RSpackPluginConfig, RSpackPluginManager } from '../plugins/rspack-plugins.ts';

export interface UseRSpackOptions {
  variant?: 'core' | 'remix' | 'nextjs';
  autoInitialize?: boolean;
  enableHMR?: boolean;
  enableDevTools?: boolean;
}

export interface RSpackState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  config: any | null;
  stats: RSpackBuildStats | null;
  plugins: RSpackPluginConfig[];
}

export interface RSpackBuildStats {
  assets: Array<{
    name: string;
    size: number;
    chunks: string[];
  }>;
  chunks: Array<{
    id: string;
    names: string[];
    size: number;
    modules: number;
  }>;
  modules: number;
  errors: string[];
  warnings: string[];
  time: number;
  hash: string;
}

export interface UseRSpackReturn extends RSpackState {
  initialize: () => Promise<void>;
  build: () => Promise<RSpackBuildStats>;
  watch: (callback: (stats: RSpackBuildStats) => void) => () => void;
  addPlugin: (plugin: RSpackPluginConfig) => void;
  removePlugin: (name: string) => void;
  updateConfig: (config: Partial<any>) => void;
  getPlugin: (name: string) => RSpackPluginConfig | undefined;
  reload: () => Promise<void>;
}

export function useRSpack(options: UseRSpackOptions = {}): UseRSpackReturn {
  const {
    variant = 'core',
    autoInitialize = true,
    enableHMR = true,
    enableDevTools = process.env.NODE_ENV === 'development',
  } = options;

  const [state, setState] = useState<RSpackState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    config: null,
    stats: null,
    plugins: [],
  });

  const [integration, setIntegration] = useState<RSpackIntegration | null>(null);
  const [pluginManager] = useState(() => new RSpackPluginManager());

  // Initialize RSpack integration
  const initialize = useCallback(async () => {
    if (state.isInitialized || state.isLoading) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const rspackConfig = {
        ...integrationConfigs.rspack,
        enableHMR,
        enableDevTools,
      };

      const rspackIntegration = new RSpackIntegration(rspackConfig as any);
      await rspackIntegration.initialize();

      const config = rspackIntegration.generateConfig(variant);

      // Load appropriate preset
      pluginManager.loadPreset(
        process.env.NODE_ENV === 'production' ? 'production' : 'development'
      );

      setIntegration(rspackIntegration);
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        config,
        plugins: pluginManager.getAllPlugins(),
      }));

      // Setup HMR if enabled
      if (enableHMR && process.env.NODE_ENV === 'development') {
        setupHMR(rspackIntegration);
      }

      // Setup DevTools if enabled
      if (enableDevTools) {
        setupDevTools(rspackIntegration);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize RSpack',
      }));
    }
  }, [variant, enableHMR, enableDevTools, state.isInitialized, state.isLoading, pluginManager]);

  // Build function
  const build = useCallback(async (): Promise<RSpackBuildStats> => {
    if (!integration) {
      throw new Error('RSpack not initialized');
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Simulate build process
      const startTime = Date.now();

      // In a real implementation, this would trigger actual RSpack build
      const stats: RSpackBuildStats = {
        assets: [
          { name: 'main.js', size: 125000, chunks: ['main'] },
          { name: 'vendor.js', size: 85000, chunks: ['vendor'] },
          { name: 'runtime.js', size: 5000, chunks: ['runtime'] },
        ],
        chunks: [
          { id: 'main', names: ['main'], size: 125000, modules: 150 },
          { id: 'vendor', names: ['vendor'], size: 85000, modules: 50 },
          { id: 'runtime', names: ['runtime'], size: 5000, modules: 5 },
        ],
        modules: 205,
        errors: [],
        warnings: [],
        time: Date.now() - startTime,
        hash: Math.random().toString(36).substring(7),
      };

      setState((prev) => ({ ...prev, isLoading: false, stats }));
      return stats;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Build failed',
      }));
      throw error;
    }
  }, [integration]);

  // Watch function
  const watch = useCallback(
    (callback: (stats: RSpackBuildStats) => void) => {
      if (!integration) {
        console.warn('RSpack not initialized');
        return () => {};
      }

      // Simulate file watching
      const interval = setInterval(async () => {
        try {
          const stats = await build();
          callback(stats);
        } catch (error) {
          console.error('Watch build failed:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    },
    [integration, build]
  );

  // Plugin management
  const addPlugin = useCallback(
    (plugin: RSpackPluginConfig) => {
      pluginManager.addPlugin(plugin);
      setState((prev) => ({ ...prev, plugins: pluginManager.getAllPlugins() }));
    },
    [pluginManager]
  );

  const removePlugin = useCallback(
    (name: string) => {
      pluginManager.removePlugin(name);
      setState((prev) => ({ ...prev, plugins: pluginManager.getAllPlugins() }));
    },
    [pluginManager]
  );

  const getPlugin = useCallback(
    (name: string) => {
      return pluginManager.getPlugin(name);
    },
    [pluginManager]
  );

  // Config update
  const updateConfig = useCallback(
    (newConfig: Partial<any>) => {
      if (!integration) {
        console.warn('RSpack not initialized');
        return;
      }

      setState((prev) => ({
        ...prev,
        config: { ...prev.config, ...newConfig },
      }));
    },
    [integration]
  );

  // Reload integration
  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, isInitialized: false }));
    setIntegration(null);
    await initialize();
  }, [initialize]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !state.isInitialized && !state.isLoading) {
      initialize();
    }
  }, [autoInitialize, state.isInitialized, state.isLoading, initialize]);

  return {
    ...state,
    initialize,
    build,
    watch,
    addPlugin,
    removePlugin,
    updateConfig,
    getPlugin,
    reload,
  };
}

// Helper functions
function setupHMR(integration: RSpackIntegration) {
  if (typeof window !== 'undefined' && 'module' in window && (window as any).module.hot) {
    (window as any).module.hot.accept(() => {
      console.log('[RSpack HMR] Accepting hot update');
    });
  }
}

function setupDevTools(integration: RSpackIntegration) {
  if (typeof window !== 'undefined') {
    (window as any).__RSPACK_INTEGRATION__ = integration;
    (window as any).__RSPACK_CONFIG__ = integration.getConfig();
    console.log('[RSpack DevTools] Integration exposed on window.__RSPACK_INTEGRATION__');
  }
}

// Convenience hooks for specific variants
export function useRSpackCore(options?: Omit<UseRSpackOptions, 'variant'>) {
  return useRSpack({ ...options, variant: 'core' });
}

export function useRSpackRemix(options?: Omit<UseRSpackOptions, 'variant'>) {
  return useRSpack({ ...options, variant: 'remix' });
}

export function useRSpackNextJS(options?: Omit<UseRSpackOptions, 'variant'>) {
  return useRSpack({ ...options, variant: 'nextjs' });
}
