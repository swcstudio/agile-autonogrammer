declare const process:
  | {
      env: {
        NX_CLOUD_ACCESS_TOKEN?: string;
      };
    }
  | undefined;

export interface NxConfig {
  workspaceName: string;
  projects: NxProject[];
  cacheEnabled: boolean;
  affectedEnabled: boolean;
  distributedTaskExecution: boolean;
  cloudEnabled: boolean;
}

export interface NxProject {
  name: string;
  type: 'application' | 'library';
  sourceRoot: string;
  targets: Record<string, NxTarget>;
  tags: string[];
  implicitDependencies: string[];
}

export interface NxTarget {
  executor: string;
  options: Record<string, any>;
  configurations?: Record<string, any>;
}

export interface ModuleFederationConfig {
  name: string;
  remotes: Record<string, string>;
  exposes: Record<string, string>;
  shared: Record<string, any>;
}

export class NxIntegration {
  private config: NxConfig;

  constructor(config: NxConfig) {
    this.config = config;
  }

  async setupWorkspace() {
    return {
      name: 'nx-workspace',
      setup: () => ({
        version: 3,
        projects: this.generateProjects(),
        targetDefaults: {
          build: {
            cache: true,
            dependsOn: ['^build'],
            inputs: ['production', '^production'],
          },
          test: {
            cache: true,
            inputs: ['default', '^production', '{workspaceRoot}/jest.preset.js'],
          },
          lint: {
            cache: true,
            inputs: [
              'default',
              '{workspaceRoot}/.eslintrc.json',
              '{workspaceRoot}/tools/eslint-rules/**/*',
            ],
          },
          e2e: {
            cache: true,
            inputs: ['default', '^production'],
          },
        },
        namedInputs: {
          default: ['{projectRoot}/**/*', 'sharedGlobals'],
          production: [
            'default',
            '!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)',
            '!{projectRoot}/tsconfig.spec.json',
            '!{projectRoot}/jest.config.[jt]s',
            '!{projectRoot}/.eslintrc.json',
            '!{projectRoot}/src/test-setup.[jt]s',
            '!{projectRoot}/test-setup.[jt]s',
          ],
          sharedGlobals: [],
        },
        generators: {
          '@nx/react': {
            application: {
              style: 'tailwind',
              linter: 'biome',
              bundler: 'rspack',
              unitTestRunner: 'vitest',
              e2eTestRunner: 'playwright',
            },
            component: {
              style: 'tailwind',
            },
            library: {
              style: 'tailwind',
              linter: 'biome',
              unitTestRunner: 'vitest',
            },
          },
        },
        tasksRunnerOptions: {
          default: {
            runner: 'nx/tasks-runners/default',
            options: {
              cacheableOperations: ['build', 'lint', 'test', 'e2e'],
              parallel: 3,
              useDaemonProcess: true,
            },
          },
        },
        cache: this.config.cacheEnabled,
        affected: this.config.affectedEnabled
          ? {
              defaultBase: 'main',
            }
          : undefined,
        cli: {
          packageManager: 'pnpm',
        },
      }),
      plugins: [
        '@nx/react/plugin',
        '@nx/rspack/plugin',
        '@nx/vite/plugin',
        '@nx/playwright/plugin',
        '@nx/storybook/plugin',
      ],
      dependencies: [
        'nx',
        '@nx/react',
        '@nx/rspack',
        '@nx/vite',
        '@nx/playwright',
        '@nx/storybook',
        '@nx/js',
      ],
    };
  }

  private generateProjects(): Record<string, NxProject> {
    const projects: Record<string, NxProject> = {};

    projects['katalyst-core'] = {
      name: 'katalyst-core',
      type: 'application',
      sourceRoot: 'core/src',
      targets: {
        build: {
          executor: '@nx/rspack:rspack',
          options: {
            target: 'web',
            main: 'core/src/main.tsx',
            tsConfig: 'core/tsconfig.app.json',
            outputPath: 'dist/core',
            rspackConfig: 'core/rsbuild.config.ts',
          },
          configurations: {
            production: {
              mode: 'production',
              optimization: true,
              extractLicenses: false,
              sourceMap: false,
            },
          },
        },
        serve: {
          executor: '@nx/rspack:dev-server',
          options: {
            buildTarget: 'katalyst-core:build',
            port: 3000,
            host: 'localhost',
          },
        },
        test: {
          executor: '@nx/vite:test',
          options: {
            passWithNoTests: true,
            reportsDirectory: '../coverage/core',
          },
        },
        lint: {
          executor: '@biomejs/biome:lint',
          options: {
            lintFilePatterns: ['core/**/*.{ts,tsx}'],
          },
        },
      },
      tags: ['scope:katalyst', 'type:app'],
      implicitDependencies: ['katalyst-shared'],
    };

    projects['katalyst-remix'] = {
      name: 'katalyst-remix',
      type: 'application',
      sourceRoot: 'remix/app',
      targets: {
        build: {
          executor: '@nx/remix:build',
          options: {
            outputPath: 'dist/remix',
          },
        },
        serve: {
          executor: '@nx/remix:serve',
          options: {
            command: 'remix dev',
            port: 3001,
          },
        },
        test: {
          executor: '@nx/vite:test',
          options: {
            passWithNoTests: true,
            reportsDirectory: '../coverage/remix',
          },
        },
        lint: {
          executor: '@biomejs/biome:lint',
          options: {
            lintFilePatterns: ['remix/**/*.{ts,tsx}'],
          },
        },
      },
      tags: ['scope:katalyst', 'type:app'],
      implicitDependencies: ['katalyst-shared'],
    };

    projects['katalyst-nextjs'] = {
      name: 'katalyst-nextjs',
      type: 'application',
      sourceRoot: 'nextjs/src',
      targets: {
        build: {
          executor: '@nx/next:build',
          options: {
            outputPath: 'dist/nextjs',
          },
        },
        serve: {
          executor: '@nx/next:serve',
          options: {
            dev: true,
            port: 3002,
          },
        },
        test: {
          executor: '@nx/vite:test',
          options: {
            passWithNoTests: true,
            reportsDirectory: '../coverage/nextjs',
          },
        },
        lint: {
          executor: '@biomejs/biome:lint',
          options: {
            lintFilePatterns: ['nextjs/**/*.{ts,tsx}'],
          },
        },
      },
      tags: ['scope:katalyst', 'type:app'],
      implicitDependencies: ['katalyst-shared'],
    };

    projects['katalyst-shared'] = {
      name: 'katalyst-shared',
      type: 'library',
      sourceRoot: 'shared/src',
      targets: {
        build: {
          executor: '@nx/vite:build',
          options: {
            outputPath: 'dist/shared',
            main: 'shared/src/index.ts',
            tsConfig: 'shared/tsconfig.lib.json',
          },
        },
        test: {
          executor: '@nx/vite:test',
          options: {
            passWithNoTests: true,
            reportsDirectory: '../coverage/shared',
          },
        },
        lint: {
          executor: '@biomejs/biome:lint',
          options: {
            lintFilePatterns: ['shared/**/*.{ts,tsx}'],
          },
        },
      },
      tags: ['scope:katalyst', 'type:lib'],
      implicitDependencies: [],
    };

    return projects;
  }

  async setupModuleFederation() {
    return {
      name: 'nx-module-federation',
      setup: () => ({
        host: {
          name: 'katalyst-host',
          port: 3000,
          remotes: ['katalyst-marketing', 'katalyst-dashboard', 'katalyst-components'],
        },
        remotes: {
          'katalyst-marketing': {
            name: 'katalyst-marketing',
            port: 3001,
            exposes: {
              './Header': './src/components/Header',
              './Footer': './src/components/Footer',
              './Hero': './src/components/Hero',
            },
          },
          'katalyst-dashboard': {
            name: 'katalyst-dashboard',
            port: 3002,
            exposes: {
              './Dashboard': './src/components/Dashboard',
              './Analytics': './src/components/Analytics',
              './Settings': './src/components/Settings',
            },
          },
          'katalyst-components': {
            name: 'katalyst-components',
            port: 3003,
            exposes: {
              './Button': './src/components/Button',
              './Input': './src/components/Input',
              './Modal': './src/components/Modal',
            },
          },
        },
        shared: {
          react: { singleton: true, requiredVersion: '^18.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
          '@tanstack/react-query': { singleton: true },
          zustand: { singleton: true },
        },
      }),
    };
  }

  async setupDistributedTaskExecution() {
    return {
      name: 'nx-distributed-tasks',
      setup: () => ({
        agents: [
          {
            name: 'agent-1',
            maxConcurrentTasks: 3,
          },
          {
            name: 'agent-2',
            maxConcurrentTasks: 3,
          },
        ],
        distributedTasksConfig: {
          build: {
            parallel: true,
            maxParallel: 6,
          },
          test: {
            parallel: true,
            maxParallel: 4,
          },
          lint: {
            parallel: true,
            maxParallel: 8,
          },
        },
        caching: {
          enabled: true,
          location: 'local',
          maxSizeGb: 10,
        },
      }),
    };
  }

  async setupCloudIntegration() {
    return {
      name: 'nx-cloud',
      setup: () => ({
        enabled: this.config.cloudEnabled,
        accessToken:
          (typeof process !== 'undefined' && process.env?.NX_CLOUD_ACCESS_TOKEN) || undefined,
        url: 'https://nx.app',
        caching: {
          enabled: true,
          readOnly: false,
        },
        distributedTaskExecution: {
          enabled: this.config.distributedTaskExecution,
        },
        analytics: {
          enabled: true,
        },
      }),
    };
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupWorkspace(),
      this.setupModuleFederation(),
      this.setupDistributedTaskExecution(),
      this.setupCloudIntegration(),
    ]);

    return integrations.filter(Boolean);
  }

  getCliCommands() {
    return {
      build: 'nx build <project>',
      serve: 'nx serve <project>',
      test: 'nx test <project>',
      lint: 'nx lint <project>',
      affected: 'nx affected:<command>',
      graph: 'nx graph',
      migrate: 'nx migrate <package>',
      generate: 'nx generate <schematic>',
      run: 'nx run <project>:<target>',
      'run-many': 'nx run-many --target=<target> --projects=<projects>',
    };
  }

  getTypeDefinitions() {
    return `
      interface NxWorkspaceConfig {
        version: number;
        projects: Record<string, NxProject>;
        targetDefaults: Record<string, any>;
        namedInputs: Record<string, string[]>;
        generators: Record<string, any>;
        tasksRunnerOptions: Record<string, any>;
      }

      interface NxProject {
        name: string;
        type: 'application' | 'library';
        sourceRoot: string;
        targets: Record<string, NxTarget>;
        tags: string[];
        implicitDependencies: string[];
      }

      interface NxTarget {
        executor: string;
        options: Record<string, any>;
        configurations?: Record<string, any>;
      }

      interface ModuleFederationRemote {
        name: string;
        port: number;
        exposes: Record<string, string>;
      }
    `;
  }
}
