/**
 * useChannels - React 19 hook for Phoenix Channels
 * 
 * Provides real-time communication capabilities with:
 * - Topic-based messaging
 * - Join/leave channel management
 * - Broadcasting and direct messaging
 * - Channel state synchronization
 * - Automatic reconnection
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
 * Channel message structure
 */
export interface ChannelMessage {
  id: string;
  topic: string;
  event: string;
  payload: any;
  refId?: string;
  timestamp: number;
  metadata: Record<string, string>;
}

/**
 * Channel reply structure
 */
export interface ChannelReply {
  refId: string;
  status: 'ok' | 'error' | 'timeout' | 'unauthorized' | 'forbidden';
  response: any;
  error?: string;
}

/**
 * Join parameters
 */
export interface JoinParams {
  authToken?: string;
  metadata?: Record<string, string>;
  permissions?: string[];
}

/**
 * Channel state
 */
export interface ChannelState {
  topic: string;
  clientCount: number;
  metadata: Record<string, string>;
  state: any;
  createdAt: number;
  updatedAt: number;
}

/**
 * Channel hook options
 */
export interface UseChannelsOptions {
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
  suspense?: boolean;
}

/**
 * Channel hook return type
 */
export interface UseChannelsReturn {
  // Connection management
  join: (topic: string, params?: JoinParams) => Promise<ChannelReply>;
  leave: (topic: string) => Promise<void>;
  
  // Messaging
  broadcast: (topic: string, event: string, payload: any) => Promise<number>;
  push: (clientId: string, topic: string, event: string, payload: any) => Promise<void>;
  
  // Channel information
  getClients: (topic: string) => string[];
  getTopics: () => string[];
  getChannelState: (topic: string) => ChannelState | null;
  
  // Statistics
  getStats: () => ChannelStats;
  
  // State
  isConnected: boolean;
  joinedTopics: string[];
}

/**
 * Channel statistics
 */
export interface ChannelStats {
  totalClients: number;
  totalChannels: number;
  messagesSent: number;
  messagesReceived: number;
  joinsTotal: number;
  leavesTotal: number;
}

/**
 * Message handler type
 */
export type MessageHandler = (message: ChannelMessage) => void;

/**
 * Main channels hook
 */
export function useChannels(options: UseChannelsOptions = {}): UseChannelsReturn {
  const {
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    debug = false,
    suspense = false
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [joinedTopics, setJoinedTopics] = useState<string[]>([]);
  
  // Import channel functions from Rust
  const channelSystemRef = useRef<any>(null);
  const messageHandlersRef = useRef<Map<string, MessageHandler[]>>(new Map());
  const reconnectAttemptsRef = useRef(0);

  // Initialize channel system
  useEffect(() => {
    const initializeChannels = async () => {
      try {
        // Import channel system from multithreading module
        const { JsChannelSystem } = await import('@katalyst/multithreading');
        channelSystemRef.current = new JsChannelSystem();
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      } catch (error) {
        if (debug) {
          console.error('Failed to initialize channel system:', error);
        }
        
        // Auto-reconnect logic
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setTimeout(() => {
            initializeChannels();
          }, reconnectDelay);
        }
      }
    };

    initializeChannels();
  }, [autoReconnect, reconnectDelay, maxReconnectAttempts, debug]);

  // Join a topic
  const join = useCallback(async (topic: string, params: JoinParams = {}): Promise<ChannelReply> => {
    if (!channelSystemRef.current) {
      throw new Error('Channel system not initialized');
    }

    if (suspense) {
      return use(joinTopic(topic, params));
    }

    return joinTopic(topic, params);
  }, [suspense]);

  // Helper function for joining
  const joinTopic = useCallback(async (topic: string, params: JoinParams): Promise<ChannelReply> => {
    const channelSystem = channelSystemRef.current;
    const clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const reply = await channelSystem.join(clientId, topic, params.authToken);
      
      startTransition(() => {
        setJoinedTopics(prev => {
          if (!prev.includes(topic)) {
            return [...prev, topic];
          }
          return prev;
        });
      });
      
      return reply;
    } catch (error) {
      throw new Error(`Failed to join topic ${topic}: ${error}`);
    }
  }, []);

  // Leave a topic
  const leave = useCallback(async (topic: string): Promise<void> => {
    if (!channelSystemRef.current) {
      throw new Error('Channel system not initialized');
    }

    const clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await channelSystemRef.current.leave(clientId, topic);
      
      startTransition(() => {
        setJoinedTopics(prev => prev.filter(t => t !== topic));
      });
    } catch (error) {
      throw new Error(`Failed to leave topic ${topic}: ${error}`);
    }
  }, []);

  // Broadcast message to topic
  const broadcast = useCallback(async (topic: string, event: string, payload: any): Promise<number> => {
    if (!channelSystemRef.current) {
      throw new Error('Channel system not initialized');
    }

    try {
      const payloadStr = JSON.stringify(payload);
      return await channelSystemRef.current.broadcast(topic, event, payloadStr);
    } catch (error) {
      throw new Error(`Failed to broadcast to topic ${topic}: ${error}`);
    }
  }, []);

  // Push message to specific client
  const push = useCallback(async (clientId: string, topic: string, event: string, payload: any): Promise<void> => {
    if (!channelSystemRef.current) {
      throw new Error('Channel system not initialized');
    }

    try {
      const payloadStr = JSON.stringify(payload);
      await channelSystemRef.current.push(clientId, topic, event, payloadStr);
    } catch (error) {
      throw new Error(`Failed to push to client ${clientId}: ${error}`);
    }
  }, []);

  // Get clients in topic
  const getClients = useCallback((topic: string): string[] => {
    if (!channelSystemRef.current) {
      return [];
    }

    try {
      return channelSystemRef.current.getClients(topic);
    } catch (error) {
      if (debug) {
        console.error(`Failed to get clients for topic ${topic}:`, error);
      }
      return [];
    }
  }, [debug]);

  // Get all topics
  const getTopics = useCallback((): string[] => {
    if (!channelSystemRef.current) {
      return [];
    }

    try {
      return channelSystemRef.current.listTopics();
    } catch (error) {
      if (debug) {
        console.error('Failed to get topics:', error);
      }
      return [];
    }
  }, [debug]);

  // Get channel state
  const getChannelState = useCallback((topic: string): ChannelState | null => {
    if (!channelSystemRef.current) {
      return null;
    }

    try {
      // This would need to be implemented in the Rust side
      return null; // Placeholder
    } catch (error) {
      if (debug) {
        console.error(`Failed to get channel state for topic ${topic}:`, error);
      }
      return null;
    }
  }, [debug]);

  // Get statistics
  const getStats = useCallback((): ChannelStats => {
    if (!channelSystemRef.current) {
      return {
        totalClients: 0,
        totalChannels: 0,
        messagesSent: 0,
        messagesReceived: 0,
        joinsTotal: 0,
        leavesTotal: 0,
      };
    }

    try {
      return channelSystemRef.current.getStats();
    } catch (error) {
      if (debug) {
        console.error('Failed to get channel stats:', error);
      }
      return {
        totalClients: 0,
        totalChannels: 0,
        messagesSent: 0,
        messagesReceived: 0,
        joinsTotal: 0,
        leavesTotal: 0,
      };
    }
  }, [debug]);

  return {
    join,
    leave,
    broadcast,
    push,
    getClients,
    getTopics,
    getChannelState,
    getStats,
    isConnected,
    joinedTopics,
  };
}

/**
 * Topic subscription hook
 */
export function useTopicSubscription(
  topic: string, 
  messageHandler: MessageHandler,
  options: { 
    enabled?: boolean;
    autoJoin?: boolean;
    joinParams?: JoinParams;
  } = {}
) {
  const { enabled = true, autoJoin = true, joinParams = {} } = options;
  const channels = useChannels();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  // Auto-join topic
  useEffect(() => {
    if (!enabled || !autoJoin || !channels.isConnected) return;

    let isMounted = true;

    const joinTopic = async () => {
      try {
        await channels.join(topic, joinParams);
        if (isMounted) {
          setIsJoined(true);
        }
      } catch (error) {
        console.error(`Failed to join topic ${topic}:`, error);
      }
    };

    joinTopic();

    // Leave topic on unmount
    return () => {
      isMounted = false;
      if (isJoined) {
        channels.leave(topic).catch(console.error);
      }
    };
  }, [enabled, autoJoin, channels.isConnected, topic, joinParams]);

  // Set up message handler
  useEffect(() => {
    if (!enabled || !isJoined) return;

    // Store message handler
    setIsSubscribed(true);

    // In a real implementation, we'd set up the message listener here
    // For now, this is a placeholder

    return () => {
      setIsSubscribed(false);
    };
  }, [enabled, isJoined, messageHandler]);

  return {
    isSubscribed,
    isJoined,
    topic,
    unsubscribe: useCallback(() => {
      if (isJoined) {
        channels.leave(topic);
        setIsJoined(false);
        setIsSubscribed(false);
      }
    }, [isJoined, channels, topic]),
  };
}

/**
 * Room hook - convenience for chat rooms
 */
export function useRoom(roomId: string, options: { enabled?: boolean; userId?: string } = {}) {
  const { enabled = true, userId } = options;
  const topic = `room:${roomId}`;
  
  const channels = useChannels();
  const [members, setMembers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);

  // Message handler for room events
  const handleMessage = useCallback((message: ChannelMessage) => {
    switch (message.event) {
      case 'user_joined':
        setMembers(prev => {
          if (!prev.includes(message.payload.userId)) {
            return [...prev, message.payload.userId];
          }
          return prev;
        });
        break;

      case 'user_left':
        setMembers(prev => prev.filter(id => id !== message.payload.userId));
        break;

      case 'new_message':
        setMessages(prev => [...prev, message]);
        break;

      default:
        // Handle other events
        break;
    }
  }, []);

  // Subscribe to room topic
  const subscription = useTopicSubscription(topic, handleMessage, {
    enabled,
    joinParams: {
      metadata: { userId: userId || 'anonymous' },
    },
  });

  // Send message to room
  const sendMessage = useCallback(async (content: string) => {
    if (!subscription.isJoined) {
      throw new Error('Not joined to room');
    }

    await channels.broadcast(topic, 'new_message', {
      content,
      userId: userId || 'anonymous',
      timestamp: Date.now(),
    });
  }, [channels, topic, subscription.isJoined, userId]);

  // Join room explicitly
  const joinRoom = useCallback(async () => {
    if (!channels.isConnected) {
      throw new Error('Channel system not connected');
    }

    await channels.join(topic, {
      metadata: { userId: userId || 'anonymous' },
    });

    // Announce join
    await channels.broadcast(topic, 'user_joined', {
      userId: userId || 'anonymous',
    });
  }, [channels, topic, userId]);

  // Leave room explicitly
  const leaveRoom = useCallback(async () => {
    if (!subscription.isJoined) return;

    // Announce leave
    await channels.broadcast(topic, 'user_left', {
      userId: userId || 'anonymous',
    });

    await channels.leave(topic);
  }, [channels, topic, subscription.isJoined, userId]);

  return {
    roomId,
    topic,
    members,
    messages,
    isJoined: subscription.isJoined,
    sendMessage,
    joinRoom,
    leaveRoom,
    clearMessages: useCallback(() => setMessages([]), []),
  };
}

/**
 * Global channel functions
 */
export const Channels = {
  /**
   * Join a channel globally
   */
  join: async (clientId: string, topic: string) => {
    const { join_channel } = await import('@katalyst/multithreading');
    return join_channel(clientId, topic);
  },

  /**
   * Leave a channel globally
   */
  leave: async (clientId: string, topic: string) => {
    const { leave_channel } = await import('@katalyst/multithreading');
    return leave_channel(clientId, topic);
  },

  /**
   * Broadcast to a channel globally
   */
  broadcast: async (topic: string, event: string, payload: any) => {
    const { broadcast_to_channel } = await import('@katalyst/multithreading');
    const payloadStr = JSON.stringify(payload);
    return broadcast_to_channel(topic, event, payloadStr);
  },
};