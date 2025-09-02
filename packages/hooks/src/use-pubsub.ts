/**
 * usePubSub - React 19 hook for Phoenix-style PubSub system
 * 
 * Provides topic-based publish/subscribe messaging with pattern matching,
 * perfect for real-time updates and event-driven architectures.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  startTransition
} from 'react';

/**
 * PubSub message type
 */
export interface PubSubMessage<T = any> {
  topic: string;
  event: string;
  payload: T;
  from?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Subscription handler type
 */
export type MessageHandler<T = any> = (message: PubSubMessage<T>) => void | Promise<void>;

/**
 * PubSub configuration
 */
export interface UsePubSubOptions {
  adapter?: 'local' | 'distributed' | 'websocket';
  websocketUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
}

/**
 * PubSub hook return type
 */
export interface UsePubSubReturn {
  // Publishing
  publish: <T = any>(topic: string, event: string, payload: T, metadata?: Record<string, any>) => Promise<void>;
  broadcast: <T = any>(event: string, payload: T, metadata?: Record<string, any>) => Promise<void>;
  
  // Subscribing
  subscribe: <T = any>(topic: string, handler: MessageHandler<T>) => () => void;
  subscribePattern: <T = any>(pattern: string, handler: MessageHandler<T>) => () => void;
  subscribeOnce: <T = any>(topic: string, handler: MessageHandler<T>) => () => void;
  
  // Management
  unsubscribe: (topic: string) => void;
  unsubscribeAll: () => void;
  
  // State
  isConnected: boolean;
  topics: string[];
  metrics: {
    messagesPublished: number;
    messagesReceived: number;
    subscriptionCount: number;
    lastMessageTime: number;
  };
}

/**
 * PubSub adapter interface
 */
interface PubSubAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish<T>(topic: string, message: PubSubMessage<T>): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): () => void;
  subscribePattern(pattern: string, handler: MessageHandler): () => void;
  isConnected(): boolean;
}

/**
 * Local PubSub adapter (in-memory)
 */
class LocalPubSubAdapter implements PubSubAdapter {
  private subscriptions = new Map<string, Set<MessageHandler>>();
  private patternSubscriptions = new Map<string, Set<MessageHandler>>();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscriptions.clear();
    this.patternSubscriptions.clear();
  }

  async publish<T>(topic: string, message: PubSubMessage<T>): Promise<void> {
    // Direct topic subscribers
    const topicHandlers = this.subscriptions.get(topic);
    if (topicHandlers) {
      topicHandlers.forEach(handler => {
        Promise.resolve(handler(message)).catch(console.error);
      });
    }

    // Pattern subscribers
    for (const [pattern, handlers] of this.patternSubscriptions) {
      if (this.matchesPattern(topic, pattern)) {
        handlers.forEach(handler => {
          Promise.resolve(handler(message)).catch(console.error);
        });
      }
    }
  }

  subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);

    return () => {
      const handlers = this.subscriptions.get(topic);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    };
  }

  subscribePattern(pattern: string, handler: MessageHandler): () => void {
    if (!this.patternSubscriptions.has(pattern)) {
      this.patternSubscriptions.set(pattern, new Set());
    }
    this.patternSubscriptions.get(pattern)!.add(handler);

    return () => {
      const handlers = this.patternSubscriptions.get(pattern);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.patternSubscriptions.delete(pattern);
        }
      }
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  private matchesPattern(topic: string, pattern: string): boolean {
    if (pattern === '*' || pattern === '**') return true;
    
    const topicParts = topic.split('.');
    const patternParts = pattern.split('.');
    
    let t = 0, p = 0;
    
    while (t < topicParts.length && p < patternParts.length) {
      if (patternParts[p] === '**') {
        return true;
      } else if (patternParts[p] === '*' || patternParts[p] === topicParts[t]) {
        t++;
        p++;
      } else {
        return false;
      }
    }
    
    return t === topicParts.length && p === patternParts.length;
  }
}

/**
 * WebSocket PubSub adapter
 */
class WebSocketPubSubAdapter implements PubSubAdapter {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<MessageHandler>>();
  private patternSubscriptions = new Map<string, Set<MessageHandler>>();
  private messageQueue: Array<{ topic: string; message: PubSubMessage }> = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private url: string,
    private reconnectInterval: number = 5000,
    private maxReconnectAttempts: number = 10
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          // Flush message queue
          while (this.messageQueue.length > 0) {
            const item = this.messageQueue.shift();
            if (item) {
              this.publish(item.topic, item.message);
            }
          }
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as PubSubMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          this.scheduleReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscriptions.clear();
    this.patternSubscriptions.clear();
  }

  async publish<T>(topic: string, message: PubSubMessage<T>): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for later delivery
      this.messageQueue.push({ topic, message });
      return;
    }
    
    this.ws.send(JSON.stringify({ action: 'publish', topic, message }));
  }

  subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
      
      // Notify server of subscription
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'subscribe', topic }));
      }
    }
    
    this.subscriptions.get(topic)!.add(handler);
    
    return () => {
      const handlers = this.subscriptions.get(topic);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscriptions.delete(topic);
          
          // Notify server of unsubscription
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: 'unsubscribe', topic }));
          }
        }
      }
    };
  }

  subscribePattern(pattern: string, handler: MessageHandler): () => void {
    if (!this.patternSubscriptions.has(pattern)) {
      this.patternSubscriptions.set(pattern, new Set());
      
      // Notify server of pattern subscription
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'subscribe_pattern', pattern }));
      }
    }
    
    this.patternSubscriptions.get(pattern)!.add(handler);
    
    return () => {
      const handlers = this.patternSubscriptions.get(pattern);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.patternSubscriptions.delete(pattern);
        }
      }
    };
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: PubSubMessage): void {
    const { topic } = message;
    
    // Direct topic subscribers
    const topicHandlers = this.subscriptions.get(topic);
    if (topicHandlers) {
      topicHandlers.forEach(handler => {
        Promise.resolve(handler(message)).catch(console.error);
      });
    }
    
    // Pattern subscribers
    for (const [pattern, handlers] of this.patternSubscriptions) {
      if (this.matchesPattern(topic, pattern)) {
        handlers.forEach(handler => {
          Promise.resolve(handler(message)).catch(console.error);
        });
      }
    }
  }

  private matchesPattern(topic: string, pattern: string): boolean {
    // Same pattern matching logic as LocalPubSubAdapter
    if (pattern === '*' || pattern === '**') return true;
    
    const topicParts = topic.split('.');
    const patternParts = pattern.split('.');
    
    let t = 0, p = 0;
    
    while (t < topicParts.length && p < patternParts.length) {
      if (patternParts[p] === '**') {
        return true;
      } else if (patternParts[p] === '*' || patternParts[p] === topicParts[t]) {
        t++;
        p++;
      } else {
        return false;
      }
    }
    
    return t === topicParts.length && p === patternParts.length;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(console.error);
    }, this.reconnectInterval);
  }
}

/**
 * Main PubSub hook
 */
export function usePubSub(options: UsePubSubOptions = {}): UsePubSubReturn {
  const {
    adapter: adapterType = 'local',
    websocketUrl,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    debug = false
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [metrics, setMetrics] = useState({
    messagesPublished: 0,
    messagesReceived: 0,
    subscriptionCount: 0,
    lastMessageTime: 0
  });

  const adapterRef = useRef<PubSubAdapter | null>(null);
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Initialize adapter
  useEffect(() => {
    let adapter: PubSubAdapter;
    
    switch (adapterType) {
      case 'websocket':
        if (!websocketUrl) {
          throw new Error('WebSocket URL required for WebSocket adapter');
        }
        adapter = new WebSocketPubSubAdapter(
          websocketUrl,
          reconnectInterval,
          maxReconnectAttempts
        );
        break;
      
      case 'distributed':
        // Would implement distributed adapter (Redis, etc.)
        adapter = new LocalPubSubAdapter();
        break;
      
      case 'local':
      default:
        adapter = new LocalPubSubAdapter();
        break;
    }
    
    adapterRef.current = adapter;
    
    adapter.connect()
      .then(() => setIsConnected(true))
      .catch(error => {
        console.error('Failed to connect PubSub adapter:', error);
        setIsConnected(false);
      });
    
    return () => {
      adapter.disconnect();
    };
  }, [adapterType, websocketUrl, reconnectInterval, maxReconnectAttempts]);

  // Publish message
  const publish = useCallback(async <T = any>(
    topic: string,
    event: string,
    payload: T,
    metadata?: Record<string, any>
  ): Promise<void> => {
    if (!adapterRef.current) {
      throw new Error('PubSub adapter not initialized');
    }
    
    const message: PubSubMessage<T> = {
      topic,
      event,
      payload,
      timestamp: Date.now(),
      metadata
    };
    
    await adapterRef.current.publish(topic, message);
    
    setMetrics(prev => ({
      ...prev,
      messagesPublished: prev.messagesPublished + 1,
      lastMessageTime: Date.now()
    }));
    
    if (debug) {
      console.log('Published message:', { topic, event, payload });
    }
  }, [debug]);

  // Broadcast to all topics
  const broadcast = useCallback(async <T = any>(
    event: string,
    payload: T,
    metadata?: Record<string, any>
  ): Promise<void> => {
    return publish('*', event, payload, metadata);
  }, [publish]);

  // Subscribe to topic
  const subscribe = useCallback(<T = any>(
    topic: string,
    handler: MessageHandler<T>
  ): (() => void) => {
    if (!adapterRef.current) {
      throw new Error('PubSub adapter not initialized');
    }
    
    const wrappedHandler: MessageHandler<T> = (message) => {
      setMetrics(prev => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        lastMessageTime: Date.now()
      }));
      
      startTransition(() => {
        handler(message);
      });
    };
    
    const unsubscribe = adapterRef.current.subscribe(topic, wrappedHandler);
    
    setTopics(prev => Array.from(new Set([...prev, topic])));
    setMetrics(prev => ({
      ...prev,
      subscriptionCount: prev.subscriptionCount + 1
    }));
    
    const subscriptionKey = `${topic}_${Date.now()}`;
    subscriptionsRef.current.set(subscriptionKey, unsubscribe);
    
    return () => {
      unsubscribe();
      subscriptionsRef.current.delete(subscriptionKey);
      setMetrics(prev => ({
        ...prev,
        subscriptionCount: Math.max(0, prev.subscriptionCount - 1)
      }));
    };
  }, []);

  // Subscribe with pattern
  const subscribePattern = useCallback(<T = any>(
    pattern: string,
    handler: MessageHandler<T>
  ): (() => void) => {
    if (!adapterRef.current) {
      throw new Error('PubSub adapter not initialized');
    }
    
    const wrappedHandler: MessageHandler<T> = (message) => {
      setMetrics(prev => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        lastMessageTime: Date.now()
      }));
      
      startTransition(() => {
        handler(message);
      });
    };
    
    const unsubscribe = adapterRef.current.subscribePattern(pattern, wrappedHandler);
    
    setMetrics(prev => ({
      ...prev,
      subscriptionCount: prev.subscriptionCount + 1
    }));
    
    const subscriptionKey = `pattern_${pattern}_${Date.now()}`;
    subscriptionsRef.current.set(subscriptionKey, unsubscribe);
    
    return () => {
      unsubscribe();
      subscriptionsRef.current.delete(subscriptionKey);
      setMetrics(prev => ({
        ...prev,
        subscriptionCount: Math.max(0, prev.subscriptionCount - 1)
      }));
    };
  }, []);

  // Subscribe once
  const subscribeOnce = useCallback(<T = any>(
    topic: string,
    handler: MessageHandler<T>
  ): (() => void) => {
    let unsubscribe: (() => void) | null = null;
    
    const onceHandler: MessageHandler<T> = (message) => {
      handler(message);
      if (unsubscribe) {
        unsubscribe();
      }
    };
    
    unsubscribe = subscribe(topic, onceHandler);
    return unsubscribe;
  }, [subscribe]);

  // Unsubscribe from topic
  const unsubscribe = useCallback((topic: string): void => {
    setTopics(prev => prev.filter(t => t !== topic));
  }, []);

  // Unsubscribe all
  const unsubscribeAll = useCallback((): void => {
    subscriptionsRef.current.forEach(unsub => unsub());
    subscriptionsRef.current.clear();
    setTopics([]);
    setMetrics(prev => ({
      ...prev,
      subscriptionCount: 0
    }));
  }, []);

  return {
    publish,
    broadcast,
    subscribe,
    subscribePattern,
    subscribeOnce,
    unsubscribe,
    unsubscribeAll,
    isConnected,
    topics,
    metrics
  };
}

/**
 * Hook for topic-specific subscriptions
 */
export function useTopicSubscription<T = any>(
  topic: string,
  handler: MessageHandler<T>,
  deps: React.DependencyList = []
): {
  isSubscribed: boolean;
  lastMessage: PubSubMessage<T> | null;
  messageCount: number;
} {
  const pubsub = usePubSub();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastMessage, setLastMessage] = useState<PubSubMessage<T> | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const wrappedHandler: MessageHandler<T> = (message) => {
      setLastMessage(message);
      setMessageCount(prev => prev + 1);
      handler(message);
    };

    const unsubscribe = pubsub.subscribe(topic, wrappedHandler);
    setIsSubscribed(true);

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [topic, ...deps]);

  return {
    isSubscribed,
    lastMessage,
    messageCount
  };
}

/**
 * Hook for event emitter pattern
 */
export function useEventEmitter<Events extends Record<string, any>>(): {
  emit: <K extends keyof Events>(event: K, data: Events[K]) => Promise<void>;
  on: <K extends keyof Events>(event: K, handler: (data: Events[K]) => void) => () => void;
  off: <K extends keyof Events>(event: K) => void;
} {
  const pubsub = usePubSub();
  const topicPrefix = useRef(`events_${Math.random().toString(36).substring(2, 9)}`);

  const emit = useCallback(async <K extends keyof Events>(
    event: K,
    data: Events[K]
  ): Promise<void> => {
    const topic = `${topicPrefix.current}.${String(event)}`;
    return pubsub.publish(topic, String(event), data);
  }, [pubsub]);

  const on = useCallback(<K extends keyof Events>(
    event: K,
    handler: (data: Events[K]) => void
  ): (() => void) => {
    const topic = `${topicPrefix.current}.${String(event)}`;
    return pubsub.subscribe(topic, (message) => handler(message.payload));
  }, [pubsub]);

  const off = useCallback(<K extends keyof Events>(event: K): void => {
    const topic = `${topicPrefix.current}.${String(event)}`;
    pubsub.unsubscribe(topic);
  }, [pubsub]);

  return { emit, on, off };
}