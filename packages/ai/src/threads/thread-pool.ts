/**
 * Thread Pool Manager
 * Manages multiple threads and provides thread pooling capabilities
 */

import { EventEmitter } from 'events';
import { Thread, ThreadConfig, ThreadStatus, ThreadSnapshot } from './thread-manager';
import { BaseAgent } from '../agents/base-agent';

export interface ThreadPoolConfig {
  maxThreads?: number;
  threadTimeout?: number;
  persistThreads?: boolean;
  recycleThreads?: boolean;
}

export interface ThreadPoolStats {
  totalThreads: number;
  activeThreads: number;
  idleThreads: number;
  completedThreads: number;
  failedThreads: number;
}

export class ThreadPool extends EventEmitter {
  private threads: Map<string, Thread> = new Map();
  private activeThreads: Set<string> = new Set();
  private idleThreads: Set<string> = new Set();
  private threadQueue: Array<() => Promise<void>> = [];
  private config: ThreadPoolConfig;
  private stats: ThreadPoolStats = {
    totalThreads: 0,
    activeThreads: 0,
    idleThreads: 0,
    completedThreads: 0,
    failedThreads: 0
  };

  constructor(config: ThreadPoolConfig = {}) {
    super();
    this.config = {
      maxThreads: config.maxThreads || 10,
      threadTimeout: config.threadTimeout || 300000, // 5 minutes
      persistThreads: config.persistThreads || false,
      recycleThreads: config.recycleThreads || true
    };
  }

  /**
   * Create a new thread
   */
  async createThread(config?: ThreadConfig): Promise<Thread> {
    if (this.threads.size >= this.config.maxThreads!) {
      if (this.config.recycleThreads && this.idleThreads.size > 0) {
        // Recycle an idle thread
        const idleThreadId = this.idleThreads.values().next().value;
        const thread = this.threads.get(idleThreadId)!;
        thread.clearMessages();
        this.idleThreads.delete(idleThreadId);
        this.activeThreads.add(idleThreadId);
        this.updateStats();
        return thread;
      } else {
        throw new Error(`Thread pool has reached maximum capacity of ${this.config.maxThreads} threads`);
      }
    }

    const thread = new Thread({
      ...config,
      timeout: config?.timeout || this.config.threadTimeout
    });

    this.threads.set(thread.id, thread);
    this.activeThreads.add(thread.id);
    this.stats.totalThreads++;
    
    // Set up event listeners
    thread.on('status:change', ({ to }) => {
      this.handleThreadStatusChange(thread.id, to);
    });

    thread.on('terminated', () => {
      this.removeThread(thread.id);
    });

    this.emit('thread:created', thread);
    this.updateStats();
    
    return thread;
  }

  /**
   * Get a thread by ID
   */
  getThread(threadId: string): Thread | undefined {
    return this.threads.get(threadId);
  }

  /**
   * Get all threads
   */
  getAllThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  /**
   * Get active threads
   */
  getActiveThreads(): Thread[] {
    return Array.from(this.activeThreads).map(id => this.threads.get(id)!);
  }

  /**
   * Get idle threads
   */
  getIdleThreads(): Thread[] {
    return Array.from(this.idleThreads).map(id => this.threads.get(id)!);
  }

  /**
   * Execute a task in a thread
   */
  async execute<T>(
    task: (thread: Thread) => Promise<T>,
    threadConfig?: ThreadConfig
  ): Promise<T> {
    const thread = await this.acquireThread(threadConfig);
    
    try {
      const result = await task(thread);
      this.releaseThread(thread.id);
      return result;
    } catch (error) {
      this.releaseThread(thread.id);
      throw error;
    }
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel<T>(
    tasks: Array<(thread: Thread) => Promise<T>>,
    threadConfig?: ThreadConfig
  ): Promise<T[]> {
    const promises = tasks.map(task => this.execute(task, threadConfig));
    return Promise.all(promises);
  }

  /**
   * Execute tasks with a specific agent configuration
   */
  async executeWithAgent<T>(
    agentFactory: () => BaseAgent,
    task: (thread: Thread, agent: BaseAgent) => Promise<T>,
    threadConfig?: ThreadConfig
  ): Promise<T> {
    return this.execute(async (thread) => {
      const agent = agentFactory();
      thread.addAgent(agent, true);
      return task(thread, agent);
    }, threadConfig);
  }

  /**
   * Acquire a thread from the pool
   */
  private async acquireThread(config?: ThreadConfig): Promise<Thread> {
    // Try to get an idle thread
    if (this.idleThreads.size > 0) {
      const threadId = this.idleThreads.values().next().value;
      const thread = this.threads.get(threadId)!;
      
      this.idleThreads.delete(threadId);
      this.activeThreads.add(threadId);
      
      if (this.config.recycleThreads) {
        thread.clearMessages();
      }
      
      this.updateStats();
      return thread;
    }

    // Try to create a new thread
    if (this.threads.size < this.config.maxThreads!) {
      return this.createThread(config);
    }

    // Wait for a thread to become available
    return new Promise((resolve) => {
      this.threadQueue.push(async () => {
        const thread = await this.acquireThread(config);
        resolve(thread);
      });
    });
  }

  /**
   * Release a thread back to the pool
   */
  private releaseThread(threadId: string): void {
    if (!this.activeThreads.has(threadId)) return;

    this.activeThreads.delete(threadId);
    this.idleThreads.add(threadId);
    
    // Process queued tasks
    if (this.threadQueue.length > 0) {
      const task = this.threadQueue.shift();
      task?.();
    }
    
    this.updateStats();
    this.emit('thread:released', threadId);
  }

  /**
   * Handle thread status changes
   */
  private handleThreadStatusChange(threadId: string, status: ThreadStatus): void {
    switch (status) {
      case ThreadStatus.COMPLETED:
        this.stats.completedThreads++;
        this.releaseThread(threadId);
        break;
      case ThreadStatus.FAILED:
        this.stats.failedThreads++;
        this.releaseThread(threadId);
        break;
      case ThreadStatus.TERMINATED:
        this.removeThread(threadId);
        break;
    }
    
    this.emit('thread:status', { threadId, status });
  }

  /**
   * Remove a thread from the pool
   */
  private removeThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    this.threads.delete(threadId);
    this.activeThreads.delete(threadId);
    this.idleThreads.delete(threadId);
    
    this.stats.totalThreads--;
    this.updateStats();
    this.emit('thread:removed', threadId);
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.activeThreads = this.activeThreads.size;
    this.stats.idleThreads = this.idleThreads.size;
    this.emit('stats:updated', this.stats);
  }

  /**
   * Get pool statistics
   */
  getStats(): ThreadPoolStats {
    return { ...this.stats };
  }

  /**
   * Save thread snapshots
   */
  async saveSnapshots(): Promise<Map<string, ThreadSnapshot>> {
    const snapshots = new Map<string, ThreadSnapshot>();
    
    for (const [id, thread] of this.threads) {
      snapshots.set(id, thread.getSnapshot());
    }
    
    if (this.config.persistThreads) {
      // Here you would implement persistence logic
      // e.g., save to database or file system
      this.emit('snapshots:saved', snapshots);
    }
    
    return snapshots;
  }

  /**
   * Restore threads from snapshots
   */
  async restoreSnapshots(snapshots: Map<string, ThreadSnapshot>): Promise<void> {
    for (const [id, snapshot] of snapshots) {
      const thread = new Thread({ id: snapshot.id });
      thread.restoreFromSnapshot(snapshot);
      
      this.threads.set(id, thread);
      
      if (snapshot.status === ThreadStatus.RUNNING) {
        this.activeThreads.add(id);
      } else {
        this.idleThreads.add(id);
      }
    }
    
    this.updateStats();
    this.emit('snapshots:restored', snapshots.size);
  }

  /**
   * Clear all threads
   */
  clearAll(): void {
    this.threads.forEach(thread => thread.terminate());
    this.threads.clear();
    this.activeThreads.clear();
    this.idleThreads.clear();
    this.threadQueue = [];
    
    this.stats = {
      totalThreads: 0,
      activeThreads: 0,
      idleThreads: 0,
      completedThreads: 0,
      failedThreads: 0
    };
    
    this.emit('pool:cleared');
  }

  /**
   * Terminate the pool
   */
  terminate(): void {
    this.clearAll();
    this.removeAllListeners();
    this.emit('pool:terminated');
  }
}