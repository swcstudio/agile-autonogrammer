/**
 * AI Security and Content Moderation Types
 * Comprehensive type definitions for Llama Guard 3 integration
 */

import { InferenceRequest, InferenceResponse } from '@agile/ai-core';

// Core Security Categories (Llama Guard 3 Standard)
export type SecurityViolationType = 
  | 'S1' // Violent Crimes
  | 'S2' // Non-Violent Crimes  
  | 'S3' // Sex Crimes
  | 'S4' // Child Exploitation
  | 'S5' // Specialized Advice (Financial, Medical, Legal)
  | 'S6' // Privacy
  | 'S7' // Intellectual Property
  | 'S8' // Indiscriminate Weapons
  | 'S9' // Hate
  | 'S10' // Self-Harm
  | 'S11' // Sexual Content
  | 'S12' // Elections
  | 'S13' // Code Interpreter Abuse
  | 'CUSTOM'; // Custom organization-specific rules

export interface SecurityViolation {
  type: SecurityViolationType;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-1
  description: string;
  detected_text?: string;
  suggestion?: string;
}

export interface SecurityCheckRequest {
  // Content to check
  text: string;
  context?: {
    conversation_id?: string;
    user_id?: string;
    session_metadata?: Record<string, any>;
  };
  
  // Check configuration
  categories?: SecurityViolationType[];
  strictness?: 'PERMISSIVE' | 'BALANCED' | 'STRICT';
  include_explanations?: boolean;
  max_latency_ms?: number;
  
  // Custom rules
  custom_rules?: CustomSecurityRule[];
}

export interface SecurityCheckResult {
  safe: boolean;
  violations: SecurityViolation[];
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-1
  processing_time_ms: number;
  
  // Additional context
  flagged_segments?: Array<{
    text: string;
    start: number;
    end: number;
    violation_types: SecurityViolationType[];
  }>;
  
  // Recommendations
  suggested_action: 'ALLOW' | 'FLAG' | 'BLOCK' | 'ESCALATE';
  alternative_response?: string;
}

// Multi-layer Security Pipeline
export interface SecurityLayer {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  check: (request: SecurityCheckRequest) => Promise<SecurityCheckResult>;
}

export interface MultiLayerSecurityResult {
  final_decision: 'ALLOW' | 'BLOCK' | 'FLAG';
  layer_results: Record<string, SecurityCheckResult>;
  combined_violations: SecurityViolation[];
  overall_confidence: number;
  total_processing_time_ms: number;
  decision_rationale: string;
}

// Custom Security Rules
export interface CustomSecurityRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  action: 'BLOCK' | 'FLAG' | 'WARN';
  severity: SecurityViolation['severity'];
  category: string;
}

// Real-time Security Monitoring
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'VIOLATION_DETECTED' | 'POLICY_UPDATED' | 'THRESHOLD_EXCEEDED' | 'MANUAL_REVIEW';
  severity: SecurityViolation['severity'];
  data: Record<string, any>;
  user_id?: string;
  session_id?: string;
}

export interface SecurityMetrics {
  total_checks: number;
  violations_detected: number;
  false_positives: number;
  false_negatives: number;
  average_latency_ms: number;
  accuracy_rate: number;
  throughput_per_second: number;
  
  // Per-category metrics
  category_breakdown: Record<SecurityViolationType, {
    checks: number;
    violations: number;
    avg_confidence: number;
  }>;
}

// Llama Guard 3 Specific Configuration
export interface LlamaGuard3Config {
  model_endpoint: string;
  api_key?: string;
  model_version: '3.0' | '3.1' | 'latest';
  
  // Performance settings
  timeout_ms: number;
  max_concurrent_requests: number;
  retry_attempts: number;
  
  // Security settings
  enabled_categories: SecurityViolationType[];
  custom_taxonomy?: Record<string, string>;
  threshold_overrides?: Partial<Record<SecurityViolationType, number>>;
}

// Content Moderation Pipeline
export interface ModerationPipeline {
  id: string;
  name: string;
  layers: SecurityLayer[];
  fallback_action: 'ALLOW' | 'BLOCK';
  escalation_threshold: number;
}

// Enhanced AI Request with Security
export interface SecureInferenceRequest extends InferenceRequest {
  security?: {
    enable_content_check?: boolean;
    enable_response_check?: boolean;
    strictness?: SecurityCheckRequest['strictness'];
    custom_rules?: CustomSecurityRule[];
    bypass_cache?: boolean;
  };
}

export interface SecureInferenceResponse extends InferenceResponse {
  security?: {
    input_check: SecurityCheckResult;
    output_check?: SecurityCheckResult;
    overall_safe: boolean;
    actions_taken: string[];
  };
}

// Security Context Manager
export interface SecurityContext {
  user_id?: string;
  session_id?: string;
  organization_id?: string;
  risk_profile: 'LOW' | 'MEDIUM' | 'HIGH';
  previous_violations: SecurityViolation[];
  trust_score: number; // 0-1
  moderation_history: Array<{
    timestamp: Date;
    action: string;
    reason: string;
  }>;
}

// Real-time Scanning
export interface RealtimeScanOptions {
  enable_streaming_scan?: boolean;
  chunk_size?: number;
  scan_frequency_ms?: number;
  early_termination?: boolean;
}

export interface StreamingScanResult {
  chunk_id: string;
  is_safe: boolean;
  violations: SecurityViolation[];
  should_terminate: boolean;
  cumulative_risk: SecurityViolation['severity'];
}

// Security Policy Management
export interface SecurityPolicy {
  id: string;
  name: string;
  version: string;
  effective_date: Date;
  
  // Policy rules
  violation_thresholds: Partial<Record<SecurityViolationType, number>>;
  response_actions: Partial<Record<SecurityViolationType, 'ALLOW' | 'FLAG' | 'BLOCK'>>;
  escalation_rules: Array<{
    condition: string;
    action: 'NOTIFY' | 'ESCALATE' | 'AUTO_BLOCK';
    recipients?: string[];
  }>;
  
  // Compliance settings
  audit_logging: boolean;
  data_retention_days: number;
  anonymize_logs: boolean;
}

// Security Analytics
export interface SecurityAnalytics {
  // Trend analysis
  violation_trends: Array<{
    date: Date;
    category: SecurityViolationType;
    count: number;
    severity_distribution: Record<SecurityViolation['severity'], number>;
  }>;
  
  // Performance analysis
  performance_metrics: SecurityMetrics;
  
  // Risk assessment
  risk_indicators: Array<{
    indicator: string;
    value: number;
    threshold: number;
    status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  }>;
  
  // Compliance reporting
  compliance_score: number;
  policy_adherence: Record<string, number>;
}

// Integration Types
export interface SecurityServiceProvider {
  id: string;
  name: string;
  type: 'LLAMA_GUARD' | 'OPENAI_MODERATION' | 'PERSPECTIVE_API' | 'CUSTOM';
  check_content: (request: SecurityCheckRequest) => Promise<SecurityCheckResult>;
  get_capabilities: () => Promise<string[]>;
  get_metrics: () => Promise<SecurityMetrics>;
}

// Error Types
export interface SecurityError extends Error {
  code: 'TIMEOUT' | 'API_ERROR' | 'INVALID_REQUEST' | 'QUOTA_EXCEEDED' | 'UNKNOWN';
  details?: Record<string, any>;
  retriable: boolean;
}

// Hook Configuration Types
export interface UseSecurityOptions {
  // Core settings
  enable_input_checking?: boolean;
  enable_output_checking?: boolean;
  enable_realtime_scanning?: boolean;
  
  // Performance
  max_latency_ms?: number;
  cache_results?: boolean;
  cache_ttl_seconds?: number;
  
  // Policy
  default_policy?: string;
  strictness?: SecurityCheckRequest['strictness'];
  custom_rules?: CustomSecurityRule[];
  
  // Integration
  providers?: string[];
  fallback_provider?: string;
  
  // Monitoring
  enable_analytics?: boolean;
  log_violations?: boolean;
}

export interface UseSecurityReturn {
  // Core security functions
  checkContent: (content: string, options?: Partial<SecurityCheckRequest>) => Promise<SecurityCheckResult>;
  checkInference: (request: SecureInferenceRequest) => Promise<SecureInferenceResponse>;
  
  // Real-time scanning
  startRealtimeScan: (content: string, options?: RealtimeScanOptions) => Promise<AsyncIterable<StreamingScanResult>>;
  stopRealtimeScan: () => void;
  
  // State
  isEnabled: boolean;
  isInitialized: boolean;
  currentPolicy: SecurityPolicy | null;
  metrics: SecurityMetrics | null;
  
  // Configuration
  updatePolicy: (policy: SecurityPolicy) => Promise<void>;
  addCustomRule: (rule: CustomSecurityRule) => void;
  removeCustomRule: (ruleId: string) => void;
  
  // Analytics
  getAnalytics: (timeRange?: { start: Date; end: Date }) => Promise<SecurityAnalytics>;
  exportViolations: (format: 'JSON' | 'CSV') => Promise<string>;
  
  // Status
  loading: boolean;
  error: SecurityError | null;
  lastCheck?: Date;
}

// Configuration Schema Types
export interface SecurityConfiguration {
  // Core settings
  enabled: boolean;
  default_strictness: SecurityCheckRequest['strictness'];
  max_latency_tolerance_ms: number;
  
  // Providers
  primary_provider: string;
  fallback_providers: string[];
  provider_configs: Record<string, any>;
  
  // Policies
  active_policy_id: string;
  policies: SecurityPolicy[];
  
  // Monitoring
  analytics_enabled: boolean;
  audit_logging: boolean;
  alert_thresholds: Record<string, number>;
  
  // Integration
  webhook_urls: string[];
  notification_channels: Array<{
    type: 'EMAIL' | 'SLACK' | 'WEBHOOK';
    config: Record<string, any>;
  }>;
}

// Type Guards
export const isSecurityViolationType = (value: string): value is SecurityViolationType => {
  return ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'CUSTOM'].includes(value);
};

export const isSecurityCheckResult = (obj: any): obj is SecurityCheckResult => {
  return obj && typeof obj.safe === 'boolean' && Array.isArray(obj.violations);
};

export const isSecurityError = (error: any): error is SecurityError => {
  return error && error.code && typeof error.retriable === 'boolean';
};