import { useEffect, useState } from 'react';
import { IntegrationFactory } from '../factory/integration-factory.ts';
import type { KatalystIntegration } from '../types/index.ts';
import { type MultithreadingHookConfig, useMultithreading } from './use-multithreading.ts';

export interface UnifiedBuilderConfig {
  targetPlatforms: ('web' | 'desktop' | 'mobile' | 'metaverse')[];
  sharedComponents: boolean;
  rustBackend: boolean;
  features?: {
    hotReload?: boolean;
    crossPlatformSharing?: boolean;
    performanceOptimization?: boolean;
    nativeIntegration?: boolean;
    multithreading?: boolean;
    webxrMultithreading?: boolean;
  };
  multithreading?: MultithreadingHookConfig;
}

export interface UnifiedBuilderState {
  platforms: string[];
  isReady: boolean;
  isInitializing: boolean;
  error: string | null;
  integrations: Record<string, any>;
  multithreading?: {
    isInitialized: boolean;
    isLoading: boolean;
    activeThreads: number;
    runParallelTask: <T>(
      operation: string,
      data: T[],
      options?: { chunkSize?: number; timeout?: number }
    ) => Promise<any>;
    runAsyncTask: <T>(operation: string, data: T, options?: { timeout?: number }) => Promise<any>;
    createChannel: (bounded?: number) => any;
    benchmark: (operation: string, dataSize: number) => Promise<any>;
    getMetrics: () => any;
  };
}

export function useUnifiedBuilder(config: UnifiedBuilderConfig): UnifiedBuilderState {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, any>>({});

  const multithreadingConfig: MultithreadingHookConfig = {
    autoInitialize: config.features?.multithreading !== false,
    workerThreads: config.features?.performanceOptimization
      ? navigator.hardwareConcurrency || 8
      : 4,
    maxBlockingThreads: config.targetPlatforms.includes('metaverse') ? 8 : 4,
    enableProfiling: config.features?.performanceOptimization || false,
    ...config.multithreading,
  };

  const multithreading = useMultithreading(multithreadingConfig);

  useEffect(() => {
    const initializePlatforms = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const integrationsToInit: KatalystIntegration[] = [];

        if (config.targetPlatforms.includes('desktop')) {
          integrationsToInit.push({
            name: 'tauri',
            type: 'framework' as const,
            enabled: true,
          });
        }

        if (config.targetPlatforms.includes('mobile')) {
          integrationsToInit.push({
            name: 'rspeedy',
            type: 'framework' as const,
            enabled: true,
          });
        }

        if (config.targetPlatforms.includes('metaverse')) {
          integrationsToInit.push({
            name: 'webxr',
            type: 'framework' as const,
            enabled: true,
          });

          if (config.features?.webxrMultithreading && multithreading.state.isInitialized) {
            integrationsToInit.push({
              name: 'multithreading',
              type: 'framework' as const,
              enabled: true,
            });
          }
        }

        if (integrationsToInit.length > 0) {
          const initializedIntegrations =
            await IntegrationFactory.initializeIntegrations(integrationsToInit);

          const integrationMap: Record<string, any> = {};
          integrationsToInit.forEach((integration) => {
            const instance = IntegrationFactory.getIntegration(integration.name);
            if (instance) {
              integrationMap[integration.name] = instance;
            }
          });

          setIntegrations(integrationMap);
          setPlatforms(config.targetPlatforms);

          if (config.features?.multithreading && multithreading.state.isInitialized) {
            setIsReady(true);
          } else if (!config.features?.multithreading) {
            setIsReady(true);
          }
        } else {
          setPlatforms(['web']);
          setIsReady(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize platforms');
        setIsReady(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializePlatforms();
  }, [
    config.targetPlatforms,
    config.sharedComponents,
    config.rustBackend,
    multithreading.state.isInitialized,
  ]);

  return {
    platforms,
    isReady,
    isInitializing,
    error,
    integrations,
    multithreading: config.features?.multithreading
      ? {
          isInitialized: multithreading.state.isInitialized,
          isLoading: multithreading.state.isLoading,
          activeThreads: multithreading.state.activeThreads,
          runParallelTask: multithreading.runParallelTask,
          runAsyncTask: multithreading.runAsyncTask,
          createChannel: multithreading.createChannel,
          benchmark: multithreading.benchmark,
          getMetrics: multithreading.getMetrics,
        }
      : undefined,
  };
}

export function useDesktopBuilder(config?: Partial<UnifiedBuilderConfig>) {
  return useUnifiedBuilder({
    targetPlatforms: ['desktop'],
    sharedComponents: true,
    rustBackend: true,
    ...config,
  });
}

export function useMobileBuilder(config?: Partial<UnifiedBuilderConfig>) {
  return useUnifiedBuilder({
    targetPlatforms: ['mobile'],
    sharedComponents: true,
    rustBackend: true,
    ...config,
  });
}

export function useMetaverseBuilder(config?: Partial<UnifiedBuilderConfig>) {
  return useUnifiedBuilder({
    targetPlatforms: ['metaverse'],
    sharedComponents: true,
    rustBackend: true,
    ...config,
  });
}

export function useMultiPlatformBuilder(config?: Partial<UnifiedBuilderConfig>) {
  return useUnifiedBuilder({
    targetPlatforms: ['web', 'desktop', 'mobile', 'metaverse'],
    sharedComponents: true,
    rustBackend: true,
    features: {
      hotReload: true,
      crossPlatformSharing: true,
      performanceOptimization: true,
      nativeIntegration: true,
    },
    ...config,
  });
}
