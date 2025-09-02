/**
 * Ngrok Fast Refresh Integration
 *
 * Provides team collaboration features for Fast Refresh:
 * - Broadcast refresh events to team members via ngrok tunnels
 * - Sync component changes across development environments
 * - Real-time collaboration for hot reloading
 */

import type { FastRefreshIntegration, RefreshUpdate } from '../KatalystFastRefreshProvider';

export interface NgrokFastRefreshConfig {
  broadcastChanges?: boolean;
  teamSync?: boolean;
  tunnelRefresh?: boolean;
  debugMode?: boolean;
}

export class NgrokFastRefresh implements FastRefreshIntegration {
  name = 'ngrok';
  private config: NgrokFastRefreshConfig;
  private tunnelUrls: Map<string, string> = new Map();
  private webSocketConnections: Map<string, WebSocket> = new Map();
  private refreshQueue: RefreshUpdate[] = [];
  private isConnected = false;

  constructor(config: NgrokFastRefreshConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Detect ngrok tunnels
    if (typeof window !== 'undefined') {
      const ngrokInfo = (window as any).__NGROK_INFO__;

      if (ngrokInfo) {
        console.log('🌍 Ngrok Fast Refresh initialized');

        // Store tunnel URLs
        if (ngrokInfo.tunnels) {
          Object.entries(ngrokInfo.tunnels).forEach(([name, url]) => {
            this.tunnelUrls.set(name, url as string);
          });
        }

        // Set up team synchronization
        if (this.config.teamSync) {
          await this.setupTeamSync();
        }

        // Set up tunnel refresh monitoring
        if (this.config.tunnelRefresh) {
          this.setupTunnelRefreshMonitoring();
        }
      } else {
        if (this.config.debugMode) {
          console.warn('⚠️  Ngrok tunnel information not available');
        }
      }
    }
  }

  async refresh(moduleId: string, exports: any): Promise<void> {
    if (!this.config.broadcastChanges) return;

    // Create refresh update
    const update: RefreshUpdate = {
      type: 'module-refresh',
      moduleId,
      timestamp: Date.now(),
      platform: this.detectPlatform(),
      metadata: {
        exports: this.serializeExports(exports),
        tunnels: Array.from(this.tunnelUrls.entries()),
      },
    };

    // Broadcast to team
    await this.broadcastUpdate(update);

    if (this.config.debugMode) {
      console.log(`🌐 Broadcasted refresh for ${moduleId} to team`);
    }
  }

  async cleanup(): Promise<void> {
    // Close all WebSocket connections
    this.webSocketConnections.forEach((ws, url) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    this.webSocketConnections.clear();
    this.tunnelUrls.clear();
    this.refreshQueue.length = 0;
  }

  async broadcastUpdate(update: RefreshUpdate): Promise<void> {
    if (!this.config.broadcastChanges) return;

    // Add to queue for processing
    this.refreshQueue.push(update);

    // Process queue
    await this.processRefreshQueue();

    // Send via WebSocket to team members
    await this.sendToTeamMembers(update);

    // Send via tunnel polling for fallback
    await this.sendViaTunnelPolling(update);
  }

  // Team Synchronization
  private async setupTeamSync(): Promise<void> {
    // Set up WebSocket connections to team members' ngrok tunnels
    const teamTunnels = this.getTeamTunnels();

    for (const [memberName, tunnelUrl] of teamTunnels) {
      await this.connectToTeamMember(memberName, tunnelUrl);
    }

    // Set up broadcast server
    await this.setupBroadcastServer();
  }

  private getTeamTunnels(): Map<string, string> {
    // In a real implementation, this would come from a team configuration
    // For now, we'll use environment variables or local storage
    const teamTunnels = new Map<string, string>();

    if (typeof window !== 'undefined') {
      const teamConfig = localStorage.getItem('katalyst-team-tunnels');
      if (teamConfig) {
        try {
          const config = JSON.parse(teamConfig);
          Object.entries(config).forEach(([name, url]) => {
            teamTunnels.set(name, url as string);
          });
        } catch (error) {
          console.warn('Failed to parse team tunnel config:', error);
        }
      }
    }

    return teamTunnels;
  }

  private async connectToTeamMember(memberName: string, tunnelUrl: string): Promise<void> {
    try {
      // Convert HTTP tunnel to WebSocket URL
      const wsUrl = tunnelUrl.replace(/^https?:/, 'wss:') + '/fast-refresh-sync';

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`🤝 Connected to ${memberName}'s development environment`);
        this.isConnected = true;

        // Send introduction message
        ws.send(
          JSON.stringify({
            type: 'team-member-connected',
            memberName: this.getCurrentMemberName(),
            tunnels: Array.from(this.tunnelUrls.entries()),
            timestamp: Date.now(),
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleTeamMessage(memberName, message);
        } catch (error) {
          console.warn('Failed to parse team message:', error);
        }
      };

      ws.onclose = () => {
        console.log(`🔌 Disconnected from ${memberName}'s development environment`);
        this.webSocketConnections.delete(memberName);

        // Attempt to reconnect after delay
        setTimeout(() => {
          this.connectToTeamMember(memberName, tunnelUrl);
        }, 5000);
      };

      ws.onerror = (error) => {
        console.warn(`WebSocket error with ${memberName}:`, error);
      };

      this.webSocketConnections.set(memberName, ws);
    } catch (error) {
      console.warn(`Failed to connect to ${memberName}:`, error);
    }
  }

  private async setupBroadcastServer(): Promise<void> {
    // Set up a simple WebSocket server for receiving team updates
    // In a real implementation, this might use ngrok's built-in WebSocket support

    if (typeof window !== 'undefined') {
      // Use Server-Sent Events as a fallback
      const eventSource = new EventSource('/fast-refresh-events');

      eventSource.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          this.handleRemoteRefreshUpdate(update);
        } catch (error) {
          console.warn('Failed to parse SSE message:', error);
        }
      };
    }
  }

  private getCurrentMemberName(): string {
    // Get current developer's name from config or environment
    return (
      process.env.DEVELOPER_NAME ||
      localStorage.getItem('katalyst-developer-name') ||
      'Anonymous Developer'
    );
  }

  private handleTeamMessage(memberName: string, message: any): void {
    switch (message.type) {
      case 'refresh-update':
        this.handleRemoteRefreshUpdate(message.update);
        break;

      case 'tunnel-changed':
        this.handleTunnelChange(memberName, message.tunnels);
        break;

      case 'team-member-connected':
        console.log(`👋 ${message.memberName} joined the development session`);
        this.showTeamNotification(`${message.memberName} joined`, 'info');
        break;

      default:
        if (this.config.debugMode) {
          console.log(`Received unknown message from ${memberName}:`, message);
        }
    }
  }

  private handleRemoteRefreshUpdate(update: RefreshUpdate): void {
    if (this.config.debugMode) {
      console.log('🔄 Received remote refresh update:', update);
    }

    // Show notification to developer
    this.showTeamNotification(
      `${update.platform} component updated: ${update.moduleId}`,
      'refresh'
    );

    // Optionally apply remote changes locally
    if (this.shouldApplyRemoteUpdate(update)) {
      this.applyRemoteUpdate(update);
    }
  }

  private shouldApplyRemoteUpdate(update: RefreshUpdate): boolean {
    // Determine if remote update should be applied locally
    // This could be based on user preferences, component compatibility, etc.
    return false; // Default to not applying remote updates automatically
  }

  private async applyRemoteUpdate(update: RefreshUpdate): Promise<void> {
    try {
      // Attempt to apply remote update locally
      if (update.metadata?.exports) {
        const exports = this.deserializeExports(update.metadata.exports);

        // Trigger local refresh with remote exports
        if (typeof window !== 'undefined' && (window as any).__KATALYST_FAST_REFRESH__) {
          await (window as any).__KATALYST_FAST_REFRESH__.refresh(update.moduleId, exports);
        }
      }
    } catch (error) {
      console.warn('Failed to apply remote update:', error);
    }
  }

  private handleTunnelChange(memberName: string, tunnels: [string, string][]): void {
    if (this.config.debugMode) {
      console.log(`🔗 ${memberName} updated their tunnels:`, tunnels);
    }

    // Update team member's tunnel information
    // This could be used for reconnection logic
  }

  // Tunnel Refresh Monitoring
  private setupTunnelRefreshMonitoring(): void {
    // Monitor ngrok tunnel status and refresh connections when needed
    setInterval(() => {
      this.checkTunnelHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkTunnelHealth(): Promise<void> {
    for (const [name, url] of this.tunnelUrls) {
      try {
        const response = await fetch(`${url}/health`, {
          method: 'HEAD',
          timeout: 5000,
        } as any);

        if (!response.ok) {
          console.warn(`🚨 Tunnel ${name} is unhealthy`);
          await this.refreshTunnel(name);
        }
      } catch (error) {
        console.warn(`🚨 Tunnel ${name} is unreachable:`, error);
        await this.refreshTunnel(name);
      }
    }
  }

  private async refreshTunnel(tunnelName: string): Promise<void> {
    // Attempt to refresh the tunnel
    if (typeof window !== 'undefined' && (window as any).__NGROK_API__) {
      try {
        const newUrl = await (window as any).__NGROK_API__.refreshTunnel(tunnelName);

        if (newUrl) {
          this.tunnelUrls.set(tunnelName, newUrl);
          console.log(`✅ Refreshed tunnel ${tunnelName}: ${newUrl}`);

          // Notify team about tunnel change
          await this.broadcastTunnelChange();
        }
      } catch (error) {
        console.error(`Failed to refresh tunnel ${tunnelName}:`, error);
      }
    }
  }

  private async broadcastTunnelChange(): Promise<void> {
    const message = {
      type: 'tunnel-changed',
      tunnels: Array.from(this.tunnelUrls.entries()),
      timestamp: Date.now(),
    };

    // Send to all connected team members
    this.webSocketConnections.forEach((ws, memberName) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  // Utility Methods
  private detectPlatform(): string {
    if (typeof window !== 'undefined') return 'web';
    if (typeof global !== 'undefined' && (global as any).__METRO_GLOBAL_PREFIX__) return 'mobile';
    return 'unknown';
  }

  private serializeExports(exports: any): any {
    // Serialize exports for transmission
    const serialized: any = {};

    Object.entries(exports).forEach(([key, value]) => {
      if (typeof value === 'function') {
        serialized[key] = {
          type: 'function',
          name: value.name,
          source: value.toString(),
        };
      } else if (typeof value === 'object' && value !== null) {
        try {
          serialized[key] = {
            type: 'object',
            value: JSON.stringify(value),
          };
        } catch (error) {
          serialized[key] = {
            type: 'object',
            value: '[Circular Reference]',
          };
        }
      } else {
        serialized[key] = {
          type: typeof value,
          value,
        };
      }
    });

    return serialized;
  }

  private deserializeExports(serialized: any): any {
    const exports: any = {};

    Object.entries(serialized).forEach(([key, data]: [string, any]) => {
      switch (data.type) {
        case 'function':
          try {
            exports[key] = new Function('return ' + data.source)();
          } catch (error) {
            console.warn(`Failed to deserialize function ${key}:`, error);
          }
          break;

        case 'object':
          try {
            exports[key] = JSON.parse(data.value);
          } catch (error) {
            console.warn(`Failed to deserialize object ${key}:`, error);
          }
          break;

        default:
          exports[key] = data.value;
      }
    });

    return exports;
  }

  private async processRefreshQueue(): Promise<void> {
    // Process queued refresh updates
    while (this.refreshQueue.length > 0) {
      const update = this.refreshQueue.shift()!;

      // Add timestamp and platform info
      update.timestamp = Date.now();
      update.platform = this.detectPlatform();
    }
  }

  private async sendToTeamMembers(update: RefreshUpdate): Promise<void> {
    const message = {
      type: 'refresh-update',
      update,
      sender: this.getCurrentMemberName(),
    };

    // Send to all connected team members
    this.webSocketConnections.forEach((ws, memberName) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          console.warn(`Failed to send to ${memberName}:`, error);
        }
      }
    });
  }

  private async sendViaTunnelPolling(update: RefreshUpdate): Promise<void> {
    // Fallback method using HTTP polling
    for (const [memberName, tunnelUrl] of this.getTeamTunnels()) {
      try {
        await fetch(`${tunnelUrl}/fast-refresh-update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        });
      } catch (error) {
        // Ignore polling errors as this is a fallback method
      }
    }
  }

  private showTeamNotification(message: string, type: 'info' | 'refresh' | 'error'): void {
    if (typeof window !== 'undefined') {
      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(`Katalyst Team Update`, {
          body: message,
          icon: type === 'refresh' ? '🔄' : type === 'error' ? '❌' : 'ℹ️',
        });
      }

      // Also dispatch custom event for UI notifications
      window.dispatchEvent(
        new CustomEvent('katalyst:team-notification', {
          detail: { message, type, timestamp: Date.now() },
        })
      );
    }
  }
}

// Helper hooks for team collaboration
export function useTeamFastRefresh() {
  return {
    subscribeToTeamUpdates: (callback: (update: RefreshUpdate) => void) => {
      const handler = (event: CustomEvent) => {
        callback(event.detail);
      };

      window.addEventListener('katalyst:team-notification', handler as EventListener);

      return () => {
        window.removeEventListener('katalyst:team-notification', handler as EventListener);
      };
    },

    getCurrentTeamMembers: () => {
      // Return currently connected team members
      return Array.from(
        ((window as any).__NGROK_FAST_REFRESH__?.webSocketConnections || new Map()).keys()
      );
    },

    broadcastToTeam: async (message: string) => {
      const ngrokRefresh = (window as any).__NGROK_FAST_REFRESH__;
      if (ngrokRefresh) {
        await ngrokRefresh.broadcastUpdate({
          type: 'component-refresh',
          timestamp: Date.now(),
          platform: 'web',
          metadata: { message },
        });
      }
    },
  };
}
