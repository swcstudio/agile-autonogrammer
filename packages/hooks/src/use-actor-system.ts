/**
 * useActorSystem - React 19 hook for Elixir-style actor system
 * 
 * Provides full actor lifecycle management with React integration,
 * including Suspense support and automatic cleanup.
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
import {
  ActorSystem,
  ActorRef,
  ActorBehavior,
  ActorMessage,
  SpawnOptions,
  ActorSystemConfig,
  ActorSystemMetrics,
  ActorPool
} from '@katalyst/multithreading/react-bridge/actor-system-bridge';

/**
 * Hook configuration options
 */
export interface UseActorSystemOptions extends ActorSystemConfig {
  autoStart?: boolean;
  suspense?: boolean;
  errorBoundary?: boolean;
  metricsInterval?: number;
}

/**
 * Actor definition for React components
 */
export interface ReactActorBehavior<State = any, Message = any> extends ActorBehavior<State, Message> {
  /**
   * Optional React-specific lifecycle
   */
  onMount?(): void | Promise<void>;
  onUnmount?(): void | Promise<void>;
  onSuspend?(): void;
  onResume?(): void;
}

/**
 * Hook return type
 */
export interface UseActorSystemReturn {
  // Core functionality
  spawn: <S, M>(behavior: ReactActorBehavior<S, M>, options?: SpawnOptions) => ActorRef<M>;
  call: <T, R>(actor: ActorRef<T>, message: T, timeout?: number) => Promise<R>;
  cast: <T>(actor: ActorRef<T>, message: T) => Promise<void>;
  stop: (actor: ActorRef, reason?: string) => void;
  
  // Registry
  register: (name: string, actor: ActorRef) => void;
  whereis: <T = any>(name: string) => ActorRef<T> | undefined;
  
  // Pool management
  createPool: <S, M>(behavior: ReactActorBehavior<S, M>, size: number) => ActorPool<M>;
  
  // Metrics and monitoring
  metrics: ActorSystemMetrics;
  isReady: boolean;
  error: Error | null;
  
  // System control
  shutdown: () => Promise<void>;
  restart: () => Promise<void>;
}

/**
 * Main actor system hook
 */
export function useActorSystem(options: UseActorSystemOptions = {}): UseActorSystemReturn {
  const {
    autoStart = true,
    suspense = false,
    errorBoundary = true,
    metricsInterval = 1000,
    ...systemConfig
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<ActorSystemMetrics>({
    totalActors: 0,
    activeActors: 0,
    messageQueue: 0,
    averageLatency: 0,
    throughput: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });

  const systemRef = useRef<ActorSystem | null>(null);
  const actorsRef = useRef<Map<string, ActorRef>>(new Map());
  const cleanupRef = useRef<Set<() => void>>(new Set());

  // Initialize actor system
  useEffect(() => {
    if (!autoStart) return;

    const initSystem = async () => {
      try {
        const system = new ActorSystem(systemConfig);
        systemRef.current = system;

        // Set up metrics listener
        if (metricsInterval > 0) {
          system.on('metrics', (newMetrics: ActorSystemMetrics) => {
            startTransition(() => {
              setMetrics(newMetrics);
            });
          });
        }

        // Set up error listener
        system.on('actor:call:error', ({ error: err }) => {
          if (errorBoundary) {
            setError(err);
          }
        });

        setIsReady(true);
      } catch (err) {
        setError(err as Error);
      }
    };

    initSystem();

    return () => {
      if (systemRef.current) {
        systemRef.current.shutdown();
      }
      cleanupRef.current.forEach(cleanup => cleanup());
    };
  }, [autoStart, metricsInterval, errorBoundary]);

  // Spawn actor with React lifecycle integration
  const spawn = useCallback(<S, M>(
    behavior: ReactActorBehavior<S, M>,
    options: SpawnOptions = {}
  ): ActorRef<M> => {
    if (!systemRef.current) {
      throw new Error('Actor system not initialized');
    }

    // Wrap behavior with React lifecycle
    const wrappedBehavior: ActorBehavior<S, M> = {
      ...behavior,
      init: async () => {
        const state = behavior.init ? await behavior.init() : undefined;
        
        // Call React-specific mount
        if (behavior.onMount) {
          await behavior.onMount();
        }
        
        return state as S;
      },
      terminate: async (reason: string, state: S) => {
        // Call React-specific unmount
        if (behavior.onUnmount) {
          await behavior.onUnmount();
        }
        
        if (behavior.terminate) {
          await behavior.terminate(reason, state);
        }
      }
    };

    const actor = systemRef.current.spawn(wrappedBehavior, options);
    
    // Track actor for cleanup
    if (options.name) {
      actorsRef.current.set(options.name, actor);
    }

    return actor;
  }, []);

  // Call with Suspense support
  const call = useCallback(async <T, R>(
    actor: ActorRef<T>,
    message: T,
    timeout?: number
  ): Promise<R> => {
    if (!systemRef.current) {
      throw new Error('Actor system not initialized');
    }

    if (suspense) {
      // Use React 19's use() for Suspense integration
      return use(systemRef.current.call<T, R>(actor, message, timeout));
    }

    return systemRef.current.call<T, R>(actor, message, timeout);
  }, [suspense]);

  // Cast (async send)
  const cast = useCallback(async <T>(
    actor: ActorRef<T>,
    message: T
  ): Promise<void> => {
    if (!systemRef.current) {
      throw new Error('Actor system not initialized');
    }

    return systemRef.current.cast(actor, message);
  }, []);

  // Stop actor
  const stop = useCallback((actor: ActorRef, reason: string = 'normal'): void => {
    if (!systemRef.current) return;
    
    systemRef.current.stop(actor, reason);
    
    // Remove from tracked actors
    for (const [name, ref] of actorsRef.current) {
      if (ref.id === actor.id) {
        actorsRef.current.delete(name);
        break;
      }
    }
  }, []);

  // Register named actor
  const register = useCallback((name: string, actor: ActorRef): void => {
    if (!systemRef.current) return;
    
    systemRef.current.register(name, actor.id);
    actorsRef.current.set(name, actor);
  }, []);

  // Look up actor by name
  const whereis = useCallback(<T = any>(name: string): ActorRef<T> | undefined => {
    if (!systemRef.current) return undefined;
    
    return systemRef.current.whereis<T>(name);
  }, []);

  // Create actor pool
  const createPool = useCallback(<S, M>(
    behavior: ReactActorBehavior<S, M>,
    size: number
  ): ActorPool<M> => {
    if (!systemRef.current) {
      throw new Error('Actor system not initialized');
    }

    return systemRef.current.createPool(behavior, size);
  }, []);

  // Shutdown system
  const shutdown = useCallback(async (): Promise<void> => {
    if (!systemRef.current) return;
    
    await systemRef.current.shutdown();
    setIsReady(false);
    actorsRef.current.clear();
  }, []);

  // Restart system
  const restart = useCallback(async (): Promise<void> => {
    await shutdown();
    
    const system = new ActorSystem(systemConfig);
    systemRef.current = system;
    setIsReady(true);
    setError(null);
  }, [shutdown, systemConfig]);

  return {
    spawn,
    call,
    cast,
    stop,
    register,
    whereis,
    createPool,
    metrics,
    isReady,
    error,
    shutdown,
    restart
  };
}

/**
 * Hook for creating a supervised actor
 */
export function useSupervisedActor<S, M>(
  behavior: ReactActorBehavior<S, M>,
  options: SpawnOptions & { 
    restartStrategy?: 'permanent' | 'temporary' | 'transient';
    maxRestarts?: number;
  } = {}
): {
  actor: ActorRef<M> | null;
  send: (message: M) => Promise<void>;
  call: <R>(message: M) => Promise<R>;
  restart: () => void;
  isAlive: boolean;
  restartCount: number;
} {
  const system = useActorSystem();
  const [actor, setActor] = useState<ActorRef<M> | null>(null);
  const [isAlive, setIsAlive] = useState(false);
  const [restartCount, setRestartCount] = useState(0);
  
  const {
    restartStrategy = 'permanent',
    maxRestarts = 3,
    ...spawnOptions
  } = options;

  // Spawn actor with supervision
  useEffect(() => {
    if (!system.isReady) return;

    const spawnActor = () => {
      try {
        const newActor = system.spawn(behavior, spawnOptions);
        setActor(newActor);
        setIsAlive(true);
      } catch (error) {
        console.error('Failed to spawn supervised actor:', error);
        setIsAlive(false);
        
        // Handle restart based on strategy
        if (restartStrategy === 'permanent' && restartCount < maxRestarts) {
          setTimeout(() => {
            setRestartCount(prev => prev + 1);
            spawnActor();
          }, 1000 * Math.pow(2, restartCount)); // Exponential backoff
        }
      }
    };

    spawnActor();

    return () => {
      if (actor) {
        system.stop(actor);
      }
    };
  }, [system.isReady, restartCount]);

  const send = useCallback(async (message: M) => {
    if (!actor) throw new Error('Actor not spawned');
    return system.cast(actor, message);
  }, [actor, system]);

  const call = useCallback(async <R,>(message: M): Promise<R> => {
    if (!actor) throw new Error('Actor not spawned');
    return system.call(actor, message);
  }, [actor, system]);

  const restart = useCallback(() => {
    if (actor) {
      system.stop(actor);
      setActor(null);
      setIsAlive(false);
      setRestartCount(prev => prev + 1);
    }
  }, [actor, system]);

  return {
    actor,
    send,
    call,
    restart,
    isAlive,
    restartCount
  };
}

/**
 * Hook for actor pools with load balancing
 */
export function useActorPool<S, M>(
  behavior: ReactActorBehavior<S, M>,
  initialSize: number = 4
): {
  pool: ActorPool<M> | null;
  call: <R>(message: M) => Promise<R>;
  cast: (message: M) => Promise<void>;
  broadcast: (message: M) => Promise<void>;
  resize: (newSize: number) => void;
  metrics: { size: number; calls: number; casts: number };
} {
  const system = useActorSystem();
  const [pool, setPool] = useState<ActorPool<M> | null>(null);
  const [metrics, setMetrics] = useState({ size: 0, calls: 0, casts: 0 });

  useEffect(() => {
    if (!system.isReady) return;

    const newPool = system.createPool(behavior, initialSize);
    setPool(newPool);
    setMetrics(prev => ({ ...prev, size: initialSize }));

    return () => {
      if (newPool) {
        newPool.shutdown();
      }
    };
  }, [system.isReady, behavior, initialSize]);

  const call = useCallback(async <R,>(message: M): Promise<R> => {
    if (!pool) throw new Error('Pool not initialized');
    setMetrics(prev => ({ ...prev, calls: prev.calls + 1 }));
    return pool.call<R>(message);
  }, [pool]);

  const cast = useCallback(async (message: M): Promise<void> => {
    if (!pool) throw new Error('Pool not initialized');
    setMetrics(prev => ({ ...prev, casts: prev.casts + 1 }));
    return pool.cast(message);
  }, [pool]);

  const broadcast = useCallback(async (message: M): Promise<void> => {
    if (!pool) throw new Error('Pool not initialized');
    return pool.broadcast(message);
  }, [pool]);

  const resize = useCallback((newSize: number): void => {
    if (!pool) return;
    pool.resize(newSize, behavior);
    setMetrics(prev => ({ ...prev, size: newSize }));
  }, [pool, behavior]);

  return {
    pool,
    call,
    cast,
    broadcast,
    resize,
    metrics
  };
}

/**
 * Hook for message pattern matching (Elixir-style)
 */
export function useMessagePattern<M, R>(
  patterns: Array<{
    match: (message: M) => boolean;
    handler: (message: M) => R | Promise<R>;
  }>
): (message: M) => Promise<R | undefined> {
  return useCallback(async (message: M): Promise<R | undefined> => {
    for (const { match, handler } of patterns) {
      if (match(message)) {
        return await handler(message);
      }
    }
    return undefined;
  }, [patterns]);
}