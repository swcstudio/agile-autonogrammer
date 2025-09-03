import { useState, useCallback, useEffect, useRef } from 'react';
import { useTRPC } from '../use-trpc';
import { Agent, AgentMetrics } from './useAgent';

export interface DetailedAgentMetrics extends AgentMetrics {
  agentId: string;
  agentName: string;
  agentType: Agent['type'];
  
  // Performance metrics
  successRate: number;
  errorRate: number;
  availabilityRate: number;
  responseTimePercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  
  // Resource utilization
  peakCpuUsage: number;
  peakMemoryUsage: number;
  averageResourceUtilization: number;
  
  // Task-specific metrics
  taskTypeBreakdown: Record<string, {
    count: number;
    successRate: number;
    avgDuration: number;
  }>;
  
  // Time-series data
  hourlyStats: Array<{
    hour: number;
    tasksCompleted: number;
    avgResponseTime: number;
    errorCount: number;
  }>;
  
  // Comparison metrics
  relativePerformance: number; // Compared to other agents of same type
  improvementTrend: 'improving' | 'stable' | 'declining';
  
  // Health indicators
  healthScore: number; // 0-100
  alertLevel: 'green' | 'yellow' | 'red';
  activeAlerts: Array<{
    type: 'performance' | 'resource' | 'error' | 'availability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
  }>;
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasksExecuted: number;
  systemSuccessRate: number;
  systemThroughput: number;
  systemLatency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  
  // Capacity metrics
  totalCapacity: number;
  usedCapacity: number;
  capacityUtilization: number;
  projectedCapacityNeeds: number;
  
  // Cost metrics (if applicable)
  operationalCosts: {
    compute: number;
    storage: number;
    network: number;
    total: number;
  };
  costPerTask: number;
  costEfficiencyTrend: 'improving' | 'stable' | 'declining';
  
  // System health
  systemHealthScore: number;
  bottlenecks: Array<{
    component: string;
    severity: number;
    description: string;
  }>;
}

export interface MetricsFilter {
  agentIds?: string[];
  agentTypes?: Agent['type'][];
  timeRange?: {
    start: number;
    end: number;
  };
  taskTypes?: string[];
  includeInactive?: boolean;
}

export interface MetricsAggregation {
  groupBy: 'agent' | 'type' | 'hour' | 'day' | 'task-type';
  metrics: Array<'count' | 'duration' | 'success-rate' | 'error-rate' | 'resource-usage'>;
  period?: 'hour' | 'day' | 'week' | 'month';
}

export interface AlertRule {
  id: string;
  name: string;
  agentIds?: string[];
  agentTypes?: Agent['type'][];
  condition: {
    metric: keyof DetailedAgentMetrics;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration?: number; // Sustain for X seconds
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  actions: Array<{
    type: 'email' | 'webhook' | 'slack' | 'restart-agent';
    config: Record<string, any>;
  }>;
}

export interface UseAgentMetricsOptions {
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
  enableAlerting?: boolean;
  retentionPeriod?: number; // Days to keep historical data
  aggregationInterval?: number; // Seconds between aggregations
}

export interface UseAgentMetricsResult {
  // Current metrics
  agentMetrics: Map<string, DetailedAgentMetrics>;
  systemMetrics: SystemMetrics;
  loading: boolean;
  error: string | null;

  // Data retrieval
  getAgentMetrics: (agentId: string, period?: string) => Promise<DetailedAgentMetrics>;
  getSystemMetrics: (period?: string) => Promise<SystemMetrics>;
  getMetricsHistory: (
    agentId: string,
    startTime: number,
    endTime: number
  ) => Promise<Array<DetailedAgentMetrics>>;

  // Filtering and aggregation
  filterMetrics: (filter: MetricsFilter) => Map<string, DetailedAgentMetrics>;
  aggregateMetrics: (
    filter: MetricsFilter,
    aggregation: MetricsAggregation
  ) => Promise<Record<string, any>>;

  // Comparisons and analysis
  compareAgents: (agentIds: string[], metrics: string[]) => Record<string, any>;
  getTopPerformers: (
    metric: keyof DetailedAgentMetrics,
    limit: number,
    agentType?: Agent['type']
  ) => DetailedAgentMetrics[];
  getBottlenecks: () => Array<{
    component: string;
    impact: number;
    suggestions: string[];
  }>;

  // Alerting
  alertRules: AlertRule[];
  activeAlerts: Array<DetailedAgentMetrics['activeAlerts'][0] & { agentId: string }>;
  createAlertRule: (rule: Omit<AlertRule, 'id'>) => string;
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  deleteAlertRule: (id: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  muteAlerts: (agentId: string, duration: number) => void;

  // Forecasting and recommendations
  forecastMetrics: (
    agentId: string,
    metric: keyof DetailedAgentMetrics,
    hours: number
  ) => Array<{ time: number; predicted: number; confidence: number }>;
  getOptimizationSuggestions: (agentId?: string) => Array<{
    type: 'performance' | 'resource' | 'cost';
    priority: number;
    description: string;
    expectedImpact: string;
  }>;
  getCapacityRecommendations: () => {
    scaleUp: boolean;
    scaleDown: boolean;
    reasoning: string;
    suggestedAgentCount: number;
  };

  // Export and reporting
  exportMetrics: (
    filter: MetricsFilter,
    format: 'json' | 'csv' | 'xlsx'
  ) => Promise<Blob>;
  generateReport: (
    type: 'performance' | 'health' | 'cost' | 'capacity',
    period: string
  ) => Promise<{
    title: string;
    summary: string;
    charts: Array<{ type: string; data: any }>;
    recommendations: string[];
  }>;

  // Real-time subscriptions
  subscribeToMetrics: (agentIds?: string[]) => void;
  unsubscribeFromMetrics: () => void;
}

/**
 * Hook for comprehensive agent performance monitoring and analytics
 * 
 * @example
 * ```tsx
 * function MetricsDashboard() {
 *   const { 
 *     agentMetrics, 
 *     systemMetrics, 
 *     getTopPerformers,
 *     createAlertRule,
 *     activeAlerts 
 *   } = useAgentMetrics({
 *     refreshInterval: 30000,
 *     enableRealTimeUpdates: true,
 *     enableAlerting: true
 *   });
 * 
 *   const topPerformers = getTopPerformers('successRate', 5);
 *   
 *   const handleCreateAlert = () => {
 *     createAlertRule({
 *       name: 'High Error Rate',
 *       condition: {
 *         metric: 'errorRate',
 *         operator: 'gt',
 *         threshold: 0.1,
 *         duration: 300
 *       },
 *       severity: 'high',
 *       enabled: true,
 *       actions: [{ type: 'email', config: { recipients: ['admin@company.com'] } }]
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       <h2>System Health: {systemMetrics.systemHealthScore}/100</h2>
 *       <div>Active Alerts: {activeAlerts.length}</div>
 *       <div>Top Performers: {topPerformers.map(a => a.agentName).join(', ')}</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentMetrics(options: UseAgentMetricsOptions = {}): UseAgentMetricsResult {
  const {
    refreshInterval = 30000,
    enableRealTimeUpdates = true,
    enableAlerting = true,
    retentionPeriod = 30,
    aggregationInterval = 60,
  } = options;

  // State management
  const [agentMetrics, setAgentMetrics] = useState<Map<string, DetailedAgentMetrics>>(new Map());
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalAgents: 0,
    activeAgents: 0,
    totalTasksExecuted: 0,
    systemSuccessRate: 0,
    systemThroughput: 0,
    systemLatency: { p50: 0, p90: 0, p95: 0, p99: 0 },
    totalCapacity: 0,
    usedCapacity: 0,
    capacityUtilization: 0,
    projectedCapacityNeeds: 0,
    operationalCosts: { compute: 0, storage: 0, network: 0, total: 0 },
    costPerTask: 0,
    costEfficiencyTrend: 'stable',
    systemHealthScore: 100,
    bottlenecks: [],
  });

  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Array<DetailedAgentMetrics['activeAlerts'][0] & { agentId: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for data management
  const metricsHistory = useRef<Map<string, DetailedAgentMetrics[]>>(new Map());
  const aggregationTimer = useRef<NodeJS.Timeout | null>(null);
  const alertCheckTimer = useRef<NodeJS.Timeout | null>(null);

  // TRPC hooks
  const { trpc } = useTRPC();

  // Queries
  const agentsQuery = trpc.agents.list.useQuery(undefined, {
    refetchInterval: refreshInterval,
  });

  const metricsQuery = trpc.agents.metrics.useQuery(
    { period: '24h' },
    {
      refetchInterval: refreshInterval,
      enabled: true,
    }
  );

  // Real-time subscription
  const metricsSubscription = trpc.agents.onAgentEvent.useSubscription(
    {
      events: ['task:completed', 'task:failed', 'agent:status:changed'],
    },
    {
      enabled: enableRealTimeUpdates,
      onData: (event) => {
        handleMetricsUpdate(event);
      },
    }
  );

  // Handle real-time metrics updates
  const handleMetricsUpdate = useCallback((event: any) => {
    const agentId = event.data.agentId;
    if (!agentId) return;

    setAgentMetrics(prev => {
      const updated = new Map(prev);
      const current = updated.get(agentId);
      
      if (current) {
        const updatedMetrics = { ...current };
        
        switch (event.type) {
          case 'task:completed':
            updatedMetrics.tasksSucceeded++;
            updatedMetrics.tasksExecuted++;
            updatedMetrics.lastExecutionTime = event.data.executionTime;
            break;
          case 'task:failed':
            updatedMetrics.tasksFailed++;
            updatedMetrics.tasksExecuted++;
            break;
        }

        // Recalculate derived metrics
        updatedMetrics.successRate = updatedMetrics.tasksExecuted > 0
          ? updatedMetrics.tasksSucceeded / updatedMetrics.tasksExecuted
          : 0;
        updatedMetrics.errorRate = 1 - updatedMetrics.successRate;

        updated.set(agentId, updatedMetrics);
      }
      
      return updated;
    });

    // Update system metrics
    updateSystemMetrics();
  }, []);

  // Update agent metrics from TRPC data
  useEffect(() => {
    if (agentsQuery.data && metricsQuery.data) {
      const newMetrics = new Map<string, DetailedAgentMetrics>();

      for (const agent of agentsQuery.data.agents) {
        const baseMetrics = agent.metrics || {
          tasksExecuted: 0,
          tasksSucceeded: 0,
          tasksFailed: 0,
          averageExecutionTime: 0,
          lastExecutionTime: null,
          cpuUsage: 0,
          memoryUsage: 0,
          uptime: 0,
        };

        const detailedMetrics: DetailedAgentMetrics = {
          ...baseMetrics,
          agentId: agent.id,
          agentName: agent.name,
          agentType: agent.type,
          
          // Calculate derived metrics
          successRate: baseMetrics.tasksExecuted > 0 
            ? baseMetrics.tasksSucceeded / baseMetrics.tasksExecuted 
            : 0,
          errorRate: baseMetrics.tasksExecuted > 0 
            ? baseMetrics.tasksFailed / baseMetrics.tasksExecuted 
            : 0,
          availabilityRate: agent.status === 'ready' ? 1 : 0,
          
          // Mock additional metrics (would be calculated from historical data)
          responseTimePercentiles: {
            p50: baseMetrics.averageExecutionTime * 0.8,
            p90: baseMetrics.averageExecutionTime * 1.2,
            p95: baseMetrics.averageExecutionTime * 1.5,
            p99: baseMetrics.averageExecutionTime * 2.0,
          },
          
          peakCpuUsage: baseMetrics.cpuUsage * 1.3,
          peakMemoryUsage: baseMetrics.memoryUsage * 1.2,
          averageResourceUtilization: (baseMetrics.cpuUsage + baseMetrics.memoryUsage) / 2,
          
          taskTypeBreakdown: {
            [agent.type]: {
              count: baseMetrics.tasksExecuted,
              successRate: baseMetrics.tasksExecuted > 0 
                ? baseMetrics.tasksSucceeded / baseMetrics.tasksExecuted 
                : 0,
              avgDuration: baseMetrics.averageExecutionTime,
            },
          },
          
          hourlyStats: generateMockHourlyStats(baseMetrics),
          
          relativePerformance: 1.0, // Would be calculated relative to peers
          improvementTrend: 'stable',
          
          healthScore: calculateHealthScore(baseMetrics, agent.status),
          alertLevel: getAlertLevel(baseMetrics, agent.status),
          activeAlerts: generateAlerts(baseMetrics, agent.status, agent.id),
        };

        newMetrics.set(agent.id, detailedMetrics);
      }

      setAgentMetrics(newMetrics);
      updateSystemMetrics(newMetrics);
    }
  }, [agentsQuery.data, metricsQuery.data]);

  // Update system metrics
  const updateSystemMetrics = useCallback((metrics?: Map<string, DetailedAgentMetrics>) => {
    const currentMetrics = metrics || agentMetrics;
    const agents = Array.from(currentMetrics.values());

    if (agents.length === 0) return;

    const totalTasks = agents.reduce((sum, a) => sum + a.tasksExecuted, 0);
    const totalSuccesses = agents.reduce((sum, a) => sum + a.tasksSucceeded, 0);
    const activeAgentCount = agents.filter(a => a.availabilityRate > 0).length;

    const systemSuccessRate = totalTasks > 0 ? totalSuccesses / totalTasks : 0;
    const avgResponseTimes = agents.map(a => a.averageExecutionTime).filter(t => t > 0);
    
    setSystemMetrics(prev => ({
      ...prev,
      totalAgents: agents.length,
      activeAgents: activeAgentCount,
      totalTasksExecuted: totalTasks,
      systemSuccessRate,
      systemThroughput: calculateSystemThroughput(agents),
      systemLatency: {
        p50: percentile(avgResponseTimes, 50),
        p90: percentile(avgResponseTimes, 90),
        p95: percentile(avgResponseTimes, 95),
        p99: percentile(avgResponseTimes, 99),
      },
      capacityUtilization: activeAgentCount / agents.length,
      systemHealthScore: calculateSystemHealthScore(agents),
      bottlenecks: identifyBottlenecks(agents),
    }));
  }, [agentMetrics]);

  // Data retrieval methods
  const getAgentMetrics = useCallback(async (
    agentId: string, 
    period: string = '24h'
  ): Promise<DetailedAgentMetrics> => {
    const result = await trpc.agents.metrics.query({ agentId, period });
    
    if (result.agentId) {
      return result as any; // Cast to DetailedAgentMetrics
    }
    
    throw new Error(`Metrics not found for agent ${agentId}`);
  }, [trpc]);

  const getSystemMetrics = useCallback(async (period: string = '24h'): Promise<SystemMetrics> => {
    const result = await trpc.agents.metrics.query({ period });
    // Process aggregate data into SystemMetrics format
    return systemMetrics; // Simplified for this implementation
  }, [trpc, systemMetrics]);

  const getMetricsHistory = useCallback(async (
    agentId: string,
    startTime: number,
    endTime: number
  ): Promise<Array<DetailedAgentMetrics>> => {
    // In a real implementation, this would query historical data
    return metricsHistory.current.get(agentId) || [];
  }, []);

  // Filtering and aggregation
  const filterMetrics = useCallback((filter: MetricsFilter): Map<string, DetailedAgentMetrics> => {
    const filtered = new Map<string, DetailedAgentMetrics>();

    for (const [agentId, metrics] of agentMetrics) {
      let include = true;

      if (filter.agentIds && !filter.agentIds.includes(agentId)) {
        include = false;
      }

      if (filter.agentTypes && !filter.agentTypes.includes(metrics.agentType)) {
        include = false;
      }

      if (filter.timeRange) {
        // Would check if metrics fall within time range
        // Simplified for this implementation
      }

      if (!filter.includeInactive && metrics.availabilityRate === 0) {
        include = false;
      }

      if (include) {
        filtered.set(agentId, metrics);
      }
    }

    return filtered;
  }, [agentMetrics]);

  const aggregateMetrics = useCallback(async (
    filter: MetricsFilter,
    aggregation: MetricsAggregation
  ): Promise<Record<string, any>> => {
    const filteredMetrics = filterMetrics(filter);
    const result: Record<string, any> = {};

    // Group metrics by specified criteria
    const groups: Record<string, DetailedAgentMetrics[]> = {};

    for (const [agentId, metrics] of filteredMetrics) {
      let groupKey: string;

      switch (aggregation.groupBy) {
        case 'agent':
          groupKey = agentId;
          break;
        case 'type':
          groupKey = metrics.agentType;
          break;
        case 'task-type':
          groupKey = Object.keys(metrics.taskTypeBreakdown)[0] || 'unknown';
          break;
        default:
          groupKey = 'all';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(metrics);
    }

    // Aggregate metrics for each group
    for (const [groupKey, groupMetrics] of Object.entries(groups)) {
      result[groupKey] = {
        count: groupMetrics.length,
        totalTasks: groupMetrics.reduce((sum, m) => sum + m.tasksExecuted, 0),
        avgSuccessRate: groupMetrics.reduce((sum, m) => sum + m.successRate, 0) / groupMetrics.length,
        avgDuration: groupMetrics.reduce((sum, m) => sum + m.averageExecutionTime, 0) / groupMetrics.length,
        avgResourceUsage: groupMetrics.reduce((sum, m) => sum + m.averageResourceUtilization, 0) / groupMetrics.length,
      };
    }

    return result;
  }, [filterMetrics]);

  // Analysis methods
  const compareAgents = useCallback((
    agentIds: string[], 
    metrics: string[]
  ): Record<string, any> => {
    const comparison: Record<string, any> = {};

    for (const agentId of agentIds) {
      const agentMetric = agentMetrics.get(agentId);
      if (!agentMetric) continue;

      comparison[agentId] = {};
      for (const metric of metrics) {
        comparison[agentId][metric] = (agentMetric as any)[metric];
      }
    }

    return comparison;
  }, [agentMetrics]);

  const getTopPerformers = useCallback((
    metric: keyof DetailedAgentMetrics,
    limit: number,
    agentType?: Agent['type']
  ): DetailedAgentMetrics[] => {
    let agents = Array.from(agentMetrics.values());

    if (agentType) {
      agents = agents.filter(a => a.agentType === agentType);
    }

    return agents
      .sort((a, b) => (b[metric] as number) - (a[metric] as number))
      .slice(0, limit);
  }, [agentMetrics]);

  const getBottlenecks = useCallback(() => {
    const agents = Array.from(agentMetrics.values());
    const bottlenecks: Array<{
      component: string;
      impact: number;
      suggestions: string[];
    }> = [];

    // Identify high error rate agents
    const highErrorAgents = agents.filter(a => a.errorRate > 0.1);
    if (highErrorAgents.length > 0) {
      bottlenecks.push({
        component: `Agents with high error rates: ${highErrorAgents.map(a => a.agentName).join(', ')}`,
        impact: highErrorAgents.length / agents.length,
        suggestions: ['Review error logs', 'Check agent configuration', 'Consider retraining'],
      });
    }

    // Identify resource-constrained agents
    const highResourceAgents = agents.filter(a => a.averageResourceUtilization > 0.8);
    if (highResourceAgents.length > 0) {
      bottlenecks.push({
        component: `Resource-constrained agents: ${highResourceAgents.map(a => a.agentName).join(', ')}`,
        impact: highResourceAgents.length / agents.length,
        suggestions: ['Scale up resources', 'Optimize workload distribution', 'Consider load balancing'],
      });
    }

    return bottlenecks;
  }, [agentMetrics]);

  // Alerting methods
  const createAlertRule = useCallback((rule: Omit<AlertRule, 'id'>): string => {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: AlertRule = { ...rule, id };
    
    setAlertRules(prev => [...prev, newRule]);
    return id;
  }, []);

  const updateAlertRule = useCallback((id: string, updates: Partial<AlertRule>) => {
    setAlertRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  }, []);

  const deleteAlertRule = useCallback((id: string) => {
    setAlertRules(prev => prev.filter(rule => rule.id !== id));
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.filter(alert => 
      `${alert.agentId}_${alert.type}_${alert.timestamp}` !== alertId
    ));
  }, []);

  const muteAlerts = useCallback((agentId: string, duration: number) => {
    // Implementation would mute alerts for specified duration
    console.log(`Muted alerts for agent ${agentId} for ${duration}ms`);
  }, []);

  // Check alert conditions
  const checkAlertConditions = useCallback(() => {
    if (!enableAlerting) return;

    const newAlerts: Array<DetailedAgentMetrics['activeAlerts'][0] & { agentId: string }> = [];

    for (const rule of alertRules) {
      if (!rule.enabled) continue;

      const agentsToCheck = rule.agentIds 
        ? Array.from(agentMetrics.entries()).filter(([id]) => rule.agentIds!.includes(id))
        : rule.agentTypes
        ? Array.from(agentMetrics.entries()).filter(([, metrics]) => rule.agentTypes!.includes(metrics.agentType))
        : Array.from(agentMetrics.entries());

      for (const [agentId, metrics] of agentsToCheck) {
        const metricValue = (metrics as any)[rule.condition.metric];
        const threshold = rule.condition.threshold;
        let conditionMet = false;

        switch (rule.condition.operator) {
          case 'gt':
            conditionMet = metricValue > threshold;
            break;
          case 'lt':
            conditionMet = metricValue < threshold;
            break;
          case 'gte':
            conditionMet = metricValue >= threshold;
            break;
          case 'lte':
            conditionMet = metricValue <= threshold;
            break;
          case 'eq':
            conditionMet = metricValue === threshold;
            break;
        }

        if (conditionMet) {
          newAlerts.push({
            agentId,
            type: 'performance',
            severity: rule.severity,
            message: `${rule.name}: ${rule.condition.metric} is ${metricValue} (threshold: ${threshold})`,
            timestamp: Date.now(),
          });
        }
      }
    }

    setActiveAlerts(prev => {
      const existing = new Set(prev.map(a => `${a.agentId}_${a.type}_${a.message}`));
      const filtered = newAlerts.filter(a => !existing.has(`${a.agentId}_${a.type}_${a.message}`));
      return [...prev, ...filtered];
    });
  }, [enableAlerting, alertRules, agentMetrics]);

  // Set up alert checking
  useEffect(() => {
    if (enableAlerting) {
      alertCheckTimer.current = setInterval(checkAlertConditions, 30000); // Check every 30s
      return () => {
        if (alertCheckTimer.current) {
          clearInterval(alertCheckTimer.current);
        }
      };
    }
  }, [enableAlerting, checkAlertConditions]);

  // Export and reporting methods
  const exportMetrics = useCallback(async (
    filter: MetricsFilter,
    format: 'json' | 'csv' | 'xlsx'
  ): Promise<Blob> => {
    const filteredMetrics = filterMetrics(filter);
    const data = Array.from(filteredMetrics.values());

    switch (format) {
      case 'json':
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      case 'csv':
        const csv = convertToCSV(data);
        return new Blob([csv], { type: 'text/csv' });
      case 'xlsx':
        // Would use a library like xlsx to create Excel file
        throw new Error('XLSX export not implemented');
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }, [filterMetrics]);

  const generateReport = useCallback(async (
    type: 'performance' | 'health' | 'cost' | 'capacity',
    period: string
  ) => {
    const agents = Array.from(agentMetrics.values());
    
    switch (type) {
      case 'performance':
        return {
          title: `Performance Report - ${period}`,
          summary: `System performance overview for ${agents.length} agents`,
          charts: [
            { type: 'success-rate', data: agents.map(a => ({ name: a.agentName, value: a.successRate })) },
            { type: 'response-time', data: agents.map(a => ({ name: a.agentName, value: a.averageExecutionTime })) },
          ],
          recommendations: getPerformanceRecommendations(agents),
        };
      default:
        throw new Error(`Report type ${type} not implemented`);
    }
  }, [agentMetrics]);

  // Forecasting and recommendations
  const forecastMetrics = useCallback((
    agentId: string,
    metric: keyof DetailedAgentMetrics,
    hours: number
  ) => {
    // Simplified forecasting - would use more sophisticated algorithms
    const agent = agentMetrics.get(agentId);
    if (!agent) return [];

    const currentValue = (agent as any)[metric];
    const forecast = [];

    for (let i = 1; i <= hours; i++) {
      forecast.push({
        time: Date.now() + (i * 3600000),
        predicted: currentValue * (0.95 + Math.random() * 0.1), // Simple random walk
        confidence: Math.max(0.1, 0.9 - (i / hours) * 0.5), // Decreasing confidence
      });
    }

    return forecast;
  }, [agentMetrics]);

  const getOptimizationSuggestions = useCallback((agentId?: string) => {
    const suggestions: Array<{
      type: 'performance' | 'resource' | 'cost';
      priority: number;
      description: string;
      expectedImpact: string;
    }> = [];

    const agents = agentId ? [agentMetrics.get(agentId)].filter(Boolean) : Array.from(agentMetrics.values());

    for (const agent of agents) {
      if (agent!.errorRate > 0.1) {
        suggestions.push({
          type: 'performance',
          priority: 9,
          description: `Agent ${agent!.agentName} has high error rate (${(agent!.errorRate * 100).toFixed(1)}%)`,
          expectedImpact: 'Reducing errors could improve overall system reliability by 15-25%',
        });
      }

      if (agent!.averageResourceUtilization > 0.8) {
        suggestions.push({
          type: 'resource',
          priority: 7,
          description: `Agent ${agent!.agentName} is resource-constrained (${(agent!.averageResourceUtilization * 100).toFixed(1)}% utilization)`,
          expectedImpact: 'Scaling resources could improve response times by 20-30%',
        });
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }, [agentMetrics]);

  const getCapacityRecommendations = useCallback(() => {
    const utilizationThreshold = 0.8;
    const lowUtilizationThreshold = 0.3;
    
    return {
      scaleUp: systemMetrics.capacityUtilization > utilizationThreshold,
      scaleDown: systemMetrics.capacityUtilization < lowUtilizationThreshold,
      reasoning: systemMetrics.capacityUtilization > utilizationThreshold 
        ? 'High capacity utilization detected. Consider adding more agents.'
        : systemMetrics.capacityUtilization < lowUtilizationThreshold
        ? 'Low capacity utilization. Consider scaling down to reduce costs.'
        : 'Current capacity appears optimal.',
      suggestedAgentCount: systemMetrics.capacityUtilization > utilizationThreshold
        ? Math.ceil(systemMetrics.totalAgents * 1.3)
        : systemMetrics.capacityUtilization < lowUtilizationThreshold
        ? Math.floor(systemMetrics.totalAgents * 0.8)
        : systemMetrics.totalAgents,
    };
  }, [systemMetrics]);

  // Real-time subscriptions
  const subscribeToMetrics = useCallback((agentIds?: string[]) => {
    console.log(`Subscribed to metrics for agents: ${agentIds?.join(', ') || 'all'}`);
  }, []);

  const unsubscribeFromMetrics = useCallback(() => {
    console.log('Unsubscribed from metrics updates');
  }, []);

  return {
    // Current metrics
    agentMetrics,
    systemMetrics,
    loading: agentsQuery.isLoading || metricsQuery.isLoading,
    error: agentsQuery.error?.message || metricsQuery.error?.message || null,

    // Data retrieval
    getAgentMetrics,
    getSystemMetrics,
    getMetricsHistory,

    // Filtering and aggregation
    filterMetrics,
    aggregateMetrics,

    // Analysis
    compareAgents,
    getTopPerformers,
    getBottlenecks,

    // Alerting
    alertRules,
    activeAlerts,
    createAlertRule,
    updateAlertRule,
    deleteAlertRule,
    acknowledgeAlert,
    muteAlerts,

    // Forecasting and recommendations
    forecastMetrics,
    getOptimizationSuggestions,
    getCapacityRecommendations,

    // Export and reporting
    exportMetrics,
    generateReport,

    // Real-time subscriptions
    subscribeToMetrics,
    unsubscribeFromMetrics,
  };
}

// Helper functions
function generateMockHourlyStats(metrics: AgentMetrics): DetailedAgentMetrics['hourlyStats'] {
  const stats = [];
  const now = Date.now();
  
  for (let i = 23; i >= 0; i--) {
    stats.push({
      hour: now - (i * 3600000),
      tasksCompleted: Math.floor(metrics.tasksSucceeded / 24) + Math.floor(Math.random() * 5),
      avgResponseTime: metrics.averageExecutionTime * (0.8 + Math.random() * 0.4),
      errorCount: Math.floor(metrics.tasksFailed / 24) + Math.floor(Math.random() * 2),
    });
  }
  
  return stats;
}

function calculateHealthScore(metrics: AgentMetrics, status: string): number {
  let score = 100;
  
  if (status !== 'ready') score -= 30;
  if (metrics.tasksExecuted > 0) {
    const errorRate = metrics.tasksFailed / metrics.tasksExecuted;
    score -= errorRate * 40;
  }
  if (metrics.cpuUsage > 80) score -= 20;
  if (metrics.memoryUsage > 80) score -= 20;
  
  return Math.max(0, Math.min(100, score));
}

function getAlertLevel(metrics: AgentMetrics, status: string): 'green' | 'yellow' | 'red' {
  const healthScore = calculateHealthScore(metrics, status);
  
  if (healthScore > 80) return 'green';
  if (healthScore > 60) return 'yellow';
  return 'red';
}

function generateAlerts(
  metrics: AgentMetrics, 
  status: string, 
  agentId: string
): DetailedAgentMetrics['activeAlerts'] {
  const alerts: DetailedAgentMetrics['activeAlerts'] = [];
  
  if (metrics.tasksExecuted > 0 && metrics.tasksFailed / metrics.tasksExecuted > 0.1) {
    alerts.push({
      type: 'error',
      severity: 'high',
      message: 'High error rate detected',
      timestamp: Date.now(),
    });
  }
  
  if (metrics.cpuUsage > 90) {
    alerts.push({
      type: 'resource',
      severity: 'critical',
      message: 'CPU usage critically high',
      timestamp: Date.now(),
    });
  }
  
  return alerts;
}

function calculateSystemThroughput(agents: DetailedAgentMetrics[]): number {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  return agents.reduce((sum, agent) => {
    const recentTasks = agent.hourlyStats
      .filter(stat => stat.hour > oneHourAgo)
      .reduce((total, stat) => total + stat.tasksCompleted, 0);
    return sum + recentTasks;
  }, 0);
}

function calculateSystemHealthScore(agents: DetailedAgentMetrics[]): number {
  if (agents.length === 0) return 100;
  
  const avgHealthScore = agents.reduce((sum, agent) => sum + agent.healthScore, 0) / agents.length;
  return avgHealthScore;
}

function identifyBottlenecks(agents: DetailedAgentMetrics[]): Array<{
  component: string;
  severity: number;
  description: string;
}> {
  const bottlenecks = [];
  
  const highErrorAgents = agents.filter(a => a.errorRate > 0.1);
  if (highErrorAgents.length > agents.length * 0.2) {
    bottlenecks.push({
      component: 'Error Rates',
      severity: 8,
      description: `${highErrorAgents.length} agents have error rates above 10%`,
    });
  }
  
  const slowAgents = agents.filter(a => a.averageExecutionTime > 30000);
  if (slowAgents.length > agents.length * 0.3) {
    bottlenecks.push({
      component: 'Response Times',
      severity: 6,
      description: `${slowAgents.length} agents have response times above 30 seconds`,
    });
  }
  
  return bottlenecks;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  
  const sorted = values.slice().sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  
  if (Math.floor(index) === index) {
    return sorted[index];
  }
  
  const lower = sorted[Math.floor(index)];
  const upper = sorted[Math.ceil(index)];
  return lower + (upper - lower) * (index - Math.floor(index));
}

function convertToCSV(data: DetailedAgentMetrics[]): string {
  if (data.length === 0) return '';
  
  const headers = [
    'agentId', 'agentName', 'agentType', 'tasksExecuted', 'successRate', 
    'errorRate', 'averageExecutionTime', 'healthScore', 'alertLevel'
  ];
  
  const rows = data.map(agent => [
    agent.agentId,
    agent.agentName,
    agent.agentType,
    agent.tasksExecuted,
    agent.successRate.toFixed(3),
    agent.errorRate.toFixed(3),
    agent.averageExecutionTime,
    agent.healthScore,
    agent.alertLevel,
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function getPerformanceRecommendations(agents: DetailedAgentMetrics[]): string[] {
  const recommendations = [];
  
  const avgSuccessRate = agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length;
  if (avgSuccessRate < 0.9) {
    recommendations.push('Overall success rate is below 90%. Consider investigating common failure patterns.');
  }
  
  const slowAgents = agents.filter(a => a.averageExecutionTime > 30000);
  if (slowAgents.length > 0) {
    recommendations.push(`${slowAgents.length} agents have slow response times. Consider performance optimization.`);
  }
  
  return recommendations;
}

export default useAgentMetrics;