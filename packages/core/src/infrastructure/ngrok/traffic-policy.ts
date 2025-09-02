/**
 * Traffic Policy Builder for Ngrok + Katalyst
 *
 * Provides a fluent API for building complex traffic policies
 * Supports A/B testing, feature flags, authentication, and more
 */

export class TrafficPolicy {
  private policy: {
    inbound?: any[];
    outbound?: any[];
  } = {};

  constructor(config?: any) {
    if (config) {
      this.policy = { ...config };
    }
  }

  // Rule management
  addRule(rule: TrafficPolicyRule): TrafficPolicy {
    if (!this.policy.inbound) {
      this.policy.inbound = [];
    }
    this.policy.inbound.push(rule);
    return this;
  }

  addOutboundRule(rule: TrafficPolicyRule): TrafficPolicy {
    if (!this.policy.outbound) {
      this.policy.outbound = [];
    }
    this.policy.outbound.push(rule);
    return this;
  }

  // Authentication
  addBasicAuth(username: string, password: string): TrafficPolicy {
    return this.addRule({
      name: 'basic-auth',
      match: [],
      actions: [
        {
          type: 'basic-auth',
          config: {
            username,
            password,
          },
        },
      ],
    });
  }

  addOAuth(provider: string, config: any): TrafficPolicy {
    return this.addRule({
      name: 'oauth',
      match: [],
      actions: [
        {
          type: 'oauth',
          config: {
            provider,
            ...config,
          },
        },
      ],
    });
  }

  // IP restrictions
  addIPRestriction(allowedIPs: string[], deniedIPs: string[] = []): TrafficPolicy {
    return this.addRule({
      name: 'ip-restriction',
      match: [],
      actions: [
        {
          type: 'restrict-ips',
          config: {
            allow: allowedIPs,
            deny: deniedIPs,
          },
        },
      ],
    });
  }

  // Rate limiting
  addRateLimit(
    capacity: number,
    rate: string,
    algorithm: 'sliding_window' | 'token_bucket' = 'sliding_window'
  ): TrafficPolicy {
    return this.addRule({
      name: 'rate-limit',
      match: [],
      actions: [
        {
          type: 'rate-limit',
          config: {
            name: 'api-limit',
            algorithm,
            capacity,
            rate,
          },
        },
      ],
    });
  }

  // Header manipulation
  addHeaders(headers: Record<string, string>): TrafficPolicy {
    return this.addRule({
      name: 'add-headers',
      match: [],
      actions: [
        {
          type: 'add-headers',
          config: headers,
        },
      ],
    });
  }

  removeHeaders(headerNames: string[]): TrafficPolicy {
    return this.addRule({
      name: 'remove-headers',
      match: [],
      actions: [
        {
          type: 'remove-headers',
          config: {
            headers: headerNames,
          },
        },
      ],
    });
  }

  // CORS support
  addCORS(config: CORSConfig = {}): TrafficPolicy {
    const corsHeaders = {
      'Access-Control-Allow-Origin': config.allowOrigin || '*',
      'Access-Control-Allow-Methods': config.allowMethods || 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers':
        config.allowHeaders || 'Content-Type,Authorization,X-Requested-With',
      'Access-Control-Allow-Credentials': config.allowCredentials ? 'true' : 'false',
      'Access-Control-Max-Age': config.maxAge || '86400',
    };

    return this.addHeaders(corsHeaders);
  }

  // Load balancing
  addLoadBalancer(backends: BackendConfig[]): TrafficPolicy {
    return this.addRule({
      name: 'load-balancer',
      match: [],
      actions: [
        {
          type: 'weighted-backends',
          config: backends.map((backend) => ({
            url: backend.url,
            weight: backend.weight || 1,
            metadata: backend.metadata || {},
          })),
        },
      ],
    });
  }

  // A/B testing
  addABTest(variants: ABTestVariant[], match: any[] = []): TrafficPolicy {
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);

    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error('A/B test variant weights must sum to 1.0');
    }

    return this.addRule({
      name: 'ab-test',
      match,
      actions: [
        {
          type: 'weighted-backends',
          config: variants.map((variant) => ({
            url: variant.url,
            weight: variant.weight,
            metadata: {
              variant: variant.name,
              ...variant.metadata,
            },
          })),
        },
      ],
    });
  }

  // Feature flags
  addFeatureFlag(
    flag: string,
    enabledUrl: string,
    disabledUrl: string,
    condition: any
  ): TrafficPolicy {
    return this.addRule({
      name: `feature-flag-${flag}`,
      match: [condition],
      actions: [
        {
          type: 'forward',
          config: { url: enabledUrl },
        },
      ],
    }).addRule({
      name: `feature-flag-${flag}-default`,
      match: [],
      actions: [
        {
          type: 'forward',
          config: { url: disabledUrl },
        },
      ],
    });
  }

  // Circuit breaker
  addCircuitBreaker(config: CircuitBreakerConfig): TrafficPolicy {
    return this.addRule({
      name: 'circuit-breaker',
      match: [],
      actions: [
        {
          type: 'circuit-breaker',
          config: {
            volume_threshold: config.volumeThreshold || 10,
            error_threshold_percentage: config.errorThresholdPercentage || 50,
            rolling_window: config.rollingWindow || '10s',
            recovery_time: config.recoveryTime || '30s',
            fallback_url: config.fallbackUrl,
          },
        },
      ],
    });
  }

  // Request/Response transformation
  addRequestTransform(config: TransformConfig): TrafficPolicy {
    return this.addRule({
      name: 'request-transform',
      match: config.match || [],
      actions: [
        {
          type: 'request-transform',
          config: {
            headers: config.headers,
            body: config.body,
            query: config.query,
          },
        },
      ],
    });
  }

  addResponseTransform(config: TransformConfig): TrafficPolicy {
    return this.addRule({
      name: 'response-transform',
      match: config.match || [],
      actions: [
        {
          type: 'response-transform',
          config: {
            headers: config.headers,
            body: config.body,
            status: config.status,
          },
        },
      ],
    });
  }

  // Katalyst-specific features
  addKatalystAnalytics(config: KatalystAnalyticsConfig): TrafficPolicy {
    return this.addHeaders({
      'X-Katalyst-Component': config.component || 'unknown',
      'X-Katalyst-Version': config.version || '1.0.0',
      'X-Katalyst-Environment': config.environment || 'development',
      'X-Katalyst-Session': config.sessionId || 'anonymous',
    });
  }

  addStyleXThemeRouting(themes: ThemeRoutingConfig[]): TrafficPolicy {
    for (const theme of themes) {
      this.addRule({
        name: `stylex-theme-${theme.name}`,
        match: [
          {
            type: 'header',
            name: 'X-StyleX-Theme',
            value: theme.name,
          },
        ],
        actions: [
          {
            type: 'add-headers',
            config: {
              'X-StyleX-Theme-URL': theme.cssUrl,
              'X-StyleX-Theme-Config': JSON.stringify(theme.config),
            },
          },
        ],
      });
    }
    return this;
  }

  addRepackModuleFederation(modules: ModuleFederationConfig[]): TrafficPolicy {
    for (const module of modules) {
      this.addRule({
        name: `repack-module-${module.name}`,
        match: [
          {
            type: 'path',
            pattern: `/federation/${module.name}/*`,
          },
        ],
        actions: [
          {
            type: 'forward',
            config: {
              url: module.remoteUrl,
            },
          },
          {
            type: 'add-headers',
            config: {
              'X-Module-Name': module.name,
              'X-Module-Version': module.version,
              'X-Federation-Host': module.host,
            },
          },
        ],
      });
    }
    return this;
  }

  // Compile to ngrok format
  compile(): any {
    return this.policy;
  }

  // Export as JSON
  toJSON(): string {
    return JSON.stringify(this.policy, null, 2);
  }

  // Load from JSON
  static fromJSON(json: string): TrafficPolicy {
    const policy = new TrafficPolicy();
    policy.policy = JSON.parse(json);
    return policy;
  }
}

// Type definitions
export interface TrafficPolicyRule {
  name: string;
  match: any[];
  actions: any[];
}

export interface CORSConfig {
  allowOrigin?: string;
  allowMethods?: string;
  allowHeaders?: string;
  allowCredentials?: boolean;
  maxAge?: string;
}

export interface BackendConfig {
  url: string;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface ABTestVariant {
  name: string;
  url: string;
  weight: number;
  metadata?: Record<string, any>;
}

export interface CircuitBreakerConfig {
  volumeThreshold?: number;
  errorThresholdPercentage?: number;
  rollingWindow?: string;
  recoveryTime?: string;
  fallbackUrl?: string;
}

export interface TransformConfig {
  match?: any[];
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  status?: number;
}

export interface KatalystAnalyticsConfig {
  component?: string;
  version?: string;
  environment?: string;
  sessionId?: string;
}

export interface ThemeRoutingConfig {
  name: string;
  cssUrl: string;
  config: Record<string, any>;
}

export interface ModuleFederationConfig {
  name: string;
  remoteUrl: string;
  version: string;
  host: string;
}
