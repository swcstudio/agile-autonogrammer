/**
 * Base Agent Class
 * Foundation for all AI agents in the Katalyst framework
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface AgentConfig {
  id?: string;
  name: string;
  type: 'claude' | 'openai' | 'llama' | 'custom';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  capabilities?: string[];
  memory?: boolean;
  tools?: AgentTool[];
  metadata?: Record<string, any>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface AgentMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  threadId: string;
  parentAgentId?: string;
  sessionId: string;
  variables: Map<string, any>;
  history: AgentMessage[];
}

export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  WAITING = 'waiting',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

export abstract class BaseAgent extends EventEmitter {
  public readonly id: string;
  public readonly name: string;
  public readonly type: string;
  public readonly config: AgentConfig;
  protected status: AgentStatus = AgentStatus.IDLE;
  protected context: AgentContext;
  protected subAgents: Map<string, BaseAgent> = new Map();
  protected tools: Map<string, AgentTool> = new Map();
  protected messageHistory: AgentMessage[] = [];

  constructor(config: AgentConfig) {
    super();
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.type = config.type;
    this.config = config;
    
    // Initialize context
    this.context = {
      threadId: uuidv4(),
      sessionId: uuidv4(),
      variables: new Map(),
      history: []
    };

    // Register tools
    if (config.tools) {
      config.tools.forEach(tool => {
        this.registerTool(tool);
      });
    }
  }

  /**
   * Abstract method to be implemented by specific agent types
   */
  abstract process(input: string, context?: Partial<AgentContext>): Promise<string>;

  /**
   * Send a message to the agent
   */
  async send(message: string, role: 'user' | 'system' = 'user'): Promise<string> {
    const msg: AgentMessage = {
      id: uuidv4(),
      role,
      content: message,
      timestamp: new Date()
    };

    this.messageHistory.push(msg);
    this.emit('message', msg);

    this.setStatus(AgentStatus.THINKING);
    
    try {
      const response = await this.process(message, this.context);
      
      const responseMsg: AgentMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      this.messageHistory.push(responseMsg);
      this.emit('response', responseMsg);
      
      this.setStatus(AgentStatus.IDLE);
      return response;
    } catch (error) {
      this.setStatus(AgentStatus.ERROR);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Spawn a sub-agent
   */
  async spawnSubAgent(config: AgentConfig): Promise<BaseAgent> {
    const subAgent = await this.createAgent({
      ...config,
      metadata: {
        ...config.metadata,
        parentAgentId: this.id,
        threadId: this.context.threadId
      }
    });

    this.subAgents.set(subAgent.id, subAgent);
    this.emit('subagent:spawned', subAgent);

    // Set up event forwarding
    subAgent.on('message', (msg) => this.emit('subagent:message', { agentId: subAgent.id, message: msg }));
    subAgent.on('response', (msg) => this.emit('subagent:response', { agentId: subAgent.id, message: msg }));
    
    return subAgent;
  }

  /**
   * Delegate task to a sub-agent
   */
  async delegateToSubAgent(agentId: string, task: string): Promise<string> {
    const subAgent = this.subAgents.get(agentId);
    if (!subAgent) {
      throw new Error(`Sub-agent ${agentId} not found`);
    }

    this.emit('delegation:start', { agentId, task });
    const result = await subAgent.send(task);
    this.emit('delegation:complete', { agentId, task, result });
    
    return result;
  }

  /**
   * Register a tool for the agent to use
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    this.emit('tool:registered', tool);
  }

  /**
   * Execute a tool
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    this.setStatus(AgentStatus.EXECUTING);
    this.emit('tool:execute:start', { tool: toolName, params });
    
    try {
      const result = await tool.execute(params);
      this.emit('tool:execute:complete', { tool: toolName, result });
      this.setStatus(AgentStatus.IDLE);
      return result;
    } catch (error) {
      this.emit('tool:execute:error', { tool: toolName, error });
      this.setStatus(AgentStatus.ERROR);
      throw error;
    }
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Set agent status
   */
  protected setStatus(status: AgentStatus): void {
    const oldStatus = this.status;
    this.status = status;
    this.emit('status:change', { from: oldStatus, to: status });
  }

  /**
   * Get message history
   */
  getHistory(): AgentMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.context.history = [];
    this.emit('history:cleared');
  }

  /**
   * Set context variable
   */
  setContextVariable(key: string, value: any): void {
    this.context.variables.set(key, value);
    this.emit('context:updated', { key, value });
  }

  /**
   * Get context variable
   */
  getContextVariable(key: string): any {
    return this.context.variables.get(key);
  }

  /**
   * Terminate the agent
   */
  terminate(): void {
    // Terminate all sub-agents
    this.subAgents.forEach(agent => agent.terminate());
    this.subAgents.clear();
    
    this.setStatus(AgentStatus.TERMINATED);
    this.emit('terminated');
    this.removeAllListeners();
  }

  /**
   * Abstract method to create agent instances
   */
  protected abstract createAgent(config: AgentConfig): Promise<BaseAgent>;
}