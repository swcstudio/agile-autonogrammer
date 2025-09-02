export interface IntegrationConfig {
  [key: string]: any;
}

export const integrationConfigs: Record<string, IntegrationConfig> = {
  tanstack: {
    router: {
      enabled: true,
      ssr: true,
      streaming: true,
      fileBasedRouting: true,
    },
    query: {
      enabled: true,
      devtools: true,
      persistQueryClient: true,
    },
    form: {
      enabled: true,
      validation: 'typia',
      realTimeValidation: true,
    },
    table: {
      enabled: true,
      virtualScrolling: true,
      serverSidePagination: true,
    },
    virtual: {
      enabled: true,
      windowedScrolling: true,
      dynamicSizing: true,
    },
  },
  rspack: {
    plugins: ['react', 'svgr', 'type-check'],
    enableModuleFederation: true,
    enableSwcHelpers: true,
    enableWebWorkers: true,
    enableWasm: true,
    enableSourceMaps: true,
    enableBundleAnalyzer: true,
    enableProgressBar: true,
    enableTypeChecking: true,
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        minRemainingSize: 0,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        enforceSizeThreshold: 50000,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
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
          tanstack: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            name: 'tanstack',
            chunks: 'all',
            priority: 15,
          },
          katalyst: {
            test: /[\\/]shared[\\/]src[\\/]/,
            name: 'katalyst-shared',
            chunks: 'all',
            priority: 18,
          },
          styles: {
            name: 'styles',
            type: 'css/mini-extract',
            chunks: 'all',
            enforce: true,
          },
        },
      },
      runtimeChunk: {
        name: 'runtime',
      },
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      minimize: true,
      usedExports: true,
      sideEffects: false,
      concatenateModules: true,
      providedExports: true,
      innerGraph: true,
      mangleExports: 'size',
      mergeDuplicateChunks: true,
      flagIncludedChunks: true,
      removeAvailableModules: true,
      removeEmptyChunks: true,
      realContentHash: true,
    },
    performance: {
      hints: 'warning',
      maxAssetSize: 250000,
      maxEntrypointSize: 250000,
      assetFilter: (assetFilename: string) => {
        return !assetFilename.endsWith('.map');
      },
    },
    experiments: {
      asyncWebAssembly: true,
      topLevelAwait: true,
      outputModule: true,
      css: true,
      lazyCompilation: {
        entries: false,
        imports: true,
        test: /\.lazy\.[jt]sx?$/,
      },
    },
    cache: {
      type: 'filesystem',
      allowCollectingMemory: true,
      compression: 'gzip',
      profile: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      buildDependencies: {
        config: ['./rspack.config.ts', './package.json'],
      },
    },
    devServer: {
      hot: true,
      liveReload: true,
      historyApiFallback: true,
      compress: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
        progress: true,
      },
    },
    moduleFederation: {
      name: 'katalyst_rspack',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
        './components': './src/components/index.ts',
        './hooks': './src/hooks/index.ts',
        './stores': './src/stores/index.ts',
      },
      remotes: {},
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        '@tanstack/react-query': { singleton: true },
        '@tanstack/react-router': { singleton: true },
        zustand: { singleton: true },
      },
    },
  },
  emp: {
    federation: {
      name: 'katalyst-host',
      remotes: {},
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    },
    microFrontends: {
      routing: 'client-side',
      communication: 'event-bus',
      stateManagement: 'zustand',
    },
  },
  cosmos: {
    blockchain: 'evmos',
    web3: {
      enabled: true,
      walletConnect: true,
      metamask: true,
    },
    components: {
      walletButton: true,
      transactionHistory: true,
      balanceDisplay: true,
    },
  },
  stylex: {
    atomic: true,
    theme: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
    },
    plugins: ['autoprefixer', 'cssnano'],
  },
  storybook: {
    builder: 'rsbuild',
    addons: [
      '@storybook/addon-essentials',
      '@storybook/addon-interactions',
      '@storybook/addon-a11y',
    ],
    features: {
      buildStoriesJson: true,
      storyStoreV7: true,
    },
  },
  typia: {
    validation: {
      runtime: true,
      compile: true,
      optimize: true,
    },
    serialization: {
      json: true,
      binary: true,
    },
  },
  midscene: {
    ai: {
      model: 'gpt-4o',
      fallback: 'qwen2.5-vl',
    },
    automation: {
      browser: 'playwright',
      mobile: 'android',
      screenshots: true,
    },
  },
  zephyr: {
    projectId: 'katalyst-framework',
    environment: 'development',
    region: 'auto',
    features: {
      edgeDeployment: true,
      autoSSL: true,
      ddosProtection: true,
      geoRouting: true,
      analytics: true,
      monitoring: true,
      abTesting: true,
      previewDeployments: true,
    },
    microFrontends: {
      enabled: true,
      registry: 'https://registry.zephyr.cloud',
      versioning: 'semver',
      fallbackUrl: 'https://fallback.katalyst.app',
    },
    performance: {
      cdn: true,
      edgeCaching: true,
      compression: 'both',
      http2: true,
      http3: true,
      preload: ['/static/js/runtime.js', '/static/js/react.js', '/static/css/main.css'],
    },
    deployment: {
      strategy: 'blue-green',
      autoRollback: true,
      healthCheck: {
        enabled: true,
        endpoint: '/health',
        interval: 30,
        timeout: 5,
      },
    },
    integrations: {
      github: {
        enabled: true,
        autoPreview: true,
        protectedBranches: ['main', 'production'],
      },
      slack: {
        enabled: true,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
      },
      monitoring: {
        sentry: true,
        datadog: false,
        newRelic: false,
      },
    },
  },
};
