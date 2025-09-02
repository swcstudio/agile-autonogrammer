/**
 * Thread Manager
 * Manages conversation threads and agent orchestration
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { BaseAgent, AgentMessage, AgentStatus } from '../agents/base-agent';

export interface ThreadConfig {
  id?: string;
  name?: string;
  persistent?: boolean;
  maxAgents?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface ThreadMessage extends AgentMessage {
  threadId: string;
  agentId?: string;
}

export enum ThreadStatus {
  CREATED = 'created',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TERMINATED = 'terminated'
}

export interface ThreadSnapshot {
  id: string;
  status: ThreadStatus;
  messages: ThreadMessage[];
  agents: Array<{ id: string; name: string; status: AgentStatus }>;
  variables: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class Thread extends EventEmitter {
  public readonly id: string;
  public readonly name: string;
  private status: ThreadStatus = ThreadStatus.CREATED;
  private agents: Map<string, BaseAgent> = new Map();
  private messages: ThreadMessage[] = [];
  private variables: Map<string, any> = new Map();
  private readonly config: ThreadConfig;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private primaryAgent?: BaseAgent;

  constructor(config: ThreadConfig = {}) {
    super();
    this.id = config.id || uuidv4();
    this.name = config.name || `Thread-${this.id.slice(0, 8)}`;
    this.config = config;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Add an agent to the thread
   */
  addAgent(agent: BaseAgent, isPrimary: boolean = false): void {
    if (this.config.maxAgents && this.agents.size >= this.config.maxAgents) {
      throw new Error(`Thread ${this.id} has reached maximum agents limit`);
    }

    this.agents.set(agent.id, agent);
    
    if (isPrimary || !this.primaryAgent) {
      this.primaryAgent = agent;
    }

    // Subscribe to agent events
    agent.on('message', (msg) => this.handleAgentMessage(agent.id, msg));
    agent.on('response', (msg) => this.handleAgentMessage(agent.id, msg));
    agent.on('status:change', (status) => this.handleAgentStatusChange(agent.id, status));

    this.emit('agent:added', { agentId: agent.id, isPrimary });
    this.updateTimestamp();
  }

  /**
   * Remove an agent from the thread
   */
  removeAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.removeAllListeners();
    this.agents.delete(agentId);

    if (this.primaryAgent?.id === agentId) {
      this.primaryAgent = this.agents.values().next().value;
    }

    this.emit('agent:removed', { agentId });
    this.updateTimestamp();
  }

  /**
   * Send a message to the thread
   */
  async send(message: string, targetAgentId?: string): Promise<string> {
    if (this.status !== ThreadStatus.RUNNING && this.status !== ThreadStatus.CREATED) {
      throw new Error(`Cannot send message to thread in ${this.status} status`);
    }

    this.setStatus(ThreadStatus.RUNNING);

    const threadMessage: ThreadMessage = {
      id: uuidv4(),
      threadId: this.id,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    this.messages.push(threadMessage);
    this.emit('message', threadMessage);

    // Determine which agent to use
    const agent = targetAgentId 
      ? this.agents.get(targetAgentId) 
      : this.primaryAgent;

    if (!agent) {
      throw new Error('No agent available to process message');
    }

    try {
      const response = await agent.send(message);
      
      const responseMessage: ThreadMessage = {
        id: uuidv4(),
        threadId: this.id,
        agentId: agent.id,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      this.messages.push(responseMessage);
      this.emit('response', responseMessage);
      this.updateTimestamp();

      return response;
    } catch (error) {
      this.setStatus(ThreadStatus.FAILED);
      throw error;
    }
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(message: string): Promise<Map<string, string>> {
    const responses = new Map<string, string>();

    for (const [agentId, agent] of this.agents) {
      try {
        const response = await agent.send(message);
        responses.set(agentId, response);
      } catch (error) {
        responses.set(agentId, `Error: ${error.message}`);
      }
    }

    return responses;
  }

  /**
   * Execute a multi-agent conversation
   */
  async runConversation(
    rounds: number,
    initialMessage: string,
    agentOrder?: string[]
  ): Promise<ThreadMessage[]> {
    this.setStatus(ThreadStatus.RUNNING);
    const conversationMessages: ThreadMessage[] = [];

    let currentMessage = initialMessage;
    const agents = agentOrder 
      ? agentOrder.map(id => this.agents.get(id)).filter(Boolean) as BaseAgent[]
      : Array.from(this.agents.values());

    for (let round = 0; round < rounds; round++) {
      for (const agent of agents) {
        const response = await agent.send(currentMessage);
        
        const message: ThreadMessage = {
          id: uuidv4(),
          threadId: this.id,
          agentId: agent.id,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          metadata: { round, agentName: agent.name }
        };

        this.messages.push(message);
        conversationMessages.push(message);
        this.emit('conversation:message', message);

        currentMessage = response;
      }
    }

    this.setStatus(ThreadStatus.COMPLETED);
    return conversationMessages;
  }

  /**
   * Handle agent messages
   */
  private handleAgentMessage(agentId: string, message: AgentMessage): void {
    const threadMessage: ThreadMessage = {
      ...message,
      threadId: this.id,
      agentId
    };

    this.messages.push(threadMessage);
    this.emit('agent:message', threadMessage);
    this.updateTimestamp();
  }

  /**
   * Handle agent status changes
   */
  private handleAgentStatusChange(agentId: string, status: any): void {
    this.emit('agent:status', { agentId, ...status });
    this.updateTimestamp();
  }

  /**
   * Set thread variable
   */
  setVariable(key: string, value: any): void {
    this.variables.set(key, value);
    
    // Propagate to all agents
    this.agents.forEach(agent => {
      agent.setContextVariable(key, value);
    });

    this.emit('variable:set', { key, value });
    this.updateTimestamp();
  }

  /**
   * Get thread variable
   */
  getVariable(key: string): any {
    return this.variables.get(key);
  }

  /**
   * Get all variables
   */
  getVariables(): Record<string, any> {
    return Object.fromEntries(this.variables);
  }

  /**
   * Get thread messages
   */
  getMessages(filter?: { agentId?: string; role?: string }): ThreadMessage[] {
    if (!filter) return [...this.messages];

    return this.messages.filter(msg => {
      if (filter.agentId && msg.agentId !== filter.agentId) return false;
      if (filter.role && msg.role !== filter.role) return false;
      return true;
    });
  }

  /**
   * Clear messages
   */
  clearMessages(): void {
    this.messages = [];
    this.agents.forEach(agent => agent.clearHistory());
    this.emit('messages:cleared');
    this.updateTimestamp();
  }

  /**
   * Get thread snapshot
   */
  getSnapshot(): ThreadSnapshot {
    return {
      id: this.id,
      status: this.status,
      messages: [...this.messages],
      agents: Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.getStatus()
      })),
      variables: this.getVariables(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshot: ThreadSnapshot): void {
    this.messages = snapshot.messages;
    this.status = snapshot.status;
    
    snapshot.variables && Object.entries(snapshot.variables).forEach(([key, value]) => {
      this.variables.set(key, value);
    });

    this.emit('restored', snapshot);
    this.updateTimestamp();
  }

  /**
   * Pause the thread
   */
  pause(): void {
    if (this.status === ThreadStatus.RUNNING) {
      this.setStatus(ThreadStatus.PAUSED);
    }
  }

  /**
   * Resume the thread
   */
  resume(): void {
    if (this.status === ThreadStatus.PAUSED) {
      this.setStatus(ThreadStatus.RUNNING);
    }
  }

  /**
   * Terminate the thread
   */
  terminate(): void {
    this.agents.forEach(agent => agent.terminate());
    this.agents.clear();
    this.setStatus(ThreadStatus.TERMINATED);
    this.emit('terminated');
    this.removeAllListeners();
  }

  /**
   * Get thread status
   */
  getStatus(): ThreadStatus {
    return this.status;
  }

  /**
   * Set thread status
   */
  private setStatus(status: ThreadStatus): void {
    const oldStatus = this.status;
    this.status = status;
    this.emit('status:change', { from: oldStatus, to: status });
    this.updateTimestamp();
  }

  /**
   * Update timestamp
   */
  private updateTimestamp(): void {
    this.updatedAt = new Date();
  }

  /**
   * Get all agents
   */
  getAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get primary agent
   */
  getPrimaryAgent(): BaseAgent | undefined {
    return this.primaryAgent;
  }
}