import { EventEmitter } from 'events';
import type { Task, TaskResult } from '../types/agents';
import type { BaseAgent } from '../agents/BaseAgent';

// Experience data structures
export interface TaskExperience {
  id: string;
  agentId: string;
  agentType: string;
  task: Task;
  result: TaskResult;
  context: {
    timestamp: number;
    environment: Record<string, any>;
    dependencies: string[];
    priority: number;
    expectedDuration: number;
    actualDuration: number;
  };
  performance: {
    success: boolean;
    quality: number; // 0-1 quality score
    efficiency: number; // 0-1 efficiency score
    resourceUsage: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
  metadata: {
    userId?: string;
    sessionId?: string;
    workflowId?: string;
    tags: string[];
    feedback?: {
      rating: number; // 1-5 user rating
      comments: string;
      corrections?: any;
    };
  };
}

export interface AgentCapabilityProfile {
  agentId: string;
  agentType: string;
  capabilities: Map<string, {
    proficiency: number; // 0-1 skill level
    confidence: number; // 0-1 confidence in assessment
    experienceCount: number;
    successRate: number;
    averageQuality: number;
    averageEfficiency: number;
    learningTrend: 'improving' | 'stable' | 'declining';
    lastUpdated: number;
  }>;
  specializations: string[]; // Tasks this agent excels at
  weaknesses: string[]; // Tasks this agent struggles with
  optimalWorkload: {
    maxConcurrent: number;
    preferredTaskTypes: string[];
    avoidTaskTypes: string[];
  };
}

export interface TaskPattern {
  id: string;
  pattern: string; // Regex pattern for task matching
  frequency: number; // How often this pattern appears
  difficulty: number; // 0-1 difficulty assessment
  requiredCapabilities: string[];
  optimalAgentTypes: string[];
  commonFailures: Array<{
    error: string;
    frequency: number;
    solutions: string[];
  }>;
  performanceExpectations: {
    expectedDuration: number;
    expectedQuality: number;
    expectedResourceUsage: number;
  };
}

export interface LearningInsight {
  id: string;
  type: 'capability' | 'pattern' | 'optimization' | 'anomaly';
  confidence: number; // 0-1 confidence in insight
  insight: string;
  evidence: Array<{
    experienceId: string;
    relevance: number;
  }>;
  recommendations: Array<{
    action: string;
    expectedImpact: number;
    priority: number;
  }>;
  createdAt: number;
  validUntil?: number;
}

export interface ExperienceQuery {
  agentIds?: string[];
  agentTypes?: string[];
  taskTypes?: string[];
  timeRange?: {
    start: number;
    end: number;
  };
  successOnly?: boolean;
  minQuality?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface LearningConfig {
  retentionPeriod: number; // Days to keep experiences
  maxExperiences: number; // Maximum experiences to store
  patternDetectionThreshold: number; // Minimum frequency for pattern detection
  insightGenerationInterval: number; // Milliseconds between insight generation
  capabilityUpdateInterval: number; // Milliseconds between capability updates
  anomalyDetectionSensitivity: number; // 0-1 sensitivity for anomaly detection
  enableAutoOptimization: boolean;
  enablePatternLearning: boolean;
  enableCapabilityProfiling: boolean;
}

/**
 * Repository for storing and learning from agent task experiences
 * Provides machine learning capabilities for agent optimization
 */
export class ExperienceRepository extends EventEmitter {
  private experiences: Map<string, TaskExperience>;
  private agentProfiles: Map<string, AgentCapabilityProfile>;
  private taskPatterns: Map<string, TaskPattern>;
  private insights: Map<string, LearningInsight>;
  private config: LearningConfig;
  private learningTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<LearningConfig> = {}) {
    super();
    
    this.experiences = new Map();
    this.agentProfiles = new Map();
    this.taskPatterns = new Map();
    this.insights = new Map();
    
    this.config = {
      retentionPeriod: 30, // 30 days
      maxExperiences: 100000,
      patternDetectionThreshold: 5,
      insightGenerationInterval: 3600000, // 1 hour
      capabilityUpdateInterval: 1800000, // 30 minutes
      anomalyDetectionSensitivity: 0.8,
      enableAutoOptimization: true,
      enablePatternLearning: true,
      enableCapabilityProfiling: true,
      ...config,
    };

    this.startLearningLoop();
    this.startCleanupLoop();
  }

  /**
   * Record a task experience
   */
  public async recordExperience(
    agentId: string,
    agentType: string,
    task: Task,
    result: TaskResult,
    context: Partial<TaskExperience['context']> = {},
    metadata: Partial<TaskExperience['metadata']> = {}
  ): Promise<string> {
    const experienceId = this.generateExperienceId();
    
    const experience: TaskExperience = {
      id: experienceId,
      agentId,
      agentType,
      task,
      result,
      context: {
        timestamp: Date.now(),
        environment: {},
        dependencies: [],
        priority: task.metadata?.priority || 5,
        expectedDuration: task.metadata?.estimatedDuration || 0,
        actualDuration: result.executionTime || 0,
        ...context,
      },
      performance: {
        success: result.success,
        quality: this.assessTaskQuality(task, result),
        efficiency: this.assessTaskEfficiency(task, result, context),
        resourceUsage: {
          cpu: 0, // Would be measured during execution
          memory: 0,
          network: 0,
        },
      },
      metadata: {
        tags: [],
        ...metadata,
      },
    };

    // Store experience
    this.experiences.set(experienceId, experience);
    
    // Enforce storage limits
    this.enforceStorageLimits();

    // Update agent profile immediately for critical learning
    if (this.config.enableCapabilityProfiling) {
      await this.updateAgentProfile(agentId, experience);
    }

    // Emit event for real-time learning
    this.emit('experience:recorded', { experienceId, experience });

    return experienceId;
  }

  /**
   * Query experiences with filtering
   */
  public queryExperiences(query: ExperienceQuery): TaskExperience[] {
    let results = Array.from(this.experiences.values());

    // Apply filters
    if (query.agentIds) {
      results = results.filter(exp => query.agentIds!.includes(exp.agentId));
    }

    if (query.agentTypes) {
      results = results.filter(exp => query.agentTypes!.includes(exp.agentType));
    }

    if (query.taskTypes) {
      results = results.filter(exp => 
        query.taskTypes!.some(type => exp.task.type.includes(type))
      );
    }

    if (query.timeRange) {
      results = results.filter(exp => 
        exp.context.timestamp >= query.timeRange!.start &&
        exp.context.timestamp <= query.timeRange!.end
      );
    }

    if (query.successOnly) {
      results = results.filter(exp => exp.performance.success);
    }

    if (query.minQuality) {
      results = results.filter(exp => exp.performance.quality >= query.minQuality!);
    }

    if (query.tags) {
      results = results.filter(exp => 
        query.tags!.some(tag => exp.metadata.tags.includes(tag))
      );
    }

    // Sort by timestamp (most recent first)
    results.sort((a, b) => b.context.timestamp - a.context.timestamp);

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get agent capability profile
   */
  public getAgentProfile(agentId: string): AgentCapabilityProfile | null {
    return this.agentProfiles.get(agentId) || null;
  }

  /**
   * Get all agent profiles
   */
  public getAllAgentProfiles(): Map<string, AgentCapabilityProfile> {
    return new Map(this.agentProfiles);
  }

  /**
   * Get task patterns
   */
  public getTaskPatterns(): Map<string, TaskPattern> {
    return new Map(this.taskPatterns);
  }

  /**
   * Get learning insights
   */
  public getInsights(type?: LearningInsight['type']): LearningInsight[] {
    let insights = Array.from(this.insights.values());
    
    if (type) {
      insights = insights.filter(insight => insight.type === type);
    }

    // Filter out expired insights
    const now = Date.now();
    insights = insights.filter(insight => 
      !insight.validUntil || insight.validUntil > now
    );

    // Sort by confidence
    insights.sort((a, b) => b.confidence - a.confidence);

    return insights;
  }

  /**
   * Get performance analytics
   */
  public getPerformanceAnalytics(query: ExperienceQuery = {}): {
    totalExperiences: number;
    successRate: number;
    averageQuality: number;
    averageEfficiency: number;
    taskTypeBreakdown: Record<string, {
      count: number;
      successRate: number;
      averageQuality: number;
    }>;
    agentTypeBreakdown: Record<string, {
      count: number;
      successRate: number;
      averageQuality: number;
    }>;
    trends: {
      period: string;
      successRate: number;
      quality: number;
      efficiency: number;
    }[];
  } {
    const experiences = this.queryExperiences(query);
    
    if (experiences.length === 0) {
      return {
        totalExperiences: 0,
        successRate: 0,
        averageQuality: 0,
        averageEfficiency: 0,
        taskTypeBreakdown: {},
        agentTypeBreakdown: {},
        trends: [],
      };
    }

    const successCount = experiences.filter(exp => exp.performance.success).length;
    const successRate = successCount / experiences.length;
    
    const averageQuality = experiences.reduce((sum, exp) => 
      sum + exp.performance.quality, 0) / experiences.length;
    
    const averageEfficiency = experiences.reduce((sum, exp) => 
      sum + exp.performance.efficiency, 0) / experiences.length;

    // Task type breakdown
    const taskTypeMap = new Map<string, TaskExperience[]>();
    experiences.forEach(exp => {
      const type = exp.task.type;
      if (!taskTypeMap.has(type)) {
        taskTypeMap.set(type, []);
      }
      taskTypeMap.get(type)!.push(exp);
    });

    const taskTypeBreakdown: Record<string, any> = {};
    for (const [type, typeExps] of taskTypeMap) {
      const typeSuccessCount = typeExps.filter(exp => exp.performance.success).length;
      taskTypeBreakdown[type] = {
        count: typeExps.length,
        successRate: typeSuccessCount / typeExps.length,
        averageQuality: typeExps.reduce((sum, exp) => 
          sum + exp.performance.quality, 0) / typeExps.length,
      };
    }

    // Agent type breakdown
    const agentTypeMap = new Map<string, TaskExperience[]>();
    experiences.forEach(exp => {
      const type = exp.agentType;
      if (!agentTypeMap.has(type)) {
        agentTypeMap.set(type, []);
      }
      agentTypeMap.get(type)!.push(exp);
    });

    const agentTypeBreakdown: Record<string, any> = {};
    for (const [type, typeExps] of agentTypeMap) {
      const typeSuccessCount = typeExps.filter(exp => exp.performance.success).length;
      agentTypeBreakdown[type] = {
        count: typeExps.length,
        successRate: typeSuccessCount / typeExps.length,
        averageQuality: typeExps.reduce((sum, exp) => 
          sum + exp.performance.quality, 0) / typeExps.length,
      };
    }

    // Calculate trends (daily over last 30 days)
    const trends = this.calculateTrends(experiences, 30);

    return {
      totalExperiences: experiences.length,
      successRate,
      averageQuality,
      averageEfficiency,
      taskTypeBreakdown,
      agentTypeBreakdown,
      trends,
    };
  }

  /**
   * Get recommendations for agent selection
   */
  public getAgentRecommendations(
    task: Task,
    availableAgents: string[]
  ): Array<{
    agentId: string;
    confidence: number;
    reason: string;
    expectedPerformance: {
      successProbability: number;
      qualityScore: number;
      estimatedDuration: number;
    };
  }> {
    const recommendations: Array<{
      agentId: string;
      confidence: number;
      reason: string;
      expectedPerformance: {
        successProbability: number;
        qualityScore: number;
        estimatedDuration: number;
      };
    }> = [];

    for (const agentId of availableAgents) {
      const profile = this.agentProfiles.get(agentId);
      if (!profile) continue;

      // Find matching capabilities
      const matchingCaps = Array.from(profile.capabilities.entries())
        .filter(([cap]) => task.type.includes(cap) || cap === 'general');

      if (matchingCaps.length === 0) continue;

      // Calculate scores
      const proficiencyScores = matchingCaps.map(([, cap]) => cap.proficiency);
      const avgProficiency = proficiencyScores.reduce((sum, p) => sum + p, 0) / proficiencyScores.length;
      
      const confidenceScores = matchingCaps.map(([, cap]) => cap.confidence);
      const avgConfidence = confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length;

      // Get historical performance for similar tasks
      const similarExperiences = this.queryExperiences({
        agentIds: [agentId],
        taskTypes: [task.type],
        limit: 20,
      });

      let successProbability = 0.5; // Default
      let qualityScore = 0.5;
      let estimatedDuration = 30000; // 30s default

      if (similarExperiences.length > 0) {
        const successCount = similarExperiences.filter(exp => exp.performance.success).length;
        successProbability = successCount / similarExperiences.length;
        
        qualityScore = similarExperiences.reduce((sum, exp) => 
          sum + exp.performance.quality, 0) / similarExperiences.length;
        
        estimatedDuration = similarExperiences.reduce((sum, exp) => 
          sum + exp.context.actualDuration, 0) / similarExperiences.length;
      }

      // Adjust based on proficiency
      successProbability = Math.min(1, successProbability * (0.5 + avgProficiency * 0.5));
      qualityScore = Math.min(1, qualityScore * (0.5 + avgProficiency * 0.5));

      recommendations.push({
        agentId,
        confidence: avgConfidence,
        reason: `Proficiency: ${(avgProficiency * 100).toFixed(0)}%, Experience: ${similarExperiences.length} tasks`,
        expectedPerformance: {
          successProbability,
          qualityScore,
          estimatedDuration,
        },
      });
    }

    // Sort by expected performance (weighted score)
    recommendations.sort((a, b) => {
      const scoreA = a.expectedPerformance.successProbability * 0.4 + 
                    a.expectedPerformance.qualityScore * 0.4 + 
                    a.confidence * 0.2;
      const scoreB = b.expectedPerformance.successProbability * 0.4 + 
                    b.expectedPerformance.qualityScore * 0.4 + 
                    b.confidence * 0.2;
      return scoreB - scoreA;
    });

    return recommendations;
  }

  /**
   * Learn from user feedback
   */
  public async recordFeedback(
    experienceId: string,
    feedback: {
      rating: number;
      comments: string;
      corrections?: any;
    }
  ): Promise<void> {
    const experience = this.experiences.get(experienceId);
    if (!experience) {
      throw new Error(`Experience ${experienceId} not found`);
    }

    experience.metadata.feedback = feedback;

    // Adjust quality score based on feedback
    const feedbackWeight = 0.3;
    const normalizedRating = (feedback.rating - 1) / 4; // Convert 1-5 to 0-1
    
    experience.performance.quality = 
      experience.performance.quality * (1 - feedbackWeight) + 
      normalizedRating * feedbackWeight;

    // Update agent profile with feedback
    if (this.config.enableCapabilityProfiling) {
      await this.updateAgentProfile(experience.agentId, experience);
    }

    this.emit('feedback:recorded', { experienceId, feedback });
  }

  /**
   * Export experiences for external analysis
   */
  public exportExperiences(query: ExperienceQuery = {}): {
    experiences: TaskExperience[];
    profiles: AgentCapabilityProfile[];
    patterns: TaskPattern[];
    insights: LearningInsight[];
    exportedAt: number;
  } {
    return {
      experiences: this.queryExperiences(query),
      profiles: Array.from(this.agentProfiles.values()),
      patterns: Array.from(this.taskPatterns.values()),
      insights: this.getInsights(),
      exportedAt: Date.now(),
    };
  }

  /**
   * Import experiences from external source
   */
  public async importExperiences(data: {
    experiences: TaskExperience[];
    profiles?: AgentCapabilityProfile[];
    patterns?: TaskPattern[];
    insights?: LearningInsight[];
  }): Promise<void> {
    // Import experiences
    for (const experience of data.experiences) {
      this.experiences.set(experience.id, experience);
    }

    // Import profiles
    if (data.profiles) {
      for (const profile of data.profiles) {
        this.agentProfiles.set(profile.agentId, profile);
      }
    }

    // Import patterns
    if (data.patterns) {
      for (const pattern of data.patterns) {
        this.taskPatterns.set(pattern.id, pattern);
      }
    }

    // Import insights
    if (data.insights) {
      for (const insight of data.insights) {
        this.insights.set(insight.id, insight);
      }
    }

    this.emit('experiences:imported', {
      experienceCount: data.experiences.length,
      profileCount: data.profiles?.length || 0,
      patternCount: data.patterns?.length || 0,
      insightCount: data.insights?.length || 0,
    });
  }

  /**
   * Clear all data
   */
  public async clearAll(): Promise<void> {
    this.experiences.clear();
    this.agentProfiles.clear();
    this.taskPatterns.clear();
    this.insights.clear();
    
    this.emit('repository:cleared');
  }

  /**
   * Get repository statistics
   */
  public getStatistics(): {
    totalExperiences: number;
    totalProfiles: number;
    totalPatterns: number;
    totalInsights: number;
    dataSize: number; // Approximate size in bytes
    oldestExperience: number;
    newestExperience: number;
  } {
    const experiences = Array.from(this.experiences.values());
    const timestamps = experiences.map(exp => exp.context.timestamp);
    
    return {
      totalExperiences: experiences.length,
      totalProfiles: this.agentProfiles.size,
      totalPatterns: this.taskPatterns.size,
      totalInsights: this.insights.size,
      dataSize: JSON.stringify({
        experiences: Array.from(this.experiences.values()),
        profiles: Array.from(this.agentProfiles.values()),
        patterns: Array.from(this.taskPatterns.values()),
        insights: Array.from(this.insights.values()),
      }).length,
      oldestExperience: Math.min(...timestamps, Date.now()),
      newestExperience: Math.max(...timestamps, 0),
    };
  }

  // Private methods

  private async updateAgentProfile(
    agentId: string,
    experience: TaskExperience
  ): Promise<void> {
    let profile = this.agentProfiles.get(agentId);
    
    if (!profile) {
      profile = {
        agentId,
        agentType: experience.agentType,
        capabilities: new Map(),
        specializations: [],
        weaknesses: [],
        optimalWorkload: {
          maxConcurrent: 3,
          preferredTaskTypes: [],
          avoidTaskTypes: [],
        },
      };
    }

    // Update capabilities
    const taskCapabilities = this.extractCapabilities(experience.task.type);
    
    for (const capability of taskCapabilities) {
      const current = profile.capabilities.get(capability) || {
        proficiency: 0.5,
        confidence: 0.1,
        experienceCount: 0,
        successRate: 0,
        averageQuality: 0,
        averageEfficiency: 0,
        learningTrend: 'stable' as const,
        lastUpdated: 0,
      };

      // Update metrics
      const newExperienceCount = current.experienceCount + 1;
      const newSuccessRate = (current.successRate * current.experienceCount + 
        (experience.performance.success ? 1 : 0)) / newExperienceCount;
      const newAverageQuality = (current.averageQuality * current.experienceCount + 
        experience.performance.quality) / newExperienceCount;
      const newAverageEfficiency = (current.averageEfficiency * current.experienceCount + 
        experience.performance.efficiency) / newExperienceCount;

      // Calculate proficiency based on success rate and quality
      const proficiency = (newSuccessRate * 0.6) + (newAverageQuality * 0.4);
      
      // Increase confidence with more experience
      const confidence = Math.min(0.95, 0.1 + (newExperienceCount - 1) * 0.05);

      // Determine learning trend
      let learningTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (newExperienceCount > 5) {
        const recentSuccessRate = newSuccessRate;
        const oldSuccessRate = current.successRate;
        
        if (recentSuccessRate > oldSuccessRate + 0.05) {
          learningTrend = 'improving';
        } else if (recentSuccessRate < oldSuccessRate - 0.05) {
          learningTrend = 'declining';
        }
      }

      profile.capabilities.set(capability, {
        proficiency,
        confidence,
        experienceCount: newExperienceCount,
        successRate: newSuccessRate,
        averageQuality: newAverageQuality,
        averageEfficiency: newAverageEfficiency,
        learningTrend,
        lastUpdated: Date.now(),
      });
    }

    // Update specializations and weaknesses
    this.updateSpecializations(profile);

    this.agentProfiles.set(agentId, profile);
  }

  private extractCapabilities(taskType: string): string[] {
    // Extract capabilities from task type
    const capabilities = [taskType];
    
    // Add general capabilities based on patterns
    if (taskType.includes('text')) {
      capabilities.push('text-processing');
    }
    if (taskType.includes('code')) {
      capabilities.push('code-analysis');
    }
    if (taskType.includes('image')) {
      capabilities.push('image-processing');
    }
    if (taskType.includes('audio')) {
      capabilities.push('audio-processing');
    }
    
    capabilities.push('general');
    return capabilities;
  }

  private updateSpecializations(profile: AgentCapabilityProfile): void {
    const capabilities = Array.from(profile.capabilities.entries());
    
    // Find specializations (high proficiency + high confidence)
    profile.specializations = capabilities
      .filter(([, cap]) => cap.proficiency > 0.8 && cap.confidence > 0.7)
      .map(([name]) => name)
      .slice(0, 5); // Top 5

    // Find weaknesses (low proficiency + high confidence)
    profile.weaknesses = capabilities
      .filter(([, cap]) => cap.proficiency < 0.3 && cap.confidence > 0.5)
      .map(([name]) => name)
      .slice(0, 3); // Top 3 weaknesses
  }

  private assessTaskQuality(task: Task, result: TaskResult): number {
    // Simple quality assessment - would be more sophisticated in practice
    if (!result.success) return 0;
    
    let quality = 0.7; // Base quality for successful tasks
    
    // Adjust based on result completeness
    if (result.data && typeof result.data === 'object') {
      const dataKeys = Object.keys(result.data);
      quality += Math.min(0.2, dataKeys.length * 0.05);
    }
    
    // Adjust based on error presence
    if (result.error) {
      quality -= 0.3;
    }
    
    return Math.max(0, Math.min(1, quality));
  }

  private assessTaskEfficiency(
    task: Task,
    result: TaskResult,
    context: Partial<TaskExperience['context']>
  ): number {
    const actualDuration = result.executionTime || 0;
    const expectedDuration = context.expectedDuration || 30000;
    
    if (actualDuration === 0) return 0.5; // Default efficiency
    
    // Efficiency is inverse of duration ratio (faster = more efficient)
    const durationRatio = expectedDuration / actualDuration;
    const efficiency = Math.min(1, durationRatio * 0.7); // Cap at 0.7 to allow room for quality
    
    return Math.max(0, efficiency);
  }

  private calculateTrends(
    experiences: TaskExperience[], 
    days: number
  ): Array<{
    period: string;
    successRate: number;
    quality: number;
    efficiency: number;
  }> {
    const trends = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = days - 1; i >= 0; i--) {
      const startTime = now - (i + 1) * dayMs;
      const endTime = now - i * dayMs;
      
      const dayExperiences = experiences.filter(exp =>
        exp.context.timestamp >= startTime && exp.context.timestamp < endTime
      );

      if (dayExperiences.length === 0) {
        trends.push({
          period: new Date(startTime).toISOString().split('T')[0],
          successRate: 0,
          quality: 0,
          efficiency: 0,
        });
        continue;
      }

      const successCount = dayExperiences.filter(exp => exp.performance.success).length;
      const successRate = successCount / dayExperiences.length;
      
      const quality = dayExperiences.reduce((sum, exp) => 
        sum + exp.performance.quality, 0) / dayExperiences.length;
      
      const efficiency = dayExperiences.reduce((sum, exp) => 
        sum + exp.performance.efficiency, 0) / dayExperiences.length;

      trends.push({
        period: new Date(startTime).toISOString().split('T')[0],
        successRate,
        quality,
        efficiency,
      });
    }

    return trends;
  }

  private enforceStorageLimits(): void {
    if (this.experiences.size > this.config.maxExperiences) {
      // Remove oldest experiences
      const experiences = Array.from(this.experiences.entries())
        .sort(([, a], [, b]) => a.context.timestamp - b.context.timestamp);
      
      const toRemove = experiences.slice(0, this.experiences.size - this.config.maxExperiences);
      
      for (const [id] of toRemove) {
        this.experiences.delete(id);
      }
    }
  }

  private startLearningLoop(): void {
    if (this.config.insightGenerationInterval > 0) {
      this.learningTimer = setInterval(() => {
        this.generateInsights();
        this.detectPatterns();
        this.detectAnomalies();
      }, this.config.insightGenerationInterval);
    }
  }

  private startCleanupLoop(): void {
    // Clean up old experiences daily
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
      
      for (const [id, experience] of this.experiences) {
        if (experience.context.timestamp < cutoff) {
          this.experiences.delete(id);
        }
      }
      
      this.emit('cleanup:completed', {
        remainingExperiences: this.experiences.size,
      });
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private generateInsights(): void {
    // Implementation for generating learning insights
    // This would analyze patterns and generate actionable insights
  }

  private detectPatterns(): void {
    if (!this.config.enablePatternLearning) return;
    
    // Implementation for detecting task patterns
    // This would identify common task patterns and their characteristics
  }

  private detectAnomalies(): void {
    // Implementation for detecting performance anomalies
    // This would identify unusual performance patterns that need attention
  }

  private generateExperienceId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public shutdown(): void {
    if (this.learningTimer) {
      clearInterval(this.learningTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.emit('repository:shutdown');
  }
}

export default ExperienceRepository;