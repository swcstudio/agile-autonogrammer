/**
 * Production API Gateway Configuration for autonogrammer.ai
 * Enterprise-grade configuration with security, monitoring, and scalability
 */

export interface APIConfig {
  domain: DomainConfig;
  authentication: AuthConfig;
  rateLimit: RateLimitConfig;
  models: ModelConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export interface DomainConfig {
  production: {
    domain: string;
    apiSubdomain: string;
    docsSubdomain: string;
    sslConfig: SSLConfig;
  };
  staging: {
    domain: string;
    apiSubdomain: string;
    docsSubdomain: string;
    sslConfig: SSLConfig;
  };
  development: {
    domain: string;
    port: number;
  };
}

export interface SSLConfig {
  provider: 'letsencrypt' | 'cloudflare' | 'custom';
  autoRenewal: boolean;
  certificatePath?: string;
  privateKeyPath?: string;
  chainPath?: string;
}

export interface AuthConfig {
  jwt: {
    issuer: string;
    audience: string;
    algorithm: 'RS256' | 'HS256';
    publicKeyPath: string;
    privateKeyPath: string;
    accessTokenTtl: string;
    refreshTokenTtl: string;
  };
  apiKeys: {
    encryption: {
      algorithm: 'aes-256-gcm';
      keyDerivation: 'pbkdf2';
      iterations: 100000;
    };
    tiers: APITier[];
    rotationPolicy: {
      maxAge: string;
      warningPeriod: string;
      autoRotate: boolean;
    };
  };
  oauth2: {
    providers: OAuth2Provider[];
    scopes: string[];
  };
}

export interface APITier {
  name: 'free' | 'professional' | 'enterprise' | 'internal';
  limits: {
    requestsPerHour: number;
    requestsPerDay: number;
    concurrentRequests: number;
    maxTokensPerRequest: number;
    maxContextWindow: number;
  };
  features: {
    models: string[];
    endpoints: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    analytics: boolean;
    customization: boolean;
    support: 'community' | 'email' | 'priority' | 'dedicated';
  };
  pricing: {
    monthly: number;
    perToken: number;
    overageRate: number;
  };
}

export interface OAuth2Provider {
  name: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

export interface RateLimitConfig {
  strategy: 'token-bucket' | 'sliding-window' | 'fixed-window';
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    keyPrefix: string;
  };
  global: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  perIP: {
    requestsPerMinute: number;
    blacklistThreshold: number;
    blacklistDuration: string;
  };
  perUser: {
    requestsPerHour: number;
    concurrentRequests: number;
  };
}

export interface ModelConfig {
  qwen3_42b: {
    name: 'Qwen3-42B AI Coder';
    endpoint: string;
    healthCheck: string;
    capabilities: string[];
    contextWindow: number;
    maxTokens: number;
    pricing: {
      inputTokens: number;
      outputTokens: number;
    };
    authentication: {
      type: 'api-key' | 'bearer' | 'custom';
      headerName: string;
      keyRotation: boolean;
    };
    scaling: {
      minInstances: number;
      maxInstances: number;
      targetUtilization: number;
    };
  };
  qwen3_moe: {
    name: 'Qwen3-MOE Red Team';
    endpoint: string;
    healthCheck: string;
    capabilities: string[];
    contextWindow: number;
    maxTokens: number;
    pricing: {
      inputTokens: number;
      outputTokens: number;
    };
    authentication: {
      type: 'api-key' | 'bearer' | 'custom';
      headerName: string;
      keyRotation: boolean;
    };
    scaling: {
      minInstances: number;
      maxInstances: number;
      targetUtilization: number;
    };
  };
}

export interface SecurityConfig {
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
  inputValidation: {
    maxRequestSize: string;
    maxFieldSize: string;
    maxFiles: number;
    allowedContentTypes: string[];
    sanitization: {
      html: boolean;
      sql: boolean;
      xss: boolean;
      maliciousPatterns: string[];
    };
  };
  outputFiltering: {
    piiDetection: boolean;
    sensitiveDataMasking: boolean;
    codeExecutionPrevention: boolean;
    malwareDetection: boolean;
  };
  monitoring: {
    suspiciousActivityThreshold: number;
    alerting: {
      email: string[];
      webhook: string;
      slack: string;
    };
  };
}

export interface MonitoringConfig {
  metrics: {
    provider: 'prometheus' | 'datadog' | 'newrelic';
    endpoint: string;
    labels: Record<string, string>;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'file' | 'console' | 'elasticsearch' | 'cloudwatch';
    retention: string;
    fields: {
      requestId: boolean;
      userId: boolean;
      apiKey: boolean;
      endpoint: boolean;
      method: boolean;
      statusCode: boolean;
      responseTime: boolean;
      inputTokens: boolean;
      outputTokens: boolean;
      cost: boolean;
      error: boolean;
    };
  };
  health: {
    endpoints: string[];
    interval: string;
    timeout: string;
    retries: number;
  };
  alerts: {
    errorRate: {
      threshold: number;
      window: string;
      severity: 'warning' | 'critical';
    };
    latency: {
      p95Threshold: number;
      window: string;
      severity: 'warning' | 'critical';
    };
    availability: {
      threshold: number;
      window: string;
      severity: 'critical';
    };
  };
}

export const config: APIConfig = {
  domain: {
    production: {
      domain: 'autonogrammer.ai',
      apiSubdomain: 'api.autonogrammer.ai',
      docsSubdomain: 'docs.autonogrammer.ai',
      sslConfig: {
        provider: 'letsencrypt',
        autoRenewal: true,
      },
    },
    staging: {
      domain: 'staging.autonogrammer.ai',
      apiSubdomain: 'api.staging.autonogrammer.ai',
      docsSubdomain: 'docs.staging.autonogrammer.ai',
      sslConfig: {
        provider: 'letsencrypt',
        autoRenewal: true,
      },
    },
    development: {
      domain: 'localhost',
      port: 3000,
    },
  },

  authentication: {
    jwt: {
      issuer: 'autonogrammer.ai',
      audience: 'api.autonogrammer.ai',
      algorithm: 'RS256',
      publicKeyPath: '/etc/ssl/certs/autonogrammer-jwt-public.pem',
      privateKeyPath: '/etc/ssl/private/autonogrammer-jwt-private.pem',
      accessTokenTtl: '1h',
      refreshTokenTtl: '30d',
    },
    apiKeys: {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        iterations: 100000,
      },
      tiers: [
        {
          name: 'free',
          limits: {
            requestsPerHour: 1000,
            requestsPerDay: 10000,
            concurrentRequests: 5,
            maxTokensPerRequest: 4096,
            maxContextWindow: 16384,
          },
          features: {
            models: ['qwen3_42b'],
            endpoints: ['/v1/completions', '/v1/chat/completions'],
            priority: 'low',
            analytics: false,
            customization: false,
            support: 'community',
          },
          pricing: {
            monthly: 0,
            perToken: 0,
            overageRate: 0.01,
          },
        },
        {
          name: 'professional',
          limits: {
            requestsPerHour: 10000,
            requestsPerDay: 100000,
            concurrentRequests: 20,
            maxTokensPerRequest: 8192,
            maxContextWindow: 65536,
          },
          features: {
            models: ['qwen3_42b', 'qwen3_moe'],
            endpoints: [
              '/v1/completions',
              '/v1/chat/completions',
              '/v1/code/analysis',
              '/v1/security/scan',
            ],
            priority: 'medium',
            analytics: true,
            customization: true,
            support: 'email',
          },
          pricing: {
            monthly: 29,
            perToken: 0.005,
            overageRate: 0.008,
          },
        },
        {
          name: 'enterprise',
          limits: {
            requestsPerHour: 100000,
            requestsPerDay: 1000000,
            concurrentRequests: 100,
            maxTokensPerRequest: 16384,
            maxContextWindow: 262144,
          },
          features: {
            models: ['qwen3_42b', 'qwen3_moe'],
            endpoints: ['*'],
            priority: 'high',
            analytics: true,
            customization: true,
            support: 'priority',
          },
          pricing: {
            monthly: 299,
            perToken: 0.003,
            overageRate: 0.005,
          },
        },
        {
          name: 'internal',
          limits: {
            requestsPerHour: 1000000,
            requestsPerDay: 10000000,
            concurrentRequests: 1000,
            maxTokensPerRequest: 32768,
            maxContextWindow: 262144,
          },
          features: {
            models: ['qwen3_42b', 'qwen3_moe'],
            endpoints: ['*'],
            priority: 'critical',
            analytics: true,
            customization: true,
            support: 'dedicated',
          },
          pricing: {
            monthly: 0,
            perToken: 0,
            overageRate: 0,
          },
        },
      ],
      rotationPolicy: {
        maxAge: '90d',
        warningPeriod: '7d',
        autoRotate: false,
      },
    },
    oauth2: {
      providers: [
        {
          name: 'github',
          clientId: process.env.GITHUB_CLIENT_ID || '',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
          authUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          userInfoUrl: 'https://api.github.com/user',
          scopes: ['user:email', 'read:user'],
        },
        {
          name: 'google',
          clientId: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          authUrl: 'https://accounts.google.com/oauth2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
          scopes: ['openid', 'email', 'profile'],
        },
      ],
      scopes: ['api:read', 'api:write', 'models:access'],
    },
  },

  rateLimit: {
    strategy: 'sliding-window',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || '',
      db: 0,
      keyPrefix: 'autonogrammer:ratelimit:',
    },
    global: {
      requestsPerSecond: 1000,
      burstLimit: 2000,
    },
    perIP: {
      requestsPerMinute: 60,
      blacklistThreshold: 1000,
      blacklistDuration: '1h',
    },
    perUser: {
      requestsPerHour: 10000,
      concurrentRequests: 50,
    },
  },

  models: {
    qwen3_42b: {
      name: 'Qwen3-42B AI Coder',
      endpoint: process.env.QWEN3_42B_ENDPOINT || 'http://localhost:8001',
      healthCheck: '/health',
      capabilities: [
        'code_generation',
        'code_completion',
        'debugging',
        'refactoring',
        'documentation',
        'testing',
      ],
      contextWindow: 262144,
      maxTokens: 16384,
      pricing: {
        inputTokens: 0.003,
        outputTokens: 0.006,
      },
      authentication: {
        type: 'api-key',
        headerName: 'X-API-Key',
        keyRotation: true,
      },
      scaling: {
        minInstances: 2,
        maxInstances: 10,
        targetUtilization: 70,
      },
    },
    qwen3_moe: {
      name: 'Qwen3-MOE Red Team',
      endpoint: process.env.QWEN3_MOE_ENDPOINT || 'http://localhost:8000',
      healthCheck: '/health',
      capabilities: [
        'security_analysis',
        'vulnerability_detection',
        'jailbreak_testing',
        'adversarial_prompts',
        'prompt_injection_testing',
        'red_team_assessment',
      ],
      contextWindow: 262144,
      maxTokens: 8192,
      pricing: {
        inputTokens: 0.005,
        outputTokens: 0.01,
      },
      authentication: {
        type: 'api-key',
        headerName: 'X-API-Key',
        keyRotation: true,
      },
      scaling: {
        minInstances: 1,
        maxInstances: 5,
        targetUtilization: 80,
      },
    },
  },

  security: {
    cors: {
      allowedOrigins: [
        'https://autonogrammer.ai',
        'https://www.autonogrammer.ai',
        'https://docs.autonogrammer.ai',
        'https://app.autonogrammer.ai',
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Request-ID',
        'X-Rate-Limit-Remaining',
      ],
      credentials: true,
      maxAge: 86400,
    },
    helmet: {
      contentSecurityPolicy: true,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true,
    },
    inputValidation: {
      maxRequestSize: '10mb',
      maxFieldSize: '1mb',
      maxFiles: 10,
      allowedContentTypes: [
        'application/json',
        'text/plain',
        'multipart/form-data',
      ],
      sanitization: {
        html: true,
        sql: true,
        xss: true,
        maliciousPatterns: [
          'eval\\(',
          'exec\\(',
          'system\\(',
          'shell_exec\\(',
          'passthru\\(',
          '\\<script',
          'javascript:',
          'data:text/html',
          '\\${.*}',
        ],
      },
    },
    outputFiltering: {
      piiDetection: true,
      sensitiveDataMasking: true,
      codeExecutionPrevention: true,
      malwareDetection: true,
    },
    monitoring: {
      suspiciousActivityThreshold: 10,
      alerting: {
        email: ['security@autonogrammer.ai', 'admin@autonogrammer.ai'],
        webhook: process.env.SECURITY_WEBHOOK_URL || '',
        slack: process.env.SECURITY_SLACK_WEBHOOK || '',
      },
    },
  },

  monitoring: {
    metrics: {
      provider: 'prometheus',
      endpoint: 'http://localhost:9090/metrics',
      labels: {
        service: 'autonogrammer-api',
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      format: 'json',
      destination: 'console',
      retention: '30d',
      fields: {
        requestId: true,
        userId: true,
        apiKey: false, // Never log actual API keys
        endpoint: true,
        method: true,
        statusCode: true,
        responseTime: true,
        inputTokens: true,
        outputTokens: true,
        cost: true,
        error: true,
      },
    },
    health: {
      endpoints: ['/health', '/ready', '/metrics'],
      interval: '30s',
      timeout: '10s',
      retries: 3,
    },
    alerts: {
      errorRate: {
        threshold: 0.05, // 5% error rate
        window: '5m',
        severity: 'warning',
      },
      latency: {
        p95Threshold: 2000, // 2 seconds
        window: '5m',
        severity: 'warning',
      },
      availability: {
        threshold: 0.99, // 99% availability
        window: '5m',
        severity: 'critical',
      },
    },
  },
};