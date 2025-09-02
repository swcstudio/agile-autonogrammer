import { integrationConfigs } from '../config/integrations.config.ts';
import {
  type ZephyrConfig,
  ZephyrIntegration,
  type ZephyrMicroFrontend,
} from '../integrations/zephyr.ts';

export interface ZephyrRSpackPluginOptions {
  projectId?: string;
  environment?: 'development' | 'staging' | 'production';
  autoRegister?: boolean;
  enablePreviewDeployments?: boolean;
  microFrontend?: {
    name: string;
    exposes: Record<string, string>;
    remotes?: Record<string, string>;
  };
  deploy?: {
    onBuildComplete?: boolean;
    branch?: string;
    skipHealthCheck?: boolean;
  };
}

export class ZephyrRSpackPlugin {
  private options: ZephyrRSpackPluginOptions;
  private integration: ZephyrIntegration | null = null;
  private buildStartTime = 0;

  constructor(options: ZephyrRSpackPluginOptions = {}) {
    this.options = {
      projectId: integrationConfigs.zephyr?.projectId,
      environment: integrationConfigs.zephyr?.environment || 'development',
      autoRegister: true,
      enablePreviewDeployments: true,
      ...options,
    };
  }

  apply(compiler: any) {
    const pluginName = 'ZephyrRSpackPlugin';

    // Initialize Zephyr on compiler start
    compiler.hooks.environment.tap(pluginName, () => {
      this.initializeZephyr();
    });

    // Track build start time
    compiler.hooks.compile.tap(pluginName, () => {
      this.buildStartTime = Date.now();
      console.log('[Zephyr] Build started...');
    });

    // Register micro-frontend after successful compilation
    compiler.hooks.afterCompile.tapAsync(pluginName, async (compilation: any, callback: any) => {
      if (this.options.microFrontend && this.options.autoRegister) {
        try {
          await this.registerMicroFrontend(compilation);
        } catch (error) {
          console.error('[Zephyr] Failed to register micro-frontend:', error);
        }
      }
      callback();
    });

    // Deploy on build complete if configured
    compiler.hooks.done.tapAsync(pluginName, async (stats: any, callback: any) => {
      const buildTime = Date.now() - this.buildStartTime;
      console.log(`[Zephyr] Build completed in ${buildTime}ms`);

      if (stats.hasErrors()) {
        console.error('[Zephyr] Build failed, skipping deployment');
        callback();
        return;
      }

      if (this.options.deploy?.onBuildComplete && this.integration) {
        try {
          await this.deployToZephyr(stats, buildTime);
        } catch (error) {
          console.error('[Zephyr] Deployment failed:', error);
        }
      }

      callback();
    });

    // Add Zephyr metadata to assets
    compiler.hooks.emit.tapAsync(pluginName, (compilation: any, callback: any) => {
      const manifest = this.generateManifest(compilation);

      compilation.assets['zephyr-manifest.json'] = {
        source: () => JSON.stringify(manifest, null, 2),
        size: () => JSON.stringify(manifest, null, 2).length,
      };

      callback();
    });

    // Handle watch mode for preview deployments
    if (compiler.options.watch && this.options.enablePreviewDeployments) {
      compiler.hooks.watchRun.tapAsync(pluginName, async (_compiler: any, callback: any) => {
        console.log('[Zephyr] Watch mode detected, preview deployments enabled');
        callback();
      });
    }
  }

  private async initializeZephyr() {
    if (this.integration) return;

    const config: ZephyrConfig = {
      projectId: this.options.projectId!,
      environment: this.options.environment,
      ...integrationConfigs.zephyr,
    };

    this.integration = new ZephyrIntegration(config);
    await this.integration.initialize();

    console.log('[Zephyr] Integration initialized');
  }

  private async registerMicroFrontend(compilation: any) {
    if (!this.integration || !this.options.microFrontend) return;

    const { name, exposes, remotes } = this.options.microFrontend;
    const assets = Object.keys(compilation.assets);

    const mf: ZephyrMicroFrontend = {
      name,
      version: this.getVersion(compilation),
      url: this.getMicroFrontendUrl(name),
      dependencies: this.extractDependencies(compilation),
      exposes,
      remotes: remotes || {},
      metadata: {
        framework: 'react',
        buildTool: 'rspack',
        size: this.calculateBundleSize(compilation),
        lastModified: Date.now(),
      },
    };

    await this.integration.registerMicroFrontend(mf);
    console.log(`[Zephyr] Registered micro-frontend: ${name}`);
  }

  private async deployToZephyr(stats: any, buildTime: number) {
    if (!this.integration) return;

    const statsJson = stats.toJson({
      assets: true,
      chunks: true,
      modules: false,
    });

    const deployment = await this.integration.deploy({
      environment: this.options.environment,
      branch: this.options.deploy?.branch || this.getCurrentBranch(),
      version: this.getVersion(statsJson),
    });

    // Update deployment metrics
    deployment.metrics = {
      buildTime,
      deployTime: Date.now() - this.buildStartTime - buildTime,
      size: this.calculateTotalSize(statsJson),
      performance: await this.measurePerformance(deployment.url),
    };

    console.log(`[Zephyr] Deployed successfully: ${deployment.url}`);

    // Output deployment info for CI/CD
    this.outputDeploymentInfo(deployment);
  }

  private generateManifest(compilation: any) {
    const assets = Object.keys(compilation.assets);
    const chunks = compilation.chunks || [];

    return {
      projectId: this.options.projectId,
      environment: this.options.environment,
      timestamp: Date.now(),
      assets: assets.map((name) => ({
        name,
        size: compilation.assets[name].size(),
      })),
      chunks: Array.from(chunks).map((chunk: any) => ({
        id: chunk.id,
        names: Array.from(chunk.name || []),
        files: Array.from(chunk.files || []),
      })),
      microFrontend: this.options.microFrontend,
      metadata: {
        rspackVersion: compilation.compiler.webpack?.version || 'unknown',
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  private getVersion(compilation: any): string {
    // Try to get version from package.json
    try {
      const packageJson = require(process.cwd() + '/package.json');
      return packageJson.version || `${Date.now()}`;
    } catch {
      return `${Date.now()}`;
    }
  }

  private getMicroFrontendUrl(name: string): string {
    const baseUrl =
      this.options.environment === 'production'
        ? `https://${name}.zephyr.app`
        : `https://${name}-${this.options.environment}.zephyr.app`;

    return `${baseUrl}/remoteEntry.js`;
  }

  private extractDependencies(compilation: any): string[] {
    const externalModules = new Set<string>();

    compilation.modules?.forEach((module: any) => {
      if (module.external) {
        externalModules.add(module.request);
      }
    });

    return Array.from(externalModules);
  }

  private calculateBundleSize(compilation: any): number {
    return Object.values(compilation.assets).reduce((total: number, asset: any) => {
      return total + (asset.size?.() || 0);
    }, 0);
  }

  private calculateTotalSize(stats: any): number {
    return (
      stats.assets?.reduce((total: number, asset: any) => {
        return total + asset.size;
      }, 0) || 0
    );
  }

  private getCurrentBranch(): string {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    } catch {
      return 'main';
    }
  }

  private async measurePerformance(url: string): Promise<any> {
    // Simulate performance measurement
    // In production, this would use Lighthouse or similar
    return {
      fcp: Math.random() * 1500 + 500,
      lcp: Math.random() * 2000 + 1000,
      tti: Math.random() * 3000 + 1500,
    };
  }

  private outputDeploymentInfo(deployment: any) {
    console.log('\n=== Zephyr Deployment Info ===');
    console.log(`URL: ${deployment.url}`);
    console.log(`Version: ${deployment.version}`);
    console.log(`Environment: ${deployment.environment}`);
    console.log(`Status: ${deployment.status}`);

    if (deployment.metrics) {
      console.log(`Build Time: ${deployment.metrics.buildTime}ms`);
      console.log(`Deploy Time: ${deployment.metrics.deployTime}ms`);
      console.log(`Bundle Size: ${(deployment.metrics.size / 1024 / 1024).toFixed(2)}MB`);
    }

    console.log('==============================\n');

    // Set environment variables for CI/CD
    if (process.env.CI) {
      process.env.ZEPHYR_DEPLOYMENT_URL = deployment.url;
      process.env.ZEPHYR_DEPLOYMENT_ID = deployment.id;
    }
  }
}

// Factory function for easy usage
export function createZephyrRSpackPlugin(options?: ZephyrRSpackPluginOptions) {
  return new ZephyrRSpackPlugin(options);
}

// Preset configurations
export const ZephyrRSpackPresets = {
  microFrontend: (name: string, exposes: Record<string, string>) =>
    new ZephyrRSpackPlugin({
      microFrontend: { name, exposes },
      autoRegister: true,
    }),

  preview: () =>
    new ZephyrRSpackPlugin({
      environment: 'development',
      enablePreviewDeployments: true,
      deploy: {
        onBuildComplete: true,
        skipHealthCheck: true,
      },
    }),

  production: () =>
    new ZephyrRSpackPlugin({
      environment: 'production',
      deploy: {
        onBuildComplete: false, // Manual deployment in production
      },
    }),
};
