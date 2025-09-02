/**
 * Katalyst Web Scraper - Core Engine
 * Factory pattern implementation for creating and managing scraping engines
 */

import { EventEmitter } from 'events';
import {
  type BaseScrapingConfig,
  type ErrorType,
  ItemMetadata,
  type ResultSummary,
  type ScrapedDataItem,
  type ScraperPlugin,
  type ScrapingEngine as ScrapingEngineType,
  type ScrapingError,
  type ScrapingEvent,
  type ScrapingResult,
  type ScrapingSession,
  SessionMetrics,
  SessionProgress,
  SessionStatus,
} from '../types';

/**
 * Abstract base class for all scraping engines
 */
export abstract class BaseScrapingEngine extends EventEmitter {
  protected config: BaseScrapingConfig;
  protected session: ScrapingSession;
  protected plugins: ScraperPlugin[] = [];
  protected isRunning = false;

  constructor(config: BaseScrapingConfig) {
    super();
    this.config = config;
    this.session = this.createSession(config);
  }

  /**
   * Initialize the scraping engine
   */
  abstract initialize(): Promise<void>;

  /**
   * Scrape a single URL
   */
  abstract scrapeUrl(url: string): Promise<ScrapedDataItem>;

  /**
   * Extract data from HTML content
   */
  abstract extractData(html: string, url: string): Promise<Record<string, unknown>>;

  /**
   * Cleanup resources
   */
  abstract cleanup(): Promise<void>;

  /**
   * Start scraping operation
   */
  async scrape(): Promise<ScrapingResult> {
    if (this.isRunning) {
      throw new Error('Scraping operation is already running');
    }

    this.isRunning = true;
    this.session.status = 'running';
    this.session.startTime = new Date();

    try {
      await this.executeHook('beforeSessionStart', this.config);
      this.emitEvent({
        type: 'session_start',
        timestamp: new Date(),
        sessionId: this.session.id,
        config: this.config,
      });

      await this.initialize();
      await this.executeHook('afterSessionStart', this.session);

      const urls = Array.isArray(this.config.url) ? this.config.url : [this.config.url];
      const data: ScrapedDataItem[] = [];

      this.session.progress.total = urls.length;

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        if (!this.isRunning) {
          break; // Operation was cancelled
        }

        try {
          this.session.progress.current = url;
          this.emitProgressEvent();

          const processedUrl =
            (await this.executeHook('beforeUrlProcess', url, this.config)) || url;
          this.emitEvent({
            type: 'url_start',
            timestamp: new Date(),
            sessionId: this.session.id,
            url: processedUrl,
          });

          const item = await this.scrapeUrlWithRetry(processedUrl);
          const processedItem =
            (await this.executeHook('afterUrlProcess', processedUrl, item)) || item;

          data.push(processedItem);
          this.session.progress.completed++;
          this.session.metrics.successfulRequests++;

          this.emitEvent({
            type: 'url_end',
            timestamp: new Date(),
            sessionId: this.session.id,
            url: processedUrl,
            success: true,
            data: processedItem,
          });

          this.emitEvent({
            type: 'data_extracted',
            timestamp: new Date(),
            sessionId: this.session.id,
            url: processedUrl,
            data: processedItem,
          });

          // Apply rate limiting
          if (i < urls.length - 1) {
            await this.applyRateLimit();
          }
        } catch (error) {
          const scrapingError = this.createError(url, error);
          this.session.errors.push(scrapingError);
          this.session.progress.failed++;
          this.session.metrics.failedRequests++;

          await this.executeHook('onError', scrapingError);
          this.emitEvent({
            type: 'error',
            timestamp: new Date(),
            sessionId: this.session.id,
            error: scrapingError,
          });
          this.emitEvent({
            type: 'url_end',
            timestamp: new Date(),
            sessionId: this.session.id,
            url,
            success: false,
            error: scrapingError,
          });
        }

        this.updateProgress();
      }

      this.session.status = this.session.errors.length > 0 ? 'completed' : 'completed';
      this.session.endTime = new Date();

      const result = this.createResult(data);

      await this.executeHook('beforeSessionEnd', this.session);
      const processedResult = (await this.executeHook('afterSessionEnd', result)) || result;

      this.emitEvent({
        type: 'session_end',
        timestamp: new Date(),
        sessionId: this.session.id,
        result: processedResult,
      });

      return processedResult;
    } catch (error) {
      this.session.status = 'failed';
      this.session.endTime = new Date();
      throw error;
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
  }

  /**
   * Cancel the scraping operation
   */
  cancel(): void {
    this.isRunning = false;
    this.session.status = 'cancelled';
  }

  /**
   * Add a plugin to the engine
   */
  addPlugin(plugin: ScraperPlugin): void {
    this.plugins.push(plugin);
  }

  /**
   * Remove a plugin from the engine
   */
  removePlugin(pluginName: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== pluginName);
  }

  /**
   * Get current session information
   */
  getSession(): ScrapingSession {
    return { ...this.session };
  }

  /**
   * Create a new scraping session
   */
  private createSession(config: BaseScrapingConfig): ScrapingSession {
    return {
      id: this.generateSessionId(),
      startTime: new Date(),
      config,
      status: 'pending',
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        percentage: 0,
      },
      errors: [],
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        dataExtracted: 0,
        bandwidthUsed: 0,
      },
    };
  }

  /**
   * Scrape URL with retry logic
   */
  private async scrapeUrlWithRetry(url: string): Promise<ScrapedDataItem> {
    const retryConfig = this.config.retry || {};
    const maxRetries = retryConfig.maxRetries || 3;
    const baseDelay = retryConfig.baseDelay || 1000;
    const backoffMultiplier = retryConfig.backoffMultiplier || 2;
    const maxDelay = retryConfig.maxDelay || 30000;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.scrapeUrl(url);
        const responseTime = Date.now() - startTime;

        // Update metrics
        this.session.metrics.totalRequests++;
        this.updateAverageResponseTime(responseTime);

        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries && this.shouldRetry(error, retryConfig)) {
          const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Check if an error should trigger a retry
   */
  private shouldRetry(error: unknown, retryConfig: any): boolean {
    const retryStatusCodes = retryConfig.retryStatusCodes || [408, 429, 500, 502, 503, 504];
    const retryOnNetworkError = retryConfig.retryOnNetworkError !== false;

    if (error instanceof Error) {
      // Check for network errors
      if (
        retryOnNetworkError &&
        (error.message.includes('ECONNRESET') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('ETIMEDOUT'))
      ) {
        return true;
      }

      // Check for HTTP status codes
      const statusCode = (error as any).status || (error as any).statusCode;
      if (statusCode && retryStatusCodes.includes(statusCode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(): Promise<void> {
    const rateLimit = this.config.rateLimit;
    if (!rateLimit) return;

    let delay = 0;

    if (rateLimit.delay) {
      delay = rateLimit.delay;
    } else if (rateLimit.requestsPerSecond) {
      delay = 1000 / rateLimit.requestsPerSecond;
    } else if (rateLimit.requestsPerMinute) {
      delay = 60000 / rateLimit.requestsPerMinute;
    }

    if (rateLimit.randomDelay) {
      const [min, max] = rateLimit.randomDelay;
      delay = Math.random() * (max - min) + min;
    }

    if (delay > 0) {
      await this.sleep(delay);
    }
  }

  /**
   * Execute plugin hook
   */
  private async executeHook(hookName: keyof ScraperPlugin['hooks'], ...args: any[]): Promise<any> {
    for (const plugin of this.plugins) {
      const hook = plugin.hooks[hookName];
      if (hook) {
        try {
          const result = await hook(...args);
          if (result !== undefined) {
            return result;
          }
        } catch (error) {
          console.warn(`Plugin ${plugin.name} hook ${hookName} failed:`, error);
        }
      }
    }
  }

  /**
   * Create error object
   */
  private createError(url: string, error: unknown): ScrapingError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any).status || (error as any).statusCode;

    let errorType: ErrorType = 'unknown_error';

    if (errorMessage.includes('timeout')) {
      errorType = 'timeout_error';
    } else if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ENOTFOUND')) {
      errorType = 'network_error';
    } else if (statusCode === 429) {
      errorType = 'rate_limit_error';
    } else if (statusCode === 401 || statusCode === 403) {
      errorType = 'authentication_error';
    }

    return {
      id: this.generateErrorId(),
      timestamp: new Date(),
      url,
      type: errorType,
      message: errorMessage,
      stackTrace: error instanceof Error ? error.stack : undefined,
      statusCode,
      retryCount: 0,
    };
  }

  /**
   * Create final result
   */
  private createResult(data: ScrapedDataItem[]): ScrapingResult {
    const processingTime = this.session.endTime!.getTime() - this.session.startTime.getTime();

    const summary: ResultSummary = {
      totalUrls: this.session.progress.total,
      successfulExtractions: this.session.progress.completed,
      failedExtractions: this.session.progress.failed,
      totalDataItems: data.length,
      processingTime,
      averageTimePerUrl: processingTime / this.session.progress.total,
    };

    return {
      success: this.session.status === 'completed',
      session: this.session,
      data,
      summary,
      outputFiles: [], // Will be populated by output handlers
    };
  }

  /**
   * Update progress metrics
   */
  private updateProgress(): void {
    const progress = this.session.progress;
    progress.percentage = ((progress.completed + progress.failed) / progress.total) * 100;

    // Calculate ETA
    if (progress.completed > 0) {
      const elapsed = Date.now() - this.session.startTime.getTime();
      const averageTimePerUrl = elapsed / progress.completed;
      const remaining = progress.total - progress.completed - progress.failed;
      progress.eta = remaining * averageTimePerUrl;
    }

    this.emitProgressEvent();
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const metrics = this.session.metrics;
    const totalTime = metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime;
    metrics.averageResponseTime = totalTime / metrics.totalRequests;
  }

  /**
   * Emit progress event
   */
  private emitProgressEvent(): void {
    this.emitEvent({
      type: 'progress',
      timestamp: new Date(),
      sessionId: this.session.id,
      progress: this.session.progress,
    });
  }

  /**
   * Emit scraping event
   */
  private emitEvent(event: ScrapingEvent): void {
    this.emit('scrapingEvent', event);
    this.emit(event.type, event);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Engine factory for creating scraping engines
 */
export class ScrapingEngineFactory {
  private static engines = new Map<ScrapingEngineType, typeof BaseScrapingEngine>();

  /**
   * Register a scraping engine
   */
  static registerEngine(type: ScrapingEngineType, engineClass: typeof BaseScrapingEngine): void {
    this.engines.set(type, engineClass);
  }

  /**
   * Create a scraping engine instance
   */
  static createEngine(config: BaseScrapingConfig): BaseScrapingEngine {
    const EngineClass = this.engines.get(config.engine);

    if (!EngineClass) {
      throw new Error(`Unsupported scraping engine: ${config.engine}`);
    }

    return new EngineClass(config);
  }

  /**
   * Get available engines
   */
  static getAvailableEngines(): ScrapingEngineType[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Check if engine is supported
   */
  static isEngineSupported(engine: ScrapingEngineType): boolean {
    return this.engines.has(engine);
  }
}

/**
 * Scraper manager for handling multiple concurrent sessions
 */
export class ScraperManager extends EventEmitter {
  private sessions = new Map<string, BaseScrapingEngine>();
  private maxConcurrentSessions: number;

  constructor(maxConcurrentSessions = 10) {
    super();
    this.maxConcurrentSessions = maxConcurrentSessions;
  }

  /**
   * Start a new scraping session
   */
  async startSession(config: BaseScrapingConfig): Promise<string> {
    if (this.sessions.size >= this.maxConcurrentSessions) {
      throw new Error('Maximum concurrent sessions reached');
    }

    const engine = ScrapingEngineFactory.createEngine(config);
    const sessionId = engine.getSession().id;

    // Forward events from engine
    engine.on('scrapingEvent', (event) => {
      this.emit('sessionEvent', { sessionId, event });
    });

    this.sessions.set(sessionId, engine);

    // Start scraping in background
    engine.scrape().finally(() => {
      this.sessions.delete(sessionId);
      this.emit('sessionCompleted', sessionId);
    });

    return sessionId;
  }

  /**
   * Cancel a scraping session
   */
  cancelSession(sessionId: string): boolean {
    const engine = this.sessions.get(sessionId);
    if (engine) {
      engine.cancel();
      return true;
    }
    return false;
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): ScrapingSession | null {
    const engine = this.sessions.get(sessionId);
    return engine ? engine.getSession() : null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ScrapingSession[] {
    return Array.from(this.sessions.values()).map((engine) => engine.getSession());
  }

  /**
   * Cancel all sessions
   */
  cancelAllSessions(): void {
    for (const engine of this.sessions.values()) {
      engine.cancel();
    }
  }
}
