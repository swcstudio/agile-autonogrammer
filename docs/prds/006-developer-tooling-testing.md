# PRD-006: Developer Tooling & Testing Infrastructure

## Executive Summary

**Objective**: Establish comprehensive developer tooling and testing infrastructure for Agile-Programmers, integrating Katalyst's testing utilities, API development tools, and creating a robust development environment with automated testing, debugging capabilities, and performance monitoring.

**Success Metrics**:
- 100% test coverage across all hook-based components
- Developer setup time reduced to <5 minutes
- Test execution time <30 seconds for full suite
- Zero-configuration debugging for all runtimes (JS, WASM, Edge)

## Developer Tooling Ecosystem

### Core Tooling Packages
```
packages/test-utils/      - Testing utilities and helpers
packages/api/            - API development and testing tools
packages/integrations/   - Third-party integrations and testing
```

### Testing Infrastructure Analysis

**Package: `packages/test-utils/`** - Testing Framework
```typescript
// Current Test Utils Structure Analysis  
// Target: Jest/Vitest integration, React Testing Library
// Features: Hook testing utilities, WASM testing, mock generators
// Integration: Coverage reporting, performance benchmarks
```

**Package: `packages/api/`** - API Development Tools
```typescript  
// API Development Environment
// Target: OpenAPI/Swagger integration, mock servers, API testing
// Features: Request/response validation, load testing, documentation
```

## Hook-Based Testing Architecture

### Core Testing Hook
```typescript
// packages/hooks/src/testing/useTestEnvironment.ts
export interface TestEnvironmentHook {
  // Test Execution
  testSuites: TestSuite[];
  runningTests: TestExecution[];
  testResults: TestResult[];
  
  // Test Operations
  runTest: (testId: string) => Promise<TestResult>;
  runTestSuite: (suiteId: string) => Promise<TestSuiteResult>;
  runAllTests: (options?: TestRunOptions) => Promise<TestRunResult>;
  
  // Test Management
  createTest: (test: TestDefinition) => Promise<string>;
  updateTest: (testId: string, updates: Partial<TestDefinition>) => Promise<void>;
  deleteTest: (testId: string) => Promise<void>;
  
  // Coverage & Performance
  coverageReport: CoverageReport;
  performanceMetrics: TestPerformanceMetrics;
  
  // Mock & Fixture Management
  mocks: MockRegistry;
  createMock: <T>(name: string, implementation: T) => Mock<T>;
  resetMocks: () => void;
  
  // WASM Testing
  wasmTestResults: WasmTestResult[];
  runWasmTests: () => Promise<WasmTestResult[]>;
  
  // Integration Testing
  apiTestResults: ApiTestResult[];
  runApiTests: () => Promise<ApiTestResult[]>;
}

export function useTestEnvironment(config?: TestEnvironmentConfig): TestEnvironmentHook {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [runningTests, setRunningTests] = useState<TestExecution[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [coverageReport, setCoverageReport] = useState<CoverageReport>({});
  const [mocks, setMocks] = useState<MockRegistry>({});
  const [performanceMetrics, setPerformanceMetrics] = useState<TestPerformanceMetrics>({});
  
  // Load test suites on initialization
  useEffect(() => {
    loadTestSuites().then(suites => {
      setTestSuites(suites);
    });
  }, []);
  
  const runTest = useCallback(async (testId: string): Promise<TestResult> => {
    const test = findTestById(testId);
    if (!test) throw new Error(`Test not found: ${testId}`);
    
    const execution: TestExecution = {
      id: testId,
      startTime: new Date(),
      status: 'running'
    };
    
    setRunningTests(prev => [...prev, execution]);
    
    try {
      const startTime = performance.now();
      const result = await executeTest(test);
      const duration = performance.now() - startTime;
      
      const testResult: TestResult = {
        testId,
        status: result.passed ? 'passed' : 'failed',
        duration,
        errors: result.errors || [],
        assertions: result.assertions || [],
        coverage: result.coverage,
        performance: result.performance
      };
      
      setTestResults(prev => [...prev, testResult]);
      setRunningTests(prev => prev.filter(t => t.id !== testId));
      
      return testResult;
      
    } catch (error) {
      const errorResult: TestResult = {
        testId,
        status: 'error',
        duration: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        assertions: [],
        coverage: null,
        performance: null
      };
      
      setTestResults(prev => [...prev, errorResult]);
      setRunningTests(prev => prev.filter(t => t.id !== testId));
      
      return errorResult;
    }
  }, [testSuites]);
  
  const runTestSuite = useCallback(async (suiteId: string): Promise<TestSuiteResult> => {
    const suite = testSuites.find(s => s.id === suiteId);
    if (!suite) throw new Error(`Test suite not found: ${suiteId}`);
    
    const startTime = performance.now();
    const testPromises = suite.tests.map(testId => runTest(testId));
    const testResults = await Promise.all(testPromises);
    const duration = performance.now() - startTime;
    
    const passed = testResults.filter(r => r.status === 'passed').length;
    const failed = testResults.filter(r => r.status === 'failed').length;
    const errors = testResults.filter(r => r.status === 'error').length;
    
    return {
      suiteId,
      totalTests: testResults.length,
      passed,
      failed,
      errors,
      duration,
      coverage: mergeCoverageReports(testResults.map(r => r.coverage).filter(Boolean)),
      testResults
    };
  }, [testSuites, runTest]);
  
  const runAllTests = useCallback(async (options?: TestRunOptions): Promise<TestRunResult> => {
    const startTime = performance.now();
    const suitesToRun = options?.suites || testSuites.map(s => s.id);
    
    // Run test suites in parallel if not specified otherwise
    const concurrency = options?.parallel !== false;
    let suiteResults: TestSuiteResult[];
    
    if (concurrency) {
      suiteResults = await Promise.all(suitesToRun.map(runTestSuite));
    } else {
      suiteResults = [];
      for (const suiteId of suitesToRun) {
        const result = await runTestSuite(suiteId);
        suiteResults.push(result);
      }
    }
    
    const totalDuration = performance.now() - startTime;
    
    // Aggregate results
    const totalTests = suiteResults.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = suiteResults.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = suiteResults.reduce((sum, suite) => sum + suite.failed, 0);
    const totalErrors = suiteResults.reduce((sum, suite) => sum + suite.errors, 0);
    
    // Merge coverage reports
    const overallCoverage = mergeCoverageReports(
      suiteResults.map(suite => suite.coverage).filter(Boolean)
    );
    
    setCoverageReport(overallCoverage);
    
    // Update performance metrics
    setPerformanceMetrics(prev => ({
      ...prev,
      lastRunDuration: totalDuration,
      averageTestTime: totalDuration / totalTests,
      testsPerSecond: totalTests / (totalDuration / 1000),
      lastRunTimestamp: new Date()
    }));
    
    return {
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      errors: totalErrors,
      duration: totalDuration,
      coverage: overallCoverage,
      suiteResults,
      success: totalFailed === 0 && totalErrors === 0
    };
  }, [testSuites, runTestSuite]);
  
  const createMock = useCallback(<T>(name: string, implementation: T): Mock<T> => {
    const mock = createMockImplementation(implementation);
    setMocks(prev => ({ ...prev, [name]: mock }));
    return mock;
  }, []);
  
  // WASM testing capabilities
  const runWasmTests = useCallback(async (): Promise<WasmTestResult[]> => {
    const wasmTests = [
      {
        name: 'Rust Compute Performance',
        test: async () => {
          const rustCompute = await loadRustWasm();
          const matrix = new Float32Array(100 * 100).fill(1);
          const startTime = performance.now();
          await rustCompute.matrix_multiply(matrix, matrix, 100, 100, 100);
          return performance.now() - startTime;
        },
        expected: '<50ms'
      },
      {
        name: 'WASM Memory Management',
        test: async () => {
          const rustCompute = await loadRustWasm();
          const initialMemory = rustCompute.get_memory_usage();
          const buffer = rustCompute.allocate_buffer(1024 * 1024); // 1MB
          const afterAlloc = rustCompute.get_memory_usage();
          rustCompute.deallocate_buffer(buffer, 1024 * 1024);
          const afterDealloc = rustCompute.get_memory_usage();
          
          return {
            memoryLeak: afterDealloc - initialMemory,
            allocationWorked: afterAlloc > initialMemory
          };
        },
        expected: { memoryLeak: 0, allocationWorked: true }
      }
    ];
    
    const results: WasmTestResult[] = [];
    
    for (const wasmTest of wasmTests) {
      try {
        const result = await wasmTest.test();
        const passed = deepEqual(result, wasmTest.expected);
        
        results.push({
          name: wasmTest.name,
          passed,
          result,
          expected: wasmTest.expected,
          error: null
        });
      } catch (error) {
        results.push({
          name: wasmTest.name,
          passed: false,
          result: null,
          expected: wasmTest.expected,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }, []);
  
  return {
    testSuites,
    runningTests,
    testResults,
    runTest,
    runTestSuite,
    runAllTests,
    createTest: async (test) => { /* implementation */ return generateTestId(); },
    updateTest: async (id, updates) => { /* implementation */ },
    deleteTest: async (id) => { /* implementation */ },
    coverageReport,
    performanceMetrics,
    mocks,
    createMock,
    resetMocks: () => setMocks({}),
    wasmTestResults: [],
    runWasmTests,
    apiTestResults: [],
    runApiTests: async () => { /* implementation */ return []; }
  };
}
```

### Hook Testing Utilities
```typescript
// packages/hooks/src/testing/useHookTesting.ts
export interface HookTestingHook {
  // Hook Testing
  renderHook: <T>(hook: () => T, options?: RenderHookOptions) => HookRenderResult<T>;
  rerender: (newProps?: any) => void;
  unmount: () => void;
  
  // Assertions
  waitFor: <T>(callback: () => T, options?: WaitOptions) => Promise<T>;
  waitForNextUpdate: () => Promise<void>;
  
  // Mock Management
  mockImplementation: <T extends (...args: any[]) => any>(fn: T, implementation: T) => void;
  restoreMocks: () => void;
  
  // Performance Testing
  measureHookPerformance: <T>(hook: () => T, iterations: number) => Promise<PerformanceMeasurement>;
  
  // Accessibility Testing
  testHookAccessibility: <T>(hook: () => T) => Promise<AccessibilityResult>;
}

export function useHookTesting(): HookTestingHook {
  const [currentWrapper, setCurrentWrapper] = useState<ReactWrapper | null>(null);
  const [activeMocks, setActiveMocks] = useState<Mock[]>([]);
  
  const renderHook = useCallback(<T>(
    hook: () => T, 
    options?: RenderHookOptions
  ): HookRenderResult<T> => {
    let result: T;
    let error: Error | null = null;
    
    const TestComponent = (props: any) => {
      try {
        result = hook();
        return null;
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        throw error;
      }
    };
    
    const wrapper = render(
      <TestComponent {...(options?.initialProps || {})} />,
      options?.wrapper
    );
    
    setCurrentWrapper(wrapper);
    
    return {
      result: {
        current: result!,
        error
      },
      rerender: (newProps) => {
        wrapper.rerender(<TestComponent {...newProps} />);
      },
      unmount: () => {
        wrapper.unmount();
        setCurrentWrapper(null);
      }
    };
  }, []);
  
  const waitFor = useCallback(async <T>(
    callback: () => T, 
    options?: WaitOptions
  ): Promise<T> => {
    const timeout = options?.timeout || 1000;
    const interval = options?.interval || 50;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = callback();
        return result;
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error(`waitFor timed out after ${timeout}ms`);
  }, []);
  
  const measureHookPerformance = useCallback(async <T>(
    hook: () => T,
    iterations: number = 100
  ): Promise<PerformanceMeasurement> => {
    const measurements: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      const { unmount } = renderHook(hook);
      
      const duration = performance.now() - startTime;
      measurements.push(duration);
      
      unmount();
      
      // Allow for garbage collection
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return {
      iterations,
      average: measurements.reduce((sum, m) => sum + m, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      median: measurements.sort()[Math.floor(measurements.length / 2)],
      percentile95: measurements.sort()[Math.floor(measurements.length * 0.95)]
    };
  }, [renderHook]);
  
  const testHookAccessibility = useCallback(async <T>(
    hook: () => T
  ): Promise<AccessibilityResult> => {
    const TestComponent = () => {
      const hookResult = hook();
      
      // If hook returns JSX or component props, render them for testing
      if (typeof hookResult === 'object' && hookResult && 'props' in hookResult) {
        return <div {...(hookResult as any).props} />;
      }
      
      return <div aria-label="test-component" />;
    };
    
    const { container } = render(<TestComponent />);
    
    // Run axe accessibility tests
    const results = await axe(container);
    
    return {
      violations: results.violations,
      passes: results.passes.length,
      inaccessible: results.violations.length > 0,
      wcagLevel: calculateWcagLevel(results)
    };
  }, []);
  
  return {
    renderHook,
    rerender: (newProps) => {
      if (currentWrapper) {
        currentWrapper.rerender(newProps);
      }
    },
    unmount: () => {
      if (currentWrapper) {
        currentWrapper.unmount();
        setCurrentWrapper(null);
      }
    },
    waitFor,
    waitForNextUpdate: async () => {
      await waitFor(() => {
        // Wait for any state updates
        return true;
      }, { timeout: 100 });
    },
    mockImplementation: (fn, implementation) => {
      const mock = jest.fn(implementation);
      setActiveMocks(prev => [...prev, mock]);
    },
    restoreMocks: () => {
      activeMocks.forEach(mock => mock.mockRestore?.());
      setActiveMocks([]);
    },
    measureHookPerformance,
    testHookAccessibility
  };
}
```

### API Testing Hook
```typescript
// packages/hooks/src/testing/useApiTesting.ts
export interface ApiTestingHook {
  // Mock Server
  mockServer: MockServer | null;
  startMockServer: (config: MockServerConfig) => Promise<MockServer>;
  stopMockServer: () => Promise<void>;
  
  // API Testing
  testEndpoint: (endpoint: ApiEndpoint, testCases: ApiTestCase[]) => Promise<ApiTestResult[]>;
  loadTest: (endpoint: ApiEndpoint, config: LoadTestConfig) => Promise<LoadTestResult>;
  
  // Request/Response Validation
  validateRequest: (request: ApiRequest, schema: JsonSchema) => ValidationResult;
  validateResponse: (response: ApiResponse, schema: JsonSchema) => ValidationResult;
  
  // Documentation Testing
  testOpenApiSpec: (spec: OpenApiSpec) => Promise<OpenApiTestResult>;
  generateTests: (spec: OpenApiSpec) => Promise<GeneratedTest[]>;
  
  // Integration Testing
  testIntegration: (integration: IntegrationConfig) => Promise<IntegrationTestResult>;
}

export function useApiTesting(): ApiTestingHook {
  const [mockServer, setMockServer] = useState<MockServer | null>(null);
  const [testResults, setTestResults] = useState<ApiTestResult[]>([]);
  
  const startMockServer = useCallback(async (config: MockServerConfig): Promise<MockServer> => {
    const server = new MockServer({
      port: config.port || 3001,
      routes: config.routes || [],
      middleware: config.middleware || []
    });
    
    await server.start();
    setMockServer(server);
    
    return server;
  }, []);
  
  const testEndpoint = useCallback(async (
    endpoint: ApiEndpoint,
    testCases: ApiTestCase[]
  ): Promise<ApiTestResult[]> => {
    const results: ApiTestResult[] = [];
    
    for (const testCase of testCases) {
      const startTime = performance.now();
      
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            ...endpoint.headers,
            ...testCase.headers
          },
          body: testCase.body ? JSON.stringify(testCase.body) : undefined
        });
        
        const responseBody = await response.json();
        const duration = performance.now() - startTime;
        
        const assertions = testCase.assertions || [];
        const assertionResults = assertions.map(assertion => {
          try {
            const result = evaluateAssertion(assertion, {
              status: response.status,
              headers: response.headers,
              body: responseBody
            });
            return { assertion, passed: result, error: null };
          } catch (error) {
            return { 
              assertion, 
              passed: false, 
              error: error instanceof Error ? error.message : String(error)
            };
          }
        });
        
        const allPassed = assertionResults.every(r => r.passed);
        
        results.push({
          testCase: testCase.name,
          endpoint: endpoint.url,
          method: endpoint.method,
          status: response.status,
          duration,
          passed: allPassed,
          assertions: assertionResults,
          response: {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody
          }
        });
        
      } catch (error) {
        results.push({
          testCase: testCase.name,
          endpoint: endpoint.url,
          method: endpoint.method,
          status: 0,
          duration: performance.now() - startTime,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          assertions: [],
          response: null
        });
      }
    }
    
    setTestResults(prev => [...prev, ...results]);
    return results;
  }, []);
  
  const loadTest = useCallback(async (
    endpoint: ApiEndpoint,
    config: LoadTestConfig
  ): Promise<LoadTestResult> => {
    const { 
      duration = 30000, // 30 seconds
      concurrency = 10,
      rampUp = 5000 // 5 seconds
    } = config;
    
    const results: LoadTestRequestResult[] = [];
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    // Ramp up concurrent requests
    const rampUpInterval = rampUp / concurrency;
    const workers: Promise<void>[] = [];
    
    for (let i = 0; i < concurrency; i++) {
      const workerPromise = (async () => {
        // Stagger worker start times
        await new Promise(resolve => setTimeout(resolve, i * rampUpInterval));
        
        while (Date.now() < endTime) {
          const requestStart = Date.now();
          
          try {
            const response = await fetch(endpoint.url, {
              method: endpoint.method,
              headers: endpoint.headers
            });
            
            const requestEnd = Date.now();
            
            results.push({
              timestamp: requestStart,
              duration: requestEnd - requestStart,
              status: response.status,
              success: response.ok,
              error: null
            });
            
          } catch (error) {
            results.push({
              timestamp: requestStart,
              duration: Date.now() - requestStart,
              status: 0,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      })();
      
      workers.push(workerPromise);
    }
    
    await Promise.all(workers);
    
    // Calculate statistics
    const successfulRequests = results.filter(r => r.success);
    const failedRequests = results.filter(r => !r.success);
    const durations = successfulRequests.map(r => r.duration);
    
    return {
      totalRequests: results.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      requestsPerSecond: results.length / (duration / 1000),
      averageResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      percentile95: durations.sort()[Math.floor(durations.length * 0.95)],
      errorRate: failedRequests.length / results.length,
      duration,
      concurrency
    };
  }, []);
  
  return {
    mockServer,
    startMockServer,
    stopMockServer: async () => {
      if (mockServer) {
        await mockServer.stop();
        setMockServer(null);
      }
    },
    testEndpoint,
    loadTest,
    validateRequest: (request, schema) => validateJsonSchema(request, schema),
    validateResponse: (response, schema) => validateJsonSchema(response, schema),
    testOpenApiSpec: async (spec) => { /* OpenAPI testing implementation */ return {} as OpenApiTestResult; },
    generateTests: async (spec) => { /* Test generation implementation */ return []; },
    testIntegration: async (integration) => { /* Integration testing implementation */ return {} as IntegrationTestResult; }
  };
}
```

## Development Environment Tools

### Debug Console Hook
```typescript
// packages/hooks/src/dev/useDebugConsole.ts
export interface DebugConsoleHook {
  // Console State
  logs: DebugLog[];
  isVisible: boolean;
  filters: LogFilter[];
  
  // Logging
  log: (message: string, level?: LogLevel, metadata?: any) => void;
  clear: () => void;
  export: (format: 'json' | 'csv' | 'txt') => Promise<string>;
  
  // Performance Monitoring
  startPerfTrace: (name: string) => void;
  endPerfTrace: (name: string) => void;
  getPerformanceData: () => PerformanceData;
  
  // Hook Debugging
  inspectHook: <T>(hookResult: T) => HookInspectionResult<T>;
  trackStateChanges: <T>(state: T, name: string) => void;
  
  // Network Debugging
  networkLogs: NetworkLog[];
  interceptRequests: boolean;
  setInterceptRequests: (enabled: boolean) => void;
  
  // WASM Debugging
  wasmDebugInfo: WasmDebugInfo;
  inspectWasmMemory: () => Promise<WasmMemorySnapshot>;
}

export function useDebugConsole(config?: DebugConsoleConfig): DebugConsoleHook {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isVisible, setIsVisible] = useState(config?.initiallyVisible || false);
  const [filters, setFilters] = useState<LogFilter[]>([]);
  const [performanceTraces, setPerformanceTraces] = useState<Map<string, number>>(new Map());
  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [interceptRequests, setInterceptRequests] = useState(false);
  
  const log = useCallback((message: string, level: LogLevel = 'info', metadata?: any) => {
    const logEntry: DebugLog = {
      id: generateId(),
      timestamp: new Date(),
      level,
      message,
      metadata,
      source: getCallSource() // Extract file/line info from stack trace
    };
    
    setLogs(prev => [...prev.slice(-999), logEntry]); // Keep last 1000 logs
    
    // Also log to browser console in development
    if (process.env.NODE_ENV === 'development') {
      console[level](message, metadata);
    }
  }, []);
  
  const startPerfTrace = useCallback((name: string) => {
    setPerformanceTraces(prev => new Map(prev.set(name, performance.now())));
    log(`Performance trace started: ${name}`, 'debug');
  }, [log]);
  
  const endPerfTrace = useCallback((name: string) => {
    const startTime = performanceTraces.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      setPerformanceTraces(prev => {
        const newMap = new Map(prev);
        newMap.delete(name);
        return newMap;
      });
      log(`Performance trace completed: ${name} (${duration.toFixed(2)}ms)`, 'debug', { duration });
    }
  }, [log, performanceTraces]);
  
  const inspectHook = useCallback(<T>(hookResult: T): HookInspectionResult<T> => {
    const inspection = {
      type: typeof hookResult,
      value: hookResult,
      serializable: isSerializable(hookResult),
      circularRefs: hasCircularReferences(hookResult),
      methods: hookResult && typeof hookResult === 'object' 
        ? Object.getOwnPropertyNames(hookResult).filter(prop => 
            typeof (hookResult as any)[prop] === 'function'
          )
        : [],
      state: hookResult && typeof hookResult === 'object'
        ? Object.getOwnPropertyNames(hookResult).filter(prop =>
            typeof (hookResult as any)[prop] !== 'function'
          )
        : []
    };
    
    log(`Hook inspection`, 'debug', inspection);
    return inspection;
  }, [log]);
  
  const trackStateChanges = useCallback(<T>(state: T, name: string) => {
    useEffect(() => {
      log(`State change: ${name}`, 'debug', { newState: state });
    }, [state, name]);
  }, [log]);
  
  // Network request interceptor
  useEffect(() => {
    if (!interceptRequests) return;
    
    const originalFetch = window.fetch;
    
    window.fetch = async (input, init) => {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input.url;
      
      try {
        const response = await originalFetch(input, init);
        const duration = performance.now() - startTime;
        
        setNetworkLogs(prev => [...prev.slice(-99), {
          id: generateId(),
          timestamp: new Date(),
          method: init?.method || 'GET',
          url,
          status: response.status,
          duration,
          success: response.ok
        }]);
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        setNetworkLogs(prev => [...prev.slice(-99), {
          id: generateId(),
          timestamp: new Date(),
          method: init?.method || 'GET',
          url,
          status: 0,
          duration,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }]);
        
        throw error;
      }
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, [interceptRequests]);
  
  // Keyboard shortcut to toggle console
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  return {
    logs,
    isVisible,
    filters,
    log,
    clear: () => setLogs([]),
    export: async (format) => {
      switch (format) {
        case 'json':
          return JSON.stringify(logs, null, 2);
        case 'csv':
          return convertLogsToCsv(logs);
        case 'txt':
          return logs.map(log => `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}`).join('\n');
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    },
    startPerfTrace,
    endPerfTrace,
    getPerformanceData: () => ({
      activeTraces: Array.from(performanceTraces.keys()),
      completedTraces: logs.filter(log => log.metadata?.duration).length,
      averageTraceTime: calculateAverageTraceTime(logs)
    }),
    inspectHook,
    trackStateChanges,
    networkLogs,
    interceptRequests,
    setInterceptRequests,
    wasmDebugInfo: {
      modules: [], // WASM modules info
      memory: 0,   // Current memory usage
      exports: []  // Exported functions
    },
    inspectWasmMemory: async () => {
      // WASM memory inspection implementation
      return {
        totalSize: 0,
        usedSize: 0,
        pages: [],
        allocations: []
      };
    }
  };
}
```

## Performance Monitoring

### Performance Analytics Hook
```typescript
// packages/hooks/src/monitoring/usePerformanceAnalytics.ts  
export interface PerformanceAnalyticsHook {
  // Core Metrics
  vitals: WebVitals;
  renderMetrics: RenderMetrics;
  hookMetrics: HookMetrics;
  wasmMetrics: WasmMetrics;
  
  // Monitoring Controls
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resetMetrics: () => void;
  
  // Reporting
  generateReport: () => PerformanceReport;
  exportMetrics: (format: 'json' | 'csv') => Promise<string>;
  
  // Alerts
  alerts: PerformanceAlert[];
  setAlert: (metric: string, threshold: number, condition: AlertCondition) => void;
  clearAlert: (id: string) => void;
}

export function usePerformanceAnalytics(): PerformanceAnalyticsHook {
  const [vitals, setVitals] = useState<WebVitals>({});
  const [renderMetrics, setRenderMetrics] = useState<RenderMetrics>({});
  const [hookMetrics, setHookMetrics] = useState<HookMetrics>({});
  const [wasmMetrics, setWasmMetrics] = useState<WasmMetrics>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  
  // Web Vitals monitoring
  useEffect(() => {
    if (!isMonitoring) return;
    
    // Core Web Vitals
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(metric => setVitals(prev => ({ ...prev, cls: metric.value })));
      getFID(metric => setVitals(prev => ({ ...prev, fid: metric.value })));
      getFCP(metric => setVitals(prev => ({ ...prev, fcp: metric.value })));
      getLCP(metric => setVitals(prev => ({ ...prev, lcp: metric.value })));
      getTTFB(metric => setVitals(prev => ({ ...prev, ttfb: metric.value })));
    });
    
    // Memory usage monitoring
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setRenderMetrics(prev => ({
          ...prev,
          heapUsed: memInfo.usedJSHeapSize,
          heapTotal: memInfo.totalJSHeapSize,
          heapLimit: memInfo.jsHeapSizeLimit
        }));
      }
    };
    
    const memoryInterval = setInterval(monitorMemory, 1000);
    
    return () => {
      clearInterval(memoryInterval);
    };
  }, [isMonitoring]);
  
  // React render performance monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Monitor React render times using Profiler
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.name === 'react-render') {
          setRenderMetrics(prev => ({
            ...prev,
            averageRenderTime: (prev.averageRenderTime || 0) + entry.duration,
            renderCount: (prev.renderCount || 0) + 1
          }));
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  const generateReport = useCallback((): PerformanceReport => {
    return {
      timestamp: new Date(),
      vitals,
      renderMetrics,
      hookMetrics,
      wasmMetrics,
      score: calculatePerformanceScore({ vitals, renderMetrics, hookMetrics, wasmMetrics }),
      recommendations: generateRecommendations({ vitals, renderMetrics, hookMetrics, wasmMetrics })
    };
  }, [vitals, renderMetrics, hookMetrics, wasmMetrics]);
  
  return {
    vitals,
    renderMetrics,
    hookMetrics,
    wasmMetrics,
    startMonitoring,
    stopMonitoring: () => setIsMonitoring(false),
    resetMetrics: () => {
      setVitals({});
      setRenderMetrics({});
      setHookMetrics({});
      setWasmMetrics({});
    },
    generateReport,
    exportMetrics: async (format) => {
      const data = { vitals, renderMetrics, hookMetrics, wasmMetrics };
      return format === 'json' ? JSON.stringify(data, null, 2) : convertToCsv(data);
    },
    alerts,
    setAlert: (metric, threshold, condition) => {
      const alert: PerformanceAlert = {
        id: generateId(),
        metric,
        threshold,
        condition,
        active: false,
        triggered: false
      };
      setAlerts(prev => [...prev, alert]);
    },
    clearAlert: (id) => setAlerts(prev => prev.filter(alert => alert.id !== id))
  };
}
```

## Success Criteria

### Testing Requirements
- [ ] 100% test coverage for all hook-based components
- [ ] Test execution time <30 seconds for full suite  
- [ ] WASM testing includes performance benchmarks
- [ ] API testing includes load testing capabilities

### Developer Experience
- [ ] Developer setup time reduced to <5 minutes
- [ ] Zero-configuration debugging for all runtimes
- [ ] Real-time performance monitoring dashboard
- [ ] Automated test generation from API specs

### Quality Assurance
- [ ] Automated accessibility testing for all components
- [ ] Performance regression detection in CI/CD
- [ ] Security testing for all API endpoints
- [ ] Visual regression testing for UI components

## Implementation Timeline

**Week 1-2**: Core testing infrastructure and hook testing utilities
**Week 3-4**: API testing framework and mock server integration
**Week 5-6**: Development tools and debug console
**Week 7-8**: Performance monitoring and analytics
**Week 9-10**: Integration testing and documentation

## Next Steps

1. **PRD-007**: Deployment & Edge Computing Strategy
2. **PRD-008**: Security & Performance Monitoring
3. **PRD-009**: Migration Roadmap & Timeline