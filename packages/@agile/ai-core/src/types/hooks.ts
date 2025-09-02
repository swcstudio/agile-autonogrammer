/**
 * AI Hook Type Definitions
 * Types for React hooks in the AI system
 */

import type { 
  ModelProvider, 
  Message, 
  InferenceRequest, 
  InferenceResponse, 
  StreamChunk,
  AIError,
  PerformanceMetrics,
  ModelMetadata
} from './models';

// Base Hook Configuration
export interface BaseHookConfig {
  provider?: ModelProvider;
  model?: string;
  autoRetry?: boolean;
  maxRetries?: number;
  timeout?: number;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

// useAI Hook Types
export interface UseAIOptions extends BaseHookConfig {
  initialMessages?: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  functions?: Array<{
    name: string;
    description: string;
    parameters: any;
    handler: (args: any) => Promise<any> | any;
  }>;
}

export interface UseAIReturn {
  messages: Message[];
  loading: boolean;
  error: AIError | null;
  metrics: PerformanceMetrics | null;
  
  // Actions
  sendMessage: (content: string, options?: Partial<InferenceRequest>) => Promise<void>;
  clearMessages: () => void;
  retryLast: () => Promise<void>;
  
  // Streaming
  isStreaming: boolean;
  streamingContent: string;
  
  // Functions
  availableFunctions: string[];
  callFunction: (name: string, args: any) => Promise<any>;
}

// useModel Hook Types
export interface UseModelOptions extends BaseHookConfig {
  preload?: boolean;
  warmup?: boolean;
}

export interface UseModelReturn {
  model: ModelMetadata | null;
  loading: boolean;
  error: AIError | null;
  isReady: boolean;
  capabilities: string[];
  
  // Actions
  switchModel: (modelId: string) => Promise<void>;
  getAvailableModels: () => ModelMetadata[];
  
  // Model Management
  preloadModel: (modelId: string) => Promise<void>;
  unloadModel: (modelId: string) => Promise<void>;
  
  // Metrics
  modelMetrics: PerformanceMetrics | null;
  usage: {
    totalTokens: number;
    totalRequests: number;
    totalCost: number;
  };
}

// useInference Hook Types
export interface UseInferenceOptions extends BaseHookConfig {
  onStream?: (chunk: StreamChunk) => void;
  onComplete?: (response: InferenceResponse) => void;
  onError?: (error: AIError) => void;
}

export interface UseInferenceReturn {
  data: InferenceResponse | null;
  loading: boolean;
  error: AIError | null;
  progress: {
    tokensGenerated: number;
    estimatedTotal: number;
    percentage: number;
  };
  
  // Actions
  infer: (request: InferenceRequest) => Promise<InferenceResponse>;
  cancel: () => void;
  
  // Streaming
  isStreaming: boolean;
  streamChunks: StreamChunk[];
  
  // Metrics
  metrics: PerformanceMetrics | null;
  lastRequest: InferenceRequest | null;
}

// useModelComparison Hook Types
export interface UseModelComparisonOptions {
  models: string[];
  prompt: string;
  evaluationCriteria: Array<'speed' | 'quality' | 'cost' | 'accuracy'>;
  sampleSize?: number;
}

export interface ModelComparisonResult {
  modelId: string;
  response: InferenceResponse;
  metrics: PerformanceMetrics;
  scores: Record<string, number>;
  rank: number;
}

export interface UseModelComparisonReturn {
  results: ModelComparisonResult[];
  loading: boolean;
  error: AIError | null;
  winner: ModelComparisonResult | null;
  
  // Actions
  compare: () => Promise<void>;
  addModel: (modelId: string) => void;
  removeModel: (modelId: string) => void;
  
  // Analysis
  getRecommendation: (criteria: string) => ModelComparisonResult | null;
  exportResults: () => string;
}

// useAIAgent Hook Types
export interface UseAIAgentOptions extends BaseHookConfig {
  agentType: 'assistant' | 'code' | 'creative' | 'analyst' | 'custom';
  systemPrompt?: string;
  tools?: Array<{
    name: string;
    description: string;
    handler: (args: any) => Promise<any>;
  }>;
  memory?: boolean;
  memorySize?: number;
}

export interface UseAIAgentReturn {
  agent: {
    id: string;
    type: string;
    status: 'idle' | 'thinking' | 'working' | 'error';
  };
  conversation: Message[];
  loading: boolean;
  error: AIError | null;
  
  // Actions
  ask: (question: string) => Promise<string>;
  executeTask: (task: string) => Promise<any>;
  
  // Agent Management
  reset: () => void;
  saveState: () => string;
  loadState: (state: string) => void;
  
  // Tools
  availableTools: string[];
  executeTool: (name: string, args: any) => Promise<any>;
  
  // Memory
  memories: Array<{ key: string; value: any; timestamp: Date }>;
  remember: (key: string, value: any) => void;
  recall: (key: string) => any;
  forget: (key: string) => void;
}

// useEmbeddings Hook Types
export interface UseEmbeddingsOptions extends BaseHookConfig {
  dimensions?: number;
  normalize?: boolean;
  batchSize?: number;
}

export interface UseEmbeddingsReturn {
  embeddings: number[][] | null;
  loading: boolean;
  error: AIError | null;
  
  // Actions
  embed: (texts: string[]) => Promise<number[][]>;
  similarity: (a: number[], b: number[]) => number;
  search: (query: string, corpus: string[], topK?: number) => Array<{ text: string; score: number; index: number }>;
  
  // Batch Operations
  embedBatch: (texts: string[]) => Promise<number[][]>;
  
  // Vector Database Integration
  index: (texts: string[], metadata?: any[]) => Promise<void>;
  query: (vector: number[], topK?: number) => Promise<Array<{ metadata: any; score: number }>>;
}

// Hook Context Types
export interface AIHookContext {
  registry: any; // ModelRegistry type to be imported
  executionEngine: any; // ExecutionEngine type from @agile/core
  security: any; // SecurityContext type
  performance: any; // PerformanceContext type
}

// Provider Hook Types
export interface ProviderHookOptions {
  fallback?: ModelProvider[];
  loadBalance?: 'round-robin' | 'least-latency' | 'least-cost';
  healthCheck?: boolean;
  circuit?: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTime: number;
  };
}

export interface ProviderHookReturn {
  activeProvider: ModelProvider;
  availableProviders: ModelProvider[];
  providerHealth: Record<ModelProvider, 'healthy' | 'degraded' | 'down'>;
  
  // Actions
  switchProvider: (provider: ModelProvider) => Promise<void>;
  testProvider: (provider: ModelProvider) => Promise<boolean>;
  
  // Load Balancing
  getOptimalProvider: (criteria: 'speed' | 'cost' | 'quality') => ModelProvider;
  
  // Circuit Breaker
  circuitStatus: Record<ModelProvider, 'closed' | 'open' | 'half-open'>;
}

// Advanced Hook Types
export interface UseMultiModalOptions extends BaseHookConfig {
  supportedTypes: Array<'text' | 'image' | 'audio' | 'video'>;
  maxFileSize?: number;
  compression?: boolean;
}

export interface UseMultiModalReturn extends UseInferenceReturn {
  // File handling
  uploadFile: (file: File) => Promise<string>;
  processImage: (image: string | File) => Promise<any>;
  transcribeAudio: (audio: string | File) => Promise<string>;
  analyzeVideo: (video: string | File) => Promise<any>;
  
  // Multi-modal specific
  supportedFormats: string[];
  fileProcessing: boolean;
  processedFiles: Array<{ id: string; type: string; url: string; processed: boolean }>;
}