/**
 * AI Security System Tests
 * Comprehensive test suite for Llama Guard 3 integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LlamaGuard3Provider } from '../src/security/LlamaGuard3Provider';
import { MultiLayerSecurityPipeline } from '../src/security/MultiLayerSecurityPipeline';
import {
  createBasicSecurityConfig,
  createHighSecurityConfig,
  validateSecurityConfig,
  createCommonSecurityRules,
  DEFAULT_SECURITY_POLICY,
} from '../src/index';
import type {
  SecurityCheckRequest,
  SecurityCheckResult,
  LlamaGuard3Config,
  SecurityViolationType,
  CustomSecurityRule,
} from '../src/types/security';

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = fetch as ReturnType<typeof vi.fn>;

// Mock performance.now for consistent timing
const mockPerformanceNow = vi.fn(() => 1000);
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
});

describe('LlamaGuard3Provider', () => {
  let provider: LlamaGuard3Provider;
  let config: LlamaGuard3Config;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);

    config = createBasicSecurityConfig('test-api-key');
    provider = new LlamaGuard3Provider(config);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Content Safety Checking', () => {
    it('should detect safe content', async () => {
      // Mock API response for safe content
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'safe'
            }
          }]
        })
      });

      const request: SecurityCheckRequest = {
        text: 'Hello, how are you today?',
        strictness: 'BALANCED',
      };

      const result = await provider.check_content(request);

      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.overall_risk).toBe('LOW');
      expect(result.suggested_action).toBe('ALLOW');
    });

    it('should detect violent content (S1)', async () => {
      // Mock API response for violent content
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'unsafe\nS1: Violent Crimes'
            }
          }]
        })
      });

      const request: SecurityCheckRequest = {
        text: 'How to commit violent crimes',
        strictness: 'STRICT',
      };

      const result = await provider.check_content(request);

      expect(result.safe).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('S1');
      expect(result.violations[0].category).toBe('Violent Crimes');
      expect(result.violations[0].severity).toBe('HIGH');
      expect(result.overall_risk).toBe('HIGH');
      expect(result.suggested_action).toBe('BLOCK');
    });

    it('should detect child exploitation content (S4) with CRITICAL severity', async () => {
      // Mock API response for child exploitation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'unsafe\nS4: Child Exploitation'
            }
          }]
        })
      });

      const request: SecurityCheckRequest = {
        text: 'Content involving minors inappropriately',
        strictness: 'STRICT',
      };

      const result = await provider.check_content(request);

      expect(result.safe).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('S4');
      expect(result.violations[0].severity).toBe('CRITICAL');
      expect(result.overall_risk).toBe('CRITICAL');
      expect(result.suggested_action).toBe('BLOCK');
    });

    it('should handle multiple violations', async () => {
      // Mock API response for multiple violations
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'unsafe\nS1: Violent Crimes\nS9: Hate Speech'
            }
          }]
        })
      });

      const request: SecurityCheckRequest = {
        text: 'Content with multiple violations',
        strictness: 'BALANCED',
      };

      const result = await provider.check_content(request);

      expect(result.safe).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations.map(v => v.type)).toContain('S1');
      expect(result.violations.map(v => v.type)).toContain('S9');
      expect(result.overall_risk).toBe('HIGH');
    });

    it('should handle API timeouts', async () => {
      // Mock timeout
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      const request: SecurityCheckRequest = {
        text: 'Test content',
        max_latency_ms: 50,
      };

      await expect(provider.check_content(request)).rejects.toThrow();
    });

    it('should handle API errors with retry', async () => {
      // Mock API error on first call, success on retry
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: 'safe'
              }
            }]
          })
        });

      const request: SecurityCheckRequest = {
        text: 'Test content',
        strictness: 'BALANCED',
      };

      const result = await provider.check_content(request);

      expect(result.safe).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should validate request format', async () => {
      const invalidRequest = {
        text: '',
        strictness: 'BALANCED' as const,
      };

      await expect(provider.check_content(invalidRequest)).rejects.toThrow('Request must include text content');
    });

    it('should enforce content length limits', async () => {
      const longContent = 'a'.repeat(60000);
      const request: SecurityCheckRequest = {
        text: longContent,
        strictness: 'BALANCED',
      };

      await expect(provider.check_content(request)).rejects.toThrow('Text content exceeds maximum length');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent requests', async () => {
      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'safe'
            }
          }]
        })
      });

      const requests = Array.from({ length: 5 }, (_, i) => ({
        text: `Test content ${i}`,
        strictness: 'BALANCED' as const,
      }));

      const results = await Promise.all(
        requests.map(req => provider.check_content(req))
      );

      expect(results).toHaveLength(5);
      expect(results.every(r => r.safe)).toBe(true);
    });

    it('should queue requests when at concurrency limit', async () => {
      // Configure provider with low concurrency limit
      const lowConcurrencyConfig = {
        ...config,
        max_concurrent_requests: 2,
      };
      const limitedProvider = new LlamaGuard3Provider(lowConcurrencyConfig);

      // Mock delayed responses
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: 'safe'
                }
              }]
            })
          }), 100)
        )
      );

      const startTime = Date.now();
      
      const requests = Array.from({ length: 3 }, (_, i) => ({
        text: `Test content ${i}`,
        strictness: 'BALANCED' as const,
      }));

      const results = await Promise.all(
        requests.map(req => limitedProvider.check_content(req))
      );

      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.safe)).toBe(true);
      // Should take longer due to queueing
      expect(duration).toBeGreaterThan(150);
    });
  });

  describe('Metrics and Analytics', () => {
    it('should track basic metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'safe'
            }
          }]
        })
      });

      // Perform some checks
      await provider.check_content({ text: 'Safe content 1', strictness: 'BALANCED' });
      await provider.check_content({ text: 'Safe content 2', strictness: 'BALANCED' });

      const metrics = await provider.get_metrics();

      expect(metrics.total_checks).toBe(2);
      expect(metrics.violations_detected).toBe(0);
      expect(typeof metrics.average_latency_ms).toBe('number');
    });

    it('should track violation metrics', async () => {
      // Mock violation response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'unsafe\nS1: Violent Crimes'
            }
          }]
        })
      });

      await provider.check_content({ text: 'Violent content', strictness: 'BALANCED' });

      const metrics = await provider.get_metrics();

      expect(metrics.total_checks).toBe(1);
      expect(metrics.violations_detected).toBe(1);
      expect(metrics.category_breakdown['S1']).toBeDefined();
      expect(metrics.category_breakdown['S1'].violations).toBe(1);
    });
  });

  describe('Provider Capabilities', () => {
    it('should report correct capabilities', async () => {
      const capabilities = await provider.get_capabilities();

      expect(capabilities).toContain('content-moderation');
      expect(capabilities).toContain('real-time-scanning');
      expect(capabilities).toContain('multi-language-support');
      expect(capabilities).toContain('custom-categories');
      expect(capabilities).toContain('confidence-scoring');
    });
  });
});

describe('MultiLayerSecurityPipeline', () => {
  let pipeline: MultiLayerSecurityPipeline;
  let mockProvider: LlamaGuard3Provider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);

    const config = createBasicSecurityConfig('test-api-key');
    mockProvider = new LlamaGuard3Provider(config);

    pipeline = new MultiLayerSecurityPipeline({
      layers: [
        {
          id: 'llama-guard-3',
          name: 'Llama Guard 3',
          provider: mockProvider,
          enabled: true,
          priority: 100,
          weight: 1.0,
          timeout_ms: 10,
        },
      ],
      fallback_action: 'BLOCK',
      max_total_latency_ms: 20,
      allow_parallel_execution: false,
      early_termination_enabled: true,
      require_unanimous_approval: false,
      majority_threshold: 0.6,
      confidence_weight: 0.8,
      use_security_context: true,
      context_weight: 0.2,
    });
  });

  describe('Pipeline Execution', () => {
    it('should process safe content through pipeline', async () => {
      // Mock safe response
      vi.spyOn(mockProvider, 'check_content').mockResolvedValue({
        safe: true,
        violations: [],
        overall_risk: 'LOW',
        confidence: 0.95,
        processing_time_ms: 5,
        suggested_action: 'ALLOW',
      });

      const request: SecurityCheckRequest = {
        text: 'Safe content',
        strictness: 'BALANCED',
      };

      const result = await pipeline.checkContent(request);

      expect(result.final_decision).toBe('ALLOW');
      expect(result.combined_violations).toHaveLength(0);
      expect(result.overall_confidence).toBe(0.95);
      expect(result.layer_results['llama-guard-3']).toBeDefined();
    });

    it('should block unsafe content', async () => {
      // Mock unsafe response
      vi.spyOn(mockProvider, 'check_content').mockResolvedValue({
        safe: false,
        violations: [{
          type: 'S4',
          category: 'Child Exploitation',
          severity: 'CRITICAL',
          confidence: 0.98,
          description: 'Child exploitation content detected',
        }],
        overall_risk: 'CRITICAL',
        confidence: 0.98,
        processing_time_ms: 8,
        suggested_action: 'BLOCK',
      });

      const request: SecurityCheckRequest = {
        text: 'Harmful content',
        strictness: 'STRICT',
      };

      const result = await pipeline.checkContent(request);

      expect(result.final_decision).toBe('BLOCK');
      expect(result.combined_violations).toHaveLength(1);
      expect(result.combined_violations[0].type).toBe('S4');
      expect(result.combined_violations[0].severity).toBe('CRITICAL');
    });

    it('should handle layer timeouts gracefully', async () => {
      // Mock timeout error
      vi.spyOn(mockProvider, 'check_content').mockRejectedValue(new Error('Layer timeout'));

      const request: SecurityCheckRequest = {
        text: 'Test content',
        strictness: 'BALANCED',
      };

      const result = await pipeline.checkContent(request);

      // Should fall back to configured action
      expect(result.final_decision).toBe('BLOCK');
      expect(result.decision_rationale).toContain('Pipeline failed');
    });

    it('should support early termination on critical violations', async () => {
      // Configure pipeline with early termination
      const earlyTerminationPipeline = new MultiLayerSecurityPipeline({
        layers: [
          {
            id: 'layer1',
            name: 'Layer 1',
            provider: mockProvider,
            enabled: true,
            priority: 100,
            weight: 0.5,
            timeout_ms: 10,
          },
          {
            id: 'layer2',
            name: 'Layer 2', 
            provider: mockProvider,
            enabled: true,
            priority: 90,
            weight: 0.5,
            timeout_ms: 10,
          },
        ],
        fallback_action: 'BLOCK',
        max_total_latency_ms: 20,
        allow_parallel_execution: false,
        early_termination_enabled: true,
        require_unanimous_approval: false,
        majority_threshold: 0.6,
        confidence_weight: 0.8,
        use_security_context: false,
        context_weight: 0,
      });

      // Mock critical violation from first layer
      const checkContentSpy = vi.spyOn(mockProvider, 'check_content');
      checkContentSpy.mockResolvedValueOnce({
        safe: false,
        violations: [{
          type: 'S4',
          category: 'Child Exploitation',
          severity: 'CRITICAL',
          confidence: 0.95,
          description: 'Critical violation',
        }],
        overall_risk: 'CRITICAL',
        confidence: 0.95,
        processing_time_ms: 5,
        suggested_action: 'BLOCK',
      });

      const request: SecurityCheckRequest = {
        text: 'Critical violation content',
        strictness: 'STRICT',
      };

      const result = await earlyTerminationPipeline.checkContent(request);

      // Should terminate early and not call second layer
      expect(result.final_decision).toBe('BLOCK');
      expect(checkContentSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layer Management', () => {
    it('should add and remove layers', () => {
      const stats = pipeline.getStatistics();
      expect(stats.total_layers).toBe(1);
      expect(stats.enabled_layers).toBe(1);

      // Add another layer
      pipeline.addLayer({
        id: 'custom-layer',
        name: 'Custom Layer',
        provider: mockProvider,
        enabled: true,
        priority: 50,
        weight: 0.5,
        timeout_ms: 15,
      });

      const updatedStats = pipeline.getStatistics();
      expect(updatedStats.total_layers).toBe(2);
      expect(updatedStats.enabled_layers).toBe(2);

      // Remove layer
      pipeline.removeLayer('custom-layer');

      const finalStats = pipeline.getStatistics();
      expect(finalStats.total_layers).toBe(1);
      expect(finalStats.enabled_layers).toBe(1);
    });

    it('should update layer configuration', () => {
      pipeline.updateLayerConfig('llama-guard-3', { enabled: false });
      
      const stats = pipeline.getStatistics();
      expect(stats.enabled_layers).toBe(0);
    });
  });
});

describe('Security Configuration', () => {
  describe('Config Creation', () => {
    it('should create basic security config', () => {
      const config = createBasicSecurityConfig('test-key');

      expect(config.api_key).toBe('test-key');
      expect(config.model_version).toBe('3.1');
      expect(config.timeout_ms).toBe(10);
      expect(config.enabled_categories).toContain('S1');
      expect(config.enabled_categories).toContain('S4');
    });

    it('should create high security config with stricter settings', () => {
      const config = createHighSecurityConfig('test-key');

      expect(config.timeout_ms).toBe(20);
      expect(config.retry_attempts).toBe(3);
      expect(config.threshold_overrides).toBeDefined();
      expect(config.threshold_overrides?.['S4']).toBe(0.9);
    });

    it('should validate security configuration', () => {
      const validConfig = {
        model_endpoint: 'https://api.example.com',
        api_key: 'test-key',
        timeout_ms: 10,
        max_concurrent_requests: 5,
      };

      expect(validateSecurityConfig(validConfig)).toBe(true);

      const invalidConfig = {
        timeout_ms: 0,
        max_concurrent_requests: -1,
      };

      expect(validateSecurityConfig(invalidConfig)).toBe(false);
    });
  });

  describe('Custom Rules', () => {
    it('should create common security rules', () => {
      const rules = createCommonSecurityRules();

      expect(rules).toHaveLength(4);
      expect(rules[0].id).toBe('profanity-filter');
      expect(rules[1].id).toBe('pii-detector');
      expect(rules[2].id).toBe('phone-number');
      expect(rules[3].id).toBe('email-address');
    });

    it('should validate custom rule patterns', () => {
      const rules = createCommonSecurityRules();
      const profanityRule = rules[0];

      expect(profanityRule.pattern).toBeInstanceOf(RegExp);
      
      // Test pattern matching
      const testText = 'This contains a bad word: damn';
      const matches = testText.match(profanityRule.pattern as RegExp);
      expect(matches).toBeTruthy();
    });
  });

  describe('Security Policies', () => {
    it('should provide default security policy', () => {
      expect(DEFAULT_SECURITY_POLICY.violation_thresholds['S4']).toBe(0.95);
      expect(DEFAULT_SECURITY_POLICY.response_actions['S4']).toBe('BLOCK');
      expect(DEFAULT_SECURITY_POLICY.response_actions['S5']).toBe('FLAG');
    });
  });
});

describe('Error Handling', () => {
  it('should handle security errors correctly', async () => {
    const config = createBasicSecurityConfig('invalid-key');
    const provider = new LlamaGuard3Provider(config);

    // Mock API error
    mockFetch.mockRejectedValue({
      status: 401,
      statusText: 'Unauthorized'
    });

    const request: SecurityCheckRequest = {
      text: 'Test content',
      strictness: 'BALANCED',
    };

    await expect(provider.check_content(request)).rejects.toThrow();
  });

  it('should handle network timeouts', async () => {
    const config = createBasicSecurityConfig('test-key');
    config.timeout_ms = 1; // Very short timeout
    const provider = new LlamaGuard3Provider(config);

    // Mock slow response
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'safe' } }] })
        }), 100)
      )
    );

    const request: SecurityCheckRequest = {
      text: 'Test content',
      max_latency_ms: 1,
    };

    await expect(provider.check_content(request)).rejects.toThrow();
  });
});

describe('Integration Scenarios', () => {
  it('should handle real-world content examples', async () => {
    const config = createBasicSecurityConfig('test-key');
    const provider = new LlamaGuard3Provider(config);

    // Test cases with expected outcomes
    const testCases = [
      {
        text: 'Hello, how can I help you today?',
        expected: true,
        description: 'Friendly greeting'
      },
      {
        text: 'Can you help me write a professional email?',
        expected: true,
        description: 'Professional assistance request'
      },
      {
        text: 'What is the weather like today?',
        expected: true,
        description: 'General information request'
      },
    ];

    // Mock safe responses for all test cases
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'safe'
          }
        }]
      })
    });

    for (const testCase of testCases) {
      const result = await provider.check_content({
        text: testCase.text,
        strictness: 'BALANCED',
      });

      expect(result.safe).toBe(testCase.expected);
    }
  });
});