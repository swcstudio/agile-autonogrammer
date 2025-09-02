import { IntegrationConfig, integrationConfigs } from '../config/integrations.config.ts';
import { RSpackPluginManager } from './rspack-plugins.ts';

export class KatalystPluginManager {
  private rspackManager: RSpackPluginManager;

  constructor() {
    this.rspackManager = new RSpackPluginManager();
    this.initializePlugins();
  }

  private initializePlugins() {
    this.rspackManager.addPlugin({
      name: 'react',
      options: {
        refresh: true,
        development:
          typeof globalThis !== 'undefined' && typeof (globalThis as any).process !== 'undefined'
            ? (globalThis as any).process.env?.NODE_ENV === 'development'
            : false,
      },
    });

    this.rspackManager.addPlugin({
      name: 'svgr',
      options: {
        exportType: 'default',
        typescript: true,
      },
    });

    this.rspackManager.addPlugin({
      name: 'type-check',
      options: {
        typescript: {
          memoryLimit: 4096,
          configFile: './tsconfig.json',
        },
      },
    });

    this.rspackManager.addPlugin({
      name: 'virtual-module',
      options: {
        modules: new Map(),
      },
    });

    this.rspackManager.addPlugin({
      name: 'asset-manifest',
      options: {
        fileName: 'asset-manifest.json',
        publicPath: '/',
      },
    });

    this.rspackManager.addPlugin({
      name: 'fast-refresh',
      options: {
        overlay: true,
        include: /\.(js|jsx|ts|tsx)$/,
      },
    });

    this.rspackManager.addPlugin({
      name: 'inspector',
      options: {
        editor: 'vscode',
        hotKeys: ['ctrl', 'shift', 'c'],
      },
    });
  }

  generateRSpackConfig(variant: 'core' | 'remix' | 'nextjs') {
    const baseConfig = {
      mode:
        typeof globalThis !== 'undefined' &&
        typeof (globalThis as any).process !== 'undefined' &&
        (globalThis as any).process.env?.NODE_ENV === 'production'
          ? 'production'
          : 'development',
      entry: this.getEntryPoint(variant),
      output: {
        path: './dist',
        filename: '[name].[contenthash:8].js',
        chunkFilename: '[name].[contenthash:8].chunk.js',
        publicPath: '/',
        clean: true,
      },
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/hooks': './src/hooks',
          '@/utils': './src/utils',
          '@/stores': './src/stores',
          '@/shared': '../shared/src',
        },
      },
      module: {
        rules: [
          {
            test: /\.(ts|tsx)$/,
            use: [
              {
                loader: 'builtin:swc-loader',
                options: {
                  jsc: {
                    parser: {
                      syntax: 'typescript',
                      tsx: true,
                    },
                    transform: {
                      react: {
                        runtime: 'automatic',
                      },
                    },
                  },
                },
              },
            ],
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader', 'postcss-loader'],
          },
          {
            test: /\.(png|jpg|jpeg|gif|svg)$/,
            type: 'asset/resource',
          },
        ],
      },
      plugins: this.rspackManager.generatePluginConfig(),
      optimization: integrationConfigs.rspack.optimization,
      performance: integrationConfigs.rspack.performance,
    };

    return baseConfig;
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
}
