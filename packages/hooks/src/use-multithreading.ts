import React, { useCallback, useEffect, useMemo, useRef, useState, use } from 'react';
import { useMultithreadingContext } from '../components/MultithreadingProvider.tsx';
import { ActorAdapter } from '@agile/ai-agents/adapters/ActorAdapter';
import { BaseAgent } from '@agile/ai-agents/agents/BaseAgent';
import type { Task, TaskResult, Agent } from '@agile/ai-agents/types/agents';
import { useTRPC } from '@agile/api/trpc/react';

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
  agentId?: string; // For AI agent-specific tasks
  agentType?: Agent['type']; // For agent type filtering
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
  agentId?: string; // Which AI agent executed the task
  agentType?: Agent['type']; // Type of agent used
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

// Enhanced AI task processor with TRPC agents integration
export function useAITaskProcessor() {
  const multithreading = useAdvancedMultithreading();
  const { trpc } = useTRPC();
  const [actorAdapter, setActorAdapter] = useState<ActorAdapter | null>(null);
  const [agentRegistry, setAgentRegistry] = useState<Map<string, Agent>>(new Map());

  // Initialize actor adapter with multithreading actor system
  useEffect(() => {
    if (!multithreading.isInitialized) return;

    // This would be initialized with the actual actor system from the multithreading context
    // For now, we'll assume the actor system is available through the context
    const adapter = new ActorAdapter(multithreading.actorSystem);
    setActorAdapter(adapter);

    return () => {
      adapter?.shutdown();
    };
  }, [multithreading.isInitialized]);

  // Load and register agents from TRPC
  useEffect(() => {
    if (!actorAdapter) return;

    const loadAgents = async () => {
      try {
        const agents = await trpc.agents.list.query();
        const agentMap = new Map<string, Agent>();
        
        for (const agent of agents) {
          agentMap.set(agent.id, agent);
          
          // Register agent with actor adapter if it's a BaseAgent instance
          if (agent instanceof BaseAgent) {
            await actorAdapter.registerAgent(agent);
          }
        }
        
        setAgentRegistry(agentMap);
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    };

    loadAgents();
  }, [actorAdapter, trpc]);

  // Process AI task with intelligent agent selection
  const processAITask = useCallback(async <T>(
    task: Task | {
      type: 'inference' | 'training' | 'preprocessing' | 'postprocessing' | 'text' | 'code' | 'image' | 'audio' | 'planning' | 'validation' | 'research' | 'integration';
      data: T;
      description?: string;
      requirements?: string[];
      constraints?: Record<string, any>;
      context?: Record<string, any>;
    },
    options: {
      agentId?: string; // Specific agent to use
      agentType?: Agent['type']; // Type of agent to prefer
      priority?: 'low' | 'normal' | 'high' | 'critical';
      async?: boolean;
      useActorSystem?: boolean; // Use actor system for execution
      fallbackToMultithreading?: boolean; // Fallback to regular multithreading
    } = {}
  ): Promise<AdvancedTaskResult<T>> => {
    const taskId = `ai_task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      // Convert input to standardized Task format
      const standardTask: Task = 'id' in task ? task : {
        id: taskId,
        type: task.type,
        input: task.data,
        description: task.description || `AI task: ${task.type}`,
        requirements: task.requirements || [],
        constraints: task.constraints || {},
        context: task.context || {},
        priority: options.priority || 5,
        createdAt: new Date(),
        status: 'pending',
      };

      let result: TaskResult;
      let executionMethod: 'trpc-agent' | 'actor-adapter' | 'multithreading' = 'trpc-agent';

      // Execute via TRPC agent system if available
      if (!options.useActorSystem) {
        try {
          if (options.agentId) {
            // Use specific agent
            result = await trpc.agents.executeTask.mutate({
              agentId: options.agentId,
              task: standardTask,
              async: options.async || false,
            });
          } else {
            // Use orchestration to select best agent
            const orchestrationResult = await trpc.agents.orchestrate.mutate({
              tasks: [standardTask],
              strategy: 'optimal',
              config: {
                agentSelectionCriteria: {
                  type: options.agentType,
                  priority: options.priority,
                },
              },
            });
            result = orchestrationResult.results[0];
          }
        } catch (trpcError) {
          if (!options.fallbackToMultithreading) {
            throw trpcError;
          }
          console.warn('TRPC agent execution failed, falling back to actor system:', trpcError);
          executionMethod = 'actor-adapter';
        }
      } else {
        executionMethod = 'actor-adapter';
      }

      // Fallback to actor adapter if requested or TRPC failed
      if (executionMethod === 'actor-adapter' && actorAdapter) {
        try {
          if (options.agentId) {
            result = await actorAdapter.executeTask(options.agentId, standardTask, {
              timeout: options.priority === 'critical' ? 60000 : 300000,
              priority: options.priority === 'critical' ? 10 : 5,
              async: options.async,
            });
          } else {
            // Find best available agent
            const availableAgents = actorAdapter.getRegisteredAgents();
            if (availableAgents.length === 0) {
              throw new Error('No agents available in actor system');
            }
            
            // Simple selection - use first alive agent (could be enhanced)
            const selectedAgent = availableAgents.find(id => actorAdapter.isAgentAlive(id));
            if (!selectedAgent) {
              throw new Error('No alive agents available');
            }
            
            result = await actorAdapter.executeTask(selectedAgent, standardTask, {
              timeout: options.priority === 'critical' ? 60000 : 300000,
              priority: options.priority === 'critical' ? 10 : 5,
              async: options.async,
            });
          }
        } catch (actorError) {
          if (!options.fallbackToMultithreading) {
            throw actorError;
          }
          console.warn('Actor adapter execution failed, falling back to multithreading:', actorError);
          executionMethod = 'multithreading';
        }
      }

      // Final fallback to regular multithreading
      if (executionMethod === 'multithreading') {
        const threadTask: AdvancedThreadTask<T> = {
          id: taskId,
          type: 'ai',
          operation: `ai.${standardTask.type}`,
          data: standardTask.input as T,
          priority: options.priority || 'normal',
          agentId: options.agentId,
          agentType: options.agentType,
          resourceHints: {
            expectedMemory: standardTask.type === 'training' ? 2048 : 512,
            expectedCpuTime: standardTask.type === 'training' ? 10000 : 1000,
            preferredThreadPool: 'ai_processor',
          },
        };

        const threadResult = await multithreading.submitTask(threadTask);
        
        // Convert thread result to AI task result format
        result = {
          success: threadResult.status === 'completed',
          data: threadResult.result,
          error: threadResult.error,
          executionTime: threadResult.executionTime,
          agentId: threadResult.agentId || 'multithreading',
          metadata: {
            executionMethod: 'multithreading',
            threadId: threadResult.threadId,
            resourceUsage: threadResult.resourceUsage,
          },
        };
      }

      // Convert to AdvancedTaskResult format
      const advancedResult: AdvancedTaskResult<T> = {
        id: taskId,
        status: result.success ? 'completed' : 'failed',
        result: result.data,
        error: result.error,
        executionTime: result.executionTime,
        threadId: result.metadata?.threadId || 'agent-system',
        retryCount: 0,
        agentId: result.agentId,
        agentType: options.agentType,
        resourceUsage: result.metadata?.resourceUsage || {
          memoryPeak: 0,
          cpuTime: result.executionTime,
          threadPoolUtilization: 0,
        },
      };

      return advancedResult;

    } catch (error) {
      return {
        id: taskId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0,
        threadId: 'error',
        retryCount: 0,
        agentId: options.agentId,
        agentType: options.agentType,
        resourceUsage: {
          memoryPeak: 0,
          cpuTime: 0,
          threadPoolUtilization: 0,
        },
      };
    }
  }, [multithreading, trpc, actorAdapter]);

  // Get available AI agents
  const getAvailableAgents = useCallback(async (): Promise<Agent[]> => {
    try {
      return await trpc.agents.list.query();
    } catch (error) {
      console.error('Failed to get available agents:', error);
      return Array.from(agentRegistry.values());
    }
  }, [trpc, agentRegistry]);

  // Select best agent for a task
  const selectBestAgent = useCallback(async (
    task: Task,
    criteria: 'performance' | 'availability' | 'capability' = 'capability'
  ): Promise<Agent | null> => {
    try {
      const agents = await getAvailableAgents();
      
      if (agents.length === 0) return null;

      // Simple selection logic (could be enhanced with ML)
      switch (criteria) {
        case 'capability':
          // Find agent with matching capabilities
          return agents.find(agent => 
            agent.capabilities.some(cap => 
              task.type.toLowerCase().includes(cap.toLowerCase()) ||
              cap.toLowerCase().includes(task.type.toLowerCase())
            )
          ) || agents[0];
          
        case 'availability':
          // Find agent with lowest current load
          const agentMetrics = await Promise.all(
            agents.map(async agent => ({
              agent,
              metrics: await trpc.agents.getMetrics.query({ agentId: agent.id })
                .catch(() => ({ currentLoad: 0 }))
            }))
          );
          return agentMetrics.sort((a, b) => 
            (a.metrics.currentLoad || 0) - (b.metrics.currentLoad || 0)
          )[0]?.agent || null;
          
        case 'performance':
          // Find agent with best historical performance for this task type
          const performanceData = await Promise.all(
            agents.map(async agent => ({
              agent,
              performance: await trpc.agents.getMetrics.query({ agentId: agent.id })
                .then(m => m.averageExecutionTime || 999999)
                .catch(() => 999999)
            }))
          );
          return performanceData.sort((a, b) => a.performance - b.performance)[0]?.agent || null;
          
        default:
          return agents[0];
      }
    } catch (error) {
      console.error('Failed to select best agent:', error);
      return null;
    }
  }, [trpc, getAvailableAgents]);

  return {
    processAITask,
    getAvailableAgents,
    selectBestAgent,
    isReady: multithreading.isInitialized,
    agentSystemReady: !!actorAdapter,
    metrics: multithreading.metrics,
    agentRegistry: Array.from(agentRegistry.values()),
    actorAdapter,
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
// Enhanced subagent coordination with AI agents integration
export function useSubagentCoordination() {
  const multithreading = useAdvancedMultithreading();
  const { trpc } = useTRPC();
  const [subagents, setSubagents] = useState<Map<string, { capabilities: string[], lastSeen: number }>>(new Map());
  const [aiAgents, setAIAgents] = useState<Map<string, Agent>>(new Map());
  const [taskQueue, setTaskQueue] = useState<Task[]>([]);

  // Load AI agents and register as subagents
  useEffect(() => {
    if (!multithreading.isInitialized) return;

    const loadAndRegisterAgents = async () => {
      try {
        const agents = await trpc.agents.list.query();
        const agentMap = new Map<string, Agent>();
        
        for (const agent of agents) {
          agentMap.set(agent.id, agent);
          
          // Register AI agent as subagent with multithreading system
          await multithreading.subagentRegistry.register(agent.id, agent.capabilities);
          setSubagents(prev => new Map([...prev, [agent.id, { capabilities: agent.capabilities, lastSeen: Date.now() }]]));
        }
        
        setAIAgents(agentMap);
      } catch (error) {
        console.error('Failed to load and register AI agents:', error);
      }
    };

    loadAndRegisterAgents();
  }, [multithreading.isInitialized, trpc]);

  const registerSubagent = useCallback(async (id: string, capabilities: string[]) => {
    await multithreading.subagentRegistry.register(id, capabilities);
    setSubagents(prev => new Map([...prev, [id, { capabilities, lastSeen: Date.now() }]]));
  }, [multithreading]);

  // Enhanced work request with AI agent awareness
  const requestSubagentWork = useCallback(async (capability: string, task: Task | any) => {
    // Try AI agents first if task is AI-compatible
    const aiAgent = Array.from(aiAgents.values()).find(agent => 
      agent.capabilities.some(cap => cap.toLowerCase().includes(capability.toLowerCase()))
    );

    if (aiAgent && typeof task === 'object' && task.type) {
      try {
        return await trpc.agents.executeTask.mutate({
          agentId: aiAgent.id,
          task: task as Task,
          async: false,
        });
      } catch (error) {
        console.warn(`AI agent ${aiAgent.id} failed, falling back to subagents:`, error);
      }
    }

    // Fallback to regular subagent system
    const availableAgents = await multithreading.subagentRegistry.findAvailable(capability);
    
    if (availableAgents.length === 0) {
      throw new Error(`No subagents available with capability: ${capability}`);
    }

    // Simple load balancing - pick first available
    const selectedAgent = availableAgents[0];
    return multithreading.subagentRegistry.requestWork(selectedAgent, task);
  }, [multithreading, aiAgents, trpc]);

  // Enhanced broadcasting including AI agents
  const broadcastToSubagents = useCallback(async (event: string, data: any) => {
    // Broadcast to traditional subagents
    const result = await multithreading.publishToSubagents(event, data);

    // Also broadcast to AI agents if applicable
    if (aiAgents.size > 0) {
      try {
        // Create a broadcast task for AI agents
        const broadcastTask: Task = {
          id: `broadcast_${Date.now()}`,
          type: 'integration',
          input: { event, data },
          description: `Broadcast event: ${event}`,
          requirements: [],
          constraints: {},
          context: { broadcast: true },
          priority: 3,
          createdAt: new Date(),
          status: 'pending',
        };

        // Send to all AI agents
        const promises = Array.from(aiAgents.keys()).map(agentId =>
          trpc.agents.executeTask.mutate({
            agentId,
            task: broadcastTask,
            async: true,
          }).catch(error => console.warn(`Broadcast to agent ${agentId} failed:`, error))
        );

        await Promise.allSettled(promises);
      } catch (error) {
        console.error('Failed to broadcast to AI agents:', error);
      }
    }

    return result;
  }, [multithreading, aiAgents, trpc]);

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
    aiAgents: Array.from(aiAgents.values()),
    taskQueue,
    registerSubagent,
    requestSubagentWork,
    broadcastToSubagents,
    isCoordinatorReady: multithreading.isInitialized,
    aiAgentCount: aiAgents.size,
    totalSubagents: subagents.size + aiAgents.size,
  };
}

// New hook: AI Agent Orchestration with Multithreading
export function useAIAgentOrchestration() {
  const multithreading = useAdvancedMultithreading();
  const { trpc } = useTRPC();
  const [orchestrationState, setOrchestrationState] = useState<{
    isOrchestrating: boolean;
    activeWorkflows: Map<string, {
      id: string;
      tasks: Task[];
      strategy: string;
      progress: number;
      startTime: number;
      agents: string[];
    }>;
    completedWorkflows: number;
    failedWorkflows: number;
  }>({
    isOrchestrating: false,
    activeWorkflows: new Map(),
    completedWorkflows: 0,
    failedWorkflows: 0,
  });

  // Orchestrate tasks across AI agents with multithreading support
  const orchestrateTasks = useCallback(async (
    tasks: Task[],
    options: {
      strategy?: 'sequential' | 'parallel' | 'pipeline' | 'adaptive';
      maxConcurrency?: number;
      useMultithreading?: boolean;
      loadBalancing?: 'round-robin' | 'capability' | 'performance';
      failureHandling?: 'fail-fast' | 'continue' | 'retry';
      timeoutMs?: number;
    } = {}
  ) => {
    const {
      strategy = 'adaptive',
      maxConcurrency = 3,
      useMultithreading = true,
      loadBalancing = 'capability',
      failureHandling = 'continue',
      timeoutMs = 300000,
    } = options;

    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();

    // Initialize workflow state
    setOrchestrationState(prev => ({
      ...prev,
      isOrchestrating: true,
      activeWorkflows: new Map([...prev.activeWorkflows, [workflowId, {
        id: workflowId,
        tasks: tasks.map(t => ({ ...t, status: 'pending' })),
        strategy,
        progress: 0,
        startTime,
        agents: [],
      }]]),
    }));

    try {
      let results: TaskResult[];

      if (useMultithreading && strategy === 'parallel') {
        // Use enhanced multithreading for parallel execution
        const threadTasks: AdvancedThreadTask[] = tasks.map(task => ({
          id: task.id,
          type: 'ai',
          operation: `agent.${task.type}`,
          data: task,
          priority: task.priority >= 8 ? 'critical' : task.priority >= 6 ? 'high' : 'normal',
          timeout: timeoutMs,
          agentType: task.type as Agent['type'],
          resourceHints: {
            expectedMemory: 512,
            expectedCpuTime: 30000,
            preferredThreadPool: 'ai_agents',
          },
        }));

        const threadResults = await multithreading.submitBatch(threadTasks, {
          maxConcurrency,
          loadBalancing: loadBalancing === 'round-robin' ? 'round-robin' : 'priority',
          failureHandling,
        });

        // Convert thread results to task results
        results = threadResults.map(tr => ({
          success: tr.status === 'completed',
          data: tr.result,
          error: tr.error,
          executionTime: tr.executionTime,
          agentId: tr.agentId || 'unknown',
          metadata: {
            threadId: tr.threadId,
            resourceUsage: tr.resourceUsage,
            executionMethod: 'multithreading',
          },
        }));
      } else {
        // Use TRPC orchestration
        const orchestrationResult = await trpc.agents.orchestrate.mutate({
          tasks,
          strategy,
          agents: [], // Let system select agents
          config: {
            maxConcurrency,
            loadBalancing,
            failureHandling,
            timeoutMs,
          },
        });

        results = orchestrationResult.results;
      }

      // Update workflow completion
      setOrchestrationState(prev => {
        const newActiveWorkflows = new Map(prev.activeWorkflows);
        newActiveWorkflows.delete(workflowId);
        
        return {
          ...prev,
          isOrchestrating: newActiveWorkflows.size > 0,
          activeWorkflows: newActiveWorkflows,
          completedWorkflows: prev.completedWorkflows + 1,
        };
      });

      return {
        workflowId,
        results,
        totalTasks: tasks.length,
        successfulTasks: results.filter(r => r.success).length,
        failedTasks: results.filter(r => !r.success).length,
        totalExecutionTime: Date.now() - startTime,
        strategy,
      };

    } catch (error) {
      // Update workflow failure
      setOrchestrationState(prev => {
        const newActiveWorkflows = new Map(prev.activeWorkflows);
        newActiveWorkflows.delete(workflowId);
        
        return {
          ...prev,
          isOrchestrating: newActiveWorkflows.size > 0,
          activeWorkflows: newActiveWorkflows,
          failedWorkflows: prev.failedWorkflows + 1,
        };
      });

      throw error;
    }
  }, [multithreading, trpc]);

  // Cancel active orchestration workflow
  const cancelOrchestration = useCallback(async (workflowId: string) => {
    const workflow = orchestrationState.activeWorkflows.get(workflowId);
    if (!workflow) return false;

    try {
      // Cancel tasks in progress
      for (const task of workflow.tasks) {
        if (task.status === 'running') {
          await multithreading.cancelTask(task.id);
        }
      }

      // Remove from active workflows
      setOrchestrationState(prev => {
        const newActiveWorkflows = new Map(prev.activeWorkflows);
        newActiveWorkflows.delete(workflowId);
        
        return {
          ...prev,
          isOrchestrating: newActiveWorkflows.size > 0,
          activeWorkflows: newActiveWorkflows,
        };
      });

      return true;
    } catch (error) {
      console.error(`Failed to cancel orchestration ${workflowId}:`, error);
      return false;
    }
  }, [orchestrationState.activeWorkflows, multithreading]);

  return {
    ...orchestrationState,
    orchestrateTasks,
    cancelOrchestration,
    isReady: multithreading.isInitialized,
    activeWorkflowCount: orchestrationState.activeWorkflows.size,
    totalWorkflows: orchestrationState.completedWorkflows + orchestrationState.failedWorkflows,
    successRate: 
      orchestrationState.completedWorkflows + orchestrationState.failedWorkflows > 0
        ? orchestrationState.completedWorkflows / (orchestrationState.completedWorkflows + orchestrationState.failedWorkflows)
        : 0,
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
