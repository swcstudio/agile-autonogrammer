// Core testing utilities
export * from './types';
export * from './ai-test-generator';
export * from './coverage-analyzer';
export * from './component-test-generator';
export * from './visual-regression';

// Re-export commonly used testing utilities
export {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'https://deno.land/std@0.208.0/testing/bdd.ts';
export {
  assertEquals,
  assertExists,
  assertThrows,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';

// Test utilities and helpers
import { ComponentInfo } from './types';

/**
 * Enhanced test runner with AI capabilities
 */
export class KatalystTestRunner {
  static async runWithCoverage(testPath: string): Promise<void> {
    const cmd = new Deno.Command('deno', {
      args: ['test', '--coverage=coverage/', testPath],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await cmd.output();

    if (code !== 0) {
      console.error(new TextDecoder().decode(stderr));
      throw new Error('Tests failed');
    }

    console.log(new TextDecoder().decode(stdout));
  }

  static async generateTestsForDirectory(dir: string): Promise<void> {
    const { AITestGenerator } = await import('./ai-test-generator');
    const generator = new AITestGenerator();
    await generator.generateTestSuite(dir, { output: true });
  }
}

/**
 * Mock data generator utilities
 */
export const mockData = {
  user: (overrides = {}) => ({
    id: crypto.randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  product: (overrides = {}) => ({
    id: crypto.randomUUID(),
    name: 'Test Product',
    price: 99.99,
    description: 'A test product',
    inStock: true,
    ...overrides,
  }),

  order: (overrides = {}) => ({
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    items: [],
    total: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
};

/**
 * Performance testing utilities
 */
export const performance = {
  measure: async (name: string, fn: () => Promise<void>) => {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;

    return {
      name,
      duration,
      timestamp: new Date().toISOString(),
    };
  },

  benchmark: async (name: string, fn: () => Promise<void>, iterations = 100) => {
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      results.push(performance.now() - start);
    }

    return {
      name,
      iterations,
      avg: results.reduce((a, b) => a + b, 0) / results.length,
      min: Math.min(...results),
      max: Math.max(...results),
      median: results.sort()[Math.floor(results.length / 2)],
    };
  },
};

/**
 * Snapshot testing utilities
 */
export const snapshot = {
  match: async (actual: any, snapshotPath: string) => {
    try {
      const expected = await Deno.readTextFile(snapshotPath);
      const actualStr = JSON.stringify(actual, null, 2);

      if (actualStr !== expected) {
        throw new Error(`Snapshot mismatch at ${snapshotPath}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create snapshot if it doesn't exist
        await Deno.writeTextFile(snapshotPath, JSON.stringify(actual, null, 2));
        console.log(`Created snapshot: ${snapshotPath}`);
      } else {
        throw error;
      }
    }
  },

  update: async (actual: any, snapshotPath: string) => {
    await Deno.writeTextFile(snapshotPath, JSON.stringify(actual, null, 2));
    console.log(`Updated snapshot: ${snapshotPath}`);
  },
};

/**
 * Custom test matchers
 */
export const customMatchers = {
  toBeWithinRange: (received: number, floor: number, ceiling: number) => {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${floor} - ${ceiling}`
          : `Expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },

  toHaveBeenCalledWithMatch: (received: any, pattern: RegExp) => {
    const calls = received.mock.calls;
    const pass = calls.some((call: any[]) => call.some((arg) => pattern.test(String(arg))));

    return {
      pass,
      message: () =>
        pass
          ? `Expected function not to have been called with pattern ${pattern}`
          : `Expected function to have been called with pattern ${pattern}`,
    };
  },
};

/**
 * Test data factories
 */
export class TestDataFactory {
  private static counters = new Map<string, number>();

  static sequence(prefix: string): string {
    const count = (this.counters.get(prefix) || 0) + 1;
    this.counters.set(prefix, count);
    return `${prefix}${count}`;
  }

  static reset(): void {
    this.counters.clear();
  }

  static async loadFixture(name: string): Promise<any> {
    const fixturePath = `./tests/fixtures/${name}.json`;
    const content = await Deno.readTextFile(fixturePath);
    return JSON.parse(content);
  }
}

/**
 * Async test utilities
 */
export const asyncUtils = {
  waitFor: async (
    condition: () => boolean | Promise<boolean>,
    options = { timeout: 5000, interval: 100 }
  ): Promise<void> => {
    const start = Date.now();

    while (Date.now() - start < options.timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, options.interval));
    }

    throw new Error(`Timeout waiting for condition after ${options.timeout}ms`);
  },

  retry: async <T>(fn: () => Promise<T>, options = { attempts: 3, delay: 1000 }): Promise<T> => {
    let lastError: Error | undefined;

    for (let i = 0; i < options.attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < options.attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, options.delay));
        }
      }
    }

    throw lastError;
  },
};

/**
 * Environment setup helpers
 */
export const testEnv = {
  setup: () => {
    // Set test environment variables
    Deno.env.set('NODE_ENV', 'test');
    Deno.env.set('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
    Deno.env.set('REDIS_URL', 'redis://localhost:6379');
  },

  cleanup: async () => {
    // Clean up test artifacts
    try {
      await Deno.remove('./tests/temp', { recursive: true });
    } catch {
      // Directory might not exist
    }
  },

  mockEnv: (vars: Record<string, string>) => {
    const original = { ...Deno.env.toObject() };

    Object.entries(vars).forEach(([key, value]) => {
      Deno.env.set(key, value);
    });

    return () => {
      Object.keys(vars).forEach((key) => {
        if (original[key] !== undefined) {
          Deno.env.set(key, original[key]);
        } else {
          Deno.env.delete(key);
        }
      });
    };
  },
};
