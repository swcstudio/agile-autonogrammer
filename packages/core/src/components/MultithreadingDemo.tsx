import React, { useState, useCallback, useTransition } from 'react';
import {
  useHydration,
  useStreamingHydration,
  useSuspenseHydration,
} from '../hooks/use-hydration.ts';
import {
  useAsyncComputation,
  useMultithreading,
  useParallelComputation,
} from '../hooks/use-multithreading.ts';
import {
  createServerAction,
  useParallelServerAction,
  useServerAction,
} from '../hooks/use-server-actions.ts';
import {
  useChannelCommunication,
  useMultithreadingMetrics,
  useMultithreadingStore,
  useTaskQueue,
  useThreadPools,
} from '../stores/multithreading-store.ts';
import {
  MultithreadingProvider,
  useMultithreadingContext,
  withMultithreading,
} from './MultithreadingProvider.tsx';

interface DemoProps {
  title?: string;
  showAdvanced?: boolean;
}

const ParallelComputationDemo: React.FC = () => {
  const [data, setData] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [operation, setOperation] = useState<string>('square');

  const { result, isComputing, recompute } = useParallelComputation(data, operation, [
    data,
    operation,
  ]);

  return (
    <div className="demo-section">
      <h3>Parallel Computation Demo</h3>
      <div className="controls">
        <input
          type="text"
          value={data.join(', ')}
          onChange={(e) =>
            setData(
              e.target.value
                .split(',')
                .map((n) => Number.parseInt(n.trim()))
                .filter((n) => !isNaN(n))
            )
          }
          placeholder="Enter numbers separated by commas"
        />
        <select value={operation} onChange={(e) => setOperation(e.target.value)}>
          <option value="square">Square</option>
          <option value="double">Double</option>
          <option value="increment">Increment</option>
        </select>
        <button onClick={recompute} disabled={isComputing}>
          {isComputing ? 'Computing...' : 'Recompute'}
        </button>
      </div>
      <div className="results">
        <p>Input: [{data.join(', ')}]</p>
        <p>Operation: {operation}</p>
        <p>Result: {result ? `[${result.result.join(', ')}]` : 'No result yet'}</p>
        <p>Duration: {result ? `${result.duration.toFixed(2)}ms` : 'N/A'}</p>
        <p>Status: {result ? result.status : 'pending'}</p>
      </div>
    </div>
  );
};

const AsyncComputationDemo: React.FC = () => {
  const [message, setMessage] = useState<string>('Hello World');
  const [operation, setOperation] = useState<string>('delay');

  const { result, isComputing, recompute } = useAsyncComputation(operation, message, [
    message,
    operation,
  ]);

  return (
    <div className="demo-section">
      <h3>Async Computation Demo</h3>
      <div className="controls">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message"
        />
        <select value={operation} onChange={(e) => setOperation(e.target.value)}>
          <option value="delay">Delay</option>
          <option value="timeout">Timeout</option>
          <option value="process">Process</option>
        </select>
        <button onClick={recompute} disabled={isComputing}>
          {isComputing ? 'Processing...' : 'Execute'}
        </button>
      </div>
      <div className="results">
        <p>Input: {message}</p>
        <p>Operation: {operation}</p>
        <p>Result: {result ? result.result : 'No result yet'}</p>
        <p>Duration: {result ? `${result.duration.toFixed(2)}ms` : 'N/A'}</p>
        <p>Status: {result ? result.status : 'pending'}</p>
      </div>
    </div>
  );
};

const ServerActionsDemo: React.FC = () => {
  const [isPending, startTransition] = useTransition();
  const [actionData, setActionData] = useState<string>('test data');

  const {
    execute: executeAction,
    data: result,
    isLoading: loading,
    error,
  } = useServerAction('processData', {
    timeout: 5000,
    retries: 3,
    priority: 'normal',
  });

  const {
    executeParallel,
    data: results,
    isLoading: parallelLoading,
  } = useParallelServerAction('processData');

  const handleSingleAction = useCallback(() => {
    startTransition(() => {
      executeAction(actionData);
    });
  }, [executeAction, actionData]);

  const handleParallelActions = useCallback(() => {
    startTransition(() => {
      executeParallel([
        { action: 'processData', data: 'data1' },
        { action: 'processData', data: 'data2' },
        { action: 'processData', data: 'data3' },
      ]);
    });
  }, [executeParallel]);

  return (
    <div className="demo-section">
      <h3>Server Actions Demo</h3>
      <div className="controls">
        <input
          type="text"
          value={actionData}
          onChange={(e) => setActionData(e.target.value)}
          placeholder="Enter data to process"
        />
        <button onClick={handleSingleAction} disabled={loading || isPending}>
          {loading ? 'Processing...' : 'Execute Single Action'}
        </button>
        <button onClick={handleParallelActions} disabled={parallelLoading || isPending}>
          {parallelLoading ? 'Processing...' : 'Execute Parallel Actions'}
        </button>
      </div>
      <div className="results">
        <h4>Single Action Result:</h4>
        <p>Result: {result ? JSON.stringify(result) : 'No result yet'}</p>
        <p>Error: {error || 'None'}</p>

        <h4>Parallel Actions Results:</h4>
        <p>Results: {results && results.length > 0 ? JSON.stringify(results) : 'No results yet'}</p>
      </div>
    </div>
  );
};

const HydrationDemo: React.FC = () => {
  const [serverData, setServerData] = useState<any>({
    message: 'Hello from server',
    timestamp: Date.now(),
  });
  const [hydrationMethod, setHydrationMethod] = useState<'complete' | 'streaming'>('complete');

  const {
    isHydrated,
    isHydrating,
    progress,
    error: hydrationError,
    rehydrate,
    abort,
  } = useHydration(serverData, {
    method: hydrationMethod,
    enableStreaming: hydrationMethod === 'streaming',
    chunkSize: 1000,
    timeout: 10000,
  });

  const { data: streamingData, isHydrating: streamingLoading } = useStreamingHydration(
    'demo-streaming-data',
    (async function* () {
      for (let i = 0; i < 10; i++) {
        yield { chunk: i, data: `Chunk ${i}` };
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    })(),
    { chunkSize: 1000, timeout: 10000 }
  );

  return (
    <div className="demo-section">
      <h3>Hydration Demo</h3>
      <div className="controls">
        <select
          value={hydrationMethod}
          onChange={(e) => setHydrationMethod(e.target.value as 'complete' | 'streaming')}
        >
          <option value="complete">Complete Hydration</option>
          <option value="streaming">Streaming Hydration</option>
        </select>
        <button onClick={rehydrate} disabled={isHydrating}>
          {isHydrating ? 'Hydrating...' : 'Rehydrate'}
        </button>
        <button onClick={abort} disabled={!isHydrating}>
          Abort
        </button>
      </div>
      <div className="results">
        <p>Hydrated: {isHydrated ? 'Yes' : 'No'}</p>
        <p>Hydrating: {isHydrating ? 'Yes' : 'No'}</p>
        <p>Progress: {progress}%</p>
        <p>Error: {hydrationError || 'None'}</p>

        <h4>Streaming Data:</h4>
        <p>Loading: {streamingLoading ? 'Yes' : 'No'}</p>
        <p>Chunks: {streamingData?.length || 0}</p>
        <div className="streaming-chunks">
          {streamingData?.map((chunk: any, index: number) => (
            <div key={index} className="chunk">
              Chunk {chunk.chunk}: {chunk.data}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StateManagementDemo: React.FC = () => {
  const { tasks, addTask, updateTask, removeTask } = useTaskQueue();
  const { pools, addPool, updatePool } = useThreadPools();
  const { metrics, updateMetrics, resetMetrics } = useMultithreadingMetrics();
  const { createChannel, subscribe, publish } = useChannelCommunication();

  const [newTaskOperation, setNewTaskOperation] = useState<string>('compute');
  const [channelMessage, setChannelMessage] = useState<string>('Hello Channel');

  const handleAddTask = useCallback(() => {
    const task = {
      id: `task_${Date.now()}`,
      operation: newTaskOperation,
      data: { value: Math.random() * 100 },
      priority: 'normal' as const,
      status: 'pending' as const,
      startTime: Date.now(),
    };
    addTask(task);
  }, [addTask, newTaskOperation]);

  const handlePublishMessage = useCallback(() => {
    publish('demo-channel', { message: channelMessage, timestamp: Date.now() });
  }, [publish, channelMessage]);

  React.useEffect(() => {
    createChannel('demo-channel', {});
    const unsubscribe = subscribe('demo-channel', (data) => {
      console.log('Received channel message:', data);
    });
    return unsubscribe;
  }, [createChannel, subscribe]);

  return (
    <div className="demo-section">
      <h3>State Management Demo</h3>

      <div className="subsection">
        <h4>Task Queue</h4>
        <div className="controls">
          <input
            type="text"
            value={newTaskOperation}
            onChange={(e) => setNewTaskOperation(e.target.value)}
            placeholder="Task operation"
          />
          <button onClick={handleAddTask}>Add Task</button>
        </div>
        <div className="task-list">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="task-item">
              {task.operation} - {task.status} - Priority: {task.priority}
            </div>
          ))}
        </div>
        <p>Total Tasks: {tasks.length}</p>
      </div>

      <div className="subsection">
        <h4>Thread Pools</h4>
        <div className="pool-list">
          {pools.map((pool) => (
            <div key={pool.id} className="pool-item">
              {pool.type} - Workers: {pool.workerCount} - Active: {pool.activeTasks}/
              {pool.totalTasks}
            </div>
          ))}
        </div>
      </div>

      <div className="subsection">
        <h4>Performance Metrics</h4>
        <div className="metrics">
          <p>Total Tasks: {metrics.totalTasks}</p>
          <p>Completed: {metrics.completedTasks}</p>
          <p>Failed: {metrics.failedTasks}</p>
          <p>Avg Duration: {metrics.averageTaskDuration.toFixed(2)}ms</p>
          <p>Throughput: {metrics.throughput.toFixed(2)} ops/sec</p>
          <p>Memory Usage: {metrics.memoryUsage.toFixed(2)}MB</p>
          <p>CPU Usage: {metrics.cpuUsage.toFixed(2)}%</p>
        </div>
        <button onClick={resetMetrics}>Reset Metrics</button>
      </div>

      <div className="subsection">
        <h4>Channel Communication</h4>
        <div className="controls">
          <input
            type="text"
            value={channelMessage}
            onChange={(e) => setChannelMessage(e.target.value)}
            placeholder="Channel message"
          />
          <button onClick={handlePublishMessage}>Publish Message</button>
        </div>
      </div>
    </div>
  );
};

const MultithreadingDemoContent: React.FC<DemoProps> = ({
  title = 'Katalyst Multithreading Demo',
  showAdvanced = true,
}) => {
  const { state, initialize, runParallelTask, runAsyncTask, benchmark, getMetrics } =
    useMultithreading({
      autoInitialize: true,
      workerThreads: 4,
      enableProfiling: true,
    });

  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);

  const handleBenchmark = useCallback(async () => {
    try {
      const result = await benchmark('parallel_sum', 10000);
      setBenchmarkResult(result);
    } catch (error) {
      console.error('Benchmark failed:', error);
    }
  }, [benchmark]);

  const handleGetMetrics = useCallback(() => {
    const metrics = getMetrics();
    setSystemMetrics(metrics);
  }, [getMetrics]);

  if (!state.isInitialized && state.isLoading) {
    return <div className="loading">Initializing multithreading...</div>;
  }

  if (state.error) {
    return <div className="error">Error: {state.error}</div>;
  }

  return (
    <div className="multithreading-demo">
      <h1>{title}</h1>

      <div className="system-status">
        <h2>System Status</h2>
        <p>Initialized: {state.isInitialized ? 'Yes' : 'No'}</p>
        <p>Active Threads: {state.activeThreads}</p>
        <p>Completed Tasks: {state.completedTasks}</p>
        <p>Failed Tasks: {state.failedTasks}</p>
        <p>Average Task Duration: {state.averageTaskDuration.toFixed(2)}ms</p>

        <div className="controls">
          <button onClick={handleBenchmark}>Run Benchmark</button>
          <button onClick={handleGetMetrics}>Get System Metrics</button>
        </div>

        {benchmarkResult && (
          <div className="benchmark-result">
            <h3>Benchmark Result</h3>
            <p>Operation: {benchmarkResult.operation}</p>
            <p>Data Size: {benchmarkResult.dataSize}</p>
            <p>Duration: {benchmarkResult.duration.toFixed(2)}ms</p>
            <p>Throughput: {benchmarkResult.throughput.toFixed(2)} ops/sec</p>
          </div>
        )}

        {systemMetrics && (
          <div className="system-metrics">
            <h3>System Metrics</h3>
            <pre>{JSON.stringify(systemMetrics, null, 2)}</pre>
          </div>
        )}
      </div>

      <ParallelComputationDemo />
      <AsyncComputationDemo />
      <ServerActionsDemo />
      <HydrationDemo />
      <StateManagementDemo />

      {showAdvanced && (
        <div className="advanced-features">
          <h2>Advanced Features</h2>
          <p>
            This demo showcases the comprehensive React 19 ecosystem integration with Rust
            multithreading:
          </p>
          <ul>
            <li>
              <strong>Hooks:</strong> useMultithreading, useParallelComputation, useAsyncComputation
            </li>
            <li>
              <strong>Server Actions:</strong> React 19 useTransition integration for non-blocking
              operations
            </li>
            <li>
              <strong>Hydration:</strong> SSR support with streaming and suspense patterns
            </li>
            <li>
              <strong>State Management:</strong> Zustand store for global multithreading state
            </li>
            <li>
              <strong>Context:</strong> Provider pattern for dependency injection and lifecycle
              management
            </li>
            <li>
              <strong>Channel Communication:</strong> Pub/sub patterns for inter-component
              communication
            </li>
            <li>
              <strong>Performance Monitoring:</strong> Real-time metrics and benchmarking
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export const MultithreadingDemo: React.FC<DemoProps> = (props) => {
  return (
    <MultithreadingProvider config={{ autoInitialize: true, enableProfiling: true }}>
      <MultithreadingDemoContent {...props} />
    </MultithreadingProvider>
  );
};

export default MultithreadingDemo;
