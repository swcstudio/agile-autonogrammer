import { EventEmitter } from 'events';
import { BaseAgent } from '../core/BaseAgent';
import { 
  Task,
  TaskResult,
  AgentCapability,
  AgentState,
  AgentMetrics,
  TaskStatus
} from '../types/agents';

export interface DistributorConfig {
  strategy: 'capability_match' | 'load_balanced' | 'priority_based' | 'round_robin' | 'adaptive';
  max_queue_size: number;
  task_timeout_ms: number;
  retry_attempts: number;
  monitoring_enabled: boolean;
  performance_tracking: boolean;
  adaptive_learning: boolean;
}

interface TaskAssignment {
  task_id: string;
  agent_id: string;
  assigned_at: Date;
  priority: number;
  estimated_completion_ms: number;
  actual_completion_ms?: number;
  retry_count: number;
  status: TaskStatus;
}

interface AgentPerformanceProfile {
  agent_id: string;
  capability_scores: Map<AgentCapability, number>;
  average_completion_time: Map<string, number>;
  success_rate: number;
  current_load: number;
  availability: number;
  specialization_factor: number;
}

interface TaskRequirements {
  required_capabilities: AgentCapability[];
  optional_capabilities?: AgentCapability[];
  priority: number;
  deadline?: Date;
  estimated_complexity: number;
  resource_requirements: {
    memory_mb?: number;
    cpu_percentage?: number;
    network_bandwidth?: number;
  };
}

export class TaskDistributor extends EventEmitter {
  private config: DistributorConfig;
  private agents: Map<string, BaseAgent>;
  private agentProfiles: Map<string, AgentPerformanceProfile>;
  private taskQueue: PriorityQueue<Task>;
  private activeAssignments: Map<string, TaskAssignment>;
  private completedAssignments: TaskAssignment[];
  private distributionMetrics: DistributionMetrics;
  private learningEngine?: AdaptiveLearningEngine;

  constructor(config: DistributorConfig) {
    super();
    this.config = config;
    this.agents = new Map();
    this.agentProfiles = new Map();
    this.taskQueue = new PriorityQueue();
    this.activeAssignments = new Map();
    this.completedAssignments = [];
    this.distributionMetrics = this.initializeMetrics();

    if (config.adaptive_learning) {
      this.learningEngine = new AdaptiveLearningEngine();
    }

    this.startDistributionLoop();
  }

  public registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.config.id, agent);
    
    // Initialize performance profile
    const profile: AgentPerformanceProfile = {
      agent_id: agent.config.id,
      capability_scores: this.initializeCapabilityScores(agent.config.capabilities),
      average_completion_time: new Map(),
      success_rate: 1.0,
      current_load: 0,
      availability: 1.0,
      specialization_factor: this.calculateSpecialization(agent.config.capabilities)
    };
    
    this.agentProfiles.set(agent.config.id, profile);
    this.emit('agent:registered', agent.config.id);
  }

  public unregisterAgent(agentId: string): void {
    // Reassign active tasks before removing agent
    const activeTasks = Array.from(this.activeAssignments.values())
      .filter(assignment => assignment.agent_id === agentId);
    
    for (const assignment of activeTasks) {
      this.reassignTask(assignment.task_id);
    }
    
    this.agents.delete(agentId);
    this.agentProfiles.delete(agentId);
    this.emit('agent:unregistered', agentId);
  }

  public async distributeTask(task: Task): Promise<TaskAssignment> {
    // Validate task
    if (!this.validateTask(task)) {
      throw new Error(`Invalid task: ${task.id}`);
    }

    // Check queue size
    if (this.taskQueue.size() >= this.config.max_queue_size) {
      throw new Error('Task queue is full');
    }

    // Extract task requirements
    const requirements = this.extractTaskRequirements(task);
    
    // Find suitable agent based on strategy
    const agent = await this.selectAgent(requirements);
    
    if (!agent) {
      // Queue task if no agent available
      this.taskQueue.enqueue(task, requirements.priority);
      this.emit('task:queued', task.id);
      
      return {
        task_id: task.id,
        agent_id: 'pending',
        assigned_at: new Date(),
        priority: requirements.priority,
        estimated_completion_ms: 0,
        retry_count: 0,
        status: 'pending'
      };
    }

    // Create assignment
    const assignment = await this.assignTaskToAgent(task, agent, requirements);
    
    return assignment;
  }

  private async selectAgent(requirements: TaskRequirements): Promise<BaseAgent | null> {
    const strategy = this.config.strategy;
    const eligibleAgents = this.filterEligibleAgents(requirements);

    if (eligibleAgents.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'capability_match':
        return this.selectByCapabilityMatch(eligibleAgents, requirements);
      
      case 'load_balanced':
        return this.selectByLoadBalance(eligibleAgents);
      
      case 'priority_based':
        return this.selectByPriority(eligibleAgents, requirements);
      
      case 'round_robin':
        return this.selectRoundRobin(eligibleAgents);
      
      case 'adaptive':
        return this.selectAdaptive(eligibleAgents, requirements);
      
      default:
        return eligibleAgents[0];
    }
  }

  private filterEligibleAgents(requirements: TaskRequirements): BaseAgent[] {
    const eligible: BaseAgent[] = [];
    
    for (const [agentId, agent] of this.agents) {
      const profile = this.agentProfiles.get(agentId);
      if (!profile) continue;
      
      // Check capability match
      const hasRequiredCapabilities = requirements.required_capabilities.every(
        cap => agent.config.capabilities.includes(cap)
      );
      
      if (!hasRequiredCapabilities) continue;
      
      // Check resource availability
      const state = agent.getState();
      const hasResources = this.checkResourceAvailability(
        state,
        requirements.resource_requirements
      );
      
      if (!hasResources) continue;
      
      // Check load
      if (profile.current_load >= agent.config.max_concurrent_tasks) continue;
      
      eligible.push(agent);
    }
    
    return eligible;
  }

  private selectByCapabilityMatch(
    agents: BaseAgent[], 
    requirements: TaskRequirements
  ): BaseAgent {
    let bestAgent = agents[0];
    let bestScore = 0;
    
    for (const agent of agents) {
      const profile = this.agentProfiles.get(agent.config.id);
      if (!profile) continue;
      
      // Calculate capability match score
      let score = 0;
      
      // Required capabilities (weighted higher)
      for (const cap of requirements.required_capabilities) {
        score += (profile.capability_scores.get(cap) || 0) * 2;
      }
      
      // Optional capabilities
      if (requirements.optional_capabilities) {
        for (const cap of requirements.optional_capabilities) {
          score += profile.capability_scores.get(cap) || 0;
        }
      }
      
      // Factor in success rate and specialization
      score *= profile.success_rate;
      score *= (1 + profile.specialization_factor * 0.2);
      
      // Penalize based on current load
      score *= (1 - profile.current_load / agent.config.max_concurrent_tasks);
      
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }
    
    return bestAgent;
  }

  private selectByLoadBalance(agents: BaseAgent[]): BaseAgent {
    let leastLoadedAgent = agents[0];
    let minLoad = Infinity;
    
    for (const agent of agents) {
      const profile = this.agentProfiles.get(agent.config.id);
      if (!profile) continue;
      
      const load = profile.current_load / agent.config.max_concurrent_tasks;
      
      if (load < minLoad) {
        minLoad = load;
        leastLoadedAgent = agent;
      }
    }
    
    return leastLoadedAgent;
  }

  private selectByPriority(
    agents: BaseAgent[], 
    requirements: TaskRequirements
  ): BaseAgent {
    // Sort agents by a composite priority score
    const scoredAgents = agents.map(agent => {
      const profile = this.agentProfiles.get(agent.config.id);
      if (!profile) return { agent, score: 0 };
      
      let score = 0;
      
      // High priority tasks go to high-performance agents
      if (requirements.priority > 7) {
        score = profile.success_rate * 100;
        score += (1 - profile.current_load) * 50;
        
        // Prefer specialized agents for high-priority tasks
        score += profile.specialization_factor * 30;
      } else {
        // Lower priority tasks can go to any available agent
        score = (1 - profile.current_load) * 100;
      }
      
      return { agent, score };
    });
    
    scoredAgents.sort((a, b) => b.score - a.score);
    
    return scoredAgents[0].agent;
  }

  private selectRoundRobin(agents: BaseAgent[]): BaseAgent {
    // Simple round-robin selection
    const index = this.distributionMetrics.total_distributions % agents.length;
    return agents[index];
  }

  private selectAdaptive(
    agents: BaseAgent[], 
    requirements: TaskRequirements
  ): BaseAgent {
    if (!this.learningEngine) {
      return this.selectByCapabilityMatch(agents, requirements);
    }
    
    // Use learning engine to predict best agent
    const prediction = this.learningEngine.predictBestAgent(
      agents,
      requirements,
      this.agentProfiles,
      this.completedAssignments
    );
    
    return prediction.agent;
  }

  private async assignTaskToAgent(
    task: Task,
    agent: BaseAgent,
    requirements: TaskRequirements
  ): Promise<TaskAssignment> {
    const profile = this.agentProfiles.get(agent.config.id)!;
    
    // Estimate completion time based on historical data
    const estimatedTime = this.estimateCompletionTime(
      agent.config.id,
      task.type,
      requirements.estimated_complexity
    );
    
    // Create assignment
    const assignment: TaskAssignment = {
      task_id: task.id,
      agent_id: agent.config.id,
      assigned_at: new Date(),
      priority: requirements.priority,
      estimated_completion_ms: estimatedTime,
      retry_count: 0,
      status: 'assigned'
    };
    
    // Update profile
    profile.current_load++;
    
    // Store assignment
    this.activeAssignments.set(task.id, assignment);
    
    // Assign task to agent
    try {
      await agent.executeTask(task);
      assignment.status = 'in_progress';
      
      // Update metrics
      this.distributionMetrics.total_distributions++;
      this.distributionMetrics.successful_assignments++;
      
      this.emit('task:assigned', {
        task_id: task.id,
        agent_id: agent.config.id
      });
      
    } catch (error) {
      assignment.status = 'failed';
      profile.current_load--;
      
      // Retry or reassign
      if (assignment.retry_count < this.config.retry_attempts) {
        assignment.retry_count++;
        await this.retryAssignment(assignment, task);
      } else {
        await this.reassignTask(task.id);
      }
      
      this.distributionMetrics.failed_assignments++;
      
      this.emit('task:assignment_failed', {
        task_id: task.id,
        agent_id: agent.config.id,
        error
      });
    }
    
    return assignment;
  }

  private async retryAssignment(
    assignment: TaskAssignment, 
    task: Task
  ): Promise<void> {
    const agent = this.agents.get(assignment.agent_id);
    if (!agent) {
      await this.reassignTask(task.id);
      return;
    }
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, assignment.retry_count), 30000);
    
    setTimeout(async () => {
      try {
        await agent.executeTask(task);
        assignment.status = 'in_progress';
        
        this.emit('task:retry_successful', {
          task_id: task.id,
          agent_id: assignment.agent_id,
          attempt: assignment.retry_count
        });
      } catch (error) {
        if (assignment.retry_count < this.config.retry_attempts) {
          assignment.retry_count++;
          await this.retryAssignment(assignment, task);
        } else {
          await this.reassignTask(task.id);
        }
      }
    }, delay);
  }

  private async reassignTask(taskId: string): Promise<void> {
    const assignment = this.activeAssignments.get(taskId);
    if (!assignment) return;
    
    // Remove from current agent
    const currentProfile = this.agentProfiles.get(assignment.agent_id);
    if (currentProfile) {
      currentProfile.current_load--;
    }
    
    // Find the task (would need to store tasks or retrieve from somewhere)
    // For now, emit event for external handling
    this.emit('task:needs_reassignment', taskId);
    
    // Remove from active assignments
    this.activeAssignments.delete(taskId);
  }

  public onTaskCompleted(taskId: string, result: TaskResult): void {
    const assignment = this.activeAssignments.get(taskId);
    if (!assignment) return;
    
    // Update assignment
    assignment.status = 'completed';
    assignment.actual_completion_ms = Date.now() - assignment.assigned_at.getTime();
    
    // Update agent profile
    const profile = this.agentProfiles.get(assignment.agent_id);
    if (profile) {
      profile.current_load--;
      
      // Update average completion time
      const taskType = result.metadata?.task_type || 'unknown';
      const currentAvg = profile.average_completion_time.get(taskType) || 0;
      const newAvg = (currentAvg + assignment.actual_completion_ms) / 2;
      profile.average_completion_time.set(taskType, newAvg);
      
      // Update success rate
      if (result.success) {
        profile.success_rate = (profile.success_rate * 0.95) + 0.05;
      } else {
        profile.success_rate = profile.success_rate * 0.95;
      }
    }
    
    // Move to completed
    this.completedAssignments.push(assignment);
    this.activeAssignments.delete(taskId);
    
    // Update metrics
    this.distributionMetrics.completed_tasks++;
    this.distributionMetrics.average_completion_time = 
      (this.distributionMetrics.average_completion_time * 
       (this.distributionMetrics.completed_tasks - 1) + 
       assignment.actual_completion_ms) / 
      this.distributionMetrics.completed_tasks;
    
    // Learn from completion if adaptive
    if (this.learningEngine) {
      this.learningEngine.learn(assignment, result);
    }
    
    this.emit('task:completed', {
      task_id: taskId,
      agent_id: assignment.agent_id,
      duration_ms: assignment.actual_completion_ms
    });
    
    // Process queued tasks
    this.processQueuedTasks();
  }

  private processQueuedTasks(): void {
    if (this.taskQueue.isEmpty()) return;
    
    const task = this.taskQueue.peek();
    if (!task) return;
    
    const requirements = this.extractTaskRequirements(task);
    const agent = this.selectAgent(requirements);
    
    if (agent) {
      this.taskQueue.dequeue();
      this.assignTaskToAgent(task, agent, requirements);
    }
  }

  private startDistributionLoop(): void {
    setInterval(() => {
      this.processQueuedTasks();
      this.updateMetrics();
      
      if (this.config.monitoring_enabled) {
        this.monitorPerformance();
      }
    }, 1000);
  }

  private updateMetrics(): void {
    // Calculate distribution efficiency
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agentProfiles.values())
      .filter(p => p.current_load > 0).length;
    
    this.distributionMetrics.distribution_efficiency = 
      totalAgents > 0 ? activeAgents / totalAgents : 0;
    
    // Calculate load balance
    const loads = Array.from(this.agentProfiles.values())
      .map(p => p.current_load);
    
    if (loads.length > 0) {
      const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
      const variance = loads.reduce((sum, load) => 
        sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
      
      this.distributionMetrics.load_balance_score = 
        1 / (1 + Math.sqrt(variance));
    }
  }

  private monitorPerformance(): void {
    // Check for overloaded agents
    for (const [agentId, profile] of this.agentProfiles) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;
      
      const loadPercentage = profile.current_load / agent.config.max_concurrent_tasks;
      
      if (loadPercentage > 0.9) {
        this.emit('agent:overloaded', {
          agent_id: agentId,
          load: loadPercentage
        });
      }
      
      // Check for underperforming agents
      if (profile.success_rate < 0.7) {
        this.emit('agent:underperforming', {
          agent_id: agentId,
          success_rate: profile.success_rate
        });
      }
    }
    
    // Check queue size
    if (this.taskQueue.size() > this.config.max_queue_size * 0.8) {
      this.emit('queue:near_capacity', {
        size: this.taskQueue.size(),
        capacity: this.config.max_queue_size
      });
    }
  }

  private validateTask(task: Task): boolean {
    return !!(task.id && task.type && task.data);
  }

  private extractTaskRequirements(task: Task): TaskRequirements {
    // Extract requirements from task metadata or infer from task type
    const metadata = task.metadata || {};
    
    return {
      required_capabilities: metadata.required_capabilities || 
        this.inferCapabilities(task.type),
      optional_capabilities: metadata.optional_capabilities,
      priority: metadata.priority || 5,
      deadline: metadata.deadline,
      estimated_complexity: metadata.complexity || 
        this.estimateComplexity(task),
      resource_requirements: metadata.resource_requirements || {}
    };
  }

  private inferCapabilities(taskType: string): AgentCapability[] {
    // Infer required capabilities based on task type
    const capabilityMap: Record<string, AgentCapability[]> = {
      'text_generation': ['text_generation'],
      'code_generation': ['code_generation'],
      'image_analysis': ['image_analysis'],
      'data_processing': ['data_analysis'],
      'api_call': ['api_integration'],
      'planning': ['task_planning', 'decision_making'],
      'research': ['web_scraping', 'data_analysis']
    };
    
    return capabilityMap[taskType] || [];
  }

  private estimateComplexity(task: Task): number {
    // Simple heuristic for complexity estimation
    const dataSize = JSON.stringify(task.data).length;
    const typeComplexity = this.getTypeComplexity(task.type);
    
    return Math.min(10, Math.max(1, 
      Math.log10(dataSize) * typeComplexity
    ));
  }

  private getTypeComplexity(taskType: string): number {
    const complexityMap: Record<string, number> = {
      'simple_query': 1,
      'text_generation': 2,
      'code_generation': 4,
      'image_analysis': 3,
      'complex_reasoning': 5,
      'multi_step_planning': 5
    };
    
    return complexityMap[taskType] || 2;
  }

  private checkResourceAvailability(
    state: AgentState,
    requirements: any
  ): boolean {
    if (requirements.memory_mb && 
        state.memory_usage_mb > requirements.memory_mb) {
      return false;
    }
    
    if (requirements.cpu_percentage && 
        state.cpu_usage_percentage > requirements.cpu_percentage) {
      return false;
    }
    
    return true;
  }

  private estimateCompletionTime(
    agentId: string,
    taskType: string,
    complexity: number
  ): number {
    const profile = this.agentProfiles.get(agentId);
    if (!profile) return 60000; // Default 1 minute
    
    const baseTime = profile.average_completion_time.get(taskType) || 30000;
    
    // Adjust based on complexity
    return baseTime * (1 + complexity / 10);
  }

  private initializeCapabilityScores(
    capabilities: AgentCapability[]
  ): Map<AgentCapability, number> {
    const scores = new Map<AgentCapability, number>();
    
    for (const capability of capabilities) {
      scores.set(capability, 1.0); // Start with perfect score
    }
    
    return scores;
  }

  private calculateSpecialization(capabilities: AgentCapability[]): number {
    // Agents with fewer capabilities are more specialized
    const totalPossibleCapabilities = 13; // From AgentCapability type
    return 1 - (capabilities.length / totalPossibleCapabilities);
  }

  private initializeMetrics(): DistributionMetrics {
    return {
      total_distributions: 0,
      successful_assignments: 0,
      failed_assignments: 0,
      reassignments: 0,
      completed_tasks: 0,
      average_completion_time: 0,
      distribution_efficiency: 0,
      load_balance_score: 1.0,
      queue_wait_time: 0
    };
  }

  public getMetrics(): DistributionMetrics {
    return { ...this.distributionMetrics };
  }

  public getAgentProfiles(): Map<string, AgentPerformanceProfile> {
    return new Map(this.agentProfiles);
  }

  public getQueueSize(): number {
    return this.taskQueue.size();
  }

  public getActiveAssignments(): TaskAssignment[] {
    return Array.from(this.activeAssignments.values());
  }
}

// Supporting classes
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];
  
  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => b.priority - a.priority);
  }
  
  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }
  
  peek(): T | undefined {
    return this.items[0]?.item;
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  size(): number {
    return this.items.length;
  }
}

class AdaptiveLearningEngine {
  private taskHistory: Map<string, TaskHistoryEntry[]> = new Map();
  private agentPerformance: Map<string, AgentPerformanceHistory> = new Map();
  
  predictBestAgent(
    agents: BaseAgent[],
    requirements: TaskRequirements,
    profiles: Map<string, AgentPerformanceProfile>,
    history: TaskAssignment[]
  ): { agent: BaseAgent; confidence: number } {
    // Use historical data to predict best agent
    // This is a simplified implementation
    
    let bestAgent = agents[0];
    let bestScore = 0;
    
    for (const agent of agents) {
      const profile = profiles.get(agent.config.id);
      if (!profile) continue;
      
      // Calculate predictive score based on history
      const historicalScore = this.calculateHistoricalScore(
        agent.config.id,
        requirements
      );
      
      const currentScore = profile.success_rate * 
        (1 - profile.current_load / agent.config.max_concurrent_tasks);
      
      const combinedScore = (historicalScore * 0.7) + (currentScore * 0.3);
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestAgent = agent;
      }
    }
    
    return {
      agent: bestAgent,
      confidence: bestScore
    };
  }
  
  learn(assignment: TaskAssignment, result: TaskResult): void {
    // Store task outcome for future predictions
    const agentHistory = this.agentPerformance.get(assignment.agent_id) || {
      agent_id: assignment.agent_id,
      total_tasks: 0,
      successful_tasks: 0,
      task_type_performance: new Map()
    };
    
    agentHistory.total_tasks++;
    if (result.success) {
      agentHistory.successful_tasks++;
    }
    
    const taskType = result.metadata?.task_type || 'unknown';
    const typePerf = agentHistory.task_type_performance.get(taskType) || {
      count: 0,
      success_count: 0,
      avg_duration: 0
    };
    
    typePerf.count++;
    if (result.success) typePerf.success_count++;
    typePerf.avg_duration = (typePerf.avg_duration * (typePerf.count - 1) + 
      (assignment.actual_completion_ms || 0)) / typePerf.count;
    
    agentHistory.task_type_performance.set(taskType, typePerf);
    this.agentPerformance.set(assignment.agent_id, agentHistory);
  }
  
  private calculateHistoricalScore(
    agentId: string,
    requirements: TaskRequirements
  ): number {
    const history = this.agentPerformance.get(agentId);
    if (!history) return 0.5; // No history, neutral score
    
    return history.successful_tasks / Math.max(1, history.total_tasks);
  }
}

// Type definitions
interface DistributionMetrics {
  total_distributions: number;
  successful_assignments: number;
  failed_assignments: number;
  reassignments: number;
  completed_tasks: number;
  average_completion_time: number;
  distribution_efficiency: number;
  load_balance_score: number;
  queue_wait_time: number;
}

interface TaskHistoryEntry {
  task_id: string;
  agent_id: string;
  success: boolean;
  duration_ms: number;
  complexity: number;
}

interface AgentPerformanceHistory {
  agent_id: string;
  total_tasks: number;
  successful_tasks: number;
  task_type_performance: Map<string, {
    count: number;
    success_count: number;
    avg_duration: number;
  }>;
}