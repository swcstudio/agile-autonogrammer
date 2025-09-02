/**
 * Edge Inference Engine
 * High-performance inference engine optimized for <50ms global latency
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type {
  EdgeInferenceRequest,
  EdgeInferenceResponse,
  EdgeNode,
  EdgeRegion,
  EdgeCapabilities,
  LatencyOptimization,
  EdgeError,
  NetworkMetrics,
  GeographicLocation,
} from '../types/edge';

export interface EdgeInferenceEngineConfig {
  // Performance Configuration
  target_latency_ms: number;
  max_latency_ms: number;
  enable_predictive_scaling: boolean;
  enable_request_batching: boolean;
  
  // Regional Configuration
  primary_regions: EdgeRegion[];
  fallback_regions: EdgeRegion[];
  max_regional_hops: number;
  
  // Optimization Configuration
  optimization_strategies: string[];
  enable_model_sharding: boolean;
  enable_connection_pooling: boolean;
  
  // Monitoring Configuration
  metrics_collection_enabled: boolean;
  real_time_monitoring: boolean;
  alerting_enabled: boolean;
}

export interface InferenceMetrics {
  request_id: string;
  timestamp: Date;
  
  // Latency Breakdown
  total_latency_ms: number;
  network_latency_ms: number;
  processing_latency_ms: number;
  model_load_latency_ms: number;
  security_check_latency_ms: number;
  
  // Routing Information
  served_from_region: EdgeRegion;
  served_from_node: string;
  routing_hops: number;
  routing_decision_time_ms: number;
  
  // Performance Information
  cache_hit: boolean;
  wasm_acceleration_used: boolean;
  batch_processed: boolean;
  model_version: string;
  
  // Resource Utilization
  cpu_usage_percentage: number;
  memory_usage_mb: number;
  network_bandwidth_mbps: number;
}

export class EdgeInferenceEngine extends EventEmitter {
  private config: EdgeInferenceEngineConfig;
  private edgeNodes: Map<string, EdgeNode>;
  private connectionPools: Map<EdgeRegion, any[]>;
  private modelShards: Map<string, Map<EdgeRegion, string>>;
  private performanceHistory: InferenceMetrics[];
  private activeOptimizations: LatencyOptimization;

  constructor(config: EdgeInferenceEngineConfig) {
    super();
    this.config = config;
    this.edgeNodes = new Map();
    this.connectionPools = new Map();
    this.modelShards = new Map();
    this.performanceHistory = [];
    
    this.activeOptimizations = {
      enabled: true,
      targets: [
        { percentile: 95, target_ms: config.target_latency_ms, current_ms: 0, breach_threshold_ms: config.max_latency_ms, measurement_window_minutes: 5 },
      ],
      strategies: config.optimization_strategies as any[],
      auto_scaling: config.enable_predictive_scaling,
      predictive_prefetching: true,
      intelligent_routing: true,
    };

    this.initialize();
  }

  /**
   * Initialize edge infrastructure and discover available nodes
   */
  private async initialize(): Promise<void> {
    this.emit('initialization-start');
    
    try {
      // Discover edge nodes across regions
      await this.discoverEdgeNodes();
      
      // Initialize connection pools
      await this.initializeConnectionPools();
      
      // Setup model sharding if enabled
      if (this.config.enable_model_sharding) {
        await this.initializeModelSharding();
      }
      
      // Start performance monitoring
      if (this.config.metrics_collection_enabled) {
        this.startPerformanceMonitoring();
      }
      
      this.emit('initialization-complete', {
        nodes_discovered: this.edgeNodes.size,
        regions_available: this.getAvailableRegions(),
      });
      
    } catch (error) {
      this.emit('initialization-error', error);
      throw error;
    }
  }

  /**
   * Perform optimized edge inference with <50ms target latency
   */
  async infer(request: EdgeInferenceRequest): Promise<EdgeInferenceResponse> {
    const requestId = uuidv4();
    const startTime = performance.now();
    
    this.emit('inference-start', { request_id: requestId, request });

    try {
      // Phase 1: Optimal Node Selection (Target: <5ms)
      const nodeSelectionStart = performance.now();
      const optimalNode = await this.selectOptimalNode(request);
      const nodeSelectionTime = performance.now() - nodeSelectionStart;

      if (nodeSelectionTime > 5) {
        console.warn(`Node selection took ${nodeSelectionTime}ms, exceeding 5ms target`);
      }

      // Phase 2: Request Preprocessing (Target: <2ms)
      const preprocessStart = performance.now();
      const preprocessedRequest = await this.preprocessRequest(request, optimalNode);
      const preprocessTime = performance.now() - preprocessStart;

      // Phase 3: Model Inference Execution (Target: <35ms)
      const inferenceStart = performance.now();
      const rawResult = await this.executeInference(preprocessedRequest, optimalNode);
      const inferenceTime = performance.now() - inferenceStart;

      // Phase 4: Response Postprocessing (Target: <5ms)
      const postprocessStart = performance.now();
      const finalResponse = await this.postprocessResponse(rawResult, optimalNode, request);
      const postprocessTime = performance.now() - postprocessStart;

      // Phase 5: Metrics Collection (Target: <3ms)
      const totalLatency = performance.now() - startTime;
      const metrics = this.createInferenceMetrics(
        requestId,
        totalLatency,
        nodeSelectionTime,
        preprocessTime,
        inferenceTime,
        postprocessTime,
        optimalNode,
        request
      );

      // Async metrics recording to avoid blocking response
      this.recordMetricsAsync(metrics);

      // Check latency SLA
      if (totalLatency > this.config.target_latency_ms) {
        this.emit('latency-breach', {
          request_id: requestId,
          actual_ms: totalLatency,
          target_ms: this.config.target_latency_ms,
          node: optimalNode.id,
        });
        
        // Trigger optimization if enabled
        if (this.activeOptimizations.enabled) {
          this.triggerLatencyOptimization(metrics);
        }
      }

      // Enhanced response with edge metadata
      const edgeResponse: EdgeInferenceResponse = {
        ...finalResponse,
        edge: {
          served_from_region: optimalNode.region,
          served_from_node: optimalNode.id,
          total_latency_ms: totalLatency,
          network_latency_ms: nodeSelectionTime,
          processing_latency_ms: inferenceTime,
          cache_hit: false, // Will be set by caching layer
          edge_hops: 1, // Direct connection for now
          routing_decision: `Selected ${optimalNode.region} based on ${this.getRoutingReason(optimalNode, request)}`,
        },
        performance: {
          wasm_acceleration_used: optimalNode.capabilities.wasm_support,
          security_check_time_ms: 0, // Will be populated by security integration
          model_load_time_ms: preprocessTime,
          inference_time_ms: inferenceTime,
          response_size_bytes: JSON.stringify(finalResponse).length,
        },
      };

      this.emit('inference-complete', {
        request_id: requestId,
        latency_ms: totalLatency,
        node: optimalNode.id,
      });

      return edgeResponse;

    } catch (error) {
      const totalLatency = performance.now() - startTime;
      
      this.emit('inference-error', {
        request_id: requestId,
        error,
        latency_ms: totalLatency,
      });

      // Handle specific edge errors
      if (this.isEdgeError(error)) {
        // Attempt failover to another region
        if (this.config.fallback_regions.length > 0) {
          console.warn(`Inference failed on primary region, attempting failover...`);
          return this.attemptFailover(request, error);
        }
      }

      throw this.createEdgeError(error as Error, requestId);
    }
  }

  /**
   * Select optimal edge node based on latency, load, and capabilities
   */
  private async selectOptimalNode(request: EdgeInferenceRequest): Promise<EdgeNode> {
    const selectionStart = performance.now();
    
    // Get user location for geographic routing
    const userLocation = request.client_info?.location;
    const preferredRegions = request.edge?.preferred_regions || this.config.primary_regions;
    
    // Filter nodes by availability and capabilities
    const availableNodes = Array.from(this.edgeNodes.values()).filter(node => 
      node.status === 'active' &&
      node.load_percentage < 90 &&
      this.nodeSupportsRequest(node, request)
    );

    if (availableNodes.length === 0) {
      throw this.createEdgeError(new Error('No available edge nodes'), 'node-selection');
    }

    // Scoring algorithm for optimal node selection
    const scoredNodes = availableNodes.map(node => {
      let score = 100; // Base score

      // Geographic proximity (30% weight)
      if (userLocation) {
        const distance = this.calculateGeographicDistance(userLocation, node.location);
        score -= distance * 0.3;
      }

      // Regional preference (25% weight)
      if (preferredRegions.includes(node.region)) {
        score += 25;
      }

      // Load balancing (20% weight)
      score -= (node.load_percentage * 0.2);

      // Network performance (15% weight)
      score += ((100 - node.network_metrics.latency_ms) * 0.15);

      // Capabilities match (10% weight)
      const capabilityScore = this.calculateCapabilityScore(node, request);
      score += (capabilityScore * 0.1);

      return { node, score };
    });

    // Sort by score and select best node
    scoredNodes.sort((a, b) => b.score - a.score);
    const optimalNode = scoredNodes[0].node;

    const selectionTime = performance.now() - selectionStart;
    
    this.emit('node-selected', {
      node_id: optimalNode.id,
      region: optimalNode.region,
      score: scoredNodes[0].score,
      selection_time_ms: selectionTime,
      alternatives: scoredNodes.slice(1, 3).map(s => ({ node: s.node.id, score: s.score })),
    });

    return optimalNode;
  }

  /**
   * Preprocess request for optimal inference execution
   */
  private async preprocessRequest(request: EdgeInferenceRequest, node: EdgeNode): Promise<EdgeInferenceRequest> {
    const preprocessed = { ...request };

    // Apply request batching if enabled and beneficial
    if (this.config.enable_request_batching && this.shouldBatchRequest(request)) {
      preprocessed.batch_size = this.calculateOptimalBatchSize(node);
    }

    // Apply model sharding information if available
    if (this.config.enable_model_sharding) {
      const shardInfo = this.modelShards.get(request.model)?.get(node.region);
      if (shardInfo) {
        preprocessed.model_shard = shardInfo;
      }
    }

    // Optimize request format for target node
    if (node.capabilities.wasm_support) {
      preprocessed.prefer_wasm = true;
    }

    return preprocessed;
  }

  /**
   * Execute the actual inference on the selected edge node
   */
  private async executeInference(request: EdgeInferenceRequest, node: EdgeNode): Promise<any> {
    const executionStart = performance.now();

    try {
      // This is a mock implementation - in production would make actual API calls
      // to the edge node's inference endpoint
      
      // Simulate processing time based on model complexity
      const baseLatency = 20; // Base 20ms
      const modelComplexityFactor = this.estimateModelComplexity(request.model);
      const nodePerformanceFactor = node.capabilities.cpu_cores / 4; // Normalize to 4-core baseline
      
      const simulatedLatency = Math.max(
        5, // Minimum 5ms
        baseLatency * modelComplexityFactor / nodePerformanceFactor
      );

      // Simulate the inference delay
      await new Promise(resolve => setTimeout(resolve, simulatedLatency));

      // Mock response structure
      const mockResponse = {
        content: `Inference response for ${request.model} from ${node.region}`,
        model: request.model,
        usage: {
          prompt_tokens: 100,
          completion_tokens: 150,
          total_tokens: 250,
        },
        finish_reason: 'stop' as const,
      };

      const executionTime = performance.now() - executionStart;
      
      this.emit('inference-executed', {
        node_id: node.id,
        execution_time_ms: executionTime,
        model: request.model,
      });

      return mockResponse;

    } catch (error) {
      this.emit('inference-execution-error', {
        node_id: node.id,
        error,
        model: request.model,
      });
      throw error;
    }
  }

  /**
   * Postprocess response for optimal delivery
   */
  private async postprocessResponse(rawResult: any, node: EdgeNode, originalRequest: EdgeInferenceRequest): Promise<any> {
    // Apply response compression if beneficial
    if (this.shouldCompressResponse(rawResult)) {
      rawResult = await this.compressResponse(rawResult);
    }

    // Add streaming capability if requested
    if (originalRequest.stream) {
      rawResult = this.enableStreamingResponse(rawResult);
    }

    return rawResult;
  }

  /**
   * Create detailed inference metrics for monitoring
   */
  private createInferenceMetrics(
    requestId: string,
    totalLatency: number,
    nodeSelectionTime: number,
    preprocessTime: number,
    inferenceTime: number,
    postprocessTime: number,
    node: EdgeNode,
    request: EdgeInferenceRequest
  ): InferenceMetrics {
    return {
      request_id: requestId,
      timestamp: new Date(),
      total_latency_ms: totalLatency,
      network_latency_ms: nodeSelectionTime,
      processing_latency_ms: inferenceTime,
      model_load_latency_ms: preprocessTime,
      security_check_latency_ms: 0, // Will be populated by security layer
      served_from_region: node.region,
      served_from_node: node.id,
      routing_hops: 1,
      routing_decision_time_ms: nodeSelectionTime,
      cache_hit: false, // Will be populated by cache layer
      wasm_acceleration_used: node.capabilities.wasm_support,
      batch_processed: !!request.batch_size,
      model_version: '1.0',
      cpu_usage_percentage: node.load_percentage,
      memory_usage_mb: 512 - node.available_memory_mb,
      network_bandwidth_mbps: node.network_metrics.bandwidth_mbps,
    };
  }

  /**
   * Record metrics asynchronously to avoid blocking inference
   */
  private async recordMetricsAsync(metrics: InferenceMetrics): Promise<void> {
    try {
      this.performanceHistory.push(metrics);
      
      // Keep only last 1000 metrics
      if (this.performanceHistory.length > 1000) {
        this.performanceHistory.shift();
      }
      
      this.emit('metrics-recorded', metrics);
      
    } catch (error) {
      console.error('Failed to record metrics:', error);
    }
  }

  /**
   * Trigger latency optimization based on performance metrics
   */
  private async triggerLatencyOptimization(metrics: InferenceMetrics): Promise<void> {
    if (!this.activeOptimizations.enabled) return;

    // Analyze recent performance trends
    const recentMetrics = this.performanceHistory.slice(-10);
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.total_latency_ms, 0) / recentMetrics.length;
    
    if (avgLatency > this.config.target_latency_ms) {
      this.emit('optimization-triggered', {
        reason: 'latency_breach',
        avg_latency: avgLatency,
        target: this.config.target_latency_ms,
        strategies: this.activeOptimizations.strategies,
      });

      // Apply optimization strategies
      await this.applyOptimizationStrategies(metrics);
    }
  }

  /**
   * Apply various optimization strategies
   */
  private async applyOptimizationStrategies(metrics: InferenceMetrics): Promise<void> {
    for (const strategy of this.activeOptimizations.strategies) {
      try {
        switch (strategy) {
          case 'model_sharding':
            await this.optimizeModelSharding(metrics);
            break;
          case 'connection_pooling':
            await this.optimizeConnectionPooling(metrics);
            break;
          case 'load_balancing':
            await this.optimizeLoadBalancing(metrics);
            break;
          case 'edge_caching':
            await this.optimizeCaching(metrics);
            break;
        }
      } catch (error) {
        console.error(`Failed to apply optimization strategy ${strategy}:`, error);
      }
    }
  }

  /**
   * Attempt failover to another region
   */
  private async attemptFailover(request: EdgeInferenceRequest, originalError: EdgeError): Promise<EdgeInferenceResponse> {
    for (const fallbackRegion of this.config.fallback_regions) {
      try {
        // Update request to use fallback region
        const failoverRequest = {
          ...request,
          edge: {
            ...request.edge,
            preferred_regions: [fallbackRegion],
          },
        };

        console.info(`Attempting failover to region ${fallbackRegion}`);
        const result = await this.infer(failoverRequest);
        
        this.emit('failover-success', {
          original_error: originalError,
          failover_region: fallbackRegion,
        });
        
        return result;
        
      } catch (failoverError) {
        console.warn(`Failover to ${fallbackRegion} also failed:`, failoverError);
      }
    }

    // All failover attempts failed
    throw this.createEdgeError(
      new Error('All regions failed during inference'),
      'failover-exhausted'
    );
  }

  // Private helper methods

  private async discoverEdgeNodes(): Promise<void> {
    // Mock node discovery - in production would query actual edge infrastructure
    const mockNodes: EdgeNode[] = [
      {
        id: 'us-east-1-node-1',
        region: 'us-east-1',
        provider: 'cloudflare-workers',
        location: { latitude: 40.7128, longitude: -74.0060, country: 'US', region: 'NY', city: 'New York', timezone: 'EST' },
        capabilities: { max_memory_mb: 512, cpu_cores: 4, gpu_available: false, wasm_support: true, simd_support: true, model_formats: ['onnx', 'wasm'], max_model_size_mb: 100, concurrent_requests: 100 },
        status: 'active',
        load_percentage: 45,
        available_memory_mb: 280,
        available_cpu_percentage: 55,
        network_metrics: { latency_ms: 5, bandwidth_mbps: 1000, packet_loss: 0, jitter_ms: 1, connection_type: 'fiber' },
      },
      {
        id: 'eu-west-1-node-1',
        region: 'eu-west-1',
        provider: 'cloudflare-workers',
        location: { latitude: 51.5074, longitude: -0.1278, country: 'GB', region: 'London', city: 'London', timezone: 'GMT' },
        capabilities: { max_memory_mb: 512, cpu_cores: 4, gpu_available: false, wasm_support: true, simd_support: true, model_formats: ['onnx', 'wasm'], max_model_size_mb: 100, concurrent_requests: 100 },
        status: 'active',
        load_percentage: 30,
        available_memory_mb: 350,
        available_cpu_percentage: 70,
        network_metrics: { latency_ms: 8, bandwidth_mbps: 800, packet_loss: 0, jitter_ms: 2, connection_type: 'fiber' },
      },
      {
        id: 'ap-southeast-1-node-1',
        region: 'ap-southeast-1',
        provider: 'cloudflare-workers',
        location: { latitude: 1.3521, longitude: 103.8198, country: 'SG', region: 'Singapore', city: 'Singapore', timezone: 'SGT' },
        capabilities: { max_memory_mb: 512, cpu_cores: 4, gpu_available: false, wasm_support: true, simd_support: true, model_formats: ['onnx', 'wasm'], max_model_size_mb: 100, concurrent_requests: 100 },
        status: 'active',
        load_percentage: 60,
        available_memory_mb: 200,
        available_cpu_percentage: 40,
        network_metrics: { latency_ms: 12, bandwidth_mbps: 600, packet_loss: 0, jitter_ms: 3, connection_type: 'fiber' },
      },
    ];

    for (const node of mockNodes) {
      this.edgeNodes.set(node.id, node);
    }
  }

  private async initializeConnectionPools(): Promise<void> {
    for (const region of this.getAvailableRegions()) {
      this.connectionPools.set(region, []);
    }
  }

  private async initializeModelSharding(): Promise<void> {
    // Mock model sharding setup
    const models = ['gpt-4', 'claude-3', 'gemini-pro'];
    
    for (const model of models) {
      const shardMap = new Map<EdgeRegion, string>();
      for (const region of this.getAvailableRegions()) {
        shardMap.set(region, `${model}-shard-${region}`);
      }
      this.modelShards.set(model, shardMap);
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.emit('performance-update', {
        timestamp: new Date(),
        metrics: this.getRecentPerformanceMetrics(),
      });
    }, 10000); // Every 10 seconds
  }

  private getAvailableRegions(): EdgeRegion[] {
    return Array.from(new Set(Array.from(this.edgeNodes.values()).map(node => node.region)));
  }

  private nodeSupportsRequest(node: EdgeNode, request: EdgeInferenceRequest): boolean {
    // Check if node supports the requested model format
    return node.capabilities.model_formats.includes('onnx') || 
           node.capabilities.model_formats.includes('wasm');
  }

  private calculateGeographicDistance(location1: GeographicLocation, location2: GeographicLocation): number {
    // Haversine formula for great-circle distance
    const R = 6371; // Earth's radius in km
    const dLat = (location2.latitude - location1.latitude) * Math.PI / 180;
    const dLon = (location2.longitude - location1.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(location1.latitude * Math.PI / 180) *
              Math.cos(location2.latitude * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateCapabilityScore(node: EdgeNode, request: EdgeInferenceRequest): number {
    let score = 0;
    
    if (node.capabilities.wasm_support && request.prefer_wasm) score += 20;
    if (node.capabilities.simd_support) score += 15;
    if (node.capabilities.gpu_available) score += 10;
    
    return score;
  }

  private shouldBatchRequest(request: EdgeInferenceRequest): boolean {
    // Simple heuristic - in production would use ML models
    return request.maxTokens && request.maxTokens > 500;
  }

  private calculateOptimalBatchSize(node: EdgeNode): number {
    return Math.min(8, Math.floor(node.available_memory_mb / 64));
  }

  private estimateModelComplexity(modelId: string): number {
    // Simple model complexity estimation
    const complexityMap: Record<string, number> = {
      'gpt-4': 2.5,
      'claude-3': 2.2,
      'gemini-pro': 2.0,
      'llama-7b': 1.5,
      'mistral-7b': 1.3,
      'default': 1.0,
    };
    
    return complexityMap[modelId] || complexityMap.default;
  }

  private shouldCompressResponse(response: any): boolean {
    const responseSize = JSON.stringify(response).length;
    return responseSize > 1024; // Compress responses larger than 1KB
  }

  private async compressResponse(response: any): Promise<any> {
    // Mock compression - in production would use actual compression
    return { ...response, compressed: true };
  }

  private enableStreamingResponse(response: any): any {
    return { ...response, streaming: true };
  }

  private getRoutingReason(node: EdgeNode, request: EdgeInferenceRequest): string {
    if (request.edge?.preferred_regions?.includes(node.region)) {
      return 'user preference';
    }
    if (node.load_percentage < 50) {
      return 'low load';
    }
    return 'geographic proximity';
  }

  private isEdgeError(error: any): error is EdgeError {
    return error && typeof error.code === 'string';
  }

  private createEdgeError(error: Error, context: string): EdgeError {
    const edgeError = error as EdgeError;
    edgeError.code = 'NETWORK_ERROR';
    return edgeError;
  }

  private getRecentPerformanceMetrics() {
    const recent = this.performanceHistory.slice(-10);
    if (recent.length === 0) return null;
    
    return {
      avg_latency: recent.reduce((sum, m) => sum + m.total_latency_ms, 0) / recent.length,
      p95_latency: recent.map(m => m.total_latency_ms).sort()[Math.floor(recent.length * 0.95)],
      requests_processed: recent.length,
      cache_hit_rate: recent.filter(m => m.cache_hit).length / recent.length,
    };
  }

  // Optimization methods (simplified implementations)
  private async optimizeModelSharding(metrics: InferenceMetrics): Promise<void> {
    console.info('Applying model sharding optimization based on metrics');
  }

  private async optimizeConnectionPooling(metrics: InferenceMetrics): Promise<void> {
    console.info('Optimizing connection pooling based on metrics');
  }

  private async optimizeLoadBalancing(metrics: InferenceMetrics): Promise<void> {
    console.info('Optimizing load balancing based on metrics');
  }

  private async optimizeCaching(metrics: InferenceMetrics): Promise<void> {
    console.info('Optimizing caching strategy based on metrics');
  }

  /**
   * Get current engine statistics
   */
  getStatistics() {
    const recent = this.performanceHistory.slice(-100);
    
    return {
      total_nodes: this.edgeNodes.size,
      active_nodes: Array.from(this.edgeNodes.values()).filter(n => n.status === 'active').length,
      available_regions: this.getAvailableRegions().length,
      recent_requests: recent.length,
      average_latency: recent.length > 0 ? recent.reduce((sum, m) => sum + m.total_latency_ms, 0) / recent.length : 0,
      p95_latency: recent.length > 0 ? recent.map(m => m.total_latency_ms).sort()[Math.floor(recent.length * 0.95)] || 0 : 0,
      sla_compliance: recent.length > 0 ? recent.filter(m => m.total_latency_ms <= this.config.target_latency_ms).length / recent.length : 1,
    };
  }
}