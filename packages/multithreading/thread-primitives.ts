/**
 * @swcstudio/multithreading - High-Level Thread Primitives
 * 
 * This module provides an elegant abstraction layer over the native Rust threading
 * capabilities, making it trivial for developers to leverage powerful concurrency
 * without dealing with low-level details.
 */

import { 
  getSystemInfo, 
  createRayonThreadPool, 
  createTokioRuntime,
  createCrossbeamChannel,
  MultithreadingManager 
} from './wrapper.js';
import { 
  nativeBridge, 
  NativeTaskDescriptor, 
  NativeTaskResult 
} from './bridge.js';

// Core thread primitive types
export interface ThreadTask<T = any, R = any> {
  id: string;
  operation: string;
  data: T;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number;
  retries?: number;
}

export interface ThreadResult<T = any> {
  taskId: string;
  success: boolean;
  result?: T;
  error?: string;
  executionTime: number;
  threadId: string;
}

export interface ThreadPoolConfig {
  coreThreads?: number;
  maxThreads?: number;
  keepAlive?: number;
  queueSize?: number;
  strategy?: 'cpu-bound' | 'io-bound' | 'mixed' | 'ai-optimized';
}

/**
 * Thread Primitive - The fundamental building block for efficient threading
 * 
 * This class provides a simple, powerful interface for thread operations
 * while handling all the complex interop and lifecycle management internally.
 */
export class ThreadPrimitive {
  private static instance: ThreadPrimitive | null = null;
  private manager: MultithreadingManager;
  private pools: Map<string, any> = new Map();
  private taskQueue: Map<string, ThreadTask> = new Map();
  private results: Map<string, ThreadResult> = new Map();
  private activeThreads: Set<string> = new Set();
  
  private constructor() {
    this.manager = new MultithreadingManager();
    this.initializeDefaultPools();
  }

  /**
   * Singleton access - ensures optimal resource management
   */
  public static getInstance(): ThreadPrimitive {
    if (!ThreadPrimitive.instance) {
      ThreadPrimitive.instance = new ThreadPrimitive();
    }
    return ThreadPrimitive.instance;
  }

  /**
   * Initialize optimized thread pools for different workload types
   */
  private async initializeDefaultPools(): Promise<void> {
    const systemInfo = await getSystemInfo();
    const coreCount = systemInfo.cpuCores;

    // CPU-bound pool: CPU-intensive computations
    const cpuPool = createRayonThreadPool({
      numThreads: coreCount,
      threadName: 'cpu-worker'
    });
    this.pools.set('cpu', cpuPool);

    // IO-bound pool: Network requests, file operations
    const ioRuntime = createTokioRuntime({
      workerThreads: Math.max(2, Math.floor(coreCount / 2)),
      enableAll: true
    });
    this.pools.set('io', ioRuntime);

    // AI-optimized pool: Machine learning, heavy computations
    const aiPool = createRayonThreadPool({
      numThreads: Math.max(1, coreCount - 1), // Leave one core for main thread
      threadName: 'ai-worker'
    });
    this.pools.set('ai', aiPool);

    // Mixed workload pool: General purpose
    const mixedPool = createRayonThreadPool({
      numThreads: Math.floor(coreCount * 0.75),
      threadName: 'mixed-worker'
    });
    this.pools.set('mixed', mixedPool);
  }

  /**
   * Execute a task on the most appropriate thread pool
   * 
   * This is the primary interface developers will use - it automatically
   * selects the optimal thread pool and handles all the complexity.
   */
  public async execute<T, R>(
    operation: string,
    data: T,
    options: {
      strategy?: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed';
      priority?: 'low' | 'medium' | 'high' | 'critical';
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<R> {
    const taskId = this.generateTaskId();
    const strategy = options.strategy || this.inferStrategy(operation);
    
    const task: ThreadTask<T, R> = {
      id: taskId,
      operation,
      data,
      priority: options.priority || 'medium',
      timeout: options.timeout || 30000,
      retries: options.retries || 0
    };

    this.taskQueue.set(taskId, task);
    this.activeThreads.add(taskId);

    try {
      const result = await this.executeOnPool(task, strategy);
      this.results.set(taskId, result);
      return result.result as R;
    } finally {
      this.activeThreads.delete(taskId);
      this.taskQueue.delete(taskId);
    }
  }

  /**
   * Batch execute multiple tasks efficiently
   */
  public async executeBatch<T, R>(
    tasks: Array<{
      operation: string;
      data: T;
      strategy?: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed';
    }>,
    options: {
      maxConcurrency?: number;
      failFast?: boolean;
    } = {}
  ): Promise<R[]> {
    const maxConcurrency = options.maxConcurrency || this.getOptimalConcurrency();
    const results: R[] = [];
    
    // Process tasks in batches to avoid overwhelming the system
    for (let i = 0; i < tasks.length; i += maxConcurrency) {
      const batch = tasks.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(task => 
        this.execute<T, R>(task.operation, task.data, { strategy: task.strategy })
      );
      
      if (options.failFast) {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } else {
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<R>).value)
        );
      }
    }
    
    return results;
  }

  /**
   * Create a persistent worker for long-running operations
   */
  public createWorker<T, R>(
    operation: string,
    strategy: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed' = 'mixed'
  ): ThreadWorker<T, R> {
    return new ThreadWorker<T, R>(this, operation, strategy);
  }

  /**
   * Get real-time thread pool metrics
   */
  public async getMetrics(): Promise<ThreadMetrics> {
    const detailedMetrics = await nativeBridge.getDetailedMetrics();
    
    return {
      activeTasks: this.activeThreads.size,
      queuedTasks: this.taskQueue.size,
      completedTasks: this.results.size,
      poolUtilization: Object.fromEntries(
        Object.entries(detailedMetrics.pools).map(([name, pool]) => [name, pool.utilization])
      ),
      systemInfo: detailedMetrics.system
    };
  }

  // Private implementation methods

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private inferStrategy(operation: string): 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed' {
    // Smart strategy inference based on operation name
    const cpuPatterns = ['compute', 'calculate', 'process', 'transform', 'sort', 'hash'];
    const ioPatterns = ['fetch', 'load', 'save', 'download', 'upload', 'request'];
    const aiPatterns = ['predict', 'train', 'classify', 'analyze', 'recognize', 'generate'];
    
    const opLower = operation.toLowerCase();
    
    if (aiPatterns.some(pattern => opLower.includes(pattern))) return 'ai-optimized';
    if (cpuPatterns.some(pattern => opLower.includes(pattern))) return 'cpu-bound';
    if (ioPatterns.some(pattern => opLower.includes(pattern))) return 'io-bound';
    
    return 'mixed';
  }

  private async executeOnPool<T, R>(
    task: ThreadTask<T, R>,
    strategy: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed'
  ): Promise<ThreadResult<R>> {
    const startTime = performance.now();
    const pool = this.pools.get(strategy === 'cpu-bound' ? 'cpu' : 
                               strategy === 'io-bound' ? 'io' :
                               strategy === 'ai-optimized' ? 'ai' : 'mixed');
    
    if (!pool) {
      throw new Error(`Thread pool not available for strategy: ${strategy}`);
    }

    try {
      // Execute the task on the appropriate pool
      // This would integrate with the actual native pool execution
      const result = await this.executeTaskOnNativePool(pool, task);
      
      return {
        taskId: task.id,
        success: true,
        result: result as R,
        executionTime: performance.now() - startTime,
        threadId: `${strategy}-thread-${Math.random().toString(36).substr(2, 4)}`
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: performance.now() - startTime,
        threadId: 'error'
      };
    }
  }

  private async executeTaskOnNativePool(pool: any, task: ThreadTask): Promise<any> {
    // Create native task descriptor
    const nativeTask: NativeTaskDescriptor = {
      id: task.id,
      operation: task.operation,
      payload: task.data,
      priority: this.priorityToNumber(task.priority || 'medium'),
      timeout: task.timeout || 30000,
      pool: this.inferPoolType(task.operation)
    };

    // Execute on native bridge
    const result: NativeTaskResult = await nativeBridge.executeTask(nativeTask);
    
    if (!result.success) {
      throw new Error(result.error || 'Native task execution failed');
    }
    
    return result.result;
  }

  private priorityToNumber(priority: 'low' | 'medium' | 'high' | 'critical'): number {
    const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
    return priorities[priority];
  }

  private inferPoolType(operation: string): 'cpu' | 'io' | 'ai' | 'mixed' {
    // Smart pool inference
    const cpuOps = ['heavy-calculation', 'compute', 'calculate', 'fibonacci', 'square-root'];
    const ioOps = ['fetch-api', 'fetch-data', 'load', 'save'];
    const aiOps = ['text-analysis', 'sentiment-analysis', 'predict', 'analyze'];
    
    if (cpuOps.some(op => operation.includes(op))) return 'cpu';
    if (ioOps.some(op => operation.includes(op))) return 'io';
    if (aiOps.some(op => operation.includes(op))) return 'ai';
    
    return 'mixed';
  }

  private getOptimalConcurrency(): number {
    const systemInfo = getSystemInfo();
    return Math.max(2, Math.floor(systemInfo.cpuCores * 0.8));
  }

  private calculatePoolUtilization(): Record<string, number> {
    // Calculate utilization for each pool
    return {
      cpu: Math.random() * 100, // Placeholder - would get real metrics
      io: Math.random() * 100,
      ai: Math.random() * 100,
      mixed: Math.random() * 100
    };
  }
}

/**
 * ThreadWorker - A persistent worker for repeated operations
 */
export class ThreadWorker<T, R> {
  private primitive: ThreadPrimitive;
  private operation: string;
  private strategy: string;
  private isRunning: boolean = false;

  constructor(
    primitive: ThreadPrimitive, 
    operation: string, 
    strategy: string
  ) {
    this.primitive = primitive;
    this.operation = operation;
    this.strategy = strategy;
  }

  public async execute(data: T): Promise<R> {
    return this.primitive.execute<T, R>(
      this.operation, 
      data, 
      { strategy: this.strategy as any }
    );
  }

  public async start(dataStream: AsyncIterable<T>): Promise<AsyncGenerator<R>> {
    this.isRunning = true;
    
    async function* generator(this: ThreadWorker<T, R>) {
      for await (const data of dataStream) {
        if (!this.isRunning) break;
        try {
          const result = await this.execute(data);
          yield result;
        } catch (error) {
          console.error(`Worker error for ${this.operation}:`, error);
        }
      }
    }
    
    return generator.call(this);
  }

  public stop(): void {
    this.isRunning = false;
  }
}

// Type definitions for metrics and configuration
export interface ThreadMetrics {
  activeTasks: number;
  queuedTasks: number;
  completedTasks: number;
  poolUtilization: Record<string, number>;
  systemInfo: any;
}

// Convenience functions for common patterns
export const thread = ThreadPrimitive.getInstance();

/**
 * Quick execute - for simple one-off tasks
 */
export async function execute<T, R>(
  operation: string,
  data: T,
  strategy?: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed'
): Promise<R> {
  return thread.execute<T, R>(operation, data, { strategy });
}

/**
 * Parallel map - efficiently process arrays
 */
export async function parallelMap<T, R>(
  items: T[],
  operation: string,
  strategy?: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed'
): Promise<R[]> {
  const tasks = items.map(item => ({
    operation,
    data: item,
    strategy
  }));
  
  return thread.executeBatch<T, R>(tasks);
}

/**
 * CPU-intensive computation helper
 */
export async function compute<T, R>(operation: string, data: T): Promise<R> {
  return execute<T, R>(operation, data, 'cpu-bound');
}

/**
 * IO operation helper
 */
export async function asyncIO<T, R>(operation: string, data: T): Promise<R> {
  return execute<T, R>(operation, data, 'io-bound');
}

/**
 * AI workload helper
 */
export async function aiProcess<T, R>(operation: string, data: T): Promise<R> {
  return execute<T, R>(operation, data, 'ai-optimized');
}