/**
 * useEdgeInference React Hook
 * Provides React integration for <50ms global AI inference with edge optimization
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EdgeInferenceRequest,
  EdgeInferenceResponse,
  EdgeRegion,
  GeographicLocation,
  UseEdgeInferenceOptions,
  UseEdgeInferenceReturn,
  EdgeError,
  EdgeMetrics,
  LatencyTarget,
} from '../types/edge';
import { EdgeInferenceEngine } from '../edge/EdgeInferenceEngine';
import { CDNManager } from '../edge/CDNManager';
import { ModelCacheManager } from '../caching/ModelCacheManager';
import { LatencyMonitor } from '../monitoring/LatencyMonitor';
import { isEdgeError, getRegionFromLocation } from '../types/edge';

const DEFAULT_OPTIONS: UseEdgeInferenceOptions = {
  max_latency_ms: 50,
  quality_preference: 'balanced',
  enable_caching: true,
  cache_ttl_seconds: 300,
  cache_strategy: 'adaptive',
  enable_prefetching: true,
  enable_optimization: true,
  optimization_strategies: ['edge_caching', 'compression', 'load_balancing'],
  failover_strategy: 'nearest',
  max_retries: 3,
  retry_delay_ms: 100,
  enable_monitoring: true,
  metrics_collection_interval_ms: 5000,
  enable_alerting: false,
};

interface EdgeInferenceState {
  isInitialized: boolean;
  currentRegion: EdgeRegion | null;
  availableRegions: EdgeRegion[];
  latencyTarget: number;
  loading: boolean;
  error: Error | null;
  lastInference?: Date;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export function useEdgeInference(options: UseEdgeInferenceOptions = {}): UseEdgeInferenceReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // State Management
  const [state, setState] = useState<EdgeInferenceState>({
    isInitialized: false,
    currentRegion: null,
    availableRegions: [],
    latencyTarget: config.max_latency_ms || 50,
    loading: false,
    error: null,
    connectionStatus: 'disconnected',
  });

  // Service References
  const edgeEngineRef = useRef<EdgeInferenceEngine | null>(null);
  const cdnManagerRef = useRef<CDNManager | null>(null);
  const cacheManagerRef = useRef<ModelCacheManager | null>(null);
  const latencyMonitorRef = useRef<LatencyMonitor | null>(null);
  
  // Configuration State
  const [currentConfig, setCurrentConfig] = useState(config);
  
  // Metrics Collection
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [latencyMetrics, setLatencyMetrics] = useState<{
    current_p95: number;
    current_p99: number;
    target_p95: number;
    sla_compliance: number;
  }>({
    current_p95: 0,
    current_p99: 0,
    target_p95: config.max_latency_ms || 50,
    sla_compliance: 1.0,
  });

  // Initialize Edge Services
  const initializeServices = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, connectionStatus: 'connecting' }));

      // Initialize CDN Manager
      if (!cdnManagerRef.current) {
        cdnManagerRef.current = new CDNManager({
          providers: [
            {
              id: 'cloudflare-primary',
              name: 'Cloudflare Workers',
              type: 'cloudflare',
              regions: [
                'us-east-1', 'us-west-1', 'us-west-2',
                'eu-west-1', 'eu-central-1', 'ap-southeast-1',
              ],
              api_endpoint: 'https://api.cloudflare.com/client/v4',
              configuration: {
                zone_id: process.env.CLOUDFLARE_ZONE_ID,
                account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
              },
            },
            {
              id: 'aws-cloudfront',
              name: 'AWS CloudFront',
              type: 'aws_cloudfront',
              regions: [
                'us-east-1', 'us-west-1', 'us-west-2',
                'eu-west-1', 'eu-central-1', 'ap-southeast-1',
                'ap-northeast-1', 'ap-south-1',
              ],
              api_endpoint: 'https://cloudfront.amazonaws.com',
              configuration: {
                distribution_id: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
                region: 'us-east-1',
              },
            },
          ],
          default_provider: 'cloudflare-primary',
          failover_enabled: true,
          geographic_routing: true,
          load_balancing_strategy: 'latency_based',
        });
      }

      // Initialize Cache Manager
      if (!cacheManagerRef.current) {
        cacheManagerRef.current = new ModelCacheManager({
          type: currentConfig.cache_strategy || 'adaptive',
          max_size_mb: 512,
          max_entries: 1000,
          default_ttl_seconds: currentConfig.cache_ttl_seconds || 300,
          eviction_policy: 'graceful',
          compression_enabled: currentConfig.optimization_strategies?.includes('compression') || false,
          encryption_enabled: true,
        }, {
          enabled: currentConfig.enable_prefetching || false,
          prediction_models: [
            {
              id: 'time-series-predictor',
              type: 'time_series',
              accuracy_percentage: 85,
              training_data_window_days: 7,
              retrain_frequency_hours: 24,
              features: ['time_of_day', 'day_of_week', 'user_pattern', 'model_type'],
            },
          ],
          prefetch_horizon_minutes: 15,
          confidence_threshold: 0.7,
          max_prefetch_requests_per_minute: 50,
          storage_limit_mb: 128,
        });
      }

      // Initialize Latency Monitor
      if (!latencyMonitorRef.current && currentConfig.enable_monitoring) {
        latencyMonitorRef.current = new LatencyMonitor({
          enabled: true,
          targets: [
            {
              percentile: 95,
              target_ms: currentConfig.max_latency_ms || 50,
              current_ms: 0,
              breach_threshold_ms: (currentConfig.max_latency_ms || 50) * 1.2,
              measurement_window_minutes: 5,
            },
            {
              percentile: 99,
              target_ms: (currentConfig.max_latency_ms || 50) * 1.5,
              current_ms: 0,
              breach_threshold_ms: (currentConfig.max_latency_ms || 50) * 2,
              measurement_window_minutes: 5,
            },
          ],
          strategies: currentConfig.optimization_strategies || [],
          auto_scaling: true,
          predictive_prefetching: currentConfig.enable_prefetching || false,
          intelligent_routing: true,
        });
      }

      // Initialize Edge Inference Engine
      if (!edgeEngineRef.current) {
        edgeEngineRef.current = new EdgeInferenceEngine(
          cdnManagerRef.current,
          cacheManagerRef.current,
          latencyMonitorRef.current
        );
        await edgeEngineRef.current.initialize();
      }

      // Get available regions and detect optimal region
      const regions = await cdnManagerRef.current.getAvailableRegions();
      let optimalRegion: EdgeRegion | null = null;
      
      // Try to detect user location for optimal region selection
      try {
        if ('geolocation' in navigator) {
          await new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const location: GeographicLocation = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  country: 'Unknown',
                  region: 'Unknown',
                  city: 'Unknown',
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                };
                optimalRegion = getRegionFromLocation(location);
                resolve();
              },
              () => {
                // Fallback to default region if geolocation fails
                optimalRegion = currentConfig.preferred_regions?.[0] || 'us-east-1';
                resolve();
              },
              { timeout: 3000 }
            );
          });
        } else {
          optimalRegion = currentConfig.preferred_regions?.[0] || 'us-east-1';
        }
      } catch (error) {
        console.warn('Failed to detect optimal region:', error);
        optimalRegion = currentConfig.preferred_regions?.[0] || 'us-east-1';
      }

      setState(prev => ({
        ...prev,
        isInitialized: true,
        loading: false,
        currentRegion: optimalRegion,
        availableRegions: regions,
        connectionStatus: 'connected',
        error: null,
      }));

      // Start metrics collection
      if (currentConfig.enable_monitoring && !metricsIntervalRef.current) {
        metricsIntervalRef.current = setInterval(async () => {
          try {
            const metrics = await getLatencyMetrics();
            setLatencyMetrics(metrics);
          } catch (error) {
            console.warn('Failed to collect latency metrics:', error);
          }
        }, currentConfig.metrics_collection_interval_ms || 5000);
      }

    } catch (error) {
      console.error('Failed to initialize edge services:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
        connectionStatus: 'error',
      }));
    }
  }, [currentConfig]);

  // Edge Inference Function
  const edgeInfer = useCallback(async (request: EdgeInferenceRequest): Promise<EdgeInferenceResponse> => {
    if (!edgeEngineRef.current || !state.isInitialized) {
      throw new Error('Edge inference engine not initialized. Call initialize first.');
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Apply configuration defaults to request
      const enhancedRequest: EdgeInferenceRequest = {
        ...request,
        edge: {
          preferred_regions: currentConfig.preferred_regions || [state.currentRegion || 'us-east-1'],
          max_latency_ms: currentConfig.max_latency_ms || 50,
          enable_caching: currentConfig.enable_caching ?? true,
          cache_ttl_seconds: currentConfig.cache_ttl_seconds || 300,
          enable_prefetch: currentConfig.enable_prefetching ?? true,
          quality_preference: currentConfig.quality_preference || 'balanced',
          failover_strategy: currentConfig.failover_strategy || 'nearest',
          ...request.edge,
        },
      };

      const startTime = Date.now();
      const response = await edgeEngineRef.current.infer(enhancedRequest);
      const endTime = Date.now();
      
      // Update latency monitoring
      if (latencyMonitorRef.current) {
        await latencyMonitorRef.current.recordLatency(endTime - startTime, response.edge?.served_from_region || 'unknown');
      }

      setState(prev => ({
        ...prev,
        loading: false,
        lastInference: new Date(endTime),
        currentRegion: response.edge?.served_from_region || prev.currentRegion,
      }));

      return response;

    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      
      // Handle edge-specific errors with retry logic
      if (isEdgeError(error) && currentConfig.max_retries && currentConfig.max_retries > 0) {
        const delay = currentConfig.retry_delay_ms || 100;
        
        // Exponential backoff retry
        for (let attempt = 1; attempt <= currentConfig.max_retries; attempt++) {
          try {
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
            
            // Try with suggested regions if available
            const retryRequest = error.suggested_regions ? {
              ...request,
              edge: {
                ...request.edge,
                preferred_regions: error.suggested_regions,
              },
            } : request;
            
            const response = await edgeEngineRef.current!.infer(retryRequest);
            setState(prev => ({ ...prev, error: null }));
            return response;
          } catch (retryError) {
            if (attempt === currentConfig.max_retries) {
              throw retryError;
            }
          }
        }
      }
      
      throw error;
    }
  }, [state.isInitialized, state.currentRegion, currentConfig]);

  // Get Optimal Region
  const getOptimalRegion = useCallback(async (location?: GeographicLocation): Promise<EdgeRegion> => {
    if (!edgeEngineRef.current) {
      throw new Error('Edge inference engine not initialized');
    }

    if (location) {
      return getRegionFromLocation(location);
    }

    // Use current region or fallback
    return state.currentRegion || currentConfig.preferred_regions?.[0] || 'us-east-1';
  }, [state.currentRegion, currentConfig.preferred_regions]);

  // Cache Management Functions
  const clearCache = useCallback(async (pattern?: string): Promise<void> => {
    if (!cacheManagerRef.current) {
      throw new Error('Cache manager not initialized');
    }

    if (pattern) {
      await cacheManagerRef.current.clearByPattern(pattern);
    } else {
      await cacheManagerRef.current.clear();
    }
  }, []);

  const getCacheStats = useCallback(async () => {
    if (!cacheManagerRef.current) {
      throw new Error('Cache manager not initialized');
    }

    return await cacheManagerRef.current.getStats();
  }, []);

  // Latency Monitoring Functions
  const getLatencyMetrics = useCallback(async () => {
    if (!latencyMonitorRef.current) {
      return {
        current_p95: 0,
        current_p99: 0,
        target_p95: currentConfig.max_latency_ms || 50,
        sla_compliance: 1.0,
      };
    }

    const metrics = await latencyMonitorRef.current.getMetrics();
    const p95Target = latencyMonitorRef.current.config.targets.find(t => t.percentile === 95);
    const slaCompliance = metrics.p95_latency_ms <= (p95Target?.target_ms || 50) ? 1.0 : 
                         Math.max(0, 1 - (metrics.p95_latency_ms - (p95Target?.target_ms || 50)) / (p95Target?.target_ms || 50));

    return {
      current_p95: metrics.p95_latency_ms,
      current_p99: metrics.p99_latency_ms,
      target_p95: p95Target?.target_ms || 50,
      sla_compliance: slaCompliance,
    };
  }, [currentConfig.max_latency_ms]);

  // Regional Management Functions
  const switchRegion = useCallback(async (region: EdgeRegion): Promise<void> => {
    if (!state.availableRegions.includes(region)) {
      throw new Error(`Region ${region} is not available. Available regions: ${state.availableRegions.join(', ')}`);
    }

    setState(prev => ({ ...prev, currentRegion: region }));
    
    // Update edge engine configuration
    if (edgeEngineRef.current) {
      await edgeEngineRef.current.updatePreferredRegions([region]);
    }
  }, [state.availableRegions]);

  const getRegionalMetrics = useCallback(async (): Promise<Record<EdgeRegion, EdgeMetrics>> => {
    if (!latencyMonitorRef.current) {
      return {} as Record<EdgeRegion, EdgeMetrics>;
    }

    return await latencyMonitorRef.current.getRegionalMetrics();
  }, []);

  // Configuration Management
  const updateConfig = useCallback((newConfig: Partial<UseEdgeInferenceOptions>) => {
    setCurrentConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const getConfig = useCallback(() => currentConfig, [currentConfig]);

  // Initialize services on mount
  useEffect(() => {
    initializeServices();

    // Cleanup on unmount
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
    };
  }, [initializeServices]);

  // Return hook interface
  return {
    // Core Functions
    edgeInfer,
    getOptimalRegion,
    
    // Cache Management
    clearCache,
    getCacheStats,
    
    // Performance Monitoring
    getLatencyMetrics,
    
    // Regional Management
    switchRegion,
    getRegionalMetrics,
    
    // State
    isInitialized: state.isInitialized,
    currentRegion: state.currentRegion,
    availableRegions: state.availableRegions,
    latencyTarget: state.latencyTarget,
    
    // Configuration
    updateConfig,
    getConfig,
    
    // Status
    loading: state.loading,
    error: state.error,
    lastInference: state.lastInference,
    connectionStatus: state.connectionStatus,
  };
}