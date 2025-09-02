/**
 * React 19 Thread Primitives Integration
 * 
 * This provides React-specific abstractions that make threading as simple
 * as using any other React hook, while maintaining full performance benefits.
 */

import React, { 
  createContext, 
  useContext, 
  useCallback, 
  useMemo, 
  useTransition,
  use,
  Suspense
} from 'react';
import { 
  ThreadPrimitive, 
  ThreadWorker, 
  ThreadMetrics,
  execute,
  parallelMap,
  compute,
  asyncIO,
  aiProcess
} from '../native/thread-primitives.js';

// React-specific context for thread management
interface ThreadContextValue {
  thread: ThreadPrimitive;
  metrics: ThreadMetrics;
  executeTask: <T, R>(operation: string, data: T, strategy?: string) => Promise<R>;
  createWorker: <T, R>(operation: string, strategy?: string) => ThreadWorker<T, R>;
}

const ThreadContext = createContext<ThreadContextValue | null>(null);

/**
 * ThreadProvider - Wraps your app to provide threading capabilities
 */
export function ThreadProvider({ children }: { children: React.ReactNode }) {
  const thread = useMemo(() => ThreadPrimitive.getInstance(), []);
  
  const [isPending, startTransition] = useTransition();
  
  const executeTask = useCallback(async <T, R>(
    operation: string, 
    data: T, 
    strategy?: string
  ): Promise<R> => {
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await thread.execute<T, R>(operation, data, { 
            strategy: strategy as any 
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }, [thread]);

  const createWorker = useCallback(<T, R>(
    operation: string, 
    strategy?: string
  ) => {
    return thread.createWorker<T, R>(operation, strategy as any);
  }, [thread]);

  const metrics = useMemo(() => thread.getMetrics(), [thread]);

  const contextValue: ThreadContextValue = {
    thread,
    metrics,
    executeTask,
    createWorker
  };

  return (
    <ThreadContext.Provider value={contextValue}>
      {children}
    </ThreadContext.Provider>
  );
}

/**
 * Core hook for accessing thread primitives
 */
export function useThread() {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error('useThread must be used within a ThreadProvider');
  }
  return context;
}

/**
 * Hook for CPU-intensive computations
 * Perfect for data processing, calculations, transformations
 */
export function useCompute<T, R>(operation: string) {
  const { executeTask } = useThread();
  
  return useCallback(async (data: T): Promise<R> => {
    return executeTask<T, R>(operation, data, 'cpu-bound');
  }, [operation, executeTask]);
}

/**
 * Hook for async I/O operations  
 * Perfect for API calls, file operations, network requests
 */
export function useAsyncIO<T, R>(operation: string) {
  const { executeTask } = useThread();
  
  return useCallback(async (data: T): Promise<R> => {
    return executeTask<T, R>(operation, data, 'io-bound');
  }, [operation, executeTask]);
}

/**
 * Hook for AI/ML workloads
 * Perfect for inference, training, data analysis
 */
export function useAI<T, R>(operation: string) {
  const { executeTask } = useThread();
  
  return useCallback(async (data: T): Promise<R> => {
    return executeTask<T, R>(operation, data, 'ai-optimized');
  }, [operation, executeTask]);
}

/**
 * Hook for parallel array processing
 * Automatically distributes work across available threads
 */
export function useParallelMap<T, R>(
  operation: string,
  strategy: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed' = 'mixed'
) {
  return useCallback(async (items: T[]): Promise<R[]> => {
    return parallelMap<T, R>(items, operation, strategy);
  }, [operation, strategy]);
}

/**
 * Hook for persistent workers
 * Creates a long-running worker for repeated operations
 */
export function useWorker<T, R>(
  operation: string,
  strategy: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed' = 'mixed'
) {
  const { createWorker } = useThread();
  
  const worker = useMemo(() => 
    createWorker<T, R>(operation, strategy), 
    [createWorker, operation, strategy]
  );

  const execute = useCallback(async (data: T): Promise<R> => {
    return worker.execute(data);
  }, [worker]);

  const stop = useCallback(() => {
    worker.stop();
  }, [worker]);

  return { execute, stop, worker };
}

/**
 * Hook for thread metrics and monitoring
 */
export function useThreadMetrics() {
  const { thread } = useThread();
  const [metrics, setMetrics] = React.useState<ThreadMetrics>(() => thread.getMetrics());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(thread.getMetrics());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [thread]);

  return metrics;
}

// React 19 Suspense integration for smooth UX
export function ThreadSuspense<T, R>({ 
  operation, 
  data, 
  strategy = 'mixed',
  fallback = <div>Processing...</div>,
  children 
}: {
  operation: string;
  data: T;
  strategy?: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed';
  fallback?: React.ReactNode;
  children: (result: R) => React.ReactNode;
}) {
  const promise = useMemo(() => 
    execute<T, R>(operation, data, strategy), 
    [operation, data, strategy]
  );

  return (
    <Suspense fallback={fallback}>
      <ThreadSuspenseContent promise={promise} children={children} />
    </Suspense>
  );
}

function ThreadSuspenseContent<R>({ 
  promise, 
  children 
}: { 
  promise: Promise<R>; 
  children: (result: R) => React.ReactNode; 
}) {
  const result = use(promise);
  return <>{children(result)}</>;
}

// Performance monitoring component
export function ThreadMonitor() {
  const metrics = useThreadMetrics();

  return (
    <div className="thread-monitor">
      <h3>Thread Pool Status</h3>
      <div className="metrics-grid">
        <div className="metric">
          <label>Active Tasks</label>
          <span>{metrics.activeTasks}</span>
        </div>
        <div className="metric">
          <label>Queued Tasks</label>
          <span>{metrics.queuedTasks}</span>
        </div>
        <div className="metric">
          <label>Completed Tasks</label>
          <span>{metrics.completedTasks}</span>
        </div>
        <div className="pool-utilization">
          <h4>Pool Utilization</h4>
          {Object.entries(metrics.poolUtilization).map(([pool, utilization]) => (
            <div key={pool} className="pool-metric">
              <label>{pool.toUpperCase()}</label>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${utilization}%` }}
                />
              </div>
              <span>{utilization.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Pre-built components for common patterns

/**
 * ParallelProcessor - Component that processes arrays in parallel
 */
export function ParallelProcessor<T, R>({ 
  items, 
  operation, 
  strategy = 'cpu-bound',
  onComplete,
  renderItem 
}: {
  items: T[];
  operation: string;
  strategy?: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed';
  onComplete: (results: R[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const processParallel = useParallelMap<T, R>(operation, strategy);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleProcess = useCallback(async () => {
    setIsProcessing(true);
    try {
      const results = await processParallel(items);
      onComplete(results);
    } catch (error) {
      console.error('Parallel processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [items, processParallel, onComplete]);

  return (
    <div className="parallel-processor">
      <div className="items-list">
        {items.map((item, index) => (
          <div key={index} className="item">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      <button 
        onClick={handleProcess} 
        disabled={isProcessing}
        className="process-button"
      >
        {isProcessing ? 'Processing...' : `Process ${items.length} items`}
      </button>
    </div>
  );
}

/**
 * StreamProcessor - Component for processing data streams
 */
export function StreamProcessor<T, R>({ 
  operation, 
  strategy = 'mixed',
  onResult,
  children 
}: {
  operation: string;
  strategy?: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed';
  onResult: (result: R) => void;
  children: (process: (data: T) => Promise<void>) => React.ReactNode;
}) {
  const { execute: processData } = useWorker<T, R>(operation, strategy);

  const handleProcess = useCallback(async (data: T) => {
    try {
      const result = await processData(data);
      onResult(result);
    } catch (error) {
      console.error('Stream processing failed:', error);
    }
  }, [processData, onResult]);

  return <>{children(handleProcess)}</>;
}

// Export convenience functions for direct use
export { 
  execute, 
  parallelMap, 
  compute, 
  asyncIO, 
  aiProcess 
} from '../native/thread-primitives.js';