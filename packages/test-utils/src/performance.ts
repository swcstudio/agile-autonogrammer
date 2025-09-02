/**
 * Performance Testing & Benchmarking Utilities
 * Comprehensive performance monitoring for hooks, components, and WASM operations
 */

export interface PerformanceMetrics {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryUsed?: number;
  cpuUsage?: number;
}

export interface BenchmarkResult {
  name: string;
  runs: number;
  durations: number[];
  average: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  percentile95: number;
  percentile99: number;
  memoryStats?: MemoryStats;
}

export interface MemoryStats {
  initial: number;
  final: number;
  peak: number;
  average: number;
}

/**
 * Performance Monitor class for detailed performance tracking
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private memorySnapshots: Map<string, number[]> = new Map();
  
  /**
   * Start timing an operation
   */
  start(name: string): void {
    this.activeTimers.set(name, performance.now());
    
    // Capture initial memory if available
    if ('memory' in performance) {
      const memory = (performance as any).memory.usedJSHeapSize;
      const snapshots = this.memorySnapshots.get(name) || [];
      snapshots.push(memory);
      this.memorySnapshots.set(name, snapshots);
    }
  }
  
  /**
   * End timing an operation
   */
  end(name: string): PerformanceMetrics {
    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      throw new Error(`No active timer found for "${name}"`);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Capture final memory if available
    let memoryUsed: number | undefined;
    if ('memory' in performance) {
      const snapshots = this.memorySnapshots.get(name) || [];
      const finalMemory = (performance as any).memory.usedJSHeapSize;
      snapshots.push(finalMemory);
      memoryUsed = finalMemory - (snapshots[0] || finalMemory);
    }
    
    const metric: PerformanceMetrics = {
      name,
      duration,
      startTime,
      endTime,
      memoryUsed,
    };
    
    // Store metric
    const metrics = this.metrics.get(name) || [];
    metrics.push(metric);
    this.metrics.set(name, metrics);
    
    // Clean up
    this.activeTimers.delete(name);
    
    return metric;
  }
  
  /**
   * Measure an async operation
   */
  async measure<T>(name: string, operation: () => Promise<T>): Promise<[T, PerformanceMetrics]> {
    this.start(name);
    try {
      const result = await operation();
      const metrics = this.end(name);
      return [result, metrics];
    } catch (error) {
      this.end(name); // Still end timing even on error
      throw error;
    }
  }
  
  /**
   * Measure a sync operation
   */
  measureSync<T>(name: string, operation: () => T): [T, PerformanceMetrics] {
    this.start(name);
    try {
      const result = operation();
      const metrics = this.end(name);
      return [result, metrics];
    } catch (error) {
      this.end(name); // Still end timing even on error
      throw error;
    }
  }
  
  /**
   * Get metrics for a specific operation
   */
  getMetrics(name: string): PerformanceMetrics[] {
    return this.metrics.get(name) || [];
  }
  
  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics[]> {
    return new Map(this.metrics);
  }
  
  /**
   * Generate report for specific operation
   */
  generateReport(name: string): BenchmarkResult | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;
    
    const durations = metrics.map(m => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    
    const sum = durations.reduce((acc, val) => acc + val, 0);
    const average = sum / durations.length;
    
    // Calculate standard deviation
    const squaredDiffs = durations.map(val => Math.pow(val - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / durations.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);
    
    // Memory stats if available
    let memoryStats: MemoryStats | undefined;
    if (this.memorySnapshots.has(name)) {
      const snapshots = this.memorySnapshots.get(name)!;
      memoryStats = {
        initial: snapshots[0],
        final: snapshots[snapshots.length - 1],
        peak: Math.max(...snapshots),
        average: snapshots.reduce((a, b) => a + b, 0) / snapshots.length,
      };
    }
    
    return {
      name,
      runs: durations.length,
      durations,
      average,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      standardDeviation,
      percentile95: sorted[Math.floor(sorted.length * 0.95)],
      percentile99: sorted[Math.floor(sorted.length * 0.99)],
      memoryStats,
    };
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.activeTimers.clear();
    this.memorySnapshots.clear();
  }
}

/**
 * Benchmark a function with multiple runs
 */
export async function benchmark<T>(
  name: string,
  fn: () => T | Promise<T>,
  options: {
    runs?: number;
    warmup?: number;
    async?: boolean;
  } = {}
): Promise<BenchmarkResult> {
  const { runs = 100, warmup = 10, async = false } = options;
  const monitor = new PerformanceMonitor();
  
  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    if (async) {
      await fn();
    } else {
      fn();
    }
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Actual benchmark runs
  for (let i = 0; i < runs; i++) {
    if (async) {
      await monitor.measure(`${name}_${i}`, fn as () => Promise<T>);
    } else {
      monitor.measureSync(`${name}_${i}`, fn as () => T);
    }
    
    // Occasional GC to prevent memory buildup
    if (i % 10 === 0 && global.gc) {
      global.gc();
    }
  }
  
  // Aggregate results
  const allMetrics: PerformanceMetrics[] = [];
  for (let i = 0; i < runs; i++) {
    const metrics = monitor.getMetrics(`${name}_${i}`);
    if (metrics.length > 0) {
      allMetrics.push(metrics[0]);
    }
  }
  
  const durations = allMetrics.map(m => m.duration);
  const sorted = [...durations].sort((a, b) => a - b);
  
  const sum = durations.reduce((acc, val) => acc + val, 0);
  const average = sum / durations.length;
  
  // Calculate standard deviation
  const squaredDiffs = durations.map(val => Math.pow(val - average, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / durations.length;
  const standardDeviation = Math.sqrt(avgSquaredDiff);
  
  // Memory stats
  const memoryUsages = allMetrics.map(m => m.memoryUsed).filter(m => m !== undefined) as number[];
  let memoryStats: MemoryStats | undefined;
  if (memoryUsages.length > 0) {
    memoryStats = {
      initial: memoryUsages[0],
      final: memoryUsages[memoryUsages.length - 1],
      peak: Math.max(...memoryUsages),
      average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
    };
  }
  
  return {
    name,
    runs,
    durations,
    average,
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    standardDeviation,
    percentile95: sorted[Math.floor(sorted.length * 0.95)],
    percentile99: sorted[Math.floor(sorted.length * 0.99)],
    memoryStats,
  };
}

/**
 * Compare performance of multiple implementations
 */
export async function compareBenchmarks(
  implementations: Array<{
    name: string;
    fn: () => any | Promise<any>;
  }>,
  options: {
    runs?: number;
    warmup?: number;
  } = {}
): Promise<{
  results: BenchmarkResult[];
  fastest: string;
  slowest: string;
  comparison: Array<{ name: string; relativeSpeed: number }>;
}> {
  const results: BenchmarkResult[] = [];
  
  for (const impl of implementations) {
    const result = await benchmark(impl.name, impl.fn, {
      ...options,
      async: impl.fn.constructor.name === 'AsyncFunction',
    });
    results.push(result);
  }
  
  // Sort by average duration
  results.sort((a, b) => a.average - b.average);
  
  const fastest = results[0].name;
  const slowest = results[results.length - 1].name;
  const fastestTime = results[0].average;
  
  const comparison = results.map(r => ({
    name: r.name,
    relativeSpeed: fastestTime / r.average,
  }));
  
  return {
    results,
    fastest,
    slowest,
    comparison,
  };
}

/**
 * Profile memory usage of a function
 */
export async function profileMemory<T>(
  name: string,
  fn: () => T | Promise<T>,
  options: {
    samples?: number;
    interval?: number;
  } = {}
): Promise<{
  name: string;
  samples: number[];
  initial: number;
  final: number;
  peak: number;
  average: number;
  leaked: number;
}> {
  const { samples: sampleCount = 100, interval = 10 } = options;
  
  if (!('memory' in performance)) {
    throw new Error('Memory profiling is not available in this environment');
  }
  
  const samples: number[] = [];
  const memory = (performance as any).memory;
  
  // Force GC and get initial memory
  if (global.gc) global.gc();
  const initial = memory.usedJSHeapSize;
  
  // Start sampling
  const samplingInterval = setInterval(() => {
    samples.push(memory.usedJSHeapSize);
  }, interval);
  
  // Run the function
  const isAsync = fn.constructor.name === 'AsyncFunction';
  if (isAsync) {
    await fn();
  } else {
    fn();
  }
  
  // Stop sampling
  clearInterval(samplingInterval);
  
  // Force GC and get final memory
  if (global.gc) global.gc();
  const final = memory.usedJSHeapSize;
  
  const peak = Math.max(...samples);
  const average = samples.reduce((a, b) => a + b, 0) / samples.length;
  const leaked = final - initial;
  
  return {
    name,
    samples,
    initial,
    final,
    peak,
    average,
    leaked,
  };
}

/**
 * Create a performance test suite
 */
export class PerformanceTestSuite {
  private tests: Map<string, () => any | Promise<any>> = new Map();
  private results: Map<string, BenchmarkResult> = new Map();
  
  /**
   * Add a test to the suite
   */
  add(name: string, fn: () => any | Promise<any>): this {
    this.tests.set(name, fn);
    return this;
  }
  
  /**
   * Run all tests in the suite
   */
  async run(options: {
    runs?: number;
    warmup?: number;
  } = {}): Promise<Map<string, BenchmarkResult>> {
    for (const [name, fn] of this.tests) {
      console.log(`Running benchmark: ${name}`);
      const result = await benchmark(name, fn, {
        ...options,
        async: fn.constructor.name === 'AsyncFunction',
      });
      this.results.set(name, result);
    }
    
    return this.results;
  }
  
  /**
   * Generate a report of all results
   */
  generateReport(): string {
    const lines: string[] = ['Performance Test Suite Report', '=' .repeat(50)];
    
    for (const [name, result] of this.results) {
      lines.push('');
      lines.push(`Test: ${name}`);
      lines.push('-'.repeat(30));
      lines.push(`Runs: ${result.runs}`);
      lines.push(`Average: ${result.average.toFixed(3)}ms`);
      lines.push(`Median: ${result.median.toFixed(3)}ms`);
      lines.push(`Min: ${result.min.toFixed(3)}ms`);
      lines.push(`Max: ${result.max.toFixed(3)}ms`);
      lines.push(`Std Dev: ${result.standardDeviation.toFixed(3)}ms`);
      lines.push(`P95: ${result.percentile95.toFixed(3)}ms`);
      lines.push(`P99: ${result.percentile99.toFixed(3)}ms`);
      
      if (result.memoryStats) {
        lines.push(`Memory - Initial: ${(result.memoryStats.initial / 1024 / 1024).toFixed(2)}MB`);
        lines.push(`Memory - Final: ${(result.memoryStats.final / 1024 / 1024).toFixed(2)}MB`);
        lines.push(`Memory - Peak: ${(result.memoryStats.peak / 1024 / 1024).toFixed(2)}MB`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Clear all results
   */
  clear(): void {
    this.tests.clear();
    this.results.clear();
  }
}

/**
 * Performance assertions for testing
 */
export const performanceAssertions = {
  /**
   * Assert that an operation completes within a time limit
   */
  toCompleteWithin: async (
    fn: () => any | Promise<any>,
    maxDuration: number
  ): Promise<void> => {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    
    if (duration > maxDuration) {
      throw new Error(`Operation took ${duration.toFixed(2)}ms, expected less than ${maxDuration}ms`);
    }
  },
  
  /**
   * Assert that memory usage stays within limits
   */
  toUseMemoryLessThan: async (
    fn: () => any | Promise<any>,
    maxMemory: number
  ): Promise<void> => {
    if (!('memory' in performance)) {
      console.warn('Memory assertions not available in this environment');
      return;
    }
    
    const memory = (performance as any).memory;
    if (global.gc) global.gc();
    
    const initial = memory.usedJSHeapSize;
    await fn();
    
    if (global.gc) global.gc();
    const final = memory.usedJSHeapSize;
    const used = final - initial;
    
    if (used > maxMemory) {
      throw new Error(`Operation used ${(used / 1024 / 1024).toFixed(2)}MB, expected less than ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
    }
  },
};

// Export a global instance for convenience
export const globalPerformanceMonitor = new PerformanceMonitor();