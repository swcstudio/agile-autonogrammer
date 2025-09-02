/**
 * Actor System - Elixir/Phoenix-inspired concurrency for Node.js
 * 
 * This module provides an Actor model implementation similar to Elixir's processes,
 * bringing lightweight concurrency, fault tolerance, and message passing to JavaScript.
 */

import { loadBinding } from './wrapper';

const binding = loadBinding();

/**
 * Actor ID type - unique identifier for each actor
 */
export type ActorId = string;

/**
 * Message types that actors can send and receive
 */
export interface ActorMessage {
  type: 'call' | 'cast' | 'info';
  payload: Buffer | any;
  from?: ActorId;
  replyTo?: (response: any) => void;
}

/**
 * Actor behavior interface - defines how an actor handles messages
 */
export interface ActorBehavior {
  init?(args?: any): Promise<void>;
  handleCall?(request: any, from: ActorId): Promise<any>;
  handleCast?(request: any): Promise<void>;
  handleInfo?(info: any): Promise<void>;
  terminate?(reason: string): Promise<void>;
}

/**
 * Actor System - manages all actors in the application
 */
export class ActorSystem {
  private nativeSystem: any;
  private actors: Map<ActorId, Actor>;
  private registry: Map<string, ActorId>;

  constructor() {
    this.nativeSystem = new binding.JsActorSystem();
    this.actors = new Map();
    this.registry = new Map();
  }

  /**
   * Spawn a new actor with the given behavior
   */
  spawn(behavior: ActorBehavior, options?: { name?: string }): Actor {
    const actorId = this.nativeSystem.spawnActor('custom') as ActorId;
    const actor = new Actor(actorId, this.nativeSystem, behavior);
    
    this.actors.set(actorId, actor);
    
    if (options?.name) {
      this.register(options.name, actorId);
    }
    
    return actor;
  }

  /**
   * Register a named actor for easy lookup
   */
  register(name: string, actorId: ActorId): void {
    this.nativeSystem.registerActor(name, actorId);
    this.registry.set(name, actorId);
  }

  /**
   * Look up an actor by name
   */
  whereis(name: string): Actor | undefined {
    const actorId = this.nativeSystem.whereis(name);
    if (actorId) {
      return this.actors.get(actorId);
    }
    return undefined;
  }

  /**
   * Send a synchronous call to an actor and wait for response
   */
  async call(actor: Actor | ActorId, message: any, timeout: number = 5000): Promise<any> {
    const actorId = typeof actor === 'string' ? actor : actor.id;
    const payload = Buffer.from(JSON.stringify(message));
    const response = await this.nativeSystem.callActor(actorId, payload, timeout);
    return JSON.parse(response.toString());
  }

  /**
   * Send an asynchronous cast to an actor (fire and forget)
   */
  async cast(actor: Actor | ActorId, message: any): Promise<void> {
    const actorId = typeof actor === 'string' ? actor : actor.id;
    const payload = Buffer.from(JSON.stringify(message));
    await this.nativeSystem.castActor(actorId, payload);
  }

  /**
   * Stop an actor
   */
  stop(actor: Actor | ActorId): void {
    const actorId = typeof actor === 'string' ? actor : actor.id;
    this.nativeSystem.stopActor(actorId);
    this.actors.delete(actorId);
  }

  /**
   * Get the number of active actors
   */
  getActorCount(): number {
    return this.nativeSystem.actorCount();
  }

  /**
   * Create a pool of actors for parallel processing
   */
  createPool(behavior: ActorBehavior, size: number): ActorPool {
    const actors: Actor[] = [];
    for (let i = 0; i < size; i++) {
      actors.push(this.spawn(behavior));
    }
    return new ActorPool(actors, this);
  }
}

/**
 * Individual Actor instance
 */
export class Actor {
  constructor(
    public readonly id: ActorId,
    private nativeSystem: any,
    private behavior: ActorBehavior
  ) {
    // Initialize the actor if it has an init method
    if (behavior.init) {
      behavior.init().catch(console.error);
    }
  }

  /**
   * Send a synchronous call to this actor
   */
  async call(message: any, timeout: number = 5000): Promise<any> {
    const payload = Buffer.from(JSON.stringify(message));
    const response = await this.nativeSystem.callActor(this.id, payload, timeout);
    return JSON.parse(response.toString());
  }

  /**
   * Send an asynchronous cast to this actor
   */
  async cast(message: any): Promise<void> {
    const payload = Buffer.from(JSON.stringify(message));
    await this.nativeSystem.castActor(this.id, payload);
  }

  /**
   * Link this actor to another (for fault tolerance)
   */
  link(other: Actor): void {
    // Implementation would handle linking for fault tolerance
    console.log(`Linking actor ${this.id} to ${other.id}`);
  }

  /**
   * Monitor another actor for failures
   */
  monitor(other: Actor): void {
    // Implementation would set up monitoring
    console.log(`Monitoring actor ${other.id} from ${this.id}`);
  }
}

/**
 * Actor Pool for load balancing work across multiple actors
 */
export class ActorPool {
  private currentIndex: number = 0;

  constructor(
    private actors: Actor[],
    private system: ActorSystem
  ) {}

  /**
   * Send a call to the next actor in the pool (round-robin)
   */
  async call(message: any, timeout: number = 5000): Promise<any> {
    const actor = this.getNextActor();
    return actor.call(message, timeout);
  }

  /**
   * Send a cast to the next actor in the pool
   */
  async cast(message: any): Promise<void> {
    const actor = this.getNextActor();
    return actor.cast(message);
  }

  /**
   * Map a function across all actors in the pool
   */
  async map<T>(fn: (actor: Actor) => Promise<T>): Promise<T[]> {
    return Promise.all(this.actors.map(fn));
  }

  /**
   * Execute a function on all actors in parallel
   */
  async broadcast(message: any): Promise<void> {
    await Promise.all(this.actors.map(actor => actor.cast(message)));
  }

  private getNextActor(): Actor {
    const actor = this.actors[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.actors.length;
    return actor;
  }

  /**
   * Resize the pool
   */
  async resize(newSize: number): Promise<void> {
    const currentSize = this.actors.length;
    
    if (newSize > currentSize) {
      // Add more actors
      const behavior = this.actors[0]?.behavior;
      if (behavior) {
        for (let i = currentSize; i < newSize; i++) {
          this.actors.push(this.system.spawn(behavior));
        }
      }
    } else if (newSize < currentSize) {
      // Remove actors
      const toRemove = this.actors.splice(newSize);
      toRemove.forEach(actor => this.system.stop(actor));
    }
  }

  /**
   * Shutdown all actors in the pool
   */
  shutdown(): void {
    this.actors.forEach(actor => this.system.stop(actor));
    this.actors = [];
  }
}

/**
 * Example: Counter Actor
 */
export class CounterActor implements ActorBehavior {
  private count: number = 0;

  async handleCall(request: any): Promise<any> {
    switch (request.action) {
      case 'get':
        return { count: this.count };
      case 'increment':
        this.count++;
        return { count: this.count };
      case 'decrement':
        this.count--;
        return { count: this.count };
      case 'reset':
        this.count = 0;
        return { count: this.count };
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  }

  async handleCast(request: any): Promise<void> {
    if (request.action === 'reset') {
      this.count = 0;
    }
  }
}

/**
 * Example: Worker Actor for CPU-intensive tasks
 */
export class WorkerActor implements ActorBehavior {
  async handleCall(request: any): Promise<any> {
    const { task, data } = request;
    
    switch (task) {
      case 'fibonacci':
        return this.fibonacci(data.n);
      case 'factorial':
        return this.factorial(data.n);
      case 'prime':
        return this.isPrime(data.n);
      default:
        throw new Error(`Unknown task: ${task}`);
    }
  }

  private fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    return n * this.factorial(n - 1);
  }

  private isPrime(n: number): boolean {
    if (n <= 1) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  }
}

// Export a singleton instance for convenience
export const actorSystem = new ActorSystem();