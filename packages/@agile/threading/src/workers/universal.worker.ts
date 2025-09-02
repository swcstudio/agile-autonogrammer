import { parentPort, workerData } from 'worker_threads'

interface WorkerTask {
  id: string
  type: string
  payload: any
  timeout?: number
}

interface WorkerMessage {
  type: 'task' | 'terminate' | 'health'
  task?: WorkerTask
}

/**
 * Universal worker that can handle different types of tasks
 */
class UniversalWorker {
  private workerId: string
  private isProcessing: boolean = false
  private currentTaskId: string | null = null

  constructor(workerId: string) {
    this.workerId = workerId
    this.setupMessageHandling()
    this.notifyReady()
  }

  /**
   * Setup message handling from main thread
   */
  private setupMessageHandling(): void {
    if (!parentPort) {
      throw new Error('Worker must be run in worker thread')
    }

    parentPort.on('message', async (message: WorkerMessage) => {
      try {
        switch (message.type) {
          case 'task':
            if (message.task) {
              await this.executeTask(message.task)
            }
            break
          
          case 'health':
            this.respondHealth()
            break
          
          case 'terminate':
            this.terminate()
            break
        }
      } catch (error) {
        this.sendError(error as Error)
      }
    })
  }

  /**
   * Execute a task based on its type
   */
  private async executeTask(task: WorkerTask): Promise<void> {
    if (this.isProcessing) {
      this.sendTaskResult(task.id, false, 'Worker is busy')
      return
    }

    this.isProcessing = true
    this.currentTaskId = task.id

    try {
      const result = await this.processTaskByType(task)
      this.sendTaskResult(task.id, true, result)
    } catch (error) {
      this.sendTaskResult(task.id, false, (error as Error).message)
    } finally {
      this.isProcessing = false
      this.currentTaskId = null
    }
  }

  /**
   * Process task based on its type
   */
  private async processTaskByType(task: WorkerTask): Promise<any> {
    switch (task.type) {
      case 'compute':
        return this.handleComputeTask(task.payload)
      
      case 'io':
        return this.handleIOTask(task.payload)
      
      case 'transform':
        return this.handleTransformTask(task.payload)
      
      case 'network':
        return this.handleNetworkTask(task.payload)
      
      case 'ai':
        return this.handleAITask(task.payload)
      
      case 'general':
      default:
        return this.handleGeneralTask(task.payload)
    }
  }

  /**
   * Handle compute-intensive tasks
   */
  private async handleComputeTask(payload: any): Promise<any> {
    const { operation, data, params = {} } = payload

    switch (operation) {
      case 'hash':
        return this.computeHash(data, params.algorithm || 'sha256')
      
      case 'sort':
        return this.sortData(data, params.compareFn)
      
      case 'filter':
        return this.filterData(data, params.predicate)
      
      case 'map':
        return this.mapData(data, params.transform)
      
      case 'reduce':
        return this.reduceData(data, params.reducer, params.initialValue)
      
      case 'fibonacci':
        return this.computeFibonacci(params.n)
      
      case 'prime':
        return this.isPrime(params.n)
      
      default:
        throw new Error(`Unknown compute operation: ${operation}`)
    }
  }

  /**
   * Handle I/O tasks
   */
  private async handleIOTask(payload: any): Promise<any> {
    const { operation, data, params = {} } = payload

    switch (operation) {
      case 'read':
        return this.simulateFileRead(params.path, params.encoding)
      
      case 'write':
        return this.simulateFileWrite(params.path, data, params.encoding)
      
      case 'parse':
        return this.parseData(data, params.format)
      
      case 'serialize':
        return this.serializeData(data, params.format)
      
      default:
        throw new Error(`Unknown I/O operation: ${operation}`)
    }
  }

  /**
   * Handle data transformation tasks
   */
  private async handleTransformTask(payload: any): Promise<any> {
    const { operation, data, params = {} } = payload

    switch (operation) {
      case 'convert':
        return this.convertData(data, params.from, params.to)
      
      case 'validate':
        return this.validateData(data, params.schema)
      
      case 'sanitize':
        return this.sanitizeData(data, params.rules)
      
      case 'compress':
        return this.compressData(data, params.algorithm)
      
      case 'decompress':
        return this.decompressData(data, params.algorithm)
      
      default:
        throw new Error(`Unknown transform operation: ${operation}`)
    }
  }

  /**
   * Handle network tasks
   */
  private async handleNetworkTask(payload: any): Promise<any> {
    const { operation, params = {} } = payload

    switch (operation) {
      case 'http':
        return this.simulateHttpRequest(params.url, params.method, params.data)
      
      case 'ping':
        return this.simulatePing(params.host)
      
      default:
        throw new Error(`Unknown network operation: ${operation}`)
    }
  }

  /**
   * Handle AI/ML tasks
   */
  private async handleAITask(payload: any): Promise<any> {
    const { operation, data, params = {} } = payload

    switch (operation) {
      case 'classify':
        return this.simulateClassification(data, params.model)
      
      case 'predict':
        return this.simulatePrediction(data, params.model)
      
      case 'cluster':
        return this.simulateClustering(data, params.k)
      
      default:
        throw new Error(`Unknown AI operation: ${operation}`)
    }
  }

  /**
   * Handle general tasks
   */
  private async handleGeneralTask(payload: any): Promise<any> {
    // Echo the payload with some processing
    return {
      processed: true,
      timestamp: Date.now(),
      workerId: this.workerId,
      originalPayload: payload
    }
  }

  // Utility methods for different task types

  private async computeHash(data: string, algorithm: string): Promise<string> {
    // Simulate hash computation
    await this.simulateDelay(100)
    return `${algorithm}:${Buffer.from(data).toString('base64').substring(0, 16)}`
  }

  private async sortData(data: any[], compareFn?: Function): Promise<any[]> {
    await this.simulateDelay(50)
    return compareFn ? data.sort(compareFn) : data.sort()
  }

  private async filterData(data: any[], predicate: string): Promise<any[]> {
    await this.simulateDelay(30)
    const predicateFn = new Function('item', `return ${predicate}`)
    return data.filter(predicateFn)
  }

  private async mapData(data: any[], transform: string): Promise<any[]> {
    await this.simulateDelay(40)
    const transformFn = new Function('item', `return ${transform}`)
    return data.map(transformFn)
  }

  private async reduceData(data: any[], reducer: string, initialValue?: any): Promise<any> {
    await this.simulateDelay(60)
    const reducerFn = new Function('acc', 'item', `return ${reducer}`)
    return data.reduce(reducerFn, initialValue)
  }

  private async computeFibonacci(n: number): Promise<number> {
    if (n < 2) return n
    
    let a = 0, b = 1
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b]
    }
    return b
  }

  private async isPrime(n: number): Promise<boolean> {
    if (n < 2) return false
    for (let i = 2; i * i <= n; i++) {
      if (n % i === 0) return false
    }
    return true
  }

  private async simulateFileRead(path: string, encoding: string = 'utf8'): Promise<string> {
    await this.simulateDelay(200)
    return `File content from ${path} (${encoding})`
  }

  private async simulateFileWrite(path: string, data: any, encoding: string = 'utf8'): Promise<boolean> {
    await this.simulateDelay(300)
    return true
  }

  private async parseData(data: string, format: string): Promise<any> {
    await this.simulateDelay(50)
    switch (format) {
      case 'json':
        return JSON.parse(data)
      case 'csv':
        return data.split('\n').map(line => line.split(','))
      default:
        return data
    }
  }

  private async serializeData(data: any, format: string): Promise<string> {
    await this.simulateDelay(50)
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'csv':
        return Array.isArray(data) ? data.map(row => row.join(',')).join('\n') : String(data)
      default:
        return String(data)
    }
  }

  private async convertData(data: any, from: string, to: string): Promise<any> {
    await this.simulateDelay(100)
    return {
      converted: true,
      from,
      to,
      data: data,
      timestamp: Date.now()
    }
  }

  private async validateData(data: any, schema: any): Promise<{ valid: boolean; errors?: string[] }> {
    await this.simulateDelay(80)
    return { valid: true } // Simplified validation
  }

  private async sanitizeData(data: any, rules: any): Promise<any> {
    await this.simulateDelay(60)
    return data // Simplified sanitization
  }

  private async compressData(data: any, algorithm: string): Promise<string> {
    await this.simulateDelay(150)
    return Buffer.from(JSON.stringify(data)).toString('base64')
  }

  private async decompressData(data: string, algorithm: string): Promise<any> {
    await this.simulateDelay(120)
    return JSON.parse(Buffer.from(data, 'base64').toString())
  }

  private async simulateHttpRequest(url: string, method: string, data?: any): Promise<any> {
    await this.simulateDelay(500)
    return {
      status: 200,
      url,
      method,
      data: data || null,
      timestamp: Date.now()
    }
  }

  private async simulatePing(host: string): Promise<number> {
    await this.simulateDelay(100)
    return Math.random() * 100 + 10 // Simulate ping time
  }

  private async simulateClassification(data: any, model: string): Promise<{ class: string; confidence: number }> {
    await this.simulateDelay(300)
    return {
      class: 'positive',
      confidence: Math.random() * 0.4 + 0.6 // 60-100%
    }
  }

  private async simulatePrediction(data: any, model: string): Promise<number> {
    await this.simulateDelay(250)
    return Math.random() * 100
  }

  private async simulateClustering(data: any[], k: number): Promise<number[]> {
    await this.simulateDelay(400)
    return data.map(() => Math.floor(Math.random() * k))
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Send task result to main thread
   */
  private sendTaskResult(taskId: string, success: boolean, result: any): void {
    if (parentPort) {
      parentPort.postMessage({
        taskId,
        success,
        result: success ? result : undefined,
        error: !success ? result : undefined,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Send error to main thread
   */
  private sendError(error: Error): void {
    if (parentPort) {
      parentPort.postMessage({
        type: 'error',
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Respond to health check
   */
  private respondHealth(): void {
    if (parentPort) {
      parentPort.postMessage({
        type: 'health',
        workerId: this.workerId,
        isProcessing: this.isProcessing,
        currentTaskId: this.currentTaskId,
        timestamp: Date.now(),
        memoryUsage: process.memoryUsage()
      })
    }
  }

  /**
   * Notify main thread that worker is ready
   */
  private notifyReady(): void {
    if (parentPort) {
      parentPort.postMessage({
        type: 'ready',
        workerId: this.workerId,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Terminate worker gracefully
   */
  private terminate(): void {
    process.exit(0)
  }
}

// Initialize worker
if (workerData && workerData.workerId) {
  new UniversalWorker(workerData.workerId)
} else {
  throw new Error('Worker ID not provided in workerData')
}