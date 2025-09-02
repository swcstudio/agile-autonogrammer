import { EventEmitter } from 'eventemitter3'
import { Worker } from 'worker_threads'
import { performance } from 'perf_hooks'
import { nanoid } from 'nanoid'
import type { 
  Task, 
  TaskResult, 
  ThreadPoolConfig, 
  WorkerInstance, 
  ThreadPoolMetrics,
  WorkerStatus,
  TaskType
} from '@agile/types'
import { TaskRouter } from './TaskRouter'
import { PriorityQueue } from './PriorityQueue'

/**
 * High-performance thread pool with dynamic scaling and intelligent routing
 */
export class ThreadPool extends EventEmitter {
  private config: ThreadPoolConfig
  private workers: Map<string, WorkerInstance> = new Map()
  private availableWorkers: Set<string> = new Set()
  private taskQueue: PriorityQueue
  private taskRouter: TaskRouter
  private isShuttingDown: boolean = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private metrics: ThreadPoolMetrics

  constructor(config: Partial<ThreadPoolConfig> = {}) {
    super()
    
    this.config = {
      size: config.size || 4,
      maxQueueSize: config.maxQueueSize || 1000,
      taskTimeout: config.taskTimeout || 30000,
      healthCheckInterval: config.healthCheckInterval || 10000,
      scaling: config.scaling || {
        enabled: true,
        minWorkers: 2,
        maxWorkers: 16,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.2,
        scaleUpDelay: 5000,
        scaleDownDelay: 30000
      },
      routingStrategy: config.routingStrategy || 'least-loaded',
      workerPath: config.workerPath || './workers/universal.js'
    }

    this.taskQueue = new PriorityQueue({
      maxSize: this.config.maxQueueSize,
      priorities: [1, 5, 8, 10], // LOW, NORMAL, HIGH, CRITICAL
      timeoutMs: this.config.taskTimeout,
      metrics: true
    })

    this.taskRouter = new TaskRouter(this.config.routingStrategy)

    this.metrics = {
      totalWorkers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
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

  /**
   * Initialize the thread pool
   */
  private async initialize(): Promise<void> {
    // Create initial workers
    for (let i = 0; i < this.config.size; i++) {
      await this.createWorker()
    }

    // Start health monitoring
    if (this.config.healthCheckInterval > 0) {
      this.startHealthCheck()
    }

    // Start metrics collection
    this.startMetricsCollection()

    this.emit('ready')
  }

  /**
   * Execute a single task
   */
  async execute<T = any>(task: Task): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('ThreadPool is shutting down')
    }

    return new Promise((resolve, reject) => {
      const taskWithCallbacks = {
        ...task,
        id: task.id || nanoid(),
        resolve,
        reject,
        createdAt: Date.now()
      }

      // Try immediate execution if worker available
      const worker = this.taskRouter.selectWorker(task, this.workers, this.availableWorkers)
      
      if (worker && this.availableWorkers.has(worker.id)) {
        this.executeTaskOnWorker(taskWithCallbacks, worker)
      } else {
        // Queue the task
        try {
          this.taskQueue.enqueue(taskWithCallbacks)
          this.emit('task:queued', { taskId: task.id, priority: task.priority })
          
          // Check if we need to scale up
          if (this.shouldScaleUp()) {
            this.scaleUp()
          }
        } catch (error) {
          reject(error)
        }
      }
    })
  }

  /**
   * Execute multiple tasks in parallel
   */
  async parallel<T = any>(tasks: Task[]): Promise<T[]> {
    return Promise.all(tasks.map(task => this.execute<T>(task)))
  }

  /**
   * Execute task on specific worker
   */
  private executeTaskOnWorker(task: any, worker: WorkerInstance): void {
    this.availableWorkers.delete(worker.id)
    worker.status = 'busy'
    worker.currentTask = task

    const startTime = performance.now()

    worker.thread.postMessage({
      type: 'task',
      task: {
        id: task.id,
        type: task.type,
        payload: task.payload,
        timeout: task.timeout || this.config.taskTimeout
      }
    })

    this.emit('task:started', { taskId: task.id, workerId: worker.id })

    // Set timeout
    const timeout = setTimeout(() => {
      this.handleTaskTimeout(task, worker)
    }, task.timeout || this.config.taskTimeout)

    // Handle worker message
    const messageHandler = (message: any) => {
      if (message.taskId === task.id) {
        clearTimeout(timeout)
        worker.thread.off('message', messageHandler)
        
        const executionTime = performance.now() - startTime
        this.handleTaskCompletion(task, worker, message, executionTime)
      }
    }

    worker.thread.on('message', messageHandler)
  }

  /**
   * Handle task completion
   */
  private handleTaskCompletion(
    task: any, 
    worker: WorkerInstance, 
    message: any, 
    executionTime: number
  ): void {
    // Update worker state
    worker.status = 'idle'
    worker.currentTask = null
    worker.metrics.tasksCompleted++
    worker.metrics.totalExecutionTime += executionTime
    worker.metrics.averageExecutionTime = 
      worker.metrics.totalExecutionTime / worker.metrics.tasksCompleted
    worker.metrics.lastTaskTime = Date.now()

    // Add worker back to available pool
    this.availableWorkers.add(worker.id)

    // Update metrics
    if (message.success) {
      this.metrics.completedTasks++
      task.resolve(message.result)
    } else {
      this.metrics.failedTasks++
      task.reject(new Error(message.error || 'Task failed'))
    }

    this.emit('task:completed', {
      taskId: task.id,
      workerId: worker.id,
      success: message.success,
      executionTime
    })

    // Process next task from queue
    this.processQueue()

    // Check if we should scale down
    if (this.shouldScaleDown()) {
      this.scaleDown()
    }
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(task: any, worker: WorkerInstance): void {
    this.emit('task:timeout', { taskId: task.id, workerId: worker.id })
    
    // Terminate and replace worker
    this.terminateWorker(worker.id)
    this.createWorker()
    
    task.reject(new Error('Task timeout'))
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    while (!this.taskQueue.isEmpty() && this.availableWorkers.size > 0) {
      const task = this.taskQueue.dequeue()
      if (!task) break

      const worker = this.taskRouter.selectWorker(task, this.workers, this.availableWorkers)
      if (worker && this.availableWorkers.has(worker.id)) {
        this.executeTaskOnWorker(task, worker)
      }
    }
  }

  /**
   * Create a new worker
   */
  private async createWorker(): Promise<WorkerInstance> {
    const workerId = nanoid()
    
    try {
      const thread = new Worker(this.config.workerPath, {
        workerData: { workerId }
      })

      const worker: WorkerInstance = {
        id: workerId,
        thread,
        status: 'initializing',
        capabilities: new Set(['general']), // Default capabilities
        currentTask: null,
        taskHistory: [],
        metrics: {
          tasksCompleted: 0,
          tasksErrored: 0,
          totalExecutionTime: 0,
          averageExecutionTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          lastTaskTime: 0,
          uptime: Date.now()
        },
        lastHealthCheck: Date.now(),
        isHealthy: true
      }

      // Setup event handlers
      thread.on('message', (message) => {
        if (message.type === 'ready') {
          worker.status = 'idle'
          this.availableWorkers.add(workerId)
          this.emit('worker:created', { workerId })
        } else if (message.type === 'error') {
          worker.status = 'error'
          this.handleWorkerError(workerId, new Error(message.error))
        }
      })

      thread.on('error', (error) => {
        this.handleWorkerError(workerId, error)
      })

      thread.on('exit', (code) => {
        if (code !== 0) {
          this.handleWorkerError(workerId, new Error(`Worker exited with code ${code}`))
        }
      })

      this.workers.set(workerId, worker)
      this.updateMetrics()

      return worker

    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerId: string, error: Error): void {
    this.emit('worker:error', { workerId, error })
    
    // Remove from available workers
    this.availableWorkers.delete(workerId)
    
    // If not shutting down, replace the worker
    if (!this.isShuttingDown) {
      this.terminateWorker(workerId)
      this.createWorker()
    }
  }

  /**
   * Terminate a worker
   */
  private terminateWorker(workerId: string): void {
    const worker = this.workers.get(workerId)
    if (!worker) return

    worker.status = 'terminating'
    this.availableWorkers.delete(workerId)
    
    try {
      worker.thread.terminate()
    } catch (error) {
      // Ignore termination errors
    }
    
    this.workers.delete(workerId)
    this.updateMetrics()
    
    this.emit('worker:terminated', { workerId, reason: 'manual' })
  }

  /**
   * Check if should scale up
   */
  private shouldScaleUp(): boolean {
    if (!this.config.scaling.enabled) return false
    
    const queueUtilization = this.taskQueue.size() / this.config.maxQueueSize
    const workerUtilization = (this.workers.size - this.availableWorkers.size) / this.workers.size
    
    return (
      this.workers.size < this.config.scaling.maxWorkers &&
      (queueUtilization > this.config.scaling.scaleUpThreshold ||
       workerUtilization > this.config.scaling.scaleUpThreshold)
    )
  }

  /**
   * Check if should scale down
   */
  private shouldScaleDown(): boolean {
    if (!this.config.scaling.enabled) return false
    
    const workerUtilization = (this.workers.size - this.availableWorkers.size) / this.workers.size
    
    return (
      this.workers.size > this.config.scaling.minWorkers &&
      workerUtilization < this.config.scaling.scaleDownThreshold &&
      this.taskQueue.isEmpty()
    )
  }

  /**
   * Scale up workers
   */
  private async scaleUp(): Promise<void> {
    if (this.workers.size >= this.config.scaling.maxWorkers) return
    
    const targetSize = Math.min(
      this.workers.size + 1,
      this.config.scaling.maxWorkers
    )
    
    this.emit('scaling:up', { 
      currentSize: this.workers.size, 
      targetSize 
    })
    
    await this.createWorker()
  }

  /**
   * Scale down workers
   */
  private scaleDown(): void {
    if (this.workers.size <= this.config.scaling.minWorkers) return
    
    // Find idle worker to terminate
    for (const [workerId, worker] of this.workers.entries()) {
      if (worker.status === 'idle' && this.availableWorkers.has(workerId)) {
        this.emit('scaling:down', {
          currentSize: this.workers.size,
          targetSize: this.workers.size - 1
        })
        
        this.terminateWorker(workerId)
        break
      }
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health check on all workers
   */
  private performHealthCheck(): void {
    for (const [workerId, worker] of this.workers.entries()) {
      // Check if worker is responsive
      const now = Date.now()
      const timeSinceLastTask = now - worker.metrics.lastTaskTime
      
      // If worker has been idle too long and we have excess capacity
      if (
        worker.status === 'idle' &&
        timeSinceLastTask > 60000 && // 1 minute
        this.workers.size > this.config.scaling.minWorkers
      ) {
        worker.isHealthy = false
        this.terminateWorker(workerId)
        continue
      }
      
      // Update health status
      worker.lastHealthCheck = now
      worker.isHealthy = worker.status !== 'error'
      
      this.emit('worker:health', {
        workerId,
        healthy: worker.isHealthy
      })
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics()
      this.emit('metrics', this.metrics)
    }, 5000)
  }

  /**
   * Update thread pool metrics
   */
  private updateMetrics(): void {
    const now = Date.now()
    
    this.metrics = {
      totalWorkers: this.workers.size,
      activeWorkers: this.workers.size - this.availableWorkers.size,
      idleWorkers: this.availableWorkers.size,
      queueSize: this.taskQueue.size(),
      completedTasks: this.metrics.completedTasks,
      failedTasks: this.metrics.failedTasks,
      averageTaskTime: this.calculateAverageTaskTime(),
      throughput: this.calculateThroughput(),
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user,
      uptime: now - this.metrics.lastUpdate,
      lastUpdate: now
    }
  }

  /**
   * Calculate average task execution time
   */
  private calculateAverageTaskTime(): number {
    let totalTime = 0
    let totalTasks = 0
    
    for (const worker of this.workers.values()) {
      totalTime += worker.metrics.totalExecutionTime
      totalTasks += worker.metrics.tasksCompleted
    }
    
    return totalTasks > 0 ? totalTime / totalTasks : 0
  }

  /**
   * Calculate throughput (tasks per second)
   */
  private calculateThroughput(): number {
    const timeWindow = 60000 // 1 minute
    const now = Date.now()
    let recentTasks = 0
    
    for (const worker of this.workers.values()) {
      if (now - worker.metrics.lastTaskTime < timeWindow) {
        recentTasks += worker.metrics.tasksCompleted
      }
    }
    
    return recentTasks / (timeWindow / 1000)
  }

  /**
   * Get pool metrics
   */
  getPoolMetrics(): ThreadPoolMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      workers: this.workers.size,
      available: this.availableWorkers.size,
      queued: this.taskQueue.size(),
      isHealthy: this.workers.size > 0,
      isShuttingDown: this.isShuttingDown
    }
  }

  /**
   * Shutdown the thread pool
   */
  async terminate(): Promise<void> {
    this.isShuttingDown = true
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    
    // Clear the queue
    this.taskQueue.clear()
    
    // Terminate all workers
    const terminationPromises = Array.from(this.workers.keys()).map(workerId =>
      new Promise<void>((resolve) => {
        const worker = this.workers.get(workerId)
        if (worker) {
          worker.thread.once('exit', () => resolve())
          worker.thread.terminate()
        } else {
          resolve()
        }
      })
    )
    
    await Promise.all(terminationPromises)
    
    this.workers.clear()
    this.availableWorkers.clear()
    
    this.emit('terminated')
  }
}