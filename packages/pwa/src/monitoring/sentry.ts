/**
 * Sentry Integration
 * Error tracking and performance monitoring
 */

import type {
  MonitoringProvider,
  JSError,
  AnalyticsEvent,
  WebVitalsMetrics,
  MonitoringConfig
} from './types';

export class SentryProvider implements MonitoringProvider {
  public readonly name = 'Sentry';
  private config: MonitoringConfig['sentry'];
  private initialized = false;
  private Sentry: any;

  constructor(config: MonitoringConfig['sentry']) {
    this.config = config;
  }

  async initialize(config: MonitoringConfig['sentry']): Promise<void> {
    if (this.initialized || !config?.dsn) return;

    try {
      // Import Sentry dynamically to reduce initial bundle size
      const sentryModule = await import('@sentry/browser');
      const { Integrations } = await import('@sentry/tracing');
      
      this.Sentry = sentryModule;
      
      // Initialize Sentry with configuration
      this.Sentry.init({
        dsn: config.dsn,
        environment: config.environment || 'production',
        release: config.release,
        sampleRate: config.sampleRate || 0.1,
        tracesSampleRate: config.tracesSampleRate || 0.1,
        beforeSend: config.beforeSend || this.beforeSend.bind(this),
        integrations: [
          new Integrations.BrowserTracing({
            // Set up automatic route change tracking for SPAs
            routingInstrumentation: this.Sentry.routingInstrumentation,
          }),
          ...(config.integrations || [])
        ],
        
        // Additional configuration
        autoSessionTracking: true,
        sendClientReports: true,
        
        // Performance monitoring
        enableTracing: true,
        
        // Privacy settings
        sendDefaultPii: false,
        beforeBreadcrumb: this.beforeBreadcrumb.bind(this)
      });

      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      // Set up performance monitoring
      this.setupPerformanceMonitoring();
      
      // Set up custom instrumentation
      this.setupCustomInstrumentation();

      this.initialized = true;
      console.log('[Sentry] Initialized successfully');
    } catch (error) {
      console.error('[Sentry] Failed to initialize:', error);
    }
  }

  trackEvent(event: AnalyticsEvent): void {
    if (!this.initialized) return;

    // Sentry breadcrumb for event tracking
    this.Sentry.addBreadcrumb({
      category: 'user-action',
      message: event.event,
      level: 'info',
      data: {
        properties: event.properties,
        url: event.url,
        timestamp: event.timestamp
      }
    });

    // Custom event tracking
    this.Sentry.captureMessage(`User Event: ${event.event}`, 'info');
  }

  trackError(error: JSError): void {
    if (!this.initialized) return;

    const sentryError = new Error(error.message);
    sentryError.name = 'JSError';
    sentryError.stack = error.stack;

    // Add context
    this.Sentry.withScope((scope: any) => {
      scope.setTag('error_type', 'javascript');
      scope.setContext('error_details', {
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
        userAgent: error.userAgent,
        url: error.url
      });
      
      if (error.userId) {
        scope.setUser({ id: error.userId });
      }
      
      scope.setLevel('error');
      this.Sentry.captureException(sentryError);
    });
  }

  trackPerformance(metrics: WebVitalsMetrics): void {
    if (!this.initialized) return;

    // Create performance transaction
    const transaction = this.Sentry.startTransaction({
      name: 'Web Vitals Measurement',
      op: 'web-vitals'
    });

    // Add measurements
    transaction.setMeasurement('lcp', metrics.lcp, 'millisecond');
    transaction.setMeasurement('fid', metrics.fid, 'millisecond');
    transaction.setMeasurement('cls', metrics.cls, 'ratio');
    transaction.setMeasurement('inp', metrics.inp, 'millisecond');
    transaction.setMeasurement('fcp', metrics.fcp, 'millisecond');
    transaction.setMeasurement('ttfb', metrics.ttfb, 'millisecond');

    // Set performance context
    this.Sentry.setContext('web_vitals', {
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: metrics.cls,
      inp: metrics.inp,
      fcp: metrics.fcp,
      ttfb: metrics.ttfb,
      cacheHitRatio: metrics.cacheHitRatio,
      timeToInteractive: metrics.timeToInteractive,
      speedIndex: metrics.speedIndex
    });

    // Performance alerts
    this.checkPerformanceThresholds(metrics);

    transaction.finish();
  }

  setUser(userId: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;

    this.Sentry.setUser({
      id: userId,
      ...properties
    });
  }

  startSession(sessionId: string): void {
    if (!this.initialized) return;

    this.Sentry.setTag('session_id', sessionId);
    this.Sentry.addBreadcrumb({
      category: 'session',
      message: 'Session started',
      level: 'info',
      data: { sessionId }
    });
  }

  endSession(): void {
    if (!this.initialized) return;

    this.Sentry.addBreadcrumb({
      category: 'session',
      message: 'Session ended',
      level: 'info'
    });
  }

  private beforeSend(event: any, hint: any): any {
    // Filter out noisy errors
    const noisyErrors = [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Loading chunk',
      'ChunkLoadError'
    ];

    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.value && noisyErrors.some(noise => error.value.includes(noise))) {
        return null; // Don't send noisy errors
      }
    }

    // Add additional context
    if (event.request) {
      event.request.headers = this.sanitizeHeaders(event.request.headers);
    }

    return event;
  }

  private beforeBreadcrumb(breadcrumb: any): any {
    // Filter sensitive data from breadcrumbs
    if (breadcrumb.category === 'fetch' && breadcrumb.data) {
      breadcrumb.data = this.sanitizeRequestData(breadcrumb.data);
    }

    return breadcrumb;
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[Filtered]';
      }
    });
    
    return sanitized;
  }

  private sanitizeRequestData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'api_key', 'secret', 'ssn', 'credit_card'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[Filtered]';
      }
    });
    
    return sanitized;
  }

  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.Sentry.captureException(event.reason);
    });

    // CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      this.Sentry.withScope((scope: any) => {
        scope.setTag('violation_type', 'csp');
        scope.setContext('csp_violation', {
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          originalPolicy: event.originalPolicy,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber
        });
        
        this.Sentry.captureMessage(`CSP Violation: ${event.violatedDirective}`, 'warning');
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        // Resource loading error
        const target = event.target as Element;
        this.Sentry.withScope((scope: any) => {
          scope.setTag('error_type', 'resource');
          scope.setContext('resource_error', {
            tagName: target.tagName,
            source: (target as any).src || (target as any).href,
            outerHTML: target.outerHTML.substring(0, 200)
          });
          
          this.Sentry.captureMessage(`Resource loading failed: ${target.tagName}`, 'error');
        });
      }
    }, true);
  }

  private setupPerformanceMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task threshold
              this.Sentry.withScope((scope: any) => {
                scope.setTag('performance_issue', 'long_task');
                scope.setContext('long_task', {
                  name: entry.name,
                  duration: entry.duration,
                  startTime: entry.startTime
                });
                
                this.Sentry.captureMessage(`Long Task: ${entry.duration}ms`, 'warning');
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('[Sentry] Failed to set up long task observer:', error);
      }
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usage > 0.9) { // High memory usage
          this.Sentry.withScope((scope: any) => {
            scope.setTag('performance_issue', 'high_memory');
            scope.setContext('memory_usage', {
              used: memory.usedJSHeapSize,
              total: memory.totalJSHeapSize,
              limit: memory.jsHeapSizeLimit,
              usage: usage * 100
            });
            
            this.Sentry.captureMessage(`High Memory Usage: ${(usage * 100).toFixed(1)}%`, 'warning');
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private setupCustomInstrumentation(): void {
    // Instrument fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      const method = config?.method || 'GET';
      
      const span = this.Sentry.getCurrentHub().getScope()?.getTransaction()?.startChild({
        op: 'http.client',
        description: `${method} ${url}`
      });
      
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        span?.setTag('http.status_code', response.status);
        span?.setMeasurement('http.response_time', duration, 'millisecond');
        
        if (!response.ok) {
          span?.setTag('error', true);
          this.Sentry.addBreadcrumb({
            category: 'http',
            message: `${method} ${url}`,
            level: 'warning',
            data: {
              status: response.status,
              statusText: response.statusText,
              duration
            }
          });
        }
        
        span?.finish();
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        span?.setTag('error', true);
        span?.setMeasurement('http.response_time', duration, 'millisecond');
        
        this.Sentry.captureException(error);
        span?.finish();
        throw error;
      }
    };
  }

  private checkPerformanceThresholds(metrics: WebVitalsMetrics): void {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      inp: { good: 200, poor: 500 }
    };

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = metrics[metric as keyof WebVitalsMetrics];
      let level: 'good' | 'needs-improvement' | 'poor' = 'good';
      
      if (value > threshold.poor) {
        level = 'poor';
      } else if (value > threshold.good) {
        level = 'needs-improvement';
      }
      
      if (level !== 'good') {
        this.Sentry.withScope((scope: any) => {
          scope.setTag('performance_issue', `poor_${metric}`);
          scope.setLevel(level === 'poor' ? 'error' : 'warning');
          
          this.Sentry.captureMessage(
            `Poor ${metric.toUpperCase()}: ${value}ms (threshold: ${threshold.good}ms)`,
            level === 'poor' ? 'error' : 'warning'
          );
        });
      }
    });
  }
}