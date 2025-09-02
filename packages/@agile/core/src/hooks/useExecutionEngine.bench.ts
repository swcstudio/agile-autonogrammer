/**
 * ExecutionEngine Performance Benchmarks
 * Comprehensive performance testing suite for the ExecutionEngine hook
 */

import { describe, bench } from 'vitest';
import { renderHook, act } from '@agile/test-utils';
import { useExecutionEngine } from './useExecutionEngine';

describe('ExecutionEngine Performance', () => {
  describe('Single Task Execution', () => {
    bench('synchronous task execution', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      await act(async () => {
        await result.current.execute(() => {
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return sum;
        });
      });
    });
    
    bench('asynchronous task execution', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      await act(async () => {
        await result.current.execute(async () => {
          await new Promise(resolve => setImmediate(resolve));
          return 'async result';
        });
      });
    });
    
    bench('task with error handling', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        retryAttempts: 1,
      }));
      
      let attempts = 0;
      await act(async () => {
        await result.current.execute(() => {
          attempts++;
          if (attempts === 1) {
            throw new Error('First attempt fails');
          }
          return 'success';
        });
      });
    });
  });
  
  describe('Parallel Execution', () => {
    bench('10 parallel tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 4,
      }));
      
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        type: 'js' as const,
        fn: () => i * 2,
      }));
      
      await act(async () => {
        await result.current.executeParallel(tasks);
      });
    });
    
    bench('50 parallel tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 8,
      }));
      
      const tasks = Array.from({ length: 50 }, (_, i) => ({
        id: `task-${i}`,
        type: 'js' as const,
        fn: () => i * 2,
      }));
      
      await act(async () => {
        await result.current.executeParallel(tasks);
      });
    });
    
    bench('100 parallel tasks with mixed types', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 10,
      }));
      
      const tasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        type: i % 2 === 0 ? 'js' as const : 'async' as const,
        fn: i % 2 === 0 
          ? () => i * 2
          : async () => {
              await new Promise(resolve => setImmediate(resolve));
              return i * 2;
            },
      }));
      
      await act(async () => {
        await result.current.executeParallel(tasks);
      });
    });
  });
  
  describe('Sequential Execution', () => {
    bench('10 sequential tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `seq-${i}`,
        type: 'js' as const,
        fn: () => i * 2,
      }));
      
      await act(async () => {
        await result.current.executeSequential(tasks);
      });
    });
    
    bench('50 sequential tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const tasks = Array.from({ length: 50 }, (_, i) => ({
        id: `seq-${i}`,
        type: 'js' as const,
        fn: () => i * 2,
      }));
      
      await act(async () => {
        await result.current.executeSequential(tasks);
      });
    });
  });
  
  describe('Cache Performance', () => {
    bench('cache hit performance', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableCaching: true,
      }));
      
      // First execution to populate cache
      await act(async () => {
        await result.current.execute(() => 'cached-result', { id: 'cache-test' });
      });
      
      // Benchmark cache hits
      await act(async () => {
        for (let i = 0; i < 100; i++) {
          await result.current.execute(() => 'cached-result', { id: 'cache-test' });
        }
      });
    });
    
    bench('cache miss performance', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableCaching: true,
      }));
      
      await act(async () => {
        for (let i = 0; i < 100; i++) {
          await result.current.execute(() => `result-${i}`, { id: `unique-${i}` });
        }
      });
    });
    
    bench('no cache performance', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableCaching: false,
      }));
      
      await act(async () => {
        for (let i = 0; i < 100; i++) {
          await result.current.execute(() => 'result', { id: 'same-id' });
        }
      });
    });
  });
  
  describe('Priority Queue Performance', () => {
    bench('priority queue with 100 tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 1,
      }));
      
      const tasks = Array.from({ length: 100 }, (_, i) => ({
        id: `priority-${i}`,
        type: 'js' as const,
        fn: () => i,
        priority: Math.floor(Math.random() * 10),
      }));
      
      await act(async () => {
        await result.current.executeParallel(tasks);
      });
    });
    
    bench('priority queue with 500 tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 4,
      }));
      
      const tasks = Array.from({ length: 500 }, (_, i) => ({
        id: `priority-${i}`,
        type: 'js' as const,
        fn: () => i,
        priority: Math.floor(Math.random() * 10),
      }));
      
      await act(async () => {
        await result.current.executeParallel(tasks);
      });
    });
  });
  
  describe('Memory Intensive Operations', () => {
    bench('large data processing', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      await act(async () => {
        await result.current.execute(() => {
          const largeArray = new Array(10000).fill(0).map((_, i) => ({
            id: i,
            value: Math.random(),
            data: new Array(100).fill(0),
          }));
          
          return largeArray.reduce((sum, item) => sum + item.value, 0);
        });
      });
    });
    
    bench('multiple large data tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 2,
      }));
      
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `memory-${i}`,
        type: 'js' as const,
        fn: () => {
          const data = new Array(5000).fill(0).map(() => Math.random());
          return data.reduce((a, b) => a + b, 0);
        },
      }));
      
      await act(async () => {
        await result.current.executeParallel(tasks);
      });
    });
  });
  
  describe('Cancellation Performance', () => {
    bench('cancel 100 tasks', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 10,
      }));
      
      const tasks = Array.from({ length: 100 }, (_, i) => ({
        id: `cancel-${i}`,
        type: 'async' as const,
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return i;
        },
      }));
      
      await act(async () => {
        // Start tasks
        const promises = tasks.map(task => 
          result.current.execute(task.fn, { 
            id: task.id, 
            type: task.type 
          }).catch(() => {})
        );
        
        // Cancel all immediately
        result.current.cancelAll();
        
        await Promise.all(promises);
      });
    });
  });
  
  describe('WASM Module Loading', () => {
    bench('WASM module instantiation', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      // Mock minimal WASM module
      const wasmCode = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // WASM magic number
        0x01, 0x00, 0x00, 0x00, // WASM version
      ]);
      
      await act(async () => {
        await result.current.loadWasmModule('bench-module', wasmCode.buffer);
      });
    });
    
    bench('WASM module with imports', async () => {
      const { result } = renderHook(() => useExecutionEngine());
      
      const wasmCode = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d,
        0x01, 0x00, 0x00, 0x00,
      ]);
      
      const imports = {
        env: {
          log: (msg: number) => console.log(msg),
          memory: new WebAssembly.Memory({ initial: 1 }),
        },
      };
      
      await act(async () => {
        await result.current.loadWasmModule('import-module', wasmCode.buffer, imports);
      });
    });
  });
  
  describe('Metrics Collection', () => {
    bench('metrics enabled overhead', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableMetrics: true,
      }));
      
      const tasks = Array.from({ length: 100 }, (_, i) => ({
        id: `metric-${i}`,
        type: 'js' as const,
        fn: () => i,
      }));
      
      await act(async () => {
        await result.current.executeParallel(tasks);
      });
    });
    
    bench('metrics disabled performance', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        enableMetrics: false,
      }));
      
      const tasks = Array.from({ length: 100 }, (_, i) => ({
        id: `no-metric-${i}`,
        type: 'js' as const,
        fn: () => i,
      }));
      
      await act(async () => {
        await result.current.executeParallel(tasks);
      });
    });
  });
  
  describe('Real-world Scenarios', () => {
    bench('data transformation pipeline', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 4,
        enableCaching: true,
      }));
      
      // Simulate a data pipeline
      const pipeline = [
        // Stage 1: Load data
        () => Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() })),
        // Stage 2: Filter
        (data: any[]) => data.filter(item => item.value > 0.5),
        // Stage 3: Transform
        (data: any[]) => data.map(item => ({ ...item, squared: item.value ** 2 })),
        // Stage 4: Aggregate
        (data: any[]) => data.reduce((sum, item) => sum + item.squared, 0),
      ];
      
      await act(async () => {
        let result: any = undefined;
        for (let i = 0; i < pipeline.length; i++) {
          result = await result.current.execute(
            () => pipeline[i](result),
            { id: `stage-${i}` }
          );
        }
      });
    });
    
    bench('mixed workload simulation', async () => {
      const { result } = renderHook(() => useExecutionEngine({
        maxConcurrency: 8,
        enableCaching: true,
        enableMetrics: true,
      }));
      
      const workload = [
        // CPU intensive tasks
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `cpu-${i}`,
          type: 'js' as const,
          fn: () => {
            let result = 0;
            for (let j = 0; j < 10000; j++) {
              result += Math.sqrt(j);
            }
            return result;
          },
          priority: 5,
        })),
        // I/O simulated tasks
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `io-${i}`,
          type: 'async' as const,
          fn: async () => {
            await new Promise(resolve => setImmediate(resolve));
            return `io-result-${i}`;
          },
          priority: 3,
        })),
        // Memory intensive tasks
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `memory-${i}`,
          type: 'js' as const,
          fn: () => {
            const buffer = new Array(1000).fill(0).map(() => Math.random());
            return buffer.length;
          },
          priority: 7,
        })),
      ];
      
      await act(async () => {
        await result.current.executeParallel(workload);
      });
    });
  });
});