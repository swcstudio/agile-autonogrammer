import { EventEmitter } from 'events';
import { Subject, Observable, BehaviorSubject, ReplaySubject, filter, map, scan, debounceTime, buffer, bufferTime } from 'rxjs';
import { BaseAgent } from '../agents/BaseAgent';
import { ActorSystem, Actor } from '../../multithreading/actor-system';

export interface Message {
  id: string;
  type: 'request' | 'response' | 'event' | 'notification' | 'broadcast';
  from: string;
  to: string | string[];
  subject: string;
  payload: any;
  metadata: {
    timestamp: number;
    correlationId?: string;
    replyTo?: string;
    priority: number;
    ttl?: number;
    contentType?: string;
    encoding?: string;
    retryCount?: number;
    maxRetries?: number;
  };
}

export interface Topic {
  name: string;
  subscribers: Set<string>;
  messages: ReplaySubject<Message>;
  metadata: {
    created: number;
    lastActivity: number;
    messageCount: number;
    retentionPolicy?: 'all' | 'last' | 'time' | 'count';
    retentionValue?: number;
  };
}

export interface Queue {
  name: string;
  messages: Message[];
  consumers: Set<string>;
  config: {
    maxSize: number;
    priority: boolean;
    persistent: boolean;
    exclusive: boolean;
    autoDelete: boolean;
    dlq?: string; // Dead letter queue
  };
}

export interface MessagePattern {
  pattern: string;
  regex: RegExp;
  handlers: Map<string, (message: Message) => void>;
}

export interface BrokerConfig {
  maxMessageSize: number;
  maxQueueSize: number;
  messageRetentionTime: number;
  enablePersistence: boolean;
  enableCompression: boolean;
  enableEncryption: boolean;
  actorSystemEnabled: boolean;
  bufferSize: number;
  bufferTime: number;
}

export interface DeliveryGuarantee {
  type: 'at-most-once' | 'at-least-once' | 'exactly-once';
  ackTimeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoff: number;
  };
}

export class MessageBroker extends EventEmitter {
  private config: BrokerConfig;
  private agents: Map<string, BaseAgent>;
  private topics: Map<string, Topic>;
  private queues: Map<string, Queue>;
  private patterns: Map<string, MessagePattern>;
  private messageStream: Subject<Message>;
  private messageBuffer: Message[];
  private actorSystem?: ActorSystem;
  private actors: Map<string, Actor>;
  private pendingAcks: Map<string, {
    message: Message;
    timestamp: number;
    retries: number;
  }>;
  private deadLetterQueue: Message[];
  private metrics: {
    messagesPublished: number;
    messagesDelivered: number;
    messagesFailed: number;
    averageLatency: number;
    throughput: number;
  };

  constructor(config: Partial<BrokerConfig> = {}) {
    super();
    this.config = {
      maxMessageSize: 1024 * 1024, // 1MB
      maxQueueSize: 10000,
      messageRetentionTime: 3600000, // 1 hour
      enablePersistence: false,
      enableCompression: false,
      enableEncryption: false,
      actorSystemEnabled: false,
      bufferSize: 100,
      bufferTime: 100,
      ...config
    };

    this.agents = new Map();
    this.topics = new Map();
    this.queues = new Map();
    this.patterns = new Map();
    this.messageStream = new Subject<Message>();
    this.messageBuffer = [];
    this.actors = new Map();
    this.pendingAcks = new Map();
    this.deadLetterQueue = [];
    this.metrics = {
      messagesPublished: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      averageLatency: 0,
      throughput: 0
    };

    if (this.config.actorSystemEnabled) {
      this.initializeActorSystem();
    }

    this.setupMessageProcessing();
    this.startMetricsCollection();
  }

  private initializeActorSystem(): void {
    this.actorSystem = new ActorSystem();
    this.emit('actor-system:initialized');
  }

  private setupMessageProcessing(): void {
    // Buffer messages for batch processing
    this.messageStream.pipe(
      bufferTime(this.config.bufferTime, undefined, this.config.bufferSize),
      filter(messages => messages.length > 0)
    ).subscribe(messages => {
      this.processBatch(messages);
    });

    // Setup dead letter queue processing
    setInterval(() => {
      this.processDeadLetterQueue();
    }, 30000); // Process every 30 seconds

    // Setup pending acknowledgment timeout checks
    setInterval(() => {
      this.checkPendingAcks();
    }, 5000); // Check every 5 seconds
  }

  private startMetricsCollection(): void {
    let lastMessageCount = 0;
    setInterval(() => {
      const currentCount = this.metrics.messagesDelivered;
      this.metrics.throughput = (currentCount - lastMessageCount) / 5; // Messages per second
      lastMessageCount = currentCount;
    }, 5000);
  }

  // Core messaging methods

  public async publish(
    subject: string,
    payload: any,
    options: Partial<Message['metadata']> = {}
  ): Promise<string> {
    const message: Message = {
      id: this.generateMessageId(),
      type: 'broadcast',
      from: 'broker',
      to: [],
      subject,
      payload,
      metadata: {
        timestamp: Date.now(),
        priority: 0,
        ...options
      }
    };

    this.validateMessage(message);
    
    if (this.config.enableCompression) {
      message.payload = await this.compress(message.payload);
      message.metadata.encoding = 'gzip';
    }

    if (this.config.enableEncryption) {
      message.payload = await this.encrypt(message.payload);
      message.metadata.encoding = 'encrypted';
    }

    this.messageStream.next(message);
    this.metrics.messagesPublished++;
    
    this.emit('message:published', message);
    return message.id;
  }

  public async send(
    from: string,
    to: string | string[],
    subject: string,
    payload: any,
    guarantee: DeliveryGuarantee = { 
      type: 'at-least-once',
      ackTimeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoff: 60000
      }
    }
  ): Promise<string> {
    const message: Message = {
      id: this.generateMessageId(),
      type: 'request',
      from,
      to,
      subject,
      payload,
      metadata: {
        timestamp: Date.now(),
        priority: 0,
        maxRetries: guarantee.retryPolicy.maxRetries,
        retryCount: 0
      }
    };

    if (guarantee.type === 'exactly-once') {
      // Implement idempotency check
      const isDuplicate = await this.checkDuplicate(message);
      if (isDuplicate) {
        return message.id;
      }
    }

    return this.deliverMessage(message, guarantee);
  }

  private async deliverMessage(
    message: Message,
    guarantee: DeliveryGuarantee
  ): Promise<string> {
    const startTime = Date.now();

    try {
      if (Array.isArray(message.to)) {
        // Multicast
        await Promise.all(
          message.to.map(recipient => this.deliverToAgent(message, recipient))
        );
      } else {
        // Unicast
        await this.deliverToAgent(message, message.to);
      }

      const latency = Date.now() - startTime;
      this.updateLatencyMetrics(latency);
      this.metrics.messagesDelivered++;

      if (guarantee.type !== 'at-most-once') {
        this.pendingAcks.set(message.id, {
          message,
          timestamp: Date.now(),
          retries: 0
        });
      }

      return message.id;
    } catch (error) {
      this.handleDeliveryFailure(message, error, guarantee);
      throw error;
    }
  }

  private async deliverToAgent(message: Message, agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (this.config.actorSystemEnabled && this.actors.has(agentId)) {
      // Use actor system for delivery
      const actor = this.actors.get(agentId)!;
      await actor.cast({ type: 'message', data: message });
    } else {
      // Direct delivery
      await agent.receiveMessage?.(message);
    }
  }

  // Topic-based messaging (Pub/Sub)

  public createTopic(name: string, retentionPolicy?: Topic['metadata']['retentionPolicy']): void {
    if (this.topics.has(name)) {
      throw new Error(`Topic ${name} already exists`);
    }

    const topic: Topic = {
      name,
      subscribers: new Set(),
      messages: new ReplaySubject<Message>(
        retentionPolicy === 'last' ? 1 : undefined
      ),
      metadata: {
        created: Date.now(),
        lastActivity: Date.now(),
        messageCount: 0,
        retentionPolicy,
        retentionValue: retentionPolicy === 'time' ? this.config.messageRetentionTime : undefined
      }
    };

    this.topics.set(name, topic);
    this.emit('topic:created', name);
  }

  public subscribe(
    agentId: string,
    topicName: string,
    handler: (message: Message) => void
  ): () => void {
    const topic = this.topics.get(topicName);
    
    if (!topic) {
      throw new Error(`Topic ${topicName} not found`);
    }

    topic.subscribers.add(agentId);
    
    const subscription = topic.messages
      .pipe(filter(msg => msg.to.includes(agentId) || msg.to.includes('*')))
      .subscribe(handler);

    this.emit('topic:subscribed', { agentId, topicName });

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
      topic.subscribers.delete(agentId);
      this.emit('topic:unsubscribed', { agentId, topicName });
    };
  }

  public publishToTopic(topicName: string, message: Message): void {
    const topic = this.topics.get(topicName);
    
    if (!topic) {
      throw new Error(`Topic ${topicName} not found`);
    }

    message.to = Array.from(topic.subscribers);
    topic.messages.next(message);
    topic.metadata.lastActivity = Date.now();
    topic.metadata.messageCount++;

    this.metrics.messagesPublished++;
    this.emit('topic:message', { topicName, message });
  }

  // Queue-based messaging

  public createQueue(
    name: string,
    config: Partial<Queue['config']> = {}
  ): void {
    if (this.queues.has(name)) {
      throw new Error(`Queue ${name} already exists`);
    }

    const queue: Queue = {
      name,
      messages: [],
      consumers: new Set(),
      config: {
        maxSize: this.config.maxQueueSize,
        priority: false,
        persistent: false,
        exclusive: false,
        autoDelete: false,
        ...config
      }
    };

    this.queues.set(name, queue);
    this.emit('queue:created', name);
  }

  public enqueue(queueName: string, message: Message): void {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    if (queue.messages.length >= queue.config.maxSize) {
      if (queue.config.dlq) {
        this.enqueue(queue.config.dlq, message);
      } else {
        this.deadLetterQueue.push(message);
      }
      this.metrics.messagesFailed++;
      return;
    }

    if (queue.config.priority) {
      // Insert based on priority
      const insertIndex = queue.messages.findIndex(
        m => m.metadata.priority < message.metadata.priority
      );
      if (insertIndex === -1) {
        queue.messages.push(message);
      } else {
        queue.messages.splice(insertIndex, 0, message);
      }
    } else {
      queue.messages.push(message);
    }

    this.processQueue(queueName);
    this.emit('queue:enqueued', { queueName, message });
  }

  public dequeue(queueName: string): Message | null {
    const queue = this.queues.get(queueName);
    
    if (!queue || queue.messages.length === 0) {
      return null;
    }

    const message = queue.messages.shift()!;
    this.emit('queue:dequeued', { queueName, message });
    
    if (queue.config.autoDelete && queue.messages.length === 0 && queue.consumers.size === 0) {
      this.queues.delete(queueName);
      this.emit('queue:deleted', queueName);
    }

    return message;
  }

  public consume(
    agentId: string,
    queueName: string,
    handler: (message: Message) => Promise<void>,
    options: { autoAck?: boolean; prefetch?: number } = {}
  ): () => void {
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    if (queue.config.exclusive && queue.consumers.size > 0) {
      throw new Error(`Queue ${queueName} is exclusive`);
    }

    queue.consumers.add(agentId);

    const consumeInterval = setInterval(async () => {
      const message = this.dequeue(queueName);
      if (message) {
        try {
          await handler(message);
          if (!options.autoAck) {
            this.acknowledge(message.id);
          }
        } catch (error) {
          this.handleConsumerError(message, error);
        }
      }
    }, 100);

    this.emit('queue:consumer-added', { agentId, queueName });

    // Return stop consuming function
    return () => {
      clearInterval(consumeInterval);
      queue.consumers.delete(agentId);
      this.emit('queue:consumer-removed', { agentId, queueName });
    };
  }

  // Pattern-based routing

  public registerPattern(
    pattern: string,
    agentId: string,
    handler: (message: Message) => void
  ): void {
    const regex = this.patternToRegex(pattern);
    
    if (!this.patterns.has(pattern)) {
      this.patterns.set(pattern, {
        pattern,
        regex,
        handlers: new Map()
      });
    }

    const messagePattern = this.patterns.get(pattern)!;
    messagePattern.handlers.set(agentId, handler);
    
    this.emit('pattern:registered', { pattern, agentId });
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert wildcard pattern to regex
    // * matches any word, # matches any number of words
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]+')
      .replace(/#/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }

  // Request-Reply pattern

  public async request(
    from: string,
    to: string,
    subject: string,
    payload: any,
    timeout: number = 30000
  ): Promise<any> {
    const correlationId = this.generateMessageId();
    const replySubject = `reply.${correlationId}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.unsubscribe(from, replySubject);
        reject(new Error('Request timeout'));
      }, timeout);

      this.subscribe(from, replySubject, (reply) => {
        clearTimeout(timer);
        this.unsubscribe(from, replySubject);
        resolve(reply.payload);
      });

      this.send(from, to, subject, payload, {
        type: 'at-least-once',
        ackTimeout: timeout,
        retryPolicy: {
          maxRetries: 1,
          backoffMultiplier: 1,
          maxBackoff: timeout
        }
      }).catch(reject);
    });
  }

  public reply(
    originalMessage: Message,
    payload: any
  ): void {
    if (!originalMessage.metadata.replyTo) {
      throw new Error('No reply-to address in original message');
    }

    const replyMessage: Message = {
      id: this.generateMessageId(),
      type: 'response',
      from: originalMessage.to as string,
      to: originalMessage.from,
      subject: originalMessage.metadata.replyTo,
      payload,
      metadata: {
        timestamp: Date.now(),
        correlationId: originalMessage.metadata.correlationId || originalMessage.id,
        priority: originalMessage.metadata.priority
      }
    };

    this.messageStream.next(replyMessage);
  }

  // Actor system integration

  public createActorForAgent(agentId: string, agent: BaseAgent): void {
    if (!this.actorSystem) {
      throw new Error('Actor system not initialized');
    }

    const actor = this.actorSystem.spawn({
      async handleCall(request: any): Promise<any> {
        if (request.type === 'message') {
          await agent.receiveMessage?.(request.data);
          return { success: true };
        }
        return { success: false, error: 'Unknown request type' };
      },

      async handleCast(request: any): Promise<void> {
        if (request.type === 'message') {
          await agent.receiveMessage?.(request.data);
        }
      }
    });

    this.actors.set(agentId, actor);
    this.emit('actor:created', { agentId, actorId: actor.id });
  }

  // Utility methods

  private processBatch(messages: Message[]): void {
    for (const message of messages) {
      this.processMessage(message);
    }
  }

  private processMessage(message: Message): void {
    // Process patterns
    for (const [, pattern] of this.patterns) {
      if (pattern.regex.test(message.subject)) {
        for (const [, handler] of pattern.handlers) {
          handler(message);
        }
      }
    }

    // Process direct delivery
    if (message.to && message.to.length > 0) {
      this.deliverMessage(message, {
        type: 'at-least-once',
        ackTimeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxBackoff: 60000
        }
      });
    }
  }

  private processQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue || queue.consumers.size === 0) {
      return;
    }

    // Round-robin delivery to consumers
    const consumers = Array.from(queue.consumers);
    let consumerIndex = 0;

    while (queue.messages.length > 0 && consumers.length > 0) {
      const message = queue.messages[0];
      const consumerId = consumers[consumerIndex % consumers.length];
      
      // Attempt delivery
      this.deliverToAgent(message, consumerId)
        .then(() => {
          queue.messages.shift();
        })
        .catch(error => {
          console.error(`Failed to deliver to consumer ${consumerId}:`, error);
        });

      consumerIndex++;
    }
  }

  private processDeadLetterQueue(): void {
    if (this.deadLetterQueue.length === 0) {
      return;
    }

    const messages = [...this.deadLetterQueue];
    this.deadLetterQueue = [];

    for (const message of messages) {
      this.emit('dlq:message', message);
      // Could implement retry logic or alerting here
    }
  }

  private checkPendingAcks(): void {
    const now = Date.now();
    
    for (const [messageId, pending] of this.pendingAcks) {
      if (now - pending.timestamp > 30000) { // 30 second timeout
        // Retry or move to DLQ
        if (pending.retries < (pending.message.metadata.maxRetries || 3)) {
          pending.retries++;
          pending.timestamp = now;
          this.deliverMessage(pending.message, {
            type: 'at-least-once',
            ackTimeout: 30000,
            retryPolicy: {
              maxRetries: 3,
              backoffMultiplier: 2,
              maxBackoff: 60000
            }
          });
        } else {
          this.deadLetterQueue.push(pending.message);
          this.pendingAcks.delete(messageId);
          this.metrics.messagesFailed++;
        }
      }
    }
  }

  private acknowledge(messageId: string): void {
    if (this.pendingAcks.has(messageId)) {
      this.pendingAcks.delete(messageId);
      this.emit('message:acknowledged', messageId);
    }
  }

  private async checkDuplicate(message: Message): Promise<boolean> {
    // Implement deduplication logic
    // Could use a cache or database to track processed messages
    return false;
  }

  private handleDeliveryFailure(
    message: Message,
    error: any,
    guarantee: DeliveryGuarantee
  ): void {
    message.metadata.retryCount = (message.metadata.retryCount || 0) + 1;

    if (message.metadata.retryCount < guarantee.retryPolicy.maxRetries) {
      // Schedule retry with exponential backoff
      const delay = Math.min(
        Math.pow(guarantee.retryPolicy.backoffMultiplier, message.metadata.retryCount) * 1000,
        guarantee.retryPolicy.maxBackoff
      );

      setTimeout(() => {
        this.deliverMessage(message, guarantee);
      }, delay);
    } else {
      // Move to dead letter queue
      this.deadLetterQueue.push(message);
      this.metrics.messagesFailed++;
      this.emit('message:failed', { message, error });
    }
  }

  private handleConsumerError(message: Message, error: any): void {
    console.error('Consumer error:', error);
    this.emit('consumer:error', { message, error });
    
    // Re-queue the message
    if (message.metadata.retryCount && message.metadata.retryCount < 3) {
      message.metadata.retryCount++;
      this.messageStream.next(message);
    } else {
      this.deadLetterQueue.push(message);
    }
  }

  private validateMessage(message: Message): void {
    const messageSize = JSON.stringify(message).length;
    
    if (messageSize > this.config.maxMessageSize) {
      throw new Error(`Message size ${messageSize} exceeds maximum ${this.config.maxMessageSize}`);
    }

    if (message.metadata.ttl && Date.now() > message.metadata.timestamp + message.metadata.ttl) {
      throw new Error('Message TTL expired');
    }
  }

  private async compress(data: any): Promise<any> {
    // Implement compression
    return data;
  }

  private async encrypt(data: any): Promise<any> {
    // Implement encryption
    return data;
  }

  private updateLatencyMetrics(latency: number): void {
    const alpha = 0.2; // Exponential moving average factor
    this.metrics.averageLatency = 
      alpha * latency + (1 - alpha) * this.metrics.averageLatency;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private unsubscribe(agentId: string, topicName: string): void {
    const topic = this.topics.get(topicName);
    if (topic) {
      topic.subscribers.delete(agentId);
    }
  }

  // Public API for metrics and monitoring

  public getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  public getQueueStats(queueName: string): {
    size: number;
    consumers: number;
    config: Queue['config'];
  } | null {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }

    return {
      size: queue.messages.length,
      consumers: queue.consumers.size,
      config: { ...queue.config }
    };
  }

  public getTopicStats(topicName: string): {
    subscribers: number;
    messageCount: number;
    lastActivity: number;
  } | null {
    const topic = this.topics.get(topicName);
    if (!topic) {
      return null;
    }

    return {
      subscribers: topic.subscribers.size,
      messageCount: topic.metadata.messageCount,
      lastActivity: topic.metadata.lastActivity
    };
  }

  public registerAgent(agentId: string, agent: BaseAgent): void {
    this.agents.set(agentId, agent);
    
    if (this.config.actorSystemEnabled) {
      this.createActorForAgent(agentId, agent);
    }
    
    this.emit('agent:registered', agentId);
  }

  public unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    
    if (this.actors.has(agentId)) {
      const actor = this.actors.get(agentId)!;
      this.actorSystem?.stop(actor);
      this.actors.delete(agentId);
    }
    
    this.emit('agent:unregistered', agentId);
  }

  public shutdown(): void {
    // Clean up resources
    this.messageStream.complete();
    
    for (const topic of this.topics.values()) {
      topic.messages.complete();
    }
    
    if (this.actorSystem) {
      for (const actor of this.actors.values()) {
        this.actorSystem.stop(actor);
      }
    }
    
    this.emit('broker:shutdown');
  }
}

export default MessageBroker;