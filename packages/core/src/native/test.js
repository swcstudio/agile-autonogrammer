/**
 * @swcstudio/multithreading Integration Test
 * 
 * Validates the complete multithreading module functionality
 */

const { threadController, createThreadPool, createChannel, createAtomicCell } = require('./wrapper');

// Test configuration
const TEST_CONFIG = {
  verbose: process.env.TEST_VERBOSE === 'true',
  skipStressTests: process.env.SKIP_STRESS_TESTS === 'true',
  smallDataSize: 1000, // For CI environments
  largeDataSize: 100000 // For performance testing
};

class TestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 @swcstudio/multithreading Test Suite\n');
    this.startTime = Date.now();

    for (const { name, testFn } of this.tests) {
      try {
        if (TEST_CONFIG.verbose) {
          console.log(`Running: ${name}`);
        }
        
        await testFn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}: ${error.message}`);
        if (TEST_CONFIG.verbose) {
          console.error(error.stack);
        }
      }
    }

    this.printSummary();
  }

  printSummary() {
    const total = this.passed + this.failed;
    const duration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${this.passed}/${total} passed`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.failed > 0) {
      console.log(`❌ ${this.failed} tests failed`);
      process.exit(1);
    } else {
      console.log('✅ All tests passed');
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  assertGreaterThan(actual, expected, message) {
    if (actual <= expected) {
      throw new Error(`${message}: expected ${actual} > ${expected}`);
    }
  }

  assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}: arrays don't match`);
    }
  }
}

const suite = new TestSuite();

// Test 1: Initialization and System Info
suite.test('System Initialization', async () => {
  const initialized = await threadController.initialize({
    rayonThreads: 2,
    tokioWorkerThreads: 1,
    rayonThreadName: 'test-rayon',
    tokioThreadName: 'test-tokio'
  });

  suite.assert(initialized, 'Failed to initialize multithreading system');

  const status = threadController.getStatus();
  suite.assert(status.initialized, 'System not marked as initialized');
  suite.assert(status.rayonInitialized, 'Rayon not initialized');
  suite.assert(status.tokioInitialized, 'Tokio not initialized');

  const sysInfo = threadController.getSystemInfo();
  suite.assertGreaterThan(sysInfo.cpuCores, 0, 'Invalid CPU core count');
  suite.assertGreaterThan(sysInfo.rayonThreads, 0, 'Invalid Rayon thread count');
  suite.assert(sysInfo.tokioAvailable, 'Tokio not available');
  suite.assert(sysInfo.crossbeamAvailable, 'Crossbeam not available');
});

// Test 2: Thread Pool Operations
suite.test('Thread Pool Basic Operations', async () => {
  const pool = threadController.createThreadPool('test-pool', {
    threads: 2,
    threadName: 'test-worker'
  });

  suite.assertGreaterThan(pool.getThreadCount(), 0, 'Invalid thread count');

  // Test parallel map
  const input = [1, 2, 3, 4, 5];
  const squared = await pool.map(input, 'square');
  const expected = [1, 4, 9, 16, 25];
  suite.assertArrayEqual(squared, expected, 'Parallel map failed');

  // Test parallel reduce
  const sum = await pool.reduce(input, 'sum');
  suite.assertEqual(sum, 15, 'Parallel reduce failed');

  // Test parallel filter
  const evens = await pool.filter([1, 2, 3, 4, 5, 6], 'even');
  suite.assertArrayEqual(evens, [2, 4, 6], 'Parallel filter failed');

  // Test parallel sort
  const unsorted = [3, 1, 4, 1, 5, 9, 2, 6];
  const sorted = await pool.sort(unsorted, false);
  suite.assertArrayEqual(sorted, [1, 1, 2, 3, 4, 5, 6, 9], 'Parallel sort failed');

  pool.destroy();
});

// Test 3: Convenience Functions
suite.test('Convenience Functions', async () => {
  const pool = createThreadPool('convenience-pool', { threads: 1 });
  const data = [1, 2, 3];
  const result = await pool.map(data, 'double');
  suite.assertArrayEqual(result, [2, 4, 6], 'Convenience function failed');
  pool.destroy();
});

// Test 4: Channel Communication
suite.test('Channel Communication', async () => {
  // Test crossbeam channel
  const channel = threadController.createChannel('test-channel', {
    type: 'crossbeam'
  });

  // Send and receive
  suite.assert(channel.send('hello'), 'Failed to send message');
  const message = channel.receive();
  suite.assertEqual(message, 'hello', 'Message not received correctly');

  // Test empty channel
  suite.assert(channel.isEmpty(), 'Channel should be empty');
  suite.assertEqual(channel.receive(), null, 'Should return null for empty channel');

  channel.destroy();

  // Test array queue
  const queue = threadController.createChannel('test-queue', {
    type: 'crossbeam-array',
    capacity: 10
  });

  suite.assertEqual(queue.capacity(), 10, 'Invalid queue capacity');
  suite.assert(queue.push('item1'), 'Failed to push to queue');
  suite.assertEqual(queue.length(), 1, 'Invalid queue length');
  suite.assertEqual(queue.pop(), 'item1', 'Failed to pop from queue');
  suite.assert(queue.isEmpty(), 'Queue should be empty');

  queue.destroy();
});

// Test 5: Atomic Operations
suite.test('Atomic Operations', async () => {
  const atomic = threadController.createAtomicCell('test-atomic', 10);

  suite.assertEqual(atomic.load(), 10, 'Initial value incorrect');

  atomic.store(20);
  suite.assertEqual(atomic.load(), 20, 'Store operation failed');

  const oldValue = atomic.swap(30);
  suite.assertEqual(oldValue, 20, 'Swap should return old value');
  suite.assertEqual(atomic.load(), 30, 'Swap should set new value');

  const prevValue = atomic.fetchAdd(5);
  suite.assertEqual(prevValue, 30, 'FetchAdd should return previous value');
  suite.assertEqual(atomic.load(), 35, 'FetchAdd should increment value');

  const prevSub = atomic.fetchSub(10);
  suite.assertEqual(prevSub, 35, 'FetchSub should return previous value');
  suite.assertEqual(atomic.load(), 25, 'FetchSub should decrement value');

  // Test convenience methods
  const prevInc = atomic.increment();
  suite.assertEqual(prevInc, 25, 'Increment should return previous value');
  suite.assertEqual(atomic.load(), 26, 'Increment should add 1');

  const prevDec = atomic.decrement();
  suite.assertEqual(prevDec, 26, 'Decrement should return previous value');
  suite.assertEqual(atomic.load(), 25, 'Decrement should subtract 1');

  atomic.reset();
  suite.assertEqual(atomic.load(), 10, 'Reset should restore initial value');

  atomic.destroy();
});

// Test 6: Async Runtime Operations
suite.test('Async Runtime Operations', async () => {
  const runtime = threadController.createRuntime('test-runtime', {
    workerThreads: 1,
    enableTime: true
  });

  // Test delay
  const start = Date.now();
  const result = await runtime.delay(100, 'test message');
  const elapsed = Date.now() - start;
  
  suite.assertGreaterThan(elapsed, 90, 'Delay too short');
  suite.assert(result.includes('test message'), 'Delay result incorrect');

  // Test parallel tasks
  const tasks = ['task1', 'task2', 'task3'];
  const results = await runtime.parallelTasks(tasks, 50);
  suite.assertEqual(results.length, 3, 'Should return all task results');

  // Test timer
  const timer = runtime.createTimer();
  await new Promise(resolve => setTimeout(resolve, 50));
  const elapsedMs = timer.elapsedMs();
  suite.assertGreaterThan(elapsedMs, 40, 'Timer should measure elapsed time');

  runtime.destroy();
});

// Test 7: Performance Benchmarking
suite.test('Performance Benchmarking', async () => {
  const benchmark = await threadController.benchmark({
    dataSize: TEST_CONFIG.smallDataSize,
    operations: ['sequential_sum', 'parallel_sum']
  });

  suite.assert(benchmark.sequential_sum, 'Missing sequential benchmark');
  suite.assert(benchmark.parallel_sum, 'Missing parallel benchmark');

  const seqResult = benchmark.sequential_sum;
  const parResult = benchmark.parallel_sum;

  suite.assertEqual(seqResult.operation, 'sequential_sum', 'Wrong operation name');
  suite.assertEqual(seqResult.dataSize, TEST_CONFIG.smallDataSize, 'Wrong data size');
  suite.assertGreaterThan(seqResult.durationMs, 0, 'Invalid duration');
  suite.assertGreaterThan(seqResult.throughput, 0, 'Invalid throughput');

  // Results should be the same regardless of execution method
  suite.assertEqual(seqResult.result, parResult.result, 'Sequential and parallel results should match');
});

// Test 8: Resource Management
suite.test('Resource Management', async () => {
  const initialStatus = threadController.getStatus();
  const initialPools = initialStatus.activeThreadPools.length;
  const initialChannels = initialStatus.activeChannels.length;

  // Create resources
  const pool = threadController.createThreadPool('mgmt-test-pool');
  const channel = threadController.createChannel('mgmt-test-channel');
  const atomic = threadController.createAtomicCell('mgmt-test-atomic');

  const afterCreate = threadController.getStatus();
  suite.assertEqual(afterCreate.activeThreadPools.length, initialPools + 1, 'Pool not tracked');
  suite.assertEqual(afterCreate.activeChannels.length, initialChannels + 1, 'Channel not tracked');
  suite.assertEqual(afterCreate.activeAtomicCells.length, 1, 'Atomic not tracked');

  // Destroy resources
  pool.destroy();
  channel.destroy();
  atomic.destroy();

  const afterDestroy = threadController.getStatus();
  suite.assertEqual(afterDestroy.activeThreadPools.length, initialPools, 'Pool not cleaned up');
  suite.assertEqual(afterDestroy.activeChannels.length, initialChannels, 'Channel not cleaned up');
  suite.assertEqual(afterDestroy.activeAtomicCells.length, 0, 'Atomic not cleaned up');
});

// Test 9: Error Handling
suite.test('Error Handling', async () => {
  // Test duplicate names
  const pool1 = threadController.createThreadPool('duplicate-name');
  
  try {
    threadController.createThreadPool('duplicate-name');
    suite.assert(false, 'Should throw error for duplicate pool name');
  } catch (error) {
    suite.assert(error.message.includes('already exists'), 'Wrong error message');
  }
  
  pool1.destroy();

  // Test operations on destroyed resources
  const tempPool = threadController.createThreadPool('temp-pool');
  tempPool.destroy();
  
  // Using destroyed pool should still work (pool object is independent)
  // but let's test that the resource was properly cleaned up
  const status = threadController.getStatus();
  suite.assert(!status.activeThreadPools.includes('temp-pool'), 'Destroyed pool still tracked');
});

// Test 10: Large Data Processing (if enabled)
if (!TEST_CONFIG.skipStressTests) {
  suite.test('Large Data Processing', async () => {
    const pool = threadController.createThreadPool('large-data-pool', { threads: 4 });
    const largeData = Array.from({ length: TEST_CONFIG.largeDataSize }, (_, i) => i + 1);
    
    console.log(`  Processing ${TEST_CONFIG.largeDataSize} elements...`);
    const start = Date.now();
    
    const processed = await pool.map(largeData, 'square');
    const filtered = await pool.filter(processed, 'greater_than', 1000000);
    const final = await pool.reduce(filtered, 'sum');
    
    const duration = Date.now() - start;
    console.log(`  Processed in ${duration}ms, result: ${final}`);
    
    suite.assertGreaterThan(processed.length, 0, 'No data processed');
    suite.assertGreaterThan(final, 0, 'Invalid final result');
    
    pool.destroy();
  });

  suite.test('Stress Test', async () => {
    console.log('  Running stress test...');
    const results = await threadController.stressTest({
      numTasks: 100,
      taskDurationMs: 5
    });

    suite.assertEqual(results.length, 100, 'Not all stress test tasks completed');
    
    const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;
    console.log(`  Average task duration: ${avgDuration.toFixed(2)}ms`);
    
    suite.assertGreaterThan(avgDuration, 0, 'Invalid average duration');
  });
}

// Test 11: Performance Metrics
suite.test('Performance Metrics', async () => {
  const metrics = threadController.getPerformanceMetrics();
  
  suite.assertGreaterThan(metrics.cpuCores, 0, 'Invalid CPU core count');
  suite.assertGreaterThan(metrics.rayonThreads, 0, 'Invalid Rayon thread count');
  suite.assert(typeof metrics.memoryUsageMb === 'number', 'Invalid memory usage type');
  suite.assert(typeof metrics.uptimeMs === 'number', 'Invalid uptime type');
  suite.assert(typeof metrics.activeTasks === 'number', 'Invalid active tasks type');
});

// Run the test suite
async function runTests() {
  try {
    await suite.run();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  } finally {
    // Ensure clean shutdown
    try {
      await threadController.shutdown();
      console.log('🔒 Test cleanup completed');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Export for external use
module.exports = { runTests, TestSuite };

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}