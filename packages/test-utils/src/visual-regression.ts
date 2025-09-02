import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { type Browser, type Page, chromium, firefox, webkit } from 'playwright';
import { PNG } from 'pngjs';

export interface VisualTestConfig {
  baseUrl: string;
  screenshotDir: string;
  diffDir: string;
  threshold: number;
  browsers: ('chromium' | 'firefox' | 'webkit')[];
  viewports: Array<{ width: number; height: number; name: string }>;
  waitForSelector?: string;
  waitTimeout?: number;
}

export interface VisualTestResult {
  passed: boolean;
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
  screenshotPath: string;
  baselinePath: string;
  diffPath?: string;
}

export class VisualRegressionTester {
  private config: VisualTestConfig;
  private browser: Browser | null = null;

  constructor(config: Partial<VisualTestConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:3000',
      screenshotDir: './tests/visual/screenshots',
      diffDir: './tests/visual/diffs',
      threshold: 0.1, // 0.1% difference allowed
      browsers: ['chromium'],
      viewports: [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 812, name: 'mobile' },
      ],
      waitTimeout: 30000,
      ...config,
    };
  }

  async setup(browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium') {
    const browserLauncher = { chromium, firefox, webkit }[browserType];
    this.browser = await browserLauncher.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async captureScreenshot(
    page: Page,
    name: string,
    viewport: { width: number; height: number; name: string }
  ): Promise<string> {
    // Set viewport
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    // Wait for page to stabilize
    if (this.config.waitForSelector) {
      await page.waitForSelector(this.config.waitForSelector, {
        timeout: this.config.waitTimeout,
      });
    }

    // Wait for animations to complete
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Disable animations
        const style = document.createElement('style');
        style.innerHTML = `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `;
        document.head.appendChild(style);

        // Wait a frame for styles to apply
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
    });

    // Generate filename
    const filename = `${name}-${viewport.name}.png`;
    const filepath = join(this.config.screenshotDir, filename);

    // Ensure directory exists
    await mkdir(dirname(filepath), { recursive: true });

    // Take screenshot
    await page.screenshot({
      path: filepath,
      fullPage: true,
      animations: 'disabled',
    });

    return filepath;
  }

  async compareScreenshots(
    actualPath: string,
    baselinePath: string,
    diffPath: string
  ): Promise<VisualTestResult> {
    try {
      // Read images
      const [actualBuffer, baselineBuffer] = await Promise.all([
        readFile(actualPath),
        readFile(baselinePath),
      ]);

      const actual = PNG.sync.read(actualBuffer);
      const baseline = PNG.sync.read(baselineBuffer);

      // Check dimensions
      if (actual.width !== baseline.width || actual.height !== baseline.height) {
        return {
          passed: false,
          diffPercentage: 100,
          diffPixels: actual.width * actual.height,
          totalPixels: actual.width * actual.height,
          screenshotPath: actualPath,
          baselinePath,
          diffPath,
        };
      }

      // Create diff image
      const diff = new PNG({ width: actual.width, height: actual.height });

      // Compare pixels
      const diffPixels = pixelmatch(
        actual.data,
        baseline.data,
        diff.data,
        actual.width,
        actual.height,
        { threshold: 0.1 }
      );

      // Save diff image if there are differences
      if (diffPixels > 0) {
        await mkdir(dirname(diffPath), { recursive: true });
        await writeFile(diffPath, PNG.sync.write(diff));
      }

      const totalPixels = actual.width * actual.height;
      const diffPercentage = (diffPixels / totalPixels) * 100;

      return {
        passed: diffPercentage <= this.config.threshold,
        diffPercentage,
        diffPixels,
        totalPixels,
        screenshotPath: actualPath,
        baselinePath,
        diffPath: diffPixels > 0 ? diffPath : undefined,
      };
    } catch (error) {
      // Baseline doesn't exist
      if (error.code === 'ENOENT' && error.path === baselinePath) {
        // Copy actual to baseline for first run
        await mkdir(dirname(baselinePath), { recursive: true });
        await Deno.copyFile(actualPath, baselinePath);

        return {
          passed: true,
          diffPercentage: 0,
          diffPixels: 0,
          totalPixels: 0,
          screenshotPath: actualPath,
          baselinePath,
          diffPath: undefined,
        };
      }

      throw error;
    }
  }

  async testPage(
    path: string,
    name: string,
    options: {
      beforeScreenshot?: (page: Page) => Promise<void>;
      elements?: string[];
    } = {}
  ): Promise<Map<string, VisualTestResult>> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call setup() first.');
    }

    const results = new Map<string, VisualTestResult>();
    const page = await this.browser.newPage();

    try {
      // Navigate to page
      await page.goto(`${this.config.baseUrl}${path}`, {
        waitUntil: 'networkidle',
      });

      // Execute custom setup
      if (options.beforeScreenshot) {
        await options.beforeScreenshot(page);
      }

      // Test each viewport
      for (const viewport of this.config.viewports) {
        const screenshotName = `${name}-${viewport.name}`;

        if (options.elements && options.elements.length > 0) {
          // Screenshot specific elements
          for (const selector of options.elements) {
            const element = await page.$(selector);
            if (!element) continue;

            const elementName = `${screenshotName}-${this.sanitizeName(selector)}`;
            const actualPath = join(this.config.screenshotDir, 'actual', `${elementName}.png`);
            const baselinePath = join(this.config.screenshotDir, 'baseline', `${elementName}.png`);
            const diffPath = join(this.config.diffDir, `${elementName}.png`);

            await element.screenshot({ path: actualPath });

            const result = await this.compareScreenshots(actualPath, baselinePath, diffPath);
            results.set(elementName, result);
          }
        } else {
          // Full page screenshot
          const actualPath = join(this.config.screenshotDir, 'actual', `${screenshotName}.png`);
          const baselinePath = join(this.config.screenshotDir, 'baseline', `${screenshotName}.png`);
          const diffPath = join(this.config.diffDir, `${screenshotName}.png`);

          await this.captureScreenshot(page, join('actual', name), viewport);

          const result = await this.compareScreenshots(actualPath, baselinePath, diffPath);
          results.set(screenshotName, result);
        }
      }
    } finally {
      await page.close();
    }

    return results;
  }

  async testComponent(
    componentName: string,
    variants: Record<string, any>[] = [{}],
    options: {
      route?: string;
      setup?: (page: Page) => Promise<void>;
    } = {}
  ): Promise<Map<string, VisualTestResult>> {
    const results = new Map<string, VisualTestResult>();
    const route = options.route || `/storybook/iframe.html?id=${componentName.toLowerCase()}`;

    for (const [index, props] of variants.entries()) {
      const variantName = `${componentName}-variant-${index}`;

      const variantResults = await this.testPage(route, variantName, {
        beforeScreenshot: async (page) => {
          // Apply variant props
          await page.evaluate((props) => {
            // This assumes Storybook or a similar setup
            window.__STORYBOOK_PREVIEW__.updateProps(props);
          }, props);

          if (options.setup) {
            await options.setup(page);
          }
        },
      });

      variantResults.forEach((result, key) => {
        results.set(key, result);
      });
    }

    return results;
  }

  async generateReport(results: Map<string, VisualTestResult>): Promise<string> {
    const totalTests = results.size;
    const failedTests = Array.from(results.values()).filter((r) => !r.passed).length;
    const passedTests = totalTests - failedTests;

    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: (passedTests / totalTests) * 100,
      },
      tests: Array.from(results.entries()).map(([name, result]) => ({
        name,
        ...result,
      })),
      timestamp: new Date().toISOString(),
    };

    // Generate HTML report
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Visual Regression Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary { display: flex; gap: 20px; margin-top: 10px; }
    .stat { flex: 1; text-align: center; }
    .stat-value { font-size: 2em; font-weight: bold; }
    .passed { color: #28a745; }
    .failed { color: #dc3545; }
    .test { background: white; padding: 20px; margin-bottom: 10px; border-radius: 8px; }
    .test-failed { border-left: 4px solid #dc3545; }
    .test-passed { border-left: 4px solid #28a745; }
    .images { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
    .image-container { text-align: center; }
    .image-container img { max-width: 100%; border: 1px solid #ddd; }
    .diff-percentage { font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Visual Regression Report</h1>
    <div class="summary">
      <div class="stat">
        <div class="stat-value">${report.summary.total}</div>
        <div>Total Tests</div>
      </div>
      <div class="stat">
        <div class="stat-value passed">${report.summary.passed}</div>
        <div>Passed</div>
      </div>
      <div class="stat">
        <div class="stat-value failed">${report.summary.failed}</div>
        <div>Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${report.summary.passRate.toFixed(1)}%</div>
        <div>Pass Rate</div>
      </div>
    </div>
  </div>

  ${report.tests
    .map(
      (test) => `
    <div class="test ${test.passed ? 'test-passed' : 'test-failed'}">
      <h3>${test.name}</h3>
      <div class="diff-percentage">
        Difference: ${test.diffPercentage.toFixed(2)}% (${test.diffPixels} pixels)
      </div>
      <div class="images">
        <div class="image-container">
          <h4>Baseline</h4>
          <img src="${test.baselinePath}" alt="Baseline">
        </div>
        <div class="image-container">
          <h4>Actual</h4>
          <img src="${test.screenshotPath}" alt="Actual">
        </div>
        ${
          test.diffPath
            ? `
          <div class="image-container">
            <h4>Difference</h4>
            <img src="${test.diffPath}" alt="Difference">
          </div>
        `
            : ''
        }
      </div>
    </div>
  `
    )
    .join('')}
</body>
</html>`;

    const reportPath = join(this.config.screenshotDir, 'report.html');
    await writeFile(reportPath, html);

    return reportPath;
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }
}

// Playwright test helper
export function visualTest(
  name: string,
  testFn: (tester: VisualRegressionTester) => Promise<void>
) {
  return async () => {
    const tester = new VisualRegressionTester();
    await tester.setup();

    try {
      await testFn(tester);
    } finally {
      await tester.teardown();
    }
  };
}

// Export test utilities
export { Page, Browser } from 'playwright';
