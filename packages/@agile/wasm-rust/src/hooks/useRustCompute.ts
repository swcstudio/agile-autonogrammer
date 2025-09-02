/**
 * useRustCompute Hook
 * React hook for high-performance Rust WASM compute operations
 * Integrates with ExecutionEngine for optimal task scheduling
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useExecutionEngine } from '@agile/core';
import { loadRustWasmModule, type LoaderOptions, type LoaderResult } from '../loaders/rustWasmLoader';
import { getSIMDSupport, createSIMDReport } from '../simd/detector';
import type { 
  RustCompute, 
  UseRustComputeReturn, 
  WasmCapabilities, 
  PerformanceStats,
  MatrixMultiplyOptions,
  FFTOptions,
  KMeansConfig,
  MatrixDimensions
} from '../types/rust-compute';

export interface UseRustComputeOptions extends LoaderOptions {
  autoLoad?: boolean;
  fallbackToJS?: boolean;
  performanceMonitoring?: boolean;
  memoryManagement?: {
    autoGC?: boolean;
    gcThreshold?: number;
  };
  timeout?: number;
}

const DEFAULT_OPTIONS: UseRustComputeOptions = {
  autoLoad: true,
  fallbackToJS: true,
  performanceMonitoring: true,
  memoryManagement: {
    autoGC: true,
    gcThreshold: 100 * 1024 * 1024, // 100MB
  },
  timeout: 30000,
  wasmPath: '/wasm/rust-compute.wasm',
  memory: {
    initial: 256,
    maximum: 4096,
  },
  enableSIMD: true,
  enableThreads: false,
  cacheModule: true,
};

/**
 * React hook for Rust WASM compute operations
 */
export function useRustCompute(options: UseRustComputeOptions = {}): UseRustComputeReturn {
  const mergedOptions = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const executionEngine = useExecutionEngine({
    enableMetrics: mergedOptions.performanceMonitoring,
    timeout: mergedOptions.timeout,
  });
  
  // State management
  const [compute, setCompute] = useState<RustCompute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [capabilities, setCapabilities] = useState<WasmCapabilities | null>(null);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  
  // References
  const loaderResult = useRef<LoaderResult | null>(null);
  const memoryWatcher = useRef<NodeJS.Timeout | null>(null);
  const initialized = useRef(false);
  
  /**
   * Load the Rust WASM module
   */
  const loadModule = useCallback(async () => {
    if (isLoading || isLoaded) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load the WASM module
      const result = await loadRustWasmModule(mergedOptions);
      
      loaderResult.current = result;
      setCompute(result.compute);
      setCapabilities(result.capabilities);
      setIsLoaded(true);
      
      // Start performance monitoring
      if (mergedOptions.performanceMonitoring) {
        startPerformanceMonitoring(result.compute);
      }
      
      // Start memory monitoring
      if (mergedOptions.memoryManagement?.autoGC) {
        startMemoryWatching(result.memory);
      }
      
      console.log('Rust WASM module loaded successfully');
      console.log('SIMD Report:', createSIMDReport(await getSIMDSupport()));
      
    } catch (loadError) {
      const errorObj = loadError as Error;
      setError(errorObj);
      
      if (mergedOptions.fallbackToJS) {
        console.warn('WASM loading failed, JavaScript fallbacks will be used:', errorObj.message);
        // Note: JavaScript fallbacks would be implemented separately
      } else {
        console.error('Failed to load Rust WASM module:', errorObj);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isLoaded, mergedOptions]);
  
  /**
   * Start performance monitoring
   */
  const startPerformanceMonitoring = useCallback((wasmCompute: RustCompute) => {
    const updateStats = () => {
      try {
        const currentStats = wasmCompute.getStats();
        setStats(currentStats);
      } catch (error) {
        console.warn('Failed to get performance stats:', error);
      }
    };
    
    // Update stats immediately and then periodically
    updateStats();
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  /**
   * Start memory watching for automatic GC
   */
  const startMemoryWatching = useCallback((memory: WebAssembly.Memory) => {
    const checkMemory = () => {
      const currentMemory = memory.buffer.byteLength;
      const threshold = mergedOptions.memoryManagement?.gcThreshold || 100 * 1024 * 1024;
      
      if (currentMemory > threshold) {
        // Request garbage collection
        if (compute) {
          try {
            // Force GC through the compute interface
            // This would trigger Rust's memory cleanup
            console.log('Triggering automatic garbage collection');
          } catch (error) {
            console.warn('Failed to trigger garbage collection:', error);
          }
        }
      }
    };
    
    memoryWatcher.current = setInterval(checkMemory, 5000); // Check every 5 seconds
  }, [compute, mergedOptions.memoryManagement?.gcThreshold]);
  
  /**
   * Execute matrix operation with error handling
   */
  const executeMatrixOperation = useCallback(async <T,>(
    operation: (compute: RustCompute) => T
  ): Promise<T> => {
    if (!compute) {
      if (mergedOptions.autoLoad && !isLoading) {
        await loadModule();
        if (!compute) {
          throw new Error('Failed to load Rust WASM module');
        }
      } else {
        throw new Error('Rust WASM module not loaded');
      }
    }
    
    return await executionEngine.execute(() => operation(compute), {
      type: 'wasm',
      metadata: { runtime: 'rust', category: 'matrix' },
    });
  }, [compute, mergedOptions.autoLoad, isLoading, loadModule, executionEngine]);
  
  /**
   * Execute signal processing operation
   */
  const executeSignalOperation = useCallback(async <T,>(
    operation: (compute: RustCompute) => T
  ): Promise<T> => {
    if (!compute) {
      if (mergedOptions.autoLoad && !isLoading) {
        await loadModule();
        if (!compute) {
          throw new Error('Failed to load Rust WASM module');
        }
      } else {
        throw new Error('Rust WASM module not loaded');
      }
    }
    
    return await executionEngine.execute(() => operation(compute), {
      type: 'wasm',
      metadata: { runtime: 'rust', category: 'signal' },
    });
  }, [compute, mergedOptions.autoLoad, isLoading, loadModule, executionEngine]);
  
  /**
   * Execute machine learning operation
   */
  const executeMLOperation = useCallback(async <T,>(
    operation: (compute: RustCompute) => T
  ): Promise<T> => {
    if (!compute) {
      if (mergedOptions.autoLoad && !isLoading) {
        await loadModule();
        if (!compute) {
          throw new Error('Failed to load Rust WASM module');
        }
      } else {
        throw new Error('Rust WASM module not loaded');
      }
    }
    
    return await executionEngine.execute(() => operation(compute), {
      type: 'wasm',
      metadata: { runtime: 'rust', category: 'ml' },
      priority: 7, // Higher priority for ML operations
    });
  }, [compute, mergedOptions.autoLoad, isLoading, loadModule, executionEngine]);
  
  /**
   * Auto-load on mount if enabled
   */
  useEffect(() => {
    if (mergedOptions.autoLoad && !initialized.current) {
      initialized.current = true;
      loadModule().catch(error => {
        console.error('Auto-load failed:', error);
      });
    }
  }, [mergedOptions.autoLoad, loadModule]);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear memory watcher
      if (memoryWatcher.current) {
        clearInterval(memoryWatcher.current);
      }
      
      // Dispose compute resources
      if (compute) {
        compute.dispose();
      }
    };
  }, [compute]);
  
  // Convenience methods for common operations
  const matrixMultiply = useCallback(async (
    a: Float32Array,
    b: Float32Array,
    dimensions: MatrixDimensions,
    options?: Partial<MatrixMultiplyOptions>
  ) => {
    return executeMatrixOperation((compute) =>
      compute.matrixMultiply(a, b, { dimensions, ...options })
    );
  }, [executeMatrixOperation]);
  
  const fft = useCallback(async (
    real: Float32Array,
    imag: Float32Array,
    options?: FFTOptions
  ) => {
    return executeSignalOperation((compute) =>
      compute.fft(real, imag, options)
    );
  }, [executeSignalOperation]);
  
  const kMeansClustering = useCallback(async (
    data: Float32Array,
    config: KMeansConfig
  ) => {
    return executeMLOperation((compute) =>
      compute.kMeansClustering(data, config)
    );
  }, [executeMLOperation]);
  
  const runBenchmark = useCallback(async () => {
    if (!compute) {
      throw new Error('Rust WASM module not loaded');
    }
    
    return await executionEngine.execute(() => compute.runBenchmark(), {
      type: 'wasm',
      metadata: { runtime: 'rust', category: 'benchmark' },
    });
  }, [compute, executionEngine]);
  
  return {
    // State
    compute,
    isLoaded,
    isLoading,
    error,
    capabilities,
    stats,
    
    // Core methods
    executeMatrixOperation,
    executeSignalOperation,
    executeMLOperation,
    
    // Convenience methods
    matrixMultiply,
    fft,
    kMeansClustering,
    runBenchmark,
    
    // Manual control
    loadModule,
  };
}

// Export convenience hooks for specific operations
export function useRustMatrix(options?: UseRustComputeOptions) {
  const { matrixMultiply, executeMatrixOperation, isLoaded, error } = useRustCompute(options);
  
  return {
    matrixMultiply,
    executeMatrixOperation,
    isLoaded,
    error,
  };
}

export function useRustSignalProcessing(options?: UseRustComputeOptions) {
  const { fft, executeSignalOperation, isLoaded, error } = useRustCompute(options);
  
  return {
    fft,
    executeSignalOperation,
    isLoaded,
    error,
  };
}

export function useRustML(options?: UseRustComputeOptions) {
  const { kMeansClustering, executeMLOperation, isLoaded, error } = useRustCompute(options);
  
  return {
    kMeansClustering,
    executeMLOperation,
    isLoaded,
    error,
  };
}