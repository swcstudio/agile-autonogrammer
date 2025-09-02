/**
 * Stale-While-Revalidate Strategy
 * Serves cached content immediately while updating cache in background
 */

export interface StaleWhileRevalidateOptions {
  cacheName: string;
  plugins?: any[];
  matchOptions?: CacheQueryOptions;
  fetchOptions?: RequestInit;
}

export class StaleWhileRevalidateStrategy {
  private cacheName: string;
  private plugins: any[];
  private matchOptions?: CacheQueryOptions;
  private fetchOptions?: RequestInit;
  private revalidatePromises: Map<string, Promise<void>> = new Map();

  constructor(options: StaleWhileRevalidateOptions) {
    this.cacheName = options.cacheName;
    this.plugins = options.plugins || [];
    this.matchOptions = options.matchOptions;
    this.fetchOptions = options.fetchOptions;
  }

  async handle(request: Request): Promise<Response> {
    const cacheKey = this.getCacheKey(request);
    
    // Get cached response immediately
    const cachedResponse = await this.getCachedResponse(request);
    
    // Start background revalidation
    const revalidatePromise = this.revalidateCache(request);
    
    // Store promise to avoid duplicate revalidations
    if (!this.revalidatePromises.has(cacheKey)) {
      this.revalidatePromises.set(cacheKey, revalidatePromise);
      
      revalidatePromise.finally(() => {
        this.revalidatePromises.delete(cacheKey);
      });
    }
    
    if (cachedResponse) {
      // Return cached response immediately
      await this.logCacheServe(request, 'stale');
      return cachedResponse;
    }
    
    // If no cached response, wait for network
    try {
      await revalidatePromise;
      const freshResponse = await this.getCachedResponse(request);
      
      if (freshResponse) {
        await this.logCacheServe(request, 'fresh');
        return freshResponse;
      }
    } catch (error) {
      // Network failed and no cache available
      throw error;
    }
    
    // This shouldn't happen, but just in case
    throw new Error('Failed to get response from cache or network');
  }

  private async getCachedResponse(request: Request): Promise<Response | undefined> {
    const cache = await caches.open(this.cacheName);
    const response = await cache.match(request, this.matchOptions);
    
    if (response) {
      // Apply plugins
      for (const plugin of this.plugins) {
        if (plugin.cachedResponseWillBeUsed) {
          const modifiedResponse = await plugin.cachedResponseWillBeUsed({
            cacheName: this.cacheName,
            request,
            cachedResponse: response
          });
          
          if (!modifiedResponse) return undefined;
          return modifiedResponse;
        }
      }
    }
    
    return response;
  }

  private async revalidateCache(request: Request): Promise<void> {
    try {
      // Apply request plugins
      let modifiedRequest = request;
      for (const plugin of this.plugins) {
        if (plugin.requestWillFetch) {
          modifiedRequest = await plugin.requestWillFetch({
            request: modifiedRequest
          }) || modifiedRequest;
        }
      }
      
      // Fetch fresh response
      const response = await fetch(modifiedRequest, this.fetchOptions);
      
      if (!response.ok && response.status !== 304) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      // Apply response plugins
      let modifiedResponse = response;
      for (const plugin of this.plugins) {
        if (plugin.fetchDidSucceed) {
          modifiedResponse = await plugin.fetchDidSucceed({
            request: modifiedRequest,
            response: modifiedResponse
          }) || modifiedResponse;
        }
      }
      
      // Update cache
      await this.updateCache(request, modifiedResponse);
      
      // Notify clients of update
      await this.notifyUpdate(request);
    } catch (error) {
      // Log error but don't throw (background operation)
      console.error('Revalidation failed:', error);
      
      // Notify plugins of failure
      for (const plugin of this.plugins) {
        if (plugin.fetchDidFail) {
          await plugin.fetchDidFail({
            request,
            error
          });
        }
      }
    }
  }

  private async updateCache(request: Request, response: Response): Promise<void> {
    // Don't cache non-successful responses
    if (!response.ok && response.status !== 304) return;
    
    // Check cache headers
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl?.includes('no-store')) return;
    
    // Apply plugins before caching
    let modifiedResponse = response.clone();
    for (const plugin of this.plugins) {
      if (plugin.cacheWillUpdate) {
        modifiedResponse = await plugin.cacheWillUpdate({
          request,
          response: modifiedResponse
        }) || modifiedResponse;
      }
    }
    
    const cache = await caches.open(this.cacheName);
    const oldResponse = await cache.match(request);
    
    // Check if response has actually changed
    if (oldResponse && this.areResponsesEqual(oldResponse, modifiedResponse)) {
      return; // No need to update
    }
    
    await cache.put(request, modifiedResponse);
    
    // Notify plugins after caching
    for (const plugin of this.plugins) {
      if (plugin.cacheDidUpdate) {
        await plugin.cacheDidUpdate({
          cacheName: this.cacheName,
          request,
          oldResponse,
          newResponse: modifiedResponse
        });
      }
    }
  }

  private areResponsesEqual(response1: Response, response2: Response): boolean {
    // Compare ETags if available
    const etag1 = response1.headers.get('etag');
    const etag2 = response2.headers.get('etag');
    
    if (etag1 && etag2) {
      return etag1 === etag2;
    }
    
    // Compare Last-Modified if available
    const lastModified1 = response1.headers.get('last-modified');
    const lastModified2 = response2.headers.get('last-modified');
    
    if (lastModified1 && lastModified2) {
      return lastModified1 === lastModified2;
    }
    
    // Can't determine equality
    return false;
  }

  private getCacheKey(request: Request): string {
    return request.url;
  }

  private async logCacheServe(request: Request, type: 'stale' | 'fresh'): Promise<void> {
    if (typeof self !== 'undefined' && 'clients' in self) {
      const clients = await (self as any).clients.matchAll();
      clients.forEach((client: any) => {
        client.postMessage({
          type: 'STALE_WHILE_REVALIDATE',
          url: request.url,
          serveType: type,
          strategy: 'stale-while-revalidate',
          timestamp: Date.now()
        });
      });
    }
  }

  private async notifyUpdate(request: Request): Promise<void> {
    if (typeof self !== 'undefined' && 'clients' in self) {
      const clients = await (self as any).clients.matchAll();
      clients.forEach((client: any) => {
        client.postMessage({
          type: 'CACHE_UPDATED',
          url: request.url,
          strategy: 'stale-while-revalidate',
          timestamp: Date.now()
        });
      });
    }
  }
}