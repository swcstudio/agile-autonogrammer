import { z } from 'zod'

/**
 * Core command interfaces
 */
export interface Command {
  id?: string
  type: string
  params: Record<string, any>
  metadata?: Record<string, any>
  priority?: TaskPriority
  timeout?: number
}

export interface CommandResult {
  commandId: string
  success: boolean
  data?: any
  error?: string
  metrics: {
    executionTime: number
    timestamp: number
    retries?: number
  }
}

/**
 * Execution context interfaces
 */
export interface ExecutionContext {
  command: Command
  commandId: string
  timestamp: number
  user: UserContext
  session: SessionContext
  environment: EnvironmentContext
  metadata: Record<string, any>
  parsed?: any
  validated?: boolean
  plan?: ExecutionPlan
  result?: any
}

export interface UserContext {
  id: string
  name: string
  preferences: Record<string, any>
}

export interface SessionContext {
  id: string
  startTime: number
  lastActivity: number
  environment: Record<string, any>
  metadata?: Record<string, any>
  commands?: Command[]
  variables?: Map<string, any>
}

export interface EnvironmentContext {
  nodeVersion: string
  platform: string
  arch: string
  cwd: string
  pid: number
}

export interface GlobalContext {
  user: UserContext
  session: SessionContext
  environment: EnvironmentContext
  metadata: Record<string, any>
}

/**
 * Execution planning interfaces
 */
export interface ExecutionPlan {
  id: string
  steps: ExecutionStep[]
  parallelizable: boolean
  estimatedDuration: number
  resourceRequirements: ResourceRequirements
  dependencies: string[]
  circuitBreakerStatus?: string
}

export interface ExecutionStep {
  id: string
  name: string
  type: string
  dependencies: string[]
  parallelizable: boolean
  estimatedDuration: number
  resourceRequirements: ResourceRequirements
}

export interface ResourceRequirements {
  cpu: 'low' | 'medium' | 'high'
  memory: 'low' | 'medium' | 'high'
  io: 'low' | 'medium' | 'high'
}

export interface ExecutionResult {
  success: boolean
  data?: any
  error?: Error
  executionTime: number
  metadata: {
    commandType: string
    timestamp: number
    retries: number
  }
}

/**
 * Engine configuration interfaces
 */
export interface EngineConfig {
  maxConcurrency: number
  timeout: number
  retryPolicy: RetryPolicy
  circuitBreaker: CircuitBreakerConfig
  monitoring: MonitoringConfig
}

export interface RetryPolicy {
  enabled: boolean
  maxRetries: number
  backoff: 'constant' | 'linear' | 'exponential'
  initialDelay?: number
  maxDelay?: number
}

export interface CircuitBreakerConfig {
  enabled: boolean
  threshold: number
  timeout: number
  resetTimeout: number
}

export interface MonitoringConfig {
  enabled: boolean
  interval: number
}

/**
 * Pipeline interfaces
 */
export interface PipelineStage {
  name?: string
  handler?: (context: ExecutionContext, next: () => Promise<void>) => Promise<any>
}

export interface PipelineConfig {
  allowConcurrency: boolean
  errorStrategy: 'stop' | 'continue' | 'retry'
  returnStrategy: 'context' | 'result'
  maxRetries: number
  retryDelay: number
  timeout: number
  monitoring: {
    enabled: boolean
    trackStageMetrics: boolean
  }
}

export interface PipelineMetrics {
  totalExecutions: number
  averageExecutionTime: number
  stageMetrics: Map<string, StageMetrics>
  errorRate: number
}

export interface StageMetrics {
  executionCount: number
  averageExecutionTime: number
  errorCount: number
  successRate: number
}

export interface StageResult {
  stageName: string
  stageIndex: number
  executionTime: number
  success: boolean
  data?: any
  error?: Error
  context: ExecutionContext
  retryAttempt?: number
}

/**
 * Context manager interfaces
 */
export interface ContextManagerConfig {
  persistence: boolean
  cacheSize: number
  cacheTtl: number
  persistenceInterval: number
  sessionTimeout: number
  historyEnabled: boolean
  maxSnapshotsPerContext: number
  maxHistoryAge: number
  monitoring: {
    enabled: boolean
    interval: number
  }
}

export interface ContextSnapshot {
  timestamp: number
  version: number
  data: string
  checksum: string
}

export interface ContextDiff {
  added: Record<string, any>
  modified: Record<string, any>
  removed: Record<string, any>
  timestamp: number
}

/**
 * Command registry interfaces
 */
export interface CommandDefinition {
  name: string
  category?: CommandCategory
  description?: string
  usage?: string
  schema?: z.ZodSchema<any>
  handler?: CommandHandler
  aliases?: string[]
  tags?: string[]
  permissions?: string[]
  validate?: (command: Command) => Promise<ValidationResult>
}

export interface CommandHandler {
  (command: Command): Promise<any>
}

export interface CommandRegistryConfig {
  allowOverwrite: boolean
  enableValidation: boolean
  enableMetrics: boolean
  enforcePermissions: boolean
  metricsInterval: number
  commandPaths: string[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface CommandMetrics {
  executionCount: number
  errorCount: number
  totalExecutionTime: number
  averageExecutionTime: number
  lastExecuted: number
  successRate: number
}

export type CommandCategory = 
  | 'system'
  | 'io' 
  | 'compute'
  | 'transform'
  | 'ai'
  | 'tool'
  | 'agent'
  | 'utility'
  | 'debug'

/**
 * Orchestrator interfaces
 */
export interface OrchestratorConfig {
  threading: ThreadingConfig
  engine: Partial<EngineConfig>
  context: Partial<ContextManagerConfig>
  monitoring: MonitoringConfig
  planning: {
    enabled: boolean
  }
  postProcessing: {
    enabled: boolean
  }
  persistence: {
    enabled: boolean
  }
}

export interface ThreadingConfig {
  enabled: boolean
  poolSize: number
  scaling: 'fixed' | 'dynamic'
  routingStrategy: 'round-robin' | 'least-loaded' | 'capability-based' | 'predictive' | 'affinity'
  workerPath: string
}

/**
 * Circuit breaker types
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

/**
 * Task priority enum
 */
export enum TaskPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10
}

/**
 * Event interfaces
 */
export interface EngineEvents {
  'initialized': () => void
  'plan:created': (data: { plan: ExecutionPlan; duration: number }) => void
  'plan:error': (error: Error) => void
  'retry:attempt': (data: { attempt: number; maxRetries: number; delay: number; error: Error }) => void
  'metrics': (metrics: any) => void
  'shutdown': () => void
}

export interface PipelineEvents {
  'stage:added': (data: { stageName: string }) => void
  'stage:inserted': (data: { stageName: string; index: number }) => void
  'stage:removed': (data: { stageName: string; index: number }) => void
  'execution:start': (data: { executionId: string; context: ExecutionContext; stageCount: number }) => void
  'execution:success': (data: { executionId: string; result: any; executionTime: number }) => void
  'execution:error': (data: { executionId: string; error: Error; executionTime: number }) => void
  'stage:start': (data: { executionId: string; stageName: string; stageIndex: number }) => void
  'stage:success': (data: { executionId: string; stageName: string; stageIndex: number; executionTime: number; result: any }) => void
  'stage:error': (data: { executionId: string; stageName: string; stageIndex: number; executionTime: number; error: Error }) => void
  'stage:retry:success': (data: { stageName: string; attempt: number; executionTime: number }) => void
  'stage:retry:error': (data: { stageName: string; attempt: number; error: Error }) => void
  'pipeline:cleared': () => void
  'validation:error': (error: Error) => void
}

export interface ContextManagerEvents {
  'initialized': () => void
  'context:created': (data: { contextId: string; context: ExecutionContext }) => void
  'context:updated': (data: { contextId: string; diff: ContextDiff; context: any }) => void
  'context:evicted': (data: { contextId: string; context: ExecutionContext }) => void
  'context:persisted': (data: { contextId: string; size: number }) => void
  'context:persistence:error': (data: { contextId: string; error: Error }) => void
  'context:restored': (data: { contextId: string; snapshotIndex: number; context: ExecutionContext }) => void
  'session:created': (data: { sessionId: string; context: SessionContext }) => void
  'session:updated': (data: { sessionId: string; diff: ContextDiff; context: SessionContext }) => void
  'session:expired': (data: { sessionId: string }) => void
  'cleanup:completed': (data: { sessionsRemoved: number; historiesCleared: number }) => void
  'monitoring:stats': (stats: any) => void
  'error': (error: Error) => void
  'shutdown': () => void
}

export interface CommandRegistryEvents {
  'initialized': (data: { commandCount: number }) => void
  'command:registered': (data: { name: string; category?: string }) => void
  'command:unregistered': (data: { name: string }) => void
  'command:executed': (data: { command: string; executionTime: number; success: boolean; error?: Error }) => void
  'middleware:added': () => void
  'metrics': (stats: any) => void
  'error': (error: Error) => void
}

export interface OrchestratorEvents {
  'initialized': () => void
  'command:start': (data: { command: Command; timestamp: number }) => void
  'command:success': (result: CommandResult) => void
  'command:error': (data: { command: Command; error: Error }) => void
  'threadpool:ready': () => void
  'threadpool:error': (error: Error) => void
  'metrics': (data: { type: string; data: any }) => void
  'shutdown': () => void
}