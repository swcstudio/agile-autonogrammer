import { useCallback, useEffect, useState } from 'react';
import { useEMPRuntime } from '../components/EMPRuntimeProvider.tsx';
import { EMPIntegration } from '../integrations/emp.ts';
import type { EMPConfig, EMPErrorInfo, EMPMetrics, EMPRemoteModule } from '../types/emp';

interface UseEMPOptions {
  config?: Partial<EMPConfig>;
  onError?: (error: EMPErrorInfo) => void;
  enableMetrics?: boolean;
}

export function useEMP(options: UseEMPOptions = {}) {
  const runtime = useEMPRuntime();
  const [metrics, setMetrics] = useState<EMPMetrics>({
    moduleLoadTime: 0,
    remoteFetchDuration: 0,
    errorRate: 0,
    cacheHitRatio: 0,
    totalModulesLoaded: 0,
    failedModules: [],
  });

  const loadRemoteComponent = useCallback(
    async <T = any>(
      remoteName: string,
      moduleName: string,
      options?: {
        timeout?: number;
        retries?: number;
        fallback?: () => Promise<T>;
      }
    ): Promise<T> => {
      const startTime = performance.now();

      try {
        const module = await runtime.loadRemoteModule<T>(remoteName, moduleName);

        if (options?.enableMetrics) {
          setMetrics((prev) => ({
            ...prev,
            moduleLoadTime: performance.now() - startTime,
            totalModulesLoaded: prev.totalModulesLoaded + 1,
            cacheHitRatio:
              prev.totalModulesLoaded > 0
                ? (prev.cacheHitRatio * prev.totalModulesLoaded + 1) / (prev.totalModulesLoaded + 1)
                : 1,
          }));
        }

        return module;
      } catch (error) {
        if (options?.onError) {
          options.onError({
            type: 'LOAD_ERROR',
            message: (error as Error).message,
            remoteName,
            moduleName,
            timestamp: Date.now(),
            stack: (error as Error).stack,
          });
        }

        if (options?.enableMetrics) {
          setMetrics((prev) => ({
            ...prev,
            errorRate:
              (prev.errorRate * prev.totalModulesLoaded + 1) / (prev.totalModulesLoaded + 1),
            failedModules: [...prev.failedModules, `${remoteName}/${moduleName}`],
          }));
        }

        if (options?.fallback) {
          return options.fallback();
        }

        throw error;
      }
    },
    [runtime, options?.enableMetrics, options?.onError]
  );

  const preloadModules = useCallback(
    async (modules: string[]) => {
      await runtime.preloadRemotes(modules);
    },
    [runtime]
  );

  const useRemoteModule = <T = any>(remoteName: string, moduleName: string) => {
    const [module, setModule] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      loadRemoteComponent<T>(remoteName, moduleName)
        .then(setModule)
        .catch(setError)
        .finally(() => setLoading(false));
    }, [remoteName, moduleName]);

    return { module, loading, error };
  };

  const createRemotesManager = () => {
    const remotes = new Map<string, EMPRemoteModule>();

    return {
      add: async (name: string, config: EMPRemoteModule) => {
        remotes.set(name, config);
      },
      remove: (name: string) => {
        remotes.delete(name);
      },
      update: (name: string, config: Partial<EMPRemoteModule>) => {
        const existing = remotes.get(name);
        if (existing) {
          remotes.set(name, { ...existing, ...config });
        }
      },
      list: () => Object.fromEntries(remotes),
      has: (name: string) => remotes.has(name),
      clear: () => remotes.clear(),
    };
  };

  return {
    loadRemoteComponent,
    preloadModules,
    useRemoteModule,
    createRemotesManager,
    metrics: options?.enableMetrics ? metrics : undefined,
    isInitialized: runtime.isInitialized,
    remotes: runtime.remotes,
  };
}

export function useRemoteComponent<T = any>(remoteName: string, moduleName: string) {
  const { useRemoteModule } = useEMP();
  return useRemoteModule<T>(remoteName, moduleName);
}

export function useEMPMetrics() {
  const { metrics } = useEMP({ enableMetrics: true });
  return metrics;
}

export function useEMPErrorHandler() {
  const [errors, setErrors] = useState<EMPErrorInfo[]>([]);

  const handleError = useCallback((error: EMPErrorInfo) => {
    setErrors((prev) => [...prev, error]);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getErrorsByType = useCallback(
    (type: EMPErrorInfo['type']) => {
      return errors.filter((error) => error.type === type);
    },
    [errors]
  );

  return {
    errors,
    handleError,
    clearErrors,
    getErrorsByType,
    hasErrors: errors.length > 0,
    errorCount: errors.length,
  };
}
