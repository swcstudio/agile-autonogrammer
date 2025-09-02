/**
 * Claude Agent Implementation
 * Integrates with Claude API and Claude Code for advanced AI capabilities
 */

import { BaseAgent, AgentConfig, AgentContext } from './base-agent';
import { spawn, ChildProcess } from 'child_process';
import { WebSocket } from 'ws';

export interface ClaudeConfig extends AgentConfig {
  apiKey?: string;
  claudeCodePath?: string;
  enableCodeExecution?: boolean;
  workingDirectory?: string;
  allowedTools?: string[];
  maxRetries?: number;
}

export interface ClaudeCodeConfig {
  prompt: string;
  workingDirectory?: string;
  tools?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

export class ClaudeAgent extends BaseAgent {
  private apiKey: string;
  private claudeCodeProcess?: ChildProcess;
  private ws?: WebSocket;
  private claudeCodePath: string;
  private enableCodeExecution: boolean;

  constructor(config: ClaudeConfig) {
    super({ ...config, type: 'claude' });
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.claudeCodePath = config.claudeCodePath || 'claude-code';
    this.enableCodeExecution = config.enableCodeExecution ?? false;

    if (this.enableCodeExecution) {
      this.initializeClaudeCode();
    }
  }

  /**
   * Initialize Claude Code integration
   */
  private initializeClaudeCode(): void {
    // Register Claude Code specific tools
    this.registerTool({
      name: 'execute_code',
      description: 'Execute code using Claude Code',
      execute: async (params: { code: string; language: string }) => {
        return this.executeClaudeCode(params.code, params.language);
      }
    });

    this.registerTool({
      name: 'spawn_claude_code',
      description: 'Spawn a new Claude Code instance for complex tasks',
      execute: async (params: ClaudeCodeConfig) => {
        return this.spawnClaudeCode(params);
      }
    });

    this.registerTool({
      name: 'analyze_codebase',
      description: 'Analyze a codebase using Claude Code',
      execute: async (params: { path: string; query: string }) => {
        return this.analyzeCodebase(params.path, params.query);
      }
    });
  }

  /**
   * Process input through Claude API
   */
  async process(input: string, context?: Partial<AgentContext>): Promise<string> {
    // Build messages array for Claude API
    const messages = [
      ...(this.config.systemPrompt ? [{ role: 'system', content: this.config.systemPrompt }] : []),
      ...this.messageHistory.map(msg => ({
        role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
        content: msg.content
      })),
      { role: 'user', content: input }
    ];

    try {
      // Make API call to Claude
      const response = await this.callClaudeAPI(messages);
      
      // Process any tool calls if needed
      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          await this.executeTool(toolCall.name, toolCall.parameters);
        }
      }

      return response.content;
    } catch (error) {
      console.error('Error processing with Claude:', error);
      throw error;
    }
  }

  /**
   * Call Claude API
   */
  private async callClaudeAPI(messages: any[]): Promise<any> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-opus-20240229',
        messages,
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        ...(this.tools.size > 0 && {
          tools: Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }))
        })
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      toolCalls: data.tool_calls
    };
  }

  /**
   * Spawn a Claude Code instance for complex tasks
   */
  async spawnClaudeCode(config: ClaudeCodeConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '--prompt', config.prompt,
        '--working-directory', config.workingDirectory || process.cwd()
      ];

      if (config.tools) {
        args.push('--tools', config.tools.join(','));
      }

      const claudeCode = spawn(this.claudeCodePath, args, {
        cwd: config.workingDirectory,
        env: { ...process.env, ...config.env }
      });

      let output = '';
      let error = '';

      claudeCode.stdout?.on('data', (data) => {
        output += data.toString();
        this.emit('claudecode:output', data.toString());
      });

      claudeCode.stderr?.on('data', (data) => {
        error += data.toString();
        this.emit('claudecode:error', data.toString());
      });

      claudeCode.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Claude Code exited with code ${code}: ${error}`));
        }
      });

      // Set timeout if specified
      if (config.timeout) {
        setTimeout(() => {
          claudeCode.kill();
          reject(new Error('Claude Code execution timed out'));
        }, config.timeout);
      }

      this.claudeCodeProcess = claudeCode;
    });
  }

  /**
   * Execute code using Claude Code
   */
  async executeClaudeCode(code: string, language: string): Promise<string> {
    const config: ClaudeCodeConfig = {
      prompt: `Execute the following ${language} code and return the output:\n\n${code}`,
      tools: ['execute'],
      timeout: 30000
    };

    return this.spawnClaudeCode(config);
  }

  /**
   * Analyze a codebase using Claude Code
   */
  async analyzeCodebase(path: string, query: string): Promise<string> {
    const config: ClaudeCodeConfig = {
      prompt: `Analyze the codebase at ${path} and answer: ${query}`,
      workingDirectory: path,
      tools: ['read', 'search', 'analyze'],
      timeout: 60000
    };

    return this.spawnClaudeCode(config);
  }

  /**
   * Create a new Claude agent instance
   */
  protected async createAgent(config: AgentConfig): Promise<BaseAgent> {
    return new ClaudeAgent(config as ClaudeConfig);
  }

  /**
   * Connect to Claude Code via WebSocket for real-time communication
   */
  async connectWebSocket(port: number = 8080): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${port}`);

      this.ws.on('open', () => {
        this.emit('websocket:connected');
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.emit('websocket:message', message);
        this.handleWebSocketMessage(message);
      });

      this.ws.on('error', (error) => {
        this.emit('websocket:error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        this.emit('websocket:closed');
      });
    });
  }

  /**
   * Handle WebSocket messages from Claude Code
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'thought':
        this.emit('thought', message.content);
        break;
      case 'action':
        this.emit('action', message.content);
        break;
      case 'result':
        this.emit('result', message.content);
        break;
      case 'error':
        this.emit('error', new Error(message.content));
        break;
    }
  }

  /**
   * Send a message via WebSocket
   */
  sendWebSocketMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  /**
   * Terminate the agent and cleanup resources
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