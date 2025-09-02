export interface RSpackPluginConfig {
  name: string;
  options?: Record<string, any>;
  enabled?: boolean;
  priority?: number;
}

export interface RSpackCompiler {
  hooks: {
    emit: any;
    compilation: any;
    watchRun: any;
    done: any;
    normalModuleFactory: any;
    contextModuleFactory: any;
    beforeCompile: any;
    afterCompile: any;
    thisCompilation: any;
  };
  options: any;
}

export type RSpackPluginFactory = (options?: any) => {
  name: string;
  apply: (compiler: RSpackCompiler) => void;
};

export class RSpackPluginManager {
  private plugins: Map<string, RSpackPluginConfig> = new Map();
  private pluginFactories: Map<string, RSpackPluginFactory> = new Map();

  constructor() {
    this.registerCorePlugins();
  }

  private registerCorePlugins() {
    // Register React Refresh Plugin
    this.registerPluginFactory('ReactRefreshPlugin', (options = {}) => ({
      name: 'ReactRefreshPlugin',
      apply: (compiler: RSpackCompiler) => {
        const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
        new ReactRefreshPlugin({
          overlay: {
            sockIntegration: 'webpack-hot-middleware',
          },
          ...options,
        }).apply(compiler);
      },
    }));

    // Register Module Federation Plugin
    this.registerPluginFactory('ModuleFederationPlugin', (options = {}) => ({
      name: 'ModuleFederationPlugin',
      apply: (compiler: RSpackCompiler) => {
        const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
        new ModuleFederationPlugin(options).apply(compiler);
      },
    }));

    // Register HTML Plugin
    this.registerPluginFactory('HtmlPlugin', (options = {}) => ({
      name: 'HtmlPlugin',
      apply: (compiler: RSpackCompiler) => {
        const HtmlWebpackPlugin = require('html-webpack-plugin');
        new HtmlWebpackPlugin({
          template: './src/index.html',
          inject: 'body',
          minify: compiler.options.mode === 'production',
          ...options,
        }).apply(compiler);
      },
    }));

    // Register Copy Plugin
    this.registerPluginFactory('CopyPlugin', (options = {}) => ({
      name: 'CopyPlugin',
      apply: (compiler: RSpackCompiler) => {
        const CopyPlugin = require('copy-webpack-plugin');
        new CopyPlugin({
          patterns: options.patterns || [],
          ...options,
        }).apply(compiler);
      },
    }));

    // Register Define Plugin
    this.registerPluginFactory('DefinePlugin', (options = {}) => ({
      name: 'DefinePlugin',
      apply: (compiler: RSpackCompiler) => {
        compiler.hooks.compilation.tap('DefinePlugin', (compilation: any) => {
          Object.entries(options).forEach(([key, value]) => {
            compilation.defineVariable(key, JSON.stringify(value));
          });
        });
      },
    }));

    // Register Progress Plugin
    this.registerPluginFactory('ProgressPlugin', (options = {}) => ({
      name: 'ProgressPlugin',
      apply: (compiler: RSpackCompiler) => {
        const handler =
          options.handler ||
          ((percentage: number, message: string) => {
            const percent = Math.round(percentage * 100);
            console.log(`[RSpack] ${percent}% ${message}`);
          });

        let lastPercentage = -1;
        compiler.hooks.compilation.tap('ProgressPlugin', (compilation: any) => {
          compilation.hooks.buildModule.tap('ProgressPlugin', () => {
            const modules = compilation.modules?.size || 0;
            const percentage = Math.min(modules / 1000, 0.95);
            if (Math.abs(percentage - lastPercentage) > 0.05) {
              lastPercentage = percentage;
              handler(percentage, 'building modules');
            }
          });
        });

        compiler.hooks.done.tap('ProgressPlugin', () => {
          handler(1, 'completed');
        });
      },
    }));

    // Register Bundle Analyzer Plugin
    this.registerPluginFactory('BundleAnalyzerPlugin', (options = {}) => ({
      name: 'BundleAnalyzerPlugin',
      apply: (compiler: RSpackCompiler) => {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: 'bundle-report.html',
          openAnalyzer: false,
          generateStatsFile: true,
          statsFilename: 'bundle-stats.json',
          ...options,
        }).apply(compiler);
      },
    }));

    // Register Compression Plugin
    this.registerPluginFactory('CompressionPlugin', (options = {}) => ({
      name: 'CompressionPlugin',
      apply: (compiler: RSpackCompiler) => {
        const CompressionPlugin = require('compression-webpack-plugin');
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
          ...options,
        }).apply(compiler);
      },
    }));

    // Register Workbox Plugin for PWA
    this.registerPluginFactory('WorkboxPlugin', (options = {}) => ({
      name: 'WorkboxPlugin',
      apply: (compiler: RSpackCompiler) => {
        const { GenerateSW } = require('workbox-webpack-plugin');
        new GenerateSW({
          clientsClaim: true,
          skipWaiting: true,
          ...options,
        }).apply(compiler);
      },
    }));

    // Register Source Map Plugin
    this.registerPluginFactory('SourceMapPlugin', (options = {}) => ({
      name: 'SourceMapPlugin',
      apply: (compiler: RSpackCompiler) => {
        compiler.hooks.compilation.tap('SourceMapPlugin', (compilation: any) => {
          compilation.hooks.afterOptimizeAssets.tap('SourceMapPlugin', () => {
            // Custom source map handling
            if (options.upload) {
              console.log('[SourceMap] Uploading source maps...');
            }
          });
        });
      },
    }));
  }

  registerPluginFactory(name: string, factory: RSpackPluginFactory) {
    this.pluginFactories.set(name, factory);
  }

  addPlugin(config: RSpackPluginConfig) {
    if (config.enabled !== false) {
      this.plugins.set(config.name, config);
    }
  }

  removePlugin(name: string) {
    this.plugins.delete(name);
  }

  getPlugin(name: string): RSpackPluginConfig | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): RSpackPluginConfig[] {
    return Array.from(this.plugins.values()).sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  generatePluginConfig() {
    return this.getAllPlugins().map((pluginConfig) => {
      const factory = this.pluginFactories.get(pluginConfig.name);

      if (factory) {
        return factory(pluginConfig.options);
      }

      // Fallback for custom plugins
      return {
        name: pluginConfig.name,
        apply: (compiler: RSpackCompiler) => {
          console.warn(`[RSpack] No factory found for plugin: ${pluginConfig.name}`);
        },
      };
    });
  }

  // Helper method to create RSpack plugins array
  createPlugins(compiler: RSpackCompiler) {
    const plugins = this.generatePluginConfig();
    plugins.forEach((plugin) => {
      if (plugin && plugin.apply) {
        plugin.apply(compiler);
      }
    });
    return plugins;
  }

  // Preset configurations
  static createDevelopmentPreset(): RSpackPluginConfig[] {
    return [
      {
        name: 'ReactRefreshPlugin',
        enabled: true,
        priority: 10,
        options: {
          overlay: true,
        },
      },
      {
        name: 'HtmlPlugin',
        enabled: true,
        priority: 20,
      },
      {
        name: 'DefinePlugin',
        enabled: true,
        priority: 30,
        options: {
          'process.env.NODE_ENV': 'development',
          __DEV__: true,
        },
      },
      {
        name: 'ProgressPlugin',
        enabled: true,
        priority: 40,
      },
    ];
  }

  static createProductionPreset(): RSpackPluginConfig[] {
    return [
      {
        name: 'HtmlPlugin',
        enabled: true,
        priority: 10,
        options: {
          minify: true,
        },
      },
      {
        name: 'DefinePlugin',
        enabled: true,
        priority: 20,
        options: {
          'process.env.NODE_ENV': 'production',
          __DEV__: false,
        },
      },
      {
        name: 'CompressionPlugin',
        enabled: true,
        priority: 30,
      },
      {
        name: 'BundleAnalyzerPlugin',
        enabled: true,
        priority: 40,
      },
      {
        name: 'WorkboxPlugin',
        enabled: true,
        priority: 50,
        options: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      },
    ];
  }

  // Load preset
  loadPreset(preset: 'development' | 'production' | RSpackPluginConfig[]) {
    const configs =
      typeof preset === 'string'
        ? preset === 'development'
          ? RSpackPluginManager.createDevelopmentPreset()
          : RSpackPluginManager.createProductionPreset()
        : preset;

    configs.forEach((config) => this.addPlugin(config));
  }
}
