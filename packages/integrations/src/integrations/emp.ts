export interface EMPConfig {
  name: string;
  port: number;
  remotes: Record<string, string>;
  exposes: Record<string, string>;
  shared: Record<string, any>;
  framework: 'react' | 'vue2' | 'vue3';
  mode: 'development' | 'production';
  runtime?: EMPRuntimeConfig;
  devServer?: EMPDevServerConfig;
  optimization?: EMPOptimizationConfig;
}

export interface EMPRuntimeConfig {
  loadingComponent?: string;
  errorBoundary?: boolean;
  preload?: string[];
  timeout?: number;
  retries?: number;
  fallback?: Record<string, string>;
  plugins?: any[];
}

export interface EMPDevServerConfig {
  hot?: boolean;
  liveReload?: boolean;
  historyApiFallback?: boolean;
  compress?: boolean;
  proxy?: Record<string, any>;
  headers?: Record<string, string>;
  https?: boolean;
  allowedHosts?: string[];
}

export interface EMPOptimizationConfig {
  splitChunks?: boolean;
  treeshaking?: boolean;
  minify?: boolean;
  sideEffects?: boolean;
  usedExports?: boolean;
  concatenateModules?: boolean;
}

export interface MicroFrontendConfig {
  name: string;
  framework: 'react' | 'vue2' | 'vue3';
  exposed_components: Array<{
    name: string;
    path: string;
  }>;
}

export interface TeamConfig {
  name: string;
  path: string;
  port: number;
  modules: string[];
  dependencies: string[];
}

export interface WorkspaceConfig {
  shared_dependencies: string[];
  projects: ProjectConfig[];
  deployment: {
    cdn_url: string;
    production_domain: string;
    staging_domain: string;
  };
}

export interface ProjectConfig {
  name: string;
  path: string;
  port: number;
  exposed_modules: string[];
  dependencies: string[];
}

export class EMPIntegration {
  private config: EMPConfig;
  private runtime: any;
  private isInitialized = false;

  constructor(config: EMPConfig) {
    this.config = config;
    this.setupDefaults();
  }

  private setupDefaults() {
    this.config = {
      ...this.config,
      runtime: {
        loadingComponent: 'DefaultLoader',
        errorBoundary: true,
        preload: [],
        timeout: 5000,
        retries: 3,
        fallback: {},
        plugins: [],
        ...this.config.runtime,
      },
      devServer: {
        hot: true,
        liveReload: true,
        historyApiFallback: true,
        compress: true,
        https: false,
        ...this.config.devServer,
      },
      optimization: {
        splitChunks: true,
        treeshaking: true,
        minify: true,
        sideEffects: false,
        usedExports: true,
        concatenateModules: true,
        ...this.config.optimization,
      },
    };
  }

  async initializeRuntime() {
    if (this.isInitialized) return this.runtime;

    const runtimeConfig = {
      name: this.config.name,
      remotes: Object.entries(this.config.remotes).map(([name, url]) => ({
        name,
        entry: url,
      })),
      plugins: this.config.runtime?.plugins || [],
      showLog: this.config.mode === 'development',
    };

    if (typeof window !== 'undefined' && window.EMPShareLib) {
      const { EMPRuntime } = await import('@empjs/share/runtime');
      this.runtime = new EMPRuntime(window.EMPShareLib);
      this.runtime.init(runtimeConfig);
      this.isInitialized = true;
    }

    return this.runtime;
  }

  async loadRemoteModule<T = any>(remoteName: string, moduleName: string): Promise<T> {
    if (!this.runtime) {
      await this.initializeRuntime();
    }

    try {
      const module = await this.runtime.load<T>(`${remoteName}/${moduleName}`);
      return module;
    } catch (error) {
      console.error(`Failed to load remote module ${remoteName}/${moduleName}:`, error);
      const fallback = this.config.runtime?.fallback?.[moduleName];
      if (fallback) {
        return import(fallback) as Promise<T>;
      }
      throw error;
    }
  }

  async preloadRemotes(remoteNames: string[]) {
    if (!this.runtime) {
      await this.initializeRuntime();
    }

    return Promise.all(remoteNames.map((name) => this.runtime.preload(name)));
  }

  async setupMicroFrontend() {
    return {
      name: 'emp-micro-frontend',
      setup: () => ({
        federation: {
          name: this.config.name || 'katalyst-host',
          filename: 'emp.js',
          remotes: this.config.remotes || {
            'marketing-header': 'http://localhost:8001/emp.js',
            'marketing-footer': 'http://localhost:8002/emp.js',
            'product-showcase': 'http://localhost:8003/emp.js',
            'user-dashboard': 'http://localhost:8004/emp.js',
          },
          exposes: this.config.exposes || {
            './App': './src/App.tsx',
            './Router': './src/Router.tsx',
            './Store': './src/store/index.ts',
            './Components': './src/components/index.ts',
          },
          shared: {
            react: {
              singleton: true,
              requiredVersion: '^18.0.0',
              eager: true,
            },
            'react-dom': {
              singleton: true,
              requiredVersion: '^18.0.0',
              eager: true,
            },
            'react-router-dom': {
              singleton: true,
              requiredVersion: '^6.0.0',
            },
            '@tanstack/react-query': {
              singleton: true,
              requiredVersion: '^5.0.0',
            },
            zustand: {
              singleton: true,
              requiredVersion: '^4.0.0',
            },
            ...this.config.shared,
          },
        },
        rspack: {
          experiments: {
            rspackFuture: {
              disableTransformByDefault: true,
            },
            css: true,
            lazyCompilation: this.config.mode === 'development',
          },
          optimization: {
            splitChunks: this.config.optimization?.splitChunks
              ? {
                  chunks: 'all',
                  cacheGroups: {
                    vendor: {
                      test: /[\\/]node_modules[\\/]/,
                      name: 'vendors',
                      priority: 10,
                    },
                    react: {
                      test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                      name: 'react-vendor',
                      priority: 20,
                    },
                    empRuntime: {
                      test: /[\\/]node_modules[\\/]@empjs[\\/]/,
                      name: 'emp-runtime',
                      priority: 30,
                    },
                  },
                }
              : false,
            minimize: this.config.optimization?.minify,
            usedExports: this.config.optimization?.usedExports,
            sideEffects: this.config.optimization?.sideEffects,
            concatenateModules: this.config.optimization?.concatenateModules,
          },
          plugins: [
            {
              name: 'ModuleFederationPlugin',
              options: {
                name: this.config.name,
                filename: 'emp.js',
                remotes: this.config.remotes,
                exposes: this.config.exposes,
                shared: this.config.shared,
                runtime: this.config.runtime
                  ? {
                      loadingComponent: this.config.runtime.loadingComponent,
                      errorBoundary: this.config.runtime.errorBoundary,
                    }
                  : undefined,
              },
            },
            {
              name: '@empjs/rspack-plugin',
              options: {
                typescript: {
                  enabled: true,
                  cssModules: true,
                },
                react: {
                  fastRefresh: this.config.mode === 'development',
                },
              },
            },
            this.config.mode === 'development' && {
              name: '@rsdoctor/rspack-plugin',
              options: {
                disableClientServer: false,
                features: ['bundle', 'module', 'plugins'],
              },
            },
          ].filter(Boolean),
        },
        performance: {
          firstLoad: '28% faster than previous versions',
          secondLoad: '45% faster than previous versions',
          bundleSize: '24% smaller production bundles',
        },
      }),
      plugins: ['@empjs/cli', '@empjs/share', '@empjs/rspack-plugin'],
      dependencies: [
        '@empjs/cli',
        '@empjs/share',
        '@empjs/rspack-plugin',
        '@rspack/core',
        '@rspack/dev-server',
        '@empjs/typescript-plugin-css-modules',
      ],
      features: [
        'Module Federation 2.0',
        'Runtime Type Safety',
        'CSS Modules TypeScript Plugin',
        'Hot Module Replacement',
        'React Fast Refresh',
        'Vue HMR Support',
        'RSDoctor Integration',
        'Cross-Framework Components',
      ],
    };
  }

  generateMicroFrontendConfig(config: MicroFrontendConfig) {
    const empConfig = {
      name: config.name,
      filename: 'emp.js',
      exposes: config.exposed_components.reduce(
        (acc, component) => {
          acc[`./${component.name}`] = component.path;
          return acc;
        },
        {} as Record<string, string>
      ),
      shared: this.getSharedDependencies(config.framework),
    };

    return empConfig;
  }

  private getSharedDependencies(framework: 'react' | 'vue2' | 'vue3') {
    const baseDependencies = {
      react: { singleton: true, requiredVersion: '^18.0.0' },
      'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
    };

    switch (framework) {
      case 'react':
        return {
          ...baseDependencies,
          '@empjs/share/adapter': { singleton: true },
        };
      case 'vue2':
        return {
          ...baseDependencies,
          vue: { singleton: true, requiredVersion: '^2.7.0' },
          '@empjs/share/vue2-adapter': { singleton: true },
        };
      case 'vue3':
        return {
          ...baseDependencies,
          vue: { singleton: true, requiredVersion: '^3.0.0' },
          '@empjs/share/vue3-adapter': { singleton: true },
        };
      default:
        return baseDependencies;
    }
  }

  configureMarketingTeamsWorkspace(teams: TeamConfig[]): WorkspaceConfig {
    const workspace: WorkspaceConfig = {
      shared_dependencies: [
        'react',
        'react-dom',
        'react-router-dom',
        'styled-components',
        'analytics-lib',
        '@tanstack/react-query',
        'zustand',
      ],
      projects: teams.map((team) => ({
        name: team.name,
        path: team.path,
        port: team.port,
        exposed_modules: team.modules,
        dependencies: team.dependencies,
      })),
      deployment: {
        cdn_url: 'https://cdn.example.com/marketing',
        production_domain: 'marketing.example.com',
        staging_domain: 'staging-marketing.example.com',
      },
    };

    return workspace;
  }

  async setupShellApplication() {
    return {
      name: 'emp-shell',
      setup: () => ({
        remoteModules: {
          'team-branding': {
            url: 'https://cdn.example.com/marketing/team-branding/emp.js',
            modules: ['Header', 'Footer', 'ColorTheme'],
          },
          'team-product': {
            url: 'https://cdn.example.com/marketing/team-product/emp.js',
            modules: ['ProductGrid', 'ProductDetail', 'ProductSearch'],
          },
          'team-blog': {
            url: 'https://cdn.example.com/marketing/team-blog/emp.js',
            modules: ['BlogList', 'BlogPost', 'AuthorBio'],
          },
          'team-analytics': {
            url: 'https://cdn.example.com/marketing/team-analytics/emp.js',
            modules: ['AnalyticsProvider', 'EventTracker'],
          },
        },
        errorBoundary: true,
        loadingFallback: 'BrandedLoadingSpinner',
        remoteTimeout: 5000,
        retryAttempts: 3,
        fallbackComponents: {
          Header: 'DefaultHeader',
          Footer: 'DefaultFooter',
          ProductGrid: 'EmptyProductGrid',
        },
      }),
    };
  }

  async setupDevelopmentServer() {
    const devServerConfig = {
      ...this.config.devServer,
      onBeforeSetupMiddleware: (devServer: any) => {
        devServer.app.use('/emp-runtime', (req: any, res: any) => {
          res.json({
            remotes: this.config.remotes,
            status: 'healthy',
            uptime: process.uptime(),
            version: '3.9.1',
          });
        });
      },
    };

    return {
      name: 'emp-dev-server',
      setup: () => ({
        port: this.config.port || 8080,
        hot: devServerConfig.hot !== false,
        liveReload: devServerConfig.liveReload !== false,
        historyApiFallback: devServerConfig.historyApiFallback !== false,
        compress: devServerConfig.compress !== false,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
          ...devServerConfig.headers,
        },
        proxy: devServerConfig.proxy || {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            pathRewrite: {
              '^/api': '',
            },
          },
        },
        static: {
          directory: './public',
          publicPath: '/',
        },
        ...devServerConfig,
      }),
    };
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupMicroFrontend(),
      this.setupShellApplication(),
      this.setupDevelopmentServer(),
      this.setupTypeGeneration(),
      this.setupRuntimeMonitoring(),
    ]);

    await this.initializeRuntime();
    return integrations.filter(Boolean);
  }

  async setupTypeGeneration() {
    return {
      name: 'emp-type-generation',
      setup: () => ({
        generateTypes: true,
        typeOutputPath: './@mf-types',
        updateOnChange: true,
        plugins: ['@empjs/typescript-plugin-css-modules'],
      }),
    };
  }

  async setupRuntimeMonitoring() {
    return {
      name: 'emp-runtime-monitoring',
      setup: () => ({
        enabled: this.config.mode === 'production',
        metrics: ['module-load-time', 'remote-fetch-duration', 'error-rate', 'cache-hit-ratio'],
        errorTracking: {
          enabled: true,
          sampleRate: 0.1,
        },
      }),
    };
  }

  getCliCommands() {
    return {
      init: 'emp init <project-name>',
      dev: 'emp dev',
      build: 'emp build',
      serve: 'emp serve',
      analyze: 'emp analyze',
      doctor: 'emp doctor',
      'type-gen': 'emp type-gen',
      'remote-add': 'emp remote add <name> <url>',
      'remote-list': 'emp remote list',
    };
  }

  getEMPConfig() {
    return {
      ...this.config,
      rspack: {
        entry: './src/index.ts',
        output: {
          path: './dist',
          publicPath: 'auto',
          uniqueName: this.config.name,
        },
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@': './src',
          },
        },
        module: {
          rules: [
            {
              test: /\.module\.(scss|sass|css)$/,
              type: 'css/module',
              use: ['sass-loader'],
            },
          ],
        },
      },
    };
  }

  getTypeDefinitions() {
    return `
      interface RemoteModule {
        url: string;
        modules: string[];
      }

      interface ShellConfig {
        remoteModules: Record<string, RemoteModule>;
        errorBoundary: boolean;
        loadingFallback: string;
        remoteTimeout: number;
        retryAttempts: number;
        fallbackComponents: Record<string, string>;
      }

      interface DevServerConfig {
        port: number;
        hot: boolean;
        liveReload: boolean;
        historyApiFallback: boolean;
        compress: boolean;
        headers: Record<string, string>;
        proxy: Record<string, any>;
        static: {
          directory: string;
          publicPath: string;
        };
      }
    `;
  }
}
