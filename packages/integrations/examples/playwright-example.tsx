import React from 'react';

/**
 * Playwright E2E Testing Integration Example
 * Demonstrates E2E testing setup with Playwright in Katalyst
 */

export const PlaywrightExample: React.FC = () => {
  const [testResults, setTestResults] = React.useState<any>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  
  const runTests = () => {
    setIsRunning(true);
    // Simulate test execution
    setTimeout(() => {
      setTestResults({
        passed: 12,
        failed: 1,
        skipped: 2,
        duration: '23.5s',
        browsers: ['chromium', 'firefox', 'webkit'],
      });
      setIsRunning(false);
    }, 2000);
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>Playwright E2E Testing</h2>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Features</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <strong>🌐 Cross-browser</strong>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>Test on Chromium, Firefox, and WebKit</p>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <strong>📱 Mobile Testing</strong>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>Emulate mobile devices and viewports</p>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <strong>🎭 Auto-waiting</strong>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>Smart waiting for elements</p>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <strong>📸 Screenshots</strong>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>Capture screenshots and videos</p>
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Test Suite</h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: isRunning ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginBottom: '20px',
          }}
        >
          {isRunning ? 'Running Tests...' : 'Run E2E Tests'}
        </button>
        
        {testResults && (
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
            <h4>Test Results</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
              <div>
                <span style={{ color: '#28a745', fontSize: '24px', fontWeight: 'bold' }}>
                  {testResults.passed}
                </span>
                <p style={{ margin: 0, fontSize: '14px' }}>Passed</p>
              </div>
              <div>
                <span style={{ color: '#dc3545', fontSize: '24px', fontWeight: 'bold' }}>
                  {testResults.failed}
                </span>
                <p style={{ margin: 0, fontSize: '14px' }}>Failed</p>
              </div>
              <div>
                <span style={{ color: '#ffc107', fontSize: '24px', fontWeight: 'bold' }}>
                  {testResults.skipped}
                </span>
                <p style={{ margin: 0, fontSize: '14px' }}>Skipped</p>
              </div>
              <div>
                <span style={{ color: '#007bff', fontSize: '24px', fontWeight: 'bold' }}>
                  {testResults.duration}
                </span>
                <p style={{ margin: 0, fontSize: '14px' }}>Duration</p>
              </div>
            </div>
            <div>
              <strong>Browsers tested:</strong> {testResults.browsers.join(', ')}
            </div>
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Example Test Code</h3>
        <pre style={{ backgroundColor: '#2d2d2d', color: '#f8f8f2', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`import { test, expect } from '@playwright/test';

test.describe('Katalyst App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Katalyst/);
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should handle form submission', async ({ page }) => {
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.mobile-menu')).toBeVisible();
  });
});`}
        </pre>
      </div>
      
      <div>
        <h3>Configuration</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});`}
        </pre>
      </div>
    </div>
  );
};

export default PlaywrightExample;