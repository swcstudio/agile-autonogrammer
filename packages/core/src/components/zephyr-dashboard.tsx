import React, { useState, useEffect } from 'react';
import { type ZephyrDeployment, ZephyrMetrics, useZephyr } from '../hooks/use-zephyr.ts';

export interface ZephyrDashboardProps {
  environment?: 'development' | 'staging' | 'production';
  className?: string;
  showMetrics?: boolean;
  showDeployments?: boolean;
  showMicroFrontends?: boolean;
}

export function ZephyrDashboard({
  environment = 'development',
  className = '',
  showMetrics = true,
  showDeployments = true,
  showMicroFrontends = true,
}: ZephyrDashboardProps) {
  const {
    isInitialized,
    isDeploying,
    error,
    deployments,
    currentDeployment,
    microFrontends,
    metrics,
    deploy,
    rollback,
    createPreviewDeployment,
    refreshMetrics,
  } = useZephyr({ environment, autoInitialize: true });

  const [selectedDeployment, setSelectedDeployment] = useState<ZephyrDeployment | null>(null);
  const [deployBranch, setDeployBranch] = useState('');

  useEffect(() => {
    if (currentDeployment) {
      setSelectedDeployment(currentDeployment);
    }
  }, [currentDeployment]);

  const handleDeploy = async () => {
    try {
      await deploy({ environment });
    } catch (err) {
      console.error('Deployment failed:', err);
    }
  };

  const handlePreviewDeploy = async () => {
    if (!deployBranch) return;

    try {
      await createPreviewDeployment(deployBranch);
      setDeployBranch('');
    } catch (err) {
      console.error('Preview deployment failed:', err);
    }
  };

  const handleRollback = async (deploymentId: string) => {
    if (confirm('Are you sure you want to rollback this deployment?')) {
      await rollback(deploymentId);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatMetric = (value: number, unit = 'ms') => {
    return `${value.toFixed(0)}${unit}`;
  };

  if (!isInitialized) {
    return (
      <div className={`zephyr-dashboard loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing Zephyr Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`zephyr-dashboard ${className}`}>
      <header className="dashboard-header">
        <h1>🌩️ Zephyr Cloud Dashboard</h1>
        <div className="environment-badge">{environment}</div>
      </header>

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {showMetrics && metrics && (
        <section className="metrics-section">
          <h2>Performance Metrics</h2>
          <div className="metrics-grid">
            <MetricCard
              title="First Contentful Paint"
              value={formatMetric(metrics.performance.p50.fcp)}
              p75={formatMetric(metrics.performance.p75.fcp)}
              p95={formatMetric(metrics.performance.p95.fcp)}
              status={getPerformanceStatus(metrics.performance.p50.fcp, 1800)}
            />
            <MetricCard
              title="Largest Contentful Paint"
              value={formatMetric(metrics.performance.p50.lcp)}
              p75={formatMetric(metrics.performance.p75.lcp)}
              p95={formatMetric(metrics.performance.p95.lcp)}
              status={getPerformanceStatus(metrics.performance.p50.lcp, 2500)}
            />
            <MetricCard
              title="Time to Interactive"
              value={formatMetric(metrics.performance.p50.tti)}
              p75={formatMetric(metrics.performance.p75.tti)}
              p95={formatMetric(metrics.performance.p95.tti)}
              status={getPerformanceStatus(metrics.performance.p50.tti, 3800)}
            />
            <MetricCard
              title="Uptime"
              value={`${metrics.availability.uptime}%`}
              subtitle={`Error Rate: ${metrics.availability.errorRate}%`}
              status={metrics.availability.uptime > 99.9 ? 'good' : 'warning'}
            />
          </div>

          <div className="usage-stats">
            <h3>Usage Statistics</h3>
            <div className="stat-row">
              <span>Requests:</span>
              <span>{metrics.usage.requests.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span>Bandwidth:</span>
              <span>{metrics.usage.bandwidth}</span>
            </div>
            <div className="stat-row">
              <span>Unique Users:</span>
              <span>{metrics.usage.uniqueUsers.toLocaleString()}</span>
            </div>
            {metrics.cost && (
              <>
                <div className="stat-row">
                  <span>Current Cost:</span>
                  <span>${metrics.cost.current.toFixed(2)}</span>
                </div>
                <div className="stat-row">
                  <span>Projected Monthly:</span>
                  <span>${metrics.cost.projected.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <button onClick={refreshMetrics} className="refresh-btn">
            🔄 Refresh Metrics
          </button>
        </section>
      )}

      {showDeployments && (
        <section className="deployments-section">
          <h2>Deployments</h2>

          <div className="deployment-actions">
            <button onClick={handleDeploy} disabled={isDeploying} className="deploy-btn primary">
              {isDeploying ? '🚀 Deploying...' : '🚀 Deploy to ' + environment}
            </button>

            <div className="preview-deploy">
              <input
                type="text"
                placeholder="Branch name"
                value={deployBranch}
                onChange={(e) => setDeployBranch(e.target.value)}
                className="branch-input"
              />
              <button
                onClick={handlePreviewDeploy}
                disabled={!deployBranch || isDeploying}
                className="deploy-btn secondary"
              >
                👁️ Preview Deploy
              </button>
            </div>
          </div>

          <div className="deployments-list">
            {deployments.length === 0 ? (
              <p className="empty-state">No deployments yet</p>
            ) : (
              deployments.map((deployment) => (
                <DeploymentCard
                  key={deployment.id}
                  deployment={deployment}
                  isSelected={selectedDeployment?.id === deployment.id}
                  onSelect={() => setSelectedDeployment(deployment)}
                  onRollback={() => handleRollback(deployment.id)}
                />
              ))
            )}
          </div>
        </section>
      )}

      {showMicroFrontends && microFrontends.length > 0 && (
        <section className="microfrontends-section">
          <h2>Micro-Frontends</h2>
          <div className="mf-grid">
            {microFrontends.map((mf) => (
              <div key={mf.name} className="mf-card">
                <h3>{mf.name}</h3>
                <p className="version">v{mf.version}</p>
                <p className="url">{mf.url}</p>
                <div className="mf-meta">
                  {mf.metadata?.framework && (
                    <span className="framework">{mf.metadata.framework}</span>
                  )}
                  {mf.metadata?.size && (
                    <span className="size">{formatSize(mf.metadata.size)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .zephyr-dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e0e0e0;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 2rem;
          color: #1a1a1a;
        }

        .environment-badge {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border-radius: 20px;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 0.875rem;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto 1rem;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-alert {
          background: #fee;
          color: #c00;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .metrics-section, .deployments-section, .microfrontends-section {
          margin-bottom: 3rem;
        }

        .metrics-section h2, .deployments-section h2, .microfrontends-section h2 {
          margin: 0 0 1.5rem;
          color: #333;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .usage-stats {
          background: #f9f9f9;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .usage-stats h3 {
          margin: 0 0 1rem;
          color: #555;
          font-size: 1.1rem;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .refresh-btn {
          padding: 0.5rem 1rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .refresh-btn:hover {
          background: #059669;
        }

        .deployment-actions {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
          align-items: center;
        }

        .deploy-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .deploy-btn.primary {
          background: #3b82f6;
          color: white;
        }

        .deploy-btn.primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .deploy-btn.secondary {
          background: #8b5cf6;
          color: white;
        }

        .deploy-btn.secondary:hover:not(:disabled) {
          background: #7c3aed;
        }

        .deploy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preview-deploy {
          display: flex;
          gap: 0.5rem;
        }

        .branch-input {
          padding: 0.75rem;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 1rem;
          width: 200px;
        }

        .deployments-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-state {
          text-align: center;
          color: #999;
          padding: 2rem;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .mf-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .mf-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          transition: box-shadow 0.2s;
        }

        .mf-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .mf-card h3 {
          margin: 0 0 0.5rem;
          color: #333;
        }

        .mf-card .version {
          color: #666;
          font-size: 0.875rem;
          margin: 0 0 0.5rem;
        }

        .mf-card .url {
          color: #3b82f6;
          font-size: 0.75rem;
          word-break: break-all;
          margin: 0 0 1rem;
        }

        .mf-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .mf-meta .framework {
          padding: 0.25rem 0.5rem;
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 4px;
        }

        .mf-meta .size {
          color: #666;
        }
      `}</style>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  p75,
  p95,
  subtitle,
  status,
}: {
  title: string;
  value: string;
  p75?: string;
  p95?: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'critical';
}) {
  return (
    <div className={`metric-card ${status}`}>
      <h3>{title}</h3>
      <div className="metric-value">{value}</div>
      {subtitle && <p className="metric-subtitle">{subtitle}</p>}
      {p75 && p95 && (
        <div className="metric-percentiles">
          <span>p75: {p75}</span>
          <span>p95: {p95}</span>
        </div>
      )}
      <style jsx>{`
        .metric-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }

        .metric-card.good::before {
          background: #10b981;
        }

        .metric-card.warning::before {
          background: #f59e0b;
        }

        .metric-card.critical::before {
          background: #ef4444;
        }

        .metric-card h3 {
          margin: 0 0 0.5rem;
          color: #555;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .metric-subtitle {
          margin: 0;
          color: #666;
          font-size: 0.875rem;
        }

        .metric-percentiles {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #888;
        }
      `}</style>
    </div>
  );
}

// Deployment Card Component
function DeploymentCard({
  deployment,
  isSelected,
  onSelect,
  onRollback,
}: {
  deployment: ZephyrDeployment;
  isSelected: boolean;
  onSelect: () => void;
  onRollback: () => void;
}) {
  const statusColors = {
    deploying: '#f59e0b',
    active: '#10b981',
    failed: '#ef4444',
    'rolled-back': '#6b7280',
  };

  return (
    <div className={`deployment-card ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="deployment-header">
        <div className="deployment-info">
          <h4>{deployment.version}</h4>
          <p className="deployment-env">{deployment.environment}</p>
        </div>
        <div
          className="deployment-status"
          style={{ backgroundColor: statusColors[deployment.status] }}
        >
          {deployment.status}
        </div>
      </div>

      <div className="deployment-details">
        <p className="deployment-url">{deployment.url}</p>
        <p className="deployment-time">{formatTime(deployment.timestamp)}</p>
      </div>

      {deployment.metrics && (
        <div className="deployment-metrics">
          <span>Build: {deployment.metrics.buildTime}ms</span>
          <span>Deploy: {deployment.metrics.deployTime}ms</span>
          <span>Size: {formatSize(deployment.metrics.size)}</span>
        </div>
      )}

      {deployment.status === 'active' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRollback();
          }}
          className="rollback-btn"
        >
          ↩️ Rollback
        </button>
      )}

      <style jsx>{`
        .deployment-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .deployment-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .deployment-card.selected {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .deployment-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
        }

        .deployment-info h4 {
          margin: 0 0 0.25rem;
          color: #333;
        }

        .deployment-env {
          margin: 0;
          color: #666;
          font-size: 0.875rem;
        }

        .deployment-status {
          padding: 0.25rem 0.75rem;
          color: white;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .deployment-details {
          margin-bottom: 1rem;
        }

        .deployment-url {
          margin: 0 0 0.25rem;
          color: #3b82f6;
          font-size: 0.875rem;
          word-break: break-all;
        }

        .deployment-time {
          margin: 0;
          color: #888;
          font-size: 0.75rem;
        }

        .deployment-metrics {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #666;
          margin-bottom: 1rem;
        }

        .rollback-btn {
          padding: 0.5rem 1rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background 0.2s;
        }

        .rollback-btn:hover {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
}

// Helper functions
function getPerformanceStatus(value: number, threshold: number): 'good' | 'warning' | 'critical' {
  if (value < threshold * 0.8) return 'good';
  if (value < threshold) return 'warning';
  return 'critical';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
