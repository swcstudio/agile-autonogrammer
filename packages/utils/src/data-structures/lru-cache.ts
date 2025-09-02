/**
 * LRU (Least Recently Used) Cache Implementation
 * Efficient caching with automatic eviction of least-used items
 */

export interface LRUCacheOptions {
  max?: number;
  maxAge?: number;
  updateAgeOnGet?: boolean;
  stale?: boolean;
  dispose?: (key: any, value: any) => void;
  noDisposeOnSet?: boolean;
  length?: (value: any, key?: any) => number;
}

interface CacheNode<K, V> {
  key: K;
  value: V;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
  expires?: number;
}

export class LRUCache<K = any, V = any> {
  private cache: Map<K, CacheNode<K, V>> = new Map();
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;
  private options: Required<LRUCacheOptions>;
  private size = 0;
  private hits = 0;
  private misses = 0;

  constructor(options: LRUCacheOptions = {}) {
    this.options = {
      max: options.max ?? 100,
      maxAge: options.maxAge ?? 0,
      updateAgeOnGet: options.updateAgeOnGet ?? false,
      stale: options.stale ?? false,
      dispose: options.dispose ?? (() => {}),
      noDisposeOnSet: options.noDisposeOnSet ?? false,
      length: options.length ?? (() => 1)
    };
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    
    if (!node) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (this.isExpired(node)) {
      if (!this.options.stale) {
        this.delete(key);
        this.misses++;
        return undefined;
      }
    }

    // Update age if configured
    if (this.options.updateAgeOnGet && this.options.maxAge) {
      node.expires = Date.now() + this.options.maxAge;
    }

    // Move to head (most recently used)
    this.moveToHead(node);
    this.hits++;
    
    return node.value;
  }

  /**
   * Peek at value without updating position
   */
  peek(key: K): V | undefined {
    const node = this.cache.get(key);
    
    if (!node || this.isExpired(node)) {
      return undefined;
    }
    
    return node.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V, maxAge?: number): this {
    let node = this.cache.get(key);
    
    if (node) {
      // Update existing
      const oldValue = node.value;
      node.value = value;
      
      if (maxAge !== undefined || this.options.maxAge) {
        node.expires = Date.now() + (maxAge ?? this.options.maxAge);
      }
      
      this.moveToHead(node);
      
      if (!this.options.noDisposeOnSet && oldValue !== value) {
        this.options.dispose(key, oldValue);
      }
    } else {
      // Add new
      node = {
        key,
        value,
        prev: null,
        next: null,
        expires: (maxAge !== undefined || this.options.maxAge) 
          ? Date.now() + (maxAge ?? this.options.maxAge)
          : undefined
      };
      
      this.cache.set(key, node);
      this.addToHead(node);
      this.size += this.options.length(value, key);
      
      // Evict if necessary
      while (this.size > this.options.max) {
        this.evictLRU();
      }
    }
    
    return this;
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    const node = this.cache.get(key);
    return node !== undefined && !this.isExpired(node);
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    
    if (!node) {
      return false;
    }
    
    this.removeNode(node);
    this.cache.delete(key);
    this.size -= this.options.length(node.value, key);
    this.options.dispose(key, node.value);
    
    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    // Dispose all values
    for (const [key, node] of this.cache) {
      this.options.dispose(key, node.value);
    }
    
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get all keys
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Get all values
   */
  values(): IterableIterator<V> {
    const values: V[] = [];
    let node = this.head;
    
    while (node) {
      if (!this.isExpired(node)) {
        values.push(node.value);
      }
      node = node.next;
    }
    
    return values[Symbol.iterator]();
  }

  /**
   * Get all entries
   */
  entries(): IterableIterator<[K, V]> {
    const entries: [K, V][] = [];
    let node = this.head;
    
    while (node) {
      if (!this.isExpired(node)) {
        entries.push([node.key, node.value]);
      }
      node = node.next;
    }
    
    return entries[Symbol.iterator]();
  }

  /**
   * Iterate over cache
   */
  forEach(callback: (value: V, key: K, cache: LRUCache<K, V>) => void): void {
    let node = this.head;
    
    while (node) {
      if (!this.isExpired(node)) {
        callback(node.value, node.key, this);
      }
      node = node.next;
    }
  }

  /**
   * Get cache statistics
   */
  stats(): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    capacity: number;
    utilization: number;
  } {
    const total = this.hits + this.misses;
    
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.size,
      capacity: this.options.max,
      utilization: this.size / this.options.max
    };
  }

  /**
   * Prune expired entries
   */
  prune(): void {
    const now = Date.now();
    const expired: K[] = [];
    
    for (const [key, node] of this.cache) {
      if (node.expires && node.expires < now) {
        expired.push(key);
      }
    }
    
    for (const key of expired) {
      this.delete(key);
    }
  }

  /**
   * Load bulk data
   */
  load(entries: Array<[K, V]>): void {
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }

  /**
   * Dump cache contents
   */
  dump(): Array<{ key: K; value: V; expires?: number }> {
    const items: Array<{ key: K; value: V; expires?: number }> = [];
    let node = this.head;
    
    while (node) {
      if (!this.isExpired(node)) {
        items.push({
          key: node.key,
          value: node.value,
          expires: node.expires
        });
      }
      node = node.next;
    }
    
    return items;
  }

  /**
   * Get cache length
   */
  get length(): number {
    return this.cache.size;
  }

  /**
   * Get item count
   */
  get itemCount(): number {
    return this.cache.size;
  }

  // Private methods

  private isExpired(node: CacheNode<K, V>): boolean {
    return node.expires !== undefined && node.expires < Date.now();
  }

  private addToHead(node: CacheNode<K, V>): void {
    node.prev = null;
    node.next = this.head;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: CacheNode<K, V>): void {
    if (node === this.head) return;
    
    this.removeNode(node);
    this.addToHead(node);
  }

  private evictLRU(): void {
    if (!this.tail) return;
    
    const node = this.tail;
    this.removeNode(node);
    this.cache.delete(node.key);
    this.size -= this.options.length(node.value, node.key);
    this.options.dispose(node.key, node.value);
  }
}

/**
 * TTL Cache - Time-based expiration
 */
export class TTLCache<K = any, V = any> extends LRUCache<K, V> {
  constructor(ttl: number, max = 1000) {
    super({ max, maxAge: ttl });
  }
}

/**
 * Two-Level Cache - Memory + Persistent
 */
export class TwoLevelCache<K = any, V = any> {
  private l1: LRUCache<K, V>;
  private l2: Map<K, V>;
  private serializer: (value: V) => string;
  private deserializer: (data: string) => V;

  constructor(options: {
    l1Size?: number;
    l1MaxAge?: number;
    serializer?: (value: V) => string;
    deserializer?: (data: string) => V;
  } = {}) {
    this.l1 = new LRUCache<K, V>({
      max: options.l1Size ?? 100,
      maxAge: options.l1MaxAge,
      dispose: (key, value) => {
        // Move to L2 when evicted from L1
        this.l2.set(key, value);
      }
    });
    
    this.l2 = new Map();
    this.serializer = options.serializer ?? JSON.stringify;
    this.deserializer = options.deserializer ?? JSON.parse;
  }

  get(key: K): V | undefined {
    // Check L1 first
    let value = this.l1.get(key);
    
    if (value !== undefined) {
      return value;
    }
    
    // Check L2
    value = this.l2.get(key);
    
    if (value !== undefined) {
      // Promote to L1
      this.l1.set(key, value);
      this.l2.delete(key);
      return value;
    }
    
    return undefined;
  }

  set(key: K, value: V): void {
    this.l1.set(key, value);
    this.l2.delete(key); // Remove from L2 if exists
  }

  has(key: K): boolean {
    return this.l1.has(key) || this.l2.has(key);
  }

  delete(key: K): boolean {
    const l1Deleted = this.l1.delete(key);
    const l2Deleted = this.l2.delete(key);
    return l1Deleted || l2Deleted;
  }

  clear(): void {
    this.l1.clear();
    this.l2.clear();
  }

  persist(storage: Storage): void {
    const data: Record<string, string> = {};
    
    // Persist both L1 and L2
    for (const [key, value] of this.l1.entries()) {
      data[String(key)] = this.serializer(value);
    }
    
    for (const [key, value] of this.l2) {
      if (!data[String(key)]) {
        data[String(key)] = this.serializer(value);
      }
    }
    
    storage.setItem('cache', JSON.stringify(data));
  }

  restore(storage: Storage): void {
    const stored = storage.getItem('cache');
    
    if (!stored) return;
    
    try {
      const data = JSON.parse(stored);
      
      for (const [key, serialized] of Object.entries(data)) {
        const value = this.deserializer(serialized as string);
        this.l2.set(key as K, value);
      }
    } catch (e) {
      console.error('Failed to restore cache:', e);
    }
  }
}