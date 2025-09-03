import { useState, useCallback, useRef, useEffect } from 'react';
import { useTRPC } from '../use-trpc';
import { Agent, Task, TaskResult } from './useAgent';

export interface QueuedTask extends Task {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  assignedAgent?: string;
  progress?: number;
  startTime?: number;
  endTime?: number;
  result?: TaskResult;
  error?: string;
  retryCount: number;
  priority: number;
  dependencies?: string[];
  estimatedDuration?: number;
}

export interface TaskQueueConfig {
  maxConcurrency: number;
  maxRetries: number;
  retryDelay: number;
  priorityMode: 'fifo' | 'priority' | 'shortest-job-first';
  autoProcess: boolean;
  persistQueue: boolean;
  maxQueueSize: number;
  timeoutMs: number;
}

export interface QueueMetrics {
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  throughput: number;
  concurrencyUtilization: number;
  queueUtilization: number;
}

export interface TaskBatch {
  id: string;
  name?: string;
  tasks: Task[];
  strategy: 'parallel' | 'sequential' | 'pipeline';
  config?: {
    maxConcurrency?: number;
    failFast?: boolean;
    continueOnError?: boolean;
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  results: TaskResult[];
}

export interface UseTaskQueueOptions {
  config?: Partial<TaskQueueConfig>;
  enableMetrics?: boolean;
  enablePersistence?: boolean;
  onTaskComplete?: (task: QueuedTask) => void;
  onTaskFail?: (task: QueuedTask, error: string) => void;
  onQueueEmpty?: () => void;
  onQueueFull?: () => void;
}

export interface UseTaskQueueResult {
  // Queue state
  tasks: QueuedTask[];
  metrics: QueueMetrics;
  isProcessing: boolean;
  config: TaskQueueConfig;

  // Queue operations
  addTask: (task: Task, options?: { priority?: number; dependencies?: string[] }) => string;
  addBatch: (batch: Omit<TaskBatch, 'id' | 'status' | 'progress' | 'results'>) => string;
  removeTask: (taskId: string) => boolean;
  cancelTask: (taskId: string) => Promise<boolean>;
  retryTask: (taskId: string) => Promise<void>;
  clearQueue: (status?: QueuedTask['status'][]) => void;

  // Queue control
  startProcessing: () => void;
  stopProcessing: () => void;
  pauseProcessing: () => void;
  resumeProcessing: () => void;

  // Task management
  getTask: (taskId: string) => QueuedTask | null;
  getTasksByStatus: (status: QueuedTask['status']) => QueuedTask[];
  getTasksByAgent: (agentId: string) => QueuedTask[];
  updateTaskPriority: (taskId: string, priority: number) => void;
  moveTaskToFront: (taskId: string) => void;

  // Batch operations
  getBatch: (batchId: string) => TaskBatch | null;
  getBatches: () => TaskBatch[];
  cancelBatch: (batchId: string) => Promise<void>;

  // Queue optimization
  optimizeQueue: () => void;
  rebalanceLoad: () => void;
  purgeCompleted: (olderThanMs?: number) => number;

  // Persistence
  exportQueue: () => string;
  importQueue: (queueData: string) => void;
  saveQueue: () => Promise<void>;
  loadQueue: () => Promise<void>;

  // Queue analysis
  predictWaitTime: (task: Task) => number;
  getOptimalBatchSize: () => number;
  getQueueHealth: () => 'healthy' | 'degraded' | 'critical';
}

/**
 * Hook for managing task queues with advanced scheduling and processing
 * 
 * @example
 * ```tsx
 * function TaskManager() {
 *   const { addTask, tasks, metrics, startProcessing } = useTaskQueue({
 *     config: { maxConcurrency: 3, priorityMode: 'priority' },
 *     enableMetrics: true,
 *     onTaskComplete: (task) => console.log('Task completed:', task.id)
 *   });
 * 
 *   const handleAddTask = () => {
 *     const taskId = addTask({
 *       type: 'text-generation',
 *       input: { prompt: 'Generate content' }
 *     }, { priority: 5 });
 *     
 *     startProcessing();
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleAddTask}>Add Task</button>
 *       <div>Queue: {tasks.length} tasks, {metrics.runningTasks} running</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTaskQueue(options: UseTaskQueueOptions = {}): UseTaskQueueResult {
  const {
    config: userConfig = {},
    enableMetrics = true,
    enablePersistence = false,
    onTaskComplete,
    onTaskFail,
    onQueueEmpty,
    onQueueFull
  } = options;

  // Default configuration
  const defaultConfig: TaskQueueConfig = {
    maxConcurrency: 3,
    maxRetries: 3,
    retryDelay: 1000,
    priorityMode: 'priority',
    autoProcess: true,
    persistQueue: false,
    maxQueueSize: 1000,
    timeoutMs: 300000, // 5 minutes
  };

  const [config] = useState<TaskQueueConfig>({ ...defaultConfig, ...userConfig });
  const [tasks, setTasks] = useState<QueuedTask[]>([]);
  const [batches, setBatches] = useState<Map<string, TaskBatch>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState<QueueMetrics>({
    totalTasks: 0,
    pendingTasks: 0,
    runningTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageWaitTime: 0,
    averageExecutionTime: 0,
    throughput: 0,
    concurrencyUtilization: 0,
    queueUtilization: 0,
  });

  // Processing control
  const processingInterval = useRef<NodeJS.Timeout | null>(null);
  const runningTasks = useRef<Map<string, AbortController>>(new Map());
  const taskHistory = useRef<Array<{ timestamp: number; action: string; taskId?: string }>([]);

  // TRPC hooks
  const { trpc } = useTRPC();

  // Update metrics when tasks change
  useEffect(() => {
    if (!enableMetrics) return;

    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const runningTasks = tasks.filter(t => t.status === 'running').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;

    // Calculate average times
    const completedTasksWithTimes = tasks.filter(t => 
      t.status === 'completed' && t.startTime && t.endTime
    );

    const avgWaitTime = completedTasksWithTimes.length > 0
      ? completedTasksWithTimes.reduce((sum, t) => 
          sum + (t.startTime! - new Date(t.metadata?.created || Date.now()).getTime()), 0
        ) / completedTasksWithTimes.length
      : 0;

    const avgExecutionTime = completedTasksWithTimes.length > 0
      ? completedTasksWithTimes.reduce((sum, t) => 
          sum + (t.endTime! - t.startTime!), 0
        ) / completedTasksWithTimes.length
      : 0;

    // Calculate throughput (tasks per minute)
    const recentTasks = tasks.filter(t => 
      t.endTime && (Date.now() - t.endTime) < 60000
    );
    const throughput = recentTasks.length;

    setMetrics({
      totalTasks: tasks.length,
      pendingTasks,
      runningTasks,
      completedTasks,
      failedTasks,
      averageWaitTime: avgWaitTime,
      averageExecutionTime: avgExecutionTime,
      throughput,
      concurrencyUtilization: runningTasks / config.maxConcurrency,
      queueUtilization: tasks.length / config.maxQueueSize,
    });
  }, [tasks, config, enableMetrics]);

  // Task queue processing
  const processQueue = useCallback(async () => {
    if (isPaused || !isProcessing) return;

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const runningCount = tasks.filter(t => t.status === 'running').length;

    if (pendingTasks.length === 0) {
      onQueueEmpty?.();
      return;
    }

    if (runningCount >= config.maxConcurrency) {
      return; // At max concurrency
    }

    // Sort pending tasks based on priority mode
    let sortedTasks = [...pendingTasks];
    
    switch (config.priorityMode) {
      case 'priority':
        sortedTasks.sort((a, b) => b.priority - a.priority);
        break;
      case 'shortest-job-first':
        sortedTasks.sort((a, b) => (a.estimatedDuration || 0) - (b.estimatedDuration || 0));
        break;
      case 'fifo':
      default:
        // Already in chronological order
        break;
    }

    // Check dependencies
    const executableTasks = sortedTasks.filter(task => {
      if (!task.dependencies?.length) return true;
      
      return task.dependencies.every(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask?.status === 'completed';
      });
    });

    // Start tasks up to max concurrency
    const tasksToStart = executableTasks.slice(0, config.maxConcurrency - runningCount);

    for (const task of tasksToStart) {
      await startTaskExecution(task);
    }
  }, [tasks, isPaused, isProcessing, config, onQueueEmpty]);

  // Start processing loop
  useEffect(() => {
    if (isProcessing && !processingInterval.current) {
      processingInterval.current = setInterval(processQueue, 1000);
    } else if (!isProcessing && processingInterval.current) {
      clearInterval(processingInterval.current);
      processingInterval.current = null;
    }

    return () => {
      if (processingInterval.current) {
        clearInterval(processingInterval.current);
        processingInterval.current = null;
      }
    };
  }, [isProcessing, processQueue]);

  // Execute individual task
  const startTaskExecution = useCallback(async (task: QueuedTask) => {
    const controller = new AbortController();
    runningTasks.current.set(task.id, controller);

    setTasks(prev => prev.map(t => 
      t.id === task.id 
        ? { ...t, status: 'running', startTime: Date.now() }
        : t
    ));

    taskHistory.current.push({
      timestamp: Date.now(),
      action: 'started',
      taskId: task.id
    });

    try {
      // Find best agent for task using existing useAgent logic
      const agentsQuery = await trpc.agents.list.query();
      const availableAgents = agentsQuery.agents.filter(a => a.status === 'ready');
      
      let selectedAgent: string;
      if (task.assignedAgent && availableAgents.find(a => a.id === task.assignedAgent)) {
        selectedAgent = task.assignedAgent;
      } else {
        // Simple agent selection - in production, use more sophisticated logic
        const capableAgents = availableAgents.filter(agent =>
          agent.capabilities.some(cap => task.type.includes(cap))
        );
        
        if (capableAgents.length === 0) {
          throw new Error('No capable agents available');
        }
        
        selectedAgent = capableAgents[0].id;
      }

      // Execute task
      const result = await trpc.agents.executeTask.mutate({
        agentId: selectedAgent,
        task: {
          ...task,
          id: task.id,
        },
        async: false,
      });

      // Task completed successfully
      setTasks(prev => prev.map(t => 
        t.id === task.id
          ? {
              ...t,
              status: 'completed',
              endTime: Date.now(),
              result: result as TaskResult,
              assignedAgent: selectedAgent,
            }
          : t
      ));

      runningTasks.current.delete(task.id);
      taskHistory.current.push({
        timestamp: Date.now(),
        action: 'completed',
        taskId: task.id
      });

      onTaskComplete?.(task);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if task should be retried
      if (task.retryCount < config.maxRetries) {
        // Schedule retry
        setTimeout(() => {
          setTasks(prev => prev.map(t => 
            t.id === task.id
              ? {
                  ...t,
                  status: 'pending',
                  retryCount: t.retryCount + 1,
                  startTime: undefined,
                }
              : t
          ));
        }, config.retryDelay * Math.pow(2, task.retryCount)); // Exponential backoff

        taskHistory.current.push({
          timestamp: Date.now(),
          action: 'retry_scheduled',
          taskId: task.id
        });
      } else {
        // Task failed permanently
        setTasks(prev => prev.map(t => 
          t.id === task.id
            ? {
                ...t,
                status: 'failed',
                endTime: Date.now(),
                error: errorMessage,
              }
            : t
        ));

        taskHistory.current.push({
          timestamp: Date.now(),
          action: 'failed',
          taskId: task.id
        });

        onTaskFail?.(task, errorMessage);
      }

      runningTasks.current.delete(task.id);
    }
  }, [trpc, config, onTaskComplete, onTaskFail]);

  // Queue operations
  const addTask = useCallback((
    task: Task, 
    options: { priority?: number; dependencies?: string[] } = {}
  ): string => {
    const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (tasks.length >= config.maxQueueSize) {
      onQueueFull?.();
      throw new Error('Queue is full');
    }

    const queuedTask: QueuedTask = {
      ...task,
      id: taskId,
      status: 'pending',
      priority: options.priority ?? task.metadata?.priority ?? 5,
      dependencies: options.dependencies,
      retryCount: 0,
      metadata: {
        ...task.metadata,
        created: Date.now(),
      },
    };

    setTasks(prev => [...prev, queuedTask]);
    
    taskHistory.current.push({
      timestamp: Date.now(),
      action: 'added',
      taskId
    });

    if (config.autoProcess && !isProcessing) {
      setIsProcessing(true);
    }

    return taskId;
  }, [tasks, config, onQueueFull, isProcessing]);

  const addBatch = useCallback((
    batch: Omit<TaskBatch, 'id' | 'status' | 'progress' | 'results'>
  ): string => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newBatch: TaskBatch = {
      ...batch,
      id: batchId,
      status: 'pending',
      progress: 0,
      results: [],
    };

    setBatches(prev => new Map(prev.set(batchId, newBatch)));

    // Add individual tasks to queue
    batch.tasks.forEach((task, index) => {
      const dependencies = batch.strategy === 'sequential' && index > 0
        ? [`${batchId}_task_${index - 1}`]
        : undefined;

      addTask({
        ...task,
        id: `${batchId}_task_${index}`,
        metadata: {
          ...task.metadata,
          batchId,
          batchIndex: index,
        }
      }, { dependencies });
    });

    return batchId;
  }, [addTask]);

  const removeTask = useCallback((taskId: string): boolean => {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return false;
    
    if (task.status === 'running') {
      const controller = runningTasks.current.get(taskId);
      controller?.abort();
      runningTasks.current.delete(taskId);
    }

    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    taskHistory.current.push({
      timestamp: Date.now(),
      action: 'removed',
      taskId
    });

    return true;
  }, [tasks]);

  const cancelTask = useCallback(async (taskId: string): Promise<boolean> => {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task || ['completed', 'failed', 'cancelled'].includes(task.status)) {
      return false;
    }

    if (task.status === 'running') {
      const controller = runningTasks.current.get(taskId);
      controller?.abort();
      runningTasks.current.delete(taskId);
    }

    setTasks(prev => prev.map(t => 
      t.id === taskId
        ? { ...t, status: 'cancelled', endTime: Date.now() }
        : t
    ));

    taskHistory.current.push({
      timestamp: Date.now(),
      action: 'cancelled',
      taskId
    });

    return true;
  }, [tasks]);

  const retryTask = useCallback(async (taskId: string): Promise<void> => {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task || task.status !== 'failed') {
      throw new Error('Task not found or not in failed state');
    }

    setTasks(prev => prev.map(t => 
      t.id === taskId
        ? {
            ...t,
            status: 'pending',
            retryCount: 0,
            error: undefined,
            startTime: undefined,
            endTime: undefined,
          }
        : t
    ));

    taskHistory.current.push({
      timestamp: Date.now(),
      action: 'retried',
      taskId
    });
  }, [tasks]);

  const clearQueue = useCallback((statuses?: QueuedTask['status'][]): void => {
    if (!statuses) {
      // Cancel all running tasks
      for (const [taskId, controller] of runningTasks.current) {
        controller.abort();
      }
      runningTasks.current.clear();
      
      setTasks([]);
      taskHistory.current.push({
        timestamp: Date.now(),
        action: 'cleared_all'
      });
    } else {
      // Remove tasks with specific statuses
      const toRemove = tasks.filter(t => statuses.includes(t.status));
      
      for (const task of toRemove) {
        if (task.status === 'running') {
          const controller = runningTasks.current.get(task.id);
          controller?.abort();
          runningTasks.current.delete(task.id);
        }
      }

      setTasks(prev => prev.filter(t => !statuses.includes(t.status)));
      
      taskHistory.current.push({
        timestamp: Date.now(),
        action: 'cleared_selective'
      });
    }
  }, [tasks]);

  // Queue control
  const startProcessing = useCallback(() => {
    setIsProcessing(true);
    setIsPaused(false);
  }, []);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    setIsPaused(false);
    
    // Cancel all running tasks
    for (const [, controller] of runningTasks.current) {
      controller.abort();
    }
    runningTasks.current.clear();
  }, []);

  const pauseProcessing = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeProcessing = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Task management
  const getTask = useCallback((taskId: string): QueuedTask | null => {
    return tasks.find(t => t.id === taskId) || null;
  }, [tasks]);

  const getTasksByStatus = useCallback((status: QueuedTask['status']): QueuedTask[] => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const getTasksByAgent = useCallback((agentId: string): QueuedTask[] => {
    return tasks.filter(t => t.assignedAgent === agentId);
  }, [tasks]);

  const updateTaskPriority = useCallback((taskId: string, priority: number): void => {
    setTasks(prev => prev.map(t => 
      t.id === taskId && t.status === 'pending'
        ? { ...t, priority }
        : t
    ));
  }, []);

  const moveTaskToFront = useCallback((taskId: string): void => {
    updateTaskPriority(taskId, Number.MAX_SAFE_INTEGER);
  }, [updateTaskPriority]);

  // Batch operations
  const getBatch = useCallback((batchId: string): TaskBatch | null => {
    return batches.get(batchId) || null;
  }, [batches]);

  const getBatches = useCallback((): TaskBatch[] => {
    return Array.from(batches.values());
  }, [batches]);

  const cancelBatch = useCallback(async (batchId: string): Promise<void> => {
    const batch = batches.get(batchId);
    if (!batch) return;

    // Cancel all tasks in batch
    for (let i = 0; i < batch.tasks.length; i++) {
      await cancelTask(`${batchId}_task_${i}`);
    }

    setBatches(prev => {
      const newBatches = new Map(prev);
      const updatedBatch = { ...batch, status: 'cancelled' as const };
      newBatches.set(batchId, updatedBatch);
      return newBatches;
    });
  }, [batches, cancelTask]);

  // Utility functions
  const optimizeQueue = useCallback(() => {
    // Reorder tasks for optimal execution
    setTasks(prev => {
      const pending = prev.filter(t => t.status === 'pending');
      const others = prev.filter(t => t.status !== 'pending');
      
      // Sort pending tasks by priority and estimated duration
      pending.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return (a.estimatedDuration || 0) - (b.estimatedDuration || 0);
      });

      return [...others, ...pending];
    });
  }, []);

  const rebalanceLoad = useCallback(() => {
    // Implementation would analyze agent load and reassign tasks
    console.log('Rebalancing task load across agents');
  }, []);

  const purgeCompleted = useCallback((olderThanMs: number = 3600000): number => {
    const cutoff = Date.now() - olderThanMs;
    const before = tasks.length;
    
    setTasks(prev => prev.filter(t => 
      !(t.status === 'completed' && (t.endTime || 0) < cutoff)
    ));
    
    return before - tasks.length;
  }, [tasks]);

  // Persistence
  const exportQueue = useCallback((): string => {
    return JSON.stringify({
      tasks,
      batches: Array.from(batches.entries()),
      config,
      metrics,
      timestamp: Date.now(),
    }, null, 2);
  }, [tasks, batches, config, metrics]);

  const importQueue = useCallback((queueData: string): void => {
    try {
      const data = JSON.parse(queueData);
      setTasks(data.tasks || []);
      setBatches(new Map(data.batches || []));
    } catch (error) {
      throw new Error('Invalid queue data format');
    }
  }, []);

  const saveQueue = useCallback(async (): Promise<void> => {
    if (!enablePersistence) return;
    
    const queueData = exportQueue();
    localStorage.setItem('taskQueue', queueData);
  }, [enablePersistence, exportQueue]);

  const loadQueue = useCallback(async (): Promise<void> => {
    if (!enablePersistence) return;
    
    const queueData = localStorage.getItem('taskQueue');
    if (queueData) {
      importQueue(queueData);
    }
  }, [enablePersistence, importQueue]);

  // Queue analysis
  const predictWaitTime = useCallback((task: Task): number => {
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const avgExecutionTime = metrics.averageExecutionTime || 30000; // 30s default
    
    const queuePosition = pendingTasks.findIndex(t => t.priority < (task.metadata?.priority || 5)) + 1;
    const waitTime = Math.max(0, queuePosition - config.maxConcurrency) * avgExecutionTime / config.maxConcurrency;
    
    return waitTime;
  }, [tasks, metrics, config]);

  const getOptimalBatchSize = useCallback((): number => {
    const avgExecutionTime = metrics.averageExecutionTime || 30000;
    const targetBatchTime = 300000; // 5 minutes
    
    return Math.max(1, Math.floor(targetBatchTime / avgExecutionTime));
  }, [metrics]);

  const getQueueHealth = useCallback((): 'healthy' | 'degraded' | 'critical' => {
    if (metrics.queueUtilization > 0.9) return 'critical';
    if (metrics.queueUtilization > 0.7 || metrics.averageWaitTime > 60000) return 'degraded';
    return 'healthy';
  }, [metrics]);

  // Load queue on mount if persistence is enabled
  useEffect(() => {
    if (enablePersistence) {
      loadQueue();
    }
  }, [enablePersistence, loadQueue]);

  // Auto-save queue changes if persistence is enabled
  useEffect(() => {
    if (enablePersistence && tasks.length > 0) {
      const timeoutId = setTimeout(saveQueue, 1000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [enablePersistence, tasks, saveQueue]);

  return {
    // State
    tasks,
    metrics,
    isProcessing,
    config,

    // Queue operations
    addTask,
    addBatch,
    removeTask,
    cancelTask,
    retryTask,
    clearQueue,

    // Queue control
    startProcessing,
    stopProcessing,
    pauseProcessing,
    resumeProcessing,

    // Task management
    getTask,
    getTasksByStatus,
    getTasksByAgent,
    updateTaskPriority,
    moveTaskToFront,

    // Batch operations
    getBatch,
    getBatches,
    cancelBatch,

    // Queue optimization
    optimizeQueue,
    rebalanceLoad,
    purgeCompleted,

    // Persistence
    exportQueue,
    importQueue,
    saveQueue,
    loadQueue,

    // Queue analysis
    predictWaitTime,
    getOptimalBatchSize,
    getQueueHealth,
  };
}

export default useTaskQueue;