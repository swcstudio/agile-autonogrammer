/**
 * Cloudflare CDN Provider
 * Enterprise-grade CDN with 300+ edge locations globally
 */

import { BaseCDNProvider } from './base';
import type {
  CDNConfig,
  CDNMetrics,
  CDNResponse,
  PurgeRequest,
  PurgeResult,
  CacheRule,
  EdgeLocation,
  SSLConfig,
  SecurityConfig
} from '../types';

interface CloudflareAPIResponse<T = any> {
  success: boolean;
  result?: T;
  errors?: Array<{ code: number; message: string }>;
  messages?: string[];
}

export class CloudflareCDN extends BaseCDNProvider {
  private readonly baseURL = 'https://api.cloudflare.com/client/v4';
  private zoneId: string;

  constructor(config: CDNConfig) {
    super('Cloudflare', config);
    this.validateCloudflareConfig();
    this.zoneId = config.zoneId!;
  }

  async initialize(): Promise<void> {
    try {
      // Verify API credentials and zone access
      const zone = await this.makeRequest<CloudflareAPIResponse>(`/zones/${this.zoneId}`);
      
      if (!zone.success) {
        throw new Error('Failed to initialize Cloudflare CDN');
      }

      // Configure default settings
      await this.configureDefaultSettings();
      
      console.log(`Cloudflare CDN initialized for zone: ${this.zoneId}`);
    } catch (error) {
      this.handleError(error);
    }
  }

  async configureDomain(domain: string, cname?: string): Promise<CDNResponse> {
    try {
      // Configure custom domain with CNAME
      const cnameRecord = cname || `cdn.${domain}`;
      
      // Create CNAME record
      const response = await this.makeRequest<CloudflareAPIResponse>(
        `/zones/${this.zoneId}/dns_records`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'CNAME',
            name: cnameRecord,
            content: domain,
            ttl: 1, // Auto TTL
            proxied: true // Enable Cloudflare proxy
          })
        }
      );

      if (!response.success) {
        throw new Error('Failed to configure domain');
      }

      // Configure SSL for the domain
      await this.configureSSL({
        enabled: true,
        mode: 'full-strict',
        minVersion: 'TLS1.2',
        hsts: {
          enabled: true,
          maxAge: 31536000,
          includeSubdomains: true,
          preload: true
        }
      });

      return {
        success: true,
        data: {
          domain,
          cname: cnameRecord,
          ssl: true,
          proxied: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  async purgeCache(request: PurgeRequest): Promise<PurgeResult> {
    try {
      let body: any = {};
      
      switch (request.type) {
        case 'all':
          body.purge_everything = true;
          break;
        
        case 'url':
          body.files = request.targets;
          break;
        
        case 'tag':
          body.tags = request.targets;
          break;
        
        case 'prefix':
          body.prefixes = request.targets;
          break;
      }

      const response = await this.makeRequest<CloudflareAPIResponse>(
        `/zones/${this.zoneId}/purge_cache`,
        {
          method: 'POST',
          body: JSON.stringify(body)
        }
      );

      if (request.callback) {
        const result: PurgeResult = {
          success: response.success,
          purgedCount: request.type === 'all' ? -1 : request.targets?.length || 0,
          timestamp: new Date()
        };
        request.callback(result);
      }

      return {
        success: response.success,
        purgedCount: request.type === 'all' ? -1 : request.targets?.length || 0,
        errors: response.errors?.map(e => e.message),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
        timestamp: new Date()
      };
    }
  }

  async getMetrics(
    startTime: Date,
    endTime: Date,
    granularity: 'minute' | 'hour' | 'day' = 'hour'
  ): Promise<CDNMetrics> {
    try {
      // GraphQL query for analytics
      const query = `
        query {
          viewer {
            zones(filter: { zoneTag: "${this.zoneId}" }) {
              httpRequests1hGroups(
                filter: {
                  datetime_geq: "${startTime.toISOString()}"
                  datetime_leq: "${endTime.toISOString()}"
                }
                orderBy: [datetime_ASC]
              ) {
                dimensions {
                  datetime
                }
                sum {
                  requests
                  bytes
                  cachedBytes
                  cachedRequests
                  threats
                  pageViews
                }
                avg {
                  sampleInterval
                }
              }
            }
          }
        }
      `;

      const response = await this.makeRequest<any>(
        '/graphql',
        {
          method: 'POST',
          body: JSON.stringify({ query })
        }
      );

      const data = response.data?.viewer?.zones?.[0]?.httpRequests1hGroups || [];
      
      // Aggregate metrics
      const metrics: CDNMetrics = {
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

      data.forEach((group: any) => {
        metrics.requests.total += group.sum.requests || 0;
        metrics.requests.cached += group.sum.cachedRequests || 0;
        metrics.bandwidth.total += group.sum.bytes || 0;
        metrics.bandwidth.cached += group.sum.cachedBytes || 0;
        metrics.threats.blocked += group.sum.threats || 0;
      });

      metrics.requests.uncached = metrics.requests.total - metrics.requests.cached;
      metrics.bandwidth.uncached = metrics.bandwidth.total - metrics.bandwidth.cached;
      
      if (metrics.requests.total > 0) {
        metrics.performance.cacheHitRatio = 
          (metrics.requests.cached / metrics.requests.total) * 100;
      }

      return metrics;
    } catch (error) {
      this.handleError(error);
    }
  }

  async configureCaching(rules: CacheRule[]): Promise<CDNResponse> {
    try {
      const pageRules = rules.map((rule, index) => ({
        targets: [{
          target: 'url',
          constraint: {
            operator: 'matches',
            value: rule.pattern
          }
        }],
        actions: [
          {
            id: 'cache_level',
            value: rule.cacheLevel
          },
          {
            id: 'edge_cache_ttl',
            value: rule.edgeTTL || rule.ttl
          },
          {
            id: 'browser_cache_ttl',
            value: rule.browserTTL || rule.ttl
          }
        ],
        priority: index + 1,
        status: 'active'
      }));

      // Create page rules for caching
      const promises = pageRules.map(rule => 
        this.makeRequest<CloudflareAPIResponse>(
          `/zones/${this.zoneId}/pagerules`,
          {
            method: 'POST',
            body: JSON.stringify(rule)
          }
        )
      );

      const results = await Promise.all(promises);
      const success = results.every(r => r.success);

      return {
        success,
        data: { rulesCreated: results.filter(r => r.success).length }
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  async getEdgeLocations(): Promise<EdgeLocation[]> {
    // Cloudflare's edge locations (simplified list of major locations)
    const locations: EdgeLocation[] = [
      // Americas
      { id: 'lax', name: 'Los Angeles', region: 'US-West', country: 'US', city: 'Los Angeles', enabled: true },
      { id: 'sjc', name: 'San Jose', region: 'US-West', country: 'US', city: 'San Jose', enabled: true },
      { id: 'sea', name: 'Seattle', region: 'US-West', country: 'US', city: 'Seattle', enabled: true },
      { id: 'den', name: 'Denver', region: 'US-Central', country: 'US', city: 'Denver', enabled: true },
      { id: 'dfw', name: 'Dallas', region: 'US-Central', country: 'US', city: 'Dallas', enabled: true },
      { id: 'ord', name: 'Chicago', region: 'US-Central', country: 'US', city: 'Chicago', enabled: true },
      { id: 'atl', name: 'Atlanta', region: 'US-East', country: 'US', city: 'Atlanta', enabled: true },
      { id: 'mia', name: 'Miami', region: 'US-East', country: 'US', city: 'Miami', enabled: true },
      { id: 'jfk', name: 'New York', region: 'US-East', country: 'US', city: 'New York', enabled: true },
      { id: 'bos', name: 'Boston', region: 'US-East', country: 'US', city: 'Boston', enabled: true },
      { id: 'iad', name: 'Washington DC', region: 'US-East', country: 'US', city: 'Washington', enabled: true },
      
      // Europe
      { id: 'lhr', name: 'London', region: 'EU-West', country: 'GB', city: 'London', enabled: true },
      { id: 'ams', name: 'Amsterdam', region: 'EU-West', country: 'NL', city: 'Amsterdam', enabled: true },
      { id: 'fra', name: 'Frankfurt', region: 'EU-Central', country: 'DE', city: 'Frankfurt', enabled: true },
      { id: 'cdg', name: 'Paris', region: 'EU-West', country: 'FR', city: 'Paris', enabled: true },
      { id: 'waw', name: 'Warsaw', region: 'EU-Central', country: 'PL', city: 'Warsaw', enabled: true },
      { id: 'krk', name: 'Krakow', region: 'EU-Central', country: 'PL', city: 'Krakow', enabled: true },
      
      // Asia Pacific
      { id: 'syd', name: 'Sydney', region: 'APAC', country: 'AU', city: 'Sydney', enabled: true },
      { id: 'mel', name: 'Melbourne', region: 'APAC', country: 'AU', city: 'Melbourne', enabled: true },
      { id: 'per', name: 'Perth', region: 'APAC', country: 'AU', city: 'Perth', enabled: true },
      { id: 'bne', name: 'Brisbane', region: 'APAC', country: 'AU', city: 'Brisbane', enabled: true },
      { id: 'sin', name: 'Singapore', region: 'APAC', country: 'SG', city: 'Singapore', enabled: true },
      { id: 'hkg', name: 'Hong Kong', region: 'APAC', country: 'HK', city: 'Hong Kong', enabled: true },
      { id: 'nrt', name: 'Tokyo', region: 'APAC', country: 'JP', city: 'Tokyo', enabled: true }
    ];

    return locations;
  }

  async configureEdgeLocations(locationIds: string[]): Promise<CDNResponse> {
    // Cloudflare doesn't allow selective edge location configuration
    // All locations are always enabled
    return {
      success: true,
      data: {
        message: 'Cloudflare automatically uses all available edge locations',
        locations: locationIds
      }
    };
  }

  async configureSSL(config: SSLConfig | undefined): Promise<CDNResponse> {
    if (!config) {
      return { success: true };
    }

    try {
      const settings = [];

      // Configure SSL mode
      if (config.mode) {
        settings.push(
          this.makeRequest<CloudflareAPIResponse>(
            `/zones/${this.zoneId}/settings/ssl`,
            {
              method: 'PATCH',
              body: JSON.stringify({ value: config.mode.replace('-', '_') })
            }
          )
        );
      }

      // Configure minimum TLS version
      if (config.minVersion) {
        settings.push(
          this.makeRequest<CloudflareAPIResponse>(
            `/zones/${this.zoneId}/settings/min_tls_version`,
            {
              method: 'PATCH',
              body: JSON.stringify({ value: config.minVersion.replace('TLS', '') })
            }
          )
        );
      }

      // Configure HSTS
      if (config.hsts?.enabled) {
        settings.push(
          this.makeRequest<CloudflareAPIResponse>(
            `/zones/${this.zoneId}/settings/security_header`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                value: {
                  strict_transport_security: {
                    enabled: true,
                    max_age: config.hsts.maxAge,
                    include_subdomains: config.hsts.includeSubdomains,
                    preload: config.hsts.preload
                  }
                }
              })
            }
          )
        );
      }

      const results = await Promise.all(settings);
      const success = results.every(r => r.success);

      return {
        success,
        data: { configured: results.length }
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  async configureSecurity(config: SecurityConfig | undefined): Promise<CDNResponse> {
    if (!config) {
      return { success: true };
    }

    try {
      const settings = [];

      // Configure WAF
      if (config.waf?.enabled) {
        settings.push(
          this.makeRequest<CloudflareAPIResponse>(
            `/zones/${this.zoneId}/settings/waf`,
            {
              method: 'PATCH',
              body: JSON.stringify({ value: 'on' })
            }
          )
        );
      }

      // Configure DDoS protection
      if (config.ddos?.enabled) {
        settings.push(
          this.makeRequest<CloudflareAPIResponse>(
            `/zones/${this.zoneId}/settings/advanced_ddos`,
            {
              method: 'PATCH',
              body: JSON.stringify({ value: 'on' })
            }
          )
        );
      }

      // Configure security headers
      if (config.headers) {
        const headers: any = {};
        
        if (config.headers.xFrameOptions) {
          headers.x_frame_options = { value: config.headers.xFrameOptions };
        }
        
        if (config.headers.xContentTypeOptions) {
          headers.x_content_type_options = { value: 'nosniff' };
        }
        
        if (config.headers.csp) {
          headers.content_security_policy = { value: config.headers.csp };
        }

        settings.push(
          this.makeRequest<CloudflareAPIResponse>(
            `/zones/${this.zoneId}/settings/security_header`,
            {
              method: 'PATCH',
              body: JSON.stringify({ value: headers })
            }
          )
        );
      }

      const results = await Promise.all(settings);
      const success = results.every(r => r.success);

      return {
        success,
        data: { configured: results.length }
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest<CloudflareAPIResponse>(
        `/zones/${this.zoneId}`
      );
      return response.success;
    } catch {
      return false;
    }
  }

  protected async makeRequest<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Auth-Email': this.config.accountId || '',
        'X-Auth-Key': this.config.apiKey || '',
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.statusText}`);
    }

    return response.json();
  }

  private validateCloudflareConfig(): void {
    this.validateConfig();
    
    if (!this.config.apiKey) {
      throw new Error('Cloudflare API key is required');
    }
    
    if (!this.config.zoneId) {
      throw new Error('Cloudflare zone ID is required');
    }
  }

  private async configureDefaultSettings(): Promise<void> {
    // Configure recommended default settings
    const settings = [
      // Enable HTTP/3
      this.makeRequest(`/zones/${this.zoneId}/settings/http3`, {
        method: 'PATCH',
        body: JSON.stringify({ value: 'on' })
      }),
      
      // Enable Brotli compression
      this.makeRequest(`/zones/${this.zoneId}/settings/brotli`, {
        method: 'PATCH',
        body: JSON.stringify({ value: 'on' })
      }),
      
      // Enable Early Hints
      this.makeRequest(`/zones/${this.zoneId}/settings/early_hints`, {
        method: 'PATCH',
        body: JSON.stringify({ value: 'on' })
      }),
      
      // Enable Auto Minify
      this.makeRequest(`/zones/${this.zoneId}/settings/minify`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          value: {
            javascript: true,
            css: true,
            html: true
          }
        })
      })
    ];

    await Promise.allSettled(settings);
  }

  private formatError(error: any): any {
    return {
      code: 'CLOUDFLARE_ERROR',
      message: error.message || 'Cloudflare operation failed',
      details: error
    };
  }
}