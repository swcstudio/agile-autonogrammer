/**
 * AI Security Type Definitions
 * Types for Llama Guard 3 and content moderation systems
 */

// Content Safety Types
export type SafetyCategory = 
  | 'hate-speech'
  | 'harassment'
  | 'violence'
  | 'self-harm'
  | 'sexual-content'
  | 'dangerous-activities'
  | 'illegal-activities'
  | 'misinformation'
  | 'privacy-violation'
  | 'spam'
  | 'malware'
  | 'phishing'
  | 'jailbreak-attempt'
  | 'prompt-injection';

export type SafetyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SafetyAssessment {
  safe: boolean;
  categories: SafetyCategory[];
  scores: Record<SafetyCategory, number>;
  overallScore: number;
  level: SafetyLevel;
  explanation: string;
  recommendations: string[];
  flaggedContent: Array<{
    text: string;
    category: SafetyCategory;
    score: number;
    startIndex: number;
    endIndex: number;
  }>;
}

// Llama Guard 3 Integration
export interface LlamaGuardConfig {
  endpoint: string;
  apiKey?: string;
  model: 'llama-guard-3-8b' | 'llama-guard-3-11b';
  threshold: number;
  categories: SafetyCategory[];
  enableRealtime: boolean;
  batchSize: number;
  cacheResults: boolean;
}

export interface LlamaGuardRequest {
  content: string | string[];
  context?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface LlamaGuardResponse {
  id: string;
  assessments: SafetyAssessment[];
  overallSafe: boolean;
  processingTime: number;
  model: string;
  version: string;
  cached: boolean;
}

// Content Moderation Pipeline
export interface ModerationPipeline {
  stages: ModerationStage[];
  config: ModerationConfig;
  
  // Core Methods
  moderate(content: string): Promise<ModerationResult>;
  moderateBatch(contents: string[]): Promise<ModerationResult[]>;
  
  // Pipeline Management
  addStage(stage: ModerationStage): void;
  removeStage(stageId: string): void;
  reorderStages(stageIds: string[]): void;
  
  // Configuration
  updateConfig(config: Partial<ModerationConfig>): void;
  getConfig(): ModerationConfig;
}

export interface ModerationStage {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  
  // Stage Processing
  process(content: string, context: ModerationContext): Promise<StageResult>;
  
  // Configuration
  config: Record<string, any>;
  updateConfig(config: Record<string, any>): void;
}

export interface ModerationConfig {
  strictMode: boolean;
  blockOnFailure: boolean;
  logViolations: boolean;
  notifyAdmins: boolean;
  customRules: CustomModerationRule[];
  whitelist: string[];
  blacklist: string[];
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstSize: number;
  };
}

export interface ModerationContext {
  userId?: string;
  sessionId?: string;
  origin: 'user-input' | 'ai-output' | 'system-message';
  parentContent?: string;
  metadata: Record<string, any>;
}

export interface StageResult {
  safe: boolean;
  confidence: number;
  category?: SafetyCategory;
  reason?: string;
  suggestedAction: 'allow' | 'warn' | 'block' | 'escalate';
  metadata?: Record<string, any>;
}

export interface ModerationResult {
  safe: boolean;
  action: 'allow' | 'warn' | 'block' | 'escalate';
  confidence: number;
  violations: Array<{
    category: SafetyCategory;
    score: number;
    stage: string;
    description: string;
  }>;
  stages: Array<{
    id: string;
    name: string;
    result: StageResult;
    processingTime: number;
  }>;
  totalProcessingTime: number;
  recommendations: string[];
}

// Custom Rules Engine
export interface CustomModerationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  
  // Rule Logic
  conditions: RuleCondition[];
  action: RuleAction;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
}

export interface RuleCondition {
  type: 'regex' | 'keyword' | 'sentiment' | 'length' | 'custom';
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'greaterThan' | 'lessThan';
  value: string | number;
  caseSensitive?: boolean;
  negate?: boolean;
}

export interface RuleAction {
  type: 'allow' | 'warn' | 'block' | 'escalate' | 'transform' | 'flag';
  message?: string;
  transformFunction?: string;
  escalationLevel?: 'low' | 'medium' | 'high';
  notifyUsers?: string[];
  metadata?: Record<string, any>;
}

// Security Monitoring
export interface SecurityMonitor {
  // Event Tracking
  trackEvent(event: SecurityEvent): Promise<void>;
  getEvents(filter?: SecurityEventFilter): Promise<SecurityEvent[]>;
  
  // Anomaly Detection
  detectAnomalies(): Promise<SecurityAnomaly[]>;
  
  // Reporting
  generateReport(timeframe: SecurityTimeframe): Promise<SecurityReport>;
  
  // Alerts
  configureAlerts(config: AlertConfig[]): void;
  getActiveAlerts(): Promise<SecurityAlert[]>;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SafetyLevel;
  description: string;
  userId?: string;
  sessionId?: string;
  content?: string;
  assessment?: SafetyAssessment;
  metadata: Record<string, any>;
}

export type SecurityEventType = 
  | 'content-blocked'
  | 'content-warned'
  | 'violation-detected'
  | 'rule-triggered'
  | 'anomaly-detected'
  | 'rate-limit-exceeded'
  | 'unauthorized-access'
  | 'system-error';

export interface SecurityEventFilter {
  startDate?: Date;
  endDate?: Date;
  type?: SecurityEventType[];
  severity?: SafetyLevel[];
  userId?: string;
  category?: SafetyCategory[];
}

export interface SecurityAnomaly {
  id: string;
  detected: Date;
  type: 'unusual-pattern' | 'spike-in-violations' | 'new-attack-vector' | 'system-degradation';
  confidence: number;
  description: string;
  affectedUsers: string[];
  recommendedActions: string[];
  metadata: Record<string, any>;
}

export interface SecurityTimeframe {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface SecurityReport {
  id: string;
  generated: Date;
  timeframe: SecurityTimeframe;
  summary: {
    totalRequests: number;
    blockedRequests: number;
    warnedRequests: number;
    violationRate: number;
    topCategories: Array<{ category: SafetyCategory; count: number }>;
  };
  trends: Array<{
    date: Date;
    requests: number;
    violations: number;
    categories: Record<SafetyCategory, number>;
  }>;
  insights: string[];
  recommendations: string[];
}

export interface AlertConfig {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Array<{
    metric: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    threshold: number;
    timeWindow: number; // minutes
  }>;
  actions: Array<{
    type: 'email' | 'webhook' | 'slack' | 'sms';
    target: string;
    template?: string;
  }>;
}

export interface SecurityAlert {
  id: string;
  triggered: Date;
  config: AlertConfig;
  metric: string;
  currentValue: number;
  threshold: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Privacy Protection
export interface PrivacyConfig {
  enablePIIDetection: boolean;
  scrubPII: boolean;
  logScrubbing: boolean;
  retentionDays: number;
  encryptionKey?: string;
  anonymization: {
    enabled: boolean;
    method: 'hash' | 'tokenize' | 'mask';
    preserveFormat: boolean;
  };
}

export interface PIIDetectionResult {
  hasPII: boolean;
  entities: Array<{
    type: 'email' | 'phone' | 'ssn' | 'credit-card' | 'name' | 'address' | 'custom';
    value: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
  }>;
  scrubbedContent?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Audit Trail
export interface AuditTrail {
  log(action: AuditAction): Promise<void>;
  query(filter: AuditFilter): Promise<AuditEntry[]>;
  export(format: 'json' | 'csv' | 'pdf'): Promise<Blob>;
}

export interface AuditAction {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  outcome: 'success' | 'failure' | 'warning';
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  outcome?: 'success' | 'failure' | 'warning';
}

export interface AuditEntry extends AuditAction {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
}