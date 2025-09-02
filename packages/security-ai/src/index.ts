/**
 * Katalyst Security AI Components
 * 
 * Production-ready security testing components for Red Team, Purple Team, and Green Hat initiatives
 * Leverages Cloudflare AI and Katalyst's multithreading for high-performance security analysis
 */

// Core Security Components
export { VulnerabilityScanner } from './components/VulnerabilityScanner';
export { ThreatDetector } from './components/ThreatDetector';
export { SecurityAuditDashboard } from './components/SecurityAuditDashboard';
export { PurpleTeamSimulator } from './components/PurpleTeamSimulator';
export { default as GreenHatUtilities } from './components/GreenHatUtilities';
export { GreenHatToolkit } from './components/GreenHatToolkit';

// Security Hooks
export { useVulnerabilityScanner } from './hooks/useVulnerabilityScanner';
export { useThreatDetection } from './hooks/useThreatDetection';
export { useSecurityAudit } from './hooks/useSecurityAudit';
export { usePurpleTeam } from './hooks/usePurpleTeam';
export { default as useGreenHatUtilities } from './hooks/useGreenHatUtilities';
export { useEthicalHacking } from './hooks/useEthicalHacking';

// Security Stores
export { useSecurityStore } from './stores/securityStore';
export { useThreatIntelligenceStore } from './stores/threatIntelligenceStore';

// Security Utilities
export { SecurityAnalyzer } from './utils/SecurityAnalyzer';
export { ThreatIntelligence } from './utils/ThreatIntelligence';
export { ComplianceChecker } from './utils/ComplianceChecker';
export { RemediationEngine } from './utils/RemediationEngine';

// Types
export type {
  VulnerabilityReport,
  ThreatDetectionResult,
  SecurityAuditReport,
  AttackSimulationResult,
  EthicalHackingResponse,
  SecurityMetrics,
  ComplianceStatus,
  RemediationPlan,
  SecurityLearningModule,
  EthicalHackingScenario,
  SecurityChallenge,
  DefensiveTechnique,
  HackingScenarioResult,
  ChallengeSolution,
  LearningProgress
} from './types';

// Security AI Service Client
export { SecurityAIClient } from './client/SecurityAIClient';

// Constants
export { SECURITY_MODELS, THREAT_LEVELS, COMPLIANCE_STANDARDS } from './constants';