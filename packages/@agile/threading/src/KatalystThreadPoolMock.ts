import { EventEmitter } from 'eventemitter3'
import { nanoid } from 'nanoid'
import type { 
  Task, 
  ThreadPoolConfig
} from '@agile/types'
import { PriorityQueue } from './PriorityQueue'

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

/**
 * Mock implementation of KatalystThreadPool for development/testing
 * This provides the same interface but uses simple Promise-based execution
 */
export class KatalystThreadPool extends EventEmitter<{
  'ready': []
  'task:queued': [{ taskId: string; priority?: number }]
  'task:completed': [{ taskId: string; executionTime: number; success: boolean }]
  'task:failed': [{ taskId: string; error: string; executionTime: number }]
  'error': [{ type: string; error: string }]
  'metrics': [ThreadPoolMetrics]
  'terminated': []
}> {
  private config: Required<ThreadPoolConfig>
  private taskQueue: PriorityQueue
  private metrics: ThreadPoolMetrics
  private isShuttingDown: boolean = false
  private workerCount: number
  private activeWorkers: number = 0

  constructor(config: Partial<ThreadPoolConfig> = {}) {
    super()

    this.config = {
      size: config.size || 4,
      maxQueueSize: config.maxQueueSize || 1000,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3
    }

    this.workerCount = this.config.size

    this.taskQueue = new PriorityQueue({
      maxSize: this.config.maxQueueSize,
      priorities: [1, 5, 8, 10],
      timeoutMs: this.config.timeout,
      metrics: true
    })

    this.metrics = {
      totalWorkers: this.workerCount,
      activeWorkers: 0,
      idleWorkers: this.workerCount,
      queueSize: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskTime: 0,
      throughput: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
      lastUpdate: Date.now()
    }

    this.initialize()
  }

  private initialize(): void {
    this.startMetricsCollection()
    setTimeout(() => this.emit('ready'), 100)
  }

  async execute<T = any>(task: Task): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('KatalystThreadPool is shutting down')
    }

    const taskId = task.id || nanoid()
    const startTime = Date.now()

    // Check if we can execute immediately or need to queue
    if (this.activeWorkers >= this.workerCount) {
      return new Promise((resolve, reject) => {
        const queuedTask = {
          ...task,
          id: taskId,
          resolve,
          reject,
          createdAt: startTime
        }
        
        this.taskQueue.enqueue(queuedTask)
        this.emit('task:queued', { taskId, priority: task.priority })
        
        // Try to process queue
        this.processQueue()
      })
    }

    return this.executeTask(task, taskId, startTime)
  }

  private async executeTask<T>(task: Task, taskId: string, startTime: number): Promise<T> {
    this.activeWorkers++
    this.updateWorkerMetrics()

    try {
      // Simulate task execution with timeout
      const timeout = task.timeout || this.config.timeout
      const result = await Promise.race([
        this.simulateTaskExecution(task),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Task ${taskId} timed out`)), timeout)
        )
      ])

      const executionTime = Date.now() - startTime
      this.updateTaskMetrics('completed', executionTime)

      this.emit('task:completed', {
        taskId,
        executionTime,
        success: true
      })

      return result as T
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.updateTaskMetrics('failed', executionTime)

      this.emit('task:failed', {
        taskId,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      })

      throw error
    } finally {
      this.activeWorkers--
      this.updateWorkerMetrics()
      
      // Try to process more queued tasks
      this.processQueue()
    }
  }

  private async processQueue(): void {
    if (this.activeWorkers >= this.workerCount || this.taskQueue.isEmpty()) {
      return
    }

    const task = this.taskQueue.dequeue()
    if (!task) return

    try {
      const result = await this.executeTask(task, task.id, task.createdAt || Date.now())
      if (task.resolve) {
        task.resolve(result)
      }
    } catch (error) {
      if (task.reject) {
        task.reject(error)
      }
    }
  }

  private async simulateTaskExecution(task: Task): Promise<any> {
    // Simulate different execution times based on task type
    const baseDelay = this.getExecutionDelay(task.type)
    const jitter = Math.random() * 50 // Add some randomness
    const delay = baseDelay + jitter

    await new Promise(resolve => setTimeout(resolve, delay))

    // Mock result based on task type
    return this.generateMockResult(task)
  }

  private getExecutionDelay(taskType: string): number {
    const delays: Record<string, number> = {
      'compute': 100,
      'io': 50,
      'network': 150,
      'ai': 300,
      'file': 25,
      'workflow': 200,
      'command': 75,
      'generic': 50
    }

    return delays[taskType] || delays['generic']
  }

  private generateMockResult(task: Task): any {
    const baseResult = {
      taskId: task.id,
      type: task.type,
      processed: true,
      timestamp: Date.now(),
      payload: task.payload
    }

    // Add task-type-specific mock data
    switch (task.type) {
      case 'compute':
        return {
          ...baseResult,
          result: task.payload.operation ? `Computed: ${task.payload.operation}` : 'Computation complete',
          computeTime: Math.random() * 100 + 50
        }

      case 'ai':
        return {
          ...baseResult,
          prediction: Math.random(),
          confidence: Math.random() * 0.4 + 0.6,
          model: 'mock-ai-model-v1.0'
        }

      case 'file':
        return {
          ...baseResult,
          filePath: task.payload.path || '/mock/file/path',
          operation: task.payload.operation || 'read',
          size: Math.floor(Math.random() * 1000) + 100
        }

      case 'command':
        return {
          ...baseResult,
          command: task.payload.command || 'mock-command',
          exitCode: 0,
          stdout: 'Mock command output',
          stderr: ''
        }

      default:
        return baseResult
    }
  }

  async parallel<T = any>(tasks: Task[]): Promise<T[]> {
    const promises = tasks.map(task => this.execute<T>(task))
    return Promise.all(promises)
  }

  private updateWorkerMetrics(): void {
    this.metrics.totalWorkers = this.workerCount
    this.metrics.activeWorkers = this.activeWorkers
    this.metrics.idleWorkers = this.workerCount - this.activeWorkers
    this.metrics.queueSize = this.taskQueue.size()
  }

  private updateTaskMetrics(type: 'completed' | 'failed', executionTime: number): void {
    if (type === 'completed') {
      this.metrics.completedTasks++
    } else {
      this.metrics.failedTasks++
    }

    // Update average execution time
    const totalTasks = this.metrics.completedTasks + this.metrics.failedTasks
    const currentAvg = this.metrics.averageTaskTime
    this.metrics.averageTaskTime = 
      (currentAvg * (totalTasks - 1) + executionTime) / totalTasks
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics()
      this.emit('metrics', this.metrics)
    }, 5000)
  }

  private updateMetrics(): void {
    this.updateWorkerMetrics()
    this.metrics.lastUpdate = Date.now()
    
    // Calculate throughput (tasks per second over last minute)
    const timeWindow = 60000
    this.metrics.throughput = this.metrics.completedTasks / (timeWindow / 1000)
    
    // Memory usage
    this.metrics.memoryUsage = process.memoryUsage().heapUsed
    this.metrics.uptime = Date.now() - (this.metrics.lastUpdate - timeWindow)
    
    // Mock CPU usage
    this.metrics.cpuUsage = Math.random() * 0.3 + 0.1 // 10-40%
  }

  getStatus() {
    return {
      pools: {
        'mock-pool': {
          size: this.workerCount,
          type: 'mock-workers'
        }
      },
      queued: this.taskQueue.size(),
      isHealthy: !this.isShuttingDown,
      actorCount: this.workerCount,
      isShuttingDown: this.isShuttingDown
    }
  }

  getMetrics(): ThreadPoolMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }

  async terminate(): Promise<void> {
    this.isShuttingDown = true
    
    // Clear the queue and reject pending tasks
    while (!this.taskQueue.isEmpty()) {
      const task = this.taskQueue.dequeue()
      if (task && task.reject) {
        task.reject(new Error('ThreadPool is shutting down'))
      }
    }
    
    // Wait for active workers to finish (with timeout)
    const maxWaitTime = 5000
    const startTime = Date.now()
    
    while (this.activeWorkers > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    this.emit('terminated')
  }
}