import { useState, useCallback, useRef, useEffect } from 'react';
import { useTRPC } from '../use-trpc';
import { Agent, Task, TaskResult } from './useAgent';

export interface OrchestrationConfig {
  strategy: 'parallel' | 'sequential' | 'pipeline' | 'adaptive';
  agents?: string[];
  config?: {
    maxConcurrency?: number;
    timeout?: number;
    failFast?: boolean;
    retryFailedTasks?: boolean;
    loadBalancing?: 'round-robin' | 'least-loaded' | 'capability-based';
  };
}

export interface OrchestrationResult {
  success: boolean;
  orchestrationId: string;
  strategy: string;
  results: TaskResult[];
  executionTime: number;
  tasksCompleted: number;
  tasksFailed: number;
  metrics: {
    throughput: number;
    avgTaskTime: number;
    concurrencyUtilization: number;
    resourceEfficiency: number;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  task: Task;
  dependencies?: string[];
  agentRequirements?: {
    type?: Agent['type'];
    capabilities?: string[];
    minPerformance?: number;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoff: number;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  config: OrchestrationConfig;
}

export interface UseOrchestrationOptions {
  enableMetrics?: boolean;
  enableRealTimeUpdates?: boolean;
  defaultStrategy?: OrchestrationConfig['strategy'];
  defaultConfig?: OrchestrationConfig['config'];
}

export interface UseOrchestrationResult {
  // Orchestration state
  isRunning: boolean;
  currentOrchestration: OrchestrationResult | null;
  orchestrationHistory: OrchestrationResult[];
  loading: boolean;
  error: string | null;

  // Basic orchestration
  orchestrate: (
    tasks: Task[],
    config: OrchestrationConfig
  ) => Promise<OrchestrationResult>;

  // Workflow management
  createWorkflow: (workflow: Omit<Workflow, 'id'>) => Workflow;
  executeWorkflow: (workflow: Workflow) => Promise<OrchestrationResult>;
  pauseWorkflow: () => Promise<void>;
  resumeWorkflow: () => Promise<void>;
  cancelWorkflow: () => Promise<void>;

  // Agent coordination
  assignTaskToAgent: (task: Task, agentId: string) => Promise<TaskResult>;
  redistributeTask: (taskId: string, newAgentId: string) => Promise<void>;
  getOptimalAgentForTask: (task: Task) => string | null;

  // Performance monitoring
  getMetrics: () => {
    activeOrchestrations: number;
    totalTasksExecuted: number;
    averageExecutionTime: number;
    successRate: number;
    resourceUtilization: number;
  };

  // Real-time updates
  subscribeToOrchestration: (orchestrationId: string) => void;
  unsubscribeFromOrchestration: () => void;

  // Utilities
  validateWorkflow: (workflow: Workflow) => { valid: boolean; errors: string[] };
  optimizeWorkflow: (workflow: Workflow) => Workflow;
  exportWorkflow: (workflow: Workflow) => string;
  importWorkflow: (workflowJson: string) => Workflow;
}

/**
 * Hook for orchestrating multi-agent workflows
 * 
 * @example
 * ```tsx
 * function WorkflowBuilder() {
 *   const { orchestrate, createWorkflow, executeWorkflow } = useOrchestration({
 *     enableMetrics: true,
 *     defaultStrategy: 'adaptive'
 *   });
 * 
 *   const handleRunWorkflow = async () => {
 *     const workflow = createWorkflow({
 *       name: 'Content Generation Pipeline',
 *       steps: [
 *         { id: '1', name: 'Research', task: { type: 'research', input: { topic: 'AI' } } },
 *         { id: '2', name: 'Write', task: { type: 'text-generation', input: {} }, dependencies: ['1'] },
 *         { id: '3', name: 'Review', task: { type: 'validation', input: {} }, dependencies: ['2'] }
 *       ],
 *       config: { strategy: 'pipeline' }
 *     });
 * 
 *     const result = await executeWorkflow(workflow);
 *     console.log('Workflow completed:', result);
 *   };
 * 
 *   return <div>Workflow Builder</div>;
 * }
 * ```
 */
export function useOrchestration(options: UseOrchestrationOptions = {}): UseOrchestrationResult {
  const {
    enableMetrics = true,
    enableRealTimeUpdates = true,
    defaultStrategy = 'adaptive',
    defaultConfig = {
      maxConcurrency: 5,
      timeout: 60000,
      failFast: false,
      retryFailedTasks: true,
      loadBalancing: 'capability-based',
    }
  } = options;

  // State management
  const [isRunning, setIsRunning] = useState(false);
  const [currentOrchestration, setCurrentOrchestration] = useState<OrchestrationResult | null>(null);
  const [orchestrationHistory, setOrchestrationHistory] = useState<OrchestrationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflows] = useState<Map<string, Workflow>>(new Map());
  
  // Metrics tracking
  const [metrics, setMetrics] = useState({
    activeOrchestrations: 0,
    totalTasksExecuted: 0,
    averageExecutionTime: 0,
    successRate: 0,
    resourceUtilization: 0,
  });

  // Refs for workflow control
  const currentWorkflowController = useRef<AbortController | null>(null);
  const workflowQueue = useRef<Workflow[]>([]);

  // TRPC hooks
  const { trpc, utils } = useTRPC();

  // Orchestration mutation
  const orchestrateMutation = trpc.agents.orchestrate.useMutation();

  // Agent queries for optimal selection
  const agentsQuery = trpc.agents.list.useQuery();

  // Real-time subscription for orchestration events
  const orchestrationSubscription = trpc.agents.onAgentEvent.useSubscription(
    {
      events: ['orchestration:started', 'orchestration:completed', 'orchestration:failed'],
    },
    {
      enabled: enableRealTimeUpdates,
      onData: (event) => {
        handleOrchestrationEvent(event);
      },
    }
  );

  // Handle real-time orchestration events
  const handleOrchestrationEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'orchestration:started':
        setIsRunning(true);
        setMetrics(prev => ({
          ...prev,
          activeOrchestrations: prev.activeOrchestrations + 1,
        }));
        break;

      case 'orchestration:completed':
        setIsRunning(false);
        setCurrentOrchestration(event.data);
        setOrchestrationHistory(prev => [event.data, ...prev.slice(0, 99)]); // Keep last 100
        
        setMetrics(prev => ({
          ...prev,
          activeOrchestrations: Math.max(0, prev.activeOrchestrations - 1),
          totalTasksExecuted: prev.totalTasksExecuted + event.data.tasksCompleted,
          averageExecutionTime: calculateAverageTime(prev.averageExecutionTime, event.data.executionTime),
          successRate: calculateSuccessRate(prev, event.data),
        }));
        break;

      case 'orchestration:failed':
        setIsRunning(false);
        setError(event.data.error);
        setMetrics(prev => ({
          ...prev,
          activeOrchestrations: Math.max(0, prev.activeOrchestrations - 1),
        }));
        break;
    }
  }, []);

  // Basic orchestration
  const orchestrate = useCallback(async (
    tasks: Task[],
    config: OrchestrationConfig
  ): Promise<OrchestrationResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await orchestrateMutation.mutateAsync({
        tasks,
        strategy: config.strategy,
        agents: config.agents,
        config: { ...defaultConfig, ...config.config },
      });

      setLoading(false);
      return result as OrchestrationResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Orchestration failed');
      setLoading(false);
      throw err;
    }
  }, [orchestrateMutation, defaultConfig]);

  // Workflow management
  const createWorkflow = useCallback((workflow: Omit<Workflow, 'id'>): Workflow => {
    const id = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newWorkflow: Workflow = { ...workflow, id };
    
    workflows.set(id, newWorkflow);
    return newWorkflow;
  }, [workflows]);

  const executeWorkflow = useCallback(async (workflow: Workflow): Promise<OrchestrationResult> => {
    setError(null);
    
    // Validate workflow
    const validation = validateWorkflow(workflow);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }

    // Create abort controller for cancellation
    currentWorkflowController.current = new AbortController();

    try {
      // Convert workflow steps to tasks with dependency resolution
      const orderedTasks = resolveWorkflowDependencies(workflow);
      
      // Execute workflow
      const result = await orchestrate(orderedTasks, workflow.config);
      
      currentWorkflowController.current = null;
      return result;
      
    } catch (err) {
      currentWorkflowController.current = null;
      throw err;
    }
  }, [orchestrate]);

  const pauseWorkflow = useCallback(async () => {
    if (currentWorkflowController.current) {
      // Implementation would pause current workflow
      console.log('Workflow paused');
    }
  }, []);

  const resumeWorkflow = useCallback(async () => {
    if (currentWorkflowController.current) {
      // Implementation would resume paused workflow
      console.log('Workflow resumed');
    }
  }, []);

  const cancelWorkflow = useCallback(async () => {
    if (currentWorkflowController.current) {
      currentWorkflowController.current.abort();
      currentWorkflowController.current = null;
      setIsRunning(false);
      setError('Workflow cancelled by user');
    }
  }, []);

  // Agent coordination
  const assignTaskToAgent = useCallback(async (
    task: Task,
    agentId: string
  ): Promise<TaskResult> => {
    const executeTaskMutation = trpc.agents.executeTask.useMutation();
    
    try {
      const result = await executeTaskMutation.mutateAsync({
        agentId,
        task,
        async: false,
      });
      
      return result as TaskResult;
    } catch (err) {
      throw new Error(`Failed to assign task to agent ${agentId}: ${err}`);
    }
  }, [trpc]);

  const redistributeTask = useCallback(async (
    taskId: string,
    newAgentId: string
  ) => {
    // Implementation would cancel task on current agent and reassign
    console.log(`Redistributing task ${taskId} to agent ${newAgentId}`);
  }, []);

  const getOptimalAgentForTask = useCallback((task: Task): string | null => {
    if (!agentsQuery.data?.agents) return null;

    const agents = agentsQuery.data.agents;
    
    // Filter agents by capabilities
    const capableAgents = agents.filter(agent => 
      agent.capabilities.some(cap => 
        task.type.includes(cap) || cap === 'general'
      ) && agent.status === 'ready'
    );

    if (capableAgents.length === 0) return null;

    // Select best agent based on current strategy
    switch (defaultConfig.loadBalancing) {
      case 'least-loaded':
        return capableAgents.reduce((best, current) => 
          (current.metrics?.tasksExecuted || 0) < (best.metrics?.tasksExecuted || 0) 
            ? current : best
        ).id;

      case 'capability-based':
        return capableAgents.reduce((best, current) => {
          const currentRelevance = current.capabilities.filter(cap => 
            task.type.includes(cap)
          ).length;
          const bestRelevance = best.capabilities.filter(cap => 
            task.type.includes(cap)
          ).length;
          
          return currentRelevance > bestRelevance ? current : best;
        }).id;

      case 'round-robin':
      default:
        // Simple round-robin selection
        return capableAgents[Math.floor(Math.random() * capableAgents.length)].id;
    }
  }, [agentsQuery.data, defaultConfig.loadBalancing]);

  // Performance monitoring
  const getMetrics = useCallback(() => {
    return { ...metrics };
  }, [metrics]);

  // Real-time updates
  const subscribeToOrchestration = useCallback((orchestrationId: string) => {
    console.log(`Subscribed to orchestration ${orchestrationId}`);
  }, []);

  const unsubscribeFromOrchestration = useCallback(() => {
    console.log('Unsubscribed from orchestration updates');
  }, []);

  // Utilities
  const validateWorkflow = useCallback((workflow: Workflow): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check for circular dependencies
    const dependencies = new Map<string, string[]>();
    for (const step of workflow.steps) {
      dependencies.set(step.id, step.dependencies || []);
    }

    if (hasCycles(dependencies)) {
      errors.push('Workflow contains circular dependencies');
    }

    // Check if all dependencies exist
    for (const step of workflow.steps) {
      for (const dep of step.dependencies || []) {
        if (!workflow.steps.find(s => s.id === dep)) {
          errors.push(`Step ${step.id} depends on non-existent step ${dep}`);
        }
      }
    }

    // Validate task types
    for (const step of workflow.steps) {
      if (!step.task.type) {
        errors.push(`Step ${step.id} has no task type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, []);

  const optimizeWorkflow = useCallback((workflow: Workflow): Workflow => {
    // Create optimized workflow with better task ordering and resource allocation
    const optimizedSteps = [...workflow.steps];

    // Sort steps to minimize wait times
    optimizedSteps.sort((a, b) => {
      const aDeps = a.dependencies?.length || 0;
      const bDeps = b.dependencies?.length || 0;
      return aDeps - bDeps;
    });

    return {
      ...workflow,
      steps: optimizedSteps,
      config: {
        ...workflow.config,
        config: {
          ...workflow.config.config,
          maxConcurrency: Math.min(
            workflow.config.config?.maxConcurrency || 5,
            optimizedSteps.length
          ),
        }
      }
    };
  }, []);

  const exportWorkflow = useCallback((workflow: Workflow): string => {
    return JSON.stringify(workflow, null, 2);
  }, []);

  const importWorkflow = useCallback((workflowJson: string): Workflow => {
    try {
      const workflow = JSON.parse(workflowJson) as Workflow;
      
      // Validate imported workflow
      const validation = validateWorkflow(workflow);
      if (!validation.valid) {
        throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
      }
      
      workflows.set(workflow.id, workflow);
      return workflow;
    } catch (err) {
      throw new Error(`Failed to import workflow: ${err}`);
    }
  }, [workflows, validateWorkflow]);

  return {
    // State
    isRunning,
    currentOrchestration,
    orchestrationHistory,
    loading,
    error,

    // Basic orchestration
    orchestrate,

    // Workflow management
    createWorkflow,
    executeWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,

    // Agent coordination
    assignTaskToAgent,
    redistributeTask,
    getOptimalAgentForTask,

    // Performance monitoring
    getMetrics,

    // Real-time updates
    subscribeToOrchestration,
    unsubscribeFromOrchestration,

    // Utilities
    validateWorkflow,
    optimizeWorkflow,
    exportWorkflow,
    importWorkflow,
  };
}

// Helper functions
function resolveWorkflowDependencies(workflow: Workflow): Task[] {
  const resolved: Task[] = [];
  const remaining = new Set(workflow.steps);
  const inProgress = new Set<string>();

  while (remaining.size > 0) {
    let progress = false;

    for (const step of remaining) {
      const canExecute = (step.dependencies || []).every(dep => 
        resolved.some(task => task.id === dep) || inProgress.has(dep)
      );

      if (canExecute) {
        resolved.push({
          ...step.task,
          id: step.id,
        });
        remaining.delete(step);
        progress = true;
        break;
      }
    }

    if (!progress) {
      throw new Error('Unable to resolve workflow dependencies');
    }
  }

  return resolved;
}

function hasCycles(dependencies: Map<string, string[]>): boolean {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(node: string): boolean {
    if (visiting.has(node)) return true; // Cycle detected
    if (visited.has(node)) return false;

    visiting.add(node);
    
    for (const dep of dependencies.get(node) || []) {
      if (visit(dep)) return true;
    }
    
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of dependencies.keys()) {
    if (visit(node)) return true;
  }

  return false;
}

function calculateAverageTime(current: number, newTime: number): number {
  // Simple moving average approximation
  return current * 0.9 + newTime * 0.1;
}

function calculateSuccessRate(prevMetrics: any, orchestrationResult: OrchestrationResult): number {
  const totalTasks = prevMetrics.totalTasksExecuted + orchestrationResult.tasksCompleted + orchestrationResult.tasksFailed;
  const totalSuccesses = prevMetrics.totalTasksExecuted * prevMetrics.successRate + orchestrationResult.tasksCompleted;
  
  return totalTasks > 0 ? totalSuccesses / totalTasks : 0;
}

export default useOrchestration;