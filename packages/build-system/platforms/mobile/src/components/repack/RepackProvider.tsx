/**
 * RepackProvider Component
 *
 * Core provider for Re.Pack integration with RSpeedy
 * Manages module federation, code splitting, and dynamic loading
 */

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from '../../index';

export interface RepackConfig {
  moduleFederation: {
    name: string;
    remotes: Record<string, string>;
    exposes?: Record<string, string>;
    shared: Record<string, any>;
  };
  codesplitting: {
    enabled: boolean;
    chunkLoadTimeout: number;
    maxParallelRequests: number;
  };
  optimization: {
    bundleAnalyzer: boolean;
    treeShaking: boolean;
    minification: boolean;
  };
  devServer?: {
    port: number;
    host: string;
    hot: boolean;
  };
}

export interface BundleInfo {
  name: string;
  size: number;
  chunks: string[];
  dependencies: string[];
  loadTime: number;
}

export interface PerformanceMetrics {
  bundleLoadTime: number;
  chunkLoadTimes: Record<string, number>;
  memoryUsage: number;
  jsHeapSize: number;
  totalLoadTime: number;
}

export interface RepackContextValue {
  // Configuration
  config: RepackConfig;
  isInitialized: boolean;

  // Module Federation
  loadRemoteModule: <T = any>(remoteName: string, moduleName: string) => Promise<T>;
  preloadRemoteModule: (remoteName: string, moduleName: string) => Promise<void>;
  isRemoteModuleLoaded: (remoteName: string, moduleName: string) => boolean;
  getLoadedRemotes: () => string[];

  // Code Splitting
  loadChunk: (chunkName: string) => Promise<any>;
  preloadChunk: (chunkName: string) => Promise<void>;
  getLoadedChunks: () => string[];

  // Bundle Information
  getBundleInfo: () => BundleInfo[];
  getBundleSize: (bundleName?: string) => number;
  getDependencyGraph: () => Record<string, string[]>;

  // Performance
  getPerformanceMetrics: () => PerformanceMetrics;
  startPerformanceMonitoring: () => void;
  stopPerformanceMonitoring: () => void;

  // Development
  enableHotReload: () => void;
  reloadBundle: (bundleName?: string) => Promise<void>;
  clearCache: () => void;
}

const RepackContext = createContext<RepackContextValue | null>(null);

export interface RepackProviderProps {
  children: React.ReactNode;
  config: RepackConfig;
  enableDevtools?: boolean;
  onLoadError?: (error: Error, moduleName: string) => void;
  onPerformanceData?: (metrics: PerformanceMetrics) => void;
}

export function RepackProvider({
  children,
  config,
  enableDevtools = true,
  onLoadError,
  onPerformanceData,
}: RepackProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadedRemotes, setLoadedRemotes] = useState<Set<string>>(new Set());
  const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set());
  const [bundleInfo, setBundleInfo] = useState<BundleInfo[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    bundleLoadTime: 0,
    chunkLoadTimes: {},
    memoryUsage: 0,
    jsHeapSize: 0,
    totalLoadTime: 0,
  });

  const loadingPromises = useRef<Map<string, Promise<any>>>(new Map());
  const performanceObserver = useRef<PerformanceObserver | null>(null);
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Re.Pack
  useEffect(() => {
    const initializeRepack = async () => {
      try {
        // Initialize module federation runtime
        if (typeof window !== 'undefined' && config.moduleFederation) {
          // Set up remote containers
          for (const [remoteName, remoteUrl] of Object.entries(config.moduleFederation.remotes)) {
            await initializeRemoteContainer(remoteName, remoteUrl);
          }
        }

        // Initialize performance monitoring
        if (enableDevtools) {
          initializePerformanceMonitoring();
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Re.Pack:', error);
        onLoadError?.(error as Error, 'repack-initialization');
      }
    };

    initializeRepack();
  }, [config, enableDevtools, onLoadError]);

  // Initialize remote container
  const initializeRemoteContainer = async (remoteName: string, remoteUrl: string) => {
    try {
      // Load remote entry script
      const script = document.createElement('script');
      script.src = remoteUrl;
      script.async = true;

      return new Promise<void>((resolve, reject) => {
        script.onload = () => {
          // Remote container should be available on window
          if ((window as any)[remoteName]) {
            resolve();
          } else {
            reject(new Error(`Remote container ${remoteName} not found`));
          }
        };
        script.onerror = () => reject(new Error(`Failed to load remote ${remoteName}`));
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error(`Failed to initialize remote container ${remoteName}:`, error);
      throw error;
    }
  };

  // Initialize performance monitoring
  const initializePerformanceMonitoring = () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            setPerformanceMetrics((prev) => ({
              ...prev,
              totalLoadTime: entry.duration,
            }));
          } else if (entry.entryType === 'resource' && entry.name.includes('chunk')) {
            const chunkName = extractChunkName(entry.name);
            setPerformanceMetrics((prev) => ({
              ...prev,
              chunkLoadTimes: {
                ...prev.chunkLoadTimes,
                [chunkName]: entry.duration,
              },
            }));
          }
        });
      });

      performanceObserver.current.observe({ entryTypes: ['navigation', 'resource'] });
    }
  };

  // Extract chunk name from URL
  const extractChunkName = (url: string): string => {
    const match = url.match(/\/([^\/]+\.chunk\.js)$/);
    return match ? match[1] : url;
  };

  // Load remote module
  const loadRemoteModule = useCallback(
    async <T = any>(remoteName: string, moduleName: string): Promise<T> => {
      const key = `${remoteName}/${moduleName}`;

      // Return existing promise if already loading
      if (loadingPromises.current.has(key)) {
        return loadingPromises.current.get(key)!;
      }

      const loadPromise = (async () => {
        try {
          const startTime = performance.now();

          // Check if remote container exists
          const container = (window as any)[remoteName];
          if (!container) {
            throw new Error(`Remote container ${remoteName} not found`);
          }

          // Initialize the container if needed
          if (!container.__initialized) {
            await container.init({
              ...config.moduleFederation.shared,
            });
            container.__initialized = true;
          }

          // Load the module
          const factory = await container.get(moduleName);
          const module = factory();

          const endTime = performance.now();

          setLoadedRemotes((prev) => new Set([...prev, key]));
          setPerformanceMetrics((prev) => ({
            ...prev,
            bundleLoadTime: endTime - startTime,
          }));

          return module;
        } catch (error) {
          console.error(`Failed to load remote module ${key}:`, error);
          onLoadError?.(error as Error, key);
          throw error;
        } finally {
          loadingPromises.current.delete(key);
        }
      })();

      loadingPromises.current.set(key, loadPromise);
      return loadPromise;
    },
    [config.moduleFederation.shared, onLoadError]
  );

  // Preload remote module
  const preloadRemoteModule = useCallback(
    async (remoteName: string, moduleName: string): Promise<void> => {
      try {
        await loadRemoteModule(remoteName, moduleName);
      } catch (error) {
        // Silently fail for preloading
        console.warn(`Failed to preload ${remoteName}/${moduleName}:`, error);
      }
    },
    [loadRemoteModule]
  );

  // Check if remote module is loaded
  const isRemoteModuleLoaded = useCallback(
    (remoteName: string, moduleName: string): boolean => {
      return loadedRemotes.has(`${remoteName}/${moduleName}`);
    },
    [loadedRemotes]
  );

  // Get loaded remotes
  const getLoadedRemotes = useCallback((): string[] => {
    return Array.from(loadedRemotes);
  }, [loadedRemotes]);

  // Load chunk
  const loadChunk = useCallback(
    async (chunkName: string): Promise<any> => {
      if (loadedChunks.has(chunkName)) {
        return Promise.resolve();
      }

      try {
        const startTime = performance.now();

        // Dynamic import for chunk
        const chunk = await import(/* webpackChunkName: "[request]" */ chunkName);

        const endTime = performance.now();

        setLoadedChunks((prev) => new Set([...prev, chunkName]));
        setPerformanceMetrics((prev) => ({
          ...prev,
          chunkLoadTimes: {
            ...prev.chunkLoadTimes,
            [chunkName]: endTime - startTime,
          },
        }));

        return chunk;
      } catch (error) {
        console.error(`Failed to load chunk ${chunkName}:`, error);
        onLoadError?.(error as Error, chunkName);
        throw error;
      }
    },
    [loadedChunks, onLoadError]
  );

  // Preload chunk
  const preloadChunk = useCallback(async (chunkName: string): Promise<void> => {
    try {
      // Use webpack's prefetch for preloading
      await import(/* webpackPrefetch: true */ chunkName);
    } catch (error) {
      console.warn(`Failed to preload chunk ${chunkName}:`, error);
    }
  }, []);

  // Get loaded chunks
  const getLoadedChunks = useCallback((): string[] => {
    return Array.from(loadedChunks);
  }, [loadedChunks]);

  // Get bundle info
  const getBundleInfo = useCallback((): BundleInfo[] => {
    return bundleInfo;
  }, [bundleInfo]);

  // Get bundle size
  const getBundleSize = useCallback(
    (bundleName?: string): number => {
      if (bundleName) {
        const bundle = bundleInfo.find((b) => b.name === bundleName);
        return bundle?.size || 0;
      }
      return bundleInfo.reduce((total, bundle) => total + bundle.size, 0);
    },
    [bundleInfo]
  );

  // Get dependency graph
  const getDependencyGraph = useCallback((): Record<string, string[]> => {
    const graph: Record<string, string[]> = {};
    bundleInfo.forEach((bundle) => {
      graph[bundle.name] = bundle.dependencies;
    });
    return graph;
  }, [bundleInfo]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    // Update memory usage if available
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory;
      setPerformanceMetrics((prev) => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize,
        jsHeapSize: memory.totalJSHeapSize,
      }));
    }

    return performanceMetrics;
  }, [performanceMetrics]);

  // Start performance monitoring
  const startPerformanceMonitoring = useCallback(() => {
    if (monitoringInterval.current) return;

    monitoringInterval.current = setInterval(() => {
      const metrics = getPerformanceMetrics();
      onPerformanceData?.(metrics);
    }, 5000); // Every 5 seconds
  }, [getPerformanceMetrics, onPerformanceData]);

  // Stop performance monitoring
  const stopPerformanceMonitoring = useCallback(() => {
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
  }, []);

  // Enable hot reload
  const enableHotReload = useCallback(() => {
    if (Platform.isWeb() && module.hot) {
      module.hot.accept();
    }
  }, []);

  // Reload bundle
  const reloadBundle = useCallback(async (bundleName?: string): Promise<void> => {
    if (Platform.isWeb()) {
      if (bundleName) {
        // Reload specific bundle
        setLoadedChunks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(bundleName);
          return newSet;
        });
      } else {
        // Reload entire application
        window.location.reload();
      }
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    setLoadedRemotes(new Set());
    setLoadedChunks(new Set());
    loadingPromises.current.clear();

    // Clear browser caches if available
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPerformanceMonitoring();
      performanceObserver.current?.disconnect();
    };
  }, [stopPerformanceMonitoring]);

  const contextValue: RepackContextValue = {
    config,
    isInitialized,
    loadRemoteModule,
    preloadRemoteModule,
    isRemoteModuleLoaded,
    getLoadedRemotes,
    loadChunk,
    preloadChunk,
    getLoadedChunks,
    getBundleInfo,
    getBundleSize,
    getDependencyGraph,
    getPerformanceMetrics,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    enableHotReload,
    reloadBundle,
    clearCache,
  };

  return <RepackContext.Provider value={contextValue}>{children}</RepackContext.Provider>;
}

// Hook to use Re.Pack context
export function useRepack(): RepackContextValue {
  const context = useContext(RepackContext);
  if (!context) {
    throw new Error('useRepack must be used within a RepackProvider');
  }
  return context;
}

// Hook for performance monitoring
export function useRepackPerformance() {
  const { getPerformanceMetrics, startPerformanceMonitoring, stopPerformanceMonitoring } =
    useRepack();

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    startPerformanceMonitoring();
    const interval = setInterval(() => {
      setMetrics(getPerformanceMetrics());
    }, 1000);

    return () => {
      clearInterval(interval);
      stopPerformanceMonitoring();
    };
  }, [getPerformanceMetrics, startPerformanceMonitoring, stopPerformanceMonitoring]);

  return metrics;
}
