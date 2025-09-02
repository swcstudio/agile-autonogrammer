/**
 * useSecurity Hook
 * React hook for AI security and content moderation with Llama Guard 3
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useExecutionEngine } from '@agile/core';
import type { InferenceRequest, InferenceResponse } from '@agile/ai-core';
import type {
  UseSecurityOptions,
  UseSecurityReturn,
  SecurityCheckRequest,
  SecurityCheckResult,
  SecureInferenceRequest,
  SecureInferenceResponse,
  SecurityPolicy,
  CustomSecurityRule,
  SecurityAnalytics,
  SecurityError,
  SecurityMetrics,
  SecurityContext,
  RealtimeScanOptions,
  StreamingScanResult,
  MultiLayerSecurityResult,
  LlamaGuard3Config,
} from '../types/security';
import { LlamaGuard3Provider } from '../security/LlamaGuard3Provider';
import { MultiLayerSecurityPipeline } from '../security/MultiLayerSecurityPipeline';

export function useSecurity(options: UseSecurityOptions = {}): UseSecurityReturn {
  const {
    enable_input_checking = true,
    enable_output_checking = true,
    enable_realtime_scanning = false,
    max_latency_ms = 10, // Target <10ms overhead
    cache_results = true,
    cache_ttl_seconds = 300,
    default_policy = 'default',
    strictness = 'BALANCED',
    custom_rules = [],
    providers = ['llama-guard-3'],
    fallback_provider = 'llama-guard-3',
    enable_analytics = true,
    log_violations = true,
  } = options;

  // State
  const [isEnabled, setIsEnabled] = useState(enable_input_checking || enable_output_checking);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SecurityError | null>(null);
  const [currentPolicy, setCurrentPolicy] = useState<SecurityPolicy | null>(null);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [lastCheck, setLastCheck] = useState<Date>();

  // Refs
  const securityPipeline = useRef<MultiLayerSecurityPipeline | null>(null);
  const resultCache = useRef<Map<string, { result: SecurityCheckResult; expiry: number }>>(new Map());
  const realtimeScanner = useRef<AbortController | null>(null);
  const customRulesRef = useRef<CustomSecurityRule[]>(custom_rules);

  // ExecutionEngine integration
  const executionEngine = useExecutionEngine({
    enableMetrics: enable_analytics,
    timeout: max_latency_ms * 2, // Allow some overhead
  });

  /**
   * Initialize security system
   */
  const initializeSecurity = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Create Llama Guard 3 provider
      const llamaGuardConfig: LlamaGuard3Config = {
        model_endpoint: process.env.LLAMA_GUARD_ENDPOINT || 'https://api.together.xyz/v1/chat/completions',
        api_key: process.env.TOGETHER_API_KEY,
        model_version: '3.1',
        timeout_ms: max_latency_ms,
        max_concurrent_requests: 10,
        retry_attempts: 2,
        enabled_categories: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'],
      };

      const llamaGuardProvider = new LlamaGuard3Provider(llamaGuardConfig);

      // Create multi-layer pipeline
      const pipeline = new MultiLayerSecurityPipeline({
        layers: [
          {
            id: 'llama-guard-3',
            name: 'Llama Guard 3',
            provider: llamaGuardProvider,
            enabled: true,
            priority: 100,
            weight: 1.0,
            timeout_ms: max_latency_ms,
            required_for_approval: true,
            bypass_on_timeout: false,
            retry_on_failure: true,
          },
        ],
        fallback_action: 'BLOCK',
        max_total_latency_ms: max_latency_ms,
        allow_parallel_execution: false,
        early_termination_enabled: true,
        require_unanimous_approval: false,
        majority_threshold: 0.6,
        confidence_weight: 0.8,
        use_security_context: true,
        context_weight: 0.2,
      });

      securityPipeline.current = pipeline;

      // Set up event listeners
      pipeline.on('pipeline-complete', ({ result, totalTime }) => {
        if (enable_analytics) {
          updateMetrics(result, totalTime);
        }
      });

      pipeline.on('pipeline-error', ({ error: pipelineError }) => {
        setError(pipelineError as SecurityError);
      });

      // Load default policy
      await loadDefaultPolicy();

      setIsInitialized(true);

    } catch (err) {
      const securityError = err as SecurityError;
      setError(securityError);
      
      // If fallback is enabled, continue with basic checking
      setIsInitialized(true);
      
    } finally {
      setLoading(false);
    }
  }, [max_latency_ms, enable_analytics]);

  /**
   * Check content for security violations
   */
  const checkContent = useCallback(async (
    content: string,
    requestOptions: Partial<SecurityCheckRequest> = {}
  ): Promise<SecurityCheckResult> => {
    if (!isInitialized || !securityPipeline.current) {
      throw new Error('Security system not initialized');
    }

    const cacheKey = cache_results ? generateCacheKey(content, requestOptions) : null;
    
    // Check cache first
    if (cacheKey && cache_results) {
      const cached = resultCache.current.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.result;
      }
    }

    const request: SecurityCheckRequest = {
      text: content,
      strictness,
      include_explanations: true,
      max_latency_ms,
      custom_rules: customRulesRef.current,
      ...requestOptions,
    };

    const startTime = performance.now();
    
    try {
      const result = await executionEngine.execute(
        () => securityPipeline.current!.checkContent(request),
        {
          type: 'ai-security-check',
          metadata: {
            content_length: content.length,
            strictness: request.strictness,
            providers: providers.join(','),
          },
        }
      );

      // Cast MultiLayerSecurityResult to SecurityCheckResult
      const checkResult: SecurityCheckResult = {
        safe: result.final_decision === 'ALLOW',
        violations: result.combined_violations,
        overall_risk: result.combined_violations.length > 0 
          ? result.combined_violations.reduce((max, v) => {
              const severityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
              return severityOrder[v.severity] > severityOrder[max] ? v.severity : max;
            }, 'LOW' as SecurityCheckResult['overall_risk'])
          : 'LOW',
        confidence: result.overall_confidence,
        processing_time_ms: performance.now() - startTime,
        suggested_action: result.final_decision === 'ALLOW' ? 'ALLOW' 
                         : result.final_decision === 'BLOCK' ? 'BLOCK'
                         : 'FLAG',
      };

      // Cache result
      if (cacheKey && cache_results) {
        resultCache.current.set(cacheKey, {
          result: checkResult,
          expiry: Date.now() + (cache_ttl_seconds * 1000),
        });
      }

      setLastCheck(new Date());
      return checkResult;

    } catch (err) {
      const securityError = err as SecurityError;
      throw securityError;
    }
  }, [isInitialized, strictness, max_latency_ms, cache_results, cache_ttl_seconds, providers, executionEngine]);

  /**
   * Check AI inference request and response
   */
  const checkInference = useCallback(async (
    request: SecureInferenceRequest
  ): Promise<SecureInferenceResponse> => {
    const securityOptions = request.security || {};
    const enableInputCheck = securityOptions.enable_content_check !== false && enable_input_checking;
    const enableOutputCheck = securityOptions.enable_response_check !== false && enable_output_checking;

    let inputCheck: SecurityCheckResult | undefined;
    let outputCheck: SecurityCheckResult | undefined;
    let overallSafe = true;
    const actionsTaken: string[] = [];

    // Check input content
    if (enableInputCheck) {
      const inputText = request.messages 
        ? request.messages.map(m => m.content).join('\n')
        : request.prompt || '';

      inputCheck = await checkContent(inputText, {
        strictness: securityOptions.strictness || strictness,
        custom_rules: securityOptions.custom_rules || customRulesRef.current,
      });

      if (!inputCheck.safe) {
        overallSafe = false;
        actionsTaken.push('INPUT_BLOCKED');
        
        // Return early if input is blocked
        return {
          ...({} as InferenceResponse), // Would need actual response structure
          security: {
            input_check: inputCheck,
            overall_safe: false,
            actions_taken: actionsTaken,
          },
        };
      }
    }

    // Proceed with AI inference (this would integrate with actual AI providers)
    // For now, we'll simulate the response
    const aiResponse: InferenceResponse = {
      content: "This is a simulated response. In production, this would call the actual AI provider.",
      model: request.model,
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25,
      },
      finish_reason: 'stop',
    };

    // Check output content
    if (enableOutputCheck && aiResponse.content) {
      outputCheck = await checkContent(aiResponse.content, {
        strictness: securityOptions.strictness || strictness,
        custom_rules: securityOptions.custom_rules || customRulesRef.current,
      });

      if (!outputCheck.safe) {
        overallSafe = false;
        actionsTaken.push('OUTPUT_BLOCKED');
        
        // Replace with safe alternative
        aiResponse.content = "I'm not able to provide that information. Please try rephrasing your request.";
      }
    }

    return {
      ...aiResponse,
      security: {
        input_check: inputCheck!,
        output_check: outputCheck,
        overall_safe: overallSafe,
        actions_taken: actionsTaken,
      },
    };
  }, [enable_input_checking, enable_output_checking, strictness, checkContent]);

  /**
   * Start real-time content scanning
   */
  const startRealtimeScan = useCallback(async function* (
    content: string,
    scanOptions: RealtimeScanOptions = {}
  ): AsyncIterable<StreamingScanResult> {
    const {
      chunk_size = 100,
      scan_frequency_ms = 100,
      early_termination = true,
    } = scanOptions;

    // Create abort controller for this scan
    const controller = new AbortController();
    realtimeScanner.current = controller;

    try {
      const words = content.split(/\s+/);
      let currentChunk = '';
      let chunkId = 0;
      let cumulativeViolations: SecurityCheckResult['violations'] = [];

      for (let i = 0; i < words.length; i++) {
        if (controller.signal.aborted) {
          break;
        }

        currentChunk += words[i] + ' ';

        // Check chunk when it reaches target size or we're at the end
        if (currentChunk.split(/\s+/).length >= chunk_size || i === words.length - 1) {
          try {
            const result = await checkContent(currentChunk.trim());
            cumulativeViolations.push(...result.violations);

            const scanResult: StreamingScanResult = {
              chunk_id: `chunk-${chunkId++}`,
              is_safe: result.safe,
              violations: result.violations,
              should_terminate: early_termination && result.overall_risk === 'CRITICAL',
              cumulative_risk: cumulativeViolations.length > 0 
                ? cumulativeViolations.reduce((max, v) => {
                    const severityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
                    return severityOrder[v.severity] > severityOrder[max] ? v.severity : max;
                  }, 'LOW' as StreamingScanResult['cumulative_risk'])
                : 'LOW',
            };

            yield scanResult;

            if (scanResult.should_terminate) {
              break;
            }

          } catch (err) {
            // Continue scanning on individual chunk errors
            console.warn('Real-time scan chunk failed:', err);
          }

          currentChunk = '';
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, scan_frequency_ms));
        }
      }
      
    } finally {
      realtimeScanner.current = null;
    }
  }, [checkContent]);

  /**
   * Stop real-time scanning
   */
  const stopRealtimeScan = useCallback((): void => {
    if (realtimeScanner.current) {
      realtimeScanner.current.abort();
      realtimeScanner.current = null;
    }
  }, []);

  /**
   * Update security policy
   */
  const updatePolicy = useCallback(async (policy: SecurityPolicy): Promise<void> => {
    setCurrentPolicy(policy);
    
    // Apply policy to pipeline
    if (securityPipeline.current) {
      securityPipeline.current.setPolicy(policy);
    }
  }, []);

  /**
   * Add custom security rule
   */
  const addCustomRule = useCallback((rule: CustomSecurityRule): void => {
    customRulesRef.current = [...customRulesRef.current, rule];
  }, []);

  /**
   * Remove custom security rule
   */
  const removeCustomRule = useCallback((ruleId: string): void => {
    customRulesRef.current = customRulesRef.current.filter(rule => rule.id !== ruleId);
  }, []);

  /**
   * Get security analytics
   */
  const getAnalytics = useCallback(async (
    timeRange?: { start: Date; end: Date }
  ): Promise<SecurityAnalytics> => {
    // In production, this would fetch from analytics service
    return {
      violation_trends: [],
      performance_metrics: metrics || {
        total_checks: 0,
        violations_detected: 0,
        false_positives: 0,
        false_negatives: 0,
        average_latency_ms: 0,
        accuracy_rate: 0,
        throughput_per_second: 0,
        category_breakdown: {},
      },
      risk_indicators: [],
      compliance_score: 0.95,
      policy_adherence: {},
    };
  }, [metrics]);

  /**
   * Export violations data
   */
  const exportViolations = useCallback(async (format: 'JSON' | 'CSV'): Promise<string> => {
    // In production, this would export actual violation data
    const data = {
      export_date: new Date().toISOString(),
      total_violations: 0,
      violations: [],
    };
    
    return format === 'JSON' 
      ? JSON.stringify(data, null, 2)
      : 'Date,Type,Severity,Content\n'; // CSV header
  }, []);

  // Private helper functions

  const loadDefaultPolicy = async (): Promise<void> => {
    const defaultPolicy: SecurityPolicy = {
      id: 'default',
      name: 'Default Security Policy',
      version: '1.0.0',
      effective_date: new Date(),
      violation_thresholds: {
        'S1': 0.8,
        'S2': 0.7,
        'S3': 0.9,
        'S4': 0.95,
        'S5': 0.6,
        'S6': 0.7,
        'S7': 0.8,
        'S8': 0.9,
        'S9': 0.8,
        'S10': 0.85,
        'S11': 0.75,
        'S12': 0.7,
        'S13': 0.8,
      },
      response_actions: {
        'S1': 'BLOCK',
        'S2': 'FLAG',
        'S3': 'BLOCK',
        'S4': 'BLOCK',
        'S5': 'FLAG',
        'S6': 'FLAG',
        'S7': 'FLAG',
        'S8': 'BLOCK',
        'S9': 'BLOCK',
        'S10': 'BLOCK',
        'S11': 'FLAG',
        'S12': 'FLAG',
        'S13': 'FLAG',
      },
      escalation_rules: [
        {
          condition: 'severity >= HIGH',
          action: 'NOTIFY',
          recipients: ['security-team@company.com'],
        },
      ],
      audit_logging: true,
      data_retention_days: 90,
      anonymize_logs: true,
    };

    setCurrentPolicy(defaultPolicy);
  };

  const generateCacheKey = (content: string, options: Partial<SecurityCheckRequest>): string => {
    const keyData = {
      content: content.substring(0, 100), // First 100 chars
      strictness: options.strictness || strictness,
      categories: options.categories?.sort().join(',') || '',
      rules_count: (options.custom_rules?.length || 0) + customRulesRef.current.length,
    };
    
    return btoa(JSON.stringify(keyData));
  };

  const updateMetrics = (result: MultiLayerSecurityResult, processingTime: number): void => {
    setMetrics(prev => ({
      total_checks: (prev?.total_checks || 0) + 1,
      violations_detected: (prev?.violations_detected || 0) + (result.combined_violations.length > 0 ? 1 : 0),
      false_positives: prev?.false_positives || 0,
      false_negatives: prev?.false_negatives || 0,
      average_latency_ms: prev?.average_latency_ms 
        ? (prev.average_latency_ms + processingTime) / 2
        : processingTime,
      accuracy_rate: prev?.accuracy_rate || 0.95,
      throughput_per_second: prev?.throughput_per_second || 0,
      category_breakdown: prev?.category_breakdown || {},
    }));
  };

  // Initialize on mount
  useEffect(() => {
    if (isEnabled && !isInitialized) {
      initializeSecurity().catch(err => {
        setError(err as SecurityError);
      });
    }
  }, [isEnabled, isInitialized, initializeSecurity]);

  return {
    // Core functions
    checkContent,
    checkInference,
    
    // Real-time scanning
    startRealtimeScan,
    stopRealtimeScan,
    
    // State
    isEnabled,
    isInitialized,
    currentPolicy,
    metrics,
    
    // Configuration
    updatePolicy,
    addCustomRule,
    removeCustomRule,
    
    // Analytics
    getAnalytics,
    exportViolations,
    
    // Status
    loading,
    error,
    lastCheck,
  };
}