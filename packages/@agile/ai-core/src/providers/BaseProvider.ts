/**
 * Base Provider Implementation
 * Common functionality for all AI providers
 */

import type {
  AIProvider,
  ProviderConfiguration,
  ProviderHealth,
  ProviderUsage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
} from '../types';
import { createAIError } from '../utils/errors';

export abstract class BaseProvider implements AIProvider {
  abstract readonly provider: any;
  abstract readonly name: string;
  abstract readonly supportedModels: string[];
  abstract readonly capabilities: string[];

  protected config: ProviderConfiguration | null = null;
  protected usage: ProviderUsage = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    requestsPerHour: 0,
    tokensPerHour: 0,
    period: { start: new Date(), end: new Date() },
  };

  async initialize(config: ProviderConfiguration): Promise<void> {
    this.config = config;
  }

  async dispose(): Promise<void> {
    this.config = null;
  }

  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    throw createAIError(
      `${this.name} inference not implemented`,
      'UNKNOWN',
      this.provider
    );
  }

  async* stream(request: InferenceRequest): AsyncGenerator<StreamChunk, void, unknown> {
    throw createAIError(
      `${this.name} streaming not implemented`,
      'UNKNOWN',
      this.provider
    );
  }

  async listModels(): Promise<string[]> {
    return this.supportedModels;
  }

  async getModelInfo(modelId: string): Promise<any> {
    return {
      id: modelId,
      provider: this.provider,
      capabilities: this.capabilities,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      status: 'healthy',
      latency: 0,
      uptime: 1.0,
      errorRate: 0.0,
      lastCheck: new Date(),
      issues: [],
    };
  }

  async getUsage(): Promise<ProviderUsage> {
    return { ...this.usage };
  }

  updateConfig(config: Partial<ProviderConfiguration>): void {
    if (this.config) {
      this.config = { ...this.config, ...config };
    }
  }

  getConfig(): ProviderConfiguration {
    if (!this.config) {
      throw createAIError('Provider not initialized', 'UNKNOWN', this.provider);
    }
    return { ...this.config };
  }
}