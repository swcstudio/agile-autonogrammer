/**
 * Cache-First Strategy
 * Prioritizes cached content for optimal performance
 */

export interface CacheFirstOptions {
  cacheName: string;
  networkTimeoutSeconds?: number;
  plugins?: any[];
  matchOptions?: CacheQueryOptions;
  fetchOptions?: RequestInit;
}

export class CacheFirstStrategy {
  private cacheName: string;
  private networkTimeout: number;
  private plugins: any[];
  private matchOptions?: CacheQueryOptions;
  private fetchOptions?: RequestInit;

  constructor(options: CacheFirstOptions) {
    this.cacheName = options.cacheName;
    this.networkTimeout = (options.networkTimeoutSeconds || 3) * 1000;
    this.plugins = options.plugins || [];
    this.matchOptions = options.matchOptions;
    this.fetchOptions = options.fetchOptions;
  }

  async handle(request: Request): Promise<Response> {
    // Try to get from cache first
    const cachedResponse = await this.getCachedResponse(request);
    
    if (cachedResponse) {
      await this.logCacheHit(request);
      return cachedResponse;
    }

    // If not in cache, fetch from network
    try {
      const networkResponse = await this.fetchFromNetwork(request);
      
      // Cache the response for future use
      await this.cacheResponse(request, networkResponse.clone());
      
      return networkResponse;
    } catch (error) {
      // If network fails, try to return stale cache if available
      const staleResponse = await this.getStaleCache(request);
      
      if (staleResponse) {
        await this.logStaleServe(request);
        return staleResponse;
      }
      
      throw error;
    }
  }

  private async getCachedResponse(request: Request): Promise<Response | undefined> {
    const cache = await caches.open(this.cacheName);
    const response = await cache.match(request, this.matchOptions);
    
    if (response) {
      // Check if cache is still valid
      const cacheControl = response.headers.get('cache-control');
      const maxAge = this.parseMaxAge(cacheControl);
      const dateHeader = response.headers.get('date');
      
      if (dateHeader && maxAge) {
        const date = new Date(dateHeader);
        const age = (Date.now() - date.getTime()) / 1000;
        
        if (age > maxAge) {
          // Cache is stale, delete it
          await cache.delete(request);
          return undefined;
        }
      }
    }
    
    return response;
  }

  private async fetchFromNetwork(request: Request): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.networkTimeout);
    
    try {
      const response = await fetch(request, {
        ...this.fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async cacheResponse(request: Request, response: Response): Promise<void> {
    // Don't cache non-successful responses
    if (!response.ok) return;
    
    // Don't cache responses with no-store directive
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl?.includes('no-store')) return;
    
    // Apply plugins before caching
    let modifiedResponse = response;
    for (const plugin of this.plugins) {
      if (plugin.cacheWillUpdate) {
        modifiedResponse = await plugin.cacheWillUpdate({
          request,
          response: modifiedResponse
        }) || modifiedResponse;
      }
    }
    
    const cache = await caches.open(this.cacheName);
    await cache.put(request, modifiedResponse);
    
    // Notify plugins after caching
    for (const plugin of this.plugins) {
      if (plugin.cacheDidUpdate) {
        await plugin.cacheDidUpdate({
          cacheName: this.cacheName,
          request,
          oldResponse: null,
          newResponse: modifiedResponse
        });
      }
    }
  }

  private async getStaleCache(request: Request): Promise<Response | undefined> {
    // Check if we have any version in cache (even if stale)
    const cache = await caches.open(this.cacheName);
    return cache.match(request, { ...this.matchOptions, ignoreVary: true });
  }

  private parseMaxAge(cacheControl: string | null): number | null {
    if (!cacheControl) return null;
    
    const match = cacheControl.match(/max-age=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private async logCacheHit(request: Request): Promise<void> {
    if (typeof self !== 'undefined' && 'clients' in self) {
      const clients = await (self as any).clients.matchAll();
      clients.forEach((client: any) => {
        client.postMessage({
          type: 'CACHE_HIT',
          url: request.url,
          strategy: 'cache-first',
          timestamp: Date.now()
        });
      });
    }
  }

  private async logStaleServe(request: Request): Promise<void> {
    if (typeof self !== 'undefined' && 'clients' in self) {
      const clients = await (self as any).clients.matchAll();
      clients.forEach((client: any) => {
        client.postMessage({
          type: 'STALE_SERVE',
          url: request.url,
          strategy: 'cache-first',
          timestamp: Date.now()
        });
      });
    }
  }
}