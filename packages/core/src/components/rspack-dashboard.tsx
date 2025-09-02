import React from 'react';
import { useRSpack } from '../hooks/use-rspack.ts';

export interface RSpackDashboardProps {
  variant?: 'core' | 'remix' | 'nextjs';
  className?: string;
}

export function RSpackDashboard({ variant = 'core', className = '' }: RSpackDashboardProps) {
  const {
    isInitialized,
    isLoading,
    error,
    config,
    stats,
    plugins,
    initialize,
    build,
    addPlugin,
    removePlugin,
  } = useRSpack({ variant, autoInitialize: true });

  const handleBuild = async () => {
    try {
      const buildStats = await build();
      console.log('Build completed:', buildStats);
    } catch (err) {
      console.error('Build failed:', err);
    }
  };

  const handleAddPlugin = () => {
    addPlugin({
      name: 'CustomPlugin',
      enabled: true,
      priority: 50,
      options: {
        custom: true,
      },
    });
  };

  if (error) {
    return (
      <div className={`rspack-dashboard error ${className}`}>
        <h2>RSpack Error</h2>
        <p>{error}</p>
        <button onClick={initialize}>Retry</button>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className={`rspack-dashboard loading ${className}`}>
        <h2>Initializing RSpack...</h2>
      </div>
    );
  }

  return (
    <div className={`rspack-dashboard ${className}`}>
      <header className="rspack-header">
        <h1>RSpack Integration Dashboard</h1>
        <p>Variant: {variant}</p>
      </header>

      <section className="rspack-status">
        <h2>Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Initialized:</span>
            <span className="value">{isInitialized ? '✅' : '❌'}</span>
          </div>
          <div className="status-item">
            <span className="label">Loading:</span>
            <span className="value">{isLoading ? '⏳' : '✅'}</span>
          </div>
          <div className="status-item">
            <span className="label">Mode:</span>
            <span className="value">{config?.mode || 'unknown'}</span>
          </div>
        </div>
      </section>

      {stats && (
        <section className="rspack-stats">
          <h2>Build Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Assets</h3>
              <p className="stat-value">{stats.assets.length}</p>
              <ul className="asset-list">
                {stats.assets.map((asset) => (
                  <li key={asset.name}>
                    {asset.name} ({formatSize(asset.size)})
                  </li>
                ))}
              </ul>
            </div>
            <div className="stat-card">
              <h3>Chunks</h3>
              <p className="stat-value">{stats.chunks.length}</p>
              <ul className="chunk-list">
                {stats.chunks.map((chunk) => (
                  <li key={chunk.id}>
                    {chunk.names.join(', ')} ({chunk.modules} modules)
                  </li>
                ))}
              </ul>
            </div>
            <div className="stat-card">
              <h3>Build Info</h3>
              <p>Modules: {stats.modules}</p>
              <p>Time: {stats.time}ms</p>
              <p>Hash: {stats.hash}</p>
              <p>Errors: {stats.errors.length}</p>
              <p>Warnings: {stats.warnings.length}</p>
            </div>
          </div>
        </section>
      )}

      <section className="rspack-plugins">
        <h2>Active Plugins ({plugins.length})</h2>
        <div className="plugin-list">
          {plugins.map((plugin) => (
            <div key={plugin.name} className="plugin-item">
              <span className="plugin-name">{plugin.name}</span>
              <span className="plugin-priority">Priority: {plugin.priority || 0}</span>
              <button onClick={() => removePlugin(plugin.name)} className="remove-btn">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button onClick={handleAddPlugin} className="add-plugin-btn">
          Add Custom Plugin
        </button>
      </section>

      <section className="rspack-actions">
        <h2>Actions</h2>
        <div className="action-buttons">
          <button onClick={handleBuild} disabled={isLoading} className="build-btn">
            {isLoading ? 'Building...' : 'Run Build'}
          </button>
          <button onClick={initialize} className="reinit-btn">
            Reinitialize
          </button>
        </div>
      </section>

      {config && (
        <section className="rspack-config">
          <h2>Configuration</h2>
          <details>
            <summary>View Full Config</summary>
            <pre className="config-preview">{JSON.stringify(config, null, 2)}</pre>
          </details>
        </section>
      )}

      <style jsx>{`
        .rspack-dashboard {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .rspack-header {
          margin-bottom: 2rem;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 1rem;
        }

        .rspack-header h1 {
          margin: 0;
          color: #333;
        }

        .rspack-header p {
          margin: 0.5rem 0 0;
          color: #666;
        }

        .status-grid, .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .stat-card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
        }

        .stat-card h3 {
          margin: 0 0 0.5rem;
          color: #333;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #3b82f6;
          margin: 0.5rem 0;
        }

        .asset-list, .chunk-list {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }

        .plugin-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin: 1rem 0;
        }

        .plugin-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .plugin-name {
          flex: 1;
          font-weight: 500;
        }

        .plugin-priority {
          color: #666;
          font-size: 0.875rem;
        }

        .remove-btn {
          padding: 0.25rem 0.75rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .remove-btn:hover {
          background: #dc2626;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          margin: 1rem 0;
        }

        .build-btn, .reinit-btn, .add-plugin-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .build-btn {
          background: #3b82f6;
          color: white;
        }

        .build-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .build-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .reinit-btn {
          background: #10b981;
          color: white;
        }

        .reinit-btn:hover {
          background: #059669;
        }

        .add-plugin-btn {
          background: #8b5cf6;
          color: white;
          margin-top: 1rem;
        }

        .add-plugin-btn:hover {
          background: #7c3aed;
        }

        .config-preview {
          background: #1e293b;
          color: #94a3b8;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        section {
          margin: 2rem 0;
        }

        section h2 {
          margin: 0 0 1rem;
          color: #333;
          font-size: 1.5rem;
        }
      `}</style>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
