/**
 * Anthropic Provider Implementation
 * Claude API integration with streaming support
 */

import { Anthropic } from '@anthropic-ai/sdk';
import type {
  AnthropicProvider as IAnthropicProvider,
  ProviderConfiguration,
  ProviderHealth,
  ProviderUsage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  AnthropicRequest,
  AnthropicResponse,
  AnthropicStreamChunk,
} from '../../types';
import { createAIError, createErrorFromResponse } from '../../utils/errors';

export class AnthropicProvider implements IAnthropicProvider {
  readonly provider = 'anthropic' as const;
  readonly name = 'Anthropic Claude';
  readonly supportedModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
    'claude-3-sonnet-20240229',
    'claude-3-opus-20240229',
  ];
  readonly capabilities = [
    'chat',
    'text-generation',
    'code-generation',
    'image-analysis',
    'function-calling',
    'streaming',
  ];

  private client: Anthropic | null = null;
  private config: ProviderConfiguration | null = null;
  private usage = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    requestsPerHour: 0,
    tokensPerHour: 0,
    period: { start: new Date(), end: new Date() },
  };

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: ProviderConfiguration): Promise<void> {
    try {
      this.config = config;
      this.client = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
        timeout: config.timeout || 30000,
        maxRetries: config.retries || 3,
        defaultHeaders: config.headers,
      });

      // Test connection
      await this.healthCheck();
    } catch (error) {
      throw createAIError(
        `Failed to initialize Anthropic provider: ${error}`,
        'AUTH_ERROR',
        'anthropic'
      );
    }
  }

  /**
   * Dispose the provider and cleanup resources
   */
  async dispose(): Promise<void> {
    this.client = null;
    this.config = null;
  }

  /**
   * Perform inference with the model
   */
  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    if (!this.client) {
      throw createAIError('Provider not initialized', 'UNKNOWN', 'anthropic');
    }

    const startTime = Date.now();

    try {
      const anthropicRequest = this.convertToAnthropicRequest(request);
      const response = await this.client.messages.create(anthropicRequest);
      const inferenceResponse = this.convertFromAnthropicResponse(response, request);

      // Update usage stats
      this.updateUsage(inferenceResponse);

      return inferenceResponse;

    } catch (error: any) {
      // Handle Anthropic-specific errors
      if (error.status) {
        throw await createErrorFromResponse(
          { status: error.status, statusText: error.message, headers: new Headers() } as Response,
          'anthropic'
        );
      }

      throw createAIError(
        error.message || 'Anthropic inference failed',
        'UNKNOWN',
        'anthropic'
      );
    }
  }

  /**
   * Stream inference responses
   */
  async* stream(request: InferenceRequest): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.client) {
      throw createAIError('Provider not initialized', 'UNKNOWN', 'anthropic');
    }

    try {
      const anthropicRequest = this.convertToAnthropicRequest(request, true);
      const stream = await this.client.messages.create(anthropicRequest);

      for await (const chunk of stream) {
        const streamChunk = this.convertFromAnthropicStreamChunk(chunk, request);
        if (streamChunk) {
          yield streamChunk;
        }
      }

    } catch (error: any) {
      if (error.status) {
        throw await createErrorFromResponse(
          { status: error.status, statusText: error.message, headers: new Headers() } as Response,
          'anthropic'
        );
      }

      throw createAIError(
        error.message || 'Anthropic streaming failed',
        'UNKNOWN',
        'anthropic'
      );
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    return this.supportedModels;
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<any> {
    if (!this.supportedModels.includes(modelId)) {
      throw createAIError(`Model ${modelId} not supported`, 'UNKNOWN', 'anthropic');
    }

    return {
      id: modelId,
      provider: 'anthropic',
      capabilities: this.capabilities,
    };
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<ProviderHealth> {
    if (!this.client) {
      return {
        status: 'down',
        latency: 0,
        uptime: 0,
        errorRate: 1.0,
        lastCheck: new Date(),
        issues: ['Provider not initialized'],
      };
    }

    const startTime = Date.now();

    try {
      // Make a minimal test request
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });

      const endTime = Date.now();

      return {
        status: 'healthy',
        latency: endTime - startTime,
        uptime: 1.0, // Would track actual uptime in production
        errorRate: 0.0, // Would track actual error rate
        lastCheck: new Date(),
        issues: [],
      };

    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        uptime: 0,
        errorRate: 1.0,
        lastCheck: new Date(),
        issues: [`Health check failed: ${error}`],
      };
    }
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<ProviderUsage> {
    return { ...this.usage };
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<ProviderConfiguration>): void {
    if (this.config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfiguration {
    if (!this.config) {
      throw createAIError('Provider not initialized', 'UNKNOWN', 'anthropic');
    }
    return { ...this.config };
  }

  /**
   * Create message with Anthropic API
   */
  async createMessage(request: AnthropicRequest): Promise<AnthropicResponse> {
    if (!this.client) {
      throw createAIError('Provider not initialized', 'UNKNOWN', 'anthropic');
    }

    try {
      const response = await this.client.messages.create(request);
      return response as AnthropicResponse;
    } catch (error: any) {
      throw createAIError(
        error.message || 'Failed to create message',
        'UNKNOWN',
        'anthropic'
      );
    }
  }

  /**
   * Stream message with Anthropic API
   */
  async* streamMessage(request: AnthropicRequest): AsyncGenerator<AnthropicStreamChunk> {
    if (!this.client) {
      throw createAIError('Provider not initialized', 'UNKNOWN', 'anthropic');
    }

    try {
      const stream = await this.client.messages.create({ ...request, stream: true });
      
      for await (const chunk of stream) {
        yield chunk as AnthropicStreamChunk;
      }
    } catch (error: any) {
      throw createAIError(
        error.message || 'Failed to stream message',
        'UNKNOWN',
        'anthropic'
      );
    }
  }

  /**
   * Convert standard request to Anthropic format
   */
  private convertToAnthropicRequest(
    request: InferenceRequest,
    stream: boolean = false
  ): AnthropicRequest {
    const messages = request.messages || [];
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    return {
      model: request.model || 'claude-3-haiku-20240307',
      messages: conversationMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature,
      top_p: request.topP,
      stop_sequences: Array.isArray(request.stop) ? request.stop : 
                      request.stop ? [request.stop] : undefined,
      stream,
      system: systemMessage?.content,
    };
  }

  /**
   * Convert Anthropic response to standard format
   */
  private convertFromAnthropicResponse(
    response: AnthropicResponse,
    originalRequest: InferenceRequest
  ): InferenceResponse {
    return {
      id: response.id,
      model: response.model,
      choices: [{
        index: 0,
        message: {
          id: `${response.id}-msg`,
          role: 'assistant',
          content: response.content[0]?.text || '',
          timestamp: new Date(),
        },
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : response.stop_reason,
      }],
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      created: Math.floor(Date.now() / 1000),
      object: 'chat.completion',
    };
  }

  /**
   * Convert Anthropic stream chunk to standard format
   */
  private convertFromAnthropicStreamChunk(
    chunk: AnthropicStreamChunk,
    originalRequest: InferenceRequest
  ): StreamChunk | null {
    if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
      return {
        id: `stream-${Date.now()}`,
        model: originalRequest.model || 'claude-3-haiku-20240307',
        choices: [{
          index: 0,
          delta: {
            content: chunk.delta.text,
          },
        }],
        created: Math.floor(Date.now() / 1000),
        object: 'chat.completion.chunk',
      };
    }

    if (chunk.type === 'message_stop') {
      return {
        id: `stream-${Date.now()}`,
        model: originalRequest.model || 'claude-3-haiku-20240307',
        choices: [{
          index: 0,
          delta: {},
          finishReason: 'stop',
        }],
        created: Math.floor(Date.now() / 1000),
        object: 'chat.completion.chunk',
      };
    }

    return null;
  }

  /**
   * Update usage statistics
   */
  private updateUsage(response: InferenceResponse): void {
    this.usage.totalRequests++;
    this.usage.totalTokens += response.usage?.totalTokens || 0;
    
    // Estimate cost (this would use actual pricing in production)
    const estimatedCost = (response.usage?.totalTokens || 0) * 0.001; // $0.001 per token estimate
    this.usage.totalCost += estimatedCost;
  }
}