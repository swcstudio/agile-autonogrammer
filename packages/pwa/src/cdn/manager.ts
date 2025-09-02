/**
 * CDN Manager
 * Orchestrates multiple CDN providers with failover and load balancing
 */

import { EventEmitter } from 'events';
import { BaseCDNProvider } from './providers/base';
import { CloudflareCDN } from './providers/cloudflare';
import type {
  CDNProvider,
  CDNManagerConfig,
  CDNResponse,
  CDNMetrics,
  PurgeRequest,
  PurgeResult,
  CustomDomainConfig,
  EdgeLocation
} from './types';

export class CDNManager extends EventEmitter {
  private providers: Map<string, BaseCDNProvider> = new Map();
  private primaryProvider: BaseCDNProvider | null = null;
  private config: CDNManagerConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private customDomain: CustomDomainConfig | null = null;
  private metricsCache: Map<string, CDNMetrics> = new Map();

  constructor(config: CDNManagerConfig) {
    super();
    this.config = config;
    this.initializeProviders();
  }

  /**
   * Initialize all configured CDN providers
   */
  private async initializeProviders(): Promise<void> {
    const initPromises = this.config.providers
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority)
      .map(async (providerConfig) => {
        try {
          const provider = this.createProvider(providerConfig);
          await provider.initialize();
          this.providers.set(providerConfig.name, provider);
          
          if (!this.primaryProvider || providerConfig.priority === 1) {
            this.primaryProvider = provider;
          }
          
          this.emit('provider:initialized', {
            name: providerConfig.name,
            type: providerConfig.type
          });
        } catch (error) {
          console.error(`Failed to initialize ${providerConfig.name}:`, error);
          this.emit('provider:error', {
            name: providerConfig.name,
            error
          });
        }
      });

    await Promise.allSettled(initPromises);
    
    if (this.providers.size === 0) {
      throw new Error('No CDN providers could be initialized');
    }

    // Start health monitoring
    if (this.config.healthCheck?.enabled) {
      this.startHealthMonitoring();
    }

    // Configure custom domain if provided
    if (this.config.customDomain) {
      await this.configureCustomDomain(this.config.customDomain);
    }
  }

  /**
   * Create provider instance based on type
   */
  private createProvider(config: CDNProvider): BaseCDNProvider {
    switch (config.type) {
      case 'cloudflare':
        return new CloudflareCDN(config.config);
      
      // Add more providers as needed
      // case 'cloudfront':
      //   return new CloudFrontCDN(config.config);
      // case 'fastly':
      //   return new FastlyCDN(config.config);
      
      default:
        throw new Error(`Unsupported CDN provider type: ${config.type}`);
    }
  }

  /**
   * Configure custom domain with CNAME
   */
  async configureCustomDomain(config: CustomDomainConfig): Promise<CDNResponse> {
    this.customDomain = config;
    
    const domain = config.subdomain 
      ? `${config.subdomain}.${config.domain}`
      : config.domain;

    try {
      // Configure domain on primary provider
      if (!this.primaryProvider) {
        throw new Error('No primary CDN provider available');
      }

      const response = await this.primaryProvider.configureDomain(
        domain,
        `cdn.${domain}`
      );

      if (response.success) {
        this.emit('domain:configured', {
          domain,
          provider: this.primaryProvider.getName()
        });

        // Verify domain configuration
        await this.verifyDomainConfiguration(domain);
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DOMAIN_CONFIG_ERROR',
          message: 'Failed to configure custom domain',
          details: error
        }
      };
    }
  }

  /**
   * Verify domain configuration
   */
  private async verifyDomainConfiguration(domain: string): Promise<boolean> {
    try {
      // DNS verification
      const response = await fetch(`https://${domain}/cdn-verify.txt`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Purge cache across all providers
   */
  async purgeCache(request: PurgeRequest): Promise<PurgeResult> {
    const results: PurgeResult[] = [];
    
    // Purge cache on all active providers
    const purgePromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const result = await provider.purgeCache(request);
        results.push(result);
        
        this.emit('cache:purged', {
          provider: provider.getName(),
          result
        });
        
        return result;
      } catch (error) {
        console.error(`Cache purge failed on ${provider.getName()}:`, error);
        return {
          success: false,
          errors: [error.message],
          timestamp: new Date()
        };
      }
    });

    await Promise.allSettled(purgePromises);

    // Aggregate results
    const success = results.some(r => r.success);
    const errors = results.flatMap(r => r.errors || []);
    const purgedCount = Math.max(...results.map(r => r.purgedCount || 0));

    return {
      success,
      purgedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date()
    };
  }

  /**
   * Get aggregated metrics from all providers
   */
  async getMetrics(
    startTime: Date,
    endTime: Date,
    granularity?: 'minute' | 'hour' | 'day'
  ): Promise<CDNMetrics> {
    const cacheKey = `${startTime.getTime()}-${endTime.getTime()}-${granularity}`;
    
    // Check cache
    if (this.metricsCache.has(cacheKey)) {
      const cached = this.metricsCache.get(cacheKey)!;
      return cached;
    }

    const metrics: CDNMetrics[] = [];
    
    // Collect metrics from all providers
    const metricsPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const providerMetrics = await provider.getMetrics(startTime, endTime, granularity);
        metrics.push(providerMetrics);
        return providerMetrics;
      } catch (error) {
        console.error(`Failed to get metrics from ${provider.getName()}:`, error);
        return null;
      }
    });

    await Promise.allSettled(metricsPromises);

    // Aggregate metrics
    const aggregated = this.aggregateMetrics(metrics);
    
    // Cache for 5 minutes
    this.metricsCache.set(cacheKey, aggregated);
    setTimeout(() => this.metricsCache.delete(cacheKey), 5 * 60 * 1000);

    return aggregated;
  }

  /**
   * Aggregate metrics from multiple providers
   */
  private aggregateMetrics(metrics: CDNMetrics[]): CDNMetrics {
    const aggregated: CDNMetrics = {
      requests: {
        total: 0,
        cached: 0,
        uncached: 0,
        errors: 0
      },
      bandwidth: {
        total: 0,
        cached: 0,
        uncached: 0
      },
      performance: {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        cacheHitRatio: 0
      },
      geography: {},
      threats: {
        blocked: 0,
        challenged: 0,
        allowed: 0
      }
    };

    metrics.forEach(m => {
      // Sum request counts
      aggregated.requests.total += m.requests.total;
      aggregated.requests.cached += m.requests.cached;
      aggregated.requests.uncached += m.requests.uncached;
      aggregated.requests.errors += m.requests.errors;

      // Sum bandwidth
      aggregated.bandwidth.total += m.bandwidth.total;
      aggregated.bandwidth.cached += m.bandwidth.cached;
      aggregated.bandwidth.uncached += m.bandwidth.uncached;

      // Average performance metrics
      aggregated.performance.averageResponseTime += m.performance.averageResponseTime;
      aggregated.performance.p95ResponseTime = Math.max(
        aggregated.performance.p95ResponseTime,
        m.performance.p95ResponseTime
      );
      aggregated.performance.p99ResponseTime = Math.max(
        aggregated.performance.p99ResponseTime,
        m.performance.p99ResponseTime
      );

      // Merge geography data
      Object.entries(m.geography).forEach(([country, data]) => {
        if (!aggregated.geography[country]) {
          aggregated.geography[country] = { requests: 0, bandwidth: 0 };
        }
        aggregated.geography[country].requests += data.requests;
        aggregated.geography[country].bandwidth += data.bandwidth;
      });

      // Sum threats
      aggregated.threats.blocked += m.threats.blocked;
      aggregated.threats.challenged += m.threats.challenged;
      aggregated.threats.allowed += m.threats.allowed;
    });

    // Calculate averages
    if (metrics.length > 0) {
      aggregated.performance.averageResponseTime /= metrics.length;
      
      if (aggregated.requests.total > 0) {
        aggregated.performance.cacheHitRatio = 
          (aggregated.requests.cached / aggregated.requests.total) * 100;
      }
    }

    return aggregated;
  }

  /**
   * Get all available edge locations
   */
  async getEdgeLocations(): Promise<EdgeLocation[]> {
    const allLocations: EdgeLocation[] = [];
    const seen = new Set<string>();

    for (const provider of this.providers.values()) {
      try {
        const locations = await provider.getEdgeLocations();
        
        locations.forEach(loc => {
          if (!seen.has(loc.id)) {
            seen.add(loc.id);
            allLocations.push(loc);
          }
        });
      } catch (error) {
        console.error(`Failed to get edge locations from ${provider.getName()}:`, error);
      }
    }

    return allLocations;
  }

  /**
   * Start health monitoring for all providers
   */
  private startHealthMonitoring(): void {
    if (!this.config.healthCheck) return;

    const interval = this.config.healthCheck.interval * 1000;

    this.healthCheckInterval = setInterval(async () => {
      for (const [name, provider] of this.providers) {
        try {
          const healthy = await provider.healthCheck();
          
          this.emit('health:check', {
            provider: name,
            healthy,
            timestamp: new Date()
          });

          // Handle provider failover
          if (!healthy && provider === this.primaryProvider) {
            await this.handleFailover();
          }
        } catch (error) {
          console.error(`Health check failed for ${name}:`, error);
        }
      }
    }, interval);
  }

  /**
   * Handle primary provider failover
   */
  private async handleFailover(): Promise<void> {
    const healthyProviders = Array.from(this.providers.values())
      .filter(p => p.getHealthStatus().healthy);

    if (healthyProviders.length === 0) {
      this.emit('failover:failed', {
        message: 'No healthy CDN providers available'
      });
      return;
    }

    // Select new primary based on priority
    const sortedProviders = this.config.providers
      .filter(p => {
        const provider = this.providers.get(p.name);
        return provider && healthyProviders.includes(provider);
      })
      .sort((a, b) => a.priority - b.priority);

    if (sortedProviders.length > 0) {
      const newPrimary = this.providers.get(sortedProviders[0].name)!;
      const oldPrimary = this.primaryProvider?.getName();
      
      this.primaryProvider = newPrimary;
      
      this.emit('failover:success', {
        from: oldPrimary,
        to: newPrimary.getName(),
        timestamp: new Date()
      });
    }
  }

  /**
   * Get current primary provider
   */
  getPrimaryProvider(): BaseCDNProvider | null {
    return this.primaryProvider;
  }

  /**
   * Get all providers
   */
  getProviders(): BaseCDNProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): BaseCDNProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    this.stopHealthMonitoring();
    this.removeAllListeners();
    this.providers.clear();
    this.metricsCache.clear();
    this.primaryProvider = null;
  }
}