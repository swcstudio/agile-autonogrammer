/**
 * Test Setup
 * Global test configuration and setup for the core package
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: vi.fn(),
    measure: vi.fn(),
  } as any;
}

// Mock PerformanceObserver if not available
if (typeof global.PerformanceObserver === 'undefined') {
  global.PerformanceObserver = class PerformanceObserver {
    constructor(callback: PerformanceObserverCallback) {}
    observe(options: any) {}
    disconnect() {}
  } as any;
}

// Mock WebAssembly if not available
if (typeof global.WebAssembly === 'undefined') {
  global.WebAssembly = {
    compile: vi.fn(),
    instantiate: vi.fn(),
    Module: class Module {} as any,
    Instance: class Instance {} as any,
    Memory: class Memory {
      buffer: ArrayBuffer;
      constructor(descriptor: WebAssembly.MemoryDescriptor) {
        this.buffer = new ArrayBuffer((descriptor.initial || 1) * 65536);
      }
    } as any,
    Table: class Table {} as any,
  } as any;
}

// Global test timeout
vi.setConfig({ testTimeout: 10000 });

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});