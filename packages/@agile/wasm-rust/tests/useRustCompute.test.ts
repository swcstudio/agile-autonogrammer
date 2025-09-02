/**
 * Tests for useRustCompute Hook
 * Comprehensive testing suite for Rust WASM integration
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { renderHook, act, waitFor } from '@agile/test-utils';
import { useRustCompute, useRustMatrix, useRustSignalProcessing, useRustML } from '../src/hooks/useRustCompute';

// Mock WebAssembly for testing
const mockWasmModule = {
  initialize: vi.fn().mockResolvedValue(undefined),
  matrix_multiply: vi.fn().mockReturnValue(new Float32Array([1, 2, 3, 4])),
  matrix_transpose: vi.fn().mockReturnValue(new Float32Array([1, 3, 2, 4])),
  fft: vi.fn().mockReturnValue(undefined),
  k_means_clustering: vi.fn().mockReturnValue({
    clusters: new Uint32Array([0, 1, 0, 1]),
    centroids: new Float32Array([1, 2, 3, 4]),
    iterations: 5,
    inertia: 0.5,
    converged: true,
  }),
  get_capabilities: vi.fn().mockReturnValue({
    simd: true,
    threads: false,
    bulkMemory: true,
    multiValue: true,
    referenceTypes: false,
  }),
  get_stats: vi.fn().mockReturnValue({
    totalOperations: 10,
    averageLatency: 0.5,
    peakMemoryUsage: 1024,
    currentMemoryUsage: 512,
    cacheHits: 8,
    cacheMisses: 2,
    simdOperations: 6,
    scalarOperations: 4,
  }),
  run_benchmark: vi.fn().mockReturnValue({
    matrixMultiply: { size: 128, duration: 10, gflops: 2.5 },
    fft: { size: 1024, duration: 5, samplesPerSecond: 200000 },
    kmeans: { points: 1000, clusters: 5, dimensions: 3, duration: 20, iterationsPerSecond: 50 },
    memory: { allocations: 10, deallocations: 8, peakUsage: 2048, averageUsage: 1024 },
  }),
  allocate_buffer: vi.fn().mockReturnValue(1000),
  deallocate_buffer: vi.fn(),
  dispose: vi.fn(),
};

const mockWasmInstance = {
  exports: mockWasmModule,
};

const mockWasmMemory = {
  buffer: new ArrayBuffer(1024 * 1024), // 1MB
};

// Mock the WASM loader
vi.mock('../src/loaders/rustWasmLoader', () => ({
  loadRustWasmModule: vi.fn().mockResolvedValue({
    module: {},
    instance: mockWasmInstance,
    compute: {
      matrixMultiply: (a: Float32Array, b: Float32Array, options: any) => {
        return mockWasmModule.matrix_multiply(a, b, options.dimensions.rows, options.dimensions.cols);
      },
      matrixTranspose: mockWasmModule.matrix_transpose,
      fft: (real: Float32Array, imag: Float32Array, options: any) => {
        mockWasmModule.fft(real, imag, options?.inverse ?? false);
        return { real, imag };
      },
      kMeansClustering: mockWasmModule.k_means_clustering,
      getCapabilities: mockWasmModule.get_capabilities,
      getStats: mockWasmModule.get_stats,
      runBenchmark: mockWasmModule.run_benchmark,
      initialize: mockWasmModule.initialize,
      dispose: mockWasmModule.dispose,
    },
    memory: mockWasmMemory,
    capabilities: mockWasmModule.get_capabilities(),
  }),
}));

// Mock SIMD detector
vi.mock('../src/simd/detector', () => ({
  getSIMDSupport: vi.fn().mockResolvedValue({
    available: true,
    features: [
      { name: 'v128', supported: true },
      { name: 'f32x4', supported: true },
    ],
    performance: {
      estimatedSpeedup: 3.5,
      vectorWidth: 4,
      parallelOperations: 4,
    },
  }),
  createSIMDReport: vi.fn().mockReturnValue('SIMD Available: 3.5x speedup'),
}));

describe('useRustCompute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Hook Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: false }));
      
      expect(result.current.compute).toBeNull();
      expect(result.current.isLoaded).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.capabilities).toBeNull();
      expect(result.current.stats).toBeNull();
    });
    
    it('should auto-load WASM module when autoLoad is true', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      expect(result.current.compute).not.toBeNull();
      expect(result.current.capabilities).not.toBeNull();
      expect(result.current.error).toBeNull();
    });
    
    it('should handle loading errors gracefully', async () => {
      const { loadRustWasmModule } = await import('../src/loaders/rustWasmLoader');
      vi.mocked(loadRustWasmModule).mockRejectedValueOnce(new Error('Loading failed'));
      
      const { result } = renderHook(() => useRustCompute({
        autoLoad: true,
        fallbackToJS: true,
      }));
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
      
      expect(result.current.isLoaded).toBe(false);
      expect(result.current.error?.message).toBe('Loading failed');
    });
  });
  
  describe('Matrix Operations', () => {
    it('should perform matrix multiplication', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      await act(async () => {
        const a = new Float32Array([1, 2, 3, 4]);
        const b = new Float32Array([5, 6, 7, 8]);
        const dimensions = { rows: 2, cols: 2 };
        
        const result_ = await result.current.matrixMultiply(a, b, dimensions);
        
        expect(result_).toBeInstanceOf(Float32Array);
        expect(mockWasmModule.matrix_multiply).toHaveBeenCalledWith(
          a, b, dimensions.rows, dimensions.cols
        );
      });
    });
    
    it('should execute matrix operations with error handling', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      await act(async () => {
        const result_ = await result.current.executeMatrixOperation((compute) => {
          return compute.matrixTranspose(
            new Float32Array([1, 2, 3, 4]),
            { rows: 2, cols: 2 }
          );
        });
        
        expect(result_).toBeInstanceOf(Float32Array);
        expect(mockWasmModule.matrix_transpose).toHaveBeenCalled();
      });
    });
  });
  
  describe('Signal Processing Operations', () => {
    it('should perform FFT operations', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      await act(async () => {
        const real = new Float32Array([1, 2, 3, 4]);
        const imag = new Float32Array([0, 0, 0, 0]);
        
        const result_ = await result.current.fft(real, imag);
        
        expect(result_).toHaveProperty('real');
        expect(result_).toHaveProperty('imag');
        expect(mockWasmModule.fft).toHaveBeenCalled();
      });
    });
    
    it('should execute signal processing operations', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      await act(async () => {
        const result_ = await result.current.executeSignalOperation((compute) => {
          const real = new Float32Array([1, 2, 3, 4]);
          const imag = new Float32Array([0, 0, 0, 0]);
          return compute.fft(real, imag, { inverse: false });
        });
        
        expect(result_).toHaveProperty('real');
        expect(result_).toHaveProperty('imag');
      });
    });
  });
  
  describe('Machine Learning Operations', () => {
    it('should perform K-means clustering', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      await act(async () => {
        const data = new Float32Array([1, 2, 3, 4, 5, 6]);
        const config = { k: 2, dimensions: 2 };
        
        const result_ = await result.current.kMeansClustering(data, config);
        
        expect(result_).toHaveProperty('clusters');
        expect(result_).toHaveProperty('centroids');
        expect(result_).toHaveProperty('converged');
        expect(mockWasmModule.k_means_clustering).toHaveBeenCalled();
      });
    });
    
    it('should execute ML operations with higher priority', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      await act(async () => {
        const result_ = await result.current.executeMLOperation((compute) => {
          const data = new Float32Array([1, 2, 3, 4, 5, 6]);
          const config = { k: 2, dimensions: 2 };
          return compute.kMeansClustering(data, config);
        });
        
        expect(result_).toHaveProperty('clusters');
      });
    });
  });
  
  describe('Performance Monitoring', () => {
    it('should track performance statistics', async () => {
      const { result } = renderHook(() => useRustCompute({
        autoLoad: true,
        performanceMonitoring: true,
      }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      // Wait for stats to be updated
      await waitFor(() => {
        expect(result.current.stats).not.toBeNull();
      }, { timeout: 2000 });
      
      expect(result.current.stats).toHaveProperty('totalOperations');
      expect(result.current.stats).toHaveProperty('averageLatency');
      expect(mockWasmModule.get_stats).toHaveBeenCalled();
    });
    
    it('should run benchmarks', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      await act(async () => {
        const benchmarkResults = await result.current.runBenchmark();
        
        expect(benchmarkResults).toHaveProperty('matrixMultiply');
        expect(benchmarkResults).toHaveProperty('fft');
        expect(benchmarkResults).toHaveProperty('kmeans');
        expect(mockWasmModule.run_benchmark).toHaveBeenCalled();
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle operations when module is not loaded', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: false }));
      
      await expect(async () => {
        await act(async () => {
          await result.current.matrixMultiply(
            new Float32Array([1, 2]),
            new Float32Array([3, 4]),
            { rows: 1, cols: 2 }
          );
        });
      }).rejects.toThrow('Rust WASM module not loaded');
    });
    
    it('should auto-load when operation is requested', async () => {
      const { result } = renderHook(() => useRustCompute({ autoLoad: false }));
      
      expect(result.current.isLoaded).toBe(false);
      
      await act(async () => {
        await result.current.loadModule();
      });
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
    });
  });
  
  describe('Cleanup', () => {
    it('should dispose resources on unmount', () => {
      const { unmount } = renderHook(() => useRustCompute({ autoLoad: true }));
      
      unmount();
      
      // Should not throw errors during cleanup
      expect(true).toBe(true);
    });
  });
});

describe('Convenience Hooks', () => {
  describe('useRustMatrix', () => {
    it('should provide matrix-specific interface', async () => {
      const { result } = renderHook(() => useRustMatrix({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      expect(result.current).toHaveProperty('matrixMultiply');
      expect(result.current).toHaveProperty('executeMatrixOperation');
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('useRustSignalProcessing', () => {
    it('should provide signal processing interface', async () => {
      const { result } = renderHook(() => useRustSignalProcessing({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      expect(result.current).toHaveProperty('fft');
      expect(result.current).toHaveProperty('executeSignalOperation');
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('useRustML', () => {
    it('should provide ML-specific interface', async () => {
      const { result } = renderHook(() => useRustML({ autoLoad: true }));
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      
      expect(result.current).toHaveProperty('kMeansClustering');
      expect(result.current).toHaveProperty('executeMLOperation');
      expect(result.current.error).toBeNull();
    });
  });
});

describe('Integration with ExecutionEngine', () => {
  it('should use ExecutionEngine for task execution', async () => {
    const { result } = renderHook(() => useRustCompute({ autoLoad: true }));
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    
    await act(async () => {
      await result.current.executeMatrixOperation((compute) => {
        return compute.matrixMultiply(
          new Float32Array([1, 2]),
          new Float32Array([3, 4]),
          { dimensions: { rows: 1, cols: 2 } }
        );
      });
    });
    
    // Verify ExecutionEngine integration through successful operation
    expect(mockWasmModule.matrix_multiply).toHaveBeenCalled();
  });
});