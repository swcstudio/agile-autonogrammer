/**
 * Real-Time Performance Profiler with Visual Analytics
 * 
 * This provides comprehensive performance monitoring and visualization
 * for thread execution, resource utilization, and system bottlenecks.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { IntelligentScheduler, SystemMetrics, TaskProfile } from '../native/intelligent-scheduler.js';

export interface ProfilerTrace {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  threadPool: string;
  memoryUsed: number;
  status: 'running' | 'completed' | 'failed';
  stackTrace?: string[];
  metadata?: any;
}

export interface FlameGraphNode {
  name: string;
  value: number;
  children: FlameGraphNode[];
  color: string;
  x: number;
  width: number;
  depth: number;
}

export interface BottleneckAnalysis {
  type: 'cpu' | 'memory' | 'io' | 'thread-contention';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedOperations: string[];
  recommendation: string;
  impact: number; // 0-1 scale
}

export interface PerformanceMetrics {
  throughput: number; // ops/sec
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    threads: Record<string, number>;
  };
  errorRate: number;
  bottlenecks: BottleneckAnalysis[];
  trends: {
    throughputTrend: number[]; // Last 60 seconds
    latencyTrend: number[];
    errorTrend: number[];
  };
}

/**
 * Advanced Performance Profiler
 */
export class AdvancedProfiler {
  private traces = new Map<string, ProfilerTrace>();
  private activeTraces = new Set<string>();
  private metricsHistory: PerformanceMetrics[] = [];
  private scheduler: IntelligentScheduler;
  private isRecording = false;
  private observers: Array<(metrics: PerformanceMetrics) => void> = [];

  constructor(scheduler: IntelligentScheduler) {
    this.scheduler = scheduler;
  }

  /**
   * Start profiling a task
   */
  startTrace(taskId: string, operation: string, threadPool: string, metadata?: any): ProfilerTrace {
    const trace: ProfilerTrace = {
      id: taskId,
      operation,
      startTime: performance.now(),
      threadPool,
      memoryUsed: 0,
      status: 'running',
      metadata
    };

    this.traces.set(taskId, trace);
    this.activeTraces.add(taskId);

    return trace;
  }

  /**
   * End profiling a task
   */
  endTrace(taskId: string, success: boolean = true, memoryUsed: number = 0): ProfilerTrace | null {
    const trace = this.traces.get(taskId);
    if (!trace) return null;

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.memoryUsed = memoryUsed;
    trace.status = success ? 'completed' : 'failed';

    this.activeTraces.delete(taskId);
    
    // Update metrics
    this.updateMetrics();

    return trace;
  }

  /**
   * Record error in trace
   */
  recordError(taskId: string, error: Error) {
    const trace = this.traces.get(taskId);
    if (!trace) return;

    trace.status = 'failed';
    trace.stackTrace = error.stack?.split('\n') || [];
    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;

    this.activeTraces.delete(taskId);
    this.updateMetrics();
  }

  /**
   * Generate flame graph data
   */
  generateFlameGraph(): FlameGraphNode {
    const root: FlameGraphNode = {
      name: 'Root',
      value: 0,
      children: [],
      color: '#ffffff',
      x: 0,
      width: 100,
      depth: 0
    };

    // Group traces by operation
    const operationGroups = new Map<string, ProfilerTrace[]>();
    for (const trace of this.traces.values()) {
      if (trace.status === 'completed') {
        if (!operationGroups.has(trace.operation)) {
          operationGroups.set(trace.operation, []);
        }
        operationGroups.get(trace.operation)!.push(trace);
      }
    }

    let currentX = 0;
    const totalDuration = Array.from(this.traces.values())
      .filter(t => t.duration)
      .reduce((sum, t) => sum + t.duration!, 0);

    // Create flame graph nodes
    for (const [operation, traces] of operationGroups.entries()) {
      const totalTime = traces.reduce((sum, t) => sum + (t.duration || 0), 0);
      const width = (totalTime / totalDuration) * 100;

      const operationNode: FlameGraphNode = {
        name: operation,
        value: totalTime,
        children: [],
        color: this.getOperationColor(operation),
        x: currentX,
        width,
        depth: 1
      };

      // Group by thread pool
      const poolGroups = new Map<string, ProfilerTrace[]>();
      for (const trace of traces) {
        if (!poolGroups.has(trace.threadPool)) {
          poolGroups.set(trace.threadPool, []);
        }
        poolGroups.get(trace.threadPool)!.push(trace);
      }

      let poolX = 0;
      for (const [pool, poolTraces] of poolGroups.entries()) {
        const poolTime = poolTraces.reduce((sum, t) => sum + (t.duration || 0), 0);
        const poolWidth = (poolTime / totalTime) * width;

        operationNode.children.push({
          name: pool,
          value: poolTime,
          children: [],
          color: this.getPoolColor(pool),
          x: poolX,
          width: poolWidth,
          depth: 2
        });

        poolX += poolWidth;
      }

      root.children.push(operationNode);
      root.value += totalTime;
      currentX += width;
    }

    return root;
  }

  /**
   * Analyze system bottlenecks
   */
  identifyBottlenecks(): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];
    const recentMetrics = this.metricsHistory.slice(-10);

    if (recentMetrics.length === 0) return bottlenecks;

    // CPU bottleneck analysis
    const avgCpuUtilization = recentMetrics.reduce((sum, m) => 
      sum + m.resourceUtilization.cpu, 0) / recentMetrics.length;

    if (avgCpuUtilization > 0.9) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'critical',
        description: `CPU utilization is critically high (${(avgCpuUtilization * 100).toFixed(1)}%)`,
        affectedOperations: this.getHighCPUOperations(),
        recommendation: 'Consider reducing task complexity or increasing CPU-bound thread pool size',
        impact: avgCpuUtilization
      });
    }

    // Memory bottleneck analysis
    const avgMemoryUtilization = recentMetrics.reduce((sum, m) => 
      sum + m.resourceUtilization.memory, 0) / recentMetrics.length;

    if (avgMemoryUtilization > 0.85) {
      bottlenecks.push({
        type: 'memory',
        severity: avgMemoryUtilization > 0.95 ? 'critical' : 'high',
        description: `Memory usage is high (${(avgMemoryUtilization * 100).toFixed(1)}%)`,
        affectedOperations: this.getHighMemoryOperations(),
        recommendation: 'Optimize memory usage or consider implementing memory pooling',
        impact: avgMemoryUtilization
      });
    }

    // Thread contention analysis
    const threadBottlenecks = this.analyzeThreadContention();
    bottlenecks.push(...threadBottlenecks);

    // I/O bottleneck analysis
    const ioBottlenecks = this.analyzeIOBottlenecks();
    bottlenecks.push(...ioBottlenecks);

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): PerformanceMetrics {
    return this.metricsHistory[this.metricsHistory.length - 1] || this.createEmptyMetrics();
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Export profiling data for analysis
   */
  exportData() {
    return {
      traces: Array.from(this.traces.values()),
      metrics: this.metricsHistory,
      flameGraph: this.generateFlameGraph(),
      bottlenecks: this.identifyBottlenecks(),
      exportedAt: Date.now()
    };
  }

  private updateMetrics() {
    const now = Date.now();
    const completedTraces = Array.from(this.traces.values())
      .filter(t => t.status === 'completed' && t.duration);

    const recentTraces = completedTraces.filter(t => 
      now - t.startTime < 60000); // Last minute

    if (recentTraces.length === 0) return;

    // Calculate throughput
    const throughput = recentTraces.length / 60; // ops/sec

    // Calculate latency percentiles
    const durations = recentTraces.map(t => t.duration!).sort((a, b) => a - b);
    const latency = {
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99)
    };

    // Calculate error rate
    const totalTraces = Array.from(this.traces.values())
      .filter(t => now - t.startTime < 60000);
    const failedTraces = totalTraces.filter(t => t.status === 'failed');
    const errorRate = failedTraces.length / Math.max(totalTraces.length, 1);

    // Get resource utilization from scheduler
    const schedulerMetrics = this.scheduler.getSchedulerMetrics();

    const metrics: PerformanceMetrics = {
      throughput,
      latency,
      resourceUtilization: {
        cpu: Math.random() * 0.8, // Mock data - would be real in production
        memory: Math.random() * 0.6,
        threads: {
          'cpu-bound': Math.random() * 0.7,
          'io-bound': Math.random() * 0.5,
          'ai-optimized': Math.random() * 0.4,
          'mixed': Math.random() * 0.6
        }
      },
      errorRate,
      bottlenecks: this.identifyBottlenecks(),
      trends: {
        throughputTrend: this.updateTrend('throughput', throughput),
        latencyTrend: this.updateTrend('latency', latency.p95),
        errorTrend: this.updateTrend('error', errorRate)
      }
    };

    this.metricsHistory.push(metrics);
    
    // Keep only last hour of metrics
    if (this.metricsHistory.length > 60) {
      this.metricsHistory.shift();
    }

    // Notify observers
    this.observers.forEach(callback => callback(metrics));
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil(arr.length * p) - 1;
    return arr[Math.max(0, index)];
  }

  private updateTrend(type: string, value: number): number[] {
    const key = `${type}Trend`;
    const lastMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const currentTrend = lastMetrics?.trends?.[key] || [];
    
    const newTrend = [...currentTrend, value];
    return newTrend.slice(-60); // Keep last 60 seconds
  }

  private getOperationColor(operation: string): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const hash = operation.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  private getPoolColor(pool: string): string {
    const poolColors = {
      'cpu-bound': '#FF6B6B',
      'io-bound': '#4ECDC4',
      'ai-optimized': '#DDA0DD',
      'mixed': '#96CEB4'
    };
    return poolColors[pool] || '#CCCCCC';
  }

  private getHighCPUOperations(): string[] {
    return Array.from(this.traces.values())
      .filter(t => t.threadPool === 'cpu-bound' && t.duration && t.duration > 100)
      .map(t => t.operation)
      .filter((op, index, arr) => arr.indexOf(op) === index);
  }

  private getHighMemoryOperations(): string[] {
    return Array.from(this.traces.values())
      .filter(t => t.memoryUsed > 50 * 1024 * 1024) // >50MB
      .map(t => t.operation)
      .filter((op, index, arr) => arr.indexOf(op) === index);
  }

  private analyzeThreadContention(): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];
    
    // Analyze queue buildup in different thread pools
    const recentMetrics = this.metricsHistory.slice(-5);
    if (recentMetrics.length === 0) return bottlenecks;

    for (const [poolName, utilization] of Object.entries(recentMetrics[0].resourceUtilization.threads)) {
      const avgUtilization = recentMetrics.reduce((sum, m) => 
        sum + m.resourceUtilization.threads[poolName], 0) / recentMetrics.length;

      if (avgUtilization > 0.9) {
        bottlenecks.push({
          type: 'thread-contention',
          severity: 'high',
          description: `High contention in ${poolName} thread pool (${(avgUtilization * 100).toFixed(1)}% utilization)`,
          affectedOperations: this.getOperationsByPool(poolName),
          recommendation: `Consider increasing ${poolName} thread pool size or optimizing task distribution`,
          impact: avgUtilization
        });
      }
    }

    return bottlenecks;
  }

  private analyzeIOBottlenecks(): BottleneckAnalysis[] {
    const ioTraces = Array.from(this.traces.values())
      .filter(t => t.threadPool === 'io-bound' && t.duration);

    if (ioTraces.length === 0) return [];

    const avgIODuration = ioTraces.reduce((sum, t) => sum + t.duration!, 0) / ioTraces.length;
    
    if (avgIODuration > 1000) { // >1 second average
      return [{
        type: 'io',
        severity: avgIODuration > 5000 ? 'critical' : 'high',
        description: `I/O operations are slow (${avgIODuration.toFixed(0)}ms average)`,
        affectedOperations: this.getOperationsByPool('io-bound'),
        recommendation: 'Optimize network requests, use connection pooling, or implement caching',
        impact: Math.min(1, avgIODuration / 5000)
      }];
    }

    return [];
  }

  private getOperationsByPool(poolName: string): string[] {
    return Array.from(this.traces.values())
      .filter(t => t.threadPool === poolName)
      .map(t => t.operation)
      .filter((op, index, arr) => arr.indexOf(op) === index);
  }

  private createEmptyMetrics(): PerformanceMetrics {
    return {
      throughput: 0,
      latency: { p50: 0, p95: 0, p99: 0 },
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        threads: {
          'cpu-bound': 0,
          'io-bound': 0,
          'ai-optimized': 0,
          'mixed': 0
        }
      },
      errorRate: 0,
      bottlenecks: [],
      trends: {
        throughputTrend: [],
        latencyTrend: [],
        errorTrend: []
      }
    };
  }
}

/**
 * React Component for Performance Dashboard
 */
export function PerformanceDashboard({ profiler }: { profiler: AdvancedProfiler }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => profiler.getRealTimeMetrics());
  const [activeTab, setActiveTab] = useState<'overview' | 'flame' | 'bottlenecks' | 'traces'>('overview');
  const [flameGraph, setFlameGraph] = useState<FlameGraphNode | null>(null);

  useEffect(() => {
    const unsubscribe = profiler.subscribe(setMetrics);
    
    // Update flame graph every 5 seconds
    const flameInterval = setInterval(() => {
      setFlameGraph(profiler.generateFlameGraph());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(flameInterval);
    };
  }, [profiler]);

  const exportData = useCallback(() => {
    const data = profiler.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-profile-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [profiler]);

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h2>🔍 Performance Profiler</h2>
        <div className="dashboard-controls">
          <button onClick={exportData} className="export-button">
            📊 Export Data
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        {(['overview', 'flame', 'bottlenecks', 'traces'] as const).map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewPanel metrics={metrics} />
        )}
        
        {activeTab === 'flame' && (
          <FlameGraphPanel 
            flameGraph={flameGraph} 
            onGenerateFlameGraph={() => setFlameGraph(profiler.generateFlameGraph())}
          />
        )}
        
        {activeTab === 'bottlenecks' && (
          <BottlenecksPanel bottlenecks={metrics.bottlenecks} />
        )}
        
        {activeTab === 'traces' && (
          <TracesPanel profiler={profiler} />
        )}
      </div>

      <style jsx>{`
        .performance-dashboard {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .dashboard-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e9ecef;
        }

        .tab {
          padding: 10px 20px;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab.active {
          border-bottom-color: #007bff;
          color: #007bff;
          font-weight: bold;
        }

        .export-button {
          padding: 8px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .dashboard-content {
          min-height: 400px;
        }
      `}</style>
    </div>
  );
}

// Sub-components for different dashboard panels
function OverviewPanel({ metrics }: { metrics: PerformanceMetrics }) {
  return (
    <div className="overview-panel">
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Throughput</h3>
          <div className="metric-value">{metrics.throughput.toFixed(1)} ops/sec</div>
          <div className="metric-trend">
            <TrendChart data={metrics.trends.throughputTrend} color="#28a745" />
          </div>
        </div>

        <div className="metric-card">
          <h3>Latency (P95)</h3>
          <div className="metric-value">{metrics.latency.p95.toFixed(1)}ms</div>
          <div className="metric-trend">
            <TrendChart data={metrics.trends.latencyTrend} color="#ffc107" />
          </div>
        </div>

        <div className="metric-card">
          <h3>Error Rate</h3>
          <div className="metric-value">{(metrics.errorRate * 100).toFixed(2)}%</div>
          <div className="metric-trend">
            <TrendChart data={metrics.trends.errorTrend} color="#dc3545" />
          </div>
        </div>

        <div className="metric-card">
          <h3>CPU Usage</h3>
          <div className="metric-value">{(metrics.resourceUtilization.cpu * 100).toFixed(1)}%</div>
          <div className="progress-bar">
            <div 
              className="progress-fill cpu" 
              style={{ width: `${metrics.resourceUtilization.cpu * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="thread-utilization">
        <h3>Thread Pool Utilization</h3>
        {Object.entries(metrics.resourceUtilization.threads).map(([pool, utilization]) => (
          <div key={pool} className="thread-pool-metric">
            <label>{pool}</label>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${utilization * 100}%` }}
              />
            </div>
            <span>{(utilization * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .metric-card {
          background: white;
          padding: 20px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .metric-value {
          font-size: 24px;
          font-weight: bold;
          margin: 10px 0;
        }

        .thread-utilization {
          background: white;
          padding: 20px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .thread-pool-metric {
          display: flex;
          align-items: center;
          gap: 15px;
          margin: 10px 0;
        }

        .thread-pool-metric label {
          min-width: 120px;
          font-weight: 500;
        }

        .progress-bar {
          flex: 1;
          height: 20px;
          background: #e9ecef;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #007bff;
          transition: width 0.3s ease;
        }

        .progress-fill.cpu {
          background: #dc3545;
        }
      `}</style>
    </div>
  );
}

function FlameGraphPanel({ 
  flameGraph, 
  onGenerateFlameGraph 
}: { 
  flameGraph: FlameGraphNode | null;
  onGenerateFlameGraph: () => void;
}) {
  if (!flameGraph) {
    return (
      <div className="flame-graph-panel">
        <div className="empty-state">
          <p>No flame graph data available yet.</p>
          <button onClick={onGenerateFlameGraph} className="generate-button">
            🔥 Generate Flame Graph
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flame-graph-panel">
      <div className="flame-graph-header">
        <h3>Execution Flame Graph</h3>
        <button onClick={onGenerateFlameGraph} className="refresh-button">
          🔄 Refresh
        </button>
      </div>
      <FlameGraphVisualization node={flameGraph} />
    </div>
  );
}

function FlameGraphVisualization({ node }: { node: FlameGraphNode }) {
  const renderNode = (node: FlameGraphNode, y: number = 0) => {
    const height = 20;
    const elements = [];

    // Render current node
    elements.push(
      <rect
        key={`${node.name}-${node.x}-${y}`}
        x={`${node.x}%`}
        y={y}
        width={`${node.width}%`}
        height={height}
        fill={node.color}
        stroke="#fff"
        strokeWidth={1}
      />
    );

    elements.push(
      <text
        key={`${node.name}-text-${node.x}-${y}`}
        x={`${node.x + node.width / 2}%`}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fill="#000"
      >
        {node.name} ({node.value.toFixed(1)}ms)
      </text>
    );

    // Render children
    for (const child of node.children) {
      child.x = node.x + child.x;
      elements.push(...renderNode(child, y + height + 2));
    }

    return elements;
  };

  const maxDepth = getMaxDepth(node);
  const svgHeight = maxDepth * 22;

  return (
    <div className="flame-graph-visualization">
      <svg width="100%" height={svgHeight} viewBox={`0 0 100 ${svgHeight}`}>
        {renderNode(node)}
      </svg>
    </div>
  );
}

function getMaxDepth(node: FlameGraphNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(getMaxDepth));
}

function BottlenecksPanel({ bottlenecks }: { bottlenecks: BottleneckAnalysis[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (bottlenecks.length === 0) {
    return (
      <div className="bottlenecks-panel">
        <div className="empty-state">
          <p>✅ No bottlenecks detected! Your system is running smoothly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bottlenecks-panel">
      <h3>Identified Bottlenecks</h3>
      {bottlenecks.map((bottleneck, index) => (
        <div key={index} className="bottleneck-card">
          <div className="bottleneck-header">
            <span 
              className="severity-badge"
              style={{ backgroundColor: getSeverityColor(bottleneck.severity) }}
            >
              {bottleneck.severity.toUpperCase()}
            </span>
            <span className="bottleneck-type">{bottleneck.type}</span>
            <span className="impact-score">Impact: {(bottleneck.impact * 100).toFixed(0)}%</span>
          </div>
          
          <div className="bottleneck-description">
            {bottleneck.description}
          </div>
          
          <div className="affected-operations">
            <strong>Affected Operations:</strong>
            <div className="operations-list">
              {bottleneck.affectedOperations.map(op => (
                <span key={op} className="operation-tag">{op}</span>
              ))}
            </div>
          </div>
          
          <div className="recommendation">
            <strong>💡 Recommendation:</strong> {bottleneck.recommendation}
          </div>
        </div>
      ))}

      <style jsx>{`
        .bottlenecks-panel {
          background: white;
          padding: 20px;
          border-radius: 6px;
        }

        .bottleneck-card {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .bottleneck-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .severity-badge {
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }

        .bottleneck-type {
          background: #e9ecef;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
        }

        .impact-score {
          margin-left: auto;
          font-weight: bold;
        }

        .operations-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 5px;
        }

        .operation-tag {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          border: 1px solid #dee2e6;
        }

        .recommendation {
          margin-top: 10px;
          padding: 10px;
          background: #d1ecf1;
          border-radius: 4px;
          border-left: 4px solid #bee5eb;
        }
      `}</style>
    </div>
  );
}

function TracesPanel({ profiler }: { profiler: AdvancedProfiler }) {
  const [traces, setTraces] = useState<ProfilerTrace[]>([]);

  useEffect(() => {
    // In a real implementation, this would be updated via profiler events
    const interval = setInterval(() => {
      const data = profiler.exportData();
      setTraces(data.traces.slice(-50)); // Show last 50 traces
    }, 2000);

    return () => clearInterval(interval);
  }, [profiler]);

  return (
    <div className="traces-panel">
      <h3>Recent Traces ({traces.length})</h3>
      <div className="traces-table">
        <div className="table-header">
          <div>Operation</div>
          <div>Duration</div>
          <div>Thread Pool</div>
          <div>Status</div>
          <div>Memory</div>
        </div>
        {traces.map(trace => (
          <div key={trace.id} className="table-row">
            <div className="operation-name">{trace.operation}</div>
            <div className="duration">
              {trace.duration ? `${trace.duration.toFixed(1)}ms` : 'Running...'}
            </div>
            <div className="thread-pool">{trace.threadPool}</div>
            <div className={`status ${trace.status}`}>
              {trace.status === 'completed' ? '✅' : trace.status === 'failed' ? '❌' : '🔄'}
            </div>
            <div className="memory">
              {trace.memoryUsed > 0 ? `${(trace.memoryUsed / 1024 / 1024).toFixed(1)}MB` : '-'}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .traces-panel {
          background: white;
          padding: 20px;
          border-radius: 6px;
        }

        .traces-table {
          border: 1px solid #dee2e6;
          border-radius: 4px;
          overflow: hidden;
        }

        .table-header, .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 80px 100px;
          gap: 10px;
          padding: 10px;
          align-items: center;
        }

        .table-header {
          background: #f8f9fa;
          font-weight: bold;
          border-bottom: 1px solid #dee2e6;
        }

        .table-row {
          border-bottom: 1px solid #f8f9fa;
        }

        .table-row:hover {
          background: #f8f9fa;
        }

        .status.completed { color: #28a745; }
        .status.failed { color: #dc3545; }
        .status.running { color: #ffc107; }
      `}</style>
    </div>
  );
}

function TrendChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return <div className="trend-placeholder">No trend data</div>;
  }

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height="40" viewBox="0 0 100 100" className="trend-chart">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

export { AdvancedProfiler };