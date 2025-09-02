/**
 * @swcstudio/multithreading Examples
 * 
 * Comprehensive examples demonstrating advanced multithreading control
 * with JavaScript primitives backed by Rust performance.
 */

const { threadController } = require('./wrapper');

// Example 1: Basic Thread Pool Setup
async function basicThreadPoolExample() {
  console.log('🚀 Basic Thread Pool Example');
  
  // Initialize the multithreading system
  await threadController.initialize({
    rayonThreads: 4,
    tokioWorkerThreads: 2,
    rayonThreadName: 'data-processor',
    tokioThreadName: 'async-handler'
  });

  // Create a dedicated thread pool for data processing
  const pool = threadController.createThreadPool('data-processing', {
    threads: 4,
    threadName: 'worker',
    panicHandler: true
  });

  // Generate test data
  const data = Array.from({ length: 100000 }, (_, i) => i + 1);

  // Parallel operations
  console.log('Processing 100,000 numbers...');
  const start = Date.now();
  
  const squared = await pool.map(data, 'square');
  const filtered = await pool.filter(squared, 'greater_than', 1000);
  const sum = await pool.reduce(filtered, 'sum');
  
  const end = Date.now();
  
  console.log(`Sum of squares > 1000: ${sum}`);
  console.log(`Processed in ${end - start}ms using ${pool.getThreadCount()} threads`);
  
  // Cleanup
  pool.destroy();
}

// Example 2: Channel Communication
async function channelCommunicationExample() {
  console.log('📡 Channel Communication Example');
  
  // Create different types of channels
  const unbounded = threadController.createChannel('producer-consumer', {
    type: 'crossbeam'
  });
  
  const bounded = threadController.createChannel('rate-limited', {
    type: 'crossbeam',
    bounded: 100
  });
  
  const queue = threadController.createChannel('task-queue', {
    type: 'crossbeam-array',
    capacity: 1000
  });
  
  const broadcast = threadController.createChannel('notifications', {
    type: 'tokio-broadcast',
    capacity: 500
  });

  // Producer-Consumer pattern
  console.log('Producer sending 1000 messages...');
  for (let i = 0; i < 1000; i++) {
    unbounded.send(`task-${i}`);
  }

  console.log('Consumer processing messages...');
  let processed = 0;
  while (!unbounded.isEmpty()) {
    const message = unbounded.receive();
    if (message) {
      processed++;
      // Simulate work
      if (processed % 100 === 0) {
        console.log(`Processed ${processed} messages`);
      }
    }
  }

  // Broadcast pattern
  console.log('Broadcasting system notifications...');
  broadcast.send('System startup complete');
  broadcast.send('Database connection established');
  broadcast.send('Cache warmed up');
  
  console.log(`Broadcast to ${broadcast.receiverCount()} subscribers`);

  // Queue pattern with capacity limits
  console.log('Filling task queue...');
  let queued = 0;
  for (let i = 0; i < 1500; i++) {
    if (queue.push(`priority-task-${i}`)) {
      queued++;
    } else {
      console.log(`Queue full at ${queued} items`);
      break;
    }
  }

  console.log(`Queue usage: ${queue.length()}/${queue.capacity()}`);
  
  // Cleanup
  unbounded.destroy();
  bounded.destroy();
  queue.destroy();
  broadcast.destroy();
}

// Example 3: Atomic Operations
async function atomicOperationsExample() {
  console.log('⚛️ Atomic Operations Example');
  
  // Create atomic counters
  const globalCounter = threadController.createAtomicCell('global-counter', 0);
  const hitCounter = threadController.createAtomicCell('hit-counter', 0);
  const errorCounter = threadController.createAtomicCell('error-counter', 0);

  // Simulate concurrent access
  console.log('Simulating concurrent access...');
  
  // Simulate 1000 operations
  for (let i = 0; i < 1000; i++) {
    globalCounter.increment();
    
    // Simulate success/error ratio
    if (Math.random() > 0.1) {
      hitCounter.increment();
    } else {
      errorCounter.increment();
    }
  }

  // Batch operations
  globalCounter.fetchAdd(500);
  hitCounter.fetchAdd(450);
  errorCounter.fetchAdd(50);

  console.log(`Global counter: ${globalCounter.load()}`);
  console.log(`Hit counter: ${hitCounter.load()}`);
  console.log(`Error counter: ${errorCounter.load()}`);
  console.log(`Success rate: ${((hitCounter.load() / globalCounter.load()) * 100).toFixed(2)}%`);

  // Atomic compare-and-swap
  const oldValue = globalCounter.load();
  const swapped = globalCounter.compareExchange(oldValue, 2000);
  console.log(`Compare-and-swap ${oldValue} -> 2000: ${swapped ? 'Success' : 'Failed'}`);
  
  // Cleanup
  globalCounter.destroy();
  hitCounter.destroy();
  errorCounter.destroy();
}

// Example 4: Async Runtime Management
async function asyncRuntimeExample() {
  console.log('🔄 Async Runtime Management Example');
  
  // Create multiple runtimes for different purposes
  const ioRuntime = threadController.createRuntime('io-operations', {
    workerThreads: 2,
    enableIo: true,
    enableTime: true
  });
  
  const cpuRuntime = threadController.createRuntime('cpu-intensive', {
    workerThreads: 4,
    maxBlockingThreads: 8,
    enableIo: false,
    enableTime: true
  });

  // Simulate I/O operations
  console.log('Starting I/O operations...');
  const ioTasks = [
    'fetch-user-data',
    'validate-credentials',
    'update-session',
    'log-activity'
  ];
  
  const ioResults = await ioRuntime.parallelTasks(ioTasks, 100);
  console.log('I/O Results:', ioResults.slice(0, 2)); // Show first 2

  // Delay operations
  console.log('Testing delay operations...');
  const delayResult = await cpuRuntime.delay(500, 'CPU-intensive task completed');
  console.log(delayResult);

  // Timeout operations
  console.log('Testing timeout operations...');
  try {
    const timeoutResult = await cpuRuntime.timeout(2000, 1000, 'long-computation');
    console.log('Timeout result:', timeoutResult);
  } catch (error) {
    console.log('Operation timed out as expected');
  }

  // Timer operations
  console.log('Testing precise timing...');
  const timer = cpuRuntime.createTimer();
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`Operation took ${timer.elapsedMs()}ms`);
  timer.reset();
  
  // Cleanup
  ioRuntime.destroy();
  cpuRuntime.destroy();
}

// Example 5: Performance Benchmarking
async function performanceBenchmarkExample() {
  console.log('📊 Performance Benchmark Example');
  
  // System information
  const sysInfo = threadController.getSystemInfo();
  console.log(`System: ${sysInfo.cpuCores} cores, ${sysInfo.rayonThreads} Rayon threads`);
  
  // Benchmark different operations
  const benchmarks = await threadController.benchmark({
    dataSize: 1000000,
    operations: ['sequential_sum', 'parallel_sum', 'sequential_square', 'parallel_square']
  });

  console.log('Benchmark Results:');
  Object.entries(benchmarks).forEach(([operation, result]) => {
    console.log(`  ${operation}:`);
    console.log(`    Duration: ${result.durationMs}ms`);
    console.log(`    Throughput: ${result.throughput.toLocaleString()} ops/sec`);
    console.log(`    Result: ${result.result}`);
  });

  // Calculate speedup
  const seqSum = benchmarks.sequential_sum;
  const parSum = benchmarks.parallel_sum;
  const speedup = seqSum.durationMs / parSum.durationMs;
  console.log(`Parallel speedup: ${speedup.toFixed(2)}x`);

  // Performance metrics
  const metrics = threadController.getPerformanceMetrics();
  console.log('Current Performance Metrics:');
  console.log(`  Memory usage: ${metrics.memoryUsageMb}MB`);
  console.log(`  Active tasks: ${metrics.activeTasks}`);
  console.log(`  Uptime: ${(metrics.uptimeMs / 1000).toFixed(2)}s`);
}

// Example 6: Stress Testing
async function stressTestExample() {
  console.log('🔥 Stress Test Example');
  
  console.log('Running stress test with 1000 concurrent tasks...');
  const stressResults = await threadController.stressTest({
    numTasks: 1000,
    taskDurationMs: 10
  });

  // Analyze results
  const durations = stressResults.map(r => r.durationMs);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  console.log(`Stress Test Results:`);
  console.log(`  Tasks completed: ${stressResults.length}`);
  console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min duration: ${minDuration}ms`);
  console.log(`  Max duration: ${maxDuration}ms`);
  console.log(`  Variance: ${(maxDuration - minDuration)}ms`);

  // Check for thread distribution
  const threadIds = [...new Set(stressResults.map(r => r.threadId))];
  console.log(`  Threads used: ${threadIds.length}`);
}

// Example 7: Complex Workflow
async function complexWorkflowExample() {
  console.log('🔧 Complex Workflow Example');
  
  // Create specialized components
  const dataPool = threadController.createThreadPool('data-processing', { threads: 4 });
  const computePool = threadController.createThreadPool('computation', { threads: 2 });
  const pipeline = threadController.createChannel('pipeline', { type: 'crossbeam', bounded: 1000 });
  const results = threadController.createChannel('results', { type: 'crossbeam-array', capacity: 500 });
  const progress = threadController.createAtomicCell('progress', 0);
  const runtime = threadController.createRuntime('orchestrator', { workerThreads: 2 });

  console.log('Setting up data processing pipeline...');
  
  // Stage 1: Data generation and initial processing
  const rawData = Array.from({ length: 10000 }, (_, i) => i + 1);
  console.log(`Generated ${rawData.length} data points`);
  
  // Stage 2: Parallel preprocessing
  const preprocessed = await dataPool.map(rawData, 'square');
  progress.store(25);
  console.log(`Preprocessing completed (${progress.load()}%)`);
  
  // Stage 3: Filtering and sorting
  const filtered = await dataPool.filter(preprocessed, 'greater_than', 100);
  const sorted = await computePool.sort(filtered, false);
  progress.store(50);
  console.log(`Filtering and sorting completed (${progress.load()}%)`);
  
  // Stage 4: Chunked processing
  const chunks = await computePool.chunkProcess(sorted, 100, 'sum_chunks');
  progress.store(75);
  console.log(`Chunk processing completed (${progress.load()}%)`);
  
  // Stage 5: Final aggregation
  const finalResult = await computePool.reduce(chunks, 'sum');
  progress.store(100);
  console.log(`Final result: ${finalResult} (${progress.load()}% complete)`);
  
  // Stage 6: Async cleanup and reporting
  await runtime.delay(100, 'Generating report');
  
  const report = {
    originalDataPoints: rawData.length,
    preprocessedValues: preprocessed.length,
    filteredValues: filtered.length,
    chunks: chunks.length,
    finalResult: finalResult,
    processingTime: Date.now() - startTime
  };
  
  console.log('Workflow Report:', report);
  
  // Cleanup all resources
  dataPool.destroy();
  computePool.destroy();
  pipeline.destroy();
  results.destroy();
  progress.destroy();
  runtime.destroy();
}

// Example 8: Resource Management
async function resourceManagementExample() {
  console.log('🗂️ Resource Management Example');
  
  // Check initial status
  let status = threadController.getStatus();
  console.log('Initial Status:', {
    initialized: status.initialized,
    activeThreadPools: status.activeThreadPools.length,
    activeChannels: status.activeChannels.length,
    activeRuntimes: status.activeRuntimes.length,
    activeAtomicCells: status.activeAtomicCells.length
  });

  // Create various resources
  const resources = {
    pools: [
      threadController.createThreadPool('pool1', { threads: 2 }),
      threadController.createThreadPool('pool2', { threads: 4 })
    ],
    channels: [
      threadController.createChannel('channel1', { type: 'crossbeam' }),
      threadController.createChannel('channel2', { type: 'tokio-broadcast', capacity: 100 })
    ],
    atomics: [
      threadController.createAtomicCell('atomic1', 0),
      threadController.createAtomicCell('atomic2', 100)
    ],
    runtimes: [
      threadController.createRuntime('runtime1', { workerThreads: 1 })
    ]
  };

  // Check status after resource creation
  status = threadController.getStatus();
  console.log('After Resource Creation:', {
    activeThreadPools: status.activeThreadPools,
    activeChannels: status.activeChannels,
    activeRuntimes: status.activeRuntimes,
    activeAtomicCells: status.activeAtomicCells
  });

  // Use resources briefly
  await resources.pools[0].map([1, 2, 3, 4], 'square');
  resources.channels[0].send('test message');
  resources.atomics[0].increment();
  await resources.runtimes[0].delay(50, 'quick task');

  // Selective cleanup
  resources.pools[0].destroy();
  resources.channels[1].destroy();
  
  // Check status after partial cleanup
  status = threadController.getStatus();
  console.log('After Partial Cleanup:', {
    activeThreadPools: status.activeThreadPools,
    activeChannels: status.activeChannels
  });

  // Full cleanup of remaining resources
  resources.pools[1].destroy();
  resources.channels[0].destroy();
  resources.atomics[0].destroy();
  resources.atomics[1].destroy();
  resources.runtimes[0].destroy();

  // Final status check
  status = threadController.getStatus();
  console.log('After Full Cleanup:', {
    activeThreadPools: status.activeThreadPools.length,
    activeChannels: status.activeChannels.length,
    activeRuntimes: status.activeRuntimes.length,
    activeAtomicCells: status.activeAtomicCells.length
  });
}

// Main execution function
async function runAllExamples() {
  const startTime = Date.now();
  
  try {
    console.log('🎯 @swcstudio/multithreading Examples\n');
    
    await basicThreadPoolExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await channelCommunicationExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await atomicOperationsExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await asyncRuntimeExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await performanceBenchmarkExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await stressTestExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await complexWorkflowExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await resourceManagementExample();
    
    const totalTime = Date.now() - startTime;
    console.log(`\n✅ All examples completed in ${totalTime}ms`);
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  } finally {
    // Ensure clean shutdown
    await threadController.shutdown();
    console.log('🔒 Multithreading system shutdown complete');
  }
}

// Export functions for individual testing
module.exports = {
  runAllExamples,
  basicThreadPoolExample,
  channelCommunicationExample,
  atomicOperationsExample,
  asyncRuntimeExample,
  performanceBenchmarkExample,
  stressTestExample,
  complexWorkflowExample,
  resourceManagementExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}