import type React from 'react';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { EMPIntegration } from '../integrations/emp.ts';
import type { EMPConfig, EMPRuntimeConfig } from '../integrations/emp.ts';

interface EMPRuntimeContextValue {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  loadRemoteModule: <T = any>(remoteName: string, moduleName: string) => Promise<T>;
  preloadRemotes: (remoteNames: string[]) => Promise<void>;
  remotes: Record<string, string>;
  config: EMPConfig;
}

const EMPRuntimeContext = createContext<EMPRuntimeContextValue | null>(null);

interface EMPRuntimeProviderProps {
  children: ReactNode;
  config: EMPConfig;
  onError?: (error: Error) => void;
  loadingComponent?: React.ComponentType;
  errorBoundary?: boolean;
}

export function EMPRuntimeProvider({
  children,
  config,
  onError,
  loadingComponent: LoadingComponent,
  errorBoundary = true,
}: EMPRuntimeProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [empIntegration] = useState(() => new EMPIntegration(config));

  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        await empIntegration.initializeRuntime();

        if (config.runtime?.preload && config.runtime.preload.length > 0) {
          await empIntegration.preloadRemotes(config.runtime.preload);
        }

        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [empIntegration, config.runtime?.preload, onError]);

  const loadRemoteModule = async <T = any>(remoteName: string, moduleName: string): Promise<T> => {
    if (!isInitialized) {
      throw new Error('EMP Runtime is not initialized');
    }

    return empIntegration.loadRemoteModule<T>(remoteName, moduleName);
  };

  const preloadRemotes = async (remoteNames: string[]) => {
    if (!isInitialized) {
      throw new Error('EMP Runtime is not initialized');
    }

    await empIntegration.preloadRemotes(remoteNames);
  };

  const contextValue: EMPRuntimeContextValue = {
    isInitialized,
    isLoading,
    error,
    loadRemoteModule,
    preloadRemotes,
    remotes: config.remotes,
    config,
  };

  if (isLoading && LoadingComponent) {
    return <LoadingComponent />;
  }

  if (error && errorBoundary) {
    return <EMPErrorBoundary error={error} onRetry={() => window.location.reload()} />;
  }

  return <EMPRuntimeContext.Provider value={contextValue}>{children}</EMPRuntimeContext.Provider>;
}

export function useEMPRuntime() {
  const context = useContext(EMPRuntimeContext);
  if (!context) {
    throw new Error('useEMPRuntime must be used within an EMPRuntimeProvider');
  }
  return context;
}

interface EMPErrorBoundaryProps {
  error: Error;
  onRetry: () => void;
}

function EMPErrorBoundary({ error, onRetry }: EMPErrorBoundaryProps) {
  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ff6b6b',
        borderRadius: '8px',
        backgroundColor: '#ffe0e0',
        margin: '20px',
      }}
    >
      <h2 style={{ color: '#ff6b6b', marginBottom: '10px' }}>EMP Runtime Error</h2>
      <p style={{ marginBottom: '10px' }}>{error.message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ff6b6b',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}

interface RemoteComponentProps<T = any> {
  remoteName: string;
  moduleName: string;
  fallback?: React.ComponentType;
  onError?: (error: Error) => void;
  props?: T;
}

export function RemoteComponent<T = any>({
  remoteName,
  moduleName,
  fallback: FallbackComponent,
  onError,
  props,
}: RemoteComponentProps<T>) {
  const { loadRemoteModule } = useEMPRuntime();
  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadComponent() {
      try {
        setLoading(true);
        const module = await loadRemoteModule<{ default: React.ComponentType<T> }>(
          remoteName,
          moduleName
        );
        setComponent(() => module.default);
        setError(null);
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      } finally {
        setLoading(false);
      }
    }

    loadComponent();
  }, [remoteName, moduleName, loadRemoteModule, onError]);

  if (loading) {
    return <div>Loading remote component...</div>;
  }

  if (error || !Component) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return <div>Failed to load remote component: {error?.message}</div>;
  }

  return <Component {...(props || ({} as T))} />;
}

export interface RemoteModuleLoaderProps {
  remotes: Array<{
    name: string;
    modules: string[];
  }>;
  onLoad?: (remoteName: string, moduleName: string) => void;
  onError?: (remoteName: string, moduleName: string, error: Error) => void;
}

export function RemoteModuleLoader({ remotes, onLoad, onError }: RemoteModuleLoaderProps) {
  const { preloadRemotes } = useEMPRuntime();
  const [loadingStatus, setLoadingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function preload() {
      const remoteNames = remotes.map((r) => r.name);

      try {
        await preloadRemotes(remoteNames);
        remotes.forEach((remote) => {
          remote.modules.forEach((module) => {
            setLoadingStatus((prev) => ({ ...prev, [`${remote.name}/${module}`]: true }));
            onLoad?.(remote.name, module);
          });
        });
      } catch (error) {
        remotes.forEach((remote) => {
          remote.modules.forEach((module) => {
            onError?.(remote.name, module, error as Error);
          });
        });
      }
    }

    preload();
  }, [remotes, preloadRemotes, onLoad, onError]);

  return null;
}
