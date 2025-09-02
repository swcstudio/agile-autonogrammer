/**
 * Real-time Chat Application Example
 * 
 * This comprehensive example demonstrates the full power of the Katalyst
 * multithreading system with Elixir/Phoenix-inspired patterns:
 * 
 * - Actor System for user session management
 * - GenServer for chat room state
 * - Phoenix Channels for real-time messaging
 * - Process Registry for service discovery
 * - ETS for caching and fast lookups
 * - Presence tracking for user status
 * - Supervisor trees for fault tolerance
 * - React 19 integration with Suspense and concurrent features
 */

import React, { Suspense, use, startTransition } from 'react';
import {
  useActorSystem,
  useGenServer,
  useChannels,
  useRegistry,
  useETS,
  usePresence,
  usePubSub,
  useTopicPresence,
  useRoom,
  useETSCache,
  useNamedProcess
} from '@katalyst/hooks';

// ============================================
// 📡 CHAT ROOM GENSERVER
// ============================================

interface ChatRoomState {
  roomId: string;
  name: string;
  members: Set<string>;
  messageHistory: ChatMessage[];
  settings: RoomSettings;
  moderators: Set<string>;
  bannedUsers: Set<string>;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'action';
  reactions: Record<string, string[]>; // emoji -> user IDs
}

interface RoomSettings {
  maxMembers: number;
  allowedFileTypes: string[];
  slowMode: number; // Seconds between messages
  requireModeration: boolean;
}

const useChatRoomServer = (roomId: string, initialSettings: RoomSettings) => {
  return useGenServer<ChatRoomState>({
    init: async () => ({
      roomId,
      name: `Chat Room ${roomId}`,
      members: new Set(),
      messageHistory: [],
      settings: initialSettings,
      moderators: new Set(),
      bannedUsers: new Set(),
    }),

    handleCall: (request, from, state) => {
      switch (request.action) {
        case 'join_room': {
          const { userId, username } = request;
          
          if (state.bannedUsers.has(userId)) {
            return {
              type: 'reply',
              reply: { success: false, error: 'User is banned' },
              newState: state
            };
          }

          if (state.members.size >= state.settings.maxMembers) {
            return {
              type: 'reply',
              reply: { success: false, error: 'Room is full' },
              newState: state
            };
          }

          const newState = {
            ...state,
            members: new Set([...state.members, userId])
          };

          // Add system message
          const joinMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            userId: 'system',
            username: 'System',
            content: `${username} joined the room`,
            timestamp: Date.now(),
            type: 'system',
            reactions: {}
          };

          newState.messageHistory.push(joinMessage);

          return {
            type: 'reply',
            reply: { success: true, roomState: newState },
            newState
          };
        }

        case 'leave_room': {
          const { userId, username } = request;
          
          const newState = {
            ...state,
            members: new Set([...state.members].filter(id => id !== userId))
          };

          const leaveMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            userId: 'system',
            username: 'System',
            content: `${username} left the room`,
            timestamp: Date.now(),
            type: 'system',
            reactions: {}
          };

          newState.messageHistory.push(leaveMessage);

          return {
            type: 'reply',
            reply: { success: true },
            newState
          };
        }

        case 'send_message': {
          const { userId, username, content, type = 'message' } = request;

          if (state.bannedUsers.has(userId)) {
            return {
              type: 'reply',
              reply: { success: false, error: 'User is banned' },
              newState: state
            };
          }

          const message: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random()}`,
            userId,
            username,
            content,
            timestamp: Date.now(),
            type,
            reactions: {}
          };

          const newState = {
            ...state,
            messageHistory: [...state.messageHistory, message]
          };

          // Keep only last 100 messages
          if (newState.messageHistory.length > 100) {
            newState.messageHistory = newState.messageHistory.slice(-100);
          }

          return {
            type: 'reply',
            reply: { success: true, message },
            newState
          };
        }

        case 'add_reaction': {
          const { messageId, userId, emoji } = request;
          
          const messageIndex = state.messageHistory.findIndex(m => m.id === messageId);
          if (messageIndex === -1) {
            return {
              type: 'reply',
              reply: { success: false, error: 'Message not found' },
              newState: state
            };
          }

          const newState = { ...state };
          const message = { ...newState.messageHistory[messageIndex] };
          
          if (!message.reactions[emoji]) {
            message.reactions[emoji] = [];
          }
          
          if (!message.reactions[emoji].includes(userId)) {
            message.reactions[emoji].push(userId);
          }

          newState.messageHistory[messageIndex] = message;

          return {
            type: 'reply',
            reply: { success: true },
            newState
          };
        }

        case 'get_history': {
          const { limit = 50, before } = request;
          
          let messages = state.messageHistory;
          if (before) {
            const beforeIndex = messages.findIndex(m => m.id === before);
            if (beforeIndex > 0) {
              messages = messages.slice(0, beforeIndex);
            }
          }

          const history = messages.slice(-limit);

          return {
            type: 'reply',
            reply: { messages: history },
            newState: state
          };
        }

        default:
          return {
            type: 'reply',
            reply: { error: 'Unknown action' },
            newState: state
          };
      }
    },

    handleCast: (request, state) => {
      switch (request.action) {
        case 'update_settings': {
          return {
            type: 'noreply',
            newState: {
              ...state,
              settings: { ...state.settings, ...request.settings }
            }
          };
        }

        case 'moderate_user': {
          const { userId, action } = request;
          const newState = { ...state };

          switch (action) {
            case 'ban':
              newState.bannedUsers = new Set([...state.bannedUsers, userId]);
              newState.members = new Set([...state.members].filter(id => id !== userId));
              break;
            case 'unban':
              newState.bannedUsers = new Set([...state.bannedUsers].filter(id => id !== userId));
              break;
            case 'promote':
              newState.moderators = new Set([...state.moderators, userId]);
              break;
            case 'demote':
              newState.moderators = new Set([...state.moderators].filter(id => id !== userId));
              break;
          }

          return { type: 'noreply', newState };
        }

        default:
          return { type: 'noreply', newState: state };
      }
    },

    terminate: async (reason, finalState) => {
      console.log(`Chat room ${finalState.roomId} terminating:`, reason);
    }
  }, undefined, { syncWithReact: true });
};

// ============================================
// 👤 USER SESSION ACTOR
// ============================================

interface UserSession {
  userId: string;
  username: string;
  joinedRooms: Set<string>;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity: number;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  soundEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

const useUserSessionActor = (userId: string, username: string) => {
  const actorSystem = useActorSystem();

  const sessionActor = actorSystem.spawn({
    init: async (): Promise<UserSession> => ({
      userId,
      username,
      joinedRooms: new Set(),
      status: 'online',
      lastActivity: Date.now(),
      preferences: {
        theme: 'light',
        notifications: true,
        soundEnabled: true,
        fontSize: 'medium'
      }
    }),

    receive: async (message, state: UserSession) => {
      switch (message.type) {
        case 'join_room':
          return {
            ...state,
            joinedRooms: new Set([...state.joinedRooms, message.roomId]),
            lastActivity: Date.now()
          };

        case 'leave_room':
          return {
            ...state,
            joinedRooms: new Set([...state.joinedRooms].filter(id => id !== message.roomId)),
            lastActivity: Date.now()
          };

        case 'update_status':
          return {
            ...state,
            status: message.status,
            lastActivity: Date.now()
          };

        case 'update_preferences':
          return {
            ...state,
            preferences: { ...state.preferences, ...message.preferences },
            lastActivity: Date.now()
          };

        case 'heartbeat':
          return {
            ...state,
            lastActivity: Date.now()
          };

        default:
          return state;
      }
    }
  });

  return sessionActor;
};

// ============================================
// 💬 MAIN CHAT APPLICATION COMPONENT
// ============================================

interface ChatAppProps {
  userId: string;
  username: string;
  roomId: string;
}

const ChatApp: React.FC<ChatAppProps> = ({ userId, username, roomId }) => {
  // Initialize all the hooks
  const registry = useRegistry();
  const channels = useChannels();
  const presence = usePresence();
  const ets = useETS<any>();
  const pubsub = usePubSub();

  // Create message cache
  const messageCache = useETSCache<ChatMessage>('message-cache', {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000
  });

  // Create user cache
  const userCache = useETSCache<UserSession>('user-cache', {
    ttl: 10 * 60 * 1000, // 10 minutes
  });

  // Set up chat room server
  const roomServer = useChatRoomServer(roomId, {
    maxMembers: 100,
    allowedFileTypes: ['jpg', 'png', 'gif'],
    slowMode: 0,
    requireModeration: false
  });

  // Set up user session
  const userSession = useUserSessionActor(userId, username);

  // Set up room presence
  const roomPresence = useTopicPresence(`room:${roomId}`, {
    userKey: userId,
    metadata: {
      username,
      status: 'online',
      joinedAt: Date.now()
    },
    autoHeartbeat: true
  });

  // Set up room messaging
  const room = useRoom(roomId, {
    userId,
    enabled: true
  });

  // Register services in the process registry
  React.useEffect(() => {
    if (registry.isReady && roomServer.isReady) {
      // Register the chat room server
      registry.register(
        { type: 'name', name: `chat_room_${roomId}` },
        roomServer.actorId,
        { type: 'chat_room', room_id: roomId }
      );

      // Register the user session
      if (userSession) {
        registry.register(
          { type: 'name', name: `user_session_${userId}` },
          userSession.id,
          { type: 'user_session', user_id: userId, username }
        );
      }
    }
  }, [registry.isReady, roomServer.isReady, userSession, roomId, userId, username]);

  // Cache messages for quick lookup
  React.useEffect(() => {
    if (roomServer.state?.messageHistory) {
      for (const message of roomServer.state.messageHistory) {
        messageCache.set(message.id, message);
      }
    }
  }, [roomServer.state?.messageHistory, messageCache]);

  // Join room on mount
  React.useEffect(() => {
    if (roomServer.isReady) {
      roomServer.call({
        action: 'join_room',
        userId,
        username
      });
    }
  }, [roomServer.isReady, userId, username]);

  return (
    <div className="chat-app">
      <Suspense fallback={<ChatLoadingSkeleton />}>
        <ChatHeader 
          roomName={roomServer.state?.name || `Room ${roomId}`}
          memberCount={roomServer.state?.members.size || 0}
          onlineUsers={roomPresence.users}
        />
        
        <div className="chat-main">
          <ChatSidebar 
            users={roomPresence.users}
            presence={presence}
            roomId={roomId}
          />
          
          <ChatMessageArea
            messages={roomServer.state?.messageHistory || []}
            currentUserId={userId}
            onSendMessage={async (content: string) => {
              const result = await roomServer.call({
                action: 'send_message',
                userId,
                username,
                content
              });
              
              if (result.success) {
                // Broadcast to all room members
                await room.sendMessage(content);
                
                // Publish to PubSub for other components
                pubsub.publish(`room:${roomId}:messages`, result.message);
              }
            }}
            onAddReaction={async (messageId: string, emoji: string) => {
              await roomServer.call({
                action: 'add_reaction',
                messageId,
                userId,
                emoji
              });
            }}
          />
          
          <PresencePanel 
            users={roomPresence.users}
            presence={presence}
            topic={`room:${roomId}`}
          />
        </div>
        
        <ChatStatusBar 
          connectionStatus={channels.isConnected ? 'connected' : 'disconnected'}
          presenceStatus={roomPresence.isTracked ? 'active' : 'inactive'}
          roomServerStatus={roomServer.isReady ? 'ready' : 'initializing'}
        />
      </Suspense>
    </div>
  );
};

// ============================================
// 🧩 CHAT COMPONENTS
// ============================================

const ChatLoadingSkeleton: React.FC = () => (
  <div className="chat-loading">
    <div className="skeleton-header" />
    <div className="skeleton-messages">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="skeleton-message" />
      ))}
    </div>
    <div className="skeleton-input" />
  </div>
);

interface ChatHeaderProps {
  roomName: string;
  memberCount: number;
  onlineUsers: string[];
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ roomName, memberCount, onlineUsers }) => (
  <header className="chat-header">
    <h1>{roomName}</h1>
    <div className="room-stats">
      <span>{memberCount} members</span>
      <span>{onlineUsers.length} online</span>
    </div>
  </header>
);

interface ChatSidebarProps {
  users: string[];
  presence: any;
  roomId: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ users, presence, roomId }) => {
  const [selectedUser, setSelectedUser] = React.useState<string | null>(null);

  return (
    <aside className="chat-sidebar">
      <h3>Online Users</h3>
      <div className="user-list">
        {users.map(userId => (
          <div 
            key={userId}
            className={`user-item ${selectedUser === userId ? 'selected' : ''}`}
            onClick={() => setSelectedUser(userId)}
          >
            <div className="user-avatar" />
            <span className="user-name">{userId}</span>
            <div className="user-status online" />
          </div>
        ))}
      </div>
    </aside>
  );
};

interface ChatMessageAreaProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
}

const ChatMessageArea: React.FC<ChatMessageAreaProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onAddReaction
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <main className="chat-messages">
      <div className="messages-container">
        {messages.map(message => (
          <ChatMessage
            key={message.id}
            message={message}
            isOwn={message.userId === currentUserId}
            onAddReaction={(emoji) => onAddReaction(message.id, emoji)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
        />
        <button type="submit" disabled={!inputValue.trim()}>
          Send
        </button>
      </form>
    </main>
  );
};

interface ChatMessageProps {
  message: ChatMessage;
  isOwn: boolean;
  onAddReaction: (emoji: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn, onAddReaction }) => {
  const [showReactions, setShowReactions] = React.useState(false);

  return (
    <div className={`message ${isOwn ? 'own' : ''} ${message.type}`}>
      {!isOwn && (
        <div className="message-avatar">
          <img src={`/avatars/${message.userId}.png`} alt={message.username} />
        </div>
      )}
      
      <div className="message-content">
        <div className="message-header">
          <span className="username">{message.username}</span>
          <span className="timestamp">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="message-text">{message.content}</div>
        
        {Object.entries(message.reactions).length > 0 && (
          <div className="message-reactions">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <span 
                key={emoji}
                className="reaction"
                onClick={() => onAddReaction(emoji)}
              >
                {emoji} {users.length}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="message-actions">
        <button 
          onClick={() => setShowReactions(!showReactions)}
          className="react-button"
        >
          😀
        </button>
        
        {showReactions && (
          <div className="reaction-picker">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onAddReaction(emoji);
                  setShowReactions(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PresencePanelProps {
  users: string[];
  presence: any;
  topic: string;
}

const PresencePanel: React.FC<PresencePanelProps> = ({ users, presence, topic }) => {
  return (
    <aside className="presence-panel">
      <h3>Room Activity</h3>
      <div className="presence-stats">
        <div>Active Users: {users.length}</div>
        <div>Total Topics: {presence.topics().length}</div>
      </div>
      
      <div className="presence-details">
        {users.map(userId => (
          <div key={userId} className="presence-user">
            <span>{userId}</span>
            <div className="presence-indicator online" />
          </div>
        ))}
      </div>
    </aside>
  );
};

interface ChatStatusBarProps {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  presenceStatus: 'active' | 'inactive';
  roomServerStatus: 'ready' | 'initializing' | 'error';
}

const ChatStatusBar: React.FC<ChatStatusBarProps> = ({
  connectionStatus,
  presenceStatus,
  roomServerStatus
}) => (
  <footer className="chat-status-bar">
    <div className="status-item">
      <span className={`indicator ${connectionStatus}`} />
      Connection: {connectionStatus}
    </div>
    
    <div className="status-item">
      <span className={`indicator ${presenceStatus}`} />
      Presence: {presenceStatus}
    </div>
    
    <div className="status-item">
      <span className={`indicator ${roomServerStatus}`} />
      Room: {roomServerStatus}
    </div>
  </footer>
);

// ============================================
// 🚀 APP WRAPPER WITH SUSPENSE
// ============================================

const App: React.FC = () => {
  const [currentUser] = React.useState({
    userId: `user_${Math.random().toString(36).substr(2, 9)}`,
    username: `User${Math.floor(Math.random() * 1000)}`
  });

  const [currentRoom] = React.useState('general');

  return (
    <div className="app">
      <Suspense fallback={<div>Loading Katalyst Chat...</div>}>
        <ChatApp
          userId={currentUser.userId}
          username={currentUser.username}
          roomId={currentRoom}
        />
      </Suspense>
    </div>
  );
};

export default App;