import React from 'react';

/**
 * RSPack Build Configuration Example
 * Demonstrates RSPack configuration and usage in Katalyst
 */

// Example of a component that would be bundled with RSPack
export const RspackExample: React.FC = () => {
  const [count, setCount] = React.useState(0);
  const [modules, setModules] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    // Simulate loading dynamic modules
    const loadedModules = [
      'react',
      'react-dom',
      '@katalyst/core',
      '@katalyst/design-system',
      '@katalyst/hooks',
    ];
    setModules(loadedModules);
  }, []);
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>RSPack Build System</h2>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Build Features</h3>
        <ul>
          <li>⚡ Lightning-fast builds with Rust</li>
          <li>📦 Module Federation support</li>
          <li>🔧 Webpack-compatible configuration</li>
          <li>🚀 Incremental compilation</li>
          <li>🎯 Tree shaking and code splitting</li>
          <li>💾 Persistent caching</li>
        </ul>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Bundle Analysis</h3>
        <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
          <p><strong>Entry Points:</strong> 3</p>
          <p><strong>Chunks:</strong> 12</p>
          <p><strong>Modules:</strong> 847</p>
          <p><strong>Assets:</strong> 24</p>
          <p><strong>Build Time:</strong> 1.2s</p>
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Loaded Modules</h3>
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
          {modules.map((module, index) => (
            <div
              key={index}
              style={{
                padding: '5px 10px',
                margin: '5px 0',
                backgroundColor: 'white',
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}
            >
              {module}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Hot Module Replacement Demo</h3>
        <p>Counter: {count}</p>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Increment (HMR preserves state)
        </button>
      </div>
      
      <div>
        <h3>Configuration Example</h3>
        <pre style={{ backgroundColor: '#2d2d2d', color: '#f8f8f2', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`// rspack.config.js
import { defineConfig } from '@rspack/cli';

export default defineConfig({
  entry: './src/index.tsx',
  output: {
    path: './dist',
    filename: '[name].[contenthash].js',
  },
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        use: {
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
      },
    ],
  },
  experiments: {
    css: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
});`}
        </pre>
      </div>
    </div>
  );
};

export default RspackExample;