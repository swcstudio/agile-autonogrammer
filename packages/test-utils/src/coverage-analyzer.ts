import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { TestCoverageReport, TestMetrics, TestSuggestion } from './types';

export class CoverageAnalyzer {
  private coverageThresholds = {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  };

  async analyzeCoverage(coveragePath: string): Promise<TestCoverageReport> {
    // Read Deno coverage output
    const coverageData = await this.readCoverageData(coveragePath);

    return {
      statements: this.calculateMetric(coverageData.statements),
      branches: this.calculateMetric(coverageData.branches),
      functions: this.calculateMetric(coverageData.functions),
      lines: this.calculateMetric(coverageData.lines),
    };
  }

  private calculateMetric(data: { total: number; covered: number }) {
    const percentage = data.total > 0 ? (data.covered / data.total) * 100 : 100;
    return {
      total: data.total,
      covered: data.covered,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  async findUncoveredCode(coveragePath: string): Promise<Map<string, number[]>> {
    const uncoveredFiles = new Map<string, number[]>();
    const coverageData = await this.readCoverageData(coveragePath);

    for (const [file, fileCoverage] of Object.entries(coverageData.files)) {
      const uncoveredLines: number[] = [];

      for (const [line, count] of Object.entries(fileCoverage.lines)) {
        if (count === 0) {
          uncoveredLines.push(Number.parseInt(line));
        }
      }

      if (uncoveredLines.length > 0) {
        uncoveredFiles.set(file, uncoveredLines);
      }
    }

    return uncoveredFiles;
  }

  async generateCoverageReport(
    coveragePath: string,
    format: 'html' | 'json' | 'lcov' | 'text' = 'html'
  ): Promise<string> {
    const coverage = await this.analyzeCoverage(coveragePath);

    switch (format) {
      case 'html':
        return this.generateHTMLReport(coverage);
      case 'json':
        return JSON.stringify(coverage, null, 2);
      case 'lcov':
        return this.generateLCOVReport(coverage);
      case 'text':
        return this.generateTextReport(coverage);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateHTMLReport(coverage: TestCoverageReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Katalyst Coverage Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 40px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-value { font-size: 2em; font-weight: bold; }
    .good { color: #28a745; }
    .warning { color: #ffc107; }
    .bad { color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    .bar { height: 20px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; transition: width 0.3s; }
    .bar-fill.good { background: #28a745; }
    .bar-fill.warning { background: #ffc107; }
    .bar-fill.bad { background: #dc3545; }
  </style>
</head>
<body>
  <h1>Katalyst Coverage Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    ${this.renderMetric('Statements', coverage.statements)}
    ${this.renderMetric('Branches', coverage.branches)}
    ${this.renderMetric('Functions', coverage.functions)}
    ${this.renderMetric('Lines', coverage.lines)}
  </div>
  
  <h2>File Coverage</h2>
  <table>
    <thead>
      <tr>
        <th>File</th>
        <th>Statements</th>
        <th>Branches</th>
        <th>Functions</th>
        <th>Lines</th>
        <th>Coverage</th>
      </tr>
    </thead>
    <tbody id="file-coverage">
      <!-- File coverage will be inserted here -->
    </tbody>
  </table>
  
  <script>
    // Add interactive features
    document.querySelectorAll('.bar').forEach(bar => {
      const fill = bar.querySelector('.bar-fill');
      const percentage = parseFloat(fill.dataset.percentage);
      setTimeout(() => fill.style.width = percentage + '%', 100);
    });
  </script>
</body>
</html>`;
  }

  private renderMetric(
    name: string,
    metric: { percentage: number; covered: number; total: number }
  ): string {
    const status = this.getStatus(metric.percentage);
    return `
<div class="metric">
  <div class="metric-name">${name}</div>
  <div class="metric-value ${status}">${metric.percentage}%</div>
  <div class="metric-detail">${metric.covered}/${metric.total}</div>
  <div class="bar">
    <div class="bar-fill ${status}" data-percentage="${metric.percentage}" style="width: 0"></div>
  </div>
</div>`;
  }

  private getStatus(percentage: number): string {
    if (percentage >= 80) return 'good';
    if (percentage >= 60) return 'warning';
    return 'bad';
  }

  private generateTextReport(coverage: TestCoverageReport): string {
    const separator = '='.repeat(60);
    return `
${separator}
KATALYST COVERAGE REPORT
${separator}

SUMMARY
-------
Statements : ${this.formatMetric(coverage.statements)}
Branches   : ${this.formatMetric(coverage.branches)}
Functions  : ${this.formatMetric(coverage.functions)}
Lines      : ${this.formatMetric(coverage.lines)}

${separator}
`;
  }

  private formatMetric(metric: { percentage: number; covered: number; total: number }): string {
    const bar = this.generateTextBar(metric.percentage);
    return `${metric.percentage.toFixed(2)}% ${bar} (${metric.covered}/${metric.total})`;
  }

  private generateTextBar(percentage: number, width = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  private generateLCOVReport(coverage: TestCoverageReport): string {
    // Generate LCOV format for compatibility with tools
    return `TN:
SF:src/example.ts
FN:1,exampleFunction
FNDA:1,exampleFunction
FNF:${coverage.functions.total}
FNH:${coverage.functions.covered}
DA:1,1
DA:2,1
DA:3,0
LF:${coverage.lines.total}
LH:${coverage.lines.covered}
end_of_record`;
  }

  async suggestMissingTests(sourcePath: string, testPath: string): Promise<TestSuggestion[]> {
    const suggestions: TestSuggestion[] = [];

    // Find source files without corresponding test files
    const sourceFiles = await this.findFiles(sourcePath, /\.(ts|tsx)$/);
    const testFiles = await this.findFiles(testPath, /\.test\.(ts|tsx)$/);

    const testFileSet = new Set(testFiles.map((f) => f.replace(/\.test\.(ts|tsx)$/, '')));

    for (const sourceFile of sourceFiles) {
      const baseName = sourceFile.replace(/\.(ts|tsx)$/, '');
      if (!testFileSet.has(baseName)) {
        suggestions.push({
          type: 'missing-test',
          severity: 'high',
          description: `Missing test file for ${sourceFile}`,
          code: `Create test file: ${baseName}.test.tsx`,
        });
      }
    }

    // Analyze existing tests for improvements
    for (const testFile of testFiles) {
      const content = await readFile(join(testPath, testFile), 'utf-8');

      // Check for missing assertions
      if (!content.includes('expect(')) {
        suggestions.push({
          type: 'improvement',
          severity: 'high',
          description: `Test file ${testFile} has no assertions`,
          code: 'Add expect() statements to verify behavior',
        });
      }

      // Check for skipped tests
      if (content.includes('.skip(') || content.includes('.only(')) {
        suggestions.push({
          type: 'improvement',
          severity: 'medium',
          description: `Test file ${testFile} has skipped or focused tests`,
          code: 'Remove .skip() and .only() modifiers',
        });
      }

      // Check for test organization
      if (!content.includes('describe(')) {
        suggestions.push({
          type: 'refactor',
          severity: 'low',
          description: `Test file ${testFile} lacks proper organization`,
          code: 'Use describe() blocks to group related tests',
        });
      }
    }

    return suggestions;
  }

  private async findFiles(
    directory: string,
    pattern: RegExp,
    files: string[] = []
  ): Promise<string[]> {
    try {
      const entries = await readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await this.findFiles(fullPath, pattern, files);
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(relative(directory, fullPath));
        }
      }
    } catch (error) {
      // Directory might not exist
    }

    return files;
  }

  private async readCoverageData(coveragePath: string): Promise<any> {
    // This would read actual Deno coverage format
    // For now, return mock data structure
    return {
      statements: { total: 1000, covered: 850 },
      branches: { total: 500, covered: 420 },
      functions: { total: 200, covered: 180 },
      lines: { total: 1000, covered: 850 },
      files: {},
    };
  }

  async compareRuns(
    baseline: TestMetrics,
    current: TestMetrics
  ): Promise<{
    regression: boolean;
    summary: string;
    details: any;
  }> {
    const coverageRegression =
      current.coverage.statements.percentage < baseline.coverage.statements.percentage ||
      current.coverage.branches.percentage < baseline.coverage.branches.percentage ||
      current.coverage.functions.percentage < baseline.coverage.functions.percentage ||
      current.coverage.lines.percentage < baseline.coverage.lines.percentage;

    const performanceRegression = current.duration > baseline.duration * 1.1; // 10% threshold

    const regression = coverageRegression || performanceRegression;

    const summary = regression
      ? '⚠️ Regression detected in test metrics'
      : '✅ No regression detected';

    return {
      regression,
      summary,
      details: {
        coverage: {
          statements: this.compareMetric(baseline.coverage.statements, current.coverage.statements),
          branches: this.compareMetric(baseline.coverage.branches, current.coverage.branches),
          functions: this.compareMetric(baseline.coverage.functions, current.coverage.functions),
          lines: this.compareMetric(baseline.coverage.lines, current.coverage.lines),
        },
        performance: {
          baseline: baseline.duration,
          current: current.duration,
          change: ((current.duration - baseline.duration) / baseline.duration) * 100,
        },
        tests: {
          passed: { baseline: baseline.passed, current: current.passed },
          failed: { baseline: baseline.failed, current: current.failed },
          skipped: { baseline: baseline.skipped, current: current.skipped },
        },
      },
    };
  }

  private compareMetric(baseline: { percentage: number }, current: { percentage: number }) {
    const change = current.percentage - baseline.percentage;
    return {
      baseline: baseline.percentage,
      current: current.percentage,
      change,
      status: change >= 0 ? 'improved' : 'regressed',
    };
  }
}

// Export singleton instance
export const coverageAnalyzer = new CoverageAnalyzer();

// CLI interface
export async function analyzeCoverageFromCLI(args: string[]) {
  const analyzer = new CoverageAnalyzer();
  const coveragePath = args[0] || './coverage';
  const format = args[1] || 'html';

  const report = await analyzer.generateCoverageReport(coveragePath, format as any);

  if (format === 'html') {
    await Deno.writeTextFile('./coverage-report.html', report);
    console.log('Coverage report generated: coverage-report.html');
  } else {
    console.log(report);
  }
}
