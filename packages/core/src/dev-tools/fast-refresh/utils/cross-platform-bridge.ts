/**
 * Cross-Platform Bridge for Fast Refresh
 *
 * Enables state synchronization and refresh coordination between
 * web, mobile, and other platforms in the Katalyst ecosystem
 */

export interface CrossPlatformMessage {
  type: 'refresh' | 'state-sync' | 'error' | 'health-check';
  platform: 'web' | 'mobile' | 'electron' | 'ssr';
  moduleId?: string;
  componentName?: string;
  state?: any;
  error?: string;
  timestamp: number;
  sessionId: string;
}

export interface BridgeConfig {
  platformId: string;
  sessionId: string;
  enableWebSocket?: boolean;
  enablePolling?: boolean;
  pollIntervalMs?: number;
  ngrokTunnels?: Record<string, string>;
  debugMode?: boolean;
}

export class CrossPlatformBridge {
  private config: BridgeConfig;
  private connections: Map<string, Connection> = new Map();
  private messageQueue: CrossPlatformMessage[] = [];
  private messageHandlers: Set<(message: CrossPlatformMessage) => void> = new Set();
  private healthCheckInterval?: NodeJS.Timeout;
  private isConnected = false;

  constructor(config: BridgeConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log(`🌉 Initializing cross-platform bridge for ${this.config.platformId}`);

    // Set up WebSocket connections if enabled
    if (this.config.enableWebSocket) {
      await this.setupWebSocketConnections();
    }

    // Set up polling fallback if enabled
    if (this.config.enablePolling) {
      this.setupPollingConnections();
    }

    // Start health checks
    this.startHealthChecks();

    this.isConnected = true;
    console.log('✅ Cross-platform bridge initialized');
  }

  async sendMessage(message: Omit<CrossPlatformMessage, 'timestamp' | 'sessionId'>): Promise<void> {
    const fullMessage: CrossPlatformMessage = {
      ...message,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
    };

    // Add to queue for processing
    this.messageQueue.push(fullMessage);

    // Send immediately if connected
    if (this.isConnected) {
      await this.processMessageQueue();
    }

    if (this.config.debugMode) {
      console.log('📤 Sent cross-platform message:', fullMessage);
    }
  }

  onMessage(handler: (message: CrossPlatformMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  async syncState(componentName: string, state: any): Promise<void> {
    await this.sendMessage({
      type: 'state-sync',
      platform: this.detectCurrentPlatform(),
      componentName,
      state,
    });
  }

  async broadcastRefresh(moduleId: string, componentName?: string): Promise<void> {
    await this.sendMessage({
      type: 'refresh',
      platform: this.detectCurrentPlatform(),
      moduleId,
      componentName,
    });
  }

  async reportError(error: string, moduleId?: string): Promise<void> {
    await this.sendMessage({
      type: 'error',
      platform: this.detectCurrentPlatform(),
      error,
      moduleId,
    });
  }

  disconnect(): void {
    // Close all connections
    this.connections.forEach((connection, platformId) => {
      connection.close();
    });
    this.connections.clear();

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.isConnected = false;
    console.log('🔌 Cross-platform bridge disconnected');
  }

  // Private methods
  private async setupWebSocketConnections(): Promise<void> {
    if (!this.config.ngrokTunnels) return;

    for (const [platformId, tunnelUrl] of Object.entries(this.config.ngrokTunnels)) {
      if (platformId !== this.config.platformId) {
        await this.connectToPlatform(platformId, tunnelUrl, 'websocket');
      }
    }
  }

  private setupPollingConnections(): void {
    if (!this.config.ngrokTunnels) return;

    for (const [platformId, tunnelUrl] of Object.entries(this.config.ngrokTunnels)) {
      if (platformId !== this.config.platformId) {
        this.connectToPlatform(platformId, tunnelUrl, 'polling');
      }
    }
  }

  private async connectToPlatform(
    platformId: string,
    tunnelUrl: string,
    connectionType: 'websocket' | 'polling'
  ): Promise<void> {
    try {
      let connection: Connection;

      if (connectionType === 'websocket') {
        connection = await this.createWebSocketConnection(platformId, tunnelUrl);
      } else {
        connection = this.createPollingConnection(platformId, tunnelUrl);
      }

      this.connections.set(platformId, connection);

      if (this.config.debugMode) {
        console.log(`🔗 Connected to ${platformId} via ${connectionType}`);
      }
    } catch (error) {
      console.warn(`Failed to connect to ${platformId}:`, error);
    }
  }

  private async createWebSocketConnection(
    platformId: string,
    tunnelUrl: string
  ): Promise<Connection> {
    const wsUrl = tunnelUrl.replace(/^https?:/, 'wss:') + '/fast-refresh-bridge';

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Send introduction message
        ws.send(
          JSON.stringify({
            type: 'platform-connected',
            platformId: this.config.platformId,
            sessionId: this.config.sessionId,
            timestamp: Date.now(),
          })
        );

        resolve({
          type: 'websocket',
          send: (message) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(message));
            }
          },
          close: () => ws.close(),
          isConnected: () => ws.readyState === WebSocket.OPEN,
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as CrossPlatformMessage;
          this.handleIncomingMessage(message);
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log(`🔌 WebSocket connection to ${platformId} closed`);
        this.connections.delete(platformId);

        // Attempt to reconnect after delay
        setTimeout(() => {
          this.connectToPlatform(platformId, tunnelUrl, 'websocket');
        }, 5000);
      };

      ws.onerror = (error) => {
        console.warn(`WebSocket error with ${platformId}:`, error);
        reject(error);
      };
    });
  }

  private createPollingConnection(platformId: string, tunnelUrl: string): Connection {
    let isActive = true;

    const poll = async () => {
      if (!isActive) return;

      try {
        const response = await fetch(`${tunnelUrl}/fast-refresh-bridge/poll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformId: this.config.platformId,
            sessionId: this.config.sessionId,
            lastPollTime: Date.now() - (this.config.pollIntervalMs || 1000),
          }),
        });

        if (response.ok) {
          const messages = await response.json();
          messages.forEach((message: CrossPlatformMessage) => {
            this.handleIncomingMessage(message);
          });
        }
      } catch (error) {
        if (this.config.debugMode) {
          console.warn(`Polling error with ${platformId}:`, error);
        }
      }

      // Schedule next poll
      setTimeout(poll, this.config.pollIntervalMs || 1000);
    };

    // Start polling
    poll();

    return {
      type: 'polling',
      send: async (message) => {
        try {
          await fetch(`${tunnelUrl}/fast-refresh-bridge/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          });
        } catch (error) {
          if (this.config.debugMode) {
            console.warn(`Failed to send polling message:`, error);
          }
        }
      },
      close: () => {
        isActive = false;
      },
      isConnected: () => isActive,
    };
  }

  private handleIncomingMessage(message: CrossPlatformMessage): void {
    // Ignore messages from same session
    if (message.sessionId === this.config.sessionId) {
      return;
    }

    if (this.config.debugMode) {
      console.log('📥 Received cross-platform message:', message);
    }

    // Notify all handlers
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.warn('Error in message handler:', error);
      }
    });
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;

      // Send to all connected platforms
      for (const [platformId, connection] of this.connections) {
        if (connection.isConnected()) {
          try {
            await connection.send(message);
          } catch (error) {
            console.warn(`Failed to send message to ${platformId}:`, error);
          }
        }
      }
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.sendMessage({
        type: 'health-check',
        platform: this.detectCurrentPlatform(),
      });
    }, 30000); // Every 30 seconds
  }

  private detectCurrentPlatform(): 'web' | 'mobile' | 'electron' | 'ssr' {
    if (typeof window !== 'undefined') {
      if ((window as any).require && (window as any).process?.type) {
        return 'electron';
      }
      return 'web';
    }

    if (typeof global !== 'undefined') {
      if (
        (global as any).__METRO_GLOBAL_PREFIX__ ||
        (global as any).navigator?.product === 'ReactNative'
      ) {
        return 'mobile';
      }

      if ((global as any).process?.versions?.node) {
        return 'ssr';
      }
    }

    return 'web';
  }

  // Public utility methods
  getConnectedPlatforms(): string[] {
    return Array.from(this.connections.keys()).filter((platformId) =>
      this.connections.get(platformId)?.isConnected()
    );
  }

  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    this.connections.forEach((connection, platformId) => {
      status[platformId] = connection.isConnected();
    });

    return status;
  }

  async waitForConnection(platformId: string, timeoutMs = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const connection = this.connections.get(platformId);
      if (connection?.isConnected()) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }
}

// Connection interface
interface Connection {
  type: 'websocket' | 'polling';
  send: (message: CrossPlatformMessage) => Promise<void> | void;
  close: () => void;
  isConnected: () => boolean;
}

// Utility functions
export const createBridgeConfig = (
  platformId: string,
  ngrokTunnels?: Record<string, string>
): BridgeConfig => ({
  platformId,
  sessionId: generateSessionId(),
  enableWebSocket: true,
  enablePolling: true,
  pollIntervalMs: 2000,
  ngrokTunnels,
  debugMode: process.env.NODE_ENV === 'development',
});

export const generateSessionId = (): string => {
  return `katalyst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Global bridge instance management
let globalBridge: CrossPlatformBridge | null = null;

export const getGlobalBridge = (): CrossPlatformBridge | null => globalBridge;

export const initializeGlobalBridge = async (
  config: BridgeConfig
): Promise<CrossPlatformBridge> => {
  if (globalBridge) {
    globalBridge.disconnect();
  }

  globalBridge = new CrossPlatformBridge(config);
  await globalBridge.initialize();

  return globalBridge;
};

export const disconnectGlobalBridge = (): void => {
  if (globalBridge) {
    globalBridge.disconnect();
    globalBridge = null;
  }
};
