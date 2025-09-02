import type { 
  Task, 
  WorkerInstance, 
  RoutingStrategy, 
  RoutingDecision,
  TaskType 
} from '@agile/types'

/**
 * Intelligent task router with multiple routing strategies
 */
export class TaskRouter {
  private strategy: RoutingStrategy
  private routingHistory: Map<string, number> = new Map()
  private performanceMetrics: Map<string, number[]> = new Map()

  constructor(strategy: RoutingStrategy = 'least-loaded') {
    this.strategy = strategy
  }

  /**
   * Select the best worker for a task
   */
  selectWorker(
    task: Task,
    workers: Map<string, WorkerInstance>,
    availableWorkers: Set<string>
  ): WorkerInstance | null {
    const availableWorkerList = Array.from(availableWorkers)
      .map(id => workers.get(id))
      .filter(worker => worker && worker.status === 'idle') as WorkerInstance[]

    if (availableWorkerList.length === 0) {
      return null
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobinSelection(availableWorkerList)
      
      case 'least-loaded':
        return this.leastLoadedSelection(availableWorkerList)
      
      case 'capability-based':
        return this.capabilityBasedSelection(task, availableWorkerList)
      
      case 'predictive':
        return this.predictiveSelection(task, availableWorkerList)
      
      case 'affinity':
        return this.affinitySelection(task, availableWorkerList)
      
      default:
        return availableWorkerList[0]
    }
  }

  /**
   * Round-robin worker selection
   */
  private roundRobinSelection(workers: WorkerInstance[]): WorkerInstance {
    const lastUsed = this.routingHistory.get('round-robin') || 0
    const nextIndex = (lastUsed + 1) % workers.length
    this.routingHistory.set('round-robin', nextIndex)
    
    return workers[nextIndex]
  }

  /**
   * Least loaded worker selection
   */
  private leastLoadedSelection(workers: WorkerInstance[]): WorkerInstance {
    return workers.reduce((leastLoaded, current) => {
      const currentLoad = this.calculateWorkerLoad(current)
      const leastLoadedLoad = this.calculateWorkerLoad(leastLoaded)
      
      return currentLoad < leastLoadedLoad ? current : leastLoaded
    })
  }

  /**
   * Capability-based worker selection
   */
  private capabilityBasedSelection(task: Task, workers: WorkerInstance[]): WorkerInstance {
    // Filter workers by task type capability
    const capableWorkers = workers.filter(worker => 
      worker.capabilities.has(task.type) || worker.capabilities.has('general')
    )
    
    if (capableWorkers.length === 0) {
      // Fallback to any available worker
      return workers[0]
    }
    
    // Among capable workers, select least loaded
    return this.leastLoadedSelection(capableWorkers)
  }

  /**
   * Predictive worker selection based on performance history
   */
  private predictiveSelection(task: Task, workers: WorkerInstance[]): WorkerInstance {
    let bestWorker = workers[0]
    let bestScore = -1
    
    for (const worker of workers) {
      const score = this.calculatePredictiveScore(task, worker)
      if (score > bestScore) {
        bestScore = score
        bestWorker = worker
      }
    }
    
    return bestWorker
  }

  /**
   * Affinity-based worker selection (tasks of same type go to same worker when possible)
   */
  private affinitySelection(task: Task, workers: WorkerInstance[]): WorkerInstance {
    // Check if any worker has handled this task type recently
    const affinityWorker = workers.find(worker => {
      const recentTasks = worker.taskHistory.slice(-5)
      return recentTasks.some(t => t.type === task.type)
    })
    
    if (affinityWorker) {
      return affinityWorker
    }
    
    // Fallback to least loaded
    return this.leastLoadedSelection(workers)
  }

  /**
   * Calculate worker load score
   */
  private calculateWorkerLoad(worker: WorkerInstance): number {
    // Combine multiple factors into load score
    const taskLoad = worker.taskHistory.length / 100 // Task history weight
    const avgExecutionTime = worker.metrics.averageExecutionTime / 1000 // Normalize to seconds
    const errorRate = worker.metrics.tasksErrored / Math.max(worker.metrics.tasksCompleted, 1)
    
    return taskLoad + (avgExecutionTime * 0.5) + (errorRate * 2)
  }

  /**
   * Calculate predictive score for worker-task combination
   */
  private calculatePredictiveScore(task: Task, worker: WorkerInstance): number {
    let score = 100 // Base score
    
    // Capability match bonus
    if (worker.capabilities.has(task.type)) {
      score += 20
    }
    
    // Performance history bonus
    const taskTypeHistory = worker.taskHistory
      .filter(t => t.type === task.type)
      .slice(-10) // Last 10 tasks of this type
    
    if (taskTypeHistory.length > 0) {
      const avgTime = taskTypeHistory.reduce((sum, t) => sum + t.executionTime, 0) / taskTypeHistory.length
      const successRate = taskTypeHistory.filter(t => t.success).length / taskTypeHistory.length
      
      // Faster execution and higher success rate = higher score
      score += (1000 / Math.max(avgTime, 1)) * 10 // Speed bonus
      score += successRate * 30 // Success rate bonus
    }
    
    // Current load penalty
    const currentLoad = this.calculateWorkerLoad(worker)
    score -= currentLoad * 10
    
    // Health bonus
    if (worker.isHealthy) {
      score += 10
    }
    
    return score
  }

  /**
   * Update routing strategy
   */
  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy
  }

  /**
   * Get current strategy
   */
  getStrategy(): RoutingStrategy {
    return this.strategy
  }

  /**
   * Record routing decision for analysis
   */
  recordRoutingDecision(decision: RoutingDecision): void {
    const key = `${this.strategy}-${decision.workerId}`
    const metrics = this.performanceMetrics.get(key) || []
    
    if (decision.estimatedExecutionTime) {
      metrics.push(decision.estimatedExecutionTime)
      
      // Keep only last 100 decisions
      if (metrics.length > 100) {
        metrics.shift()
      }
      
      this.performanceMetrics.set(key, metrics)
    }
  }

  /**
   * Get routing statistics
   */
  getRoutingStats() {
    const stats = {
      strategy: this.strategy,
      totalDecisions: 0,
      averageConfidence: 0,
      workerDistribution: new Map<string, number>()
    }
    
    for (const [key, metrics] of this.performanceMetrics.entries()) {
      const workerId = key.split('-').slice(1).join('-')
      stats.totalDecisions += metrics.length
      stats.workerDistribution.set(workerId, metrics.length)
    }
    
    return stats
  }

  /**
   * Reset routing history and metrics
   */
  reset(): void {
    this.routingHistory.clear()
    this.performanceMetrics.clear()
  }
}