/**
 * Multi-Modal AI Agents System Types
 * Comprehensive type definitions for autonomous agents and inter-agent collaboration
 */

import type { InferenceRequest, InferenceResponse, ModelProvider } from '@agile/ai-core';
import type { EdgeInferenceRequest, EdgeInferenceResponse } from '@agile/ai-edge';
import type { SecurityCheckResult } from '@agile/ai-security';

// Core Agent Types
export type AgentRole = 
  | 'coordinator' 
  | 'executor' 
  | 'analyst' 
  | 'planner' 
  | 'validator' 
  | 'specialist';

export type AgentCapability =
  | 'text_generation'
  | 'code_generation'
  | 'image_analysis'
  | 'audio_processing'
  | 'video_processing'
  | 'data_analysis'
  | 'web_scraping'
  | 'api_integration'
  | 'task_planning'
  | 'decision_making'
  | 'collaboration'
  | 'learning'
  | 'memory_management';

export type TaskStatus = 
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'delegated';

export type CollaborationMode = 
  | 'hierarchical'
  | 'peer_to_peer'
  | 'swarm'
  | 'pipeline'
  | 'competitive'
  | 'cooperative';

export type MessageType = 
  | 'task_assignment'
  | 'task_completion'
  | 'information_request'
  | 'information_response'
  | 'collaboration_request'
  | 'status_update'
  | 'error_report'
  | 'resource_request';

// Agent Configuration
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  
  // AI Model Configuration
  primary_model: ModelProvider;
  fallback_models: ModelProvider[];
  edge_optimized: boolean;
  max_tokens: number;
  temperature: number;
  
  // Behavioral Configuration
  autonomy_level: 0 | 1 | 2 | 3 | 4 | 5; // 0=manual, 5=fully autonomous
  collaboration_preference: CollaborationMode[];
  max_concurrent_tasks: number;
  task_timeout_ms: number;
  
  // Resource Limits
  max_memory_mb: number;
  max_cpu_percentage: number;
  max_network_requests_per_minute: number;
  
  // Security Configuration
  security_level: 'low' | 'medium' | 'high' | 'strict';
  allowed_domains: string[];
  blocked_domains: string[];
  require_approval_for: string[];
  
  // Learning Configuration
  learning_enabled: boolean;
  memory_persistence: boolean;
  experience_sharing: boolean;
}

export interface AgentState {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  current_tasks: Task[];
  completed_tasks_count: number;
  error_count: number;
  uptime_ms: number;
  last_active: Date;
  
  // Performance Metrics
  average_task_completion_ms: number;
  success_rate: number;
  collaboration_score: number;
  learning_progress: number;
  
  // Resource Usage
  memory_usage_mb: number;
  cpu_usage_percentage: number;
  network_requests_current_minute: number;
}

// Task System
export interface Task {
  id: string;
  type: string;
  description: string;
  status: TaskStatus;
  priority: 1 | 2 | 3 | 4 | 5; // 1=lowest, 5=highest
  
  // Task Data
  input: Record<string, any>;
  output?: Record<string, any>;
  context: TaskContext;
  
  // Assignment
  assigned_to?: string; // Agent ID
  created_by: string; // Agent ID or 'user'
  created_at: Date;
  updated_at: Date;
  deadline?: Date;
  
  // Execution
  started_at?: Date;
  completed_at?: Date;
  execution_time_ms?: number;
  error?: TaskError;
  
  // Dependencies
  depends_on: string[]; // Task IDs
  blocks: string[]; // Task IDs that depend on this
  
  // Collaboration
  collaboration_mode?: CollaborationMode;
  participating_agents: string[];
  delegation_history: TaskDelegation[];
}

export interface TaskContext {
  user_id?: string;
  session_id?: string;
  conversation_id?: string;
  parent_task_id?: string;
  
  // Environmental Context
  timestamp: Date;
  timezone: string;
  locale: string;
  
  // Technical Context
  execution_environment: 'browser' | 'node' | 'edge' | 'worker';
  available_resources: ResourceAvailability;
  
  // Business Context
  project_id?: string;
  organization_id?: string;
  cost_budget?: number;
  time_budget_ms?: number;
}

export interface ResourceAvailability {
  memory_available_mb: number;
  cpu_available_percentage: number;
  network_bandwidth_mbps: number;
  storage_available_mb: number;
  gpu_available: boolean;
  
  // External Resources
  api_quotas: Record<string, number>;
  service_availability: Record<string, boolean>;
}

export interface TaskError {
  code: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  retry_count: number;
  is_retryable: boolean;
  suggested_resolution?: string;
}

export interface TaskDelegation {
  from_agent: string;
  to_agent: string;
  delegated_at: Date;
  reason: string;
  status: 'accepted' | 'rejected' | 'completed' | 'failed';
}

// Communication System
export interface AgentMessage {
  id: string;
  type: MessageType;
  from_agent: string;
  to_agent: string | 'broadcast';
  
  // Message Content
  content: any;
  metadata: MessageMetadata;
  
  // Timing
  sent_at: Date;
  received_at?: Date;
  expires_at?: Date;
  
  // Delivery
  delivery_status: 'sent' | 'delivered' | 'read' | 'failed';
  retry_count: number;
  
  // Context
  conversation_id?: string;
  related_task_id?: string;
  reply_to?: string; // Message ID
}

export interface MessageMetadata {
  priority: 1 | 2 | 3 | 4 | 5;
  requires_response: boolean;
  response_deadline?: Date;
  content_type: string;
  size_bytes: number;
  encryption_enabled: boolean;
  signature?: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // Agent IDs
  created_at: Date;
  last_message_at: Date;
  status: 'active' | 'completed' | 'archived';
  
  // Conversation Data
  messages: AgentMessage[];
  message_count: number;
  topic: string;
  tags: string[];
  
  // Collaboration Context
  related_task_ids: string[];
  collaboration_mode: CollaborationMode;
  decision_history: CollaborationDecision[];
}

export interface CollaborationDecision {
  decision_id: string;
  decision_type: 'task_assignment' | 'resource_allocation' | 'strategy_change' | 'conflict_resolution';
  participants: string[];
  options_considered: any[];
  chosen_option: any;
  rationale: string;
  confidence_score: number;
  timestamp: Date;
}

// Agent Orchestration
export interface AgentOrchestrator {
  id: string;
  name: string;
  agents: Map<string, Agent>;
  
  // Orchestration Strategy
  load_balancing_strategy: 'round_robin' | 'least_loaded' | 'capability_based' | 'intelligent';
  scaling_strategy: 'manual' | 'auto' | 'predictive';
  
  // Resource Management
  global_resource_pool: ResourcePool;
  resource_allocation_strategy: 'fair_share' | 'priority_based' | 'performance_based';
  
  // Monitoring
  monitoring_enabled: boolean;
  metrics_collection_interval_ms: number;
  alert_thresholds: AlertThresholds;
}

export interface Agent {
  config: AgentConfig;
  state: AgentState;
  
  // Core Methods
  executeTask: (task: Task) => Promise<TaskResult>;
  delegateTask: (task: Task, targetAgent: string) => Promise<TaskDelegation>;
  sendMessage: (message: AgentMessage) => Promise<void>;
  receiveMessage: (message: AgentMessage) => Promise<void>;
  
  // Lifecycle
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  
  // Learning
  learn: (experience: AgentExperience) => Promise<void>;
  shareExperience: (targetAgent: string, experience: AgentExperience) => Promise<void>;
  
  // Monitoring
  getMetrics: () => Promise<AgentMetrics>;
  getHealth: () => Promise<AgentHealthStatus>;
}

export interface TaskResult {
  task_id: string;
  status: TaskStatus;
  output?: any;
  error?: TaskError;
  execution_time_ms: number;
  resources_used: ResourceUsage;
  confidence_score: number;
  quality_score: number;
}

export interface ResourcePool {
  total_memory_mb: number;
  total_cpu_cores: number;
  total_gpu_memory_mb: number;
  total_network_bandwidth_mbps: number;
  
  allocated_memory_mb: number;
  allocated_cpu_cores: number;
  allocated_gpu_memory_mb: number;
  allocated_network_bandwidth_mbps: number;
  
  reservations: ResourceReservation[];
}

export interface ResourceReservation {
  agent_id: string;
  task_id: string;
  reserved_memory_mb: number;
  reserved_cpu_cores: number;
  reserved_gpu_memory_mb: number;
  reserved_network_bandwidth_mbps: number;
  reserved_at: Date;
  expires_at: Date;
}

export interface ResourceUsage {
  memory_used_mb: number;
  cpu_time_ms: number;
  gpu_time_ms: number;
  network_bytes_sent: number;
  network_bytes_received: number;
  storage_bytes_written: number;
  storage_bytes_read: number;
  api_calls_made: number;
  cost_incurred: number;
}

export interface AlertThresholds {
  max_error_rate: number;
  max_response_time_ms: number;
  max_memory_usage_percentage: number;
  max_cpu_usage_percentage: number;
  min_success_rate: number;
  max_task_queue_size: number;
}

// Learning and Memory
export interface AgentExperience {
  id: string;
  agent_id: string;
  experience_type: 'task_completion' | 'collaboration' | 'error_resolution' | 'optimization';
  
  // Experience Data
  context: Record<string, any>;
  actions_taken: any[];
  outcome: any;
  lessons_learned: string[];
  
  // Metadata
  timestamp: Date;
  confidence: number;
  transferability_score: number;
  tags: string[];
}

export interface AgentMemory {
  short_term: Map<string, any>; // Session memory
  long_term: Map<string, any>; // Persistent memory
  episodic: AgentExperience[]; // Experience history
  semantic: Map<string, any>; // Knowledge base
  
  // Memory Management
  max_short_term_size_mb: number;
  max_long_term_size_mb: number;
  max_episodic_entries: number;
  retention_policy: MemoryRetentionPolicy;
}

export interface MemoryRetentionPolicy {
  short_term_ttl_ms: number;
  long_term_ttl_days: number;
  episodic_max_age_days: number;
  
  // Retention Rules
  importance_threshold: number;
  frequency_threshold: number;
  recency_weight: number;
  importance_weight: number;
  frequency_weight: number;
}

// Monitoring and Analytics
export interface AgentMetrics {
  agent_id: string;
  timestamp: Date;
  
  // Performance Metrics
  tasks_completed_per_hour: number;
  average_task_completion_time_ms: number;
  success_rate_percentage: number;
  error_rate_percentage: number;
  
  // Resource Metrics
  memory_usage_percentage: number;
  cpu_usage_percentage: number;
  network_usage_mbps: number;
  
  // Collaboration Metrics
  messages_sent_per_hour: number;
  messages_received_per_hour: number;
  collaboration_success_rate: number;
  delegation_success_rate: number;
  
  // Learning Metrics
  experiences_gained: number;
  knowledge_retention_rate: number;
  adaptation_speed: number;
  
  // Quality Metrics
  output_quality_score: number;
  user_satisfaction_score: number;
  peer_rating_score: number;
}

export interface AgentHealthStatus {
  agent_id: string;
  overall_health: 'healthy' | 'warning' | 'critical' | 'unknown';
  last_check: Date;
  
  // Component Health
  components: {
    core_engine: HealthCheck;
    memory_system: HealthCheck;
    communication: HealthCheck;
    task_processor: HealthCheck;
    learning_system: HealthCheck;
  };
  
  // Alerts
  active_alerts: Alert[];
  resolved_alerts_last_24h: number;
}

export interface HealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  last_check: Date;
  metrics: Record<string, number>;
}

export interface Alert {
  id: string;
  type: 'performance' | 'resource' | 'error' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggered_at: Date;
  acknowledged: boolean;
  resolved: boolean;
  metadata: Record<string, any>;
}

// React Hook Types
export interface UseAgentOptions {
  agent_id?: string;
  auto_start?: boolean;
  error_recovery?: 'retry' | 'delegate' | 'escalate';
  max_retries?: number;
  monitoring_enabled?: boolean;
}

export interface UseAgentReturn {
  // Agent Control
  agent: Agent | null;
  startAgent: () => Promise<void>;
  stopAgent: () => Promise<void>;
  restartAgent: () => Promise<void>;
  
  // Task Management
  executeTask: (task: Partial<Task>) => Promise<TaskResult>;
  getTasks: () => Task[];
  getTaskHistory: () => Task[];
  
  // Communication
  sendMessage: (message: Partial<AgentMessage>) => Promise<void>;
  getMessages: () => AgentMessage[];
  getConversations: () => Conversation[];
  
  // Monitoring
  metrics: AgentMetrics | null;
  health: AgentHealthStatus | null;
  
  // State
  loading: boolean;
  error: Error | null;
  connected: boolean;
}

export interface UseOrchestrationOptions {
  orchestrator_id?: string;
  auto_scaling?: boolean;
  load_balancing?: boolean;
  monitoring_enabled?: boolean;
}

export interface UseOrchestrationReturn {
  // Orchestrator Control
  orchestrator: AgentOrchestrator | null;
  
  // Agent Management
  agents: Agent[];
  addAgent: (config: AgentConfig) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
  
  // Task Distribution
  distributeTask: (task: Partial<Task>) => Promise<TaskResult>;
  getTaskQueue: () => Task[];
  getCompletedTasks: () => Task[];
  
  // Resource Management
  getResourceUsage: () => ResourcePool;
  optimizeResourceAllocation: () => Promise<void>;
  
  // Monitoring
  getSystemMetrics: () => Promise<Record<string, AgentMetrics>>;
  getSystemHealth: () => Promise<Record<string, AgentHealthStatus>>;
  
  // State
  loading: boolean;
  error: Error | null;
  connected: boolean;
}

// Utility Types
export type AgentEventType = 
  | 'agent_started'
  | 'agent_stopped'
  | 'task_assigned'
  | 'task_completed'
  | 'task_failed'
  | 'message_sent'
  | 'message_received'
  | 'collaboration_started'
  | 'collaboration_completed'
  | 'error_occurred'
  | 'resource_allocated'
  | 'resource_released';

export interface AgentEvent {
  type: AgentEventType;
  agent_id: string;
  timestamp: Date;
  data: Record<string, any>;
}

export type AgentEventHandler = (event: AgentEvent) => void | Promise<void>;

// Type Guards
export const isTask = (obj: any): obj is Task => {
  return obj && typeof obj.id === 'string' && typeof obj.type === 'string';
};

export const isAgent = (obj: any): obj is Agent => {
  return obj && obj.config && obj.state && typeof obj.executeTask === 'function';
};

export const isAgentMessage = (obj: any): obj is AgentMessage => {
  return obj && typeof obj.id === 'string' && typeof obj.from_agent === 'string';
};

// Factory Functions
export const createTaskId = (): string => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createAgentId = (): string => {
  return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};