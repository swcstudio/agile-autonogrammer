import { EventEmitter } from 'eventemitter3'
import { nanoid } from 'nanoid'
import * as path from 'path'
import * as os from 'os'

export interface ExecutionEnvironment {
  id: string
  workingDirectory: string
  environmentVariables: Record<string, string>
  resourceLimits: ResourceLimits
  security: SecurityContext
  metadata: Record<string, any>
  createdAt: number
  lastUsed: number
}

export interface ResourceLimits {
  maxMemoryMB: number
  maxExecutionTime: number
  maxFileSize: number
  maxOpenFiles: number
  cpuQuota?: number
}

export interface SecurityContext {
  allowedPaths: string[]
  restrictedPaths: string[]
  allowedCommands: string[]
  restrictedCommands: string[]
  enableNetworkAccess: boolean
  enableFileSystem: boolean
  sandboxMode: boolean
}

export interface ContextManagerConfig {
  defaultWorkingDirectory?: string
  defaultResourceLimits?: Partial<ResourceLimits>
  defaultSecurity?: Partial<SecurityContext>
  maxEnvironments?: number
  cleanupInterval?: number
}

export class ContextManager extends EventEmitter<{
  'environment:created': [{ environment: ExecutionEnvironment }]
  'environment:accessed': [{ environment: ExecutionEnvironment }]
  'environment:updated': [{ environment: ExecutionEnvironment; updates: Partial<ExecutionEnvironment> }]
  'environment:cleaned': [{ environmentId: string }]
  'environment:cleanup:error': [{ environmentId: string; error: any }]
  'environments:stale:cleaned': [{ count: number; environmentIds: string[] }]
  'cleanup:error': [{ error: any }]
  'context-manager:terminated': []
}> {
  private environments: Map<string, ExecutionEnvironment> = new Map()
  private config: ContextManagerConfig
  private cleanupInterval?: NodeJS.Timeout

  constructor(config: ContextManagerConfig = {}) {
    super()
    
    this.config = {
      defaultWorkingDirectory: config.defaultWorkingDirectory || process.cwd(),
      defaultResourceLimits: {
        maxMemoryMB: 512,
        maxExecutionTime: 300000, // 5 minutes
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxOpenFiles: 100,
        cpuQuota: 1.0,
        ...config.defaultResourceLimits
      },
      defaultSecurity: {
        allowedPaths: [process.cwd()],
        restrictedPaths: ['/etc', '/sys', '/proc'],
        allowedCommands: ['npm', 'yarn', 'pnpm', 'bun', 'git', 'node', 'tsc'],
        restrictedCommands: ['rm', 'rmdir', 'del', 'format', 'fdisk'],
        enableNetworkAccess: true,
        enableFileSystem: true,
        sandboxMode: false,
        ...config.defaultSecurity
      },
      maxEnvironments: config.maxEnvironments || 10,
      cleanupInterval: config.cleanupInterval || 300000 // 5 minutes
    }

    this.startCleanupInterval()
  }

  async createExecutionEnvironment(
    overrides: Partial<ExecutionEnvironment> = {}
  ): Promise<ExecutionEnvironment> {
    if (this.environments.size >= this.config.maxEnvironments!) {
      await this.cleanupStaleEnvironments()
      
      if (this.environments.size >= this.config.maxEnvironments!) {
        throw new Error('Maximum execution environments reached')
      }
    }

    const environmentId = nanoid()
    const now = Date.now()

    // Prepare environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PATH: process.env.PATH || '',
      HOME: process.env.HOME || os.homedir(),
      USER: process.env.USER || os.userInfo().username,
      SHELL: process.env.SHELL || '/bin/bash',
      AGILE_EXECUTION_ID: environmentId,
      AGILE_TIMESTAMP: now.toString(),
      ...overrides.environmentVariables
    }

    // Create secure working directory path
    const workingDirectory = this.resolveWorkingDirectory(
      overrides.workingDirectory || this.config.defaultWorkingDirectory!
    )

    const environment: ExecutionEnvironment = {
      id: environmentId,
      workingDirectory,
      environmentVariables: envVars,
      resourceLimits: {
        ...this.config.defaultResourceLimits as ResourceLimits,
        ...overrides.resourceLimits
      },
      security: {
        ...this.config.defaultSecurity as SecurityContext,
        ...overrides.security
      },
      metadata: {
        createdBy: 'ContextManager',
        version: '1.0.0',
        ...overrides.metadata
      },
      createdAt: now,
      lastUsed: now
    }

    // Validate security constraints
    this.validateSecurityContext(environment.security)

    // Store environment
    this.environments.set(environmentId, environment)

    this.emit('environment:created', { environment })
    return environment
  }

  getExecutionEnvironment(id: string): ExecutionEnvironment | undefined {
    const environment = this.environments.get(id)
    if (environment) {
      environment.lastUsed = Date.now()
      this.emit('environment:accessed', { environment })
    }
    return environment
  }

  updateExecutionEnvironment(
    id: string, 
    updates: Partial<ExecutionEnvironment>
  ): ExecutionEnvironment | null {
    const environment = this.environments.get(id)
    if (!environment) {
      return null
    }

    // Merge updates
    const updatedEnvironment: ExecutionEnvironment = {
      ...environment,
      ...updates,
      id: environment.id, // Prevent ID changes
      createdAt: environment.createdAt, // Preserve creation time
      lastUsed: Date.now()
    }

    // Validate updated security context
    if (updates.security) {
      this.validateSecurityContext(updatedEnvironment.security)
    }

    this.environments.set(id, updatedEnvironment)
    this.emit('environment:updated', { environment: updatedEnvironment, updates })
    
    return updatedEnvironment
  }

  async cleanupExecutionEnvironment(environment: ExecutionEnvironment): Promise<void> {
    const deleted = this.environments.delete(environment.id)
    
    if (deleted) {
      // Perform cleanup tasks
      try {
        // Clear temporary files if any were created
        await this.cleanupTemporaryResources(environment)
        
        this.emit('environment:cleaned', { environmentId: environment.id })
      } catch (error) {
        this.emit('environment:cleanup:error', { 
          environmentId: environment.id, 
          error 
        })
      }
    }
  }

  listEnvironments(): ExecutionEnvironment[] {
    return Array.from(this.environments.values())
  }

  getActiveEnvironments(): ExecutionEnvironment[] {
    const fiveMinutesAgo = Date.now() - 300000
    return Array.from(this.environments.values())
      .filter(env => env.lastUsed > fiveMinutesAgo)
  }

  private resolveWorkingDirectory(workingDir: string): string {
    // Resolve and normalize the working directory
    const resolved = path.resolve(workingDir)
    
    // Security check: ensure it's within allowed paths
    const allowedPaths = this.config.defaultSecurity?.allowedPaths || [process.cwd()]
    const isAllowed = allowedPaths.some(allowedPath => 
      resolved.startsWith(path.resolve(allowedPath))
    )

    if (!isAllowed) {
      throw new Error(`Working directory not allowed: ${resolved}`)
    }

    return resolved
  }

  private validateSecurityContext(security: SecurityContext): void {
    // Validate allowed paths exist and are accessible
    for (const allowedPath of security.allowedPaths) {
      try {
        const resolved = path.resolve(allowedPath)
        // Basic path validation - ensure it exists or is creatable
      } catch (error) {
        throw new Error(`Invalid allowed path: ${allowedPath}`)
      }
    }

    // Validate restricted paths don't override allowed paths
    for (const restrictedPath of security.restrictedPaths) {
      for (const allowedPath of security.allowedPaths) {
        const resolvedRestricted = path.resolve(restrictedPath)
        const resolvedAllowed = path.resolve(allowedPath)
        
        if (resolvedAllowed.startsWith(resolvedRestricted)) {
          throw new Error(
            `Conflict: Allowed path ${allowedPath} is within restricted path ${restrictedPath}`
          )
        }
      }
    }

    // Validate command lists
    const dangerousCommands = ['rm', 'rmdir', 'del', 'format', 'fdisk', 'mkfs']
    for (const command of security.allowedCommands) {
      if (dangerousCommands.includes(command.toLowerCase())) {
        console.warn(`Warning: Allowing potentially dangerous command: ${command}`)
      }
    }
  }

  private async cleanupTemporaryResources(environment: ExecutionEnvironment): Promise<void> {
    // This is where we would clean up any temporary resources
    // associated with the execution environment
    
    // For now, we'll just log the cleanup
    console.debug(`Cleaning up resources for environment: ${environment.id}`)
    
    // In a real implementation, we might:
    // - Remove temporary files
    // - Close open file handles
    // - Terminate child processes
    // - Clear memory allocations
    // - Reset network connections
  }

  private async cleanupStaleEnvironments(): Promise<void> {
    const staleThreshold = Date.now() - (this.config.cleanupInterval! * 2)
    const staleEnvironments = Array.from(this.environments.values())
      .filter(env => env.lastUsed < staleThreshold)

    for (const env of staleEnvironments) {
      await this.cleanupExecutionEnvironment(env)
    }

    if (staleEnvironments.length > 0) {
      this.emit('environments:stale:cleaned', { 
        count: staleEnvironments.length,
        environmentIds: staleEnvironments.map(e => e.id)
      })
    }
  }

  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEnvironments().catch(error => {
        this.emit('cleanup:error', { error })
      })
    }, this.config.cleanupInterval!)
  }

  /**
   * Create a sandboxed environment for high-risk operations
   */
  async createSandboxEnvironment(
    config: Partial<ExecutionEnvironment> = {}
  ): Promise<ExecutionEnvironment> {
    const sandboxConfig: Partial<ExecutionEnvironment> = {
      ...config,
      security: {
        allowedPaths: [path.join(os.tmpdir(), 'agile-sandbox')],
        restrictedPaths: ['/', '/etc', '/sys', '/proc', '/dev', '/var', '/usr'],
        allowedCommands: ['node', 'npm', 'yarn', 'tsc'],
        restrictedCommands: ['rm', 'rmdir', 'del', 'sudo', 'su', 'chmod', 'chown'],
        enableNetworkAccess: false,
        enableFileSystem: true,
        sandboxMode: true,
        ...config.security
      },
      resourceLimits: {
        maxMemoryMB: 256,
        maxExecutionTime: 60000, // 1 minute
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxOpenFiles: 20,
        cpuQuota: 0.5,
        ...config.resourceLimits
      }
    }

    return await this.createExecutionEnvironment(sandboxConfig)
  }

  getStatus() {
    const now = Date.now()
    const fiveMinutesAgo = now - 300000

    return {
      totalEnvironments: this.environments.size,
      activeEnvironments: this.getActiveEnvironments().length,
      staleEnvironments: Array.from(this.environments.values())
        .filter(env => env.lastUsed < fiveMinutesAgo).length,
      maxEnvironments: this.config.maxEnvironments,
      isHealthy: this.environments.size < this.config.maxEnvironments!,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  }

  async terminate(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    // Cleanup all environments
    const environments = Array.from(this.environments.values())
    for (const env of environments) {
      await this.cleanupExecutionEnvironment(env)
    }

    this.emit('context-manager:terminated')
  }
}