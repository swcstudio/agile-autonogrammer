/**
 * AI Development Assistant - Advanced AI-powered development assistance for AI-OSX
 * 
 * Provides comprehensive AI-driven development support including code generation,
 * refactoring, testing, documentation, debugging, and optimization with deep
 * integration into the Katalyst framework and AI-OSX ecosystem.
 */

import { SecurityAIClient } from '@katalyst/security-ai';
import { UnifiedEditor, EditorDocument, EditorCompletion, EditorCodeAction } from '../editors/UnifiedEditor';
import { TerminalMultiplexer, TerminalSession } from '../terminal/TerminalMultiplexer';
import { VirtualProcess } from '../kernel/LinuxEnvironment';

export type AssistantCapability =
  | 'code-completion'
  | 'code-generation'
  | 'refactoring'
  | 'documentation'
  | 'testing'
  | 'debugging'
  | 'optimization'
  | 'architecture'
  | 'security'
  | 'translation'
  | 'explanation'
  | 'review';

export type AIModel =
  | '@cf/meta/llama-4-scout-17b-16e-instruct'
  | '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
  | '@cf/qwen/qwq-32b'
  | '@cf/deepseek/deepseek-r1-distill-qwen-32b'
  | '@cf/qwen/qwen2.5-coder-32b-instruct'
  | '@cf/meta/llama-guard-3-11b'
  | 'gpt-4'
  | 'claude-3-sonnet'
  | 'custom';

export interface AssistantConfig {
  enabledCapabilities: AssistantCapability[];
  primaryModel: AIModel;
  fallbackModels: AIModel[];
  maxTokens: number;
  temperature: number;
  topP: number;
  contextWindowSize: number;
  enableStreamingResponses: boolean;
  enableContextAwareness: boolean;
  enableProjectAnalysis: boolean;
  enableSecurityScanning: boolean;
  enablePerformanceOptimization: boolean;
  personalityProfile: PersonalityProfile;
  knowledgeBases: KnowledgeBase[];
}

export interface PersonalityProfile {
  style: 'concise' | 'detailed' | 'conversational' | 'formal' | 'adaptive';
  expertise: 'junior' | 'senior' | 'architect' | 'specialist';
  communication: 'direct' | 'explanatory' | 'socratic' | 'collaborative';
  focus: 'productivity' | 'learning' | 'quality' | 'innovation' | 'balanced';
}

export interface KnowledgeBase {
  id: string;
  name: string;
  type: 'documentation' | 'codebase' | 'patterns' | 'standards' | 'examples';
  source: string;
  embedding?: number[];
  lastUpdated: number;
  relevanceScore: number;
}

export interface AIRequest {
  id: string;
  capability: AssistantCapability;
  prompt: string;
  context: AIContext;
  model?: AIModel;
  parameters?: AIParameters;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  userId?: string;
  sessionId?: string;
}

export interface AIContext {
  currentFile?: EditorDocument;
  selectedText?: string;
  cursorPosition?: { line: number; column: number };
  openFiles: EditorDocument[];
  projectStructure?: ProjectStructure;
  gitContext?: GitContext;
  terminalContext?: TerminalContext;
  previousInteractions: InteractionHistory[];
  userPreferences: UserPreferences;
  environmentInfo: EnvironmentInfo;
}

export interface ProjectStructure {
  rootPath: string;
  language: string;
  framework?: string;
  packageManager?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  configFiles: string[];
  sourceFiles: string[];
  testFiles: string[];
  documentationFiles: string[];
  buildOutput: string[];
}

export interface GitContext {
  branch: string;
  uncommittedChanges: string[];
  recentCommits: GitCommit[];
  remoteUrl?: string;
  tags: string[];
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  files: string[];
}

export interface TerminalContext {
  currentDirectory: string;
  recentCommands: string[];
  environment: Record<string, string>;
  runningProcesses: VirtualProcess[];
}

export interface InteractionHistory {
  requestId: string;
  capability: AssistantCapability;
  prompt: string;
  response: string;
  accepted: boolean;
  feedback?: string;
  timestamp: number;
}

export interface UserPreferences {
  codeStyle: string;
  namingConventions: Record<string, string>;
  preferredPatterns: string[];
  avoidedPatterns: string[];
  testingFramework?: string;
  documentationStyle?: string;
  reviewCriteria: string[];
}

export interface EnvironmentInfo {
  os: string;
  nodeVersion?: string;
  pythonVersion?: string;
  rustVersion?: string;
  installedPackages: Record<string, string>;
  editorConfig: any;
}

export interface AIParameters {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  systemMessage?: string;
}

export interface AIResponse {
  id: string;
  requestId: string;
  content: string;
  model: AIModel;
  confidence: number;
  reasoning?: string;
  alternatives?: string[];
  metadata: ResponseMetadata;
  actions?: AIAction[];
  timestamp: number;
}

export interface ResponseMetadata {
  tokensUsed: number;
  processingTime: number;
  cacheHit: boolean;
  contextTokens: number;
  responseTokens: number;
  cost?: number;
}

export interface AIAction {
  type: 'apply_edit' | 'create_file' | 'run_command' | 'open_url' | 'show_documentation';
  description: string;
  payload: any;
  confirmRequired: boolean;
}

export interface AssistantMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  capabilityUsage: Record<AssistantCapability, number>;
  modelUsage: Record<AIModel, number>;
  userSatisfaction: number;
  cacheHitRate: number;
  contextEfficiency: number;
  tokensUsed: number;
  cost: number;
}

export interface KatalystHook {
  id: string;
  name: string;
  trigger: 'before-save' | 'after-save' | 'before-build' | 'after-build' | 'on-error' | 'on-completion' | 'custom';
  action: KatalystHookAction;
  enabled: boolean;
  priority: number;
  conditions: HookCondition[];
}

export interface KatalystHookAction {
  type: 'ai-review' | 'ai-optimize' | 'ai-test' | 'ai-document' | 'ai-security-scan' | 'custom';
  capability: AssistantCapability;
  parameters: Record<string, any>;
  timeout: number;
  async: boolean;
}

export interface HookCondition {
  type: 'file-pattern' | 'project-type' | 'user-preference' | 'time-based' | 'custom';
  pattern: string;
  operator: 'matches' | 'contains' | 'equals' | 'greater-than' | 'less-than';
  value: any;
}

export class DevelopmentAssistant {
  private config: AssistantConfig;
  private editor: UnifiedEditor;
  private multiplexer: TerminalMultiplexer;
  private securityClient: SecurityAIClient;
  private metrics: AssistantMetrics;
  private requestQueue: AIRequest[];
  private responseCache: Map<string, AIResponse>;
  private contextCache: Map<string, AIContext>;
  private knowledgeIndex: Map<string, KnowledgeBase>;
  private hooks: Map<string, KatalystHook>;
  private activeRequests: Map<string, Promise<AIResponse>>;
  private interactionHistory: InteractionHistory[];
  private isInitialized: boolean;

  constructor(
    config: AssistantConfig,
    editor: UnifiedEditor,
    multiplexer: TerminalMultiplexer,
    securityClient: SecurityAIClient
  ) {
    this.config = config;
    this.editor = editor;
    this.multiplexer = multiplexer;
    this.securityClient = securityClient;
    this.requestQueue = [];
    this.responseCache = new Map();
    this.contextCache = new Map();
    this.knowledgeIndex = new Map();
    this.hooks = new Map();
    this.activeRequests = new Map();
    this.interactionHistory = [];
    this.isInitialized = false;

    this.initializeMetrics();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize knowledge bases
    await this.initializeKnowledgeBases();
    
    // Set up Katalyst hooks
    await this.setupKatalystHooks();
    
    // Start request processing
    this.startRequestProcessor();
    
    // Initialize context awareness
    await this.initializeContextAwareness();

    this.isInitialized = true;
    console.log('🤖 AI Development Assistant initialized');
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      capabilityUsage: {} as Record<AssistantCapability, number>,
      modelUsage: {} as Record<AIModel, number>,
      userSatisfaction: 0.0,
      cacheHitRate: 0.0,
      contextEfficiency: 0.0,
      tokensUsed: 0,
      cost: 0.0
    };
  }

  private async initializeKnowledgeBases(): Promise<void> {
    for (const kb of this.config.knowledgeBases) {
      try {
        await this.loadKnowledgeBase(kb);
        this.knowledgeIndex.set(kb.id, kb);
        console.log(`📚 Loaded knowledge base: ${kb.name}`);
      } catch (error) {
        console.warn(`Failed to load knowledge base ${kb.name}:`, error);
      }
    }
  }

  private async loadKnowledgeBase(kb: KnowledgeBase): Promise<void> {
    // Load and index knowledge base content
    switch (kb.type) {
      case 'documentation':
        await this.loadDocumentationKB(kb);
        break;
      case 'codebase':
        await this.loadCodebaseKB(kb);
        break;
      case 'patterns':
        await this.loadPatternsKB(kb);
        break;
      case 'standards':
        await this.loadStandardsKB(kb);
        break;
      case 'examples':
        await this.loadExamplesKB(kb);
        break;
    }
  }

  private async loadDocumentationKB(kb: KnowledgeBase): Promise<void> {
    // Load documentation from source and create embeddings
    try {
      const response = await fetch(`/api/knowledge/${kb.id}/docs`);
      const docs = await response.json();
      
      // Process and embed documentation
      for (const doc of docs) {
        const embedding = await this.generateEmbedding(doc.content);
        // Store embedding in vector database
      }
    } catch (error) {
      console.warn(`Failed to load documentation KB: ${error}`);
    }
  }

  private async loadCodebaseKB(kb: KnowledgeBase): Promise<void> {
    // Analyze codebase and extract patterns, functions, classes
    try {
      const response = await fetch(`/api/knowledge/${kb.id}/codebase`);
      const codebase = await response.json();
      
      // Extract and index code elements
      for (const file of codebase.files) {
        await this.indexCodeFile(file);
      }
    } catch (error) {
      console.warn(`Failed to load codebase KB: ${error}`);
    }
  }

  private async loadPatternsKB(kb: KnowledgeBase): Promise<void> {
    // Load design patterns and best practices
  }

  private async loadStandardsKB(kb: KnowledgeBase): Promise<void> {
    // Load coding standards and style guides
  }

  private async loadExamplesKB(kb: KnowledgeBase): Promise<void> {
    // Load code examples and templates
  }

  private async setupKatalystHooks(): Promise<void> {
    // Set up built-in hooks
    const builtinHooks: KatalystHook[] = [
      {
        id: 'pre-save-review',
        name: 'Pre-Save Code Review',
        trigger: 'before-save',
        action: {
          type: 'ai-review',
          capability: 'review',
          parameters: { focus: 'quality' },
          timeout: 5000,
          async: false
        },
        enabled: true,
        priority: 100,
        conditions: [
          {
            type: 'file-pattern',
            pattern: '\\.(ts|js|py|rs|ex|go)$',
            operator: 'matches',
            value: true
          }
        ]
      },
      {
        id: 'post-completion-optimize',
        name: 'Post-Completion Optimization',
        trigger: 'on-completion',
        action: {
          type: 'ai-optimize',
          capability: 'optimization',
          parameters: { focus: 'performance' },
          timeout: 3000,
          async: true
        },
        enabled: this.config.enablePerformanceOptimization,
        priority: 50,
        conditions: []
      },
      {
        id: 'error-debugging-assistant',
        name: 'Error Debugging Assistant',
        trigger: 'on-error',
        action: {
          type: 'ai-review',
          capability: 'debugging',
          parameters: { focus: 'error-analysis' },
          timeout: 10000,
          async: false
        },
        enabled: true,
        priority: 200,
        conditions: []
      }
    ];

    for (const hook of builtinHooks) {
      this.hooks.set(hook.id, hook);
    }

    console.log(`🪝 Registered ${builtinHooks.length} Katalyst hooks`);
  }

  private async initializeContextAwareness(): Promise<void> {
    if (!this.config.enableContextAwareness) return;

    // Set up context monitoring
    setInterval(() => {
      this.updateGlobalContext();
    }, 5000);

    // Analyze project structure
    await this.analyzeProject();
  }

  private startRequestProcessor(): void {
    setInterval(() => {
      this.processRequestQueue();
    }, 100);
  }

  private async processRequestQueue(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    // Sort by priority
    this.requestQueue.sort((a, b) => {
      const priorityMap = { urgent: 4, high: 3, normal: 2, low: 1 };
      return priorityMap[b.priority] - priorityMap[a.priority];
    });

    // Process highest priority request
    const request = this.requestQueue.shift()!;
    
    if (!this.activeRequests.has(request.id)) {
      const responsePromise = this.processRequest(request);
      this.activeRequests.set(request.id, responsePromise);
      
      try {
        await responsePromise;
      } finally {
        this.activeRequests.delete(request.id);
      }
    }
  }

  // Public API methods
  public async requestAssistance(
    capability: AssistantCapability,
    prompt: string,
    context?: Partial<AIContext>,
    priority: AIRequest['priority'] = 'normal'
  ): Promise<string> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullContext = await this.buildContext(context);
    
    const request: AIRequest = {
      id: requestId,
      capability,
      prompt,
      context: fullContext,
      timestamp: Date.now(),
      priority
    };

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cached = this.responseCache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2;
      return cached.content;
    }

    // Add to queue
    this.requestQueue.push(request);
    
    // Wait for processing
    const response = await this.waitForResponse(requestId);
    return response.content;
  }

  private async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // Select appropriate model
      const model = this.selectModel(request);
      
      // Build prompt with context
      const enhancedPrompt = await this.buildEnhancedPrompt(request);
      
      // Make AI request
      const aiResponse = await this.callAIModel(model, enhancedPrompt, request.parameters);
      
      // Process and validate response
      const response = await this.processAIResponse(request, aiResponse);
      
      // Cache response
      const cacheKey = this.generateCacheKey(request);
      this.responseCache.set(cacheKey, response);
      
      // Update metrics
      this.updateMetrics(request, response, performance.now() - startTime);
      
      // Store in interaction history
      this.interactionHistory.push({
        requestId: request.id,
        capability: request.capability,
        prompt: request.prompt,
        response: response.content,
        accepted: true, // Will be updated based on user feedback
        timestamp: Date.now()
      });

      this.metrics.successfulRequests++;
      return response;

    } catch (error) {
      this.metrics.failedRequests++;
      console.error('AI request failed:', error);
      
      // Return error response
      return {
        id: `res-${request.id}`,
        requestId: request.id,
        content: `I apologize, but I encountered an error processing your request: ${error}`,
        model: 'error',
        confidence: 0,
        metadata: {
          tokensUsed: 0,
          processingTime: performance.now() - startTime,
          cacheHit: false,
          contextTokens: 0,
          responseTokens: 0
        },
        timestamp: Date.now()
      };
    }
  }

  private selectModel(request: AIRequest): AIModel {
    // Model selection logic based on capability and requirements
    switch (request.capability) {
      case 'code-generation':
      case 'code-completion':
        return '@cf/qwen/qwen2.5-coder-32b-instruct';
      case 'security':
        return '@cf/meta/llama-guard-3-11b';
      case 'architecture':
      case 'review':
        return '@cf/qwen/qwq-32b';
      case 'explanation':
      case 'documentation':
        return '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
      default:
        return this.config.primaryModel;
    }
  }

  private async buildEnhancedPrompt(request: AIRequest): Promise<string> {
    let prompt = '';
    
    // Add system context based on personality profile
    prompt += this.buildSystemPrompt(request);
    
    // Add relevant knowledge base context
    const relevantKnowledge = await this.retrieveRelevantKnowledge(request);
    if (relevantKnowledge.length > 0) {
      prompt += '\n\nRelevant Knowledge:\n' + relevantKnowledge.join('\n\n');
    }
    
    // Add project context
    if (request.context.projectStructure) {
      prompt += '\n\nProject Context:\n' + this.formatProjectContext(request.context.projectStructure);
    }
    
    // Add current file context
    if (request.context.currentFile) {
      prompt += '\n\nCurrent File:\n' + this.formatFileContext(request.context.currentFile);
    }
    
    // Add the actual user request
    prompt += '\n\nUser Request:\n' + request.prompt;
    
    return prompt;
  }

  private buildSystemPrompt(request: AIRequest): string {
    const personality = this.config.personalityProfile;
    
    let systemPrompt = 'You are an expert AI development assistant integrated into AI-OSX. ';
    
    switch (personality.style) {
      case 'concise':
        systemPrompt += 'Provide concise, direct answers. ';
        break;
      case 'detailed':
        systemPrompt += 'Provide comprehensive, detailed explanations. ';
        break;
      case 'conversational':
        systemPrompt += 'Use a friendly, conversational tone. ';
        break;
      case 'formal':
        systemPrompt += 'Maintain a professional, formal tone. ';
        break;
      case 'adaptive':
        systemPrompt += 'Adapt your communication style to the context. ';
        break;
    }
    
    switch (personality.expertise) {
      case 'junior':
        systemPrompt += 'Assume basic programming knowledge and explain concepts clearly. ';
        break;
      case 'senior':
        systemPrompt += 'Assume advanced programming knowledge and focus on best practices. ';
        break;
      case 'architect':
        systemPrompt += 'Focus on system design, patterns, and architectural considerations. ';
        break;
      case 'specialist':
        systemPrompt += 'Provide deep, specialized technical insights. ';
        break;
    }
    
    // Add capability-specific instructions
    switch (request.capability) {
      case 'code-generation':
        systemPrompt += 'Generate clean, well-documented code following best practices. ';
        break;
      case 'refactoring':
        systemPrompt += 'Focus on improving code structure, readability, and maintainability. ';
        break;
      case 'debugging':
        systemPrompt += 'Analyze errors systematically and provide clear solutions. ';
        break;
      case 'security':
        systemPrompt += 'Prioritize security best practices and identify potential vulnerabilities. ';
        break;
      case 'optimization':
        systemPrompt += 'Focus on performance improvements and efficiency. ';
        break;
      case 'testing':
        systemPrompt += 'Create comprehensive tests covering edge cases and integration scenarios. ';
        break;
    }
    
    return systemPrompt;
  }

  private async retrieveRelevantKnowledge(request: AIRequest): Promise<string[]> {
    const knowledge: string[] = [];
    
    // Use embeddings to find relevant knowledge
    const queryEmbedding = await this.generateEmbedding(request.prompt);
    
    for (const [id, kb] of this.knowledgeIndex) {
      if (kb.embedding) {
        const similarity = this.cosineSimilarity(queryEmbedding, kb.embedding);
        if (similarity > 0.7) {
          knowledge.push(`${kb.name}: ${await this.getKnowledgeContent(kb)}`);
        }
      }
    }
    
    return knowledge.slice(0, 5); // Limit to top 5 most relevant
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Generate text embedding using AI model
    try {
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const result = await response.json();
      return result.embedding;
    } catch (error) {
      console.warn('Failed to generate embedding:', error);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async getKnowledgeContent(kb: KnowledgeBase): Promise<string> {
    // Retrieve content from knowledge base
    try {
      const response = await fetch(`/api/knowledge/${kb.id}/content`);
      return await response.text();
    } catch (error) {
      return `Knowledge base ${kb.name} content unavailable`;
    }
  }

  private formatProjectContext(project: ProjectStructure): string {
    return `
Language: ${project.language}
Framework: ${project.framework || 'None'}
Package Manager: ${project.packageManager || 'None'}
Dependencies: ${Object.keys(project.dependencies).join(', ')}
Source Files: ${project.sourceFiles.length} files
Test Files: ${project.testFiles.length} files
    `.trim();
  }

  private formatFileContext(file: EditorDocument): string {
    return `
File: ${file.name}
Language: ${file.language}
Lines: ${file.metadata.lines}
Recent changes: ${file.isDirty ? 'Yes' : 'No'}
    `.trim();
  }

  private async callAIModel(
    model: AIModel,
    prompt: string,
    parameters?: AIParameters
  ): Promise<any> {
    const payload = {
      model,
      prompt,
      max_tokens: parameters?.maxTokens || this.config.maxTokens,
      temperature: parameters?.temperature || this.config.temperature,
      top_p: parameters?.topP || this.config.topP,
      stop: parameters?.stopSequences,
      stream: this.config.enableStreamingResponses
    };

    try {
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI model call failed:', error);
      throw error;
    }
  }

  private async processAIResponse(request: AIRequest, aiResponse: any): Promise<AIResponse> {
    // Process and structure the AI response
    const response: AIResponse = {
      id: `res-${request.id}`,
      requestId: request.id,
      content: aiResponse.choices?.[0]?.text || aiResponse.content || '',
      model: request.model || this.config.primaryModel,
      confidence: this.calculateConfidence(aiResponse),
      reasoning: aiResponse.reasoning,
      alternatives: aiResponse.alternatives,
      metadata: {
        tokensUsed: aiResponse.usage?.total_tokens || 0,
        processingTime: 0,
        cacheHit: false,
        contextTokens: aiResponse.usage?.prompt_tokens || 0,
        responseTokens: aiResponse.usage?.completion_tokens || 0,
        cost: this.calculateCost(aiResponse.usage?.total_tokens || 0)
      },
      actions: await this.extractActions(response.content, request),
      timestamp: Date.now()
    };

    return response;
  }

  private calculateConfidence(aiResponse: any): number {
    // Calculate confidence score based on response metadata
    if (aiResponse.logprobs) {
      // Use log probabilities to estimate confidence
      const avgLogProb = aiResponse.logprobs.token_logprobs.reduce((a: number, b: number) => a + b, 0) / aiResponse.logprobs.token_logprobs.length;
      return Math.min(1.0, Math.exp(avgLogProb));
    }
    
    // Fallback confidence estimation
    return 0.8;
  }

  private calculateCost(tokens: number): number {
    // Calculate cost based on token usage and model pricing
    const costPerToken = 0.0001; // Placeholder rate
    return tokens * costPerToken;
  }

  private async extractActions(content: string, request: AIRequest): Promise<AIAction[]> {
    const actions: AIAction[] = [];
    
    // Extract code blocks that could be applied
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1];
      const code = match[2];
      
      if (request.capability === 'code-generation' || request.capability === 'refactoring') {
        actions.push({
          type: 'apply_edit',
          description: `Apply ${language || 'code'} changes`,
          payload: { code, language },
          confirmRequired: true
        });
      }
    }
    
    // Extract shell commands
    const commandRegex = /\$\s+(.+)/g;
    while ((match = commandRegex.exec(content)) !== null) {
      const command = match[1];
      actions.push({
        type: 'run_command',
        description: `Run command: ${command}`,
        payload: { command },
        confirmRequired: true
      });
    }
    
    return actions;
  }

  // Katalyst hooks integration
  public async triggerHook(trigger: KatalystHook['trigger'], context: any): Promise<void> {
    const applicableHooks = Array.from(this.hooks.values())
      .filter(hook => hook.enabled && hook.trigger === trigger)
      .filter(hook => this.evaluateHookConditions(hook, context))
      .sort((a, b) => b.priority - a.priority);

    for (const hook of applicableHooks) {
      try {
        if (hook.action.async) {
          // Execute hook asynchronously
          this.executeHookAction(hook, context).catch(error => {
            console.error(`Async hook ${hook.name} failed:`, error);
          });
        } else {
          // Execute hook synchronously
          await Promise.race([
            this.executeHookAction(hook, context),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Hook timeout')), hook.action.timeout)
            )
          ]);
        }
      } catch (error) {
        console.error(`Hook ${hook.name} failed:`, error);
      }
    }
  }

  private evaluateHookConditions(hook: KatalystHook, context: any): boolean {
    for (const condition of hook.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(condition: HookCondition, context: any): boolean {
    switch (condition.type) {
      case 'file-pattern':
        const filename = context.filename || context.file?.name || '';
        const regex = new RegExp(condition.pattern);
        return condition.operator === 'matches' ? regex.test(filename) : !regex.test(filename);
      
      case 'project-type':
        const projectType = context.project?.language || '';
        return condition.operator === 'equals' ? 
          projectType === condition.value : 
          projectType !== condition.value;
      
      default:
        return true;
    }
  }

  private async executeHookAction(hook: KatalystHook, context: any): Promise<void> {
    const prompt = this.buildHookPrompt(hook, context);
    
    try {
      const response = await this.requestAssistance(
        hook.action.capability,
        prompt,
        context,
        'normal'
      );
      
      console.log(`🪝 Hook ${hook.name} executed:`, response.substring(0, 100) + '...');
      
    } catch (error) {
      console.error(`Hook ${hook.name} execution failed:`, error);
    }
  }

  private buildHookPrompt(hook: KatalystHook, context: any): string {
    switch (hook.action.type) {
      case 'ai-review':
        return `Review the following code for ${hook.action.parameters.focus || 'general quality'}:\n\n${context.content || context.code || ''}`;
      
      case 'ai-optimize':
        return `Optimize the following code for ${hook.action.parameters.focus || 'performance'}:\n\n${context.content || context.code || ''}`;
      
      case 'ai-test':
        return `Generate tests for the following code:\n\n${context.content || context.code || ''}`;
      
      case 'ai-document':
        return `Generate documentation for the following code:\n\n${context.content || context.code || ''}`;
      
      case 'ai-security-scan':
        return `Analyze the following code for security vulnerabilities:\n\n${context.content || context.code || ''}`;
      
      default:
        return context.content || context.code || '';
    }
  }

  // Helper methods
  private async buildContext(partialContext?: Partial<AIContext>): Promise<AIContext> {
    const currentDoc = this.editor.getCurrentDocument();
    const openDocs = this.editor.getDocuments();
    
    return {
      currentFile: partialContext?.currentFile || currentDoc,
      selectedText: partialContext?.selectedText,
      cursorPosition: partialContext?.cursorPosition,
      openFiles: partialContext?.openFiles || openDocs,
      projectStructure: partialContext?.projectStructure || await this.analyzeProject(),
      gitContext: partialContext?.gitContext || await this.getGitContext(),
      terminalContext: partialContext?.terminalContext || await this.getTerminalContext(),
      previousInteractions: this.interactionHistory.slice(-10),
      userPreferences: partialContext?.userPreferences || this.getUserPreferences(),
      environmentInfo: partialContext?.environmentInfo || this.getEnvironmentInfo()
    };
  }

  private async analyzeProject(): Promise<ProjectStructure | undefined> {
    // Analyze current project structure
    try {
      const response = await fetch('/api/project/analyze');
      return await response.json();
    } catch (error) {
      console.warn('Failed to analyze project:', error);
      return undefined;
    }
  }

  private async getGitContext(): Promise<GitContext | undefined> {
    try {
      const response = await fetch('/api/git/context');
      return await response.json();
    } catch (error) {
      return undefined;
    }
  }

  private async getTerminalContext(): Promise<TerminalContext | undefined> {
    const activeSession = this.multiplexer.getActiveSession();
    if (!activeSession) return undefined;

    return {
      currentDirectory: activeSession.workingDirectory,
      recentCommands: activeSession.metadata.commandHistory.slice(-10),
      environment: Object.fromEntries(activeSession.environment),
      runningProcesses: []
    };
  }

  private getUserPreferences(): UserPreferences {
    return {
      codeStyle: 'standard',
      namingConventions: {},
      preferredPatterns: [],
      avoidedPatterns: [],
      reviewCriteria: []
    };
  }

  private getEnvironmentInfo(): EnvironmentInfo {
    return {
      os: navigator.platform,
      installedPackages: {},
      editorConfig: {}
    };
  }

  private generateCacheKey(request: AIRequest): string {
    const contextHash = this.hashObject({
      prompt: request.prompt,
      capability: request.capability,
      currentFile: request.context.currentFile?.name,
      selectedText: request.context.selectedText
    });
    return `${request.capability}-${contextHash}`;
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString(16);
  }

  private async waitForResponse(requestId: string): Promise<AIResponse> {
    const activeRequest = this.activeRequests.get(requestId);
    if (activeRequest) {
      return await activeRequest;
    }
    
    // Poll for response
    return new Promise((resolve, reject) => {
      const checkResponse = () => {
        const activeRequest = this.activeRequests.get(requestId);
        if (activeRequest) {
          activeRequest.then(resolve).catch(reject);
        } else {
          setTimeout(checkResponse, 100);
        }
      };
      checkResponse();
    });
  }

  private updateMetrics(request: AIRequest, response: AIResponse, processingTime: number): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * this.metrics.totalRequests + processingTime) / 
      (this.metrics.totalRequests + 1);
    
    const capability = request.capability;
    this.metrics.capabilityUsage[capability] = (this.metrics.capabilityUsage[capability] || 0) + 1;
    
    const model = response.model;
    this.metrics.modelUsage[model] = (this.metrics.modelUsage[model] || 0) + 1;
    
    this.metrics.tokensUsed += response.metadata.tokensUsed;
    this.metrics.cost += response.metadata.cost || 0;
  }

  private updateGlobalContext(): void {
    // Update global context for context awareness
    const currentDoc = this.editor.getCurrentDocument();
    if (currentDoc) {
      this.contextCache.set('current', {
        currentFile: currentDoc,
        openFiles: this.editor.getDocuments(),
        previousInteractions: this.interactionHistory.slice(-5),
        userPreferences: this.getUserPreferences(),
        environmentInfo: this.getEnvironmentInfo()
      });
    }
  }

  private async indexCodeFile(file: any): Promise<void> {
    // Index code file for knowledge base
    try {
      const content = file.content;
      const embedding = await this.generateEmbedding(content);
      // Store in vector database
    } catch (error) {
      console.warn(`Failed to index code file ${file.name}:`, error);
    }
  }

  // Public API
  public getMetrics(): AssistantMetrics {
    return { ...this.metrics };
  }

  public getInteractionHistory(): InteractionHistory[] {
    return [...this.interactionHistory];
  }

  public async provideFeedback(requestId: string, accepted: boolean, feedback?: string): Promise<void> {
    const interaction = this.interactionHistory.find(i => i.requestId === requestId);
    if (interaction) {
      interaction.accepted = accepted;
      interaction.feedback = feedback;
      
      // Update user satisfaction metric
      const totalInteractions = this.interactionHistory.length;
      const acceptedInteractions = this.interactionHistory.filter(i => i.accepted).length;
      this.metrics.userSatisfaction = acceptedInteractions / totalInteractions;
    }
  }

  public registerHook(hook: KatalystHook): void {
    this.hooks.set(hook.id, hook);
    console.log(`🪝 Registered hook: ${hook.name}`);
  }

  public unregisterHook(hookId: string): void {
    this.hooks.delete(hookId);
    console.log(`🪝 Unregistered hook: ${hookId}`);
  }

  public updateConfig(newConfig: Partial<AssistantConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public async shutdown(): Promise<void> {
    // Cancel active requests
    for (const [requestId, promise] of this.activeRequests) {
      try {
        await promise;
      } catch (error) {
        console.warn(`Failed to complete request ${requestId}:`, error);
      }
    }
    
    this.activeRequests.clear();
    this.requestQueue.length = 0;
    
    console.log('🛑 AI Development Assistant shutdown complete');
  }
}

export default DevelopmentAssistant;