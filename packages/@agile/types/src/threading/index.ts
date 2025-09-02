/**
 * Threading type definitions
 */

import { TaskPriority } from '../core'

/**
 * Core task interfaces
 */
export interface Task {
  id: string
  type: TaskType
  priority: TaskPriority
  payload: any
  timeout?: number
  retries?: number
  metadata?: TaskMetadata
}

export interface TaskMetadata {
  createdAt: number
  scheduledAt?: number
  startedAt?: number
  completedAt?: number
  workerId?: string
  attempts?: number
  tags?: string[]
}

export interface TaskResult<T = any> {
  success: boolean
  data?: T
  error?: string
  executionTime: number
  workerId: string
  metadata: TaskMetadata
}

export type TaskType = 
  | 'compute'
  | 'io'
  | 'memory'
  | 'transform'
  | 'network'
  | 'ai'
  | 'general'

/**
 * Thread pool interfaces
 */
export interface ThreadPoolConfig {
  size: number
  scaling: ScalingConfig
  routingStrategy: RoutingStrategy
  workerPath: string
  maxQueueSize?: number
  taskTimeout?: number
  healthCheckInterval?: number
  metrics?: MetricsConfig
}

export interface ScalingConfig {
  enabled: boolean
  minWorkers: number
  maxWorkers: number
  scaleUpThreshold: number
  scaleDownThreshold: number
  scaleUpDelay: number
  scaleDownDelay: number
}

export interface MetricsConfig {
  enabled: boolean
  interval: number
  retention: number
}

export type RoutingStrategy = 
  | 'round-robin'
  | 'least-loaded'
  | 'capability-based'
  | 'predictive'
  | 'affinity'

/**
 * Worker interfaces
 */
export interface WorkerInstance {
  id: string
  thread: any // Worker thread instance
  status: WorkerStatus
  capabilities: Set<string>
  currentTask: Task | null
  taskHistory: TaskSummary[]
  metrics: WorkerMetrics
  lastHealthCheck: number
  isHealthy: boolean
}

export interface WorkerMetrics {
  tasksCompleted: number
  tasksErrored: number
  totalExecutionTime: number
  averageExecutionTime: number
  memoryUsage: number
  cpuUsage: number
  lastTaskTime: number
  uptime: number
}

export interface TaskSummary {
  id: string
  type: TaskType
  executionTime: number
  success: boolean
  timestamp: number
}

export type WorkerStatus = 
  | 'initializing'
  | 'idle'
  | 'busy'
  | 'error'
  | 'terminating'
  | 'terminated'

/**
 * Task queue interfaces
 */
export interface PriorityQueueConfig {
  maxSize: number
  priorities: TaskPriority[]
  timeoutMs: number
  metrics: boolean
}

export interface QueueMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageWaitTime: number
  currentSize: number
  maxSize: number
  throughput: number
}

/**
 * Task router interfaces
 */
export interface RoutingDecision {
  workerId: string
  confidence: number
  reason: string
  estimatedExecutionTime?: number
}

export interface WorkerCapability {
  type: TaskType
  performance: number
  reliability: number
  availability: number
}

/**
 * Thread pool events
 */
export interface ThreadPoolEvents {
  'ready': () => void
  'worker:created': (data: { workerId: string }) => void
  'worker:terminated': (data: { workerId: string; reason: string }) => void
  'worker:error': (data: { workerId: string; error: Error }) => void
  'worker:health': (data: { workerId: string; healthy: boolean }) => void
  'task:queued': (data: { taskId: string; priority: TaskPriority }) => void
  'task:started': (data: { taskId: string; workerId: string }) => void
  'task:completed': (data: { taskId: string; workerId: string; success: boolean; executionTime: number }) => void
  'task:timeout': (data: { taskId: string; workerId: string }) => void
  'queue:full': () => void
  'queue:empty': () => void
  'scaling:up': (data: { currentSize: number; targetSize: number }) => void
  'scaling:down': (data: { currentSize: number; targetSize: number }) => void
  'metrics': (data: ThreadPoolMetrics) => void
  'error': (error: Error) => void
}

/**
 * Metrics interfaces
 */
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

export interface PerformanceMetrics {
  timestamp: number
  cpuUsage: number
  memoryUsage: number
  taskCount: number
  errorCount: number
  averageLatency: number
  throughput: number
}

/**
 * Task scheduler interfaces
 */
export interface SchedulerConfig {
  algorithm: SchedulingAlgorithm
  preemptive: boolean
  fairness: boolean
  priorities: TaskPriority[]
}

export type SchedulingAlgorithm = 
  | 'fifo'
  | 'lifo'
  | 'priority'
  | 'round-robin'
  | 'shortest-job-first'
  | 'fair-share'

/**
 * Load balancer interfaces
 */
export interface LoadBalancerConfig {
  algorithm: LoadBalancingAlgorithm
  healthCheckInterval: number
  weights: Map<string, number>
  stickySessions: boolean
}

export type LoadBalancingAlgorithm = 
  | 'round-robin'
  | 'least-connections'
  | 'weighted-round-robin'
  | 'least-response-time'
  | 'consistent-hash'

/**
 * Error handling interfaces
 */
export interface TaskError {
  taskId: string
  workerId: string
  error: Error
  timestamp: number
  retryable: boolean
  context?: any
}

export interface ErrorRecoveryPolicy {
  maxRetries: number
  backoffStrategy: BackoffStrategy
  retryableErrors: string[]
  fallbackHandler?: (error: TaskError) => Promise<any>
}

export type BackoffStrategy = 
  | 'constant'
  | 'linear'
  | 'exponential'
  | 'exponential-jitter'

/**
 * Resource management interfaces
 */
export interface ResourceLimits {
  maxMemory: number
  maxCpuUsage: number
  maxTasks: number
  maxIdleTime: number
}

export interface ResourceUsage {
  memory: number
  cpu: number
  tasks: number
  uptime: number
}

/**
 * Health check interfaces
 */
export interface HealthCheck {
  workerId: string
  timestamp: number
  status: HealthStatus
  metrics: WorkerMetrics
  details?: any
}

export type HealthStatus = 
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unknown'

/**
 * Communication interfaces
 */
export interface WorkerMessage {
  id: string
  type: MessageType
  payload: any
  timestamp: number
}

export type MessageType = 
  | 'task'
  | 'result'
  | 'error'
  | 'health'
  | 'terminate'
  | 'status'

/**
 * Configuration validation schemas
 */
export interface ConfigValidation {
  poolConfig: (config: ThreadPoolConfig) => boolean
  taskConfig: (task: Task) => boolean
  workerConfig: (worker: WorkerInstance) => boolean
}

/**
 * Utility types
 */
export type TaskQueue<T = Task> = Array<T>
export type WorkerPool = Map<string, WorkerInstance>
export type TaskHistory = Map<string, TaskResult[]>