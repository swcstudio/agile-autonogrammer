/**
 * Enhanced Types for Agile-Programmers Katalyst Integration
 * 
 * These types extend the base Katalyst multithreading types with
 * agile-specific enhancements and customizations.
 */

import type { 
  ActorBehavior, 
  ActorMessage,
  ResourceAction,
  ResourcePolicy,
  AdaptiveConfig
} from '@swcstudio/multithreading'

import type {
  Task,
  TaskType,
  TaskPriority,
  ThreadPoolConfig,
  ExecutionContext
} from '@agile/types'

/**
 * Enhanced Actor Behavior for Agile workflow processing
 */
export interface AgileTaskBehavior extends ActorBehavior {
  /**
   * Handle agile-specific task execution with context awareness
   */
  executeAgileTask(task: Task, context: AgileExecutionContext): Promise<any>
  
  /**
   * Process workflow steps with state management
   */
  processWorkflowStep(step: WorkflowStep, state: WorkflowState): Promise<WorkflowResult>
  
  /**
   * Handle command execution with security validation
   */
  executeCommand(command: CommandExecution): Promise<CommandResult>
  
  /**
   * Manage file operations with permission checks
   */
  handleFileOperation(operation: FileOperation): Promise<FileResult>
}

/**
 * Enhanced execution context for agile workflows
 */
export interface AgileExecutionContext extends ExecutionContext {
  /** Current project context */
  project: {
    root: string
    type: 'monorepo' | 'single-package'
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
    framework?: string
  }
  
  /** User permissions and security context */
  security: {
    allowedPaths: string[]
    allowedCommands: string[]
    restrictedOperations: string[]
    csrfToken?: string
  }
  
  /** Performance and monitoring context */
  monitoring: {
    startTime: number
    memoryLimit: number
    cpuQuota: number
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
  
  /** AI and automation context */
  ai: {
    model?: string
    capabilities: string[]
    temperature?: number
    maxTokens?: number
  }
}

/**
 * Enhanced Actor Message for agile operations
 */
export interface AgileActorMessage extends ActorMessage {
  /** Message category for routing */
  category: 'workflow' | 'command' | 'file' | 'ai' | 'security' | 'monitoring'
  
  /** Priority level for execution ordering */
  priority: TaskPriority
  
  /** Correlation ID for tracing */
  correlationId: string
  
  /** Security context */
  security?: {
    userId?: string
    permissions: string[]
    auditLog: boolean
  }
  
  /** Performance tracking */
  performance?: {
    maxExecutionTime: number
    memoryLimit: number
    requiresGPU: boolean
  }
}

/**
 * Enhanced Resource Policy for agile-specific constraints
 */
export interface AgileResourcePolicy extends ResourcePolicy {
  /** Agile-specific triggers */
  agileTriggers: {
    onWorkflowStart: boolean
    onCommandExecution: boolean
    onFileModification: boolean
    onAIModelInvocation: boolean
  }
  
  /** Security constraints */
  securityConstraints: {
    maxMemoryPerUser: number
    maxConcurrentTasks: number
    allowedFileOperations: string[]
    requirePermissionCheck: boolean
  }
  
  /** AI resource limits */
  aiLimits: {
    maxTokensPerHour: number
    maxConcurrentInferences: number
    allowedModels: string[]
    costBudget?: number
  }
}

/**
 * Enhanced thread pool configuration for agile workflows
 */
export interface AgileThreadPoolConfig extends ThreadPoolConfig {
  /** Agile-specific features */
  agileFeatures: {
    enableWorkflowOptimization: boolean
    enableCommandCaching: boolean
    enableAIAcceleration: boolean
    enableSecurityAuditing: boolean
  }
  
  /** Integration settings */
  integrations: {
    katalystCore: boolean
    aiProviders: string[]
    fileSystemMonitoring: boolean
    performanceAnalytics: boolean
  }
  
  /** Security configuration */
  security: {
    enableSandboxing: boolean
    trustedPaths: string[]
    allowedCommands: string[]
    csrfProtection: boolean
  }
}

/**
 * Workflow processing types
 */
export interface WorkflowStep {
  id: string
  type: 'command' | 'file' | 'ai' | 'conditional' | 'parallel'
  description: string
  dependencies: string[]
  timeout?: number
  retryCount?: number
  conditions?: WorkflowCondition[]
}

export interface WorkflowState {
  variables: Record<string, any>
  completedSteps: string[]
  failedSteps: string[]
  currentStep?: string
  metadata: Record<string, any>
}

export interface WorkflowResult {
  success: boolean
  result?: any
  error?: string
  nextSteps: string[]
  updatedState: WorkflowState
}

export interface WorkflowCondition {
  type: 'variable' | 'file' | 'command' | 'custom'
  expression: string
  expected: any
}

/**
 * Command execution types
 */
export interface CommandExecution {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  shell?: boolean
  security: {
    requirePermission: boolean
    allowedPaths: string[]
    maxMemory?: number
    maxCPU?: number
  }
}

export interface CommandResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  executionTime: number
  memoryUsage: number
  error?: string
}

/**
 * File operation types
 */
export interface FileOperation {
  type: 'read' | 'write' | 'create' | 'delete' | 'copy' | 'move' | 'watch'
  path: string
  content?: string | Buffer
  options?: {
    encoding?: string
    mode?: number
    recursive?: boolean
    backup?: boolean
  }
  security: {
    checkPermissions: boolean
    allowedPaths: string[]
    maxFileSize?: number
  }
}

export interface FileResult {
  success: boolean
  content?: string | Buffer
  stats?: {
    size: number
    modified: Date
    created: Date
    permissions: string
  }
  error?: string
}

/**
 * Performance and monitoring types
 */
export interface PerformanceMetrics {
  cpu: {
    usage: number
    userTime: number
    systemTime: number
    loadAverage: number[]
  }
  memory: {
    usage: number
    available: number
    heap: number
    external: number
  }
  io: {
    readBytes: number
    writeBytes: number
    readOperations: number
    writeOperations: number
  }
  network: {
    bytesReceived: number
    bytesSent: number
    connectionsActive: number
  }
}

export interface SecurityAuditLog {
  timestamp: number
  userId?: string
  action: string
  resource: string
  result: 'allowed' | 'denied' | 'error'
  reason?: string
  metadata: Record<string, any>
}

/**
 * AI integration types
 */
export interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom'
  model: string
  apiKey?: string
  endpoint?: string
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

export interface AIRequest {
  prompt: string
  context?: string
  model?: string
  options?: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
    functions?: any[]
  }
  security: {
    sanitizeInput: boolean
    contentFilter: boolean
    auditLog: boolean
  }
}

export interface AIResponse {
  content: string
  model: string
  tokens: {
    prompt: number
    completion: number
    total: number
  }
  cost?: number
  executionTime: number
  cached?: boolean
}