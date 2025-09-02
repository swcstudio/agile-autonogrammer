/**
 * Katalyst Enterprise Service Worker
 * Advanced PWA service worker with multi-tier caching, background sync, 
 * and enterprise-grade features
 */

import { CacheFirstStrategy } from './strategies/cache-first';
import { NetworkFirstStrategy } from './strategies/network-first';
import { StaleWhileRevalidateStrategy } from './strategies/stale-while-revalidate';
import { BackgroundSync } from './sync/background-sync';

// Service Worker Configuration
interface SWConfig {
  version: string;
  cacheNamePrefix: string;
  staticCacheName: string;
  dynamicCacheName: string;
  apiCacheName: string;
  precacheUrls: string[];
  offlineUrl: string;
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  enablePerformanceTracking: boolean;
  skipWaiting?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: SWConfig = {
  version: '1.0.0',
  cacheNamePrefix: 'katalyst-pwa',
  staticCacheName: 'static-v1',
  dynamicCacheName: 'dynamic-v1',
  apiCacheName: 'api-v1',
  precacheUrls: [
    '/',
    '/offline',
    '/manifest.json'
  ],
  offlineUrl: '/offline',
  enableBackgroundSync: true,
  enablePushNotifications: true,
  enablePerformanceTracking: true,
  skipWaiting: true
};

class KatalystServiceWorker {
  private config: SWConfig;
  private cacheStrategies: Map<RegExp, any> = new Map();
  private backgroundSync: BackgroundSync;
  private performanceMetrics: Map<string, number> = new Map();
  private installStartTime: number = 0;

  constructor(config: Partial<SWConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.backgroundSync = new BackgroundSync({
      maxRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
      maxRetries: 3,
      retryDelay: 5000,
      forceSyncFallback: true
    });
    
    this.setupCacheStrategies();
    this.attachEventListeners();
  }

  /**
   * Setup caching strategies for different resource types
   */
  private setupCacheStrategies(): void {
    // Static assets - Cache First (images, fonts, CSS, JS)
    this.cacheStrategies.set(
      /\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|css|js)$/i,
      new CacheFirstStrategy({
        cacheName: `${this.config.cacheNamePrefix}-${this.config.staticCacheName}`,
        networkTimeoutSeconds: 3,
        plugins: [
          {
            cacheWillUpdate: async ({ response }: any) => {
              // Only cache successful responses
              return response.status === 200 ? response : null;
            },
            cacheDidUpdate: async ({ cacheName, request, newResponse }: any) => {
              await this.logCacheUpdate('static', request.url, newResponse?.status);
            }
          }
        ]
      })
    );

    // API requests - Network First with background sync fallback
    this.cacheStrategies.set(
      /\/api\//,
      new NetworkFirstStrategy({
        cacheName: `${this.config.cacheNamePrefix}-${this.config.apiCacheName}`,
        networkTimeoutSeconds: 5,
        plugins: [
          {
            fetchDidFail: async ({ request, error }: any) => {
              // Queue failed POST/PUT/PATCH requests for background sync
              if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
                await this.backgroundSync.pushRequest(request, {
                  type: 'api',
                  error: error.message
                });
              }
            }
          }
        ]
      })
    );

    // Dynamic content - Stale While Revalidate
    this.cacheStrategies.set(
      /\/(products|users|dashboard|profile)/,
      new StaleWhileRevalidateStrategy({
        cacheName: `${this.config.cacheNamePrefix}-${this.config.dynamicCacheName}`,
        plugins: [
          {
            cacheDidUpdate: async ({ request }: any) => {
              // Notify clients of content updates
              const clients = await (self as any).clients.matchAll();
              clients.forEach((client: any) => {
                client.postMessage({
                  type: 'CONTENT_UPDATED',
                  url: request.url,
                  timestamp: Date.now()
                });
              });
            }
          }
        ]
      })
    );

    // Document requests - Network First with offline fallback
    this.cacheStrategies.set(
      /\/(|index\.html)$/,
      new NetworkFirstStrategy({
        cacheName: `${this.config.cacheNamePrefix}-${this.config.dynamicCacheName}`,
        networkTimeoutSeconds: 3
      })
    );
  }

  /**
   * Attach event listeners for service worker events
   */
  private attachEventListeners(): void {
    self.addEventListener('install', (event: any) => {
      this.installStartTime = performance.now();
      event.waitUntil(this.handleInstall(event));
    });

    self.addEventListener('activate', (event: any) => {
      event.waitUntil(this.handleActivate(event));
    });

    self.addEventListener('fetch', (event: any) => {
      event.respondWith(this.handleFetch(event));
    });

    if (this.config.enableBackgroundSync) {
      self.addEventListener('sync', (event: any) => {
        event.waitUntil(this.backgroundSync.handleSync(event));
      });
    }

    if (this.config.enablePushNotifications) {
      self.addEventListener('push', (event: any) => {
        event.waitUntil(this.handlePush(event));
      });

      self.addEventListener('notificationclick', (event: any) => {
        event.waitUntil(this.handleNotificationClick(event));
      });
    }

    // Performance tracking
    if (this.config.enablePerformanceTracking) {
      self.addEventListener('message', (event: any) => {
        this.handleMessage(event);
      });
    }
  }

  /**
   * Handle service worker installation
   */
  private async handleInstall(event: ExtendableEvent): Promise<void> {
    console.log(`[SW ${this.config.version}] Installing...`);

    if (this.config.skipWaiting) {
      (self as any).skipWaiting();
    }

    // Pre-cache essential resources
    await this.precacheResources();
    
    const installTime = performance.now() - this.installStartTime;
    this.performanceMetrics.set('install_time', installTime);
    
    console.log(`[SW ${this.config.version}] Installed in ${installTime.toFixed(2)}ms`);
  }

  /**
   * Handle service worker activation
   */
  private async handleActivate(event: ExtendableEvent): Promise<void> {
    console.log(`[SW ${this.config.version}] Activating...`);

    // Clean up old caches
    await this.cleanupOldCaches();
    
    // Take control of all clients
    await (self as any).clients.claim();
    
    // Initialize background sync
    if (this.config.enableBackgroundSync) {
      setTimeout(() => this.backgroundSync.performSync(), 1000);
    }

    console.log(`[SW ${this.config.version}] Activated`);
  }

  /**
   * Handle fetch requests with caching strategies
   */
  private async handleFetch(event: FetchEvent): Promise<Response> {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests for background sync
    if (request.method !== 'GET') {
      try {
        const response = await fetch(request);
        return response;
      } catch (error) {
        // Queue failed requests for background sync
        if (this.config.enableBackgroundSync) {
          await this.backgroundSync.pushRequest(request.clone());
        }
        throw error;
      }
    }

    // Skip external requests (unless configured otherwise)
    if (url.origin !== location.origin) {
      return fetch(request);
    }

    // Find matching caching strategy
    const matchingStrategy = this.findMatchingStrategy(request);
    
    if (matchingStrategy) {
      const startTime = performance.now();
      
      try {
        const response = await matchingStrategy.handle(request);
        
        if (this.config.enablePerformanceTracking) {
          const duration = performance.now() - startTime;
          await this.trackPerformance(request.url, duration, 'hit');
        }
        
        return response;
      } catch (error) {
        if (this.config.enablePerformanceTracking) {
          const duration = performance.now() - startTime;
          await this.trackPerformance(request.url, duration, 'miss');
        }
        
        // Fallback to offline page for navigation requests
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match(this.config.offlineUrl);
          if (offlineResponse) {
            return offlineResponse;
          }
        }
        
        throw error;
      }
    }

    // No matching strategy - use default network-first
    return this.handleDefaultRequest(request);
  }

  /**
   * Find matching caching strategy for request
   */
  private findMatchingStrategy(request: Request): any {
    for (const [pattern, strategy] of this.cacheStrategies) {
      if (pattern.test(request.url)) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * Handle requests with no specific strategy
   */
  private async handleDefaultRequest(request: Request): Promise<Response> {
    try {
      return await fetch(request);
    } catch (error) {
      // Try cache as last resort
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }

  /**
   * Pre-cache essential resources
   */
  private async precacheResources(): Promise<void> {
    const cache = await caches.open(
      `${this.config.cacheNamePrefix}-${this.config.staticCacheName}`
    );
    
    const precachePromises = this.config.precacheUrls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`Failed to precache ${url}:`, error);
      }
    });
    
    await Promise.allSettled(precachePromises);
  }

  /**
   * Clean up old cache versions
   */
  private async cleanupOldCaches(): Promise<void> {
    const cacheNames = await caches.keys();
    const currentCaches = [
      `${this.config.cacheNamePrefix}-${this.config.staticCacheName}`,
      `${this.config.cacheNamePrefix}-${this.config.dynamicCacheName}`,
      `${this.config.cacheNamePrefix}-${this.config.apiCacheName}`
    ];
    
    const deletePromises = cacheNames
      .filter(name => 
        name.startsWith(this.config.cacheNamePrefix) &&
        !currentCaches.includes(name)
      )
      .map(name => caches.delete(name));
    
    await Promise.all(deletePromises);
  }

  /**
   * Handle push notifications
   */
  private async handlePush(event: PushEvent): Promise<void> {
    const data = event.data ? event.data.json() : {};
    
    const options = {
      body: data.body || 'New notification from Katalyst',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      image: data.image,
      tag: data.tag || 'katalyst-notification',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {}
    };

    await (self as any).registration.showNotification(
      data.title || 'Katalyst',
      options
    );
  }

  /**
   * Handle notification clicks
   */
  private async handleNotificationClick(event: NotificationEvent): Promise<void> {
    event.notification.close();

    const data = event.notification.data || {};
    const url = data.url || '/';

    const clients = await (self as any).clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // Try to focus existing window
    for (const client of clients) {
      if (client.url.includes(url) && 'focus' in client) {
        await client.focus();
        return;
      }
    }

    // Open new window
    await (self as any).clients.openWindow(url);
  }

  /**
   * Handle messages from clients
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    const { type, data } = event.data || {};

    switch (type) {
      case 'GET_PERFORMANCE_METRICS':
        event.ports[0].postMessage({
          type: 'PERFORMANCE_METRICS',
          data: Object.fromEntries(this.performanceMetrics)
        });
        break;

      case 'CLEAR_CACHE':
        await this.clearAllCaches();
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
        break;

      case 'UPDATE_CONFIG':
        this.config = { ...this.config, ...data };
        event.ports[0].postMessage({ type: 'CONFIG_UPDATED' });
        break;
    }
  }

  /**
   * Track performance metrics
   */
  private async trackPerformance(
    url: string,
    duration: number,
    result: 'hit' | 'miss'
  ): Promise<void> {
    // Store metrics (simplified)
    this.performanceMetrics.set(`${url}_${result}`, duration);
    
    // Send to analytics if available
    const clients = await (self as any).clients.matchAll();
    clients.forEach((client: any) => {
      client.postMessage({
        type: 'PERFORMANCE_METRIC',
        data: {
          url,
          duration,
          result,
          timestamp: Date.now()
        }
      });
    });
  }

  /**
   * Log cache updates
   */
  private async logCacheUpdate(
    type: string,
    url: string,
    status?: number
  ): Promise<void> {
    const clients = await (self as any).clients.matchAll();
    clients.forEach((client: any) => {
      client.postMessage({
        type: 'CACHE_UPDATE',
        data: {
          cacheType: type,
          url,
          status,
          timestamp: Date.now()
        }
      });
    });
  }

  /**
   * Clear all caches
   */
  private async clearAllCaches(): Promise<void> {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames
      .filter(name => name.startsWith(this.config.cacheNamePrefix))
      .map(name => caches.delete(name));
    
    await Promise.all(deletePromises);
  }
}

// Initialize the service worker
new KatalystServiceWorker();

export { KatalystServiceWorker };