/**
 * Katalyst AI Package
 * Production-ready AI agents and thread management system
 */

// Agents
export { BaseAgent, AgentConfig, AgentTool, AgentMessage, AgentContext, AgentStatus } from './agents/base-agent';
export { ClaudeAgent, ClaudeConfig, ClaudeCodeConfig } from './agents/claude-agent';
export { AgentOrchestrator, OrchestratorConfig, TaskDefinition, TaskResult } from './agents/orchestrator';

// Threads
export { Thread, ThreadConfig, ThreadMessage, ThreadStatus, ThreadSnapshot } from './threads/thread-manager';
export { ThreadPool, ThreadPoolConfig, ThreadPoolStats } from './threads/thread-pool';

// Claude Integration
export { ClaudeChat } from './claude/chat';

// Agent Templates
export { agentTemplates } from './agents/templates';

// Utilities
export { createAgent, createThread, createOrchestrator } from './utils/factory';

// Re-export main classes for convenience
export { AI } from './ai-manager';