/**
 * Custom Assertion Utilities
 * Extended assertions for hook testing, performance, and WASM validation
 */

export interface AssertionResult {
  pass: boolean;
  message: string;
  actual?: any;
  expected?: any;
}

/**
 * Custom assertions for hook testing
 */
export const hookAssertions = {
  /**
   * Assert hook renders within performance budget
   */
  toRenderWithinBudget(
    renderTime: number,
    budget: number
  ): AssertionResult {
    const pass = renderTime <= budget;
    return {
      pass,
      message: pass
        ? `Hook rendered within budget (${renderTime.toFixed(2)}ms <= ${budget}ms)`
        : `Hook exceeded render budget (${renderTime.toFixed(2)}ms > ${budget}ms)`,
      actual: renderTime,
      expected: budget,
    };
  },
  
  /**
   * Assert hook state changes as expected
   */
  toTransitionCorrectly<T>(
    transitions: Array<{ from: T; to: T; actual: T }>
  ): AssertionResult {
    for (const transition of transitions) {
      if (JSON.stringify(transition.actual) !== JSON.stringify(transition.to)) {
        return {
          pass: false,
          message: `State transition failed: expected ${JSON.stringify(transition.to)}, got ${JSON.stringify(transition.actual)}`,
          actual: transition.actual,
          expected: transition.to,
        };
      }
    }
    
    return {
      pass: true,
      message: 'All state transitions completed successfully',
    };
  },
  
  /**
   * Assert hook cleanup functions are called
   */
  toCleanupProperly(
    cleanupCalls: number,
    expectedCalls: number
  ): AssertionResult {
    const pass = cleanupCalls === expectedCalls;
    return {
      pass,
      message: pass
        ? `Cleanup functions called correctly (${cleanupCalls} times)`
        : `Cleanup functions called ${cleanupCalls} times, expected ${expectedCalls}`,
      actual: cleanupCalls,
      expected: expectedCalls,
    };
  },
  
  /**
   * Assert hook doesn't cause unnecessary re-renders
   */
  toAvoidExcessiveRenders(
    renderCount: number,
    maxRenders: number
  ): AssertionResult {
    const pass = renderCount <= maxRenders;
    return {
      pass,
      message: pass
        ? `Hook rendered ${renderCount} times (within limit of ${maxRenders})`
        : `Hook rendered ${renderCount} times, exceeding limit of ${maxRenders}`,
      actual: renderCount,
      expected: maxRenders,
    };
  },
};

/**
 * Custom assertions for WASM testing
 */
export const wasmAssertions = {
  /**
   * Assert WASM module exports expected functions
   */
  toExportFunctions(
    exports: Record<string, any>,
    expectedFunctions: string[]
  ): AssertionResult {
    const missingFunctions = expectedFunctions.filter(
      fn => typeof exports[fn] !== 'function'
    );
    
    const pass = missingFunctions.length === 0;
    return {
      pass,
      message: pass
        ? 'All expected functions are exported'
        : `Missing exported functions: ${missingFunctions.join(', ')}`,
      actual: Object.keys(exports).filter(k => typeof exports[k] === 'function'),
      expected: expectedFunctions,
    };
  },
  
  /**
   * Assert WASM memory is within bounds
   */
  toHaveMemoryWithinBounds(
    memory: WebAssembly.Memory,
    minPages: number,
    maxPages: number
  ): AssertionResult {
    const currentPages = memory.buffer.byteLength / 65536; // 64KB per page
    const pass = currentPages >= minPages && currentPages <= maxPages;
    
    return {
      pass,
      message: pass
        ? `Memory is within bounds (${currentPages} pages)`
        : `Memory out of bounds: ${currentPages} pages (expected ${minPages}-${maxPages})`,
      actual: currentPages,
      expected: { min: minPages, max: maxPages },
    };
  },
  
  /**
   * Assert WASM function performance
   */
  toExecuteFasterThan(
    wasmDuration: number,
    jsDuration: number,
    speedupFactor: number = 1.0
  ): AssertionResult {
    const actualSpeedup = jsDuration / wasmDuration;
    const pass = actualSpeedup >= speedupFactor;
    
    return {
      pass,
      message: pass
        ? `WASM is ${actualSpeedup.toFixed(2)}x faster than JS`
        : `WASM speedup (${actualSpeedup.toFixed(2)}x) is less than required (${speedupFactor}x)`,
      actual: actualSpeedup,
      expected: speedupFactor,
    };
  },
};

/**
 * Custom assertions for async operations
 */
export const asyncAssertions = {
  /**
   * Assert promise resolves within timeout
   */
  async toResolveWithin<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<AssertionResult> {
    const start = performance.now();
    
    try {
      await Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        ),
      ]);
      
      const duration = performance.now() - start;
      
      return {
        pass: true,
        message: `Promise resolved within ${duration.toFixed(2)}ms`,
        actual: duration,
        expected: timeout,
      };
    } catch (error) {
      const duration = performance.now() - start;
      
      return {
        pass: false,
        message: error instanceof Error && error.message === 'Timeout'
          ? `Promise timed out after ${timeout}ms`
          : `Promise rejected: ${error}`,
        actual: duration,
        expected: timeout,
      };
    }
  },
  
  /**
   * Assert promise rejects with expected error
   */
  async toRejectWith<T>(
    promise: Promise<T>,
    expectedError: string | RegExp | Error
  ): Promise<AssertionResult> {
    try {
      await promise;
      return {
        pass: false,
        message: 'Promise resolved when it should have rejected',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      let matches = false;
      if (expectedError instanceof RegExp) {
        matches = expectedError.test(errorMessage);
      } else if (expectedError instanceof Error) {
        matches = errorMessage === expectedError.message;
      } else {
        matches = errorMessage.includes(expectedError);
      }
      
      return {
        pass: matches,
        message: matches
          ? `Promise rejected with expected error: ${errorMessage}`
          : `Promise rejected with unexpected error: ${errorMessage}`,
        actual: errorMessage,
        expected: expectedError,
      };
    }
  },
};

/**
 * Custom assertions for API testing
 */
export const apiAssertions = {
  /**
   * Assert API response status
   */
  toHaveStatus(
    response: { status: number },
    expectedStatus: number
  ): AssertionResult {
    const pass = response.status === expectedStatus;
    return {
      pass,
      message: pass
        ? `Response has expected status ${expectedStatus}`
        : `Response has status ${response.status}, expected ${expectedStatus}`,
      actual: response.status,
      expected: expectedStatus,
    };
  },
  
  /**
   * Assert API response contains expected data
   */
  toContainData<T>(
    response: { data?: T },
    expectedData: Partial<T>
  ): AssertionResult {
    if (!response.data) {
      return {
        pass: false,
        message: 'Response has no data',
        actual: undefined,
        expected: expectedData,
      };
    }
    
    const actualData = response.data as any;
    const missingKeys: string[] = [];
    const mismatchedKeys: string[] = [];
    
    for (const [key, expectedValue] of Object.entries(expectedData)) {
      if (!(key in actualData)) {
        missingKeys.push(key);
      } else if (JSON.stringify(actualData[key]) !== JSON.stringify(expectedValue)) {
        mismatchedKeys.push(key);
      }
    }
    
    const pass = missingKeys.length === 0 && mismatchedKeys.length === 0;
    
    let message = '';
    if (pass) {
      message = 'Response contains expected data';
    } else {
      if (missingKeys.length > 0) {
        message += `Missing keys: ${missingKeys.join(', ')}. `;
      }
      if (mismatchedKeys.length > 0) {
        message += `Mismatched keys: ${mismatchedKeys.join(', ')}`;
      }
    }
    
    return {
      pass,
      message,
      actual: actualData,
      expected: expectedData,
    };
  },
};

/**
 * Custom assertions for component testing
 */
export const componentAssertions = {
  /**
   * Assert component renders without errors
   */
  toRenderWithoutErrors(
    renderFn: () => void,
    errorBoundary?: { hasError: boolean; error?: Error }
  ): AssertionResult {
    try {
      renderFn();
      
      if (errorBoundary && errorBoundary.hasError) {
        return {
          pass: false,
          message: `Component rendered with error: ${errorBoundary.error?.message}`,
          actual: errorBoundary.error,
        };
      }
      
      return {
        pass: true,
        message: 'Component rendered without errors',
      };
    } catch (error) {
      return {
        pass: false,
        message: `Component threw error during render: ${error}`,
        actual: error,
      };
    }
  },
  
  /**
   * Assert component accessibility
   */
  toBeAccessible(
    violations: any[]
  ): AssertionResult {
    const pass = violations.length === 0;
    return {
      pass,
      message: pass
        ? 'Component meets accessibility standards'
        : `Component has ${violations.length} accessibility violations`,
      actual: violations,
      expected: [],
    };
  },
};

/**
 * Combine multiple assertions
 */
export function combineAssertions(
  ...assertions: AssertionResult[]
): AssertionResult {
  const failed = assertions.filter(a => !a.pass);
  
  if (failed.length === 0) {
    return {
      pass: true,
      message: 'All assertions passed',
    };
  }
  
  return {
    pass: false,
    message: `${failed.length} assertion(s) failed:\n${failed.map(a => `  - ${a.message}`).join('\n')}`,
    actual: failed.map(a => a.actual),
    expected: failed.map(a => a.expected),
  };
}

/**
 * Create custom matcher for testing frameworks
 */
export function createMatcher<T>(
  name: string,
  assertion: (actual: T, expected: any) => AssertionResult | Promise<AssertionResult>
) {
  return {
    [name]: async function(this: any, actual: T, expected: any) {
      const result = await assertion(actual, expected);
      
      if (result.pass) {
        return {
          pass: true,
          message: () => result.message,
        };
      } else {
        return {
          pass: false,
          message: () => result.message,
          actual: result.actual,
          expected: result.expected,
        };
      }
    },
  }[name];
}

/**
 * Assertion helpers
 */
export const assertionHelpers = {
  /**
   * Deep equality check
   */
  deepEqual(actual: any, expected: any): boolean {
    if (actual === expected) return true;
    
    if (actual == null || expected == null) return false;
    
    if (typeof actual !== 'object' || typeof expected !== 'object') {
      return actual === expected;
    }
    
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    
    if (actualKeys.length !== expectedKeys.length) return false;
    
    for (const key of actualKeys) {
      if (!expectedKeys.includes(key)) return false;
      if (!this.deepEqual(actual[key], expected[key])) return false;
    }
    
    return true;
  },
  
  /**
   * Check if value matches pattern
   */
  matches(value: any, pattern: any): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(String(value));
    }
    
    if (typeof pattern === 'function') {
      return pattern(value);
    }
    
    return this.deepEqual(value, pattern);
  },
  
  /**
   * Format value for display
   */
  format(value: any): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    if (Array.isArray(value)) {
      return `[${value.map(v => this.format(v)).join(', ')}]`;
    }
    
    if (typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([k, v]) => `${k}: ${this.format(v)}`)
        .join(', ');
      return `{ ${entries} }`;
    }
    
    return String(value);
  },
};