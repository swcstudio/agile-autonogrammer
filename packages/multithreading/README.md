# @swcstudio/multithreading

Advanced multithreading control for JavaScript with controllable thread management through Rust-powered Crossbeam, Rayon, and Tokio.

## Features

- **🚀 High Performance**: Rust-powered multithreading with zero-overhead abstractions
- **🎛️ Full Control**: Granular control over thread pools, channels, and async runtimes
- **🔄 Multiple Paradigms**: Support for Crossbeam channels, Rayon parallel processing, and Tokio async runtime
- **🛡️ Memory Safe**: Lock-free data structures with atomic operations
- **📊 Benchmarking**: Built-in performance testing and stress testing capabilities
- **🔧 Easy Integration**: Simple JavaScript API with TypeScript support

## Installation

```bash
npm install @swcstudio/multithreading
```

## Quick Start

```javascript
import { threadController } from '@swcstudio/multithreading';

// Initialize the multithreading system
await threadController.initialize({
  rayonThreads: 4,
  tokioWorkerThreads: 2
});

// Create a managed thread pool
const pool = threadController.createThreadPool('data-processing', {
  threads: 4,
  threadName: 'data-worker'
});

// Parallel processing
const data = Array.from({ length: 1000000 }, (_, i) => i);
const squared = await pool.map(data, 'square');
const sum = await pool.reduce(squared, 'sum');

console.log('Sum of squares:', sum);

// Create communication channels
const channel = threadController.createChannel('messages', {
  type: 'crossbeam',
  bounded: 1000
});

// Send and receive messages
channel.send('Hello from main thread!');
const message = channel.receive();
console.log('Received:', message);

// Atomic operations
const counter = threadController.createAtomicCell('counter', 0);
counter.increment();
counter.fetchAdd(10);
console.log('Counter value:', counter.load());

// Async operations with Tokio
const runtime = threadController.createRuntime('async-tasks', {
  workerThreads: 2
});

const result = await runtime.delay(1000, 'Task completed');
console.log(result);

// Cleanup
await threadController.shutdown();
```

## API Reference

### ThreadController

The main controller class that manages all multithreading resources.

#### Methods

##### `initialize(options?: ThreadControllerOptions): Promise<boolean>`

Initialize the multithreading system with optional configuration.

```javascript
await threadController.initialize({
  rayon: true,
  rayonThreads: 4,
  rayonThreadName: 'my-app-worker',
  tokio: true,
  tokioWorkerThreads: 2,
  tokioEnableIo: true,
  tokioEnableTime: true
});
```

##### `createThreadPool(name: string, config?: ThreadPoolConfig): ThreadPoolController`

Create a controlled thread pool for parallel processing.

```javascript
const pool = threadController.createThreadPool('processing', {
  threads: 4,
  threadName: 'worker',
  stackSize: 1024 * 1024, // 1MB stack size
  panicHandler: true
});

// Use the pool
const results = await pool.map([1, 2, 3, 4], 'square');
console.log(results); // [1, 4, 9, 16]
```

##### `createChannel(name: string, config?: ChannelConfig): ChannelController`

Create communication channels between threads.

```javascript
// Crossbeam unbounded channel
const unbounded = threadController.createChannel('unbounded', {
  type: 'crossbeam'
});

// Crossbeam bounded channel
const bounded = threadController.createChannel('bounded', {
  type: 'crossbeam',
  bounded: 100
});

// Array queue (fixed capacity)
const queue = threadController.createChannel('queue', {
  type: 'crossbeam-array',
  capacity: 1000
});

// Tokio broadcast channel
const broadcast = threadController.createChannel('broadcast', {
  type: 'tokio-broadcast',
  capacity: 100
});
```

##### `createAtomicCell(name: string, initialValue?: number): AtomicCellController`

Create atomic cells for lock-free operations.

```javascript
const counter = threadController.createAtomicCell('counter', 0);

// Atomic operations
counter.increment(); // Returns old value
counter.decrement(); // Returns old value
counter.fetchAdd(5); // Add 5, return old value
counter.store(100); // Set to 100
const current = counter.load(); // Get current value
```

##### `createRuntime(name: string, config?: RuntimeConfig): RuntimeController`

Create Tokio async runtimes.

```javascript
const runtime = threadController.createRuntime('async', {
  workerThreads: 2,
  maxBlockingThreads: 4,
  threadName: 'tokio-worker',
  enableIo: true,
  enableTime: true
});

// Async operations
const delayed = await runtime.delay(1000, 'Done');
const tasks = await runtime.parallelTasks(['task1', 'task2'], 100);
```

### Performance and Benchmarking

#### Benchmark Operations

```javascript
const benchmarks = await threadController.benchmark({
  dataSize: 1000000,
  operations: ['sequential_sum', 'parallel_sum', 'sequential_square', 'parallel_square']
});

console.log(benchmarks);
// {
//   sequential_sum: { operation: 'sequential_sum', durationMs: 15, throughput: 66666 },
//   parallel_sum: { operation: 'parallel_sum', durationMs: 4, throughput: 250000 },
//   ...
// }
```

#### Stress Testing

```javascript
const stressResults = await threadController.stressTest({
  numTasks: 1000,
  taskDurationMs: 10
});

console.log(`Completed ${stressResults.length} tasks`);
```

#### System Information

```javascript
const sysInfo = threadController.getSystemInfo();
console.log(`CPU cores: ${sysInfo.cpuCores}`);
console.log(`Rayon threads: ${sysInfo.rayonThreads}`);

const perfMetrics = threadController.getPerformanceMetrics();
console.log(`Memory usage: ${perfMetrics.memoryUsageMb}MB`);
```

## Advanced Usage

### Custom Thread Pool Operations

```javascript
const pool = threadController.createThreadPool('advanced', { threads: 8 });

// Map operation (transform each element)
const doubled = await pool.map([1, 2, 3, 4], 'double');

// Reduce operation (aggregate elements)
const sum = await pool.reduce([1, 2, 3, 4], 'sum', 0);

// Filter operation (select elements)
const evens = await pool.filter([1, 2, 3, 4, 5, 6], 'even');

// Sort operation
const sorted = await pool.sort([3, 1, 4, 1, 5], false);

// Chunk processing (process in batches)
const chunkSums = await pool.chunkProcess([1, 2, 3, 4, 5, 6], 2, 'sum_chunks');
```

### Channel Communication Patterns

```javascript
// Producer-Consumer with Crossbeam
const channel = threadController.createChannel('producer-consumer', {
  type: 'crossbeam',
  bounded: 100
});

// Producer
for (let i = 0; i < 1000; i++) {
  channel.send(`message-${i}`);
}

// Consumer
while (!channel.isEmpty()) {
  const message = channel.receive();
  if (message) {
    console.log('Processed:', message);
  }
}

// Broadcast pattern with Tokio
const broadcast = threadController.createChannel('notifications', {
  type: 'tokio-broadcast',
  capacity: 1000
});

broadcast.send('System notification');
console.log(`Sent to ${broadcast.receiverCount()} receivers`);
```

### Atomic Synchronization

```javascript
const shared = threadController.createAtomicCell('shared-counter', 0);

// Simulate concurrent access
const operations = Array.from({ length: 1000 }, (_, i) => 
  shared.fetchAdd(1)
);

console.log('Final value:', shared.load()); // Should be 1000
```

### Async Task Management

```javascript
const runtime = threadController.createRuntime('tasks', {
  workerThreads: 4
});

// Parallel async tasks
const tasks = ['download', 'process', 'upload', 'cleanup'];
const results = await runtime.parallelTasks(tasks, 500);

// Timeout handling
try {
  const result = await runtime.timeout(2000, 1000, 'long-running-task');
  console.log('Task completed:', result);
} catch (error) {
  console.log('Task timed out');
}

// Precise timing
const timer = runtime.createTimer();
// ... do work ...
console.log(`Operation took ${timer.elapsedMs()}ms`);
```

## Integration with Katalyst

This multithreading module integrates seamlessly with the Katalyst React framework:

```javascript
// In your Katalyst application
import { threadController } from '@swcstudio/multithreading';
import { useMultithreading } from '@katalyst/shared';

function MyComponent() {
  const { initialize, createThreadPool } = useMultithreading();
  
  useEffect(() => {
    initialize({
      rayonThreads: navigator.hardwareConcurrency || 4
    });
  }, []);
  
  const processData = async (data) => {
    const pool = threadController.createThreadPool('component-processing');
    const result = await pool.map(data, 'transform');
    pool.destroy();
    return result;
  };
  
  // ... rest of component
}
```

## Performance Tips

1. **Pool Reuse**: Create thread pools once and reuse them for multiple operations
2. **Appropriate Sizing**: Size thread pools based on available CPU cores
3. **Channel Types**: Use bounded channels to prevent memory issues
4. **Cleanup**: Always clean up resources when done
5. **Benchmarking**: Use built-in benchmarking to optimize for your specific use case

## Error Handling

```javascript
try {
  await threadController.initialize();
  const pool = threadController.createThreadPool('safe-pool');
  
  try {
    const result = await pool.map(data, 'risky-operation');
    console.log('Success:', result);
  } catch (operationError) {
    console.error('Operation failed:', operationError);
  } finally {
    pool.destroy();
  }
} catch (initError) {
  console.error('Failed to initialize multithreading:', initError);
} finally {
  await threadController.shutdown();
}
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please see our contributing guidelines for more information.