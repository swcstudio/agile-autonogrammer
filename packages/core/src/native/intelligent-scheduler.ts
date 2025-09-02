/**
 * Intelligent Work-Stealing Scheduler with ML-Driven Load Balancing
 * 
 * This system uses machine learning to predict optimal task distribution
 * and automatically adjusts thread allocation based on historical performance.
 */

import { ThreadMetrics, ThreadWorker } from './thread-primitives.js';

export interface SchedulingDecision {
  threadPool: 'cpu-bound' | 'io-bound' | 'ai-optimized' | 'mixed';
  priority: number;
  estimatedDuration: number;
  resourceRequirements: {
    cpu: number;
    memory: number;
    bandwidth: number;
  };
}

export interface TaskProfile {
  operation: string;
  dataSize: number;
  complexity: number;
  historicalDuration: number[];
  historicalMemoryUsage: number[];
  successRate: number;
  lastExecuted: number;
}

export interface IntelligentSchedulerConfig {
  learningRate: number;
  adaptationInterval: number;
  enablePredictiveScheduling: boolean;
  maxHistorySize: number;
  enableWorkStealing: boolean;
  balancingStrategy: 'performance' | 'efficiency' | 'latency';
}

export interface SystemMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  networkUtilization: number;
  threadPoolUtilization: Record<string, number>;
  queueSizes: Record<string, number>;
  averageTaskDuration: Record<string, number>;
  systemLoad: number;
  timestamp: number;
}

/**
 * Machine Learning-based Task Scheduler
 * Uses online learning to continuously improve scheduling decisions
 */
export class IntelligentScheduler {
  private config: IntelligentSchedulerConfig;
  private taskProfiles = new Map<string, TaskProfile>();
  private systemMetricsHistory: SystemMetrics[] = [];
  private decisionTree: DecisionNode | null = null;
  private performanceModel: PerformancePredictor;
  private workStealingManager: WorkStealingManager;
  private metricsCollector: MetricsCollector;

  constructor(config: Partial<IntelligentSchedulerConfig> = {}) {
    this.config = {
      learningRate: 0.1,
      adaptationInterval: 5000, // 5 seconds
      enablePredictiveScheduling: true,
      maxHistorySize: 1000,
      enableWorkStealing: true,
      balancingStrategy: 'performance',
      ...config
    };

    this.performanceModel = new PerformancePredictor(this.config.learningRate);
    this.workStealingManager = new WorkStealingManager();
    this.metricsCollector = new MetricsCollector();
    
    this.startAdaptationLoop();
  }

  /**
   * Make intelligent scheduling decision for a task
   */
  async optimizeTask<T>(operation: string, data: T): Promise<{
    operation: string;
    data: T;
    schedulingDecision: SchedulingDecision;
    metadata: any;
  }> {
    const taskProfile = this.getOrCreateTaskProfile(operation, data);
    const currentMetrics = await this.metricsCollector.getCurrentMetrics();
    
    // Use ML model to predict optimal scheduling
    const decision = await this.performanceModel.predictOptimalScheduling(
      taskProfile,
      currentMetrics,
      this.systemMetricsHistory
    );

    // Apply work-stealing optimization if enabled
    if (this.config.enableWorkStealing) {
      const workStealingAdjustment = this.workStealingManager.optimizeDecision(
        decision,
        currentMetrics
      );
      Object.assign(decision, workStealingAdjustment);
    }

    // Update task profile with prediction
    taskProfile.lastExecuted = Date.now();

    return {
      operation,
      data,
      schedulingDecision: decision,
      metadata: {
        taskProfile,
        confidence: this.performanceModel.getConfidence(taskProfile),
        systemLoad: currentMetrics.systemLoad
      }
    };
  }

  /**
   * Record task execution results for learning
   */
  recordTaskResult(
    operation: string,
    actualDuration: number,
    memoryUsed: number,
    success: boolean,
    schedulingDecision: SchedulingDecision
  ) {
    const profile = this.taskProfiles.get(operation);
    if (!profile) return;

    // Update historical data
    profile.historicalDuration.push(actualDuration);
    profile.historicalMemoryUsage.push(memoryUsed);
    
    // Maintain history size limit
    if (profile.historicalDuration.length > this.config.maxHistorySize) {
      profile.historicalDuration.shift();
      profile.historicalMemoryUsage.shift();
    }

    // Update success rate
    const totalTasks = profile.historicalDuration.length;
    const previousSuccesses = profile.successRate * (totalTasks - 1);
    profile.successRate = (previousSuccesses + (success ? 1 : 0)) / totalTasks;

    // Train the performance model
    this.performanceModel.learn(profile, schedulingDecision, {
      actualDuration,
      memoryUsed,
      success
    });
  }

  /**
   * Get current scheduler performance metrics
   */
  getSchedulerMetrics() {
    return {
      totalTasksScheduled: Array.from(this.taskProfiles.values())
        .reduce((sum, profile) => sum + profile.historicalDuration.length, 0),
      averageAccuracy: this.performanceModel.getAverageAccuracy(),
      modelConfidence: this.performanceModel.getOverallConfidence(),
      workStealingEfficiency: this.workStealingManager.getEfficiency(),
      adaptationRate: this.config.learningRate,
      knownOperations: this.taskProfiles.size,
      systemLoad: this.systemMetricsHistory[this.systemMetricsHistory.length - 1]?.systemLoad || 0
    };
  }

  /**
   * Export learned model for persistence
   */
  exportModel(): SerializedModel {
    return {
      taskProfiles: Array.from(this.taskProfiles.entries()),
      decisionTree: this.decisionTree,
      modelWeights: this.performanceModel.exportWeights(),
      metricsHistory: this.systemMetricsHistory.slice(-100), // Last 100 entries
      config: this.config
    };
  }

  /**
   * Import previously learned model
   */
  importModel(model: SerializedModel) {
    this.taskProfiles = new Map(model.taskProfiles);
    this.decisionTree = model.decisionTree;
    this.performanceModel.importWeights(model.modelWeights);
    this.systemMetricsHistory = model.metricsHistory;
    this.config = { ...this.config, ...model.config };
  }

  private getOrCreateTaskProfile<T>(operation: string, data: T): TaskProfile {
    if (!this.taskProfiles.has(operation)) {
      this.taskProfiles.set(operation, {
        operation,
        dataSize: this.estimateDataSize(data),
        complexity: this.estimateComplexity(operation, data),
        historicalDuration: [],
        historicalMemoryUsage: [],
        successRate: 1.0,
        lastExecuted: 0
      });
    }
    return this.taskProfiles.get(operation)!;
  }

  private estimateDataSize<T>(data: T): number {
    if (typeof data === 'string') return data.length;
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object') return JSON.stringify(data).length;
    return 1;
  }

  private estimateComplexity<T>(operation: string, data: T): number {
    // Heuristic-based complexity estimation
    const operationComplexity = {
      'fibonacci': 5,
      'matrix-multiply': 4,
      'image-processing': 3,
      'text-analysis': 3,
      'sort': 2,
      'filter': 1,
      'map': 1
    };

    const baseComplexity = operationComplexity[operation.toLowerCase()] || 2;
    const dataComplexity = Math.log10(this.estimateDataSize(data) + 1);
    
    return baseComplexity * (1 + dataComplexity / 10);
  }

  private startAdaptationLoop() {
    setInterval(async () => {
      // Collect current system metrics
      const metrics = await this.metricsCollector.getCurrentMetrics();
      this.systemMetricsHistory.push(metrics);

      // Maintain history size
      if (this.systemMetricsHistory.length > this.config.maxHistorySize) {
        this.systemMetricsHistory.shift();
      }

      // Retrain model if we have enough data
      if (this.systemMetricsHistory.length > 10) {
        this.performanceModel.retrain(this.taskProfiles, this.systemMetricsHistory);
      }

      // Update work-stealing strategies
      if (this.config.enableWorkStealing) {
        this.workStealingManager.updateStrategies(metrics);
      }

    }, this.config.adaptationInterval);
  }
}

/**
 * ML Performance Predictor using simple neural network
 */
class PerformancePredictor {
  private learningRate: number;
  private weights: Map<string, number[]> = new Map();
  private bias: Map<string, number> = new Map();
  private accuracy: number[] = [];

  constructor(learningRate: number) {
    this.learningRate = learningRate;
  }

  async predictOptimalScheduling(
    taskProfile: TaskProfile,
    currentMetrics: SystemMetrics,
    history: SystemMetrics[]
  ): Promise<SchedulingDecision> {
    const features = this.extractFeatures(taskProfile, currentMetrics, history);
    
    // Predict thread pool type
    const poolScores = {
      'cpu-bound': this.predict('cpu-bound', features),
      'io-bound': this.predict('io-bound', features),
      'ai-optimized': this.predict('ai-optimized', features),
      'mixed': this.predict('mixed', features)
    };

    const bestPool = Object.entries(poolScores)
      .reduce((a, b) => poolScores[a[0]] > poolScores[b[0]] ? a : b)[0] as any;

    // Predict resource requirements
    const estimatedDuration = this.predictDuration(taskProfile, currentMetrics);
    const priority = this.calculatePriority(taskProfile, currentMetrics);

    return {
      threadPool: bestPool,
      priority,
      estimatedDuration,
      resourceRequirements: {
        cpu: this.predict('cpu-requirement', features),
        memory: this.predict('memory-requirement', features),
        bandwidth: this.predict('bandwidth-requirement', features)
      }
    };
  }

  learn(
    profile: TaskProfile,
    decision: SchedulingDecision,
    result: { actualDuration: number; memoryUsed: number; success: boolean }
  ) {
    const features = this.extractFeatures(profile, null, []);
    const target = result.success ? 1.0 : 0.0;
    
    // Simple gradient descent update
    const poolWeights = this.getWeights(decision.threadPool);
    const prediction = this.predict(decision.threadPool, features);
    const error = target - prediction;

    // Update weights
    for (let i = 0; i < features.length; i++) {
      poolWeights[i] += this.learningRate * error * features[i];
    }

    // Update bias
    const bias = this.bias.get(decision.threadPool) || 0;
    this.bias.set(decision.threadPool, bias + this.learningRate * error);

    // Track accuracy
    this.accuracy.push(Math.abs(error) < 0.1 ? 1 : 0);
    if (this.accuracy.length > 100) {
      this.accuracy.shift();
    }
  }

  private predict(operation: string, features: number[]): number {
    const weights = this.getWeights(operation);
    const bias = this.bias.get(operation) || 0;
    
    let sum = bias;
    for (let i = 0; i < features.length; i++) {
      sum += weights[i] * features[i];
    }
    
    return this.sigmoid(sum);
  }

  private extractFeatures(
    profile: TaskProfile,
    metrics: SystemMetrics | null,
    history: SystemMetrics[]
  ): number[] {
    const features = [
      profile.complexity,
      Math.log10(profile.dataSize + 1),
      profile.successRate,
      profile.historicalDuration.length > 0 
        ? profile.historicalDuration.reduce((a, b) => a + b) / profile.historicalDuration.length 
        : 0,
    ];

    if (metrics) {
      features.push(
        metrics.cpuUtilization,
        metrics.memoryUtilization,
        metrics.systemLoad
      );
    } else {
      features.push(0, 0, 0);
    }

    return features;
  }

  private getWeights(operation: string): number[] {
    if (!this.weights.has(operation)) {
      // Initialize with small random weights
      this.weights.set(operation, Array.from({ length: 7 }, () => Math.random() * 0.1 - 0.05));
    }
    return this.weights.get(operation)!;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private predictDuration(profile: TaskProfile, metrics: SystemMetrics): number {
    if (profile.historicalDuration.length === 0) {
      return profile.complexity * 100; // Fallback estimate
    }
    
    const avgDuration = profile.historicalDuration.reduce((a, b) => a + b) / profile.historicalDuration.length;
    const loadFactor = metrics.systemLoad;
    
    return avgDuration * (1 + loadFactor * 0.5);
  }

  private calculatePriority(profile: TaskProfile, metrics: SystemMetrics): number {
    const urgencyScore = profile.complexity * (1 - profile.successRate);
    const loadScore = metrics.systemLoad;
    return Math.max(1, Math.min(10, Math.round(urgencyScore + loadScore * 5)));
  }

  getAverageAccuracy(): number {
    return this.accuracy.length > 0 
      ? this.accuracy.reduce((a, b) => a + b) / this.accuracy.length 
      : 0;
  }

  getConfidence(profile: TaskProfile): number {
    return Math.min(1, profile.historicalDuration.length / 10);
  }

  getOverallConfidence(): number {
    return this.accuracy.length / 100;
  }

  exportWeights() {
    return {
      weights: Array.from(this.weights.entries()),
      bias: Array.from(this.bias.entries()),
      accuracy: this.accuracy
    };
  }

  importWeights(data: any) {
    this.weights = new Map(data.weights);
    this.bias = new Map(data.bias);
    this.accuracy = data.accuracy || [];
  }

  retrain(profiles: Map<string, TaskProfile>, history: SystemMetrics[]) {
    // Implement periodic retraining logic here
    console.log('Retraining model with', profiles.size, 'profiles and', history.length, 'historical metrics');
  }
}

/**
 * Work-Stealing Manager for dynamic load balancing
 */
class WorkStealingManager {
  private stealingHistory: Array<{ from: string; to: string; success: boolean; timestamp: number }> = [];
  
  optimizeDecision(decision: SchedulingDecision, metrics: SystemMetrics): Partial<SchedulingDecision> {
    const overloadedPools = Object.entries(metrics.threadPoolUtilization)
      .filter(([pool, utilization]) => utilization > 0.8)
      .map(([pool]) => pool);

    const underloadedPools = Object.entries(metrics.threadPoolUtilization)
      .filter(([pool, utilization]) => utilization < 0.4)
      .map(([pool]) => pool);

    // If the chosen pool is overloaded and there are underloaded alternatives
    if (overloadedPools.includes(decision.threadPool) && underloadedPools.length > 0) {
      const alternativePool = this.selectBestAlternative(decision.threadPool, underloadedPools);
      if (alternativePool) {
        return { threadPool: alternativePool as any };
      }
    }

    return {};
  }

  private selectBestAlternative(currentPool: string, alternatives: string[]): string | null {
    // Simple heuristic: prefer pools with similar characteristics
    const poolSimilarity = {
      'cpu-bound': ['mixed', 'ai-optimized', 'io-bound'],
      'io-bound': ['mixed', 'cpu-bound', 'ai-optimized'],
      'ai-optimized': ['cpu-bound', 'mixed', 'io-bound'],
      'mixed': ['cpu-bound', 'io-bound', 'ai-optimized']
    };

    const preferences = poolSimilarity[currentPool] || alternatives;
    return alternatives.find(alt => preferences.includes(alt)) || alternatives[0];
  }

  updateStrategies(metrics: SystemMetrics) {
    // Clean old stealing history
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.stealingHistory = this.stealingHistory.filter(entry => entry.timestamp > oneHourAgo);
  }

  getEfficiency(): number {
    if (this.stealingHistory.length === 0) return 1.0;
    
    const successCount = this.stealingHistory.filter(entry => entry.success).length;
    return successCount / this.stealingHistory.length;
  }
}

/**
 * System Metrics Collector
 */
class MetricsCollector {
  async getCurrentMetrics(): Promise<SystemMetrics> {
    // In a real implementation, this would gather actual system metrics
    // For now, we'll provide mock data that represents realistic metrics
    return {
      cpuUtilization: this.getCPUUtilization(),
      memoryUtilization: this.getMemoryUtilization(),
      networkUtilization: Math.random() * 0.3,
      threadPoolUtilization: {
        'cpu-bound': Math.random() * 0.8,
        'io-bound': Math.random() * 0.6,
        'ai-optimized': Math.random() * 0.4,
        'mixed': Math.random() * 0.7
      },
      queueSizes: {
        'cpu-bound': Math.floor(Math.random() * 10),
        'io-bound': Math.floor(Math.random() * 15),
        'ai-optimized': Math.floor(Math.random() * 5),
        'mixed': Math.floor(Math.random() * 12)
      },
      averageTaskDuration: {
        'cpu-bound': 50 + Math.random() * 100,
        'io-bound': 200 + Math.random() * 300,
        'ai-optimized': 1000 + Math.random() * 2000,
        'mixed': 150 + Math.random() * 200
      },
      systemLoad: this.getSystemLoad(),
      timestamp: Date.now()
    };
  }

  private getCPUUtilization(): number {
    // Mock CPU utilization with some realistic patterns
    const baseUtilization = 0.3;
    const variance = Math.sin(Date.now() / 10000) * 0.2;
    return Math.max(0, Math.min(1, baseUtilization + variance + Math.random() * 0.1));
  }

  private getMemoryUtilization(): number {
    // Mock memory utilization
    return 0.4 + Math.random() * 0.3;
  }

  private getSystemLoad(): number {
    // Mock system load average
    return Math.max(0, Math.min(4, 1 + Math.random() * 2));
  }
}

// Type definitions
interface DecisionNode {
  feature: string;
  threshold: number;
  left: DecisionNode | SchedulingDecision;
  right: DecisionNode | SchedulingDecision;
}

interface SerializedModel {
  taskProfiles: Array<[string, TaskProfile]>;
  decisionTree: DecisionNode | null;
  modelWeights: any;
  metricsHistory: SystemMetrics[];
  config: IntelligentSchedulerConfig;
}

export { IntelligentScheduler };