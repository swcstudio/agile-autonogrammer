/**
 * Model Cache Manager
 * Intelligent caching system for AI models with predictive prefetching
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type {
  CacheEntry,
  CacheStrategy,
  EdgeRegion,
  PrefetchPrediction,
  PrefetchingConfig,
  PredictionModel,
} from '../types/edge';

export interface CacheManagerConfig {
  strategy: CacheStrategy;
  enable_prefetching: boolean;
  prefetching_config: PrefetchingConfig;
  enable_compression: boolean;
  enable_encryption: boolean;
  metrics_collection_interval_ms: number;
}

export interface CacheMetrics {
  total_entries: number;
  total_size_mb: number;
  hit_rate: number;
  miss_rate: number;
  eviction_rate: number;
  prefetch_accuracy: number;
  avg_response_time_ms: number;
  memory_utilization: number;
  
  // Per-region breakdown
  regional_stats: Record<EdgeRegion, {
    entries: number;
    hit_rate: number;
    size_mb: number;
  }>;
  
  // Temporal patterns
  hourly_patterns: Record<string, number>; // hour -> hit_rate
  daily_patterns: Record<string, number>; // day -> request_count
}

export interface CacheOperation {
  type: 'GET' | 'SET' | 'DELETE' | 'EVICT' | 'PREFETCH';
  key: string;
  size_bytes?: number;
  ttl_seconds?: number;
  hit: boolean;
  latency_ms: number;
  timestamp: Date;
  region?: EdgeRegion;
}

export class ModelCacheManager extends EventEmitter {
  private config: CacheManagerConfig;
  private cache: Map<string, CacheEntry>;
  private accessLog: CacheOperation[];
  private prefetchPredictions: Map<string, PrefetchPrediction>;
  private compressionCache: Map<string, { compressed: Buffer; original_size: number }>;
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: CacheManagerConfig) {
    super();
    this.config = config;
    this.cache = new Map();
    this.accessLog = [];
    this.prefetchPredictions = new Map();
    this.compressionCache = new Map();
    
    this.startMetricsCollection();
    
    if (config.enable_prefetching) {
      this.startPrefetchingService();
    }
  }

  /**
   * Get cached model data with intelligent prefetching
   */
  async get<T = any>(key: string, region?: EdgeRegion): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const entry = this.cache.get(key);
      const hit = entry !== null && !this.isExpired(entry);
      const latency = performance.now() - startTime;

      // Log access for analytics
      this.logAccess({
        type: 'GET',
        key,
        hit,
        latency_ms: latency,
        timestamp: new Date(),
        region,
      });

      if (!hit) {
        this.emit('cache-miss', { key, region, latency_ms: latency });
        
        // Trigger predictive prefetching for related models
        if (this.config.enable_prefetching) {
          this.triggerPredictivePrefetch(key, region);
        }
        
        return null;
      }

      // Update access statistics
      entry!.hit_count++;
      entry!.last_accessed = new Date();

      this.emit('cache-hit', {
        key,
        region,
        latency_ms: latency,
        hit_count: entry!.hit_count,
      });

      // Decompress if necessary
      let value = entry!.value;
      if (this.config.enable_compression && this.compressionCache.has(key)) {
        value = await this.decompress(key);
      }

      return value as T;

    } catch (error) {
      this.emit('cache-error', { operation: 'get', key, error });
      throw error;
    }
  }

  /**
   * Set cached model data with intelligent compression and TTL
   */
  async set<T = any>(
    key: string,
    value: T,
    options: {
      ttl_seconds?: number;
      region?: EdgeRegion;
      priority?: 'low' | 'medium' | 'high';
      compress?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Calculate value size
      const serializedValue = JSON.stringify(value);
      const sizeBytes = new Blob([serializedValue]).size;

      // Check capacity and evict if necessary
      await this.ensureCapacity(sizeBytes);

      // Compress if enabled and beneficial
      let finalValue = value;
      if (this.shouldCompress(sizeBytes, options.compress)) {
        finalValue = await this.compress(key, value);
      }

      // Create cache entry
      const entry: CacheEntry = {
        key,
        value: finalValue,
        created_at: new Date(),
        expires_at: new Date(Date.now() + (options.ttl_seconds || this.config.strategy.default_ttl_seconds) * 1000),
        ttl_seconds: options.ttl_seconds || this.config.strategy.default_ttl_seconds,
        size_bytes: sizeBytes,
        hit_count: 0,
        last_accessed: new Date(),
        metadata: {
          region: options.region,
          priority: options.priority || 'medium',
          ...options.metadata,
        },
      };

      // Store in cache
      this.cache.set(key, entry);

      const latency = performance.now() - startTime;

      // Log operation
      this.logAccess({
        type: 'SET',
        key,
        size_bytes: sizeBytes,
        ttl_seconds: entry.ttl_seconds,
        hit: false,
        latency_ms: latency,
        timestamp: new Date(),
        region: options.region,
      });

      this.emit('cache-set', {
        key,
        size_bytes: sizeBytes,
        region: options.region,
        latency_ms: latency,
        compressed: this.compressionCache.has(key),
      });

    } catch (error) {
      this.emit('cache-error', { operation: 'set', key, error });
      throw error;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    const startTime = performance.now();

    try {
      const existed = this.cache.delete(key);
      this.compressionCache.delete(key);

      const latency = performance.now() - startTime;

      this.logAccess({
        type: 'DELETE',
        key,
        hit: existed,
        latency_ms: latency,
        timestamp: new Date(),
      });

      this.emit('cache-delete', { key, existed, latency_ms: latency });

      return existed;

    } catch (error) {
      this.emit('cache-error', { operation: 'delete', key, error });
      throw error;
    }
  }

  /**
   * Prefetch models based on predictions
   */
  async prefetchModel(
    key: string,
    region: EdgeRegion,
    prediction: PrefetchPrediction
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Check if already cached
      if (this.cache.has(key) && !this.isExpired(this.cache.get(key)!)) {
        return;
      }

      // Simulate model fetching - in production would fetch from origin
      const modelData = await this.fetchModelFromOrigin(key, region);

      // Cache with prefetch-specific TTL
      await this.set(key, modelData, {
        ttl_seconds: Math.floor((prediction.expiry_time.getTime() - Date.now()) / 1000),
        region,
        priority: prediction.priority === 'high' ? 'high' : 'medium',
        metadata: {
          prefetched: true,
          prediction_confidence: prediction.confidence,
          prediction_id: uuidv4(),
        },
      });

      const latency = performance.now() - startTime;

      this.logAccess({
        type: 'PREFETCH',
        key,
        hit: false,
        latency_ms: latency,
        timestamp: new Date(),
        region,
      });

      this.emit('prefetch-complete', {
        key,
        region,
        confidence: prediction.confidence,
        latency_ms: latency,
      });

    } catch (error) {
      this.emit('prefetch-error', { key, region, prediction, error });
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getMetrics(): Promise<CacheMetrics> {
    const totalEntries = this.cache.size;
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size_bytes, 0);
    const totalSizeMB = totalSize / (1024 * 1024);

    // Calculate hit/miss rates from recent access log
    const recentAccesses = this.accessLog.slice(-1000);
    const hitCount = recentAccesses.filter(op => op.hit).length;
    const hitRate = recentAccesses.length > 0 ? hitCount / recentAccesses.length : 0;

    // Calculate eviction rate
    const evictions = recentAccesses.filter(op => op.type === 'EVICT').length;
    const evictionRate = recentAccesses.length > 0 ? evictions / recentAccesses.length : 0;

    // Calculate prefetch accuracy
    const prefetches = recentAccesses.filter(op => op.type === 'PREFETCH');
    const successfulPrefetches = prefetches.filter(prefetch => {
      // Check if prefetched item was actually used
      const subsequentAccess = recentAccesses.find(access =>
        access.key === prefetch.key &&
        access.timestamp > prefetch.timestamp &&
        access.type === 'GET' &&
        access.hit
      );
      return subsequentAccess !== undefined;
    });
    const prefetchAccuracy = prefetches.length > 0 ? successfulPrefetches.length / prefetches.length : 0;

    // Calculate average response time
    const avgResponseTime = recentAccesses.length > 0 ?
      recentAccesses.reduce((sum, op) => sum + op.latency_ms, 0) / recentAccesses.length : 0;

    // Calculate memory utilization
    const memoryUtilization = totalSize / (this.config.strategy.max_size_mb * 1024 * 1024);

    // Regional statistics
    const regionalStats: Record<EdgeRegion, any> = {};
    for (const [key, entry] of this.cache) {
      const region = entry.metadata.region as EdgeRegion;
      if (region) {
        if (!regionalStats[region]) {
          regionalStats[region] = { entries: 0, size_mb: 0, hits: 0, total_accesses: 0 };
        }
        regionalStats[region].entries++;
        regionalStats[region].size_mb += entry.size_bytes / (1024 * 1024);
      }
    }

    // Calculate hit rates per region
    for (const access of recentAccesses) {
      if (access.region) {
        if (!regionalStats[access.region]) {
          regionalStats[access.region] = { entries: 0, size_mb: 0, hits: 0, total_accesses: 0 };
        }
        regionalStats[access.region].total_accesses++;
        if (access.hit) {
          regionalStats[access.region].hits++;
        }
      }
    }

    for (const region in regionalStats) {
      regionalStats[region].hit_rate = regionalStats[region].total_accesses > 0 ?
        regionalStats[region].hits / regionalStats[region].total_accesses : 0;
    }

    // Temporal patterns
    const hourlyPatterns = this.calculateHourlyPatterns(recentAccesses);
    const dailyPatterns = this.calculateDailyPatterns(recentAccesses);

    return {
      total_entries: totalEntries,
      total_size_mb: totalSizeMB,
      hit_rate: hitRate,
      miss_rate: 1 - hitRate,
      eviction_rate: evictionRate,
      prefetch_accuracy: prefetchAccuracy,
      avg_response_time_ms: avgResponseTime,
      memory_utilization: memoryUtilization,
      regional_stats: regionalStats,
      hourly_patterns: hourlyPatterns,
      daily_patterns: dailyPatterns,
    };
  }

  /**
   * Clear cache with optional pattern matching
   */
  async clear(pattern?: string): Promise<number> {
    let clearedCount = 0;

    if (!pattern) {
      // Clear everything
      clearedCount = this.cache.size;
      this.cache.clear();
      this.compressionCache.clear();
    } else {
      // Clear matching patterns
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
          this.compressionCache.delete(key);
          clearedCount++;
        }
      }
    }

    this.emit('cache-cleared', { pattern, cleared_count: clearedCount });

    return clearedCount;
  }

  // Private implementation methods

  private isExpired(entry: CacheEntry): boolean {
    return entry.expires_at.getTime() <= Date.now();
  }

  private logAccess(operation: CacheOperation): void {
    this.accessLog.push(operation);
    
    // Keep only recent operations to prevent memory bloat
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-5000);
    }
  }

  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const maxSizeBytes = this.config.strategy.max_size_mb * 1024 * 1024;
    const maxEntries = this.config.strategy.max_entries;
    
    // Check size limit
    let currentSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size_bytes, 0);
    
    while ((currentSize + newEntrySize > maxSizeBytes) || (this.cache.size >= maxEntries)) {
      const evicted = await this.evictEntry();
      if (!evicted) break; // No more entries to evict
      currentSize -= evicted.size_bytes;
    }
  }

  private async evictEntry(): Promise<CacheEntry | null> {
    if (this.cache.size === 0) return null;

    let entryToEvict: [string, CacheEntry] | null = null;

    switch (this.config.strategy.type) {
      case 'lru':
        entryToEvict = this.findLRUEntry();
        break;
      case 'lfu':
        entryToEvict = this.findLFUEntry();
        break;
      case 'ttl':
        entryToEvict = this.findExpiredEntry() || this.findLRUEntry();
        break;
      case 'adaptive':
        entryToEvict = this.findAdaptiveEvictionEntry();
        break;
      default:
        entryToEvict = this.findLRUEntry();
    }

    if (entryToEvict) {
      const [key, entry] = entryToEvict;
      this.cache.delete(key);
      this.compressionCache.delete(key);

      this.logAccess({
        type: 'EVICT',
        key,
        size_bytes: entry.size_bytes,
        hit: false,
        latency_ms: 0,
        timestamp: new Date(),
        region: entry.metadata.region,
      });

      this.emit('cache-evict', {
        key,
        reason: this.config.strategy.type,
        size_bytes: entry.size_bytes,
        age_seconds: (Date.now() - entry.created_at.getTime()) / 1000,
      });

      return entry;
    }

    return null;
  }

  private findLRUEntry(): [string, CacheEntry] | null {
    let oldestEntry: [string, CacheEntry] | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.last_accessed.getTime() < oldestTime) {
        oldestTime = entry.last_accessed.getTime();
        oldestEntry = [key, entry];
      }
    }

    return oldestEntry;
  }

  private findLFUEntry(): [string, CacheEntry] | null {
    let lfuEntry: [string, CacheEntry] | null = null;
    let minHits = Number.MAX_VALUE;

    for (const [key, entry] of this.cache) {
      if (entry.hit_count < minHits) {
        minHits = entry.hit_count;
        lfuEntry = [key, entry];
      }
    }

    return lfuEntry;
  }

  private findExpiredEntry(): [string, CacheEntry] | null {
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        return [key, entry];
      }
    }
    return null;
  }

  private findAdaptiveEvictionEntry(): [string, CacheEntry] | null {
    // Adaptive eviction considers multiple factors
    let bestEntry: [string, CacheEntry] | null = null;
    let bestScore = Number.MAX_VALUE;

    for (const [key, entry] of this.cache) {
      // Calculate eviction score (lower is better for eviction)
      const ageScore = (Date.now() - entry.last_accessed.getTime()) / 1000; // Age in seconds
      const hitScore = 1000 / (entry.hit_count + 1); // Inverse of hit frequency
      const sizeScore = entry.size_bytes / 1024; // Size penalty
      const priorityScore = entry.metadata.priority === 'high' ? 2000 : 
                           entry.metadata.priority === 'medium' ? 1000 : 500;

      const totalScore = ageScore + hitScore + sizeScore - priorityScore;

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestEntry = [key, entry];
      }
    }

    return bestEntry;
  }

  private shouldCompress(sizeBytes: number, forceCompress?: boolean): boolean {
    if (!this.config.enable_compression) return false;
    if (forceCompress !== undefined) return forceCompress;
    
    // Compress if larger than 1KB
    return sizeBytes > 1024;
  }

  private async compress<T>(key: string, value: T): Promise<T> {
    // Mock compression - in production would use actual compression algorithms
    const serialized = JSON.stringify(value);
    const compressed = Buffer.from(serialized, 'utf8');
    
    this.compressionCache.set(key, {
      compressed,
      original_size: serialized.length,
    });

    // Return a marker indicating compression
    return { __compressed: true, key } as any;
  }

  private async decompress(key: string): Promise<any> {
    const compressed = this.compressionCache.get(key);
    if (!compressed) {
      throw new Error(`No compression data found for key: ${key}`);
    }

    // Mock decompression
    const decompressed = compressed.compressed.toString('utf8');
    return JSON.parse(decompressed);
  }

  private async triggerPredictivePrefetch(missedKey: string, region?: EdgeRegion): Promise<void> {
    if (!this.config.enable_prefetching) return;

    try {
      // Generate prefetch predictions based on the cache miss
      const predictions = await this.generatePrefetchPredictions(missedKey, region);
      
      // Execute prefetch operations for high-confidence predictions
      for (const prediction of predictions) {
        if (prediction.confidence >= this.config.prefetching_config.confidence_threshold) {
          // Add to prefetch queue
          this.prefetchPredictions.set(prediction.request_pattern.model || 'unknown', prediction);
          
          this.emit('prefetch-triggered', {
            missed_key: missedKey,
            prediction_key: prediction.request_pattern.model,
            confidence: prediction.confidence,
            region,
          });
        }
      }

    } catch (error) {
      this.emit('prefetch-prediction-error', { missed_key: missedKey, region, error });
    }
  }

  private async generatePrefetchPredictions(
    missedKey: string,
    region?: EdgeRegion
  ): Promise<PrefetchPrediction[]> {
    // Mock ML-based prediction generation
    const relatedModels = this.findRelatedModels(missedKey);
    
    return relatedModels.map(modelKey => ({
      request_pattern: { model: modelKey },
      confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
      predicted_time: new Date(Date.now() + Math.random() * 3600000), // Within 1 hour
      expiry_time: new Date(Date.now() + 7200000), // 2 hours TTL
      priority: Math.random() > 0.7 ? 'high' : 'medium',
      cost_estimate: Math.random() * 0.5 + 0.1, // $0.10-$0.60
    }));
  }

  private findRelatedModels(modelKey: string): string[] {
    // Simple similarity matching - in production would use ML embeddings
    const allKeys = Array.from(this.cache.keys());
    return allKeys.filter(key => {
      // Find models with similar names or from same provider
      const similarity = this.calculateKeySimilarity(modelKey, key);
      return similarity > 0.3 && key !== modelKey;
    }).slice(0, 3); // Top 3 related models
  }

  private calculateKeySimilarity(key1: string, key2: string): number {
    // Simplified Jaccard similarity
    const set1 = new Set(key1.toLowerCase().split(/[\-_]/));
    const set2 = new Set(key2.toLowerCase().split(/[\-_]/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private async fetchModelFromOrigin(key: string, region: EdgeRegion): Promise<any> {
    // Mock model fetching - in production would fetch from model registry
    const fetchLatency = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise(resolve => setTimeout(resolve, fetchLatency));
    
    return {
      model_id: key,
      region,
      data: `Mock model data for ${key}`,
      size_mb: Math.random() * 100 + 10,
      version: '1.0',
      fetched_at: new Date(),
    };
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.getMetrics();
        this.emit('metrics-update', metrics);
      } catch (error) {
        this.emit('metrics-error', error);
      }
    }, this.config.metrics_collection_interval_ms);
  }

  private startPrefetchingService(): void {
    // Process prefetch predictions periodically
    setInterval(async () => {
      const predictions = Array.from(this.prefetchPredictions.values());
      
      for (const prediction of predictions) {
        const currentTime = Date.now();
        
        // Check if prediction should be executed
        if (prediction.predicted_time.getTime() <= currentTime) {
          const modelKey = prediction.request_pattern.model;
          if (modelKey) {
            try {
              await this.prefetchModel(modelKey, 'us-east-1', prediction); // Default region
              this.prefetchPredictions.delete(modelKey);
            } catch (error) {
              console.error(`Prefetch failed for ${modelKey}:`, error);
            }
          }
        }
        
        // Remove expired predictions
        if (prediction.expiry_time.getTime() <= currentTime) {
          const modelKey = prediction.request_pattern.model;
          if (modelKey) {
            this.prefetchPredictions.delete(modelKey);
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private calculateHourlyPatterns(accesses: CacheOperation[]): Record<string, number> {
    const hourlyStats: Record<string, { hits: number; total: number }> = {};
    
    for (const access of accesses) {
      const hour = access.timestamp.getHours().toString();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { hits: 0, total: 0 };
      }
      hourlyStats[hour].total++;
      if (access.hit) {
        hourlyStats[hour].hits++;
      }
    }
    
    const patterns: Record<string, number> = {};
    for (const [hour, stats] of Object.entries(hourlyStats)) {
      patterns[hour] = stats.total > 0 ? stats.hits / stats.total : 0;
    }
    
    return patterns;
  }

  private calculateDailyPatterns(accesses: CacheOperation[]): Record<string, number> {
    const dailyStats: Record<string, number> = {};
    
    for (const access of accesses) {
      const day = access.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyStats[day] = (dailyStats[day] || 0) + 1;
    }
    
    return dailyStats;
  }

  /**
   * Get cache statistics
   */
  getStatistics() {
    return {
      total_entries: this.cache.size,
      compression_enabled: this.config.enable_compression,
      prefetching_enabled: this.config.enable_prefetching,
      cache_strategy: this.config.strategy.type,
      max_size_mb: this.config.strategy.max_size_mb,
      current_size_mb: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size_bytes, 0) / (1024 * 1024),
      compressed_entries: this.compressionCache.size,
      pending_prefetches: this.prefetchPredictions.size,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.cache.clear();
    this.compressionCache.clear();
    this.prefetchPredictions.clear();
  }
}