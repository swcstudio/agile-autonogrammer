/**
 * Network-First Strategy
 * Prioritizes fresh content from network with cache fallback
 */

export interface NetworkFirstOptions {
  cacheName: string;
  networkTimeoutSeconds?: number;
  plugins?: any[];
  matchOptions?: CacheQueryOptions;
  fetchOptions?: RequestInit;
}

export class NetworkFirstStrategy {
  private cacheName: string;
  private networkTimeout: number;
  private plugins: any[];
  private matchOptions?: CacheQueryOptions;
  private fetchOptions?: RequestInit;

  constructor(options: NetworkFirstOptions) {
    this.cacheName = options.cacheName;
    this.networkTimeout = (options.networkTimeoutSeconds || 5) * 1000;
    this.plugins = options.plugins || [];
    this.matchOptions = options.matchOptions;
    this.fetchOptions = options.fetchOptions;
  }

  async handle(request: Request): Promise<Response> {
    const logs: any[] = [];
    const startTime = Date.now();

    try {
      // Try network first
      const networkResponse = await this.fetchFromNetwork(request);
      
      logs.push({
        type: 'network',
        status: 'success',
        duration: Date.now() - startTime
      });

      // Cache the fresh response
      await this.cacheResponse(request, networkResponse.clone());
      
      await this.sendLogs(request, logs);
      return networkResponse;
    } catch (networkError) {
      logs.push({
        type: 'network',
        status: 'failed',
        error: networkError.message,
        duration: Date.now() - startTime
      });

      // Network failed, try cache
      const cachedResponse = await this.getCachedResponse(request);
      
      if (cachedResponse) {
        logs.push({
          type: 'cache',
          status: 'hit',
          stale: this.isStale(cachedResponse)
        });
        
        await this.sendLogs(request, logs);
        return cachedResponse;
      }
      
      logs.push({
        type: 'cache',
        status: 'miss'
      });
      
      await this.sendLogs(request, logs);
      throw networkError;
    }
  }

  private async fetchFromNetwork(request: Request): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.networkTimeout);
    
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
      
      const response = await fetch(modifiedRequest, {
        ...this.fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
      
      return modifiedResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Notify plugins of failure
      for (const plugin of this.plugins) {
        if (plugin.fetchDidFail) {
          await plugin.fetchDidFail({
            request,
            error
          });
        }
      }
      
      throw error;
    }
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

  private async cacheResponse(request: Request, response: Response): Promise<void> {
    // Don't cache non-successful responses
    if (!response.ok && response.status !== 304) return;
    
    // Check cache headers
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
    const oldResponse = await cache.match(request);
    
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

  private isStale(response: Response): boolean {
    const cacheControl = response.headers.get('cache-control');
    const maxAge = this.parseMaxAge(cacheControl);
    const dateHeader = response.headers.get('date');
    
    if (dateHeader && maxAge) {
      const date = new Date(dateHeader);
      const age = (Date.now() - date.getTime()) / 1000;
      return age > maxAge;
    }
    
    return false;
  }

  private parseMaxAge(cacheControl: string | null): number | null {
    if (!cacheControl) return null;
    
    const match = cacheControl.match(/max-age=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private async sendLogs(request: Request, logs: any[]): Promise<void> {
    if (typeof self !== 'undefined' && 'clients' in self) {
      const clients = await (self as any).clients.matchAll();
      clients.forEach((client: any) => {
        client.postMessage({
          type: 'NETWORK_FIRST_LOG',
          url: request.url,
          strategy: 'network-first',
          logs,
          timestamp: Date.now()
        });
      });
    }
  }
}