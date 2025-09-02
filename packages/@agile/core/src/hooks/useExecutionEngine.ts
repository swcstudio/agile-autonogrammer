/**
 * ExecutionEngine Hook
 * Core execution management for WebAssembly modules and JavaScript functions
 * Implements PRD-001: Core Framework Migration
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Types for execution management
export interface ExecutionConfig {
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  memoryLimit?: number;
  enableCaching?: boolean;
  enableMetrics?: boolean;
}

export interface ExecutionTask<T = any> {
  id: string;
  type: 'wasm' | 'js' | 'async';
  fn: (() => T) | (() => Promise<T>);
  priority?: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface ExecutionResult<T = any> {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: T;
  error?: Error;
  duration?: number;
  memoryUsed?: number;
  attempts?: number;
  startTime?: number;
  endTime?: number;
}

export interface ExecutionMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  totalMemoryUsed: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface WasmModule {
  instance: WebAssembly.Instance;
  module: WebAssembly.Module;
  exports: Record<string, any>;
  memory?: WebAssembly.Memory;
}

interface ExecutionQueueItem<T = any> extends ExecutionTask<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  attempts: number;
}

// Default configuration
const DEFAULT_CONFIG: ExecutionConfig = {
  maxConcurrency: 4,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  memoryLimit: 512 * 1024 * 1024, // 512MB
  enableCaching: true,
  enableMetrics: true,
};

/**
 * ExecutionEngine Hook
 * Manages execution of WebAssembly modules and JavaScript functions
 */
export function useExecutionEngine(config: ExecutionConfig = {}) {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<Map<string, ExecutionResult>>(new Map());
  const [metrics, setMetrics] = useState<ExecutionMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageDuration: 0,
    totalMemoryUsed: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });
  
  // References for internal state
  const wasmModules = useRef<Map<string, WasmModule>>(new Map());
  const executionQueue = useRef<ExecutionQueueItem[]>([]);
  const activeExecutions = useRef<Set<string>>(new Set());
  const resultCache = useRef<Map<string, any>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  
  // Performance monitoring
  const performanceObserver = useRef<PerformanceObserver | null>(null);
  
  /**
   * Initialize the execution engine
   */
  useEffect(() => {
    // Set up performance observer if metrics are enabled
    if (mergedConfig.enableMetrics && typeof PerformanceObserver !== 'undefined') {
      performanceObserver.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.startsWith('execution-')) {
            const taskId = entry.name.replace('execution-', '');
            const result = results.get(taskId);
            if (result) {
              result.duration = entry.duration;
            }
          }
        }
      });
      
      performanceObserver.current.observe({ entryTypes: ['measure'] });
    }
    
    setIsInitialized(true);
    
    return () => {
      // Cleanup on unmount
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
      
      // Cancel all active executions
      abortControllers.current.forEach(controller => controller.abort());
      abortControllers.current.clear();
      
      // Clear WASM modules
      wasmModules.current.clear();
    };
  }, [mergedConfig.enableMetrics]);
  
  /**
   * Load a WebAssembly module
   */
  const loadWasmModule = useCallback(async (
    id: string,
    source: BufferSource | Response | Promise<Response>,
    imports?: WebAssembly.Imports
  ): Promise<WasmModule> => {
    // Check if module is already loaded
    if (wasmModules.current.has(id)) {
      return wasmModules.current.get(id)!;
    }
    
    try {
      // Compile and instantiate the module
      let wasmBuffer: BufferSource;
      
      if (source instanceof Response || source instanceof Promise) {
        const response = await source;
        wasmBuffer = await response.arrayBuffer();
      } else {
        wasmBuffer = source;
      }
      
      const wasmModule = await WebAssembly.compile(wasmBuffer);
      
      // Set up default imports including memory
      const memory = new WebAssembly.Memory({
        initial: 256,
        maximum: Math.floor(mergedConfig.memoryLimit! / 65536), // Convert to pages
      });
      
      const defaultImports: WebAssembly.Imports = {
        env: {
          memory,
          abort: (msg: number, file: number, line: number, column: number) => {
            throw new Error(`WASM abort at ${file}:${line}:${column} - message: ${msg}`);
          },
          ...((imports?.env as any) || {}),
        },
        ...imports,
      };
      
      const instance = await WebAssembly.instantiate(wasmModule, defaultImports);
      
      const module: WasmModule = {
        instance,
        module: wasmModule,
        exports: instance.exports as any,
        memory,
      };
      
      wasmModules.current.set(id, module);
      return module;
    } catch (error) {
      throw new Error(`Failed to load WASM module ${id}: ${error}`);
    }
  }, [mergedConfig.memoryLimit]);
  
  /**
   * Execute a task with retry logic and timeout
   */
  const executeTask = useCallback(async <T,>(
    task: ExecutionTask<T>
  ): Promise<T> => {
    const startTime = performance.now();
    const abortController = new AbortController();
    abortControllers.current.set(task.id, abortController);
    
    // Update result status
    setResults(prev => {
      const newMap = new Map(prev);
      newMap.set(task.id, {
        id: task.id,
        status: 'running',
        startTime,
      });
      return newMap;
    });
    
    let attempts = 0;
    let lastError: Error | undefined;
    
    while (attempts < mergedConfig.retryAttempts!) {
      attempts++;
      
      try {
        // Set up timeout
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, mergedConfig.timeout!);
        
        // Execute the task
        let result: T;
        
        if (task.type === 'wasm') {
          // For WASM tasks, ensure module is loaded
          // This would be extended to handle actual WASM function calls
          result = await Promise.race([
            task.fn(),
            new Promise<T>((_, reject) => {
              abortController.signal.addEventListener('abort', () => {
                reject(new Error('Execution timeout'));
              });
            }),
          ]);
        } else {
          // Execute JavaScript function
          result = await Promise.race([
            Promise.resolve(task.fn()),
            new Promise<T>((_, reject) => {
              abortController.signal.addEventListener('abort', () => {
                reject(new Error('Execution timeout'));
              });
            }),
          ]);
        }
        
        clearTimeout(timeoutId);
        
        // Cache result if caching is enabled
        if (mergedConfig.enableCaching) {
          resultCache.current.set(task.id, result);
        }
        
        // Update metrics
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        setResults(prev => {
          const newMap = new Map(prev);
          newMap.set(task.id, {
            id: task.id,
            status: 'completed',
            result,
            duration,
            attempts,
            startTime,
            endTime,
          });
          return newMap;
        });
        
        setMetrics(prev => ({
          ...prev,
          completedTasks: prev.completedTasks + 1,
          averageDuration: (prev.averageDuration * prev.completedTasks + duration) / (prev.completedTasks + 1),
        }));
        
        // Mark performance measure if metrics enabled
        if (mergedConfig.enableMetrics) {
          performance.mark(`execution-end-${task.id}`);
          performance.measure(
            `execution-${task.id}`,
            `execution-start-${task.id}`,
            `execution-end-${task.id}`
          );
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Wait before retry
        if (attempts < mergedConfig.retryAttempts!) {
          await new Promise(resolve => setTimeout(resolve, mergedConfig.retryDelay));
        }
      }
    }
    
    // All attempts failed
    const endTime = performance.now();
    setResults(prev => {
      const newMap = new Map(prev);
      newMap.set(task.id, {
        id: task.id,
        status: 'failed',
        error: lastError,
        duration: endTime - startTime,
        attempts,
        startTime,
        endTime,
      });
      return newMap;
    });
    
    setMetrics(prev => ({
      ...prev,
      failedTasks: prev.failedTasks + 1,
    }));
    
    throw lastError;
  }, [mergedConfig]);
  
  /**
   * Process the execution queue
   */
  const processQueue = useCallback(async () => {
    if (!isInitialized) return;
    
    while (
      executionQueue.current.length > 0 &&
      activeExecutions.current.size < mergedConfig.maxConcurrency!
    ) {
      const item = executionQueue.current.shift();
      if (!item) break;
      
      activeExecutions.current.add(item.id);
      
      // Check cache first
      if (mergedConfig.enableCaching && resultCache.current.has(item.id)) {
        const cachedResult = resultCache.current.get(item.id);
        item.resolve(cachedResult);
        
        setMetrics(prev => ({
          ...prev,
          cacheHits: prev.cacheHits + 1,
        }));
        
        activeExecutions.current.delete(item.id);
        continue;
      }
      
      setMetrics(prev => ({
        ...prev,
        cacheMisses: prev.cacheMisses + 1,
      }));
      
      // Execute the task
      executeTask(item)
        .then(result => {
          item.resolve(result);
        })
        .catch(error => {
          item.reject(error);
        })
        .finally(() => {
          activeExecutions.current.delete(item.id);
          // Process next item in queue
          processQueue();
        });
    }
    
    setIsExecuting(activeExecutions.current.size > 0);
  }, [isInitialized, mergedConfig, executeTask]);
  
  /**
   * Queue a task for execution
   */
  const queueTask = useCallback(<T,>(task: ExecutionTask<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const queueItem: ExecutionQueueItem<T> = {
        ...task,
        resolve,
        reject,
        attempts: 0,
      };
      
      // Add to queue based on priority
      if (task.priority !== undefined) {
        // Insert at correct position based on priority
        const insertIndex = executionQueue.current.findIndex(
          item => (item.priority || 0) < (task.priority || 0)
        );
        
        if (insertIndex === -1) {
          executionQueue.current.push(queueItem);
        } else {
          executionQueue.current.splice(insertIndex, 0, queueItem);
        }
      } else {
        executionQueue.current.push(queueItem);
      }
      
      setMetrics(prev => ({
        ...prev,
        totalTasks: prev.totalTasks + 1,
      }));
      
      // Start processing
      processQueue();
    });
  }, [processQueue]);
  
  /**
   * Execute a function or WASM module
   */
  const execute = useCallback(<T,>(
    fn: (() => T) | (() => Promise<T>),
    options?: {
      id?: string;
      type?: 'wasm' | 'js' | 'async';
      priority?: number;
      dependencies?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<T> => {
    const task: ExecutionTask<T> = {
      id: options?.id || `task-${Date.now()}-${Math.random()}`,
      type: options?.type || 'js',
      fn,
      priority: options?.priority,
      dependencies: options?.dependencies,
      metadata: options?.metadata,
    };
    
    return queueTask(task);
  }, [queueTask]);
  
  /**
   * Execute multiple tasks in parallel
   */
  const executeParallel = useCallback(async <T,>(
    tasks: Array<ExecutionTask<T>>
  ): Promise<T[]> => {
    const promises = tasks.map(task => queueTask(task));
    return Promise.all(promises);
  }, [queueTask]);
  
  /**
   * Execute tasks in sequence
   */
  const executeSequential = useCallback(async <T,>(
    tasks: Array<ExecutionTask<T>>
  ): Promise<T[]> => {
    const results: T[] = [];
    
    for (const task of tasks) {
      const result = await queueTask(task);
      results.push(result);
    }
    
    return results;
  }, [queueTask]);
  
  /**
   * Cancel a running task
   */
  const cancel = useCallback((taskId: string) => {
    const controller = abortControllers.current.get(taskId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(taskId);
    }
    
    // Update result status
    setResults(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(taskId);
      if (existing && existing.status === 'running') {
        newMap.set(taskId, {
          ...existing,
          status: 'cancelled',
          endTime: performance.now(),
        });
      }
      return newMap;
    });
    
    // Remove from active executions
    activeExecutions.current.delete(taskId);
  }, []);
  
  /**
   * Cancel all running tasks
   */
  const cancelAll = useCallback(() => {
    abortControllers.current.forEach((controller, taskId) => {
      cancel(taskId);
    });
  }, [cancel]);
  
  /**
   * Get the result of a task
   */
  const getResult = useCallback((taskId: string): ExecutionResult | undefined => {
    return results.get(taskId);
  }, [results]);
  
  /**
   * Clear the result cache
   */
  const clearCache = useCallback(() => {
    resultCache.current.clear();
    setMetrics(prev => ({
      ...prev,
      cacheHits: 0,
      cacheMisses: 0,
    }));
  }, []);
  
  /**
   * Reset the execution engine
   */
  const reset = useCallback(() => {
    cancelAll();
    executionQueue.current = [];
    activeExecutions.current.clear();
    resultCache.current.clear();
    setResults(new Map());
    setMetrics({
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageDuration: 0,
      totalMemoryUsed: 0,
      cacheHits: 0,
      cacheMisses: 0,
    });
  }, [cancelAll]);
  
  return {
    // State
    isInitialized,
    isExecuting,
    results: Array.from(results.values()),
    metrics,
    
    // WASM management
    loadWasmModule,
    wasmModules: Array.from(wasmModules.current.entries()).map(([id, module]) => ({
      id,
      ...module,
    })),
    
    // Execution methods
    execute,
    executeParallel,
    executeSequential,
    
    // Control methods
    cancel,
    cancelAll,
    
    // Utility methods
    getResult,
    clearCache,
    reset,
    
    // Configuration
    config: mergedConfig,
  };
}

// Export types for external use
export type UseExecutionEngine = ReturnType<typeof useExecutionEngine>;