/**
 * AI Model Type Definitions
 * Comprehensive type system for 50+ AI models and providers
 */

// Base AI Model Types
export type ModelProvider = 
  | 'anthropic'
  | 'openai' 
  | 'google'
  | 'huggingface'
  | 'meta'
  | 'mistral'
  | 'cohere'
  | 'stability'
  | 'replicate'
  | 'together'
  | 'fireworks'
  | 'anyscale'
  | 'perplexity'
  | 'local';

export type ModelCapability = 
  | 'text-generation'
  | 'text-completion' 
  | 'chat'
  | 'code-generation'
  | 'image-generation'
  | 'image-analysis'
  | 'audio-generation'
  | 'audio-transcription'
  | 'video-analysis'
  | 'embedding'
  | 'classification'
  | 'translation'
  | 'summarization'
  | 'question-answering';

export type ModelSize = 'small' | 'medium' | 'large' | 'xl' | 'xxl';

export interface ModelMetadata {
  id: string;
  name: string;
  provider: ModelProvider;
  capabilities: ModelCapability[];
  size: ModelSize;
  contextLength: number;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsFunction: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  pricingPer1kTokens?: {
    input: number;
    output: number;
  };
  wasmSupported: boolean;
  edgeSupported: boolean;
}

// Message Types
export interface BaseMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatMessage extends BaseMessage {
  role: 'system' | 'user' | 'assistant';
}

export interface FunctionMessage extends BaseMessage {
  role: 'function';
  name: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export type Message = ChatMessage | FunctionMessage;

// Request/Response Types
export interface InferenceRequest {
  model: string;
  messages?: Message[];
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  stream?: boolean;
  functions?: FunctionDefinition[];
  functionCall?: string | { name: string };
  user?: string;
}

export interface InferenceResponse {
  id: string;
  model: string;
  choices: InferenceChoice[];
  usage: TokenUsage;
  created: number;
  object: string;
}

export interface InferenceChoice {
  index: number;
  message?: Message;
  text?: string;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  logprobs?: any;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Streaming Types
export interface StreamChunk {
  id: string;
  model: string;
  choices: StreamChoice[];
  created: number;
  object: string;
}

export interface StreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
    functionCall?: {
      name?: string;
      arguments?: string;
    };
  };
  finishReason?: string;
}

// Function Calling Types
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// Provider Configuration Types
export interface ProviderConfig {
  provider: ModelProvider;
  apiKey?: string;
  apiUrl?: string;
  organization?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Performance Types
export interface PerformanceMetrics {
  latency: number;
  throughput: number;
  tokensPerSecond: number;
  costPer1kTokens: number;
  wasmSpeedup?: number;
  edgeLatency?: number;
}

// Error Types
export interface AIError extends Error {
  code: 'AUTH_ERROR' | 'RATE_LIMIT' | 'CONTEXT_LENGTH' | 'CONTENT_FILTER' | 'NETWORK_ERROR' | 'UNKNOWN';
  provider: ModelProvider;
  model?: string;
  statusCode?: number;
  retryAfter?: number;
}

// Hook State Types
export interface AIHookState<T = any> {
  data: T | null;
  loading: boolean;
  error: AIError | null;
  metrics: PerformanceMetrics | null;
}

// Model Registry Types
export interface ModelRegistry {
  models: Map<string, ModelMetadata>;
  providers: Map<ModelProvider, ProviderConfig>;
  register(model: ModelMetadata): void;
  unregister(modelId: string): void;
  getModel(modelId: string): ModelMetadata | undefined;
  getModels(filter?: Partial<ModelMetadata>): ModelMetadata[];
  getProvider(provider: ModelProvider): ProviderConfig | undefined;
  setProvider(provider: ModelProvider, config: ProviderConfig): void;
}

// Advanced Types for Multi-modal Support
export interface ImageInput {
  type: 'image';
  data: string | Blob | File;
  format: 'png' | 'jpg' | 'webp' | 'gif';
}

export interface AudioInput {
  type: 'audio';
  data: string | Blob | File;
  format: 'mp3' | 'wav' | 'flac' | 'ogg';
  duration?: number;
}

export interface VideoInput {
  type: 'video';
  data: string | Blob | File;
  format: 'mp4' | 'webm' | 'avi';
  duration?: number;
  frames?: ImageInput[];
}

export type MultiModalInput = ImageInput | AudioInput | VideoInput;

export interface MultiModalMessage extends Omit<BaseMessage, 'content'> {
  content: string | MultiModalInput[];
}

// WASM Types
export interface WASMInferenceEngine {
  initialize(): Promise<void>;
  loadModel(modelPath: string): Promise<void>;
  infer(input: string | Float32Array): Promise<string | Float32Array>;
  dispose(): void;
}

// Edge Computing Types
export interface EdgeDeployment {
  region: string;
  latency: number;
  available: boolean;
  modelIds: string[];
}

export interface EdgeConfig {
  preferredRegions: string[];
  fallbackToOrigin: boolean;
  cacheStrategy: 'none' | 'aggressive' | 'intelligent';
  warmupModels: string[];
}