/**
 * Background Sync Manager
 * Handles offline requests and sync when connection is restored
 */

interface QueuedRequest {
  id: string;
  request: Request;
  timestamp: number;
  retryCount: number;
  metadata?: any;
}

interface BackgroundSyncOptions {
  maxRetentionTime?: number; // in milliseconds
  maxRetries?: number;
  retryDelay?: number;
  forceSyncFallback?: boolean;
}

export class BackgroundSync {
  private static readonly DB_NAME = 'katalyst-bg-sync';
  private static readonly STORE_NAME = 'requests';
  private static readonly SYNC_TAG_PREFIX = 'katalyst-bg-sync-';
  
  private options: Required<BackgroundSyncOptions>;
  private syncInProgress = false;

  constructor(options: BackgroundSyncOptions = {}) {
    this.options = {
      maxRetentionTime: options.maxRetentionTime || 24 * 60 * 60 * 1000, // 24 hours
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000, // 5 seconds
      forceSyncFallback: options.forceSyncFallback || false
    };
  }

  /**
   * Add request to background sync queue
   */
  async pushRequest(request: Request, metadata?: any): Promise<void> {
    const queuedRequest: QueuedRequest = {
      id: this.generateId(),
      request: await this.cloneRequest(request),
      timestamp: Date.now(),
      retryCount: 0,
      metadata
    };

    await this.storeRequest(queuedRequest);
    
    // Try to register background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(`${BackgroundSync.SYNC_TAG_PREFIX}${queuedRequest.id}`);
      } catch (error) {
        console.warn('Background sync registration failed:', error);
        
        if (this.options.forceSyncFallback) {
          // Fallback to immediate sync attempt
          setTimeout(() => this.performSync(), 1000);
        }
      }
    } else {
      console.warn('Background Sync not supported, using fallback');
      
      if (this.options.forceSyncFallback) {
        // Fallback to periodic sync
        setTimeout(() => this.performSync(), this.options.retryDelay);
      }
    }
    
    await this.notifyClients('request_queued', {
      id: queuedRequest.id,
      url: request.url
    });
  }

  /**
   * Handle background sync event
   */
  async handleSync(event: any): Promise<void> {
    if (event.tag.startsWith(BackgroundSync.SYNC_TAG_PREFIX)) {
      const requestId = event.tag.replace(BackgroundSync.SYNC_TAG_PREFIX, '');
      await this.syncRequest(requestId);
    }
  }

  /**
   * Perform sync for all queued requests
   */
  async performSync(): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      const requests = await this.getAllQueuedRequests();
      const now = Date.now();
      
      for (const queuedRequest of requests) {
        // Skip requests that are too old
        if (now - queuedRequest.timestamp > this.options.maxRetentionTime) {
          await this.removeRequest(queuedRequest.id);
          await this.notifyClients('request_expired', {
            id: queuedRequest.id,
            url: queuedRequest.request.url
          });
          continue;
        }
        
        // Skip requests that have exceeded retry limit
        if (queuedRequest.retryCount >= this.options.maxRetries) {
          await this.removeRequest(queuedRequest.id);
          await this.notifyClients('request_failed', {
            id: queuedRequest.id,
            url: queuedRequest.request.url,
            reason: 'max_retries_exceeded'
          });
          continue;
        }
        
        await this.syncRequest(queuedRequest.id);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual request
   */
  private async syncRequest(requestId: string): Promise<void> {
    const queuedRequest = await this.getQueuedRequest(requestId);
    
    if (!queuedRequest) return;
    
    try {
      // Clone the request for the fetch
      const request = await this.cloneRequest(queuedRequest.request);
      
      const response = await fetch(request);
      
      if (response.ok) {
        // Success - remove from queue
        await this.removeRequest(requestId);
        
        await this.notifyClients('request_synced', {
          id: requestId,
          url: queuedRequest.request.url,
          status: response.status,
          retryCount: queuedRequest.retryCount
        });
      } else {
        // Server error - retry later
        await this.updateRetryCount(requestId, queuedRequest.retryCount + 1);
        
        await this.notifyClients('request_retry', {
          id: requestId,
          url: queuedRequest.request.url,
          status: response.status,
          retryCount: queuedRequest.retryCount + 1
        });
      }
    } catch (error) {
      // Network error - retry later
      await this.updateRetryCount(requestId, queuedRequest.retryCount + 1);
      
      await this.notifyClients('request_retry', {
        id: requestId,
        url: queuedRequest.request.url,
        error: error.message,
        retryCount: queuedRequest.retryCount + 1
      });
    }
  }

  /**
   * Get all queued requests from storage
   */
  private async getAllQueuedRequests(): Promise<QueuedRequest[]> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BackgroundSync.STORE_NAME], 'readonly');
      const store = transaction.objectStore(BackgroundSync.STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get specific queued request
   */
  private async getQueuedRequest(id: string): Promise<QueuedRequest | null> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BackgroundSync.STORE_NAME], 'readonly');
      const store = transaction.objectStore(BackgroundSync.STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store request in IndexedDB
   */
  private async storeRequest(queuedRequest: QueuedRequest): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BackgroundSync.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(BackgroundSync.STORE_NAME);
      
      // Serialize the request
      const serializedRequest = {
        ...queuedRequest,
        request: this.serializeRequest(queuedRequest.request)
      };
      
      const request = store.put(serializedRequest);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove request from storage
   */
  private async removeRequest(id: string): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BackgroundSync.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(BackgroundSync.STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update retry count for a request
   */
  private async updateRetryCount(id: string, retryCount: number): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BackgroundSync.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(BackgroundSync.STORE_NAME);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const queuedRequest = getRequest.result;
        if (queuedRequest) {
          queuedRequest.retryCount = retryCount;
          
          const putRequest = store.put(queuedRequest);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Open IndexedDB database
   */
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(BackgroundSync.DB_NAME, 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains(BackgroundSync.STORE_NAME)) {
          const store = db.createObjectStore(BackgroundSync.STORE_NAME, {
            keyPath: 'id'
          });
          
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Serialize Request object for storage
   */
  private serializeRequest(request: Request): any {
    return {
      url: request.url,
      method: request.method,
      headers: Array.from(request.headers.entries()),
      body: request.body ? 'has-body' : null, // Simplified for now
      mode: request.mode,
      credentials: request.credentials,
      cache: request.cache,
      redirect: request.redirect,
      referrer: request.referrer,
      integrity: request.integrity
    };
  }

  /**
   * Clone Request object for reuse
   */
  private async cloneRequest(request: Request): Promise<Request> {
    const body = request.body ? await request.clone().arrayBuffer() : null;
    
    return new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body,
      mode: request.mode,
      credentials: request.credentials,
      cache: request.cache,
      redirect: request.redirect,
      referrer: request.referrer,
      integrity: request.integrity
    });
  }

  /**
   * Generate unique ID for requests
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify clients about sync events
   */
  private async notifyClients(type: string, data: any): Promise<void> {
    if (typeof self !== 'undefined' && 'clients' in self) {
      const clients = await (self as any).clients.matchAll();
      clients.forEach((client: any) => {
        client.postMessage({
          type: 'BACKGROUND_SYNC',
          event: type,
          data,
          timestamp: Date.now()
        });
      });
    }
  }
}