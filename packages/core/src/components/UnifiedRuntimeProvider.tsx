import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useKatalystContext } from './KatalystProvider.tsx';
import { useMultithreadingContext } from './MultithreadingProvider.tsx';
import { useIntegration } from '../hooks/use-integration.ts';

interface RuntimeProviderConfig {
  enabledProviders: RuntimeProviderType[];
  multithreading?: {
    enableAITaskProcessing?: boolean;
    enableSubagentCoordination?: boolean;
    enableBatchProcessing?: boolean;
  };
  integrations?: {
    autoload?: boolean;
    priority?: RuntimeProviderType[];
  };
}

type RuntimeProviderType = 
  | 'emp' 
  | 'umi' 
  | 'sails' 
  | 'typia' 
  | 'inspector' 
  | 'tapable'
  | 'rspack'
  | 'arco'
  | 'trpc';

interface UnifiedRuntimeContextValue {
  // Core system status
  isInitialized: boolean;
  enabledProviders: RuntimeProviderType[];
  
  // Multithreading integration
  multithreading: ReturnType<typeof useMultithreadingContext>;
  
  // Dynamic provider access
  getProvider: <T = any>(type: RuntimeProviderType) => T | null;
  isProviderEnabled: (type: RuntimeProviderType) => boolean;
  
  // Cross-provider task coordination
  dispatchCrossProviderTask: (
    providers: RuntimeProviderType[], 
    task: any, 
    options?: { parallel?: boolean; priority?: 'low' | 'normal' | 'high' }
  ) => Promise<any>;
}

const RuntimeContext = createContext<UnifiedRuntimeContextValue | null>(null);

interface RuntimeProviderProps {
  children: ReactNode;
  config: RuntimeProviderConfig;
}

/**
 * RuntimeProvider - Consolidated runtime management system
 * 
 * This provider orchestrates all runtime integrations with multithreading support,
 * providing a single interface for managing EMP, Umi, Sails, Typia, Inspector,
 * and other runtime providers with intelligent task coordination.
 */
export function RuntimeProvider({ 
  children, 
  config 
}: RuntimeProviderProps) {
  const katalyst = useKatalystContext();
  const multithreading = useMultithreadingContext();
  
  // Dynamically load enabled integrations
  const integrations = useMemo(() => {
    const loadedIntegrations = new Map();
    
    config.enabledProviders.forEach(providerType => {
      try {
        // Dynamic integration loading based on config
        const integration = useIntegration(providerType);
        loadedIntegrations.set(providerType, integration);
      } catch (error) {
        console.warn(`Failed to load ${providerType} integration:`, error);
      }
    });
    
    return loadedIntegrations;
  }, [config.enabledProviders]);

  const getProvider = useMemo(() => {
    return <T = any>(type: RuntimeProviderType): T | null => {
      return integrations.get(type) || null;
    };
  }, [integrations]);

  const isProviderEnabled = useMemo(() => {
    return (type: RuntimeProviderType): boolean => {
      return config.enabledProviders.includes(type) && integrations.has(type);
    };
  }, [config.enabledProviders, integrations]);

  const dispatchCrossProviderTask = useMemo(() => {
    return async (
      providers: RuntimeProviderType[], 
      task: any, 
      options: { parallel?: boolean; priority?: 'low' | 'normal' | 'high' } = {}
    ) => {
      const { parallel = false, priority = 'normal' } = options;
      
      if (!multithreading.isInitialized) {
        throw new Error('Multithreading not initialized for cross-provider tasks');
      }

      const enabledProviders = providers.filter(isProviderEnabled);
      
      if (enabledProviders.length === 0) {
        throw new Error('No enabled providers found for task execution');
      }

      if (parallel && config.multithreading?.enableBatchProcessing) {
        // Execute providers in parallel using multithreading
        const multithreadingTasks = enabledProviders.map((providerType, index) => ({
          id: `cross_provider_${providerType}_${Date.now()}_${index}`,
          type: 'ai' as const,
          operation: `runtime.${providerType}`,
          data: { provider: getProvider(providerType), task },
          priority,
          subagentRequirement: config.multithreading?.enableSubagentCoordination 
            ? `runtime.${providerType}` 
            : undefined,
        }));

        const results = await multithreading.submitBatch(multithreadingTasks);
        return results.map(result => result.result);
      } else {
        // Sequential execution
        const results = [];
        for (const providerType of enabledProviders) {
          const provider = getProvider(providerType);
          if (provider && typeof provider.execute === 'function') {
            try {
              const result = await provider.execute(task);
              results.push({ provider: providerType, result });
            } catch (error) {
              results.push({ provider: providerType, error: error.message });
            }
          }
        }
        return results;
      }
    };
  }, [multithreading, config, getProvider, isProviderEnabled]);

  const contextValue: UnifiedRuntimeContextValue = {
    isInitialized: katalyst.isInitialized && multithreading.isInitialized,
    enabledProviders: config.enabledProviders,
    multithreading,
    getProvider,
    isProviderEnabled,
    dispatchCrossProviderTask,
  };

  return (
    <RuntimeContext.Provider value={contextValue}>
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error('useRuntime must be used within a RuntimeProvider');
  }
  return context;
}

/**
 * Higher-order component for automatic runtime provider integration
 */
export function withRuntime<P extends object>(
  Component: React.ComponentType<P>,
  requiredProviders: RuntimeProviderType[] = []
) {
  return function RuntimeWrappedComponent(props: P) {
    return (
      <RuntimeProvider 
        config={{ 
          enabledProviders: requiredProviders,
          multithreading: {
            enableAITaskProcessing: true,
            enableSubagentCoordination: true,
            enableBatchProcessing: true,
          }
        }}
      >
        <Component {...props} />
      </RuntimeProvider>
    );
  };
}