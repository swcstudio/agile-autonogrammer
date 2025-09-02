const nativeBinding = require('./index.js');

/**
 * @swcstudio/multithreading - Advanced Multithreading Control for JavaScript
 * 
 * A comprehensive multithreading solution providing controllable thread management
 * with Rust-powered performance through Crossbeam, Rayon, and Tokio.
 */

class ThreadController {
  constructor() {
    this.manager = new nativeBinding.MultithreadingManager();
    this.initialized = false;
    this.activeThreadPools = new Map();
    this.activeChannels = new Map();
    this.activeRuntimes = new Map();
    this.threadControllers = new Map();
  }

  /**
   * Initialize the multithreading system with full control
   * @param {Object} options - Configuration options
   * @returns {Promise<boolean>} Success status
   */
  async initialize(options = {}) {
    try {
      const initResult = nativeBinding.initializeMultithreading();
      
      // Initialize Rayon if requested
      if (options.rayon !== false) {
        const rayonConfig = {
          numThreads: options.rayonThreads || undefined,
          threadName: options.rayonThreadName || 'swc-rayon',
          stackSize: options.rayonStackSize || undefined,
          panicHandler: options.rayonPanicHandler || true,
        };
        this.manager.initializeRayon(rayonConfig);
      }

      // Initialize Tokio if requested
      if (options.tokio !== false) {
        const tokioConfig = {
          workerThreads: options.tokioWorkerThreads || undefined,
          maxBlockingThreads: options.tokioMaxBlockingThreads || undefined,
          threadName: options.tokioThreadName || 'swc-tokio',
          threadStackSize: options.tokioThreadStackSize || undefined,
          enableIo: options.tokioEnableIo !== false,
          enableTime: options.tokioEnableTime !== false,
        };
        this.manager.initializeTokio(tokioConfig);
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize multithreading:', error);
      return false;
    }
  }

  /**
   * Create a controlled thread pool with advanced management
   * @param {string} name - Unique name for the thread pool
   * @param {Object} config - Thread pool configuration
   * @returns {Object} Thread pool controller
   */
  createThreadPool(name, config = {}) {
    if (this.activeThreadPools.has(name)) {
      throw new Error(`Thread pool '${name}' already exists`);
    }

    const rayonConfig = {
      numThreads: config.threads || undefined,
      threadName: config.threadName || `${name}-worker`,
      stackSize: config.stackSize || undefined,
      panicHandler: config.panicHandler !== false,
    };

    const pool = nativeBinding.createRayonThreadPool(rayonConfig);
    
    const controller = {
      name,
      pool,
      config: rayonConfig,
      
      // Parallel operations with this specific pool
      async map(data, operation) {
        return await nativeBinding.parallelMap(data, operation, pool);
      },
      
      async reduce(data, operation, initial) {
        return await nativeBinding.parallelReduce(data, operation, initial, pool);
      },
      
      async filter(data, operation, threshold) {
        return await nativeBinding.parallelFilter(data, operation, threshold, pool);
      },
      
      async sort(data, descending = false) {
        return await nativeBinding.parallelSort(data, descending, pool);
      },
      
      async chunkProcess(data, chunkSize, operation) {
        return await nativeBinding.parallelChunkProcess(data, chunkSize, operation, pool);
      },
      
      // Pool information
      getThreadCount() {
        return pool.currentNumThreads();
      },
      
      // Cleanup
      destroy() {
        threadController.destroyThreadPool(name);
      }
    };

    this.activeThreadPools.set(name, controller);
    return controller;
  }

  /**
   * Create a controlled communication channel
   * @param {string} name - Unique name for the channel
   * @param {Object} config - Channel configuration
   * @returns {Object} Channel controller
   */
  createChannel(name, config = {}) {
    if (this.activeChannels.has(name)) {
      throw new Error(`Channel '${name}' already exists`);
    }

    let channel;
    let controller;

    switch (config.type) {
      case 'crossbeam':
        channel = nativeBinding.createCrossbeamChannel(config.bounded);
        controller = {
          name,
          type: 'crossbeam',
          channel,
          send: (message) => channel.send(message),
          receive: () => channel.receive(),
          isEmpty: () => channel.isEmpty(),
          length: () => channel.len(),
        };
        break;

      case 'crossbeam-array':
        channel = nativeBinding.createCrossbeamArrayQueue(config.capacity || 1000);
        controller = {
          name,
          type: 'crossbeam-array',
          channel,
          push: (item) => channel.push(item),
          pop: () => channel.pop(),
          isEmpty: () => channel.isEmpty(),
          isFull: () => channel.isFull(),
          length: () => channel.len(),
          capacity: () => channel.capacity(),
        };
        break;

      case 'crossbeam-seg':
        channel = nativeBinding.createCrossbeamSegQueue();
        controller = {
          name,
          type: 'crossbeam-seg',
          channel,
          push: (item) => channel.push(item),
          pop: () => channel.pop(),
          isEmpty: () => channel.isEmpty(),
          length: () => channel.len(),
        };
        break;

      case 'tokio-mpsc':
        channel = nativeBinding.createTokioMpscChannel();
        controller = {
          name,
          type: 'tokio-mpsc',
          channel,
        };
        break;

      case 'tokio-broadcast':
        channel = nativeBinding.createTokioBroadcastChannel(config.capacity || 1000);
        controller = {
          name,
          type: 'tokio-broadcast',
          channel,
          send: (message) => channel.send(message),
          receiverCount: () => channel.receiverCount(),
        };
        break;

      default:
        channel = nativeBinding.createCrossbeamChannel(config.bounded);
        controller = {
          name,
          type: 'crossbeam',
          channel,
          send: (message) => channel.send(message),
          receive: () => channel.receive(),
          isEmpty: () => channel.isEmpty(),
          length: () => channel.len(),
        };
    }

    controller.destroy = () => {
      threadController.destroyChannel(name);
    };

    this.activeChannels.set(name, controller);
    return controller;
  }

  /**
   * Create an atomic cell for lock-free operations
   * @param {string} name - Unique name for the atomic cell
   * @param {number} initialValue - Initial value
   * @returns {Object} Atomic cell controller
   */
  createAtomicCell(name, initialValue = 0) {
    if (this.threadControllers.has(name)) {
      throw new Error(`Atomic cell '${name}' already exists`);
    }

    const cell = nativeBinding.createCrossbeamAtomicCell(initialValue);
    
    const controller = {
      name,
      cell,
      
      // Atomic operations
      load: () => cell.load(),
      store: (value) => cell.store(value),
      swap: (value) => cell.swap(value),
      compareExchange: (current, newValue) => cell.compareExchange(current, newValue),
      fetchAdd: (value) => cell.fetchAdd(value),
      fetchSub: (value) => cell.fetchSub(value),
      
      // Utility methods
      increment: () => cell.fetchAdd(1),
      decrement: () => cell.fetchSub(1),
      reset: () => cell.store(initialValue),
      
      destroy: () => {
        threadController.destroyAtomicCell(name);
      }
    };

    this.threadControllers.set(name, controller);
    return controller;
  }

  /**
   * Create a Tokio runtime for async operations
   * @param {string} name - Unique name for the runtime
   * @param {Object} config - Runtime configuration
   * @returns {Object} Runtime controller
   */
  createRuntime(name, config = {}) {
    if (this.activeRuntimes.has(name)) {
      throw new Error(`Runtime '${name}' already exists`);
    }

    const tokioConfig = {
      workerThreads: config.workerThreads || undefined,
      maxBlockingThreads: config.maxBlockingThreads || undefined,
      threadName: config.threadName || `${name}-tokio`,
      threadStackSize: config.threadStackSize || undefined,
      enableIo: config.enableIo !== false,
      enableTime: config.enableTime !== false,
    };

    const runtime = nativeBinding.createTokioRuntime(tokioConfig);
    
    const controller = {
      name,
      runtime,
      config: tokioConfig,
      
      // Async operations
      async delay(durationMs, message = '') {
        return await nativeBinding.tokioDelay(durationMs, message);
      },
      
      async timeout(durationMs, timeoutMs, operation = 'operation') {
        return await nativeBinding.tokioTimeout(durationMs, timeoutMs, operation);
      },
      
      async parallelTasks(tasks, delayMs = 0) {
        return await nativeBinding.tokioParallelTasks(tasks, delayMs);
      },
      
      createTimer: () => nativeBinding.createTokioTimer(),
      
      destroy: () => {
        threadController.destroyRuntime(name);
      }
    };

    this.activeRuntimes.set(name, controller);
    return controller;
  }

  /**
   * Get comprehensive system information
   * @returns {Object} System information
   */
  getSystemInfo() {
    return nativeBinding.getSystemInfo();
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return nativeBinding.getPerformanceMetrics();
  }

  /**
   * Run a comprehensive benchmark
   * @param {Object} options - Benchmark options
   * @returns {Promise<Object>} Benchmark results
   */
  async benchmark(options = {}) {
    const dataSize = options.dataSize || 100000;
    const operations = options.operations || ['sequential_sum', 'parallel_sum', 'sequential_square', 'parallel_square'];
    
    const results = {};
    
    for (const operation of operations) {
      results[operation] = await nativeBinding.benchmarkParallelOperations(dataSize, operation);
    }
    
    return results;
  }

  /**
   * Run stress tests on the multithreading system
   * @param {Object} options - Stress test options
   * @returns {Promise<Array>} Stress test results
   */
  async stressTest(options = {}) {
    const numTasks = options.numTasks || 100;
    const taskDurationMs = options.taskDurationMs || 100;
    
    return new Promise((resolve, reject) => {
      const results = [];
      
      nativeBinding.stressTestConcurrency(numTasks, taskDurationMs, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        
        results.push(result);
        
        if (results.length === numTasks) {
          resolve(results);
        }
      });
    });
  }

  /**
   * Destroy a specific thread pool
   */
  destroyThreadPool(name) {
    if (this.activeThreadPools.has(name)) {
      this.activeThreadPools.delete(name);
    }
  }

  /**
   * Destroy a specific channel
   */
  destroyChannel(name) {
    if (this.activeChannels.has(name)) {
      this.activeChannels.delete(name);
    }
  }

  /**
   * Destroy a specific atomic cell
   */
  destroyAtomicCell(name) {
    if (this.threadControllers.has(name)) {
      this.threadControllers.delete(name);
    }
  }

  /**
   * Destroy a specific runtime
   */
  destroyRuntime(name) {
    if (this.activeRuntimes.has(name)) {
      this.activeRuntimes.delete(name);
    }
  }

  /**
   * Get status of all active components
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      rayonInitialized: this.manager.isRayonInitialized(),
      tokioInitialized: this.manager.isTokioInitialized(),
      activeThreadPools: Array.from(this.activeThreadPools.keys()),
      activeChannels: Array.from(this.activeChannels.keys()),
      activeRuntimes: Array.from(this.activeRuntimes.keys()),
      activeAtomicCells: Array.from(this.threadControllers.keys()),
      systemInfo: this.getSystemInfo(),
    };
  }

  /**
   * Clean up all resources and shutdown
   */
  async shutdown() {
    // Clean up all active resources
    this.activeThreadPools.clear();
    this.activeChannels.clear();
    this.activeRuntimes.clear();
    this.threadControllers.clear();
    
    // Cleanup manager
    this.manager.cleanup();
    
    // Final shutdown
    nativeBinding.shutdownMultithreading();
    this.initialized = false;
  }
}

// Create global thread controller instance
const threadController = new ThreadController();

// Convenience functions for quick access
const createThreadPool = (name, config) => threadController.createThreadPool(name, config);
const createChannel = (name, config) => threadController.createChannel(name, config);
const createAtomicCell = (name, initialValue) => threadController.createAtomicCell(name, initialValue);
const createManagedRuntime = (name, config) => threadController.createRuntime(name, config);

module.exports = {
  // Main controller
  ThreadController,
  threadController,

  // Convenience functions
  createThreadPool,
  createChannel,
  createAtomicCell,
  createManagedRuntime,

  // Direct access to native components for advanced users
  ...nativeBinding,
};