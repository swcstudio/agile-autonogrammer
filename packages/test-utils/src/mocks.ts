/**
 * Mock Utilities for Testing
 * Comprehensive mocking tools for hooks, APIs, and WASM modules
 */

export interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mockImplementation(impl: T): void;
  mockReturnValue(value: ReturnType<T>): void;
  mockReturnValueOnce(value: ReturnType<T>): void;
  mockResolvedValue(value: Awaited<ReturnType<T>>): void;
  mockResolvedValueOnce(value: Awaited<ReturnType<T>>): void;
  mockRejectedValue(error: any): void;
  mockRejectedValueOnce(error: any): void;
  mockClear(): void;
  mockReset(): void;
  calls: Array<Parameters<T>>;
  results: Array<{ type: 'return' | 'throw'; value: any }>;
}

/**
 * Create a mock function with tracking
 */
export function createMockFunction<T extends (...args: any[]) => any>(
  defaultImplementation?: T
): MockFunction<T> {
  let implementation: T | undefined = defaultImplementation;
  let returnValues: Array<ReturnType<T>> = [];
  let returnValuesOnce: Array<ReturnType<T>> = [];
  let resolvedValues: Array<Awaited<ReturnType<T>>> = [];
  let resolvedValuesOnce: Array<Awaited<ReturnType<T>>> = [];
  let rejectedValues: any[] = [];
  let rejectedValuesOnce: any[] = [];
  
  const calls: Array<Parameters<T>> = [];
  const results: Array<{ type: 'return' | 'throw'; value: any }> = [];
  
  const mockFn = ((...args: Parameters<T>) => {
    calls.push(args);
    
    try {
      let result: any;
      
      // Check for one-time rejected values
      if (rejectedValuesOnce.length > 0) {
        const error = rejectedValuesOnce.shift();
        results.push({ type: 'throw', value: error });
        throw error;
      }
      
      // Check for persistent rejected values
      if (rejectedValues.length > 0) {
        const error = rejectedValues[0];
        results.push({ type: 'throw', value: error });
        throw error;
      }
      
      // Check for one-time resolved values
      if (resolvedValuesOnce.length > 0) {
        result = Promise.resolve(resolvedValuesOnce.shift());
      }
      // Check for persistent resolved values
      else if (resolvedValues.length > 0) {
        result = Promise.resolve(resolvedValues[0]);
      }
      // Check for one-time return values
      else if (returnValuesOnce.length > 0) {
        result = returnValuesOnce.shift();
      }
      // Check for persistent return values
      else if (returnValues.length > 0) {
        result = returnValues[0];
      }
      // Use implementation if available
      else if (implementation) {
        result = implementation(...args);
      }
      // Default to undefined
      else {
        result = undefined;
      }
      
      results.push({ type: 'return', value: result });
      return result;
    } catch (error) {
      results.push({ type: 'throw', value: error });
      throw error;
    }
  }) as MockFunction<T>;
  
  mockFn.calls = calls;
  mockFn.results = results;
  
  mockFn.mockImplementation = (impl: T) => {
    implementation = impl;
  };
  
  mockFn.mockReturnValue = (value: ReturnType<T>) => {
    returnValues = [value];
  };
  
  mockFn.mockReturnValueOnce = (value: ReturnType<T>) => {
    returnValuesOnce.push(value);
  };
  
  mockFn.mockResolvedValue = (value: Awaited<ReturnType<T>>) => {
    resolvedValues = [value];
  };
  
  mockFn.mockResolvedValueOnce = (value: Awaited<ReturnType<T>>) => {
    resolvedValuesOnce.push(value);
  };
  
  mockFn.mockRejectedValue = (error: any) => {
    rejectedValues = [error];
  };
  
  mockFn.mockRejectedValueOnce = (error: any) => {
    rejectedValuesOnce.push(error);
  };
  
  mockFn.mockClear = () => {
    calls.length = 0;
    results.length = 0;
  };
  
  mockFn.mockReset = () => {
    implementation = defaultImplementation;
    returnValues = [];
    returnValuesOnce = [];
    resolvedValues = [];
    resolvedValuesOnce = [];
    rejectedValues = [];
    rejectedValuesOnce = [];
    calls.length = 0;
    results.length = 0;
  };
  
  return mockFn;
}

/**
 * Mock API client for testing
 */
export class MockAPIClient {
  private routes: Map<string, Map<string, MockFunction<any>>> = new Map();
  private defaultResponses: Map<string, any> = new Map();
  
  /**
   * Register a mock route
   */
  mockRoute(
    method: string,
    path: string,
    response: any | ((...args: any[]) => any)
  ): void {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    
    const methodRoutes = this.routes.get(method)!;
    const mockFn = createMockFunction(
      typeof response === 'function' ? response : () => response
    );
    
    methodRoutes.set(path, mockFn);
  }
  
  /**
   * Get a mock function for a route
   */
  getMock(method: string, path: string): MockFunction<any> | undefined {
    return this.routes.get(method)?.get(path);
  }
  
  /**
   * Simulate an API request
   */
  async request(
    method: string,
    path: string,
    options?: {
      body?: any;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    }
  ): Promise<any> {
    const mock = this.getMock(method.toUpperCase(), path);
    
    if (!mock) {
      throw new Error(`No mock registered for ${method.toUpperCase()} ${path}`);
    }
    
    return mock(options);
  }
  
  /**
   * Clear all mocks
   */
  clearAll(): void {
    this.routes.clear();
    this.defaultResponses.clear();
  }
}

/**
 * Mock WASM module for testing
 */
export class MockWasmModule {
  private exports: Map<string, MockFunction<any>> = new Map();
  private memory: WebAssembly.Memory;
  
  constructor(config?: {
    initialMemory?: number;
    maximumMemory?: number;
  }) {
    this.memory = new WebAssembly.Memory({
      initial: config?.initialMemory || 1,
      maximum: config?.maximumMemory || 10,
    });
  }
  
  /**
   * Add a mock export function
   */
  addExport(name: string, implementation?: (...args: any[]) => any): MockFunction<any> {
    const mock = createMockFunction(implementation);
    this.exports.set(name, mock);
    return mock;
  }
  
  /**
   * Get a mock export
   */
  getExport(name: string): MockFunction<any> | undefined {
    return this.exports.get(name);
  }
  
  /**
   * Get all exports as an object
   */
  getExports(): Record<string, any> {
    const exportsObj: Record<string, any> = {};
    for (const [name, mock] of this.exports) {
      exportsObj[name] = mock;
    }
    return exportsObj;
  }
  
  /**
   * Simulate instantiation
   */
  async instantiate(): Promise<{
    instance: {
      exports: Record<string, any>;
    };
    module: WebAssembly.Module;
  }> {
    // Create a minimal valid WASM module
    const wasmCode = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // WASM magic number
      0x01, 0x00, 0x00, 0x00, // WASM version
    ]);
    
    const module = new WebAssembly.Module(wasmCode);
    
    return {
      instance: {
        exports: {
          ...this.getExports(),
          memory: this.memory,
        },
      },
      module,
    };
  }
  
  /**
   * Clear all mocks
   */
  clear(): void {
    this.exports.clear();
  }
}

/**
 * Mock React Hook for testing
 */
export function createMockHook<T>(initialValue: T) {
  const listeners = new Set<(value: T) => void>();
  let currentValue = initialValue;
  
  const hook = () => {
    const [value, setValue] = React.useState(currentValue);
    
    React.useEffect(() => {
      const listener = (newValue: T) => setValue(newValue);
      listeners.add(listener);
      return () => listeners.delete(listener);
    }, []);
    
    return value;
  };
  
  const setValue = (value: T | ((prev: T) => T)) => {
    if (typeof value === 'function') {
      currentValue = (value as (prev: T) => T)(currentValue);
    } else {
      currentValue = value;
    }
    
    listeners.forEach(listener => listener(currentValue));
  };
  
  const getValue = () => currentValue;
  
  const reset = () => {
    currentValue = initialValue;
    listeners.forEach(listener => listener(currentValue));
  };
  
  return {
    hook,
    setValue,
    getValue,
    reset,
  };
}

/**
 * Mock timer utilities
 */
export class MockTimers {
  private timers: Map<number, {
    callback: () => void;
    delay: number;
    type: 'timeout' | 'interval';
    createdAt: number;
  }> = new Map();
  
  private nextId = 1;
  private currentTime = 0;
  
  /**
   * Mock setTimeout
   */
  setTimeout(callback: () => void, delay: number): number {
    const id = this.nextId++;
    this.timers.set(id, {
      callback,
      delay,
      type: 'timeout',
      createdAt: this.currentTime,
    });
    return id;
  }
  
  /**
   * Mock setInterval
   */
  setInterval(callback: () => void, delay: number): number {
    const id = this.nextId++;
    this.timers.set(id, {
      callback,
      delay,
      type: 'interval',
      createdAt: this.currentTime,
    });
    return id;
  }
  
  /**
   * Mock clearTimeout/clearInterval
   */
  clear(id: number): void {
    this.timers.delete(id);
  }
  
  /**
   * Advance time and trigger timers
   */
  advance(ms: number): void {
    const targetTime = this.currentTime + ms;
    
    while (this.currentTime < targetTime) {
      let nextTimer: { id: number; triggerAt: number } | null = null;
      
      // Find the next timer to trigger
      for (const [id, timer] of this.timers) {
        const triggerAt = timer.createdAt + timer.delay;
        
        if (triggerAt <= targetTime && (!nextTimer || triggerAt < nextTimer.triggerAt)) {
          nextTimer = { id, triggerAt };
        }
      }
      
      if (!nextTimer) {
        // No more timers to trigger
        this.currentTime = targetTime;
        break;
      }
      
      // Advance to the next timer
      this.currentTime = nextTimer.triggerAt;
      
      const timer = this.timers.get(nextTimer.id)!;
      timer.callback();
      
      if (timer.type === 'timeout') {
        this.timers.delete(nextTimer.id);
      } else {
        // Reset interval timer
        timer.createdAt = this.currentTime;
      }
    }
  }
  
  /**
   * Run all pending timers
   */
  runAll(): void {
    const maxIterations = 1000;
    let iterations = 0;
    
    while (this.timers.size > 0 && iterations < maxIterations) {
      const timers = Array.from(this.timers.values());
      
      for (const timer of timers) {
        timer.callback();
        
        if (timer.type === 'timeout') {
          // Find and remove the timeout
          for (const [id, t] of this.timers) {
            if (t === timer) {
              this.timers.delete(id);
              break;
            }
          }
        }
      }
      
      iterations++;
    }
    
    if (iterations >= maxIterations) {
      throw new Error('Possible infinite loop detected in timers');
    }
  }
  
  /**
   * Clear all timers
   */
  clearAll(): void {
    this.timers.clear();
    this.currentTime = 0;
    this.nextId = 1;
  }
}

/**
 * Mock local/session storage
 */
export class MockStorage implements Storage {
  private store: Map<string, string> = new Map();
  
  get length(): number {
    return this.store.size;
  }
  
  clear(): void {
    this.store.clear();
  }
  
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  
  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
  
  removeItem(key: string): void {
    this.store.delete(key);
  }
  
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

/**
 * Create a spy function that tracks calls but doesn't modify behavior
 */
export function spy<T extends (...args: any[]) => any>(
  target: T
): T & { calls: Array<Parameters<T>>; callCount: number } {
  const calls: Array<Parameters<T>> = [];
  
  const spyFn = ((...args: Parameters<T>) => {
    calls.push(args);
    return target(...args);
  }) as T & { calls: Array<Parameters<T>>; callCount: number };
  
  Object.defineProperty(spyFn, 'calls', {
    get: () => calls,
  });
  
  Object.defineProperty(spyFn, 'callCount', {
    get: () => calls.length,
  });
  
  return spyFn;
}

// Import React for mock hook creation
import * as React from 'react';