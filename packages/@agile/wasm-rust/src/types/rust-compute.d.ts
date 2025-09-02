/**
 * Type Definitions for Rust WASM Compute Module
 * High-performance computing interface for matrix operations, FFT, and ML algorithms
 */

// Matrix operation types
export interface MatrixDimensions {
  rows: number;
  cols: number;
}

export interface MatrixMultiplyOptions {
  dimensions: MatrixDimensions;
  useSimd?: boolean;
  transpose?: {
    a?: boolean;
    b?: boolean;
  };
}

// FFT operation types
export interface FFTOptions {
  inverse?: boolean;
  normalize?: boolean;
  windowFunction?: 'hamming' | 'hanning' | 'blackman' | 'none';
}

export interface FFTResult {
  real: Float32Array;
  imag: Float32Array;
  magnitude?: Float32Array;
  phase?: Float32Array;
}

// K-means clustering types
export interface KMeansConfig {
  k: number;
  dimensions: number;
  maxIterations?: number;
  tolerance?: number;
  initMethod?: 'random' | 'kmeans++' | 'uniform';
  seed?: number;
}

export interface KMeansResult {
  clusters: Uint32Array;
  centroids: Float32Array;
  iterations: number;
  inertia: number;
  converged: boolean;
}

// Performance and capabilities
export interface WasmCapabilities {
  simd: boolean;
  threads: boolean;
  bulkMemory: boolean;
  multiValue: boolean;
  referenceTypes: boolean;
  tailCall: boolean;
  memory64?: boolean;
  exceptionHandling?: boolean;
}

export interface PerformanceStats {
  totalOperations: number;
  averageLatency: number;
  peakMemoryUsage: number;
  currentMemoryUsage: number;
  cacheHits: number;
  cacheMisses: number;
  simdOperations: number;
  scalarOperations: number;
}

export interface BenchmarkResults {
  matrixMultiply: {
    size: number;
    duration: number;
    gflops: number;
  };
  fft: {
    size: number;
    duration: number;
    samplesPerSecond: number;
  };
  kmeans: {
    points: number;
    clusters: number;
    dimensions: number;
    duration: number;
    iterationsPerSecond: number;
  };
  memory: {
    allocations: number;
    deallocations: number;
    peakUsage: number;
    averageUsage: number;
  };
}

// Main Rust compute interface
export interface RustCompute {
  // Matrix operations
  matrixMultiply(
    a: Float32Array,
    b: Float32Array,
    options: MatrixMultiplyOptions
  ): Float32Array;
  
  matrixTranspose(
    matrix: Float32Array,
    dimensions: MatrixDimensions
  ): Float32Array;
  
  matrixInverse(
    matrix: Float32Array,
    dimensions: MatrixDimensions
  ): Float32Array | null;
  
  matrixDeterminant(
    matrix: Float32Array,
    dimensions: MatrixDimensions
  ): number;
  
  // Signal processing
  fft(
    real: Float32Array,
    imag: Float32Array,
    options?: FFTOptions
  ): FFTResult;
  
  ifft(
    real: Float32Array,
    imag: Float32Array,
    options?: FFTOptions
  ): FFTResult;
  
  convolution(
    signal: Float32Array,
    kernel: Float32Array
  ): Float32Array;
  
  correlation(
    signal1: Float32Array,
    signal2: Float32Array
  ): Float32Array;
  
  // Machine learning
  kMeansClustering(
    data: Float32Array,
    config: KMeansConfig
  ): KMeansResult;
  
  pca(
    data: Float32Array,
    components: number,
    dimensions: MatrixDimensions
  ): {
    components: Float32Array;
    explainedVariance: Float32Array;
    mean: Float32Array;
  };
  
  // Vector operations (SIMD-accelerated)
  vectorAdd(a: Float32Array, b: Float32Array): Float32Array;
  vectorSubtract(a: Float32Array, b: Float32Array): Float32Array;
  vectorMultiply(a: Float32Array, b: Float32Array): Float32Array;
  vectorDivide(a: Float32Array, b: Float32Array): Float32Array;
  vectorDot(a: Float32Array, b: Float32Array): number;
  vectorNorm(vector: Float32Array, p?: number): number;
  vectorNormalize(vector: Float32Array): Float32Array;
  
  // Statistical operations
  mean(data: Float32Array): number;
  variance(data: Float32Array): number;
  standardDeviation(data: Float32Array): number;
  covariance(x: Float32Array, y: Float32Array): number;
  correlation(x: Float32Array, y: Float32Array): number;
  
  // Memory management
  allocateBuffer(size: number): number;
  deallocateBuffer(ptr: number, size: number): void;
  copyToWasm(data: Float32Array, ptr: number): void;
  copyFromWasm(ptr: number, size: number): Float32Array;
  
  // Performance and diagnostics
  runBenchmark(): BenchmarkResults;
  getCapabilities(): WasmCapabilities;
  getStats(): PerformanceStats;
  resetStats(): void;
  
  // Lifecycle
  initialize(): Promise<void>;
  dispose(): void;
}

// Hook return type
export interface UseRustComputeReturn {
  compute: RustCompute | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  capabilities: WasmCapabilities | null;
  stats: PerformanceStats | null;
  
  // Convenience methods with loading state handling
  executeMatrixOperation: <T>(
    operation: (compute: RustCompute) => T
  ) => Promise<T>;
  
  executeSignalOperation: <T>(
    operation: (compute: RustCompute) => T
  ) => Promise<T>;
  
  executeMLOperation: <T>(
    operation: (compute: RustCompute) => T
  ) => Promise<T>;
}