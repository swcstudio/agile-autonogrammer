/**
 * ExecutionEngine Hook Tests
 * Comprehensive test suite for the ExecutionEngine hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@agile/test-utils';
import { useExecutionEngine } from './useExecutionEngine';

describe('useExecutionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  
  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.results).toEqual([]);
      expect(result.current.metrics).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageDuration: 0,
        totalMemoryUsed: 0,
        cacheHits: 0,
        cacheMisses: 0,
      });
    });
    
    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        maxConcurrency: 8,
        timeout: 60000,
      };
      
      const { result } = renderHook(() => useExecutionEngine(customConfig));
      
      expect(result.current.config.maxConcurrency).toBe(8);
      expect(result.current.config.timeout).toBe(60000);
      expect(result.current.config.enableCaching).toBe(true); // Default value
    });
  });
  
  describe('Task Execution', () => {
    it('should execute a simple synchronous task', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const taskFn = vi.fn(() => 'test result');
      
      await act(async () => {
        const promise = result.current.execute(taskFn, {
          id: 'test-task',
          type: 'js',
        });
        
        await vi.runAllTimersAsync();
        const taskResult = await promise;
        
        expect(taskResult).toBe('test result');
        expect(taskFn).toHaveBeenCalledTimes(1);
      });
      
      expect(result.current.metrics.completedTasks).toBe(1);
      expect(result.current.metrics.totalTasks).toBe(1);
    });
    
    it('should execute an asynchronous task', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const taskFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async result';
      });
      
      await act(async () => {
        const promise = result.current.execute(taskFn, {
          id: 'async-task',
          type: 'async',
        });
        
        await vi.runAllTimersAsync();
        const taskResult = await promise;
        
        expect(taskResult).toBe('async result');
      });
      
      expect(result.current.metrics.completedTasks).toBe(1);
    });
    
    it('should handle task failure with retry', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        retryAttempts: 3,
        retryDelay: 100,
      }));
      
      let attempts = 0;
      const taskFn = vi.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Task failed');
        }
        return 'success after retry';
      });
      
      await act(async () => {
        const promise = result.current.execute(taskFn, {
          id: 'retry-task',
          type: 'js',
        });
        
        await vi.runAllTimersAsync();
        const taskResult = await promise;
        
        expect(taskResult).toBe('success after retry');
        expect(taskFn).toHaveBeenCalledTimes(3);
      });
      
      expect(result.current.metrics.completedTasks).toBe(1);
    });
    
    it('should fail after max retry attempts', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        retryAttempts: 2,
        retryDelay: 100,
      }));
      
      const taskFn = vi.fn(() => {
        throw new Error('Persistent failure');
      });
      
      await act(async () => {
        const promise = result.current.execute(taskFn, {
          id: 'fail-task',
          type: 'js',
        });
        
        await vi.runAllTimersAsync();
        
        await expect(promise).rejects.toThrow('Persistent failure');
        expect(taskFn).toHaveBeenCalledTimes(2);
      });
      
      expect(result.current.metrics.failedTasks).toBe(1);
    });
    
    it('should timeout long-running tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        timeout: 1000,
      }));
      
      const taskFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'should not reach';
      });
      
      await act(async () => {
        const promise = result.current.execute(taskFn, {
          id: 'timeout-task',
          type: 'async',
        });
        
        await vi.runAllTimersAsync();
        
        await expect(promise).rejects.toThrow('Execution timeout');
      });
      
      expect(result.current.metrics.failedTasks).toBe(1);
    });
  });
  
  describe('Parallel Execution', () => {
    it('should execute multiple tasks in parallel', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 3,
      }));
      
      const tasks = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        type: 'js' as const,
        fn: vi.fn(() => `result-${i}`),
      }));
      
      await act(async () => {
        const results = await result.current.executeParallel(tasks);
        
        expect(results).toEqual([
          'result-0',
          'result-1',
          'result-2',
          'result-3',
          'result-4',
        ]);
      });
      
      expect(result.current.metrics.completedTasks).toBe(5);
    });
    
    it('should respect maxConcurrency limit', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 2,
      }));
      
      let concurrentExecutions = 0;
      let maxConcurrent = 0;
      
      const taskFn = vi.fn(async () => {
        concurrentExecutions++;
        maxConcurrent = Math.max(maxConcurrent, concurrentExecutions);
        await new Promise(resolve => setTimeout(resolve, 100));
        concurrentExecutions--;
        return 'done';
      });
      
      const tasks = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-${i}`,
        type: 'async' as const,
        fn: taskFn,
      }));
      
      await act(async () => {
        const promise = result.current.executeParallel(tasks);
        await vi.runAllTimersAsync();
        await promise;
      });
      
      expect(maxConcurrent).toBeLessThanOrEqual(2);
      expect(result.current.metrics.completedTasks).toBe(5);
    });
  });
  
  describe('Sequential Execution', () => {
    it('should execute tasks sequentially', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const executionOrder: number[] = [];
      const tasks = Array.from({ length: 3 }, (_, i) => ({
        id: `seq-${i}`,
        type: 'js' as const,
        fn: vi.fn(() => {
          executionOrder.push(i);
          return `result-${i}`;
        }),
      }));
      
      await act(async () => {
        const results = await result.current.executeSequential(tasks);
        
        expect(results).toEqual(['result-0', 'result-1', 'result-2']);
        expect(executionOrder).toEqual([0, 1, 2]);
      });
    });
  });
  
  describe('Task Priority', () => {
    it('should execute higher priority tasks first', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 1,
      }));
      
      const executionOrder: string[] = [];
      
      await act(async () => {
        // Queue tasks with different priorities
        const promises = [
          result.current.execute(() => {
            executionOrder.push('low');
            return 'low';
          }, { id: 'low', priority: 1 }),
          
          result.current.execute(() => {
            executionOrder.push('high');
            return 'high';
          }, { id: 'high', priority: 10 }),
          
          result.current.execute(() => {
            executionOrder.push('medium');
            return 'medium';
          }, { id: 'medium', priority: 5 }),
        ];
        
        await Promise.all(promises);
      });
      
      expect(executionOrder).toEqual(['high', 'medium', 'low']);
    });
  });
  
  describe('Caching', () => {
    it('should cache results when enabled', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableCaching: true,
      }));
      
      const taskFn = vi.fn(() => Math.random());
      
      await act(async () => {
        const result1 = await result.current.execute(taskFn, { id: 'cached-task' });
        const result2 = await result.current.execute(taskFn, { id: 'cached-task' });
        
        expect(result1).toBe(result2); // Same cached result
        expect(taskFn).toHaveBeenCalledTimes(1); // Only executed once
      });
      
      expect(result.current.metrics.cacheHits).toBe(1);
      expect(result.current.metrics.cacheMisses).toBe(1);
    });
    
    it('should not cache when disabled', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableCaching: false,
      }));
      
      const taskFn = vi.fn(() => Math.random());
      
      await act(async () => {
        const result1 = await result.current.execute(taskFn, { id: 'uncached-task' });
        const result2 = await result.current.execute(taskFn, { id: 'uncached-task' });
        
        expect(result1).not.toBe(result2); // Different results
        expect(taskFn).toHaveBeenCalledTimes(2); // Executed twice
      });
    });
    
    it('should clear cache on demand', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableCaching: true,
      }));
      
      const taskFn = vi.fn(() => Math.random());
      
      await act(async () => {
        const result1 = await result.current.execute(taskFn, { id: 'clear-cache-task' });
        
        result.current.clearCache();
        
        const result2 = await result.current.execute(taskFn, { id: 'clear-cache-task' });
        
        expect(result1).not.toBe(result2); // Different results after cache clear
        expect(taskFn).toHaveBeenCalledTimes(2);
      });
    });
  });
  
  describe('Task Cancellation', () => {
    it('should cancel a running task', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const taskFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'should be cancelled';
      });
      
      await act(async () => {
        const promise = result.current.execute(taskFn, { id: 'cancel-task' });
        
        // Cancel the task before it completes
        result.current.cancel('cancel-task');
        
        await vi.runAllTimersAsync();
        
        await expect(promise).rejects.toThrow();
      });
      
      const taskResult = result.current.getResult('cancel-task');
      expect(taskResult?.status).toBe('cancelled');
    });
    
    it('should cancel all running tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const tasks = Array.from({ length: 3 }, (_, i) => ({
        id: `cancel-all-${i}`,
        type: 'async' as const,
        fn: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return `result-${i}`;
        }),
      }));
      
      await act(async () => {
        const promises = tasks.map(task => 
          result.current.execute(task.fn, { id: task.id, type: task.type })
        );
        
        // Cancel all tasks
        result.current.cancelAll();
        
        await vi.runAllTimersAsync();
        
        for (const promise of promises) {
          await expect(promise).rejects.toThrow();
        }
      });
    });
  });
  
  describe('WebAssembly Module Loading', () => {
    it('should load a WASM module', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      // Mock WebAssembly.compile and instantiate
      const mockModule = {} as WebAssembly.Module;
      const mockInstance = {
        exports: {
          add: (a: number, b: number) => a + b,
        },
      } as WebAssembly.Instance;
      
      vi.spyOn(WebAssembly, 'compile').mockResolvedValue(mockModule);
      vi.spyOn(WebAssembly, 'instantiate').mockResolvedValue(mockInstance);
      
      await act(async () => {
        const wasmBuffer = new ArrayBuffer(8);
        const module = await result.current.loadWasmModule('test-module', wasmBuffer);
        
        expect(module.exports.add).toBeDefined();
        expect(module.exports.add(2, 3)).toBe(5);
      });
      
      expect(result.current.wasmModules).toHaveLength(1);
      expect(result.current.wasmModules[0].id).toBe('test-module');
    });
    
    it('should reuse loaded WASM modules', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const mockModule = {} as WebAssembly.Module;
      const mockInstance = { exports: {} } as WebAssembly.Instance;
      
      const compileSpy = vi.spyOn(WebAssembly, 'compile').mockResolvedValue(mockModule);
      vi.spyOn(WebAssembly, 'instantiate').mockResolvedValue(mockInstance);
      
      await act(async () => {
        const wasmBuffer = new ArrayBuffer(8);
        
        // Load the same module twice
        const module1 = await result.current.loadWasmModule('reuse-module', wasmBuffer);
        const module2 = await result.current.loadWasmModule('reuse-module', wasmBuffer);
        
        expect(module1).toBe(module2); // Same instance
        expect(compileSpy).toHaveBeenCalledTimes(1); // Only compiled once
      });
    });
  });
  
  describe('Metrics and Monitoring', () => {
    it('should track execution metrics', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableMetrics: true,
      }));
      
      const tasks = [
        { id: 'metric-1', type: 'js' as const, fn: () => 'result-1' },
        { id: 'metric-2', type: 'js' as const, fn: () => 'result-2' },
        { id: 'metric-3', type: 'js' as const, fn: () => { throw new Error('fail'); } },
      ];
      
      await act(async () => {
        for (const task of tasks) {
          try {
            await result.current.execute(task.fn, { id: task.id, type: task.type });
          } catch {
            // Ignore errors for metrics test
          }
        }
      });
      
      expect(result.current.metrics.totalTasks).toBe(3);
      expect(result.current.metrics.completedTasks).toBe(2);
      expect(result.current.metrics.failedTasks).toBe(1);
      expect(result.current.metrics.averageDuration).toBeGreaterThan(0);
    });
    
    it('should provide task results', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      await act(async () => {
        await result.current.execute(() => 'success', { id: 'result-task' });
      });
      
      const taskResult = result.current.getResult('result-task');
      
      expect(taskResult).toBeDefined();
      expect(taskResult?.status).toBe('completed');
      expect(taskResult?.result).toBe('success');
      expect(taskResult?.duration).toBeGreaterThan(0);
    });
  });
  
  describe('Reset Functionality', () => {
    it('should reset the execution engine', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      await act(async () => {
        // Execute some tasks
        await result.current.execute(() => 'task-1', { id: 'reset-1' });
        await result.current.execute(() => 'task-2', { id: 'reset-2' });
        
        // Reset the engine
        result.current.reset();
      });
      
      expect(result.current.results).toEqual([]);
      expect(result.current.metrics).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageDuration: 0,
        totalMemoryUsed: 0,
        cacheHits: 0,
        cacheMisses: 0,
      });
    });
  });
  
  describe('Memory Management', () => {
    it('should respect memory limits in WASM module configuration', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        memoryLimit: 1024 * 1024, // 1MB
      }));
      
      const mockModule = {} as WebAssembly.Module;
      const mockInstance = { exports: {} } as WebAssembly.Instance;
      
      vi.spyOn(WebAssembly, 'compile').mockResolvedValue(mockModule);
      const instantiateSpy = vi.spyOn(WebAssembly, 'instantiate').mockResolvedValue(mockInstance);
      
      await act(async () => {
        await result.current.loadWasmModule('memory-test', new ArrayBuffer(8));
      });
      
      // Verify memory configuration was passed
      const instantiateCall = instantiateSpy.mock.calls[0];
      const imports = instantiateCall[1] as WebAssembly.Imports;
      const memory = (imports.env as any).memory as WebAssembly.Memory;
      
      expect(memory).toBeDefined();
    });
  });
});