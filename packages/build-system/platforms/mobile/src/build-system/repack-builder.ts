/**
 * Re.Pack Enhanced Build System
 *
 * Advanced build system that integrates Re.Pack with RSpeedy
 * Provides module federation, code splitting, and webpack optimization
 */

import type { BuildCommands, BuildConfig, BuildResult } from './index';

export interface RepackBuildConfig extends BuildConfig {
  repack: {
    // Module Federation
    moduleFederation?: {
      name: string;
      remotes: Record<string, string>;
      exposes: Record<string, string>;
      shared: Record<string, any>;
      filename?: string;
    };

    // Webpack Configuration
    webpack?: {
      splitChunks?: boolean;
      optimization?: 'size' | 'speed' | 'balanced';
      experimentalFeatures?: string[];
      customPlugins?: any[];
      loaders?: any[];
    };

    // Development Options
    devServer?: {
      port: number;
      host: string;
      hot: boolean;
      overlay: boolean;
      historyApiFallback: boolean;
    };

    // Output Configuration
    output?: {
      publicPath: string;
      chunkFilename: string;
      assetModuleFilename: string;
    };

    // Performance Options
    performance?: {
      bundleAnalyzer: boolean;
      maxAssetSize: number;
      maxEntrypointSize: number;
      hints: 'warning' | 'error' | false;
    };
  };
}

export interface RepackBuildResult extends BuildResult {
  // Re.Pack specific metrics
  repackMetrics: {
    moduleFederationTime: number;
    chunkSplittingTime: number;
    federatedModules: string[];
    chunkSizes: Record<string, number>;
    dependencyGraph: Record<string, string[]>;
    bundleAnalysis?: {
      totalSize: number;
      chunkSizes: Record<string, number>;
      moduleCount: number;
      duplicatedModules: string[];
    };
  };

  // Webpack stats
  webpackStats?: {
    time: number;
    hash: string;
    chunks: Array<{
      id: string;
      size: number;
      names: string[];
      files: string[];
    }>;
    assets: Array<{
      name: string;
      size: number;
      chunks: string[];
    }>;
    modules: Array<{
      name: string;
      size: number;
      chunks: string[];
    }>;
  };
}

export class RepackBuilder implements BuildCommands {
  private config: RepackBuildConfig;
  private webpackCompiler: any = null;

  constructor(config: RepackBuildConfig) {
    this.config = config;
  }

  async clean(): Promise<void> {
    const fs = await import('fs').then((m) => m.promises);
    const path = await import('path');

    try {
      // Clean output directory
      if (this.config.outputDir) {
        await fs.rmdir(this.config.outputDir, { recursive: true });
        await fs.mkdir(this.config.outputDir, { recursive: true });
      }

      // Clean Re.Pack cache
      const cacheDir = path.resolve('.repack-cache');
      await fs.rmdir(cacheDir, { recursive: true }).catch(() => {});

      console.log('✓ Cleaned build directories');
    } catch (error) {
      console.error('Failed to clean build directories:', error);
      throw error;
    }
  }

  async build(config: RepackBuildConfig): Promise<RepackBuildResult> {
    const startTime = Date.now();

    try {
      // Initialize webpack with Re.Pack configuration
      const webpackConfig = await this.createWebpackConfig(config);
      const webpack = await this.loadWebpack();

      this.webpackCompiler = webpack(webpackConfig);

      // Build the project
      const stats = await this.runWebpackBuild();

      // Process build results
      const buildResult = await this.processBuildResults(stats, startTime);

      return buildResult;
    } catch (error) {
      console.error('Build failed:', error);
      throw error;
    }
  }

  private async createWebpackConfig(config: RepackBuildConfig): Promise<any> {
    const path = await import('path');
    const { getDefaultConfig } = await import('@callstack/repack');

    // Get Re.Pack default configuration
    const defaultConfig = getDefaultConfig({
      root: process.cwd(),
      platform: config.platform,
      mode: config.mode,
    });

    const webpackConfig = {
      ...defaultConfig,

      // Entry point
      entry: config.entry,

      // Output configuration
      output: {
        ...defaultConfig.output,
        path: path.resolve(config.outputDir),
        publicPath: config.repack.output?.publicPath || 'auto',
        chunkFilename: config.repack.output?.chunkFilename || '[name].[contenthash].chunk.js',
        assetModuleFilename:
          config.repack.output?.assetModuleFilename || 'assets/[hash][ext][query]',
      },

      // Module resolution
      resolve: {
        ...defaultConfig.resolve,
        alias: {
          ...defaultConfig.resolve?.alias,
          '@shared': path.resolve('shared/src'),
          '@tanstack': path.resolve('shared/src/components/tanstack'),
        },
      },

      // Optimization
      optimization: {
        ...defaultConfig.optimization,
        ...this.createOptimizationConfig(config),
      },

      // Plugins
      plugins: [...defaultConfig.plugins, ...this.createPlugins(config)],

      // Module rules
      module: {
        ...defaultConfig.module,
        rules: [...defaultConfig.module.rules, ...this.createCustomLoaders(config)],
      },

      // Development server
      ...(config.mode === 'debug' && config.repack.devServer
        ? {
            devServer: config.repack.devServer,
          }
        : {}),

      // Performance hints
      performance: config.repack.performance
        ? {
            maxAssetSize: config.repack.performance.maxAssetSize,
            maxEntrypointSize: config.repack.performance.maxEntrypointSize,
            hints: config.repack.performance.hints,
          }
        : false,
    };

    return webpackConfig;
  }

  private createOptimizationConfig(config: RepackBuildConfig) {
    const optimization: any = {};

    // Code splitting
    if (config.repack.webpack?.splitChunks) {
      optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          shared: {
            test: /[\\/]shared[\\/]/,
            name: 'shared',
            chunks: 'all',
            priority: 8,
          },
          tanstack: {
            test: /[\\/]@tanstack[\\/]/,
            name: 'tanstack',
            chunks: 'all',
            priority: 9,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
          },
        },
      };
    }

    // Optimization strategy
    switch (config.repack.webpack?.optimization) {
      case 'size':
        optimization.minimize = true;
        optimization.usedExports = true;
        optimization.sideEffects = false;
        break;
      case 'speed':
        optimization.minimize = false;
        optimization.removeAvailableModules = false;
        optimization.removeEmptyChunks = false;
        break;
      case 'balanced':
      default:
        optimization.minimize = config.mode === 'release';
        break;
    }

    return optimization;
  }

  private createPlugins(config: RepackBuildConfig): any[] {
    const plugins: any[] = [];

    // Module Federation Plugin
    if (config.repack.moduleFederation) {
      const ModuleFederationPlugin = require('@module-federation/webpack');

      plugins.push(
        new ModuleFederationPlugin({
          name: config.repack.moduleFederation.name,
          filename: config.repack.moduleFederation.filename || 'remoteEntry.js',
          remotes: config.repack.moduleFederation.remotes,
          exposes: config.repack.moduleFederation.exposes,
          shared: {
            react: { singleton: true, requiredVersion: '^18.0.0' },
            'react-native': { singleton: true },
            ...config.repack.moduleFederation.shared,
          },
        })
      );
    }

    // Bundle Analyzer
    if (config.repack.performance?.bundleAnalyzer) {
      const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
      plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-report.html',
        })
      );
    }

    // Custom plugins
    if (config.repack.webpack?.customPlugins) {
      plugins.push(...config.repack.webpack.customPlugins);
    }

    return plugins;
  }

  private createCustomLoaders(config: RepackBuildConfig): any[] {
    const loaders: any[] = [];

    // RSpeedy-specific loader
    loaders.push({
      test: /\.rspeedy\.(ts|tsx)$/,
      use: [
        'babel-loader',
        {
          loader: path.resolve(__dirname, 'rspeedy-loader.js'),
          options: {
            platform: config.platform,
            mode: config.mode,
          },
        },
      ],
    });

    // Custom loaders from config
    if (config.repack.webpack?.loaders) {
      loaders.push(...config.repack.webpack.loaders);
    }

    return loaders;
  }

  private async loadWebpack(): Promise<any> {
    try {
      return await import('webpack');
    } catch (error) {
      throw new Error('Webpack not found. Please install webpack to use Re.Pack builder.');
    }
  }

  private runWebpackBuild(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.webpackCompiler.run((err: any, stats: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (stats.hasErrors()) {
          const errors = stats.toJson().errors;
          reject(new Error(`Webpack build failed:\n${errors.join('\n')}`));
          return;
        }

        resolve(stats);
      });
    });
  }

  private async processBuildResults(stats: any, startTime: number): Promise<RepackBuildResult> {
    const endTime = Date.now();
    const buildTime = endTime - startTime;

    const statsJson = stats.toJson();
    const fs = await import('fs').then((m) => m.promises);
    const path = await import('path');

    // Calculate build metrics
    const artifacts: RepackBuildResult['artifacts'] = {};
    const repackMetrics: RepackBuildResult['repackMetrics'] = {
      moduleFederationTime: 0,
      chunkSplittingTime: 0,
      federatedModules: [],
      chunkSizes: {},
      dependencyGraph: {},
    };

    // Process assets
    for (const asset of statsJson.assets || []) {
      const assetPath = path.join(this.config.outputDir, asset.name);

      if (asset.name.endsWith('.js')) {
        if (asset.name.includes('remoteEntry')) {
          artifacts.app = assetPath;
        } else if (asset.name.includes('.chunk.')) {
          repackMetrics.chunkSizes[asset.name] = asset.size;
        }
      }
    }

    // Extract federated modules
    if (this.config.repack.moduleFederation?.exposes) {
      repackMetrics.federatedModules = Object.keys(this.config.repack.moduleFederation.exposes);
    }

    // Build dependency graph
    for (const module of statsJson.modules || []) {
      if (module.name && module.reasons) {
        repackMetrics.dependencyGraph[module.name] = module.reasons.map((r: any) => r.moduleName);
      }
    }

    // Bundle analysis
    let bundleAnalysis;
    if (this.config.repack.performance?.bundleAnalyzer) {
      bundleAnalysis = {
        totalSize: statsJson.assets?.reduce((sum: number, asset: any) => sum + asset.size, 0) || 0,
        chunkSizes: repackMetrics.chunkSizes,
        moduleCount: statsJson.modules?.length || 0,
        duplicatedModules: this.findDuplicatedModules(statsJson.modules || []),
      };
    }

    const buildResult: RepackBuildResult = {
      success: !stats.hasErrors(),
      platform: this.config.platform,
      mode: this.config.mode,
      target: this.config.target,
      artifacts,
      buildTime,
      bundleSize: bundleAnalysis?.totalSize || 0,
      assetsSize: bundleAnalysis?.totalSize || 0,
      logs: this.extractLogs(statsJson),
      warnings: statsJson.warnings || [],
      errors: statsJson.errors || [],
      metrics: {
        buildDuration: buildTime,
        bundleDuration: statsJson.time || 0,
        packageDuration: 0,
      },
      repackMetrics: {
        ...repackMetrics,
        bundleAnalysis,
      },
      webpackStats: {
        time: statsJson.time || 0,
        hash: statsJson.hash || '',
        chunks: statsJson.chunks || [],
        assets: statsJson.assets || [],
        modules: statsJson.modules || [],
      },
    };

    return buildResult;
  }

  private findDuplicatedModules(modules: any[]): string[] {
    const moduleMap = new Map<string, number>();

    modules.forEach((module) => {
      if (module.name) {
        const count = moduleMap.get(module.name) || 0;
        moduleMap.set(module.name, count + 1);
      }
    });

    return Array.from(moduleMap.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name);
  }

  private extractLogs(statsJson: any): string[] {
    const logs: string[] = [];

    if (statsJson.time) {
      logs.push(`Build completed in ${statsJson.time}ms`);
    }

    if (statsJson.assets) {
      logs.push(`Generated ${statsJson.assets.length} assets`);
    }

    if (statsJson.chunks) {
      logs.push(`Created ${statsJson.chunks.length} chunks`);
    }

    return logs;
  }

  async package(
    config: RepackBuildConfig,
    artifacts: RepackBuildResult['artifacts']
  ): Promise<string> {
    // Re.Pack handles packaging through webpack output
    return artifacts.app || '';
  }

  async sign(config: RepackBuildConfig, artifact: string): Promise<string> {
    // Signing would be handled by platform-specific tools
    // This is a placeholder for the interface
    return artifact;
  }

  async deploy(config: RepackBuildConfig, artifact: string, target: string): Promise<void> {
    // Deployment logic would depend on the target
    console.log(`Deploying ${artifact} to ${target}`);
  }
}

// Re.Pack configuration presets
export const RepackPresets = {
  // Development preset
  development: {
    repack: {
      webpack: {
        splitChunks: false,
        optimization: 'speed' as const,
      },
      devServer: {
        port: 8081,
        host: 'localhost',
        hot: true,
        overlay: true,
        historyApiFallback: true,
      },
      performance: {
        bundleAnalyzer: false,
        hints: false as const,
      },
    },
  } as Partial<RepackBuildConfig>,

  // Production preset
  production: {
    repack: {
      webpack: {
        splitChunks: true,
        optimization: 'size' as const,
      },
      output: {
        publicPath: '/static/',
        chunkFilename: '[name].[contenthash].chunk.js',
      },
      performance: {
        bundleAnalyzer: true,
        maxAssetSize: 250000,
        maxEntrypointSize: 250000,
        hints: 'warning' as const,
      },
    },
  } as Partial<RepackBuildConfig>,

  // Module federation preset
  federation: {
    repack: {
      webpack: {
        splitChunks: true,
        optimization: 'balanced' as const,
      },
      moduleFederation: {
        name: 'mobileApp',
        remotes: {},
        exposes: {},
        shared: {
          react: { singleton: true },
          'react-native': { singleton: true },
          '@tanstack/react-query': { singleton: true },
        },
      },
    },
  } as Partial<RepackBuildConfig>,
};

// Utility function to create Re.Pack build configuration
export function createRepackBuildConfig(
  baseConfig: Partial<BuildConfig> = {},
  repackConfig: Partial<RepackBuildConfig['repack']> = {},
  preset?: keyof typeof RepackPresets
): RepackBuildConfig {
  let presetConfig = {};

  if (preset) {
    presetConfig = RepackPresets[preset];
  }

  return {
    platform: 'ios',
    mode: 'debug',
    target: 'simulator',
    arch: 'arm64',
    entry: './src/index.tsx',
    outputDir: './build',
    assetsDir: './assets',
    minify: false,
    treeshake: true,
    sourceMaps: true,
    compress: false,
    nativeModules: [],
    permissions: [],
    capabilities: [],
    env: {},
    defines: {},
    ...baseConfig,
    ...presetConfig,
    repack: {
      webpack: {
        splitChunks: false,
        optimization: 'balanced',
      },
      output: {
        publicPath: 'auto',
        chunkFilename: '[name].chunk.js',
        assetModuleFilename: 'assets/[hash][ext][query]',
      },
      performance: {
        bundleAnalyzer: false,
        maxAssetSize: 250000,
        maxEntrypointSize: 250000,
        hints: 'warning',
      },
      ...(presetConfig as any)?.repack,
      ...repackConfig,
    },
  };
}
