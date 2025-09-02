/**
 * Development Workflow Automation for Ngrok + Katalyst
 *
 * Automates development workflows including tunnel creation,
 * team sharing, mobile testing, and federation management
 */

import { FederationManager } from '../federation-manager';
import { KATALYST_PORTS, getKatalystPortConfig } from '../index';
import { NgrokApi } from '../ngrok-api';
import { TrafficPolicy } from '../traffic-policy';

export class NgrokDevAutomation {
  private api: NgrokApi;
  private federationManager: FederationManager;
  private activeTunnels: Map<string, any> = new Map();
  private config: DevAutomationConfig;

  constructor(config: DevAutomationConfig) {
    this.config = config;
    this.api = new NgrokApi(config.authToken, config.region);
    this.federationManager = new FederationManager();
  }

  async initialize(): Promise<void> {
    await this.api.initialize();
    console.log('🚀 Ngrok Dev Automation initialized');

    if (this.config.autoStart) {
      await this.startKatalystStack();
    }
  }

  // Main automation workflows
  async startKatalystStack(): Promise<KatalystStackInfo> {
    console.log('🔄 Starting Katalyst development stack...');

    const services = getKatalystPortConfig();
    const results: KatalystStackInfo = {
      services: {},
      qrCodes: {},
      federationConfig: {},
      teamShareUrl: '',
    };

    // Create tunnels for all services
    for (const service of services) {
      try {
        const tunnel = await this.createServiceTunnel(service);
        results.services[service.name] = {
          port: service.port,
          url: tunnel.publicUrl,
          status: 'running',
        };

        this.activeTunnels.set(service.name, tunnel);
        console.log(`✅ ${service.description}: ${tunnel.publicUrl}`);
      } catch (error) {
        console.warn(`⚠️  Could not start ${service.name}:`, error);
        results.services[service.name] = {
          port: service.port,
          url: '',
          status: 'failed',
          error: (error as Error).message,
        };
      }
    }

    // Generate QR codes for mobile services
    if (this.config.generateQRCodes) {
      results.qrCodes = await this.generateMobileQRCodes();
    }

    // Update federation configuration
    if (this.config.autoUpdateFederation) {
      results.federationConfig = await this.updateFederationConfig();
    }

    // Create team share page
    if (this.config.createTeamSharePage) {
      results.teamShareUrl = await this.createTeamSharePage(results);
    }

    // Send team notifications
    if (this.config.notifyTeam) {
      await this.sendTeamNotifications(results);
    }

    return results;
  }

  async stopKatalystStack(): Promise<void> {
    console.log('🛑 Stopping Katalyst development stack...');

    for (const [serviceName, tunnel] of this.activeTunnels) {
      try {
        await this.api.destroyTunnel(tunnel.id);
        console.log(`🗑️  Stopped ${serviceName}`);
      } catch (error) {
        console.warn(`Failed to stop ${serviceName}:`, error);
      }
    }

    this.activeTunnels.clear();
    console.log('✅ Katalyst stack stopped');
  }

  async restartService(serviceName: string): Promise<string> {
    const service = getKatalystPortConfig().find((s) => s.name === serviceName);
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    // Stop existing tunnel
    const existingTunnel = this.activeTunnels.get(serviceName);
    if (existingTunnel) {
      await this.api.destroyTunnel(existingTunnel.id);
    }

    // Create new tunnel
    const newTunnel = await this.createServiceTunnel(service);
    this.activeTunnels.set(serviceName, newTunnel);

    // Update federation if needed
    if (this.config.autoUpdateFederation) {
      await this.updateFederationConfig();
    }

    console.log(`🔄 Restarted ${serviceName}: ${newTunnel.publicUrl}`);
    return newTunnel.publicUrl;
  }

  // Service-specific tunnel creation
  private async createServiceTunnel(service: any): Promise<any> {
    const trafficPolicy = this.createServiceTrafficPolicy(service.name);

    const tunnel = await this.api.createTunnel({
      port: service.port,
      name: service.name,
      subdomain: `${this.config.subdomainPrefix || 'katalyst'}-${service.name}`,
      metadata: JSON.stringify({
        katalyst: true,
        service: service.name,
        description: service.description,
        environment: 'development',
        createdAt: new Date().toISOString(),
      }),
    });

    // Apply traffic policy
    if (trafficPolicy) {
      await this.api.updateTunnelPolicy(tunnel.id, trafficPolicy.compile());
    }

    return tunnel;
  }

  private createServiceTrafficPolicy(serviceName: string): TrafficPolicy | null {
    const policy = new TrafficPolicy();

    // Base policies for all services
    policy
      .addCORS({
        allowOrigin: '*',
        allowMethods: 'GET,POST,PUT,DELETE,OPTIONS',
        allowHeaders: 'Content-Type,Authorization,X-Katalyst-*',
      })
      .addHeaders({
        'X-Katalyst-Service': serviceName,
        'X-Katalyst-Environment': 'development',
        'X-Powered-By': 'Katalyst + Ngrok',
      });

    // Service-specific policies
    switch (serviceName) {
      case 'api':
        policy.addRateLimit(1000, '100r/s');
        break;

      case 'mobile':
        policy.addHeaders({
          'X-Mobile-App': 'true',
          'X-Deep-Link-Enabled': 'true',
        });
        break;

      case 'shared':
        policy.addHeaders({
          'X-Module-Federation': 'true',
          'X-Component-Library': 'true',
        });
        break;

      case 'stylex':
        policy.addHeaders({
          'X-StyleX-Themes': 'true',
          'Cache-Control': 'no-cache',
        });
        break;
    }

    return policy;
  }

  // Mobile testing utilities
  private async generateMobileQRCodes(): Promise<Record<string, string>> {
    const qrCodes: Record<string, string> = {};

    for (const [serviceName, tunnel] of this.activeTunnels) {
      if (serviceName === 'mobile' || serviceName === 'api') {
        try {
          const qrUrl = await this.generateQRCode(tunnel.publicUrl);
          qrCodes[serviceName] = qrUrl;
        } catch (error) {
          console.warn(`Failed to generate QR code for ${serviceName}:`, error);
        }
      }
    }

    return qrCodes;
  }

  private async generateQRCode(url: string): Promise<string> {
    const qrApi = 'https://api.qrserver.com/v1/create-qr-code/';
    const params = new URLSearchParams({
      size: '200x200',
      data: url,
      format: 'png',
      margin: '10',
    });

    return `${qrApi}?${params.toString()}`;
  }

  // Federation management
  private async updateFederationConfig(): Promise<any> {
    // Add all active tunnels as federation remotes
    for (const [serviceName, tunnel] of this.activeTunnels) {
      if (serviceName !== 'api') {
        // API is not a federated module
        await this.federationManager.addRemote(serviceName, tunnel.publicUrl, {
          type: this.getServiceFederationType(serviceName),
          metadata: {
            service: serviceName,
            url: tunnel.publicUrl,
          },
        });
      }
    }

    // Setup integrations
    await this.federationManager.setupTanStackIntegration();
    await this.federationManager.setupRePackIntegration();
    await this.federationManager.setupStyleXIntegration();

    return this.federationManager.exportConfig();
  }

  private getServiceFederationType(
    serviceName: string
  ): 'module' | 'tanstack' | 'repack' | 'stylex' {
    switch (serviceName) {
      case 'mobile':
        return 'repack';
      case 'stylex':
        return 'stylex';
      case 'shared':
        return 'tanstack';
      default:
        return 'module';
    }
  }

  // Team collaboration
  private async createTeamSharePage(stackInfo: KatalystStackInfo): Promise<string> {
    const sharePageHtml = this.generateSharePageHTML(stackInfo);

    // Create a temporary tunnel for the share page
    const sharePageTunnel = await this.api.createTunnel({
      port: 8080, // Assuming we serve the share page on port 8080
      name: 'team-share',
      subdomain: `${this.config.subdomainPrefix || 'katalyst'}-share`,
    });

    // In a real implementation, you would serve the HTML content
    console.log('📄 Team share page created:', sharePageTunnel.publicUrl);
    return sharePageTunnel.publicUrl;
  }

  private generateSharePageHTML(stackInfo: KatalystStackInfo): string {
    const services = Object.entries(stackInfo.services);
    const qrCodes = Object.entries(stackInfo.qrCodes);

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Katalyst Development Stack</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8fafc;
        }
        .header { text-align: center; margin-bottom: 40px; }
        .services { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .service { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .service h3 { margin: 0 0 10px 0; color: #1e293b; }
        .service .url { 
            font-family: monospace; 
            background: #f1f5f9; 
            padding: 8px; 
            border-radius: 4px; 
            word-break: break-all;
            margin: 10px 0;
        }
        .service .copy-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .status { 
            display: inline-block; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            font-weight: 500;
        }
        .status.running { background: #dcfce7; color: #166534; }
        .status.failed { background: #fee2e2; color: #991b1b; }
        .qr-codes { margin-top: 40px; text-align: center; }
        .qr-code { display: inline-block; margin: 10px; text-align: center; }
        .qr-code img { border: 1px solid #e5e7eb; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Katalyst Development Stack</h1>
        <p>Generated at ${new Date().toLocaleString()}</p>
    </div>

    <div class="services">
        ${services
          .map(
            ([name, info]) => `
            <div class="service">
                <h3>${name.charAt(0).toUpperCase() + name.slice(1)}</h3>
                <span class="status ${info.status}">${info.status}</span>
                ${
                  info.url
                    ? `
                    <div class="url">${info.url}</div>
                    <button class="copy-btn" onclick="copyToClipboard('${info.url}')">Copy URL</button>
                `
                    : `
                    <div style="color: #ef4444; margin: 10px 0;">${info.error || 'Failed to start'}</div>
                `
                }
                <div style="font-size: 12px; color: #6b7280; margin-top: 10px;">
                    Port: ${info.port}
                </div>
            </div>
        `
          )
          .join('')}
    </div>

    ${
      qrCodes.length > 0
        ? `
        <div class="qr-codes">
            <h2>📱 Mobile Testing</h2>
            <p>Scan these QR codes to test on mobile devices</p>
            ${qrCodes
              .map(
                ([name, url]) => `
                <div class="qr-code">
                    <h4>${name.charAt(0).toUpperCase() + name.slice(1)}</h4>
                    <img src="${url}" alt="${name} QR Code" width="150" height="150">
                </div>
            `
              )
              .join('')}
        </div>
    `
        : ''
    }

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                // Show feedback
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = '#22c55e';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#3b82f6';
                }, 2000);
            });
        }
    </script>
</body>
</html>
    `;
  }

  private async sendTeamNotifications(stackInfo: KatalystStackInfo): Promise<void> {
    const runningServices = Object.entries(stackInfo.services)
      .filter(([_, info]) => info.status === 'running')
      .map(([name, info]) => `${name}: ${info.url}`)
      .join('\n');

    const message = `
🚀 Katalyst Development Stack Started

Running Services:
${runningServices}

${stackInfo.teamShareUrl ? `Team Share Page: ${stackInfo.teamShareUrl}` : ''}

Generated at ${new Date().toLocaleString()}
    `;

    // In a real implementation, integrate with:
    // - Slack webhooks
    // - Microsoft Teams
    // - Discord
    // - Email notifications
    console.log('📢 Team notification:', message);
  }

  // Utility methods
  async getStackStatus(): Promise<StackStatus> {
    const status: StackStatus = {
      totalServices: 0,
      runningServices: 0,
      failedServices: 0,
      services: {},
    };

    const services = getKatalystPortConfig();
    status.totalServices = services.length;

    for (const service of services) {
      const tunnel = this.activeTunnels.get(service.name);
      if (tunnel) {
        try {
          // Check tunnel health
          const response = await fetch(tunnel.publicUrl, { method: 'HEAD' });
          status.services[service.name] = {
            status: response.ok ? 'running' : 'unhealthy',
            url: tunnel.publicUrl,
            port: service.port,
          };

          if (response.ok) {
            status.runningServices++;
          } else {
            status.failedServices++;
          }
        } catch (error) {
          status.services[service.name] = {
            status: 'failed',
            url: tunnel.publicUrl,
            port: service.port,
            error: (error as Error).message,
          };
          status.failedServices++;
        }
      } else {
        status.services[service.name] = {
          status: 'stopped',
          url: '',
          port: service.port,
        };
        status.failedServices++;
      }
    }

    return status;
  }

  async exportConfig(): Promise<DevAutomationExport> {
    return {
      config: this.config,
      activeTunnels: Array.from(this.activeTunnels.entries()).map(([name, tunnel]) => ({
        name,
        url: tunnel.publicUrl,
        port: tunnel.config?.addr || 0,
      })),
      federationConfig: this.federationManager.exportConfig(),
      generatedAt: new Date().toISOString(),
    };
  }
}

// Type definitions
export interface DevAutomationConfig {
  authToken: string;
  region?: string;
  subdomainPrefix?: string;
  autoStart?: boolean;
  generateQRCodes?: boolean;
  autoUpdateFederation?: boolean;
  createTeamSharePage?: boolean;
  notifyTeam?: boolean;
}

export interface KatalystStackInfo {
  services: Record<
    string,
    {
      port: number;
      url: string;
      status: 'running' | 'failed';
      error?: string;
    }
  >;
  qrCodes: Record<string, string>;
  federationConfig: any;
  teamShareUrl: string;
}

export interface StackStatus {
  totalServices: number;
  runningServices: number;
  failedServices: number;
  services: Record<
    string,
    {
      status: 'running' | 'failed' | 'stopped' | 'unhealthy';
      url: string;
      port: number;
      error?: string;
    }
  >;
}

export interface DevAutomationExport {
  config: DevAutomationConfig;
  activeTunnels: Array<{
    name: string;
    url: string;
    port: number;
  }>;
  federationConfig: any;
  generatedAt: string;
}
