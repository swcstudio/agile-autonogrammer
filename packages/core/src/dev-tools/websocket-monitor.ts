import { WebSocketServer } from 'ws';

interface MonitoringMessage {
  type: 'metrics' | 'health' | 'subagent.event';
  payload: any;
  timestamp: number;
}

export class MultithreadingMonitorServer {
  private wss: WebSocketServer;
  private clients: Set<any> = new Set();
  private metricsHistory: MonitoringMessage[] = [];
  private readonly maxHistorySize = 1000;

  constructor(private port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
      this.clients.add(ws);

      // Send recent metrics history to new client
      this.metricsHistory.slice(-50).forEach(message => {
        ws.send(JSON.stringify(message));
      });

      ws.on('message', (data) => {
        try {
          const message: MonitoringMessage = JSON.parse(data.toString());
          this.handleClientMessage(message, ws);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        payload: {
          message: 'Connected to @swcstudio/multithreading monitor',
          serverTime: Date.now(),
          clients: this.clients.size,
        },
        timestamp: Date.now(),
      }));
    });

    console.log(`Multithreading monitor server started on port ${this.port}`);
  }

  private handleClientMessage(message: MonitoringMessage, sender: any) {
    // Store metrics for history
    if (message.type === 'metrics' || message.type === 'health') {
      this.metricsHistory.push(message);
      
      // Trim history if too large
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize + 100);
      }
    }

    // Broadcast to all other clients
    this.broadcast(message, sender);

    // Process specific message types
    switch (message.type) {
      case 'subagent.event':
        this.handleSubagentEvent(message);
        break;
      case 'health':
        this.handleHealthUpdate(message);
        break;
      case 'metrics':
        this.handleMetricsUpdate(message);
        break;
    }
  }

  private handleSubagentEvent(message: MonitoringMessage) {
    const { event, data } = message.payload;
    
    switch (event) {
      case 'agent.registered':
        console.log(`Subagent registered: ${data.id} with capabilities:`, data.capabilities);
        break;
      case 'agent.unregistered':
        console.log(`Subagent unregistered: ${data.id}`);
        break;
      case 'task.request':
        console.log(`Task requested for agent ${data.agentId}:`, data.task.operation);
        break;
      case 'task.completed':
        console.log(`Task completed by agent ${data.agentId}:`, data.result?.status || 'unknown');
        break;
    }
  }

  private handleHealthUpdate(message: MonitoringMessage) {
    const health = message.payload;
    
    if (health.overall === 'critical') {
      console.warn('🚨 CRITICAL: System health is critical!', {
        memoryPressure: health.memoryPressure,
        queueBacklog: health.queueBacklog,
        errorRate: health.errorRate,
      });
      
      // Could trigger alerts here
      this.broadcast({
        type: 'alert',
        payload: {
          level: 'critical',
          message: 'System health is critical',
          details: health,
        },
        timestamp: Date.now(),
      });
    } else if (health.overall === 'degraded') {
      console.warn('⚠️ WARNING: System health is degraded', {
        queueBacklog: health.queueBacklog,
        errorRate: health.errorRate,
      });
    }
  }

  private handleMetricsUpdate(message: MonitoringMessage) {
    const metrics = message.payload;
    
    // Log interesting metrics changes
    if (metrics.threadUtilization > 90) {
      console.warn(`High thread utilization: ${metrics.threadUtilization.toFixed(1)}%`);
    }
    
    if (metrics.memoryUsage > 1000) {
      console.warn(`High memory usage: ${metrics.memoryUsage}MB`);
    }
    
    if (metrics.queuedTasks > 50) {
      console.warn(`High queue backlog: ${metrics.queuedTasks} tasks`);
    }
  }

  private broadcast(message: MonitoringMessage, exclude?: any) {
    const data = JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client !== exclude && client.readyState === client.OPEN) {
        try {
          client.send(data);
        } catch (error) {
          console.error('Failed to send message to client:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  public getMetricsHistory(): MonitoringMessage[] {
    return [...this.metricsHistory];
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public close() {
    this.clients.forEach(client => {
      try {
        client.close();
      } catch (error) {
        console.error('Error closing client connection:', error);
      }
    });
    
    this.wss.close(() => {
      console.log('Multithreading monitor server closed');
    });
  }
}

// Example usage
if (require.main === module) {
  const monitor = new MultithreadingMonitorServer(8080);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down monitor server...');
    monitor.close();
    process.exit(0);
  });
}