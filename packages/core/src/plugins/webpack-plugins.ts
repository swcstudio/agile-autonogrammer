export interface RspackPluginConfig {
  name: string;
  options?: Record<string, unknown>;
}

export class RspackPluginManager {
  private plugins: Map<string, RspackPluginConfig> = new Map();

  addPlugin(config: RspackPluginConfig) {
    this.plugins.set(config.name, config);
  }

  getPlugin(name: string): RspackPluginConfig | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): RspackPluginConfig[] {
    return Array.from(this.plugins.values());
  }

  getRspackConfiguration() {
    return {
      plugins: this.getAllPlugins().map((plugin) => ({
        name: plugin.name,
        options: plugin.options || {},
      })),
      optimization: {
        minimize: true,
        minimizer: ['...'],
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      },
      experiments: {
        rspackFuture: {
          newTreeshaking: true,
        },
      },
    };
  }

  getTypeDefinitions() {
    return `
declare module '@rspack/core' {
  export interface RspackPluginConfig {
    name: string;
    options?: Record<string, unknown>;
  }
  
  export class RspackPluginManager {
    addPlugin(config: RspackPluginConfig): void;
    getPlugin(name: string): RspackPluginConfig | undefined;
    getAllPlugins(): RspackPluginConfig[];
    getRspackConfiguration(): {
      plugins: Array<{ name: string; options: Record<string, unknown> }>;
      optimization: Record<string, unknown>;
      experiments: Record<string, unknown>;
    };
  }
}
    `;
  }
}
