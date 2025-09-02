import { EventEmitter } from 'eventemitter3'
import { nanoid } from 'nanoid'

export interface AgileActorSystemConfig {
  poolSizes: {
    workflow: number
    command: number
    file: number
    ai: number
  }
  security: {
    enableAuditing: boolean
    trustedPaths: string[]
    allowedCommands: string[]
  }
  performance: {
    enableMonitoring: boolean
    metricsInterval: number
  }
}

export interface SystemStatus {
  actors: {
    total: number
    active: number
    idle: number
  }
  activeWorkflows: number
  auditLogCount: number
}

export interface PerformanceMetrics {
  cpuUsage: number
  memoryUsage: number
  taskThroughput: number
  averageResponseTime: number
  errorRate: number
  uptime: number
}

/**
 * Mock implementation of AgileActorSystem for development/testing
 * This provides the same interface but uses simple Promise-based execution
 */
export class AgileActorSystem extends EventEmitter {
  private config: AgileActorSystemConfig
  private actors: Map<string, any> = new Map()
  private workflows: Map<string, any> = new Map()
  private auditLogs: any[] = []
  private metrics: PerformanceMetrics
  private isShuttingDown: boolean = false

  constructor(config: AgileActorSystemConfig) {
    super()
    this.config = config
    
    this.metrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      taskThroughput: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: 0
    }

    this.initialize()
  }

  private initialize(): void {
    this.createActorPools()
    
    if (this.config.performance.enableMonitoring) {
      this.startPerformanceMonitoring()
    }

    if (this.config.security.enableAuditing) {
      this.startAuditing()
    }
  }

  private createActorPools(): void {
    // Create mock actors for each pool
    const { poolSizes } = this.config
    
    Object.entries(poolSizes).forEach(([poolType, size]) => {
      for (let i = 0; i < size; i++) {
        const actorId = nanoid()
        this.actors.set(actorId, {
          id: actorId,
          type: poolType,
          status: 'idle',
          createdAt: Date.now(),
          tasksCompleted: 0,
          lastTaskTime: 0
        })
      }
    })

    this.emit('actors:initialized', {
      totalActors: this.actors.size,
      poolSizes
    })
  }

  async executeAgileTask(task: any, context: any): Promise<any> {
    if (this.isShuttingDown) {
      throw new Error('AgileActorSystem is shutting down')
    }

    const taskId = task.id || nanoid()
    const startTime = Date.now()

    // Security check
    if (this.config.security.enableAuditing) {
      this.auditLogs.push({
        timestamp: Date.now(),
        taskId,
        type: 'task:execute',
        context: {
          taskType: task.type,
          securityContext: context.security
        }
      })
    }

    // Find available actor
    const actor = this.findAvailableActor(task.type)
    if (!actor) {
      throw new Error(`No available actors for task type: ${task.type}`)
    }

    // Mark actor as active
    actor.status = 'active'
    this.emit('actor:task:started', { actorId: actor.id, taskId })

    try {
      // Simulate task execution
      const result = await this.executeTaskOnActor(actor, task, context)
      
      const executionTime = Date.now() - startTime
      
      // Update actor stats
      actor.tasksCompleted++
      actor.lastTaskTime = executionTime
      actor.status = 'idle'

      // Update metrics
      this.updatePerformanceMetrics(executionTime, true)

      this.emit('actor:task:completed', { 
        actorId: actor.id, 
        taskId, 
        executionTime 
      })

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      
      actor.status = 'idle'
      this.updatePerformanceMetrics(executionTime, false)

      this.emit('actor:task:failed', { 
        actorId: actor.id, 
        taskId, 
        error: error instanceof Error ? error.message : String(error) 
      })

      throw error
    }
  }

  private findAvailableActor(preferredType?: string): any | null {
    // First try to find an actor of the preferred type
    if (preferredType) {
      for (const actor of this.actors.values()) {
        if (actor.type === preferredType && actor.status === 'idle') {
          return actor
        }
      }
    }

    // Fallback to any idle actor
    for (const actor of this.actors.values()) {
      if (actor.status === 'idle') {
        return actor
      }
    }

    return null
  }

  private async executeTaskOnActor(actor: any, task: any, context: any): Promise<any> {
    // Simulate different execution patterns based on actor type
    const executionDelay = this.getActorExecutionDelay(actor.type)
    await new Promise(resolve => setTimeout(resolve, executionDelay))

    // Security validation
    if (task.type === 'command' && this.config.security.allowedCommands.length > 0) {
      const command = task.payload?.command
      if (command && !this.config.security.allowedCommands.includes(command)) {
        throw new Error(`Command not allowed: ${command}`)
      }
    }

    // Generate mock result based on actor type
    return this.generateActorResult(actor, task, context)
  }

  private getActorExecutionDelay(actorType: string): number {
    const delays: Record<string, number> = {
      'workflow': 200,
      'command': 100,
      'file': 50,
      'ai': 400
    }

    return delays[actorType] || 100
  }

  private generateActorResult(actor: any, task: any, context: any): any {
    const baseResult = {
      actorId: actor.id,
      actorType: actor.type,
      taskId: task.id,
      timestamp: Date.now(),
      context: context.project
    }

    switch (actor.type) {
      case 'workflow':
        return {
          ...baseResult,
          workflowSteps: task.payload?.steps || [],
          completedSteps: Math.floor(Math.random() * 5) + 1,
          status: 'completed'
        }

      case 'command':
        return {
          ...baseResult,
          command: task.payload?.command || 'mock-command',
          exitCode: 0,
          output: 'Mock command executed successfully',
          workingDirectory: context.project?.root
        }

      case 'file':
        return {
          ...baseResult,
          operation: task.payload?.operation || 'read',
          filePath: task.payload?.path || '/mock/file.txt',
          size: Math.floor(Math.random() * 1000) + 100,
          permissions: 'readable'
        }

      case 'ai':
        return {
          ...baseResult,
          aiCapabilities: context.ai?.capabilities || [],
          response: 'Mock AI response',
          tokens: Math.floor(Math.random() * 1000) + 100,
          model: 'mock-ai-model'
        }

      default:
        return {
          ...baseResult,
          result: task.payload,
          processed: true
        }
    }
  }

  private updatePerformanceMetrics(executionTime: number, success: boolean): void {
    // Update average response time
    const totalTasks = this.getTotalCompletedTasks()
    const currentAvg = this.metrics.averageResponseTime
    this.metrics.averageResponseTime = 
      (currentAvg * (totalTasks - 1) + executionTime) / totalTasks

    // Update error rate
    if (!success) {
      const totalErrors = Math.floor(totalTasks * this.metrics.errorRate) + 1
      this.metrics.errorRate = totalErrors / totalTasks
    }

    // Update throughput (tasks per second)
    this.metrics.taskThroughput = totalTasks / (this.metrics.uptime / 1000)
  }

  private getTotalCompletedTasks(): number {
    return Array.from(this.actors.values())
      .reduce((total, actor) => total + actor.tasksCompleted, 0)
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.metrics.cpuUsage = Math.random() * 0.5 + 0.1 // 10-60%
      this.metrics.memoryUsage = process.memoryUsage().heapUsed
      this.metrics.uptime += this.config.performance.metricsInterval

      this.emit('performance:update', this.metrics)
    }, this.config.performance.metricsInterval)
  }

  private startAuditing(): void {
    this.on('actor:task:started', (event) => {
      this.auditLogs.push({
        timestamp: Date.now(),
        type: 'actor:task:started',
        ...event
      })
    })

    this.on('actor:task:completed', (event) => {
      this.auditLogs.push({
        timestamp: Date.now(),
        type: 'actor:task:completed',
        ...event
      })
    })

    // Keep audit logs bounded
    setInterval(() => {
      if (this.auditLogs.length > 10000) {
        this.auditLogs.splice(0, 5000) // Remove oldest 5000 entries
      }
    }, 60000)
  }

  getSystemStatus(): SystemStatus {
    const totalActors = this.actors.size
    const activeActors = Array.from(this.actors.values())
      .filter(actor => actor.status === 'active').length

    return {
      actors: {
        total: totalActors,
        active: activeActors,
        idle: totalActors - activeActors
      },
      activeWorkflows: this.workflows.size,
      auditLogCount: this.auditLogs.length
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getActorCount(): number {
    return this.actors.size
  }

  createWorkflow(id: string, definition: any): void {
    this.workflows.set(id, {
      id,
      definition,
      status: 'ready',
      createdAt: Date.now(),
      steps: definition.steps || []
    })

    this.emit('workflow:created', { workflowId: id })
  }

  async executeWorkflow(id: string, context: any): Promise<any> {
    const workflow = this.workflows.get(id)
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`)
    }

    workflow.status = 'running'
    const startTime = Date.now()

    try {
      const results = []
      
      for (const step of workflow.steps) {
        const stepResult = await this.executeAgileTask(step, context)
        results.push(stepResult)
      }

      workflow.status = 'completed'
      workflow.completedAt = Date.now()
      
      this.emit('workflow:completed', { workflowId: id, results })
      
      return {
        workflowId: id,
        results,
        executionTime: Date.now() - startTime,
        status: 'completed'
      }
    } catch (error) {
      workflow.status = 'failed'
      workflow.error = error instanceof Error ? error.message : String(error)
      
      this.emit('workflow:failed', { workflowId: id, error })
      throw error
    }
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true

    // Cancel all active workflows
    for (const workflow of this.workflows.values()) {
      if (workflow.status === 'running') {
        workflow.status = 'cancelled'
      }
    }

    // Mark all actors as shutting down
    for (const actor of this.actors.values()) {
      actor.status = 'shutting_down'
    }

    // Wait a bit for any active tasks to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    this.actors.clear()
    this.workflows.clear()
    this.auditLogs.length = 0

    this.emit('shutdown:complete')
  }
}