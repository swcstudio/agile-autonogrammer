/**
 * WASM Benchmark Suite
 * Comprehensive performance testing for WASM acceleration
 */

import { EventEmitter } from 'eventemitter3';
import type { InferenceRequest } from '@agile/ai-core';
import type {
  BenchmarkOperation,
  BenchmarkResult,
  WASMAccelerationEngine,
  AcceleratedInferenceResult,
  TensorOperation,
  TensorResult,
  WASMBackend,
  WASMCapabilities,
} from '../types/acceleration';

export interface BenchmarkSuiteOptions {
  backends: WASMBackend[];
  iterations: number;
  warmup_iterations: number;
  timeout: number; // ms
  include_tensor_ops: boolean;
  include_inference: boolean;
  include_memory_tests: boolean;
  include_stress_tests: boolean;
}

export interface ComprehensiveBenchmarkResult {
  suite_id: string;
  timestamp: Date;
  duration: number; // ms
  environment: BenchmarkEnvironment;
  
  // Results by category
  inference_results: InferenceBenchmarkResult[];
  tensor_ops_results: TensorOpsBenchmarkResult[];
  memory_results: MemoryBenchmarkResult[];
  stress_results: StressBenchmarkResult[];
  
  // Overall metrics
  overall_speedup: number;
  best_backend: WASMBackend;
  recommended_config: RecommendedConfig;
  
  // Performance analysis
  performance_analysis: PerformanceAnalysis;
}

export interface BenchmarkEnvironment {
  browser: string;
  user_agent: string;
  wasm_capabilities: WASMCapabilities;
  memory_limit: number;
  cpu_cores: number;
  platform: string;
}

export interface InferenceBenchmarkResult {
  model_type: string;
  backend: WASMBackend;
  request_size: 'small' | 'medium' | 'large';
  wasm_time: number;
  js_time: number;
  speedup: number;
  memory_peak: number;
  success_rate: number;
  errors: string[];
}

export interface TensorOpsBenchmarkResult {
  operation_type: string;
  backend: WASMBackend;
  input_size: number[];
  wasm_time: number;
  js_baseline: number;
  speedup: number;
  memory_usage: number;
  throughput: number; // ops/sec
}

export interface MemoryBenchmarkResult {
  backend: WASMBackend;
  allocation_time: number; // ms
  deallocation_time: number; // ms
  peak_memory: number; // bytes
  fragmentation: number; // ratio 0-1
  gc_pressure: number; // collections per minute
}

export interface StressBenchmarkResult {
  backend: WASMBackend;
  concurrent_operations: number;
  duration: number; // ms
  success_rate: number;
  average_latency: number;
  p95_latency: number;
  memory_stability: boolean;
  crashed: boolean;
}

export interface RecommendedConfig {
  preferred_backend: WASMBackend;
  memory_limit: number; // MB
  enable_simd: boolean;
  optimization_level: 'fast' | 'balanced' | 'small';
  use_cases: string[];
  confidence: number; // 0-1
}

export interface PerformanceAnalysis {
  strengths: string[];
  weaknesses: string[];
  bottlenecks: string[];
  recommendations: string[];
  expected_real_world_speedup: number;
}

export class WASMBenchmarkSuite extends EventEmitter {
  private engines = new Map<WASMBackend, WASMAccelerationEngine>();
  private results: ComprehensiveBenchmarkResult | null = null;

  constructor() {
    super();
  }

  /**
   * Run comprehensive WASM acceleration benchmarks
   */
  async runBenchmarks(
    engines: Map<WASMBackend, WASMAccelerationEngine>,
    options: BenchmarkSuiteOptions
  ): Promise<ComprehensiveBenchmarkResult> {
    const startTime = Date.now();
    this.engines = engines;
    
    this.emit('benchmark-start', { options });

    try {
      // Detect environment
      const environment = await this.detectEnvironment();
      
      // Initialize results structure
      const result: ComprehensiveBenchmarkResult = {
        suite_id: `benchmark-${Date.now()}`,
        timestamp: new Date(),
        duration: 0,
        environment,
        inference_results: [],
        tensor_ops_results: [],
        memory_results: [],
        stress_results: [],
        overall_speedup: 1.0,
        best_backend: 'rust-native',
        recommended_config: {
          preferred_backend: 'rust-native',
          memory_limit: 512,
          enable_simd: true,
          optimization_level: 'balanced',
          use_cases: [],
          confidence: 0.8,
        },
        performance_analysis: {
          strengths: [],
          weaknesses: [],
          bottlenecks: [],
          recommendations: [],
          expected_real_world_speedup: 1.0,
        },
      };

      // Run benchmark categories
      if (options.include_inference) {
        result.inference_results = await this.runInferenceBenchmarks(options);
      }

      if (options.include_tensor_ops) {
        result.tensor_ops_results = await this.runTensorOpsBenchmarks(options);
      }

      if (options.include_memory_tests) {
        result.memory_results = await this.runMemoryBenchmarks(options);
      }

      if (options.include_stress_tests) {
        result.stress_results = await this.runStressBenchmarks(options);
      }

      // Analyze results
      result.overall_speedup = this.calculateOverallSpeedup(result);
      result.best_backend = this.determineBestBackend(result);
      result.recommended_config = this.generateRecommendedConfig(result);
      result.performance_analysis = this.analyzePerformance(result);

      result.duration = Date.now() - startTime;
      this.results = result;

      this.emit('benchmark-complete', { result });
      return result;

    } catch (error) {
      this.emit('benchmark-error', { error });
      throw error;
    }
  }

  /**
   * Run inference-specific benchmarks
   */
  private async runInferenceBenchmarks(
    options: BenchmarkSuiteOptions
  ): Promise<InferenceBenchmarkResult[]> {
    const results: InferenceBenchmarkResult[] = [];
    
    // Test different request sizes
    const testRequests = this.generateInferenceTestRequests();
    
    for (const [backend, engine] of this.engines) {
      this.emit('inference-benchmark-start', { backend });
      
      for (const testRequest of testRequests) {
        try {
          const result = await this.benchmarkInferenceRequest(
            engine,
            backend,
            testRequest.request,
            testRequest.size,
            options
          );
          results.push(result);
        } catch (error) {
          results.push({
            model_type: testRequest.request.model || 'unknown',
            backend,
            request_size: testRequest.size,
            wasm_time: 0,
            js_time: 0,
            speedup: 0,
            memory_peak: 0,
            success_rate: 0,
            errors: [`Benchmark failed: ${error}`],
          });
        }
      }
    }

    return results;
  }

  /**
   * Run tensor operations benchmarks
   */
  private async runTensorOpsBenchmarks(
    options: BenchmarkSuiteOptions
  ): Promise<TensorOpsBenchmarkResult[]> {
    const results: TensorOpsBenchmarkResult[] = [];
    
    // Generate tensor operation test cases
    const tensorOps = this.generateTensorOperations();
    
    for (const [backend, engine] of this.engines) {
      this.emit('tensor-ops-benchmark-start', { backend });
      
      for (const tensorOp of tensorOps) {
        try {
          // WASM tensor operation
          const wasmStartTime = performance.now();
          const wasmResults = await engine.accelerateTensorOps([tensorOp]);
          const wasmEndTime = performance.now();
          const wasmTime = wasmEndTime - wasmStartTime;
          
          // JavaScript baseline
          const jsStartTime = performance.now();
          const jsResult = await this.executeJSTensorOp(tensorOp);
          const jsEndTime = performance.now();
          const jsTime = jsEndTime - jsStartTime;
          
          const speedup = jsTime / wasmTime;
          const memoryUsage = wasmResults[0]?.memory_peak || 0;
          const throughput = 1000 / wasmTime; // ops per second
          
          results.push({
            operation_type: tensorOp.type,
            backend,
            input_size: tensorOp.input_shape,
            wasm_time: wasmTime,
            js_baseline: jsTime,
            speedup,
            memory_usage: memoryUsage,
            throughput,
          });
          
        } catch (error) {
          console.warn(`Tensor ops benchmark failed for ${backend}:${tensorOp.type}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Run memory management benchmarks
   */
  private async runMemoryBenchmarks(
    options: BenchmarkSuiteOptions
  ): Promise<MemoryBenchmarkResult[]> {
    const results: MemoryBenchmarkResult[] = [];
    
    for (const [backend, engine] of this.engines) {
      this.emit('memory-benchmark-start', { backend });
      
      try {
        // Test memory allocation/deallocation cycles
        const allocationSizes = [1024, 1024 * 1024, 10 * 1024 * 1024]; // 1KB, 1MB, 10MB
        let totalAllocationTime = 0;
        let totalDeallocationTime = 0;
        let peakMemory = 0;
        
        for (const size of allocationSizes) {
          // Allocation timing
          const allocStartTime = performance.now();
          // Simulate memory allocation through tensor operations
          const largeTensor: TensorOperation = {
            id: `memory-test-${size}`,
            type: 'matmul',
            input_shape: [Math.sqrt(size / 4), Math.sqrt(size / 4)], // Roughly size bytes
            output_shape: [Math.sqrt(size / 4), Math.sqrt(size / 4)],
            parameters: {},
            data: new Float32Array(size / 4),
          };
          
          await engine.accelerateTensorOps([largeTensor]);
          const allocEndTime = performance.now();
          totalAllocationTime += allocEndTime - allocStartTime;
          
          // Track peak memory (simulated)
          peakMemory = Math.max(peakMemory, size);
          
          // Deallocation timing (simulated through GC)
          const deallocStartTime = performance.now();
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          const deallocEndTime = performance.now();
          totalDeallocationTime += deallocEndTime - deallocStartTime;
        }
        
        results.push({
          backend,
          allocation_time: totalAllocationTime,
          deallocation_time: totalDeallocationTime,
          peak_memory: peakMemory,
          fragmentation: Math.random() * 0.1, // Mock fragmentation
          gc_pressure: 5, // Mock GC pressure
        });
        
      } catch (error) {
        console.warn(`Memory benchmark failed for ${backend}:`, error);
      }
    }

    return results;
  }

  /**
   * Run stress test benchmarks
   */
  private async runStressBenchmarks(
    options: BenchmarkSuiteOptions
  ): Promise<StressBenchmarkResult[]> {
    const results: StressBenchmarkResult[] = [];
    
    const concurrencyLevels = [1, 4, 8, 16]; // Concurrent operations
    
    for (const [backend, engine] of this.engines) {
      this.emit('stress-benchmark-start', { backend });
      
      for (const concurrency of concurrencyLevels) {
        try {
          const stressDuration = 10000; // 10 seconds
          const startTime = Date.now();
          
          // Create concurrent operations
          const operations: Promise<any>[] = [];
          for (let i = 0; i < concurrency; i++) {
            operations.push(this.runStressOperation(engine));
          }
          
          // Track timing and success rate
          const latencies: number[] = [];
          let successCount = 0;
          let crashed = false;
          
          try {
            const operationResults = await Promise.allSettled(operations);
            
            operationResults.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                successCount++;
                latencies.push(result.value.latency);
              }
            });
            
          } catch (error) {
            crashed = true;
          }
          
          const endTime = Date.now();
          const totalDuration = endTime - startTime;
          const successRate = successCount / concurrency;
          const averageLatency = latencies.length > 0 ? 
            latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
          
          // Calculate P95 latency
          const sortedLatencies = latencies.sort((a, b) => a - b);
          const p95Index = Math.floor(latencies.length * 0.95);
          const p95Latency = sortedLatencies[p95Index] || 0;
          
          results.push({
            backend,
            concurrent_operations: concurrency,
            duration: totalDuration,
            success_rate: successRate,
            average_latency: averageLatency,
            p95_latency: p95Latency,
            memory_stability: !crashed && successRate > 0.95,
            crashed,
          });
          
        } catch (error) {
          results.push({
            backend,
            concurrent_operations: concurrency,
            duration: 0,
            success_rate: 0,
            average_latency: 0,
            p95_latency: 0,
            memory_stability: false,
            crashed: true,
          });
        }
      }
    }

    return results;
  }

  // Helper methods for benchmark generation and execution

  private generateInferenceTestRequests(): Array<{
    request: InferenceRequest;
    size: 'small' | 'medium' | 'large';
  }> {
    return [
      {
        request: {
          model: 'test-model',
          messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
          maxTokens: 50,
        },
        size: 'small',
      },
      {
        request: {
          model: 'test-model',
          messages: [
            { id: '1', role: 'user', content: 'This is a medium-length prompt with more context and detail about what we want to achieve in this conversation. Please provide a comprehensive response.', timestamp: new Date() }
          ],
          maxTokens: 200,
        },
        size: 'medium',
      },
      {
        request: {
          model: 'test-model',
          messages: [
            { id: '1', role: 'system', content: 'You are a helpful assistant that provides detailed, comprehensive responses to complex questions.', timestamp: new Date() },
            { id: '2', role: 'user', content: 'This is a large-scale prompt that includes extensive context, multiple sub-questions, and requires a very detailed response with examples, explanations, and thorough analysis of the topic at hand. Please provide a comprehensive analysis covering all aspects mentioned.', timestamp: new Date() }
          ],
          maxTokens: 1000,
        },
        size: 'large',
      },
    ];
  }

  private generateTensorOperations(): TensorOperation[] {
    return [
      // Matrix multiplication tests
      {
        id: 'matmul-64x64',
        type: 'matmul',
        input_shape: [64, 64],
        output_shape: [64, 64],
        parameters: { beta: 0.0 },
        data: new Float32Array(64 * 64),
      },
      {
        id: 'matmul-256x256',
        type: 'matmul',
        input_shape: [256, 256],
        output_shape: [256, 256],
        parameters: { beta: 0.0 },
        data: new Float32Array(256 * 256),
      },
      // Convolution tests
      {
        id: 'conv2d-32x32',
        type: 'conv2d',
        input_shape: [1, 32, 32, 3],
        output_shape: [1, 30, 30, 16],
        parameters: { kernel_size: [3, 3], filters: 16 },
        data: new Float32Array(32 * 32 * 3),
      },
      // Softmax tests
      {
        id: 'softmax-1024',
        type: 'softmax',
        input_shape: [1024],
        output_shape: [1024],
        parameters: { axis: -1 },
        data: new Float32Array(1024),
      },
      // Embedding tests
      {
        id: 'embedding-512x768',
        type: 'embedding',
        input_shape: [512],
        output_shape: [512, 768],
        parameters: { vocab_size: 50000, embedding_dim: 768 },
        data: new Int32Array(512),
      },
    ];
  }

  private async benchmarkInferenceRequest(
    engine: WASMAccelerationEngine,
    backend: WASMBackend,
    request: InferenceRequest,
    size: 'small' | 'medium' | 'large',
    options: BenchmarkSuiteOptions
  ): Promise<InferenceBenchmarkResult> {
    // Warmup
    for (let i = 0; i < options.warmup_iterations; i++) {
      try {
        await engine.accelerateInference(request);
      } catch {
        // Ignore warmup errors
      }
    }

    // WASM benchmark
    const wasmTimes: number[] = [];
    let wasmMemoryPeak = 0;
    let wasmErrors = 0;

    for (let i = 0; i < options.iterations; i++) {
      try {
        const startTime = performance.now();
        const result = await engine.accelerateInference(request);
        const endTime = performance.now();
        
        wasmTimes.push(endTime - startTime);
        wasmMemoryPeak = Math.max(wasmMemoryPeak, result.memory_used);
      } catch (error) {
        wasmErrors++;
      }
    }

    // JavaScript baseline
    const jsTimes: number[] = [];
    for (let i = 0; i < options.iterations; i++) {
      try {
        const startTime = performance.now();
        await this.executeJSInference(request);
        const endTime = performance.now();
        jsTimes.push(endTime - startTime);
      } catch {
        // Ignore JS baseline errors
      }
    }

    const avgWasmTime = wasmTimes.reduce((a, b) => a + b, 0) / wasmTimes.length;
    const avgJsTime = jsTimes.reduce((a, b) => a + b, 0) / jsTimes.length;
    const speedup = avgJsTime / avgWasmTime;
    const successRate = (options.iterations - wasmErrors) / options.iterations;

    return {
      model_type: request.model || 'unknown',
      backend,
      request_size: size,
      wasm_time: avgWasmTime,
      js_time: avgJsTime,
      speedup: isFinite(speedup) ? speedup : 0,
      memory_peak: wasmMemoryPeak,
      success_rate: successRate,
      errors: wasmErrors > 0 ? [`${wasmErrors} operations failed`] : [],
    };
  }

  private async executeJSTensorOp(operation: TensorOperation): Promise<any> {
    // Mock JavaScript tensor operation baseline
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
    return {};
  }

  private async executeJSInference(request: InferenceRequest): Promise<any> {
    // Mock JavaScript inference baseline
    const baseTime = 50; // Base 50ms
    const tokenFactor = (request.maxTokens || 100) / 100; // Scale with tokens
    const delay = baseTime * tokenFactor;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return {};
  }

  private async runStressOperation(engine: WASMAccelerationEngine): Promise<{ latency: number }> {
    const startTime = performance.now();
    
    // Simulate a stress operation
    const testRequest: InferenceRequest = {
      model: 'stress-test',
      messages: [{ id: '1', role: 'user', content: 'stress test', timestamp: new Date() }],
      maxTokens: 100,
    };
    
    await engine.accelerateInference(testRequest);
    
    const endTime = performance.now();
    return { latency: endTime - startTime };
  }

  private async detectEnvironment(): Promise<BenchmarkEnvironment> {
    const capabilities = await this.detectWASMCapabilities();
    
    return {
      browser: this.getBrowserInfo(),
      user_agent: navigator.userAgent,
      wasm_capabilities: capabilities,
      memory_limit: this.getMemoryLimit(),
      cpu_cores: navigator.hardwareConcurrency || 4,
      platform: navigator.platform,
    };
  }

  private async detectWASMCapabilities(): Promise<WASMCapabilities> {
    return {
      simd: typeof WebAssembly.SIMD !== 'undefined',
      threads: typeof SharedArrayBuffer !== 'undefined',
      bulk_memory: true, // Assume modern support
      reference_types: true, // Assume modern support
      max_memory: 2 * 1024 * 1024 * 1024, // 2GB
      supported_backends: ['rust-native', 'tensorflow-wasm'],
    };
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getMemoryLimit(): number {
    // Estimate available memory
    return 4 * 1024 * 1024 * 1024; // 4GB estimate
  }

  private calculateOverallSpeedup(result: ComprehensiveBenchmarkResult): number {
    const allSpeedups: number[] = [];
    
    result.inference_results.forEach(r => {
      if (r.speedup > 0 && isFinite(r.speedup)) {
        allSpeedups.push(r.speedup);
      }
    });
    
    result.tensor_ops_results.forEach(r => {
      if (r.speedup > 0 && isFinite(r.speedup)) {
        allSpeedups.push(r.speedup);
      }
    });
    
    if (allSpeedups.length === 0) return 1.0;
    
    return allSpeedups.reduce((a, b) => a + b, 0) / allSpeedups.length;
  }

  private determineBestBackend(result: ComprehensiveBenchmarkResult): WASMBackend {
    const backendScores = new Map<WASMBackend, number>();
    
    // Score based on inference performance
    result.inference_results.forEach(r => {
      const currentScore = backendScores.get(r.backend) || 0;
      backendScores.set(r.backend, currentScore + r.speedup * r.success_rate);
    });
    
    // Score based on tensor ops performance
    result.tensor_ops_results.forEach(r => {
      const currentScore = backendScores.get(r.backend) || 0;
      backendScores.set(r.backend, currentScore + r.speedup * 0.5); // Weight tensor ops less
    });
    
    let bestBackend: WASMBackend = 'rust-native';
    let bestScore = 0;
    
    backendScores.forEach((score, backend) => {
      if (score > bestScore) {
        bestScore = score;
        bestBackend = backend;
      }
    });
    
    return bestBackend;
  }

  private generateRecommendedConfig(result: ComprehensiveBenchmarkResult): RecommendedConfig {
    const bestBackend = result.best_backend;
    const avgSpeedup = result.overall_speedup;
    
    return {
      preferred_backend: bestBackend,
      memory_limit: avgSpeedup > 2.0 ? 1024 : 512, // More memory for better performance
      enable_simd: result.environment.wasm_capabilities.simd,
      optimization_level: avgSpeedup > 3.0 ? 'fast' : 'balanced',
      use_cases: this.determineUseCases(result),
      confidence: Math.min(avgSpeedup / 3.0, 1.0), // Confidence based on speedup
    };
  }

  private determineUseCases(result: ComprehensiveBenchmarkResult): string[] {
    const useCases: string[] = [];
    
    if (result.overall_speedup > 2.0) {
      useCases.push('large-model-inference');
    }
    
    if (result.tensor_ops_results.some(r => r.speedup > 3.0)) {
      useCases.push('tensor-operations');
    }
    
    if (result.stress_results.some(r => r.memory_stability)) {
      useCases.push('production-workloads');
    }
    
    if (result.inference_results.some(r => r.request_size === 'large' && r.speedup > 2.0)) {
      useCases.push('long-context-inference');
    }
    
    return useCases;
  }

  private analyzePerformance(result: ComprehensiveBenchmarkResult): PerformanceAnalysis {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze strengths
    if (result.overall_speedup > 3.0) {
      strengths.push('Excellent overall acceleration performance');
    }
    
    if (result.environment.wasm_capabilities.simd) {
      strengths.push('SIMD support provides significant speedup for tensor operations');
    }
    
    // Analyze weaknesses
    if (result.memory_results.some(r => r.fragmentation > 0.2)) {
      weaknesses.push('High memory fragmentation detected');
    }
    
    if (result.stress_results.some(r => !r.memory_stability)) {
      weaknesses.push('Memory instability under high concurrency');
    }
    
    // Identify bottlenecks
    if (result.tensor_ops_results.some(r => r.speedup < 1.5)) {
      bottlenecks.push('Tensor operations not fully utilizing WASM acceleration');
    }
    
    // Generate recommendations
    if (result.overall_speedup > 2.0) {
      recommendations.push('Enable WASM acceleration for production workloads');
    } else {
      recommendations.push('Consider JavaScript fallback for better compatibility');
    }
    
    return {
      strengths,
      weaknesses,
      bottlenecks,
      recommendations,
      expected_real_world_speedup: Math.min(result.overall_speedup * 0.8, 4.0), // Conservative estimate
    };
  }
}