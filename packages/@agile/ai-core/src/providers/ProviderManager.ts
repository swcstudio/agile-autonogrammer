/**
 * Provider Manager
 * Manages AI providers with health monitoring and failover
 */

import { EventEmitter } from 'eventemitter3';
import type {
  ProviderManager as IProviderManager,
  AIProvider,
  ModelProvider,
  ProviderConfiguration,
  ProviderHealth,
  InferenceRequest,
  InferenceResponse,
} from '../types';
import { AnthropicProvider } from './anthropic/AnthropicProvider';
import { OpenAIProvider } from './openai/OpenAIProvider';
import { GoogleAIProvider } from './google/GoogleAIProvider';
import { HuggingFaceProvider } from './huggingface/HuggingFaceProvider';
import { createAIError } from '../utils/errors';

export class ProviderManager extends EventEmitter implements IProviderManager {
  public readonly providers = new Map<ModelProvider, AIProvider>();
  
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck = new Map<ModelProvider, ProviderHealth>();
  private circuitBreakers = new Map<ModelProvider, CircuitBreaker>();

  constructor() {
    super();
    this.startHealthMonitoring();
  }

  /**
   * Initialize providers with configurations
   */
  async initialize(configs: Record<ModelProvider, ProviderConfiguration>): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (const [provider, config] of Object.entries(configs)) {
      const providerType = provider as ModelProvider;
      initPromises.push(this.addProvider(providerType, config));
    }

    await Promise.allSettled(initPromises);
    this.emit('initialized', Array.from(this.providers.keys()));
  }

  /**
   * Dispose all providers and cleanup
   */
  async dispose(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    const disposePromises: Promise<void>[] = [];
    
    for (const provider of this.providers.values()) {
      disposePromises.push(provider.dispose());
    }

    await Promise.allSettled(disposePromises);
    
    this.providers.clear();
    this.lastHealthCheck.clear();
    this.circuitBreakers.clear();
    
    this.emit('disposed');
  }

  /**
   * Add a provider with configuration
   */
  async addProvider(provider: ModelProvider, config: ProviderConfiguration): Promise<void> {
    try {
      const providerInstance = this.createProvider(provider);
      await providerInstance.initialize(config);
      
      this.providers.set(provider, providerInstance);
      this.circuitBreakers.set(provider, new CircuitBreaker(provider));
      
      this.emit('providerAdded', { provider, config });
    } catch (error) {
      throw createAIError(
        `Failed to add provider ${provider}: ${error}`,
        'UNKNOWN',
        provider
      );
    }
  }

  /**
   * Remove a provider
   */
  async removeProvider(provider: ModelProvider): Promise<void> {
    const providerInstance = this.providers.get(provider);
    if (providerInstance) {
      await providerInstance.dispose();
      this.providers.delete(provider);
      this.lastHealthCheck.delete(provider);
      this.circuitBreakers.delete(provider);
      
      this.emit('providerRemoved', { provider });
    }
  }

  /**
   * Get a provider instance
   */
  getProvider(provider: ModelProvider): AIProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Check health of all providers
   */
  async checkHealth(): Promise<Record<ModelProvider, ProviderHealth>> {
    const healthChecks = new Map<ModelProvider, Promise<ProviderHealth>>();

    for (const [provider, instance] of this.providers) {
      healthChecks.set(provider, this.checkProviderHealth(provider, instance));
    }

    const results: Record<ModelProvider, ProviderHealth> = {} as any;

    for (const [provider, healthPromise] of healthChecks) {
      try {
        const health = await healthPromise;
        results[provider] = health;
        this.lastHealthCheck.set(provider, health);
      } catch (error) {
        const errorHealth: ProviderHealth = {
          status: 'down',
          latency: 0,
          uptime: 0,
          errorRate: 1.0,
          lastCheck: new Date(),
          issues: [`Health check failed: ${error}`],
        };
        results[provider] = errorHealth;
        this.lastHealthCheck.set(provider, errorHealth);
      }
    }

    this.emit('healthCheck', results);
    return results;
  }

  /**
   * Get healthy providers
   */
  getHealthyProviders(): ModelProvider[] {
    const healthy: ModelProvider[] = [];
    
    for (const [provider, health] of this.lastHealthCheck) {
      if (health.status === 'healthy') {
        healthy.push(provider);
      }
    }

    return healthy;
  }

  /**
   * Select provider based on criteria
   */
  selectProvider(criteria: 'random' | 'round-robin' | 'least-latency' | 'least-cost'): AIProvider {
    const healthyProviders = this.getHealthyProviders();
    
    if (healthyProviders.length === 0) {
      throw createAIError('No healthy providers available', 'NETWORK_ERROR', 'unknown');
    }

    let selectedProvider: ModelProvider;

    switch (criteria) {
      case 'random':
        selectedProvider = healthyProviders[Math.floor(Math.random() * healthyProviders.length)];
        break;
        
      case 'round-robin':
        // Simple round-robin implementation
        const lastUsed = this.getLastUsedProvider();
        const currentIndex = healthyProviders.indexOf(lastUsed);
        const nextIndex = (currentIndex + 1) % healthyProviders.length;
        selectedProvider = healthyProviders[nextIndex];
        break;
        
      case 'least-latency':
        selectedProvider = healthyProviders.reduce((best, current) => {
          const bestLatency = this.lastHealthCheck.get(best)?.latency || Infinity;
          const currentLatency = this.lastHealthCheck.get(current)?.latency || Infinity;
          return currentLatency < bestLatency ? current : best;
        });
        break;
        
      case 'least-cost':
        // For now, just return the first healthy provider
        // In a real implementation, this would consider pricing
        selectedProvider = healthyProviders[0];
        break;
        
      default:
        selectedProvider = healthyProviders[0];
    }

    this.setLastUsedProvider(selectedProvider);
    return this.providers.get(selectedProvider)!;
  }

  /**
   * Execute request with failover
   */
  async executeWithFailover(
    request: InferenceRequest,
    providers: ModelProvider[]
  ): Promise<InferenceResponse> {
    let lastError: Error | null = null;

    for (const providerType of providers) {
      const provider = this.providers.get(providerType);
      const circuitBreaker = this.circuitBreakers.get(providerType);

      if (!provider || !circuitBreaker) {
        continue;
      }

      // Check circuit breaker
      if (circuitBreaker.isOpen()) {
        continue;
      }

      try {
        const response = await provider.infer(request);
        circuitBreaker.recordSuccess();
        return response;
      } catch (error) {
        lastError = error as Error;
        circuitBreaker.recordFailure();
        
        // Continue to next provider
        continue;
      }
    }

    throw createAIError(
      `All providers failed. Last error: ${lastError?.message}`,
      'NETWORK_ERROR',
      'unknown'
    );
  }

  /**
   * Create provider instance based on type
   */
  private createProvider(provider: ModelProvider): AIProvider {
    switch (provider) {
      case 'anthropic':
        return new AnthropicProvider();
      case 'openai':
        return new OpenAIProvider();
      case 'google':
        return new GoogleAIProvider();
      case 'huggingface':
        return new HuggingFaceProvider();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Check health of a specific provider
   */
  private async checkProviderHealth(
    provider: ModelProvider,
    instance: AIProvider
  ): Promise<ProviderHealth> {
    const startTime = performance.now();
    
    try {
      const health = await instance.healthCheck();
      const endTime = performance.now();
      
      return {
        ...health,
        latency: endTime - startTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'down',
        latency: 0,
        uptime: 0,
        errorRate: 1.0,
        lastCheck: new Date(),
        issues: [`Health check failed: ${error}`],
      };
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth().catch(error => {
        console.warn('Health check failed:', error);
      });
    }, 30000);
  }

  /**
   * Get last used provider for round-robin
   */
  private lastUsedProvider: ModelProvider | null = null;
  
  private getLastUsedProvider(): ModelProvider {
    return this.lastUsedProvider || Array.from(this.providers.keys())[0];
  }

  private setLastUsedProvider(provider: ModelProvider): void {
    this.lastUsedProvider = provider;
  }
}

/**
 * Circuit Breaker implementation for provider resilience
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private provider: ModelProvider,
    private failureThreshold = 5,
    private recoveryTimeout = 60000 // 1 minute
  ) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}