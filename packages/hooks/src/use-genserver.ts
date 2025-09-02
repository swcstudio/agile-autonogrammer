/**
 * useGenServer - React 19 hook for Elixir GenServer pattern
 * 
 * Provides stateful server processes with React state synchronization,
 * call/cast patterns, and lifecycle management.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  use,
  startTransition
} from 'react';
import { useActorSystem } from './use-actor-system';
import type { ActorRef, ActorBehavior, ActorMessage } from '@katalyst/multithreading/react-bridge/actor-system-bridge';

/**
 * GenServer callback response types
 */
export type GenServerCallResponse<State> = 
  | { type: 'reply'; reply: any; newState: State }
  | { type: 'noreply'; newState: State }
  | { type: 'stop'; reason: string; reply?: any; newState: State };

export type GenServerCastResponse<State> = 
  | { type: 'noreply'; newState: State }
  | { type: 'stop'; reason: string; newState: State };

/**
 * GenServer callbacks interface
 */
export interface GenServerCallbacks<State = any> {
  /**
   * Initialize the server state
   */
  init(args?: any): State | Promise<State>;

  /**
   * Handle synchronous calls
   */
  handleCall?(
    request: any,
    from: string,
    state: State
  ): GenServerCallResponse<State> | Promise<GenServerCallResponse<State>>;

  /**
   * Handle asynchronous casts
   */
  handleCast?(
    request: any,
    state: State
  ): GenServerCastResponse<State> | Promise<GenServerCastResponse<State>>;

  /**
   * Handle other messages
   */
  handleInfo?(
    info: any,
    state: State
  ): GenServerCastResponse<State> | Promise<GenServerCastResponse<State>>;

  /**
   * Called when the server is terminating
   */
  terminate?(reason: string, state: State): void | Promise<void>;

  /**
   * Handle code changes (for hot reloading)
   */
  codeChange?(oldVsn: string, state: State, extra: any): State | Promise<State>;
}

/**
 * GenServer configuration options
 */
export interface UseGenServerOptions {
  name?: string;
  timeout?: number;
  debug?: boolean;
  syncWithReact?: boolean;
  suspense?: boolean;
}

/**
 * GenServer hook return type
 */
export interface UseGenServerReturn<State> {
  // State
  state: State;
  isReady: boolean;
  
  // Operations
  call: <R = any>(request: any, timeout?: number) => Promise<R>;
  cast: (request: any) => Promise<void>;
  info: (message: any) => Promise<void>;
  
  // Control
  stop: (reason?: string) => Promise<void>;
  restart: () => Promise<void>;
  
  // Metrics
  metrics: {
    callCount: number;
    castCount: number;
    infoCount: number;
    lastCallDuration: number;
    averageResponseTime: number;
  };
}

/**
 * Main GenServer hook
 */
export function useGenServer<State>(
  callbacks: GenServerCallbacks<State>,
  initialArgs?: any,
  options: UseGenServerOptions = {}
): UseGenServerReturn<State> {
  const {
    name,
    timeout = 5000,
    debug = false,
    syncWithReact = true,
    suspense = false
  } = options;

  const actorSystem = useActorSystem();
  const [state, setState] = useState<State>(undefined as any);
  const [isReady, setIsReady] = useState(false);
  const [metrics, setMetrics] = useState({
    callCount: 0,
    castCount: 0,
    infoCount: 0,
    lastCallDuration: 0,
    averageResponseTime: 0
  });

  const actorRef = useRef<ActorRef | null>(null);
  const stateRef = useRef<State>(undefined as any);
  const responseTimesRef = useRef<number[]>([]);

  // Create actor behavior from GenServer callbacks
  const createBehavior = useCallback((): ActorBehavior<State, any> => {
    return {
      init: async () => {
        const initialState = await callbacks.init(initialArgs);
        stateRef.current = initialState;
        
        if (syncWithReact) {
          startTransition(() => {
            setState(initialState);
          });
        }
        
        return initialState;
      },

      receive: async (message: ActorMessage<any>, currentState: State) => {
        const startTime = performance.now();
        
        try {
          switch (message.type) {
            case 'call': {
              if (!callbacks.handleCall) {
                return { state: currentState, reply: undefined };
              }

              const response = await callbacks.handleCall(
                message.payload,
                message.from || 'unknown',
                currentState
              );

              const duration = performance.now() - startTime;
              updateMetrics('call', duration);

              switch (response.type) {
                case 'reply':
                  updateState(response.newState);
                  return { state: response.newState, reply: response.reply };
                
                case 'noreply':
                  updateState(response.newState);
                  return response.newState;
                
                case 'stop':
                  if (callbacks.terminate) {
                    await callbacks.terminate(response.reason, response.newState);
                  }
                  return { state: response.newState, reply: response.reply };
              }
              break;
            }

            case 'cast': {
              if (!callbacks.handleCast) {
                return currentState;
              }

              const response = await callbacks.handleCast(
                message.payload,
                currentState
              );

              const duration = performance.now() - startTime;
              updateMetrics('cast', duration);

              switch (response.type) {
                case 'noreply':
                  updateState(response.newState);
                  return response.newState;
                
                case 'stop':
                  if (callbacks.terminate) {
                    await callbacks.terminate(response.reason, response.newState);
                  }
                  return response.newState;
              }
              break;
            }

            case 'info': {
              if (!callbacks.handleInfo) {
                return currentState;
              }

              const response = await callbacks.handleInfo(
                message.payload,
                currentState
              );

              const duration = performance.now() - startTime;
              updateMetrics('info', duration);

              switch (response.type) {
                case 'noreply':
                  updateState(response.newState);
                  return response.newState;
                
                case 'stop':
                  if (callbacks.terminate) {
                    await callbacks.terminate(response.reason, response.newState);
                  }
                  return response.newState;
              }
              break;
            }

            default:
              return currentState;
          }
        } catch (error) {
          if (debug) {
            console.error('GenServer error:', error);
          }
          throw error;
        }

        return currentState;
      },

      terminate: async (reason: string, finalState: State) => {
        if (callbacks.terminate) {
          await callbacks.terminate(reason, finalState);
        }
      }
    };
  }, [callbacks, initialArgs, syncWithReact, debug]);

  // Update state helper
  const updateState = useCallback((newState: State) => {
    stateRef.current = newState;
    
    if (syncWithReact) {
      startTransition(() => {
        setState(newState);
      });
    }
  }, [syncWithReact]);

  // Update metrics helper
  const updateMetrics = useCallback((operation: 'call' | 'cast' | 'info', duration: number) => {
    responseTimesRef.current.push(duration);
    if (responseTimesRef.current.length > 100) {
      responseTimesRef.current.shift();
    }

    const average = responseTimesRef.current.reduce((a, b) => a + b, 0) / responseTimesRef.current.length;

    setMetrics(prev => ({
      ...prev,
      [`${operation}Count`]: prev[`${operation}Count`] + 1,
      lastCallDuration: duration,
      averageResponseTime: average
    }));
  }, []);

  // Initialize GenServer actor
  useEffect(() => {
    if (!actorSystem.isReady) return;

    const behavior = createBehavior();
    const actor = actorSystem.spawn(behavior, { name });
    actorRef.current = actor;
    setIsReady(true);

    return () => {
      if (actorRef.current) {
        actorSystem.stop(actorRef.current);
      }
    };
  }, [actorSystem.isReady, createBehavior, name]);

  // Call operation (synchronous)
  const call = useCallback(async <R = any>(request: any, customTimeout?: number): Promise<R> => {
    if (!actorRef.current) {
      throw new Error('GenServer not initialized');
    }

    const callTimeout = customTimeout || timeout;

    if (suspense) {
      return use(actorSystem.call<any, R>(actorRef.current, request, callTimeout));
    }

    return actorSystem.call<any, R>(actorRef.current, request, callTimeout);
  }, [actorSystem, timeout, suspense]);

  // Cast operation (asynchronous)
  const cast = useCallback(async (request: any): Promise<void> => {
    if (!actorRef.current) {
      throw new Error('GenServer not initialized');
    }

    return actorSystem.cast(actorRef.current, request);
  }, [actorSystem]);

  // Info operation (send arbitrary message)
  const info = useCallback(async (message: any): Promise<void> => {
    if (!actorRef.current) {
      throw new Error('GenServer not initialized');
    }

    return actorSystem.cast(actorRef.current, { type: 'info', payload: message });
  }, [actorSystem]);

  // Stop the GenServer
  const stop = useCallback(async (reason: string = 'normal'): Promise<void> => {
    if (!actorRef.current) return;

    actorSystem.stop(actorRef.current, reason);
    actorRef.current = null;
    setIsReady(false);
  }, [actorSystem]);

  // Restart the GenServer
  const restart = useCallback(async (): Promise<void> => {
    await stop();
    
    const behavior = createBehavior();
    const actor = actorSystem.spawn(behavior, { name });
    actorRef.current = actor;
    setIsReady(true);
  }, [stop, createBehavior, actorSystem, name]);

  return {
    state: syncWithReact ? state : stateRef.current,
    isReady,
    call,
    cast,
    info,
    stop,
    restart,
    metrics
  };
}

/**
 * Pre-built GenServer: Key-Value Store
 */
export function useKeyValueStore<V = any>(
  initialData?: Map<string, V>,
  options?: UseGenServerOptions
): {
  get: (key: string) => Promise<V | undefined>;
  set: (key: string, value: V) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
  values: () => Promise<V[]>;
  size: () => Promise<number>;
  state: Map<string, V>;
  isReady: boolean;
} {
  const callbacks: GenServerCallbacks<Map<string, V>> = {
    init: () => initialData || new Map(),

    handleCall: (request, _from, state) => {
      switch (request.action) {
        case 'get':
          return {
            type: 'reply',
            reply: state.get(request.key),
            newState: state
          };
        
        case 'set':
          state.set(request.key, request.value);
          return {
            type: 'reply',
            reply: undefined,
            newState: state
          };
        
        case 'delete': {
          const deleted = state.delete(request.key);
          return {
            type: 'reply',
            reply: deleted,
            newState: state
          };
        }
        
        case 'clear':
          state.clear();
          return {
            type: 'reply',
            reply: undefined,
            newState: state
          };
        
        case 'keys':
          return {
            type: 'reply',
            reply: Array.from(state.keys()),
            newState: state
          };
        
        case 'values':
          return {
            type: 'reply',
            reply: Array.from(state.values()),
            newState: state
          };
        
        case 'size':
          return {
            type: 'reply',
            reply: state.size,
            newState: state
          };
        
        default:
          return {
            type: 'reply',
            reply: undefined,
            newState: state
          };
      }
    }
  };

  const genServer = useGenServer(callbacks, undefined, options);

  return {
    get: (key: string) => genServer.call({ action: 'get', key }),
    set: (key: string, value: V) => genServer.call({ action: 'set', key, value }),
    delete: (key: string) => genServer.call({ action: 'delete', key }),
    clear: () => genServer.call({ action: 'clear' }),
    keys: () => genServer.call({ action: 'keys' }),
    values: () => genServer.call({ action: 'values' }),
    size: () => genServer.call({ action: 'size' }),
    state: genServer.state,
    isReady: genServer.isReady
  };
}

/**
 * Pre-built GenServer: Counter
 */
export function useCounter(
  initialValue: number = 0,
  options?: UseGenServerOptions
): {
  value: number;
  increment: (by?: number) => Promise<number>;
  decrement: (by?: number) => Promise<number>;
  reset: () => Promise<void>;
  set: (value: number) => Promise<void>;
  isReady: boolean;
} {
  const callbacks: GenServerCallbacks<number> = {
    init: () => initialValue,

    handleCall: (request, _from, state) => {
      switch (request.action) {
        case 'increment': {
          const newValue = state + (request.by || 1);
          return {
            type: 'reply',
            reply: newValue,
            newState: newValue
          };
        }
        
        case 'decrement': {
          const newValue = state - (request.by || 1);
          return {
            type: 'reply',
            reply: newValue,
            newState: newValue
          };
        }
        
        case 'reset':
          return {
            type: 'reply',
            reply: undefined,
            newState: initialValue
          };
        
        case 'set':
          return {
            type: 'reply',
            reply: undefined,
            newState: request.value
          };
        
        default:
          return {
            type: 'reply',
            reply: state,
            newState: state
          };
      }
    }
  };

  const genServer = useGenServer(callbacks, undefined, options);

  return {
    value: genServer.state,
    increment: (by?: number) => genServer.call({ action: 'increment', by }),
    decrement: (by?: number) => genServer.call({ action: 'decrement', by }),
    reset: () => genServer.call({ action: 'reset' }),
    set: (value: number) => genServer.call({ action: 'set', value }),
    isReady: genServer.isReady
  };
}

/**
 * Pre-built GenServer: Task Queue
 */
export function useTaskQueue<T>(
  options?: UseGenServerOptions & { maxSize?: number }
): {
  enqueue: (task: T) => Promise<void>;
  dequeue: () => Promise<T | undefined>;
  peek: () => Promise<T | undefined>;
  size: () => Promise<number>;
  clear: () => Promise<void>;
  queue: T[];
  isReady: boolean;
} {
  const { maxSize = Infinity, ...genServerOptions } = options || {};

  const callbacks: GenServerCallbacks<T[]> = {
    init: () => [],

    handleCall: (request, _from, state) => {
      switch (request.action) {
        case 'enqueue':
          if (state.length >= maxSize) {
            return {
              type: 'reply',
              reply: { error: 'Queue is full' },
              newState: state
            };
          }
          state.push(request.task);
          return {
            type: 'reply',
            reply: undefined,
            newState: state
          };
        
        case 'dequeue': {
          const task = state.shift();
          return {
            type: 'reply',
            reply: task,
            newState: state
          };
        }
        
        case 'peek':
          return {
            type: 'reply',
            reply: state[0],
            newState: state
          };
        
        case 'size':
          return {
            type: 'reply',
            reply: state.length,
            newState: state
          };
        
        case 'clear':
          return {
            type: 'reply',
            reply: undefined,
            newState: []
          };
        
        default:
          return {
            type: 'reply',
            reply: undefined,
            newState: state
          };
      }
    }
  };

  const genServer = useGenServer(callbacks, undefined, genServerOptions);

  return {
    enqueue: (task: T) => genServer.call({ action: 'enqueue', task }),
    dequeue: () => genServer.call({ action: 'dequeue' }),
    peek: () => genServer.call({ action: 'peek' }),
    size: () => genServer.call({ action: 'size' }),
    clear: () => genServer.call({ action: 'clear' }),
    queue: genServer.state,
    isReady: genServer.isReady
  };
}