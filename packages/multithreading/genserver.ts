/**
 * GenServer - Elixir GenServer pattern implementation for Node.js
 * 
 * Provides a generic server behavior with state management,
 * synchronous calls, asynchronous casts, and lifecycle callbacks.
 */

import { loadBinding } from './wrapper';
import { ActorId, actorSystem } from './actor-system';

const binding = loadBinding();

/**
 * GenServer callback interface - similar to Elixir's GenServer behaviour
 */
export interface GenServerCallbacks<State = any> {
  /**
   * Initialize the server state
   */
  init(args?: any): Promise<State> | State;

  /**
   * Handle synchronous calls
   */
  handleCall?(request: any, from: ActorId, state: State): Promise<CallResponse<State>> | CallResponse<State>;

  /**
   * Handle asynchronous casts
   */
  handleCast?(request: any, state: State): Promise<CastResponse<State>> | CastResponse<State>;

  /**
   * Handle other messages
   */
  handleInfo?(info: any, state: State): Promise<CastResponse<State>> | CastResponse<State>;

  /**
   * Called when the server is terminating
   */
  terminate?(reason: string, state: State): Promise<void> | void;

  /**
   * Handle code changes (for hot code reloading)
   */
  codeChange?(oldVsn: string, state: State, extra: any): Promise<State> | State;
}

/**
 * Response types for GenServer callbacks
 */
export type CallResponse<State> = 
  | { reply: any; newState: State }
  | { reply: any; newState: State; timeout: number }
  | { noReply: true; newState: State }
  | { stop: string; reply?: any; newState: State };

export type CastResponse<State> = 
  | { noReply: true; newState: State }
  | { noReply: true; newState: State; timeout: number }
  | { stop: string; newState: State };

/**
 * GenServer implementation
 */
export class GenServer<State = any> {
  private nativeGenServer: any;
  private actorId?: ActorId;
  private state?: State;
  private callbacks: GenServerCallbacks<State>;

  constructor(callbacks: GenServerCallbacks<State>) {
    this.callbacks = callbacks;
    this.nativeGenServer = new binding.JsGenServer();
  }

  /**
   * Start the GenServer
   */
  async start(args?: any, options?: { name?: string }): Promise<void> {
    // Initialize state
    this.state = await Promise.resolve(this.callbacks.init(args));
    
    // Start the native GenServer
    const actorId = await this.nativeGenServer.startCounter(options?.name || 'genserver');
    this.actorId = actorId;
    
    // Register with the actor system if named
    if (options?.name) {
      actorSystem.register(options.name, actorId);
    }
  }

  /**
   * Start and link the GenServer (for supervisor trees)
   */
  async startLink(args?: any, options?: { name?: string }): Promise<void> {
    await this.start(args, options);
    // In a real implementation, this would link to the parent process
  }

  /**
   * Make a synchronous call to the GenServer
   */
  async call(request: any, timeout: number = 5000): Promise<any> {
    if (!this.actorId) {
      throw new Error('GenServer not started');
    }

    if (this.callbacks.handleCall) {
      const response = await Promise.resolve(
        this.callbacks.handleCall(request, 'caller', this.state!)
      );

      if ('reply' in response) {
        this.state = response.newState;
        return response.reply;
      } else if ('stop' in response) {
        await this.stop(response.stop);
        return response.reply;
      }
    }

    const payload = Buffer.from(JSON.stringify(request));
    const result = await this.nativeGenServer.call(this.actorId, payload, timeout);
    return JSON.parse(result.toString());
  }

  /**
   * Send an asynchronous cast to the GenServer
   */
  async cast(request: any): Promise<void> {
    if (!this.actorId) {
      throw new Error('GenServer not started');
    }

    if (this.callbacks.handleCast) {
      const response = await Promise.resolve(
        this.callbacks.handleCast(request, this.state!)
      );

      if ('noReply' in response) {
        this.state = response.newState;
      } else if ('stop' in response) {
        await this.stop(response.stop);
      }
    }

    const payload = Buffer.from(JSON.stringify(request));
    await this.nativeGenServer.cast(this.actorId, payload);
  }

  /**
   * Stop the GenServer
   */
  async stop(reason: string = 'normal'): Promise<void> {
    if (this.callbacks.terminate && this.state) {
      await Promise.resolve(this.callbacks.terminate(reason, this.state));
    }
    // Stop the native GenServer
    if (this.actorId) {
      actorSystem.stop(this.actorId);
    }
  }

  /**
   * Get the current state (for debugging)
   */
  getState(): State | undefined {
    return this.state;
  }
}

/**
 * Example: Key-Value Store GenServer
 */
export class KeyValueStore extends GenServer<Map<string, any>> {
  constructor() {
    super({
      init: () => new Map(),

      handleCall: (request, _from, state) => {
        switch (request.action) {
          case 'get':
            return {
              reply: state.get(request.key),
              newState: state
            };
          
          case 'put':
            state.set(request.key, request.value);
            return {
              reply: 'ok',
              newState: state
            };
          
          case 'delete':
            const deleted = state.delete(request.key);
            return {
              reply: deleted,
              newState: state
            };
          
          case 'keys':
            return {
              reply: Array.from(state.keys()),
              newState: state
            };
          
          case 'values':
            return {
              reply: Array.from(state.values()),
              newState: state
            };
          
          case 'clear':
            state.clear();
            return {
              reply: 'ok',
              newState: state
            };
          
          default:
            return {
              reply: { error: 'unknown_action' },
              newState: state
            };
        }
      },

      handleCast: (request, state) => {
        if (request.action === 'clear') {
          state.clear();
        }
        return { noReply: true, newState: state };
      },

      terminate: (reason, state) => {
        console.log(`KeyValueStore terminating: ${reason}, had ${state.size} entries`);
      }
    });
  }

  // Convenience methods
  async get(key: string): Promise<any> {
    return this.call({ action: 'get', key });
  }

  async put(key: string, value: any): Promise<void> {
    await this.call({ action: 'put', key, value });
  }

  async delete(key: string): Promise<boolean> {
    return this.call({ action: 'delete', key });
  }

  async keys(): Promise<string[]> {
    return this.call({ action: 'keys' });
  }

  async values(): Promise<any[]> {
    return this.call({ action: 'values' });
  }

  async clear(): Promise<void> {
    await this.cast({ action: 'clear' });
  }
}

/**
 * Example: Rate Limiter GenServer
 */
export class RateLimiter extends GenServer<{
  requests: Map<string, number[]>;
  limit: number;
  window: number;
}> {
  constructor(limit: number = 10, windowMs: number = 60000) {
    super({
      init: () => ({
        requests: new Map(),
        limit,
        window: windowMs
      }),

      handleCall: (request, _from, state) => {
        if (request.action === 'check') {
          const { key } = request;
          const now = Date.now();
          const timestamps = state.requests.get(key) || [];
          
          // Remove old timestamps outside the window
          const validTimestamps = timestamps.filter(
            t => now - t < state.window
          );
          
          if (validTimestamps.length < state.limit) {
            // Allow the request
            validTimestamps.push(now);
            state.requests.set(key, validTimestamps);
            return {
              reply: { allowed: true, remaining: state.limit - validTimestamps.length },
              newState: state
            };
          } else {
            // Rate limit exceeded
            state.requests.set(key, validTimestamps);
            return {
              reply: { allowed: false, retryAfter: state.window - (now - validTimestamps[0]) },
              newState: state
            };
          }
        }
        
        return {
          reply: { error: 'unknown_action' },
          newState: state
        };
      },

      handleInfo: (_info, state) => {
        // Periodically clean up old entries
        const now = Date.now();
        for (const [key, timestamps] of state.requests.entries()) {
          const valid = timestamps.filter(t => now - t < state.window);
          if (valid.length === 0) {
            state.requests.delete(key);
          } else {
            state.requests.set(key, valid);
          }
        }
        return { noReply: true, newState: state };
      }
    });
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; remaining?: number; retryAfter?: number }> {
    return this.call({ action: 'check', key });
  }
}

/**
 * Example: Session Manager GenServer
 */
export class SessionManager extends GenServer<{
  sessions: Map<string, { userId: string; data: any; expiresAt: number }>;
  ttl: number;
}> {
  constructor(ttlMs: number = 3600000) { // 1 hour default
    super({
      init: () => ({
        sessions: new Map(),
        ttl: ttlMs
      }),

      handleCall: (request, _from, state) => {
        const now = Date.now();
        
        switch (request.action) {
          case 'create': {
            const sessionId = Math.random().toString(36).substring(2);
            state.sessions.set(sessionId, {
              userId: request.userId,
              data: request.data || {},
              expiresAt: now + state.ttl
            });
            return {
              reply: { sessionId },
              newState: state
            };
          }
          
          case 'get': {
            const session = state.sessions.get(request.sessionId);
            if (session && session.expiresAt > now) {
              return {
                reply: session,
                newState: state
              };
            }
            return {
              reply: null,
              newState: state
            };
          }
          
          case 'update': {
            const session = state.sessions.get(request.sessionId);
            if (session && session.expiresAt > now) {
              session.data = { ...session.data, ...request.data };
              session.expiresAt = now + state.ttl; // Refresh TTL
              return {
                reply: 'ok',
                newState: state
              };
            }
            return {
              reply: { error: 'session_not_found' },
              newState: state
            };
          }
          
          case 'destroy': {
            const deleted = state.sessions.delete(request.sessionId);
            return {
              reply: deleted,
              newState: state
            };
          }
          
          default:
            return {
              reply: { error: 'unknown_action' },
              newState: state
            };
        }
      },

      handleInfo: (_info, state) => {
        // Clean up expired sessions
        const now = Date.now();
        for (const [id, session] of state.sessions.entries()) {
          if (session.expiresAt <= now) {
            state.sessions.delete(id);
          }
        }
        return { noReply: true, newState: state };
      }
    });

    // Set up periodic cleanup
    setInterval(() => {
      this.cast({ action: 'cleanup' });
    }, 60000); // Every minute
  }

  async createSession(userId: string, data?: any): Promise<string> {
    const result = await this.call({ action: 'create', userId, data });
    return result.sessionId;
  }

  async getSession(sessionId: string): Promise<any> {
    return this.call({ action: 'get', sessionId });
  }

  async updateSession(sessionId: string, data: any): Promise<void> {
    await this.call({ action: 'update', sessionId, data });
  }

  async destroySession(sessionId: string): Promise<boolean> {
    return this.call({ action: 'destroy', sessionId });
  }
}