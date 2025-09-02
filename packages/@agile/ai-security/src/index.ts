/**
 * @agile/ai-security
 * AI Security and Content Moderation with Llama Guard 3
 * 
 * Provides comprehensive content moderation capabilities with:
 * - Llama Guard 3 integration for 99%+ harmful content detection
 * - Multi-layer security pipeline for comprehensive protection
 * - <10ms overhead for real-time applications
 * - React hooks for seamless integration
 * - Real-time scanning and streaming analysis
 * - Custom security rules and policies
 * - Analytics and compliance reporting
 */

// Core Types
export type {
  SecurityViolationType,
  SecurityViolation,
  SecurityCheckRequest,
  SecurityCheckResult,
  SecurityLayer,
  MultiLayerSecurityResult,
  CustomSecurityRule,
  SecurityEvent,
  SecurityMetrics,
  LlamaGuard3Config,
  ModerationPipeline,
  SecureInferenceRequest,
  SecureInferenceResponse,
  SecurityContext,
  RealtimeScanOptions,
  StreamingScanResult,
  SecurityPolicy,
  SecurityAnalytics,
  SecurityServiceProvider,
  SecurityError,
  UseSecurityOptions,
  UseSecurityReturn,
} from './types/security';

// Security Providers
export { LlamaGuard3Provider } from './security/LlamaGuard3Provider';
export { MultiLayerSecurityPipeline } from './security/MultiLayerSecurityPipeline';

// React Hooks
export { useSecurity } from './hooks/useSecurity';

// Integration Layer
export { 
  createSecureInference,
  addSecurityToInference,
  isSecureInferenceResponse,
  getSecuritySummary,
} from './integration/SecureInferenceIntegration';

export type {
  SecureInferenceOptions,
  SecureInferenceReturn,
} from './integration/SecureInferenceIntegration';

// Type Guards and Utilities
export {
  isSecurityViolationType,
  isSecurityCheckResult,
  isSecurityError,
} from './types/security';

// Re-export commonly used types for convenience
export type { InferenceRequest, InferenceResponse } from '@agile/ai-core';

// Version and metadata
export const VERSION = '1.0.0';
export const SUPPORTED_LLAMA_GUARD_VERSIONS = ['3.0', '3.1'] as const;
export const DEFAULT_MAX_LATENCY_MS = 10;
export const DEFAULT_SECURITY_STRICTNESS = 'BALANCED';

// Default configurations
export const DEFAULT_LLAMA_GUARD_CONFIG = {
  model_version: '3.1' as const,
  timeout_ms: DEFAULT_MAX_LATENCY_MS,
  max_concurrent_requests: 10,
  retry_attempts: 2,
  enabled_categories: [
    'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 
    'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13'
  ] as SecurityViolationType[],
};

export const DEFAULT_SECURITY_POLICY = {
  violation_thresholds: {
    'S1': 0.8,  // Violent Crimes
    'S2': 0.7,  // Non-Violent Crimes
    'S3': 0.9,  // Sex Crimes
    'S4': 0.95, // Child Exploitation
    'S5': 0.6,  // Specialized Advice
    'S6': 0.7,  // Privacy
    'S7': 0.8,  // Intellectual Property
    'S8': 0.9,  // Indiscriminate Weapons
    'S9': 0.8,  // Hate
    'S10': 0.85, // Self-Harm
    'S11': 0.75, // Sexual Content
    'S12': 0.7,  // Elections
    'S13': 0.8,  // Code Interpreter Abuse
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
} as const;

// Utility functions for common use cases

/**
 * Create a basic security configuration for getting started
 */
export function createBasicSecurityConfig(apiKey?: string) {
  return {
    ...DEFAULT_LLAMA_GUARD_CONFIG,
    model_endpoint: process.env.LLAMA_GUARD_ENDPOINT || 'https://api.together.xyz/v1/chat/completions',
    api_key: apiKey || process.env.TOGETHER_API_KEY,
  };
}

/**
 * Create a high-security configuration for sensitive applications
 */
export function createHighSecurityConfig(apiKey?: string) {
  return {
    ...DEFAULT_LLAMA_GUARD_CONFIG,
    model_endpoint: process.env.LLAMA_GUARD_ENDPOINT || 'https://api.together.xyz/v1/chat/completions',
    api_key: apiKey || process.env.TOGETHER_API_KEY,
    timeout_ms: 20, // Allow more time for thorough checking
    retry_attempts: 3,
    // Stricter thresholds
    threshold_overrides: {
      'S1': 0.7,
      'S3': 0.8,
      'S4': 0.9,
      'S8': 0.8,
      'S9': 0.7,
      'S10': 0.8,
    },
  };
}

/**
 * Create a performance-optimized configuration for high-throughput applications
 */
export function createPerformanceConfig(apiKey?: string) {
  return {
    ...DEFAULT_LLAMA_GUARD_CONFIG,
    model_endpoint: process.env.LLAMA_GUARD_ENDPOINT || 'https://api.together.xyz/v1/chat/completions',
    api_key: apiKey || process.env.TOGETHER_API_KEY,
    timeout_ms: 5, // Very fast response required
    max_concurrent_requests: 20,
    retry_attempts: 1,
    // Focus on critical categories only
    enabled_categories: ['S3', 'S4', 'S8', 'S10'] as SecurityViolationType[],
  };
}

/**
 * Helper to validate security configuration
 */
export function validateSecurityConfig(config: Partial<LlamaGuard3Config>): boolean {
  if (!config.model_endpoint) {
    console.error('Security config missing model_endpoint');
    return false;
  }
  
  if (!config.api_key) {
    console.warn('Security config missing api_key - this may cause authentication errors');
  }
  
  if (config.timeout_ms && config.timeout_ms < 1) {
    console.error('Security config timeout_ms must be at least 1ms');
    return false;
  }
  
  if (config.max_concurrent_requests && config.max_concurrent_requests < 1) {
    console.error('Security config max_concurrent_requests must be at least 1');
    return false;
  }
  
  return true;
}

/**
 * Helper to create common custom security rules
 */
export function createCommonSecurityRules() {
  const rules: CustomSecurityRule[] = [
    {
      id: 'profanity-filter',
      name: 'Profanity Filter',
      description: 'Block common profanity and offensive language',
      pattern: /\b(fuck|shit|damn|hell|ass|bitch|bastard)\b/gi,
      action: 'FLAG',
      severity: 'LOW',
      category: 'Profanity',
    },
    {
      id: 'pii-detector',
      name: 'PII Detector',
      description: 'Detect potential personally identifiable information',
      pattern: /\b\d{3}-\d{2}-\d{4}\b|\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      action: 'FLAG',
      severity: 'MEDIUM',
      category: 'Privacy',
    },
    {
      id: 'phone-number',
      name: 'Phone Number Detector',
      description: 'Detect phone numbers',
      pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      action: 'FLAG',
      severity: 'LOW',
      category: 'Privacy',
    },
    {
      id: 'email-address',
      name: 'Email Address Detector', 
      description: 'Detect email addresses',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      action: 'FLAG',
      severity: 'LOW',
      category: 'Privacy',
    },
  ];
  
  return rules;
}

/**
 * Helper to get security category descriptions
 */
export function getSecurityCategoryDescriptions(): Record<SecurityViolationType, string> {
  return {
    'S1': 'Violent Crimes - Content promoting or describing violent criminal activities',
    'S2': 'Non-Violent Crimes - Content related to non-violent illegal activities', 
    'S3': 'Sex Crimes - Content related to sexual crimes and non-consensual activities',
    'S4': 'Child Exploitation - Any content involving minors in harmful contexts',
    'S5': 'Specialized Advice - Unqualified medical, legal, or financial advice',
    'S6': 'Privacy - Content that violates privacy or contains personal information',
    'S7': 'Intellectual Property - Content that infringes on intellectual property rights',
    'S8': 'Indiscriminate Weapons - Content related to dangerous weapons or explosives',
    'S9': 'Hate - Hate speech, discrimination, or harassment based on protected characteristics',
    'S10': 'Self-Harm - Content promoting self-harm, suicide, or dangerous behaviors',
    'S11': 'Sexual Content - Adult sexual content inappropriate for general audiences',
    'S12': 'Elections - Misleading information about electoral processes',
    'S13': 'Code Interpreter Abuse - Malicious code or attempts to exploit systems',
    'CUSTOM': 'Custom organizational security rules and policies',
  };
}