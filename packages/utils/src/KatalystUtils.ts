/**
 * Main Katalyst Utils Class
 * Unified interface to all utility modules
 */

import { Queue, PriorityQueue, BatchQueue } from './async/queue';
import { Profiler } from './performance/profiler';
import { Logger, createLogger } from './debug/logger';
import { LRUCache, TTLCache } from './data-structures/lru-cache';
import { encryption } from './crypto/encryption';
import { validator, SchemaValidator } from './validation/schema-validator';
import { VectorStore } from './ai/vector-store';
import { HttpClient, createHttpClient } from './network/http-client';
import { Vector3 } from './metaverse/vector3';
import { Observable } from './reactive/observable';
import { browser } from './platform/browser-utils';

/**
 * Main Katalyst Utilities Class
 * Provides organized access to all utility modules
 */
export class KatalystUtils {
  // Async utilities
  static readonly async = {
    Queue,
    PriorityQueue,
    BatchQueue,
    
    /**
     * Create a new queue instance
     */
    createQueue: (options?: any) => new Queue(options),
    
    /**
     * Create a priority queue instance
     */
    createPriorityQueue: (options?: any) => new PriorityQueue(options),
    
    /**
     * Sleep for specified milliseconds
     */
    sleep: (ms: number): Promise<void> => 
      new Promise(resolve => setTimeout(resolve, ms)),
    
    /**
     * Debounce function calls
     */
    debounce: <T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): T => {
      let timeout: NodeJS.Timeout;
      return ((...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      }) as T;
    },
    
    /**
     * Throttle function calls
     */
    throttle: <T extends (...args: any[]) => any>(
      func: T,
      limit: number
    ): T => {
      let inThrottle: boolean;
      return ((...args: Parameters<T>) => {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      }) as T;
    }
  };

  // Performance utilities
  static readonly performance = {
    Profiler,
    
    /**
     * Create a new profiler instance
     */
    createProfiler: (options?: any) => new Profiler(options),
    
    /**
     * Measure function execution time
     */
    measure: <T>(fn: () => T, label?: string): { result: T; duration: number } => {
      const start = performance.now();
      const result = fn();
      const duration = performance.now() - start;
      
      if (label) {
        console.log(`${label}: ${duration.toFixed(2)}ms`);
      }
      
      return { result, duration };
    },
    
    /**
     * Measure async function execution time
     */
    measureAsync: async <T>(
      fn: () => Promise<T>,
      label?: string
    ): Promise<{ result: T; duration: number }> => {
      const start = performance.now();
      const result = await fn();
      const duration = performance.now() - start;
      
      if (label) {
        console.log(`${label}: ${duration.toFixed(2)}ms`);
      }
      
      return { result, duration };
    },
    
    /**
     * Memory usage information
     */
    getMemoryInfo: (): any => {
      const memory = (performance as any).memory;
      return memory ? {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      } : null;
    }
  };

  // Logging utilities
  static readonly logger = {
    Logger,
    createLogger,
    
    /**
     * Default logger instance
     */
    default: createLogger(),
    
    /**
     * Quick logging methods
     */
    trace: (message: string, data?: any) => KatalystUtils.logger.default.trace(message, data),
    debug: (message: string, data?: any) => KatalystUtils.logger.default.debug(message, data),
    info: (message: string, data?: any) => KatalystUtils.logger.default.info(message, data),
    warn: (message: string, data?: any) => KatalystUtils.logger.default.warn(message, data),
    error: (message: string, data?: any) => KatalystUtils.logger.default.error(message, data),
    fatal: (message: string, data?: any) => KatalystUtils.logger.default.fatal(message, data)
  };

  // Data structure utilities
  static readonly dataStructures = {
    LRUCache,
    TTLCache,
    
    /**
     * Create LRU cache
     */
    createLRUCache: <K, V>(options?: any) => new LRUCache<K, V>(options),
    
    /**
     * Create TTL cache
     */
    createTTLCache: <K, V>(ttl: number, max?: number) => new TTLCache<K, V>(ttl, max),
    
    /**
     * Create Map with default value
     */
    createMapWithDefault: <K, V>(defaultValue: () => V): Map<K, V> => {
      return new Proxy(new Map<K, V>(), {
        get(target, prop) {
          if (prop === 'get') {
            return (key: K) => {
              if (!target.has(key)) {
                target.set(key, defaultValue());
              }
              return target.get(key);
            };
          }
          return (target as any)[prop];
        }
      });
    }
  };

  // Cryptography utilities
  static readonly crypto = {
    ...encryption,
    
    /**
     * Generate random string
     */
    randomString: (length = 16, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string => {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return result;
    },
    
    /**
     * Generate UUID v4
     */
    uuid: (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    
    /**
     * Hash string with SHA-256
     */
    hash: async (data: string): Promise<string> => {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  };

  // Validation utilities
  static readonly validation = {
    validator,
    SchemaValidator,
    
    /**
     * Create validator instance
     */
    createValidator: () => new SchemaValidator(),
    
    /**
     * Quick validation methods
     */
    isEmail: (value: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    
    isURL: (value: string): boolean => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    
    isUUID: (value: string): boolean => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    },
    
    isEmpty: (value: any): boolean => {
      if (value == null) return true;
      if (typeof value === 'string') return value.trim().length === 0;
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    }
  };

  // AI/ML utilities
  static readonly ai = {
    VectorStore,
    
    /**
     * Create vector store
     */
    createVectorStore: (dimensions: number, metric?: any) => 
      new VectorStore(dimensions, metric),
    
    /**
     * Cosine similarity
     */
    cosineSimilarity: (a: number[], b: number[]): number => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    },
    
    /**
     * Normalize vector
     */
    normalize: (vector: number[]): number[] => {
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      return magnitude === 0 ? vector : vector.map(val => val / magnitude);
    }
  };

  // Network utilities
  static readonly network = {
    HttpClient,
    createHttpClient,
    
    /**
     * Default HTTP client
     */
    http: createHttpClient(),
    
    /**
     * Fetch with timeout
     */
    fetchWithTimeout: async (url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    }
  };

  // Metaverse/3D utilities
  static readonly metaverse = {
    Vector3,
    
    /**
     * Create vector3
     */
    createVector3: (x = 0, y = 0, z = 0) => new Vector3(x, y, z),
    
    /**
     * Degrees to radians
     */
    toRadians: (degrees: number): number => degrees * Math.PI / 180,
    
    /**
     * Radians to degrees
     */
    toDegrees: (radians: number): number => radians * 180 / Math.PI,
    
    /**
     * Clamp value between min and max
     */
    clamp: (value: number, min: number, max: number): number => 
      Math.min(Math.max(value, min), max),
    
    /**
     * Linear interpolation
     */
    lerp: (a: number, b: number, t: number): number => a + (b - a) * t
  };

  // Reactive utilities
  static readonly reactive = {
    Observable,
    
    /**
     * Create observable from value
     */
    of: <T>(...values: T[]) => Observable.of(...values),
    
    /**
     * Create observable from array
     */
    from: <T>(array: T[]) => Observable.from(array),
    
    /**
     * Create observable from promise
     */
    fromPromise: <T>(promise: Promise<T>) => Observable.fromPromise(promise),
    
    /**
     * Create observable from event
     */
    fromEvent: <T = Event>(target: EventTarget, eventName: string) => 
      Observable.fromEvent<T>(target, eventName),
    
    /**
     * Create interval observable
     */
    interval: (period: number) => Observable.interval(period),
    
    /**
     * Merge observables
     */
    merge: <T>(...sources: Observable<T>[]) => Observable.merge(...sources)
  };

  // Platform utilities
  static readonly platform = {
    browser,
    
    /**
     * Check if running in browser
     */
    isBrowser: () => typeof window !== 'undefined',
    
    /**
     * Check if running in Node.js
     */
    isNode: () => typeof process !== 'undefined' && process.versions?.node,
    
    /**
     * Check if running in worker
     */
    isWorker: () => typeof importScripts !== 'undefined',
    
    /**
     * Get platform name
     */
    getPlatform: (): string => {
      if (KatalystUtils.platform.isBrowser()) return 'browser';
      if (KatalystUtils.platform.isNode()) return 'node';
      if (KatalystUtils.platform.isWorker()) return 'worker';
      return 'unknown';
    }
  };

  // Utility methods
  static readonly utils = {
    /**
     * Deep clone object
     */
    deepClone: <T>(obj: T): T => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime()) as any;
      if (obj instanceof Array) return obj.map(item => KatalystUtils.utils.deepClone(item)) as any;
      if (typeof obj === 'object') {
        const cloned = {} as any;
        for (const key in obj) {
          cloned[key] = KatalystUtils.utils.deepClone(obj[key]);
        }
        return cloned;
      }
      return obj;
    },
    
    /**
     * Deep merge objects
     */
    deepMerge: <T>(target: T, ...sources: any[]): T => {
      if (!sources.length) return target;
      const source = sources.shift();
      
      if (KatalystUtils.utils.isObject(target) && KatalystUtils.utils.isObject(source)) {
        for (const key in source) {
          if (KatalystUtils.utils.isObject(source[key])) {
            if (!(target as any)[key]) Object.assign(target as any, { [key]: {} });
            KatalystUtils.utils.deepMerge((target as any)[key], source[key]);
          } else {
            Object.assign(target as any, { [key]: source[key] });
          }
        }
      }
      
      return KatalystUtils.utils.deepMerge(target, ...sources);
    },
    
    /**
     * Check if value is object
     */
    isObject: (item: any): boolean => {
      return item && typeof item === 'object' && !Array.isArray(item);
    },
    
    /**
     * Pick properties from object
     */
    pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
      const result = {} as Pick<T, K>;
      for (const key of keys) {
        if (key in obj) {
          result[key] = obj[key];
        }
      }
      return result;
    },
    
    /**
     * Omit properties from object
     */
    omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
      const result = { ...obj };
      for (const key of keys) {
        delete result[key];
      }
      return result;
    },
    
    /**
     * Group array by key
     */
    groupBy: <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
      return array.reduce((groups, item) => {
        const group = String(item[key]);
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
      }, {} as Record<string, T[]>);
    },
    
    /**
     * Retry function with exponential backoff
     */
    retry: async <T>(
      fn: () => Promise<T>,
      maxRetries = 3,
      baseDelay = 1000
    ): Promise<T> => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          if (attempt === maxRetries) throw error;
          
          const delay = baseDelay * Math.pow(2, attempt);
          await KatalystUtils.async.sleep(delay);
        }
      }
      throw new Error('Max retries exceeded');
    }
  };

  /**
   * Get version information
   */
  static getVersion(): string {
    return '1.0.0';
  }

  /**
   * Get all available utilities
   */
  static getAvailableUtilities(): string[] {
    return [
      'async', 'performance', 'logger', 'dataStructures',
      'crypto', 'validation', 'ai', 'network', 'metaverse',
      'reactive', 'platform', 'utils'
    ];
  }

  /**
   * Initialize all utilities
   */
  static init(): void {
    // Perform any necessary initialization
    console.log('Katalyst Utils initialized');
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  (window as any).KatalystUtils = KatalystUtils;
}