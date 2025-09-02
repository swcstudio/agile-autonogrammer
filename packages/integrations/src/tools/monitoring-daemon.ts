import { EventEmitter } from 'events';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, join } from 'path';
import { DependencyAuditor } from './dependency-auditor.js';
import { IntegrationTester } from './integration-tester.js';
import { SecurityScanner } from './security-scanner.js';

export interface MonitoringConfig {
  intervals: {
    dependency: number;    // milliseconds
    security: number;      // milliseconds
    performance: number;   // milliseconds
    integration: number;   // milliseconds
  };
  thresholds: {
    dependency: {
      conflicts: number;
      outdated: number;
    };
    security: {
      critical: number;
      high: number;
      medium: number;
    };
    performance: {
      bundleSize: number;    // bytes
      loadTime: number;      // milliseconds
      regression: number;    // percentage
    };
  };
  notifications: {
    slack?: {
      webhook: string;
      channel: string;
    };
    email?: {
      smtp: string;
      recipients: string[];
    };
    github?: {
      token: string;
      repo: string;
      createIssues: boolean;
    };
    discord?: {
      webhook: string;
    };
  };
  ci: {
    enabled: boolean;
    failOnCritical: boolean;
    failOnHigh: boolean;
    generateBadges: boolean;
    uploadToGitHub: boolean;
  };
  storage: {
    retention: number;     // days
    exportFormats: ('json' | 'csv' | 'html' | 'sarif')[];
    s3?: {
      bucket: string;
      region: string;
    };
  };
}

export interface MonitoringMetrics {
  timestamp: Date;
  uptime: number;
  scansCompleted: {
    dependency: number;
    security: number;
    performance: number;
    integration: number;
  };
  lastResults: {
    dependency: any;
    security: any;
    performance: any;
    integration: any;
  };
  alerts: {
    active: number;
    resolved: number;
    suppressed: number;
  };
  trends: {
    vulnerabilityTrend: 'improving' | 'stable' | 'degrading';
    performanceTrend: 'improving' | 'stable' | 'degrading';
    dependencyTrend: 'improving' | 'stable' | 'degrading';
  };
}

export interface AlertChannel {
  type: 'slack' | 'email' | 'github' | 'discord' | 'webhook';
  enabled: boolean;
  config: any;
}

export interface ScanJob {
  id: string;
  type: 'dependency' | 'security' | 'performance' | 'integration';
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  nextRun?: Date;
}

export class MonitoringDaemon extends EventEmitter {
  private config: MonitoringConfig;
  private dependencyAuditor: DependencyAuditor;
  private securityScanner: SecurityScanner;
  private integrationTester: IntegrationTester;
  
  private isRunning = false;
  private startTime = new Date();
  private jobQueue: ScanJob[] = [];
  private activeJobs = new Map<string, ScanJob>();
  private jobHistory: ScanJob[] = [];
  private metrics: MonitoringMetrics;
  
  private intervals: NodeJS.Timeout[] = [];
  private statusPath: string;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.config = {
      intervals: {
        dependency: 4 * 60 * 60 * 1000,  // 4 hours
        security: 2 * 60 * 60 * 1000,    // 2 hours
        performance: 6 * 60 * 60 * 1000, // 6 hours
        integration: 8 * 60 * 60 * 1000, // 8 hours
      },
      thresholds: {
        dependency: {
          conflicts: 0,
          outdated: 10,
        },
        security: {
          critical: 0,
          high: 2,
          medium: 10,
        },
        performance: {
          bundleSize: 500 * 1024,  // 500KB
          loadTime: 3000,          // 3s
          regression: 10,          // 10%
        },
      },
      notifications: {},
      ci: {
        enabled: true,
        failOnCritical: true,
        failOnHigh: false,
        generateBadges: true,
        uploadToGitHub: false,
      },
      storage: {
        retention: 30,
        exportFormats: ['json', 'html'],
      },
      ...config,
    };

    this.dependencyAuditor = new DependencyAuditor();
    this.securityScanner = new SecurityScanner();
    this.integrationTester = new IntegrationTester();
    this.statusPath = resolve(process.cwd(), '.katalyst', 'monitoring-status.json');
    
    this.metrics = {
      timestamp: new Date(),
      uptime: 0,
      scansCompleted: {
        dependency: 0,
        security: 0,
        performance: 0,
        integration: 0,
      },
      lastResults: {
        dependency: null,
        security: null,
        performance: null,
        integration: null,
      },
      alerts: {
        active: 0,
        resolved: 0,
        suppressed: 0,
      },
      trends: {
        vulnerabilityTrend: 'stable',
        performanceTrend: 'stable',
        dependencyTrend: 'stable',
      },
    };

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('scan:started', (job: ScanJob) => {
      console.log(`🔄 Starting ${job.type} scan (${job.id})`);
    });

    this.on('scan:completed', (job: ScanJob) => {
      console.log(`✅ Completed ${job.type} scan (${job.id}) in ${job.completedAt!.getTime() - job.startedAt!.getTime()}ms`);
    });

    this.on('scan:failed', (job: ScanJob) => {
      console.error(`❌ Failed ${job.type} scan (${job.id}): ${job.error}`);
    });

    this.on('alert:critical', (alert: any) => {
      console.error(`🚨 CRITICAL ALERT: ${alert.message}`);
      this.sendNotification('critical', alert);
    });

    this.on('alert:high', (alert: any) => {
      console.warn(`⚠️ HIGH ALERT: ${alert.message}`);
      this.sendNotification('high', alert);
    });

    this.on('threshold:exceeded', (type: string, current: number, threshold: number) => {
      console.warn(`📊 Threshold exceeded for ${type}: ${current} > ${threshold}`);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Monitoring daemon is already running');
    }

    console.log('🚀 Starting Katalyst monitoring daemon...');
    
    try {
      // Ensure .katalyst directory exists
      await mkdir(resolve(process.cwd(), '.katalyst'), { recursive: true });
      
      // Initialize components
      await this.dependencyAuditor.initialize();
      await this.securityScanner.initialize();
      await this.integrationTester.initialize();
      
      // Load previous state
      await this.loadState();
      
      // Schedule initial scans
      this.scheduleInitialScans();
      
      // Start monitoring intervals
      this.startIntervals();
      
      // Start job processor
      this.startJobProcessor();
      
      this.isRunning = true;
      this.startTime = new Date();
      
      console.log('✅ Monitoring daemon started successfully');
      console.log(`📊 Dashboard: ${this.getStatusUrl()}`);
      
      this.emit('daemon:started');
      
    } catch (error) {
      console.error('❌ Failed to start monitoring daemon:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('⏹️ Stopping monitoring daemon...');
    
    // Clear intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    
    // Wait for active jobs to complete (with timeout)
    const timeout = setTimeout(() => {
      console.warn('⚠️ Forcefully stopping active jobs...');
      this.activeJobs.clear();
    }, 30000);
    
    while (this.activeJobs.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    clearTimeout(timeout);
    
    // Save final state
    await this.saveState();
    
    this.isRunning = false;
    
    console.log('✅ Monitoring daemon stopped');
    this.emit('daemon:stopped');
  }

  private scheduleInitialScans(): void {
    const now = new Date();
    
    // Schedule dependency scan (immediate)
    this.scheduleJob('dependency', now);
    
    // Schedule security scan (in 5 minutes)
    this.scheduleJob('security', new Date(now.getTime() + 5 * 60 * 1000));
    
    // Schedule performance scan (in 10 minutes)
    this.scheduleJob('performance', new Date(now.getTime() + 10 * 60 * 1000));
    
    // Schedule integration scan (in 15 minutes)
    this.scheduleJob('integration', new Date(now.getTime() + 15 * 60 * 1000));
  }

  private startIntervals(): void {
    // Dependency scanning interval
    const depInterval = setInterval(() => {
      this.scheduleJob('dependency', new Date());
    }, this.config.intervals.dependency);
    this.intervals.push(depInterval);

    // Security scanning interval
    const secInterval = setInterval(() => {
      this.scheduleJob('security', new Date());
    }, this.config.intervals.security);
    this.intervals.push(secInterval);

    // Performance scanning interval
    const perfInterval = setInterval(() => {
      this.scheduleJob('performance', new Date());
    }, this.config.intervals.performance);
    this.intervals.push(perfInterval);

    // Integration testing interval
    const intInterval = setInterval(() => {
      this.scheduleJob('integration', new Date());
    }, this.config.intervals.integration);
    this.intervals.push(intInterval);

    // Metrics update interval (every minute)
    const metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.saveState();
    }, 60 * 1000);
    this.intervals.push(metricsInterval);
  }

  private scheduleJob(type: ScanJob['type'], scheduledAt: Date): void {
    const job: ScanJob = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      status: 'pending',
      scheduledAt,
    };

    this.jobQueue.push(job);
    
    // Sort queue by scheduled time
    this.jobQueue.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  private startJobProcessor(): void {
    const processJobs = async () => {
      if (!this.isRunning) return;

      const now = new Date();
      const readyJobs = this.jobQueue.filter(
        job => job.status === 'pending' && job.scheduledAt <= now
      );

      for (const job of readyJobs) {
        if (this.activeJobs.size >= 2) { // Limit concurrent jobs
          break;
        }

        // Remove from queue and add to active
        this.jobQueue = this.jobQueue.filter(j => j.id !== job.id);
        this.activeJobs.set(job.id, job);

        // Start the job
        this.executeJob(job);
      }

      // Schedule next processing cycle
      setTimeout(processJobs, 5000);
    };

    processJobs();
  }

  private async executeJob(job: ScanJob): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();

    this.emit('scan:started', job);

    try {
      let result: any;

      switch (job.type) {
        case 'dependency':
          result = await this.dependencyAuditor.auditIntegrations();
          break;
        case 'security':
          result = await this.securityScanner.scanIntegrations();
          break;
        case 'performance':
          result = await this.runPerformanceTests();
          break;
        case 'integration':
          result = await this.integrationTester.runTestSuite();
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.result = result;
      job.status = 'completed';
      job.completedAt = new Date();

      // Update metrics
      this.metrics.scansCompleted[job.type]++;
      this.metrics.lastResults[job.type] = result;

      // Check thresholds and generate alerts
      await this.checkThresholds(job.type, result);

      // Schedule next run
      job.nextRun = new Date(Date.now() + this.config.intervals[job.type]);

      this.emit('scan:completed', job);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      this.emit('scan:failed', job);
    } finally {
      // Move to history and remove from active
      this.jobHistory.push({ ...job });
      this.activeJobs.delete(job.id);

      // Keep only recent history (last 100 jobs)
      if (this.jobHistory.length > 100) {
        this.jobHistory = this.jobHistory.slice(-100);
      }
    }
  }

  private async runPerformanceTests(): Promise<any> {
    // Simplified performance testing - in production would integrate with actual performance tools
    const bundleStats = await this.analyzeBundleSize();
    const loadTimeStats = await this.measureLoadTimes();
    
    return {
      timestamp: new Date(),
      bundleSize: bundleStats,
      loadTime: loadTimeStats,
      metrics: {
        totalBundleSize: bundleStats.reduce((sum: number, stat: any) => sum + stat.size, 0),
        averageLoadTime: loadTimeStats.reduce((sum: number, stat: any) => sum + stat.time, 0) / loadTimeStats.length,
      },
    };
  }

  private async analyzeBundleSize(): Promise<any[]> {
    // Mock bundle analysis
    return [
      { integration: 'rspack', size: 45000, gzipped: 12000 },
      { integration: 'tanstack', size: 32000, gzipped: 8500 },
      { integration: 'tailwind', size: 28000, gzipped: 7200 },
    ];
  }

  private async measureLoadTimes(): Promise<any[]> {
    // Mock load time measurements
    return [
      { integration: 'rspack', time: 450 },
      { integration: 'tanstack', time: 320 },
      { integration: 'tailwind', time: 280 },
    ];
  }

  private async checkThresholds(type: string, result: any): Promise<void> {
    const alerts: any[] = [];

    switch (type) {
      case 'dependency':
        if (result.summary.conflicts > this.config.thresholds.dependency.conflicts) {
          alerts.push({
            type: 'high',
            message: `Dependency conflicts detected: ${result.summary.conflicts} conflicts`,
            data: result.conflicts,
          });
        }
        break;

      case 'security':
        if (result.summary.critical > this.config.thresholds.security.critical) {
          alerts.push({
            type: 'critical',
            message: `Critical security vulnerabilities detected: ${result.summary.critical}`,
            data: result.vulnerabilities.filter((v: any) => v.severity === 'critical'),
          });
        }
        
        if (result.summary.high > this.config.thresholds.security.high) {
          alerts.push({
            type: 'high',
            message: `High security vulnerabilities detected: ${result.summary.high}`,
            data: result.vulnerabilities.filter((v: any) => v.severity === 'high'),
          });
        }
        break;

      case 'performance':
        if (result.metrics.totalBundleSize > this.config.thresholds.performance.bundleSize) {
          alerts.push({
            type: 'high',
            message: `Bundle size exceeded threshold: ${result.metrics.totalBundleSize} bytes`,
            data: result.bundleSize,
          });
        }
        
        if (result.metrics.averageLoadTime > this.config.thresholds.performance.loadTime) {
          alerts.push({
            type: 'high',
            message: `Load time exceeded threshold: ${result.metrics.averageLoadTime}ms`,
            data: result.loadTime,
          });
        }
        break;
    }

    // Emit alerts
    for (const alert of alerts) {
      this.emit(`alert:${alert.type}`, alert);
    }
  }

  private async sendNotification(level: string, alert: any): Promise<void> {
    try {
      // Slack notification
      if (this.config.notifications.slack) {
        await this.sendSlackNotification(level, alert);
      }

      // GitHub issue creation
      if (this.config.notifications.github?.createIssues) {
        await this.createGitHubIssue(level, alert);
      }

      // Email notification
      if (this.config.notifications.email) {
        await this.sendEmailNotification(level, alert);
      }

      // Discord notification
      if (this.config.notifications.discord) {
        await this.sendDiscordNotification(level, alert);
      }

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  private async sendSlackNotification(level: string, alert: any): Promise<void> {
    const webhook = this.config.notifications.slack?.webhook;
    if (!webhook) return;

    const color = level === 'critical' ? '#d32f2f' : level === 'high' ? '#f57c00' : '#fbc02d';
    const emoji = level === 'critical' ? '🚨' : level === 'high' ? '⚠️' : '📊';

    const payload = {
      channel: this.config.notifications.slack?.channel,
      username: 'Katalyst Security Bot',
      icon_emoji: ':shield:',
      attachments: [{
        color,
        title: `${emoji} ${level.toUpperCase()} Alert`,
        text: alert.message,
        timestamp: Math.floor(Date.now() / 1000),
        fields: [
          {
            title: 'Severity',
            value: level.toUpperCase(),
            short: true,
          },
          {
            title: 'Time',
            value: new Date().toISOString(),
            short: true,
          },
        ],
      }],
    };

    // In production, would use actual HTTP client
    console.log('📱 Would send Slack notification:', JSON.stringify(payload, null, 2));
  }

  private async createGitHubIssue(level: string, alert: any): Promise<void> {
    // In production, would use GitHub API to create issues
    console.log(`🐛 Would create GitHub issue for ${level} alert: ${alert.message}`);
  }

  private async sendEmailNotification(level: string, alert: any): Promise<void> {
    // In production, would use email service
    console.log(`📧 Would send email for ${level} alert: ${alert.message}`);
  }

  private async sendDiscordNotification(level: string, alert: any): Promise<void> {
    // In production, would use Discord webhook
    console.log(`💬 Would send Discord notification for ${level} alert: ${alert.message}`);
  }

  private updateMetrics(): void {
    this.metrics.timestamp = new Date();
    this.metrics.uptime = Date.now() - this.startTime.getTime();

    // Update alert counts
    const activeAlerts = this.jobHistory
      .filter(job => job.result?.alerts)
      .reduce((count, job) => count + job.result.alerts.length, 0);

    this.metrics.alerts.active = activeAlerts;

    // Calculate trends (simplified)
    if (this.jobHistory.length >= 2) {
      const recentJobs = this.jobHistory.slice(-10);
      
      // Example trend calculation for security
      const securityJobs = recentJobs.filter(job => job.type === 'security' && job.result);
      if (securityJobs.length >= 2) {
        const latest = securityJobs[securityJobs.length - 1];
        const previous = securityJobs[securityJobs.length - 2];
        
        const latestVulns = latest.result.summary.totalVulnerabilities;
        const previousVulns = previous.result.summary.totalVulnerabilities;
        
        if (latestVulns < previousVulns) {
          this.metrics.trends.vulnerabilityTrend = 'improving';
        } else if (latestVulns > previousVulns) {
          this.metrics.trends.vulnerabilityTrend = 'degrading';
        } else {
          this.metrics.trends.vulnerabilityTrend = 'stable';
        }
      }
    }
  }

  private async loadState(): Promise<void> {
    try {
      const stateData = await readFile(this.statusPath, 'utf-8');
      const state = JSON.parse(stateData);
      
      this.jobHistory = (state.jobHistory || []).map((job: any) => ({
        ...job,
        scheduledAt: new Date(job.scheduledAt),
        startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
        completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
      }));
      
      this.metrics = {
        ...this.metrics,
        ...state.metrics,
        timestamp: new Date(state.metrics?.timestamp || Date.now()),
      };
      
    } catch {
      // State file doesn't exist or is corrupted, start fresh
    }
  }

  private async saveState(): Promise<void> {
    try {
      const state = {
        jobHistory: this.jobHistory,
        metrics: this.metrics,
        config: this.config,
        savedAt: new Date(),
      };
      
      await writeFile(this.statusPath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.warn('Failed to save monitoring state:', error);
    }
  }

  private getStatusUrl(): string {
    return `file://${this.statusPath}`;
  }

  // Public API methods
  
  async getStatus(): Promise<any> {
    return {
      isRunning: this.isRunning,
      uptime: this.metrics.uptime,
      activeJobs: Array.from(this.activeJobs.values()),
      queuedJobs: this.jobQueue.length,
      metrics: this.metrics,
      config: this.config,
      recentJobs: this.jobHistory.slice(-10),
    };
  }

  async getDashboard(): Promise<any> {
    const status = await this.getStatus();
    const securityDashboard = await this.securityScanner.getSecurityDashboard();
    
    return {
      ...status,
      security: securityDashboard,
      trends: this.metrics.trends,
      recommendations: this.generateRecommendations(),
    };
  }

  private generateRecommendations(): any[] {
    const recommendations: any[] = [];
    
    // Analyze recent jobs for recommendations
    const recentFailures = this.jobHistory
      .filter(job => job.status === 'failed')
      .slice(-5);
    
    if (recentFailures.length > 2) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Multiple scan failures detected. Consider reviewing job configuration.',
      });
    }
    
    return recommendations;
  }

  async runManualScan(type: ScanJob['type']): Promise<any> {
    return new Promise((resolve, reject) => {
      const job: ScanJob = {
        id: `manual-${type}-${Date.now()}`,
        type,
        status: 'pending',
        scheduledAt: new Date(),
      };

      // Listen for job completion
      const onCompleted = (completedJob: ScanJob) => {
        if (completedJob.id === job.id) {
          this.off('scan:completed', onCompleted);
          this.off('scan:failed', onFailed);
          resolve(completedJob.result);
        }
      };

      const onFailed = (failedJob: ScanJob) => {
        if (failedJob.id === job.id) {
          this.off('scan:completed', onCompleted);
          this.off('scan:failed', onFailed);
          reject(new Error(failedJob.error));
        }
      };

      this.on('scan:completed', onCompleted);
      this.on('scan:failed', onFailed);

      // Add to front of queue for immediate execution
      this.jobQueue.unshift(job);
    });
  }

  async exportDashboard(format: 'json' | 'html' = 'html'): Promise<string> {
    const dashboard = await this.getDashboard();
    
    if (format === 'json') {
      return JSON.stringify(dashboard, null, 2);
    }
    
    // HTML dashboard
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Katalyst Monitoring Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .metric { font-size: 2em; font-weight: bold; color: #333; }
        .label { color: #666; font-size: 0.9em; margin-top: 5px; }
        .status-good { color: #4caf50; }
        .status-warning { color: #ff9800; }
        .status-error { color: #f44336; }
        .trend-up { color: #4caf50; }
        .trend-down { color: #f44336; }
        .trend-stable { color: #9e9e9e; }
        .job-list { max-height: 300px; overflow-y: auto; }
        .job-item { padding: 10px; border-left: 4px solid #ddd; margin: 5px 0; background: #fafafa; }
        .job-completed { border-color: #4caf50; }
        .job-failed { border-color: #f44336; }
        .job-running { border-color: #2196f3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Katalyst Monitoring Dashboard</h1>
            <p>Real-time monitoring and security analysis for your integrations</p>
            <p><strong>Status:</strong> ${dashboard.isRunning ? '<span class="status-good">Running</span>' : '<span class="status-error">Stopped</span>'}</p>
            <p><strong>Uptime:</strong> ${Math.floor(dashboard.uptime / (1000 * 60 * 60))} hours ${Math.floor((dashboard.uptime % (1000 * 60 * 60)) / (1000 * 60))} minutes</p>
        </div>

        <div class="status-grid">
            <div class="card">
                <div class="metric status-${dashboard.security?.criticalAlerts > 0 ? 'error' : dashboard.security?.activeAlerts > 0 ? 'warning' : 'good'}">
                    ${dashboard.security?.activeAlerts || 0}
                </div>
                <div class="label">Active Security Alerts</div>
            </div>
            
            <div class="card">
                <div class="metric status-${dashboard.security?.riskScore > 50 ? 'error' : dashboard.security?.riskScore > 20 ? 'warning' : 'good'}">
                    ${dashboard.security?.riskScore || 0}
                </div>
                <div class="label">Security Risk Score</div>
            </div>
            
            <div class="card">
                <div class="metric status-${dashboard.queuedJobs > 5 ? 'warning' : 'good'}">
                    ${dashboard.queuedJobs}
                </div>
                <div class="label">Queued Jobs</div>
            </div>
            
            <div class="card">
                <div class="metric status-good">
                    ${Object.values(dashboard.metrics.scansCompleted).reduce((a: number, b: number) => a + b, 0)}
                </div>
                <div class="label">Total Scans Completed</div>
            </div>
        </div>

        <div class="status-grid">
            <div class="card">
                <h3>Vulnerability Trend</h3>
                <div class="metric trend-${dashboard.trends.vulnerabilityTrend === 'improving' ? 'up' : dashboard.trends.vulnerabilityTrend === 'degrading' ? 'down' : 'stable'}">
                    ${dashboard.trends.vulnerabilityTrend.charAt(0).toUpperCase() + dashboard.trends.vulnerabilityTrend.slice(1)}
                </div>
            </div>
            
            <div class="card">
                <h3>Performance Trend</h3>
                <div class="metric trend-${dashboard.trends.performanceTrend === 'improving' ? 'up' : dashboard.trends.performanceTrend === 'degrading' ? 'down' : 'stable'}">
                    ${dashboard.trends.performanceTrend.charAt(0).toUpperCase() + dashboard.trends.performanceTrend.slice(1)}
                </div>
            </div>
            
            <div class="card">
                <h3>Dependency Trend</h3>
                <div class="metric trend-${dashboard.trends.dependencyTrend === 'improving' ? 'up' : dashboard.trends.dependencyTrend === 'degrading' ? 'down' : 'stable'}">
                    ${dashboard.trends.dependencyTrend.charAt(0).toUpperCase() + dashboard.trends.dependencyTrend.slice(1)}
                </div>
            </div>
        </div>

        <div class="card">
            <h3>Recent Jobs</h3>
            <div class="job-list">
                ${dashboard.recentJobs.map((job: any) => `
                    <div class="job-item job-${job.status}">
                        <strong>${job.type}</strong> - ${job.status}
                        <br><small>${new Date(job.scheduledAt).toLocaleString()}</small>
                        ${job.error ? `<br><span style="color: #f44336;">${job.error}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="card">
            <h3>Recommendations</h3>
            ${dashboard.recommendations.length > 0 ? `
                <ul>
                    ${dashboard.recommendations.map((rec: any) => `
                        <li><strong>${rec.priority.toUpperCase()}:</strong> ${rec.message}</li>
                    `).join('')}
                </ul>
            ` : '<p>No recommendations at this time.</p>'}
        </div>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>`;
  }
}

// CLI usage example
if (require.main === module) {
  async function main() {
    const daemon = new MonitoringDaemon({
      intervals: {
        dependency: 2 * 60 * 60 * 1000,  // 2 hours
        security: 1 * 60 * 60 * 1000,    // 1 hour
        performance: 4 * 60 * 60 * 1000, // 4 hours
        integration: 6 * 60 * 60 * 1000, // 6 hours
      },
      thresholds: {
        security: {
          critical: 0,
          high: 1,
          medium: 5,
        },
      },
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await daemon.stop();
      process.exit(0);
    });

    try {
      await daemon.start();
      
      // Export dashboard
      const dashboard = await daemon.exportDashboard('html');
      await writeFile(resolve(process.cwd(), 'monitoring-dashboard.html'), dashboard);
      console.log('📊 Dashboard exported to monitoring-dashboard.html');
      
      // Run a manual security scan to demonstrate
      console.log('🔍 Running initial security scan...');
      const securityResult = await daemon.runManualScan('security');
      console.log('✅ Security scan completed:', securityResult.summary);
      
    } catch (error) {
      console.error('❌ Failed to start monitoring daemon:', error);
      process.exit(1);
    }
  }

  main();
}