import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

export default defineConfig({
  plugins: [pluginReact(), pluginTypeCheck(), pluginSass()],
  html: {
    template: './public/index.html',
  },
  source: {
    entry: {
      index: './src/index.tsx',
    },
    alias: {
      '@': './src',
      '@katalyst-react/shared': './shared/src/index.ts',
      '@katalyst-react/components': './shared/src/components/index.ts',
      '@katalyst-react/hooks': './shared/src/hooks/index.ts',
      '@katalyst-react/stores': './shared/src/stores/index.ts',
      '@katalyst-react/utils': './shared/src/utils/index.ts',
      '@katalyst-react/integrations': './shared/src/integrations/index.ts',
      '@katalyst-react/native': './shared/src/native/index.js',
    },
  },
  output: {
    target: 'web',
    distPath: {
      root: 'dist',
      js: 'static/js',
      css: 'static/css',
      svg: 'static/media',
      font: 'static/media',
      image: 'static/media',
      media: 'static/media',
    },
    filename: {
      js: '[name].[contenthash:8].js',
      css: '[name].[contenthash:8].css',
    },
    assetPrefix: '/',
    cleanDistPath: true,
  },
  server: {
    port: 3000,
    host: 'localhost',
    open: true,
    compress: true,
    historyApiFallback: true,
  },
  dev: {
    hmr: true,
    liveReload: true,
    progressBar: true,
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
      override: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
          katalyst: {
            test: /[\\/]shared[\\/]src[\\/]/,
            name: 'katalyst',
            chunks: 'all',
            priority: 15,
          },
        },
      },
    },
    bundleAnalyze: process.env.BUNDLE_ANALYZE === 'true' ? {} : undefined,
  },
  tools: {
    rspack: {
      experiments: {
        rspackFuture: {
          newTreeshaking: true,
        },
      },
      optimization: {
        minimize: process.env.NODE_ENV === 'production',
        minimizer: ['...'],
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
            multithreading: {
              test: /[\\/]shared[\\/]src[\\/]native[\\/]/,
              name: 'multithreading',
              priority: 30,
              chunks: 'all',
            },
          },
        },
      },
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        fallback: {
          crypto: false,
          stream: false,
          path: false,
          fs: false,
        },
      },
      module: {
        rules: [
          {
            test: /\.node$/,
            use: 'node-loader',
          },
          {
            test: /\.(wasm)$/,
            type: 'webassembly/async',
          },
        ],
      },
    },
    postcss: {
      postcssOptions: {
        plugins: ['tailwindcss', 'autoprefixer'],
      },
    },
  },
  environments: {
    web: {
      output: {
        target: 'web',
      },
    },
    desktop: {
      output: {
        target: 'electron-renderer',
      },
      source: {
        entry: {
          index: './src/desktop.tsx',
        },
      },
    },
    mobile: {
      output: {
        target: 'web',
      },
      source: {
        entry: {
          index: './src/mobile.tsx',
        },
      },
    },
    webxr: {
      output: {
        target: 'web',
      },
      source: {
        entry: {
          index: './src/webxr.tsx',
        },
      },
      tools: {
        rspack: {
          experiments: {
            asyncWebAssembly: true,
          },
        },
      },
    },
  },
});
