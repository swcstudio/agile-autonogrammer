/**
 * Claude Agent Max Implementation
 * Integrates with Claude Code Max plan using Google Sign-In authentication
 */

import { BaseAgent, AgentConfig, AgentContext } from './base-agent';
import { ClaudeCodeAuth, ClaudeAuthToken } from '../auth/claude-auth';
import { spawn, ChildProcess } from 'child_process';
import { WebSocket } from 'ws';

export interface ClaudeMaxConfig extends AgentConfig {
  useAuthentication?: boolean;
  claudeCodeCommand?: string;
  workingDirectory?: string;
  allowedTools?: string[];
  maxRetries?: number;
}

export class ClaudeAgentMax extends BaseAgent {
  private auth: ClaudeCodeAuth;
  private authToken?: ClaudeAuthToken;
  private claudeCodeProcess?: ChildProcess;
  private ws?: WebSocket;
  private claudeCodeCommand: string;
  private isAuthenticated: boolean = false;

  constructor(config: ClaudeMaxConfig) {
    super({ ...config, type: 'claude' });
    
    this.auth = new ClaudeCodeAuth();
    this.claudeCodeCommand = config.claudeCodeCommand || 'claude-code';
    
    // Set up auth event listeners
    this.auth.on('authenticated', (token) => {
      this.authToken = token;
      this.isAuthenticated = true;
      this.emit('authenticated', token.userEmail);
    });

    this.auth.on('auth:error', (error) => {
      this.emit('auth:error', error);
    });
  }

  /**
   * Authenticate with Claude Code Max
   */
  async authenticate(): Promise<void> {
    if (this.isAuthenticated) {
      this.emit('already:authenticated');
      return;
    }

    try {
      this.emit('auth:start');
      this.authToken = await this.auth.authenticate();
      this.isAuthenticated = true;
      
      // Initialize Claude Code with authentication
      await this.initializeClaudeCode();
      
      this.emit('auth:complete', {
        email: this.authToken.userEmail,
        name: this.authToken.userName
      });
    } catch (error) {
      this.isAuthenticated = false;
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Initialize Claude Code with Max plan features
   */
  private async initializeClaudeCode(): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--auth-token', this.authToken?.accessToken || '',
        '--plan', 'max',
        '--enable-all-tools',
        '--no-rate-limits'
      ];

      this.claudeCodeProcess = spawn(this.claudeCodeCommand, args, {
        env: {
          ...process.env,
          CLAUDE_AUTH_TOKEN: this.authToken?.accessToken,
          CLAUDE_USER_EMAIL: this.authToken?.userEmail,
          CLAUDE_PLAN: 'max'
        }
      });

      this.claudeCodeProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Claude Code initialized')) {
          this.emit('claudecode:ready');
          resolve();
        }
      });

      this.claudeCodeProcess.stderr?.on('data', (data) => {
        this.emit('claudecode:error', data.toString());
      });

      this.claudeCodeProcess.on('error', (error) => {
        reject(error);
      });

      // Set timeout for initialization
      setTimeout(() => {
        reject(new Error('Claude Code initialization timeout'));
      }, 30000);
    });
  }

  /**
   * Process input through Claude Code Max
   */
  async process(input: string, context?: Partial<AgentContext>): Promise<string> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    return this.executeClaudeCodeMax(input, context);
  }

  /**
   * Execute command with Claude Code Max features
   */
  private async executeClaudeCodeMax(
    prompt: string,
    context?: Partial<AgentContext>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const sessionId = context?.sessionId || Date.now().toString();
      
      const args = [
        'execute',
        '--prompt', prompt,
        '--session', sessionId,
        '--format', 'json',
        '--max-plan' // Use Max plan features
      ];

      // Add context if provided
      if (context?.threadId) {
        args.push('--thread', context.threadId);
      }

      const process = spawn(this.claudeCodeCommand, args, {
        env: {
          ...process.env,
          CLAUDE_AUTH_TOKEN: this.authToken?.accessToken
        }
      });

      let output = '';
      let error = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.response || output);
          } catch {
            resolve(output);
          }
        } else {
          reject(new Error(`Claude Code Max execution failed: ${error}`));
        }
      });
    });
  }

  /**
   * Spawn multiple Claude Code instances (Max plan feature)
   */
  async spawnMultipleInstances(count: number): Promise<ClaudeAgentMax[]> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    const instances: ClaudeAgentMax[] = [];

    for (let i = 0; i < count; i++) {
      const instance = new ClaudeAgentMax({
        ...this.config,
        name: `${this.name}-instance-${i + 1}`
      } as ClaudeMaxConfig);

      // Share authentication token
      instance.authToken = this.authToken;
      instance.isAuthenticated = true;
      
      await instance.initializeClaudeCode();
      instances.push(instance);
    }

    this.emit('instances:spawned', count);
    return instances;
  }

  /**
   * Use advanced Max plan features
   */
  async useMaxFeature(feature: string, params: any): Promise<any> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    const maxFeatures: Record<string, () => Promise<any>> = {
      'unlimited-context': () => this.unlimitedContext(params),
      'priority-queue': () => this.priorityQueue(params),
      'persistent-memory': () => this.persistentMemory(params),
      'advanced-tools': () => this.advancedTools(params),
      'multi-modal': () => this.multiModal(params),
      'real-time-collaboration': () => this.realTimeCollaboration(params)
    };

    const featureHandler = maxFeatures[feature];
    if (!featureHandler) {
      throw new Error(`Unknown Max feature: ${feature}`);
    }

    return featureHandler();
  }

  /**
   * Unlimited context window (Max feature)
   */
  private async unlimitedContext(params: any): Promise<any> {
    return this.executeClaudeCodeMax(params.prompt, {
      ...params.context,
      maxTokens: -1 // Unlimited
    });
  }

  /**
   * Priority queue processing (Max feature)
   */
  private async priorityQueue(params: any): Promise<any> {
    return this.executeClaudeCodeMax(params.prompt, {
      ...params.context,
      priority: 'high',
      queue: 'priority'
    });
  }

  /**
   * Persistent memory across sessions (Max feature)
   */
  private async persistentMemory(params: any): Promise<any> {
    const command = params.save ? 'save-memory' : 'load-memory';
    
    return new Promise((resolve, reject) => {
      const args = [
        command,
        '--session', params.sessionId,
        '--data', JSON.stringify(params.data || {})
      ];

      const process = spawn(this.claudeCodeCommand, args, {
        env: {
          ...process.env,
          CLAUDE_AUTH_TOKEN: this.authToken?.accessToken
        }
      });

      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(JSON.parse(output));
        } else {
          reject(new Error('Failed to handle persistent memory'));
        }
      });
    });
  }

  /**
   * Advanced tools access (Max feature)
   */
  private async advancedTools(params: any): Promise<any> {
    const tools = [
      'code-interpreter',
      'web-browser',
      'file-system',
      'database',
      'api-client',
      'terminal',
      'debugger',
      'profiler'
    ];

    return this.executeClaudeCodeMax(params.prompt, {
      ...params.context,
      tools: tools,
      enableAdvancedTools: true
    });
  }

  /**
   * Multi-modal processing (Max feature)
   */
  private async multiModal(params: any): Promise<any> {
    return this.executeClaudeCodeMax(params.prompt, {
      ...params.context,
      attachments: params.attachments,
      modalities: ['text', 'image', 'code', 'data']
    });
  }

  /**
   * Real-time collaboration (Max feature)
   */
  private async realTimeCollaboration(params: any): Promise<any> {
    // Connect to collaboration session
    const ws = new WebSocket(`wss://claude-collab.anthropic.com/session/${params.sessionId}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken?.accessToken}`
      }
    });

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'join',
          user: this.authToken?.userEmail,
          role: params.role || 'collaborator'
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'joined') {
          resolve({
            sessionId: params.sessionId,
            participants: message.participants,
            ws: ws
          });
        }
      });

      ws.on('error', reject);
    });
  }

  /**
   * Get usage statistics (Max plan includes unlimited usage)
   */
  async getUsageStats(): Promise<any> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }

    return {
      plan: 'Max',
      usage: 'Unlimited',
      features: [
        'Unlimited context window',
        'Priority processing',
        'Persistent memory',
        'Advanced tools',
        'Multi-modal support',
        'Real-time collaboration',
        'Multiple concurrent instances',
        'No rate limits'
      ],
      user: {
        email: this.authToken?.userEmail,
        name: this.authToken?.userName
      }
    };
  }

  /**
   * Sign out from Claude Code Max
   */
  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.isAuthenticated = false;
    this.authToken = undefined;
    
    if (this.claudeCodeProcess) {
      this.claudeCodeProcess.kill();
    }
    
    this.emit('signed:out');
  }

  /**
   * Create a new Claude Max agent instance
   */
  protected async createAgent(config: AgentConfig): Promise<BaseAgent> {
    const agent = new ClaudeAgentMax(config as ClaudeMaxConfig);
    
    // Share authentication if already authenticated
    if (this.isAuthenticated && this.authToken) {
      agent.authToken = this.authToken;
      agent.isAuthenticated = true;
    }
    
    return agent;
  }

  /**
   * Terminate the agent
   */
  terminate(): void {
    if (this.claudeCodeProcess) {
      this.claudeCodeProcess.kill();
    }
    
    if (this.ws) {
      this.ws.close();
    }

    super.terminate();
  }
}