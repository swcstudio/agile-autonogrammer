// @katalyst/ai - AI and Claude integration
export * from './src/claude/chat.ts';

// Agent system exports
export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  execute: (task: any) => Promise<any>;
}

export interface ThreadLifecycle {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  agents: Agent[];
  tasks: any[];
  results: any[];
}

export class AIOrchestrator {
  private threads: Map<string, ThreadLifecycle>;
  
  constructor() {
    this.threads = new Map();
  }
  
  async createThread(agents: Agent[]): Promise<string> {
    const threadId = crypto.randomUUID();
    this.threads.set(threadId, {
      id: threadId,
      status: 'idle',
      agents,
      tasks: [],
      results: []
    });
    return threadId;
  }
  
  async executeThread(threadId: string, tasks: any[]): Promise<any[]> {
    const thread = this.threads.get(threadId);
    if (!thread) throw new Error('Thread not found');
    
    thread.status = 'running';
    thread.tasks = tasks;
    
    // Execute tasks concurrently using agents
    const results = await Promise.all(
      tasks.map((task, index) => {
        const agent = thread.agents[index % thread.agents.length];
        return agent.execute(task);
      })
    );
    
    thread.results = results;
    thread.status = 'completed';
    
    return results;
  }
}