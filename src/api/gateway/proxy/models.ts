/**
 * Model Proxy for autonogrammer.ai API
 * Handles requests to self-hosted models with load balancing and error handling
 */

import axios, { AxiosResponse } from 'axios';
import winston from 'winston';
import { APIConfig, ModelConfig } from '../config';

export interface ModelRequest {
  userId: string;
  requestId: string;
  tier: string;
  model?: string;
}

export interface ModelResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    text?: string;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ModelProxy {
  private config: APIConfig;
  private logger: winston.Logger;
  private modelHealthStatus: Map<string, { healthy: boolean; lastCheck: Date; latency: number }> = new Map();
  private requestQueue: Map<string, Array<any>> = new Map();

  constructor(config: APIConfig, logger: winston.Logger) {
    this.config = config;
    this.logger = logger;
    
    this.initializeHealthChecks();
  }

  private initializeHealthChecks(): void {
    // Initialize health status for all models
    Object.keys(this.config.models).forEach(modelKey => {
      this.modelHealthStatus.set(modelKey, {
        healthy: false,
        lastCheck: new Date(0),
        latency: 0,
      });
    });

    // Start periodic health checks
    this.startHealthChecks();
  }

  private startHealthChecks(): void {
    const checkInterval = 30000; // 30 seconds
    
    setInterval(async () => {
      await Promise.all(
        Object.entries(this.config.models).map(async ([modelKey, modelConfig]) => {
          await this.checkModelHealth(modelKey, modelConfig);
        })
      );
    }, checkInterval);

    // Initial health check
    setTimeout(async () => {
      await Promise.all(
        Object.entries(this.config.models).map(async ([modelKey, modelConfig]) => {
          await this.checkModelHealth(modelKey, modelConfig);
        })
      );
    }, 1000);
  }

  private async checkModelHealth(modelKey: string, modelConfig: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      const healthUrl = `${modelConfig.endpoint}${modelConfig.healthCheck}`;
      
      const response = await axios.get(healthUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'autonogrammer-api-gateway/1.0',
        },
      });

      const latency = Date.now() - startTime;
      const isHealthy = response.status === 200 && response.data?.status === 'healthy';

      this.modelHealthStatus.set(modelKey, {
        healthy: isHealthy,
        lastCheck: new Date(),
        latency,
      });

      if (isHealthy) {
        this.logger.debug(`Model ${modelKey} health check passed`, {
          model: modelKey,
          latency,
          status: response.data?.status,
        });
      } else {
        this.logger.warn(`Model ${modelKey} health check failed`, {
          model: modelKey,
          status: response.status,
          data: response.data,
        });
      }
    } catch (error) {
      this.modelHealthStatus.set(modelKey, {
        healthy: false,
        lastCheck: new Date(),
        latency: Date.now() - startTime,
      });

      this.logger.error(`Model ${modelKey} health check error`, {
        model: modelKey,
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: modelConfig.endpoint,
      });
    }
  }

  public async forwardRequest(
    modelKey: string,
    endpoint: string,
    requestBody: any,
    requestContext: ModelRequest
  ): Promise<ModelResponse> {
    const modelConfig = this.config.models[modelKey as keyof typeof this.config.models];
    if (!modelConfig) {
      throw new Error(`Model '${modelKey}' not found`);
    }

    // Check model health
    const healthStatus = this.modelHealthStatus.get(modelKey);
    if (!healthStatus?.healthy) {
      throw new Error(`Model '${modelKey}' is currently unavailable`);
    }

    const startTime = Date.now();
    
    try {
      // Prepare request headers
      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'autonogrammer-api-gateway/1.0',
        'X-Request-ID': requestContext.requestId,
        'X-User-ID': requestContext.userId,
        'X-User-Tier': requestContext.tier,
      };

      // Add model-specific authentication
      if (modelConfig.authentication.type === 'api-key') {
        const apiKey = this.getModelApiKey(modelKey);
        headers[modelConfig.authentication.headerName] = apiKey;
      }

      // Construct full URL
      const fullUrl = `${modelConfig.endpoint}/v1/${endpoint}`;

      // Add model to request if not specified
      if (!requestBody.model) {
        requestBody.model = modelKey;
      }

      // Validate request against model constraints
      this.validateRequest(requestBody, modelConfig, requestContext.tier);

      this.logger.info('Forwarding request to model', {
        model: modelKey,
        endpoint,
        userId: requestContext.userId,
        requestId: requestContext.requestId,
        tier: requestContext.tier,
        url: fullUrl,
        inputTokens: this.estimateTokens(JSON.stringify(requestBody)),
      });

      // Make request to model
      const response: AxiosResponse = await axios.post(fullUrl, requestBody, {
        headers,
        timeout: 120000, // 2 minutes
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      const latency = Date.now() - startTime;

      // Handle different response status codes
      if (response.status >= 400) {
        this.logger.error('Model request failed', {
          model: modelKey,
          status: response.status,
          data: response.data,
          requestId: requestContext.requestId,
          latency,
        });

        throw new Error(`Model request failed with status ${response.status}: ${response.data?.error || 'Unknown error'}`);
      }

      // Validate and transform response
      const modelResponse = this.transformResponse(response.data, modelKey);
      
      // Log successful request
      this.logger.info('Model request completed', {
        model: modelKey,
        userId: requestContext.userId,
        requestId: requestContext.requestId,
        latency,
        inputTokens: modelResponse.usage?.prompt_tokens,
        outputTokens: modelResponse.usage?.completion_tokens,
        totalTokens: modelResponse.usage?.total_tokens,
      });

      // Update health status with successful request
      const currentHealth = this.modelHealthStatus.get(modelKey);
      if (currentHealth) {
        currentHealth.latency = (currentHealth.latency + latency) / 2; // Moving average
      }

      return modelResponse;

    } catch (error) {
      const latency = Date.now() - startTime;

      this.logger.error('Model proxy error', {
        model: modelKey,
        endpoint,
        userId: requestContext.userId,
        requestId: requestContext.requestId,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Update health status on error
      const currentHealth = this.modelHealthStatus.get(modelKey);
      if (currentHealth && latency > 60000) { // If request took more than 1 minute, consider unhealthy
        currentHealth.healthy = false;
      }

      // Re-throw with more context
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Unable to connect to model '${modelKey}' - service may be down`);
        } else if (error.code === 'ETIMEDOUT') {
          throw new Error(`Model '${modelKey}' request timed out`);
        } else if (error.response) {
          throw new Error(`Model '${modelKey}' returned ${error.response.status}: ${error.response.data?.error || 'Unknown error'}`);
        }
      }

      throw error;
    }
  }

  private getModelApiKey(modelKey: string): string {
    // In production, these would be stored securely (AWS Secrets Manager, HashiCorp Vault, etc.)
    const modelApiKeys = {
      qwen3_42b: 'qwen-qwen42b--ntfxNTp8LVo1AupQXLCDNyuZMPOyQ51emb2HLHzVCv6wiPo9aC3nTZDR3GjurVY_oGaYmMPz6v4qXq8PP1MVw',
      qwen3_moe: 'qwen-qwenmoe-YoAe0PxNgesmNNvfWsnEy6xjLFc3pA4wgxxlnRvD6gj-4y6RIFpxz_zr-vIhMDTaky4w1uCsUZDg6khNdu6LHA',
    };

    const apiKey = modelApiKeys[modelKey as keyof typeof modelApiKeys];
    if (!apiKey) {
      throw new Error(`No API key configured for model '${modelKey}'`);
    }

    return apiKey;
  }

  private validateRequest(requestBody: any, modelConfig: any, userTier: string): void {
    // Get tier configuration
    const tierConfig = this.config.authentication.apiKeys.tiers.find(t => t.name === userTier);
    if (!tierConfig) {
      throw new Error(`Invalid user tier: ${userTier}`);
    }

    // Validate max tokens
    if (requestBody.max_tokens && requestBody.max_tokens > tierConfig.limits.maxTokensPerRequest) {
      throw new Error(`max_tokens (${requestBody.max_tokens}) exceeds tier limit (${tierConfig.limits.maxTokensPerRequest})`);
    }

    // Validate context window
    const estimatedInputTokens = this.estimateTokens(JSON.stringify(requestBody.messages || requestBody.prompt || ''));
    const maxTokens = requestBody.max_tokens || 100;
    
    if (estimatedInputTokens + maxTokens > tierConfig.limits.maxContextWindow) {
      throw new Error(`Request would exceed context window limit (${tierConfig.limits.maxContextWindow} tokens)`);
    }

    if (estimatedInputTokens + maxTokens > modelConfig.contextWindow) {
      throw new Error(`Request would exceed model context window (${modelConfig.contextWindow} tokens)`);
    }

    // Validate model access for tier
    if (!tierConfig.features.models.includes(modelConfig.name) && !tierConfig.features.models.includes('*')) {
      throw new Error(`Access denied to model '${modelConfig.name}' for tier '${userTier}'`);
    }
  }

  private estimateTokens(text: string): number {
    // Simple token estimation (roughly 4 characters per token for English)
    // In production, use a proper tokenizer
    return Math.ceil(text.length / 4);
  }

  private transformResponse(responseData: any, modelKey: string): ModelResponse {
    // Ensure response has required fields
    if (!responseData.choices || !Array.isArray(responseData.choices)) {
      throw new Error('Invalid response format: missing choices array');
    }

    // Standardize response format
    const standardResponse: ModelResponse = {
      id: responseData.id || `${modelKey}-${Date.now()}`,
      object: responseData.object || 'text_completion',
      created: responseData.created || Math.floor(Date.now() / 1000),
      model: modelKey,
      choices: responseData.choices.map((choice: any, index: number) => ({
        index: choice.index || index,
        message: choice.message || (choice.text ? undefined : { role: 'assistant', content: choice.text }),
        text: choice.text,
        finish_reason: choice.finish_reason || 'stop',
      })),
      usage: {
        prompt_tokens: responseData.usage?.prompt_tokens || 0,
        completion_tokens: responseData.usage?.completion_tokens || 0,
        total_tokens: responseData.usage?.total_tokens || 0,
      },
    };

    return standardResponse;
  }

  public getModelHealthStatus(modelKey?: string): any {
    if (modelKey) {
      const status = this.modelHealthStatus.get(modelKey);
      return status ? {
        model: modelKey,
        healthy: status.healthy,
        lastCheck: status.lastCheck,
        latency: status.latency,
      } : null;
    }

    // Return all model statuses
    const statuses: any = {};
    this.modelHealthStatus.forEach((status, key) => {
      statuses[key] = {
        healthy: status.healthy,
        lastCheck: status.lastCheck,
        latency: status.latency,
      };
    });

    return statuses;
  }

  public async getModelCapabilities(modelKey: string): Promise<any> {
    const modelConfig = this.config.models[modelKey as keyof typeof this.config.models];
    if (!modelConfig) {
      throw new Error(`Model '${modelKey}' not found`);
    }

    return {
      id: modelKey,
      name: modelConfig.name,
      capabilities: modelConfig.capabilities,
      contextWindow: modelConfig.contextWindow,
      maxTokens: modelConfig.maxTokens,
      pricing: modelConfig.pricing,
      healthy: this.modelHealthStatus.get(modelKey)?.healthy || false,
    };
  }

  // Method to gracefully handle model failures
  public async handleModelFailure(modelKey: string, error: Error): Promise<void> {
    this.logger.error(`Model ${modelKey} failure detected`, {
      model: modelKey,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // Mark model as unhealthy
    const currentHealth = this.modelHealthStatus.get(modelKey);
    if (currentHealth) {
      currentHealth.healthy = false;
      currentHealth.lastCheck = new Date();
    }

    // In production, implement circuit breaker pattern
    // - Stop sending requests to failed model
    // - Implement exponential backoff for health checks
    // - Route requests to healthy models
    // - Send alerts to operations team
  }

  // Circuit breaker implementation
  private circuitBreakers: Map<string, { failures: number; lastFailure: Date; state: 'closed' | 'open' | 'half-open' }> = new Map();

  private updateCircuitBreaker(modelKey: string, success: boolean): void {
    let breaker = this.circuitBreakers.get(modelKey);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: new Date(), state: 'closed' };
      this.circuitBreakers.set(modelKey, breaker);
    }

    if (success) {
      breaker.failures = 0;
      breaker.state = 'closed';
    } else {
      breaker.failures++;
      breaker.lastFailure = new Date();
      
      if (breaker.failures >= 5) { // Open circuit after 5 failures
        breaker.state = 'open';
        this.logger.warn(`Circuit breaker opened for model ${modelKey}`, {
          model: modelKey,
          failures: breaker.failures,
        });
      }
    }
  }

  private isCircuitBreakerOpen(modelKey: string): boolean {
    const breaker = this.circuitBreakers.get(modelKey);
    if (!breaker || breaker.state === 'closed') {
      return false;
    }

    if (breaker.state === 'open') {
      // Try to transition to half-open after 60 seconds
      if (Date.now() - breaker.lastFailure.getTime() > 60000) {
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }
}