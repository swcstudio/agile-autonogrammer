import type { KatalystConfig, KatalystIntegration } from '../types/index.js';

/**
 * Configuration options for the Katalyst Multithreading integration.
 * Provides comprehensive control over Rust concurrency features including
 * Crossbeam, Rayon, and Tokio runtime configurations.
 */
export interface MultithreadingConfig {
  /** Enable or disable the entire multithreading integration */
  enabled?: boolean;
  /** Rayon parallel processing configuration */
  rayon?: {
    /** Number of worker threads (defaults to CPU core count) */
    numThreads?: number;
    /** Thread name prefix for Rayon threads */
    threadName?: string;
    /** Stack size for worker threads in bytes */
    stackSize?: number;
    /** Enable panic handler for better error reporting */
    panicHandler?: boolean;
  };
  /** GPU compute configuration */
  gpu?: {
    /** Enable GPU acceleration */
    enabled?: boolean;
    /** Preferred GPU backend */
    backend?: 'webgpu' | 'cuda' | 'vulkan' | 'metal' | 'auto';
    /** Memory pool size for GPU operations */
    memoryPoolSize?: number;
    /** Enable GPU-accelerated React reconciliation */
    acceleratedReconciliation?: boolean;
    /** Enable shader-based components */
    shaderComponents?: boolean;
  };
  /** Machine Learning configuration */
  ml?: {
    /** Enable ML capabilities */
    enabled?: boolean;
    /** ML backend */
    backend?: 'candle' | 'ort' | 'tflite' | 'auto';
    /** Model cache size in MB */
    modelCacheSize?: number;
    /** Enable real-time inference */
    realtimeInference?: boolean;
    /** Enable model quantization */
    quantization?: boolean;
  };
  /** Advanced compression configuration */
  compression?: {
    /** Enable advanced compression */
    enabled?: boolean;
    /** Compression algorithm */
    algorithm?: 'zstd' | 'lz4' | 'brotli' | 'auto';
    /** Compression level (1-22) */
    level?: number;
    /** Enable state compression */
    stateCompression?: boolean;
  };
  /** Cryptography configuration */
  crypto?: {
    /** Enable cryptographic features */
    enabled?: boolean;
    /** Enable zero-knowledge proofs */
    zkProofs?: boolean;
    /** Enable homomorphic encryption */
    homomorphicEncryption?: boolean;
    /** Key derivation iterations */
    kdfIterations?: number;
  };
  /** Tokio async runtime configuration */
  tokio?: {
    /** Number of worker threads for async tasks */
    workerThreads?: number;
    /** Maximum number of blocking threads */
    maxBlockingThreads?: number;
    /** Thread name prefix for Tokio threads */
    threadName?: string;
    /** Stack size for Tokio threads in bytes */
    threadStackSize?: number;
    /** Enable I/O operations support */
    enableIo?: boolean;
    /** Enable time-based operations support */
    enableTime?: boolean;
  };
  /** Crossbeam lock-free data structures configuration */
  crossbeam?: {
    /** Default channel capacity for bounded channels */
    defaultChannelSize?: number;
    /** Enable scoped thread spawning */
    enableScoping?: boolean;
    /** Enable channel selection operations */
    enableSelection?: boolean;
  };
  /** Performance monitoring and benchmarking options */
  performance?: {
    /** Enable benchmark operations */
    enableBenchmarking?: boolean;
    /** Enable stress testing capabilities */
    enableStressTesting?: boolean;
    /** Enable performance metrics collection */
    enableMetrics?: boolean;
  };
  /** Debug and logging configuration */
  debug?: {
    /** Enable debug logging */
    enableLogging?: boolean;
    /** Log level for debug output */
    logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  };
}

/**
 * System information about the multithreading capabilities.
 * Provides runtime details about available concurrency features.
 */
export interface SystemInfo {
  /** Number of CPU cores available to the system */
  cpuCores: number;
  /** Number of Rayon worker threads currently active */
  rayonThreads: number;
  /** Whether Tokio async runtime is available */
  tokioAvailable: boolean;
  /** Whether Crossbeam features are available */
  crossbeamAvailable: boolean;
  /** Version of the multithreading module */
  version: string;
}

/**
 * Results from a benchmark operation comparing sequential vs parallel performance.
 * Used to measure the effectiveness of parallel processing for different workloads.
 */
export interface BenchmarkResult {
  /** Name of the benchmark operation performed */
  operation: string;
  /** Size of the data set processed */
  dataSize: number;
  /** Computed result of the operation */
  result: number;
  /** Duration of the operation in milliseconds */
  durationMs: number;
  /** Throughput in operations per second */
  throughput: number;
}

/**
 * Real-time performance metrics for the multithreading system.
 * Provides insights into resource usage and system health.
 */
export interface PerformanceMetrics {
  /** Number of CPU cores available */
  cpuCores: number;
  /** Number of active Rayon threads */
  rayonThreads: number;
  /** Current memory usage in megabytes */
  memoryUsageMb: number;
  /** System uptime in milliseconds */
  uptimeMs: number;
  /** Number of currently active tasks */
  activeTasks: number;
}

/**
 * Results from a stress test operation.
 * Used to evaluate system behavior under high concurrent load.
 */
export interface StressTestResult {
  /** Unique identifier for the stress test task */
  taskId: number;
  /** Actual duration the task took to complete */
  durationMs: number;
  /** Thread ID where the task was executed */
  threadId: string;
  /** Status of the task completion */
  status: string;
}

export interface CrossbeamChannelOptions {
  bounded?: number;
}

export interface RayonConfig {
  numThreads?: number;
  threadName?: string;
  stackSize?: number;
  panicHandler?: boolean;
}

export interface TokioRuntimeConfig {
  workerThreads?: number;
  maxBlockingThreads?: number;
  threadName?: string;
  threadStackSize?: number;
  enableIo?: boolean;
  enableTime?: boolean;
}

/**
 * Katalyst Multithreading Integration
 *
 * Provides comprehensive Rust concurrency features to the React ecosystem via napi-rs.
 * Integrates Crossbeam, Rayon, and Tokio for high-performance parallel processing,
 * async operations, and lock-free data structures.
 *
 * Key Features:
 * - **Crossbeam**: Lock-free channels, atomic operations, scoped threads
 * - **Rayon**: Data parallelism with parallel iterators and custom thread pools
 * - **Tokio**: Async runtime with task spawning, channels, and timers
 * - **Performance**: Benchmarking, stress testing, and metrics collection
 *
 * Use Cases:
 * - Heavy computational workloads in React applications
 * - Background processing for AR/VR/MR environments
 * - WASM integration with native performance
 * - Real-time data processing and streaming
 *
 * @example
 * ```typescript
 * const multithreading = new MultithreadingIntegration({
 *   rayon: { numThreads: 4 },
 *   tokio: { workerThreads: 2 },
 *   performance: { enableBenchmarking: true }
 * });
 *
 * await multithreading.initialize();
 *
 * // Parallel data processing
 * const result = await multithreading.parallelMap([1,2,3,4], 'square');
 *
 * // Async operations
 * const delayed = await multithreading.tokioDelay(1000, 'Hello World');
 *
 * // Benchmark performance
 * const benchmark = await multithreading.benchmark(10000, 'parallel_sum');
 * ```
 */
export class MultithreadingIntegration implements KatalystIntegration {
  name = 'multithreading' as const;
  type = 'automation' as const;
  enabled = true;
  config: MultithreadingConfig & Record<string, unknown>;
  private nativeModule: any = null;
  private manager: any = null;
  private initialized = false;

  constructor(config: MultithreadingConfig = {}) {
    this.config = this.mergeWithDefaults(config);
  }

  private mergeWithDefaults(
    config: MultithreadingConfig
  ): MultithreadingConfig & Record<string, unknown> {
    return {
      enabled: true,
      rayon: {
        numThreads: undefined,
        threadName: 'katalyst-rayon',
        stackSize: undefined,
        panicHandler: true,
        ...config.rayon,
      },
      tokio: {
        workerThreads: undefined,
        maxBlockingThreads: undefined,
        threadName: 'katalyst-tokio',
        threadStackSize: undefined,
        enableIo: true,
        enableTime: true,
        ...config.tokio,
      },
      crossbeam: {
        defaultChannelSize: 1000,
        enableScoping: true,
        enableSelection: true,
        ...config.crossbeam,
      },
      performance: {
        enableBenchmarking: true,
        enableStressTesting: false,
        enableMetrics: true,
        ...config.performance,
      },
      debug: {
        enableLogging: false,
        logLevel: 'info',
        ...config.debug,
      },
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.nativeModule = await this.loadNativeModule();

      const initResult = this.nativeModule.initializeMultithreading();
      if (this.config.debug?.enableLogging) {
        console.log('[Katalyst Multithreading]', initResult);
      }

      this.manager = new this.nativeModule.MultithreadingManager();

      await this.setupRayon();
      await this.setupTokio();
      await this.setupPerformanceMonitoring();

      this.initialized = true;

      if (this.config.debug?.enableLogging) {
        const systemInfo = this.getSystemInfo();
        console.log('[Katalyst Multithreading] Initialized:', systemInfo);
      }
    } catch (error) {
      console.error('[Katalyst Multithreading] Initialization failed:', error);
      throw error;
    }
  }

  private async loadNativeModule(): Promise<any> {
    try {
      return require('@swcstudio/multithreading');
    } catch (error) {
      throw new Error(
        `Failed to load native multithreading module: ${error}. ` +
          'Make sure the Rust crate is compiled and the native module is available.'
      );
    }
  }

  private async setupRayon(): Promise<void> {
    if (!this.config.rayon) return;

    try {
      this.manager.initializeRayon(this.config.rayon);

      if (this.config.debug?.enableLogging) {
        const threadCount = this.nativeModule.getRayonGlobalThreadCount();
        console.log(`[Katalyst Multithreading] Rayon initialized with ${threadCount} threads`);
      }
    } catch (error) {
      console.error('[Katalyst Multithreading] Rayon setup failed:', error);
      throw error;
    }
  }

  private async setupTokio(): Promise<void> {
    if (!this.config.tokio) return;

    try {
      this.manager.initializeTokio(this.config.tokio);

      if (this.config.debug?.enableLogging) {
        const metrics = this.nativeModule.getTokioRuntimeMetrics();
        console.log('[Katalyst Multithreading] Tokio runtime initialized:', metrics);
      }
    } catch (error) {
      console.error('[Katalyst Multithreading] Tokio setup failed:', error);
      throw error;
    }
  }

  private async setupPerformanceMonitoring(): Promise<void> {
    if (!this.config.performance?.enableMetrics) return;

    try {
      setInterval(() => {
        if (this.config.debug?.enableLogging) {
          const metrics = this.getPerformanceMetrics();
          console.log('[Katalyst Multithreading] Performance metrics:', metrics);
        }
      }, 30000);
    } catch (error) {
      console.error('[Katalyst Multithreading] Performance monitoring setup failed:', error);
    }
  }

  getSystemInfo(): SystemInfo {
    this.ensureInitialized();
    return this.nativeModule.getSystemInfo();
  }

  getPerformanceMetrics(): PerformanceMetrics {
    this.ensureInitialized();
    return this.nativeModule.getPerformanceMetrics();
  }

  createCrossbeamChannel(options?: CrossbeamChannelOptions): any {
    this.ensureInitialized();
    return this.nativeModule.createCrossbeamChannel(options?.bounded);
  }

  createCrossbeamAtomicCell(initialValue = 0): any {
    this.ensureInitialized();
    return this.nativeModule.createCrossbeamAtomicCell(initialValue);
  }

  createCrossbeamArrayQueue(capacity: number): any {
    this.ensureInitialized();
    return this.nativeModule.createCrossbeamArrayQueue(capacity);
  }

  createCrossbeamSegQueue(): any {
    this.ensureInitialized();
    return this.nativeModule.createCrossbeamSegQueue();
  }

  createRayonThreadPool(config?: RayonConfig): any {
    this.ensureInitialized();
    return this.nativeModule.createRayonThreadPool(config);
  }

  createTokioRuntime(config?: TokioRuntimeConfig): any {
    this.ensureInitialized();
    return this.nativeModule.createTokioRuntime(config);
  }

  createTokioMpscChannel(): any {
    this.ensureInitialized();
    return this.nativeModule.createTokioMpscChannel();
  }

  createTokioBroadcastChannel(capacity: number): any {
    this.ensureInitialized();
    return this.nativeModule.createTokioBroadcastChannel(capacity);
  }

  createTokioTimer(): any {
    this.ensureInitialized();
    return this.nativeModule.createTokioTimer();
  }

  async parallelMap(
    data: number[],
    operation: 'square' | 'double' | 'increment',
    threadPool?: any
  ): Promise<number[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const task = this.nativeModule.parallelMap(data, operation, threadPool);
      task.then(resolve).catch(reject);
    });
  }

  async parallelReduce(
    data: number[],
    operation: 'sum' | 'product' | 'max' | 'min',
    initial?: number,
    threadPool?: any
  ): Promise<number> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const task = this.nativeModule.parallelReduce(data, operation, initial, threadPool);
      task.then(resolve).catch(reject);
    });
  }

  async parallelFilter(
    data: number[],
    operation: 'greater_than' | 'less_than' | 'equal_to' | 'even' | 'odd',
    threshold?: number,
    threadPool?: any
  ): Promise<number[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const task = this.nativeModule.parallelFilter(data, operation, threshold, threadPool);
      task.then(resolve).catch(reject);
    });
  }

  async parallelSort(data: number[], descending = false, threadPool?: any): Promise<number[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const task = this.nativeModule.parallelSort(data, descending, threadPool);
      task.then(resolve).catch(reject);
    });
  }

  async parallelChunkProcess(
    data: number[],
    chunkSize: number,
    operation: 'sum_chunks' | 'max_chunks' | 'min_chunks',
    threadPool?: any
  ): Promise<number[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const task = this.nativeModule.parallelChunkProcess(data, chunkSize, operation, threadPool);
      task.then(resolve).catch(reject);
    });
  }

  async tokioDelay(durationMs: number, message: string): Promise<string> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const task = this.nativeModule.tokioDelay(durationMs, message);
      task.then(resolve).catch(reject);
    });
  }

  async tokioTimeout(durationMs: number, timeoutMs: number, operation: string): Promise<string> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const task = this.nativeModule.tokioTimeout(durationMs, timeoutMs, operation);
      task.then(resolve).catch(reject);
    });
  }

  async tokioParallelTasks(tasks: string[], delayMs: number): Promise<string[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const task = this.nativeModule.tokioParallelTasks(tasks, delayMs);
      task.then(resolve).catch(reject);
    });
  }

  async benchmark(
    dataSize: number,
    operation: 'sequential_sum' | 'parallel_sum' | 'sequential_square' | 'parallel_square'
  ): Promise<BenchmarkResult> {
    this.ensureInitialized();
    if (!this.config.performance?.enableBenchmarking) {
      throw new Error('Benchmarking is disabled in configuration');
    }

    return new Promise((resolve, reject) => {
      const task = this.nativeModule.benchmarkParallelOperations(dataSize, operation);
      task.then(resolve).catch(reject);
    });
  }

  stressTest(
    numTasks: number,
    taskDurationMs: number,
    callback: (result: StressTestResult) => void
  ): void {
    this.ensureInitialized();
    if (!this.config.performance?.enableStressTesting) {
      throw new Error('Stress testing is disabled in configuration');
    }

    this.nativeModule.stressTestConcurrency(numTasks, taskDurationMs, callback);
  }

  crossbeamScopeSpawn(callback: (message: string) => void): void {
    this.ensureInitialized();
    if (!this.config.crossbeam?.enableScoping) {
      throw new Error('Crossbeam scoping is disabled in configuration');
    }

    this.nativeModule.crossbeamScopeSpawn(callback);
  }

  crossbeamSelectChannels(channel1: any, channel2: any, callback: (message: string) => void): void {
    this.ensureInitialized();
    if (!this.config.crossbeam?.enableSelection) {
      throw new Error('Crossbeam channel selection is disabled in configuration');
    }

    this.nativeModule.crossbeamSelectChannels(channel1, channel2, callback);
  }

  tokioSelectChannels(channel1: any, channel2: any, callback: (message: string) => void): void {
    this.ensureInitialized();
    this.nativeModule.tokioSelectChannels(channel1, channel2, callback);
  }

  tokioSpawnMultiple(count: number, delayMs: number, callback: (message: string) => void): void {
    this.ensureInitialized();
    this.nativeModule.tokioSpawnMultiple(count, delayMs, callback);
  }

  rayonJoin(
    leftCallback: (message: string) => void,
    rightCallback: (message: string) => void,
    resultCallback: (result: string) => void
  ): void {
    this.ensureInitialized();
    this.nativeModule.rayonJoin(leftCallback, rightCallback, resultCallback);
  }

  // ========================================
  // 🚀 REVOLUTIONARY FEATURES
  // ========================================

  // GPU Compute Integration
  createGPUDevice(backend?: string): any {
    this.ensureInitialized();
    return this.nativeModule.createGPUDevice(backend || 'auto');
  }

  createGPUBuffer(
    data: number[],
    usage: 'storage' | 'uniform' | 'vertex' | 'index' = 'storage'
  ): any {
    this.ensureInitialized();
    return this.nativeModule.createGPUBuffer(data, usage);
  }

  compileGPUShader(source: string, entryPoint = 'main'): any {
    this.ensureInitialized();
    return this.nativeModule.compileGPUShader(source, entryPoint);
  }

  async dispatchGPUCompute(
    shader: any,
    buffers: any[],
    workgroups: [number, number, number]
  ): Promise<any> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.nativeModule.dispatchGPUCompute(shader, buffers, workgroups).then(resolve).catch(reject);
    });
  }

  async gpuAcceleratedReactReconciliation(oldTree: any, newTree: any): Promise<any> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.nativeModule.gpuAcceleratedReconciliation(oldTree, newTree).then(resolve).catch(reject);
    });
  }

  // Machine Learning Integration
  loadMLModel(modelPath: string, format: 'onnx' | 'tflite' | 'candle' = 'onnx'): any {
    this.ensureInitialized();
    return this.nativeModule.loadMLModel(modelPath, format);
  }

  async runMLInference(model: any, input: number[]): Promise<number[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.nativeModule.runMLInference(model, input).then(resolve).catch(reject);
    });
  }

  async realtimeObjectDetection(imageData: Uint8Array): Promise<any[]> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.nativeModule.realtimeObjectDetection(imageData).then(resolve).catch(reject);
    });
  }

  async speechToText(audioData: Float32Array): Promise<string> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.nativeModule.speechToText(audioData).then(resolve).catch(reject);
    });
  }

  async predictiveUI(userActions: any[], context: any): Promise<any> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.nativeModule.predictiveUI(userActions, context).then(resolve).catch(reject);
    });
  }

  // Advanced Compression
  compressData(
    data: Uint8Array,
    algorithm: 'zstd' | 'lz4' | 'brotli' = 'zstd',
    level = 3
  ): Uint8Array {
    this.ensureInitialized();
    return this.nativeModule.compressData(data, algorithm, level);
  }

  decompressData(
    compressedData: Uint8Array,
    algorithm: 'zstd' | 'lz4' | 'brotli' = 'zstd'
  ): Uint8Array {
    this.ensureInitialized();
    return this.nativeModule.decompressData(compressedData, algorithm);
  }

  compressReactState(state: any): Uint8Array {
    this.ensureInitialized();
    return this.nativeModule.compressReactState(JSON.stringify(state));
  }

  decompressReactState(compressedState: Uint8Array): any {
    this.ensureInitialized();
    const jsonStr = this.nativeModule.decompressReactState(compressedState);
    return JSON.parse(jsonStr);
  }

  createTimeTravel(maxHistorySize = 1000): any {
    this.ensureInitialized();
    return this.nativeModule.createTimeTravel(maxHistorySize);
  }

  // Cryptography & Privacy
  generateKeyPair(algorithm: 'ed25519' | 'secp256k1' | 'rsa' = 'ed25519'): any {
    this.ensureInitialized();
    return this.nativeModule.generateKeyPair(algorithm);
  }

  encryptData(data: Uint8Array, publicKey: Uint8Array): Uint8Array {
    this.ensureInitialized();
    return this.nativeModule.encryptData(data, publicKey);
  }

  decryptData(encryptedData: Uint8Array, privateKey: Uint8Array): Uint8Array {
    this.ensureInitialized();
    return this.nativeModule.decryptData(encryptedData, privateKey);
  }

  createZKProof(statement: any, witness: any): any {
    this.ensureInitialized();
    return this.nativeModule.createZKProof(statement, witness);
  }

  verifyZKProof(proof: any, statement: any): boolean {
    this.ensureInitialized();
    return this.nativeModule.verifyZKProof(proof, statement);
  }

  homomorphicEncrypt(data: number, publicKey: any): any {
    this.ensureInitialized();
    return this.nativeModule.homomorphicEncrypt(data, publicKey);
  }

  homomorphicAdd(ciphertext1: any, ciphertext2: any): any {
    this.ensureInitialized();
    return this.nativeModule.homomorphicAdd(ciphertext1, ciphertext2);
  }

  homomorphicDecrypt(ciphertext: any, privateKey: any): number {
    this.ensureInitialized();
    return this.nativeModule.homomorphicDecrypt(ciphertext, privateKey);
  }

  // Quantum Computing Simulation
  createQuantumSimulator(numQubits: number): any {
    this.ensureInitialized();
    return this.nativeModule.createQuantumSimulator(numQubits);
  }

  quantumGroverSearch(database: any[], target: any): number {
    this.ensureInitialized();
    return this.nativeModule.quantumGroverSearch(database, target);
  }

  quantumShorFactoring(number: number): number[] {
    this.ensureInitialized();
    return this.nativeModule.quantumShorFactoring(number);
  }

  generateQuantumRandomBytes(size: number): Uint8Array {
    this.ensureInitialized();
    return this.nativeModule.generateQuantumRandomBytes(size);
  }

  // Real-time Audio/Video Processing
  createAudioProcessor(sampleRate = 44100, channels = 2): any {
    this.ensureInitialized();
    return this.nativeModule.createAudioProcessor(sampleRate, channels);
  }

  processAudioRealtime(
    audioData: Float32Array,
    effect: 'reverb' | 'echo' | 'distortion' | 'pitch'
  ): Float32Array {
    this.ensureInitialized();
    return this.nativeModule.processAudioRealtime(audioData, effect);
  }

  createVideoProcessor(width: number, height: number, fps = 30): any {
    this.ensureInitialized();
    return this.nativeModule.createVideoProcessor(width, height, fps);
  }

  applyVideoFilter(
    frameData: Uint8Array,
    filter: 'blur' | 'sharpen' | 'edge_detect' | 'vintage'
  ): Uint8Array {
    this.ensureInitialized();
    return this.nativeModule.applyVideoFilter(frameData, filter);
  }

  detectFaces(imageData: Uint8Array): any[] {
    this.ensureInitialized();
    return this.nativeModule.detectFaces(imageData);
  }

  // Advanced Networking
  createQuicConnection(address: string, port: number): any {
    this.ensureInitialized();
    return this.nativeModule.createQuicConnection(address, port);
  }

  createCustomProtocol(protocolName: string, config: any): any {
    this.ensureInitialized();
    return this.nativeModule.createCustomProtocol(protocolName, config);
  }

  enableZeroCopyTransfer(): void {
    this.ensureInitialized();
    this.nativeModule.enableZeroCopyTransfer();
  }

  createMeshNetwork(nodeId: string): any {
    this.ensureInitialized();
    return this.nativeModule.createMeshNetwork(nodeId);
  }

  // Spatial Computing & AR/VR
  createPhysicsWorld(gravity: [number, number, number] = [0, -9.81, 0]): any {
    this.ensureInitialized();
    return this.nativeModule.createPhysicsWorld(gravity);
  }

  createRigidBody(shape: 'box' | 'sphere' | 'cylinder', dimensions: number[]): any {
    this.ensureInitialized();
    return this.nativeModule.createRigidBody(shape, dimensions);
  }

  stepPhysicsSimulation(world: any, deltaTime: number): void {
    this.ensureInitialized();
    this.nativeModule.stepPhysicsSimulation(world, deltaTime);
  }

  enableHandTracking(): any {
    this.ensureInitialized();
    return this.nativeModule.enableHandTracking();
  }

  getHandPose(): any {
    this.ensureInitialized();
    return this.nativeModule.getHandPose();
  }

  // Real-time Analytics
  createTimeSeriesDB(name: string): any {
    this.ensureInitialized();
    return this.nativeModule.createTimeSeriesDB(name);
  }

  insertDataPoint(db: any, timestamp: number, value: number, tags: Record<string, string>): void {
    this.ensureInitialized();
    this.nativeModule.insertDataPoint(db, timestamp, value, tags);
  }

  queryTimeRange(
    db: any,
    startTime: number,
    endTime: number,
    aggregation: 'avg' | 'sum' | 'min' | 'max' = 'avg'
  ): any[] {
    this.ensureInitialized();
    return this.nativeModule.queryTimeRange(db, startTime, endTime, aggregation);
  }

  detectAnomalies(data: number[], sensitivity = 0.95): number[] {
    this.ensureInitialized();
    return this.nativeModule.detectAnomalies(data, sensitivity);
  }

  predictTimeSeries(data: number[], periods: number): number[] {
    this.ensureInitialized();
    return this.nativeModule.predictTimeSeries(data, periods);
  }

  // Distributed Computing
  createP2PNode(nodeId: string): any {
    this.ensureInitialized();
    return this.nativeModule.createP2PNode(nodeId);
  }

  connectToPeer(node: any, peerAddress: string): any {
    this.ensureInitialized();
    return this.nativeModule.connectToPeer(node, peerAddress);
  }

  distributeComputation(task: any, peers: any[]): any {
    this.ensureInitialized();
    return this.nativeModule.distributeComputation(task, peers);
  }

  createDistributedState(stateId: string, initialValue: any): any {
    this.ensureInitialized();
    return this.nativeModule.createDistributedState(stateId, JSON.stringify(initialValue));
  }

  syncDistributedState(state: any): void {
    this.ensureInitialized();
    this.nativeModule.syncDistributedState(state);
  }

  createConsensusGroup(groupId: string, algorithm: 'raft' | 'pbft' | 'pow' = 'raft'): any {
    this.ensureInitialized();
    return this.nativeModule.createConsensusGroup(groupId, algorithm);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MultithreadingIntegration must be initialized before use');
    }
  }

  async cleanup(): Promise<void> {
    if (this.manager) {
      this.manager.cleanup();
    }

    if (this.nativeModule) {
      this.nativeModule.shutdownMultithreading();
    }

    this.initialized = false;

    if (this.config.debug?.enableLogging) {
      console.log('[Katalyst Multithreading] Cleanup completed');
    }
  }

  getDefaultConfig(): MultithreadingConfig {
    return {
      enabled: true,
      rayon: {
        numThreads: undefined,
        threadName: 'katalyst-rayon',
        stackSize: undefined,
        panicHandler: true,
      },
      tokio: {
        workerThreads: undefined,
        maxBlockingThreads: undefined,
        threadName: 'katalyst-tokio',
        threadStackSize: undefined,
        enableIo: true,
        enableTime: true,
      },
      crossbeam: {
        defaultChannelSize: 1000,
        enableScoping: true,
        enableSelection: true,
      },
      performance: {
        enableBenchmarking: true,
        enableStressTesting: false,
        enableMetrics: true,
      },
      debug: {
        enableLogging: false,
        logLevel: 'info',
      },
      gpu: {
        enabled: false,
        backend: 'auto',
        memoryPoolSize: 512 * 1024 * 1024, // 512MB
        acceleratedReconciliation: false,
        shaderComponents: false,
      },
      ml: {
        enabled: false,
        backend: 'auto',
        modelCacheSize: 256, // 256MB
        realtimeInference: false,
        quantization: true,
      },
      compression: {
        enabled: false,
        algorithm: 'zstd',
        level: 3,
        stateCompression: false,
      },
      crypto: {
        enabled: false,
        zkProofs: false,
        homomorphicEncryption: false,
        kdfIterations: 100000,
      },
    };
  }

  getTypeDefinitions(): string {
    return `
declare module '@katalyst/multithreading' {
  export interface SystemInfo {
    cpuCores: number;
    rayonThreads: number;
    tokioAvailable: boolean;
    crossbeamAvailable: boolean;
    version: string;
  }

  export interface BenchmarkResult {
    operation: string;
    dataSize: number;
    result: number;
    durationMs: number;
    throughput: number;
  }

  export interface PerformanceMetrics {
    cpuCores: number;
    rayonThreads: number;
    memoryUsageMb: number;
    uptimeMs: number;
    activeTasks: number;
  }

  export interface RayonConfig {
    numThreads?: number;
    threadName?: string;
    stackSize?: number;
    panicHandler?: boolean;
  }

  export interface TokioRuntimeConfig {
    workerThreads?: number;
    maxBlockingThreads?: number;
    threadName?: string;
    threadStackSize?: number;
    enableIo?: boolean;
    enableTime?: boolean;
  }

  export class CrossbeamChannel {
    constructor(bounded?: number);
    send(message: string): boolean;
    receive(): string | null;
    sendAsync(callback: (result: string) => void): void;
    receiveAsync(callback: (message: string) => void): void;
    isEmpty(): boolean;
    len(): number;
  }

  export class CrossbeamAtomicCell {
    constructor(initialValue: number);
    load(): number;
    store(value: number): void;
    swap(value: number): number;
    compareExchange(current: number, new: number): boolean;
    fetchAdd(value: number): number;
    fetchSub(value: number): number;
  }

  export class CrossbeamArrayQueue {
    constructor(capacity: number);
    push(item: string): boolean;
    pop(): string | null;
    isEmpty(): boolean;
    isFull(): boolean;
    len(): number;
    capacity(): number;
  }

  export class CrossbeamSegQueue {
    constructor();
    push(item: string): void;
    pop(): string | null;
    isEmpty(): boolean;
    len(): number;
  }

  export class RayonThreadPool {
    constructor(config?: RayonConfig);
    currentNumThreads(): number;
    spawnAsync(callback: (result: string) => void): void;
  }

  export class TokioRuntime {
    constructor(config?: TokioRuntimeConfig);
    spawnTask(callback: (result: string) => void): void;
    spawnBlockingTask(callback: (result: string) => void): void;
  }

  export class TokioMpscChannel {
    constructor();
    sendAsync(message: string, callback: (result: string) => void): void;
    receiveAsync(callback: (message: string) => void): void;
  }

  export class TokioBroadcastChannel {
    constructor(capacity: number);
    send(message: string): number;
    subscribeAsync(callback: (message: string) => void): void;
    receiverCount(): number;
  }

  export class TokioTimer {
    constructor();
    elapsedMs(): number;
    reset(): void;
    sleepAsync(durationMs: number, callback: (result: string) => void): void;
  }

  export class MultithreadingManager {
    constructor();
    initializeRayon(config?: RayonConfig): void;
    initializeTokio(config?: TokioRuntimeConfig): void;
    getRayonPool(): RayonThreadPool | null;
    getTokioRuntime(): TokioRuntime | null;
    isRayonInitialized(): boolean;
    isTokioInitialized(): boolean;
    cleanup(): void;
  }

  export function getMultithreadingInfo(): string;
  export function initializeMultithreading(): string;
  export function getSystemInfo(): SystemInfo;
  export function createCrossbeamChannel(bounded?: number): CrossbeamChannel;
  export function createCrossbeamAtomicCell(initialValue: number): CrossbeamAtomicCell;
  export function createCrossbeamArrayQueue(capacity: number): CrossbeamArrayQueue;
  export function createCrossbeamSegQueue(): CrossbeamSegQueue;
  export function createRayonThreadPool(config?: RayonConfig): RayonThreadPool;
  export function createTokioRuntime(config?: TokioRuntimeConfig): TokioRuntime;
  export function createTokioMpscChannel(): TokioMpscChannel;
  export function createTokioBroadcastChannel(capacity: number): TokioBroadcastChannel;
  export function createTokioTimer(): TokioTimer;
  export function parallelMap(data: number[], operation: string, pool?: RayonThreadPool): Promise<number[]>;
  export function parallelReduce(data: number[], operation: string, initial?: number, pool?: RayonThreadPool): Promise<number>;
  export function parallelFilter(data: number[], operation: string, threshold?: number, pool?: RayonThreadPool): Promise<number[]>;
  export function parallelSort(data: number[], descending?: boolean, pool?: RayonThreadPool): Promise<number[]>;
  export function parallelChunkProcess(data: number[], chunkSize: number, operation: string, pool?: RayonThreadPool): Promise<number[]>;
  export function tokioDelay(durationMs: number, message: string): Promise<string>;
  export function tokioTimeout(durationMs: number, timeoutMs: number, operation: string): Promise<string>;
  export function tokioParallelTasks(tasks: string[], delayMs: number): Promise<string[]>;
  export function benchmarkParallelOperations(dataSize: number, operation: string): Promise<BenchmarkResult>;
  export function stressTestConcurrency(numTasks: number, taskDurationMs: number, callback: (result: any) => void): void;
  export function crossbeamScopeSpawn(callback: (message: string) => void): void;
  export function crossbeamSelectChannels(channel1: CrossbeamChannel, channel2: CrossbeamChannel, callback: (message: string) => void): void;
  export function tokioSelectChannels(channel1: TokioMpscChannel, channel2: TokioMpscChannel, callback: (message: string) => void): void;
  export function tokioSpawnMultiple(count: number, delayMs: number, callback: (message: string) => void): void;
  export function rayonJoin(leftCallback: (message: string) => void, rightCallback: (message: string) => void, resultCallback: (result: string) => void): void;
  export function getRayonGlobalThreadCount(): number;
  export function getTokioRuntimeMetrics(): string;
  export function getPerformanceMetrics(): PerformanceMetrics;
  export function shutdownMultithreading(): string;
}
    `.trim();
  }
}

export {
  useMultithreading,
  useParallelComputation,
  useAsyncComputation,
} from '../hooks/use-multithreading';
export {
  useServerAction,
  useParallelServerAction,
  createServerAction,
} from '../hooks/use-server-actions';
export { useHydration, useStreamingHydration, useSuspenseHydration } from '../hooks/use-hydration';
export {
  MultithreadingProvider,
  useMultithreadingContext,
  withMultithreading,
} from '../components/MultithreadingProvider';
export {
  useMultithreadingStore,
  useTaskQueue,
  useThreadPools,
  useMultithreadingMetrics,
  useChannelCommunication,
} from '../stores/multithreading-store';
