/**
 * CDN Integration Types
 * Enterprise-grade CDN configuration and management
 */

export interface CDNProvider {
  name: string;
  type: 'cloudflare' | 'cloudfront' | 'fastly' | 'custom';
  enabled: boolean;
  priority: number;
  config: CDNConfig;
}

export interface CDNConfig {
  // Basic Configuration
  apiKey?: string;
  apiSecret?: string;
  accountId?: string;
  zoneId?: string;
  distributionId?: string;
  
  // Custom Domain Configuration
  customDomain?: string;
  cname?: string;
  ssl?: SSLConfig;
  
  // Performance Configuration
  caching?: CachingConfig;
  compression?: CompressionConfig;
  optimization?: OptimizationConfig;
  
  // Geographic Configuration
  edgeLocations?: EdgeLocation[];
  geoRouting?: GeoRoutingConfig;
  
  // Security Configuration
  security?: SecurityConfig;
  rateLimiting?: RateLimitConfig;
  
  // Monitoring
  analytics?: AnalyticsConfig;
  logging?: LoggingConfig;
}

export interface SSLConfig {
  enabled: boolean;
  mode: 'flexible' | 'full' | 'full-strict';
  certificate?: string;
  privateKey?: string;
  minVersion?: 'TLS1.0' | 'TLS1.1' | 'TLS1.2' | 'TLS1.3';
  hsts?: {
    enabled: boolean;
    maxAge: number;
    includeSubdomains: boolean;
    preload: boolean;
  };
  certificatePinning?: {
    enabled: boolean;
    pins: string[];
    maxAge: number;
  };
}

export interface CachingConfig {
  defaultTTL: number;
  maxTTL: number;
  browserTTL: number;
  bypassCache?: boolean;
  respectOriginHeaders?: boolean;
  queryStringSort?: boolean;
  rules?: CacheRule[];
  purgeStrategy?: 'all' | 'selective' | 'tag-based';
}

export interface CacheRule {
  pattern: string;
  ttl: number;
  cacheLevel: 'bypass' | 'basic' | 'simplified' | 'aggressive' | 'cache-everything';
  edgeTTL?: number;
  browserTTL?: number;
  bypassConditions?: CacheBypassCondition[];
}

export interface CacheBypassCondition {
  type: 'cookie' | 'header' | 'query' | 'path';
  name?: string;
  value?: string;
  operator: 'equals' | 'contains' | 'starts-with' | 'ends-with' | 'regex';
}

export interface CompressionConfig {
  enabled: boolean;
  algorithms: ('gzip' | 'brotli' | 'deflate')[];
  level?: number;
  minSize?: number;
  mimeTypes?: string[];
}

export interface OptimizationConfig {
  minify?: {
    javascript: boolean;
    css: boolean;
    html: boolean;
  };
  images?: {
    optimize: boolean;
    format: 'auto' | 'webp' | 'avif';
    quality?: number;
    resizing?: boolean;
  };
  http2?: boolean;
  http3?: boolean;
  earlyHints?: boolean;
  serverPush?: boolean;
}

export interface EdgeLocation {
  id: string;
  name: string;
  region: string;
  country: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  enabled: boolean;
}

export interface GeoRoutingConfig {
  enabled: boolean;
  defaultRegion: string;
  rules?: GeoRoutingRule[];
  blockCountries?: string[];
  allowCountries?: string[];
}

export interface GeoRoutingRule {
  countries?: string[];
  regions?: string[];
  origin: string;
  weight?: number;
}

export interface SecurityConfig {
  waf?: {
    enabled: boolean;
    rulesets: string[];
    customRules?: WAFRule[];
  };
  ddos?: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    threshold?: number;
  };
  botManagement?: {
    enabled: boolean;
    challengeThreshold: number;
    blockThreshold: number;
  };
  headers?: SecurityHeaders;
}

export interface WAFRule {
  id: string;
  expression: string;
  action: 'block' | 'challenge' | 'log' | 'bypass';
  priority: number;
}

export interface SecurityHeaders {
  csp?: string;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  xContentTypeOptions?: boolean;
  xXssProtection?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

export interface RateLimitConfig {
  enabled: boolean;
  rules?: RateLimitRule[];
}

export interface RateLimitRule {
  path: string;
  threshold: number;
  period: number;
  action: 'challenge' | 'block' | 'log';
}

export interface AnalyticsConfig {
  enabled: boolean;
  realtimeMetrics?: boolean;
  dataRetention?: number;
  customMetrics?: string[];
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  destination?: 'console' | 's3' | 'elasticsearch' | 'custom';
  format?: 'json' | 'text' | 'combined';
}

// CDN Manager Types
export interface CDNManagerConfig {
  providers: CDNProvider[];
  fallbackStrategy: 'failover' | 'round-robin' | 'geo-based';
  healthCheck?: HealthCheckConfig;
  customDomain?: CustomDomainConfig;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  path: string;
}

export interface CustomDomainConfig {
  domain: string;
  subdomain?: string;
  certificateId?: string;
  verificationMethod: 'dns' | 'http' | 'email';
  autoRenew?: boolean;
}

// Cache Purge Types
export interface PurgeRequest {
  type: 'all' | 'url' | 'tag' | 'prefix';
  targets?: string[];
  async?: boolean;
  callback?: (result: PurgeResult) => void;
}

export interface PurgeResult {
  success: boolean;
  purgedCount?: number;
  errors?: string[];
  timestamp: Date;
}

// Metrics Types
export interface CDNMetrics {
  requests: {
    total: number;
    cached: number;
    uncached: number;
    errors: number;
  };
  bandwidth: {
    total: number;
    cached: number;
    uncached: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    cacheHitRatio: number;
  };
  geography: {
    [country: string]: {
      requests: number;
      bandwidth: number;
    };
  };
  threats: {
    blocked: number;
    challenged: number;
    allowed: number;
  };
}

// Response Types
export interface CDNResponse<T = any> {
  success: boolean;
  data?: T;
  error?: CDNError;
  metadata?: {
    provider: string;
    region?: string;
    cacheStatus?: 'HIT' | 'MISS' | 'BYPASS' | 'EXPIRED';
    responseTime?: number;
  };
}

export interface CDNError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
}