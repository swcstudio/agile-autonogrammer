/**
 * usePurpleTeam Hook
 * 
 * Advanced Purple Team automation hook for attack simulation and defense validation
 * Leverages AI to generate sophisticated attack vectors and analyze defense effectiveness
 */

import { useKatalyst } from '@katalyst/hooks';
import { useSecurityStore } from '../stores/securityStore';
import { SecurityAIClient } from '../client/SecurityAIClient';
import type { 
  AttackTarget, 
  AttackVector, 
  AttackSimulationResult, 
  AttackResult,
  DefenseAnalysis,
  AttackMetrics
} from '../types';

export interface PurpleTeamState {
  simulating: boolean;
  generatingVectors: boolean;
  result: AttackSimulationResult | null;
  error: string | null;
  availableVectors: AttackVector[];
  simulationProgress: { current: number; total: number; percentage: number } | null;
  activeSimulation: string | null;
}

export interface PurpleTeamActions {
  simulate: (
    target: AttackTarget, 
    vectors: AttackVector[], 
    config: SimulationConfig
  ) => Promise<AttackSimulationResult>;
  generateAttackVectors: (target: AttackTarget) => Promise<AttackVector[]>;
  stopSimulation: () => void;
  validateDefenses: (target: AttackTarget) => Promise<DefenseAnalysis>;
  runContinuousAssessment: (target: AttackTarget, intervalHours: number) => () => void;
  exportSimulationReport: (result: AttackSimulationResult, format: 'json' | 'pdf') => Promise<Blob>;
  schedulePeriodicSimulation: (
    target: AttackTarget, 
    schedule: ScheduleConfig
  ) => () => void;
}

export interface SimulationConfig {
  automated: boolean;
  realTime: boolean;
  includeDefenseAnalysis: boolean;
  maxDuration: number;
  concurrentAttacks: number;
  severityFilter?: ('Critical' | 'High' | 'Medium' | 'Low')[];
  mitreFilter?: string[];
  customPayloads?: CustomPayload[];
}

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:MM format
  enabled: boolean;
}

export interface CustomPayload {
  name: string;
  payload: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

export type PurpleTeamHook = PurpleTeamState & PurpleTeamActions;

/**
 * Purple Team automation hook with AI-powered attack generation
 */
export function usePurpleTeam(): PurpleTeamHook {
  const k = useKatalyst();
  const { addSecurityEvent, updateSecurityMetrics } = useSecurityStore();
  
  // State management
  const [simulating, setSimulating] = k.state(false);
  const [generatingVectors, setGeneratingVectors] = k.state(false);
  const [result, setResult] = k.state<AttackSimulationResult | null>(null);
  const [error, setError] = k.state<string | null>(null);
  const [availableVectors, setAvailableVectors] = k.state<AttackVector[]>([]);
  const [simulationProgress, setSimulationProgress] = k.state<{ current: number; total: number; percentage: number } | null>(null);
  const [activeSimulation, setActiveSimulation] = k.state<string | null>(null);
  const [client] = k.state(() => new SecurityAIClient());
  
  // Abort controller for stopping simulations
  const abortControllerRef = k.ref<AbortController | null>(null);
  
  // Cleanup on unmount
  k.effect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Main attack simulation function
  const simulate = k.callback(async (
    target: AttackTarget,
    vectors: AttackVector[],
    config: SimulationConfig
  ): Promise<AttackSimulationResult> => {
    const simulationId = crypto.randomUUID();
    setSimulating(true);
    setError(null);
    setSimulationProgress({ current: 0, total: vectors.length, percentage: 0 });
    setActiveSimulation(simulationId);
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    const startTime = performance.now();
    
    try {
      // Log simulation start
      addSecurityEvent({
        type: 'purple_team_simulation_started',
        severity: 'Info',
        description: `Purple Team simulation started with ${vectors.length} attack vectors`,
        source: 'purple_team',
        data: { simulationId, target, vectorCount: vectors.length }
      });
      
      // Filter vectors based on configuration
      const filteredVectors = filterVectors(vectors, config);
      
      // Execute attack vectors
      const attackResults = await executeAttackVectors(
        target,
        filteredVectors,
        config,
        abortControllerRef.current.signal,
        (progress) => {
          setSimulationProgress({
            current: progress.current,
            total: progress.total,
            percentage: Math.round((progress.current / progress.total) * 100)
          });
        }
      );
      
      // Analyze defense effectiveness if enabled
      let defenseAnalysis: DefenseAnalysis | undefined;
      if (config.includeDefenseAnalysis) {
        defenseAnalysis = await analyzeDefenseEffectiveness(target, attackResults);
      }
      
      // Calculate metrics
      const metrics = calculateAttackMetrics(attackResults, performance.now() - startTime);
      
      // Generate AI-powered recommendations
      const recommendations = await generateRecommendations(
        target,
        attackResults,
        defenseAnalysis
      );
      
      // Create simulation result
      const simulationResult: AttackSimulationResult = {
        simulationId,
        timestamp: new Date().toISOString(),
        target,
        attackVectors: filteredVectors,
        results: attackResults,
        defenseAnalysis: defenseAnalysis!,
        recommendations,
        metrics
      };
      
      setResult(simulationResult);
      
      // Log simulation completion
      addSecurityEvent({
        type: 'purple_team_simulation_completed',
        severity: metrics.riskScore > 70 ? 'High' : metrics.riskScore > 40 ? 'Medium' : 'Low',
        description: `Purple Team simulation completed: ${attackResults.filter(r => r.success).length}/${attackResults.length} attacks successful`,
        source: 'purple_team',
        data: { simulationId, metrics, target }
      });
      
      // Update security metrics
      updateSecurityMetrics({
        totalAttackSimulations: 1,
        lastPurpleTeamAssessment: Date.now(),
        purpleTeamRiskScore: metrics.riskScore
      });
      
      return simulationResult;
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        addSecurityEvent({
          type: 'purple_team_simulation_cancelled',
          severity: 'Info',
          description: 'Purple Team simulation was cancelled by user',
          source: 'purple_team',
          data: { simulationId }
        });
        throw new Error('Simulation cancelled');
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown simulation error';
      setError(errorMessage);
      
      addSecurityEvent({
        type: 'purple_team_simulation_failed',
        severity: 'High',
        description: `Purple Team simulation failed: ${errorMessage}`,
        source: 'purple_team',
        data: { simulationId, error: errorMessage, target }
      });
      
      throw err;
    } finally {
      setSimulating(false);
      setSimulationProgress(null);
      setActiveSimulation(null);
      abortControllerRef.current = null;
    }
  }, [client, addSecurityEvent, updateSecurityMetrics]);
  
  // Generate AI-powered attack vectors
  const generateAttackVectors = k.callback(async (target: AttackTarget): Promise<AttackVector[]> => {
    setGeneratingVectors(true);
    setError(null);
    
    try {
      // Use AI to generate contextual attack vectors
      const vectors = await client.generateAttackVectors(target);
      
      // Enhance with MITRE ATT&CK mapping
      const enhancedVectors = await enhanceWithMitreMapping(vectors);
      
      setAvailableVectors(enhancedVectors);
      
      addSecurityEvent({
        type: 'attack_vectors_generated',
        severity: 'Info',
        description: `Generated ${enhancedVectors.length} attack vectors for ${target.type} target`,
        source: 'purple_team',
        data: { vectorCount: enhancedVectors.length, target }
      });
      
      return enhancedVectors;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate attack vectors';
      setError(errorMessage);
      throw err;
    } finally {
      setGeneratingVectors(false);
    }
  }, [client, addSecurityEvent]);
  
  // Stop active simulation
  const stopSimulation = k.callback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  // Validate defense mechanisms
  const validateDefenses = k.callback(async (target: AttackTarget): Promise<DefenseAnalysis> => {
    const probeVectors = await generateDefenseProbeVectors(target);
    const probeResults = await executeProbeVectors(target, probeVectors);
    return analyzeDefenseEffectiveness(target, probeResults);
  }, []);
  
  // Continuous assessment
  const runContinuousAssessment = k.callback((
    target: AttackTarget,
    intervalHours: number
  ): (() => void) => {
    let isRunning = true;
    
    const runAssessment = async () => {
      if (!isRunning) return;
      
      try {
        const vectors = await generateAttackVectors(target);
        const lightweightVectors = vectors.filter(v => v.severity !== 'Critical').slice(0, 5);
        
        await simulate(target, lightweightVectors, {
          automated: true,
          realTime: false,
          includeDefenseAnalysis: true,
          maxDuration: 120,
          concurrentAttacks: 2
        });
        
      } catch (error) {
        console.error('Continuous assessment failed:', error);
      }
      
      // Schedule next assessment
      if (isRunning) {
        setTimeout(runAssessment, intervalHours * 60 * 60 * 1000);
      }
    };
    
    // Start first assessment
    setTimeout(runAssessment, 5000); // Small delay
    
    // Return cleanup function
    return () => {
      isRunning = false;
    };
  }, [generateAttackVectors, simulate]);
  
  // Export simulation report
  const exportSimulationReport = k.callback(async (
    result: AttackSimulationResult,
    format: 'json' | 'pdf'
  ): Promise<Blob> => {
    if (format === 'json') {
      const report = {
        ...result,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      return new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    } else {
      // Generate PDF report
      const pdfContent = await generatePurpleTeamPDFReport(result);
      return new Blob([pdfContent], { type: 'application/pdf' });
    }
  }, []);
  
  // Schedule periodic simulations
  const schedulePeriodicSimulation = k.callback((
    target: AttackTarget,
    schedule: ScheduleConfig
  ): (() => void) => {
    if (!schedule.enabled) {
      return () => {};
    }
    
    const getNextRunTime = () => {
      const now = new Date();
      let nextRun = new Date();
      
      switch (schedule.frequency) {
        case 'hourly':
          nextRun.setHours(now.getHours() + 1, 0, 0, 0);
          break;
        case 'daily':
          if (schedule.time) {
            const [hours, minutes] = schedule.time.split(':').map(Number);
            nextRun.setHours(hours, minutes, 0, 0);
            if (nextRun <= now) {
              nextRun.setDate(nextRun.getDate() + 1);
            }
          } else {
            nextRun.setDate(now.getDate() + 1);
          }
          break;
        case 'weekly':
          nextRun.setDate(now.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(now.getMonth() + 1);
          break;
      }
      
      return nextRun.getTime() - now.getTime();
    };
    
    let timeoutId: NodeJS.Timeout;
    
    const scheduleNext = () => {
      const delay = getNextRunTime();
      timeoutId = setTimeout(async () => {
        try {
          const vectors = await generateAttackVectors(target);
          await simulate(target, vectors.slice(0, 10), {
            automated: true,
            realTime: false,
            includeDefenseAnalysis: true,
            maxDuration: 300,
            concurrentAttacks: 3
          });
        } catch (error) {
          console.error('Scheduled simulation failed:', error);
        }
        
        scheduleNext(); // Schedule next run
      }, delay);
    };
    
    scheduleNext();
    
    addSecurityEvent({
      type: 'purple_team_schedule_created',
      severity: 'Info',
      description: `Scheduled ${schedule.frequency} Purple Team simulations`,
      source: 'purple_team',
      data: { target, schedule }
    });
    
    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
      addSecurityEvent({
        type: 'purple_team_schedule_cancelled',
        severity: 'Info',
        description: 'Cancelled scheduled Purple Team simulations',
        source: 'purple_team',
        data: { target }
      });
    };
  }, [generateAttackVectors, simulate, addSecurityEvent]);
  
  return {
    // State
    simulating,
    generatingVectors,
    result,
    error,
    availableVectors,
    simulationProgress,
    activeSimulation,
    
    // Actions
    simulate,
    generateAttackVectors,
    stopSimulation,
    validateDefenses,
    runContinuousAssessment,
    exportSimulationReport,
    schedulePeriodicSimulation
  };
}

// Helper functions

function filterVectors(vectors: AttackVector[], config: SimulationConfig): AttackVector[] {
  let filtered = vectors;
  
  // Filter by severity
  if (config.severityFilter?.length) {
    filtered = filtered.filter(v => config.severityFilter!.includes(v.severity));
  }
  
  // Filter by MITRE technique
  if (config.mitreFilter?.length) {
    filtered = filtered.filter(v => 
      v.mitreId && config.mitreFilter!.some(id => v.mitreId!.includes(id))
    );
  }
  
  return filtered;
}

async function executeAttackVectors(
  target: AttackTarget,
  vectors: AttackVector[],
  config: SimulationConfig,
  signal: AbortSignal,
  onProgress: (progress: { current: number; total: number }) => void
): Promise<AttackResult[]> {
  const results: AttackResult[] = [];
  const semaphore = new Semaphore(config.concurrentAttacks);
  
  const executeVector = async (vector: AttackVector, index: number): Promise<AttackResult> => {
    if (signal.aborted) {
      throw new Error('Aborted');
    }
    
    const startTime = performance.now();
    
    try {
      // Simulate attack execution
      const attackResult = await simulateAttackVector(target, vector, signal);
      
      const result: AttackResult = {
        vectorId: vector.id,
        success: attackResult.success,
        response: attackResult.response,
        detection: attackResult.detected,
        responseTime: performance.now() - startTime,
        evidence: attackResult.evidence || [],
        impact: calculateImpact(attackResult)
      };
      
      return result;
      
    } catch (error) {
      return {
        vectorId: vector.id,
        success: false,
        response: { error: error.message },
        detection: false,
        responseTime: performance.now() - startTime,
        evidence: [],
        impact: {
          confidentiality: 'None',
          integrity: 'None',
          availability: 'None',
          scope: 'Unchanged'
        }
      };
    } finally {
      onProgress({ current: index + 1, total: vectors.length });
    }
  };
  
  // Execute vectors with concurrency control
  const promises = vectors.map((vector, index) =>
    semaphore.acquire(() => executeVector(vector, index))
  );
  
  const attackResults = await Promise.all(promises);
  return attackResults;
}

async function simulateAttackVector(
  target: AttackTarget,
  vector: AttackVector,
  signal: AbortSignal
): Promise<any> {
  // Simulate network request or attack execution
  // In a real implementation, this would make actual requests
  
  const delay = Math.random() * 2000 + 500; // 500-2500ms
  await new Promise(resolve => setTimeout(resolve, delay));
  
  if (signal.aborted) {
    throw new Error('Aborted');
  }
  
  // Simulate different outcomes based on vector type and severity
  const successRate = getSuccessRate(vector);
  const detectionRate = getDetectionRate(vector);
  
  const success = Math.random() < successRate;
  const detected = Math.random() < detectionRate;
  
  return {
    success,
    detected,
    response: success ? { status: 'vulnerable', data: 'mock_data' } : { status: 'protected' },
    evidence: success ? [`Attack vector ${vector.type} succeeded`, 'Payload executed'] : []
  };
}

function getSuccessRate(vector: AttackVector): number {
  const baseRates = {
    Critical: 0.7,
    High: 0.5,
    Medium: 0.3,
    Low: 0.1
  };
  return baseRates[vector.severity];
}

function getDetectionRate(vector: AttackVector): number {
  const baseRates = {
    Critical: 0.8,
    High: 0.6,
    Medium: 0.4,
    Low: 0.2
  };
  return baseRates[vector.severity];
}

function calculateImpact(attackResult: any): any {
  if (!attackResult.success) {
    return {
      confidentiality: 'None',
      integrity: 'None',
      availability: 'None',
      scope: 'Unchanged'
    };
  }
  
  // Simulate impact calculation based on attack type
  return {
    confidentiality: 'High',
    integrity: 'Medium',
    availability: 'Low',
    scope: 'Changed'
  };
}

async function analyzeDefenseEffectiveness(
  target: AttackTarget,
  results: AttackResult[]
): Promise<DefenseAnalysis> {
  const totalAttacks = results.length;
  const successfulAttacks = results.filter(r => r.success).length;
  const detectedAttacks = results.filter(r => r.detection).length;
  const preventedAttacks = totalAttacks - successfulAttacks;
  
  const detectionRate = totalAttacks > 0 ? detectedAttacks / totalAttacks : 0;
  const preventionRate = totalAttacks > 0 ? preventedAttacks / totalAttacks : 0;
  const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalAttacks;
  
  // Generate AI-powered analysis
  const weaknesses = identifyDefenseWeaknesses(results);
  const strengths = identifyDefenseStrengths(results);
  const recommendations = generateDefenseRecommendations(weaknesses, strengths);
  
  return {
    detectionRate,
    preventionRate,
    responseTime: averageResponseTime,
    weaknesses,
    strengths,
    recommendations
  };
}

function identifyDefenseWeaknesses(results: AttackResult[]): any[] {
  const weaknesses = [];
  
  const successfulByType = results
    .filter(r => r.success)
    .reduce((acc, r) => {
      const type = r.vector?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  Object.entries(successfulByType).forEach(([type, count]) => {
    if (count > 2) {
      weaknesses.push({
        category: 'Attack Type Vulnerability',
        description: `High success rate for ${type} attacks (${count} successful)`,
        severity: count > 5 ? 'Critical' : count > 3 ? 'High' : 'Medium',
        exploited: true
      });
    }
  });
  
  return weaknesses;
}

function identifyDefenseStrengths(results: AttackResult[]): any[] {
  const strengths = [];
  
  const blockedByType = results
    .filter(r => !r.success)
    .reduce((acc, r) => {
      const type = r.vector?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  Object.entries(blockedByType).forEach(([type, count]) => {
    if (count > 2) {
      strengths.push({
        category: 'Attack Type Defense',
        description: `Strong defense against ${type} attacks (${count} blocked)`,
        effectiveness: Math.min(100, (count / results.length) * 100)
      });
    }
  });
  
  return strengths;
}

function generateDefenseRecommendations(weaknesses: any[], strengths: any[]): any[] {
  const recommendations = [];
  
  weaknesses.forEach(weakness => {
    recommendations.push({
      priority: weakness.severity === 'Critical' ? 'Immediate' : 
                weakness.severity === 'High' ? 'High' : 'Medium',
      category: 'Defense Improvement',
      action: `Enhance protection against ${weakness.category.toLowerCase()}`,
      estimated_effort: '2-4 weeks',
      expected_impact: 'Reduce successful attacks by 40-60%'
    });
  });
  
  return recommendations;
}

async function enhanceWithMitreMapping(vectors: AttackVector[]): Promise<AttackVector[]> {
  // Mock MITRE ATT&CK mapping
  const mitreMapping: Record<string, string> = {
    'SQL Injection': 'T1190',
    'XSS': 'T1189',
    'CSRF': 'T1189',
    'Command Injection': 'T1059',
    'Path Traversal': 'T1083',
    'Authentication Bypass': 'T1078',
    'Privilege Escalation': 'T1068'
  };
  
  return vectors.map(vector => ({
    ...vector,
    mitreId: mitreMapping[vector.type] || undefined
  }));
}

function calculateAttackMetrics(results: AttackResult[], duration: number): AttackMetrics {
  const totalVectors = results.length;
  const successfulVectors = results.filter(r => r.success).length;
  const detectedVectors = results.filter(r => r.detection).length;
  const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalVectors;
  
  // Calculate risk score based on success rate and impact
  const successRate = successfulVectors / totalVectors;
  const riskScore = Math.round(successRate * 100);
  
  return {
    totalVectors,
    successfulVectors,
    detectedVectors,
    averageResponseTime,
    totalDuration: duration,
    riskScore
  };
}

async function generateRecommendations(
  target: AttackTarget,
  results: AttackResult[],
  defenseAnalysis?: DefenseAnalysis
): Promise<string[]> {
  const recommendations = [
    'Implement comprehensive input validation across all entry points',
    'Deploy Web Application Firewall (WAF) with updated rule sets',
    'Enable comprehensive logging and monitoring for attack detection',
    'Conduct regular security training for development teams',
    'Implement automated security scanning in CI/CD pipeline'
  ];
  
  // Add defense-specific recommendations
  if (defenseAnalysis?.recommendations) {
    recommendations.push(...defenseAnalysis.recommendations.map(r => r.action));
  }
  
  return recommendations;
}

async function generatePurpleTeamPDFReport(result: AttackSimulationResult): Promise<string> {
  // Mock PDF generation
  return `Purple Team Report - ${result.simulationId}\nGenerated: ${result.timestamp}`;
}

async function generateDefenseProbeVectors(target: AttackTarget): Promise<AttackVector[]> {
  // Generate lightweight probe vectors for defense validation
  return [
    {
      id: crypto.randomUUID(),
      type: 'Defense Probe',
      payload: 'probe-payload',
      technique: 'Defense Validation',
      severity: 'Low',
      automated: true
    }
  ];
}

async function executeProbeVectors(target: AttackTarget, vectors: AttackVector[]): Promise<AttackResult[]> {
  // Execute lightweight probe vectors
  return vectors.map(vector => ({
    vectorId: vector.id,
    success: Math.random() < 0.1, // Low success rate for probes
    response: { status: 'probe_complete' },
    detection: Math.random() < 0.8, // High detection rate for legitimate probes
    responseTime: Math.random() * 100 + 50,
    evidence: ['Defense probe executed'],
    impact: {
      confidentiality: 'None',
      integrity: 'None',
      availability: 'None',
      scope: 'Unchanged'
    }
  }));
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        this.execute(fn).then(resolve).catch(reject);
      } else {
        this.waiting.push(() => {
          this.permits--;
          this.execute(fn).then(resolve).catch(reject);
        });
      }
    });
  }

  private async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } finally {
      this.permits++;
      if (this.waiting.length > 0) {
        const next = this.waiting.shift();
        if (next) next();
      }
    }
  }
}