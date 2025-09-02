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

  getRspackPlugins() {
    return this.getAllPlugins().map((plugin) => ({
      name: plugin.name,
      options: plugin.options || {},
    }));
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
    getRspackPlugins(): Array<{ name: string; options: Record<string, unknown> }>;
  }
}
    `;
  }
}
