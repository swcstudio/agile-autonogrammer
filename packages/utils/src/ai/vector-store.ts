/**
 * Vector Store for AI/ML
 * Efficient storage and retrieval of embeddings
 */

export interface Vector {
  id: string;
  embedding: number[];
  metadata?: Record<string, any>;
  timestamp?: number;
}

export interface VectorSearchOptions {
  k?: number;
  threshold?: number;
  filter?: (metadata: Record<string, any>) => boolean;
  includeDistance?: boolean;
}

export interface SearchResult {
  id: string;
  distance: number;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export type DistanceMetric = 'cosine' | 'euclidean' | 'manhattan' | 'dot';

/**
 * In-Memory Vector Store
 */
export class VectorStore {
  private vectors: Map<string, Vector> = new Map();
  private dimensions: number = 0;
  private metric: DistanceMetric;
  private index: HNSWIndex | null = null;

  constructor(dimensions: number, metric: DistanceMetric = 'cosine') {
    this.dimensions = dimensions;
    this.metric = metric;
  }

  /**
   * Add vector to store
   */
  add(vector: Vector): void {
    if (vector.embedding.length !== this.dimensions) {
      throw new Error(
        `Vector dimension mismatch: expected ${this.dimensions}, got ${vector.embedding.length}`
      );
    }

    vector.timestamp = vector.timestamp || Date.now();
    this.vectors.set(vector.id, vector);
    
    // Invalidate index
    this.index = null;
  }

  /**
   * Add multiple vectors
   */
  addBatch(vectors: Vector[]): void {
    for (const vector of vectors) {
      this.add(vector);
    }
  }

  /**
   * Get vector by ID
   */
  get(id: string): Vector | undefined {
    return this.vectors.get(id);
  }

  /**
   * Delete vector
   */
  delete(id: string): boolean {
    const result = this.vectors.delete(id);
    if (result) {
      this.index = null; // Invalidate index
    }
    return result;
  }

  /**
   * Search for similar vectors
   */
  search(
    query: number[],
    options: VectorSearchOptions = {}
  ): SearchResult[] {
    if (query.length !== this.dimensions) {
      throw new Error(
        `Query dimension mismatch: expected ${this.dimensions}, got ${query.length}`
      );
    }

    const k = options.k || 10;
    const threshold = options.threshold || 0;
    const results: SearchResult[] = [];

    // Calculate distances to all vectors
    for (const [id, vector] of this.vectors) {
      if (options.filter && !options.filter(vector.metadata || {})) {
        continue;
      }

      const distance = this.calculateDistance(query, vector.embedding);
      
      if (distance <= threshold || threshold === 0) {
        results.push({
          id,
          distance,
          metadata: vector.metadata,
          embedding: options.includeDistance ? vector.embedding : undefined
        });
      }
    }

    // Sort by distance and return top k
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  /**
   * Build HNSW index for faster search
   */
  buildIndex(M = 16, efConstruction = 200): void {
    this.index = new HNSWIndex(this.dimensions, this.metric, M, efConstruction);
    
    for (const [id, vector] of this.vectors) {
      this.index.add(id, vector.embedding);
    }
  }

  /**
   * Search using index
   */
  searchWithIndex(
    query: number[],
    k = 10,
    ef = 50
  ): SearchResult[] {
    if (!this.index) {
      this.buildIndex();
    }

    return this.index!.search(query, k, ef).map(result => ({
      ...result,
      metadata: this.vectors.get(result.id)?.metadata
    }));
  }

  /**
   * Calculate distance between vectors
   */
  private calculateDistance(a: number[], b: number[]): number {
    switch (this.metric) {
      case 'cosine':
        return 1 - this.cosineSimilarity(a, b);
      case 'euclidean':
        return this.euclideanDistance(a, b);
      case 'manhattan':
        return this.manhattanDistance(a, b);
      case 'dot':
        return -this.dotProduct(a, b); // Negative for similarity
      default:
        throw new Error(`Unknown distance metric: ${this.metric}`);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private manhattanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum;
  }

  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Save to JSON
   */
  toJSON(): string {
    return JSON.stringify({
      dimensions: this.dimensions,
      metric: this.metric,
      vectors: Array.from(this.vectors.values())
    });
  }

  /**
   * Load from JSON
   */
  static fromJSON(json: string): VectorStore {
    const data = JSON.parse(json);
    const store = new VectorStore(data.dimensions, data.metric);
    
    for (const vector of data.vectors) {
      store.add(vector);
    }
    
    return store;
  }

  /**
   * Get statistics
   */
  stats(): {
    count: number;
    dimensions: number;
    metric: string;
    indexed: boolean;
    memoryUsage: number;
  } {
    const memoryUsage = this.vectors.size * this.dimensions * 8; // Rough estimate
    
    return {
      count: this.vectors.size,
      dimensions: this.dimensions,
      metric: this.metric,
      indexed: this.index !== null,
      memoryUsage
    };
  }

  /**
   * Clear all vectors
   */
  clear(): void {
    this.vectors.clear();
    this.index = null;
  }
}

/**
 * HNSW Index for approximate nearest neighbor search
 */
class HNSWIndex {
  private dimensions: number;
  private metric: DistanceMetric;
  private M: number;
  private maxM: number;
  private efConstruction: number;
  private nodes: Map<string, HNSWNode> = new Map();
  private entryPoint: string | null = null;

  constructor(
    dimensions: number,
    metric: DistanceMetric,
    M = 16,
    efConstruction = 200
  ) {
    this.dimensions = dimensions;
    this.metric = metric;
    this.M = M;
    this.maxM = M;
    this.efConstruction = efConstruction;
  }

  add(id: string, embedding: number[]): void {
    const level = this.getRandomLevel();
    const node = new HNSWNode(id, embedding, level);
    this.nodes.set(id, node);

    if (!this.entryPoint) {
      this.entryPoint = id;
      return;
    }

    // Find nearest neighbors at all levels
    const nearestNeighbors = this.searchLayer(
      embedding,
      this.entryPoint,
      this.efConstruction,
      level
    );

    // Connect to M nearest neighbors at each level
    for (let lc = 0; lc <= level; lc++) {
      const m = lc === 0 ? this.maxM * 2 : this.maxM;
      const neighbors = this.getMNearest(nearestNeighbors, m);
      
      for (const neighbor of neighbors) {
        node.connections[lc] = node.connections[lc] || new Set();
        node.connections[lc].add(neighbor.id);
        
        const neighborNode = this.nodes.get(neighbor.id)!;
        neighborNode.connections[lc] = neighborNode.connections[lc] || new Set();
        neighborNode.connections[lc].add(id);

        // Prune connections if needed
        this.pruneConnections(neighborNode, lc);
      }
    }
  }

  search(query: number[], k: number, ef = 50): SearchResult[] {
    if (!this.entryPoint) {
      return [];
    }

    const candidates = this.searchLayer(
      query,
      this.entryPoint,
      Math.max(ef, k),
      0
    );

    return candidates
      .slice(0, k)
      .map(candidate => ({
        id: candidate.id,
        distance: candidate.distance,
        metadata: undefined
      }));
  }

  private searchLayer(
    query: number[],
    entryPoint: string,
    ef: number,
    level: number
  ): Array<{ id: string; distance: number }> {
    const visited = new Set<string>();
    const candidates = new MinHeap<{ id: string; distance: number }>();
    const nearest = new MaxHeap<{ id: string; distance: number }>();

    const entryNode = this.nodes.get(entryPoint)!;
    const entryDistance = this.calculateDistance(query, entryNode.embedding);
    
    candidates.push({ id: entryPoint, distance: entryDistance });
    nearest.push({ id: entryPoint, distance: entryDistance });
    visited.add(entryPoint);

    while (candidates.size > 0) {
      const current = candidates.pop()!;
      
      if (current.distance > nearest.peek()!.distance) {
        break;
      }

      const currentNode = this.nodes.get(current.id)!;
      const connections = currentNode.connections[level] || new Set();

      for (const neighborId of connections) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          
          const neighborNode = this.nodes.get(neighborId)!;
          const distance = this.calculateDistance(query, neighborNode.embedding);
          
          if (distance < nearest.peek()!.distance || nearest.size < ef) {
            candidates.push({ id: neighborId, distance });
            nearest.push({ id: neighborId, distance });
            
            if (nearest.size > ef) {
              nearest.pop();
            }
          }
        }
      }
    }

    return nearest.toArray().sort((a, b) => a.distance - b.distance);
  }

  private getMNearest(
    candidates: Array<{ id: string; distance: number }>,
    m: number
  ): Array<{ id: string; distance: number }> {
    return candidates.slice(0, m);
  }

  private pruneConnections(node: HNSWNode, level: number): void {
    const connections = node.connections[level];
    if (!connections) return;

    const m = level === 0 ? this.maxM * 2 : this.maxM;
    
    if (connections.size <= m) return;

    // Keep only M closest neighbors
    const neighbors: Array<{ id: string; distance: number }> = [];
    
    for (const neighborId of connections) {
      const neighborNode = this.nodes.get(neighborId)!;
      const distance = this.calculateDistance(
        node.embedding,
        neighborNode.embedding
      );
      neighbors.push({ id: neighborId, distance });
    }

    neighbors.sort((a, b) => a.distance - b.distance);
    
    const keep = new Set(neighbors.slice(0, m).map(n => n.id));
    node.connections[level] = keep;
  }

  private getRandomLevel(): number {
    let level = 0;
    while (Math.random() < 0.5 && level < 16) {
      level++;
    }
    return level;
  }

  private calculateDistance(a: number[], b: number[]): number {
    // Reuse distance calculation logic
    switch (this.metric) {
      case 'cosine':
        return 1 - this.cosineSimilarity(a, b);
      case 'euclidean':
        return this.euclideanDistance(a, b);
      default:
        return this.euclideanDistance(a, b);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}

class HNSWNode {
  id: string;
  embedding: number[];
  level: number;
  connections: Map<number, Set<string>> = new Map();

  constructor(id: string, embedding: number[], level: number) {
    this.id = id;
    this.embedding = embedding;
    this.level = level;
  }
}

// Simple heap implementations
class MinHeap<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number = (a: any, b: any) => a.distance - b.distance) {
    this.compare = compare;
  }

  push(item: T): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    
    const item = this.items[0];
    const last = this.items.pop()!;
    
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    
    return item;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  get size(): number {
    return this.items.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.compare(this.items[index], this.items[parentIndex]) >= 0) {
        break;
      }
      
      [this.items[index], this.items[parentIndex]] = 
        [this.items[parentIndex], this.items[index]];
      
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      
      if (leftChild < this.items.length && 
          this.compare(this.items[leftChild], this.items[minIndex]) < 0) {
        minIndex = leftChild;
      }
      
      if (rightChild < this.items.length && 
          this.compare(this.items[rightChild], this.items[minIndex]) < 0) {
        minIndex = rightChild;
      }
      
      if (minIndex === index) break;
      
      [this.items[index], this.items[minIndex]] = 
        [this.items[minIndex], this.items[index]];
      
      index = minIndex;
    }
  }
}

class MaxHeap<T> extends MinHeap<T> {
  constructor(compare: (a: T, b: T) => number = (a: any, b: any) => b.distance - a.distance) {
    super(compare);
  }

  toArray(): T[] {
    return [...this['items']];
  }
}