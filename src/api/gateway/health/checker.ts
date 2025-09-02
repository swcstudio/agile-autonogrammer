/**
 * Health Check System for autonogrammer.ai API
 * Comprehensive system health monitoring and diagnostics
 */

import axios from 'axios';
import Redis from 'ioredis';
import { APIConfig } from '../config';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  components: ComponentHealth[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  lastCheck: string;
  details?: any;
}

export interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: ReadinessCheck[];
}

export interface ReadinessCheck {
  name: string;
  ready: boolean;
  message?: string;
}

export class HealthCheck {
  private config: APIConfig;
  private redis: Redis;
  private lastHealthCheck: HealthStatus | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: APIConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.rateLimit.redis.host,
      port: config.rateLimit.redis.port,
      password: config.rateLimit.redis.password,
      db: config.rateLimit.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.startPeriodicHealthChecks();
  }

  private startPeriodicHealthChecks(): void {
    // Run health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        this.lastHealthCheck = await this.checkOverallHealth();
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    }, 30000);

    // Initial health check
    setTimeout(async () => {
      try {
        this.lastHealthCheck = await this.checkOverallHealth();
      } catch (error) {
        console.error('Initial health check failed:', error);
      }
    }, 1000);
  }

  public async checkOverallHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const components: ComponentHealth[] = [];

    // Check Redis connectivity
    const redisHealth = await this.checkRedisHealth();
    components.push(redisHealth);

    // Check model endpoints
    const modelHealthChecks = await Promise.all(
      Object.entries(this.config.models).map(async ([key, model]) => {
        return await this.checkModelHealth(key, model);
      })
    );
    components.push(...modelHealthChecks);

    // Check system resources
    const systemHealth = await this.checkSystemHealth();
    components.push(systemHealth);

    // Check external dependencies (if any)
    const externalHealth = await this.checkExternalDependencies();
    if (externalHealth.length > 0) {
      components.push(...externalHealth);
    }

    // Calculate overall status
    const summary = this.calculateSummary(components);
    const overallStatus = this.determineOverallStatus(components);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      components,
      summary,
    };

    // Log health status if degraded or unhealthy
    if (overallStatus !== 'healthy') {
      console.warn('System health degraded', {
        status: overallStatus,
        unhealthy: components.filter(c => c.status === 'unhealthy').map(c => c.name),
        degraded: components.filter(c => c.status === 'degraded').map(c => c.name),
      });
    }

    return healthStatus;
  }

  private async checkRedisHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      await this.redis.ping();
      const latency = Date.now() - startTime;

      return {
        name: 'redis',
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
        message: latency > 1000 ? 'High Redis latency' : 'Redis connection healthy',
        lastCheck: new Date().toISOString(),
        details: {
          host: this.config.rateLimit.redis.host,
          port: this.config.rateLimit.redis.port,
        },
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date().toISOString(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private async checkModelHealth(modelKey: string, modelConfig: any): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const healthUrl = `${modelConfig.endpoint}${modelConfig.healthCheck}`;
      
      const response = await axios.get(healthUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'autonogrammer-health-check/1.0',
        },
      });

      const latency = Date.now() - startTime;
      const isHealthy = response.status === 200;
      const responseData = response.data || {};

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Model is healthy';

      if (!isHealthy) {
        status = 'unhealthy';
        message = `HTTP ${response.status}`;
      } else if (latency > 5000) {
        status = 'degraded';
        message = 'High model latency';
      } else if (responseData.status && responseData.status !== 'healthy') {
        status = 'degraded';
        message = `Model reports status: ${responseData.status}`;
      }

      return {
        name: `model_${modelKey}`,
        status,
        latency,
        message,
        lastCheck: new Date().toISOString(),
        details: {
          endpoint: modelConfig.endpoint,
          modelName: modelConfig.name,
          capabilities: modelConfig.capabilities,
          responseStatus: responseData.status,
          service: responseData.service,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      let message = 'Model health check failed';
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          message = 'Model service unreachable';
        } else if (error.code === 'ETIMEDOUT') {
          message = 'Model health check timeout';
        } else if (error.response) {
          message = `Model returned HTTP ${error.response.status}`;
        }
      }

      return {
        name: `model_${modelKey}`,
        status: 'unhealthy',
        latency,
        message,
        lastCheck: new Date().toISOString(),
        details: {
          endpoint: modelConfig.endpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private async checkSystemHealth(): Promise<ComponentHealth> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    // Calculate memory usage percentage (rough estimate)
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (memoryUsedMB / memoryTotalMB) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'System resources healthy';

    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      message = 'Critical memory usage';
    } else if (memoryUsagePercent > 75) {
      status = 'degraded';
      message = 'High memory usage';
    }

    return {
      name: 'system',
      status,
      message,
      lastCheck: new Date().toISOString(),
      details: {
        memory: {
          used: Math.round(memoryUsedMB),
          total: Math.round(memoryTotalMB),
          percentage: Math.round(memoryUsagePercent),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        uptime: Math.round(uptime),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  private async checkExternalDependencies(): Promise<ComponentHealth[]> {
    const dependencies: ComponentHealth[] = [];

    // Check OAuth providers (if configured)
    for (const provider of this.config.authentication.oauth2.providers) {
      if (provider.authUrl) {
        const health = await this.checkExternalEndpoint(
          `oauth_${provider.name}`,
          provider.authUrl,
          'OAuth provider availability'
        );
        dependencies.push(health);
      }
    }

    // Check monitoring endpoints (if configured)
    if (this.config.monitoring.metrics.endpoint) {
      const health = await this.checkExternalEndpoint(
        'metrics_endpoint',
        this.config.monitoring.metrics.endpoint,
        'Metrics endpoint availability'
      );
      dependencies.push(health);
    }

    return dependencies;
  }

  private async checkExternalEndpoint(
    name: string,
    url: string,
    description: string
  ): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'autonogrammer-health-check/1.0',
        },
        validateStatus: (status) => status < 500, // Don't throw on 4xx
      });

      const latency = Date.now() - startTime;
      const isHealthy = response.status < 400;

      return {
        name,
        status: isHealthy ? (latency > 3000 ? 'degraded' : 'healthy') : 'unhealthy',
        latency,
        message: isHealthy 
          ? (latency > 3000 ? `${description} (slow)` : description)
          : `${description} failed (HTTP ${response.status})`,
        lastCheck: new Date().toISOString(),
        details: {
          url,
          statusCode: response.status,
        },
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: `${description} unreachable`,
        lastCheck: new Date().toISOString(),
        details: {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  public async checkReadiness(): Promise<ReadinessStatus> {
    const checks: ReadinessCheck[] = [];

    // Check if Redis is ready
    try {
      await this.redis.ping();
      checks.push({
        name: 'redis',
        ready: true,
      });
    } catch (error) {
      checks.push({
        name: 'redis',
        ready: false,
        message: 'Redis not available',
      });
    }

    // Check if at least one model is ready
    const modelChecks = await Promise.all(
      Object.entries(this.config.models).map(async ([key, model]) => {
        try {
          const response = await axios.get(`${model.endpoint}${model.healthCheck}`, {
            timeout: 5000,
          });
          
          return {
            name: `model_${key}`,
            ready: response.status === 200,
            message: response.status === 200 ? undefined : `HTTP ${response.status}`,
          };
        } catch (error) {
          return {
            name: `model_${key}`,
            ready: false,
            message: 'Model not available',
          };
        }
      })
    );

    checks.push(...modelChecks);

    // System is ready if Redis is ready and at least one model is ready
    const redisReady = checks.find(c => c.name === 'redis')?.ready || false;
    const anyModelReady = modelChecks.some(c => c.ready);
    
    const ready = redisReady && anyModelReady;

    return {
      ready,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private calculateSummary(components: ComponentHealth[]): { healthy: number; degraded: number; unhealthy: number } {
    return components.reduce(
      (summary, component) => {
        summary[component.status]++;
        return summary;
      },
      { healthy: 0, degraded: 0, unhealthy: 0 }
    );
  }

  private determineOverallStatus(components: ComponentHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const hasUnhealthy = components.some(c => c.status === 'unhealthy');
    const hasDegraded = components.some(c => c.status === 'degraded');

    if (hasUnhealthy) {
      // If any critical component is unhealthy, system is unhealthy
      const unhealthyComponents = components.filter(c => c.status === 'unhealthy');
      const hasCriticalFailure = unhealthyComponents.some(c => 
        c.name === 'redis' || c.name.startsWith('model_')
      );
      
      return hasCriticalFailure ? 'unhealthy' : 'degraded';
    }

    if (hasDegraded) {
      return 'degraded';
    }

    return 'healthy';
  }

  public getCachedHealthStatus(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  public async getDetailedSystemInfo(): Promise<any> {
    const healthStatus = await this.checkOverallHealth();
    
    return {
      ...healthStatus,
      deployment: {
        buildTime: process.env.BUILD_TIME,
        commitHash: process.env.GIT_COMMIT,
        branch: process.env.GIT_BRANCH,
        version: process.env.API_VERSION || '1.0.0',
      },
      configuration: {
        nodeEnv: process.env.NODE_ENV,
        domain: this.config.domain.production.apiSubdomain,
        modelsCount: Object.keys(this.config.models).length,
        tiersCount: this.config.authentication.apiKeys.tiers.length,
        features: {
          oauth: this.config.authentication.oauth2.providers.length > 0,
          monitoring: !!this.config.monitoring.metrics.endpoint,
          rateLimit: !!this.config.rateLimit.redis.host,
        },
      },
    };
  }

  public async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}