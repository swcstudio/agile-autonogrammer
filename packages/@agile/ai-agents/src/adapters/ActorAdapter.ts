import { EventEmitter } from 'events';
import type { BaseAgent } from '../agents/BaseAgent';
import type { Task, TaskResult } from '../types/agents';

// Import types from multithreading package
interface Actor {
  id: string;
  spawn(behavior: ActorBehavior): Actor;
  send(message: any): Promise<void>;
  call(message: any, timeout?: number): Promise<any>;
  cast(message: any): Promise<void>;
  stop(): Promise<void>;
  isAlive(): boolean;
}

interface ActorBehavior {
  handleCall?: (message: any, from?: Actor) => Promise<any>;
  handleCast?: (message: any, from?: Actor) => Promise<void>;
  handleInfo?: (message: any) => Promise<void>;
  terminate?: (reason: any) => Promise<void>;
}

interface ActorSystem {
  spawn(behavior: ActorBehavior): Actor;
  stop(actor: Actor): Promise<void>;
  stopAll(): Promise<void>;
  getActor(id: string): Actor | null;
  getAllActors(): Actor[];
  getMetrics(): {
    totalActors: number;
    activeActors: number;
    messageQueueSize: number;
    averageProcessingTime: number;
  };
}

// Agent-specific actor message types
export interface AgentMessage {
  type: 'execute_task' | 'get_status' | 'get_metrics' | 'configure' | 'stop' | 'health_check';
  payload: any;
  requestId?: string;
  priority?: number;
  timeout?: number;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId?: string;
  agentId: string;
  executionTime?: number;
  metadata?: Record<string, any>;
}

// Configuration for agent actors
export interface AgentActorConfig {
  maxConcurrentTasks: number;
  messageQueueSize: number;
  taskTimeout: number;
  healthCheckInterval: number;
  enableMetrics: boolean;
  enableProfiling: boolean;
  errorRetryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoff: number;
  };
}

// Metrics for agent actors
export interface AgentActorMetrics {
  messagesProcessed: number;
  tasksExecuted: number;
  tasksSucceeded: number;
  tasksFailed: number;
  averageTaskTime: number;
  averageMessageTime: number;
  queueUtilization: number;
  errorRate: number;
  uptime: number;
  lastActivity: number;
}

/**
 * Adapter class that bridges AI Agents with the Actor System
 * Provides thread-safe, concurrent execution of agent tasks
 */
export class ActorAdapter extends EventEmitter {
  private actorSystem: ActorSystem;
  private agentActors: Map<string, Actor>;
  private agentConfigs: Map<string, AgentActorConfig>;
  private agentMetrics: Map<string, AgentActorMetrics>;
  private messageSequence: number;
  private defaultConfig: AgentActorConfig;

  constructor(actorSystem: ActorSystem) {
    super();
    this.actorSystem = actorSystem;
    this.agentActors = new Map();
    this.agentConfigs = new Map();
    this.agentMetrics = new Map();
    this.messageSequence = 0;

    this.defaultConfig = {
      maxConcurrentTasks: 3,
      messageQueueSize: 100,
      taskTimeout: 300000, // 5 minutes
      healthCheckInterval: 30000, // 30 seconds
      enableMetrics: true,
      enableProfiling: false,
      errorRetryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoff: 60000, // 1 minute
      },
    };

    // Set up periodic health checks
    this.startHealthCheckLoop();
  }

  /**
   * Register an AI agent with the actor system
   */
  public async registerAgent(
    agent: BaseAgent, 
    config: Partial<AgentActorConfig> = {}
  ): Promise<void> {
    const agentId = agent.id;
    const agentConfig = { ...this.defaultConfig, ...config };

    if (this.agentActors.has(agentId)) {
      throw new Error(`Agent ${agentId} is already registered`);
    }

    // Create actor behavior for the agent
    const agentBehavior: ActorBehavior = {
      handleCall: async (message: AgentMessage) => {
        return this.handleAgentCall(agent, message, agentConfig);
      },

      handleCast: async (message: AgentMessage) => {
        await this.handleAgentCast(agent, message, agentConfig);
      },

      handleInfo: async (message: any) => {
        await this.handleAgentInfo(agent, message, agentConfig);
      },

      terminate: async (reason: any) => {
        await this.handleAgentTermination(agent, reason);
      },
    };

    // Spawn actor for the agent
    const actor = this.actorSystem.spawn(agentBehavior);
    
    // Store references
    this.agentActors.set(agentId, actor);
    this.agentConfigs.set(agentId, agentConfig);
    
    // Initialize metrics
    this.agentMetrics.set(agentId, {
      messagesProcessed: 0,
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      averageTaskTime: 0,
      averageMessageTime: 0,
      queueUtilization: 0,
      errorRate: 0,
      uptime: Date.now(),
      lastActivity: Date.now(),
    });

    this.emit('agent:registered', { agentId, actorId: actor.id });
  }

  /**
   * Unregister an AI agent from the actor system
   */
  public async unregisterAgent(agentId: string): Promise<void> {
    const actor = this.agentActors.get(agentId);
    
    if (!actor) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    // Stop the actor
    await this.actorSystem.stop(actor);
    
    // Clean up references
    this.agentActors.delete(agentId);
    this.agentConfigs.delete(agentId);
    this.agentMetrics.delete(agentId);

    this.emit('agent:unregistered', { agentId });
  }

  /**
   * Execute a task on an agent via the actor system
   */
  public async executeTask(
    agentId: string,
    task: Task,
    options: {
      timeout?: number;
      priority?: number;
      async?: boolean;
    } = {}
  ): Promise<TaskResult> {
    const actor = this.agentActors.get(agentId);
    
    if (!actor) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    if (!actor.isAlive()) {
      throw new Error(`Agent ${agentId} actor is not alive`);
    }

    const requestId = this.generateRequestId();
    const message: AgentMessage = {
      type: 'execute_task',
      payload: task,
      requestId,
      priority: options.priority || 5,
      timeout: options.timeout,
    };

    try {
      const startTime = Date.now();

      let result: AgentResponse;
      
      if (options.async) {
        // Fire and forget
        await actor.cast(message);
        return {
          success: true,
          data: { status: 'queued', requestId },
          executionTime: Date.now() - startTime,
          agentId,
        };
      } else {
        // Wait for response
        result = await actor.call(
          message, 
          options.timeout || this.agentConfigs.get(agentId)?.taskTimeout
        );
      }

      const executionTime = Date.now() - startTime;

      // Update metrics
      this.updateAgentMetrics(agentId, {
        tasksExecuted: 1,
        tasksSucceeded: result.success ? 1 : 0,
        tasksFailed: result.success ? 0 : 1,
        averageTaskTime: executionTime,
      });

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime,
        agentId,
        metadata: result.metadata,
      };

    } catch (error) {
      // Update metrics for failed task
      this.updateAgentMetrics(agentId, {
        tasksExecuted: 1,
        tasksFailed: 1,
      });

      throw new Error(
        `Task execution failed on agent ${agentId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get agent status via actor system
   */
  public async getAgentStatus(agentId: string): Promise<any> {
    const actor = this.agentActors.get(agentId);
    
    if (!actor) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const message: AgentMessage = {
      type: 'get_status',
      payload: {},
      requestId: this.generateRequestId(),
    };

    const response = await actor.call(message, 5000);
    return response.data;
  }

  /**
   * Get agent metrics via actor system
   */
  public async getAgentActorMetrics(agentId: string): Promise<AgentActorMetrics> {
    const metrics = this.agentMetrics.get(agentId);
    
    if (!metrics) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const actor = this.agentActors.get(agentId);
    const isAlive = actor?.isAlive() || false;

    return {
      ...metrics,
      uptime: isAlive ? Date.now() - metrics.uptime : 0,
      errorRate: metrics.tasksExecuted > 0 
        ? metrics.tasksFailed / metrics.tasksExecuted 
        : 0,
    };
  }

  /**
   * Broadcast message to all registered agents
   */
  public async broadcastToAll(
    message: Omit<AgentMessage, 'requestId'>,
    filter?: (agentId: string) => boolean
  ): Promise<Map<string, AgentResponse>> {
    const results = new Map<string, AgentResponse>();
    const promises: Array<Promise<void>> = [];

    for (const [agentId, actor] of this.agentActors) {
      if (filter && !filter(agentId)) continue;

      const promise = actor.cast({
        ...message,
        requestId: this.generateRequestId(),
      }).catch(error => {
        results.set(agentId, {
          success: false,
          error: error.message,
          agentId,
        });
      });

      promises.push(promise);
    }

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Get comprehensive system metrics
   */
  public getSystemMetrics(): {
    actorSystemMetrics: ReturnType<ActorSystem['getMetrics']>;
    agentMetrics: Map<string, AgentActorMetrics>;
    totalAgents: number;
    activeAgents: number;
    totalTasksExecuted: number;
    systemSuccessRate: number;
  } {
    const actorSystemMetrics = this.actorSystem.getMetrics();
    const allMetrics = Array.from(this.agentMetrics.values());
    
    const totalTasks = allMetrics.reduce((sum, m) => sum + m.tasksExecuted, 0);
    const totalSuccesses = allMetrics.reduce((sum, m) => sum + m.tasksSucceeded, 0);
    const activeAgents = Array.from(this.agentActors.values()).filter(a => a.isAlive()).length;

    return {
      actorSystemMetrics,
      agentMetrics: new Map([...this.agentMetrics]),
      totalAgents: this.agentActors.size,
      activeAgents,
      totalTasksExecuted: totalTasks,
      systemSuccessRate: totalTasks > 0 ? totalSuccesses / totalTasks : 0,
    };
  }

  /**
   * Shutdown the adapter and all agent actors
   */
  public async shutdown(): Promise<void> {
    const shutdownPromises: Array<Promise<void>> = [];

    // Stop all agent actors
    for (const [agentId, actor] of this.agentActors) {
      shutdownPromises.push(
        this.actorSystem.stop(actor).catch(error => {
          console.error(`Error stopping agent ${agentId}:`, error);
        })
      );
    }

    await Promise.allSettled(shutdownPromises);

    // Clear all references
    this.agentActors.clear();
    this.agentConfigs.clear();
    this.agentMetrics.clear();

    this.emit('adapter:shutdown');
  }

  /**
   * Handle synchronous calls to agent actors
   */
  private async handleAgentCall(
    agent: BaseAgent,
    message: AgentMessage,
    config: AgentActorConfig
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const agentId = agent.id;

    try {
      // Update metrics
      this.updateAgentMetrics(agentId, {
        messagesProcessed: 1,
        lastActivity: Date.now(),
      });

      let result: any;

      switch (message.type) {
        case 'execute_task':
          result = await this.executeAgentTask(agent, message.payload, config);
          break;

        case 'get_status':
          result = await agent.getStatus?.() || { status: 'unknown' };
          break;

        case 'get_metrics':
          result = await agent.getMetrics?.() || {};
          break;

        case 'health_check':
          result = await agent.getHealth?.() || 'unknown';
          break;

        default:
          throw new Error(`Unsupported message type: ${message.type}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        requestId: message.requestId,
        agentId,
        executionTime,
        metadata: {
          messageType: message.type,
          processingTime: executionTime,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: message.requestId,
        agentId,
        executionTime,
        metadata: {
          messageType: message.type,
          processingTime: executionTime,
        },
      };
    }
  }

  /**
   * Handle asynchronous casts to agent actors
   */
  private async handleAgentCast(
    agent: BaseAgent,
    message: AgentMessage,
    config: AgentActorConfig
  ): Promise<void> {
    const startTime = Date.now();
    const agentId = agent.id;

    try {
      // Update metrics
      this.updateAgentMetrics(agentId, {
        messagesProcessed: 1,
        lastActivity: Date.now(),
      });

      switch (message.type) {
        case 'execute_task':
          // Execute task asynchronously
          this.executeAgentTask(agent, message.payload, config)
            .then(result => {
              this.emit('task:completed', {
                agentId,
                requestId: message.requestId,
                result,
                executionTime: Date.now() - startTime,
              });
            })
            .catch(error => {
              this.emit('task:failed', {
                agentId,
                requestId: message.requestId,
                error: error.message,
                executionTime: Date.now() - startTime,
              });
            });
          break;

        case 'configure':
          // Update agent configuration
          if (message.payload.config) {
            await agent.updateConfig?.(message.payload.config);
          }
          break;

        case 'stop':
          // Graceful stop request
          const actor = this.agentActors.get(agentId);
          if (actor) {
            await this.actorSystem.stop(actor);
          }
          break;

        default:
          // Ignore unknown message types for casts
          break;
      }

    } catch (error) {
      this.emit('agent:error', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        messageType: message.type,
      });
    }
  }

  /**
   * Handle info messages (system messages)
   */
  private async handleAgentInfo(
    agent: BaseAgent,
    message: any,
    config: AgentActorConfig
  ): Promise<void> {
    // Handle system-level messages like health checks, maintenance, etc.
    const agentId = agent.id;

    try {
      if (message.type === 'health_check') {
        const health = await agent.getHealth?.();
        
        this.emit('agent:health', {
          agentId,
          health,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.emit('agent:error', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        messageType: 'info',
      });
    }
  }

  /**
   * Handle agent termination
   */
  private async handleAgentTermination(
    agent: BaseAgent,
    reason: any
  ): Promise<void> {
    const agentId = agent.id;

    try {
      // Clean up resources
      await agent.cleanup?.();
      
      this.emit('agent:terminated', {
        agentId,
        reason,
        timestamp: Date.now(),
      });
      
    } catch (error) {
      this.emit('agent:error', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        messageType: 'termination',
      });
    }
  }

  /**
   * Execute a task on an agent with retry logic
   */
  private async executeAgentTask(
    agent: BaseAgent,
    task: Task,
    config: AgentActorConfig
  ): Promise<TaskResult> {
    const { errorRetryPolicy } = config;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= errorRetryPolicy.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          agent.executeTask(task),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Task timeout')), config.taskTimeout)
          )
        ]);

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < errorRetryPolicy.maxRetries) {
          // Calculate backoff delay
          const delay = Math.min(
            1000 * Math.pow(errorRetryPolicy.backoffMultiplier, attempt),
            errorRetryPolicy.maxBackoff
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Task execution failed after all retries');
  }

  /**
   * Update agent metrics
   */
  private updateAgentMetrics(
    agentId: string,
    updates: Partial<AgentActorMetrics>
  ): void {
    const current = this.agentMetrics.get(agentId);
    if (!current) return;

    const updated = { ...current };

    // Accumulate counts
    if (updates.messagesProcessed) {
      updated.messagesProcessed += updates.messagesProcessed;
    }
    if (updates.tasksExecuted) {
      updated.tasksExecuted += updates.tasksExecuted;
    }
    if (updates.tasksSucceeded) {
      updated.tasksSucceeded += updates.tasksSucceeded;
    }
    if (updates.tasksFailed) {
      updated.tasksFailed += updates.tasksFailed;
    }

    // Update averages
    if (updates.averageTaskTime) {
      updated.averageTaskTime = (
        (updated.averageTaskTime * (updated.tasksExecuted - 1)) + updates.averageTaskTime
      ) / updated.tasksExecuted;
    }

    if (updates.averageMessageTime) {
      updated.averageMessageTime = (
        (updated.averageMessageTime * (updated.messagesProcessed - 1)) + updates.averageMessageTime
      ) / updated.messagesProcessed;
    }

    // Update other fields
    if (updates.lastActivity) {
      updated.lastActivity = updates.lastActivity;
    }

    this.agentMetrics.set(agentId, updated);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.messageSequence}`;
  }

  /**
   * Start periodic health check loop
   */
  private startHealthCheckLoop(): void {
    setInterval(async () => {
      const healthCheckMessage: AgentMessage = {
        type: 'health_check',
        payload: {},
        requestId: this.generateRequestId(),
      };

      await this.broadcastToAll(healthCheckMessage);
    }, 60000); // Check every minute
  }

  /**
   * Get list of registered agent IDs
   */
  public getRegisteredAgents(): string[] {
    return Array.from(this.agentActors.keys());
  }

  /**
   * Check if an agent is registered and alive
   */
  public isAgentAlive(agentId: string): boolean {
    const actor = this.agentActors.get(agentId);
    return actor?.isAlive() || false;
  }

  /**
   * Configure an agent
   */
  public async configureAgent(
    agentId: string,
    config: Partial<AgentActorConfig>
  ): Promise<void> {
    const currentConfig = this.agentConfigs.get(agentId);
    if (!currentConfig) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const updatedConfig = { ...currentConfig, ...config };
    this.agentConfigs.set(agentId, updatedConfig);

    // Send configuration update to actor
    const actor = this.agentActors.get(agentId);
    if (actor) {
      await actor.cast({
        type: 'configure',
        payload: { config: updatedConfig },
        requestId: this.generateRequestId(),
      });
    }
  }

  /**
   * Get agent configuration
   */
  public getAgentConfig(agentId: string): AgentActorConfig | null {
    return this.agentConfigs.get(agentId) || null;
  }
}

export default ActorAdapter;