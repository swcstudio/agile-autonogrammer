/**
 * useRegistry - React 19 hook for Process Registry
 * 
 * Provides process registration and discovery capabilities with:
 * - Named process registration
 * - Process lookup and discovery
 * - Registry queries and patterns
 * - Real-time registry updates
 * - Integration with React state
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
import type { ActorRef } from '@katalyst/multithreading/react-bridge/actor-system-bridge';

/**
 * Registry key types
 */
export type RegistryKey = 
  | { type: 'name'; name: string }
  | { type: 'tuple'; tuple: string[] }
  | { type: 'via'; module: string; name: string };

/**
 * Process metadata
 */
export interface ProcessMeta {
  id: string;
  key: RegistryKey;
  registeredAt: number;
  properties: Record<string, string>;
  tags: string[];
  nodeId?: string;
}

/**
 * Registry query parameters
 */
export interface RegistryQuery {
  keyPattern?: string;
  properties?: Record<string, string>;
  tags?: string[];
  nodeId?: string;
  limit?: number;
}

/**
 * Registry hook options
 */
export interface UseRegistryOptions {
  autoCleanup?: boolean;
  suspense?: boolean;
  debug?: boolean;
}

/**
 * Registry hook return type
 */
export interface UseRegistryReturn {
  // Registration
  register: (key: RegistryKey, actorId: string, properties?: Record<string, string>) => Promise<void>;
  unregister: (key: RegistryKey) => Promise<void>;
  
  // Lookup
  whereis: (key: RegistryKey) => Promise<string | null>;
  lookup: (key: RegistryKey) => Promise<ProcessMeta | null>;
  
  // Queries
  query: (params: RegistryQuery) => Promise<ProcessMeta[]>;
  keys: () => Promise<string[]>;
  
  // Updates
  updateProperties: (key: RegistryKey, properties: Record<string, string>) => Promise<void>;
  addTags: (key: RegistryKey, tags: string[]) => Promise<void>;
  
  // Statistics
  stats: () => Promise<RegistryStats>;
  
  // State
  isReady: boolean;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalProcesses: number;
  processesByNode: Record<string, number>;
  processesByTag: Record<string, number>;
  memoryUsage: number;
  uptimeMs: number;
}

/**
 * Registry event types
 */
export type RegistryEvent = 
  | { type: 'registered'; key: RegistryKey; actorId: string; properties: Record<string, string> }
  | { type: 'unregistered'; key: RegistryKey; actorId: string }
  | { type: 'updated'; key: RegistryKey; actorId: string; properties: Record<string, string> };

/**
 * Main registry hook
 */
export function useRegistry(options: UseRegistryOptions = {}): UseRegistryReturn {
  const {
    autoCleanup = true,
    suspense = false,
    debug = false
  } = options;

  const actorSystem = useActorSystem();
  const [isReady, setIsReady] = useState(false);
  
  // Import registry functions from Rust
  const registryRef = useRef<any>(null);

  // Initialize registry
  useEffect(() => {
    if (!actorSystem.isReady) return;

    const initializeRegistry = async () => {
      try {
        // Import registry from multithreading module
        const { JsProcessRegistry } = await import('@katalyst/multithreading');
        registryRef.current = new JsProcessRegistry();
        setIsReady(true);
      } catch (error) {
        if (debug) {
          console.error('Failed to initialize registry:', error);
        }
      }
    };

    initializeRegistry();
  }, [actorSystem.isReady, debug]);

  // Register process
  const register = useCallback(async (key: RegistryKey, actorId: string, properties?: Record<string, string>): Promise<void> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    if (suspense) {
      return use(registerProcess(key, actorId, properties));
    }

    return registerProcess(key, actorId, properties);
  }, [suspense]);

  // Helper function for registration
  const registerProcess = useCallback(async (key: RegistryKey, actorId: string, properties?: Record<string, string>): Promise<void> => {
    const registry = registryRef.current;
    
    switch (key.type) {
      case 'name':
        return registry.register(key.name, actorId, properties);
      case 'tuple':
        return registry.registerTuple(key.tuple, actorId, properties);
      case 'via':
        // For via tuples, we'll use the module:name format
        return registry.register(`${key.module}:${key.name}`, actorId, properties);
      default:
        throw new Error('Invalid registry key type');
    }
  }, []);

  // Unregister process
  const unregister = useCallback(async (key: RegistryKey): Promise<void> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    switch (key.type) {
      case 'name':
        return registryRef.current.unregister(key.name);
      case 'tuple':
        return registryRef.current.unregisterTuple(key.tuple);
      case 'via':
        return registryRef.current.unregister(`${key.module}:${key.name}`);
      default:
        throw new Error('Invalid registry key type');
    }
  }, []);

  // Look up process ID
  const whereis = useCallback(async (key: RegistryKey): Promise<string | null> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    switch (key.type) {
      case 'name':
        return registryRef.current.whereis(key.name);
      case 'tuple':
        return registryRef.current.whereisTuple(key.tuple);
      case 'via':
        return registryRef.current.whereis(`${key.module}:${key.name}`);
      default:
        throw new Error('Invalid registry key type');
    }
  }, []);

  // Look up process metadata
  const lookup = useCallback(async (key: RegistryKey): Promise<ProcessMeta | null> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    const actorId = await whereis(key);
    if (!actorId) return null;

    // Get additional metadata from registry
    // This would need to be implemented in the Rust side
    return {
      id: actorId,
      key,
      registeredAt: Date.now(),
      properties: {},
      tags: [],
    };
  }, [whereis]);

  // Query processes
  const query = useCallback(async (params: RegistryQuery): Promise<ProcessMeta[]> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    // This would need to be implemented in the Rust side
    const results = registryRef.current.query(params);
    return results || [];
  }, []);

  // Get all registered keys
  const keys = useCallback(async (): Promise<string[]> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    return registryRef.current.keys();
  }, []);

  // Update process properties
  const updateProperties = useCallback(async (key: RegistryKey, properties: Record<string, string>): Promise<void> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    const keyName = key.type === 'name' ? key.name : 
                   key.type === 'tuple' ? key.tuple.join(':') :
                   `${key.module}:${key.name}`;

    return registryRef.current.updateProperties(keyName, properties);
  }, []);

  // Add tags to process
  const addTags = useCallback(async (key: RegistryKey, tags: string[]): Promise<void> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    const keyName = key.type === 'name' ? key.name : 
                   key.type === 'tuple' ? key.tuple.join(':') :
                   `${key.module}:${key.name}`;

    return registryRef.current.addTags(keyName, tags);
  }, []);

  // Get registry statistics
  const stats = useCallback(async (): Promise<RegistryStats> => {
    if (!registryRef.current) {
      throw new Error('Registry not initialized');
    }

    const registryStats = registryRef.current.stats();
    
    return {
      totalProcesses: registryStats.totalProcesses || 0,
      processesByNode: registryStats.processesByNode || {},
      processesByTag: registryStats.processesByTag || {},
      memoryUsage: registryStats.memoryUsage || 0,
      uptimeMs: registryStats.uptimeMs || 0,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    if (!autoCleanup) return;

    return () => {
      // Cleanup would be handled by Rust registry
    };
  }, [autoCleanup]);

  return {
    register,
    unregister,
    whereis,
    lookup,
    query,
    keys,
    updateProperties,
    addTags,
    stats,
    isReady,
  };
}

/**
 * Process watcher hook - watches for registry changes
 */
export function useProcessWatcher(key: RegistryKey, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const registry = useRegistry();
  const [actorId, setActorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Watch for process changes
  useEffect(() => {
    if (!enabled || !registry.isReady) return;

    let isMounted = true;

    const checkProcess = async () => {
      try {
        const id = await registry.whereis(key);
        if (isMounted) {
          setActorId(id);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setActorId(null);
          setIsLoading(false);
        }
      }
    };

    // Initial check
    checkProcess();

    // Set up polling (could be replaced with event-based updates)
    const interval = setInterval(checkProcess, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled, registry.isReady, key]);

  return {
    actorId,
    isLoading,
    exists: actorId !== null,
  };
}

/**
 * Named process hook - convenience for named registrations
 */
export function useNamedProcess(name: string, options: { autoRegister?: boolean; properties?: Record<string, string> } = {}) {
  const { autoRegister = false, properties = {} } = options;
  const registry = useRegistry();
  const actorSystem = useActorSystem();
  const [isRegistered, setIsRegistered] = useState(false);

  const key: RegistryKey = { type: 'name', name };

  // Auto-register if requested
  useEffect(() => {
    if (!autoRegister || !registry.isReady || !actorSystem.isReady) return;

    const registerProcess = async () => {
      try {
        // Spawn a simple actor for this name
        const actor = actorSystem.spawn({
          init: async () => ({ name }),
          receive: async (message, state) => state,
        });

        await registry.register(key, actor.id, properties);
        setIsRegistered(true);
      } catch (error) {
        console.error('Failed to auto-register process:', error);
      }
    };

    registerProcess();

    // Cleanup on unmount
    return () => {
      if (isRegistered) {
        registry.unregister(key).catch(console.error);
      }
    };
  }, [autoRegister, registry.isReady, actorSystem.isReady, name]);

  const register = useCallback(async (actorId: string, processProperties?: Record<string, string>) => {
    await registry.register(key, actorId, processProperties || properties);
    setIsRegistered(true);
  }, [registry, key, properties]);

  const unregister = useCallback(async () => {
    await registry.unregister(key);
    setIsRegistered(false);
  }, [registry, key]);

  const whereis = useCallback(() => registry.whereis(key), [registry, key]);

  return {
    name,
    key,
    isRegistered,
    register,
    unregister,
    whereis,
  };
}

/**
 * Registry query hook - reactive queries
 */
export function useRegistryQuery(query: RegistryQuery, options: { enabled?: boolean; refreshInterval?: number } = {}) {
  const { enabled = true, refreshInterval = 5000 } = options;
  const registry = useRegistry();
  const [results, setResults] = useState<ProcessMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !registry.isReady) return;

    let isMounted = true;

    const executeQuery = async () => {
      try {
        setError(null);
        const queryResults = await registry.query(query);
        if (isMounted) {
          setResults(queryResults);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Query failed'));
          setIsLoading(false);
        }
      }
    };

    // Initial query
    executeQuery();

    // Set up refresh interval
    const interval = setInterval(executeQuery, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled, registry.isReady, query, refreshInterval]);

  return {
    results,
    isLoading,
    error,
    refetch: useCallback(() => {
      if (registry.isReady) {
        setIsLoading(true);
        registry.query(query).then(setResults).catch(setError);
      }
    }, [registry, query]),
  };
}

/**
 * Global registry functions
 */
export const Registry = {
  /**
   * Register a process globally
   */
  register: async (name: string, actorId: string, properties?: Record<string, string>) => {
    const { register_name } = await import('@katalyst/multithreading');
    return register_name(name, actorId);
  },

  /**
   * Unregister a process globally
   */
  unregister: async (name: string) => {
    const { unregister_name } = await import('@katalyst/multithreading');
    return unregister_name(name);
  },

  /**
   * Look up a process globally
   */
  whereis: async (name: string): Promise<string | null> => {
    const { whereis_name } = await import('@katalyst/multithreading');
    return whereis_name(name);
  },
};