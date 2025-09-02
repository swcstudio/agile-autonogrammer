/**
 * Edge Computing Types
 * Comprehensive type definitions for <50ms global AI inference
 */

import type { InferenceRequest, InferenceResponse } from '@agile/ai-core';
import type { AcceleratedInferenceResult } from '@agile/ai-wasm';
import type { SecurityCheckResult } from '@agile/ai-security';

// Core Edge Infrastructure Types
export type EdgeRegion = 
  | 'us-east-1' | 'us-west-1' | 'us-west-2' 
  | 'eu-west-1' | 'eu-central-1' | 'eu-west-2'
  | 'ap-southeast-1' | 'ap-northeast-1' | 'ap-south-1'
  | 'sa-east-1' | 'af-south-1' | 'me-south-1'
  | 'ca-central-1' | 'ap-southeast-2' | 'eu-north-1';

export type EdgeProvider = 
  | 'cloudflare-workers'
  | 'vercel-edge'
  | 'aws-lambda-edge'
  | 'fastly-compute'
  | 'google-cloud-functions'
  | 'azure-edge-zones';

// Geographic and Network Types
export interface GeographicLocation {
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  city: string;
  timezone: string;
}

export interface NetworkMetrics {
  latency_ms: number;
  bandwidth_mbps: number;
  packet_loss: number;
  jitter_ms: number;
  connection_type: 'fiber' | '5g' | '4g' | 'wifi' | 'ethernet' | 'satellite';
}

export interface EdgeNode {
  id: string;
  region: EdgeRegion;
  provider: EdgeProvider;
  location: GeographicLocation;
  capabilities: EdgeCapabilities;
  status: 'active' | 'maintenance' | 'offline';
  load_percentage: number;
  available_memory_mb: number;
  available_cpu_percentage: number;
  network_metrics: NetworkMetrics;
}

export interface EdgeCapabilities {
  max_memory_mb: number;
  cpu_cores: number;
  gpu_available: boolean;
  wasm_support: boolean;
  simd_support: boolean;
  model_formats: ('onnx' | 'tensorflow' | 'pytorch' | 'wasm')[];
  max_model_size_mb: number;
  concurrent_requests: number;
}

// Edge Request and Response Types
export interface EdgeInferenceRequest extends InferenceRequest {
  edge?: {
    preferred_regions?: EdgeRegion[];
    max_latency_ms?: number;
    enable_caching?: boolean;
    cache_ttl_seconds?: number;
    enable_prefetch?: boolean;
    quality_preference?: 'speed' | 'accuracy' | 'balanced';
    failover_strategy?: 'nearest' | 'fastest' | 'least_loaded';
  };
  client_info?: {
    location?: GeographicLocation;
    network?: NetworkMetrics;
    user_agent?: string;
    session_id?: string;
  };
}

export interface EdgeInferenceResponse extends InferenceResponse {
  edge?: {
    served_from_region: EdgeRegion;
    served_from_node: string;
    total_latency_ms: number;
    network_latency_ms: number;
    processing_latency_ms: number;
    cache_hit: boolean;
    edge_hops: number;
    routing_decision: string;
  };
  performance?: {
    wasm_acceleration_used: boolean;
    security_check_time_ms: number;
    model_load_time_ms: number;
    inference_time_ms: number;
    response_size_bytes: number;
  };
}

// CDN and Caching Types
export interface CDNConfiguration {
  providers: CDNProvider[];
  default_provider: string;
  failover_enabled: boolean;
  geographic_routing: boolean;
  load_balancing_strategy: 'round_robin' | 'weighted' | 'latency_based' | 'geographic';
}

export interface CDNProvider {
  id: string;
  name: string;
  type: 'cloudflare' | 'aws_cloudfront' | 'google_cdn' | 'azure_cdn' | 'fastly';
  regions: EdgeRegion[];
  api_endpoint: string;
  api_key?: string;
  configuration: Record<string, any>;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  created_at: Date;
  expires_at: Date;
  ttl_seconds: number;
  size_bytes: number;
  hit_count: number;
  last_accessed: Date;
  metadata: {
    model_id?: string;
    request_hash?: string;
    region?: EdgeRegion;
    user_context?: string;
  };
}

export interface CacheStrategy {
  type: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  max_size_mb: number;
  max_entries: number;
  default_ttl_seconds: number;
  eviction_policy: 'strict' | 'graceful';
  compression_enabled: boolean;
  encryption_enabled: boolean;
}

// Model Distribution and Management
export interface EdgeModelMetadata {
  model_id: string;
  version: string;
  format: 'onnx' | 'tensorflow' | 'wasm' | 'quantized';
  size_mb: number;
  checksum: string;
  regions: EdgeRegion[];
  capabilities_required: EdgeCapabilities;
  optimization_profile: 'speed' | 'memory' | 'balanced';
  last_updated: Date;
}

export interface ModelDistributionPlan {
  model_id: string;
  total_regions: number;
  distribution_strategy: 'eager' | 'lazy' | 'predictive';
  priority_regions: EdgeRegion[];
  replica_count_per_region: number;
  update_frequency: 'realtime' | 'hourly' | 'daily';
}

// Latency Optimization Types
export interface LatencyTarget {
  percentile: 50 | 95 | 99;
  target_ms: number;
  current_ms: number;
  breach_threshold_ms: number;
  measurement_window_minutes: number;
}

export interface LatencyOptimization {
  enabled: boolean;
  targets: LatencyTarget[];
  strategies: LatencyOptimizationStrategy[];
  auto_scaling: boolean;
  predictive_prefetching: boolean;
  intelligent_routing: boolean;
}

export type LatencyOptimizationStrategy = 
  | 'model_sharding'
  | 'request_batching'
  | 'connection_pooling'
  | 'dns_optimization'
  | 'tcp_optimization'
  | 'compression'
  | 'prefetching'
  | 'edge_caching'
  | 'load_balancing';

// Regional Load Balancing Types
export interface LoadBalancingConfig {
  algorithm: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'latency_based' | 'geographic';
  health_check_interval_ms: number;
  failover_threshold: number;
  sticky_sessions: boolean;
  session_affinity_duration_ms: number;
  circuit_breaker_enabled: boolean;
}

export interface LoadBalancingMetrics {
  total_requests: number;
  requests_per_second: number;
  average_response_time_ms: number;
  error_rate_percentage: number;
  healthy_nodes: number;
  total_nodes: number;
  current_load_distribution: Record<string, number>;
}

// Predictive Prefetching Types
export interface PrefetchingConfig {
  enabled: boolean;
  prediction_models: PredictionModel[];
  prefetch_horizon_minutes: number;
  confidence_threshold: number;
  max_prefetch_requests_per_minute: number;
  storage_limit_mb: number;
}

export interface PredictionModel {
  id: string;
  type: 'time_series' | 'collaborative_filtering' | 'content_based' | 'hybrid';
  accuracy_percentage: number;
  training_data_window_days: number;
  retrain_frequency_hours: number;
  features: string[];
}

export interface PrefetchPrediction {
  request_pattern: Partial<EdgeInferenceRequest>;
  confidence: number;
  predicted_time: Date;
  expiry_time: Date;
  priority: 'high' | 'medium' | 'low';
  cost_estimate: number;
}

// Monitoring and Analytics Types
export interface EdgeMetrics {
  timestamp: Date;
  region: EdgeRegion;
  node_id: string;
  
  // Performance Metrics
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  throughput_rps: number;
  error_rate_percentage: number;
  
  // Resource Metrics
  cpu_usage_percentage: number;
  memory_usage_percentage: number;
  disk_usage_percentage: number;
  network_bandwidth_mbps: number;
  
  // Cache Metrics
  cache_hit_rate: number;
  cache_miss_rate: number;
  cache_eviction_rate: number;
  prefetch_accuracy: number;
  
  // Model Metrics
  model_load_time_ms: number;
  model_inference_time_ms: number;
  models_cached: number;
  model_cache_hit_rate: number;
}

export interface AlertingRule {
  id: string;
  name: string;
  condition: string; // e.g., "avg_latency_ms > 50"
  severity: 'info' | 'warning' | 'error' | 'critical';
  threshold: number;
  duration_minutes: number;
  notification_channels: string[];
  auto_resolution: boolean;
}

// Hook Configuration Types
export interface UseEdgeInferenceOptions {
  // Core Configuration
  preferred_regions?: EdgeRegion[];
  max_latency_ms?: number;
  quality_preference?: 'speed' | 'accuracy' | 'balanced';
  
  // Caching Configuration
  enable_caching?: boolean;
  cache_ttl_seconds?: number;
  cache_strategy?: CacheStrategy['type'];
  
  // Optimization Configuration
  enable_prefetching?: boolean;
  enable_optimization?: boolean;
  optimization_strategies?: LatencyOptimizationStrategy[];
  
  // Failover Configuration
  failover_strategy?: 'nearest' | 'fastest' | 'least_loaded';
  max_retries?: number;
  retry_delay_ms?: number;
  
  // Monitoring Configuration
  enable_monitoring?: boolean;
  metrics_collection_interval_ms?: number;
  enable_alerting?: boolean;
}

export interface UseEdgeInferenceReturn {
  // Core Functions
  edgeInfer: (request: EdgeInferenceRequest) => Promise<EdgeInferenceResponse>;
  getOptimalRegion: (location?: GeographicLocation) => Promise<EdgeRegion>;
  
  // Cache Management
  clearCache: (pattern?: string) => Promise<void>;
  getCacheStats: () => Promise<{
    hit_rate: number;
    total_entries: number;
    size_mb: number;
  }>;
  
  // Performance Monitoring
  getLatencyMetrics: () => Promise<{
    current_p95: number;
    current_p99: number;
    target_p95: number;
    sla_compliance: number;
  }>;
  
  // Regional Management
  switchRegion: (region: EdgeRegion) => Promise<void>;
  getRegionalMetrics: () => Promise<Record<EdgeRegion, EdgeMetrics>>;
  
  // State
  isInitialized: boolean;
  currentRegion: EdgeRegion | null;
  availableRegions: EdgeRegion[];
  latencyTarget: number;
  
  // Configuration
  updateConfig: (config: Partial<UseEdgeInferenceOptions>) => void;
  getConfig: () => UseEdgeInferenceOptions;
  
  // Status
  loading: boolean;
  error: Error | null;
  lastInference?: Date;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

// Global Distribution Types
export interface GlobalDistributionConfig {
  auto_scaling: boolean;
  min_replicas_per_region: number;
  max_replicas_per_region: number;
  scale_up_threshold_percentage: number;
  scale_down_threshold_percentage: number;
  scaling_cooldown_minutes: number;
  cost_optimization: boolean;
  sustainability_mode: boolean;
}

export interface RegionalCapacityPlanning {
  region: EdgeRegion;
  predicted_traffic_rps: number;
  required_capacity: {
    cpu_cores: number;
    memory_mb: number;
    storage_mb: number;
    bandwidth_mbps: number;
  };
  cost_estimate_usd_per_hour: number;
  carbon_footprint_kg_co2_per_hour: number;
}

// Error and Exception Types
export interface EdgeError extends Error {
  code: 'REGION_UNAVAILABLE' | 'LATENCY_EXCEEDED' | 'CAPACITY_EXCEEDED' | 'MODEL_NOT_FOUND' | 'CACHE_MISS' | 'NETWORK_ERROR';
  region?: EdgeRegion;
  latency_ms?: number;
  retry_after_ms?: number;
  suggested_regions?: EdgeRegion[];
}

// Integration Types
export interface EdgeSecurityConfig {
  enable_ddos_protection: boolean;
  enable_waf: boolean;
  rate_limiting: {
    requests_per_minute: number;
    burst_allowance: number;
  };
  ip_whitelist?: string[];
  geo_blocking?: string[]; // Country codes to block
}

export interface EdgeAnalyticsConfig {
  enable_user_analytics: boolean;
  enable_performance_analytics: boolean;
  enable_business_analytics: boolean;
  data_retention_days: number;
  anonymization_enabled: boolean;
  real_time_dashboards: boolean;
}

// Type Guards and Utilities
export const isEdgeInferenceRequest = (obj: any): obj is EdgeInferenceRequest => {
  return obj && typeof obj === 'object' && 'model' in obj;
};

export const isEdgeError = (error: any): error is EdgeError => {
  return error && error.code && typeof error.code === 'string';
};

export const getRegionFromLocation = (location: GeographicLocation): EdgeRegion => {
  // Simplified region mapping - would use more sophisticated geo-routing in production
  if (location.latitude > 0) {
    if (location.longitude < -60) return 'us-east-1';
    if (location.longitude < -120) return 'us-west-1';
    if (location.longitude < 40) return 'eu-west-1';
    return 'ap-southeast-1';
  } else {
    if (location.longitude < -30) return 'sa-east-1';
    if (location.longitude > 100) return 'ap-southeast-2';
    return 'af-south-1';
  }
};