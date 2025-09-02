/**
 * Advanced HTTP Client
 * Feature-rich HTTP client with interceptors, retries, and caching
 */

import { EventEmitter } from 'events';

export interface HttpRequestConfig {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer' | 'stream';
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
  onUploadProgress?: (progress: ProgressEvent) => void;
  onDownloadProgress?: (progress: ProgressEvent) => void;
  signal?: AbortSignal;
  cache?: RequestCache;
  mode?: RequestMode;
  credentials?: RequestCredentials;
  retry?: RetryConfig;
  compress?: boolean;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: HttpRequestConfig;
  request?: Request;
  duration?: number;
}

export interface HttpError extends Error {
  config: HttpRequestConfig;
  request?: Request;
  response?: HttpResponse;
  code?: string;
  isTimeout?: boolean;
  isNetworkError?: boolean;
}

export interface RetryConfig {
  retries?: number;
  retryDelay?: (retryCount: number) => number;
  retryCondition?: (error: HttpError) => boolean;
  shouldResetTimeout?: boolean;
}

export interface InterceptorManager<T> {
  use(
    onFulfilled?: (value: T) => T | Promise<T>,
    onRejected?: (error: any) => any
  ): number;
  eject(id: number): void;
  clear(): void;
}

interface Interceptor<T> {
  fulfilled?: (value: T) => T | Promise<T>;
  rejected?: (error: any) => any;
}

/**
 * HTTP Client
 */
export class HttpClient extends EventEmitter {
  private defaults: HttpRequestConfig;
  private requestInterceptors: Map<number, Interceptor<HttpRequestConfig>> = new Map();
  private responseInterceptors: Map<number, Interceptor<HttpResponse>> = new Map();
  private interceptorId = 0;
  private cache: Map<string, { response: HttpResponse; expires: number }> = new Map();

  constructor(defaults: HttpRequestConfig = {}) {
    super();
    this.defaults = {
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300,
      ...defaults
    };
  }

  /**
   * Request interceptors
   */
  get interceptors() {
    return {
      request: this.createInterceptorManager(this.requestInterceptors),
      response: this.createInterceptorManager(this.responseInterceptors)
    };
  }

  /**
   * Main request method
   */
  async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const mergedConfig = this.mergeConfig(config);
    
    // Apply request interceptors
    let finalConfig = mergedConfig;
    for (const interceptor of this.requestInterceptors.values()) {
      if (interceptor.fulfilled) {
        try {
          finalConfig = await interceptor.fulfilled(finalConfig);
        } catch (error) {
          if (interceptor.rejected) {
            finalConfig = await interceptor.rejected(error);
          } else {
            throw error;
          }
        }
      }
    }

    // Check cache
    const cacheKey = this.getCacheKey(finalConfig);
    if (finalConfig.method === 'GET' && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (cached.expires > Date.now()) {
        this.emit('cache-hit', cacheKey);
        return cached.response as HttpResponse<T>;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Execute request with retries
    let response: HttpResponse<T>;
    const startTime = Date.now();
    
    try {
      response = await this.executeWithRetry<T>(finalConfig);
      response.duration = Date.now() - startTime;
      
      // Cache successful GET requests
      if (finalConfig.method === 'GET' && response.status === 200) {
        const ttl = this.extractCacheTTL(response.headers);
        if (ttl > 0) {
          this.cache.set(cacheKey, {
            response,
            expires: Date.now() + ttl
          });
          this.emit('cache-set', cacheKey);
        }
      }
    } catch (error) {
      // Apply response interceptors for errors
      let finalError = error;
      for (const interceptor of this.responseInterceptors.values()) {
        if (interceptor.rejected) {
          try {
            finalError = await interceptor.rejected(finalError);
          } catch (rejectedError) {
            finalError = rejectedError;
          }
        }
      }
      throw finalError;
    }

    // Apply response interceptors
    let finalResponse = response;
    for (const interceptor of this.responseInterceptors.values()) {
      if (interceptor.fulfilled) {
        try {
          finalResponse = await interceptor.fulfilled(finalResponse);
        } catch (error) {
          if (interceptor.rejected) {
            finalResponse = await interceptor.rejected(error);
          } else {
            throw error;
          }
        }
      }
    }

    this.emit('response', finalResponse);
    return finalResponse;
  }

  /**
   * Convenience methods
   */
  get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  head<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'HEAD', url });
  }

  options<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'OPTIONS', url });
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    config: HttpRequestConfig,
    retryCount = 0
  ): Promise<HttpResponse<T>> {
    try {
      return await this.executeRequest<T>(config);
    } catch (error) {
      const httpError = error as HttpError;
      const retryConfig = config.retry || {};
      const maxRetries = retryConfig.retries || 0;
      
      if (retryCount < maxRetries) {
        const shouldRetry = retryConfig.retryCondition 
          ? retryConfig.retryCondition(httpError)
          : this.defaultRetryCondition(httpError);
        
        if (shouldRetry) {
          const delay = retryConfig.retryDelay 
            ? retryConfig.retryDelay(retryCount)
            : this.defaultRetryDelay(retryCount);
          
          this.emit('retry', { config, retryCount, delay, error: httpError });
          
          await this.sleep(delay);
          
          if (retryConfig.shouldResetTimeout) {
            config.timeout = this.defaults.timeout;
          }
          
          return this.executeWithRetry<T>(config, retryCount + 1);
        }
      }
      
      throw httpError;
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const url = this.buildURL(config.url!, config.params);
    const headers = this.buildHeaders(config);
    const body = this.buildBody(config);

    const controller = new AbortController();
    const timeoutId = config.timeout
      ? setTimeout(() => controller.abort(), config.timeout)
      : null;

    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers,
        body,
        signal: config.signal || controller.signal,
        credentials: config.credentials || (config.withCredentials ? 'include' : 'same-origin'),
        mode: config.mode,
        cache: config.cache
      });

      if (timeoutId) clearTimeout(timeoutId);

      const data = await this.parseResponse<T>(response, config);

      const httpResponse: HttpResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config,
        request: response
      };

      if (!config.validateStatus || config.validateStatus(response.status)) {
        return httpResponse;
      } else {
        const error: HttpError = new Error(
          `Request failed with status code ${response.status}`
        ) as HttpError;
        error.config = config;
        error.response = httpResponse;
        throw error;
      }
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError: HttpError = new Error('Request timeout') as HttpError;
        timeoutError.config = config;
        timeoutError.isTimeout = true;
        timeoutError.code = 'ECONNABORTED';
        throw timeoutError;
      }
      
      if (!error.response) {
        const networkError: HttpError = error as HttpError;
        networkError.config = config;
        networkError.isNetworkError = true;
        networkError.code = error.code || 'NETWORK_ERROR';
      }
      
      throw error;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(url: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${searchParams.toString()}`;
  }

  /**
   * Build request headers
   */
  private buildHeaders(config: HttpRequestConfig): Headers {
    const headers = new Headers(config.headers);
    
    // Set default content type for JSON data
    if (config.data && !headers.has('Content-Type')) {
      if (typeof config.data === 'object' && !(config.data instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }
    }
    
    // Add default headers
    if (this.defaults.headers) {
      for (const [key, value] of Object.entries(this.defaults.headers)) {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      }
    }
    
    return headers;
  }

  /**
   * Build request body
   */
  private buildBody(config: HttpRequestConfig): any {
    if (!config.data) return null;
    
    if (config.data instanceof FormData || 
        config.data instanceof Blob ||
        config.data instanceof ArrayBuffer ||
        config.data instanceof ReadableStream) {
      return config.data;
    }
    
    if (typeof config.data === 'object') {
      return JSON.stringify(config.data);
    }
    
    return config.data;
  }

  /**
   * Parse response based on type
   */
  private async parseResponse<T>(response: Response, config: HttpRequestConfig): Promise<T> {
    const responseType = config.responseType || 'json';
    
    switch (responseType) {
      case 'json':
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      case 'text':
        return await response.text() as any;
      case 'blob':
        return await response.blob() as any;
      case 'arraybuffer':
        return await response.arrayBuffer() as any;
      case 'stream':
        return response.body as any;
      default:
        return await response.json();
    }
  }

  /**
   * Merge configurations
   */
  private mergeConfig(config: HttpRequestConfig): HttpRequestConfig {
    return {
      ...this.defaults,
      ...config,
      headers: {
        ...this.defaults.headers,
        ...config.headers
      }
    };
  }

  /**
   * Create interceptor manager
   */
  private createInterceptorManager<T>(
    interceptors: Map<number, Interceptor<T>>
  ): InterceptorManager<T> {
    return {
      use: (onFulfilled, onRejected) => {
        const id = this.interceptorId++;
        interceptors.set(id, {
          fulfilled: onFulfilled,
          rejected: onRejected
        });
        return id;
      },
      eject: (id) => {
        interceptors.delete(id);
      },
      clear: () => {
        interceptors.clear();
      }
    };
  }

  /**
   * Default retry condition
   */
  private defaultRetryCondition(error: HttpError): boolean {
    return (
      error.isNetworkError ||
      error.isTimeout ||
      (error.response && error.response.status >= 500)
    ) as boolean;
  }

  /**
   * Default retry delay with exponential backoff
   */
  private defaultRetryDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }

  /**
   * Extract cache TTL from headers
   */
  private extractCacheTTL(headers: Headers): number {
    const cacheControl = headers.get('Cache-Control');
    
    if (cacheControl) {
      const maxAge = cacheControl.match(/max-age=(\d+)/);
      if (maxAge) {
        return parseInt(maxAge[1], 10) * 1000;
      }
    }
    
    const expires = headers.get('Expires');
    if (expires) {
      const expiresDate = new Date(expires).getTime();
      const now = Date.now();
      if (expiresDate > now) {
        return expiresDate - now;
      }
    }
    
    return 0;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(config: HttpRequestConfig): string {
    const url = this.buildURL(config.url!, config.params);
    return `${config.method || 'GET'}:${url}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    let size = 0;
    for (const [, cached] of this.cache) {
      size += JSON.stringify(cached.response).length;
    }
    
    return {
      size,
      entries: this.cache.size
    };
  }
}

// Create default instance
export const http = new HttpClient();

// Export create function
export function createHttpClient(config?: HttpRequestConfig): HttpClient {
  return new HttpClient(config);
}