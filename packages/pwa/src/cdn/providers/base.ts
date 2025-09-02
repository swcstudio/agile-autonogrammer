/**
 * Base CDN Provider
 * Abstract class for CDN provider implementations
 */

import type {
  CDNConfig,
  CDNMetrics,
  CDNResponse,
  PurgeRequest,
  PurgeResult,
  CacheRule,
  EdgeLocation
} from '../types';

export abstract class BaseCDNProvider {
  protected config: CDNConfig;
  protected name: string;
  protected isHealthy: boolean = true;
  protected lastHealthCheck: Date | null = null;

  constructor(name: string, config: CDNConfig) {
    this.name = name;
    this.config = config;
  }

  /**
   * Initialize the CDN provider
   */
  abstract initialize(): Promise<void>;

  /**
   * Configure custom domain with CNAME
   */
  abstract configureDomain(domain: string, cname?: string): Promise<CDNResponse>;

  /**
   * Purge cache
   */
  abstract purgeCache(request: PurgeRequest): Promise<PurgeResult>;

  /**
   * Get CDN metrics
   */
  abstract getMetrics(
    startTime: Date,
    endTime: Date,
    granularity?: 'minute' | 'hour' | 'day'
  ): Promise<CDNMetrics>;

  /**
   * Configure caching rules
   */
  abstract configureCaching(rules: CacheRule[]): Promise<CDNResponse>;

  /**
   * Get available edge locations
   */
  abstract getEdgeLocations(): Promise<EdgeLocation[]>;

  /**
   * Enable/disable edge locations
   */
  abstract configureEdgeLocations(locations: string[]): Promise<CDNResponse>;

  /**
   * Configure SSL/TLS settings
   */
  abstract configureSSL(config: CDNConfig['ssl']): Promise<CDNResponse>;

  /**
   * Configure security settings
   */
  abstract configureSecurity(config: CDNConfig['security']): Promise<CDNResponse>;

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.performHealthCheck();
      this.isHealthy = response;
      this.lastHealthCheck = new Date();
      return response;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      return false;
    }
  }

  /**
   * Perform provider-specific health check
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get health status
   */
  getHealthStatus(): { healthy: boolean; lastCheck: Date | null } {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastHealthCheck
    };
  }

  /**
   * Validate configuration
   */
  protected validateConfig(): void {
    if (!this.config) {
      throw new Error('CDN configuration is required');
    }
  }

  /**
   * Make authenticated API request
   */
  protected abstract makeRequest<T = any>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T>;

  /**
   * Handle API errors
   */
  protected handleError(error: any): never {
    console.error(`[${this.name}] CDN Error:`, error);
    throw {
      code: error.code || 'CDN_ERROR',
      message: error.message || 'An error occurred with the CDN provider',
      details: error,
      retryable: error.retryable ?? true
    };
  }

  /**
   * Format cache TTL for provider
   */
  protected formatTTL(seconds: number): string | number {
    return seconds;
  }

  /**
   * Parse cache status from response headers
   */
  protected parseCacheStatus(headers: Headers): 'HIT' | 'MISS' | 'BYPASS' | 'EXPIRED' {
    const cacheStatus = headers.get('cf-cache-status') || 
                       headers.get('x-cache') || 
                       headers.get('x-cache-status');
    
    if (!cacheStatus) return 'MISS';
    
    const status = cacheStatus.toUpperCase();
    if (status.includes('HIT')) return 'HIT';
    if (status.includes('MISS')) return 'MISS';
    if (status.includes('BYPASS')) return 'BYPASS';
    if (status.includes('EXPIRED') || status.includes('STALE')) return 'EXPIRED';
    
    return 'MISS';
  }
}