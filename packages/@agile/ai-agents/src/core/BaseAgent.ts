/**
 * BaseAgent
 * Core implementation for autonomous AI agents with task execution and collaboration
 */

import { EventEmitter } from 'events';
import PQueue from 'p-queue';
import pRetry from 'p-retry';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import type {
  Agent,
  AgentConfig,
  AgentState,
  Task,
  TaskResult,
  TaskError,
  TaskDelegation,
  AgentMessage,
  AgentExperience,
  AgentMetrics,
  AgentHealthStatus,
  AgentMemory,
  ResourceUsage,
  CollaborationMode,
} from '../types/agents';

import { useInference, type InferenceRequest } from '@agile/ai-core';
import { useEdgeInference, type EdgeInferenceRequest } from '@agile/ai-edge';
import { checkSecurity, type SecurityCheckResult } from '@agile/ai-security';

interface AgentDependencies {
  inferenceHook: ReturnType<typeof useInference>;
  edgeInferenceHook?: ReturnType<typeof useEdgeInference>;
  securityCheck: typeof checkSecurity;
}

export abstract class BaseAgent extends EventEmitter implements Agent {
  public readonly config: AgentConfig;
  protected state: BehaviorSubject<AgentState>;
  
  // Core Systems
  protected taskQueue: PQueue;
  protected messageQueue: PQueue;
  protected memory: AgentMemory;
  protected dependencies: AgentDependencies;
  
  // Communication
  protected incomingMessages: Subject<AgentMessage> = new Subject();
  protected outgoingMessages: Subject<AgentMessage> = new Subject();
  
  // Monitoring
  protected metrics: AgentMetrics;
  protected healthStatus: AgentHealthStatus;
  protected startTime: Date;
  private metricsInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  
  // Learning
  protected experiences: AgentExperience[] = [];
  
  constructor(config: AgentConfig, dependencies: AgentDependencies) {
    super();
    this.config = config;
    this.dependencies = dependencies;
    this.startTime = new Date();
    
    // Initialize state
    this.state = new BehaviorSubject<AgentState>({
      id: config.id,
      status: 'offline',
      current_tasks: [],
      completed_tasks_count: 0,
      error_count: 0,
      uptime_ms: 0,
      last_active: new Date(),
      average_task_completion_ms: 0,
      success_rate: 1.0,
      collaboration_score: 1.0,
      learning_progress: 0,
      memory_usage_mb: 0,
      cpu_usage_percentage: 0,
      network_requests_current_minute: 0,
    });
    
    // Initialize task queue
    this.taskQueue = new PQueue({
      concurrency: config.max_concurrent_tasks,
      timeout: config.task_timeout_ms,
    });
    
    // Initialize message queue
    this.messageQueue = new PQueue({
      concurrency: 10, // Allow multiple concurrent message processing
      timeout: 30000,
    });
    
    // Initialize memory
    this.memory = this.initializeMemory();
    
    // Initialize metrics
    this.metrics = this.initializeMetrics();
    this.healthStatus = this.initializeHealthStatus();
    
    // Setup event handlers
    this.setupEventHandlers();
  }

  // Abstract methods that must be implemented by specific agent types
  protected abstract processTask(task: Task): Promise<any>;
  protected abstract makeDecision(context: any): Promise<any>;
  protected abstract generateResponse(input: any): Promise<any>;

  // Core Agent Lifecycle
  async start(): Promise<void> {
    try {
      this.updateState({ status: 'idle' });
      
      // Start monitoring
      if (this.config.autonomy_level >= 2) {
        this.startMetricsCollection();
        this.startHealthChecking();
      }
      
      // Start message processing
      this.startMessageProcessing();
      
      // Load persistent memory
      if (this.config.memory_persistence) {
        await this.loadPeristentMemory();
      }
      
      this.emit('agent_started', { agent_id: this.config.id });
      console.log(`Agent ${this.config.name} (${this.config.id}) started successfully`);
      
    } catch (error) {
      this.updateState({ status: 'error' });
      this.handleError(new Error(`Failed to start agent: ${error}`));
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Update status
      this.updateState({ status: 'offline' });
      
      // Stop queues gracefully
      this.taskQueue.pause();
      this.messageQueue.pause();
      
      // Wait for current tasks to complete
      await this.taskQueue.onIdle();
      await this.messageQueue.onIdle();
      
      // Save persistent memory
      if (this.config.memory_persistence) {
        await this.savePeristentMemory();
      }
      
      // Stop monitoring
      this.stopMetricsCollection();
      this.stopHealthChecking();
      
      this.emit('agent_stopped', { agent_id: this.config.id });
      console.log(`Agent ${this.config.name} (${this.config.id}) stopped successfully`);
      
    } catch (error) {
      this.handleError(new Error(`Failed to stop agent: ${error}`));
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  // Task Execution
  async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // Validate task
      this.validateTask(task);
      
      // Security check
      if (this.config.security_level !== 'low') {
        await this.performSecurityCheck(task);
      }
      
      // Update state
      this.updateState({
        status: 'busy',
        current_tasks: [...this.getCurrentState().current_tasks, task],
        last_active: new Date(),
      });
      
      // Add to task queue
      const result = await this.taskQueue.add(async () => {
        try {
          // Pre-processing
          const preprocessedTask = await this.preprocessTask(task);
          
          // Core processing (implemented by specific agent types)
          const output = await this.processTask(preprocessedTask);
          
          // Post-processing
          const postprocessedOutput = await this.postprocessTaskResult(output, preprocessedTask);
          
          // Create successful result
          const executionTime = Date.now() - startTime;
          const resourceUsage = await this.calculateResourceUsage(executionTime);
          
          const result: TaskResult = {
            task_id: task.id,
            status: 'completed',
            output: postprocessedOutput,
            execution_time_ms: executionTime,
            resources_used: resourceUsage,
            confidence_score: await this.calculateConfidenceScore(postprocessedOutput),
            quality_score: await this.calculateQualityScore(postprocessedOutput),
          };
          
          // Update task
          task.status = 'completed';
          task.completed_at = new Date();
          task.execution_time_ms = executionTime;
          task.output = postprocessedOutput;
          
          // Record experience
          if (this.config.learning_enabled) {
            await this.recordExperience(task, result);
          }
          
          return result;
          
        } catch (error) {
          // Handle task execution error
          const taskError: TaskError = {
            code: 'TASK_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context: { task_id: task.id, agent_id: this.config.id },
            retry_count: 0,
            is_retryable: this.isRetryableError(error),
            suggested_resolution: this.getSuggestedResolution(error),
          };
          
          task.status = 'failed';
          task.error = taskError;
          
          throw error;
        }
      });
      
      // Update state after successful completion
      const currentState = this.getCurrentState();
      this.updateState({
        status: currentState.current_tasks.length <= 1 ? 'idle' : 'busy',
        current_tasks: currentState.current_tasks.filter(t => t.id !== task.id),
        completed_tasks_count: currentState.completed_tasks_count + 1,
        average_task_completion_ms: this.updateAverageTaskTime(Date.now() - startTime),
        success_rate: this.updateSuccessRate(true),
      });
      
      this.emit('task_completed', { task_id: task.id, agent_id: this.config.id, result });
      return result;
      
    } catch (error) {
      // Update state after error
      const currentState = this.getCurrentState();
      this.updateState({
        status: currentState.current_tasks.length <= 1 ? 'idle' : 'busy',
        current_tasks: currentState.current_tasks.filter(t => t.id !== task.id),
        error_count: currentState.error_count + 1,
        success_rate: this.updateSuccessRate(false),
      });
      
      this.emit('task_failed', { task_id: task.id, agent_id: this.config.id, error });
      
      const taskError: TaskError = {
        code: 'TASK_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: { task_id: task.id, agent_id: this.config.id },
        retry_count: 0,
        is_retryable: this.isRetryableError(error),
        suggested_resolution: this.getSuggestedResolution(error),
      };
      
      return {
        task_id: task.id,
        status: 'failed',
        error: taskError,
        execution_time_ms: Date.now() - startTime,
        resources_used: await this.calculateResourceUsage(Date.now() - startTime),
        confidence_score: 0,
        quality_score: 0,
      };
    }
  }

  // Task Delegation
  async delegateTask(task: Task, targetAgent: string): Promise<TaskDelegation> {
    const delegation: TaskDelegation = {
      from_agent: this.config.id,
      to_agent: targetAgent,
      delegated_at: new Date(),
      reason: 'workload_optimization', // Could be more sophisticated
      status: 'accepted', // Simplified - in real implementation, wait for acceptance
    };
    
    // Add delegation to task history
    task.delegation_history.push(delegation);
    task.assigned_to = targetAgent;
    task.status = 'delegated';
    
    // Send delegation message
    const delegationMessage: AgentMessage = {
      id: uuidv4(),
      type: 'task_assignment',
      from_agent: this.config.id,
      to_agent: targetAgent,
      content: { task, delegation },
      metadata: {
        priority: task.priority,
        requires_response: true,
        content_type: 'application/json',
        size_bytes: JSON.stringify(task).length,
        encryption_enabled: this.config.security_level !== 'low',
      },
      sent_at: new Date(),
      delivery_status: 'sent',
      retry_count: 0,
      related_task_id: task.id,
    };
    
    await this.sendMessage(delegationMessage);
    
    this.emit('task_delegated', { 
      task_id: task.id, 
      from_agent: this.config.id, 
      to_agent: targetAgent,
      delegation 
    });
    
    return delegation;
  }

  // Communication
  async sendMessage(message: AgentMessage): Promise<void> {
    return this.messageQueue.add(async () => {
      try {
        // Update message status
        message.delivery_status = 'sent';
        
        // Emit through outgoing stream
        this.outgoingMessages.next(message);
        
        // Store in memory if needed
        this.storeMessageInMemory(message, 'sent');
        
        this.emit('message_sent', { message, agent_id: this.config.id });
        
      } catch (error) {
        message.delivery_status = 'failed';
        message.retry_count++;
        
        if (message.retry_count < 3) {
          // Retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, message.retry_count) * 1000));
          await this.sendMessage(message);
        } else {
          this.handleError(new Error(`Failed to send message after retries: ${error}`));
        }
      }
    });
  }

  async receiveMessage(message: AgentMessage): Promise<void> {
    return this.messageQueue.add(async () => {
      try {
        // Update message status
        message.received_at = new Date();
        message.delivery_status = 'delivered';
        
        // Store in memory
        this.storeMessageInMemory(message, 'received');
        
        // Process message based on type
        await this.processIncomingMessage(message);
        
        // Update status
        message.delivery_status = 'read';
        
        this.emit('message_received', { message, agent_id: this.config.id });
        
      } catch (error) {
        this.handleError(new Error(`Failed to process incoming message: ${error}`));
      }
    });
  }

  // Learning System
  async learn(experience: AgentExperience): Promise<void> {
    if (!this.config.learning_enabled) return;
    
    try {
      // Add to episodic memory
      this.memory.episodic.push(experience);
      
      // Limit episodic memory size
      const maxEpisodic = 10000; // Configuration parameter
      if (this.memory.episodic.length > maxEpisodic) {
        this.memory.episodic = this.memory.episodic.slice(-maxEpisodic);
      }
      
      // Extract semantic knowledge
      await this.extractSemanticKnowledge(experience);
      
      // Update learning progress
      const currentState = this.getCurrentState();
      this.updateState({
        learning_progress: Math.min(currentState.learning_progress + 0.001, 1.0),
      });
      
      this.emit('learning_completed', { experience, agent_id: this.config.id });
      
    } catch (error) {
      this.handleError(new Error(`Learning failed: ${error}`));
    }
  }

  async shareExperience(targetAgent: string, experience: AgentExperience): Promise<void> {
    if (!this.config.experience_sharing) return;
    
    const sharingMessage: AgentMessage = {
      id: uuidv4(),
      type: 'information_response',
      from_agent: this.config.id,
      to_agent: targetAgent,
      content: { 
        type: 'experience_sharing',
        experience: {
          ...experience,
          shared_by: this.config.id,
          shared_at: new Date(),
        }
      },
      metadata: {
        priority: 2,
        requires_response: false,
        content_type: 'application/json',
        size_bytes: JSON.stringify(experience).length,
        encryption_enabled: this.config.security_level === 'high' || this.config.security_level === 'strict',
      },
      sent_at: new Date(),
      delivery_status: 'sent',
      retry_count: 0,
    };
    
    await this.sendMessage(sharingMessage);
  }

  // Monitoring
  async getMetrics(): Promise<AgentMetrics> {
    const currentState = this.getCurrentState();
    const currentTime = Date.now();
    
    this.metrics = {
      agent_id: this.config.id,
      timestamp: new Date(),
      
      // Performance Metrics
      tasks_completed_per_hour: this.calculateTasksPerHour(),
      average_task_completion_time_ms: currentState.average_task_completion_ms,
      success_rate_percentage: currentState.success_rate * 100,
      error_rate_percentage: (1 - currentState.success_rate) * 100,
      
      // Resource Metrics
      memory_usage_percentage: this.calculateMemoryUsage(),
      cpu_usage_percentage: currentState.cpu_usage_percentage,
      network_usage_mbps: this.calculateNetworkUsage(),
      
      // Collaboration Metrics
      messages_sent_per_hour: this.calculateMessagesPerHour('sent'),
      messages_received_per_hour: this.calculateMessagesPerHour('received'),
      collaboration_success_rate: currentState.collaboration_score,
      delegation_success_rate: 0.95, // Would track this in real implementation
      
      // Learning Metrics
      experiences_gained: this.experiences.length,
      knowledge_retention_rate: 0.85, // Would calculate based on actual retention
      adaptation_speed: currentState.learning_progress,
      
      // Quality Metrics
      output_quality_score: 0.90, // Would calculate based on feedback
      user_satisfaction_score: 0.88, // Would track user ratings
      peer_rating_score: 0.92, // Would track peer agent ratings
    };
    
    return this.metrics;
  }

  async getHealth(): Promise<AgentHealthStatus> {
    const currentState = this.getCurrentState();
    
    // Check component health
    const componentHealth = {
      core_engine: await this.checkCoreEngineHealth(),
      memory_system: await this.checkMemoryHealth(),
      communication: await this.checkCommunicationHealth(),
      task_processor: await this.checkTaskProcessorHealth(),
      learning_system: await this.checkLearningSystemHealth(),
    };
    
    // Determine overall health
    const criticalComponents = Object.values(componentHealth).filter(h => h.status === 'critical');
    const warningComponents = Object.values(componentHealth).filter(h => h.status === 'warning');
    
    let overallHealth: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
    if (criticalComponents.length > 0) {
      overallHealth = 'critical';
    } else if (warningComponents.length > 0) {
      overallHealth = 'warning';
    }
    
    this.healthStatus = {
      agent_id: this.config.id,
      overall_health: overallHealth,
      last_check: new Date(),
      components: componentHealth,
      active_alerts: [], // Would populate with actual alerts
      resolved_alerts_last_24h: 0, // Would track resolved alerts
    };
    
    return this.healthStatus;
  }

  // Public Getters
  getCurrentState(): AgentState {
    return this.state.getValue();
  }

  getStateObservable(): Observable<AgentState> {
    return this.state.asObservable();
  }

  // Helper Methods
  private initializeMemory(): AgentMemory {
    return {
      short_term: new Map(),
      long_term: new Map(),
      episodic: [],
      semantic: new Map(),
      max_short_term_size_mb: this.config.max_memory_mb * 0.3,
      max_long_term_size_mb: this.config.max_memory_mb * 0.6,
      max_episodic_entries: 10000,
      retention_policy: {
        short_term_ttl_ms: 3600000, // 1 hour
        long_term_ttl_days: 30,
        episodic_max_age_days: 90,
        importance_threshold: 0.7,
        frequency_threshold: 5,
        recency_weight: 0.3,
        importance_weight: 0.4,
        frequency_weight: 0.3,
      },
    };
  }

  private initializeMetrics(): AgentMetrics {
    return {
      agent_id: this.config.id,
      timestamp: new Date(),
      tasks_completed_per_hour: 0,
      average_task_completion_time_ms: 0,
      success_rate_percentage: 100,
      error_rate_percentage: 0,
      memory_usage_percentage: 0,
      cpu_usage_percentage: 0,
      network_usage_mbps: 0,
      messages_sent_per_hour: 0,
      messages_received_per_hour: 0,
      collaboration_success_rate: 1.0,
      delegation_success_rate: 1.0,
      experiences_gained: 0,
      knowledge_retention_rate: 1.0,
      adaptation_speed: 0,
      output_quality_score: 1.0,
      user_satisfaction_score: 1.0,
      peer_rating_score: 1.0,
    };
  }

  private initializeHealthStatus(): AgentHealthStatus {
    return {
      agent_id: this.config.id,
      overall_health: 'healthy',
      last_check: new Date(),
      components: {
        core_engine: { status: 'healthy', message: 'OK', last_check: new Date(), metrics: {} },
        memory_system: { status: 'healthy', message: 'OK', last_check: new Date(), metrics: {} },
        communication: { status: 'healthy', message: 'OK', last_check: new Date(), metrics: {} },
        task_processor: { status: 'healthy', message: 'OK', last_check: new Date(), metrics: {} },
        learning_system: { status: 'healthy', message: 'OK', last_check: new Date(), metrics: {} },
      },
      active_alerts: [],
      resolved_alerts_last_24h: 0,
    };
  }

  // Additional helper methods would be implemented here...
  private updateState(updates: Partial<AgentState>): void {
    const currentState = this.getCurrentState();
    const newState = { 
      ...currentState, 
      ...updates,
      uptime_ms: Date.now() - this.startTime.getTime(),
    };
    this.state.next(newState);
  }

  private validateTask(task: Task): void {
    if (!task.id || !task.type) {
      throw new Error('Task must have id and type');
    }
    // Additional validation logic
  }

  private async performSecurityCheck(task: Task): Promise<void> {
    const securityResult = await this.dependencies.securityCheck({
      content: JSON.stringify(task.input),
      context: { agent_id: this.config.id, task_id: task.id },
    });
    
    if (!securityResult.is_safe) {
      throw new Error(`Security check failed: ${securityResult.risk_categories.join(', ')}`);
    }
  }

  private async preprocessTask(task: Task): Promise<Task> {
    // Apply any preprocessing logic
    return task;
  }

  private async postprocessTaskResult(output: any, task: Task): Promise<any> {
    // Apply any postprocessing logic
    return output;
  }

  private async calculateResourceUsage(executionTimeMs: number): Promise<ResourceUsage> {
    // Calculate actual resource usage
    return {
      memory_used_mb: Math.random() * 100, // Placeholder
      cpu_time_ms: executionTimeMs,
      gpu_time_ms: 0,
      network_bytes_sent: 0,
      network_bytes_received: 0,
      storage_bytes_written: 0,
      storage_bytes_read: 0,
      api_calls_made: 1,
      cost_incurred: 0.001,
    };
  }

  private async calculateConfidenceScore(output: any): Promise<number> {
    // Calculate confidence in the output
    return Math.random() * 0.3 + 0.7; // Placeholder: 0.7-1.0
  }

  private async calculateQualityScore(output: any): Promise<number> {
    // Calculate quality of the output
    return Math.random() * 0.3 + 0.7; // Placeholder: 0.7-1.0
  }

  private isRetryableError(error: any): boolean {
    // Determine if error is retryable
    return error.code !== 'VALIDATION_ERROR';
  }

  private getSuggestedResolution(error: any): string {
    // Suggest resolution for common errors
    return 'Check input parameters and try again';
  }

  // Additional implementation methods would continue here...
  // This is a substantial foundation for the multi-modal agent system

  private setupEventHandlers(): void {
    // Setup internal event handling
  }

  private startMessageProcessing(): void {
    // Setup message processing pipeline
  }

  private async loadPeristentMemory(): Promise<void> {
    // Load persistent memory from storage
  }

  private async savePeristentMemory(): Promise<void> {
    // Save persistent memory to storage
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.getMetrics();
    }, 30000); // Every 30 seconds
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.getHealth();
    }, 60000); // Every minute
  }

  private stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  private storeMessageInMemory(message: AgentMessage, direction: 'sent' | 'received'): void {
    // Store message in agent memory
  }

  private async processIncomingMessage(message: AgentMessage): Promise<void> {
    // Process different types of incoming messages
    switch (message.type) {
      case 'task_assignment':
        // Handle task assignment from other agents
        break;
      case 'information_request':
        // Handle information requests
        break;
      // Additional message type handling
    }
  }

  private async recordExperience(task: Task, result: TaskResult): Promise<void> {
    const experience: AgentExperience = {
      id: uuidv4(),
      agent_id: this.config.id,
      experience_type: 'task_completion',
      context: { task_type: task.type, input: task.input },
      actions_taken: [/* would record actual actions */],
      outcome: result.output,
      lessons_learned: [/* would extract lessons */],
      timestamp: new Date(),
      confidence: result.confidence_score,
      transferability_score: 0.8,
      tags: [task.type, 'completion'],
    };
    
    await this.learn(experience);
  }

  private async extractSemanticKnowledge(experience: AgentExperience): Promise<void> {
    // Extract reusable knowledge from experience
  }

  private updateAverageTaskTime(newTime: number): number {
    const currentState = this.getCurrentState();
    const count = currentState.completed_tasks_count;
    return (currentState.average_task_completion_ms * count + newTime) / (count + 1);
  }

  private updateSuccessRate(success: boolean): number {
    const currentState = this.getCurrentState();
    const totalTasks = currentState.completed_tasks_count + currentState.error_count + (success ? 1 : 0);
    const successfulTasks = currentState.completed_tasks_count * currentState.success_rate + (success ? 1 : 0);
    return successfulTasks / totalTasks;
  }

  // Metrics calculation methods
  private calculateTasksPerHour(): number {
    const uptimeHours = this.getCurrentState().uptime_ms / (1000 * 60 * 60);
    return uptimeHours > 0 ? this.getCurrentState().completed_tasks_count / uptimeHours : 0;
  }

  private calculateMemoryUsage(): number {
    // Calculate actual memory usage percentage
    return Math.random() * 50; // Placeholder
  }

  private calculateNetworkUsage(): number {
    // Calculate network usage in Mbps
    return Math.random() * 10; // Placeholder
  }

  private calculateMessagesPerHour(direction: 'sent' | 'received'): number {
    // Calculate messages per hour
    return Math.random() * 100; // Placeholder
  }

  // Health check methods
  private async checkCoreEngineHealth(): Promise<any> {
    return { status: 'healthy', message: 'Core engine operational', last_check: new Date(), metrics: {} };
  }

  private async checkMemoryHealth(): Promise<any> {
    return { status: 'healthy', message: 'Memory system operational', last_check: new Date(), metrics: {} };
  }

  private async checkCommunicationHealth(): Promise<any> {
    return { status: 'healthy', message: 'Communication system operational', last_check: new Date(), metrics: {} };
  }

  private async checkTaskProcessorHealth(): Promise<any> {
    return { status: 'healthy', message: 'Task processor operational', last_check: new Date(), metrics: {} };
  }

  private async checkLearningSystemHealth(): Promise<any> {
    return { status: 'healthy', message: 'Learning system operational', last_check: new Date(), metrics: {} };
  }

  private handleError(error: Error): void {
    console.error(`Agent ${this.config.id} error:`, error);
    this.emit('error', error);
  }
}