import { EventEmitter } from 'events';
import { BaseAgent } from '../agents/BaseAgent';

export interface LoadMetrics {
  agentId: string;
  cpuUsage: number;
  memoryUsage: number;
  activeTaskCount: number;
  completedTaskCount: number;
  failedTaskCount: number;
  averageResponseTime: number;
  lastUpdate: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
  capacity: number;
}

export interface Task {
  id: string;
  type: string;
  priority: number;
  estimatedDuration: number;
  requiredCapabilities: string[];
  payload: any;
  deadline?: number;
  retryCount?: number;
}

export interface BalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'response-time' | 'capacity' | 'adaptive';
  healthCheckInterval: number;
  metricsUpdateInterval: number;
  maxRetries: number;
  failoverEnabled: boolean;
  stickySessionsEnabled: boolean;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface CircuitBreaker {
  agentId: string;
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: number;
  nextRetry: number;
}

export abstract class LoadBalancerStrategy {
  protected agents: Map<string, BaseAgent>;
  protected metrics: Map<string, LoadMetrics>;

  constructor(agents: Map<string, BaseAgent>) {
    this.agents = agents;
    this.metrics = new Map();
    this.initializeMetrics();
  }

  protected initializeMetrics(): void {
    for (const [id, agent] of this.agents) {
      this.metrics.set(id, {
        agentId: id,
        cpuUsage: 0,
        memoryUsage: 0,
        activeTaskCount: 0,
        completedTaskCount: 0,
        failedTaskCount: 0,
        averageResponseTime: 0,
        lastUpdate: Date.now(),
        health: 'healthy',
        capacity: 100
      });
    }
  }

  abstract selectAgent(task: Task): string | null;
  
  updateMetrics(agentId: string, metrics: Partial<LoadMetrics>): void {
    const current = this.metrics.get(agentId);
    if (current) {
      this.metrics.set(agentId, { ...current, ...metrics, lastUpdate: Date.now() });
    }
  }

  getHealthyAgents(): string[] {
    return Array.from(this.metrics.entries())
      .filter(([, metrics]) => metrics.health === 'healthy')
      .map(([id]) => id);
  }
}

export class RoundRobinStrategy extends LoadBalancerStrategy {
  private currentIndex: number = 0;

  selectAgent(task: Task): string | null {
    const healthyAgents = this.getHealthyAgents();
    if (healthyAgents.length === 0) return null;

    const agent = healthyAgents[this.currentIndex % healthyAgents.length];
    this.currentIndex++;
    return agent;
  }
}

export class LeastConnectionsStrategy extends LoadBalancerStrategy {
  selectAgent(task: Task): string | null {
    const healthyAgents = this.getHealthyAgents();
    if (healthyAgents.length === 0) return null;

    let selectedAgent: string | null = null;
    let minConnections = Infinity;

    for (const agentId of healthyAgents) {
      const metrics = this.metrics.get(agentId)!;
      if (metrics.activeTaskCount < minConnections) {
        minConnections = metrics.activeTaskCount;
        selectedAgent = agentId;
      }
    }

    return selectedAgent;
  }
}

export class WeightedStrategy extends LoadBalancerStrategy {
  private weights: Map<string, number>;

  constructor(agents: Map<string, BaseAgent>, weights?: Map<string, number>) {
    super(agents);
    this.weights = weights || new Map();
    
    // Default weights if not provided
    if (!weights) {
      for (const agentId of agents.keys()) {
        this.weights.set(agentId, 1);
      }
    }
  }

  selectAgent(task: Task): string | null {
    const healthyAgents = this.getHealthyAgents();
    if (healthyAgents.length === 0) return null;

    const totalWeight = healthyAgents.reduce(
      (sum, id) => sum + (this.weights.get(id) || 1),
      0
    );

    let random = Math.random() * totalWeight;
    
    for (const agentId of healthyAgents) {
      random -= this.weights.get(agentId) || 1;
      if (random <= 0) {
        return agentId;
      }
    }

    return healthyAgents[0];
  }

  updateWeight(agentId: string, weight: number): void {
    this.weights.set(agentId, weight);
  }
}

export class ResponseTimeStrategy extends LoadBalancerStrategy {
  selectAgent(task: Task): string | null {
    const healthyAgents = this.getHealthyAgents();
    if (healthyAgents.length === 0) return null;

    let selectedAgent: string | null = null;
    let minResponseTime = Infinity;

    for (const agentId of healthyAgents) {
      const metrics = this.metrics.get(agentId)!;
      if (metrics.averageResponseTime < minResponseTime) {
        minResponseTime = metrics.averageResponseTime;
        selectedAgent = agentId;
      }
    }

    return selectedAgent;
  }
}

export class CapacityStrategy extends LoadBalancerStrategy {
  selectAgent(task: Task): string | null {
    const healthyAgents = this.getHealthyAgents();
    if (healthyAgents.length === 0) return null;

    let selectedAgent: string | null = null;
    let maxCapacity = -1;

    for (const agentId of healthyAgents) {
      const metrics = this.metrics.get(agentId)!;
      const availableCapacity = metrics.capacity - 
        (metrics.cpuUsage * 0.3 + metrics.memoryUsage * 0.3 + 
         (metrics.activeTaskCount / 10) * 0.4) * 100;
      
      if (availableCapacity > maxCapacity) {
        maxCapacity = availableCapacity;
        selectedAgent = agentId;
      }
    }

    return selectedAgent;
  }
}

export class AdaptiveStrategy extends LoadBalancerStrategy {
  private performanceHistory: Map<string, number[]>;
  private taskTypeAffinity: Map<string, Map<string, number>>;
  private learningRate: number = 0.1;

  constructor(agents: Map<string, BaseAgent>) {
    super(agents);
    this.performanceHistory = new Map();
    this.taskTypeAffinity = new Map();
    
    for (const agentId of agents.keys()) {
      this.performanceHistory.set(agentId, []);
      this.taskTypeAffinity.set(agentId, new Map());
    }
  }

  selectAgent(task: Task): string | null {
    const healthyAgents = this.getHealthyAgents();
    if (healthyAgents.length === 0) return null;

    let bestAgent: string | null = null;
    let bestScore = -Infinity;

    for (const agentId of healthyAgents) {
      const score = this.calculateAgentScore(agentId, task);
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }

  private calculateAgentScore(agentId: string, task: Task): number {
    const metrics = this.metrics.get(agentId)!;
    
    // Base score from current metrics
    const loadScore = (100 - metrics.cpuUsage) * 0.2 + 
                     (100 - metrics.memoryUsage) * 0.2;
    const performanceScore = metrics.completedTaskCount > 0 
      ? (metrics.completedTaskCount / (metrics.completedTaskCount + metrics.failedTaskCount)) * 30
      : 15;
    const responseTimeScore = Math.max(0, 30 - metrics.averageResponseTime / 100);
    
    // Task type affinity score
    const affinity = this.taskTypeAffinity.get(agentId)?.get(task.type) || 0;
    const affinityScore = affinity * 20;
    
    // Priority adjustment
    const priorityMultiplier = task.priority > 5 ? 1.2 : 1.0;
    
    // Deadline consideration
    let deadlineScore = 0;
    if (task.deadline) {
      const timeToDeadline = task.deadline - Date.now();
      const canMeetDeadline = timeToDeadline > metrics.averageResponseTime;
      deadlineScore = canMeetDeadline ? 10 : -20;
    }

    return (loadScore + performanceScore + responseTimeScore + affinityScore + deadlineScore) * priorityMultiplier;
  }

  updatePerformance(agentId: string, taskType: string, success: boolean, responseTime: number): void {
    // Update performance history
    const history = this.performanceHistory.get(agentId) || [];
    history.push(success ? 1 : 0);
    if (history.length > 100) history.shift(); // Keep last 100 results
    this.performanceHistory.set(agentId, history);

    // Update task type affinity
    const affinities = this.taskTypeAffinity.get(agentId) || new Map();
    const currentAffinity = affinities.get(taskType) || 0;
    const performanceScore = success ? 1 - (responseTime / 10000) : -0.5; // Normalize response time
    const newAffinity = currentAffinity * (1 - this.learningRate) + performanceScore * this.learningRate;
    affinities.set(taskType, Math.max(-1, Math.min(1, newAffinity))); // Clamp between -1 and 1
    this.taskTypeAffinity.set(agentId, affinities);
  }
}

export class LoadBalancer extends EventEmitter {
  private config: BalancerConfig;
  private agents: Map<string, BaseAgent>;
  private strategy: LoadBalancerStrategy;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private stickySessions: Map<string, string>; // sessionId -> agentId
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private taskQueue: Task[];
  private processingTasks: Map<string, { task: Task; agentId: string; startTime: number }>;

  constructor(config: Partial<BalancerConfig> = {}) {
    super();
    this.config = {
      strategy: 'round-robin',
      healthCheckInterval: 30000, // 30 seconds
      metricsUpdateInterval: 5000, // 5 seconds
      maxRetries: 3,
      failoverEnabled: true,
      stickySessionsEnabled: false,
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      ...config
    };

    this.agents = new Map();
    this.circuitBreakers = new Map();
    this.stickySessions = new Map();
    this.taskQueue = [];
    this.processingTasks = new Map();
    this.strategy = this.createStrategy();

    this.startHealthChecks();
    this.startMetricsCollection();
  }

  private createStrategy(): LoadBalancerStrategy {
    switch (this.config.strategy) {
      case 'round-robin':
        return new RoundRobinStrategy(this.agents);
      case 'least-connections':
        return new LeastConnectionsStrategy(this.agents);
      case 'weighted':
        return new WeightedStrategy(this.agents);
      case 'response-time':
        return new ResponseTimeStrategy(this.agents);
      case 'capacity':
        return new CapacityStrategy(this.agents);
      case 'adaptive':
        return new AdaptiveStrategy(this.agents);
      default:
        return new RoundRobinStrategy(this.agents);
    }
  }

  public registerAgent(agentId: string, agent: BaseAgent): void {
    this.agents.set(agentId, agent);
    
    if (this.config.circuitBreakerEnabled) {
      this.circuitBreakers.set(agentId, {
        agentId,
        state: 'closed',
        failures: 0,
        lastFailure: 0,
        nextRetry: 0
      });
    }

    // Recreate strategy with new agents
    this.strategy = this.createStrategy();
    
    this.emit('agent:registered', agentId);
  }

  public unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.circuitBreakers.delete(agentId);
    
    // Remove from sticky sessions
    for (const [sessionId, assignedAgent] of this.stickySessions) {
      if (assignedAgent === agentId) {
        this.stickySessions.delete(sessionId);
      }
    }

    // Recreate strategy
    this.strategy = this.createStrategy();
    
    this.emit('agent:unregistered', agentId);
  }

  public async execute(task: Task, sessionId?: string): Promise<any> {
    let agentId: string | null = null;
    
    // Check sticky sessions
    if (this.config.stickySessionsEnabled && sessionId) {
      agentId = this.stickySessions.get(sessionId) || null;
      
      // Verify agent is still healthy
      if (agentId && !this.isAgentHealthy(agentId)) {
        this.stickySessions.delete(sessionId);
        agentId = null;
      }
    }

    // Select agent if not sticky or sticky agent unavailable
    if (!agentId) {
      agentId = await this.selectAgent(task);
      
      if (!agentId) {
        throw new Error('No available agents to handle task');
      }

      // Update sticky session
      if (this.config.stickySessionsEnabled && sessionId) {
        this.stickySessions.set(sessionId, agentId);
      }
    }

    // Execute task with retries
    return this.executeWithRetries(task, agentId);
  }

  private async selectAgent(task: Task): Promise<string | null> {
    // Check circuit breakers
    if (this.config.circuitBreakerEnabled) {
      this.updateCircuitBreakers();
    }

    // Get available agents (not circuit broken)
    const availableAgents = this.getAvailableAgents();
    
    if (availableAgents.length === 0) {
      if (this.config.failoverEnabled) {
        // Try to reset some circuit breakers for failover
        this.attemptFailover();
        return this.strategy.selectAgent(task);
      }
      return null;
    }

    return this.strategy.selectAgent(task);
  }

  private async executeWithRetries(task: Task, agentId: string): Promise<any> {
    let lastError: any;
    const maxRetries = task.retryCount !== undefined ? task.retryCount : this.config.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeTask(task, agentId);
        this.onTaskSuccess(task, agentId);
        return result;
      } catch (error) {
        lastError = error;
        this.onTaskFailure(task, agentId, error);

        if (attempt < maxRetries) {
          // Try different agent for retry
          const newAgentId = await this.selectAgent(task);
          if (newAgentId && newAgentId !== agentId) {
            agentId = newAgentId;
          } else if (!newAgentId) {
            break; // No agents available
          }
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Task execution failed after all retries');
  }

  private async executeTask(task: Task, agentId: string): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const startTime = Date.now();
    this.processingTasks.set(task.id, { task, agentId, startTime });

    try {
      // Update metrics
      const metrics = this.strategy.metrics.get(agentId);
      if (metrics) {
        metrics.activeTaskCount++;
        this.strategy.updateMetrics(agentId, { activeTaskCount: metrics.activeTaskCount });
      }

      // Execute task on agent
      const result = await agent.executeTask({
        id: task.id,
        type: task.type,
        input: task.payload,
        config: {},
        metadata: {
          priority: task.priority,
          deadline: task.deadline
        }
      });

      return result;
    } finally {
      this.processingTasks.delete(task.id);
      
      // Update metrics
      const metrics = this.strategy.metrics.get(agentId);
      if (metrics) {
        metrics.activeTaskCount--;
        const responseTime = Date.now() - startTime;
        const avgResponseTime = (metrics.averageResponseTime * metrics.completedTaskCount + responseTime) / 
                               (metrics.completedTaskCount + 1);
        
        this.strategy.updateMetrics(agentId, {
          activeTaskCount: metrics.activeTaskCount,
          averageResponseTime: avgResponseTime
        });
      }
    }
  }

  private onTaskSuccess(task: Task, agentId: string): void {
    // Update metrics
    const metrics = this.strategy.metrics.get(agentId);
    if (metrics) {
      metrics.completedTaskCount++;
      this.strategy.updateMetrics(agentId, { completedTaskCount: metrics.completedTaskCount });
    }

    // Update adaptive strategy if applicable
    if (this.strategy instanceof AdaptiveStrategy) {
      const responseTime = Date.now() - (this.processingTasks.get(task.id)?.startTime || Date.now());
      this.strategy.updatePerformance(agentId, task.type, true, responseTime);
    }

    // Reset circuit breaker failures
    if (this.config.circuitBreakerEnabled) {
      const breaker = this.circuitBreakers.get(agentId);
      if (breaker) {
        breaker.failures = 0;
        breaker.state = 'closed';
      }
    }

    this.emit('task:success', { task, agentId });
  }

  private onTaskFailure(task: Task, agentId: string, error: any): void {
    // Update metrics
    const metrics = this.strategy.metrics.get(agentId);
    if (metrics) {
      metrics.failedTaskCount++;
      this.strategy.updateMetrics(agentId, { failedTaskCount: metrics.failedTaskCount });
    }

    // Update adaptive strategy if applicable
    if (this.strategy instanceof AdaptiveStrategy) {
      const responseTime = Date.now() - (this.processingTasks.get(task.id)?.startTime || Date.now());
      this.strategy.updatePerformance(agentId, task.type, false, responseTime);
    }

    // Update circuit breaker
    if (this.config.circuitBreakerEnabled) {
      const breaker = this.circuitBreakers.get(agentId);
      if (breaker) {
        breaker.failures++;
        breaker.lastFailure = Date.now();
        
        if (breaker.failures >= this.config.circuitBreakerThreshold) {
          breaker.state = 'open';
          breaker.nextRetry = Date.now() + this.config.circuitBreakerTimeout;
          this.emit('circuit-breaker:opened', agentId);
        }
      }
    }

    this.emit('task:failure', { task, agentId, error });
  }

  private isAgentHealthy(agentId: string): boolean {
    const metrics = this.strategy.metrics.get(agentId);
    if (!metrics || metrics.health !== 'healthy') {
      return false;
    }

    if (this.config.circuitBreakerEnabled) {
      const breaker = this.circuitBreakers.get(agentId);
      if (breaker && breaker.state === 'open') {
        return false;
      }
    }

    return true;
  }

  private getAvailableAgents(): string[] {
    return Array.from(this.agents.keys()).filter(agentId => {
      if (!this.isAgentHealthy(agentId)) {
        return false;
      }

      if (this.config.circuitBreakerEnabled) {
        const breaker = this.circuitBreakers.get(agentId);
        if (breaker && breaker.state === 'open') {
          return false;
        }
      }

      return true;
    });
  }

  private updateCircuitBreakers(): void {
    const now = Date.now();
    
    for (const breaker of this.circuitBreakers.values()) {
      if (breaker.state === 'open' && now >= breaker.nextRetry) {
        breaker.state = 'half-open';
        this.emit('circuit-breaker:half-open', breaker.agentId);
      }
    }
  }

  private attemptFailover(): void {
    // Reset the least failed circuit breaker
    let minFailures = Infinity;
    let candidateBreaker: CircuitBreaker | null = null;

    for (const breaker of this.circuitBreakers.values()) {
      if (breaker.state === 'open' && breaker.failures < minFailures) {
        minFailures = breaker.failures;
        candidateBreaker = breaker;
      }
    }

    if (candidateBreaker) {
      candidateBreaker.state = 'half-open';
      candidateBreaker.failures = Math.floor(candidateBreaker.failures / 2); // Reduce failure count
      this.emit('failover:attempted', candidateBreaker.agentId);
    }
  }

  private async performHealthCheck(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      // Perform health check (could be customized per agent type)
      const health = await agent.getHealth?.();
      
      const metrics = this.strategy.metrics.get(agentId);
      if (metrics) {
        metrics.health = health || 'healthy';
        metrics.lastUpdate = Date.now();
      }
    } catch (error) {
      const metrics = this.strategy.metrics.get(agentId);
      if (metrics) {
        metrics.health = 'unhealthy';
        metrics.lastUpdate = Date.now();
      }
      this.emit('health-check:failed', { agentId, error });
    }
  }

  private async collectMetrics(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      const agentMetrics = await agent.getMetrics?.();
      if (agentMetrics) {
        this.strategy.updateMetrics(agentId, {
          cpuUsage: agentMetrics.cpuUsage || 0,
          memoryUsage: agentMetrics.memoryUsage || 0,
          capacity: agentMetrics.capacity || 100
        });
      }
    } catch (error) {
      console.error(`Failed to collect metrics for agent ${agentId}:`, error);
    }
  }

  private startHealthChecks(): void {
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(async () => {
        const checks = Array.from(this.agents.keys()).map(agentId => 
          this.performHealthCheck(agentId)
        );
        await Promise.all(checks);
      }, this.config.healthCheckInterval);
    }
  }

  private startMetricsCollection(): void {
    if (this.config.metricsUpdateInterval > 0) {
      this.metricsInterval = setInterval(async () => {
        const collections = Array.from(this.agents.keys()).map(agentId => 
          this.collectMetrics(agentId)
        );
        await Promise.all(collections);
      }, this.config.metricsUpdateInterval);
    }
  }

  public getMetrics(): Map<string, LoadMetrics> {
    return new Map(this.strategy.metrics);
  }

  public getCircuitBreakerStatus(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  public setStrategy(strategy: BalancerConfig['strategy']): void {
    this.config.strategy = strategy;
    this.strategy = this.createStrategy();
    this.emit('strategy:changed', strategy);
  }

  public shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.emit('balancer:shutdown');
  }
}

export default LoadBalancer;