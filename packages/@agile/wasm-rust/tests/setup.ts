/**
 * Test Setup for Rust WASM Package
 * Global test configuration and mocks
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

// Mock WebAssembly if not available
if (typeof global.WebAssembly === 'undefined') {
  global.WebAssembly = {
    compile: vi.fn(),
    compileStreaming: vi.fn(),
    instantiate: vi.fn(),
    instantiateStreaming: vi.fn(),
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

// Mock fetch for WASM loading
global.fetch = vi.fn();

// Set up global test timeout
vi.setConfig({ testTimeout: 15000 });

// Suppress console warnings in tests unless explicitly needed
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = vi.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});