/**
 * Security Middleware for autonogrammer.ai API
 * Handles input validation, output filtering, and threat detection
 */

import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { APIConfig } from '../config';

export interface SecurityContext {
  requestId: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export class SecurityMiddleware {
  private config: APIConfig;
  private suspiciousActivityCount: Map<string, { count: number; lastActivity: Date }> = new Map();
  private blockedIPs: Set<string> = new Set();

  constructor(config: APIConfig) {
    this.config = config;
  }

  public inputValidation() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Check content type
        if (req.method !== 'GET' && req.headers['content-type']) {
          const contentType = req.headers['content-type'].split(';')[0];
          if (!this.config.security.inputValidation.allowedContentTypes.includes(contentType)) {
            return res.status(415).json({
              error: 'Unsupported content type',
              message: `Content type '${contentType}' is not allowed`,
              allowedTypes: this.config.security.inputValidation.allowedContentTypes,
            });
          }
        }

        // Validate and sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body);
        }

        // Validate query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query);
        }

        // Check for malicious patterns
        const requestString = JSON.stringify({ body: req.body, query: req.query, headers: req.headers });
        if (this.containsMaliciousPatterns(requestString)) {
          this.recordSuspiciousActivity(req.ip, 'malicious_patterns');
          return res.status(400).json({
            error: 'Malicious content detected',
            message: 'Request contains potentially harmful patterns',
            timestamp: new Date().toISOString(),
          });
        }

        next();
      } catch (error) {
        console.error('Input validation error:', error);
        res.status(500).json({
          error: 'Input validation failed',
          message: 'Unable to validate request',
        });
      }
    };
  }

  public suspiciousActivityDetection() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientIP = this.getClientIP(req);

      // Check if IP is blocked
      if (this.blockedIPs.has(clientIP)) {
        return res.status(429).json({
          error: 'IP blocked',
          message: 'Your IP has been temporarily blocked due to suspicious activity',
          contact: 'security@autonogrammer.ai',
        });
      }

      // Analyze request patterns
      const suspiciousScore = this.calculateSuspiciousScore(req);
      if (suspiciousScore > this.config.security.monitoring.suspiciousActivityThreshold) {
        this.recordSuspiciousActivity(clientIP, 'high_suspicious_score', { score: suspiciousScore });
        
        // Block IP if threshold exceeded multiple times
        const activity = this.suspiciousActivityCount.get(clientIP);
        if (activity && activity.count > 5) {
          this.blockedIPs.add(clientIP);
          this.alertSecurity('IP_BLOCKED', {
            ip: clientIP,
            reason: 'Multiple suspicious activities',
            userAgent: req.headers['user-agent'],
            requests: activity.count,
          });
        }
      }

      next();
    };
  }

  public outputFiltering() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Store original json method
      const originalJson = res.json;

      // Override json method to filter output
      res.json = function(body: any) {
        try {
          const filteredBody = this.filterOutput(body);
          return originalJson.call(this, filteredBody);
        } catch (error) {
          console.error('Output filtering error:', error);
          return originalJson.call(this, {
            error: 'Output processing failed',
            message: 'Unable to process response',
          });
        }
      }.bind(this);

      next();
    };
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return str;
    }

    let sanitized = str;

    // HTML sanitization
    if (this.config.security.inputValidation.sanitization.html) {
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
    }

    // XSS prevention
    if (this.config.security.inputValidation.sanitization.xss) {
      sanitized = validator.escape(sanitized);
    }

    // SQL injection prevention
    if (this.config.security.inputValidation.sanitization.sql) {
      sanitized = sanitized.replace(/['";\\]/g, '\\$&');
    }

    return sanitized;
  }

  private containsMaliciousPatterns(content: string): boolean {
    const patterns = this.config.security.inputValidation.sanitization.maliciousPatterns;
    const lowercaseContent = content.toLowerCase();

    return patterns.some(pattern => {
      try {
        const regex = new RegExp(pattern, 'gi');
        return regex.test(lowercaseContent);
      } catch (error) {
        console.error('Invalid regex pattern:', pattern, error);
        return false;
      }
    });
  }

  private calculateSuspiciousScore(req: Request): number {
    let score = 0;

    // Check for unusual headers
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
    suspiciousHeaders.forEach(header => {
      if (req.headers[header]) score += 1;
    });

    // Check user agent
    const userAgent = req.headers['user-agent'] || '';
    if (!userAgent || userAgent.length < 10) score += 3;
    if (userAgent.includes('bot') || userAgent.includes('crawler')) score += 2;

    // Check for rapid requests from same IP
    const clientIP = this.getClientIP(req);
    const activity = this.suspiciousActivityCount.get(clientIP);
    if (activity && (Date.now() - activity.lastActivity.getTime()) < 1000) {
      score += 5; // Requests less than 1 second apart
    }

    // Check request size
    const requestSize = JSON.stringify(req.body || {}).length;
    if (requestSize > 100000) score += 3; // Very large requests

    // Check for unusual paths
    if (req.path.includes('../') || req.path.includes('..\\')) score += 10;

    // Check for SQL injection patterns in URL
    const sqlPatterns = ['union', 'select', 'drop', 'insert', 'update', 'delete'];
    const url = req.originalUrl.toLowerCase();
    sqlPatterns.forEach(pattern => {
      if (url.includes(pattern)) score += 5;
    });

    return score;
  }

  private recordSuspiciousActivity(ip: string, type: string, metadata?: any): void {
    const current = this.suspiciousActivityCount.get(ip) || { count: 0, lastActivity: new Date() };
    current.count += 1;
    current.lastActivity = new Date();
    this.suspiciousActivityCount.set(ip, current);

    console.warn(`🚨 Suspicious activity detected: ${type}`, {
      ip,
      count: current.count,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // Alert if threshold exceeded
    if (current.count >= this.config.security.monitoring.suspiciousActivityThreshold) {
      this.alertSecurity('SUSPICIOUS_ACTIVITY', {
        ip,
        type,
        count: current.count,
        metadata,
      });
    }
  }

  private async alertSecurity(alertType: string, data: any): Promise<void> {
    const alert = {
      type: alertType,
      severity: 'warning',
      timestamp: new Date().toISOString(),
      data,
      source: 'autonogrammer-api-security',
    };

    console.error(`🚨 SECURITY ALERT: ${alertType}`, alert);

    // Send email alerts
    if (this.config.security.monitoring.alerting.email.length > 0) {
      // In production, integrate with email service
      console.log('📧 Security email alert would be sent to:', this.config.security.monitoring.alerting.email);
    }

    // Send webhook alerts
    if (this.config.security.monitoring.alerting.webhook) {
      try {
        // In production, send actual webhook
        console.log('🪝 Security webhook alert would be sent to:', this.config.security.monitoring.alerting.webhook);
      } catch (error) {
        console.error('Failed to send security webhook:', error);
      }
    }

    // Send Slack alerts
    if (this.config.security.monitoring.alerting.slack) {
      try {
        // In production, integrate with Slack API
        console.log('💬 Security Slack alert would be sent to:', this.config.security.monitoring.alerting.slack);
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }
  }

  private filterOutput(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Deep clone to avoid modifying original
    const filtered = JSON.parse(JSON.stringify(body));

    // PII Detection and masking
    if (this.config.security.outputFiltering.piiDetection) {
      this.maskPII(filtered);
    }

    // Remove potentially sensitive data
    if (this.config.security.outputFiltering.sensitiveDataMasking) {
      this.maskSensitiveData(filtered);
    }

    // Check for code execution attempts in responses
    if (this.config.security.outputFiltering.codeExecutionPrevention) {
      this.sanitizeCodeInResponse(filtered);
    }

    return filtered;
  }

  private maskPII(obj: any): void {
    if (typeof obj === 'string') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => this.maskPII(item));
      return;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Mask email addresses
        if (typeof value === 'string' && validator.isEmail(value)) {
          const [local, domain] = value.split('@');
          obj[key] = `${local.slice(0, 2)}***@${domain}`;
        }
        // Mask phone numbers
        else if (typeof value === 'string' && /^\+?\d[\d\-\(\)\s]{8,}$/.test(value)) {
          obj[key] = value.slice(0, 3) + '***' + value.slice(-2);
        }
        // Mask credit card numbers
        else if (typeof value === 'string' && /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value)) {
          obj[key] = '****-****-****-' + value.slice(-4);
        }
        // Mask SSN
        else if (typeof value === 'string' && /^\d{3}-?\d{2}-?\d{4}$/.test(value)) {
          obj[key] = '***-**-' + value.slice(-4);
        }
        else if (typeof value === 'object') {
          this.maskPII(value);
        }
      }
    }
  }

  private maskSensitiveData(obj: any): void {
    const sensitiveKeys = [
      'password', 'secret', 'key', 'token', 'auth', 'credential',
      'private', 'hash', 'salt', 'signature', 'certificate'
    ];

    if (Array.isArray(obj)) {
      obj.forEach(item => this.maskSensitiveData(item));
      return;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const lowercaseKey = key.toLowerCase();
        
        if (sensitiveKeys.some(sensitive => lowercaseKey.includes(sensitive))) {
          if (typeof value === 'string' && value.length > 4) {
            obj[key] = value.slice(0, 4) + '*'.repeat(value.length - 4);
          } else {
            obj[key] = '***';
          }
        } else if (typeof value === 'object') {
          this.maskSensitiveData(value);
        }
      }
    }
  }

  private sanitizeCodeInResponse(obj: any): void {
    const dangerousPatterns = [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec\s*\(/gi,
      /passthru\s*\(/gi,
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
    ];

    if (typeof obj === 'string') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => this.sanitizeCodeInResponse(item));
      return;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          let sanitized = value;
          dangerousPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[POTENTIALLY_DANGEROUS_CODE_REMOVED]');
          });
          obj[key] = sanitized;
        } else if (typeof value === 'object') {
          this.sanitizeCodeInResponse(value);
        }
      }
    }
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      (req.connection as any)?.remoteAddress ||
      req.socket?.remoteAddress ||
      ((req.connection as any)?.socket as any)?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  // Cleanup method to remove old entries
  public cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Remove old suspicious activity records
    for (const [ip, activity] of this.suspiciousActivityCount.entries()) {
      if (now - activity.lastActivity.getTime() > oneHour) {
        this.suspiciousActivityCount.delete(ip);
      }
    }

    // Remove old blocked IPs (unblock after 24 hours)
    // In production, this would be more sophisticated
    setTimeout(() => {
      this.blockedIPs.clear();
    }, 24 * 60 * 60 * 1000);
  }
}