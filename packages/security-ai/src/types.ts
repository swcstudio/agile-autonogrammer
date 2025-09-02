/**
 * Security AI Types
 * 
 * Comprehensive type definitions for Red Team, Purple Team, and Green Hat security operations
 */

// Core Security Types

export interface VulnerabilityReport {
  scanId: string;
  timestamp: string;
  language: string;
  vulnerabilities: Vulnerability[];
  riskScore: number;
  recommendations: string[];
  complianceStatus: ComplianceStatus;
  scanMetadata?: ScanMetadata;
}

export interface Vulnerability {
  type: string;
  cwe_id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  lines: number[];
  description: string;
  poc: string; // Proof of Concept
  remediation: string;
  cvss_score?: number;
  references?: string[];
  tags?: string[];
}

export interface ScanMetadata {
  scanDuration: number;
  timestamp: string;
  katalystVersion: string;
  aiModel: string;
  redTeamMode: boolean;
  purpleTeamMode?: boolean;
  greenHatMode?: boolean;
}

export interface ComplianceStatus {
  compliant: boolean;
  standards: {
    'PCI-DSS'?: boolean;
    'HIPAA'?: boolean;
    'GDPR'?: boolean;
    'SOC2'?: boolean;
    'ISO27001'?: boolean;
    'NIST'?: boolean;
    'OWASP'?: boolean;
    [key: string]: boolean | undefined;
  };
}

// Purple Team Types

export interface AttackSimulationResult {
  simulationId: string;
  timestamp: string;
  target: AttackTarget;
  attackVectors: AttackVector[];
  results: AttackResult[];
  defenseAnalysis: DefenseAnalysis;
  recommendations: string[];
  metrics: AttackMetrics;
}

export interface AttackTarget {
  type: 'api' | 'web' | 'network' | 'application' | 'infrastructure';
  endpoint?: string;
  parameters?: Record<string, any>;
  authentication?: AuthenticationConfig;
  environment?: 'development' | 'staging' | 'production' | 'testing';
}

export interface AttackVector {
  id: string;
  type: string;
  payload: string;
  technique: string;
  mitreId?: string; // MITRE ATT&CK framework
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  automated: boolean;
}

export interface AttackResult {
  vectorId: string;
  success: boolean;
  response: any;
  detection: boolean;
  responseTime: number;
  evidence: string[];
  impact: AttackImpact;
}

export interface AttackImpact {
  confidentiality: 'High' | 'Medium' | 'Low' | 'None';
  integrity: 'High' | 'Medium' | 'Low' | 'None';
  availability: 'High' | 'Medium' | 'Low' | 'None';
  scope: 'Changed' | 'Unchanged';
}

export interface DefenseAnalysis {
  detectionRate: number;
  preventionRate: number;
  responseTime: number;
  weaknesses: DefenseWeakness[];
  strengths: DefenseStrength[];
  recommendations: DefenseRecommendation[];
}

export interface DefenseWeakness {
  category: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  exploited: boolean;
}

export interface DefenseStrength {
  category: string;
  description: string;
  effectiveness: number; // 0-100
}

export interface DefenseRecommendation {
  priority: 'Immediate' | 'High' | 'Medium' | 'Low';
  category: string;
  action: string;
  estimated_effort: string;
  expected_impact: string;
}

export interface AttackMetrics {
  totalVectors: number;
  successfulVectors: number;
  detectedVectors: number;
  averageResponseTime: number;
  totalDuration: number;
  riskScore: number;
}

// Green Hat Types

export interface EthicalHackingResponse {
  sessionId: string;
  methodology: string;
  educationalContent: string;
  testingScripts: TestingScript[];
  complianceChecklist: ComplianceCheckItem[];
  legalNotice: string;
  responsibleDisclosure: string;
  learningResources: LearningResource[];
}

export interface TestingScript {
  name: string;
  description: string;
  language: string;
  code: string;
  safetyLevel: 'Safe' | 'Caution' | 'Restricted';
  prerequisites: string[];
  expectedOutput: string;
}

export interface ComplianceCheckItem {
  id: string;
  description: string;
  completed: boolean;
  required: boolean;
  notes?: string;
}

export interface LearningResource {
  title: string;
  type: 'article' | 'video' | 'course' | 'tool' | 'documentation';
  url: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

// Threat Detection Types

export interface ThreatDetectionResult {
  detectionId: string;
  timestamp: string;
  threatScore: number;
  threatLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
  indicators: ThreatIndicator[];
  recommendations: string[];
  automated_actions: AutomatedAction[];
  context: ThreatContext;
}

export interface ThreatIndicator {
  id: string;
  type: string;
  confidence: number; // 0-100
  description: string;
  evidence: any;
  mitreId?: string;
  killChainPhase?: string;
}

export interface AutomatedAction {
  action: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  description: string;
  timestamp: string;
}

export interface ThreatContext {
  source: string;
  environment: string;
  user?: UserContext;
  network?: NetworkContext;
  system?: SystemContext;
}

export interface UserContext {
  id?: string;
  role?: string;
  permissions?: string[];
  lastActivity?: string;
}

export interface NetworkContext {
  sourceIp?: string;
  userAgent?: string;
  geolocation?: string;
  isp?: string;
}

export interface SystemContext {
  os?: string;
  browser?: string;
  timezone?: string;
  language?: string;
}

// Security Audit Types

export interface SecurityAuditReport {
  auditId: string;
  timestamp: string;
  scope: AuditScope;
  summary: AuditSummary;
  findings: AuditFindings;
  recommendations: string[];
  remediationPlan: RemediationPlan;
  compliance: ComplianceAssessment;
}

export interface AuditScope {
  codebase: boolean;
  dependencies: boolean;
  configuration: boolean;
  infrastructure: boolean;
  secrets: boolean;
}

export interface AuditSummary {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  riskScore: number;
  complianceScore: number;
}

export interface AuditFindings {
  staticAnalysis: StaticAnalysisResult;
  dependencyAudit: DependencyAuditResult;
  secretsDetection: SecretsDetectionResult;
  configurationAudit: ConfigurationAuditResult;
  complianceCheck: ComplianceCheckResult;
}

export interface StaticAnalysisResult {
  issues: SecurityIssue[];
  codeQualityScore: number;
  securityScore: number;
  maintainabilityScore: number;
}

export interface DependencyAuditResult {
  vulnerableDependencies: VulnerableDependency[];
  outdatedPackages: OutdatedPackage[];
  licenseIssues: LicenseIssue[];
  riskScore: number;
}

export interface SecretsDetectionResult {
  detectedSecrets: DetectedSecret[];
  highRiskSecrets: DetectedSecret[];
  falsePositives: DetectedSecret[];
}

export interface ConfigurationAuditResult {
  misconfigurations: SecurityMisconfiguration[];
  securityHeaders: SecurityHeaderAnalysis;
  accessControls: AccessControlAnalysis;
}

export interface ComplianceCheckResult {
  standards: ComplianceStandardResult[];
  overallScore: number;
  criticalGaps: ComplianceGap[];
}

export interface SecurityIssue {
  id: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  file: string;
  line: number;
  column?: number;
  description: string;
  recommendation: string;
  cweId?: string;
  owasp?: string;
}

export interface VulnerableDependency {
  name: string;
  version: string;
  vulnerabilities: DependencyVulnerability[];
  fixAvailable: boolean;
  recommendedVersion?: string;
}

export interface DependencyVulnerability {
  id: string;
  severity: string;
  title: string;
  description: string;
  cvssScore: number;
  references: string[];
}

export interface OutdatedPackage {
  name: string;
  currentVersion: string;
  latestVersion: string;
  securityRisk: 'High' | 'Medium' | 'Low';
}

export interface LicenseIssue {
  dependency: string;
  license: string;
  issue: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface DetectedSecret {
  type: string;
  file: string;
  line: number;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  masked_value?: string;
}

export interface SecurityMisconfiguration {
  type: string;
  file: string;
  description: string;
  recommendation: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface SecurityHeaderAnalysis {
  present: string[];
  missing: string[];
  misconfigured: string[];
  score: number;
}

export interface AccessControlAnalysis {
  authenticationMechanisms: string[];
  authorizationIssues: string[];
  privilegeEscalationRisks: string[];
  score: number;
}

export interface ComplianceStandardResult {
  standard: string;
  score: number;
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  description: string;
  status: 'Met' | 'Partial' | 'Not Met';
  evidence?: string;
}

export interface ComplianceGap {
  standard: string;
  requirement: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  remediation: string;
}

export interface ComplianceAssessment {
  pcidss?: ComplianceStandardResult;
  hipaa?: ComplianceStandardResult;
  gdpr?: ComplianceStandardResult;
  soc2?: ComplianceStandardResult;
  iso27001?: ComplianceStandardResult;
}

// Remediation Types

export interface RemediationPlan {
  immediate: RemediationTask[];
  shortTerm: RemediationTask[];
  longTerm: RemediationTask[];
  estimated_effort: string;
  estimated_cost?: string;
}

export interface RemediationTask {
  id: string;
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  effort: string;
  timeline: string;
  resources: string[];
  dependencies?: string[];
  status?: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
}

// Configuration Types

export interface SecurityConfig {
  redTeamMode: boolean;
  purpleTeamMode: boolean;
  greenHatMode: boolean;
  complianceStandards: string[];
  severityThreshold: 'Critical' | 'High' | 'Medium' | 'Low';
  includeProofOfConcept: boolean;
  autoRemediation: boolean;
  realTimeScanning: boolean;
}

export interface AuthenticationConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth' | 'apikey';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

// Security Metrics

export interface SecurityMetrics {
  totalScans: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  averageScanTime: number;
  lastScan: number;
  riskTrend: 'Improving' | 'Stable' | 'Degrading';
  complianceScore: number;
  threatLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
}

// API Types

export interface SecurityScanRequest {
  code: string;
  language: string;
  options?: SecurityConfig;
}

export interface SecurityScanResponse {
  success: boolean;
  report?: VulnerabilityReport;
  error?: string;
  requestId: string;
}

export interface ThreatDetectionRequest {
  source: string;
  data: any;
  context: Record<string, any>;
}

export interface AttackSimulationRequest {
  target: AttackTarget;
  vectors?: AttackVector[];
  options?: {
    automated: boolean;
    realTime: boolean;
    includeDefenseAnalysis: boolean;
  };
}

export interface EthicalHackingRequest {
  topic: string;
  scope: string;
  objective: string;
  authorization: string;
  experience_level: 'Beginner' | 'Intermediate' | 'Advanced';
}

// Event Types

export interface SecurityEvent {
  id: string;
  type: string;
  timestamp: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  description: string;
  source: string;
  data: any;
  handled: boolean;
}

// Error Types

export interface SecurityError extends Error {
  code: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  context?: any;
  timestamp: string;
}

// Store Types

export interface SecurityState {
  currentScan?: VulnerabilityReport;
  scanHistory: VulnerabilityReport[];
  threatLevel: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
  metrics: SecurityMetrics;
  events: SecurityEvent[];
  config: SecurityConfig;
}

export interface ThreatIntelligenceState {
  indicators: ThreatIndicator[];
  campaigns: ThreatCampaign[];
  actors: ThreatActor[];
  lastUpdated: string;
}

export interface ThreatCampaign {
  id: string;
  name: string;
  description: string;
  actors: string[];
  techniques: string[];
  indicators: string[];
  active: boolean;
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  capabilities: string[];
  targets: string[];
  attribution: string;
}

// Additional Green Hat Types

export interface SecurityLearningModule {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  completionRate: number;
  tags: string[];
  objectives: string[];
  content: LearningModuleContent[];
}

export interface LearningModuleContent {
  title: string;
  type: 'video' | 'interactive' | 'hands-on' | 'tutorial' | 'theory' | 'practical' | 'workshop';
  duration: string;
}

export interface EthicalHackingScenario {
  id: string;
  name: string;
  description: string;
  targetEnvironment: string;
  riskLevel: 'low' | 'medium' | 'high';
  learningGoals: string[];
  tools: string[];
  expectedOutcome: string;
}

export interface SecurityChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  attempts: number;
  hints: number;
  categories: string[];
  timeLimit: number; // in seconds
  environment: string;
  solution: ChallengeSolutionConfig;
}

export interface ChallengeSolutionConfig {
  type: 'payload' | 'data_extraction' | 'root_access' | 'key_recovery' | 'flag_extraction';
  validation: string;
}

export interface ChallengeSolution {
  type: string;
  payload?: string;
  answer?: string;
  steps?: string[];
  explanation?: string;
}

export interface DefensiveTechnique {
  id: string;
  name: string;
  category: string;
  description: string;
  implementation: string;
  effectiveness: number; // 0-100
  complexity: 'low' | 'medium' | 'high';
  tools: string[];
  references: string[];
}

export interface HackingScenarioResult {
  scenarioId: string;
  startTime: number;
  endTime: number;
  success: boolean;
  findings: ScenarioFinding[];
  toolsUsed: string[];
  learningOutcomes: LearningOutcome[];
}

export interface ScenarioFinding {
  severity: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  location: string;
  evidence: string;
  remediation: string;
}

export interface LearningOutcome {
  objective: string;
  achieved: boolean;
  notes: string;
}

export interface LearningProgress {
  moduleId: string;
  startedAt: number;
  progress: number; // 0-100
  completedSections: string[];
  currentSection: string;
}