/**
 * Unified RSpack Configuration for Tauri 2.0
 * Replaces Vite across Desktop, Mobile, and WebXR platforms
 * Optimized for fast builds and cross-platform consistency
 */

import process from 'node:process';
import path from 'path';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

// Platform detection
const platform = process.env.TAURI_PLATFORM || 'desktop';
const isDev = process.env.NODE_ENV === 'development';
const isDesktop = platform === 'desktop';
const isMobile = platform === 'mobile';
const isWebXR = platform === 'webxr';

// Base configuration
export default defineConfig({
  plugins: [
    pluginReact({
      reactRefreshOptions: {
        overlay: true,
      },
    }),
    pluginSvgr({
      svgrOptions: {
        exportType: 'default',
        prettier: false,
        svgo: true,
        svgoConfig: {
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false,
                  removeUselessStrokeAndFill: false,
                },
              },
            },
            'prefixIds',
          ],
        },
        titleProp: true,
        ref: true,
        replaceAttrValues: {
          '#000': 'currentColor',
          '#000000': 'currentColor',
        },
      },
    }),
    pluginTypeCheck({
      enable: true,
    }),
  ],

  html: {
    template: './src/index.html',
    title: getTitleForPlatform(platform),
    meta: {
      description: getDescriptionForPlatform(platform),
      viewport: getViewportForPlatform(platform),
    },
  },

  source: {
    entry: {
      index: getEntryForPlatform(platform),
    },
    alias: {
      '@': './src',
      '@/components': './src/components',
      '@/hooks': './src/hooks',
      '@/utils': './src/utils',
      '@/stores': './src/stores',
      '@/assets': './src/assets',
      '@katalyst/shared': './shared/src',
      '@katalyst/webxr': './shared/src/webxr',
      '@katalyst/mobile': './shared/src/mobile',
    },
    define: {
      __TAURI_PLATFORM__: JSON.stringify(platform),
      __IS_DESKTOP__: isDesktop,
      __IS_MOBILE__: isMobile,
      __IS_WEBXR__: isWebXR,
      __DEV__: isDev,
    },
  },

  server: {
    port: getPortForPlatform(platform),
    host: '0.0.0.0',
    open: false,
    hmr: isDev,
    historyApiFallback: true,
  },

  dev: {
    hmr: true,
    liveReload: true,
    progressBar: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },

  output: {
    target: getTargetForPlatform(platform),
    distPath: {
      root: `dist/${platform}`,
      js: 'static/js',
      css: 'static/css',
      svg: 'static/svg',
      font: 'static/fonts',
      image: 'static/images',
      media: 'static/media',
    },
    filename: {
      js: isDev ? '[name].js' : '[name].[contenthash:8].js',
      css: isDev ? '[name].css' : '[name].[contenthash:8].css',
      svg: '[name].[contenthash:8].svg',
    },
    cleanDistPath: true,
    sourceMap: {
      js: isDev ? 'cheap-module-source-map' : false,
      css: isDev,
    },
    legalComments: 'none',
    minify: !isDev,
  },

  tools: {
    rspack: {
      experiments: {
        css: true,
      },
      resolve: {
        conditionNames: ['source', 'import', 'module', 'require'],
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
        fallback: getFallbackForPlatform(platform),
      },
      module: {
        rules: [
          // Platform-specific asset handling
          {
            test: /\.(png|jpe?g|gif|webp|ico)$/i,
            type: 'asset',
            parser: {
              dataUrlCondition: {
                maxSize: 4 * 1024, // 4KB
              },
            },
            generator: {
              filename: 'static/images/[name].[contenthash:8][ext]',
            },
          },
          {
            test: /\.(woff2?|ttf|eot)$/i,
            type: 'asset/resource',
            generator: {
              filename: 'static/fonts/[name].[contenthash:8][ext]',
            },
          },
          // WebXR specific assets
          ...(isWebXR
            ? [
                {
                  test: /\.(gltf|glb|fbx|obj|dae)$/i,
                  type: 'asset/resource',
                  generator: {
                    filename: 'static/models/[name].[contenthash:8][ext]',
                  },
                },
              ]
            : []),
          // Mobile specific optimizations
          ...(isMobile
            ? [
                {
                  test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
                  type: 'asset/resource',
                  generator: {
                    filename: 'static/media/[name].[contenthash:8][ext]',
                  },
                },
              ]
            : []),
        ],
      },
      optimization: {
        splitChunks: getSplitChunksConfig(platform),
        runtimeChunk: 'single',
        usedExports: true,
        sideEffects: false,
      },
      externals: getExternalsForPlatform(platform),
    },

    postcss: {
      postcssOptions: {
        plugins: [
          require('@tailwindcss/postcss')({
            config: getTailwindConfigForPlatform(platform),
          }),
          require('autoprefixer'),
          // Platform-specific PostCSS plugins
          ...(isMobile ? [require('postcss-viewport-units')] : []),
          ...(isWebXR ? [require('postcss-3d-transform')] : []),
        ],
      },
    },
  },

  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
      override: {
        chunks: 'all',
        minSize: 20000,
        maxSize: getMaxChunkSizeForPlatform(platform),
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
          tauri: {
            test: /[\\/]node_modules[\\/]@tauri-apps[\\/]/,
            name: 'tauri',
            chunks: 'all',
            priority: 25,
          },
          tanstack: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            name: 'tanstack',
            chunks: 'all',
            priority: 15,
          },
          webxr: {
            test: /[\\/]node_modules[\\/](three|@react-three|@webxr)[\\/]/,
            name: 'webxr',
            chunks: 'all',
            priority: 18,
            enforce: isWebXR,
          },
          mobile: {
            test: /[\\/](mobile|capacitor|cordova)[\\/]/,
            name: 'mobile',
            chunks: 'all',
            priority: 18,
            enforce: isMobile,
          },
        },
      },
    },
    bundleAnalyze: process.env.BUNDLE_ANALYZE ? {} : undefined,
  },
});

// Platform-specific configuration functions

function getTitleForPlatform(platform: string): string {
  switch (platform) {
    case 'desktop':
      return 'Katalyst Desktop - React 19 Framework';
    case 'mobile':
      return 'Katalyst Mobile - Cross-Platform App';
    case 'webxr':
      return 'Katalyst WebXR - Metaverse Experience';
    default:
      return 'Katalyst - Unified React Framework';
  }
}

function getDescriptionForPlatform(platform: string): string {
  switch (platform) {
    case 'desktop':
      return 'High-performance desktop application built with React 19, Tauri 2.0, and Rust';
    case 'mobile':
      return 'Cross-platform mobile application with native performance';
    case 'webxr':
      return 'Immersive WebXR experience for VR/AR applications';
    default:
      return 'Unified React framework for all platforms';
  }
}

function getViewportForPlatform(platform: string): string {
  switch (platform) {
    case 'mobile':
      return 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    case 'webxr':
      return 'width=device-width, initial-scale=1.0, user-scalable=no';
    default:
      return 'width=device-width, initial-scale=1.0';
  }
}

function getEntryForPlatform(platform: string): string {
  switch (platform) {
    case 'desktop':
      return './core/src/main.tsx';
    case 'mobile':
      return './shared/src/mobile/index.ts';
    case 'webxr':
      return './shared/src/webxr/index.ts';
    default:
      return './core/src/main.tsx';
  }
}

function getPortForPlatform(platform: string): number {
  switch (platform) {
    case 'desktop':
      return 20007;
    case 'mobile':
      return 20010;
    case 'webxr':
      return 20011;
    default:
      return 20007;
  }
}

function getTargetForPlatform(platform: string): string {
  switch (platform) {
    case 'mobile':
      return 'web'; // Mobile uses webview
    case 'webxr':
      return 'web';
    default:
      return 'web';
  }
}

function getFallbackForPlatform(platform: string): Record<string, any> {
  const base = {
    crypto: false,
    stream: false,
    buffer: false,
  };

  if (isWebXR) {
    return {
      ...base,
      fs: false,
      path: false,
    };
  }

  return base;
}

function getSplitChunksConfig(platform: string) {
  const base = {
    chunks: 'all' as const,
    minSize: 20000,
    maxSize: getMaxChunkSizeForPlatform(platform),
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all' as const,
        priority: 10,
      },
    },
  };

  return base;
}

function getMaxChunkSizeForPlatform(platform: string): number {
  switch (platform) {
    case 'mobile':
      return 200000; // 200KB for mobile
    case 'webxr':
      return 500000; // 500KB for WebXR (larger assets)
    default:
      return 244000; // 244KB for desktop
  }
}

function getExternalsForPlatform(platform: string): Record<string, string> | undefined {
  if (platform === 'desktop') {
    return {
      '@tauri-apps/api': '__TAURI__',
    };
  }
  return undefined;
}

function getTailwindConfigForPlatform(platform: string): string {
  switch (platform) {
    case 'mobile':
      return './tailwind.mobile.config.ts';
    case 'webxr':
      return './tailwind.webxr.config.ts';
    default:
      return './tailwind.config.ts';
  }
}
