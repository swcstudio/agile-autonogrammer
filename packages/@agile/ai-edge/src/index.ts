/**
 * @agile/ai-edge
 * Global AI inference with <50ms latency through edge deployment
 */

// Core Types
export * from './types/edge';

// Edge Infrastructure
export { EdgeInferenceEngine } from './edge/EdgeInferenceEngine';
export { CDNManager } from './edge/CDNManager';

// Caching System
export { ModelCacheManager } from './caching/ModelCacheManager';

// Monitoring & Optimization
export { LatencyMonitor } from './monitoring/LatencyMonitor';

// React Integration
export { useEdgeInference } from './hooks/useEdgeInference';

// Re-exports for convenience
export type {
  // Core Edge Types
  EdgeRegion,
  EdgeProvider,
  EdgeNode,
  EdgeCapabilities,
  
  // Request/Response Types
  EdgeInferenceRequest,
  EdgeInferenceResponse,
  
  // CDN Types
  CDNConfiguration,
  CDNProvider,
  
  // Caching Types
  CacheEntry,
  CacheStrategy,
  
  // Model Types
  EdgeModelMetadata,
  ModelDistributionPlan,
  
  // Monitoring Types
  LatencyTarget,
  LatencyOptimization,
  EdgeMetrics,
  AlertingRule,
  
  // Geographic Types
  GeographicLocation,
  NetworkMetrics,
  
  // Hook Types
  UseEdgeInferenceOptions,
  UseEdgeInferenceReturn,
  
  // Error Types
  EdgeError,
} from './types/edge';