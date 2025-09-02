import { defineConfig } from '@empjs/cli';
import pluginReact from '@empjs/plugin-react';
import pluginTailwindcss from '@empjs/plugin-tailwindcss3';

export default defineConfig({
  name: 'swcstudio-marketing',
  server: {
    port: 8080,
    open: true,
  },
  html: {
    title: 'SWC Studio Marketing - Powered by EMP',
  },
  resolve: {
    alias: {
      '@': './src',
      '@shared': './shared/src',
      '@components': './shared/src/components',
      '@hooks': './shared/src/hooks',
      '@integrations': './shared/src/integrations',
    },
  },
  empShare: {
    name: 'swcstudio_marketing',
    exposes: {
      './App': './src/App.tsx',
      './components': './shared/src/components/index.ts',
      './hooks': './shared/src/hooks/index.ts',
      './design-system': './shared/src/design-system/index.ts',
      './integrations': './shared/src/integrations/index.ts',
    },
    shared: {
      react: {
        singleton: true,
        requiredVersion: '^19.0.0',
      },
      'react-dom': {
        singleton: true,
        requiredVersion: '^19.0.0',
      },
      '@tanstack/react-query': {
        singleton: true,
      },
      '@tanstack/react-router': {
        singleton: true,
      },
      zustand: {
        singleton: true,
      },
      '@arco-design/web-react': {
        singleton: true,
      },
    },
    remotes: {
      // Add remote micro-frontends here
      // Example:
      // 'header': 'header@http://localhost:8001/emp.js',
      // 'footer': 'footer@http://localhost:8002/emp.js'
    },
  },
  plugins: [pluginReact(), pluginTailwindcss()],
  experiments: {
    css: true,
  },
  // TypeScript and CSS Modules support
  typescript: {
    typeCheck: true,
    cssModuleTypeGeneration: true,
  },
  // Performance optimizations
  optimization: {
    splitChunks: {
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
        shared: {
          test: /[\\/]shared[\\/]/,
          name: 'shared-components',
          priority: 15,
        },
      },
    },
    treeshaking: true,
    usedExports: true,
    sideEffects: false,
  },
  // Development features
  debug: {
    clearLog: false,
    level: 'info',
    rsDoctor: {
      enable: process.env.NODE_ENV === 'development',
    },
  },
});
