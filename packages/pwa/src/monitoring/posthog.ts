/**
 * PostHog Integration
 * Product analytics and user behavior tracking
 */

import type {
  MonitoringProvider,
  AnalyticsEvent,
  JSError,
  WebVitalsMetrics,
  MonitoringConfig,
  UserEvent,
  UserSession
} from './types';

export class PostHogProvider implements MonitoringProvider {
  public readonly name = 'PostHog';
  private config: MonitoringConfig['posthog'];
  private initialized = false;
  private posthog: any;
  private currentSession: UserSession | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: MonitoringConfig['posthog']) {
    this.config = config;
  }

  async initialize(config: MonitoringConfig['posthog']): Promise<void> {
    if (this.initialized || !config?.apiKey) return;

    try {
      // Import PostHog dynamically
      const posthogModule = await import('posthog-js');
      this.posthog = posthogModule.default;

      // Initialize PostHog
      this.posthog.init(config.apiKey, {
        api_host: config.host || 'https://app.posthog.com',
        
        // Capture settings
        capture_pageview: config.capture_pageview !== false,
        capture_pageleave: config.capture_pageleave !== false,
        
        // Autocapture settings
        autocapture: config.autocapture !== false,
        
        // Session recording
        session_recording: {
          enabled: config.session_recording !== false,
          maskAllInputs: true,
          maskTextFn: (text: string, element?: Element) => {
            // Mask sensitive data
            const sensitiveSelectors = [
              'input[type="password"]',
              'input[type="email"]',
              '.sensitive',
              '[data-sensitive]'
            ];
            
            if (element && sensitiveSelectors.some(sel => element.matches?.(sel))) {
              return '***';
            }
            
            return text;
          }
        },
        
        // Feature flags
        loaded: (posthog: any) => {
          if (config.feature_flags !== false) {
            this.setupFeatureFlags();
          }
        },
        
        // Person profiles
        person_profiles: config.person_profiles || 'identified_only',
        
        // Privacy settings
        respect_dnt: true,
        opt_out_capturing_by_default: false,
        
        // Cross-domain tracking
        cross_subdomain_cookie: true,
        
        // Advanced settings
        property_blacklist: ['$active_feature_flags', '$feature_flag_payloads'],
        sanitize_properties: this.sanitizeProperties.bind(this)
      });

      // Set up custom tracking
      this.setupCustomTracking();
      
      // Set up performance tracking
      this.setupPerformanceTracking();
      
      // Set up error tracking
      this.setupErrorTracking();
      
      // Set up user interaction tracking
      this.setupInteractionTracking();

      // Start flush timer
      this.startFlushTimer();

      this.initialized = true;
      console.log('[PostHog] Initialized successfully');
    } catch (error) {
      console.error('[PostHog] Failed to initialize:', error);
    }
  }

  trackEvent(event: AnalyticsEvent): void {
    if (!this.initialized) {
      this.eventQueue.push(event);
      return;
    }

    // Process queued events
    if (this.eventQueue.length > 0) {
      this.eventQueue.forEach(queuedEvent => this.sendEvent(queuedEvent));
      this.eventQueue = [];
    }

    this.sendEvent(event);
  }

  trackError(error: JSError): void {
    if (!this.initialized) return;

    this.posthog.capture('$exception', {
      $exception_type: 'JSError',
      $exception_message: error.message,
      $exception_source: error.filename,
      $exception_lineno: error.lineno,
      $exception_colno: error.colno,
      $exception_stack_trace_raw: error.stack,
      error_url: error.url,
      user_agent: error.userAgent,
      timestamp: error.timestamp
    });

    // Track error patterns
    this.trackErrorPattern(error);
  }

  trackPerformance(metrics: WebVitalsMetrics): void {
    if (!this.initialized) return;

    // Track Web Vitals
    this.posthog.capture('web_vitals_measured', {
      // Core Web Vitals
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: metrics.cls,
      inp: metrics.inp,
      
      // Additional metrics
      fcp: metrics.fcp,
      ttfb: metrics.ttfb,
      fcp_to_lcp: metrics.fcpToLcp,
      dom_content_loaded: metrics.domContentLoaded,
      load_complete: metrics.loadComplete,
      resource_load_time: metrics.resourceLoadTime,
      cache_hit_ratio: metrics.cacheHitRatio,
      time_to_interactive: metrics.timeToInteractive,
      speed_index: metrics.speedIndex,
      
      // Performance grades
      lcp_grade: this.gradeMetric('lcp', metrics.lcp),
      fid_grade: this.gradeMetric('fid', metrics.fid),
      cls_grade: this.gradeMetric('cls', metrics.cls),
      inp_grade: this.gradeMetric('inp', metrics.inp)
    });

    // Track performance issues
    this.trackPerformanceIssues(metrics);
  }

  setUser(userId: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;

    this.posthog.identify(userId, properties);
    
    // Update current session
    if (this.currentSession) {
      this.currentSession.userId = userId;
    }
  }

  startSession(sessionId: string): void {
    if (!this.initialized) return;

    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      pageViews: 0,
      events: [],
      device: this.getDeviceInfo(),
      location: this.getLocationInfo()
    };

    this.posthog.capture('session_start', {
      session_id: sessionId,
      device_info: this.currentSession.device,
      location_info: this.currentSession.location
    });

    // Set session properties
    this.posthog.register({
      $session_id: sessionId,
      $session_start_time: this.currentSession.startTime
    });
  }

  endSession(): void {
    if (!this.initialized || !this.currentSession) return;

    const endTime = Date.now();
    const duration = endTime - this.currentSession.startTime;

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;

    this.posthog.capture('session_end', {
      session_id: this.currentSession.sessionId,
      session_duration: duration,
      page_views: this.currentSession.pageViews,
      total_events: this.currentSession.events.length,
      device_info: this.currentSession.device
    });

    // Track session quality metrics
    this.trackSessionQuality(this.currentSession);

    this.currentSession = null;
  }

  private sendEvent(event: AnalyticsEvent): void {
    this.posthog.capture(event.event, {
      ...event.properties,
      $current_url: event.url,
      $referrer: event.referrer,
      $timestamp: event.timestamp,
      session_id: event.sessionId
    });

    // Add to current session
    if (this.currentSession) {
      this.currentSession.events.push({
        type: 'custom',
        name: event.event,
        properties: event.properties,
        timestamp: event.timestamp
      });

      if (event.event === '$pageview') {
        this.currentSession.pageViews++;
      }
    }
  }

  private setupCustomTracking(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.posthog.capture('page_visibility_changed', {
        visibility_state: document.visibilityState,
        hidden: document.hidden
      });
    });

    // Track connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const trackConnection = () => {
        this.posthog.capture('connection_changed', {
          effective_type: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          save_data: connection.saveData
        });
      };

      connection.addEventListener('change', trackConnection);
      
      // Initial connection tracking
      trackConnection();
    }

    // Track PWA install events
    window.addEventListener('beforeinstallprompt', (event) => {
      this.posthog.capture('pwa_install_prompt_shown', {
        can_install: true,
        prompt_outcome: 'shown'
      });
    });

    window.addEventListener('appinstalled', () => {
      this.posthog.capture('pwa_installed', {
        installation_source: 'browser_prompt'
      });
    });
  }

  private setupPerformanceTracking(): void {
    // Track resource loading performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // Track slow resources
            if (resourceEntry.duration > 1000) { // > 1 second
              this.posthog.capture('slow_resource_load', {
                resource_name: resourceEntry.name,
                resource_type: resourceEntry.initiatorType,
                duration: resourceEntry.duration,
                transfer_size: resourceEntry.transferSize,
                encoded_size: resourceEntry.encodedBodySize
              });
            }
          }
          
          if (entry.entryType === 'longtask') {
            this.posthog.capture('long_task_detected', {
              task_duration: entry.duration,
              start_time: entry.startTime
            });
          }
        });
      });

      observer.observe({ entryTypes: ['resource', 'longtask'] });
    }
  }

  private setupErrorTracking(): void {
    // Track console errors in development
    if (process.env.NODE_ENV !== 'production') {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        this.posthog.capture('console_error', {
          error_message: args.join(' '),
          stack_trace: new Error().stack
        });
        originalError.apply(console, args);
      };
    }
  }

  private setupInteractionTracking(): void {
    // Track scroll depth
    let maxScrollDepth = 0;
    const trackScrollDepth = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollPercent = Math.min(100, Math.round((scrollTop + windowHeight) / docHeight * 100));
      
      if (scrollPercent > maxScrollDepth) {
        maxScrollDepth = scrollPercent;
        
        // Track scroll milestones
        const milestones = [25, 50, 75, 90, 100];
        const milestone = milestones.find(m => scrollPercent >= m && maxScrollDepth < m);
        
        if (milestone) {
          this.posthog.capture('scroll_depth_reached', {
            scroll_depth: milestone,
            page_url: window.location.href
          });
        }
      }
    };

    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScrollDepth, 150);
    });

    // Track form interactions
    document.addEventListener('focusin', (event) => {
      const target = event.target as Element;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        this.posthog.capture('form_field_focused', {
          field_type: (target as HTMLInputElement).type || 'textarea',
          field_name: (target as HTMLInputElement).name || '',
          form_id: target.closest('form')?.id || ''
        });
      }
    });

    // Track rage clicks
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;
    
    document.addEventListener('click', (event) => {
      clickCount++;
      
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        if (clickCount >= 3) { // 3+ clicks in 2 seconds = rage click
          this.posthog.capture('rage_click_detected', {
            click_count: clickCount,
            element_tag: (event.target as Element)?.tagName,
            element_text: (event.target as Element)?.textContent?.substring(0, 100)
          });
        }
        clickCount = 0;
      }, 2000);
    });
  }

  private setupFeatureFlags(): void {
    // Feature flag change tracking
    this.posthog.onFeatureFlags(() => {
      const flags = this.posthog.getAllFlags();
      
      this.posthog.capture('feature_flags_loaded', {
        active_flags: Object.keys(flags).filter(key => flags[key]),
        total_flags: Object.keys(flags).length
      });
    });
  }

  private trackErrorPattern(error: JSError): void {
    // Track error frequency patterns
    const errorKey = `${error.filename}:${error.lineno}`;
    const errorCount = parseInt(localStorage.getItem(`error_count_${errorKey}`) || '0') + 1;
    localStorage.setItem(`error_count_${errorKey}`, errorCount.toString());
    
    if (errorCount >= 5) { // Recurring error threshold
      this.posthog.capture('recurring_error_detected', {
        error_message: error.message,
        error_location: errorKey,
        occurrence_count: errorCount
      });
    }
  }

  private trackPerformanceIssues(metrics: WebVitalsMetrics): void {
    const issues: string[] = [];
    
    // Check thresholds and identify issues
    if (metrics.lcp > 4000) issues.push('poor_lcp');
    if (metrics.fid > 300) issues.push('poor_fid');
    if (metrics.cls > 0.25) issues.push('poor_cls');
    if (metrics.inp > 500) issues.push('poor_inp');
    if (metrics.cacheHitRatio < 0.7) issues.push('low_cache_hit_ratio');
    if (metrics.timeToInteractive > 5000) issues.push('slow_interactive');

    if (issues.length > 0) {
      this.posthog.capture('performance_issues_detected', {
        issues,
        issue_count: issues.length,
        performance_score: this.calculatePerformanceScore(metrics)
      });
    }
  }

  private trackSessionQuality(session: UserSession): void {
    const quality = this.calculateSessionQuality(session);
    
    this.posthog.capture('session_quality_measured', {
      session_id: session.sessionId,
      quality_score: quality.score,
      quality_grade: quality.grade,
      engagement_time: quality.engagementTime,
      bounce_rate: quality.bounceRate,
      page_depth: session.pageViews,
      event_count: session.events.length
    });
  }

  private gradeMetric(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      inp: { good: 200, poor: 500 }
    };
    
    const threshold = thresholds[metric];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private calculatePerformanceScore(metrics: WebVitalsMetrics): number {
    const weights = { lcp: 0.25, fid: 0.25, cls: 0.25, inp: 0.25 };
    let score = 0;
    
    Object.entries(weights).forEach(([metric, weight]) => {
      const grade = this.gradeMetric(metric, metrics[metric as keyof WebVitalsMetrics]);
      const points = grade === 'good' ? 100 : grade === 'needs-improvement' ? 75 : 50;
      score += points * weight;
    });
    
    return Math.round(score);
  }

  private calculateSessionQuality(session: UserSession): {
    score: number;
    grade: 'high' | 'medium' | 'low';
    engagementTime: number;
    bounceRate: number;
  } {
    const duration = session.duration || 0;
    const pageViews = session.pageViews;
    const events = session.events.length;
    
    // Calculate engagement score
    let score = 0;
    
    // Duration scoring
    if (duration > 300000) score += 30; // 5+ minutes
    else if (duration > 60000) score += 20; // 1+ minute
    else if (duration > 10000) score += 10; // 10+ seconds
    
    // Page views scoring
    if (pageViews > 5) score += 25;
    else if (pageViews > 2) score += 15;
    else if (pageViews > 1) score += 5;
    
    // Events scoring
    if (events > 10) score += 25;
    else if (events > 5) score += 15;
    else if (events > 2) score += 5;
    
    // Interaction quality
    const hasFormInteraction = session.events.some(e => e.type === 'form_submit');
    if (hasFormInteraction) score += 20;
    
    const grade = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    const bounceRate = pageViews <= 1 ? 1 : 0;
    
    return {
      score,
      grade,
      engagementTime: duration,
      bounceRate
    };
  }

  private getDeviceInfo(): any {
    const connection = (navigator as any).connection;
    
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      touchSupport: 'ontouchstart' in window,
      connectionType: connection?.effectiveType,
      memoryInfo: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : undefined
    };
  }

  private getLocationInfo(): any {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      languages: navigator.languages
    };
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'ssn', 'credit_card'];
    const sanitized = { ...properties };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[Filtered]';
      }
    });
    
    return sanitized;
  }

  private startFlushTimer(): void {
    // Flush queued events periodically
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.eventQueue.forEach(event => this.trackEvent(event));
        this.eventQueue = [];
      }
    }, 5000); // Flush every 5 seconds
  }
}