/**
 * Factory utilities for creating AI components
 */

import { BaseAgent, AgentConfig } from '../agents/base-agent';
import { ClaudeAgent, ClaudeConfig } from '../agents/claude-agent';
import { AgentOrchestrator, OrchestratorConfig } from '../agents/orchestrator';
import { Thread, ThreadConfig } from '../threads/thread-manager';
import { ThreadPool, ThreadPoolConfig } from '../threads/thread-pool';
import { agentTemplates, createAgentFromTemplate } from '../agents/templates';

/**
 * Create an agent based on type
 */
export async function createAgent(config: AgentConfig): Promise<BaseAgent> {
  switch (config.type) {
    case 'claude':
      return new ClaudeAgent(config as ClaudeConfig);
    // Add other agent types here as they're implemented
    // case 'openai':
    //   return new OpenAIAgent(config);
    // case 'llama':
    //   return new LlamaAgent(config);
    default:
      throw new Error(`Unsupported agent type: ${config.type}`);
  }
}

/**
 * Create a thread
 */
export function createThread(config?: ThreadConfig): Thread {
  return new Thread(config);
}

/**
 * Create an orchestrator
 */
export function createOrchestrator(config?: OrchestratorConfig): AgentOrchestrator {
  return new AgentOrchestrator(config);
}

/**
 * Create a thread pool
 */
export function createThreadPool(config?: ThreadPoolConfig): ThreadPool {
  return new ThreadPool(config);
}

/**
 * Create agent from template
 */
export function createFromTemplate(
  templateName: keyof typeof agentTemplates,
  overrides?: Partial<AgentConfig>
): Promise<BaseAgent> {
  const config = createAgentFromTemplate(templateName, overrides);
  return createAgent(config);
}

/**
 * Quick start helpers
 */
export const quickStart = {
  /**
   * Create a code review session
   */
  async codeReview(code: string): Promise<string> {
    const agent = await createFromTemplate('codeReviewer');
    const thread = createThread();
    thread.addAgent(agent, true);
    return thread.send(`Please review this code:\n\n${code}`);
  },

  /**
   * Generate tests for code
   */
  async generateTests(code: string, framework: string = 'jest'): Promise<string> {
    const agent = await createFromTemplate('testGenerator');
    const thread = createThread();
    thread.addAgent(agent, true);
    return thread.send(`Generate ${framework} tests for this code:\n\n${code}`);
  },

  /**
   * Debug an error
   */
  async debug(error: string, context?: string): Promise<string> {
    const agent = await createFromTemplate('debugger');
    const thread = createThread();
    thread.addAgent(agent, true);
    
    let prompt = `Debug this error:\n\n${error}`;
    if (context) {
      prompt += `\n\nContext:\n${context}`;
    }
    
    return thread.send(prompt);
  },

  /**
   * Refactor code
   */
  async refactor(code: string, goal?: string): Promise<string> {
    const agent = await createFromTemplate('refactorer');
    const thread = createThread();
    thread.addAgent(agent, true);
    
    let prompt = `Refactor this code:\n\n${code}`;
    if (goal) {
      prompt += `\n\nRefactoring goal: ${goal}`;
    }
    
    return thread.send(prompt);
  },

  /**
   * Generate documentation
   */
  async document(code: string, type: 'api' | 'readme' | 'inline' = 'api'): Promise<string> {
    const agent = await createFromTemplate('documentationWriter');
    const thread = createThread();
    thread.addAgent(agent, true);
    
    const prompts = {
      api: `Generate API documentation for this code:\n\n${code}`,
      readme: `Generate a README for this code:\n\n${code}`,
      inline: `Add inline documentation to this code:\n\n${code}`
    };
    
    return thread.send(prompts[type]);
  },

  /**
   * Multi-agent code review
   */
  async comprehensiveReview(code: string): Promise<Map<string, string>> {
    const orchestrator = createOrchestrator();
    
    // Create specialized agents
    const reviewer = await createFromTemplate('codeReviewer');
    const security = await createFromTemplate('securityAnalyst');
    const performance = await createFromTemplate('performanceOptimizer');
    
    // Create thread and add agents
    const thread = createThread();
    thread.addAgent(reviewer);
    thread.addAgent(security);
    thread.addAgent(performance);
    
    // Get reviews from each agent
    const reviews = await thread.broadcast(`Review this code:\n\n${code}`);
    
    return reviews;
  }
};