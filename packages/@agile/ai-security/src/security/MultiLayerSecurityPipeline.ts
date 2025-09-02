/**
 * Multi-Layer Security Pipeline
 * Orchestrates multiple security providers for comprehensive protection
 */

import { EventEmitter } from 'eventemitter3';
import type {
  SecurityLayer,
  SecurityCheckRequest,
  SecurityCheckResult,
  MultiLayerSecurityResult,
  SecurityViolation,
  SecurityPolicy,
  SecurityContext,
  SecurityError,
  SecurityServiceProvider,
} from '../types/security';

export interface MultiLayerPipelineConfig {
  // Layer configuration
  layers: SecurityLayerConfig[];
  fallback_action: 'ALLOW' | 'BLOCK';
  
  // Performance settings
  max_total_latency_ms: number;
  allow_parallel_execution: boolean;
  early_termination_enabled: boolean;
  
  // Policy settings
  require_unanimous_approval: boolean;
  majority_threshold: number; // 0.5-1.0
  confidence_weight: number; // How much to weight confidence vs raw decisions
  
  // Context settings
  use_security_context: boolean;
  context_weight: number; // How much previous violations affect decisions
}

export interface SecurityLayerConfig {
  id: string;
  name: string;
  provider: SecurityServiceProvider;
  enabled: boolean;
  priority: number;
  weight: number; // Influence on final decision (0-1)
  timeout_ms: number;
  
  // Layer-specific settings
  required_for_approval?: boolean; // Must approve for content to be allowed
  bypass_on_timeout?: boolean;
  retry_on_failure?: boolean;
}

export class MultiLayerSecurityPipeline extends EventEmitter {
  private config: MultiLayerPipelineConfig;
  private layers: Map<string, SecurityLayer>;
  private activePolicy: SecurityPolicy | null = null;
  private contextCache = new Map<string, SecurityContext>();

  constructor(config: MultiLayerPipelineConfig) {
    super();
    this.config = config;
    this.layers = new Map();
    
    // Initialize layers
    this.initializeLayers(config.layers);
  }

  /**
   * Execute multi-layer security check
   */
  async checkContent(
    request: SecurityCheckRequest,
    context?: SecurityContext
  ): Promise<MultiLayerSecurityResult> {
    const startTime = performance.now();
    const layerResults: Record<string, SecurityCheckResult> = {};
    const enabledLayers = this.getEnabledLayers();

    this.emit('pipeline-start', { request, layers: enabledLayers.length });

    try {
      // Apply security context if available
      const enhancedRequest = this.applySecurityContext(request, context);
      
      // Execute layers based on configuration
      if (this.config.allow_parallel_execution) {
        await this.executeLayersInParallel(enhancedRequest, enabledLayers, layerResults);
      } else {
        await this.executeLayersSequentially(enhancedRequest, enabledLayers, layerResults);
      }

      // Analyze results and make final decision
      const finalDecision = this.analyzeResults(layerResults, context);
      
      // Update security context
      if (context && this.config.use_security_context) {
        this.updateSecurityContext(context, finalDecision);
      }

      const totalTime = performance.now() - startTime;
      
      const result: MultiLayerSecurityResult = {
        ...finalDecision,
        layer_results: layerResults,
        total_processing_time_ms: totalTime,
      };

      this.emit('pipeline-complete', { request, result, totalTime });
      return result;

    } catch (error) {
      this.emit('pipeline-error', { request, error });
      
      // Fallback decision
      return {
        final_decision: this.config.fallback_action,
        layer_results: layerResults,
        combined_violations: [],
        overall_confidence: 0,
        total_processing_time_ms: performance.now() - startTime,
        decision_rationale: `Pipeline failed: ${error}. Applied fallback action: ${this.config.fallback_action}`,
      };
    }
  }

  /**
   * Add or update a security layer
   */
  addLayer(layerConfig: SecurityLayerConfig): void {
    const layer: SecurityLayer = {
      id: layerConfig.id,
      name: layerConfig.name,
      enabled: layerConfig.enabled,
      priority: layerConfig.priority,
      check: async (request: SecurityCheckRequest) => {
        const timeoutPromise = new Promise<SecurityCheckResult>((_, reject) => {
          setTimeout(() => reject(new Error('Layer timeout')), layerConfig.timeout_ms);
        });

        try {
          const resultPromise = layerConfig.provider.check_content(request);
          return await Promise.race([resultPromise, timeoutPromise]);
        } catch (error) {
          if (layerConfig.bypass_on_timeout && error.message === 'Layer timeout') {
            return this.createBypassResult();
          }
          throw error;
        }
      },
    };

    this.layers.set(layerConfig.id, layer);
    this.emit('layer-added', { layer: layerConfig });
  }

  /**
   * Remove a security layer
   */
  removeLayer(layerId: string): void {
    if (this.layers.delete(layerId)) {
      this.emit('layer-removed', { layerId });
    }
  }

  /**
   * Update layer configuration
   */
  updateLayerConfig(layerId: string, updates: Partial<SecurityLayerConfig>): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      // Update layer properties
      Object.assign(layer, updates);
      this.emit('layer-updated', { layerId, updates });
    }
  }

  /**
   * Set active security policy
   */
  setPolicy(policy: SecurityPolicy): void {
    this.activePolicy = policy;
    this.emit('policy-updated', { policy });
  }

  /**
   * Get pipeline statistics
   */
  getStatistics(): {
    total_layers: number;
    enabled_layers: number;
    average_execution_time: number;
    success_rate: number;
  } {
    const enabledLayers = this.getEnabledLayers();
    
    return {
      total_layers: this.layers.size,
      enabled_layers: enabledLayers.length,
      average_execution_time: 0, // Would track in production
      success_rate: 0.99, // Would calculate from metrics
    };
  }

  // Private implementation methods

  /**
   * Initialize security layers from configuration
   */
  private initializeLayers(layerConfigs: SecurityLayerConfig[]): void {
    for (const config of layerConfigs) {
      this.addLayer(config);
    }
  }

  /**
   * Get enabled layers sorted by priority
   */
  private getEnabledLayers(): SecurityLayer[] {
    return Array.from(this.layers.values())
      .filter(layer => layer.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Apply security context to enhance request
   */
  private applySecurityContext(
    request: SecurityCheckRequest,
    context?: SecurityContext
  ): SecurityCheckRequest {
    if (!context || !this.config.use_security_context) {
      return request;
    }

    // Adjust strictness based on user risk profile
    let adjustedStrictness = request.strictness || 'BALANCED';
    
    if (context.risk_profile === 'HIGH') {
      adjustedStrictness = 'STRICT';
    } else if (context.risk_profile === 'LOW' && context.trust_score > 0.8) {
      adjustedStrictness = 'PERMISSIVE';
    }

    return {
      ...request,
      strictness: adjustedStrictness,
      context: {
        ...request.context,
        user_risk_profile: context.risk_profile,
        trust_score: context.trust_score,
        previous_violations_count: context.previous_violations.length,
      },
    };
  }

  /**
   * Execute layers in parallel
   */
  private async executeLayersInParallel(
    request: SecurityCheckRequest,
    layers: SecurityLayer[],
    results: Record<string, SecurityCheckResult>
  ): Promise<void> {
    const layerPromises = layers.map(async (layer) => {
      try {
        const result = await layer.check(request);
        results[layer.id] = result;
        
        this.emit('layer-complete', { layerId: layer.id, result });
        
        // Early termination check
        if (this.config.early_termination_enabled && this.shouldTerminateEarly(result)) {
          this.emit('early-termination', { layerId: layer.id, result });
          return 'terminate';
        }
        
        return 'continue';
      } catch (error) {
        this.emit('layer-error', { layerId: layer.id, error });
        
        // Create error result
        results[layer.id] = this.createErrorResult(error as Error);
        return 'error';
      }
    });

    await Promise.allSettled(layerPromises);
  }

  /**
   * Execute layers sequentially
   */
  private async executeLayersSequentially(
    request: SecurityCheckRequest,
    layers: SecurityLayer[],
    results: Record<string, SecurityCheckResult>
  ): Promise<void> {
    for (const layer of layers) {
      try {
        const result = await layer.check(request);
        results[layer.id] = result;
        
        this.emit('layer-complete', { layerId: layer.id, result });
        
        // Early termination check
        if (this.config.early_termination_enabled && this.shouldTerminateEarly(result)) {
          this.emit('early-termination', { layerId: layer.id, result });
          break;
        }
        
      } catch (error) {
        this.emit('layer-error', { layerId: layer.id, error });
        
        // Create error result
        results[layer.id] = this.createErrorResult(error as Error);
      }
    }
  }

  /**
   * Analyze layer results and make final decision
   */
  private analyzeResults(
    layerResults: Record<string, SecurityCheckResult>,
    context?: SecurityContext
  ): Omit<MultiLayerSecurityResult, 'layer_results' | 'total_processing_time_ms'> {
    const validResults = Object.entries(layerResults)
      .filter(([_, result]) => !result.processing_time_ms || result.processing_time_ms < this.config.max_total_latency_ms)
      .map(([layerId, result]) => ({ layerId, result }));

    if (validResults.length === 0) {
      return {
        final_decision: this.config.fallback_action,
        combined_violations: [],
        overall_confidence: 0,
        decision_rationale: 'No valid layer results available',
      };
    }

    // Collect all violations
    const allViolations = validResults.flatMap(({ result }) => result.violations);
    
    // Calculate weighted decision
    const decisions = validResults.map(({ layerId, result }) => {
      const layer = this.layers.get(layerId);
      const layerConfig = this.config.layers.find(l => l.id === layerId);
      const weight = layerConfig?.weight || 1.0;
      
      return {
        safe: result.safe,
        confidence: result.confidence,
        weight,
        required: layerConfig?.required_for_approval || false,
      };
    });

    // Check for required layer failures
    const requiredLayerFailed = decisions.some(d => d.required && !d.safe);
    if (requiredLayerFailed) {
      return {
        final_decision: 'BLOCK',
        combined_violations: allViolations,
        overall_confidence: this.calculateWeightedConfidence(decisions),
        decision_rationale: 'Required security layer detected violation',
      };
    }

    // Calculate weighted score
    const totalWeight = decisions.reduce((sum, d) => sum + d.weight, 0);
    const safeScore = decisions
      .filter(d => d.safe)
      .reduce((sum, d) => sum + (d.weight * d.confidence), 0) / totalWeight;
    
    const unsafeScore = decisions
      .filter(d => !d.safe)
      .reduce((sum, d) => sum + (d.weight * d.confidence), 0) / totalWeight;

    // Apply context weighting
    let contextAdjustment = 0;
    if (context && this.config.use_security_context) {
      if (context.previous_violations.length > 5) {
        contextAdjustment = -0.2; // More strict for repeat offenders
      } else if (context.trust_score > 0.9) {
        contextAdjustment = 0.1; // More lenient for trusted users
      }
    }

    const finalSafeScore = Math.max(0, Math.min(1, safeScore + contextAdjustment));
    
    // Determine final decision
    let finalDecision: MultiLayerSecurityResult['final_decision'];
    
    if (this.config.require_unanimous_approval) {
      finalDecision = decisions.every(d => d.safe) ? 'ALLOW' : 'BLOCK';
    } else {
      if (finalSafeScore >= this.config.majority_threshold) {
        finalDecision = 'ALLOW';
      } else if (unsafeScore > 0.8) {
        finalDecision = 'BLOCK';
      } else {
        finalDecision = 'FLAG';
      }
    }

    // Generate rationale
    const rationale = this.generateDecisionRationale(decisions, finalSafeScore, contextAdjustment);

    return {
      final_decision: finalDecision,
      combined_violations: this.deduplicateViolations(allViolations),
      overall_confidence: this.calculateWeightedConfidence(decisions),
      decision_rationale: rationale,
    };
  }

  /**
   * Check if we should terminate early
   */
  private shouldTerminateEarly(result: SecurityCheckResult): boolean {
    // Terminate early if high-confidence critical violation detected
    return result.violations.some(v => 
      v.severity === 'CRITICAL' && v.confidence > 0.9
    );
  }

  /**
   * Calculate weighted confidence across all decisions
   */
  private calculateWeightedConfidence(decisions: Array<{ confidence: number; weight: number }>): number {
    const totalWeight = decisions.reduce((sum, d) => sum + d.weight, 0);
    if (totalWeight === 0) return 0;
    
    return decisions.reduce((sum, d) => sum + (d.confidence * d.weight), 0) / totalWeight;
  }

  /**
   * Deduplicate violations from multiple layers
   */
  private deduplicateViolations(violations: SecurityViolation[]): SecurityViolation[] {
    const seen = new Set<string>();
    return violations.filter(v => {
      const key = `${v.type}-${v.category}-${v.detected_text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate decision rationale
   */
  private generateDecisionRationale(
    decisions: Array<{ safe: boolean; confidence: number; weight: number }>,
    finalScore: number,
    contextAdjustment: number
  ): string {
    const safeCount = decisions.filter(d => d.safe).length;
    const totalCount = decisions.length;
    
    let rationale = `${safeCount}/${totalCount} layers approved content (weighted score: ${finalScore.toFixed(2)})`;
    
    if (contextAdjustment !== 0) {
      rationale += `. Context adjustment: ${contextAdjustment > 0 ? '+' : ''}${contextAdjustment.toFixed(2)}`;
    }
    
    if (this.config.require_unanimous_approval) {
      rationale += '. Requires unanimous approval.';
    } else {
      rationale += `. Majority threshold: ${this.config.majority_threshold}`;
    }
    
    return rationale;
  }

  /**
   * Update security context based on decision
   */
  private updateSecurityContext(context: SecurityContext, decision: Omit<MultiLayerSecurityResult, 'layer_results' | 'total_processing_time_ms'>): void {
    // Add to moderation history
    context.moderation_history.push({
      timestamp: new Date(),
      action: decision.final_decision,
      reason: decision.decision_rationale,
    });

    // Update violations if any
    if (decision.combined_violations.length > 0) {
      context.previous_violations.push(...decision.combined_violations);
      
      // Update risk profile
      const recentCriticalViolations = context.previous_violations
        .filter(v => v.severity === 'CRITICAL')
        .length;
      
      if (recentCriticalViolations > 0) {
        context.risk_profile = 'HIGH';
        context.trust_score = Math.max(0, context.trust_score - 0.3);
      } else if (decision.combined_violations.some(v => v.severity === 'HIGH')) {
        context.trust_score = Math.max(0, context.trust_score - 0.1);
      }
    } else if (decision.final_decision === 'ALLOW') {
      // Gradually increase trust for clean content
      context.trust_score = Math.min(1, context.trust_score + 0.01);
    }

    // Cache updated context
    if (context.user_id) {
      this.contextCache.set(context.user_id, context);
    }
  }

  /**
   * Create bypass result for layer timeouts
   */
  private createBypassResult(): SecurityCheckResult {
    return {
      safe: true,
      violations: [],
      overall_risk: 'LOW',
      confidence: 0,
      processing_time_ms: 0,
      suggested_action: 'ALLOW',
    };
  }

  /**
   * Create error result for layer failures
   */
  private createErrorResult(error: Error): SecurityCheckResult {
    return {
      safe: false, // Fail closed
      violations: [],
      overall_risk: 'HIGH',
      confidence: 0,
      processing_time_ms: 0,
      suggested_action: 'ESCALATE',
    };
  }
}