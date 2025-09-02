/**
 * Service Worker Manager
 * Advanced caching and offline strategies
 */

import type { PWAConfig, RuntimeCacheConfig } from '../types';

export class ServiceWorkerManager {
  private config: PWAConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  
  constructor(config: PWAConfig) {
    this.config = config;
  }

  /**
   * Register service worker
   */
  async register(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    // Generate service worker code
    const swCode = this.generateServiceWorkerCode();
    const swBlob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(swBlob);

    try {
      this.registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
        updateViaCache: 'none'
      });

      // Check for updates
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.handleControllerChange();
      });

      console.log('Service Worker registered:', this.registration);
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Generate service worker code
   */
  private generateServiceWorkerCode(): string {
    const { offlineStrategy, precacheUrls, runtimeCaching } = this.config;
    
    return `
// Katalyst PWA Service Worker
// Generated at: ${new Date().toISOString()}

const CACHE_VERSION = 'v${this.config.version}';
const CACHE_NAME = 'katalyst-pwa-' + CACHE_VERSION;
const RUNTIME_CACHE = 'katalyst-runtime-' + CACHE_VERSION;
const IMAGE_CACHE = 'katalyst-images-' + CACHE_VERSION;
const API_CACHE = 'katalyst-api-' + CACHE_VERSION;

// Precache URLs
const PRECACHE_URLS = ${JSON.stringify(precacheUrls || [])};

// Cache strategies
const OFFLINE_STRATEGY = '${offlineStrategy}';

// Runtime caching rules
const RUNTIME_RULES = ${JSON.stringify(runtimeCaching || [])};

// Install event - precache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching resources...');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Precache complete');
        // Force activation
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName.startsWith('katalyst-') && 
                     !cacheName.includes(CACHE_VERSION);
            })
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        // Take control of all pages
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Apply runtime caching rules
  const rule = findMatchingRule(url, RUNTIME_RULES);
  
  if (rule) {
    event.respondWith(applyCacheStrategy(request, rule));
    return;
  }
  
  // Default strategy based on resource type
  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isApiRequest(request)) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else {
    event.respondWith(applyDefaultStrategy(request));
  }
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_URLS':
      cacheUrls(data.urls);
      break;
    case 'CLEAR_CACHE':
      clearCache(data.cacheName);
      break;
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'katalyst-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Katalyst PWA';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'katalyst-notification',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  return new Response('Not found in cache', { status: 404 });
}

// Apply default strategy
async function applyDefaultStrategy(request) {
  switch (OFFLINE_STRATEGY) {
    case 'cache-first':
      return cacheFirst(request, CACHE_NAME);
    case 'network-first':
      return networkFirst(request, CACHE_NAME);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, CACHE_NAME);
    case 'cache-only':
      return cacheOnly(request, CACHE_NAME);
    case 'network-only':
      return networkOnly(request);
    default:
      return networkFirst(request, CACHE_NAME);
  }
}

// Apply cache strategy from rule
async function applyCacheStrategy(request, rule) {
  const cacheName = rule.options?.cacheName || RUNTIME_CACHE;
  
  switch (rule.handler) {
    case 'CacheFirst':
      return cacheFirst(request, cacheName);
    case 'NetworkFirst':
      return networkFirst(request, cacheName);
    case 'StaleWhileRevalidate':
      return staleWhileRevalidate(request, cacheName);
    case 'NetworkOnly':
      return networkOnly(request);
    case 'CacheOnly':
      return cacheOnly(request, cacheName);
    default:
      return networkFirst(request, cacheName);
  }
}

// Helper functions
function findMatchingRule(url, rules) {
  return rules.find(rule => {
    if (typeof rule.urlPattern === 'string') {
      return url.href.includes(rule.urlPattern);
    }
    if (rule.urlPattern instanceof RegExp) {
      return rule.urlPattern.test(url.href);
    }
    return false;
  });
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return /\\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         url.hostname.includes('api.') ||
         request.headers.get('Accept')?.includes('application/json');
}

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  return cache.addAll(urls);
}

async function clearCache(cacheName) {
  if (cacheName) {
    return caches.delete(cacheName);
  }
  
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames
      .filter(name => name.startsWith('katalyst-'))
      .map(name => caches.delete(name))
  );
}

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('katalyst-')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
  }
  
  return totalSize;
}

async function syncOfflineData() {
  // Implement offline data sync
  console.log('[SW] Syncing offline data...');
  
  // Get offline queue from IndexedDB
  // Send queued requests
  // Clear queue on success
  
  return Promise.resolve();
}

console.log('[SW] Service Worker loaded');
`;
  }

  /**
   * Handle update found
   */
  private handleUpdateFound(): void {
    const newWorker = this.registration?.installing;
    
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          this.updateAvailable = true;
          console.log('New service worker available');
        }
      });
    }
  }

  /**
   * Handle controller change
   */
  private handleControllerChange(): void {
    console.log('Service worker controller changed');
    // Reload the page to use the new service worker
    window.location.reload();
  }

  /**
   * Check for updates
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.registration) return false;
    
    try {
      await this.registration.update();
      return this.updateAvailable;
    } catch (error) {
      console.error('Update check failed:', error);
      return false;
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!navigator.serviceWorker.controller) return;
    
    navigator.serviceWorker.controller.postMessage({
      type: 'SKIP_WAITING'
    });
  }

  /**
   * Cache specific URLs
   */
  async cacheUrls(urls: string[]): Promise<void> {
    if (!navigator.serviceWorker.controller) return;
    
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_URLS',
      data: { urls }
    });
  }

  /**
   * Clear cache
   */
  async clearCache(cacheName?: string): Promise<void> {
    if (!navigator.serviceWorker.controller) return;
    
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE',
      data: { cacheName }
    });
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve(0);
        return;
      }
      
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data.size);
      };
      
      navigator.serviceWorker.controller.postMessage({
        type: 'GET_CACHE_SIZE'
      }, [channel.port2]);
    });
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<void> {
    if (!this.registration) return;
    
    await this.registration.unregister();
    this.registration = null;
  }
}