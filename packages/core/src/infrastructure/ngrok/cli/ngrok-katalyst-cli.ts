#!/usr/bin/env node

/**
 * Ngrok Katalyst CLI
 *
 * Command-line interface for managing ngrok tunnels in Katalyst projects
 */

import { FederationManager } from '../federation-manager';
import { TrafficPolicy } from '../traffic-policy';
import { NgrokDevAutomation } from '../workflows/dev-automation';

export class NgrokKatalystCLI {
  private automation: NgrokDevAutomation | null = null;

  async run(args: string[]): Promise<void> {
    const [, , command, ...params] = args;

    try {
      switch (command) {
        case 'start':
          await this.handleStart(params);
          break;
        case 'stop':
          await this.handleStop(params);
          break;
        case 'status':
          await this.handleStatus(params);
          break;
        case 'restart':
          await this.handleRestart(params);
          break;
        case 'share':
          await this.handleShare(params);
          break;
        case 'qr':
          await this.handleQR(params);
          break;
        case 'federation':
          await this.handleFederation(params);
          break;
        case 'policy':
          await this.handlePolicy(params);
          break;
        case 'config':
          await this.handleConfig(params);
          break;
        case 'help':
        case '--help':
        case '-h':
          this.showHelp();
          break;
        default:
          console.error(`Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('CLI Error:', (error as Error).message);
      process.exit(1);
    }
  }

  private async handleStart(params: string[]): Promise<void> {
    const authToken = this.getAuthToken();
    const options = this.parseOptions(params);

    console.log('🚀 Starting Katalyst development stack with ngrok...');

    this.automation = new NgrokDevAutomation({
      authToken,
      region: options.region || 'us',
      subdomainPrefix: options.prefix || 'katalyst',
      autoStart: true,
      generateQRCodes: !options['no-qr'],
      autoUpdateFederation: !options['no-federation'],
      createTeamSharePage: !options['no-share-page'],
      notifyTeam: options.notify || false,
    });

    await this.automation.initialize();
    const stackInfo = await this.automation.startKatalystStack();

    console.log('\n✅ Katalyst stack started successfully!');
    console.log('\nRunning Services:');

    Object.entries(stackInfo.services).forEach(([name, info]) => {
      if (info.status === 'running') {
        console.log(`  ${name.padEnd(12)} ${info.url}`);
      } else {
        console.log(`  ${name.padEnd(12)} ❌ ${info.error || 'Failed'}`);
      }
    });

    if (stackInfo.teamShareUrl) {
      console.log(`\n📄 Team Share Page: ${stackInfo.teamShareUrl}`);
    }

    if (Object.keys(stackInfo.qrCodes).length > 0) {
      console.log('\n📱 Mobile QR Codes:');
      Object.entries(stackInfo.qrCodes).forEach(([name, url]) => {
        console.log(`  ${name}: ${url}`);
      });
    }

    console.log('\nRun "ngrok-katalyst status" to check service health');
    console.log('Run "ngrok-katalyst stop" to stop all services');
  }

  private async handleStop(params: string[]): Promise<void> {
    if (!this.automation) {
      console.log('No active Katalyst stack found');
      return;
    }

    console.log('🛑 Stopping Katalyst development stack...');
    await this.automation.stopKatalystStack();
    console.log('✅ Katalyst stack stopped');
  }

  private async handleStatus(params: string[]): Promise<void> {
    if (!this.automation) {
      console.log('No active Katalyst stack found');
      return;
    }

    const status = await this.automation.getStackStatus();

    console.log('\n📊 Katalyst Stack Status');
    console.log(`Total Services: ${status.totalServices}`);
    console.log(`Running: ${status.runningServices}`);
    console.log(`Failed: ${status.failedServices}`);

    console.log('\nService Details:');
    Object.entries(status.services).forEach(([name, info]) => {
      const statusIcon = this.getStatusIcon(info.status);
      console.log(`  ${statusIcon} ${name.padEnd(12)} ${info.url || `Port ${info.port}`}`);
      if (info.error) {
        console.log(`    Error: ${info.error}`);
      }
    });
  }

  private async handleRestart(params: string[]): Promise<void> {
    const serviceName = params[0];

    if (!serviceName) {
      console.error('Service name required. Usage: ngrok-katalyst restart <service>');
      return;
    }

    if (!this.automation) {
      console.error('No active Katalyst stack found. Run "ngrok-katalyst start" first.');
      return;
    }

    console.log(`🔄 Restarting ${serviceName}...`);
    const newUrl = await this.automation.restartService(serviceName);
    console.log(`✅ ${serviceName} restarted: ${newUrl}`);
  }

  private async handleShare(params: string[]): Promise<void> {
    if (!this.automation) {
      console.error('No active Katalyst stack found. Run "ngrok-katalyst start" first.');
      return;
    }

    const config = await this.automation.exportConfig();

    console.log('\n📤 Shareable URLs:');
    config.activeTunnels.forEach((tunnel) => {
      console.log(`  ${tunnel.name}: ${tunnel.url}`);
    });

    if (params.includes('--copy')) {
      const urls = config.activeTunnels.map((t) => `${t.name}: ${t.url}`).join('\n');

      // Attempt to copy to clipboard (if available)
      try {
        const { exec } = require('child_process');
        if (process.platform === 'darwin') {
          exec(`echo "${urls}" | pbcopy`);
          console.log('\n📋 URLs copied to clipboard');
        } else if (process.platform === 'linux') {
          exec(`echo "${urls}" | xclip -selection clipboard`);
          console.log('\n📋 URLs copied to clipboard');
        }
      } catch (error) {
        console.log('\n📋 Copy to clipboard not available on this system');
      }
    }
  }

  private async handleQR(params: string[]): Promise<void> {
    if (!this.automation) {
      console.error('No active Katalyst stack found. Run "ngrok-katalyst start" first.');
      return;
    }

    const status = await this.automation.getStackStatus();
    const mobileServices = ['mobile', 'api'];

    console.log('\n📱 QR Codes for Mobile Testing:');

    for (const serviceName of mobileServices) {
      const service = status.services[serviceName];
      if (service && service.status === 'running') {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(service.url)}`;
        console.log(`\n${serviceName.toUpperCase()}:`);
        console.log(`URL: ${service.url}`);
        console.log(`QR Code: ${qrUrl}`);

        if (params.includes('--open')) {
          const { exec } = require('child_process');
          exec(`open "${qrUrl}"`); // macOS
        }
      }
    }
  }

  private async handleFederation(params: string[]): Promise<void> {
    const subcommand = params[0];
    const federationManager = new FederationManager();

    switch (subcommand) {
      case 'list':
        const remotes = federationManager.getAllRemotes();
        console.log('\n📦 Federation Remotes:');
        remotes.forEach((remote) => {
          console.log(`  ${remote.name.padEnd(20)} ${remote.url} (${remote.type})`);
        });
        break;

      case 'health':
        console.log('\n🔍 Checking federation health...');
        const health = await federationManager.healthCheck();
        console.log(
          `Total: ${health.total}, Healthy: ${health.healthy}, Unhealthy: ${health.unhealthy}`
        );

        Object.entries(health.remotes).forEach(([name, status]) => {
          const icon = status.status === 'healthy' ? '✅' : '❌';
          console.log(`  ${icon} ${name.padEnd(20)} ${status.url}`);
          if (status.error) {
            console.log(`    Error: ${status.error}`);
          }
        });
        break;

      case 'setup':
        console.log('\n🔧 Setting up Katalyst federation...');
        await federationManager.setupTanStackIntegration();
        await federationManager.setupRePackIntegration();
        await federationManager.setupStyleXIntegration();
        console.log('✅ Federation setup complete');
        break;

      default:
        console.log('Federation commands: list, health, setup');
    }
  }

  private async handlePolicy(params: string[]): Promise<void> {
    const subcommand = params[0];

    switch (subcommand) {
      case 'create':
        const policyType = params[1];
        const policy = this.createPolicyTemplate(policyType);
        console.log(policy.toJSON());
        break;

      case 'templates':
        console.log('\n📝 Available Policy Templates:');
        console.log('  development  - CORS, headers for dev environment');
        console.log('  production   - Rate limiting, security headers');
        console.log('  ab-test      - A/B testing configuration');
        console.log('  auth         - OAuth/basic authentication');
        console.log('  cors         - Cross-origin resource sharing');
        break;

      default:
        console.log('Policy commands: create <template>, templates');
    }
  }

  private async handleConfig(params: string[]): Promise<void> {
    const subcommand = params[0];

    switch (subcommand) {
      case 'show':
        if (this.automation) {
          const config = await this.automation.exportConfig();
          console.log(JSON.stringify(config, null, 2));
        } else {
          console.log('No active configuration found');
        }
        break;

      case 'auth':
        const authToken = process.env.NGROK_AUTH_TOKEN;
        if (authToken) {
          console.log(`Auth token configured (${authToken.substring(0, 10)}...)`);
        } else {
          console.log('No auth token found. Set NGROK_AUTH_TOKEN environment variable.');
        }
        break;

      default:
        console.log('Config commands: show, auth');
    }
  }

  // Utility methods
  private getAuthToken(): string {
    const token = process.env.NGROK_AUTH_TOKEN;
    if (!token) {
      throw new Error('NGROK_AUTH_TOKEN environment variable is required');
    }
    return token;
  }

  private parseOptions(params: string[]): Record<string, any> {
    const options: Record<string, any> = {};

    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      if (param.startsWith('--')) {
        const key = param.substring(2);
        const nextParam = params[i + 1];

        if (nextParam && !nextParam.startsWith('--')) {
          options[key] = nextParam;
          i++; // Skip next param as it's a value
        } else {
          options[key] = true;
        }
      }
    }

    return options;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'running':
        return '✅';
      case 'failed':
        return '❌';
      case 'stopped':
        return '⏹️';
      case 'unhealthy':
        return '⚠️';
      default:
        return '❓';
    }
  }

  private createPolicyTemplate(type: string): TrafficPolicy {
    const policy = new TrafficPolicy();

    switch (type) {
      case 'development':
        return policy.addCORS().addHeaders({
          'X-Environment': 'development',
          'Cache-Control': 'no-cache',
        });

      case 'production':
        return policy.addRateLimit(1000, '100r/m').addHeaders({
          'X-Environment': 'production',
          'Strict-Transport-Security': 'max-age=31536000',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        });

      case 'ab-test':
        return policy.addABTest([
          { name: 'control', url: 'http://localhost:3000', weight: 0.5 },
          { name: 'variant', url: 'http://localhost:3001', weight: 0.5 },
        ]);

      case 'auth':
        return policy.addOAuth('google', {
          client_id: 'your-client-id',
          client_secret: 'your-client-secret',
          allowed_domains: ['your-domain.com'],
        });

      case 'cors':
        return policy.addCORS({
          allowOrigin: '*',
          allowMethods: 'GET,POST,PUT,DELETE,OPTIONS',
          allowHeaders: 'Content-Type,Authorization',
        });

      default:
        throw new Error(`Unknown policy template: ${type}`);
    }
  }

  private showHelp(): void {
    console.log(`
ngrok-katalyst - Ngrok integration for Katalyst development

USAGE:
  ngrok-katalyst <command> [options]

COMMANDS:
  start                    Start Katalyst development stack
    --region <region>      Ngrok region (us, eu, ap, etc.)
    --prefix <prefix>      Subdomain prefix (default: katalyst)
    --no-qr               Disable QR code generation
    --no-federation       Disable federation updates
    --no-share-page       Disable team share page
    --notify              Send team notifications

  stop                     Stop all tunnels
  status                   Show service status
  restart <service>        Restart specific service
  
  share                    Show shareable URLs
    --copy                Copy URLs to clipboard
  
  qr                       Show QR codes for mobile testing
    --open                Open QR codes in browser
  
  federation               Manage module federation
    list                  List federation remotes
    health                Check remote health
    setup                 Setup Katalyst federation
  
  policy                   Manage traffic policies
    create <template>     Create policy from template
    templates             List available templates
  
  config                   Configuration management
    show                  Show current config
    auth                  Show auth status

  help, --help, -h         Show this help

ENVIRONMENT VARIABLES:
  NGROK_AUTH_TOKEN         Required ngrok authentication token

EXAMPLES:
  ngrok-katalyst start --region us --prefix myteam
  ngrok-katalyst status
  ngrok-katalyst restart mobile
  ngrok-katalyst share --copy
  ngrok-katalyst qr --open
  ngrok-katalyst federation health
  ngrok-katalyst policy create development

For more information, visit: https://github.com/your-org/katalyst
    `);
  }
}

// Main execution
if (require.main === module) {
  const cli = new NgrokKatalystCLI();
  cli.run(process.argv).catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}
