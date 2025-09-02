/**
 * ModuleFederationLoader Component
 *
 * Provides convenient loading of federated modules with error boundaries,
 * loading states, and performance monitoring
 */

import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useRepack } from './RepackProvider';

export interface ModuleFederationLoaderProps<TProps = any> {
  // Module configuration
  remoteName: string;
  moduleName: string;

  // Component props
  props?: TProps;

  // Loading and error handling
  fallback?: React.ComponentType<TProps>;
  loadingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;

  // Performance options
  preload?: boolean;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;

  // Event handlers
  onLoad?: (component: React.ComponentType<TProps>) => void;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  onLoadComplete?: (loadTime: number) => void;

  // Development options
  enableHotReload?: boolean;
  showLoadTime?: boolean;

  // Styling
  className?: string;
  style?: React.CSSProperties;
}

interface LoadState {
  loading: boolean;
  error: Error | null;
  component: React.ComponentType<any> | null;
  loadTime: number;
  attempts: number;
}

export function ModuleFederationLoader<TProps = any>({
  remoteName,
  moduleName,
  props,
  fallback: FallbackComponent,
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  preload = false,
  timeout = 30000,
  retryAttempts = 3,
  retryDelay = 1000,
  onLoad,
  onError,
  onLoadStart,
  onLoadComplete,
  enableHotReload = true,
  showLoadTime = false,
  className,
  style,
}: ModuleFederationLoaderProps<TProps>) {
  const { loadRemoteModule, preloadRemoteModule, isRemoteModuleLoaded } = useRepack();

  const [loadState, setLoadState] = useState<LoadState>({
    loading: false,
    error: null,
    component: null,
    loadTime: 0,
    attempts: 0,
  });

  const moduleKey = `${remoteName}/${moduleName}`;

  // Load module with retry logic
  const loadModule = useCallback(
    async (attempt = 1): Promise<void> => {
      if (loadState.loading) return;

      setLoadState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        attempts: attempt,
      }));

      onLoadStart?.();
      const startTime = performance.now();

      try {
        // Set timeout for loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Module load timeout')), timeout);
        });

        const loadPromise = loadRemoteModule(remoteName, moduleName);
        const module = await Promise.race([loadPromise, timeoutPromise]);

        const endTime = performance.now();
        const loadTime = endTime - startTime;

        // Extract default export or the module itself
        const component = module.default || module;

        if (!component || typeof component !== 'function') {
          throw new Error(`Invalid component exported from ${moduleKey}`);
        }

        setLoadState({
          loading: false,
          error: null,
          component,
          loadTime,
          attempts: attempt,
        });

        onLoad?.(component);
        onLoadComplete?.(loadTime);
      } catch (error) {
        const err = error as Error;

        if (attempt < retryAttempts) {
          // Retry after delay
          setTimeout(() => {
            loadModule(attempt + 1);
          }, retryDelay * attempt);
        } else {
          setLoadState((prev) => ({
            ...prev,
            loading: false,
            error: err,
          }));

          onError?.(err);
        }
      }
    },
    [
      remoteName,
      moduleName,
      moduleKey,
      loadRemoteModule,
      loadState.loading,
      timeout,
      retryAttempts,
      retryDelay,
      onLoad,
      onError,
      onLoadStart,
      onLoadComplete,
    ]
  );

  // Preload module if requested
  useEffect(() => {
    if (preload && !isRemoteModuleLoaded(remoteName, moduleName)) {
      preloadRemoteModule(remoteName, moduleName);
    }
  }, [preload, remoteName, moduleName, preloadRemoteModule, isRemoteModuleLoaded]);

  // Load module on mount
  useEffect(() => {
    if (!loadState.component && !loadState.loading && !loadState.error) {
      loadModule();
    }
  }, [loadModule, loadState.component, loadState.loading, loadState.error]);

  // Hot reload support
  useEffect(() => {
    if (enableHotReload && module.hot) {
      const handleHotUpdate = () => {
        setLoadState((prev) => ({
          ...prev,
          component: null,
          error: null,
        }));
        loadModule();
      };

      module.hot.addStatusHandler(handleHotUpdate);
      return () => module.hot?.removeStatusHandler(handleHotUpdate);
    }
  }, [enableHotReload, loadModule]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setLoadState((prev) => ({
      ...prev,
      error: null,
      attempts: 0,
    }));
    loadModule();
  }, [loadModule]);

  // Render loading state
  if (loadState.loading) {
    if (LoadingComponent) {
      return (
        <div className={className} style={style}>
          <LoadingComponent />
        </div>
      );
    }

    return (
      <div className={`repack-loading ${className || ''}`} style={style}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">
            Loading {moduleName}... (Attempt {loadState.attempts})
          </span>
        </div>
      </div>
    );
  }

  // Render error state
  if (loadState.error) {
    if (ErrorComponent) {
      return (
        <div className={className} style={style}>
          <ErrorComponent error={loadState.error} retry={handleRetry} />
        </div>
      );
    }

    return (
      <div className={`repack-error ${className || ''}`} style={style}>
        <div className="flex flex-col items-center justify-center p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="text-red-600 mb-2">⚠️</div>
          <h3 className="text-sm font-medium text-red-800 mb-1">Failed to load {moduleKey}</h3>
          <p className="text-xs text-red-600 mb-3 text-center">{loadState.error.message}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render fallback if no component loaded
  if (!loadState.component) {
    if (FallbackComponent && props) {
      return (
        <div className={className} style={style}>
          <FallbackComponent {...props} />
        </div>
      );
    }

    return (
      <div className={`repack-fallback ${className || ''}`} style={style}>
        <div className="p-4 text-center text-muted-foreground">
          No component available for {moduleKey}
        </div>
      </div>
    );
  }

  // Render loaded component
  const LoadedComponent = loadState.component;

  return (
    <div className={className} style={style}>
      {showLoadTime && loadState.loadTime > 0 && (
        <div className="text-xs text-muted-foreground mb-1">
          Loaded in {loadState.loadTime.toFixed(2)}ms
        </div>
      )}
      <ErrorBoundary
        fallback={
          <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
            <div className="text-orange-600 mb-2">⚠️</div>
            <h3 className="text-sm font-medium text-orange-800 mb-1">Component Error</h3>
            <p className="text-xs text-orange-600">
              The component {moduleKey} encountered an error during render.
            </p>
          </div>
        }
      >
        <LoadedComponent {...props} />
      </ErrorBoundary>
    </div>
  );
}

// Lazy loading wrapper for module federation
export function createFederatedComponent<TProps = any>(
  remoteName: string,
  moduleName: string,
  options: Partial<ModuleFederationLoaderProps<TProps>> = {}
) {
  return React.memo((props: TProps) => (
    <ModuleFederationLoader
      remoteName={remoteName}
      moduleName={moduleName}
      props={props}
      {...options}
    />
  ));
}

// Batch loader for multiple federated modules
export interface BatchLoaderProps {
  modules: Array<{
    remoteName: string;
    moduleName: string;
    componentName: string;
    props?: any;
  }>;
  onAllLoaded?: (components: Record<string, React.ComponentType>) => void;
  onLoadProgress?: (loaded: number, total: number) => void;
  loadingComponent?: React.ComponentType;
  className?: string;
}

export function FederatedModuleBatchLoader({
  modules,
  onAllLoaded,
  onLoadProgress,
  loadingComponent: LoadingComponent,
  className,
}: BatchLoaderProps) {
  const [loadedComponents, setLoadedComponents] = useState<Record<string, React.ComponentType>>({});
  const [loadingCount, setLoadingCount] = useState(modules.length);

  const handleModuleLoad = useCallback(
    (componentName: string, component: React.ComponentType) => {
      setLoadedComponents((prev) => {
        const updated = { ...prev, [componentName]: component };

        if (Object.keys(updated).length === modules.length) {
          onAllLoaded?.(updated);
        }

        return updated;
      });

      setLoadingCount((prev) => {
        const newCount = prev - 1;
        onLoadProgress?.(modules.length - newCount, modules.length);
        return newCount;
      });
    },
    [modules.length, onAllLoaded, onLoadProgress]
  );

  if (loadingCount > 0) {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }

    return (
      <div className={`federated-batch-loading ${className || ''}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">
            Loading modules... ({modules.length - loadingCount}/{modules.length})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {modules.map(({ remoteName, moduleName, componentName, props }) => {
        const Component = loadedComponents[componentName];
        return Component ? <Component key={componentName} {...props} /> : null;
      })}
    </div>
  );
}

// Hook for federated module loading
export function useFederatedModule<T = any>(
  remoteName: string,
  moduleName: string,
  options: {
    preload?: boolean;
    autoLoad?: boolean;
    onLoad?: (module: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { loadRemoteModule, preloadRemoteModule, isRemoteModuleLoaded } = useRepack();
  const [module, setModule] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { preload = false, autoLoad = true, onLoad, onError } = options;

  const loadModule = useCallback(async (): Promise<T | null> => {
    if (loading) return null;

    setLoading(true);
    setError(null);

    try {
      const loadedModule = await loadRemoteModule<T>(remoteName, moduleName);
      setModule(loadedModule);
      onLoad?.(loadedModule);
      return loadedModule;
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [remoteName, moduleName, loadRemoteModule, loading, onLoad, onError]);

  useEffect(() => {
    if (preload && !isRemoteModuleLoaded(remoteName, moduleName)) {
      preloadRemoteModule(remoteName, moduleName);
    }
  }, [preload, remoteName, moduleName, preloadRemoteModule, isRemoteModuleLoaded]);

  useEffect(() => {
    if (autoLoad && !module && !loading && !error) {
      loadModule();
    }
  }, [autoLoad, module, loading, error, loadModule]);

  return {
    module,
    loading,
    error,
    loadModule,
    isLoaded: !!module,
  };
}
