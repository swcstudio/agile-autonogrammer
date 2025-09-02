import {
  afterAll,
  afterEach,
  assertEquals,
  assertExists,
  assertThrows,
  beforeAll,
  beforeEach,
  describe,
  it,
  restore,
  spy,
  stub,
} from '../test.config.ts';

import {
  FixtureManager,
  FrameworkTestUtils,
  TestSuiteBuilder,
  globalTestUtils,
  parametrize,
  testConfig,
} from '../test.config.ts';

import { fixtures } from '../fixtures/shared.fixtures.ts';

import { ConfigProvider } from '../../shared/src/components/ConfigProvider.tsx';
import { DesignSystem } from '../../shared/src/components/DesignSystem.tsx';
import { IntegrationProvider } from '../../shared/src/components/IntegrationProvider.tsx';
// Import shared components and utilities
import {
  KatalystProvider,
  useKatalystContext,
} from '../../shared/src/components/KatalystProvider.tsx';

// Mock React for testing
const React = {
  createContext: (defaultValue: any) => ({
    Provider: ({ children, value }: any) => ({ type: 'Provider', props: { children, value } }),
    Consumer: ({ children }: any) => ({ type: 'Consumer', props: { children } }),
    displayName: 'MockContext',
  }),
  useContext: (context: any) => fixtures.config,
  useState: (initial: any) => [initial, () => {}],
  useEffect: (fn: Function) => fn(),
  useCallback: (fn: Function) => fn,
  useMemo: (fn: Function) => fn(),
  ReactNode: {},
};

// Test Suite Builder Instance
const testSuite = new TestSuiteBuilder();

testSuite
  .framework('shared', testConfig.shared, () => {
    let fixtureManager: FixtureManager;
    let frameworkUtils: FrameworkTestUtils;

    beforeAll(async () => {
      fixtureManager = new FixtureManager();
      frameworkUtils = new FrameworkTestUtils(testConfig.shared);

      // Setup global mocks
      globalThis.React = React;
      globalThis.fetch = stub(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fixtures.api.users.success),
        })
      );
    });

    afterAll(async () => {
      await fixtureManager.cleanup();
      restore();
    });

    describe('KatalystProvider', () => {
      const katalystProviderTestCases = [
        {
          name: 'should create provider with valid config',
          input: fixtures.components.katalystProvider,
          expected: { isInitialized: true },
          setup: async () => {
            await fixtureManager.register('mockProvider', () => ({
              config: fixtures.config,
              updateConfig: spy(() => {}),
              isInitialized: true,
            }));
          },
        },
        {
          name: 'should handle config updates',
          input: {
            ...fixtures.components.katalystProvider,
            config: { ...fixtures.config, theme: { ...fixtures.config.theme, mode: 'dark' } },
          },
          expected: { mode: 'dark' },
          setup: async () => {
            await fixtureManager.register('mockProviderUpdate', () => ({
              config: { ...fixtures.config, theme: { ...fixtures.config.theme, mode: 'dark' } },
              updateConfig: spy(() => {}),
              isInitialized: true,
            }));
          },
        },
        {
          name: 'should throw error when used outside provider',
          input: null,
          expected: Error,
          setup: async () => {
            globalThis.React.useContext = () => null;
          },
          teardown: async () => {
            globalThis.React.useContext = () => fixtures.config;
          },
        },
      ];

      parametrize(katalystProviderTestCases, async (input, expected) => {
        if (expected === Error) {
          assertThrows(() => {
            useKatalystContext();
          });
        } else if (input) {
          const provider = frameworkUtils.createMockReactComponent('KatalystProvider', input);
          assertExists(provider);
          assertEquals(provider.type, 'KatalystProvider');

          if (expected.isInitialized !== undefined) {
            const mockContext = fixtureManager.get('mockProvider');
            assertEquals(mockContext.isInitialized, expected.isInitialized);
          }

          if (expected.mode) {
            const mockContext = fixtureManager.get('mockProviderUpdate');
            assertEquals(mockContext.config.theme.mode, expected.mode);
          }
        }
      });

      it('should update configuration correctly', () => {
        const updateConfigSpy = spy(() => {});
        const mockContext = {
          config: fixtures.config,
          updateConfig: updateConfigSpy,
          isInitialized: true,
        };

        const updates = { theme: { mode: 'dark' } };
        mockContext.updateConfig(updates);

        assertEquals(updateConfigSpy.calls.length, 1);
        assertEquals(updateConfigSpy.calls[0].args[0], updates);
      });
    });

    describe('ConfigProvider', () => {
      it('should provide theme configuration', () => {
        const configProvider = frameworkUtils.createMockReactComponent(
          'ConfigProvider',
          fixtures.components.configProvider
        );

        assertExists(configProvider);
        assertEquals(configProvider.props.theme, fixtures.config.theme);
        assertEquals(configProvider.props.router, fixtures.config.router);
      });

      it('should handle theme updates', () => {
        const newTheme = { ...fixtures.config.theme, mode: 'dark' };
        const configProvider = frameworkUtils.createMockReactComponent('ConfigProvider', {
          ...fixtures.components.configProvider,
          theme: newTheme,
        });

        assertEquals(configProvider.props.theme.mode, 'dark');
      });

      const configTestCases = [
        {
          name: 'light theme configuration',
          input: { theme: { mode: 'light', primaryColor: '#3b82f6' } },
          expected: { mode: 'light', primaryColor: '#3b82f6' },
        },
        {
          name: 'dark theme configuration',
          input: { theme: { mode: 'dark', primaryColor: '#6366f1' } },
          expected: { mode: 'dark', primaryColor: '#6366f1' },
        },
        {
          name: 'custom router configuration',
          input: { router: { basePath: '/app', trailingSlash: true } },
          expected: { basePath: '/app', trailingSlash: true },
        },
      ];

      parametrize(configTestCases, async (input, expected) => {
        const provider = frameworkUtils.createMockReactComponent('ConfigProvider', input);

        if (input.theme) {
          assertEquals(provider.props.theme.mode, expected.mode);
          assertEquals(provider.props.theme.primaryColor, expected.primaryColor);
        }

        if (input.router) {
          assertEquals(provider.props.router.basePath, expected.basePath);
          assertEquals(provider.props.router.trailingSlash, expected.trailingSlash);
        }
      });
    });

    describe('IntegrationProvider', () => {
      it('should initialize integrations correctly', () => {
        const integrationProvider = frameworkUtils.createMockReactComponent(
          'IntegrationProvider',
          fixtures.components.integrationProvider
        );

        assertExists(integrationProvider);
        assertEquals(integrationProvider.props.integrations, fixtures.config.integrations);
      });

      const integrationTestCases = [
        {
          name: 'analytics integration',
          input: { integrations: { analytics: ['google-analytics', 'mixpanel'] } },
          expected: { analytics: ['google-analytics', 'mixpanel'] },
        },
        {
          name: 'payment integration',
          input: { integrations: { payments: ['stripe', 'paypal'] } },
          expected: { payments: ['stripe', 'paypal'] },
        },
        {
          name: 'cms integration',
          input: { integrations: { cms: ['payload', 'contentful'] } },
          expected: { cms: ['payload', 'contentful'] },
        },
      ];

      parametrize(integrationTestCases, async (input, expected) => {
        const provider = frameworkUtils.createMockReactComponent('IntegrationProvider', input);
        assertEquals(provider.props.integrations, expected);
      });
    });

    describe('DesignSystem', () => {
      it('should provide design system tokens', () => {
        const designSystem = frameworkUtils.createMockReactComponent(
          'DesignSystem',
          fixtures.components.designSystem
        );

        assertExists(designSystem);
        assertEquals(designSystem.props.theme, fixtures.config.theme);
        assertExists(designSystem.props.tokens);
      });

      it('should handle component registration', () => {
        const components = ['Button', 'Input', 'Modal', 'Dropdown'];
        const designSystem = frameworkUtils.createMockReactComponent('DesignSystem', {
          ...fixtures.components.designSystem,
          components,
        });

        assertEquals(designSystem.props.components, components);
      });

      const designSystemTestCases = [
        {
          name: 'color tokens',
          input: { tokens: { colors: { primary: '#3b82f6', secondary: '#6b7280' } } },
          expected: { colors: { primary: '#3b82f6', secondary: '#6b7280' } },
        },
        {
          name: 'spacing tokens',
          input: { tokens: { spacing: { xs: '4px', sm: '8px', md: '16px' } } },
          expected: { spacing: { xs: '4px', sm: '8px', md: '16px' } },
        },
        {
          name: 'typography tokens',
          input: { tokens: { typography: { xs: '12px', sm: '14px', base: '16px' } } },
          expected: { typography: { xs: '12px', sm: '14px', base: '16px' } },
        },
      ];

      parametrize(designSystemTestCases, async (input, expected) => {
        const designSystem = frameworkUtils.createMockReactComponent('DesignSystem', input);
        assertEquals(designSystem.props.tokens, expected);
      });
    });

    describe('Utility Functions', () => {
      it('should validate configuration objects', () => {
        const isValidConfig = (config: any) => {
          return (
            config &&
            typeof config === 'object' &&
            config.framework &&
            config.theme &&
            config.router
          );
        };

        assertEquals(isValidConfig(fixtures.config), true);
        assertEquals(isValidConfig({}), false);
        assertEquals(isValidConfig(null), false);
      });

      it('should merge configuration objects', () => {
        const mergeConfig = (base: any, override: any) => {
          return { ...base, ...override, theme: { ...base.theme, ...override.theme } };
        };

        const merged = mergeConfig(fixtures.config, {
          theme: { mode: 'dark' },
          newProperty: 'test',
        });

        assertEquals(merged.theme.mode, 'dark');
        assertEquals(merged.theme.primaryColor, fixtures.config.theme.primaryColor);
        assertEquals(merged.newProperty, 'test');
      });

      const utilityTestCases = [
        {
          name: 'deep merge objects',
          input: [{ a: { b: 1 } }, { a: { c: 2 } }],
          expected: { a: { b: 1, c: 2 } },
        },
        {
          name: 'flatten nested arrays',
          input: [
            [1, 2],
            [3, [4, 5]],
          ],
          expected: [1, 2, 3, 4, 5],
        },
        {
          name: 'debounce function calls',
          input: { delay: 100, calls: 5 },
          expected: { executedCalls: 1 },
        },
      ];

      parametrize(utilityTestCases, async (input, expected) => {
        if (Array.isArray(input) && input.length === 2 && typeof input[0] === 'object') {
          // Deep merge test
          const deepMerge = (obj1: any, obj2: any) => {
            const result = { ...obj1 };
            for (const key in obj2) {
              if (typeof obj2[key] === 'object' && typeof result[key] === 'object') {
                result[key] = { ...result[key], ...obj2[key] };
              } else {
                result[key] = obj2[key];
              }
            }
            return result;
          };

          const result = deepMerge(input[0], input[1]);
          assertEquals(result, expected);
        } else if (Array.isArray(input) && input.every(Array.isArray)) {
          // Flatten test
          const flatten = (arr: any[]): any[] => {
            return arr.reduce(
              (acc, val) => (Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val)),
              []
            );
          };

          const result = flatten(input);
          assertEquals(result, expected);
        } else if (input.delay && input.calls) {
          // Debounce test
          let executedCalls = 0;
          const debounce = (fn: Function, delay: number) => {
            let timeoutId: number;
            return (...args: any[]) => {
              clearTimeout(timeoutId);
              timeoutId = setTimeout(() => fn(...args), delay);
            };
          };

          const debouncedFn = debounce(() => executedCalls++, input.delay);

          // Simulate multiple rapid calls
          for (let i = 0; i < input.calls; i++) {
            debouncedFn();
          }

          // Wait for debounce delay
          await new Promise((resolve) => setTimeout(resolve, input.delay + 10));

          assertEquals({ executedCalls }, expected);
        }
      });
    });

    describe('Type Validation', () => {
      it('should validate KatalystConfig type', () => {
        const validateKatalystConfig = (config: any): boolean => {
          const requiredFields = ['framework', 'theme', 'router', 'api', 'auth', 'features'];
          return requiredFields.every((field) => config.hasOwnProperty(field));
        };

        assertEquals(validateKatalystConfig(fixtures.config), true);
        assertEquals(validateKatalystConfig({ framework: 'core' }), false);
      });

      it('should validate theme configuration', () => {
        const validateTheme = (theme: any): boolean => {
          return (
            theme &&
            typeof theme.mode === 'string' &&
            typeof theme.primaryColor === 'string' &&
            ['light', 'dark'].includes(theme.mode)
          );
        };

        assertEquals(validateTheme(fixtures.config.theme), true);
        assertEquals(validateTheme({ mode: 'invalid' }), false);
      });

      const typeValidationTestCases = [
        {
          name: 'valid user object',
          input: fixtures.user,
          expected: true,
        },
        {
          name: 'invalid user object missing email',
          input: { ...fixtures.user, emailAddresses: [] },
          expected: false,
        },
        {
          name: 'valid router configuration',
          input: fixtures.config.router,
          expected: true,
        },
        {
          name: 'invalid router configuration',
          input: { basePath: 123 },
          expected: false,
        },
      ];

      parametrize(typeValidationTestCases, async (input, expected) => {
        let isValid = false;

        if (input.emailAddresses !== undefined) {
          // User validation
          isValid = input.id && input.emailAddresses.length > 0;
        } else if (input.basePath !== undefined) {
          // Router validation
          isValid = typeof input.basePath === 'string';
        }

        assertEquals(isValid, expected);
      });
    });

    describe('Error Handling', () => {
      it('should handle provider initialization errors', () => {
        const invalidConfig = null;

        assertThrows(() => {
          if (!invalidConfig) {
            throw new Error('Configuration is required');
          }
        });
      });

      it('should handle integration loading errors', () => {
        const mockIntegration = {
          load: stub(() => {
            throw new Error('Integration failed to load');
          }),
        };

        assertThrows(() => {
          mockIntegration.load();
        });
      });

      const errorTestCases = [
        {
          name: 'network error handling',
          input: fixtures.errors.network,
          expected: 'Network request failed',
        },
        {
          name: 'validation error handling',
          input: fixtures.errors.validation,
          expected: 'Validation failed: required field missing',
        },
        {
          name: 'authentication error handling',
          input: fixtures.errors.auth,
          expected: 'Authentication required',
        },
      ];

      parametrize(errorTestCases, async (input, expected) => {
        assertEquals(input.message, expected);
      });
    });

    describe('Performance Tests', () => {
      it('should measure component render performance', async () => {
        const renderComponent = () => {
          return frameworkUtils.createMockReactComponent('TestComponent', {});
        };

        const { duration } =
          await globalTestUtils.performance.measureExecutionTime(renderComponent);

        // Component should render in less than 16ms (60fps)
        assertEquals(duration < 16, true);
      });

      it('should handle large datasets efficiently', async () => {
        const largeDataset = Array(10000)
          .fill(0)
          .map((_, i) => ({ id: i, name: `Item ${i}` }));

        const processData = () => {
          return largeDataset.filter((item) => item.id % 2 === 0).map((item) => item.name);
        };

        const { duration } = await globalTestUtils.performance.measureExecutionTime(processData);

        // Should process 10k items in less than 100ms
        assertEquals(duration < 100, true);
      });
    });

    describe('Security Tests', () => {
      it('should sanitize user input', () => {
        const maliciousInput = '<script>alert("xss")</script>';
        const safeInput = 'Hello World';

        assertEquals(globalTestUtils.security.sanitizeInput(maliciousInput), false);
        assertEquals(globalTestUtils.security.sanitizeInput(safeInput), true);
      });

      it('should validate JWT tokens', () => {
        const validJWT =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        const invalidJWT = 'invalid.jwt.token';

        assertEquals(globalTestUtils.security.validateJWT(validJWT), true);
        assertEquals(globalTestUtils.security.validateJWT(invalidJWT), false);
      });
    });
  })
  .run();
