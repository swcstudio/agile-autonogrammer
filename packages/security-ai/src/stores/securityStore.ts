/**
 * Security Store
 * 
 * Centralized state management for security operations
 * Supports Red Team, Purple Team, and Green Hat workflows
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  SecurityState,
  SecurityMetrics,
  SecurityEvent,
  VulnerabilityReport,
  SecurityConfig,
  ThreatDetectionResult,
  AttackSimulationResult
} from '../types';

interface SecurityStore extends SecurityState {
  // Actions
  updateSecurityMetrics: (metrics: Partial<SecurityMetrics>) => void;
  addSecurityEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => void;
  setScanResult: (report: VulnerabilityReport) => void;
  addToHistory: (report: VulnerabilityReport) => void;
  clearHistory: () => void;
  updateConfig: (config: Partial<SecurityConfig>) => void;
  updateThreatLevel: (level: 'Critical' | 'High' | 'Medium' | 'Low' | 'None') => void;
  
  // Threat Detection
  addThreatDetection: (result: ThreatDetectionResult) => void;
  
  // Attack Simulation
  addAttackSimulation: (result: AttackSimulationResult) => void;
  
  // Utility actions
  clearEvents: () => void;
  markEventHandled: (eventId: string) => void;
  getUnhandledEvents: () => SecurityEvent[];
  getMetricsTrend: (days: number) => any[];
  exportSecurityData: () => string;
  importSecurityData: (data: string) => void;
  
  // Real-time monitoring
  startRealTimeMonitoring: () => void;
  stopRealTimeMonitoring: () => void;
  isMonitoring: boolean;
}

const defaultConfig: SecurityConfig = {
  redTeamMode: true,
  purpleTeamMode: false,
  greenHatMode: false,
  complianceStandards: ['OWASP', 'CWE', 'PCI-DSS'],
  severityThreshold: 'Medium',
  includeProofOfConcept: true,
  autoRemediation: false,
  realTimeScanning: false
};

const defaultMetrics: SecurityMetrics = {
  totalScans: 0,
  totalVulnerabilities: 0,
  criticalVulnerabilities: 0,
  highVulnerabilities: 0,
  averageScanTime: 0,
  lastScan: 0,
  riskTrend: 'Stable',
  complianceScore: 0,
  threatLevel: 'None'
};

export const useSecurityStore = create<SecurityStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        currentScan: undefined,
        scanHistory: [],
        threatLevel: 'None',
        metrics: defaultMetrics,
        events: [],
        config: defaultConfig,
        isMonitoring: false,

        // Actions
        updateSecurityMetrics: (metrics) =>
          set((state) => ({
            metrics: { ...state.metrics, ...metrics },
          })),

        addSecurityEvent: (eventData) => {
          const event: SecurityEvent = {
            ...eventData,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            handled: false,
          };
          
          set((state) => ({
            events: [event, ...state.events.slice(0, 999)], // Keep last 1000 events
          }));
          
          // Auto-update threat level based on event severity
          if (event.severity === 'Critical' || event.severity === 'High') {
            const currentLevel = get().threatLevel;
            if (event.severity === 'Critical' || (event.severity === 'High' && currentLevel === 'None')) {
              set({ threatLevel: event.severity });
            }
          }
        },

        setScanResult: (report) =>
          set(() => ({
            currentScan: report,
          })),

        addToHistory: (report) =>
          set((state) => ({
            scanHistory: [report, ...state.scanHistory.slice(0, 49)], // Keep last 50 scans
          })),

        clearHistory: () =>
          set(() => ({
            scanHistory: [],
          })),

        updateConfig: (configUpdate) =>
          set((state) => ({
            config: { ...state.config, ...configUpdate },
          })),

        updateThreatLevel: (level) =>
          set(() => ({
            threatLevel: level,
          })),

        addThreatDetection: (result) => {
          // Add threat detection as security event
          get().addSecurityEvent({
            type: 'threat_detection',
            severity: result.threatLevel,
            description: `Threat detected with score ${result.threatScore}`,
            source: 'threat_detector',
            data: result,
          });
          
          // Update threat level if higher
          const currentLevel = get().threatLevel;
          const severityLevels = ['None', 'Low', 'Medium', 'High', 'Critical'];
          if (severityLevels.indexOf(result.threatLevel) > severityLevels.indexOf(currentLevel)) {
            set({ threatLevel: result.threatLevel });
          }
        },

        addAttackSimulation: (result) => {
          get().addSecurityEvent({
            type: 'attack_simulation',
            severity: result.metrics.riskScore > 70 ? 'High' : result.metrics.riskScore > 40 ? 'Medium' : 'Low',
            description: `Attack simulation completed: ${result.results.filter(r => r.success).length}/${result.results.length} successful`,
            source: 'purple_team',
            data: result,
          });
        },

        clearEvents: () =>
          set(() => ({
            events: [],
          })),

        markEventHandled: (eventId) =>
          set((state) => ({
            events: state.events.map((event) =>
              event.id === eventId ? { ...event, handled: true } : event
            ),
          })),

        getUnhandledEvents: () => {
          return get().events.filter((event) => !event.handled);
        },

        getMetricsTrend: (days) => {
          const events = get().events;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          
          // Group events by day
          const dailyMetrics = new Map();
          
          events
            .filter(event => new Date(event.timestamp) >= cutoffDate)
            .forEach(event => {
              const day = event.timestamp.split('T')[0]; // YYYY-MM-DD
              if (!dailyMetrics.has(day)) {
                dailyMetrics.set(day, {
                  date: day,
                  critical: 0,
                  high: 0,
                  medium: 0,
                  low: 0,
                  total: 0
                });
              }
              
              const metrics = dailyMetrics.get(day);
              metrics[event.severity.toLowerCase()]++;
              metrics.total++;
            });
          
          return Array.from(dailyMetrics.values()).sort((a, b) => 
            a.date.localeCompare(b.date)
          );
        },

        exportSecurityData: () => {
          const state = get();
          const exportData = {
            scanHistory: state.scanHistory,
            events: state.events,
            metrics: state.metrics,
            config: state.config,
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
          };
          
          return JSON.stringify(exportData, null, 2);
        },

        importSecurityData: (data) => {
          try {
            const importData = JSON.parse(data);
            
            // Validate data structure
            if (!importData.version || !importData.exportedAt) {
              throw new Error('Invalid security data format');
            }
            
            set((state) => ({
              scanHistory: [...(importData.scanHistory || []), ...state.scanHistory],
              events: [...(importData.events || []), ...state.events],
              metrics: { ...state.metrics, ...(importData.metrics || {}) },
              config: { ...state.config, ...(importData.config || {}) }
            }));
            
            get().addSecurityEvent({
              type: 'data_import',
              severity: 'Info',
              description: `Security data imported from ${importData.exportedAt}`,
              source: 'security_store',
              data: { recordCount: importData.scanHistory?.length || 0 }
            });
            
          } catch (error) {
            get().addSecurityEvent({
              type: 'data_import_error',
              severity: 'High',
              description: `Failed to import security data: ${error.message}`,
              source: 'security_store',
              data: { error: error.message }
            });
          }
        },

        startRealTimeMonitoring: () => {
          set({ isMonitoring: true });
          
          get().addSecurityEvent({
            type: 'monitoring_started',
            severity: 'Info',
            description: 'Real-time security monitoring started',
            source: 'security_monitor',
            data: { timestamp: Date.now() }
          });
          
          // In a real implementation, this would start background monitoring
          // For now, we'll simulate periodic checks
          if (typeof window !== 'undefined') {
            (window as any).katalystSecurityMonitor = setInterval(() => {
              // Simulate random security events for demonstration
              if (Math.random() < 0.1) { // 10% chance every interval
                get().addSecurityEvent({
                  type: 'automated_scan',
                  severity: Math.random() < 0.3 ? 'Medium' : 'Low',
                  description: 'Automated security scan completed',
                  source: 'auto_scanner',
                  data: { 
                    scanId: crypto.randomUUID(),
                    findings: Math.floor(Math.random() * 5)
                  }
                });
              }
            }, 60000); // Every minute
          }
        },

        stopRealTimeMonitoring: () => {
          set({ isMonitoring: false });
          
          get().addSecurityEvent({
            type: 'monitoring_stopped',
            severity: 'Info',
            description: 'Real-time security monitoring stopped',
            source: 'security_monitor',
            data: { timestamp: Date.now() }
          });
          
          // Clear monitoring interval
          if (typeof window !== 'undefined' && (window as any).katalystSecurityMonitor) {
            clearInterval((window as any).katalystSecurityMonitor);
            delete (window as any).katalystSecurityMonitor;
          }
        },
      }),
      {
        name: 'katalyst-security-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          scanHistory: state.scanHistory,
          metrics: state.metrics,
          config: state.config,
          // Don't persist events and monitoring state
        }),
      }
    )
  )
);

// Selector hooks for specific data
export const useSecurityMetrics = () => 
  useSecurityStore((state) => state.metrics);

export const useSecurityConfig = () => 
  useSecurityStore((state) => state.config);

export const useThreatLevel = () => 
  useSecurityStore((state) => state.threatLevel);

export const useUnhandledEvents = () => 
  useSecurityStore((state) => state.getUnhandledEvents());

export const useSecurityHistory = () => 
  useSecurityStore((state) => state.scanHistory);

export const useCurrentScan = () => 
  useSecurityStore((state) => state.currentScan);

export const useIsMonitoring = () => 
  useSecurityStore((state) => state.isMonitoring);

// Computed selectors
export const useSecurityStats = () =>
  useSecurityStore((state) => {
    const events = state.events;
    const recentEvents = events.filter(
      e => Date.now() - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    return {
      totalEvents: events.length,
      recentEvents: recentEvents.length,
      criticalEvents: events.filter(e => e.severity === 'Critical').length,
      highEvents: events.filter(e => e.severity === 'High').length,
      unhandledEvents: events.filter(e => !e.handled).length,
      threatLevel: state.threatLevel,
      lastScan: state.metrics.lastScan,
      riskTrend: state.metrics.riskTrend
    };
  });

// Event listeners for external integrations
export const subscribeToSecurityEvents = (
  callback: (event: SecurityEvent) => void
) => {
  return useSecurityStore.subscribe(
    (state) => state.events,
    (events, prevEvents) => {
      const newEvents = events.filter(
        event => !prevEvents.some(prev => prev.id === event.id)
      );
      newEvents.forEach(callback);
    }
  );
};

export const subscribeToThreatLevel = (
  callback: (level: SecurityState['threatLevel']) => void
) => {
  return useSecurityStore.subscribe(
    (state) => state.threatLevel,
    callback
  );
};