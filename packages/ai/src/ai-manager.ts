/**
 * AI Manager
 * Main entry point for AI functionality in Katalyst
 */

import { AgentOrchestrator, OrchestratorConfig, TaskDefinition, TaskResult } from './agents/orchestrator';
import { BaseAgent, AgentConfig } from './agents/base-agent';
import { ClaudeAgent, ClaudeConfig } from './agents/claude-agent';
import { ThreadPool, ThreadPoolConfig } from './threads/thread-pool';
import { Thread } from './threads/thread-manager';

export interface AIConfig {
  orchestrator?: OrchestratorConfig;
  threadPool?: ThreadPoolConfig;
  defaultAgent?: AgentConfig;
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
}

export class AI {
  private orchestrator: AgentOrchestrator;
  private threadPool: ThreadPool;
  private config: AIConfig;
  private static instance: AI;

  constructor(config: AIConfig = {}) {
    this.config = config;
    
    // Set API keys from config
    if (config.apiKeys?.anthropic) {
      process.env.ANTHROPIC_API_KEY = config.apiKeys.anthropic;
    }

    this.orchestrator = new AgentOrchestrator(config.orchestrator);
    this.threadPool = new ThreadPool(config.threadPool);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: AIConfig): AI {
    if (!AI.instance) {
      AI.instance = new AI(config);
    }
    return AI.instance;
  }

  /**
   * Create a Claude agent
   */
  async createClaudeAgent(config?: Partial<ClaudeConfig>): Promise<ClaudeAgent> {
    const agent = new ClaudeAgent({
      name: config?.name || 'Claude Agent',
      type: 'claude',
      ...this.config.defaultAgent,
      ...config
    } as ClaudeConfig);

    return agent;
  }

  /**
   * Spawn an agent through orchestrator
   */
  async spawnAgent(config: AgentConfig): Promise<BaseAgent> {
    return this.orchestrator.spawnAgent(config);
  }

  /**
   * Execute a task
   */
  async executeTask(task: TaskDefinition): Promise<TaskResult> {
    return this.orchestrator.executeTask(task);
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(tasks: TaskDefinition[]): Promise<TaskResult[]> {
    return this.orchestrator.executeParallelTasks(tasks);
  }

  /**
   * Execute a pipeline of tasks
   */
  async executePipeline(tasks: TaskDefinition[]): Promise<TaskResult[]> {
    return this.orchestrator.executePipeline(tasks);
  }

  /**
   * Create a new thread
   */
  async createThread(): Promise<Thread> {
    return this.threadPool.createThread();
  }

  /**
   * Chat with Claude
   */
  async chat(message: string, config?: Partial<ClaudeConfig>): Promise<string> {
    const agent = await this.createClaudeAgent(config);
    const thread = await this.createThread();
    thread.addAgent(agent, true);
    
    const response = await thread.send(message);
    return response;
  }

  /**
   * Create a team of agents
   */
  async createTeam(
    teamName: string,
    roles: Array<{ name: string; capabilities: string[]; config?: Partial<AgentConfig> }>
  ): Promise<Map<string, BaseAgent>> {
    return this.orchestrator.createTeam(teamName, roles);
  }

  /**
   * Run a multi-agent conversation
   */
  async runConversation(
    agents: BaseAgent[],
    rounds: number,
    initialMessage: string
  ): Promise<any[]> {
    const thread = await this.createThread();
    
    agents.forEach((agent, index) => {
      thread.addAgent(agent, index === 0);
    });

    const messages = await thread.runConversation(
      rounds,
      initialMessage,
      agents.map(a => a.id)
    );

    return messages;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      orchestrator: this.orchestrator.getStats(),
      threadPool: this.threadPool.getStats()
    };
  }

  /**
   * Terminate AI manager
   */
  terminate(): void {
    this.orchestrator.terminate();
    this.threadPool.terminate();
  }
}

// Export convenience functions
export const ai = AI.getInstance();

export async function chat(message: string, config?: Partial<ClaudeConfig>): Promise<string> {
  return ai.chat(message, config);
}

export async function executeTask(task: TaskDefinition): Promise<TaskResult> {
  return ai.executeTask(task);
}

export async function spawnAgent(config: AgentConfig): Promise<BaseAgent> {
  return ai.spawnAgent(config);
}