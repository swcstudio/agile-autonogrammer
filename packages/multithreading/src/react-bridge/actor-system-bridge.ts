/**
 * Actor System Bridge - TypeScript/React bridge for Rust actor system
 * 
 * Provides high-level object-oriented interface to the native actor system
 * with full React 19 integration and type safety.
 */

import { EventEmitter } from 'events';

// Import the native bindings (will be loaded dynamically)
declare const __non_webpack_require__: any;
const binding = typeof __non_webpack_require__ !== 'undefined' 
  ? __non_webpack_require__('../build/Release/multithreading.node')
  : require('../build/Release/multithreading.node');

/**
 * Actor ID type - unique identifier for each actor
 */
export type ActorId = string;
export type ActorRef<T = any> = {
  id: ActorId;
  _messageType?: T;
};

/**
 * Message types for actor communication
 */
export interface ActorMessage<T = any> {
  type: 'call' | 'cast' | 'info' | 'stop' | 'link' | 'monitor';
  payload: T;
  from?: ActorId;
  correlationId?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

/**
 * Actor behavior definition
 */
export interface ActorBehavior<State = any, Message = any> {
  /**
   * Initialize the actor's state
   */
  init?(): State | Promise<State>;

  /**
   * Handle incoming messages
   */
  receive(
    message: ActorMessage<Message>,
    state: State
  ): State | Promise<State> | { state: State; reply?: any };

  /**
   * Called when the actor is about to stop
   */
  terminate?(reason: string, state: State): void | Promise<void>;

  /**
   * Handle actor crashes and restarts
   */
  onError?(error: Error, state: State): State | 'stop' | 'restart';
}

/**
 * Actor system configuration
 */
export interface ActorSystemConfig {
  maxActors?: number;
  schedulerThreads?: number;
  enableMetrics?: boolean;
  enableTracing?: boolean;
  defaultTimeout?: number;
  supervisorStrategy?: 'one-for-one' | 'one-for-all' | 'rest-for-one';
}

/**
 * Actor spawn options
 */
export interface SpawnOptions {
  name?: string;
  mailboxSize?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  supervisor?: ActorRef;
  linked?: ActorRef[];
  monitored?: ActorRef[];
}

/**
 * Actor system metrics
 */
export interface ActorSystemMetrics {
  totalActors: number;
  activeActors: number;
  messageQueue: number;
  averageLatency: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * Main Actor System class - manages all actors
 */
export class ActorSystem extends EventEmitter {
  private nativeSystem: any;
  private actors: Map<ActorId, ActorInstance<any, any>>;
  private registry: Map<string, ActorId>;
  private supervisors: Map<ActorId, SupervisorInstance>;
  private config: ActorSystemConfig;
  private metricsCollector: NodeJS.Timer | null = null;

  constructor(config: ActorSystemConfig = {}) {
    super();
    this.config = {
      maxActors: 100000,
      schedulerThreads: 4,
      enableMetrics: true,
      enableTracing: false,
      defaultTimeout: 5000,
      supervisorStrategy: 'one-for-one',
      ...config
    };

    this.nativeSystem = new binding.JsActorSystem();
    this.actors = new Map();
    this.registry = new Map();
    this.supervisors = new Map();

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Spawn a new actor
   */
  spawn<S, M>(
    behavior: ActorBehavior<S, M>,
    options: SpawnOptions = {}
  ): ActorRef<M> {
    const actorId = this.nativeSystem.spawnActor('custom') as ActorId;
    const actor = new ActorInstance(actorId, behavior, this);
    
    this.actors.set(actorId, actor);
    
    if (options.name) {
      this.register(options.name, actorId);
    }

    // Handle linking
    if (options.linked) {
      options.linked.forEach(linkedActor => {
        this.link(actorId, linkedActor.id);
      });
    }

    // Handle monitoring
    if (options.monitored) {
      options.monitored.forEach(monitoredActor => {
        this.monitor(actorId, monitoredActor.id);
      });
    }

    // Handle supervision
    if (options.supervisor) {
      this.supervise(options.supervisor.id, actorId);
    }

    // Initialize the actor
    actor.initialize();

    this.emit('actor:spawned', { actorId, options });
    
    return { id: actorId, _messageType: undefined as any as M };
  }

  /**
   * Send a synchronous call to an actor and wait for response
   */
  async call<T, R>(
    actor: ActorRef<T>,
    message: T,
    timeout?: number
  ): Promise<R> {
    const timeoutMs = timeout || this.config.defaultTimeout || 5000;
    const correlationId = this.generateCorrelationId();
    
    const actorMessage: ActorMessage<T> = {
      type: 'call',
      payload: message,
      correlationId,
      timestamp: Date.now()
    };

    const serialized = this.serializeMessage(actorMessage);
    
    try {
      const response = await this.nativeSystem.callActor(
        actor.id,
        serialized,
        timeoutMs
      );
      
      return this.deserializeMessage(response);
    } catch (error) {
      this.emit('actor:call:error', { actorId: actor.id, error });
      throw error;
    }
  }

  /**
   * Send an asynchronous cast to an actor (fire and forget)
   */
  async cast<T>(actor: ActorRef<T>, message: T): Promise<void> {
    const actorMessage: ActorMessage<T> = {
      type: 'cast',
      payload: message,
      timestamp: Date.now()
    };

    const serialized = this.serializeMessage(actorMessage);
    
    try {
      await this.nativeSystem.castActor(actor.id, serialized);
      this.emit('actor:cast', { actorId: actor.id, message });
    } catch (error) {
      this.emit('actor:cast:error', { actorId: actor.id, error });
      throw error;
    }
  }

  /**
   * Register a named actor
   */
  register(name: string, actorId: ActorId): void {
    this.nativeSystem.registerActor(name, actorId);
    this.registry.set(name, actorId);
    this.emit('actor:registered', { name, actorId });
  }

  /**
   * Look up an actor by name
   */
  whereis<T = any>(name: string): ActorRef<T> | undefined {
    const actorId = this.nativeSystem.whereis(name);
    if (actorId) {
      return { id: actorId, _messageType: undefined as any as T };
    }
    return undefined;
  }

  /**
   * Link two actors for fault tolerance
   */
  link(actorId1: ActorId, actorId2: ActorId): void {
    // Implementation would send link message to actors
    this.emit('actors:linked', { actor1: actorId1, actor2: actorId2 });
  }

  /**
   * Monitor an actor for failures
   */
  monitor(monitorId: ActorId, targetId: ActorId): void {
    // Implementation would set up monitoring
    this.emit('actor:monitoring', { monitor: monitorId, target: targetId });
  }

  /**
   * Add an actor to supervision
   */
  supervise(supervisorId: ActorId, childId: ActorId): void {
    let supervisor = this.supervisors.get(supervisorId);
    if (!supervisor) {
      supervisor = new SupervisorInstance(supervisorId, this.config.supervisorStrategy!);
      this.supervisors.set(supervisorId, supervisor);
    }
    supervisor.addChild(childId);
    this.emit('actor:supervised', { supervisor: supervisorId, child: childId });
  }

  /**
   * Stop an actor
   */
  stop(actor: ActorRef, reason: string = 'normal'): void {
    this.nativeSystem.stopActor(actor.id);
    this.actors.delete(actor.id);
    this.emit('actor:stopped', { actorId: actor.id, reason });
  }

  /**
   * Get system metrics
   */
  getMetrics(): ActorSystemMetrics {
    const actorCount = this.nativeSystem.actorCount();
    return {
      totalActors: actorCount,
      activeActors: this.actors.size,
      messageQueue: 0, // Would need native implementation
      averageLatency: 0, // Would need native implementation
      throughput: 0, // Would need native implementation
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user
    };
  }

  /**
   * Shutdown the actor system
   */
  async shutdown(): Promise<void> {
    this.emit('system:shutting-down');
    
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
    }

    // Stop all actors
    for (const [actorId] of this.actors) {
      this.stop({ id: actorId });
    }

    this.actors.clear();
    this.registry.clear();
    this.supervisors.clear();
    
    this.emit('system:shutdown');
  }

  /**
   * Create an actor pool for load balancing
   */
  createPool<S, M>(
    behavior: ActorBehavior<S, M>,
    size: number,
    options: SpawnOptions = {}
  ): ActorPool<M> {
    const actors: ActorRef<M>[] = [];
    
    for (let i = 0; i < size; i++) {
      const actor = this.spawn(behavior, {
        ...options,
        name: options.name ? `${options.name}_${i}` : undefined
      });
      actors.push(actor);
    }

    return new ActorPool(actors, this);
  }

  // Private methods

  private serializeMessage(message: any): Buffer {
    return Buffer.from(JSON.stringify(message));
  }

  private deserializeMessage(buffer: Buffer): any {
    return JSON.parse(buffer.toString());
  }

  private generateCorrelationId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private startMetricsCollection(): void {
    this.metricsCollector = setInterval(() => {
      const metrics = this.getMetrics();
      this.emit('metrics', metrics);
    }, 1000);
  }
}

/**
 * Individual actor instance
 */
class ActorInstance<S, M> {
  private state: S | undefined;
  private isInitialized = false;

  constructor(
    public readonly id: ActorId,
    private behavior: ActorBehavior<S, M>,
    private system: ActorSystem
  ) {}

  async initialize(): Promise<void> {
    if (this.behavior.init) {
      this.state = await this.behavior.init();
    }
    this.isInitialized = true;
  }

  async processMessage(message: ActorMessage<M>): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Actor not initialized');
    }

    try {
      const result = await this.behavior.receive(message, this.state!);
      
      if (typeof result === 'object' && 'state' in result) {
        this.state = result.state;
        return result.reply;
      } else {
        this.state = result;
        return undefined;
      }
    } catch (error) {
      if (this.behavior.onError) {
        const errorResult = await this.behavior.onError(error as Error, this.state!);
        if (errorResult === 'stop') {
          this.system.stop({ id: this.id }, 'error');
        } else if (errorResult === 'restart') {
          await this.initialize();
        } else {
          this.state = errorResult;
        }
      }
      throw error;
    }
  }

  async terminate(reason: string): Promise<void> {
    if (this.behavior.terminate) {
      await this.behavior.terminate(reason, this.state!);
    }
  }
}

/**
 * Supervisor instance for fault tolerance
 */
class SupervisorInstance {
  private children: Set<ActorId> = new Set();

  constructor(
    public readonly id: ActorId,
    private strategy: string
  ) {}

  addChild(childId: ActorId): void {
    this.children.add(childId);
  }

  removeChild(childId: ActorId): void {
    this.children.delete(childId);
  }

  handleChildFailure(childId: ActorId, error: Error): void {
    switch (this.strategy) {
      case 'one-for-one':
        // Restart only the failed child
        break;
      case 'one-for-all':
        // Restart all children
        break;
      case 'rest-for-one':
        // Restart failed child and all started after it
        break;
    }
  }
}

/**
 * Actor pool for load balancing
 */
export class ActorPool<M> {
  private currentIndex = 0;

  constructor(
    private actors: ActorRef<M>[],
    private system: ActorSystem
  ) {}

  /**
   * Get the next actor in round-robin fashion
   */
  getNext(): ActorRef<M> {
    const actor = this.actors[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.actors.length;
    return actor;
  }

  /**
   * Send a call to the next actor
   */
  async call<R>(message: M, timeout?: number): Promise<R> {
    const actor = this.getNext();
    return this.system.call(actor, message, timeout);
  }

  /**
   * Send a cast to the next actor
   */
  async cast(message: M): Promise<void> {
    const actor = this.getNext();
    return this.system.cast(actor, message);
  }

  /**
   * Broadcast a message to all actors
   */
  async broadcast(message: M): Promise<void> {
    await Promise.all(
      this.actors.map(actor => this.system.cast(actor, message))
    );
  }

  /**
   * Map a function over all actors
   */
  async map<R>(fn: (actor: ActorRef<M>) => Promise<R>): Promise<R[]> {
    return Promise.all(this.actors.map(fn));
  }

  /**
   * Get pool size
   */
  size(): number {
    return this.actors.length;
  }

  /**
   * Resize the pool
   */
  resize(newSize: number, behavior?: ActorBehavior<any, M>): void {
    if (newSize > this.actors.length && behavior) {
      // Add more actors
      const toAdd = newSize - this.actors.length;
      for (let i = 0; i < toAdd; i++) {
        const actor = this.system.spawn(behavior);
        this.actors.push(actor);
      }
    } else if (newSize < this.actors.length) {
      // Remove actors
      const toRemove = this.actors.splice(newSize);
      toRemove.forEach(actor => this.system.stop(actor));
    }
  }

  /**
   * Shutdown the pool
   */
  shutdown(): void {
    this.actors.forEach(actor => this.system.stop(actor));
    this.actors = [];
  }
}

// Export a singleton instance for convenience
export const defaultActorSystem = new ActorSystem();