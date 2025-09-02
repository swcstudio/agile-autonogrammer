# Katalyst Framework Testing Suite

A state-of-the-art testing kit for the Katalyst-React Framework using Deno and rstest-style patterns. This comprehensive testing suite validates all three meta frameworks (Core, Remix, Next.js) individually and together.

## 🏗️ Architecture Overview

The testing suite is built with a multi-layered architecture designed for scalability, performance, and comprehensive coverage:

```
tests/
├── unit/                    # Unit tests for individual components/functions
│   ├── shared.test.ts      # Shared components and utilities
│   ├── core.test.ts        # Core framework (TanStack Router)
│   ├── remix.test.ts       # Remix admin dashboard
│   └── nextjs.test.ts      # Next.js marketing site
├── integration/             # Cross-framework integration tests
│   ├── cross-framework.test.ts    # Framework interoperability
│   ├── api.test.ts               # API consistency
│   └── auth.test.ts              # Authentication flow
├── performance/             # Performance and load testing
│   ├── multithreading.test.ts    # Web Workers and multithreading
│   ├── webassembly.test.ts       # WebAssembly performance
│   └── bundle-size.test.ts       # Bundle optimization
├── e2e/                    # End-to-end user journey tests
│   ├── user-journey.test.ts      # Complete user workflows
│   ├── cross-browser.test.ts     # Browser compatibility
│   └── accessibility.test.ts     # A11y compliance
├── fixtures/               # Test data and mocks
│   └── shared.fixtures.ts
├── utils/                  # Testing utilities
└── run-all.ts             # Main test runner orchestrator
```

## 🚀 Quick Start

### Running All Tests

```bash
# Run the complete test suite
deno task test

# Run with coverage
deno task test:coverage

# Run in watch mode
deno task test:watch
```

### Running Specific Test Types

```bash
# Unit tests only
deno task test:unit

# Integration tests
deno task test:integration

# Performance tests
deno task test:performance

# End-to-end tests
deno task test:e2e
```

### Running Framework-Specific Tests

```bash
# Test shared components
deno task test:shared

# Test Core framework
deno task test:core

# Test Remix framework
deno task test:remix

# Test Next.js framework
deno task test:next
```

## 🧪 Test Types

### 1. Unit Tests

**Purpose**: Test individual components, functions, and modules in isolation.

**Features**:
- RSTest-style parameterized testing
- Mock React components and hooks
- Framework-specific router testing
- Shared component validation
- Type safety verification

**Example**:
```typescript
import { parametrize, TestCase } from '../test.config.ts';

const componentTestCases: TestCase[] = [
  {
    name: 'should render with default props',
    input: { theme: 'light', mode: 'default' },
    expected: { rendered: true, theme: 'light' }
  }
];

parametrize(componentTestCases, async (input, expected) => {
  const component = createMockComponent('MyComponent', input);
  assertEquals(component.props.theme, expected.theme);
});
```

### 2. Integration Tests

**Purpose**: Validate cross-framework functionality and data flow.

**Features**:
- Cross-framework component sharing
- State synchronization testing
- API consistency validation
- Router integration testing
- Event system verification

**Key Areas**:
- Shared component usage across frameworks
- Authentication flow consistency
- Data persistence and caching
- Performance optimization sharing

### 3. Performance Tests

**Purpose**: Ensure optimal performance across all frameworks and advanced features.

**Features**:
- Multithreading and Web Worker testing
- WebAssembly performance benchmarking
- Bundle size optimization verification
- Memory usage monitoring
- Real-time performance metrics

**Benchmarks**:
- Component render time < 16ms (60fps)
- Worker thread communication < 100ms
- WASM operations competitive with JavaScript
- Bundle sharing efficiency > 80%

### 4. End-to-End Tests

**Purpose**: Validate complete user journeys across all frameworks.

**Features**:
- Full user workflow testing
- Cross-browser compatibility
- Accessibility compliance (WCAG 2.1)
- SEO and meta tag validation
- Performance monitoring

**User Journeys**:
- Marketing site → Sign up → App onboarding
- Admin dashboard workflows
- Cross-framework navigation
- Authentication and session management

## ⚙️ Configuration

### Test Runner Options

```bash
# Basic usage
deno run --allow-all tests/run-all.ts [OPTIONS]

# Available options:
--mode <MODE>              # all, unit, integration, performance, e2e
--frameworks <LIST>        # core,remix,nextjs,shared
--parallel                 # Enable parallel execution
--coverage                 # Enable coverage reporting
--reporter <TYPE>          # default, json, junit, html
--output-dir <DIR>         # Output directory for reports
--timeout <MS>             # Test timeout (default: 60000)
--bail                     # Stop on first failure
--verbose                  # Detailed output
--watch                    # Watch mode for development
```

### Test Configuration Files

#### `deno.test.config.ts`
```typescript
export default defineConfig({
  include: [
    "core/src/**/*.{test,spec}.{js,ts,jsx,tsx}",
    "remix/app/**/*.{test,spec}.{js,ts,jsx,tsx}",
    "next/src/**/*.{test,spec}.{js,ts,jsx,tsx}",
    "shared/src/**/*.{test,spec}.{js,ts,jsx,tsx}",
    "tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}",
  ],
  coverage: {
    thresholds: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
});
```

## 📝 Writing Tests

### Test Structure

```typescript
import {
  describe,
  it,
  beforeAll,
  afterAll,
  assertEquals,
  parametrize,
  TestSuiteBuilder
} from '../test.config.ts';

const testSuite = new TestSuiteBuilder();

testSuite
  .framework('my-framework', testConfig.core, () => {
    let fixtureManager: FixtureManager;

    beforeAll(async () => {
      fixtureManager = new FixtureManager();
      // Setup fixtures
    });

    afterAll(async () => {
      await fixtureManager.cleanup();
    });

    describe('Component Tests', () => {
      it('should test functionality', () => {
        // Test implementation
      });
    });
  })
  .run();
```

### Parameterized Testing (RSTest-style)

```typescript
const testCases = [
  {
    name: 'valid input',
    input: { value: 42 },
    expected: { valid: true },
    setup: async () => { /* setup logic */ }
  },
  {
    name: 'invalid input',
    input: { value: -1 },
    expected: { valid: false }
  }
];

parametrize(testCases, async (input, expected) => {
  const result = validateInput(input);
  assertEquals(result.valid, expected.valid);
});
```

### Fixture Management

```typescript
// Register fixtures
await fixtureManager.register(
  'user-data',
  async () => ({ id: 1, name: 'Test User' }),
  async (userData) => { /* cleanup */ }
);

// Use fixtures
const userData = fixtureManager.get('user-data');
```

### Mock Components

```typescript
const mockComponent = frameworkUtils.createMockReactComponent(
  'MyComponent',
  { prop1: 'value1', prop2: 'value2' }
);
```

## 🎯 Framework-Specific Testing

### Core Framework (TanStack Router)

**Focus Areas**:
- Router navigation and state management
- Multithreading and Web Worker integration
- WebAssembly module testing
- Performance optimization validation
- Web3 and AI integration testing

**Key Tests**:
```typescript
// Router testing
const router = frameworkUtils.createMockRouter('core');
await router.navigate('/dashboard');
assertEquals(router.navigate.calls.length, 1);

// Worker testing
const result = await MultithreadingTestUtils.testWorkerCommunication(
  'worker-script.js',
  { operation: 'factorial', value: 10 }
);
```

### Remix Framework (Admin Dashboard)

**Focus Areas**:
- Server-side rendering and hydration
- Loader and action functions
- Admin dashboard functionality
- Data management and caching
- Form handling and validation

**Key Tests**:
```typescript
// Loader testing
const loader = frameworks.remix.loader;
const data = await loader();
assertEquals(data.success, true);

// Action testing
const action = frameworks.remix.action;
const result = await action(formData);
assertEquals(result.redirect, '/success');
```

### Next.js Framework (Marketing Site)

**Focus Areas**:
- Static site generation (SSG)
- Server-side rendering (SSR)
- API routes and serverless functions
- SEO and meta tag optimization
- CMS integration (Payload)

**Key Tests**:
```typescript
// SSG testing
const staticProps = await getStaticProps();
assertEquals(staticProps.props.title, 'Expected Title');

// API route testing
const apiHandler = nextjsRoutes.get('/api/contact');
const response = await apiHandler.handler(mockRequest);
assertEquals(response.status, 200);
```

### Shared Components

**Focus Areas**:
- Cross-framework component compatibility
- Design system consistency
- Utility function reliability
- Type definition accuracy
- Hook functionality across frameworks

## 🚀 Performance Testing

### Multithreading Tests

```typescript
// Worker performance
const { duration } = await PerformanceTestUtils.measureExecutionTime(
  () => computeInWorker(complexData)
);
assertEquals(duration < 1000, true);

// Parallel execution
const results = await Promise.all(
  tasks.map(task => executeInWorker(task))
);
```

### WebAssembly Tests

```typescript
// WASM vs JavaScript benchmarking
const jsBenchmark = await PerformanceTestUtils.benchmarkFunction(
  () => jsImplementation(data), 1000
);

const wasmBenchmark = await PerformanceTestUtils.benchmarkFunction(
  () => wasmModule.exports.optimizedFunction(data), 1000
);

const speedup = jsBenchmark.avg / wasmBenchmark.avg;
assertEquals(speedup > 0.8, true); // WASM should be competitive
```

### Memory Management

```typescript
const { memoryDelta } = await PerformanceTestUtils.measureMemoryUsage(
  () => performMemoryIntensiveOperation()
);
assertEquals(Math.abs(memoryDelta) < 50 * 1024 * 1024, true); // < 50MB
```

## 🔍 Coverage and Reporting

### Coverage Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Report Formats

1. **Console Output**: Real-time test results
2. **JSON**: Machine-readable results for CI/CD
3. **JUnit XML**: Jenkins/CI integration
4. **HTML**: Human-readable detailed reports
5. **Coverage HTML**: Interactive coverage reports

### Viewing Reports

```bash
# Generate HTML report
deno task test:coverage

# View coverage report
open tests/output/coverage/html/index.html

# View test report
open tests/output/reports/test-report.html
```

## 🔧 CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x
      
      - name: Run tests
        run: deno task test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./tests/output/coverage/lcov.info
```

### Test Matrix

```yaml
strategy:
  matrix:
    test-type: [unit, integration, performance, e2e]
    framework: [core, remix, nextjs, shared]
```

## 🔧 Development Workflow

### Watch Mode Development

```bash
# Start watch mode for active development
deno task test:watch

# Watch specific framework
deno task test:core --watch

# Watch with coverage
deno task test:coverage --watch
```

### Pre-commit Testing

```bash
# Quick unit tests before commit
deno task test:unit --bail

# Full test suite before push
deno task test --coverage
```

## 🐛 Troubleshooting

### Common Issues

**1. Permission Errors**
```bash
# Ensure all permissions are granted
deno run --allow-all tests/run-all.ts
```

**2. Timeout Issues**
```bash
# Increase timeout for slow tests
deno task test --timeout 120000
```

**3. Memory Issues**
```bash
# Clean up test artifacts
deno task test:clean

# Run tests with less parallelism
deno task test --parallel false
```

**4. Coverage Issues**
```bash
# Clear coverage cache
rm -rf tests/coverage

# Run coverage with fresh state
deno task test:coverage
```

### Debug Mode

```bash
# Enable verbose logging
deno task test:verbose

# Debug specific test
deno test --allow-all --inspect-brk tests/unit/core.test.ts
```

## 📚 Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Keep tests focused and atomic
- Use fixtures for complex test data

### 2. Performance
- Use parallel execution for independent tests
- Mock external dependencies
- Clean up resources in afterAll/afterEach
- Use realistic but minimal test data

### 3. Maintainability
- Keep test code DRY with utilities
- Use parameterized tests for similar scenarios
- Document complex test logic
- Regular test review and refactoring

### 4. CI/CD
- Run fast tests first (fail fast)
- Use appropriate timeouts
- Generate artifacts for debugging
- Monitor test performance over time

## 🤝 Contributing

### Adding New Tests

1. **Choose the appropriate test type**:
   - Unit: Testing individual components/functions
   - Integration: Testing interactions between components
   - Performance: Testing speed/memory/efficiency
   - E2E: Testing complete user workflows

2. **Follow naming conventions**:
   - `*.test.ts` for test files
   - `*.fixtures.ts` for test data
   - Descriptive test and describe block names

3. **Use the test utilities**:
   - FixtureManager for test data
   - PerformanceTestUtils for benchmarks
   - SecurityTestUtils for security validation
   - MultithreadingTestUtils for worker testing

4. **Update documentation**:
   - Add new test scenarios to this README
   - Document any new testing utilities
   - Update CI/CD configuration if needed

### Code Quality

- All tests must pass locally before submission
- Maintain or improve coverage thresholds
- Follow TypeScript strict mode requirements
- Use consistent code formatting (Biome)

## 📊 Metrics and Monitoring

### Key Performance Indicators

- **Test Coverage**: >80% across all metrics
- **Test Execution Time**: <5 minutes for full suite
- **Flaky Test Rate**: <1% of total tests
- **Bug Detection Rate**: Issues caught before production

### Performance Benchmarks

- **Component Render**: <16ms (60fps target)
- **API Response**: <200ms average
- **Bundle Size**: <500KB per framework
- **Memory Usage**: <100MB delta per test suite

## 🔮 Future Enhancements

### Planned Features

1. **Visual Regression Testing**: Screenshot-based UI testing
2. **Load Testing**: High-traffic scenario simulation
3. **Chaos Engineering**: Fault injection testing
4. **Mobile Testing**: React Native integration testing
5. **AI-Powered Test Generation**: Automated test creation

### Framework Evolution

As the Katalyst Framework evolves, the testing suite will expand to cover:
- New framework integrations
- Advanced WebAssembly features
- Enhanced multithreading capabilities
- Emerging Web3 and AI technologies

---

**Happy Testing! 🧪✨**

For questions, issues, or contributions, please refer to the main project repository and documentation.