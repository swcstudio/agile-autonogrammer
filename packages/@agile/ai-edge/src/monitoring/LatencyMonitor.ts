/**
 * LatencyMonitor
 * Real-time latency monitoring and optimization for <50ms edge inference
 */

import type {
  EdgeRegion,
  EdgeMetrics,
  LatencyOptimization,
  LatencyTarget,
  AlertingRule,
} from '../types/edge';

interface LatencyMeasurement {
  timestamp: Date;
  latency_ms: number;
  region: EdgeRegion;
  request_type: 'inference' | 'cache_hit' | 'cache_miss' | 'prefetch';
  model_id?: string;
  success: boolean;
}

interface LatencyStatistics {
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  total_requests: number;
  successful_requests: number;
  error_rate: number;
}

interface RegionalLatencyData {
  region: EdgeRegion;
  measurements: LatencyMeasurement[];
  statistics: LatencyStatistics;
  health_score: number; // 0-1 scale
  last_updated: Date;
}

export class LatencyMonitor {
  public readonly config: LatencyOptimization;
  private measurements: Map<EdgeRegion, LatencyMeasurement[]> = new Map();
  private regionalData: Map<EdgeRegion, RegionalLatencyData> = new Map();
  private alertingRules: AlertingRule[] = [];
  private alertCallbacks: Map<string, (rule: AlertingRule, value: number) => void> = new Map();
  
  // Performance optimization: circular buffer for measurements
  private readonly MAX_MEASUREMENTS_PER_REGION = 10000;
  private readonly STATISTICS_UPDATE_INTERVAL = 5000; // 5 seconds
  private statisticsTimer?: NodeJS.Timeout;

  constructor(config: LatencyOptimization) {
    this.config = config;
    this.initializeRegionalData();
    this.setupDefaultAlertingRules();
    
    if (this.config.enabled) {
      this.startStatisticsUpdates();
    }
  }

  private initializeRegionalData(): void {
    const regions: EdgeRegion[] = [
      'us-east-1', 'us-west-1', 'us-west-2',
      'eu-west-1', 'eu-central-1', 'eu-west-2',
      'ap-southeast-1', 'ap-northeast-1', 'ap-south-1',
      'sa-east-1', 'af-south-1', 'me-south-1',
      'ca-central-1', 'ap-southeast-2', 'eu-north-1',
    ];

    regions.forEach(region => {
      this.measurements.set(region, []);
      this.regionalData.set(region, {
        region,
        measurements: [],
        statistics: this.getDefaultStatistics(),
        health_score: 1.0,
        last_updated: new Date(),
      });
    });
  }

  private getDefaultStatistics(): LatencyStatistics {
    return {
      avg_latency_ms: 0,
      p50_latency_ms: 0,
      p95_latency_ms: 0,
      p99_latency_ms: 0,
      min_latency_ms: 0,
      max_latency_ms: 0,
      total_requests: 0,
      successful_requests: 0,
      error_rate: 0,
    };
  }

  private setupDefaultAlertingRules(): void {
    this.alertingRules = [
      {
        id: 'p95-latency-breach',
        name: 'P95 Latency Breach',
        condition: 'p95_latency_ms > target',
        severity: 'warning',
        threshold: this.config.targets.find(t => t.percentile === 95)?.target_ms || 50,
        duration_minutes: 1,
        notification_channels: ['console'],
        auto_resolution: true,
      },
      {
        id: 'p99-latency-breach',
        name: 'P99 Latency Breach',
        condition: 'p99_latency_ms > target',
        severity: 'error',
        threshold: this.config.targets.find(t => t.percentile === 99)?.target_ms || 75,
        duration_minutes: 1,
        notification_channels: ['console'],
        auto_resolution: true,
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        condition: 'error_rate > 0.05',
        severity: 'critical',
        threshold: 0.05,
        duration_minutes: 2,
        notification_channels: ['console'],
        auto_resolution: false,
      },
    ];
  }

  private startStatisticsUpdates(): void {
    this.statisticsTimer = setInterval(() => {
      this.updateAllRegionalStatistics();
      this.checkAlertingRules();
    }, this.STATISTICS_UPDATE_INTERVAL);
  }

  private updateAllRegionalStatistics(): void {
    for (const [region, data] of this.regionalData.entries()) {
      const measurements = this.measurements.get(region) || [];
      
      // Only update if we have new measurements
      if (measurements.length > 0) {
        const statistics = this.calculateStatistics(measurements);
        const healthScore = this.calculateHealthScore(statistics, region);
        
        this.regionalData.set(region, {
          ...data,
          statistics,
          health_score: healthScore,
          last_updated: new Date(),
        });
      }
    }
  }

  private calculateStatistics(measurements: LatencyMeasurement[]): LatencyStatistics {
    if (measurements.length === 0) {
      return this.getDefaultStatistics();
    }

    const successfulMeasurements = measurements.filter(m => m.success);
    const latencies = successfulMeasurements.map(m => m.latency_ms).sort((a, b) => a - b);
    
    if (latencies.length === 0) {
      return {
        ...this.getDefaultStatistics(),
        total_requests: measurements.length,
        successful_requests: 0,
        error_rate: 1.0,
      };
    }

    const sum = latencies.reduce((acc, latency) => acc + latency, 0);
    const avg = sum / latencies.length;
    
    return {
      avg_latency_ms: Math.round(avg * 100) / 100,
      p50_latency_ms: this.calculatePercentile(latencies, 50),
      p95_latency_ms: this.calculatePercentile(latencies, 95),
      p99_latency_ms: this.calculatePercentile(latencies, 99),
      min_latency_ms: latencies[0],
      max_latency_ms: latencies[latencies.length - 1],
      total_requests: measurements.length,
      successful_requests: successfulMeasurements.length,
      error_rate: Math.round((1 - successfulMeasurements.length / measurements.length) * 10000) / 10000,
    };
  }

  private calculatePercentile(sortedLatencies: number[], percentile: number): number {
    if (sortedLatencies.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedLatencies.length) - 1;
    return sortedLatencies[Math.max(0, Math.min(index, sortedLatencies.length - 1))];
  }

  private calculateHealthScore(statistics: LatencyStatistics, region: EdgeRegion): number {
    let score = 1.0;

    // Penalize for high error rates
    score -= statistics.error_rate * 0.5;

    // Penalize for latency target breaches
    const p95Target = this.config.targets.find(t => t.percentile === 95);
    if (p95Target && statistics.p95_latency_ms > p95Target.target_ms) {
      const breach = (statistics.p95_latency_ms - p95Target.target_ms) / p95Target.target_ms;
      score -= Math.min(breach * 0.3, 0.3);
    }

    const p99Target = this.config.targets.find(t => t.percentile === 99);
    if (p99Target && statistics.p99_latency_ms > p99Target.target_ms) {
      const breach = (statistics.p99_latency_ms - p99Target.target_ms) / p99Target.target_ms;
      score -= Math.min(breach * 0.2, 0.2);
    }

    return Math.max(0, Math.min(1, score));
  }

  private checkAlertingRules(): void {
    for (const rule of this.alertingRules) {
      for (const [region, data] of this.regionalData.entries()) {
        const shouldAlert = this.evaluateAlertingRule(rule, data.statistics);
        
        if (shouldAlert) {
          this.triggerAlert(rule, region, this.getMetricValue(rule, data.statistics));
        }
      }
    }
  }

  private evaluateAlertingRule(rule: AlertingRule, statistics: LatencyStatistics): boolean {
    switch (rule.condition) {
      case 'p95_latency_ms > target':
        return statistics.p95_latency_ms > rule.threshold;
      case 'p99_latency_ms > target':
        return statistics.p99_latency_ms > rule.threshold;
      case 'error_rate > 0.05':
        return statistics.error_rate > rule.threshold;
      case 'avg_latency_ms > target':
        return statistics.avg_latency_ms > rule.threshold;
      default:
        return false;
    }
  }

  private getMetricValue(rule: AlertingRule, statistics: LatencyStatistics): number {
    switch (rule.condition) {
      case 'p95_latency_ms > target':
        return statistics.p95_latency_ms;
      case 'p99_latency_ms > target':
        return statistics.p99_latency_ms;
      case 'error_rate > 0.05':
        return statistics.error_rate;
      case 'avg_latency_ms > target':
        return statistics.avg_latency_ms;
      default:
        return 0;
    }
  }

  private triggerAlert(rule: AlertingRule, region: EdgeRegion, value: number): void {
    const alertMessage = `[${rule.severity.toUpperCase()}] ${rule.name} in ${region}: ${value} (threshold: ${rule.threshold})`;
    
    // Console logging
    if (rule.notification_channels.includes('console')) {
      console.warn(alertMessage);
    }
    
    // Custom callback alerts
    const callback = this.alertCallbacks.get(rule.id);
    if (callback) {
      callback(rule, value);
    }
  }

  // Public API Methods

  async recordLatency(latencyMs: number, region: EdgeRegion, options: {
    requestType?: 'inference' | 'cache_hit' | 'cache_miss' | 'prefetch';
    modelId?: string;
    success?: boolean;
  } = {}): Promise<void> {
    const measurement: LatencyMeasurement = {
      timestamp: new Date(),
      latency_ms: latencyMs,
      region,
      request_type: options.requestType || 'inference',
      model_id: options.modelId,
      success: options.success ?? true,
    };

    // Add to measurements with circular buffer behavior
    let regionMeasurements = this.measurements.get(region) || [];
    regionMeasurements.push(measurement);
    
    if (regionMeasurements.length > this.MAX_MEASUREMENTS_PER_REGION) {
      regionMeasurements = regionMeasurements.slice(-this.MAX_MEASUREMENTS_PER_REGION);
    }
    
    this.measurements.set(region, regionMeasurements);

    // Trigger immediate statistics update for critical latency breaches
    if (latencyMs > (this.config.targets.find(t => t.percentile === 99)?.breach_threshold_ms || 100)) {
      this.updateRegionalStatistics(region);
    }
  }

  async getMetrics(): Promise<LatencyStatistics> {
    // Aggregate metrics across all regions
    const allMeasurements: LatencyMeasurement[] = [];
    
    for (const measurements of this.measurements.values()) {
      allMeasurements.push(...measurements);
    }

    return this.calculateStatistics(allMeasurements);
  }

  async getRegionalMetrics(): Promise<Record<EdgeRegion, EdgeMetrics>> {
    const result: Record<EdgeRegion, EdgeMetrics> = {};

    for (const [region, data] of this.regionalData.entries()) {
      result[region] = {
        timestamp: data.last_updated,
        region,
        node_id: `edge-${region}`,
        
        // Performance Metrics
        avg_latency_ms: data.statistics.avg_latency_ms,
        p95_latency_ms: data.statistics.p95_latency_ms,
        p99_latency_ms: data.statistics.p99_latency_ms,
        throughput_rps: this.calculateThroughput(region),
        error_rate_percentage: data.statistics.error_rate * 100,
        
        // Resource Metrics (would be populated by actual resource monitoring)
        cpu_usage_percentage: 50, // Placeholder
        memory_usage_percentage: 30, // Placeholder
        disk_usage_percentage: 20, // Placeholder
        network_bandwidth_mbps: 1000, // Placeholder
        
        // Cache Metrics (would be populated by cache manager integration)
        cache_hit_rate: 0.85, // Placeholder
        cache_miss_rate: 0.15, // Placeholder
        cache_eviction_rate: 0.02, // Placeholder
        prefetch_accuracy: 0.78, // Placeholder
        
        // Model Metrics (would be populated by model manager integration)
        model_load_time_ms: 150, // Placeholder
        model_inference_time_ms: data.statistics.avg_latency_ms,
        models_cached: 10, // Placeholder
        model_cache_hit_rate: 0.90, // Placeholder
      };
    }

    return result;
  }

  private calculateThroughput(region: EdgeRegion): number {
    const measurements = this.measurements.get(region) || [];
    const recentMeasurements = measurements.filter(m => 
      Date.now() - m.timestamp.getTime() < 60000 // Last minute
    );
    
    return recentMeasurements.length / 60; // RPS approximation
  }

  private updateRegionalStatistics(region: EdgeRegion): void {
    const measurements = this.measurements.get(region) || [];
    const statistics = this.calculateStatistics(measurements);
    const healthScore = this.calculateHealthScore(statistics, region);
    
    const existingData = this.regionalData.get(region);
    if (existingData) {
      this.regionalData.set(region, {
        ...existingData,
        statistics,
        health_score: healthScore,
        last_updated: new Date(),
      });
    }
  }

  async optimizeLatency(region: EdgeRegion): Promise<{
    applied_strategies: string[];
    estimated_improvement_ms: number;
  }> {
    const appliedStrategies: string[] = [];
    let estimatedImprovement = 0;

    const regionalData = this.regionalData.get(region);
    if (!regionalData) {
      throw new Error(`No data available for region: ${region}`);
    }

    // Apply enabled optimization strategies
    for (const strategy of this.config.strategies) {
      switch (strategy) {
        case 'edge_caching':
          if (regionalData.statistics.avg_latency_ms > 30) {
            appliedStrategies.push('edge_caching');
            estimatedImprovement += 15; // Estimated 15ms improvement
          }
          break;
        
        case 'compression':
          appliedStrategies.push('compression');
          estimatedImprovement += 5; // Estimated 5ms improvement
          break;
        
        case 'connection_pooling':
          if (regionalData.statistics.p95_latency_ms > 40) {
            appliedStrategies.push('connection_pooling');
            estimatedImprovement += 8; // Estimated 8ms improvement
          }
          break;
        
        case 'load_balancing':
          if (regionalData.health_score < 0.8) {
            appliedStrategies.push('load_balancing');
            estimatedImprovement += 10; // Estimated 10ms improvement
          }
          break;
        
        case 'prefetching':
          appliedStrategies.push('prefetching');
          estimatedImprovement += 12; // Estimated 12ms improvement from cache hits
          break;
      }
    }

    return {
      applied_strategies: appliedStrategies,
      estimated_improvement_ms: estimatedImprovement,
    };
  }

  addAlertCallback(ruleId: string, callback: (rule: AlertingRule, value: number) => void): void {
    this.alertCallbacks.set(ruleId, callback);
  }

  removeAlertCallback(ruleId: string): void {
    this.alertCallbacks.delete(ruleId);
  }

  addAlertingRule(rule: AlertingRule): void {
    this.alertingRules.push(rule);
  }

  removeAlertingRule(ruleId: string): void {
    this.alertingRules = this.alertingRules.filter(rule => rule.id !== ruleId);
  }

  getHealthScore(region: EdgeRegion): number {
    return this.regionalData.get(region)?.health_score || 0;
  }

  async resetMetrics(region?: EdgeRegion): Promise<void> {
    if (region) {
      this.measurements.set(region, []);
      const existingData = this.regionalData.get(region);
      if (existingData) {
        this.regionalData.set(region, {
          ...existingData,
          statistics: this.getDefaultStatistics(),
          health_score: 1.0,
          last_updated: new Date(),
        });
      }
    } else {
      // Reset all regions
      for (const region of this.measurements.keys()) {
        await this.resetMetrics(region);
      }
    }
  }

  destroy(): void {
    if (this.statisticsTimer) {
      clearInterval(this.statisticsTimer);
      this.statisticsTimer = undefined;
    }
    
    this.measurements.clear();
    this.regionalData.clear();
    this.alertCallbacks.clear();
  }
}