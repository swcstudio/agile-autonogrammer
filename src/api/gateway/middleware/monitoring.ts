/**
 * Monitoring Middleware for autonogrammer.ai API
 * Handles request logging, metrics collection, and performance monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import prometheus from 'prom-client';
import { APIConfig } from '../config';

export class MonitoringMiddleware {
  private config: APIConfig;
  private logger: winston.Logger;
  private register: prometheus.Registry;

  // Prometheus metrics
  private httpRequestsTotal: prometheus.Counter<string>;
  private httpRequestDuration: prometheus.Histogram<string>;
  private activeConnections: prometheus.Gauge<string>;
  private modelLatency: prometheus.Histogram<string>;
  private errorRate: prometheus.Counter<string>;

  constructor(config: APIConfig, logger: winston.Logger, register: prometheus.Registry) {
    this.config = config;
    this.logger = logger;
    this.register = register;

    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.httpRequestsTotal = new prometheus.Counter({
      name: 'autonogrammer_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'status_code', 'endpoint', 'user_tier', 'model'],
      registers: [this.register],
    });

    this.httpRequestDuration = new prometheus.Histogram({
      name: 'autonogrammer_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'status_code', 'endpoint', 'user_tier'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.activeConnections = new prometheus.Gauge({
      name: 'autonogrammer_active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    this.modelLatency = new prometheus.Histogram({
      name: 'autonogrammer_model_latency_seconds',
      help: 'Latency of model requests in seconds',
      labelNames: ['model', 'operation', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.register],
    });

    this.errorRate = new prometheus.Counter({
      name: 'autonogrammer_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'endpoint', 'user_tier', 'error_code'],
      registers: [this.register],
    });
  }

  public requestId() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      (req as any).requestId = requestId;
      res.setHeader('X-Request-ID', requestId);
      next();
    };
  }

  public logging() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      const requestId = (req as any).requestId;

      // Track active connections
      this.activeConnections.inc();

      // Log request start
      if (this.config.monitoring.logging.level === 'debug') {
        this.logger.debug('Request started', {
          requestId,
          method: req.method,
          url: req.originalUrl,
          userAgent: req.headers['user-agent'],
          ip: this.getClientIP(req),
          headers: this.sanitizeHeaders(req.headers),
          body: this.sanitizeBody(req.body),
        });
      }

      // Override res.end to capture response details
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        const duration = Date.now() - startTime;
        const user = (req as any).user;

        // Decrement active connections
        this.activeConnections.dec();

        // Collect metrics
        const labels = {
          method: req.method,
          status_code: res.statusCode.toString(),
          endpoint: this.sanitizeEndpoint(req.route?.path || req.path),
          user_tier: user?.tier || 'anonymous',
        };

        this.httpRequestsTotal.labels(labels).inc();
        this.httpRequestDuration.labels(labels).observe(duration / 1000);

        // Record errors
        if (res.statusCode >= 400) {
          this.errorRate.labels({
            type: res.statusCode >= 500 ? 'server_error' : 'client_error',
            endpoint: labels.endpoint,
            user_tier: labels.user_tier,
            error_code: res.statusCode.toString(),
          }).inc();
        }

        // Log request completion
        const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        const logData: any = {
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          userAgent: req.headers['user-agent'],
          ip: this.getClientIP(req),
        };

        // Add optional fields based on configuration
        if (this.config.monitoring.logging.fields.userId && user) {
          logData.userId = user.id;
        }
        if (this.config.monitoring.logging.fields.responseTime) {
          logData.responseTime = duration;
        }
        if (this.config.monitoring.logging.fields.inputTokens && (req as any).inputTokens) {
          logData.inputTokens = (req as any).inputTokens;
        }
        if (this.config.monitoring.logging.fields.outputTokens && (req as any).outputTokens) {
          logData.outputTokens = (req as any).outputTokens;
        }
        if (this.config.monitoring.logging.fields.cost && (req as any).cost) {
          logData.cost = (req as any).cost;
        }

        // Log errors with stack traces
        if (res.statusCode >= 500 && (req as any).error) {
          logData.error = {
            message: (req as any).error.message,
            stack: (req as any).error.stack,
          };
        }

        this.logger[logLevel]('Request completed', logData);

        // Call original end method
        originalEnd.call(this, chunk, encoding);
      }.bind(this);

      next();
    };
  }

  public metrics() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Add custom metrics to request for use in handlers
      (req as any).recordModelLatency = (model: string, operation: string, latency: number, success: boolean) => {
        this.modelLatency.labels({
          model,
          operation,
          status: success ? 'success' : 'error',
        }).observe(latency / 1000);
      };

      (req as any).recordTokenUsage = (inputTokens: number, outputTokens: number, cost: number) => {
        (req as any).inputTokens = inputTokens;
        (req as any).outputTokens = outputTokens;
        (req as any).cost = cost;
      };

      next();
    };
  }

  public healthCheck() {
    return async (req: Request, res: Response): Promise<void> => {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        metrics: {
          activeConnections: await this.register.getSingleMetricAsString('autonogrammer_active_connections'),
          totalRequests: await this.register.getSingleMetricAsString('autonogrammer_http_requests_total'),
          errorRate: await this.register.getSingleMetricAsString('autonogrammer_errors_total'),
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        cpu: {
          usage: process.cpuUsage(),
        },
      };

      // Check if system is healthy based on metrics
      const errorMetric = await this.register.getSingleMetric('autonogrammer_errors_total');
      const requestMetric = await this.register.getSingleMetric('autonogrammer_http_requests_total');
      
      let status = 'healthy';
      const warnings: string[] = [];

      // Check error rate (if > 5% in last period, mark as degraded)
      if (errorMetric && requestMetric) {
        const errorCount = this.getMetricValue(errorMetric);
        const requestCount = this.getMetricValue(requestMetric);
        if (requestCount > 0 && (errorCount / requestCount) > 0.05) {
          status = 'degraded';
          warnings.push('High error rate detected');
        }
      }

      // Check memory usage (if > 85%, mark as degraded)
      const memoryUsagePercent = healthData.memory.used / healthData.memory.total;
      if (memoryUsagePercent > 0.85) {
        status = 'degraded';
        warnings.push('High memory usage');
      }

      const response = {
        ...healthData,
        status,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      const statusCode = status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(response);
    };
  }

  public performanceAlert() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const user = (req as any).user;

        // Alert on slow requests (> 5 seconds)
        if (duration > 5000) {
          this.logger.warn('Slow request detected', {
            requestId: (req as any).requestId,
            method: req.method,
            url: req.originalUrl,
            duration,
            userId: user?.id,
            userTier: user?.tier,
            statusCode: res.statusCode,
          });

          // Send performance alert
          this.sendPerformanceAlert({
            type: 'slow_request',
            requestId: (req as any).requestId,
            endpoint: req.originalUrl,
            duration,
            threshold: 5000,
            user: user?.id,
            timestamp: new Date().toISOString(),
          });
        }

        // Alert on high memory usage
        const memoryUsage = process.memoryUsage();
        if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
          this.logger.warn('High memory usage detected', {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
          });
        }
      });

      next();
    };
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'x-auth-token'];
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = JSON.parse(JSON.stringify(body));
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'key', 'token', 'auth', 'credential'];
    this.removeSensitiveFields(sanitized, sensitiveFields);

    return sanitized;
  }

  private removeSensitiveFields(obj: any, sensitiveFields: string[]): void {
    if (Array.isArray(obj)) {
      obj.forEach(item => this.removeSensitiveFields(item, sensitiveFields));
      return;
    }

    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const lowercaseKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowercaseKey.includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          this.removeSensitiveFields(obj[key], sensitiveFields);
        }
      });
    }
  }

  private sanitizeEndpoint(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-zA-Z0-9]{20,}/g, '/:token');
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  private getMetricValue(metric: any): number {
    // This is a simplified version - in production, you'd need to properly parse Prometheus metrics
    try {
      if (metric && typeof metric.get === 'function') {
        const value = metric.get();
        return typeof value === 'number' ? value : 0;
      }
    } catch (error) {
      console.error('Error getting metric value:', error);
    }
    return 0;
  }

  private async sendPerformanceAlert(alert: any): Promise<void> {
    // Log the performance alert
    this.logger.error('Performance Alert', alert);

    // In production, send to alerting systems
    console.log('🚨 Performance Alert:', alert);

    // Send to external monitoring systems (Datadog, New Relic, etc.)
    if (this.config.monitoring.metrics.provider === 'datadog') {
      // Send to Datadog
    } else if (this.config.monitoring.metrics.provider === 'newrelic') {
      // Send to New Relic
    }
  }

  // Method to get current metrics for health checks
  public async getCurrentMetrics(): Promise<any> {
    const metrics = await this.register.getMetricsAsJSON();
    
    return {
      totalRequests: this.findMetricValue(metrics, 'autonogrammer_http_requests_total'),
      totalErrors: this.findMetricValue(metrics, 'autonogrammer_errors_total'),
      activeConnections: this.findMetricValue(metrics, 'autonogrammer_active_connections'),
      avgResponseTime: this.findMetricValue(metrics, 'autonogrammer_http_request_duration_seconds', 'sum') / 
                      this.findMetricValue(metrics, 'autonogrammer_http_request_duration_seconds', 'count'),
    };
  }

  private findMetricValue(metrics: any[], name: string, label?: string): number {
    const metric = metrics.find(m => m.name === name);
    if (!metric || !metric.values) return 0;
    
    if (label) {
      const value = metric.values.find((v: any) => v.labels && v.labels._type === label);
      return value ? value.value : 0;
    }
    
    return metric.values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
  }
}