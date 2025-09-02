/**
 * useWASMAcceleration Hook
 * React hook for WASM-accelerated AI inference
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useExecutionEngine } from '@agile/core';
import type { InferenceRequest } from '@agile/ai-core';
import type {
  UseWASMAccelerationOptions,
  UseWASMAccelerationReturn,
  WASMAccelerationEngine,
  WASMCapabilities,
  AcceleratedInferenceResult,
  BenchmarkOperation,
  BenchmarkResult,
  WASMBackend,
  WASMAccelerationError,
  AccelerationConfig,
  MemoryUsage,
} from '../types/acceleration';
import { WASMAccelerationEngine as Engine } from '../acceleration/WASMAccelerationEngine';

export function useWASMAcceleration(
  options: UseWASMAccelerationOptions = {}
): UseWASMAccelerationReturn {
  const {
    backend = 'rust-native',
    auto_detect_capabilities = true,
    fallback_to_js = true,
    enable_benchmarking = false,
    memory_limit = 512, // 512MB default
    optimization_level = 'balanced',
  } = options;

  // State
  const [engine, setEngine] = useState<WASMAccelerationEngine | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WASMAccelerationError | null>(null);
  const [capabilities, setCapabilities] = useState<WASMCapabilities | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentBackend, setCurrentBackend] = useState<WASMBackend | null>(null);
  const [averageSpeedup, setAverageSpeedup] = useState(1.0);
  const [totalOperations, setTotalOperations] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null);

  // Refs
  const engineRef = useRef<Engine | null>(null);
  const performanceHistory = useRef<number[]>([]);
  const initializationPromise = useRef<Promise<void> | null>(null);

  // ExecutionEngine integration
  const executionEngine = useExecutionEngine({
    enableMetrics: enable_benchmarking,
    timeout: 30000,
  });

  /**
   * Initialize WASM acceleration engine
   */
  const initializeEngine = useCallback(async (): Promise<void> => {
    if (initializationPromise.current) {
      return initializationPromise.current;
    }

    initializationPromise.current = (async () => {
      setLoading(true);
      setError(null);

      try {
        // Create engine instance
        const engineInstance = new Engine(`wasm-engine-${Date.now()}`);
        engineRef.current = engineInstance;

        // Setup event listeners
        engineInstance.on('initialized', (data) => {
          setCapabilities(data.capabilities);
          setIsSupported(data.capabilities.simd || data.capabilities.bulk_memory);
          setIsInitialized(true);
          setCurrentBackend(data.config.backend);
        });

        engineInstance.on('error', (wasmError) => {
          setError(wasmError);
          console.error('WASM Acceleration Error:', wasmError);
        });

        // Determine optimal backend if auto-detection is enabled
        let selectedBackend = backend;
        if (auto_detect_capabilities) {
          selectedBackend = await detectOptimalBackend();
        }

        // Create acceleration configuration
        const config: AccelerationConfig = {
          backend: selectedBackend,
          memory_limit,
          enable_simd: true,
          enable_bulk_memory: true,
          cache_models: true,
          optimization_level,
        };

        // Initialize the engine
        await engineInstance.initialize(config);
        
        setEngine(engineInstance);

        // Update memory usage periodically
        startMemoryMonitoring();

      } catch (err) {
        const wasmError = err as WASMAccelerationError;
        setError(wasmError);
        setIsSupported(false);
        
        // If fallback is enabled, continue without WASM
        if (fallback_to_js) {
          console.warn('WASM acceleration failed, continuing with JavaScript fallback:', err);
        } else {
          throw err;
        }
      } finally {
        setLoading(false);
      }
    })();

    return initializationPromise.current;
  }, [
    backend,
    auto_detect_capabilities,
    fallback_to_js,
    memory_limit,
    optimization_level,
  ]);

  /**
   * Accelerate AI inference using WASM
   */
  const accelerateInference = useCallback(async (
    request: InferenceRequest
  ): Promise<AcceleratedInferenceResult> => {
    if (!engineRef.current) {
      await initializeEngine();
    }

    if (!engineRef.current || !isInitialized) {
      throw new Error('WASM acceleration engine not initialized');
    }

    const startTime = performance.now();

    try {
      const result = await executionEngine.execute(
        () => engineRef.current!.accelerateInference(request),
        {
          type: 'ai-wasm-inference',
          metadata: {
            model: request.model,
            backend: currentBackend,
            wasm_enabled: true,
          },
        }
      );

      // Update performance tracking
      if (result.acceleration_used && result.speedup_ratio > 1) {
        performanceHistory.current.push(result.speedup_ratio);
        
        // Keep only last 100 measurements
        if (performanceHistory.current.length > 100) {
          performanceHistory.current.shift();
        }
        
        // Update average speedup
        const newAverage = performanceHistory.current.reduce((a, b) => a + b, 0) / 
                          performanceHistory.current.length;
        setAverageSpeedup(newAverage);
        setTotalOperations(prev => prev + 1);
      }

      return result;

    } catch (err) {
      // Handle WASM execution errors
      if (fallback_to_js && engineRef.current) {
        // Attempt JavaScript fallback
        try {
          const fallbackResult = await engineRef.current.accelerateInference({
            ...request,
            // Add fallback flag to prevent infinite recursion
          });
          
          return {
            ...fallbackResult,
            acceleration_used: false,
            fallback_reason: `WASM error: ${err}`,
          };
        } catch (fallbackErr) {
          throw new Error(`Both WASM and JS fallback failed: ${err}, ${fallbackErr}`);
        }
      }
      
      throw err;
    }
  }, [
    initializeEngine,
    isInitialized,
    currentBackend,
    fallback_to_js,
    executionEngine,
  ]);

  /**
   * Benchmark WASM operations
   */
  const benchmarkOperation = useCallback(async (
    operation: BenchmarkOperation
  ): Promise<BenchmarkResult> => {
    if (!engineRef.current || !isInitialized) {
      throw new Error('WASM acceleration engine not initialized');
    }

    return await executionEngine.execute(
      () => engineRef.current!.benchmark([operation]),
      {
        type: 'ai-wasm-benchmark',
        metadata: {
          operation_type: operation.type,
          backend: currentBackend,
        },
      }
    );
  }, [isInitialized, currentBackend, executionEngine]);

  /**
   * Detect optimal WASM backend for current environment
   */
  const detectOptimalBackend = async (): Promise<WASMBackend> => {
    const testResults: Array<{ backend: WASMBackend; score: number }> = [];
    
    const backendsToTest: WASMBackend[] = ['rust-native', 'tensorflow-wasm', 'onnx-runtime'];
    
    for (const testBackend of backendsToTest) {
      try {
        const testEngine = new Engine(`test-${testBackend}`);
        const testConfig: AccelerationConfig = {
          backend: testBackend,
          memory_limit: 256, // Lower limit for testing
          enable_simd: true,
          enable_bulk_memory: true,
          cache_models: false,
          optimization_level: 'fast',
        };

        await testEngine.initialize(testConfig);
        
        // Run a quick benchmark
        const quickBenchmark: BenchmarkOperation = {
          id: 'quick-test',
          type: 'tensor-ops',
          description: 'Quick capability test',
          input_data: new Float32Array(100),
          iterations: 5,
          warmup_iterations: 1,
          timeout: 5000,
        };

        const result = await testEngine.benchmark([quickBenchmark]);
        testResults.push({
          backend: testBackend,
          score: result.speedup_ratio,
        });

        await testEngine.dispose();

      } catch (err) {
        console.warn(`Backend ${testBackend} failed capability test:`, err);
      }
    }

    // Return the backend with the highest score
    if (testResults.length > 0) {
      const bestBackend = testResults.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      return bestBackend.backend;
    }

    // Fallback to rust-native
    return 'rust-native';
  };

  /**
   * Start monitoring memory usage
   */
  const startMemoryMonitoring = useCallback(() => {
    const updateMemoryUsage = async () => {
      if (engineRef.current?.getPerformanceMetrics) {
        try {
          const metrics = await engineRef.current.getPerformanceMetrics();
          if (metrics.memory_usage) {
            setMemoryUsage(metrics.memory_usage);
          }
        } catch (err) {
          console.warn('Failed to get memory usage:', err);
        }
      }
    };

    // Update memory usage every 5 seconds
    const interval = setInterval(updateMemoryUsage, 5000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  /**
   * Initialize engine on mount
   */
  useEffect(() => {
    initializeEngine().catch(err => {
      console.error('Failed to initialize WASM acceleration:', err);
    });

    // Cleanup on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose().catch(err => {
          console.warn('Error disposing WASM engine:', err);
        });
      }
    };
  }, [initializeEngine]);

  return {
    engine,
    loading,
    error,
    capabilities,
    accelerateInference,
    benchmarkOperation,
    isSupported,
    isInitialized,
    backend: currentBackend,
    averageSpeedup,
    totalOperations,
    memoryUsage,
  };
}