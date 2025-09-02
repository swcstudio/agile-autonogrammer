import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { performance } from 'perf_hooks';

/**
 * TypeScript bridge for Brain-Braun-Beyond architecture integration.
 * Connects TypeScript frontend/UI layer with Elixir cognitive processing
 * and Rust computational engines via websockets and process communication.
 */

export interface BrainRequest {
  id: string;
  type: 'code_analysis' | 'cognitive_reasoning' | 'emergence_detection' | 'protocol_execution';
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  context: Record<string, any>;
  timestamp: number;
}

export interface BraunRequest {
  id: string;
  type: 'quantum_optimization' | 'matrix_computation' | 'field_simulation' | 'pattern_recognition';
  payload: any;
  parameters: Record<string, any>;
  timeout_ms: number;
}

export interface BeyondRequest {
  id: string;
  function_name: string;
  parameters: Record<string, any>;
  client?: string;
}

export interface BrainBraunBeyondResponse {
  id: string;
  result: any;
  confidence?: number;
  reasoning_trace?: any[];
  processing_time: number;
  resources_used: Record<string, any>;
  error?: string;
}

export class BrainBraunBeyondBridge extends EventEmitter {
  private elixirProcess: ChildProcess | null = null;
  private brainWebSocket: WebSocket | null = null;
  private coordinationWebSocket: WebSocket | null = null;
  private isConnected = false;
  private connectionRetryCount = 0;
  private maxRetries = 5;
  private requestCallbacks = new Map<string, (result: any) => void>();
  private performanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    successRate: 0,
    componentHealth: {
      brain: 'unknown',
      braun: 'unknown',
      beyond: 'unknown'
    }
  };

  constructor(private config: BrainBraunBeyondConfig = {}) {
    super();
    this.config = {
      elixirNodePath: process.env.ELIXIR_NODE_PATH || 'elixir',
      brainPort: 4000,
      coordinationPort: 4001,
      autoReconnect: true,
      connectionTimeout: 10000,
      requestTimeout: 30000,
      ...config
    };
  }

  /**
   * Initialize and connect to Brain-Braun-Beyond system
   */
  async initialize(): Promise<void> {
    try {
      await this.startElixirSystem();
      await this.connectWebSockets();
      this.setupEventHandlers();
      this.startHealthMonitoring();
      
      this.isConnected = true;
      this.emit('connected');
      
      console.log('Brain-Braun-Beyond Bridge initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Brain-Braun-Beyond Bridge:', error);
      throw error;
    }
  }

  /**
   * Execute a request through the Brain (Elixir cognitive engine)
   */
  async callBrain(request: BrainRequest): Promise<BrainBraunBeyondResponse> {
    if (!this.isConnected) {
      throw new Error('Bridge not connected. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const timeoutId = setTimeout(() => {
        this.requestCallbacks.delete(request.id);
        reject(new Error('Brain request timeout'));
      }, this.config.requestTimeout);

      this.requestCallbacks.set(request.id, (response) => {
        clearTimeout(timeoutId);
        response.processing_time = performance.now() - startTime;
        this.updateMetrics(response);
        resolve(response);
      });

      if (this.brainWebSocket && this.brainWebSocket.readyState === WebSocket.OPEN) {
        this.brainWebSocket.send(JSON.stringify({
          type: 'brain_request',
          request
        }));
      } else {
        this.requestCallbacks.delete(request.id);
        clearTimeout(timeoutId);
        reject(new Error('Brain WebSocket not available'));
      }
    });
  }

  /**
   * Execute a request through the Braun (Rust computational engine)
   */
  async callBraun(request: BraunRequest): Promise<BrainBraunBeyondResponse> {
    if (!this.isConnected) {
      throw new Error('Bridge not connected. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const timeoutId = setTimeout(() => {
        this.requestCallbacks.delete(request.id);
        reject(new Error('Braun request timeout'));
      }, request.timeout_ms || this.config.requestTimeout);

      this.requestCallbacks.set(request.id, (response) => {
        clearTimeout(timeoutId);
        response.processing_time = performance.now() - startTime;
        this.updateMetrics(response);
        resolve(response);
      });

      if (this.coordinationWebSocket && this.coordinationWebSocket.readyState === WebSocket.OPEN) {
        this.coordinationWebSocket.send(JSON.stringify({
          type: 'braun_request',
          request
        }));
      } else {
        this.requestCallbacks.delete(request.id);
        clearTimeout(timeoutId);
        reject(new Error('Coordination WebSocket not available'));
      }
    });
  }

  /**
   * Execute a BAML function through Beyond (transcendent reasoning)
   */
  async callBeyond(request: BeyondRequest): Promise<BrainBraunBeyondResponse> {
    if (!this.isConnected) {
      throw new Error('Bridge not connected. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const timeoutId = setTimeout(() => {
        this.requestCallbacks.delete(request.id);
        reject(new Error('Beyond request timeout'));
      }, this.config.requestTimeout);

      this.requestCallbacks.set(request.id, (response) => {
        clearTimeout(timeoutId);
        response.processing_time = performance.now() - startTime;
        this.updateMetrics(response);
        resolve(response);
      });

      if (this.coordinationWebSocket && this.coordinationWebSocket.readyState === WebSocket.OPEN) {
        this.coordinationWebSocket.send(JSON.stringify({
          type: 'beyond_request',
          request
        }));
      } else {
        this.requestCallbacks.delete(request.id);
        clearTimeout(timeoutId);
        reject(new Error('Coordination WebSocket not available'));
      }
    });
  }

  /**
   * Execute a coordinated multi-component workflow
   */
  async executeWorkflow(workflowName: string, parameters: Record<string, any>): Promise<BrainBraunBeyondResponse> {
    const request = {
      id: this.generateRequestId(),
      type: 'custom_workflow' as const,
      workflow_name: workflowName,
      payload: parameters,
      priority: 'normal' as const,
      context: {},
      timestamp: Date.now()
    };

    return this.callCoordination(request);
  }

  /**
   * Get system health and performance metrics
   */
  async getSystemHealth(): Promise<any> {
    if (!this.coordinationWebSocket || this.coordinationWebSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Coordination WebSocket not available');
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const timeoutId = setTimeout(() => {
        this.requestCallbacks.delete(requestId);
        reject(new Error('System health request timeout'));
      }, 5000);

      this.requestCallbacks.set(requestId, (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      this.coordinationWebSocket.send(JSON.stringify({
        type: 'system_health_request',
        id: requestId
      }));
    });
  }

  /**
   * Get performance metrics from the bridge
   */
  getPerformanceMetrics(): any {
    return { ...this.performanceMetrics };
  }

  /**
   * Disconnect from the system and cleanup resources
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    // Close WebSocket connections
    if (this.brainWebSocket) {
      this.brainWebSocket.close();
      this.brainWebSocket = null;
    }
    
    if (this.coordinationWebSocket) {
      this.coordinationWebSocket.close();
      this.coordinationWebSocket = null;
    }

    // Terminate Elixir process
    if (this.elixirProcess) {
      this.elixirProcess.kill('SIGTERM');
      this.elixirProcess = null;
    }

    // Clear callbacks
    this.requestCallbacks.clear();
    
    this.emit('disconnected');
    console.log('Brain-Braun-Beyond Bridge disconnected');
  }

  private async startElixirSystem(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting Elixir Brain-Braun-Beyond system...');
      
      const elixirArgs = [
        '--no-halt',
        '-S', 'mix',
        'run',
        '--eval', 'AiOsx.BrainBraunBeyondSupervisor.start_link([])'
      ];

      this.elixirProcess = spawn(this.config.elixirNodePath!, elixirArgs, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          MIX_ENV: 'prod',
          ELIXIR_ERL_OPTIONS: '+P 1048576 +Q 65536 +K true'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let startupOutput = '';
      
      this.elixirProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        console.log(`Elixir: ${output.trim()}`);
        
        // Look for successful startup indication
        if (output.includes('Brain-Braun-Beyond Supervisor') && output.includes('started')) {
          setTimeout(resolve, 2000); // Give a moment for full initialization
        }
      });

      this.elixirProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        console.error(`Elixir Error: ${error.trim()}`);
      });

      this.elixirProcess.on('error', (error) => {
        console.error('Failed to start Elixir process:', error);
        reject(error);
      });

      this.elixirProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Elixir process exited with code ${code}`);
          if (this.config.autoReconnect && this.connectionRetryCount < this.maxRetries) {
            this.attemptReconnection();
          } else {
            this.emit('error', new Error(`Elixir process exited with code ${code}`));
          }
        }
      });

      // Timeout if startup takes too long
      setTimeout(() => {
        if (!startupOutput.includes('started')) {
          reject(new Error('Elixir system startup timeout'));
        }
      }, this.config.connectionTimeout);
    });
  }

  private async connectWebSockets(): Promise<void> {
    await Promise.all([
      this.connectBrainWebSocket(),
      this.connectCoordinationWebSocket()
    ]);
  }

  private async connectBrainWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.brainWebSocket = new WebSocket(`ws://localhost:${this.config.brainPort}/brain_socket`);
      
      this.brainWebSocket.on('open', () => {
        console.log('Brain WebSocket connected');
        resolve();
      });

      this.brainWebSocket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleBrainMessage(message);
        } catch (error) {
          console.error('Failed to parse Brain WebSocket message:', error);
        }
      });

      this.brainWebSocket.on('error', (error) => {
        console.error('Brain WebSocket error:', error);
        reject(error);
      });

      this.brainWebSocket.on('close', () => {
        console.log('Brain WebSocket disconnected');
        if (this.config.autoReconnect && this.isConnected) {
          this.attemptReconnection();
        }
      });
    });
  }

  private async connectCoordinationWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.coordinationWebSocket = new WebSocket(`ws://localhost:${this.config.coordinationPort}/coordination_socket`);
      
      this.coordinationWebSocket.on('open', () => {
        console.log('Coordination WebSocket connected');
        resolve();
      });

      this.coordinationWebSocket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleCoordinationMessage(message);
        } catch (error) {
          console.error('Failed to parse Coordination WebSocket message:', error);
        }
      });

      this.coordinationWebSocket.on('error', (error) => {
        console.error('Coordination WebSocket error:', error);
        reject(error);
      });

      this.coordinationWebSocket.on('close', () => {
        console.log('Coordination WebSocket disconnected');
        if (this.config.autoReconnect && this.isConnected) {
          this.attemptReconnection();
        }
      });
    });
  }

  private setupEventHandlers(): void {
    // Handle process signals for graceful shutdown
    process.on('SIGINT', () => this.disconnect());
    process.on('SIGTERM', () => this.disconnect());
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        this.performanceMetrics.componentHealth = health.component_health || {};
        this.emit('healthUpdate', health);
      } catch (error) {
        console.warn('Health monitoring check failed:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  private handleBrainMessage(message: any): void {
    if (message.type === 'brain_response' && message.id) {
      const callback = this.requestCallbacks.get(message.id);
      if (callback) {
        this.requestCallbacks.delete(message.id);
        callback(message.response);
      }
    } else if (message.type === 'brain_event') {
      this.emit('brainEvent', message.event);
    }
  }

  private handleCoordinationMessage(message: any): void {
    if (message.type === 'coordination_response' && message.id) {
      const callback = this.requestCallbacks.get(message.id);
      if (callback) {
        this.requestCallbacks.delete(message.id);
        callback(message.response);
      }
    } else if (message.type === 'system_health_response' && message.id) {
      const callback = this.requestCallbacks.get(message.id);
      if (callback) {
        this.requestCallbacks.delete(message.id);
        callback(message.health);
      }
    } else if (message.type === 'system_event') {
      this.emit('systemEvent', message.event);
    }
  }

  private async callCoordination(request: any): Promise<BrainBraunBeyondResponse> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const timeoutId = setTimeout(() => {
        this.requestCallbacks.delete(request.id);
        reject(new Error('Coordination request timeout'));
      }, this.config.requestTimeout);

      this.requestCallbacks.set(request.id, (response) => {
        clearTimeout(timeoutId);
        response.processing_time = performance.now() - startTime;
        this.updateMetrics(response);
        resolve(response);
      });

      if (this.coordinationWebSocket && this.coordinationWebSocket.readyState === WebSocket.OPEN) {
        this.coordinationWebSocket.send(JSON.stringify({
          type: 'coordination_request',
          request
        }));
      } else {
        this.requestCallbacks.delete(request.id);
        clearTimeout(timeoutId);
        reject(new Error('Coordination WebSocket not available'));
      }
    });
  }

  private async attemptReconnection(): Promise<void> {
    if (this.connectionRetryCount >= this.maxRetries) {
      console.error('Max reconnection attempts reached');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.connectionRetryCount++;
    console.log(`Attempting reconnection (${this.connectionRetryCount}/${this.maxRetries})...`);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000 * this.connectionRetryCount));
      await this.initialize();
      this.connectionRetryCount = 0;
      console.log('Reconnection successful');
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.attemptReconnection();
    }
  }

  private updateMetrics(response: BrainBraunBeyondResponse): void {
    this.performanceMetrics.requestCount++;
    
    const currentAvg = this.performanceMetrics.averageResponseTime;
    const newAvg = (currentAvg * (this.performanceMetrics.requestCount - 1) + response.processing_time) / this.performanceMetrics.requestCount;
    this.performanceMetrics.averageResponseTime = newAvg;
    
    const isSuccess = !response.error;
    const currentSuccessRate = this.performanceMetrics.successRate;
    const newSuccessRate = (currentSuccessRate * (this.performanceMetrics.requestCount - 1) + (isSuccess ? 1 : 0)) / this.performanceMetrics.requestCount;
    this.performanceMetrics.successRate = newSuccessRate;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface BrainBraunBeyondConfig {
  elixirNodePath?: string;
  brainPort?: number;
  coordinationPort?: number;
  autoReconnect?: boolean;
  connectionTimeout?: number;
  requestTimeout?: number;
}

// Export utility functions for creating requests
export function createBrainRequest(
  type: BrainRequest['type'],
  payload: any,
  options: Partial<Pick<BrainRequest, 'priority' | 'context'>> = {}
): BrainRequest {
  return {
    id: `brain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    priority: options.priority || 'normal',
    context: options.context || {},
    timestamp: Date.now()
  };
}

export function createBraunRequest(
  type: BraunRequest['type'],
  payload: any,
  options: Partial<Pick<BraunRequest, 'parameters' | 'timeout_ms'>> = {}
): BraunRequest {
  return {
    id: `braun_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    parameters: options.parameters || {},
    timeout_ms: options.timeout_ms || 30000
  };
}

export function createBeyondRequest(
  functionName: string,
  parameters: Record<string, any>,
  options: Partial<Pick<BeyondRequest, 'client'>> = {}
): BeyondRequest {
  return {
    id: `beyond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    function_name: functionName,
    parameters,
    client: options.client
  };
}