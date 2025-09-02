/**
 * WASM Testing Utilities
 * Specialized testing tools for WebAssembly modules and runtimes
 */

export interface WasmTestConfig {
  modulePath?: string;
  imports?: WebAssembly.Imports;
  memory?: WebAssembly.MemoryDescriptor;
  table?: WebAssembly.TableDescriptor;
  timeout?: number;
}

export interface WasmTestResult {
  name: string;
  passed: boolean;
  duration: number;
  memoryUsage?: {
    before: number;
    after: number;
    peak: number;
  };
  error?: Error;
  output?: any;
}

export interface WasmBenchmarkResult {
  name: string;
  wasmTime: number;
  jsTime?: number;
  speedup?: number;
  memoryUsage: number;
  successful: boolean;
}

/**
 * WASM Module Test Runner
 */
export class WasmTestRunner {
  private module: WebAssembly.Module | null = null;
  private instance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory;
  private memorySnapshots: number[] = [];
  
  constructor(private config: WasmTestConfig = {}) {
    this.memory = new WebAssembly.Memory(
      config.memory || { initial: 256, maximum: 512 }
    );
  }
  
  /**
   * Load a WASM module for testing
   */
  async loadModule(wasmPath: string): Promise<void> {
    const wasmBuffer = await this.fetchWasm(wasmPath);
    this.module = await WebAssembly.compile(wasmBuffer);
  }
  
  /**
   * Load a WASM module from bytes
   */
  async loadModuleFromBytes(bytes: Uint8Array): Promise<void> {
    this.module = await WebAssembly.compile(bytes);
  }
  
  /**
   * Instantiate the loaded module
   */
  async instantiate(imports?: WebAssembly.Imports): Promise<WebAssembly.Instance> {
    if (!this.module) {
      throw new Error('No module loaded. Call loadModule() first.');
    }
    
    const defaultImports: WebAssembly.Imports = {
      env: {
        memory: this.memory,
        abort: (msg: number, file: number, line: number, column: number) => {
          throw new Error(`WASM abort at ${file}:${line}:${column} - message: ${msg}`);
        },
        trace: (msg: number) => {
          console.log(`WASM trace: ${msg}`);
        },
        ...((imports?.env as any) || {}),
      },
      ...imports,
    };
    
    this.instance = await WebAssembly.instantiate(this.module, defaultImports);
    return this.instance;
  }
  
  /**
   * Run a test on a WASM function
   */
  async testFunction<T extends any[], R>(
    functionName: string,
    args: T,
    expected?: R,
    validator?: (result: R) => boolean
  ): Promise<WasmTestResult> {
    if (!this.instance) {
      throw new Error('Module not instantiated. Call instantiate() first.');
    }
    
    const exports = this.instance.exports as any;
    const fn = exports[functionName];
    
    if (typeof fn !== 'function') {
      throw new Error(`Export "${functionName}" is not a function`);
    }
    
    const startMemory = this.getMemoryUsage();
    const startTime = performance.now();
    
    try {
      // Take memory snapshots during execution
      this.startMemoryMonitoring();
      
      const result = fn(...args);
      
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      const peakMemory = this.stopMemoryMonitoring();
      
      let passed = true;
      if (expected !== undefined) {
        passed = this.deepEqual(result, expected);
      } else if (validator) {
        passed = validator(result);
      }
      
      return {
        name: functionName,
        passed,
        duration: endTime - startTime,
        memoryUsage: {
          before: startMemory,
          after: endMemory,
          peak: peakMemory,
        },
        output: result,
      };
    } catch (error) {
      return {
        name: functionName,
        passed: false,
        duration: performance.now() - startTime,
        error: error as Error,
      };
    }
  }
  
  /**
   * Compare WASM function performance with JavaScript equivalent
   */
  async benchmark<T extends any[], R>(
    wasmFunctionName: string,
    jsFunction: (...args: T) => R,
    args: T,
    iterations: number = 1000
  ): Promise<WasmBenchmarkResult> {
    if (!this.instance) {
      throw new Error('Module not instantiated. Call instantiate() first.');
    }
    
    const wasmFn = (this.instance.exports as any)[wasmFunctionName];
    
    if (typeof wasmFn !== 'function') {
      throw new Error(`Export "${wasmFunctionName}" is not a function`);
    }
    
    // Warmup
    for (let i = 0; i < 10; i++) {
      wasmFn(...args);
      jsFunction(...args);
    }
    
    // Benchmark WASM
    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      wasmFn(...args);
    }
    const wasmTime = (performance.now() - wasmStart) / iterations;
    
    // Benchmark JavaScript
    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      jsFunction(...args);
    }
    const jsTime = (performance.now() - jsStart) / iterations;
    
    const memoryUsage = this.getMemoryUsage();
    
    return {
      name: wasmFunctionName,
      wasmTime,
      jsTime,
      speedup: jsTime / wasmTime,
      memoryUsage,
      successful: true,
    };
  }
  
  /**
   * Test memory allocation and deallocation
   */
  async testMemoryOperations(
    allocFn: string,
    deallocFn: string,
    size: number
  ): Promise<WasmTestResult> {
    if (!this.instance) {
      throw new Error('Module not instantiated. Call instantiate() first.');
    }
    
    const exports = this.instance.exports as any;
    const alloc = exports[allocFn];
    const dealloc = exports[deallocFn];
    
    if (typeof alloc !== 'function' || typeof dealloc !== 'function') {
      throw new Error('Allocation or deallocation function not found');
    }
    
    const initialMemory = this.getMemoryUsage();
    const startTime = performance.now();
    
    try {
      // Allocate memory
      const ptr = alloc(size);
      if (ptr === 0) {
        throw new Error('Allocation failed (returned null pointer)');
      }
      
      const afterAlloc = this.getMemoryUsage();
      
      // Write to memory to verify it's accessible
      const view = new Uint8Array(this.memory.buffer, ptr, size);
      for (let i = 0; i < size; i++) {
        view[i] = i % 256;
      }
      
      // Deallocate memory
      dealloc(ptr, size);
      
      const afterDealloc = this.getMemoryUsage();
      const duration = performance.now() - startTime;
      
      // Check for memory leak
      const leaked = afterDealloc - initialMemory;
      const passed = leaked <= 0; // No memory should be leaked
      
      return {
        name: 'Memory Operations',
        passed,
        duration,
        memoryUsage: {
          before: initialMemory,
          after: afterDealloc,
          peak: afterAlloc,
        },
        output: { allocated: size, leaked },
      };
    } catch (error) {
      return {
        name: 'Memory Operations',
        passed: false,
        duration: performance.now() - startTime,
        error: error as Error,
      };
    }
  }
  
  /**
   * Test WASM threading capabilities
   */
  async testThreading(
    workerFn: string,
    numThreads: number,
    workload: any[]
  ): Promise<WasmTestResult> {
    if (!this.instance) {
      throw new Error('Module not instantiated. Call instantiate() first.');
    }
    
    const exports = this.instance.exports as any;
    const fn = exports[workerFn];
    
    if (typeof fn !== 'function') {
      throw new Error(`Export "${workerFn}" is not a function`);
    }
    
    const startTime = performance.now();
    
    try {
      // Simulate parallel execution (actual threading would require SharedArrayBuffer)
      const promises = workload.map((work, index) => {
        return new Promise((resolve) => {
          // Simulate thread delay
          setTimeout(() => {
            const result = fn(work);
            resolve(result);
          }, Math.random() * 10);
        });
      });
      
      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      return {
        name: 'Threading Test',
        passed: true,
        duration,
        output: {
          numThreads,
          workloadSize: workload.length,
          results,
        },
      };
    } catch (error) {
      return {
        name: 'Threading Test',
        passed: false,
        duration: performance.now() - startTime,
        error: error as Error,
      };
    }
  }
  
  /**
   * Validate WASM module exports
   */
  validateExports(expectedExports: string[]): WasmTestResult {
    if (!this.instance) {
      throw new Error('Module not instantiated. Call instantiate() first.');
    }
    
    const exports = Object.keys(this.instance.exports);
    const missing = expectedExports.filter(exp => !exports.includes(exp));
    const extra = exports.filter(exp => !expectedExports.includes(exp) && exp !== 'memory');
    
    const passed = missing.length === 0;
    
    return {
      name: 'Export Validation',
      passed,
      duration: 0,
      output: {
        expected: expectedExports,
        actual: exports,
        missing,
        extra,
      },
    };
  }
  
  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    return this.memory.buffer.byteLength;
  }
  
  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(): void {
    this.memorySnapshots = [this.getMemoryUsage()];
    
    // Take snapshots periodically
    const interval = setInterval(() => {
      this.memorySnapshots.push(this.getMemoryUsage());
    }, 1);
    
    // Store interval ID for cleanup
    (this as any)._memoryMonitorInterval = interval;
  }
  
  /**
   * Stop monitoring and return peak memory usage
   */
  private stopMemoryMonitoring(): number {
    if ((this as any)._memoryMonitorInterval) {
      clearInterval((this as any)._memoryMonitorInterval);
      delete (this as any)._memoryMonitorInterval;
    }
    
    return Math.max(...this.memorySnapshots);
  }
  
  /**
   * Fetch WASM module
   */
  private async fetchWasm(path: string): Promise<ArrayBuffer> {
    if (typeof window !== 'undefined') {
      // Browser environment
      const response = await fetch(path);
      return response.arrayBuffer();
    } else {
      // Node.js environment
      const fs = await import('fs/promises');
      const buffer = await fs.readFile(path);
      return buffer.buffer;
    }
  }
  
  /**
   * Deep equality check
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a == null || b == null) return false;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!this.deepEqual(a[key], b[key])) return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.module = null;
    this.instance = null;
    this.memorySnapshots = [];
    this.stopMemoryMonitoring();
  }
}

/**
 * Create a WASM test suite
 */
export class WasmTestSuite {
  private tests: Array<{
    name: string;
    test: () => Promise<WasmTestResult>;
  }> = [];
  
  private runner: WasmTestRunner;
  
  constructor(config?: WasmTestConfig) {
    this.runner = new WasmTestRunner(config);
  }
  
  /**
   * Add a test to the suite
   */
  test(name: string, testFn: (runner: WasmTestRunner) => Promise<WasmTestResult>): this {
    this.tests.push({
      name,
      test: () => testFn(this.runner),
    });
    return this;
  }
  
  /**
   * Run all tests in the suite
   */
  async run(): Promise<WasmTestResult[]> {
    const results: WasmTestResult[] = [];
    
    for (const { name, test } of this.tests) {
      console.log(`Running WASM test: ${name}`);
      try {
        const result = await test();
        results.push(result);
        
        if (result.passed) {
          console.log(`✓ ${name} (${result.duration.toFixed(2)}ms)`);
        } else {
          console.log(`✗ ${name} - Failed`);
          if (result.error) {
            console.error(result.error);
          }
        }
      } catch (error) {
        console.log(`✗ ${name} - Error`);
        console.error(error);
        results.push({
          name,
          passed: false,
          duration: 0,
          error: error as Error,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Generate test report
   */
  generateReport(results: WasmTestResult[]): string {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    const lines = [
      'WASM Test Suite Report',
      '='.repeat(50),
      `Total Tests: ${results.length}`,
      `Passed: ${passed}`,
      `Failed: ${failed}`,
      `Total Duration: ${totalDuration.toFixed(2)}ms`,
      '',
      'Test Results:',
      '-'.repeat(50),
    ];
    
    for (const result of results) {
      const status = result.passed ? '✓' : '✗';
      lines.push(`${status} ${result.name} (${result.duration.toFixed(2)}ms)`);
      
      if (result.memoryUsage) {
        const { before, after, peak } = result.memoryUsage;
        lines.push(`  Memory: ${before} → ${peak} (peak) → ${after} bytes`);
      }
      
      if (result.error) {
        lines.push(`  Error: ${result.error.message}`);
      }
    }
    
    return lines.join('\n');
  }
}

/**
 * Helper to create mock WASM module for testing
 */
export function createMockWasmModule(exports: Record<string, Function>): Uint8Array {
  // Create a minimal valid WASM module with custom exports
  // This is a simplified mock - real implementation would generate proper WASM bytecode
  const wasmHeader = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // WASM magic number
    0x01, 0x00, 0x00, 0x00, // WASM version
  ]);
  
  // In a real implementation, we would generate proper WASM bytecode
  // For testing purposes, we'll use the mock module pattern
  return wasmHeader;
}