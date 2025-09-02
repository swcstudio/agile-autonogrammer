import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useMultithreadingStore } from '../stores/multithreading-store.ts';

interface ThreadLifecycleConfig {
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

interface ThreadMetrics {
  activeThreads: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  threadUtilization: number;
}

interface SubagentRegistry {
  register: (id: string, capabilities: string[]) => Promise<void>;
  unregister: (id: string) => Promise<void>;
  findAvailable: (capability: string) => Promise<string[]>;
  requestWork: (agentId: string, task: any) => Promise<any>;
}

interface ThreadTask<T = any> {
  id: string;
  type: 'cpu' | 'io' | 'gpu' | 'ai';
  operation: string;
  data: T;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retries?: number;
  dependencies?: string[];
  subagentRequirement?: string;
}

interface TaskResult<T = any> {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  result?: T;
  error?: string;
  executionTime: number;
  threadId: string;
  retryCount: number;
  subagentId?: string;
}

interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  threadPools: { [key: string]: 'healthy' | 'degraded' | 'critical' };
  memoryPressure: 'low' | 'medium' | 'high';
  queueBacklog: number;
  errorRate: number;
  responseTime95th: number;
}

interface MultithreadingContextValue {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  nativeModule: any;
  metrics: ThreadMetrics;
  subagentRegistry: SubagentRegistry;
  websocketClient: WebSocket | null;
  
  // Lifecycle management
  initialize: () => Promise<void>;
  cleanup: () => void;
  scaleThreads: (targetSize: number) => Promise<void>;
  pauseThreadPool: () => Promise<void>;
  resumeThreadPool: () => Promise<void>;
  
  // Task management
  submitTask: <T>(task: ThreadTask<T>) => Promise<TaskResult<T>>;
  submitBatch: <T>(tasks: ThreadTask<T>[]) => Promise<TaskResult<T>[]>;
  cancelTask: (taskId: string) => Promise<boolean>;
  
  // Monitoring
  getHealthStatus: () => Promise<HealthStatus>;
  subscribeToMetrics: (callback: (metrics: ThreadMetrics) => void) => () => void;
  
  // Pub/Sub for Subagents
  publishToSubagents: (event: string, data: any) => Promise<void>;
  subscribeToSubagentEvents: (event: string, callback: (data: any) => void) => () => void;
}

const MultithreadingContext = createContext<MultithreadingContextValue | null>(null);

interface MultithreadingProviderProps {
  children: ReactNode;
  config?: ThreadLifecycleConfig;
}

export function MultithreadingProvider({ 
  children, 
  config = {} 
}: MultithreadingProviderProps) {
  const [nativeModule, setNativeModule] = useState<any>(null);
  const [websocketClient, setWebsocketClient] = useState<WebSocket | null>(null);
  const [metrics, setMetrics] = useState<ThreadMetrics>({
    activeThreads: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    threadUtilization: 0,
  });

  const store = useMultithreadingStore();
  const subagentRegistryRef = useRef<Map<string, { capabilities: string[], lastSeen: number }>>(new Map());
  const taskQueueRef = useRef<Map<string, ThreadTask>>(new Map());
  const runningTasksRef = useRef<Map<string, TaskResult>>(new Map());
  const metricsSubscribersRef = useRef<Set<(metrics: ThreadMetrics) => void>>(new Set());
  const eventSubscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initialize = useCallback(async () => {
    if (store.isInitialized) return;

    store.setLoading(true);
    store.setError(null);

    try {
      // Load native module
      const multithreading = await import('../native/index.js');
      
      // Initialize core multithreading
      const initResult = multithreading.initializeMultithreading();
      console.log('Multithreading initialization:', initResult);

      const systemInfo = multithreading.getSystemInfo();
      console.log('System info:', systemInfo);

      // Configure thread pools based on system capabilities and config
      const threadPoolSize = config.threadPoolSize || Math.min(systemInfo.cpuCores * 2, 16);
      
      store.addThreadPool({
        id: 'rayon_global',
        type: 'rayon',
        workerCount: threadPoolSize,
        activeTasks: 0,
        totalTasks: 0,
        isActive: true,
      });

      store.addThreadPool({
        id: 'tokio_runtime',
        type: 'tokio',
        workerCount: config.maxConcurrentThreads || systemInfo.cpuCores,
        activeTasks: 0,
        totalTasks: 0,
        isActive: true,
      });

      // Initialize AI-specific thread pool
      store.addThreadPool({
        id: 'ai_processor',
        type: 'custom',
        workerCount: Math.max(2, Math.floor(systemInfo.cpuCores / 2)),
        activeTasks: 0,
        totalTasks: 0,
        isActive: true,
      });

      setNativeModule(multithreading);
      store.setInitialized(true);
      store.setLoading(false);

      // Initialize WebSocket monitoring if enabled
      if (config.enableWebSocketMonitoring) {
        await initializeWebSocketMonitoring();
      }

      // Start health checks and metrics collection
      startHealthMonitoring();
      startMetricsCollection();

      console.log('Advanced multithreading system initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize multithreading';
      store.setError(errorMessage);
      store.setLoading(false);
      console.error('Multithreading initialization failed:', error);
    }
  }, [store.isInitialized, config]);

  const initializeWebSocketMonitoring = useCallback(async () => {
    const port = config.websocketPort || 8080;
    try {
      const ws = new WebSocket(`ws://localhost:${port}/multithreading-monitor`);
      
      ws.onopen = () => {
        console.log('WebSocket monitoring connected');
        setWebsocketClient(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'metrics') {
            setMetrics(prev => ({ ...prev, ...data.payload }));
          } else if (data.type === 'health') {
            console.log('Health status update:', data.payload);
          }
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket monitoring disconnected');
        setWebsocketClient(null);
        setTimeout(() => {
          if (config.enableWebSocketMonitoring) {
            initializeWebSocketMonitoring();
          }
        }, 5000);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket monitoring:', error);
    }
  }, [config.websocketPort, config.enableWebSocketMonitoring]);

  const startHealthMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    const interval = config.healthCheckInterval || 10000;
    healthCheckIntervalRef.current = setInterval(async () => {
      try {
        const health = await getHealthStatus();
        
        if (config.enableAutoScaling && health.overall === 'degraded') {
          const currentThreads = store.threadPools.reduce((sum, pool) => sum + pool.workerCount, 0);
          const maxThreads = config.maxConcurrentThreads || 32;
          
          if (currentThreads < maxThreads && health.queueBacklog > 10) {
            await scaleThreads(Math.min(currentThreads + 2, maxThreads));
          }
        }

        if (websocketClient && websocketClient.readyState === WebSocket.OPEN) {
          websocketClient.send(JSON.stringify({
            type: 'health',
            payload: health,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, interval);
  }, [config.healthCheckInterval, config.enableAutoScaling, config.maxConcurrentThreads, websocketClient, store.threadPools]);

  const startMetricsCollection = useCallback(() => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }

    metricsIntervalRef.current = setInterval(async () => {
      try {
        if (!nativeModule) return;

        const performanceMetrics = nativeModule.getPerformanceMetrics();
        const newMetrics: ThreadMetrics = {
          activeThreads: runningTasksRef.current.size,
          queuedTasks: taskQueueRef.current.size,
          completedTasks: metrics.completedTasks,
          failedTasks: metrics.failedTasks,
          averageExecutionTime: calculateAverageExecutionTime(),
          memoryUsage: performanceMetrics.memoryUsageMb || 0,
          cpuUsage: calculateCpuUsage(),
          threadUtilization: calculateThreadUtilization(),
        };

        setMetrics(newMetrics);

        metricsSubscribersRef.current.forEach(callback => {
          try {
            callback(newMetrics);
          } catch (error) {
            console.error('Metrics subscriber callback failed:', error);
          }
        });

        if (websocketClient && websocketClient.readyState === WebSocket.OPEN) {
          websocketClient.send(JSON.stringify({
            type: 'metrics',
            payload: newMetrics,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Metrics collection failed:', error);
      }
    }, 5000);
  }, [nativeModule, websocketClient, metrics]);

  const calculateAverageExecutionTime = useCallback(() => {
    const completedTasks = Array.from(runningTasksRef.current.values())
      .filter(task => task.status === 'completed');
    
    if (completedTasks.length === 0) return 0;
    
    const totalTime = completedTasks.reduce((sum, task) => sum + task.executionTime, 0);
    return totalTime / completedTasks.length;
  }, []);

  const calculateCpuUsage = useCallback(() => {
    const activeThreads = runningTasksRef.current.size;
    const availableCores = store.threadPools.reduce((sum, pool) => sum + pool.workerCount, 0);
    return Math.min((activeThreads / availableCores) * 100, 100);
  }, [store.threadPools]);

  const calculateThreadUtilization = useCallback(() => {
    const totalCapacity = store.threadPools.reduce((sum, pool) => sum + pool.workerCount, 0);
    const activeThreads = runningTasksRef.current.size;
    return totalCapacity > 0 ? (activeThreads / totalCapacity) * 100 : 0;
  }, [store.threadPools]);

  const cleanup = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }

    if (websocketClient) {
      websocketClient.close();
      setWebsocketClient(null);
    }

    subagentRegistryRef.current.clear();
    taskQueueRef.current.clear();
    runningTasksRef.current.clear();
    metricsSubscribersRef.current.clear();
    eventSubscribersRef.current.clear();

    if (nativeModule) {
      try {
        nativeModule.shutdownMultithreading();
      } catch (error) {
        console.warn('Error during multithreading cleanup:', error);
      }
    }
    
    store.cleanup();
    setNativeModule(null);
  }, [nativeModule, websocketClient, store]);

  useEffect(() => {
    if (config.autoInitialize !== false) {
      initialize();
    }

    return cleanup;
  }, [initialize, cleanup, config.autoInitialize]);

  // Add the remaining methods before contextValue
  const scaleThreads = useCallback(async (targetSize: number) => {
    if (!nativeModule) throw new Error('Multithreading not initialized');
    
    try {
      console.log(`Scaling thread pool to ${targetSize} threads`);
      
      store.threadPools.forEach(pool => {
        store.updateThreadPool(pool.id, { workerCount: Math.floor(targetSize / store.threadPools.length) });
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to scale threads:', error);
      throw error;
    }
  }, [nativeModule, store]);

  const pauseThreadPool = useCallback(async () => {
    if (!nativeModule) throw new Error('Multithreading not initialized');
    
    store.threadPools.forEach(pool => {
      store.updateThreadPool(pool.id, { isActive: false });
    });
  }, [nativeModule, store]);

  const resumeThreadPool = useCallback(async () => {
    if (!nativeModule) throw new Error('Multithreading not initialized');
    
    store.threadPools.forEach(pool => {
      store.updateThreadPool(pool.id, { isActive: true });
    });
  }, [nativeModule, store]);

  const submitTask = useCallback(async <T>(task: ThreadTask<T>): Promise<TaskResult<T>> => {
    if (!nativeModule) throw new Error('Multithreading not initialized');

    const startTime = performance.now();
    const result: TaskResult<T> = {
      id: task.id,
      status: 'pending',
      executionTime: 0,
      threadId: '',
      retryCount: 0,
    };

    try {
      taskQueueRef.current.set(task.id, task);
      runningTasksRef.current.set(task.id, { ...result, status: 'running' });

      let taskResult: any;
      
      switch (task.type) {
        case 'cpu':
          taskResult = await nativeModule.rayonParallelMap([task.data], task.operation);
          result.threadId = 'rayon_pool';
          break;
        case 'io':
        case 'ai':
          taskResult = await nativeModule.tokioSpawnTask(task.operation, task.data);
          result.threadId = 'tokio_runtime';
          break;
        default:
          taskResult = await nativeModule.rayonParallelMap([task.data], task.operation);
          result.threadId = 'rayon_pool';
      }

      result.result = taskResult;
      result.status = 'completed';
      result.executionTime = performance.now() - startTime;

      setMetrics(prev => ({ ...prev, completedTasks: prev.completedTasks + 1 }));
      
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.executionTime = performance.now() - startTime;
      
      setMetrics(prev => ({ ...prev, failedTasks: prev.failedTasks + 1 }));
    } finally {
      taskQueueRef.current.delete(task.id);
      runningTasksRef.current.set(task.id, result);
      
      setTimeout(() => {
        runningTasksRef.current.delete(task.id);
      }, 30000);
    }

    return result;
  }, [nativeModule]);

  const submitBatch = useCallback(async <T>(tasks: ThreadTask<T>[]): Promise<TaskResult<T>[]> => {
    const promises = tasks.map(task => submitTask(task));
    return Promise.all(promises);
  }, [submitTask]);

  const cancelTask = useCallback(async (taskId: string): Promise<boolean> => {
    const task = runningTasksRef.current.get(taskId);
    if (!task) return false;

    if (task.status === 'running') {
      runningTasksRef.current.set(taskId, { ...task, status: 'cancelled' });
      taskQueueRef.current.delete(taskId);
      return true;
    }

    return false;
  }, []);

  const getHealthStatus = useCallback(async (): Promise<HealthStatus> => {
    const queueBacklog = taskQueueRef.current.size;
    const runningTasks = runningTasksRef.current.size;
    const totalCapacity = store.threadPools.reduce((sum, pool) => sum + pool.workerCount, 0);
    
    const utilization = totalCapacity > 0 ? (runningTasks / totalCapacity) : 0;
    const errorRate = metrics.failedTasks / Math.max(metrics.completedTasks + metrics.failedTasks, 1);
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (utilization > 0.9 || queueBacklog > 20 || errorRate > 0.1) {
      overall = 'degraded';
    }
    if (utilization > 0.95 || queueBacklog > 50 || errorRate > 0.2) {
      overall = 'critical';
    }

    const threadPools: { [key: string]: 'healthy' | 'degraded' | 'critical' } = {};
    store.threadPools.forEach(pool => {
      const poolUtilization = pool.activeTasks / pool.workerCount;
      threadPools[pool.id] = poolUtilization > 0.9 ? 'degraded' : 'healthy';
    });

    return {
      overall,
      threadPools,
      memoryPressure: metrics.memoryUsage > 1000 ? 'high' : metrics.memoryUsage > 500 ? 'medium' : 'low',
      queueBacklog,
      errorRate: errorRate * 100,
      responseTime95th: metrics.averageExecutionTime * 1.5,
    };
  }, [store.threadPools, metrics]);

  const subscribeToMetrics = useCallback((callback: (metrics: ThreadMetrics) => void) => {
    metricsSubscribersRef.current.add(callback);
    
    return () => {
      metricsSubscribersRef.current.delete(callback);
    };
  }, []);

  const subagentRegistry: SubagentRegistry = {
    register: async (id: string, capabilities: string[]) => {
      subagentRegistryRef.current.set(id, {
        capabilities,
        lastSeen: Date.now(),
      });
      
      await publishToSubagents('agent.registered', { id, capabilities });
    },

    unregister: async (id: string) => {
      subagentRegistryRef.current.delete(id);
      await publishToSubagents('agent.unregistered', { id });
    },

    findAvailable: async (capability: string) => {
      const now = Date.now();
      const timeout = config.subagentTimeout || 30000;
      
      const available: string[] = [];
      for (const [id, agent] of subagentRegistryRef.current.entries()) {
        if (now - agent.lastSeen < timeout && agent.capabilities.includes(capability)) {
          available.push(id);
        }
      }
      
      return available;
    },

    requestWork: async (agentId: string, task: any) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Subagent ${agentId} did not respond within timeout`));
        }, config.subagentTimeout || 30000);

        const handleResponse = (data: any) => {
          if (data.taskId === task.id && data.agentId === agentId) {
            clearTimeout(timeout);
            unsubscribe();
            resolve(data.result);
          }
        };

        const unsubscribe = subscribeToSubagentEvents('task.completed', handleResponse);

        publishToSubagents('task.request', {
          agentId,
          task,
          timestamp: Date.now(),
        });
      });
    },
  };

  const publishToSubagents = useCallback(async (event: string, data: any) => {
    if (websocketClient && websocketClient.readyState === WebSocket.OPEN) {
      websocketClient.send(JSON.stringify({
        type: 'subagent.event',
        event,
        data,
        timestamp: Date.now(),
      }));
    }

    const subscribers = eventSubscribersRef.current.get(event);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event subscriber callback failed for ${event}:`, error);
        }
      });
    }
  }, [websocketClient]);

  const subscribeToSubagentEvents = useCallback((event: string, callback: (data: any) => void) => {
    if (!eventSubscribersRef.current.has(event)) {
      eventSubscribersRef.current.set(event, new Set());
    }
    
    eventSubscribersRef.current.get(event)!.add(callback);
    
    return () => {
      const subscribers = eventSubscribersRef.current.get(event);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          eventSubscribersRef.current.delete(event);
        }
      }
    };
  }, []);

  const contextValue: MultithreadingContextValue = {
    isInitialized: store.isInitialized,
    isLoading: store.isLoading,
    error: store.error,
    nativeModule,
    metrics,
    subagentRegistry,
    websocketClient,
    
    // Lifecycle management
    initialize,
    cleanup,
    scaleThreads,
    pauseThreadPool,
    resumeThreadPool,
    
    // Task management
    submitTask,
    submitBatch,
    cancelTask,
    
    // Monitoring
    getHealthStatus,
    subscribeToMetrics,
    
    // Pub/Sub for Subagents
    publishToSubagents,
    subscribeToSubagentEvents,
  };

  return (
    <MultithreadingContext.Provider value={contextValue}>{children}</MultithreadingContext.Provider>
  );
}

export function useMultithreadingContext() {
  const context = useContext(MultithreadingContext);
  if (!context) {
    throw new Error('useMultithreadingContext must be used within a MultithreadingProvider');
  }
  return context;
}

export function withMultithreading<P extends object>(Component: React.ComponentType<P>) {
  return function MultithreadingWrappedComponent(props: P) {
    return (
      <MultithreadingProvider>
        <Component {...props} />
      </MultithreadingProvider>
    );
  };
}
