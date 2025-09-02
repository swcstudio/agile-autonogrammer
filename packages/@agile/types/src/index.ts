/**
 * @agile/types - Core type definitions
 */

// Legacy Command interface (keeping for compatibility)
export interface Command {
  id?: string
  type: string
  params: Record<string, any>
}

// Enhanced CommandResult with more metadata
export interface CommandResult {
  success: boolean
  result?: any
  data?: any // Keeping for compatibility
  error?: string
  executionTime?: number
  command?: string
  metadata?: Record<string, any>
}

// Enhanced Task interface
export interface Task {
  id: string
  type: 'command' | 'generic' | 'file' | 'ai' | 'workflow'
  payload: any
  priority?: number
  timeout?: number
  retries?: number
  dependencies?: string[]
}

// Thread Pool Configuration
export interface ThreadPoolConfig {
  size: number
  maxQueueSize: number
  timeout?: number
  retryAttempts?: number
}

// Execution Engine Types
export interface ExecutionEngineConfig {
  maxConcurrentExecutions: number
  defaultTimeout: number
  retryAttempts: number
  retryDelay: number
  enableMetrics: boolean
  threadPoolConfig: ThreadPoolConfig
}

export interface ExecutionMetrics {
  totalExecutions: number
  completedExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  totalExecutionTime: number
  activeExecutions: number
  queuedExecutions: number
  throughput: number
  errorRate: number
  lastExecution: number
  completedTasks?: number
}

export interface ExecutionResult {
  id: string
  success: boolean
  executionTime: number
  tasksCompleted: number
  tasksFailed: number
  totalTasks: number
  results: any[]
  error?: string
  metadata?: Record<string, any>
}

export interface ExecutionPlan {
  id: string
  name?: string
  description?: string
  tasks: Task[]
  strategy: 'sequential' | 'parallel' | 'pipeline'
  failFast?: boolean
  timeout?: number
  pipeline?: Pipeline
  metadata?: Record<string, any>
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface ExecutionContext {
  id: string
  plan: ExecutionPlan
  status: ExecutionStatus
  startTime: number
  endTime?: number
  results: any[]
  metrics: {
    tasksCompleted: number
    tasksFailed: number
    totalTasks: number
    executionTime: number
    memoryUsage: number
  }
  environment: any
  metadata?: Record<string, any>
}

// Pipeline Types
export interface Pipeline {
  id: string
  name: string
  description: string
  stages: PipelineStage[]
  metadata?: Record<string, any>
}

export interface PipelineStage {
  id: string
  name: string
  type: 'command' | 'parallel' | 'condition' | 'generic'
  description?: string
  config: Record<string, any>
  timeout?: number
  priority?: number
  condition?: any
  errorStrategy?: 'fail-fast' | 'continue' | 'skip'
  dependencies?: string[]
}

export interface PipelineResult {
  pipelineId: string
  executionId: string
  success: boolean
  executionTime: number
  stagesCompleted: number
  stagesFailed: number
  totalStages: number
  stageResults: any[]
  error?: string
}

export interface PipelineExecutionContext {
  id: string
  pipelineId: string
  status: ExecutionStatus
  startTime: number
  endTime?: number
  currentStageIndex: number
  stageResults: any[]
  metadata: Record<string, any>
}

// Command Registry Types
export interface CommandDefinition {
  name: string
  description: string
  execute: (args: any[], context: CommandContext) => Promise<any>
  schema?: {
    minArgs?: number
    maxArgs?: number
    types?: string[]
    validate?: (args: any[]) => boolean | string
  }
  timeout?: number
  examples?: string[]
  category?: string
}

export interface CommandContext {
  id: string
  executionId?: string
  environment?: any
  security?: {
    allowedPaths?: string[]
    allowedCommands?: string[]
    sandboxMode?: boolean
  }
  metadata?: Record<string, any>
}

// Katalyst Thread Pool interface (from @agile/threading)
export interface KatalystThreadPool {
  execute(task: Task): Promise<any>
  getStatus(): any
  terminate(): Promise<void>
  on(event: string, listener: (...args: any[]) => void): void
}

// Additional threading types
export type TaskType = 'command' | 'generic' | 'file' | 'ai' | 'workflow' | 'compute' | 'io' | 'network'
export type TaskPriority = 1 | 5 | 8 | 10 // LOW, NORMAL, HIGH, CRITICAL

export interface TaskResult {
  taskId: string
  success: boolean
  result?: any
  error?: string
  executionTime: number
}

export interface WorkerInstance {
  id: string
  type: string
  status: 'idle' | 'active' | 'shutting_down'
  tasksCompleted: number
  lastTaskTime: number
}

export interface ThreadPoolMetrics {
  totalWorkers: number
  activeWorkers: number
  idleWorkers: number
  queueSize: number
  completedTasks: number
  failedTasks: number
  averageTaskTime: number
  throughput: number
  memoryUsage: number
  cpuUsage: number
  uptime: number
  lastUpdate: number
}

export const VERSION = '1.0.0'