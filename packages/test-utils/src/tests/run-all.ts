#!/usr/bin/env deno run --allow-all

import { parseArgs } from 'https://deno.land/std@0.208.0/cli/parse_args.ts';
import { colors } from 'https://deno.land/std@0.208.0/fmt/colors.ts';
import { ensureDir } from 'https://deno.land/std@0.208.0/fs/ensure_dir.ts';
import { join } from 'https://deno.land/std@0.208.0/path/mod.ts';

/**
 * Katalyst Framework Test Runner
 *
 * Orchestrates execution of all test suites across the framework:
 * - Unit tests for each framework (core, remix, nextjs, shared)
 * - Integration tests for cross-framework functionality
 * - Performance tests for multithreading and WebAssembly
 * - End-to-end tests for complete user journeys
 */

interface TestSuite {
  name: string;
  path: string;
  framework: string;
  type: 'unit' | 'integration' | 'performance' | 'e2e';
  parallel: boolean;
  timeout: number;
  dependencies?: string[];
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  errors: string[];
}

interface TestRunnerConfig {
  mode: 'all' | 'unit' | 'integration' | 'performance' | 'e2e' | 'watch';
  frameworks: string[];
  parallel: boolean;
  coverage: boolean;
  reporter: 'default' | 'json' | 'junit' | 'html';
  outputDir: string;
  timeout: number;
  retries: number;
  bail: boolean;
  verbose: boolean;
  watch: boolean;
}

class TestRunner {
  private config: TestRunnerConfig;
  private results: TestResult[] = [];
  private startTime = 0;
  private suites: TestSuite[] = [];

  constructor(config: TestRunnerConfig) {
    this.config = config;
    this.initializeTestSuites();
  }

  private initializeTestSuites() {
    this.suites = [
      // Unit Tests
      {
        name: 'Shared Components',
        path: './tests/unit/shared.test.ts',
        framework: 'shared',
        type: 'unit',
        parallel: true,
        timeout: 30000,
      },
      {
        name: 'Core Framework',
        path: './tests/unit/core.test.ts',
        framework: 'core',
        type: 'unit',
        parallel: true,
        timeout: 45000,
        dependencies: ['shared'],
      },
      {
        name: 'Remix Framework',
        path: './tests/unit/remix.test.ts',
        framework: 'remix',
        type: 'unit',
        parallel: true,
        timeout: 30000,
        dependencies: ['shared'],
      },
      {
        name: 'Next.js Framework',
        path: './tests/unit/nextjs.test.ts',
        framework: 'nextjs',
        type: 'unit',
        parallel: true,
        timeout: 30000,
        dependencies: ['shared'],
      },

      // Integration Tests
      {
        name: 'Cross-Framework Integration',
        path: './tests/integration/cross-framework.test.ts',
        framework: 'all',
        type: 'integration',
        parallel: false,
        timeout: 60000,
        dependencies: ['shared', 'core', 'remix', 'nextjs'],
      },
      {
        name: 'API Integration',
        path: './tests/integration/api.test.ts',
        framework: 'all',
        type: 'integration',
        parallel: true,
        timeout: 45000,
        dependencies: ['shared'],
      },
      {
        name: 'Authentication Integration',
        path: './tests/integration/auth.test.ts',
        framework: 'all',
        type: 'integration',
        parallel: true,
        timeout: 30000,
        dependencies: ['shared'],
      },

      // Performance Tests
      {
        name: 'Multithreading Performance',
        path: './tests/performance/multithreading.test.ts',
        framework: 'core',
        type: 'performance',
        parallel: false,
        timeout: 120000,
        dependencies: ['core'],
      },
      {
        name: 'WebAssembly Performance',
        path: './tests/performance/webassembly.test.ts',
        framework: 'core',
        type: 'performance',
        parallel: false,
        timeout: 90000,
        dependencies: ['core'],
      },
      {
        name: 'Bundle Size Performance',
        path: './tests/performance/bundle-size.test.ts',
        framework: 'all',
        type: 'performance',
        parallel: true,
        timeout: 60000,
      },

      // E2E Tests
      {
        name: 'Complete User Journey',
        path: './tests/e2e/user-journey.test.ts',
        framework: 'all',
        type: 'e2e',
        parallel: false,
        timeout: 300000,
        dependencies: ['shared', 'core', 'remix', 'nextjs'],
      },
      {
        name: 'Cross-Browser Compatibility',
        path: './tests/e2e/cross-browser.test.ts',
        framework: 'all',
        type: 'e2e',
        parallel: true,
        timeout: 180000,
        dependencies: ['shared'],
      },
      {
        name: 'Accessibility Testing',
        path: './tests/e2e/accessibility.test.ts',
        framework: 'all',
        type: 'e2e',
        parallel: true,
        timeout: 120000,
      },
    ];
  }

  async run(): Promise<boolean> {
    this.startTime = Date.now();

    this.printHeader();
    await this.setupOutputDirectory();

    const suitesToRun = this.filterSuites();

    if (suitesToRun.length === 0) {
      console.log(colors.yellow('⚠️  No test suites match the specified criteria'));
      return true;
    }

    this.printRunConfiguration(suitesToRun);

    if (this.config.watch) {
      return this.runWatchMode(suitesToRun);
    }

    return this.runTestSuites(suitesToRun);
  }

  private printHeader() {
    console.log(colors.cyan('🧪 Katalyst Framework Test Suite Runner'));
    console.log(colors.cyan('========================================='));
    console.log();
  }

  private async setupOutputDirectory() {
    await ensureDir(this.config.outputDir);
    await ensureDir(join(this.config.outputDir, 'coverage'));
    await ensureDir(join(this.config.outputDir, 'reports'));
  }

  private filterSuites(): TestSuite[] {
    let filtered = this.suites;

    // Filter by mode
    if (this.config.mode !== 'all') {
      filtered = filtered.filter((suite) => suite.type === this.config.mode);
    }

    // Filter by frameworks
    if (this.config.frameworks.length > 0 && !this.config.frameworks.includes('all')) {
      filtered = filtered.filter(
        (suite) => this.config.frameworks.includes(suite.framework) || suite.framework === 'all'
      );
    }

    return filtered;
  }

  private printRunConfiguration(suites: TestSuite[]) {
    console.log(colors.bold('📋 Test Run Configuration:'));
    console.log(`   Mode: ${colors.green(this.config.mode)}`);
    console.log(`   Frameworks: ${colors.green(this.config.frameworks.join(', ') || 'all')}`);
    console.log(`   Parallel: ${colors.green(this.config.parallel ? 'enabled' : 'disabled')}`);
    console.log(`   Coverage: ${colors.green(this.config.coverage ? 'enabled' : 'disabled')}`);
    console.log(`   Reporter: ${colors.green(this.config.reporter)}`);
    console.log(`   Suites to run: ${colors.green(suites.length.toString())}`);
    console.log();

    if (this.config.verbose) {
      console.log(colors.bold('📝 Test Suites:'));
      suites.forEach((suite) => {
        console.log(`   ${colors.blue('•')} ${suite.name} (${suite.type}/${suite.framework})`);
      });
      console.log();
    }
  }

  private async runTestSuites(suites: TestSuite[]): Promise<boolean> {
    const dependencyOrder = this.resolveDependencies(suites);
    let success = true;

    for (const batch of dependencyOrder) {
      if (this.config.parallel && batch.length > 1) {
        const results = await Promise.allSettled(batch.map((suite) => this.runSingleSuite(suite)));

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(colors.red(`❌ Suite "${batch[index].name}" failed: ${result.reason}`));
            success = false;
          } else {
            this.results.push(result.value);
            if (result.value.failed > 0) {
              success = false;
            }
          }
        });
      } else {
        for (const suite of batch) {
          try {
            const result = await this.runSingleSuite(suite);
            this.results.push(result);

            if (result.failed > 0) {
              success = false;

              if (this.config.bail) {
                console.log(colors.red('🛑 Stopping due to test failure (--bail flag)'));
                break;
              }
            }
          } catch (error) {
            console.error(colors.red(`❌ Suite "${suite.name}" failed: ${error.message}`));
            success = false;

            if (this.config.bail) {
              console.log(colors.red('🛑 Stopping due to test failure (--bail flag)'));
              break;
            }
          }
        }
      }

      if (!success && this.config.bail) {
        break;
      }
    }

    await this.generateReports();
    this.printSummary();

    return success;
  }

  private resolveDependencies(suites: TestSuite[]): TestSuite[][] {
    const suiteMap = new Map(suites.map((suite) => [suite.framework, suite]));
    const resolved: TestSuite[][] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (suite: TestSuite): number => {
      if (visiting.has(suite.framework)) {
        throw new Error(`Circular dependency detected: ${suite.framework}`);
      }

      if (visited.has(suite.framework)) {
        return resolved.findIndex((batch) => batch.includes(suite));
      }

      visiting.add(suite.framework);
      let maxDepth = -1;

      if (suite.dependencies) {
        for (const dep of suite.dependencies) {
          const depSuite = suiteMap.get(dep);
          if (depSuite) {
            maxDepth = Math.max(maxDepth, visit(depSuite));
          }
        }
      }

      visiting.delete(suite.framework);
      visited.add(suite.framework);

      const depth = maxDepth + 1;
      if (!resolved[depth]) {
        resolved[depth] = [];
      }
      resolved[depth].push(suite);

      return depth;
    };

    suites.forEach((suite) => {
      if (!visited.has(suite.framework)) {
        visit(suite);
      }
    });

    return resolved.filter((batch) => batch.length > 0);
  }

  private async runSingleSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();

    console.log(colors.blue(`🏃 Running ${suite.name}...`));

    const result: TestResult = {
      suite: suite.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };

    try {
      // Check if test file exists
      try {
        await Deno.stat(suite.path);
      } catch {
        throw new Error(`Test file not found: ${suite.path}`);
      }

      // Build test command
      const cmd = this.buildTestCommand(suite);

      // Run the test
      const process = new Deno.Command(cmd.command, {
        args: cmd.args,
        stdout: 'piped',
        stderr: 'piped',
        cwd: Deno.cwd(),
      });

      const { code, stdout, stderr } = await process.output();

      result.duration = Date.now() - startTime;

      if (code === 0) {
        // Parse test output for metrics
        const output = new TextDecoder().decode(stdout);
        result.passed = this.parseTestCount(output, 'passed') || 1;
        result.failed = 0;
        result.skipped = this.parseTestCount(output, 'skipped') || 0;

        if (this.config.coverage) {
          result.coverage = this.parseCoverage(output);
        }

        console.log(colors.green(`✅ ${suite.name} passed (${result.duration}ms)`));

        if (this.config.verbose) {
          console.log(colors.gray(`   Tests: ${result.passed} passed, ${result.skipped} skipped`));
          if (result.coverage !== undefined) {
            console.log(colors.gray(`   Coverage: ${result.coverage}%`));
          }
        }
      } else {
        const errorOutput = new TextDecoder().decode(stderr);
        result.failed = this.parseTestCount(errorOutput, 'failed') || 1;
        result.errors.push(errorOutput);

        console.log(colors.red(`❌ ${suite.name} failed (${result.duration}ms)`));

        if (this.config.verbose) {
          console.log(colors.red(`   Error: ${errorOutput.slice(0, 200)}...`));
        }
      }
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.failed = 1;
      result.errors.push(error.message);

      console.log(colors.red(`❌ ${suite.name} errored: ${error.message}`));
    }

    return result;
  }

  private buildTestCommand(suite: TestSuite): { command: string; args: string[] } {
    const args = ['test', '--allow-all', '--config=./deno.test.config.ts'];

    if (this.config.coverage) {
      args.push('--coverage=./tests/coverage');
    }

    if (this.config.parallel && suite.parallel) {
      args.push('--parallel');
    }

    if (suite.timeout) {
      args.push(`--timeout=${suite.timeout}`);
    }

    if (this.config.reporter === 'json') {
      args.push('--reporter=json');
    }

    args.push(suite.path);

    return { command: 'deno', args };
  }

  private parseTestCount(output: string, type: 'passed' | 'failed' | 'skipped'): number | null {
    const patterns = {
      passed: /(\d+)\s+passed/i,
      failed: /(\d+)\s+failed/i,
      skipped: /(\d+)\s+skipped/i,
    };

    const match = output.match(patterns[type]);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  private parseCoverage(output: string): number | undefined {
    const match = output.match(/coverage:\s*(\d+(?:\.\d+)?)%/i);
    return match ? Number.parseFloat(match[1]) : undefined;
  }

  private async generateReports() {
    console.log(colors.blue('📊 Generating reports...'));

    // Generate JSON report
    if (this.config.reporter === 'json' || this.config.reporter === 'html') {
      await this.generateJsonReport();
    }

    // Generate JUnit report
    if (this.config.reporter === 'junit') {
      await this.generateJunitReport();
    }

    // Generate HTML report
    if (this.config.reporter === 'html') {
      await this.generateHtmlReport();
    }

    // Generate coverage report
    if (this.config.coverage) {
      await this.generateCoverageReport();
    }
  }

  private async generateJsonReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      config: this.config,
      results: this.results,
      summary: this.getSummary(),
    };

    const reportPath = join(this.config.outputDir, 'reports', 'test-results.json');
    await Deno.writeTextFile(reportPath, JSON.stringify(report, null, 2));

    if (this.config.verbose) {
      console.log(colors.gray(`   JSON report: ${reportPath}`));
    }
  }

  private async generateJunitReport() {
    const xml = this.buildJunitXml();
    const reportPath = join(this.config.outputDir, 'reports', 'junit.xml');
    await Deno.writeTextFile(reportPath, xml);

    if (this.config.verbose) {
      console.log(colors.gray(`   JUnit report: ${reportPath}`));
    }
  }

  private async generateHtmlReport() {
    const html = this.buildHtmlReport();
    const reportPath = join(this.config.outputDir, 'reports', 'test-report.html');
    await Deno.writeTextFile(reportPath, html);

    if (this.config.verbose) {
      console.log(colors.gray(`   HTML report: ${reportPath}`));
    }
  }

  private async generateCoverageReport() {
    try {
      const process = new Deno.Command('deno', {
        args: ['coverage', './tests/coverage', '--html', '--output=./tests/output/coverage/html'],
      });

      await process.output();

      if (this.config.verbose) {
        console.log(colors.gray(`   Coverage report: ./tests/output/coverage/html`));
      }
    } catch (error) {
      console.warn(colors.yellow(`⚠️  Could not generate coverage report: ${error.message}`));
    }
  }

  private buildJunitXml(): string {
    const summary = this.getSummary();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites name="Katalyst Framework Tests" tests="${summary.total}" failures="${summary.failed}" time="${summary.duration / 1000}">\n`;

    this.results.forEach((result) => {
      xml += `  <testsuite name="${result.suite}" tests="${result.passed + result.failed + result.skipped}" failures="${result.failed}" skipped="${result.skipped}" time="${result.duration / 1000}">\n`;

      // Add individual test cases (simplified)
      for (let i = 0; i < result.passed; i++) {
        xml += `    <testcase name="test-${i}" time="0" />\n`;
      }

      result.errors.forEach((error, index) => {
        xml += `    <testcase name="failed-test-${index}" time="0">\n`;
        xml += `      <failure message="Test failed">${this.escapeXml(error)}</failure>\n`;
        xml += `    </testcase>\n`;
      });

      xml += '  </testsuite>\n';
    });

    xml += '</testsuites>\n';
    return xml;
  }

  private buildHtmlReport(): string {
    const summary = this.getSummary();

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Katalyst Framework Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; }
    .suite-header { background: #e9e9e9; padding: 10px; font-weight: bold; }
    .suite-content { padding: 10px; }
    .passed { color: #28a745; }
    .failed { color: #dc3545; }
    .skipped { color: #ffc107; }
  </style>
</head>
<body>
  <h1>Katalyst Framework Test Report</h1>

  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Tests:</strong> ${summary.total}</p>
    <p><strong>Passed:</strong> <span class="passed">${summary.passed}</span></p>
    <p><strong>Failed:</strong> <span class="failed">${summary.failed}</span></p>
    <p><strong>Skipped:</strong> <span class="skipped">${summary.skipped}</span></p>
    <p><strong>Duration:</strong> ${(summary.duration / 1000).toFixed(2)}s</p>
    <p><strong>Success Rate:</strong> ${((summary.passed / summary.total) * 100).toFixed(1)}%</p>
  </div>

  <h2>Test Suites</h2>
  ${this.results
    .map(
      (result) => `
    <div class="suite">
      <div class="suite-header">${result.suite}</div>
      <div class="suite-content">
        <p><strong>Passed:</strong> <span class="passed">${result.passed}</span></p>
        <p><strong>Failed:</strong> <span class="failed">${result.failed}</span></p>
        <p><strong>Skipped:</strong> <span class="skipped">${result.skipped}</span></p>
        <p><strong>Duration:</strong> ${result.duration}ms</p>
        ${result.coverage ? `<p><strong>Coverage:</strong> ${result.coverage}%</p>` : ''}
        ${
          result.errors.length > 0
            ? `
          <h4>Errors:</h4>
          <pre style="background: #f8f8f8; padding: 10px; overflow: auto;">${result.errors.join('\n\n')}</pre>
        `
            : ''
        }
      </div>
    </div>
  `
    )
    .join('')}

  <footer style="margin-top: 40px; color: #666; font-size: 12px;">
    Generated on ${new Date().toISOString()} by Katalyst Test Runner
  </footer>
</body>
</html>
    `;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getSummary() {
    const total = this.results.reduce(
      (sum, result) => sum + result.passed + result.failed + result.skipped,
      0
    );
    const passed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const failed = this.results.reduce((sum, result) => sum + result.failed, 0);
    const skipped = this.results.reduce((sum, result) => sum + result.skipped, 0);
    const duration = Date.now() - this.startTime;

    return { total, passed, failed, skipped, duration };
  }

  private printSummary() {
    const summary = this.getSummary();

    console.log();
    console.log(colors.bold('📊 Test Summary:'));
    console.log(`   Total: ${colors.cyan(summary.total.toString())}`);
    console.log(`   Passed: ${colors.green(summary.passed.toString())}`);
    console.log(`   Failed: ${colors.red(summary.failed.toString())}`);
    console.log(`   Skipped: ${colors.yellow(summary.skipped.toString())}`);
    console.log(`   Duration: ${colors.blue(`${(summary.duration / 1000).toFixed(2)}s`)}`);

    if (summary.total > 0) {
      const successRate = (summary.passed / summary.total) * 100;
      console.log(
        `   Success Rate: ${successRate >= 90 ? colors.green : successRate >= 70 ? colors.yellow : colors.red}${successRate.toFixed(1)}%`
      );
    }

    console.log();

    if (summary.failed === 0) {
      console.log(colors.green('🎉 All tests passed!'));
    } else {
      console.log(colors.red(`❌ ${summary.failed} test(s) failed`));
    }
  }

  private async runWatchMode(suites: TestSuite[]): Promise<boolean> {
    console.log(colors.blue('👀 Running in watch mode...'));
    console.log(colors.gray('Press Ctrl+C to exit'));

    let running = false;

    const runTests = async () => {
      if (running) return;
      running = true;

      console.clear();
      this.printHeader();
      console.log(colors.blue('🔄 Re-running tests...'));

      await this.runTestSuites(suites);

      running = false;
    };

    // Watch for file changes
    const watcher = Deno.watchFs(['./tests', './shared', './core', './remix', './next']);

    let debounceTimer: number | undefined;

    for await (const event of watcher) {
      if (
        event.kind === 'modify' &&
        event.paths.some((path) => path.endsWith('.ts') || path.endsWith('.tsx'))
      ) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runTests, 1000); // Debounce 1 second
      }
    }

    return true;
  }
}

// CLI Interface
async function main() {
  const args = parseArgs(Deno.args, {
    string: ['mode', 'frameworks', 'reporter', 'output-dir'],
    boolean: ['parallel', 'coverage', 'bail', 'verbose', 'watch', 'help'],
    default: {
      mode: 'all',
      frameworks: '',
      parallel: true,
      coverage: false,
      reporter: 'default',
      'output-dir': './tests/output',
      timeout: 60000,
      retries: 0,
      bail: false,
      verbose: false,
      watch: false,
    },
    alias: {
      h: 'help',
      m: 'mode',
      f: 'frameworks',
      p: 'parallel',
      c: 'coverage',
      r: 'reporter',
      o: 'output-dir',
      v: 'verbose',
      w: 'watch',
    },
  });

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  const config: TestRunnerConfig = {
    mode: args.mode as TestRunnerConfig['mode'],
    frameworks: args.frameworks ? args.frameworks.split(',').map((f) => f.trim()) : [],
    parallel: args.parallel,
    coverage: args.coverage,
    reporter: args.reporter as TestRunnerConfig['reporter'],
    outputDir: args['output-dir'],
    timeout: args.timeout,
    retries: args.retries,
    bail: args.bail,
    verbose: args.verbose,
    watch: args.watch,
  };

  const runner = new TestRunner(config);

  try {
    const success = await runner.run();
    Deno.exit(success ? 0 : 1);
  } catch (error) {
    console.error(colors.red(`💥 Test runner failed: ${error.message}`));
    if (config.verbose) {
      console.error(error.stack);
    }
    Deno.exit(1);
  }
}

function printHelp() {
  console.log(`
${colors.cyan('Katalyst Framework Test Runner')}

${colors.bold('USAGE:')}
  deno run --allow-all tests/run-all.ts [OPTIONS]

${colors.bold('OPTIONS:')}
  -m, --mode <MODE>           Test mode: all, unit, integration, performance, e2e [default: all]
  -f, --frameworks <LIST>     Comma-separated frameworks: core,remix,nextjs,shared [default: all]
  -p, --parallel              Enable parallel test execution [default: true]
  -c, --coverage              Enable coverage reporting [default: false]
  -r, --reporter <REPORTER>   Reporter type: default, json, junit, html [default: default]
  -o, --output-dir <DIR>      Output directory for reports [default: ./tests/output]
  --timeout <MS>              Test timeout in milliseconds [default: 60000]
  --retries <NUM>             Number of retries for failed tests [default: 0]
  --bail                      Stop on first test failure [default: false]
  -v, --verbose               Enable verbose output [default: false]
  -w, --watch                 Enable watch mode [default: false]
  -h, --help                  Show this help message

${colors.bold('EXAMPLES:')}
  # Run all tests
  deno run --allow-all tests/run-all.ts

  # Run only unit tests
  deno run --allow-all tests/run-all.ts --mode unit

  # Run tests for specific frameworks
  deno run --allow-all tests/run-all.ts --frameworks core,shared

  # Run with coverage
  deno run --allow-all tests/run-all.ts --coverage --reporter html

  # Run in watch mode
  deno run --allow-all tests/run-all.ts --watch

  # Run performance tests only
  deno run --allow-all tests/run-all.ts --mode performance --verbose
`);
}

if (import.meta.main) {
  await main();
}
