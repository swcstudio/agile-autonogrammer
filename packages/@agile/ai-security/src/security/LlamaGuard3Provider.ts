/**
 * Llama Guard 3 Security Provider
 * High-performance content moderation with <10ms overhead target
 */

import { EventEmitter } from 'eventemitter3';
import type {
  SecurityCheckRequest,
  SecurityCheckResult,
  SecurityViolation,
  SecurityViolationType,
  LlamaGuard3Config,
  SecurityError,
  SecurityMetrics,
  SecurityServiceProvider,
} from '../types/security';

export class LlamaGuard3Provider extends EventEmitter implements SecurityServiceProvider {
  public readonly id = 'llama-guard-3';
  public readonly name = 'Llama Guard 3';
  public readonly type = 'LLAMA_GUARD' as const;

  private config: LlamaGuard3Config;
  private metrics: SecurityMetrics;
  private requestQueue: Array<{
    request: SecurityCheckRequest;
    resolve: (result: SecurityCheckResult) => void;
    reject: (error: SecurityError) => void;
    timestamp: number;
  }> = [];
  private activeRequests = 0;
  private isProcessingQueue = false;

  // Llama Guard 3 Category Mappings
  private readonly CATEGORY_MAPPINGS: Record<SecurityViolationType, {
    llamaGuardCode: string;
    description: string;
    defaultThreshold: number;
  }> = {
    'S1': {
      llamaGuardCode: 'S1',
      description: 'Violent Crimes',
      defaultThreshold: 0.8,
    },
    'S2': {
      llamaGuardCode: 'S2', 
      description: 'Non-Violent Crimes',
      defaultThreshold: 0.7,
    },
    'S3': {
      llamaGuardCode: 'S3',
      description: 'Sex Crimes',
      defaultThreshold: 0.9,
    },
    'S4': {
      llamaGuardCode: 'S4',
      description: 'Child Exploitation',
      defaultThreshold: 0.95,
    },
    'S5': {
      llamaGuardCode: 'S5',
      description: 'Specialized Advice',
      defaultThreshold: 0.6,
    },
    'S6': {
      llamaGuardCode: 'S6',
      description: 'Privacy',
      defaultThreshold: 0.7,
    },
    'S7': {
      llamaGuardCode: 'S7',
      description: 'Intellectual Property',
      defaultThreshold: 0.8,
    },
    'S8': {
      llamaGuardCode: 'S8',
      description: 'Indiscriminate Weapons',
      defaultThreshold: 0.9,
    },
    'S9': {
      llamaGuardCode: 'S9',
      description: 'Hate',
      defaultThreshold: 0.8,
    },
    'S10': {
      llamaGuardCode: 'S10',
      description: 'Self-Harm',
      defaultThreshold: 0.85,
    },
    'S11': {
      llamaGuardCode: 'S11',
      description: 'Sexual Content',
      defaultThreshold: 0.75,
    },
    'S12': {
      llamaGuardCode: 'S12',
      description: 'Elections',
      defaultThreshold: 0.7,
    },
    'S13': {
      llamaGuardCode: 'S13',
      description: 'Code Interpreter Abuse',
      defaultThreshold: 0.8,
    },
    'CUSTOM': {
      llamaGuardCode: 'CUSTOM',
      description: 'Custom Rules',
      defaultThreshold: 0.8,
    },
  };

  constructor(config: LlamaGuard3Config) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
    this.startMetricsCollection();
  }

  /**
   * Check content for security violations using Llama Guard 3
   */
  async check_content(request: SecurityCheckRequest): Promise<SecurityCheckResult> {
    const startTime = performance.now();

    try {
      // Validate request
      this.validateRequest(request);

      // Check if we're over concurrency limit
      if (this.activeRequests >= this.config.max_concurrent_requests) {
        return await this.queueRequest(request);
      }

      // Process immediately
      this.activeRequests++;
      const result = await this.processSecurityCheck(request);
      
      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(request, result, processingTime);
      
      this.emit('check-complete', { request, result, processingTime });
      
      return result;

    } catch (error) {
      const securityError = this.createSecurityError(error as Error);
      this.emit('check-error', { request, error: securityError });
      throw securityError;
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  /**
   * Get provider capabilities
   */
  async get_capabilities(): Promise<string[]> {
    return [
      'content-moderation',
      'real-time-scanning',
      'multi-language-support',
      'custom-categories',
      'batch-processing',
      'streaming-analysis',
      'confidence-scoring',
      'explanation-generation',
    ];
  }

  /**
   * Get current metrics
   */
  async get_metrics(): Promise<SecurityMetrics> {
    return { ...this.metrics };
  }

  /**
   * Process security check with Llama Guard 3
   */
  private async processSecurityCheck(request: SecurityCheckRequest): Promise<SecurityCheckResult> {
    const startTime = performance.now();
    
    try {
      // Prepare Llama Guard 3 request
      const llamaGuardRequest = this.buildLlamaGuardRequest(request);
      
      // Make API call with timeout
      const response = await this.callLlamaGuardAPI(llamaGuardRequest, request.max_latency_ms || this.config.timeout_ms);
      
      // Parse and analyze response
      const result = this.parseLlamaGuardResponse(response, request);
      
      // Add processing time
      result.processing_time_ms = performance.now() - startTime;
      
      return result;
      
    } catch (error) {
      throw this.createSecurityError(error as Error, {
        request_id: this.generateRequestId(),
        processing_time: performance.now() - startTime,
      });
    }
  }

  /**
   * Build Llama Guard 3 API request
   */
  private buildLlamaGuardRequest(request: SecurityCheckRequest): any {
    const categories = request.categories || this.config.enabled_categories;
    
    // Build the taxonomy prompt
    const taxonomy = categories.map(cat => {
      const mapping = this.CATEGORY_MAPPINGS[cat];
      const customDesc = this.config.custom_taxonomy?.[cat];
      return `${mapping.llamaGuardCode}: ${customDesc || mapping.description}`;
    }).join('\n');

    // Construct the full prompt
    const prompt = `<BEGIN UNSAFE CONTENT CATEGORIES>
${taxonomy}
<END UNSAFE CONTENT CATEGORIES>

<BEGIN CONVERSATION>
User: ${request.text}
<END CONVERSATION>

Provide your safety assessment for the user message:`;

    return {
      model: `meta-llama/Llama-Guard-3-${this.config.model_version}-8B`,
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      temperature: 0.0, // Deterministic for security
      max_tokens: 100,
      top_p: 1.0,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ['<END'],
    };
  }

  /**
   * Call Llama Guard 3 API with retry logic
   */
  private async callLlamaGuardAPI(request: any, timeoutMs: number): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retry_attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(this.config.model_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.api_key}`,
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retry_attempts) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError || new Error('Unknown API error');
  }

  /**
   * Parse Llama Guard 3 response
   */
  private parseLlamaGuardResponse(response: any, request: SecurityCheckRequest): SecurityCheckResult {
    const content = response.choices?.[0]?.message?.content || '';
    const lines = content.trim().split('\n');
    
    // Check if content is safe
    const isSafe = lines[0]?.toLowerCase().includes('safe');
    const violations: SecurityViolation[] = [];
    let overallRisk: SecurityCheckResult['overall_risk'] = 'LOW';
    let confidence = 0.9; // Default high confidence for Llama Guard

    if (!isSafe) {
      // Parse violation categories from response
      const violationLines = lines.slice(1).filter(line => line.trim());
      
      for (const line of violationLines) {
        const match = line.match(/^(S\d+|CUSTOM)(?:\s*:\s*(.+))?/);
        if (match) {
          const [, category, description] = match;
          const violationType = category as SecurityViolationType;
          
          if (this.CATEGORY_MAPPINGS[violationType]) {
            const mapping = this.CATEGORY_MAPPINGS[violationType];
            const threshold = this.config.threshold_overrides?.[violationType] || mapping.defaultThreshold;
            
            violations.push({
              type: violationType,
              category: mapping.description,
              severity: this.calculateSeverity(violationType, confidence),
              confidence: Math.min(confidence, threshold + 0.1),
              description: description || mapping.description,
              detected_text: this.extractRelevantText(request.text, violationType),
              suggestion: this.generateSuggestion(violationType),
            });
          }
        }
      }
      
      // Determine overall risk
      overallRisk = this.calculateOverallRisk(violations);
    }

    // Determine suggested action
    const suggestedAction = this.determineSuggestedAction(violations, overallRisk);

    return {
      safe: isSafe,
      violations,
      overall_risk: overallRisk,
      confidence,
      processing_time_ms: 0, // Will be set by caller
      suggested_action: suggestedAction,
      flagged_segments: isSafe ? undefined : this.extractFlaggedSegments(request.text, violations),
      alternative_response: isSafe ? undefined : this.generateAlternativeResponse(violations),
    };
  }

  /**
   * Calculate violation severity based on type and confidence
   */
  private calculateSeverity(type: SecurityViolationType, confidence: number): SecurityViolation['severity'] {
    // High-risk categories
    const criticalCategories = ['S3', 'S4', 'S8', 'S10']; // Sex crimes, child exploitation, weapons, self-harm
    const highCategories = ['S1', 'S9']; // Violent crimes, hate
    
    if (criticalCategories.includes(type)) {
      return confidence > 0.8 ? 'CRITICAL' : 'HIGH';
    }
    
    if (highCategories.includes(type)) {
      return confidence > 0.7 ? 'HIGH' : 'MEDIUM';
    }
    
    return confidence > 0.6 ? 'MEDIUM' : 'LOW';
  }

  /**
   * Calculate overall risk from violations
   */
  private calculateOverallRisk(violations: SecurityViolation[]): SecurityCheckResult['overall_risk'] {
    if (violations.length === 0) return 'LOW';
    
    const maxSeverity = violations.reduce((max, v) => {
      const severityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
      return severityOrder[v.severity] > severityOrder[max] ? v.severity : max;
    }, 'LOW' as SecurityViolation['severity']);
    
    return maxSeverity;
  }

  /**
   * Determine suggested action based on violations
   */
  private determineSuggestedAction(violations: SecurityViolation[], overallRisk: SecurityCheckResult['overall_risk']): SecurityCheckResult['suggested_action'] {
    if (violations.length === 0) return 'ALLOW';
    
    const hasCritical = violations.some(v => v.severity === 'CRITICAL');
    const hasHigh = violations.some(v => v.severity === 'HIGH');
    
    if (hasCritical) return 'BLOCK';
    if (hasHigh) return 'ESCALATE';
    if (overallRisk === 'MEDIUM') return 'FLAG';
    
    return 'ALLOW';
  }

  /**
   * Extract relevant text for violation
   */
  private extractRelevantText(text: string, violationType: SecurityViolationType): string {
    // Simple extraction - in production would use more sophisticated NLP
    const words = text.split(/\s+/);
    if (words.length <= 10) return text;
    
    // Return first 10 words as sample
    return words.slice(0, 10).join(' ') + '...';
  }

  /**
   * Generate suggestion for violation
   */
  private generateSuggestion(violationType: SecurityViolationType): string {
    const suggestions: Record<SecurityViolationType, string> = {
      'S1': 'Remove violent language and focus on constructive communication',
      'S2': 'Avoid discussing illegal activities or methods',
      'S3': 'Remove sexually explicit content and maintain professional discourse',
      'S4': 'This content involves minors and cannot be processed',
      'S5': 'Seek professional advice from qualified experts',
      'S6': 'Remove personal or private information',
      'S7': 'Respect intellectual property rights and use original content',
      'S8': 'Avoid discussions of dangerous weapons or explosives',
      'S9': 'Use inclusive language and avoid discriminatory content',
      'S10': 'Consider speaking with a mental health professional',
      'S11': 'Keep content appropriate for all audiences',
      'S12': 'Provide factual information without political bias',
      'S13': 'Use code responsibly and avoid malicious implementations',
      'CUSTOM': 'Review content against organizational guidelines',
    };
    
    return suggestions[violationType] || 'Review and modify content as needed';
  }

  /**
   * Extract flagged segments from text
   */
  private extractFlaggedSegments(text: string, violations: SecurityViolation[]): SecurityCheckResult['flagged_segments'] {
    // Simple implementation - would use NLP for precise location detection
    return violations.map((violation, index) => ({
      text: violation.detected_text || text.substring(0, 50),
      start: index * 50,
      end: Math.min((index + 1) * 50, text.length),
      violation_types: [violation.type],
    }));
  }

  /**
   * Generate alternative response
   */
  private generateAlternativeResponse(violations: SecurityViolation[]): string {
    if (violations.length === 0) return '';
    
    const mainViolation = violations[0];
    return `I understand you're interested in this topic, but I'm designed to provide helpful and safe information. ${mainViolation.suggestion}`;
  }

  /**
   * Queue request when at concurrency limit
   */
  private async queueRequest(request: SecurityCheckRequest): Promise<SecurityCheckResult> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        request,
        resolve,
        reject,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    if (this.activeRequests >= this.config.max_concurrent_requests) return;

    this.isProcessingQueue = true;

    const queuedRequest = this.requestQueue.shift();
    if (queuedRequest) {
      // Check if request has timed out
      const age = Date.now() - queuedRequest.timestamp;
      const maxAge = queuedRequest.request.max_latency_ms || this.config.timeout_ms;
      
      if (age > maxAge) {
        queuedRequest.reject(this.createSecurityError(new Error('Request timed out in queue')));
      } else {
        // Process the request
        this.check_content(queuedRequest.request)
          .then(queuedRequest.resolve)
          .catch(queuedRequest.reject);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Validate security check request
   */
  private validateRequest(request: SecurityCheckRequest): void {
    if (!request.text || typeof request.text !== 'string') {
      throw new Error('Request must include text content');
    }
    
    if (request.text.length > 50000) {
      throw new Error('Text content exceeds maximum length (50,000 characters)');
    }
    
    if (request.categories) {
      for (const category of request.categories) {
        if (!this.CATEGORY_MAPPINGS[category]) {
          throw new Error(`Unsupported category: ${category}`);
        }
      }
    }
  }

  /**
   * Create security error with consistent format
   */
  private createSecurityError(error: Error, details?: Record<string, any>): SecurityError {
    const securityError = error as SecurityError;
    
    // Determine error code
    if (error.message.includes('timeout') || error.name === 'AbortError') {
      securityError.code = 'TIMEOUT';
      securityError.retriable = true;
    } else if (error.message.includes('API request failed')) {
      securityError.code = 'API_ERROR';
      securityError.retriable = true;
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      securityError.code = 'QUOTA_EXCEEDED';
      securityError.retriable = true;
    } else if (error.message.includes('Request must include') || error.message.includes('exceeds maximum')) {
      securityError.code = 'INVALID_REQUEST';
      securityError.retriable = false;
    } else {
      securityError.code = 'UNKNOWN';
      securityError.retriable = false;
    }
    
    securityError.details = details;
    
    return securityError;
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): SecurityMetrics {
    return {
      total_checks: 0,
      violations_detected: 0,
      false_positives: 0,
      false_negatives: 0,
      average_latency_ms: 0,
      accuracy_rate: 0,
      throughput_per_second: 0,
      category_breakdown: Object.keys(this.CATEGORY_MAPPINGS).reduce((acc, category) => {
        acc[category as SecurityViolationType] = {
          checks: 0,
          violations: 0,
          avg_confidence: 0,
        };
        return acc;
      }, {} as SecurityMetrics['category_breakdown']),
    };
  }

  /**
   * Update metrics after check
   */
  private updateMetrics(
    request: SecurityCheckRequest,
    result: SecurityCheckResult,
    processingTime: number
  ): void {
    this.metrics.total_checks++;
    
    if (result.violations.length > 0) {
      this.metrics.violations_detected++;
      
      // Update category breakdown
      for (const violation of result.violations) {
        const categoryStats = this.metrics.category_breakdown[violation.type];
        if (categoryStats) {
          categoryStats.violations++;
          categoryStats.avg_confidence = 
            (categoryStats.avg_confidence * (categoryStats.violations - 1) + violation.confidence) / 
            categoryStats.violations;
        }
      }
    }
    
    // Update category check counts
    const categories = request.categories || this.config.enabled_categories;
    for (const category of categories) {
      const categoryStats = this.metrics.category_breakdown[category];
      if (categoryStats) {
        categoryStats.checks++;
      }
    }
    
    // Update latency
    this.metrics.average_latency_ms = 
      (this.metrics.average_latency_ms * (this.metrics.total_checks - 1) + processingTime) / 
      this.metrics.total_checks;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Update throughput calculation every second
    setInterval(() => {
      const now = Date.now();
      const windowStart = now - 1000; // 1 second window
      // In a real implementation, we'd track request timestamps
      this.metrics.throughput_per_second = this.activeRequests; // Simplified
    }, 1000);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `llama-guard-3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}