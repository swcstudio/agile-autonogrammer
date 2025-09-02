/**
 * usePresence - React 19 hook for Phoenix Presence
 * 
 * Provides real-time user presence tracking with:
 * - Join/leave presence tracking
 * - Metadata synchronization
 * - Conflict-free replicated data types (CRDTs)
 * - Real-time presence updates
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

/**
 * Presence metadata for a connection
 */
export interface PresenceMeta {
  connectionId: string;
  nodeId: string;
  onlineAt: number;
  metadata: Record<string, any>;
  lastHeartbeat: number;
  connectionQuality?: {
    latencyMs?: number;
    signalStrength?: number;
    connectionType?: string;
    bandwidthKbps?: number;
  };
}

/**
 * Full presence state for a user
 */
export interface PresenceState {
  key: string;
  connections: Record<string, PresenceMeta>;
  mergedMetadata: Record<string, any>;
  firstJoinedAt: number;
  updatedAt: number;
}

/**
 * Presence diff for tracking changes
 */
export interface PresenceDiff {
  joins: Record<string, PresenceState>;
  leaves: Record<string, PresenceState>;
  updates: Record<string, PresenceState>;
  timestamp: number;
}

/**
 * Presence statistics
 */
export interface PresenceStats {
  totalTopics: number;
  totalUsers: number;
  totalConnections: number;
  joinEvents: number;
  leaveEvents: number;
  updateEvents: number;
  cleanupRuns: number;
  staleConnectionsRemoved: number;
}

/**
 * Presence hook options
 */
export interface UsePresenceOptions {
  heartbeatInterval?: number;
  connectionTimeout?: number;
  autoCleanup?: boolean;
  debug?: boolean;
  suspense?: boolean;
}

/**
 * Presence hook return type
 */
export interface UsePresenceReturn {
  // Tracking
  track: (topic: string, userKey: string, connectionId: string, metadata?: Record<string, any>) => Promise<PresenceDiff>;
  untrack: (topic: string, userKey: string, connectionId: string) => Promise<PresenceDiff>;
  update: (topic: string, userKey: string, connectionId: string, metadata: Record<string, any>) => Promise<PresenceDiff>;
  heartbeat: (topic: string, userKey: string, connectionId: string) => Promise<void>;
  
  // Queries
  list: (topic: string) => string[];
  get: (topic: string, userKey: string) => PresenceState | null;
  topics: () => string[];
  
  // Maintenance
  cleanup: () => number;
  stats: () => PresenceStats;
  
  // State
  isReady: boolean;
}

/**
 * Main presence hook
 */
export function usePresence(options: UsePresenceOptions = {}): UsePresenceReturn {
  const {
    heartbeatInterval = 30000,
    connectionTimeout = 90000,
    autoCleanup = true,
    debug = false,
    suspense = false
  } = options;

  const [isReady, setIsReady] = useState(false);
  
  // Import presence functions from Rust
  const presenceSystemRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize presence system
  useEffect(() => {
    const initializePresence = async () => {
      try {
        // Import presence system from multithreading module
        const { JsPresenceSystem } = await import('@katalyst/multithreading');
        presenceSystemRef.current = new JsPresenceSystem();
        setIsReady(true);
      } catch (error) {
        if (debug) {
          console.error('Failed to initialize presence system:', error);
        }
      }
    };

    initializePresence();
  }, [debug]);

  // Set up automatic cleanup
  useEffect(() => {
    if (!autoCleanup || !isReady) return;

    const cleanupInterval = setInterval(() => {
      if (presenceSystemRef.current) {
        presenceSystemRef.current.cleanup();
      }
    }, Math.max(heartbeatInterval * 2, 60000));

    return () => clearInterval(cleanupInterval);
  }, [autoCleanup, isReady, heartbeatInterval]);

  // Track user presence
  const track = useCallback(async (
    topic: string,
    userKey: string,
    connectionId: string,
    metadata: Record<string, any> = {}
  ): Promise<PresenceDiff> => {
    if (!presenceSystemRef.current) {
      throw new Error('Presence system not initialized');
    }

    if (suspense) {
      return use(trackPresence(topic, userKey, connectionId, metadata));
    }

    return trackPresence(topic, userKey, connectionId, metadata);
  }, [suspense]);

  // Helper function for tracking
  const trackPresence = useCallback(async (
    topic: string,
    userKey: string,
    connectionId: string,
    metadata: Record<string, any>
  ): Promise<PresenceDiff> => {
    const presenceSystem = presenceSystemRef.current;
    
    try {
      const diff = await presenceSystem.track(topic, userKey, connectionId, metadata);
      return {
        joins: diff.joins || {},
        leaves: diff.leaves || {},
        updates: diff.updates || {},
        timestamp: diff.timestamp || Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to track presence: ${error}`);
    }
  }, []);

  // Untrack user presence
  const untrack = useCallback(async (
    topic: string,
    userKey: string,
    connectionId: string
  ): Promise<PresenceDiff> => {
    if (!presenceSystemRef.current) {
      throw new Error('Presence system not initialized');
    }

    try {
      const diff = await presenceSystemRef.current.untrack(topic, userKey, connectionId);
      return {
        joins: diff.joins || {},
        leaves: diff.leaves || {},
        updates: diff.updates || {},
        timestamp: diff.timestamp || Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to untrack presence: ${error}`);
    }
  }, []);

  // Update presence metadata
  const update = useCallback(async (
    topic: string,
    userKey: string,
    connectionId: string,
    metadata: Record<string, any>
  ): Promise<PresenceDiff> => {
    if (!presenceSystemRef.current) {
      throw new Error('Presence system not initialized');
    }

    try {
      const diff = await presenceSystemRef.current.update(topic, userKey, connectionId, metadata);
      return {
        joins: diff.joins || {},
        leaves: diff.leaves || {},
        updates: diff.updates || {},
        timestamp: diff.timestamp || Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to update presence: ${error}`);
    }
  }, []);

  // Send heartbeat
  const heartbeat = useCallback(async (
    topic: string,
    userKey: string,
    connectionId: string
  ): Promise<void> => {
    if (!presenceSystemRef.current) {
      throw new Error('Presence system not initialized');
    }

    try {
      await presenceSystemRef.current.heartbeat(topic, userKey, connectionId);
    } catch (error) {
      throw new Error(`Failed to send heartbeat: ${error}`);
    }
  }, []);

  // List users in topic
  const list = useCallback((topic: string): string[] => {
    if (!presenceSystemRef.current) {
      return [];
    }

    try {
      return presenceSystemRef.current.list(topic);
    } catch (error) {
      if (debug) {
        console.error(`Failed to list presence for topic ${topic}:`, error);
      }
      return [];
    }
  }, [debug]);

  // Get specific user presence
  const get = useCallback((topic: string, userKey: string): PresenceState | null => {
    if (!presenceSystemRef.current) {
      return null;
    }

    try {
      const presence = presenceSystemRef.current.get(topic, userKey);
      return presence || null;
    } catch (error) {
      if (debug) {
        console.error(`Failed to get presence for user ${userKey}:`, error);
      }
      return null;
    }
  }, [debug]);

  // Get all topics
  const topics = useCallback((): string[] => {
    if (!presenceSystemRef.current) {
      return [];
    }

    try {
      return presenceSystemRef.current.topics();
    } catch (error) {
      if (debug) {
        console.error('Failed to get presence topics:', error);
      }
      return [];
    }
  }, [debug]);

  // Clean up stale connections
  const cleanup = useCallback((): number => {
    if (!presenceSystemRef.current) {
      return 0;
    }

    try {
      return presenceSystemRef.current.cleanup();
    } catch (error) {
      if (debug) {
        console.error('Failed to cleanup presence:', error);
      }
      return 0;
    }
  }, [debug]);

  // Get presence statistics
  const stats = useCallback((): PresenceStats => {
    if (!presenceSystemRef.current) {
      return {
        totalTopics: 0,
        totalUsers: 0,
        totalConnections: 0,
        joinEvents: 0,
        leaveEvents: 0,
        updateEvents: 0,
        cleanupRuns: 0,
        staleConnectionsRemoved: 0,
      };
    }

    try {
      return presenceSystemRef.current.stats();
    } catch (error) {
      if (debug) {
        console.error('Failed to get presence stats:', error);
      }
      return {
        totalTopics: 0,
        totalUsers: 0,
        totalConnections: 0,
        joinEvents: 0,
        leaveEvents: 0,
        updateEvents: 0,
        cleanupRuns: 0,
        staleConnectionsRemoved: 0,
      };
    }
  }, [debug]);

  return {
    track,
    untrack,
    update,
    heartbeat,
    list,
    get,
    topics,
    cleanup,
    stats,
    isReady,
  };
}

/**
 * Topic presence hook - manages presence for a specific topic
 */
export function useTopicPresence(
  topic: string,
  options: {
    enabled?: boolean;
    userKey?: string;
    metadata?: Record<string, any>;
    autoHeartbeat?: boolean;
  } = {}
) {
  const { 
    enabled = true,
    userKey,
    metadata = {},
    autoHeartbeat = true
  } = options;

  const presence = usePresence();
  const [users, setUsers] = useState<string[]>([]);
  const [isTracked, setIsTracked] = useState(false);
  
  const connectionIdRef = useRef(`conn_${Math.random().toString(36).substr(2, 9)}`);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Track presence on mount
  useEffect(() => {
    if (!enabled || !presence.isReady || !userKey) return;

    let isMounted = true;

    const trackUser = async () => {
      try {
        await presence.track(topic, userKey, connectionIdRef.current, metadata);
        if (isMounted) {
          setIsTracked(true);
        }
      } catch (error) {
        console.error('Failed to track presence:', error);
      }
    };

    trackUser();

    // Untrack on unmount
    return () => {
      isMounted = false;
      if (isTracked && userKey) {
        presence.untrack(topic, userKey, connectionIdRef.current).catch(console.error);
      }
    };
  }, [enabled, presence.isReady, topic, userKey, metadata, isTracked]);

  // Set up automatic heartbeat
  useEffect(() => {
    if (!autoHeartbeat || !isTracked || !userKey) return;

    const sendHeartbeat = () => {
      presence.heartbeat(topic, userKey, connectionIdRef.current).catch(console.error);
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [autoHeartbeat, isTracked, topic, userKey, presence]);

  // Update users list
  useEffect(() => {
    if (!enabled || !presence.isReady) return;

    const updateUsers = () => {
      const userList = presence.list(topic);
      setUsers(userList);
    };

    // Initial update
    updateUsers();

    // Set up polling (could be replaced with event-based updates)
    const interval = setInterval(updateUsers, 1000);

    return () => clearInterval(interval);
  }, [enabled, presence.isReady, topic]);

  return {
    topic,
    users,
    userCount: users.length,
    isTracked,
    connectionId: connectionIdRef.current,
    updateMetadata: useCallback(async (newMetadata: Record<string, any>) => {
      if (!userKey) return;
      
      try {
        await presence.update(topic, userKey, connectionIdRef.current, newMetadata);
      } catch (error) {
        console.error('Failed to update presence metadata:', error);
      }
    }, [presence, topic, userKey]),
  };
}

/**
 * User presence hook - tracks a specific user's presence
 */
export function useUserPresence(
  topic: string,
  userKey: string,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const presence = usePresence();
  const [userPresence, setUserPresence] = useState<PresenceState | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!enabled || !presence.isReady) return;

    const updatePresence = () => {
      const presenceState = presence.get(topic, userKey);
      setUserPresence(presenceState);
      setIsOnline(presenceState !== null && Object.keys(presenceState.connections).length > 0);
    };

    // Initial update
    updatePresence();

    // Set up polling
    const interval = setInterval(updatePresence, 1000);

    return () => clearInterval(interval);
  }, [enabled, presence.isReady, topic, userKey]);

  return {
    userKey,
    presence: userPresence,
    isOnline,
    connectionCount: userPresence ? Object.keys(userPresence.connections).length : 0,
    metadata: userPresence?.mergedMetadata || {},
    firstJoinedAt: userPresence?.firstJoinedAt,
    lastUpdated: userPresence?.updatedAt,
  };
}

/**
 * Presence list hook - reactive list of users in a topic
 */
export function usePresenceList(
  topic: string,
  options: { enabled?: boolean; includeMetadata?: boolean } = {}
) {
  const { enabled = true, includeMetadata = false } = options;
  const presence = usePresence();
  const [users, setUsers] = useState<Array<{ key: string; presence?: PresenceState }>>([]);

  useEffect(() => {
    if (!enabled || !presence.isReady) return;

    const updateUsersList = () => {
      const userKeys = presence.list(topic);
      
      const usersWithPresence = userKeys.map(key => ({
        key,
        presence: includeMetadata ? presence.get(topic, key) : undefined,
      }));

      setUsers(usersWithPresence);
    };

    // Initial update
    updateUsersList();

    // Set up polling
    const interval = setInterval(updateUsersList, 1000);

    return () => clearInterval(interval);
  }, [enabled, presence.isReady, topic, includeMetadata]);

  return {
    users,
    userCount: users.length,
    userKeys: users.map(u => u.key),
  };
}

/**
 * Global presence functions
 */
export const Presence = {
  /**
   * Track presence globally
   */
  track: async (topic: string, userKey: string, connectionId: string) => {
    const { presence_track } = await import('@katalyst/multithreading');
    return presence_track(topic, userKey, connectionId);
  },

  /**
   * Untrack presence globally
   */
  untrack: async (topic: string, userKey: string, connectionId: string) => {
    const { presence_untrack } = await import('@katalyst/multithreading');
    return presence_untrack(topic, userKey, connectionId);
  },

  /**
   * List users in topic globally
   */
  list: async (topic: string): Promise<string[]> => {
    const { presence_list } = await import('@katalyst/multithreading');
    return presence_list(topic);
  },
};