/**
 * Agent Orchestrator
 * Manages agent spawning, coordination, and task distribution
 */

import { EventEmitter } from 'events';
import { BaseAgent, AgentConfig } from './base-agent';
import { ClaudeAgent, ClaudeConfig } from './claude-agent';
import { Thread } from '../threads/thread-manager';
import { ThreadPool } from '../threads/thread-pool';

export interface OrchestratorConfig {
  maxAgents?: number;
  maxThreads?: number;
  defaultAgentType?: 'claude' | 'openai' | 'custom';
  agentTimeout?: number;
  enableLoadBalancing?: boolean;
  enableAutoScaling?: boolean;
}

export interface TaskDefinition {
  id?: string;
  name: string;
  description: string;
  requiredCapabilities?: string[];
  preferredAgentType?: string;
  subtasks?: TaskDefinition[];
  dependencies?: string[];
  timeout?: number;
  retryCount?: number;
}

export interface TaskResult {
  taskId: string;
  agentId: string;
  threadId: string;
  status: 'success' | 'failure' | 'partial';
  result: any;
  error?: Error;
  duration: number;
  retries: number;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private threadPool: ThreadPool;
  private taskQueue: TaskDefinition[] = [];
  private taskResults: Map<string, TaskResult> = new Map();
  private agentLoad: Map<string, number> = new Map();
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig = {}) {
    super();
    this.config = {
      maxAgents: config.maxAgents || 10,
      maxThreads: config.maxThreads || 5,
      defaultAgentType: config.defaultAgentType || 'claude',
      agentTimeout: config.agentTimeout || 60000,
      enableLoadBalancing: config.enableLoadBalancing ?? true,
      enableAutoScaling: config.enableAutoScaling ?? false
    };

    this.threadPool = new ThreadPool({
      maxThreads: this.config.maxThreads
    });
  }

  /**
   * Spawn a new agent
   */
  async spawnAgent(config: AgentConfig): Promise<BaseAgent> {
    if (this.agents.size >= this.config.maxAgents!) {
      if (this.config.enableAutoScaling) {
        // Find and terminate least used agent
        const leastUsedAgent = this.findLeastUsedAgent();
        if (leastUsedAgent) {
          await this.terminateAgent(leastUsedAgent.id);
        }
      } else {
        throw new Error(`Maximum number of agents (${this.config.maxAgents}) reached`);
      }
    }

    let agent: BaseAgent;

    switch (config.type) {
      case 'claude':
        agent = new ClaudeAgent(config as ClaudeConfig);
        break;
      // Add other agent types here
      default:
        agent = new ClaudeAgent(config as ClaudeConfig);
    }

    this.agents.set(agent.id, agent);
    this.agentLoad.set(agent.id, 0);

    // Set up event listeners
    agent.on('status:change', (status) => {
      this.emit('agent:status', { agentId: agent.id, status });
    });

    agent.on('error', (error) => {
      this.emit('agent:error', { agentId: agent.id, error });
    });

    this.emit('agent:spawned', agent);
    return agent;
  }

  /**
   * Spawn multiple agents
   */
  async spawnAgents(configs: AgentConfig[]): Promise<BaseAgent[]> {
    const agents = await Promise.all(configs.map(config => this.spawnAgent(config)));
    return agents;
  }

  /**
   * Create a specialized agent team
   */
  async createTeam(teamName: string, roles: Array<{ name: string; capabilities: string[]; config?: Partial<AgentConfig> }>): Promise<Map<string, BaseAgent>> {
    const team = new Map<string, BaseAgent>();

    for (const role of roles) {
      const agent = await this.spawnAgent({
        name: `${teamName}-${role.name}`,
        type: this.config.defaultAgentType!,
        capabilities: role.capabilities,
        ...role.config
      });

      team.set(role.name, agent);
    }

    this.emit('team:created', { teamName, agents: Array.from(team.keys()) });
    return team;
  }

  /**
   * Execute a task
   */
  async executeTask(task: TaskDefinition): Promise<TaskResult> {
    const startTime = Date.now();
    const taskId = task.id || `task-${Date.now()}`;
    
    this.emit('task:started', { taskId, task });

    try {
      // Find suitable agent
      const agent = await this.findSuitableAgent(task);
      
      // Create thread for task execution
      const thread = await this.threadPool.createThread({
        name: `Task: ${task.name}`,
        metadata: { taskId, taskName: task.name }
      });

      thread.addAgent(agent, true);

      // Execute task with retries
      let result: any;
      let retries = 0;
      const maxRetries = task.retryCount || 0;

      while (retries <= maxRetries) {
        try {
          result = await this.executeTaskInThread(task, thread, agent);
          break;
        } catch (error) {
          if (retries === maxRetries) throw error;
          retries++;
          this.emit('task:retry', { taskId, attempt: retries });
        }
      }

      const taskResult: TaskResult = {
        taskId,
        agentId: agent.id,
        threadId: thread.id,
        status: 'success',
        result,
        duration: Date.now() - startTime,
        retries
      };

      this.taskResults.set(taskId, taskResult);
      this.emit('task:completed', taskResult);
      
      return taskResult;

    } catch (error) {
      const taskResult: TaskResult = {
        taskId,
        agentId: '',
        threadId: '',
        status: 'failure',
        result: null,
        error: error as Error,
        duration: Date.now() - startTime,
        retries: task.retryCount || 0
      };

      this.taskResults.set(taskId, taskResult);
      this.emit('task:failed', taskResult);
      
      return taskResult;
    }
  }

  /**
   * Execute task in thread
   */
  private async executeTaskInThread(task: TaskDefinition, thread: Thread, agent: BaseAgent): Promise<any> {
    // Handle subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      return this.executeSubtasks(task.subtasks, thread, agent);
    }

    // Build prompt for the task
    const prompt = this.buildTaskPrompt(task);
    
    // Execute with timeout
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task ${task.name} timed out`));
      }, task.timeout || this.config.agentTimeout!);

      try {
        const result = await thread.send(prompt);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Execute subtasks
   */
  private async executeSubtasks(subtasks: TaskDefinition[], thread: Thread, parentAgent: BaseAgent): Promise<any[]> {
    const results = [];

    for (const subtask of subtasks) {
      // Check if subtask requires a different agent
      if (subtask.preferredAgentType && subtask.preferredAgentType !== parentAgent.type) {
        const subAgent = await this.spawnAgent({
          name: `${parentAgent.name}-sub-${subtask.name}`,
          type: subtask.preferredAgentType as any,
          capabilities: subtask.requiredCapabilities
        });

        thread.addAgent(subAgent);
        const result = await this.executeTaskInThread(subtask, thread, subAgent);
        results.push(result);
      } else {
        const result = await this.executeTaskInThread(subtask, thread, parentAgent);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Execute tasks in parallel
   */
  async executeParallelTasks(tasks: TaskDefinition[]): Promise<TaskResult[]> {
    const promises = tasks.map(task => this.executeTask(task));
    return Promise.all(promises);
  }

  /**
   * Execute task pipeline
   */
  async executePipeline(tasks: TaskDefinition[]): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    let previousResult: any = null;

    for (const task of tasks) {
      // Pass previous result as context
      if (previousResult) {
        task.description += `\n\nPrevious result: ${JSON.stringify(previousResult)}`;
      }

      const result = await this.executeTask(task);
      results.push(result);
      previousResult = result.result;
    }

    return results;
  }

  /**
   * Find suitable agent for task
   */
  private async findSuitableAgent(task: TaskDefinition): Promise<BaseAgent> {
    // Filter agents by capabilities
    const suitableAgents = Array.from(this.agents.values()).filter(agent => {
      if (!task.requiredCapabilities) return true;
      
      const agentCapabilities = agent.config.capabilities || [];
      return task.requiredCapabilities.every(cap => agentCapabilities.includes(cap));
    });

    if (suitableAgents.length === 0) {
      // Spawn a new agent if none suitable
      return this.spawnAgent({
        name: `Agent-for-${task.name}`,
        type: task.preferredAgentType as any || this.config.defaultAgentType!,
        capabilities: task.requiredCapabilities
      });
    }

    // Load balancing
    if (this.config.enableLoadBalancing) {
      return this.selectLeastLoadedAgent(suitableAgents);
    }

    return suitableAgents[0];
  }

  /**
   * Select least loaded agent
   */
  private selectLeastLoadedAgent(agents: BaseAgent[]): BaseAgent {
    let minLoad = Infinity;
    let selectedAgent = agents[0];

    for (const agent of agents) {
      const load = this.agentLoad.get(agent.id) || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedAgent = agent;
      }
    }

    // Update load
    this.agentLoad.set(selectedAgent.id, minLoad + 1);
    
    return selectedAgent;
  }

  /**
   * Find least used agent
   */
  private findLeastUsedAgent(): BaseAgent | undefined {
    let minLoad = Infinity;
    let leastUsedAgent: BaseAgent | undefined;

    for (const [agentId, load] of this.agentLoad) {
      if (load < minLoad) {
        minLoad = load;
        leastUsedAgent = this.agents.get(agentId);
      }
    }

    return leastUsedAgent;
  }

  /**
   * Build task prompt
   */
  private buildTaskPrompt(task: TaskDefinition): string {
    let prompt = `Task: ${task.name}\n\nDescription: ${task.description}`;
    
    if (task.requiredCapabilities) {
      prompt += `\n\nRequired capabilities: ${task.requiredCapabilities.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Terminate an agent
   */
  async terminateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.terminate();
    this.agents.delete(agentId);
    this.agentLoad.delete(agentId);
    
    this.emit('agent:terminated', agentId);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get task result
   */
  getTaskResult(taskId: string): TaskResult | undefined {
    return this.taskResults.get(taskId);
  }

  /**
   * Get orchestrator stats
   */
  getStats() {
    return {
      totalAgents: this.agents.size,
      taskQueueLength: this.taskQueue.length,
      completedTasks: Array.from(this.taskResults.values()).filter(r => r.status === 'success').length,
      failedTasks: Array.from(this.taskResults.values()).filter(r => r.status === 'failure').length,
      threadPoolStats: this.threadPool.getStats(),
      agentLoad: Object.fromEntries(this.agentLoad)
    };
  }

  /**
   * Terminate orchestrator
   */
  terminate(): void {
    this.agents.forEach(agent => agent.terminate());
    this.agents.clear();
    this.threadPool.terminate();
    this.removeAllListeners();
  }
}