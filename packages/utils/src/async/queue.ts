/**
 * Advanced Queue Implementation
 * Supports priority, concurrency control, and backpressure
 */

import { EventEmitter } from 'events';

export interface QueueOptions {
  concurrency?: number;
  timeout?: number;
  throwOnTimeout?: boolean;
  autoStart?: boolean;
  intervalCap?: number;
  interval?: number;
  carryoverConcurrencyCount?: boolean;
  priority?: boolean;
}

export interface QueueTask<T = any> {
  id: string;
  fn: () => Promise<T>;
  priority?: number;
  retries?: number;
  timeout?: number;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onTimeout?: () => void;
}

export class Queue<T = any> extends EventEmitter {
  private tasks: QueueTask<T>[] = [];
  private running: Map<string, Promise<T>> = new Map();
  private results: Map<string, T> = new Map();
  private errors: Map<string, Error> = new Map();
  private options: Required<QueueOptions>;
  private isPaused = false;
  private intervalId?: NodeJS.Timeout;
  private carryoverConcurrencyCount = 0;

  constructor(options: QueueOptions = {}) {
    super();
    
    this.options = {
      concurrency: options.concurrency ?? 1,
      timeout: options.timeout ?? 0,
      throwOnTimeout: options.throwOnTimeout ?? false,
      autoStart: options.autoStart ?? true,
      intervalCap: options.intervalCap ?? Infinity,
      interval: options.interval ?? 0,
      carryoverConcurrencyCount: options.carryoverConcurrencyCount ?? false,
      priority: options.priority ?? false
    };

    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Add a task to the queue
   */
  add<R = T>(
    fn: () => Promise<R>,
    options?: Partial<QueueTask<R>>
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: QueueTask<R> = {
        id: options?.id || this.generateId(),
        fn: fn as any,
        priority: options?.priority ?? 0,
        retries: options?.retries ?? 0,
        timeout: options?.timeout ?? this.options.timeout,
        onSuccess: (result) => {
          options?.onSuccess?.(result);
          resolve(result);
        },
        onError: (error) => {
          options?.onError?.(error);
          reject(error);
        },
        onTimeout: options?.onTimeout
      };

      if (this.options.priority) {
        // Insert in priority order
        const index = this.tasks.findIndex(t => (t.priority ?? 0) < (task.priority ?? 0));
        if (index === -1) {
          this.tasks.push(task as any);
        } else {
          this.tasks.splice(index, 0, task as any);
        }
      } else {
        this.tasks.push(task as any);
      }

      this.emit('task-added', task);
      this.process();
    });
  }

  /**
   * Add multiple tasks
   */
  addAll<R = T>(
    tasks: Array<() => Promise<R>>,
    options?: Partial<QueueTask<R>>
  ): Promise<R[]> {
    return Promise.all(tasks.map(task => this.add(task, options)));
  }

  /**
   * Process the queue
   */
  private async process(): Promise<void> {
    if (this.isPaused) return;

    while (this.tasks.length > 0 && this.running.size < this.options.concurrency) {
      const task = this.tasks.shift();
      if (!task) break;

      this.executeTask(task);
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: QueueTask<T>): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.emit('task-started', task);
      
      let promise = task.fn();
      
      // Add timeout if specified
      if (task.timeout && task.timeout > 0) {
        promise = this.withTimeout(promise, task.timeout, task);
      }
      
      this.running.set(task.id, promise);
      
      const result = await promise;
      
      this.results.set(task.id, result);
      this.running.delete(task.id);
      
      const duration = Date.now() - startTime;
      
      this.emit('task-completed', { task, result, duration });
      task.onSuccess?.(result);
      
    } catch (error: any) {
      this.running.delete(task.id);
      
      // Retry logic
      if (task.retries && task.retries > 0) {
        task.retries--;
        this.tasks.unshift(task); // Add back to front of queue
        this.emit('task-retry', { task, error, retriesLeft: task.retries });
      } else {
        this.errors.set(task.id, error);
        this.emit('task-failed', { task, error });
        task.onError?.(error);
      }
    }
    
    // Process next task
    this.process();
  }

  /**
   * Add timeout to a promise
   */
  private withTimeout<R>(
    promise: Promise<R>,
    timeout: number,
    task: QueueTask
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error(`Task ${task.id} timed out after ${timeout}ms`);
        task.onTimeout?.();
        
        if (this.options.throwOnTimeout) {
          reject(error);
        } else {
          this.emit('task-timeout', { task, timeout });
          resolve(undefined as any);
        }
      }, timeout);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Start processing the queue
   */
  start(): void {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    this.emit('started');
    
    if (this.options.interval && this.options.interval > 0) {
      this.intervalId = setInterval(() => {
        this.onInterval();
      }, this.options.interval);
    }
    
    this.process();
  }

  /**
   * Pause the queue
   */
  pause(): void {
    if (this.isPaused) return;
    
    this.isPaused = true;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.emit('paused');
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.tasks = [];
    this.emit('cleared');
  }

  /**
   * Handle interval processing
   */
  private onInterval(): void {
    if (this.isPaused) return;
    
    const capacity = this.options.intervalCap - this.running.size;
    
    if (this.options.carryoverConcurrencyCount) {
      this.carryoverConcurrencyCount = capacity;
    }
    
    for (let i = 0; i < capacity; i++) {
      this.process();
    }
  }

  /**
   * Get queue size
   */
  get size(): number {
    return this.tasks.length;
  }

  /**
   * Get pending tasks count
   */
  get pending(): number {
    return this.tasks.length;
  }

  /**
   * Get running tasks count
   */
  get runningCount(): number {
    return this.running.size;
  }

  /**
   * Check if queue is paused
   */
  get paused(): boolean {
    return this.isPaused;
  }

  /**
   * Check if queue is idle
   */
  get idle(): boolean {
    return this.tasks.length === 0 && this.running.size === 0;
  }

  /**
   * Wait for the queue to be idle
   */
  async onIdle(): Promise<void> {
    if (this.idle) return;
    
    return new Promise(resolve => {
      const check = () => {
        if (this.idle) {
          this.off('task-completed', check);
          this.off('task-failed', check);
          resolve();
        }
      };
      
      this.on('task-completed', check);
      this.on('task-failed', check);
    });
  }

  /**
   * Wait for the queue to be empty
   */
  async onEmpty(): Promise<void> {
    if (this.tasks.length === 0) return;
    
    return new Promise(resolve => {
      const check = () => {
        if (this.tasks.length === 0) {
          this.off('task-started', check);
          resolve();
        }
      };
      
      this.on('task-started', check);
    });
  }

  /**
   * Get task result by ID
   */
  getResult(taskId: string): T | undefined {
    return this.results.get(taskId);
  }

  /**
   * Get task error by ID
   */
  getError(taskId: string): Error | undefined {
    return this.errors.get(taskId);
  }

  /**
   * Generate unique task ID
   */
  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy the queue
   */
  destroy(): void {
    this.pause();
    this.clear();
    this.removeAllListeners();
    this.results.clear();
    this.errors.clear();
    this.running.clear();
  }
}

/**
 * Priority Queue with automatic sorting
 */
export class PriorityQueue<T = any> extends Queue<T> {
  constructor(options: QueueOptions = {}) {
    super({ ...options, priority: true });
  }

  /**
   * Add task with priority
   */
  addWithPriority<R = T>(
    fn: () => Promise<R>,
    priority: number,
    options?: Partial<QueueTask<R>>
  ): Promise<R> {
    return this.add(fn, { ...options, priority });
  }

  /**
   * Add urgent task (highest priority)
   */
  addUrgent<R = T>(
    fn: () => Promise<R>,
    options?: Partial<QueueTask<R>>
  ): Promise<R> {
    return this.add(fn, { ...options, priority: Infinity });
  }
}

/**
 * Batch Queue - processes tasks in batches
 */
export class BatchQueue<T = any> extends EventEmitter {
  private batch: Array<() => Promise<T>> = [];
  private batchSize: number;
  private batchTimeout: number;
  private timeoutId?: NodeJS.Timeout;

  constructor(batchSize = 10, batchTimeout = 1000) {
    super();
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
  }

  /**
   * Add task to batch
   */
  add(fn: () => Promise<T>): void {
    this.batch.push(fn);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.flush(), this.batchTimeout);
    }
  }

  /**
   * Process current batch
   */
  async flush(): Promise<T[]> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    if (this.batch.length === 0) return [];

    const currentBatch = this.batch.splice(0, this.batch.length);
    
    this.emit('batch-start', currentBatch.length);
    
    try {
      const results = await Promise.all(currentBatch.map(fn => fn()));
      this.emit('batch-complete', results);
      return results;
    } catch (error) {
      this.emit('batch-error', error);
      throw error;
    }
  }

  /**
   * Clear pending batch
   */
  clear(): void {
    this.batch = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}