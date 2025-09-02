/**
 * Jest test setup for Katalyst Framework
 */

// Mock WebAssembly if not available in test environment
if (typeof WebAssembly === 'undefined') {
  global.WebAssembly = {
    instantiate: jest.fn().mockResolvedValue({
      instance: {
        exports: {}
      }
    }),
    instantiateStreaming: jest.fn().mockResolvedValue({
      instance: {
        exports: {}
      }
    }),
    Module: jest.fn(),
    Instance: jest.fn(),
    Memory: jest.fn(),
    Table: jest.fn(),
    CompileError: Error,
    RuntimeError: Error,
    LinkError: Error
  } as any;
}

// Mock performance API
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  } as any;
}

// Mock fetch for WASM loading tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    ok: true,
    status: 200
  })
) as jest.Mock;

// Mock Worker for multithreading tests
global.Worker = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  terminate: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
})) as any;

// Mock SharedArrayBuffer
if (typeof SharedArrayBuffer === 'undefined') {
  global.SharedArrayBuffer = ArrayBuffer as any;
}

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Restore console for specific tests when needed
export const restoreConsole = () => {
  global.console = originalConsole;
};

// Helper to create test WASM module
export const createMockWasmModule = (exports: Record<string, any> = {}) => ({
  instance: {
    exports: {
      memory: new ArrayBuffer(1024),
      ...exports
    }
  },
  module: {}
});

// Helper to create test configuration
export const createTestConfig = (overrides: any = {}) => ({
  wasm: {
    rust: true,
    elixir: false,
    typescript: false,
    ...overrides.wasm
  },
  ai: {
    provider: 'local' as const,
    models: ['test-model'],
    ...overrides.ai
  },
  multithreading: {
    enabled: false,
    maxWorkers: 1,
    ...overrides.multithreading
  },
  performance: {
    monitoring: false,
    optimization: 'balanced' as const,
    ...overrides.performance
  },
  ...overrides
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});