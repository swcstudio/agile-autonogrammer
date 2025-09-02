/**
 * Hook Testing Utilities
 * Comprehensive testing utilities for React hooks with performance monitoring
 */

import { renderHook as rtlRenderHook, act, waitFor } from '@testing-library/react';
import type { RenderHookOptions, RenderHookResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';

/**
 * Hook render result with additional utilities
 */
export interface HookRenderResult<T> extends RenderHookResult<T, any> {
  /**
   * Performance metrics for the hook
   */
  performance: {
    renderCount: number;
    lastRenderTime: number;
    averageRenderTime: number;
    totalRenderTime: number;
  };
  
  /**
   * Memory usage tracking
   */
  memory: {
    heapUsed: number;
    heapTotal: number;
  };
  
  /**
   * Wait for hook to stabilize
   */
  waitForStable: (timeout?: number) => Promise<void>;
  
  /**
   * Take snapshot of current state
   */
  snapshot: () => any;
}

/**
 * Performance tracking for hook renders
 */
class HookPerformanceTracker {
  private renderTimes: number[] = [];
  private startTime: number = 0;
  
  startRender(): void {
    this.startTime = performance.now();
  }
  
  endRender(): void {
    if (this.startTime > 0) {
      const duration = performance.now() - this.startTime;
      this.renderTimes.push(duration);
      this.startTime = 0;
    }
  }
  
  getMetrics() {
    const total = this.renderTimes.reduce((sum, time) => sum + time, 0);
    return {
      renderCount: this.renderTimes.length,
      lastRenderTime: this.renderTimes[this.renderTimes.length - 1] || 0,
      averageRenderTime: this.renderTimes.length > 0 ? total / this.renderTimes.length : 0,
      totalRenderTime: total,
    };
  }
  
  reset(): void {
    this.renderTimes = [];
    this.startTime = 0;
  }
}

/**
 * Enhanced renderHook with performance tracking
 */
export function renderHook<TProps, TResult>(
  render: (props: TProps) => TResult,
  options?: RenderHookOptions<TProps>
): HookRenderResult<TResult> {
  const tracker = new HookPerformanceTracker();
  let currentResult: TResult;
  
  // Wrap the render function to track performance
  const wrappedRender = (props: TProps) => {
    tracker.startRender();
    currentResult = render(props);
    tracker.endRender();
    return currentResult;
  };
  
  const baseResult = rtlRenderHook(wrappedRender, options);
  
  // Add performance and utility methods
  const enhancedResult: HookRenderResult<TResult> = {
    ...baseResult,
    performance: tracker.getMetrics(),
    memory: {
      heapUsed: (performance as any).memory?.usedJSHeapSize || 0,
      heapTotal: (performance as any).memory?.totalJSHeapSize || 0,
    },
    waitForStable: async (timeout = 1000) => {
      const startTime = Date.now();
      let lastRenderCount = tracker.getMetrics().renderCount;
      
      while (Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const currentCount = tracker.getMetrics().renderCount;
        
        if (currentCount === lastRenderCount) {
          // No new renders for 50ms, consider stable
          return;
        }
        
        lastRenderCount = currentCount;
      }
      
      throw new Error(`Hook did not stabilize within ${timeout}ms`);
    },
    snapshot: () => {
      return JSON.parse(JSON.stringify(currentResult));
    },
  };
  
  // Update performance metrics on each render
  const originalRerender = baseResult.rerender;
  enhancedResult.rerender = (props?: TProps) => {
    const result = originalRerender(props);
    Object.assign(enhancedResult.performance, tracker.getMetrics());
    return result;
  };
  
  return enhancedResult;
}

/**
 * Test a hook for memory leaks
 */
export async function testHookForMemoryLeaks<T>(
  hookFactory: () => T,
  options?: {
    iterations?: number;
    threshold?: number;
  }
): Promise<{ hasLeak: boolean; memoryGrowth: number }> {
  const iterations = options?.iterations || 100;
  const threshold = options?.threshold || 1024 * 1024; // 1MB default threshold
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  for (let i = 0; i < iterations; i++) {
    const { unmount } = renderHook(() => hookFactory());
    unmount();
    
    // Allow cleanup
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  // Force garbage collection again
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
  const memoryGrowth = finalMemory - initialMemory;
  
  return {
    hasLeak: memoryGrowth > threshold,
    memoryGrowth,
  };
}

/**
 * Test hook with various prop combinations
 */
export async function testHookCombinations<TProps, TResult>(
  hookFactory: (props: TProps) => TResult,
  propCombinations: TProps[],
  assertions: (result: TResult, props: TProps) => void | Promise<void>
): Promise<void> {
  for (const props of propCombinations) {
    const { result } = renderHook(() => hookFactory(props));
    
    await act(async () => {
      await assertions(result.current, props);
    });
  }
}

/**
 * Mock hook for testing components that use hooks
 */
export function createMockHook<T>(defaultValue: T) {
  let currentValue = defaultValue;
  const listeners = new Set<(value: T) => void>();
  
  const hook = () => {
    const [value, setValue] = React.useState(currentValue);
    
    React.useEffect(() => {
      const listener = (newValue: T) => setValue(newValue);
      listeners.add(listener);
      return () => listeners.delete(listener);
    }, []);
    
    return value;
  };
  
  const setValue = (value: T) => {
    currentValue = value;
    listeners.forEach(listener => listener(value));
  };
  
  return { hook, setValue };
}

/**
 * Performance benchmark for hooks
 */
export async function benchmarkHook<T>(
  hookFactory: () => T,
  options?: {
    runs?: number;
    warmup?: number;
  }
): Promise<{
  average: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}> {
  const runs = options?.runs || 100;
  const warmup = options?.warmup || 10;
  const times: number[] = [];
  
  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    const { unmount } = renderHook(hookFactory);
    unmount();
  }
  
  // Actual benchmark runs
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const { unmount } = renderHook(hookFactory);
    const end = performance.now();
    
    times.push(end - start);
    unmount();
  }
  
  // Calculate statistics
  times.sort((a, b) => a - b);
  const sum = times.reduce((acc, time) => acc + time, 0);
  
  return {
    average: sum / times.length,
    median: times[Math.floor(times.length / 2)],
    min: times[0],
    max: times[times.length - 1],
    p95: times[Math.floor(times.length * 0.95)],
    p99: times[Math.floor(times.length * 0.99)],
  };
}

/**
 * Test hook error boundaries
 */
export async function testHookErrorHandling<T>(
  hookFactory: () => T,
  errorTrigger: (result: T) => void,
  expectedError: string | RegExp | Error
): Promise<void> {
  const { result } = renderHook(hookFactory);
  
  let caughtError: Error | null = null;
  
  try {
    await act(async () => {
      errorTrigger(result.current);
    });
  } catch (error) {
    caughtError = error as Error;
  }
  
  if (!caughtError) {
    throw new Error('Expected hook to throw an error, but it did not');
  }
  
  if (expectedError instanceof RegExp) {
    if (!expectedError.test(caughtError.message)) {
      throw new Error(`Error message "${caughtError.message}" does not match pattern ${expectedError}`);
    }
  } else if (expectedError instanceof Error) {
    if (caughtError.message !== expectedError.message) {
      throw new Error(`Error message "${caughtError.message}" does not match expected "${expectedError.message}"`);
    }
  } else {
    if (!caughtError.message.includes(expectedError)) {
      throw new Error(`Error message "${caughtError.message}" does not include "${expectedError}"`);
    }
  }
}

// Re-export commonly used utilities
export { act, waitFor } from '@testing-library/react';
export type { RenderHookOptions } from '@testing-library/react';

// Export React for convenience
import * as React from 'react';