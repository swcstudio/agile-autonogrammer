import React, { useCallback, useEffect, useMemo, useRef, useState, use } from 'react';
import { useMultithreadingContext } from '../components/MultithreadingProvider.tsx';

export interface ThreadLifecycleConfig {
  autoInitialize?: boolean;
  workerThreads?: number;
  maxBlockingThreads?: number;
  enableProfiling?: boolean;
  maxConcurrentThreads?: number;
  threadPoolSize?: number;
  enableAutoScaling?: boolean;
  healthCheckInterval?: number;
  enableWebSocketMonitoring?: boolean;
  websocketPort?: number;
  enablePubSub?: boolean;
  subagentTimeout?: number;
}

export interface AdvancedThreadTask<T = any> {
  id: string;
  type: 'cpu' | 'io' | 'gpu' | 'ai';
  operation: string;
  data: T;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retries?: number;
  dependencies?: string[];
  subagentRequirement?: string;
  resourceHints?: {
    expectedMemory?: number;
    expectedCpuTime?: number;
    preferredThreadPool?: string;
  };
}

export interface AdvancedTaskResult<T = any> {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  result?: T;
  error?: string;
  executionTime: number;
  threadId: string;
  retryCount: number;
  subagentId?: string;
  resourceUsage?: {
    memoryPeak: number;
    cpuTime: number;
    threadPoolUtilization: number;
  };
}

export interface ThreadPoolMetrics {
  id: string;
  type: string;
  workerCount: number;
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageJobTime: number;
  utilization: number;
  health: 'healthy' | 'degraded' | 'critical';
}

export interface SystemMetrics {
  totalThreads: number;
  availableThreads: number;
  memoryUsage: number;
  cpuUsage: number;
  queueBacklog: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

// Enhanced multithreading hook with advanced lifecycle management
export function useAdvancedMultithreading(config: ThreadLifecycleConfig = {}) {
  const context = useMultithreadingContext();
  const [taskHistory, setTaskHistory] = useState<Map<string, AdvancedTaskResult>>(new Map());
  const [activeOperations, setActiveOperations] = useState<Set<string>>(new Set());
  const performanceMetricsRef = useRef<SystemMetrics>({
    totalThreads: 0,
    availableThreads: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    queueBacklog: 0,
    throughput: 0,
    errorRate: 0,
    uptime: 0,
  });

  // Enhanced task submission with priority and resource hints
  const submitAdvancedTask = useCallback(async <T>(
    task: AdvancedThreadTask<T>
  ): Promise<AdvancedTaskResult<T>> => {
    if (!context.isInitialized) {
      throw new Error('Multithreading context not initialized');
    }

    setActiveOperations(prev => new Set([...prev, task.id]));
    
    try {
      // Convert to context-compatible task format
      const contextTask = {
        id: task.id,
        type: task.type,
        operation: task.operation,
        data: task.data,
        priority: task.priority,
        timeout: task.timeout,
        retries: task.retries,
        dependencies: task.dependencies,
        subagentRequirement: task.subagentRequirement,
      };

      const result = await context.submitTask(contextTask);
      
      const advancedResult: AdvancedTaskResult<T> = {
        ...result,
        resourceUsage: {
          memoryPeak: context.metrics.memoryUsage,
          cpuTime: result.executionTime,
          threadPoolUtilization: context.metrics.threadUtilization,
        },
      };

      setTaskHistory(prev => new Map([...prev, [task.id, advancedResult]]));
      
      return advancedResult;
    } finally {
      setActiveOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    }
  }, [context]);

  // Batch processing with intelligent load balancing
  const submitTaskBatch = useCallback(async <T>(
    tasks: AdvancedThreadTask<T>[],
    options: {
      maxConcurrency?: number;
      loadBalancing?: 'round-robin' | 'priority' | 'resource-aware';
      failureHandling?: 'fail-fast' | 'continue' | 'retry';
    } = {}
  ): Promise<AdvancedTaskResult<T>[]> => {
    const { maxConcurrency = 4, loadBalancing = 'priority', failureHandling = 'continue' } = options;
    
    // Sort tasks by priority if using priority load balancing
    const sortedTasks = loadBalancing === 'priority' 
      ? [...tasks].sort((a, b) => {
          const priorityMap = { low: 0, normal: 1, high: 2, critical: 3 };
          return priorityMap[b.priority] - priorityMap[a.priority];
        })
      : tasks;

    const results: AdvancedTaskResult<T>[] = [];
    const chunks = [];
    
    // Chunk tasks based on max concurrency
    for (let i = 0; i < sortedTasks.length; i += maxConcurrency) {
      chunks.push(sortedTasks.slice(i, i + maxConcurrency));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(task => 
        submitAdvancedTask(task).catch(error => ({
          id: task.id,
          status: 'failed' as const,
          error: error.message,
          executionTime: 0,
          threadId: '',
          retryCount: 0,
        }))
      );

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Handle failures based on policy
      if (failureHandling === 'fail-fast' && chunkResults.some(r => r.status === 'failed')) {
        break;
      }
    }

    return results;
  }, [submitAdvancedTask]);

  // Thread pool monitoring and metrics
  const getThreadPoolMetrics = useCallback((): ThreadPoolMetrics[] => {
    if (!context.isInitialized) return [];

    // This would typically come from the native module or context
    return [
      {
        id: 'rayon_global',
        type: 'cpu',
        workerCount: 8,
        activeJobs: context.metrics.activeThreads,
        queuedJobs: context.metrics.queuedTasks,
        completedJobs: context.metrics.completedTasks,
        failedJobs: context.metrics.failedTasks,
        averageJobTime: context.metrics.averageExecutionTime,
        utilization: context.metrics.threadUtilization,
        health: context.metrics.threadUtilization > 90 ? 'critical' : 
                context.metrics.threadUtilization > 70 ? 'degraded' : 'healthy',
      },
      {
        id: 'tokio_runtime',
        type: 'io',
        workerCount: 4,
        activeJobs: Math.floor(context.metrics.activeThreads * 0.3),
        queuedJobs: Math.floor(context.metrics.queuedTasks * 0.2),
        completedJobs: Math.floor(context.metrics.completedTasks * 0.4),
        failedJobs: Math.floor(context.metrics.failedTasks * 0.1),
        averageJobTime: context.metrics.averageExecutionTime * 0.8,
        utilization: context.metrics.threadUtilization * 0.7,
        health: 'healthy',
      },
    ];
  }, [context]);

  // System-wide performance metrics
  const getSystemMetrics = useCallback((): SystemMetrics => {
    if (!context.isInitialized) return performanceMetricsRef.current;

    const metrics: SystemMetrics = {
      totalThreads: 12, // This would come from system info
      availableThreads: 12 - context.metrics.activeThreads,
      memoryUsage: context.metrics.memoryUsage,
      cpuUsage: context.metrics.cpuUsage,
      queueBacklog: context.metrics.queuedTasks,
      throughput: context.metrics.completedTasks / (Date.now() / 1000 / 60), // tasks per minute
      errorRate: context.metrics.failedTasks / Math.max(context.metrics.completedTasks + context.metrics.failedTasks, 1),
      uptime: Date.now() - (performanceMetricsRef.current?.uptime || Date.now()),
    };

    performanceMetricsRef.current = metrics;
    return metrics;
  }, [context]);

  // Advanced task cancellation with cleanup
  const cancelAdvancedTask = useCallback(async (taskId: string): Promise<boolean> => {
    const cancelled = await context.cancelTask(taskId);
    
    if (cancelled) {
      setActiveOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      
      setTaskHistory(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(taskId);
        if (existing) {
          newMap.set(taskId, { ...existing, status: 'cancelled' });
        }
        return newMap;
      });
    }
    
    return cancelled;
  }, [context]);

  // Health monitoring with proactive alerts
  const monitorHealth = useCallback(() => {
    const health = context.getHealthStatus();
    const systemMetrics = getSystemMetrics();
    
    return {
      systemHealth: health,
      systemMetrics,
      alerts: [] as string[], // Would contain health alerts
      recommendations: [] as string[], // Performance recommendations
    };
  }, [context, getSystemMetrics]);

  return {
    // Context delegation
    isInitialized: context.isInitialized,
    isLoading: context.isLoading,
    error: context.error,
    metrics: context.metrics,
    websocketClient: context.websocketClient,
    
    // Enhanced task management
    submitTask: submitAdvancedTask,
    submitBatch: submitTaskBatch,
    cancelTask: cancelAdvancedTask,
    
    // Lifecycle management
    initialize: context.initialize,
    cleanup: context.cleanup,
    scaleThreads: context.scaleThreads,
    pauseThreadPool: context.pauseThreadPool,
    resumeThreadPool: context.resumeThreadPool,
    
    // Monitoring and metrics
    getThreadPoolMetrics,
    getSystemMetrics,
    monitorHealth,
    subscribeToMetrics: context.subscribeToMetrics,
    getHealthStatus: context.getHealthStatus,
    
    // Subagent coordination
    subagentRegistry: context.subagentRegistry,
    publishToSubagents: context.publishToSubagents,
    subscribeToSubagentEvents: context.subscribeToSubagentEvents,
    
    // State
    taskHistory,
    activeOperations,
  };
}

// React 19 optimized hooks for specialized multithreading use cases

// Hook for AI task processing with subagent coordination
export function useAITaskProcessor() {
  const multithreading = useAdvancedMultithreading();
  
  const processAITask = useCallback(async <T>(
    taskType: 'inference' | 'training' | 'preprocessing' | 'postprocessing',
    data: T,
    options: {
      modelId?: string;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      useSubagent?: boolean;
      subagentCapability?: string;
    } = {}
  ) => {
    const task: AdvancedThreadTask<T> = {
      id: `ai_${taskType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'ai',
      operation: `ai.${taskType}`,
      data,
      priority: options.priority || 'normal',
      subagentRequirement: options.useSubagent ? options.subagentCapability : undefined,
      resourceHints: {
        expectedMemory: taskType === 'training' ? 2048 : 512,
        expectedCpuTime: taskType === 'training' ? 10000 : 1000,
        preferredThreadPool: 'ai_processor',
      },
    };

    return multithreading.submitTask(task);
  }, [multithreading]);

  return {
    processAITask,
    isReady: multithreading.isInitialized,
    metrics: multithreading.metrics,
    subagentRegistry: multithreading.subagentRegistry,
  };
}

// Hook for WebSocket-based thread monitoring
export function useThreadMonitoring() {
  const multithreading = useAdvancedMultithreading();
  const [monitoringData, setMonitoringData] = useState<{
    realTimeMetrics: SystemMetrics;
    threadPools: ThreadPoolMetrics[];
    healthStatus: any;
    alerts: string[];
  }>({
    realTimeMetrics: {
      totalThreads: 0,
      availableThreads: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      queueBacklog: 0,
      throughput: 0,
      errorRate: 0,
      uptime: 0,
    },
    threadPools: [],
    healthStatus: null,
    alerts: [],
  });

  useEffect(() => {
    if (!multithreading.isInitialized) return;

    const unsubscribe = multithreading.subscribeToMetrics((metrics) => {
      setMonitoringData(prev => ({
        ...prev,
        realTimeMetrics: multithreading.getSystemMetrics(),
        threadPools: multithreading.getThreadPoolMetrics(),
      }));
    });

    // Set up periodic health checks
    const healthInterval = setInterval(async () => {
      try {
        const health = await multithreading.getHealthStatus();
        const monitoring = multithreading.monitorHealth();
        
        setMonitoringData(prev => ({
          ...prev,
          healthStatus: health,
          alerts: monitoring.alerts,
        }));
      } catch (error) {
        console.error('Health monitoring failed:', error);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(healthInterval);
    };
  }, [multithreading]);

  return {
    ...monitoringData,
    websocketConnected: multithreading.websocketClient?.readyState === WebSocket.OPEN,
    startMonitoring: () => multithreading.initialize(),
    stopMonitoring: () => multithreading.cleanup(),
  };
}

// Hook for batch processing with progress tracking
export function useBatchProcessor<T>() {
  const multithreading = useAdvancedMultithreading();
  const [batchState, setBatchState] = useState<{
    isProcessing: boolean;
    progress: number;
    completedTasks: number;
    totalTasks: number;
    errors: string[];
    results: AdvancedTaskResult<T>[];
  }>({
    isProcessing: false,
    progress: 0,
    completedTasks: 0,
    totalTasks: 0,
    errors: [],
    results: [],
  });

  const processBatch = useCallback(async (
    tasks: AdvancedThreadTask<T>[],
    options: {
      maxConcurrency?: number;
      progressCallback?: (progress: number, completed: number, total: number) => void;
      errorHandling?: 'fail-fast' | 'continue' | 'retry';
    } = {}
  ) => {
    setBatchState({
      isProcessing: true,
      progress: 0,
      completedTasks: 0,
      totalTasks: tasks.length,
      errors: [],
      results: [],
    });

    try {
      const results = await multithreading.submitBatch(tasks, {
        maxConcurrency: options.maxConcurrency,
        failureHandling: options.errorHandling,
      });

      const errors = results.filter(r => r.status === 'failed').map(r => r.error || 'Unknown error');
      
      setBatchState({
        isProcessing: false,
        progress: 100,
        completedTasks: results.filter(r => r.status === 'completed').length,
        totalTasks: tasks.length,
        errors,
        results,
      });

      return results;
    } catch (error) {
      setBatchState(prev => ({
        ...prev,
        isProcessing: false,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Batch processing failed'],
      }));
      throw error;
    }
  }, [multithreading]);

  return {
    ...batchState,
    processBatch,
    cancelBatch: () => {
      // This would need implementation to cancel all running tasks
      setBatchState(prev => ({ ...prev, isProcessing: false }));
    },
  };
}

// Hook for subagent coordination
export function useSubagentCoordination() {
  const multithreading = useAdvancedMultithreading();
  const [subagents, setSubagents] = useState<Map<string, { capabilities: string[], lastSeen: number }>>(new Map());
  const [taskQueue, setTaskQueue] = useState<any[]>([]);

  const registerSubagent = useCallback(async (id: string, capabilities: string[]) => {
    await multithreading.subagentRegistry.register(id, capabilities);
    setSubagents(prev => new Map([...prev, [id, { capabilities, lastSeen: Date.now() }]]));
  }, [multithreading]);

  const requestSubagentWork = useCallback(async (capability: string, task: any) => {
    const availableAgents = await multithreading.subagentRegistry.findAvailable(capability);
    
    if (availableAgents.length === 0) {
      throw new Error(`No subagents available with capability: ${capability}`);
    }

    // Simple load balancing - pick first available
    const selectedAgent = availableAgents[0];
    return multithreading.subagentRegistry.requestWork(selectedAgent, task);
  }, [multithreading]);

  const broadcastToSubagents = useCallback(async (event: string, data: any) => {
    return multithreading.publishToSubagents(event, data);
  }, [multithreading]);

  useEffect(() => {
    if (!multithreading.isInitialized) return;

    const unsubscribeRegistration = multithreading.subscribeToSubagentEvents('agent.registered', (data) => {
      setSubagents(prev => new Map([...prev, [data.id, { capabilities: data.capabilities, lastSeen: Date.now() }]]));
    });

    const unsubscribeUnregistration = multithreading.subscribeToSubagentEvents('agent.unregistered', (data) => {
      setSubagents(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.id);
        return newMap;
      });
    });

    return () => {
      unsubscribeRegistration();
      unsubscribeUnregistration();
    };
  }, [multithreading]);

  return {
    subagents: Array.from(subagents.entries()).map(([id, info]) => ({ id, ...info })),
    taskQueue,
    registerSubagent,
    requestSubagentWork,
    broadcastToSubagents,
    isCoordinatorReady: multithreading.isInitialized,
  };
}

// Legacy compatibility hooks for backward compatibility
export function useMultithreading(config: any = {}) {
  const advanced = useAdvancedMultithreading(config);
  
  // Provide backward compatibility interface
  return {
    initialize: advanced.initialize,
    runParallelTask: async (operation: string, data: any[], options: any = {}) => {
      const task = {
        id: `legacy_parallel_${Date.now()}`,
        type: 'cpu' as const,
        operation,
        data,
        priority: 'normal' as const,
        timeout: options.timeout,
      };
      return advanced.submitTask(task);
    },
    runAsyncTask: async (operation: string, data: any, options: any = {}) => {
      const task = {
        id: `legacy_async_${Date.now()}`,
        type: 'io' as const,
        operation,
        data,
        priority: 'normal' as const,
        timeout: options.timeout,
      };
      return advanced.submitTask(task);
    },
    createChannel: (bounded?: number) => {
      // This would need to be implemented in the native module
      console.warn('createChannel is deprecated, use advanced multithreading features');
      return null;
    },
    benchmark: async (operation: string, dataSize: number) => {
      const task = {
        id: `benchmark_${Date.now()}`,
        type: 'cpu' as const,
        operation: `benchmark.${operation}`,
        data: { size: dataSize },
        priority: 'normal' as const,
      };
      return advanced.submitTask(task);
    },
    getMetrics: () => advanced.getSystemMetrics(),
    state: {
      isInitialized: advanced.isInitialized,
      isLoading: advanced.isLoading,
      activeThreads: advanced.metrics.activeThreads,
      completedTasks: advanced.metrics.completedTasks,
      failedTasks: advanced.metrics.failedTasks,
      averageTaskDuration: advanced.metrics.averageExecutionTime,
      error: advanced.error,
    },
  };
}

export function useParallelComputation<T>(data: T[], operation: string, dependencies: any[] = []) {
  const multithreading = useAdvancedMultithreading();
  const [result, setResult] = useState<any>(null);
  const [isComputing, setIsComputing] = useState(false);

  const compute = useCallback(async () => {
    if (!data.length || !multithreading.isInitialized) return;

    setIsComputing(true);
    try {
      const task = {
        id: `parallel_computation_${Date.now()}`,
        type: 'cpu' as const,
        operation,
        data,
        priority: 'normal' as const,
      };
      const computeResult = await multithreading.submitTask(task);
      setResult(computeResult);
    } catch (error) {
      console.error('Parallel computation failed:', error);
    } finally {
      setIsComputing(false);
    }
  }, [data, operation, multithreading]);

  useEffect(() => {
    compute();
  }, [compute, ...dependencies]);

  return {
    result,
    isComputing,
    recompute: compute,
  };
}

export function useAsyncComputation<T>(operation: string, data: T, dependencies: any[] = []) {
  const multithreading = useAdvancedMultithreading();
  const [result, setResult] = useState<any>(null);
  const [isComputing, setIsComputing] = useState(false);

  const compute = useCallback(async () => {
    if (!multithreading.isInitialized) return;

    setIsComputing(true);
    try {
      const task = {
        id: `async_computation_${Date.now()}`,
        type: 'io' as const,
        operation,
        data,
        priority: 'normal' as const,
      };
      const computeResult = await multithreading.submitTask(task);
      setResult(computeResult);
    } catch (error) {
      console.error('Async computation failed:', error);
    } finally {
      setIsComputing(false);
    }
  }, [operation, data, multithreading]);

  useEffect(() => {
    compute();
  }, [compute, ...dependencies]);

  return {
    result,
    isComputing,
    recompute: compute,
  };
}
