import { integrationConfigs } from '../config/integrations.config.ts';
import { RSpackIntegration } from '../integrations/rspack.ts';
import { RSpackPluginManager } from './rspack-plugins.ts';

export interface RSpackConfigBuilderOptions {
  variant: 'core' | 'remix' | 'nextjs';
  mode?: 'development' | 'production';
  enableIntegration?: boolean;
  customConfig?: any;
}

export class RSpackConfigBuilder {
  private integration: RSpackIntegration | null = null;
  private pluginManager: RSpackPluginManager;
  private variant: 'core' | 'remix' | 'nextjs';
  private mode: 'development' | 'production';

  constructor(options: RSpackConfigBuilderOptions) {
    this.variant = options.variant;
    this.mode =
      options.mode || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
    this.pluginManager = new RSpackPluginManager();

    if (options.enableIntegration !== false) {
      this.initializeIntegration();
    }
  }

  private async initializeIntegration() {
    const rspackConfig = integrationConfigs.rspack || {};
    this.integration = new RSpackIntegration(rspackConfig as any);
    await this.integration.initialize();
  }

  async build() {
    if (!this.integration) {
      await this.initializeIntegration();
    }

    // Load appropriate preset based on mode
    this.pluginManager.loadPreset(this.mode);

    // Get base config from integration
    const baseConfig = this.integration!.generateConfig(this.variant);

    // Enhance with additional RSpack features
    const enhancedConfig = {
      ...baseConfig,
      mode: this.mode,
      name: `katalyst-${this.variant}`,
      context: process.cwd(),
      target: ['web', 'es2022'],

      // Enhanced resolve configuration
      resolve: {
        ...baseConfig.resolve,
        preferRelative: true,
        symlinks: true,
        cacheWithContext: false,
        modules: ['node_modules', 'shared/node_modules'],
        mainFields: ['browser', 'module', 'main'],
        conditionNames: ['import', 'module', 'browser', 'default'],
      },

      // Enhanced module configuration
      module: {
        ...baseConfig.module,
        strictExportPresence: true,
        parser: {
          ...baseConfig.module.parser,
          javascript: {
            dynamicImportMode: 'lazy',
            dynamicImportPrefetch: true,
            dynamicImportPreload: true,
            url: true,
          },
        },
      },

      // Enhanced optimization
      optimization: {
        ...baseConfig.optimization,
        ...integrationConfigs.rspack.optimization,
        minimizer: this.getMinimizers(),
        portableRecords: true,
      },

      // Enhanced output
      output: {
        ...baseConfig.output,
        environment: {
          arrowFunction: true,
          bigIntLiteral: true,
          const: true,
          destructuring: true,
          dynamicImport: true,
          forOf: true,
          module: true,
          optionalChaining: true,
          templateLiteral: true,
        },
        charset: true,
        hashFunction: 'xxhash64',
        hashDigestLength: 8,
        wasmLoading: 'fetch',
        workerChunkLoading: 'import-scripts',
        workerWasmLoading: 'fetch',
      },

      // Enhanced experiments
      experiments: {
        ...baseConfig.experiments,
        ...integrationConfigs.rspack.experiments,
        buildHttp: {
          allowedUris: ['https://cdn.jsdelivr.net/', 'https://unpkg.com/', 'https://esm.sh/'],
          cacheLocation: '.rspack-http-cache',
          frozen: false,
          lockfileLocation: '.rspack-http-lock.json',
          upgrade: true,
        },
      },

      // Enhanced cache
      cache: {
        ...baseConfig.cache,
        ...integrationConfigs.rspack.cache,
        name: `${this.variant}-${this.mode}`,
        version: '1.0.0',
        store: 'pack',
        idleTimeout: 60000,
        idleTimeoutForInitialStore: 5000,
        idleTimeoutAfterLargeChanges: 1000,
        maxMemoryGenerations: this.mode === 'production' ? 1 : Number.POSITIVE_INFINITY,
      },

      // Enhanced stats
      stats: {
        ...baseConfig.stats,
        assets: true,
        assetsSort: 'size',
        builtAt: true,
        cached: true,
        cachedAssets: true,
        chunks: true,
        chunkGroups: true,
        chunkModules: false,
        chunkOrigins: true,
        chunksSort: 'size',
        colors: true,
        depth: false,
        entrypoints: true,
        env: true,
        errors: true,
        errorDetails: true,
        errorStack: true,
        hash: true,
        logging: 'info',
        modules: false,
        modulesSort: 'size',
        performance: true,
        providedExports: false,
        publicPath: true,
        reasons: false,
        source: false,
        timings: true,
        version: true,
        warnings: true,
      },

      // Infrastructure logging
      infrastructureLogging: {
        level: 'info',
        colors: true,
        appendOnly: false,
        stream: process.stdout,
      },

      // Snapshot configuration
      snapshot: {
        managedPaths: [/^(.+?[\\/]node_modules[\\/])/],
        immutablePaths: [],
        unmanagedPaths: [],
        buildDependencies: {
          timestamp: true,
          hash: true,
        },
        module: {
          timestamp: true,
          hash: true,
        },
        resolve: {
          timestamp: true,
          hash: true,
        },
        resolveBuildDependencies: {
          timestamp: true,
          hash: true,
        },
      },

      // Watch options
      watchOptions: {
        ignored: /node_modules/,
        aggregateTimeout: 200,
        poll: false,
      },

      // Node polyfills (disabled for modern builds)
      node: false,

      // Bail on first error in production
      bail: this.mode === 'production',

      // Profile build performance
      profile: false,

      // Parallelism
      parallelism: 100,
    };

    // Add plugins from plugin manager
    const plugins = this.pluginManager.generatePluginConfig();
    enhancedConfig.plugins = [...(enhancedConfig.plugins || []), ...plugins];

    // Add module federation if enabled
    if (integrationConfigs.rspack.enableModuleFederation) {
      this.addModuleFederationConfig(enhancedConfig);
    }

    return enhancedConfig;
  }

  private getMinimizers() {
    const minimizers = [];

    if (this.mode === 'production') {
      // TerserPlugin for JS minification
      minimizers.push({
        name: 'TerserPlugin',
        options: {
          test: /\.[jt]sx?$/,
          exclude: /[\\/]node_modules[\\/]/,
          parallel: true,
          terserOptions: {
            parse: {
              ecma: 2022,
            },
            compress: {
              ecma: 2022,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
            },
            mangle: {
              safari10: true,
            },
            format: {
              ecma: 2022,
              comments: false,
              ascii_only: true,
            },
          },
        },
      });

      // CSS Minimizer
      minimizers.push({
        name: 'CssMinimizerPlugin',
        options: {
          test: /\.css$/,
          parallel: true,
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
                calc: false,
              },
            ],
          },
        },
      });
    }

    return minimizers;
  }

  private addModuleFederationConfig(config: any) {
    const mfConfig = integrationConfigs.rspack.moduleFederation;

    // Find or create ModuleFederationPlugin
    const mfPluginIndex = config.plugins.findIndex((p: any) => p.name === 'ModuleFederationPlugin');

    if (mfPluginIndex !== -1) {
      // Update existing plugin
      config.plugins[mfPluginIndex].options = {
        ...config.plugins[mfPluginIndex].options,
        ...mfConfig,
      };
    } else {
      // Add new plugin
      this.pluginManager.addPlugin({
        name: 'ModuleFederationPlugin',
        enabled: true,
        priority: 100,
        options: mfConfig,
      });
    }
  }

  // Helper methods for dynamic configuration
  addPlugin(name: string, options?: any) {
    this.pluginManager.addPlugin({
      name,
      enabled: true,
      options,
    });
  }

  removePlugin(name: string) {
    this.pluginManager.removePlugin(name);
  }

  setMode(mode: 'development' | 'production') {
    this.mode = mode;
  }

  setVariant(variant: 'core' | 'remix' | 'nextjs') {
    this.variant = variant;
  }

  // Export configuration as ESM module
  async exportConfig(outputPath: string) {
    const config = await this.build();
    const configString = `
// Generated RSpack configuration
// Variant: ${this.variant}
// Mode: ${this.mode}
// Generated at: ${new Date().toISOString()}

export default ${JSON.stringify(config, null, 2)};
`;

    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, configString, 'utf-8');
    console.log(`RSpack configuration exported to: ${outputPath}`);
  }
}

// Factory function for easy usage
export async function createRSpackConfig(options: RSpackConfigBuilderOptions) {
  const builder = new RSpackConfigBuilder(options);
  return builder.build();
}

// Preset configurations
export const RSpackPresets = {
  async core(mode?: 'development' | 'production') {
    return createRSpackConfig({ variant: 'core', mode });
  },

  async remix(mode?: 'development' | 'production') {
    return createRSpackConfig({ variant: 'remix', mode });
  },

  async nextjs(mode?: 'development' | 'production') {
    return createRSpackConfig({ variant: 'nextjs', mode });
  },
};
