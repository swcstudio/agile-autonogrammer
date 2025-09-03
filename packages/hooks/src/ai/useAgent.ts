import { useState, useCallback, useEffect } from 'react';
import { useTRPC } from '../use-trpc';

// Types for agent operations
export interface Agent {
  id: string;
  name: string;
  type: 'text' | 'code' | 'image' | 'audio' | 'planner' | 'validator' | 'research' | 'integration';
  capabilities: string[];
  status: 'ready' | 'busy' | 'error' | 'offline';
  metrics?: AgentMetrics;
  health?: 'healthy' | 'degraded' | 'unhealthy';
}

export interface AgentMetrics {
  tasksExecuted: number;
  tasksSucceeded: number;
  tasksFailed: number;
  averageExecutionTime: number;
  lastExecutionTime: number | null;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
}

export interface Task {
  id?: string;
  type: string;
  input: any;
  config?: Record<string, any>;
  metadata?: {
    priority?: number;
    deadline?: number;
    retryCount?: number;
    timeout?: number;
  };
}

export interface TaskResult {
  success: boolean;
  taskId: string;
  result?: any;
  error?: string;
  executionTime: number;
  agentId: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: Agent['type'];
  capabilities: string[];
  config?: Record<string, any>;
  enabled?: boolean;
}

export interface UseAgentOptions {
  agentId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
}

export interface UseAgentResult {
  // Agent management
  agent: Agent | null;
  agents: Agent[];
  loading: boolean;
  error: string | null;

  // Agent operations
  registerAgent: (config: AgentConfig) => Promise<{ success: boolean; message: string }>;
  unregisterAgent: (agentId: string) => Promise<{ success: boolean; message: string }>;
  refreshAgent: () => Promise<void>;
  refreshAgents: () => Promise<void>;

  // Task execution
  executeTask: (
    agentId: string,
    task: Task,
    options?: { async?: boolean }
  ) => Promise<TaskResult>;

  // Agent selection
  selectBestAgent: (
    task: Task,
    criteria?: 'performance' | 'availability' | 'capability'
  ) => Agent | null;

  // Real-time updates
  subscribeToAgent: (agentId: string) => void;
  unsubscribeFromAgent: () => void;

  // Agent health
  checkHealth: () => Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    agents: Array<{
      agentId: string;
      name: string;
      health: string;
      status: string;
    }>;
  }>;

  // Capabilities
  getCapabilities: () => Promise<Array<{
    capability: string;
    agents: string[];
    count: number;
  }>>;
}

/**
 * Hook for managing AI agents
 * 
 * @example
 * ```tsx
 * function AgentDashboard() {
 *   const { agents, executeTask, registerAgent, loading } = useAgent();
 * 
 *   const handleRunTask = async () => {
 *     const bestAgent = selectBestAgent({ type: 'text-generation', input: 'Hello' });
 *     if (bestAgent) {
 *       const result = await executeTask(bestAgent.id, {
 *         type: 'text-generation',
 *         input: { prompt: 'Write a greeting' }
 *       });
 *       console.log(result);
 *     }
 *   };
 * 
 *   return <div>Agent Dashboard</div>;
 * }
 * ```
 */
export function useAgent(options: UseAgentOptions = {}): UseAgentResult {
  const {
    agentId,
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealTimeUpdates = true
  } = options;

  // State management
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TRPC hooks
  const { trpc, utils } = useTRPC();

  // Queries
  const agentsQuery = trpc.agents.list.useQuery(undefined, {
    enabled: !agentId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    onSuccess: (data) => {
      setAgents(data.agents);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const agentQuery = trpc.agents.getById.useQuery(
    { id: agentId! },
    {
      enabled: !!agentId,
      refetchInterval: autoRefresh ? refreshInterval : false,
      onSuccess: (data) => {
        setAgent(data as Agent);
        setError(null);
      },
      onError: (err) => {
        setError(err.message);
      },
    }
  );

  // Mutations
  const registerMutation = trpc.agents.register.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      if (agentId) {
        utils.agents.getById.invalidate({ id: agentId });
      }
    },
  });

  const unregisterMutation = trpc.agents.unregister.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
    },
  });

  const executeTaskMutation = trpc.agents.executeTask.useMutation();

  const healthCheckQuery = trpc.agents.healthCheck.useQuery(undefined, {
    enabled: false,
  });

  const capabilitiesQuery = trpc.agents.capabilities.useQuery(undefined, {
    enabled: false,
  });

  // Real-time subscription
  const subscription = trpc.agents.onAgentEvent.useSubscription(
    {
      agentId: enableRealTimeUpdates ? agentId : undefined,
      events: ['task:started', 'task:completed', 'task:failed', 'status:changed'],
    },
    {
      enabled: enableRealTimeUpdates,
      onData: (event) => {
        handleRealtimeEvent(event);
      },
      onError: (err) => {
        console.error('Real-time subscription error:', err);
      },
    }
  );

  // Handle real-time events
  const handleRealtimeEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'task:started':
        // Update agent status to busy
        if (agentId && event.data.agentId === agentId) {
          setAgent(prev => prev ? { ...prev, status: 'busy' } : null);
        } else {
          setAgents(prev => prev.map(a => 
            a.id === event.data.agentId ? { ...a, status: 'busy' } : a
          ));
        }
        break;

      case 'task:completed':
      case 'task:failed':
        // Update agent status to ready and metrics
        const updatedStatus = event.type === 'task:completed' ? 'ready' : 'error';
        
        if (agentId && event.data.agentId === agentId) {
          setAgent(prev => prev ? { ...prev, status: updatedStatus } : null);
        } else {
          setAgents(prev => prev.map(a => 
            a.id === event.data.agentId ? { ...a, status: updatedStatus } : a
          ));
        }
        break;

      case 'agent:registered':
        // Refresh agents list
        utils.agents.list.invalidate();
        break;

      case 'agent:unregistered':
        // Remove agent from list
        setAgents(prev => prev.filter(a => a.id !== event.data.agentId));
        break;

      case 'agent:status:changed':
        // Update agent status
        if (agentId && event.data.agentId === agentId) {
          setAgent(prev => prev ? { ...prev, status: event.data.status } : null);
        } else {
          setAgents(prev => prev.map(a => 
            a.id === event.data.agentId ? { ...a, status: event.data.status } : a
          ));
        }
        break;
    }
  }, [agentId, utils]);

  // Update loading state
  useEffect(() => {
    const isLoading = agentId ? agentQuery.isLoading : agentsQuery.isLoading;
    setLoading(isLoading);
  }, [agentId, agentQuery.isLoading, agentsQuery.isLoading]);

  // Agent operations
  const registerAgent = useCallback(async (config: AgentConfig) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await registerMutation.mutateAsync(config);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register agent');
      setLoading(false);
      throw err;
    }
  }, [registerMutation]);

  const unregisterAgent = useCallback(async (agentId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await unregisterMutation.mutateAsync({ id: agentId });
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unregister agent');
      setLoading(false);
      throw err;
    }
  }, [unregisterMutation]);

  const executeTask = useCallback(async (
    agentId: string,
    task: Task,
    options: { async?: boolean } = {}
  ) => {
    setError(null);
    
    try {
      const result = await executeTaskMutation.mutateAsync({
        agentId,
        task,
        async: options.async || false,
      });
      return result as TaskResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Task execution failed');
      throw err;
    }
  }, [executeTaskMutation]);

  const refreshAgent = useCallback(async () => {
    if (agentId) {
      await utils.agents.getById.invalidate({ id: agentId });
    }
  }, [agentId, utils]);

  const refreshAgents = useCallback(async () => {
    await utils.agents.list.invalidate();
  }, [utils]);

  const selectBestAgent = useCallback((
    task: Task,
    criteria: 'performance' | 'availability' | 'capability' = 'capability'
  ): Agent | null => {
    if (agents.length === 0) return null;

    // Filter agents by capability
    const capableAgents = agents.filter(agent => {
      // Check if agent has required capabilities for the task
      return agent.capabilities.some(cap => 
        task.type.includes(cap) || cap === 'general' || cap === task.type
      );
    });

    if (capableAgents.length === 0) return null;

    switch (criteria) {
      case 'availability':
        // Prefer ready agents
        const availableAgents = capableAgents.filter(a => a.status === 'ready');
        return availableAgents.length > 0 ? availableAgents[0] : capableAgents[0];

      case 'performance':
        // Select agent with best performance metrics
        return capableAgents.reduce((best, current) => {
          if (!current.metrics || !best.metrics) return current;
          
          const currentScore = current.metrics.tasksSucceeded / Math.max(current.metrics.tasksExecuted, 1);
          const bestScore = best.metrics.tasksSucceeded / Math.max(best.metrics.tasksExecuted, 1);
          
          return currentScore > bestScore ? current : best;
        });

      case 'capability':
      default:
        // Select agent with most specific capabilities
        return capableAgents.reduce((best, current) => {
          const currentRelevance = current.capabilities.filter(cap => 
            task.type.includes(cap)
          ).length;
          const bestRelevance = best.capabilities.filter(cap => 
            task.type.includes(cap)
          ).length;
          
          return currentRelevance > bestRelevance ? current : best;
        });
    }
  }, [agents]);

  const subscribeToAgent = useCallback((targetAgentId: string) => {
    // Subscription is automatically managed by the useSubscription hook
    console.log(`Subscribed to agent ${targetAgentId} events`);
  }, []);

  const unsubscribeFromAgent = useCallback(() => {
    // Subscription cleanup is handled automatically
    console.log('Unsubscribed from agent events');
  }, []);

  const checkHealth = useCallback(async () => {
    return await healthCheckQuery.refetch().then(result => result.data!);
  }, [healthCheckQuery]);

  const getCapabilities = useCallback(async () => {
    return await capabilitiesQuery.refetch().then(result => result.data!.capabilities);
  }, [capabilitiesQuery]);

  return {
    // State
    agent,
    agents,
    loading,
    error,

    // Operations
    registerAgent,
    unregisterAgent,
    refreshAgent,
    refreshAgents,
    executeTask,
    selectBestAgent,

    // Real-time
    subscribeToAgent,
    unsubscribeFromAgent,

    // Health & capabilities
    checkHealth,
    getCapabilities,
  };
}

export default useAgent;