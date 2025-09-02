import type { Task, TaskPriority, PriorityQueueConfig, QueueMetrics } from '@agile/types'

/**
 * High-performance priority queue with multiple priority levels
 */
export class PriorityQueue {
  private queues: Map<TaskPriority, Task[]> = new Map()
  private priorities: TaskPriority[]
  private maxSize: number
  private timeoutMs: number
  private metrics: QueueMetrics

  constructor(config: PriorityQueueConfig) {
    this.maxSize = config.maxSize
    this.timeoutMs = config.timeoutMs
    this.priorities = config.priorities.sort((a, b) => b - a) // Highest priority first
    
    // Initialize priority queues
    this.priorities.forEach(priority => {
      this.queues.set(priority, [])
    })

    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageWaitTime: 0,
      currentSize: 0,
      maxSize: this.maxSize,
      throughput: 0
    }
  }

  /**
   * Add task to appropriate priority queue
   */
  enqueue(task: Task): void {
    if (this.size() >= this.maxSize) {
      throw new Error('Queue is full')
    }

    const priority = task.priority || TaskPriority.NORMAL
    const queue = this.queues.get(priority)
    
    if (!queue) {
      // Add to normal priority if priority not found
      const normalQueue = this.queues.get(TaskPriority.NORMAL)
      if (normalQueue) {
        normalQueue.push({ ...task, queuedAt: Date.now() })
      }
    } else {
      queue.push({ ...task, queuedAt: Date.now() })
    }

    this.metrics.totalTasks++
    this.metrics.currentSize = this.size()
  }

  /**
   * Get highest priority task
   */
  dequeue(): Task | null {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority)
      if (queue && queue.length > 0) {
        const task = queue.shift()!
        this.metrics.currentSize = this.size()
        
        // Calculate wait time
        if ((task as any).queuedAt) {
          const waitTime = Date.now() - (task as any).queuedAt
          this.updateAverageWaitTime(waitTime)
        }
        
        return task
      }
    }
    
    return null
  }

  /**
   * Peek at next task without removing it
   */
  peek(): Task | null {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority)
      if (queue && queue.length > 0) {
        return queue[0]
      }
    }
    
    return null
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.size() === 0
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.size() >= this.maxSize
  }

  /**
   * Get total size across all priority queues
   */
  size(): number {
    let total = 0
    for (const queue of this.queues.values()) {
      total += queue.length
    }
    return total
  }

  /**
   * Get size of specific priority queue
   */
  sizeByPriority(priority: TaskPriority): number {
    const queue = this.queues.get(priority)
    return queue ? queue.length : 0
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.queues.forEach(queue => queue.length = 0)
    this.metrics.currentSize = 0
  }

  /**
   * Remove tasks older than timeout
   */
  cleanupExpiredTasks(): number {
    const now = Date.now()
    let removedCount = 0

    this.queues.forEach(queue => {
      const initialLength = queue.length
      
      // Filter out expired tasks
      for (let i = queue.length - 1; i >= 0; i--) {
        const task = queue[i] as any
        if (task.queuedAt && (now - task.queuedAt) > this.timeoutMs) {
          queue.splice(i, 1)
          removedCount++
          this.metrics.failedTasks++
        }
      }
    })

    this.metrics.currentSize = this.size()
    return removedCount
  }

  /**
   * Get tasks by priority level
   */
  getTasksByPriority(priority: TaskPriority): Task[] {
    const queue = this.queues.get(priority)
    return queue ? [...queue] : []
  }

  /**
   * Update average wait time
   */
  private updateAverageWaitTime(newWaitTime: number): void {
    const currentAvg = this.metrics.averageWaitTime
    const completedTasks = this.metrics.completedTasks
    
    this.metrics.averageWaitTime = 
      (currentAvg * completedTasks + newWaitTime) / (completedTasks + 1)
    
    this.metrics.completedTasks++
  }

  /**
   * Calculate throughput (tasks per second over last minute)
   */
  calculateThroughput(): number {
    // This would be implemented with a sliding window in production
    // For now, return a simple estimate
    const timeWindow = 60 // seconds
    return this.metrics.completedTasks / timeWindow
  }

  /**
   * Get queue statistics
   */
  getMetrics(): QueueMetrics {
    this.metrics.throughput = this.calculateThroughput()
    return { ...this.metrics }
  }

  /**
   * Get detailed queue status
   */
  getStatus() {
    const priorityBreakdown: Record<string, number> = {}
    
    this.priorities.forEach(priority => {
      priorityBreakdown[`priority_${priority}`] = this.sizeByPriority(priority)
    })

    return {
      totalSize: this.size(),
      maxSize: this.maxSize,
      isEmpty: this.isEmpty(),
      isFull: this.isFull(),
      priorityBreakdown,
      metrics: this.getMetrics()
    }
  }

  /**
   * Resize the queue
   */
  resize(newMaxSize: number): void {
    if (newMaxSize < this.size()) {
      throw new Error('Cannot resize queue smaller than current size')
    }
    
    this.maxSize = newMaxSize
    this.metrics.maxSize = newMaxSize
  }

  /**
   * Move task to different priority
   */
  changePriority(taskId: string, newPriority: TaskPriority): boolean {
    // Find and remove task from current queue
    let foundTask: Task | null = null
    
    for (const [priority, queue] of this.queues.entries()) {
      const taskIndex = queue.findIndex(task => task.id === taskId)
      if (taskIndex !== -1) {
        foundTask = queue.splice(taskIndex, 1)[0]
        break
      }
    }
    
    if (foundTask) {
      // Add to new priority queue
      foundTask.priority = newPriority
      this.enqueue(foundTask)
      return true
    }
    
    return false
  }

  /**
   * Get tasks matching predicate
   */
  findTasks(predicate: (task: Task) => boolean): Task[] {
    const results: Task[] = []
    
    for (const queue of this.queues.values()) {
      results.push(...queue.filter(predicate))
    }
    
    return results
  }

  /**
   * Remove tasks matching predicate
   */
  removeTasks(predicate: (task: Task) => boolean): number {
    let removedCount = 0
    
    this.queues.forEach(queue => {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (predicate(queue[i])) {
          queue.splice(i, 1)
          removedCount++
        }
      }
    })
    
    this.metrics.currentSize = this.size()
    return removedCount
  }
}