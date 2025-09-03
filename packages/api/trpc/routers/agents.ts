import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';

// Import agent types and orchestration components
import type { 
  AgentConfig, 
  Task, 
  TaskResult, 
  AgentCapability,
  AgentMetrics,
  AgentStatus 
} from '@agile/ai-agents';

// Agent event emitter for real-time updates
const agentEvents = new EventEmitter();

// Input schemas
const agentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'code', 'image', 'audio', 'planner', 'validator', 'research', 'integration']),
  capabilities: z.array(z.string()),
  config: z.record(z.any()).optional(),
  enabled: z.boolean().default(true),
});

const taskSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  input: z.any(),
  config: z.record(z.any()).optional(),
  metadata: z.object({
    priority: z.number().min(0).max(10).default(5),
    deadline: z.number().optional(),
    retryCount: z.number().default(3),
    timeout: z.number().default(30000),
  }).optional(),
});

const taskExecutionSchema = z.object({
  agentId: z.string(),
  task: taskSchema,
  async: z.boolean().default(false),
});

const orchestrationSchema = z.object({
  tasks: z.array(taskSchema),
  strategy: z.enum(['parallel', 'sequential', 'pipeline', 'adaptive']).default('adaptive'),
  agents: z.array(z.string()).optional(),
  config: z.object({
    maxConcurrency: z.number().default(5),
    timeout: z.number().default(60000),
    failFast: z.boolean().default(false),
  }).optional(),
});

// Mock agent registry (will be replaced with actual implementation)
const agentRegistry = new Map<string, any>();
const agentMetrics = new Map<string, AgentMetrics>();

export const agentRouter = router({
  // List all available agents
  list: publicProcedure
    .query(async () => {
      const agents = Array.from(agentRegistry.entries()).map(([id, agent]) => ({
        id,
        name: agent.name,
        type: agent.type,
        capabilities: agent.capabilities,
        status: agent.status || 'ready',
        metrics: agentMetrics.get(id) || null,
      }));

      return {
        agents,
        total: agents.length,
      };
    }),

  // Get specific agent details
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const agent = agentRegistry.get(input.id);
      
      if (!agent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Agent ${input.id} not found`,
        });
      }

      return {
        id: input.id,
        name: agent.name,
        type: agent.type,
        capabilities: agent.capabilities,
        config: agent.config,
        status: agent.status,
        metrics: agentMetrics.get(input.id),
        health: agent.health,
      };
    }),

  // Register a new agent
  register: protectedProcedure
    .input(agentConfigSchema)
    .mutation(async ({ ctx, input }) => {
      if (agentRegistry.has(input.id)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Agent ${input.id} already exists`,
        });
      }

      // Create agent instance based on type
      const agent = {
        ...input,
        status: 'ready' as AgentStatus,
        health: 'healthy',
        createdAt: new Date(),
        createdBy: ctx.user?.id,
      };

      agentRegistry.set(input.id, agent);
      
      // Initialize metrics
      agentMetrics.set(input.id, {
        tasksExecuted: 0,
        tasksSucceeded: 0,
        tasksFailed: 0,
        averageExecutionTime: 0,
        lastExecutionTime: null,
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0,
      });

      // Emit registration event
      agentEvents.emit('agent:registered', { agentId: input.id });

      return {
        success: true,
        agentId: input.id,
        message: `Agent ${input.name} registered successfully`,
      };
    }),

  // Unregister an agent
  unregister: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!agentRegistry.has(input.id)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Agent ${input.id} not found`,
        });
      }

      agentRegistry.delete(input.id);
      agentMetrics.delete(input.id);

      // Emit unregistration event
      agentEvents.emit('agent:unregistered', { agentId: input.id });

      return {
        success: true,
        message: `Agent ${input.id} unregistered successfully`,
      };
    }),

  // Execute a task on a specific agent
  executeTask: protectedProcedure
    .input(taskExecutionSchema)
    .mutation(async ({ ctx, input }) => {
      const agent = agentRegistry.get(input.agentId);
      
      if (!agent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Agent ${input.agentId} not found`,
        });
      }

      if (agent.status !== 'ready') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Agent ${input.agentId} is not ready. Current status: ${agent.status}`,
        });
      }

      const taskId = input.task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      try {
        // Update agent status
        agent.status = 'busy';
        
        // Emit task start event
        agentEvents.emit('task:started', {
          taskId,
          agentId: input.agentId,
          task: input.task,
        });

        // Mock task execution (replace with actual agent execution)
        const result = await executeAgentTask(agent, {
          ...input.task,
          id: taskId,
        });

        const executionTime = Date.now() - startTime;

        // Update metrics
        const metrics = agentMetrics.get(input.agentId)!;
        metrics.tasksExecuted++;
        metrics.tasksSucceeded++;
        metrics.lastExecutionTime = executionTime;
        metrics.averageExecutionTime = 
          (metrics.averageExecutionTime * (metrics.tasksExecuted - 1) + executionTime) / metrics.tasksExecuted;

        // Update agent status
        agent.status = 'ready';

        // Emit task completion event
        agentEvents.emit('task:completed', {
          taskId,
          agentId: input.agentId,
          result,
          executionTime,
        });

        return {
          success: true,
          taskId,
          result,
          executionTime,
          agentId: input.agentId,
        };

      } catch (error) {
        const executionTime = Date.now() - startTime;

        // Update metrics
        const metrics = agentMetrics.get(input.agentId)!;
        metrics.tasksExecuted++;
        metrics.tasksFailed++;

        // Update agent status
        agent.status = 'ready';

        // Emit task failure event
        agentEvents.emit('task:failed', {
          taskId,
          agentId: input.agentId,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Execute multiple tasks with orchestration
  orchestrate: protectedProcedure
    .input(orchestrationSchema)
    .mutation(async ({ ctx, input }) => {
      const { tasks, strategy, agents: preferredAgents, config } = input;

      // Validate agents if specified
      if (preferredAgents) {
        for (const agentId of preferredAgents) {
          if (!agentRegistry.has(agentId)) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: `Agent ${agentId} not found`,
            });
          }
        }
      }

      const orchestrationId = `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      // Emit orchestration start event
      agentEvents.emit('orchestration:started', {
        orchestrationId,
        strategy,
        taskCount: tasks.length,
      });

      try {
        let results: TaskResult[] = [];

        switch (strategy) {
          case 'parallel':
            results = await executeParallel(tasks, preferredAgents, config);
            break;
          case 'sequential':
            results = await executeSequential(tasks, preferredAgents, config);
            break;
          case 'pipeline':
            results = await executePipeline(tasks, preferredAgents, config);
            break;
          case 'adaptive':
            results = await executeAdaptive(tasks, preferredAgents, config);
            break;
        }

        const executionTime = Date.now() - startTime;

        // Emit orchestration completion event
        agentEvents.emit('orchestration:completed', {
          orchestrationId,
          results,
          executionTime,
        });

        return {
          success: true,
          orchestrationId,
          strategy,
          results,
          executionTime,
          tasksCompleted: results.filter(r => r.success).length,
          tasksFailed: results.filter(r => !r.success).length,
        };

      } catch (error) {
        const executionTime = Date.now() - startTime;

        // Emit orchestration failure event
        agentEvents.emit('orchestration:failed', {
          orchestrationId,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Get agent metrics
  metrics: publicProcedure
    .input(z.object({ 
      agentId: z.string().optional(),
      period: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
    }))
    .query(async ({ input }) => {
      if (input.agentId) {
        const metrics = agentMetrics.get(input.agentId);
        
        if (!metrics) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Metrics for agent ${input.agentId} not found`,
          });
        }

        return {
          agentId: input.agentId,
          metrics,
          period: input.period,
        };
      }

      // Return metrics for all agents
      const allMetrics = Array.from(agentMetrics.entries()).map(([agentId, metrics]) => ({
        agentId,
        metrics,
      }));

      return {
        agents: allMetrics,
        period: input.period,
        aggregate: calculateAggregateMetrics(allMetrics),
      };
    }),

  // Subscribe to agent events (real-time updates)
  onAgentEvent: protectedProcedure
    .input(z.object({
      agentId: z.string().optional(),
      events: z.array(z.enum(['registered', 'unregistered', 'task:started', 'task:completed', 'task:failed', 'status:changed'])).optional(),
    }))
    .subscription(({ input }) => {
      return observable<any>((emit) => {
        const handlers: Array<{ event: string; handler: (data: any) => void }> = [];

        const eventTypes = input.events || [
          'agent:registered',
          'agent:unregistered',
          'task:started',
          'task:completed',
          'task:failed',
          'agent:status:changed',
        ];

        for (const eventType of eventTypes) {
          const handler = (data: any) => {
            // Filter by agentId if specified
            if (!input.agentId || data.agentId === input.agentId) {
              emit.next({
                type: eventType,
                data,
                timestamp: Date.now(),
              });
            }
          };

          agentEvents.on(eventType, handler);
          handlers.push({ event: eventType, handler });
        }

        // Cleanup on unsubscribe
        return () => {
          for (const { event, handler } of handlers) {
            agentEvents.off(event, handler);
          }
        };
      });
    }),

  // Health check for all agents
  healthCheck: publicProcedure
    .query(async () => {
      const healthStatus = Array.from(agentRegistry.entries()).map(([id, agent]) => ({
        agentId: id,
        name: agent.name,
        status: agent.status,
        health: agent.health || 'unknown',
        uptime: agentMetrics.get(id)?.uptime || 0,
        lastActivity: agentMetrics.get(id)?.lastExecutionTime || null,
      }));

      const healthy = healthStatus.filter(a => a.health === 'healthy').length;
      const unhealthy = healthStatus.filter(a => a.health === 'unhealthy').length;
      const degraded = healthStatus.filter(a => a.health === 'degraded').length;

      return {
        overall: unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy',
        agents: healthStatus,
        summary: {
          total: healthStatus.length,
          healthy,
          unhealthy,
          degraded,
        },
      };
    }),

  // Get available capabilities across all agents
  capabilities: publicProcedure
    .query(async () => {
      const capabilityMap = new Map<string, string[]>();

      for (const [agentId, agent] of agentRegistry.entries()) {
        for (const capability of agent.capabilities || []) {
          if (!capabilityMap.has(capability)) {
            capabilityMap.set(capability, []);
          }
          capabilityMap.get(capability)!.push(agentId);
        }
      }

      return {
        capabilities: Array.from(capabilityMap.entries()).map(([capability, agents]) => ({
          capability,
          agents,
          count: agents.length,
        })),
        total: capabilityMap.size,
      };
    }),
});

// Helper functions for task execution strategies

async function executeAgentTask(agent: any, task: Task): Promise<TaskResult> {
  // Mock implementation - replace with actual agent execution
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  return {
    success: Math.random() > 0.1, // 90% success rate for mock
    data: {
      message: `Task ${task.id} executed by ${agent.name}`,
      input: task.input,
      timestamp: Date.now(),
    },
    error: null,
  };
}

async function executeParallel(
  tasks: Task[], 
  preferredAgents?: string[], 
  config?: any
): Promise<TaskResult[]> {
  const maxConcurrency = config?.maxConcurrency || 5;
  const results: TaskResult[] = [];
  
  // Execute tasks in parallel with concurrency limit
  const chunks = [];
  for (let i = 0; i < tasks.length; i += maxConcurrency) {
    chunks.push(tasks.slice(i, i + maxConcurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (task) => {
        const agentId = selectAgent(task, preferredAgents);
        const agent = agentRegistry.get(agentId);
        return executeAgentTask(agent, task);
      })
    );
    results.push(...chunkResults);
  }

  return results;
}

async function executeSequential(
  tasks: Task[], 
  preferredAgents?: string[], 
  config?: any
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];

  for (const task of tasks) {
    const agentId = selectAgent(task, preferredAgents);
    const agent = agentRegistry.get(agentId);
    const result = await executeAgentTask(agent, task);
    results.push(result);

    if (config?.failFast && !result.success) {
      break;
    }
  }

  return results;
}

async function executePipeline(
  tasks: Task[], 
  preferredAgents?: string[], 
  config?: any
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  let previousResult: any = null;

  for (const task of tasks) {
    // Pass previous result as input to next task
    if (previousResult) {
      task.input = {
        ...task.input,
        previousResult: previousResult.data,
      };
    }

    const agentId = selectAgent(task, preferredAgents);
    const agent = agentRegistry.get(agentId);
    const result = await executeAgentTask(agent, task);
    results.push(result);

    if (!result.success && config?.failFast) {
      break;
    }

    previousResult = result;
  }

  return results;
}

async function executeAdaptive(
  tasks: Task[], 
  preferredAgents?: string[], 
  config?: any
): Promise<TaskResult[]> {
  // Adaptive execution based on task characteristics and agent availability
  const results: TaskResult[] = [];
  const taskQueue = [...tasks];
  const executing = new Map<string, Promise<TaskResult>>();

  while (taskQueue.length > 0 || executing.size > 0) {
    // Start new tasks if under concurrency limit
    while (taskQueue.length > 0 && executing.size < (config?.maxConcurrency || 5)) {
      const task = taskQueue.shift()!;
      const agentId = selectAgent(task, preferredAgents);
      const agent = agentRegistry.get(agentId);
      
      const promise = executeAgentTask(agent, task).then(result => {
        executing.delete(task.id!);
        return result;
      });
      
      executing.set(task.id!, promise);
    }

    // Wait for at least one task to complete
    if (executing.size > 0) {
      const result = await Promise.race(executing.values());
      results.push(result);
    }
  }

  return results;
}

function selectAgent(task: Task, preferredAgents?: string[]): string {
  // Simple agent selection logic - replace with actual selection algorithm
  const availableAgents = preferredAgents || Array.from(agentRegistry.keys());
  
  if (availableAgents.length === 0) {
    throw new Error('No agents available');
  }

  // Select agent based on task type or random
  return availableAgents[Math.floor(Math.random() * availableAgents.length)];
}

function calculateAggregateMetrics(allMetrics: Array<{ agentId: string; metrics: AgentMetrics }>) {
  const total = allMetrics.reduce((acc, { metrics }) => ({
    tasksExecuted: acc.tasksExecuted + metrics.tasksExecuted,
    tasksSucceeded: acc.tasksSucceeded + metrics.tasksSucceeded,
    tasksFailed: acc.tasksFailed + metrics.tasksFailed,
    totalExecutionTime: acc.totalExecutionTime + (metrics.averageExecutionTime * metrics.tasksExecuted),
    cpuUsage: acc.cpuUsage + metrics.cpuUsage,
    memoryUsage: acc.memoryUsage + metrics.memoryUsage,
  }), {
    tasksExecuted: 0,
    tasksSucceeded: 0,
    tasksFailed: 0,
    totalExecutionTime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
  });

  return {
    ...total,
    averageExecutionTime: total.tasksExecuted > 0 ? total.totalExecutionTime / total.tasksExecuted : 0,
    successRate: total.tasksExecuted > 0 ? total.tasksSucceeded / total.tasksExecuted : 0,
    averageCpuUsage: allMetrics.length > 0 ? total.cpuUsage / allMetrics.length : 0,
    averageMemoryUsage: allMetrics.length > 0 ? total.memoryUsage / allMetrics.length : 0,
  };
}