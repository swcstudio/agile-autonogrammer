/**
 * Federation Manager for Ngrok + Katalyst
 *
 * Manages module federation configuration with dynamic ngrok URLs
 * Integrates with Re.Pack, TanStack, and other federated systems
 */

export class FederationManager {
  private remotes: Map<string, RemoteConfig> = new Map();
  private configPath = './webpack.federation.js';
  private runtimeConfig: ModuleFederationRuntimeConfig = {};

  constructor(options: FederationManagerOptions = {}) {
    this.configPath = options.configPath || this.configPath;
    this.loadExistingConfig();
  }

  // Remote management
  async addRemote(name: string, url: string, options: RemoteOptions = {}): Promise<void> {
    const remoteConfig: RemoteConfig = {
      name,
      url: this.normalizeUrl(url),
      type: options.type || 'module',
      version: options.version || 'latest',
      metadata: {
        katalyst: true,
        addedAt: new Date().toISOString(),
        ...options.metadata,
      },
    };

    this.remotes.set(name, remoteConfig);
    await this.updateRuntimeConfig();

    console.log(`📦 Added remote: ${name} -> ${url}`);
  }

  async updateRemote(name: string, url: string): Promise<void> {
    const existing = this.remotes.get(name);
    if (existing) {
      existing.url = this.normalizeUrl(url);
      existing.metadata.updatedAt = new Date().toISOString();

      await this.updateRuntimeConfig();
      console.log(`🔄 Updated remote: ${name} -> ${url}`);
    }
  }

  async removeRemote(name: string): Promise<void> {
    if (this.remotes.delete(name)) {
      await this.updateRuntimeConfig();
      console.log(`🗑️  Removed remote: ${name}`);
    }
  }

  getRemote(name: string): RemoteConfig | undefined {
    return this.remotes.get(name);
  }

  getAllRemotes(): RemoteConfig[] {
    return Array.from(this.remotes.values());
  }

  // Configuration management
  async updateRuntimeConfig(): Promise<void> {
    this.runtimeConfig = {
      remotes: this.generateRemotesConfig(),
      shared: this.generateSharedConfig(),
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'katalyst-federation-manager',
        totalRemotes: this.remotes.size,
      },
    };

    // Update webpack configuration if in development
    if (process.env.NODE_ENV === 'development') {
      await this.updateWebpackConfig();
    }

    // Notify runtime systems
    await this.notifyRuntimeSystems();
  }

  private generateRemotesConfig(): Record<string, string> {
    const remotes: Record<string, string> = {};

    for (const [name, config] of this.remotes) {
      remotes[name] = `${name}@${config.url}/remoteEntry.js`;
    }

    return remotes;
  }

  private generateSharedConfig(): Record<string, any> {
    return {
      react: {
        singleton: true,
        requiredVersion: '^18.0.0',
        eager: false,
      },
      'react-dom': {
        singleton: true,
        requiredVersion: '^18.0.0',
        eager: false,
      },
      '@tanstack/react-query': {
        singleton: true,
        requiredVersion: '^5.0.0',
        eager: false,
      },
      '@tanstack/react-router': {
        singleton: true,
        requiredVersion: '^1.0.0',
        eager: false,
      },
      '@tanstack/react-table': {
        singleton: true,
        requiredVersion: '^8.0.0',
        eager: false,
      },
      '@stylexjs/stylex': {
        singleton: true,
        requiredVersion: '^0.6.0',
        eager: false,
      },
    };
  }

  private async updateWebpackConfig(): Promise<void> {
    try {
      // Generate webpack configuration snippet
      const webpackConfig = this.generateWebpackConfig();

      // Write to file or update existing config
      // Note: In a real implementation, this would integrate with
      // the project's webpack configuration system
      console.log('📝 Webpack federation config updated:', webpackConfig);
    } catch (error) {
      console.warn('Failed to update webpack config:', error);
    }
  }

  private generateWebpackConfig(): any {
    const { ModuleFederationPlugin } = require('@module-federation/webpack');

    return {
      plugins: [
        new ModuleFederationPlugin({
          name: 'katalyst_host',
          remotes: this.runtimeConfig.remotes,
          shared: this.runtimeConfig.shared,
          exposes: {
            './components': './src/components',
            './hooks': './src/hooks',
            './utils': './src/utils',
          },
        }),
      ],
    };
  }

  private async notifyRuntimeSystems(): Promise<void> {
    // Notify Re.Pack runtime
    if (typeof window !== 'undefined' && (window as any).__repack_runtime__) {
      (window as any).__repack_runtime__.updateRemotes(this.runtimeConfig.remotes);
    }

    // Notify TanStack systems
    if (typeof window !== 'undefined' && (window as any).__tanstack_federation__) {
      (window as any).__tanstack_federation__.updateConfig(this.runtimeConfig);
    }

    // Custom event for other integrations
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('katalyst:federation-updated', {
          detail: this.runtimeConfig,
        })
      );
    }
  }

  // Katalyst-specific integrations
  async setupTanStackIntegration(): Promise<void> {
    // Add TanStack-specific remotes
    const tanstackRemotes = [
      { name: 'query-components', port: 3001, path: '/tanstack/query' },
      { name: 'table-components', port: 3001, path: '/tanstack/table' },
      { name: 'router-components', port: 3001, path: '/tanstack/router' },
      { name: 'form-components', port: 3001, path: '/tanstack/form' },
    ];

    for (const remote of tanstackRemotes) {
      await this.addRemote(remote.name, `http://localhost:${remote.port}${remote.path}`, {
        type: 'tanstack',
        metadata: { component: 'tanstack', category: remote.name.split('-')[0] },
      });
    }
  }

  async setupRePackIntegration(): Promise<void> {
    // Add Re.Pack mobile remotes
    const repackRemotes = [
      { name: 'mobile-components', port: 3002, path: '/mobile/components' },
      { name: 'native-modules', port: 3002, path: '/mobile/native' },
      { name: 'platform-utils', port: 3002, path: '/mobile/utils' },
    ];

    for (const remote of repackRemotes) {
      await this.addRemote(remote.name, `http://localhost:${remote.port}${remote.path}`, {
        type: 'repack',
        metadata: { platform: 'mobile', category: remote.name.split('-')[0] },
      });
    }
  }

  async setupStyleXIntegration(): Promise<void> {
    // Add StyleX theme remotes
    const stylexRemotes = [
      { name: 'light-theme', port: 3003, path: '/stylex/themes/light' },
      { name: 'dark-theme', port: 3003, path: '/stylex/themes/dark' },
      { name: 'brand-themes', port: 3003, path: '/stylex/themes/brand' },
      { name: 'component-styles', port: 3003, path: '/stylex/components' },
    ];

    for (const remote of stylexRemotes) {
      await this.addRemote(remote.name, `http://localhost:${remote.port}${remote.path}`, {
        type: 'stylex',
        metadata: { category: 'theme', type: remote.name.split('-')[0] },
      });
    }
  }

  // Runtime utilities
  async preloadRemote(name: string): Promise<void> {
    const remote = this.remotes.get(name);
    if (!remote) {
      throw new Error(`Remote ${name} not found`);
    }

    try {
      // Preload the remote entry
      const script = document.createElement('script');
      script.src = `${remote.url}/remoteEntry.js`;
      script.async = true;

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      console.log(`🚀 Preloaded remote: ${name}`);
    } catch (error) {
      console.error(`Failed to preload remote ${name}:`, error);
      throw error;
    }
  }

  async loadRemoteComponent(remoteName: string, componentName: string): Promise<any> {
    const remote = this.remotes.get(remoteName);
    if (!remote) {
      throw new Error(`Remote ${remoteName} not found`);
    }

    try {
      // Dynamic import using webpack's module federation
      const remoteContainer = await import(
        /* webpackIgnore: true */ `${remote.url}/remoteEntry.js`
      );
      const factory = await remoteContainer.get(componentName);
      const component = factory();

      return component;
    } catch (error) {
      console.error(`Failed to load component ${componentName} from ${remoteName}:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const results: HealthCheckResult = {
      total: this.remotes.size,
      healthy: 0,
      unhealthy: 0,
      remotes: {},
    };

    for (const [name, config] of this.remotes) {
      try {
        const response = await fetch(`${config.url}/remoteEntry.js`, {
          method: 'HEAD',
          timeout: 5000,
        } as any);

        if (response.ok) {
          results.healthy++;
          results.remotes[name] = { status: 'healthy', url: config.url };
        } else {
          results.unhealthy++;
          results.remotes[name] = {
            status: 'unhealthy',
            url: config.url,
            error: `HTTP ${response.status}`,
          };
        }
      } catch (error) {
        results.unhealthy++;
        results.remotes[name] = {
          status: 'unhealthy',
          url: config.url,
          error: (error as Error).message,
        };
      }
    }

    return results;
  }

  // Utility methods
  private normalizeUrl(url: string): string {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    // Remove trailing slashes
    return url.replace(/\/+$/, '');
  }

  private loadExistingConfig(): void {
    // In a real implementation, this would load existing federation config
    // from webpack.config.js, package.json, or a dedicated config file
    console.log('📂 Loading existing federation configuration...');
  }

  // Export configuration
  exportConfig(): ModuleFederationRuntimeConfig {
    return { ...this.runtimeConfig };
  }

  // Import configuration
  importConfig(config: ModuleFederationRuntimeConfig): void {
    this.runtimeConfig = { ...config };

    // Rebuild remotes map
    this.remotes.clear();
    if (config.remotes) {
      for (const [name, url] of Object.entries(config.remotes)) {
        const cleanUrl = url.replace('/remoteEntry.js', '');
        this.remotes.set(name, {
          name,
          url: cleanUrl,
          type: 'module',
          version: 'imported',
          metadata: { imported: true },
        });
      }
    }
  }
}

// Type definitions
export interface FederationManagerOptions {
  configPath?: string;
}

export interface RemoteConfig {
  name: string;
  url: string;
  type: 'module' | 'tanstack' | 'repack' | 'stylex';
  version: string;
  metadata: Record<string, any>;
}

export interface RemoteOptions {
  type?: RemoteConfig['type'];
  version?: string;
  metadata?: Record<string, any>;
}

export interface ModuleFederationRuntimeConfig {
  remotes?: Record<string, string>;
  shared?: Record<string, any>;
  metadata?: {
    generatedAt?: string;
    generatedBy?: string;
    totalRemotes?: number;
  };
}

export interface HealthCheckResult {
  total: number;
  healthy: number;
  unhealthy: number;
  remotes: Record<
    string,
    {
      status: 'healthy' | 'unhealthy';
      url: string;
      error?: string;
    }
  >;
}
