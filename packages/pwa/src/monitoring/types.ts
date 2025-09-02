/**
 * Monitoring and Analytics Types
 * Enterprise-grade monitoring, analytics, and observability types
 */

// Core Web Vitals and Performance Metrics
export interface WebVitalsMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  inp: number; // Interaction to Next Paint (new metric replacing FID)
  
  // Other Performance Metrics
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  fcpToLcp: number; // Time between FCP and LCP
  
  // Navigation Timing
  domContentLoaded: number;
  loadComplete: number;
  
  // Resource Timing
  resourceLoadTime: number;
  cacheHitRatio: number;
  
  // Custom Metrics
  timeToInteractive: number;
  speedIndex: number;
}

export interface PWAMetrics {
  // Installation
  installPromptShown: boolean;
  installAccepted: boolean;
  installTime?: number;
  
  // Usage
  standalone: boolean;
  displayMode: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape';
  
  // Service Worker
  serviceWorkerStatus: 'installing' | 'installed' | 'activating' | 'activated' | 'redundant';
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  backgroundSyncEnabled: boolean;
  
  // Offline
  offlineUsage: boolean;
  offlineDuration?: number;
  queuedRequests: number;
}

export interface ErrorMetrics {
  jsErrors: JSError[];
  networkErrors: NetworkError[];
  cspViolations: CSPViolation[];
  unhandledRejections: UnhandledRejection[];
}

export interface JSError {
  message: string;
  filename: string;
  lineno: number;
  colno: number;
  stack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
}

export interface NetworkError {
  url: string;
  method: string;
  status: number;
  statusText: string;
  responseTime: number;
  timestamp: number;
  retryCount?: number;
}

export interface CSPViolation {
  blockedURI: string;
  violatedDirective: string;
  originalPolicy: string;
  sourceFile: string;
  lineNumber: number;
  timestamp: number;
}

export interface UnhandledRejection {
  reason: string;
  stack?: string;
  timestamp: number;
  url: string;
}

// User Analytics
export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  events: UserEvent[];
  device: DeviceInfo;
  location: GeolocationInfo;
}

export interface UserEvent {
  type: 'page_view' | 'click' | 'scroll' | 'form_submit' | 'custom';
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  element?: {
    tagName: string;
    className: string;
    id: string;
    innerText: string;
  };
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  viewportSize: string;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  connectionType?: string;
  batteryLevel?: number;
  memoryInfo?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface GeolocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
}

// Configuration Types
export interface MonitoringConfig {
  // Sentry Configuration
  sentry?: {
    dsn: string;
    environment: string;
    release?: string;
    sampleRate: number;
    tracesSampleRate: number;
    beforeSend?: (event: any) => any;
    integrations?: any[];
  };
  
  // PostHog Configuration
  posthog?: {
    apiKey: string;
    host?: string;
    capture_pageview: boolean;
    capture_pageleave: boolean;
    autocapture: boolean;
    session_recording: boolean;
    feature_flags: boolean;
    person_profiles: 'always' | 'never' | 'identified_only';
  };
  
  // Web Vitals
  webVitals?: {
    enabled: boolean;
    reportAllChanges: boolean;
    thresholds: {
      lcp: { good: number; needs_improvement: number };
      fid: { good: number; needs_improvement: number };
      cls: { good: number; needs_improvement: number };
      inp: { good: number; needs_improvement: number };
    };
  };
  
  // Custom Analytics
  customAnalytics?: {
    endpoint: string;
    apiKey: string;
    batchSize: number;
    flushInterval: number;
  };
  
  // Privacy
  privacy?: {
    respectDNT: boolean;
    anonymizeIP: boolean;
    cookieConsent: boolean;
    gdprCompliant: boolean;
  };
}

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: number;
  url: string;
  referrer: string;
  userAgent: string;
}

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  [key: string]: any;
}

export interface ResourceTiming extends PerformanceEntry {
  initiatorType: string;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  responseStart: number;
  responseEnd: number;
}

export interface NavigationTiming extends PerformanceEntry {
  unloadEventStart: number;
  unloadEventEnd: number;
  redirectStart: number;
  redirectEnd: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domLoading: number;
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  domComplete: number;
  loadEventStart: number;
  loadEventEnd: number;
}

// Monitoring Provider Interfaces
export interface MonitoringProvider {
  name: string;
  initialize(config: any): Promise<void>;
  trackEvent(event: AnalyticsEvent): void;
  trackError(error: JSError): void;
  trackPerformance(metrics: WebVitalsMetrics): void;
  setUser(userId: string, properties?: Record<string, any>): void;
  startSession(sessionId: string): void;
  endSession(): void;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  timeWindow: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notifications: {
    email?: string[];
    webhook?: string;
    slack?: string;
  };
}

export interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  inp: number;
  totalBlockingTime: number;
  speedIndex: number;
  bundleSize: number;
  imageOptimization: number;
}

export interface A11yMetrics {
  violations: A11yViolation[];
  score: number;
  passedRules: number;
  failedRules: number;
  manualRules: number;
}

export interface A11yViolation {
  id: string;
  description: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  helpUrl: string;
  nodes: {
    html: string;
    target: string[];
    failureSummary: string;
  }[];
}