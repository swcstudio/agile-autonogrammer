/**
 * PerformanceMonitor Component
 *
 * Monitors and displays Re.Pack performance metrics including
 * bundle loading times, memory usage, and module federation performance
 */

import { AnimatePresence, motion } from 'framer-motion';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from '../../index';
import { useRepack, useRepackPerformance } from './RepackProvider';

export interface PerformanceMetrics {
  bundleLoadTime: number;
  chunkLoadTimes: Record<string, number>;
  memoryUsage: number;
  jsHeapSize: number;
  totalLoadTime: number;
  moduleLoadTimes: Record<string, number>;
  cacheHitRate: number;
  networkRequests: number;
  errorRate: number;
}

export interface PerformanceThresholds {
  bundleLoadTime: { warning: number; critical: number };
  memoryUsage: { warning: number; critical: number };
  moduleLoadTime: { warning: number; critical: number };
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  bundleLoadTime: { warning: 2000, critical: 5000 },
  memoryUsage: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 }, // 50MB, 100MB
  moduleLoadTime: { warning: 1000, critical: 3000 },
};

export interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  minimized?: boolean;
  thresholds?: Partial<PerformanceThresholds>;
  onThresholdExceeded?: (metric: string, value: number, threshold: number) => void;
  showInProduction?: boolean;
  className?: string;
}

export function PerformanceMonitor({
  enabled = true,
  position = 'bottom-right',
  minimized = false,
  thresholds = {},
  onThresholdExceeded,
  showInProduction = false,
  className,
}: PerformanceMonitorProps) {
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<
    Array<{ id: string; message: string; type: 'warning' | 'critical' }>
  >([]);

  const performanceMetrics = useRepackPerformance();
  const { getBundleInfo, getBundleSize, getLoadedChunks, getLoadedRemotes } = useRepack();

  const alertTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  // Don't show in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  // Don't show if disabled
  if (!enabled) {
    return null;
  }

  // Enhanced metrics calculation
  useEffect(() => {
    if (!performanceMetrics) return;

    const calculateEnhancedMetrics = (): PerformanceMetrics => {
      const bundleInfo = getBundleInfo();
      const loadedChunks = getLoadedChunks();
      const loadedRemotes = getLoadedRemotes();

      // Calculate module load times
      const moduleLoadTimes: Record<string, number> = {};
      loadedRemotes.forEach((remote) => {
        moduleLoadTimes[remote] = performanceMetrics.chunkLoadTimes[remote] || 0;
      });

      // Calculate cache hit rate (simplified)
      const totalRequests = loadedChunks.length + loadedRemotes.length;
      const cacheHitRate = totalRequests > 0 ? 0.8 : 0; // Mock calculation

      return {
        ...performanceMetrics,
        moduleLoadTimes,
        cacheHitRate,
        networkRequests: totalRequests,
        errorRate: 0, // Would be calculated from actual error tracking
      };
    };

    const enhancedMetrics = calculateEnhancedMetrics();
    setMetrics(enhancedMetrics);

    // Check thresholds
    checkThresholds(enhancedMetrics);
  }, [performanceMetrics, getBundleInfo, getBundleSize, getLoadedChunks, getLoadedRemotes]);

  const checkThresholds = useCallback(
    (currentMetrics: PerformanceMetrics) => {
      const checks = [
        {
          metric: 'bundleLoadTime',
          value: currentMetrics.bundleLoadTime,
          thresholds: mergedThresholds.bundleLoadTime,
          unit: 'ms',
        },
        {
          metric: 'memoryUsage',
          value: currentMetrics.memoryUsage,
          thresholds: mergedThresholds.memoryUsage,
          unit: 'bytes',
        },
      ];

      // Check module load times
      Object.entries(currentMetrics.moduleLoadTimes).forEach(([module, loadTime]) => {
        checks.push({
          metric: `moduleLoadTime.${module}`,
          value: loadTime,
          thresholds: mergedThresholds.moduleLoadTime,
          unit: 'ms',
        });
      });

      checks.forEach(({ metric, value, thresholds: metricThresholds, unit }) => {
        let alertType: 'warning' | 'critical' | null = null;
        let threshold = 0;

        if (value > metricThresholds.critical) {
          alertType = 'critical';
          threshold = metricThresholds.critical;
        } else if (value > metricThresholds.warning) {
          alertType = 'warning';
          threshold = metricThresholds.warning;
        }

        if (alertType) {
          const alertId = `${metric}-${alertType}`;
          const message = `${metric}: ${formatValue(value, unit)} > ${formatValue(threshold, unit)}`;

          // Don't duplicate alerts
          if (!alerts.find((alert) => alert.id === alertId)) {
            setAlerts((prev) => [...prev, { id: alertId, message, type: alertType! }]);
            onThresholdExceeded?.(metric, value, threshold);

            // Auto-remove alert after 10 seconds
            const timeout = setTimeout(() => {
              setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
              alertTimeouts.current.delete(alertId);
            }, 10000);

            alertTimeouts.current.set(alertId, timeout);
          }
        }
      });
    },
    [mergedThresholds, alerts, onThresholdExceeded]
  );

  const formatValue = (value: number, unit: string): string => {
    switch (unit) {
      case 'bytes':
        return formatBytes(value);
      case 'ms':
        return `${value.toFixed(2)}ms`;
      default:
        return value.toString();
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const dismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    const timeout = alertTimeouts.current.get(alertId);
    if (timeout) {
      clearTimeout(timeout);
      alertTimeouts.current.delete(alertId);
    }
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const getStatusColor = (
    value: number,
    thresholds: { warning: number; critical: number }
  ): string => {
    if (value > thresholds.critical) return 'text-red-600';
    if (value > thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!metrics) {
    return null;
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className || ''}`}>
      {/* Alerts */}
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-2 p-3 rounded-lg shadow-lg text-sm max-w-sm ${
              alert.type === 'critical'
                ? 'bg-red-100 border border-red-300 text-red-800'
                : 'bg-yellow-100 border border-yellow-300 text-yellow-800'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">
                  {alert.type === 'critical' ? '🚨' : '⚠️'} Performance Alert
                </div>
                <div className="text-xs mt-1">{alert.message}</div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="ml-2 text-lg leading-none opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Monitor */}
      <motion.div
        animate={{ width: isMinimized ? 'auto' : 320 }}
        className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center text-sm font-medium text-gray-700">
            <span className="mr-2">📊</span>
            Re.Pack Performance
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isMinimized ? '⬜' : '➖'}
          </button>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="p-3 space-y-3 text-xs"
            >
              {/* Bundle Performance */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Bundle Performance</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Load Time:</span>
                    <span
                      className={getStatusColor(
                        metrics.bundleLoadTime,
                        mergedThresholds.bundleLoadTime
                      )}
                    >
                      {metrics.bundleLoadTime.toFixed(2)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Size:</span>
                    <span>{formatBytes(getBundleSize())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chunks Loaded:</span>
                    <span>{getLoadedChunks().length}</span>
                  </div>
                </div>
              </div>

              {/* Memory Usage */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Memory Usage</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>JS Heap Used:</span>
                    <span
                      className={getStatusColor(metrics.memoryUsage, mergedThresholds.memoryUsage)}
                    >
                      {formatBytes(metrics.memoryUsage)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Heap Size:</span>
                    <span>{formatBytes(metrics.jsHeapSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    <span>
                      {metrics.jsHeapSize > 0
                        ? ((metrics.memoryUsage / metrics.jsHeapSize) * 100).toFixed(1)
                        : '0'}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Module Federation */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Module Federation</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Remotes Loaded:</span>
                    <span>{getLoadedRemotes().length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Hit Rate:</span>
                    <span>{(metrics.cacheHitRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network Requests:</span>
                    <span>{metrics.networkRequests}</span>
                  </div>
                </div>
              </div>

              {/* Recent Module Load Times */}
              {Object.keys(metrics.moduleLoadTimes).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Module Load Times</h4>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {Object.entries(metrics.moduleLoadTimes)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([module, time]) => (
                        <div key={module} className="flex justify-between">
                          <span className="truncate mr-2" title={module}>
                            {module.split('/').pop()}
                          </span>
                          <span className={getStatusColor(time, mergedThresholds.moduleLoadTime)}>
                            {time.toFixed(2)}ms
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Platform Info */}
              <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                Platform: {Platform.OS} | {Platform.isWeb() ? 'Web' : 'Native'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// Hook for performance thresholds checking
export function usePerformanceThresholds(
  thresholds: Partial<PerformanceThresholds> = {},
  onThresholdExceeded?: (metric: string, value: number, threshold: number) => void
) {
  const metrics = useRepackPerformance();
  const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  useEffect(() => {
    if (!metrics || !onThresholdExceeded) return;

    // Check each threshold
    if (metrics.bundleLoadTime > mergedThresholds.bundleLoadTime.critical) {
      onThresholdExceeded(
        'bundleLoadTime',
        metrics.bundleLoadTime,
        mergedThresholds.bundleLoadTime.critical
      );
    }

    if (metrics.memoryUsage > mergedThresholds.memoryUsage.critical) {
      onThresholdExceeded(
        'memoryUsage',
        metrics.memoryUsage,
        mergedThresholds.memoryUsage.critical
      );
    }
  }, [metrics, mergedThresholds, onThresholdExceeded]);

  return {
    thresholds: mergedThresholds,
    isWithinThresholds: metrics
      ? {
          bundleLoadTime: metrics.bundleLoadTime <= mergedThresholds.bundleLoadTime.warning,
          memoryUsage: metrics.memoryUsage <= mergedThresholds.memoryUsage.warning,
        }
      : null,
  };
}

// Component for displaying performance metrics in a dashboard
export interface PerformanceDashboardProps {
  refreshInterval?: number;
  showCharts?: boolean;
  className?: string;
}

export function PerformanceDashboard({
  refreshInterval = 5000,
  showCharts = true,
  className,
}: PerformanceDashboardProps) {
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const metrics = useRepackPerformance();

  useEffect(() => {
    if (!metrics) return;

    const interval = setInterval(() => {
      setHistory((prev) => {
        const newHistory = [...prev, { ...metrics, timestamp: Date.now() } as any];
        // Keep only last 20 entries
        return newHistory.slice(-20);
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [metrics, refreshInterval]);

  if (!metrics) {
    return (
      <div className={`p-4 ${className || ''}`}>
        <div className="text-center text-gray-500">No performance data available</div>
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-6 ${className || ''}`}>
      <h2 className="text-xl font-semibold text-gray-800">Re.Pack Performance Dashboard</h2>

      {/* Current Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Bundle Load Time"
          value={`${metrics.bundleLoadTime.toFixed(2)}ms`}
          trend={
            history.length > 1
              ? metrics.bundleLoadTime - history[history.length - 2].bundleLoadTime
              : 0
          }
        />
        <MetricCard
          title="Memory Usage"
          value={formatBytes(metrics.memoryUsage)}
          trend={
            history.length > 1 ? metrics.memoryUsage - history[history.length - 2].memoryUsage : 0
          }
        />
        <MetricCard
          title="Cache Hit Rate"
          value={`${(metrics.cacheHitRate * 100).toFixed(1)}%`}
          trend={
            history.length > 1 ? metrics.cacheHitRate - history[history.length - 2].cacheHitRate : 0
          }
        />
        <MetricCard
          title="Network Requests"
          value={metrics.networkRequests.toString()}
          trend={
            history.length > 1
              ? metrics.networkRequests - history[history.length - 2].networkRequests
              : 0
          }
        />
      </div>

      {/* Charts would go here if showCharts is true */}
      {showCharts && history.length > 5 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Performance Trends</h3>
          <div className="text-sm text-gray-500">
            Chart visualization would be implemented with a charting library
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
}

function MetricCard({ title, value, trend }: MetricCardProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-semibold text-gray-900">{value}</span>
        {trend !== 0 && (
          <span className={`text-sm ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
