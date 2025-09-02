/**
 * AI Provider Type Definitions
 * Standardized interfaces for all AI providers
 */

import type { 
  ModelProvider, 
  InferenceRequest, 
  InferenceResponse, 
  StreamChunk,
  AIError,
  PerformanceMetrics 
} from './models';

// Base Provider Interface
export interface AIProvider {
  readonly provider: ModelProvider;
  readonly name: string;
  readonly supportedModels: string[];
  readonly capabilities: string[];
  
  // Core Methods
  initialize(config: ProviderConfiguration): Promise<void>;
  dispose(): Promise<void>;
  
  // Inference
  infer(request: InferenceRequest): Promise<InferenceResponse>;
  stream(request: InferenceRequest): AsyncGenerator<StreamChunk, void, unknown>;
  
  // Model Management
  listModels(): Promise<string[]>;
  getModelInfo(modelId: string): Promise<any>;
  
  // Health & Status
  healthCheck(): Promise<ProviderHealth>;
  getUsage(): Promise<ProviderUsage>;
  
  // Configuration
  updateConfig(config: Partial<ProviderConfiguration>): void;
  getConfig(): ProviderConfiguration;
}

// Provider Configuration
export interface ProviderConfiguration {
  apiKey: string;
  apiUrl?: string;
  organization?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  rateLimiting?: {
    requestsPerSecond?: number;
    tokensPerMinute?: number;
    concurrent?: number;
  };
  caching?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
}

// Provider Health
export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  uptime: number;
  errorRate: number;
  lastCheck: Date;
  issues: string[];
}

// Provider Usage
export interface ProviderUsage {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  requestsPerHour: number;
  tokensPerHour: number;
  period: {
    start: Date;
    end: Date;
  };
}

// Anthropic Provider Types
export interface AnthropicProvider extends AIProvider {
  provider: 'anthropic';
  
  // Anthropic-specific methods
  createMessage(request: AnthropicRequest): Promise<AnthropicResponse>;
  streamMessage(request: AnthropicRequest): AsyncGenerator<AnthropicStreamChunk>;
}

export interface AnthropicRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
  system?: string;
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicStreamChunk {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  message?: Partial<AnthropicResponse>;
  content_block?: {
    type: 'text';
    text: string;
  };
  delta?: {
    type: 'text_delta';
    text: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

// OpenAI Provider Types
export interface OpenAIProvider extends AIProvider {
  provider: 'openai';
  
  // OpenAI-specific methods
  createChatCompletion(request: OpenAIRequest): Promise<OpenAIResponse>;
  createCompletion(request: OpenAICompletionRequest): Promise<OpenAIResponse>;
  createEmbedding(request: OpenAIEmbeddingRequest): Promise<OpenAIEmbeddingResponse>;
  createImage(request: OpenAIImageRequest): Promise<OpenAIImageResponse>;
}

export interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
    function_call?: {
      name: string;
      arguments: string;
    };
  }>;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  functions?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  function_call?: string | { name: string };
}

export interface OpenAICompletionRequest {
  model: string;
  prompt: string | string[];
  suffix?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  logprobs?: number;
  echo?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  best_of?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface OpenAIEmbeddingRequest {
  model: string;
  input: string | string[];
  user?: string;
}

export interface OpenAIImageRequest {
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  response_format?: 'url' | 'b64_json';
  style?: 'vivid' | 'natural';
  user?: string;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    text?: string;
    finish_reason: string;
    logprobs?: any;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIEmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

// Google AI Provider Types
export interface GoogleAIProvider extends AIProvider {
  provider: 'google';
  
  // Google-specific methods
  generateContent(request: GoogleAIRequest): Promise<GoogleAIResponse>;
  generateContentStream(request: GoogleAIRequest): AsyncGenerator<GoogleAIStreamChunk>;
  embedContent(request: GoogleEmbeddingRequest): Promise<GoogleEmbeddingResponse>;
}

export interface GoogleAIRequest {
  model: string;
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    candidateCount?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GoogleAIResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GoogleAIStreamChunk {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason?: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GoogleEmbeddingRequest {
  model: string;
  content: {
    parts: Array<{
      text: string;
    }>;
  };
  taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
  title?: string;
}

export interface GoogleEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

// HuggingFace Provider Types
export interface HuggingFaceProvider extends AIProvider {
  provider: 'huggingface';
  
  // HuggingFace-specific methods
  textGeneration(request: HFTextGenerationRequest): Promise<HFTextGenerationResponse>;
  textToImage(request: HFTextToImageRequest): Promise<HFImageResponse>;
  imageToText(request: HFImageToTextRequest): Promise<HFTextResponse>;
  featureExtraction(request: HFFeatureExtractionRequest): Promise<HFFeatureExtractionResponse>;
}

export interface HFTextGenerationRequest {
  model: string;
  inputs: string;
  parameters?: {
    temperature?: number;
    max_new_tokens?: number;
    top_p?: number;
    repetition_penalty?: number;
    return_full_text?: boolean;
    do_sample?: boolean;
  };
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface HFTextGenerationResponse {
  generated_text: string;
}

export interface HFTextToImageRequest {
  model: string;
  inputs: string;
  parameters?: {
    guidance_scale?: number;
    num_inference_steps?: number;
    width?: number;
    height?: number;
  };
}

export interface HFImageResponse {
  image: Blob;
}

export interface HFImageToTextRequest {
  model: string;
  inputs: Blob | string;
}

export interface HFTextResponse {
  generated_text: string;
}

export interface HFFeatureExtractionRequest {
  model: string;
  inputs: string | string[];
  options?: {
    wait_for_model?: boolean;
    use_cache?: boolean;
  };
}

export interface HFFeatureExtractionResponse {
  embeddings: number[][] | number[];
}

// Provider Factory Types
export interface ProviderFactory {
  create(provider: ModelProvider, config: ProviderConfiguration): Promise<AIProvider>;
  getProvider(provider: ModelProvider): AIProvider | undefined;
  listProviders(): ModelProvider[];
  registerProvider(provider: ModelProvider, factory: () => AIProvider): void;
  unregisterProvider(provider: ModelProvider): void;
}

// Provider Manager Types
export interface ProviderManager {
  providers: Map<ModelProvider, AIProvider>;
  
  // Lifecycle
  initialize(configs: Record<ModelProvider, ProviderConfiguration>): Promise<void>;
  dispose(): Promise<void>;
  
  // Provider Management
  addProvider(provider: ModelProvider, config: ProviderConfiguration): Promise<void>;
  removeProvider(provider: ModelProvider): Promise<void>;
  getProvider(provider: ModelProvider): AIProvider | undefined;
  
  // Health Monitoring
  checkHealth(): Promise<Record<ModelProvider, ProviderHealth>>;
  getHealthyProviders(): ModelProvider[];
  
  // Load Balancing
  selectProvider(criteria: 'random' | 'round-robin' | 'least-latency' | 'least-cost'): AIProvider;
  
  // Failover
  executeWithFailover(
    request: InferenceRequest, 
    providers: ModelProvider[]
  ): Promise<InferenceResponse>;
}

// Provider Adapter Types (for legacy compatibility)
export interface ProviderAdapter<T extends AIProvider> {
  adapt(provider: T): AIProvider;
  normalize(response: any): InferenceResponse;
  denormalize(request: InferenceRequest): any;
}