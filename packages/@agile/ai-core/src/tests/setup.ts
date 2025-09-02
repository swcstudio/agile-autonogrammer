/**
 * Test Setup for AI Core Package
 * Global test configuration and mocks
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ExecutionEngine from @agile/core
vi.mock('@agile/core', () => ({
  useExecutionEngine: vi.fn(() => ({
    execute: vi.fn((fn) => fn()),
    metrics: null,
  })),
}));

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: vi.fn(),
    measure: vi.fn(),
  } as any;
}

// Mock fetch for API calls
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