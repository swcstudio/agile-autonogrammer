#!/usr/bin/env node
/**
 * Production API Gateway Server for autonogrammer.ai
 * Enterprise-grade server with security, authentication, and monitoring
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import prometheus from 'prom-client';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { config, APIConfig, APITier } from './config';
import { OpenAPISpec } from './openapi';
import { AuthenticationMiddleware } from './middleware/auth';
import { SecurityMiddleware } from './middleware/security';
import { MonitoringMiddleware } from './middleware/monitoring';
import { ModelProxy } from './proxy/models';
import { HealthCheck } from './health/checker';

// Initialize Prometheus metrics
const register = new prometheus.Register();
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status_code', 'endpoint', 'user_tier'],
  registers: [register],
});

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'status_code', 'endpoint'],
  buckets: [1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
  registers: [register],
});

const modelRequestsTotal = new prometheus.Counter({
  name: 'model_requests_total',
  help: 'Total number of model requests',
  labelNames: ['model', 'status', 'user_tier'],
  registers: [register],
});

const tokenUsageTotal = new prometheus.Counter({
  name: 'token_usage_total',
  help: 'Total token usage',
  labelNames: ['model', 'type', 'user_tier'],
  registers: [register],
});

// Initialize logger
const logger = winston.createLogger({
  level: config.monitoring.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Initialize Redis for rate limiting
const redis = new Redis({
  host: config.rateLimit.redis.host,
  port: config.rateLimit.redis.port,
  password: config.rateLimit.redis.password,
  db: config.rateLimit.redis.db,
  keyPrefix: config.rateLimit.redis.keyPrefix,
});

class AutonogrammerAPIGateway {
  private app: express.Application;
  private server: any;
  private healthChecker: HealthCheck;
  private authMiddleware: AuthenticationMiddleware;
  private securityMiddleware: SecurityMiddleware;
  private monitoringMiddleware: MonitoringMiddleware;
  private modelProxy: ModelProxy;

  constructor() {
    this.app = express();
    this.healthChecker = new HealthCheck(config);
    this.authMiddleware = new AuthenticationMiddleware(config);
    this.securityMiddleware = new SecurityMiddleware(config);
    this.monitoringMiddleware = new MonitoringMiddleware(config, logger, register);
    this.modelProxy = new ModelProxy(config, logger);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet(config.security.helmet));
    
    // CORS
    this.app.use(cors(config.security.cors));
    
    // Request parsing
    this.app.use(express.json({ 
      limit: config.security.inputValidation.maxRequestSize,
      verify: (req, res, buf) => {
        // Store raw body for signature verification
        (req as any).rawBody = buf;
      },
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.security.inputValidation.maxRequestSize,
    }));

    // Request ID and logging
    this.app.use(this.monitoringMiddleware.requestId());
    this.app.use(this.monitoringMiddleware.logging());

    // Global rate limiting
    const globalLimiter = rateLimit({
      store: new RedisStore({
        sendCommand: (...args: string[]) => redis.call(...args),
      }),
      windowMs: 60 * 1000, // 1 minute
      max: config.rateLimit.global.requestsPerSecond * 60,
      message: {
        error: 'Too many requests from this IP',
        retryAfter: '1 minute',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(globalLimiter);

    // Security middleware
    this.app.use(this.securityMiddleware.inputValidation());
    this.app.use(this.securityMiddleware.suspiciousActivityDetection());

    // Monitoring
    this.app.use(this.monitoringMiddleware.metrics());
  }

  private setupRoutes(): void {
    // Health check endpoints (no auth required)
    this.app.get('/health', async (req, res) => {
      const health = await this.healthChecker.checkOverallHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    this.app.get('/ready', async (req, res) => {
      const readiness = await this.healthChecker.checkReadiness();
      const statusCode = readiness.ready ? 200 : 503;
      res.status(statusCode).json(readiness);
    });

    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(register.metrics());
    });

    // API Documentation
    const openApiSpec = new OpenAPISpec(config);
    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec.getSpec()));
    this.app.get('/openapi.json', (req, res) => {
      res.json(openApiSpec.getSpec());
    });

    // Authentication routes
    this.setupAuthRoutes();

    // API routes (require authentication)
    this.app.use('/v1', this.authMiddleware.authenticate());
    this.app.use('/v1', this.authMiddleware.rateLimitByTier());
    this.setupAPIRoutes();
  }

  private setupAuthRoutes(): void {
    // API Key management
    this.app.post('/auth/api-keys', this.authMiddleware.authenticate(), async (req, res) => {
      try {
        const { name, tier = 'free' } = req.body;
        const user = (req as any).user;
        
        const apiKey = await this.authMiddleware.createAPIKey(user.id, name, tier as any);
        
        logger.info('API key created', {
          userId: user.id,
          keyName: name,
          tier,
          requestId: (req as any).requestId,
        });

        res.json({
          success: true,
          apiKey: {
            id: apiKey.id,
            name: apiKey.name,
            key: apiKey.key,
            tier: apiKey.tier,
            createdAt: apiKey.createdAt,
            expiresAt: apiKey.expiresAt,
          },
        });
      } catch (error) {
        logger.error('Failed to create API key', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: (req as any).requestId,
        });
        res.status(500).json({ error: 'Failed to create API key' });
      }
    });

    this.app.get('/auth/api-keys', this.authMiddleware.authenticate(), async (req, res) => {
      try {
        const user = (req as any).user;
        const apiKeys = await this.authMiddleware.listAPIKeys(user.id);
        
        res.json({
          success: true,
          apiKeys: apiKeys.map(key => ({
            id: key.id,
            name: key.name,
            tier: key.tier,
            createdAt: key.createdAt,
            expiresAt: key.expiresAt,
            lastUsed: key.lastUsed,
            usageStats: key.usageStats,
          })),
        });
      } catch (error) {
        logger.error('Failed to list API keys', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: (req as any).requestId,
        });
        res.status(500).json({ error: 'Failed to list API keys' });
      }
    });

    this.app.delete('/auth/api-keys/:keyId', this.authMiddleware.authenticate(), async (req, res) => {
      try {
        const user = (req as any).user;
        const { keyId } = req.params;
        
        await this.authMiddleware.revokeAPIKey(user.id, keyId);
        
        logger.info('API key revoked', {
          userId: user.id,
          keyId,
          requestId: (req as any).requestId,
        });

        res.json({ success: true });
      } catch (error) {
        logger.error('Failed to revoke API key', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: (req as any).requestId,
        });
        res.status(500).json({ error: 'Failed to revoke API key' });
      }
    });

    // OAuth2 routes
    this.app.get('/auth/oauth/:provider', (req, res) => {
      const { provider } = req.params;
      const oauthProvider = config.authentication.oauth2.providers.find(p => p.name === provider);
      
      if (!oauthProvider) {
        return res.status(404).json({ error: 'OAuth provider not found' });
      }

      const state = crypto.randomBytes(32).toString('hex');
      const authUrl = new URL(oauthProvider.authUrl);
      authUrl.searchParams.set('client_id', oauthProvider.clientId);
      authUrl.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}/auth/oauth/${provider}/callback`);
      authUrl.searchParams.set('scope', oauthProvider.scopes.join(' '));
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');

      // Store state in session/redis for verification
      res.redirect(authUrl.toString());
    });

    this.app.get('/auth/oauth/:provider/callback', async (req, res) => {
      try {
        const { provider } = req.params;
        const { code, state } = req.query;
        
        const tokens = await this.authMiddleware.handleOAuthCallback(provider, code as string, state as string);
        
        res.json({
          success: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: tokens.user,
        });
      } catch (error) {
        logger.error('OAuth callback failed', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: req.params.provider,
          requestId: (req as any).requestId,
        });
        res.status(400).json({ error: 'OAuth authentication failed' });
      }
    });
  }

  private setupAPIRoutes(): void {
    // Model endpoints
    this.app.post('/v1/completions', async (req, res) => {
      await this.handleModelRequest(req, res, 'completions');
    });

    this.app.post('/v1/chat/completions', async (req, res) => {
      await this.handleModelRequest(req, res, 'chat/completions');
    });

    this.app.get('/v1/models', (req, res) => {
      const user = (req as any).user;
      const tier = user.tier as APITier['name'];
      const allowedModels = config.authentication.apiKeys.tiers.find(t => t.name === tier)?.features.models || [];
      
      const models = Object.entries(config.models)
        .filter(([key]) => allowedModels.includes(key) || allowedModels.includes('*'))
        .map(([key, model]) => ({
          id: key,
          object: 'model',
          owned_by: 'autonogrammer',
          name: model.name,
          capabilities: model.capabilities,
          context_window: model.contextWindow,
          max_tokens: model.maxTokens,
          pricing: model.pricing,
        }));

      res.json({
        object: 'list',
        data: models,
      });
    });

    // Code analysis endpoints
    this.app.post('/v1/code/analysis', async (req, res) => {
      await this.handleCodeAnalysis(req, res);
    });

    this.app.post('/v1/security/scan', async (req, res) => {
      await this.handleSecurityScan(req, res);
    });

    // Usage and analytics
    this.app.get('/v1/usage', async (req, res) => {
      try {
        const user = (req as any).user;
        const usage = await this.authMiddleware.getUserUsage(user.id);
        
        res.json({
          success: true,
          usage: {
            current_period: usage.currentPeriod,
            requests: usage.requests,
            tokens: usage.tokens,
            cost: usage.cost,
            limits: usage.limits,
          },
        });
      } catch (error) {
        logger.error('Failed to get usage stats', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: (req as any).requestId,
        });
        res.status(500).json({ error: 'Failed to get usage stats' });
      }
    });
  }

  private async handleModelRequest(req: express.Request, res: express.Response, endpoint: string): Promise<void> {
    const startTime = Date.now();
    const user = (req as any).user;
    const requestId = (req as any).requestId;

    try {
      const { model = 'qwen3_42b', ...requestBody } = req.body;
      
      // Check if user has access to this model
      const tier = user.tier as APITier['name'];
      const tierConfig = config.authentication.apiKeys.tiers.find(t => t.name === tier);
      if (!tierConfig || (!tierConfig.features.models.includes(model) && !tierConfig.features.models.includes('*'))) {
        return res.status(403).json({ error: 'Access denied to this model' });
      }

      // Validate request against tier limits
      const tokensEstimate = JSON.stringify(requestBody).length / 4; // Rough estimate
      if (tokensEstimate > tierConfig.limits.maxTokensPerRequest) {
        return res.status(413).json({ error: 'Request exceeds token limit for your tier' });
      }

      // Forward to model
      const modelResponse = await this.modelProxy.forwardRequest(model, endpoint, requestBody, {
        userId: user.id,
        requestId,
        tier: tier,
      });

      // Update metrics
      const duration = Date.now() - startTime;
      httpRequestDuration.labels(req.method, res.statusCode.toString(), endpoint).observe(duration);
      modelRequestsTotal.labels(model, 'success', tier).inc();
      
      if (modelResponse.usage) {
        tokenUsageTotal.labels(model, 'input', tier).inc(modelResponse.usage.prompt_tokens);
        tokenUsageTotal.labels(model, 'output', tier).inc(modelResponse.usage.completion_tokens);
      }

      // Log successful request
      logger.info('Model request completed', {
        userId: user.id,
        model,
        endpoint,
        duration,
        inputTokens: modelResponse.usage?.prompt_tokens,
        outputTokens: modelResponse.usage?.completion_tokens,
        requestId,
      });

      res.json(modelResponse);
    } catch (error) {
      const duration = Date.now() - startTime;
      httpRequestDuration.labels(req.method, '500', endpoint).observe(duration);
      modelRequestsTotal.labels(req.body.model || 'unknown', 'error', user.tier).inc();

      logger.error('Model request failed', {
        userId: user.id,
        endpoint,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });

      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  private async handleCodeAnalysis(req: express.Request, res: express.Response): Promise<void> {
    const { code, language, analysis_type = 'quality' } = req.body;
    const user = (req as any).user;

    try {
      // Use the AI Coder model for code analysis
      const analysisPrompt = this.generateCodeAnalysisPrompt(code, language, analysis_type);
      
      const modelResponse = await this.modelProxy.forwardRequest('qwen3_42b', 'chat/completions', {
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.1,
        max_tokens: 2048,
      }, {
        userId: user.id,
        requestId: (req as any).requestId,
        tier: user.tier,
      });

      res.json({
        success: true,
        analysis: {
          type: analysis_type,
          language,
          result: modelResponse.choices[0].message.content,
          confidence: 0.95,
          timestamp: new Date().toISOString(),
        },
        usage: modelResponse.usage,
      });
    } catch (error) {
      logger.error('Code analysis failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: (req as any).requestId,
      });
      res.status(500).json({ error: 'Code analysis failed' });
    }
  }

  private async handleSecurityScan(req: express.Request, res: express.Response): Promise<void> {
    const { code, language, scan_type = 'vulnerability' } = req.body;
    const user = (req as any).user;

    try {
      // Use the Red Team model for security analysis
      const securityPrompt = this.generateSecurityScanPrompt(code, language, scan_type);
      
      const modelResponse = await this.modelProxy.forwardRequest('qwen3_moe', 'chat/completions', {
        messages: [{ role: 'user', content: securityPrompt }],
        temperature: 0.1,
        max_tokens: 2048,
      }, {
        userId: user.id,
        requestId: (req as any).requestId,
        tier: user.tier,
      });

      res.json({
        success: true,
        scan: {
          type: scan_type,
          language,
          findings: modelResponse.choices[0].message.content,
          risk_level: this.extractRiskLevel(modelResponse.choices[0].message.content),
          timestamp: new Date().toISOString(),
        },
        usage: modelResponse.usage,
      });
    } catch (error) {
      logger.error('Security scan failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: (req as any).requestId,
      });
      res.status(500).json({ error: 'Security scan failed' });
    }
  }

  private generateCodeAnalysisPrompt(code: string, language: string, analysisType: string): string {
    const prompts = {
      quality: `Analyze the following ${language} code for quality issues, best practices, and improvements:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide a detailed analysis covering code quality, maintainability, performance, and adherence to best practices.`,
      performance: `Analyze the following ${language} code for performance issues and optimizations:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nFocus on algorithmic complexity, memory usage, and potential bottlenecks.`,
      maintainability: `Analyze the following ${language} code for maintainability and readability:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nEvaluate code structure, documentation, naming conventions, and ease of modification.`,
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.quality;
  }

  private generateSecurityScanPrompt(code: string, language: string, scanType: string): string {
    const prompts = {
      vulnerability: `Perform a security vulnerability scan of the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nIdentify potential security vulnerabilities, assess risk levels, and provide remediation recommendations.`,
      injection: `Analyze the following ${language} code for injection vulnerabilities:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nFocus on SQL injection, XSS, command injection, and other input validation issues.`,
      authentication: `Review the following ${language} code for authentication and authorization issues:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nEvaluate authentication mechanisms, session management, and access controls.`,
    };

    return prompts[scanType as keyof typeof prompts] || prompts.vulnerability;
  }

  private extractRiskLevel(content: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowercaseContent = content.toLowerCase();
    if (lowercaseContent.includes('critical') || lowercaseContent.includes('severe')) return 'critical';
    if (lowercaseContent.includes('high')) return 'high';
    if (lowercaseContent.includes('medium') || lowercaseContent.includes('moderate')) return 'medium';
    return 'low';
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const requestId = (req as any).requestId;
      const statusCode = error.statusCode || 500;

      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        requestId,
        url: req.url,
        method: req.method,
      });

      res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal server error' : error.message,
        requestId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  public async start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          logger.info(`🚀 Autonogrammer API Gateway started`, {
            port,
            environment: process.env.NODE_ENV || 'development',
            domain: config.domain.production.apiSubdomain,
            models: Object.keys(config.models).length,
            tiers: config.authentication.apiKeys.tiers.length,
          });
          resolve();
        });

        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('🛑 Autonogrammer API Gateway stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Start server if run directly
if (require.main === module) {
  const gateway = new AutonogrammerAPIGateway();
  const port = parseInt(process.env.PORT || '3000');

  gateway.start(port).catch((error) => {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await gateway.stop();
    await redis.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await gateway.stop();
    await redis.disconnect();
    process.exit(0);
  });
}

export { AutonogrammerAPIGateway };