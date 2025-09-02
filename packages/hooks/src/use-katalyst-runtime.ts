import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRuntime } from '../components/UnifiedRuntimeProvider.tsx';
import { useAdvancedMultithreading, useAITaskProcessor } from './use-multithreading.ts';

export interface KatalystRuntimeConfig {
  autoInitialize?: boolean;
  preferredProviders?: string[];
  multithreadingEnabled?: boolean;
  aiProcessingEnabled?: boolean;
  batchProcessingEnabled?: boolean;
}

/**
 * Master hook for Katalyst runtime management
 * Orchestrates all runtime providers with multithreading integration
 */
export function useKatalystRuntime(config: KatalystRuntimeConfig = {}) {
  const runtime = useRuntime();
  const multithreading = useAdvancedMultithreading({
    autoInitialize: config.autoInitialize,
    enableProfiling: true,
    enableWebSocketMonitoring: true,
    enablePubSub: true,
  });
  const aiProcessor = useAITaskProcessor();

  const [runtimeState, setRuntimeState] = useState({
    isReady: false,
    activeProviders: [] as string[],
    performance: {
      averageTaskTime: 0,
      throughput: 0,
      errorRate: 0,
    },
  });

  // Initialize runtime system
  useEffect(() => {
    if (config.autoInitialize !== false && !runtimeState.isReady) {
      const initializeRuntime = async () => {
        try {
          if (config.multithreadingEnabled !== false) {
            await multithreading.initialize();
          }
          
          setRuntimeState(prev => ({
            ...prev,
            isReady: true,
            activeProviders: runtime.enabledProviders,
          }));
        } catch (error) {
          console.error('Katalyst runtime initialization failed:', error);
        }
      };

      initializeRuntime();
    }
  }, [config.autoInitialize, config.multithreadingEnabled, multithreading, runtime, runtimeState.isReady]);

  // Performance monitoring
  useEffect(() => {
    if (!multithreading.isInitialized) return;

    const unsubscribe = multithreading.subscribeToMetrics((metrics) => {
      setRuntimeState(prev => ({
        ...prev,
        performance: {
          averageTaskTime: metrics.averageExecutionTime,
          throughput: metrics.completedTasks / Math.max(1, Date.now() / 1000 / 60), // per minute
          errorRate: metrics.failedTasks / Math.max(1, metrics.completedTasks + metrics.failedTasks),
        },
      }));
    });

    return unsubscribe;
  }, [multithreading]);

  // Smart provider execution with automatic failover
  const executeWithProvider = useCallback(async (
    providerType: string,
    operation: string,
    data: any,
    options: {
      fallbackProviders?: string[];
      useMultithreading?: boolean;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      timeout?: number;
    } = {}
  ) => {
    const { 
      fallbackProviders = [], 
      useMultithreading = config.multithreadingEnabled !== false,
      priority = 'normal',
      timeout = 30000
    } = options;

    const tryProvider = async (provider: string): Promise<any> => {
      if (!runtime.isProviderEnabled(provider)) {
        throw new Error(`Provider ${provider} is not enabled`);
      }

      if (useMultithreading && multithreading.isInitialized) {
        const task = {
          id: `runtime_${provider}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: 'ai' as const,
          operation: `${provider}.${operation}`,
          data: { provider: runtime.getProvider(provider), operation, data },
          priority,
          timeout,
        };

        const result = await multithreading.submitTask(task);
        if (result.status === 'completed') {
          return result.result;
        } else {
          throw new Error(result.error || `Task failed with status: ${result.status}`);
        }
      } else {
        // Direct provider execution
        const providerInstance = runtime.getProvider(provider);
        if (providerInstance && typeof providerInstance[operation] === 'function') {
          return await providerInstance[operation](data);
        } else {
          throw new Error(`Operation ${provider}.${operation} not found`);
        }
      }
    };

    // Try primary provider first
    try {
      return await tryProvider(providerType);
    } catch (primaryError) {
      console.warn(`Primary provider ${providerType} failed:`, primaryError);

      // Try fallback providers
      for (const fallbackProvider of fallbackProviders) {
        try {
          console.log(`Attempting fallback provider: ${fallbackProvider}`);
          return await tryProvider(fallbackProvider);
        } catch (fallbackError) {
          console.warn(`Fallback provider ${fallbackProvider} failed:`, fallbackError);
        }
      }

      // All providers failed
      throw new Error(
        `All providers failed. Primary: ${providerType}, Fallbacks: ${fallbackProviders.join(', ')}`
      );
    }
  }, [runtime, multithreading, config.multithreadingEnabled]);

  // Batch processing across multiple providers
  const executeBatch = useCallback(async (
    tasks: Array<{
      provider: string;
      operation: string;
      data: any;
      priority?: 'low' | 'normal' | 'high' | 'critical';
    }>,
    options: {
      maxConcurrency?: number;
      failureHandling?: 'fail-fast' | 'continue' | 'retry';
    } = {}
  ) => {
    if (!config.batchProcessingEnabled) {
      throw new Error('Batch processing is disabled');
    }

    const batchTasks = tasks.map((task, index) => ({
      id: `batch_${task.provider}_${Date.now()}_${index}`,
      type: 'ai' as const,
      operation: `${task.provider}.${task.operation}`,
      data: { provider: runtime.getProvider(task.provider), ...task },
      priority: task.priority || 'normal',
    }));

    return multithreading.submitBatch(batchTasks, options);
  }, [multithreading, runtime, config.batchProcessingEnabled]);

  // AI-powered task processing
  const processAITask = useCallback(async (
    taskType: 'inference' | 'training' | 'preprocessing' | 'postprocessing',
    data: any,
    options: {
      modelId?: string;
      provider?: string;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      useSubagent?: boolean;
    } = {}
  ) => {
    if (!config.aiProcessingEnabled) {
      throw new Error('AI processing is disabled');
    }

    const { provider = 'typia', ...aiOptions } = options;
    
    return aiProcessor.processAITask(taskType, data, {
      ...aiOptions,
      subagentCapability: provider,
    });
  }, [aiProcessor, config.aiProcessingEnabled]);

  // Get runtime health and metrics
  const getRuntimeHealth = useCallback(() => {
    return {
      ...runtimeState,
      multithreading: multithreading.getSystemMetrics(),
      providers: runtime.enabledProviders.map(provider => ({
        name: provider,
        enabled: runtime.isProviderEnabled(provider),
        healthy: true, // Could be enhanced with actual health checks
      })),
    };
  }, [runtimeState, multithreading, runtime]);

  return {
    // Runtime state
    isReady: runtimeState.isReady && runtime.isInitialized,
    activeProviders: runtimeState.activeProviders,
    performance: runtimeState.performance,
    
    // Core execution methods
    executeWithProvider,
    executeBatch,
    processAITask,
    
    // Cross-provider coordination
    dispatchCrossProviderTask: runtime.dispatchCrossProviderTask,
    
    // Provider management
    getProvider: runtime.getProvider,
    isProviderEnabled: runtime.isProviderEnabled,
    
    // Monitoring and health
    getRuntimeHealth,
    subscribeToMetrics: multithreading.subscribeToMetrics,
    
    // Multithreading access
    multithreading,
    aiProcessor,
    
    // Cleanup
    cleanup: multithreading.cleanup,
  };
}