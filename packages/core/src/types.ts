/**
 * Katalyst Framework Types
 * 
 * Core type definitions for the Katalyst framework
 */

// Re-export main interfaces
export type { KatalystConfig } from './framework';
export type { RuntimeEnvironment } from './runtime';
export type { 
  WasmModuleInfo, 
  WasmCapabilities,
  WasmLoader,
  RustWasmModule,
  ElixirWasmModule,
  TypeScriptWasmModule
} from './wasm';

// Additional framework types
export interface KatalystInstance {
  initialize(): Promise<void>;
  getRuntime(): KatalystRuntime;
  getConfig(): KatalystConfig;
  updateConfig(config: Partial<KatalystConfig>): void;
  destroy(): void;
}

export interface KatalystRuntime {
  initialize(): Promise<void>;
  loadWasmModule(name: string, url: string): Promise<any>;
  executeTask(taskId: string, operation: string, data: any): Promise<any>;
  getStats(): RuntimeStats;
  updateConfig(config: KatalystConfig): void;
  destroy(): void;
}

export interface RuntimeStats {
  environment: RuntimeEnvironment;
  wasmModules: string[];
  workerPools: number;
  initialized: boolean;
  config: KatalystConfig;
  memoryUsage?: {
    used: number;
    total: number;
    available: number;
  };
  performance?: {
    uptime: number;
    tasksCompleted: number;
    averageTaskTime: number;
  };
}

export interface WasmModule {
  name: string;
  loaded: boolean;
  size: number;
  exports: string[];
  capabilities: string[];
}

export interface RuntimeProvider {
  name: string;
  version: string;
  capabilities: string[];
  initialize(): Promise<void>;
  execute(code: string, context?: any): Promise<any>;
  destroy(): void;
}

export interface IntegrationConfig {
  name: string;
  enabled: boolean;
  options: Record<string, any>;
}

// Task and worker types
export interface Task {
  id: string;
  operation: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retries?: number;
}

export interface TaskResult<T = any> {
  taskId: string;
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
  workerUsed?: string;
}

export interface WorkerPool {
  name: string;
  workers: number;
  busy: number;
  queued: number;
  completed: number;
  failed: number;
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceReport {
  timestamp: number;
  duration: number;
  metrics: PerformanceMetric[];
  summary: {
    totalTasks: number;
    successRate: number;
    averageDuration: number;
    peakMemory: number;
  };
}

// AI integration types
export interface AIProvider {
  name: string;
  models: string[];
  capabilities: string[];
  apiEndpoint?: string;
  authenticate(apiKey: string): Promise<void>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface CompletionOptions extends ChatOptions {
  stop?: string[];
}

// Error types
export class KatalystError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'KatalystError';
  }
}

export class WasmError extends KatalystError {
  constructor(message: string, cause?: Error) {
    super(message, 'WASM_ERROR', cause);
    this.name = 'WasmError';
  }
}

export class RuntimeError extends KatalystError {
  constructor(message: string, cause?: Error) {
    super(message, 'RUNTIME_ERROR', cause);
    this.name = 'RuntimeError';
  }
}

export class ConfigError extends KatalystError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause);
    this.name = 'ConfigError';
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Platform = 'node' | 'deno' | 'browser' | 'edge';

export type OptimizationLevel = 'speed' | 'balanced' | 'memory';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Module declaration for WASM imports
declare module '*.wasm' {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}

// Global augmentations for runtime detection
declare global {
  namespace globalThis {
    var Deno: any;
    var EdgeRuntime: any;
  }
}