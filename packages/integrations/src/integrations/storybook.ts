import type { StorybookConfig } from '../types/index.ts';

export interface StorybookConfiguration {
  stories: string[];
  addons: string[];
  framework: StorybookFramework;
  features: StorybookFeatures;
  typescript: StorybookTypeScript;
  docs: StorybookDocs;
}

export interface StorybookFramework {
  name: string;
  options: Record<string, any>;
}

export interface StorybookFeatures {
  buildStoriesJson: boolean;
  storyStoreV7: boolean;
  argTypeTargetsV7: boolean;
  warnOnLegacyHierarchySeparator: boolean;
}

export interface StorybookTypeScript {
  check: boolean;
  reactDocgen: string;
  reactDocgenTypescriptOptions: Record<string, any>;
}

export interface StorybookDocs {
  autodocs: string;
  defaultName: string;
}

export class StorybookIntegration {
  private config: StorybookConfig;

  constructor(config: StorybookConfig) {
    this.config = config;
  }

  async setupStorybook() {
    return {
      name: 'storybook-rsbuild',
      setup: (): StorybookConfiguration => ({
        stories: [
          '../core/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
          '../remix/app/**/*.stories.@(js|jsx|ts|tsx|mdx)',
          '../nextjs/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
          '../shared/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
        ],
        addons: [
          '@storybook/addon-essentials',
          '@storybook/addon-interactions',
          '@storybook/addon-a11y',
          '@storybook/addon-docs',
          '@storybook/addon-controls',
          '@storybook/addon-viewport',
          '@storybook/addon-backgrounds',
          '@storybook/addon-measure',
          '@storybook/addon-outline',
          '@storybook/addon-design-tokens',
          '@storybook/addon-storysource',
          '@storybook/addon-knobs',
          'storybook-addon-designs',
          'storybook-addon-figma',
        ],
        framework: {
          name: '@storybook/react-rsbuild',
          options: {
            builder: {
              rsbuildConfigPath: '../shared/rsbuild.config.ts',
            },
          },
        },
        features: {
          buildStoriesJson: true,
          storyStoreV7: true,
          argTypeTargetsV7: true,
          warnOnLegacyHierarchySeparator: false,
        },
        typescript: {
          check: false,
          reactDocgen: 'react-docgen-typescript',
          reactDocgenTypescriptOptions: {
            shouldExtractLiteralValuesFromEnum: true,
            propFilter: (prop: any) =>
              prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
          },
        },
        docs: {
          autodocs: 'tag',
          defaultName: 'Documentation',
        },
      }),
      plugins: ['@storybook/react-rsbuild', 'storybook-addon-designs', 'storybook-addon-figma'],
      dependencies: [
        '@storybook/react',
        '@storybook/react-rsbuild',
        '@storybook/addon-essentials',
        '@storybook/addon-interactions',
        '@storybook/addon-a11y',
        '@storybook/testing-library',
        'storybook',
      ],
    };
  }

  async setupStorybookPreview() {
    return {
      name: 'storybook-preview',
      setup: () => ({
        parameters: {
          actions: { argTypesRegex: '^on[A-Z].*' },
          controls: {
            matchers: {
              color: /(background|color)$/i,
              date: /Date$/,
            },
          },
          docs: {
            theme: 'light',
          },
          backgrounds: {
            default: 'light',
            values: [
              {
                name: 'light',
                value: '#ffffff',
              },
              {
                name: 'dark',
                value: '#1a1a1a',
              },
              {
                name: 'katalyst-primary',
                value: '#0066cc',
              },
            ],
          },
          viewport: {
            viewports: {
              mobile: {
                name: 'Mobile',
                styles: {
                  width: '375px',
                  height: '667px',
                },
              },
              tablet: {
                name: 'Tablet',
                styles: {
                  width: '768px',
                  height: '1024px',
                },
              },
              desktop: {
                name: 'Desktop',
                styles: {
                  width: '1440px',
                  height: '900px',
                },
              },
            },
          },
        },
        globalTypes: {
          theme: {
            description: 'Global theme for components',
            defaultValue: 'light',
            toolbar: {
              title: 'Theme',
              icon: 'paintbrush',
              items: [
                { value: 'light', title: 'Light' },
                { value: 'dark', title: 'Dark' },
              ],
              dynamicTitle: true,
            },
          },
        },
        decorators: [
          (Story: any, context: any) => {
            const theme = context.globals.theme;
            return `
              <div className="katalyst-theme-${theme}" style="padding: 1rem;">
                ${Story()}
              </div>
            `;
          },
        ],
      }),
    };
  }

  async setupStorybookMain() {
    return {
      name: 'storybook-main',
      setup: () => ({
        staticDirs: ['../public'],
        rsbuildFinal: async (config: any) => {
          config.resolve = config.resolve || {};
          config.resolve.alias = {
            ...config.resolve.alias,
            '@': '../shared/src',
            '@katalyst-react/shared': '../shared/src/index.ts',
            '@katalyst-react/core': '../core/src/main.tsx',
            '@katalyst-react/remix': '../remix/app/root.tsx',
            '@katalyst-react/nextjs': '../nextjs/src/app/page.tsx',
          };

          config.plugins = config.plugins || [];

          return config;
        },
        env: (config: any) => ({
          ...config,
          STORYBOOK_THEME: 'katalyst',
        }),
        managerHead: (head: string) => `
          ${head}
          <link rel="icon" type="image/png" href="/favicon.png" />
          <title>Katalyst Design System</title>
        `,
      }),
    };
  }

  async setupDesignSystem() {
    return {
      name: 'storybook-design-system',
      setup: () => ({
        designTokens: {
          colors: {
            primary: '#0066cc',
            secondary: '#6c757d',
            success: '#28a745',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8',
          },
          spacing: {
            xs: '0.25rem',
            sm: '0.5rem',
            md: '1rem',
            lg: '1.5rem',
            xl: '2rem',
          },
          typography: {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: {
              xs: '0.75rem',
              sm: '0.875rem',
              base: '1rem',
              lg: '1.125rem',
              xl: '1.25rem',
            },
          },
        },
        componentCategories: [
          {
            name: 'Foundation',
            components: ['Colors', 'Typography', 'Spacing', 'Icons'],
          },
          {
            name: 'Components',
            components: ['Button', 'Input', 'Card', 'Modal', 'Table'],
          },
          {
            name: 'Layout',
            components: ['Grid', 'Container', 'Stack', 'Flex'],
          },
          {
            name: 'Navigation',
            components: ['Header', 'Sidebar', 'Breadcrumb', 'Pagination'],
          },
          {
            name: 'Data Display',
            components: ['Chart', 'List', 'Timeline', 'Badge'],
          },
          {
            name: 'Feedback',
            components: ['Alert', 'Toast', 'Progress', 'Skeleton'],
          },
        ],
        templates: [
          {
            name: 'Marketing Page',
            description: 'Complete marketing page template',
            components: ['Header', 'Hero', 'Features', 'Testimonials', 'Footer'],
          },
          {
            name: 'Dashboard',
            description: 'Admin dashboard template',
            components: ['Sidebar', 'TopBar', 'Stats', 'Charts', 'Table'],
          },
          {
            name: 'E-commerce',
            description: 'Product catalog and checkout',
            components: ['ProductGrid', 'ProductCard', 'Cart', 'Checkout'],
          },
        ],
      }),
    };
  }

  async setupTestingIntegration() {
    return {
      name: 'storybook-testing',
      setup: () => ({
        testRunner: '@storybook/test-runner',
        coverage: {
          enabled: true,
          threshold: {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80,
          },
        },
        visualTesting: {
          enabled: true,
          provider: 'chromatic',
          threshold: 0.2,
        },
        accessibilityTesting: {
          enabled: true,
          rules: ['wcag2a', 'wcag2aa'],
          tags: ['best-practice'],
        },
        interactionTesting: {
          enabled: true,
          framework: '@storybook/testing-library',
        },
      }),
    };
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupStorybook(),
      this.setupStorybookPreview(),
      this.setupStorybookMain(),
      this.setupDesignSystem(),
      this.setupTestingIntegration(),
    ]);

    return integrations.filter(Boolean);
  }

  getStoryTemplates() {
    return {
      component: `
        import type { Meta, StoryObj } from '@storybook/react';
        import { Button } from './Button';

        const meta: Meta<typeof Button> = {
          title: 'Components/Button',
          component: Button,
          parameters: {
            layout: 'centered',
          },
          tags: ['autodocs'],
          argTypes: {
            backgroundColor: { control: 'color' },
          },
        };

        export default meta;
        type Story = StoryObj<typeof meta>;

        export const Primary: Story = {
          args: {
            primary: true,
            label: 'Button',
          },
        };

        export const Secondary: Story = {
          args: {
            label: 'Button',
          },
        };
      `,
      page: `
        import type { Meta, StoryObj } from '@storybook/react';
        import { within, userEvent, expect } from '@storybook/test';
        import { Page } from './Page';

        const meta: Meta<typeof Page> = {
          title: 'Pages/Page',
          component: Page,
          parameters: {
            layout: 'fullscreen',
          },
        };

        export default meta;
        type Story = StoryObj<typeof meta>;

        export const LoggedOut: Story = {};

        export const LoggedIn: Story = {
          play: async ({ canvasElement }) => {
            const canvas = within(canvasElement);
            const loginButton = canvas.getByRole('button', { name: /Log in/i });
            await expect(loginButton).toBeInTheDocument();
          },
        };
      `,
    };
  }

  getTypeDefinitions() {
    return `
      interface StorybookConfiguration {
        stories: string[];
        addons: string[];
        framework: StorybookFramework;
        features: StorybookFeatures;
        typescript: StorybookTypeScript;
        docs: StorybookDocs;
      }

      interface StorybookFramework {
        name: string;
        options: Record<string, any>;
      }

      interface StorybookFeatures {
        buildStoriesJson: boolean;
        storyStoreV7: boolean;
        argTypeTargetsV7: boolean;
        warnOnLegacyHierarchySeparator: boolean;
      }

      interface Story {
        title: string;
        component: React.ComponentType;
        parameters?: Record<string, any>;
        args?: Record<string, any>;
        argTypes?: Record<string, any>;
      }

      declare module '@storybook/react' {
        export interface Meta<T = any> {
          title: string;
          component: T;
          parameters?: Record<string, any>;
          tags?: string[];
          argTypes?: Record<string, any>;
        }

        export interface StoryObj<T = any> {
          args?: Record<string, any>;
          parameters?: Record<string, any>;
          play?: (context: any) => Promise<void>;
        }
      }
    `;
  }
}
