import type { RSpackConfig } from '../types/index.ts';

declare const process:
  | {
      env: {
        NODE_ENV?: string;
      };
    }
  | undefined;

export interface RSpackPlugin {
  name: string;
  apply: (compiler: any) => void;
}

export interface RSpackIntegrationOptions extends RSpackConfig {
  enableModuleFederation?: boolean;
  enableSwcHelpers?: boolean;
  enableWebWorkers?: boolean;
  enableWasm?: boolean;
  enableSourceMaps?: boolean;
  enableBundleAnalyzer?: boolean;
  enableProgressBar?: boolean;
  enableTypeChecking?: boolean;
  customPlugins?: RSpackPlugin[];
}

export class RSpackIntegration {
  private config: RSpackIntegrationOptions;
  private initialized = false;
  private plugins: Map<string, RSpackPlugin> = new Map();

  constructor(config: RSpackIntegrationOptions) {
    this.config = {
      enableSwcHelpers: true,
      enableSourceMaps: process?.env?.NODE_ENV !== 'production',
      enableProgressBar: true,
      ...config,
    };
  }

  async initialize() {
    if (this.initialized) {
      return [];
    }

    const integrations = await Promise.all([
      this.setupCorePlugins(),
      this.setupOptimizations(),
      this.setupDevelopmentServer(),
      this.setupProductionBuild(),
    ]);

    this.initialized = true;
    return integrations.filter(Boolean);
  }

  private async setupCorePlugins() {
    // Setup core RSpack plugins
    const plugins = [];

    // Progress plugin
    if (this.config.enableProgressBar) {
      plugins.push({
        name: 'rspack-progress-plugin',
        config: {
          profile: true,
          activeModules: true,
        },
      });
    }

    // Module Federation
    if (this.config.enableModuleFederation) {
      plugins.push({
        name: 'module-federation-plugin',
        config: {
          name: 'katalyst_rspack',
          filename: 'remoteEntry.js',
          exposes: {},
          remotes: {},
          shared: {
            react: { singleton: true, requiredVersion: '^19.0.0' },
            'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
          },
        },
      });
    }

    // Bundle Analyzer
    if (this.config.enableBundleAnalyzer) {
      plugins.push({
        name: 'bundle-analyzer-plugin',
        config: {
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-report.html',
        },
      });
    }

    return { type: 'plugins', plugins };
  }

  private async setupOptimizations() {
    const optimizations = {
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        minRemainingSize: 0,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
          katalyst: {
            test: /[\\/]shared[\\/]src[\\/]/,
            name: 'katalyst-shared',
            chunks: 'all',
            priority: 15,
          },
        },
      },
      runtimeChunk: {
        name: 'runtime',
      },
      moduleIds: 'deterministic',
      minimize: process?.env?.NODE_ENV === 'production',
      usedExports: true,
      sideEffects: false,
    };

    return { type: 'optimizations', config: optimizations };
  }

  private async setupDevelopmentServer() {
    if (process?.env?.NODE_ENV === 'production') {
      return null;
    }

    return {
      type: 'devServer',
      config: {
        hot: true,
        liveReload: true,
        historyApiFallback: true,
        compress: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
        },
        client: {
          overlay: {
            errors: true,
            warnings: false,
          },
          progress: true,
        },
      },
    };
  }

  private async setupProductionBuild() {
    if (process?.env?.NODE_ENV !== 'production') {
      return null;
    }

    return {
      type: 'production',
      config: {
        output: {
          hashFunction: 'xxhash64',
          hashDigestLength: 8,
          crossOriginLoading: 'anonymous',
        },
        optimization: {
          realContentHash: true,
          mergeDuplicateChunks: true,
          removeAvailableModules: true,
        },
      },
    };
  }

  generateConfig(variant: 'core' | 'remix' | 'nextjs') {
    const baseConfig = {
      mode:
        typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production'
          ? 'production'
          : 'development',
      entry: this.getEntryPoint(variant),
      output: {
        path: './dist',
        filename: '[name].[contenthash:8].js',
        chunkFilename: '[name].[contenthash:8].chunk.js',
        publicPath: '/',
        clean: true,
        cssFilename: 'css/[name].[contenthash:8].css',
        cssChunkFilename: 'css/[name].[contenthash:8].chunk.css',
        assetModuleFilename: 'assets/[name].[hash][ext]',
      },
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.node', '.wasm'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/hooks': './src/hooks',
          '@/utils': './src/utils',
          '@/stores': './src/stores',
          '@katalyst/multithreading': './shared/src/native',
          '@katalyst/shared': './shared/src',
        },
        fallback: this.config.enableWebWorkers
          ? {
              worker_threads: false,
              fs: false,
              path: false,
            }
          : undefined,
      },
      module: {
        rules: this.getModuleRules(variant),
        parser: this.config.enableWasm
          ? {
              javascript: {
                wasm: true,
              },
            }
          : undefined,
      },
      plugins: this.getPlugins(variant),
      optimization: this.config.optimization || {},
      performance: this.config.performance || {},
      experiments: this.getExperiments(),
      devtool: this.getDevtool(),
      cache: this.getCacheConfig(),
      stats: this.getStatsConfig(),
    };

    return baseConfig;
  }

  private getModuleRules(variant: 'core' | 'remix' | 'nextjs') {
    const rules = [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                  decorators: true,
                  dynamicImport: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: process?.env?.NODE_ENV !== 'production',
                    refresh: process?.env?.NODE_ENV !== 'production',
                  },
                  optimizer: {
                    globals: {
                      vars: {
                        __DEV__: process?.env?.NODE_ENV !== 'production',
                      },
                    },
                  },
                },
                target: 'es2022',
                externalHelpers: this.config.enableSwcHelpers,
              },
              module: {
                type: 'es6',
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName:
                  process?.env?.NODE_ENV === 'production'
                    ? '[hash:base64:8]'
                    : '[path][name]__[local]--[hash:base64:5]',
              },
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|webp|avif)$/,
        type: 'asset',
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },
      {
        test: /\.node$/,
        use: 'node-loader',
      },
    ];

    // Add WebAssembly support
    if (this.config.enableWasm) {
      rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });
    }

    // Add Web Worker support
    if (this.config.enableWebWorkers) {
      rules.push({
        test: /\.worker\.(ts|js)$/,
        use: [
          {
            loader: 'worker-loader',
            options: {
              esModule: true,
              filename: '[name].[contenthash:8].worker.js',
            },
          },
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: false,
                },
                target: 'es2022',
              },
            },
          },
        ],
      });
    }

    return rules;
  }

  private getExperiments() {
    const experiments: any = {
      asyncWebAssembly: this.config.enableWasm,
      topLevelAwait: true,
      outputModule: true,
      css: true,
    };

    if (this.config.enableModuleFederation) {
      experiments.lazyCompilation = {
        entries: false,
        imports: true,
      };
    }

    return experiments;
  }

  private getDevtool() {
    if (!this.config.enableSourceMaps) {
      return false;
    }

    return process?.env?.NODE_ENV === 'production' ? 'source-map' : 'eval-cheap-module-source-map';
  }

  private getCacheConfig() {
    return {
      type: 'filesystem' as const,
      cacheDirectory: '.rspack-cache',
      compression: 'gzip',
      profile: true,
      buildDependencies: {
        config: ['./rspack.config.ts', './package.json'],
      },
    };
  }

  private getStatsConfig() {
    return {
      preset: 'normal',
      colors: true,
      errorDetails: true,
      children: false,
      modules: false,
    };
  }

  private getEntryPoint(variant: 'core' | 'remix' | 'nextjs') {
    switch (variant) {
      case 'core':
        return './src/main.tsx';
      case 'remix':
        return './app/entry.client.tsx';
      case 'nextjs':
        return './src/app/page.tsx';
      default:
        return './src/main.tsx';
    }
  }

  private getPlugins(variant: 'core' | 'remix' | 'nextjs') {
    const plugins: RSpackPlugin[] = [];

    // HTML Plugin
    plugins.push({
      name: 'HtmlRspackPlugin',
      apply: (compiler) => {
        // This would be replaced with actual RSpack HTML plugin in real implementation
        compiler.hooks.emit.tapAsync('HtmlRspackPlugin', (compilation: any, callback: any) => {
          const html = this.generateHtmlTemplate(variant);
          compilation.assets['index.html'] = {
            source: () => html,
            size: () => html.length,
          };
          callback();
        });
      },
    });

    // Define Plugin for global constants
    plugins.push({
      name: 'DefinePlugin',
      apply: (compiler) => {
        const definitions = {
          'process.env.NODE_ENV': JSON.stringify(process?.env?.NODE_ENV || 'development'),
          __VARIANT__: JSON.stringify(variant),
          __KATALYST_VERSION__: JSON.stringify('1.0.0'),
          __RSPACK_ENABLED__: JSON.stringify(true),
        };

        compiler.hooks.compilation.tap('DefinePlugin', (compilation: any) => {
          compilation.hooks.optimizeChunkModules.tap('DefinePlugin', () => {
            // Define globals
            Object.entries(definitions).forEach(([key, value]) => {
              compilation.defineVariable(key, value);
            });
          });
        });
      },
    });

    // React Refresh Plugin for development
    if (process?.env?.NODE_ENV !== 'production' && this.config.plugins?.includes('react')) {
      plugins.push({
        name: 'ReactRefreshRspackPlugin',
        apply: (compiler) => {
          compiler.hooks.compilation.tap('ReactRefreshRspackPlugin', (compilation: any) => {
            // Enable React Fast Refresh
            compilation.hooks.buildModule.tap('ReactRefreshRspackPlugin', (module: any) => {
              if (module.resource && /\.(jsx?|tsx?)$/.test(module.resource)) {
                module.hotUpdate = true;
              }
            });
          });
        },
      });
    }

    // SVGR Plugin
    if (this.config.plugins?.includes('svgr')) {
      plugins.push({
        name: 'SvgrRspackPlugin',
        apply: (compiler) => {
          compiler.hooks.normalModuleFactory.tap('SvgrRspackPlugin', (factory: any) => {
            factory.hooks.createModule.tap('SvgrRspackPlugin', (data: any) => {
              if (data.resource && data.resource.endsWith('.svg')) {
                data.type = 'javascript/auto';
                data.generator = {
                  type: 'asset/resource',
                };
              }
            });
          });
        },
      });
    }

    // Type Check Plugin
    if (this.config.enableTypeChecking || this.config.plugins?.includes('type-check')) {
      plugins.push({
        name: 'TypeCheckRspackPlugin',
        apply: (compiler) => {
          let typescriptCheckProcess: any = null;

          compiler.hooks.watchRun.tapAsync('TypeCheckRspackPlugin', (_: any, callback: any) => {
            if (!typescriptCheckProcess) {
              const { spawn } = require('child_process');
              typescriptCheckProcess = spawn('tsc', ['--noEmit', '--watch'], {
                stdio: 'inherit',
                shell: true,
              });
            }
            callback();
          });

          compiler.hooks.done.tap('TypeCheckRspackPlugin', () => {
            if (typescriptCheckProcess) {
              console.log('[TypeCheck] TypeScript checking in progress...');
            }
          });
        },
      });
    }

    // Progress Plugin
    if (this.config.enableProgressBar) {
      plugins.push({
        name: 'ProgressPlugin',
        apply: (compiler) => {
          let progress = 0;
          compiler.hooks.compilation.tap('ProgressPlugin', (compilation: any) => {
            compilation.hooks.buildModule.tap('ProgressPlugin', () => {
              progress += 1;
              if (progress % 10 === 0) {
                console.log(`[RSpack] Building... ${progress} modules processed`);
              }
            });
          });
        },
      });
    }

    // Bundle Analyzer Plugin
    if (this.config.enableBundleAnalyzer) {
      plugins.push({
        name: 'BundleAnalyzerPlugin',
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync(
            'BundleAnalyzerPlugin',
            (compilation: any, callback: any) => {
              const stats = compilation.getStats().toJson({
                chunks: true,
                modules: true,
                assets: true,
              });

              const report = this.generateBundleReport(stats);
              compilation.assets['bundle-report.html'] = {
                source: () => report,
                size: () => report.length,
              };
              callback();
            }
          );
        },
      });
    }

    // Add custom plugins
    if (this.config.customPlugins) {
      plugins.push(...this.config.customPlugins);
    }

    // Store plugins for later use
    plugins.forEach((plugin) => {
      this.plugins.set(plugin.name, plugin);
    });

    return plugins;
  }

  private generateHtmlTemplate(variant: 'core' | 'remix' | 'nextjs'): string {
    const titles = {
      core: 'Katalyst Core - High Performance React Framework',
      remix: 'Katalyst Admin - Remix Powered Dashboard',
      nextjs: 'Katalyst Marketing - Next.js Website',
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Katalyst Framework - ${variant} variant">
    <title>${titles[variant]}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="dns-prefetch" href="https://fonts.googleapis.com">
</head>
<body>
    <div id="root"></div>
    <noscript>You need to enable JavaScript to run this application.</noscript>
</body>
</html>`;
  }

  private generateBundleReport(stats: any): string {
    const modules = stats.modules || [];
    const chunks = stats.chunks || [];
    const assets = stats.assets || [];

    const totalSize = assets.reduce((sum: number, asset: any) => sum + asset.size, 0);
    const formatSize = (bytes: number) => {
      const kb = bytes / 1024;
      return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>RSpack Bundle Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .size { text-align: right; }
        .summary { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>RSpack Bundle Analysis Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Bundle Size:</strong> ${formatSize(totalSize)}</p>
        <p><strong>Number of Chunks:</strong> ${chunks.length}</p>
        <p><strong>Number of Modules:</strong> ${modules.length}</p>
        <p><strong>Number of Assets:</strong> ${assets.length}</p>
    </div>

    <h2>Assets</h2>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th class="size">Size</th>
                <th>Type</th>
            </tr>
        </thead>
        <tbody>
            ${assets
              .map(
                (asset: any) => `
                <tr>
                    <td>${asset.name}</td>
                    <td class="size">${formatSize(asset.size)}</td>
                    <td>${asset.name.split('.').pop()}</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>

    <h2>Chunks</h2>
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Names</th>
                <th class="size">Size</th>
                <th>Modules</th>
            </tr>
        </thead>
        <tbody>
            ${chunks
              .map(
                (chunk: any) => `
                <tr>
                    <td>${chunk.id}</td>
                    <td>${chunk.names.join(', ')}</td>
                    <td class="size">${formatSize(chunk.size)}</td>
                    <td>${chunk.modules ? chunk.modules.length : 0}</td>
                </tr>
            `
              )
              .join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  // API Methods for external use
  getPlugin(name: string): RSpackPlugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): RSpackPlugin[] {
    return Array.from(this.plugins.values());
  }

  addPlugin(plugin: RSpackPlugin) {
    this.plugins.set(plugin.name, plugin);
  }

  removePlugin(name: string) {
    this.plugins.delete(name);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig(): RSpackIntegrationOptions {
    return { ...this.config };
  }

  // Helper method to create a full RSpack configuration
  createFullConfig(variant: 'core' | 'remix' | 'nextjs' = 'core') {
    if (!this.initialized) {
      throw new Error('RSpackIntegration must be initialized before creating config');
    }

    return this.generateConfig(variant);
  }
}
