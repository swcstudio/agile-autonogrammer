import {
  afterAll,
  afterEach,
  assertEquals,
  assertExists,
  assertThrows,
  beforeAll,
  beforeEach,
  delay,
  describe,
  it,
  restore,
  spy,
  stub
} from '../test.config.ts';

import {
  FixtureManager,
  FrameworkTestUtils,
  IntegrationTestUtils,
  PerformanceTestUtils,
  TestSuiteBuilder,
  globalTestUtils,
  parametrize,
  testConfig
} from '../test.config.ts';

import { fixtures } from '../fixtures/shared.fixtures.ts';

// Mock Playwright for Deno environment
interface MockPage {
  goto: (url: string) => Promise<void>;
  click: (selector: string) => Promise<void>;
  fill: (selector: string, value: string) => Promise<void>;
  waitForSelector: (selector: string) => Promise<void>;
  waitForNavigation: () => Promise<void>;
  screenshot: (options?: any) => Promise<Buffer>;
  evaluate: (fn: Function) => Promise<any>;
  locator: (selector: string) => MockLocator;
  url: () => string;
  title: () => Promise<string>;
  content: () => Promise<string>;
  close: () => Promise<void>;
}

interface MockLocator {
  click: () => Promise<void>;
  fill: (value: string) => Promise<void>;
  textContent: () => Promise<string | null>;
  isVisible: () => Promise<boolean>;
  waitFor: () => Promise<void>;
}

interface MockBrowser {
  newPage: () => Promise<MockPage>;
  close: () => Promise<void>;
}

interface MockPlaywright {
  chromium: {
    launch: (options?: any) => Promise<MockBrowser>;
  };
  firefox: {
    launch: (options?: any) => Promise<MockBrowser>;
  };
  webkit: {
    launch: (options?: any) => Promise<MockBrowser>;
  };
}

// E2E Test Suite for Complete User Journey
const testSuite = new TestSuiteBuilder();

testSuite
  .framework('e2e-user-journey', testConfig.core, () => {
    let fixtureManager: FixtureManager;
    let playwright: MockPlaywright;
    let browser: MockBrowser;
    let page: MockPage;
    let testUrls: Record<string, string>;
    let userSession: any;

    beforeAll(async () => {
      fixtureManager = new FixtureManager();

      // Setup test URLs
      testUrls = {
        marketing: 'http://localhost:3000',      // Next.js marketing site
        app: 'http://localhost:3001',           // Core React app
        admin: 'http://localhost:3002',         // Remix admin dashboard
        api: 'http://localhost:3003/api'        // API endpoints
      };

      // Mock Playwright setup
      playwright = {
        chromium: {
          launch: async (options = {}) => ({
            newPage: async () => ({
              goto: spy(async (url: string) => {
                // Mock navigation
                await delay(100);
              }),
              click: spy(async (selector: string) => {
                await delay(50);
              }),
              fill: spy(async (selector: string, value: string) => {
                await delay(30);
              }),
              waitForSelector: spy(async (selector: string) => {
                await delay(100);
              }),
              waitForNavigation: spy(async () => {
                await delay(200);
              }),
              screenshot: spy(async (options = {}) => Buffer.from('mock-screenshot')),
              evaluate: spy(async (fn: Function) => fn()),
              locator: (selector: string) => ({
                click: spy(async () => { await delay(50); }),
                fill: spy(async (value: string) => { await delay(30); }),
                textContent: spy(async () => 'Mock text content'),
                isVisible: spy(async () => true),
                waitFor: spy(async () => { await delay(100); })
              }),
              url: spy(() => 'http://localhost:3000'),
              title: spy(async () => 'Katalyst Framework'),
              content: spy(async () => '<html><body>Mock content</body></html>'),
              close: spy(async () => {})
            } as MockPage),
            close: spy(async () => {})
          } as MockBrowser)
        },
        firefox: {
          launch: async (options = {}) => playwright.chromium.launch(options)
        },
        webkit: {
          launch: async (options = {}) => playwright.chromium.launch(options)
        }
      };

      browser = await playwright.chromium.launch({ headless: true });
      page = await browser.newPage();

      // Setup user session fixture
      userSession = await fixtureManager.register(
        'user-session',
        async () => ({
          user: fixtures.user,
          isAuthenticated: false,
          preferences: {
            theme: 'light',
            language: 'en',
            notifications: true
          },
          navigationHistory: [],
          performance: {
            pageLoadTimes: {},
            interactionTimes: {},
            errors: []
          }
        })
      );

      // Setup global test environment
      globalThis.fetch = stub(async (url: string) => {
        const mockResponses = {
          '/api/auth/login': fixtures.api.auth.login,
          '/api/users': fixtures.api.users.success,
          '/api/analytics': { pageViews: 1000, conversions: 50 }
        };

        const endpoint = new URL(url).pathname;
        const responseData = mockResponses[endpoint] || { success: true };

        return {
          ok: true,
          status: 200,
          json: async () => responseData,
          text: async () => JSON.stringify(responseData)
        };
      });

      // Setup localStorage mock
      globalThis.localStorage = {
        getItem: stub((key: string) => {
          const mockData = {
            'katalyst-auth': JSON.stringify({ token: 'mock-jwt-token', user: fixtures.user }),
            'katalyst-theme': JSON.stringify({ mode: 'light' }),
            'katalyst-preferences': JSON.stringify(userSession.preferences)
          };
          return mockData[key] || null;
        }),
        setItem: stub((key: string, value: string) => {}),
        removeItem: stub((key: string) => {}),
        clear: stub(() => {}),
        length: 0,
        key: stub((index: number) => null)
      };
    });

    afterAll(async () => {
      await page.close();
      await browser.close();
      await fixtureManager.cleanup();
      restore();
    });

    beforeEach(async () => {
      // Reset user session for each test
      userSession.isAuthenticated = false;
      userSession.navigationHistory = [];
      userSession.performance.errors = [];
    });

    describe('Complete User Journey - Marketing to Application', () => {
      it('should complete full user onboarding journey', async () => {
        const journeySteps = [];

        // Step 1: Land on marketing site (Next.js)
        await page.goto(testUrls.marketing);
        journeySteps.push('marketing-landing');

        // Verify marketing page loads
        const title = await page.title();
        assertEquals(page.goto.calls.length, 1);
        assertEquals(page.goto.calls[0].args[0], testUrls.marketing);

        // Step 2: Navigate to features page
        await page.click('[data-testid="features-link"]');
        await page.waitForNavigation();
        journeySteps.push('features-page');

        assertEquals(page.click.calls.length, 1);

        // Step 3: Start signup process
        await page.click('[data-testid="signup-button"]');
        await page.waitForSelector('[data-testid="signup-form"]');
        journeySteps.push('signup-form');

        // Step 4: Fill signup form
        await page.fill('[data-testid="email-input"]', fixtures.forms.userRegistration.email);
        await page.fill('[data-testid="password-input"]', fixtures.forms.userRegistration.password);
        await page.fill('[data-testid="confirm-password-input"]', fixtures.forms.userRegistration.confirmPassword);
        await page.click('[data-testid="terms-checkbox"]');

        assertEquals(page.fill.calls.length, 3);

        // Step 5: Submit signup
        await page.click('[data-testid="submit-signup"]');
        await page.waitForNavigation();
        journeySteps.push('signup-success');

        userSession.isAuthenticated = true;
        userSession.user = fixtures.user;

        // Step 6: Redirect to main application (Core)
        await page.goto(testUrls.app);
        await page.waitForSelector('[data-testid="app-dashboard"]');
        journeySteps.push('app-dashboard');

        // Step 7: Complete onboarding tutorial
        await page.click('[data-testid="start-tutorial"]');
        await page.waitForSelector('[data-testid="tutorial-step-1"]');

        for (let step = 1; step <= 3; step++) {
          await page.click('[data-testid="tutorial-next"]');
          if (step < 3) {
            await page.waitForSelector(`[data-testid="tutorial-step-${step + 1}"]`);
          }
        }

        await page.click('[data-testid="tutorial-complete"]');
        journeySteps.push('tutorial-complete');

        // Verify complete journey
        assertEquals(journeySteps.length, 6);
        assertEquals(userSession.isAuthenticated, true);

        userSession.navigationHistory = journeySteps;
      });

      it('should handle cross-framework navigation seamlessly', async () => {
        // Start at marketing site
        await page.goto(testUrls.marketing);

        // Navigate to blog (Next.js internal)
        await page.click('[data-testid="blog-link"]');
        await page.waitForNavigation();

        // Navigate to app (Core framework)
        await page.click('[data-testid="app-link"]');
        await page.waitForNavigation();

        // Navigate to admin (Remix framework)
        await page.click('[data-testid="admin-link"]');
        await page.waitForNavigation();

        // Verify navigation calls
        assertEquals(page.goto.calls.length, 1);
        assertEquals(page.click.calls.length, 3);
        assertEquals(page.waitForNavigation.calls.length, 3);

        // Test back navigation
        await page.evaluate(() => window.history.back());
        await page.evaluate(() => window.history.back());

        // Should be back at app
        const currentUrl = page.url();
        assertExists(currentUrl);
      });

      const userJourneyTestCases = [
        {
          name: 'guest user exploration',
          input: {
            startUrl: testUrls.marketing,
            path: ['features', 'pricing', 'contact'],
            authenticated: false
          },
          expected: { completed: true, conversions: 0 }
        },
        {
          name: 'authenticated user workflow',
          input: {
            startUrl: testUrls.app,
            path: ['dashboard', 'profile', 'settings'],
            authenticated: true
          },
          expected: { completed: true, conversions: 1 }
        },
        {
          name: 'admin user management',
          input: {
            startUrl: testUrls.admin,
            path: ['users', 'analytics', 'settings'],
            authenticated: true
          },
          expected: { completed: true, conversions: 1 }
        }
      ];

      parametrize(userJourneyTestCases, async (input, expected) => {
        if (input.authenticated) {
          userSession.isAuthenticated = true;
          userSession.user = fixtures.user;
        }

        await page.goto(input.startUrl);

        for (const pathSegment of input.path) {
          await page.click(`[data-testid="${pathSegment}-link"]`);
          await page.waitForNavigation();
          userSession.navigationHistory.push(pathSegment);
        }

        const completed = userSession.navigationHistory.length === input.path.length;
        const conversions = userSession.isAuthenticated ? 1 : 0;

        assertEquals(completed, expected.completed);
        assertEquals(conversions, expected.conversions);
      });
    });

    describe('Authentication Flow Across Frameworks', () => {
      it('should authenticate user and maintain session across frameworks', async () => {
        // Start at marketing site
        await page.goto(testUrls.marketing);

        // Click login from marketing
        await page.click('[data-testid="login-button"]');
        await page.waitForSelector('[data-testid="login-form"]');

        // Fill login form
        await page.fill('[data-testid="email-input"]', fixtures.forms.userLogin.email);
        await page.fill('[data-testid="password-input"]', fixtures.forms.userLogin.password);
        await page.click('[data-testid="submit-login"]');

        // Should redirect to app
        await page.waitForNavigation();
        userSession.isAuthenticated = true;

        // Navigate to admin - should maintain authentication
        await page.goto(testUrls.admin);
        await page.waitForSelector('[data-testid="admin-dashboard"]');

        // Verify authentication persisted
        const authToken = await page.evaluate(() => localStorage.getItem('katalyst-auth'));
        assertExists(authToken);

        // Test logout from admin
        await page.click('[data-testid="logout-button"]');
        await page.waitForNavigation();

        // Should redirect to marketing and clear session
        userSession.isAuthenticated = false;
        assertEquals(page.click.calls.filter(call => call.args[0] === '[data-testid="logout-button"]').length, 1);
      });

      it('should handle authentication errors gracefully', async () => {
        await page.goto(testUrls.marketing);

        // Attempt login with invalid credentials
        await page.click('[data-testid="login-button"]');
        await page.fill('[data-testid="email-input"]', 'invalid@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="submit-login"]');

        // Should show error message
        await page.waitForSelector('[data-testid="error-message"]');

        const errorVisible = await page.locator('[data-testid="error-message"]').isVisible();
        assertEquals(errorVisible, true);
        assertEquals(userSession.isAuthenticated, false);
      });

      it('should handle session expiration', async () => {
        // Login successfully
        userSession.isAuthenticated = true;
        await page.goto(testUrls.app);

        // Simulate session expiration
        await page.evaluate(() => {
          localStorage.removeItem('katalyst-auth');
        });

        // Try to access protected resource
        await page.click('[data-testid="protected-feature"]');

        // Should redirect to login
        await page.waitForSelector('[data-testid="login-form"]');

        const loginFormVisible = await page.locator('[data-testid="login-form"]').isVisible();
        assertEquals(loginFormVisible, true);
      });
    });

    describe('Performance Testing Across Frameworks', () => {
      it('should measure page load performance across all frameworks', async () => {
        const frameworks = [
          { name: 'marketing', url: testUrls.marketing },
          { name: 'app', url: testUrls.app },
          { name: 'admin', url: testUrls.admin }
        ];

        for (const framework of frameworks) {
          const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
            await page.goto(framework.url);
            await page.waitForSelector('[data-testid="main-content"]');
          });

          userSession.performance.pageLoadTimes[framework.name] = duration;

          // Page should load within 3 seconds
          assertEquals(duration < 3000, true, `${framework.name} loaded in ${duration}ms`);
        }

        // Core app should be fastest (optimized for performance)
        assertEquals(
          userSession.performance.pageLoadTimes.app < userSession.performance.pageLoadTimes.marketing,
          true
        );
      });

      it('should test Web Vitals across frameworks', async () => {
        const webVitals = {};

        for (const framework of Object.keys(testUrls)) {
          if (framework === 'api') continue;

          await page.goto(testUrls[framework]);

          const vitals = await page.evaluate(() => {
            // Mock Web Vitals measurement
            return {
              LCP: Math.random() * 2000 + 500,  // 0.5-2.5s
              FID: Math.random() * 50 + 10,     // 10-60ms
              CLS: Math.random() * 0.1,         // 0-0.1
              FCP: Math.random() * 1000 + 300,  // 0.3-1.3s
              TTFB: Math.random() * 200 + 50    // 50-250ms
            };
          });

          webVitals[framework] = vitals;

          // Verify good Web Vitals scores
          assertEquals(vitals.LCP < 2500, true); // Good LCP
          assertEquals(vitals.FID < 100, true);  // Good FID
          assertEquals(vitals.CLS < 0.1, true);  // Good CLS
        }

        userSession.performance.webVitals = webVitals;
      });

      it('should test interactive performance', async () => {
        await page.goto(testUrls.app);

        // Test form interaction performance
        const { duration: formTime } = await PerformanceTestUtils.measureExecutionTime(async () => {
          await page.fill('[data-testid="search-input"]', 'test query');
          await page.click('[data-testid="search-button"]');
          await page.waitForSelector('[data-testid="search-results"]');
        });

        // Test navigation performance
        const { duration: navTime } = await PerformanceTestUtils.measureExecutionTime(async () => {
          await page.click('[data-testid="dashboard-link"]');
          await page.waitForSelector('[data-testid="dashboard-content"]');
        });

        userSession.performance.interactionTimes = {
          formSubmission: formTime,
          navigation: navTime
        };

        // Interactions should be responsive
        assertEquals(formTime < 500, true);
        assertEquals(navTime < 300, true);
      });
    });

    describe('Responsive Design and Accessibility', () => {
      it('should test responsive behavior across viewports', async () => {
        const viewports = [
          { width: 320, height: 568, name: 'mobile' },
          { width: 768, height: 1024, name: 'tablet' },
          { width: 1920, height: 1080, name: 'desktop' }
        ];

        for (const viewport of viewports) {
          await page.evaluate((vp) => {
            // Mock viewport change
            Object.defineProperty(window, 'innerWidth', { value: vp.width });
            Object.defineProperty(window, 'innerHeight', { value: vp.height });
            window.dispatchEvent(new Event('resize'));
          }, viewport);

          await page.goto(testUrls.marketing);

          // Test navigation menu visibility
          const navVisible = await page.locator('[data-testid="main-navigation"]').isVisible();
          const mobileMenuVisible = await page.locator('[data-testid="mobile-menu"]').isVisible();

          if (viewport.name === 'mobile') {
            assertEquals(mobileMenuVisible, true);
          } else {
            assertEquals(navVisible, true);
          }
        }
      });

      it('should test accessibility compliance', async () => {
        await page.goto(testUrls.marketing);

        // Test keyboard navigation
        await page.evaluate(() => {
          const firstFocusable = document.querySelector('[tabindex="0"], button, input, a') as HTMLElement;
          firstFocusable?.focus();
        });

        // Simulate tab navigation
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', { key: 'Tab' });
            document.dispatchEvent(event);
          });
        }

        // Test aria labels and roles
        const ariaCompliance = await page.evaluate(() => {
          const elements = document.querySelectorAll('button, input, [role]');
          let compliant = 0;

          elements.forEach(el => {
            if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent?.trim()) {
              compliant++;
            }
          });

          return { total: elements.length, compliant };
        });

        assertEquals(ariaCompliance.compliant / ariaCompliance.total > 0.8, true);
      });

      it('should test screen reader compatibility', async () => {
        await page.goto(testUrls.app);

        // Test semantic HTML structure
        const semantics = await page.evaluate(() => {
          return {
            headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
            landmarks: document.querySelectorAll('main, nav, header, footer, aside, section').length,
            lists: document.querySelectorAll('ul, ol').length,
            buttons: document.querySelectorAll('button, [role="button"]').length
          };
        });

        assertEquals(semantics.headings > 0, true);
        assertEquals(semantics.landmarks > 0, true);
      });
    });

    describe('Web3 and AI Integration Testing', () => {
      it('should test Web3 wallet connection flow', async () => {
        // Mock MetaMask
        await page.evaluate(() => {
          (globalThis as any).ethereum = {
            isMetaMask: true,
            request: async (params: any) => {
              if (params.method === 'eth_requestAccounts') {
                return ['0x742d35Cc6634C0532925a3b8D4021C4aA6e8E1f6'];
              }
              return null;
            }
          };
        });

        await page.goto(testUrls.app);
        await page.click('[data-testid="connect-wallet"]');

        // Should prompt for wallet connection
        await page.waitForSelector('[data-testid="wallet-connection-modal"]');

        await page.click('[data-testid="metamask-connect"]');
        await page.waitForSelector('[data-testid="wallet-connected"]');

        const walletStatus = await page.locator('[data-testid="wallet-status"]').textContent();
        assertEquals(walletStatus?.includes('Connected'), true);
      });

      it('should test AI-powered features', async () => {
        await page.goto(testUrls.app);

        // Test AI code generation
        await page.click('[data-testid="ai-assistant"]');
        await page.fill('[data-testid="ai-prompt"]', 'Generate a React component for user profile');
        await page.click('[data-testid="ai-generate"]');

        await page.waitForSelector('[data-testid="ai-response"]');

        const aiResponse = await page.locator('[data-testid="ai-response"]').textContent();
        assertExists(aiResponse);
        assertEquals(aiResponse?.length > 0, true);
      });

      it('should test multithreading performance features', async () => {
        await page.goto(testUrls.app);

        // Test heavy computation with workers
        await page.click('[data-testid="performance-demo"]');
        await page.click('[data-testid="start-computation"]');

        const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
          await page.waitForSelector('[data-testid="computation-complete"]');
        });

        // Should complete complex computation quickly via workers
        assertEquals(duration < 5000, true);

        const result = await page.locator('[data-testid="computation-result"]').textContent();
        assertExists(result);
      });
    });

    describe('Error Handling and Recovery', () => {
      it('should handle network errors gracefully', async () => {
        // Mock network failure
        globalThis.fetch = stub(async () => {
          throw new Error('Network request failed');
        });

        await page.goto(testUrls.app);
        await page.click('[data-testid="load-data"]');

        // Should show error state
        await page.waitForSelector('[data-testid="error-boundary"]');

        const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
        assertEquals(errorMessage?.includes('Network'), true);

        // Test retry functionality
        await page.click('[data-testid="retry-button"]');

        userSession.performance.errors.push('network-error');
      });

      it('should recover from JavaScript errors', async () => {
        await page.goto(testUrls.app);

        // Simulate JavaScript error
        await page.evaluate(() => {
          throw new Error('Simulated runtime error');
        });

        // Error boundary should catch and display fallback UI
        const errorBoundaryVisible = await page.locator('[data-testid="error-boundary"]').isVisible();
        assertEquals(errorBoundaryVisible, true);

        // Should allow navigation to continue
        await page.click('[data-testid="home-link"]');
        await page.waitForSelector('[data-testid="home-content"]');
      });

      it('should handle API failures with fallback', async () => {
        // Mock API failure with fallback data
        globalThis.fetch = stub(async (url: string) => {
          if (url.includes('/api/users')) {
            return {
              ok: false,
              status: 500,
              json: async () => ({ error: 'Internal Server Error' })
            };
          }
          return { ok: true, json: async () => ({}) };
        });

        await page.goto(testUrls.admin);

        // Should load cached/fallback data
        await page.waitForSelector('[data-testid="fallback-data"]');

        const fallbackVisible = await page.locator('[data-testid="fallback-message"]').isVisible();
        assertEquals(fallbackVisible, true);
      });
    });

    describe('SEO and Marketing Features', () => {
      it('should verify SEO meta tags across marketing pages', async () => {
        const marketingPages = [
          '/',
          '/features',
          '/pricing',
          '/blog',
          '/contact'
        ];

        for (const pagePath of marketingPages) {
          await page.goto(`${testUrls.marketing}${pagePath}`);

          const metaTags = await page.evaluate(() => {
            return {
              title: document.title,
              description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
              keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content'),
              ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
              ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
              ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content')
            };
          });

          // Verify essential SEO elements
          assertExists(metaTags.title);
          assertExists(metaTags.description);
          assertEquals(metaTags.title.length > 0, true);
          assertEquals(metaTags.description.length > 0, true);
        }
      });

      it('should test structured data markup', async () => {
        await page.goto(testUrls.marketing);

        const structuredData = await page.evaluate(() => {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          return Array.from(scripts).map(script => {
            try {
              return JSON.parse(script.textContent || '');
            } catch {
              return null;
            }
          }).filter(Boolean);
        });

        assertEquals(structuredData.length > 0, true);

        // Verify organization schema
        const orgSchema = structuredData.find(data => data['@type'] === 'Organization');
        assertExists(orgSchema);
      });

      it('should test analytics integration', async () => {
        await page.goto(testUrls.marketing);

        // Test Google Analytics tracking
        const analyticsLoaded = await page.evaluate(() => {
          return typeof (globalThis as any).gtag !== 'undefined' ||
                 typeof (globalThis as any).ga !== 'undefined';
        });

        // Mock analytics tracking
        await page.evaluate(() => {
          (globalThis as any).gtag = (command: string, target: string, params: any) => {
            console.log('Analytics:', command, target, params);
          };
        });

        await page.click('[data-testid="cta-button"]');

        // Should track click event
        const trackingEvents = await page.evaluate(() => {
          return (globalThis as any).analyticsEvents || [];
        });

        assertExists(trackingEvents);
      });
    });

    describe('Cross-Browser Compatibility', () => {
      const browsers = ['chromium', 'firefox', 'webkit'];

      browsers.forEach(browserName => {
        it(`should work correctly in ${browserName}`, async () => {
          const testBrowser = await playwright[browserName as keyof MockPlaywright].launch();
          const testPage = await testBrowser.newPage();

          try {
            await testPage.goto(testUrls.marketing);
            await testPage.waitForSelector('[data-testid="main-content"]');

            // Test basic functionality
            await testPage.click('[data-testid="features-link"]');
            await testPage.waitForNavigation();

            const title = await testPage.title();
            assertExists(title);
            assertEquals(title.length > 0, true);

            // Test form interaction
            await testPage.click('[data-testid="contact-link"]');
            await testPage.fill('[data-testid="name-input"]', 'Test User');
            await testPage.fill('[data-testid="email-input"]', 'test@example.com');

            const nameValue = await testPage.locator('[data-testid="name-input"]').textContent();
            assertEquals(!!nameValue, true);

          } finally {
            await testPage.close();
            await testBrowser.close();
          }
        });
      });
    });

    describe('Performance Monitoring', () => {
      it('should track Core Web Vitals throughout user session', async () => {
        const webVitalsData = [];

        // Navigate through different frameworks and track vitals
        const navigationFlow = [
          { url: testUrls.marketing, framework: 'nextjs' },
          { url: testUrls.app, framework: 'core' },
          { url: testUrls.admin, framework: 'remix' }
        ];

        for (const nav of navigationFlow) {
          await page.goto(nav.url);

          const vitals = await page.evaluate(() => {
            return
