/**
 * Authentication Middleware for autonogrammer.ai API
 * Handles API key validation, JWT tokens, OAuth2, and tier-based rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import axios from 'axios';
import { APIConfig, APITier } from '../config';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    tier: APITier['name'];
    apiKeyId?: string;
    permissions: string[];
  };
  requestId: string;
}

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  hashedKey: string;
  tier: APITier['name'];
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  usageStats: {
    requests: number;
    tokens: number;
    cost: number;
  };
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  tier: APITier['name'];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export class AuthenticationMiddleware {
  private config: APIConfig;
  private redis: Redis;
  private apiKeys: Map<string, APIKey> = new Map();
  private users: Map<string, User> = new Map();

  constructor(config: APIConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.rateLimit.redis.host,
      port: config.rateLimit.redis.port,
      password: config.rateLimit.redis.password,
      db: config.rateLimit.redis.db,
      keyPrefix: `${config.rateLimit.redis.keyPrefix}auth:`,
    });

    this.initializeTestData();
  }

  private async initializeTestData(): Promise<void> {
    // Create test users for development
    const testUser: User = {
      id: 'user-test-001',
      email: 'test@autonogrammer.ai',
      name: 'Test User',
      tier: 'professional',
      createdAt: new Date(),
      isActive: true,
    };
    this.users.set(testUser.id, testUser);

    // Create test API keys
    const testApiKey: APIKey = {
      id: 'key-test-001',
      userId: testUser.id,
      name: 'Test Professional Key',
      key: 'autogram_sk_test_1234567890abcdef',
      hashedKey: await bcrypt.hash('autogram_sk_test_1234567890abcdef', 10),
      tier: 'professional',
      permissions: ['api:read', 'api:write', 'models:access'],
      createdAt: new Date(),
      usageStats: {
        requests: 0,
        tokens: 0,
        cost: 0,
      },
      isActive: true,
    };
    this.apiKeys.set(testApiKey.key, testApiKey);

    // Create enterprise API key for testing
    const enterpriseApiKey: APIKey = {
      id: 'key-enterprise-001',
      userId: testUser.id,
      name: 'Test Enterprise Key',
      key: 'autogram_sk_enterprise_abcdef1234567890',
      hashedKey: await bcrypt.hash('autogram_sk_enterprise_abcdef1234567890', 10),
      tier: 'enterprise',
      permissions: ['*'],
      createdAt: new Date(),
      usageStats: {
        requests: 0,
        tokens: 0,
        cost: 0,
      },
      isActive: true,
    };
    this.apiKeys.set(enterpriseApiKey.key, enterpriseApiKey);

    console.log('🔑 Test API keys initialized:');
    console.log('   Professional: autogram_sk_test_1234567890abcdef');
    console.log('   Enterprise: autogram_sk_enterprise_abcdef1234567890');
  }

  public authenticate() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const apiKey = req.headers['x-api-key'] as string;
        const bearerToken = req.headers.authorization?.startsWith('Bearer ') 
          ? req.headers.authorization.slice(7) 
          : null;

        let user: User | null = null;
        let apiKeyRecord: APIKey | null = null;

        // Try API key authentication first
        if (apiKey) {
          apiKeyRecord = await this.validateAPIKey(apiKey);
          if (apiKeyRecord) {
            user = this.users.get(apiKeyRecord.userId) || null;
          }
        }
        // Fall back to JWT token authentication
        else if (bearerToken) {
          user = await this.validateJWT(bearerToken);
        }

        if (!user) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide a valid API key or Bearer token',
            timestamp: new Date().toISOString(),
          });
        }

        if (!user.isActive) {
          return res.status(403).json({
            error: 'Account suspended',
            message: 'Your account has been suspended',
            timestamp: new Date().toISOString(),
          });
        }

        // Attach user info to request
        (req as AuthenticatedRequest).user = {
          id: user.id,
          email: user.email,
          tier: apiKeyRecord?.tier || user.tier,
          apiKeyId: apiKeyRecord?.id,
          permissions: apiKeyRecord?.permissions || ['api:read'],
        };

        // Update last used timestamp for API keys
        if (apiKeyRecord) {
          apiKeyRecord.lastUsed = new Date();
          await this.updateAPIKeyUsage(apiKeyRecord.id, 1, 0, 0);
        }

        next();
      } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
          error: 'Authentication failed',
          message: 'Internal authentication error',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  public rateLimitByTier() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Rate limiting requires authentication',
        });
      }

      const tierConfig = this.config.authentication.apiKeys.tiers.find(t => t.name === user.tier);
      if (!tierConfig) {
        return res.status(500).json({
          error: 'Invalid tier configuration',
        });
      }

      // Create tier-specific rate limiter
      const tierLimiter = rateLimit({
        store: new RedisStore({
          sendCommand: (...args: string[]) => this.redis.call(...args),
        }),
        windowMs: 60 * 60 * 1000, // 1 hour
        max: tierConfig.limits.requestsPerHour,
        keyGenerator: (req: Request) => `user:${user.id}`,
        message: {
          error: 'Rate limit exceeded',
          message: `You have exceeded the rate limit for ${user.tier} tier (${tierConfig.limits.requestsPerHour} requests per hour)`,
          retryAfter: '1 hour',
          tier: user.tier,
          limits: tierConfig.limits,
        },
        standardHeaders: true,
        legacyHeaders: false,
        onLimitReached: (req, res, options) => {
          console.warn(`Rate limit exceeded for user ${user.id} (${user.tier} tier)`);
        },
      });

      tierLimiter(req, res, next);
    };
  }

  private async validateAPIKey(apiKey: string): Promise<APIKey | null> {
    try {
      // Check in-memory cache first
      const cachedKey = this.apiKeys.get(apiKey);
      if (cachedKey) {
        if (!cachedKey.isActive) {
          return null;
        }
        if (cachedKey.expiresAt && cachedKey.expiresAt < new Date()) {
          return null;
        }
        return cachedKey;
      }

      // In production, this would query a database
      // For now, return null for unknown keys
      return null;
    } catch (error) {
      console.error('API key validation error:', error);
      return null;
    }
  }

  private async validateJWT(token: string): Promise<User | null> {
    try {
      const publicKey = this.config.authentication.jwt.publicKeyPath;
      // In production, read from file system
      // For development, we'll use a simple validation
      
      const decoded = jwt.verify(token, 'development-secret') as any;
      if (!decoded.sub || !decoded.email) {
        return null;
      }

      // In production, this would query the database
      const user = this.users.get(decoded.sub);
      return user || null;
    } catch (error) {
      console.error('JWT validation error:', error);
      return null;
    }
  }

  public async createAPIKey(userId: string, name: string, tier: APITier['name']): Promise<APIKey> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secure API key
    const keyId = `key-${crypto.randomUUID()}`;
    const keyPrefix = tier === 'internal' ? 'autogram_sk_internal' : 'autogram_sk';
    const keySecret = crypto.randomBytes(32).toString('hex');
    const fullKey = `${keyPrefix}_${keySecret}`;
    const hashedKey = await bcrypt.hash(fullKey, 10);

    // Get tier permissions
    const tierConfig = this.config.authentication.apiKeys.tiers.find(t => t.name === tier);
    if (!tierConfig) {
      throw new Error('Invalid tier');
    }

    const apiKey: APIKey = {
      id: keyId,
      userId,
      name,
      key: fullKey,
      hashedKey,
      tier,
      permissions: tier === 'enterprise' ? ['*'] : ['api:read', 'api:write', 'models:access'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      usageStats: {
        requests: 0,
        tokens: 0,
        cost: 0,
      },
      isActive: true,
    };

    // Store in memory (in production, save to database)
    this.apiKeys.set(fullKey, apiKey);

    return apiKey;
  }

  public async listAPIKeys(userId: string): Promise<APIKey[]> {
    return Array.from(this.apiKeys.values())
      .filter(key => key.userId === userId && key.isActive)
      .map(key => ({
        ...key,
        key: 'sk-...' + key.key.slice(-4), // Mask the actual key
      }));
  }

  public async revokeAPIKey(userId: string, keyId: string): Promise<void> {
    const apiKey = Array.from(this.apiKeys.values()).find(
      key => key.id === keyId && key.userId === userId
    );

    if (!apiKey) {
      throw new Error('API key not found');
    }

    apiKey.isActive = false;
    // In production, update database
  }

  public async updateAPIKeyUsage(keyId: string, requests: number, inputTokens: number, outputTokens: number): Promise<void> {
    const apiKey = Array.from(this.apiKeys.values()).find(key => key.id === keyId);
    if (!apiKey) {
      return;
    }

    apiKey.usageStats.requests += requests;
    apiKey.usageStats.tokens += inputTokens + outputTokens;
    
    // Calculate cost based on tier pricing
    const tierConfig = this.config.authentication.apiKeys.tiers.find(t => t.name === apiKey.tier);
    if (tierConfig) {
      const inputCost = inputTokens * tierConfig.pricing.perToken;
      const outputCost = outputTokens * tierConfig.pricing.perToken * 2; // Output tokens cost more
      apiKey.usageStats.cost += inputCost + outputCost;
    }

    // In production, update database and potentially send to analytics
  }

  public async getUserUsage(userId: string): Promise<any> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Aggregate usage across all user's API keys
    const userKeys = Array.from(this.apiKeys.values()).filter(key => key.userId === userId);
    const totalUsage = userKeys.reduce(
      (acc, key) => ({
        requests: acc.requests + key.usageStats.requests,
        tokens: acc.tokens + key.usageStats.tokens,
        cost: acc.cost + key.usageStats.cost,
      }),
      { requests: 0, tokens: 0, cost: 0 }
    );

    const tierConfig = this.config.authentication.apiKeys.tiers.find(t => t.name === user.tier);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

    return {
      currentPeriod: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      requests: {
        count: totalUsage.requests,
        limit: tierConfig?.limits.requestsPerDay || 0,
      },
      tokens: {
        input: Math.floor(totalUsage.tokens * 0.3), // Rough estimate
        output: Math.floor(totalUsage.tokens * 0.7),
        total: totalUsage.tokens,
      },
      cost: {
        current_period: totalUsage.cost,
        projected_monthly: totalUsage.cost * (30 / now.getDate()),
      },
      limits: tierConfig?.limits || {},
    };
  }

  public async handleOAuthCallback(provider: string, code: string, state: string): Promise<any> {
    const oauthProvider = this.config.authentication.oauth2.providers.find(p => p.name === provider);
    if (!oauthProvider) {
      throw new Error('OAuth provider not found');
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await axios.post(oauthProvider.tokenUrl, {
        client_id: oauthProvider.clientId,
        client_secret: oauthProvider.clientSecret,
        code,
        grant_type: 'authorization_code',
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = tokenResponse.data;

      // Get user info from OAuth provider
      const userResponse = await axios.get(oauthProvider.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      });

      const oauthUser = userResponse.data;

      // Create or update user in our system
      let user = Array.from(this.users.values()).find(u => u.email === oauthUser.email);
      if (!user) {
        user = {
          id: `user-${crypto.randomUUID()}`,
          email: oauthUser.email,
          name: oauthUser.name || oauthUser.login || 'Unknown',
          tier: 'free',
          createdAt: new Date(),
          isActive: true,
        };
        this.users.set(user.id, user);
      }

      user.lastLogin = new Date();

      // Generate JWT tokens
      const accessTokenPayload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        iss: this.config.authentication.jwt.issuer,
        aud: this.config.authentication.jwt.audience,
      };

      const accessToken = jwt.sign(accessTokenPayload, 'development-secret', {
        expiresIn: this.config.authentication.jwt.accessTokenTtl,
      });

      const refreshToken = jwt.sign({ sub: user.id }, 'development-secret', {
        expiresIn: this.config.authentication.jwt.refreshTokenTtl,
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        },
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error('OAuth authentication failed');
    }
  }

  public checkPermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
        });
      }

      if (user.permissions.includes('*') || user.permissions.includes(permission)) {
        return next();
      }

      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Permission '${permission}' required`,
        userPermissions: user.permissions,
      });
    };
  }
}