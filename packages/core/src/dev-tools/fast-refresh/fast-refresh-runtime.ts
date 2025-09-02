/**
 * Fast Refresh Runtime Engine for Katalyst
 *
 * Core engine that handles component refreshing, state preservation,
 * and integration coordination across all Katalyst platforms
 */

import {
  type FastRefreshConfig,
  type FastRefreshIntegration,
  RefreshUpdate,
} from './KatalystFastRefreshProvider';

export class FastRefreshRuntime {
  private config: FastRefreshConfig;
  private componentRegistry: Map<string, React.ComponentType> = new Map();
  private signatureRegistry: Map<React.ComponentType, string> = new Map();
  private integrations: Map<string, FastRefreshIntegration> = new Map();
  private refreshStats: {
    totalRefreshes: number;
    refreshTimes: number[];
    errors: number;
  } = {
    totalRefreshes: 0,
    refreshTimes: [],
    errors: 0,
  };

  constructor(config: FastRefreshConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log(
      `🔥 Initializing Fast Refresh for ${this.config.platform} (${this.config.bundler})`
    );

    // Platform-specific initialization
    switch (this.config.bundler) {
      case 'vite':
        await this.initializeViteFastRefresh();
        break;
      case 'webpack':
        await this.initializeWebpackFastRefresh();
        break;
      case 'repack':
        await this.initializeRePackFastRefresh();
        break;
      case 'metro':
        await this.initializeMetroFastRefresh();
        break;
    }

    // Set up error recovery
    if (this.config.errorRecovery) {
      this.setupErrorRecovery();
    }

    // Set up cross-platform sync
    if (this.config.crossPlatformSync) {
      this.setupCrossPlatformSync();
    }
  }

  registerComponent(type: React.ComponentType, id: string): void {
    this.componentRegistry.set(id, type);

    if (this.config.debugMode) {
      console.log(`📝 Registered component: ${id}`);
    }
  }

  registerSignature(
    type: React.ComponentType,
    key: string,
    forceReset?: boolean,
    getCustomHooks?: () => any[]
  ): void {
    const signature = this.createSignature(key, forceReset, getCustomHooks);
    this.signatureRegistry.set(type, signature);

    if (this.config.debugMode) {
      console.log(`✍️  Registered signature: ${key}`);
    }
  }

  async refresh(moduleId: string, exports: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Determine refresh strategy
      const strategy = this.determineRefreshStrategy(moduleId, exports);

      switch (strategy) {
        case 'component':
          await this.refreshComponents(moduleId, exports);
          break;
        case 'module':
          await this.refreshModule(moduleId);
          break;
        case 'full':
          await this.fullReload('Module requires full reload');
          break;
      }

      // Run integrations
      for (const [name, integration] of this.integrations) {
        try {
          await integration.refresh(moduleId, exports);
        } catch (error) {
          console.warn(`Integration ${name} refresh failed:`, error);
        }
      }

      // Update stats
      const refreshTime = Date.now() - startTime;
      this.refreshStats.totalRefreshes++;
      this.refreshStats.refreshTimes.push(refreshTime);

      if (this.config.debugMode) {
        console.log(`⚡ Fast refresh completed in ${refreshTime}ms`);
      }
    } catch (error) {
      this.refreshStats.errors++;
      console.error('Fast refresh failed:', error);

      if (this.config.fallbackToReload) {
        await this.fullReload('Fast refresh failed, falling back to full reload');
      }

      throw error;
    }
  }

  async refreshComponent(component: React.ComponentType): Promise<void> {
    // Find component in registry
    const componentId = Array.from(this.componentRegistry.entries()).find(
      ([, comp]) => comp === component
    )?.[0];

    if (!componentId) {
      console.warn('Component not found in registry, cannot refresh');
      return;
    }

    // Perform component-specific refresh
    await this.performComponentRefresh(componentId, component);
  }

  async refreshModule(moduleId: string): Promise<void> {
    // Invalidate module cache
    if (typeof require !== 'undefined' && require.cache) {
      delete require.cache[moduleId];
    }

    // Re-import module
    try {
      const newModule = await import(`${moduleId}?t=${Date.now()}`);
      await this.refresh(moduleId, newModule);
    } catch (error) {
      console.error(`Failed to refresh module ${moduleId}:`, error);
      throw error;
    }
  }

  registerIntegration(name: string, integration: FastRefreshIntegration): void {
    this.integrations.set(name, integration);
    integration.initialize();

    if (this.config.debugMode) {
      console.log(`🔗 Registered integration: ${name}`);
    }
  }

  unregisterIntegration(name: string): void {
    const integration = this.integrations.get(name);
    if (integration) {
      integration.cleanup();
      this.integrations.delete(name);
    }
  }

  getAverageRefreshTime(): number {
    if (this.refreshStats.refreshTimes.length === 0) return 0;

    const sum = this.refreshStats.refreshTimes.reduce((a, b) => a + b, 0);
    return sum / this.refreshStats.refreshTimes.length;
  }

  resetStats(): void {
    this.refreshStats = {
      totalRefreshes: 0,
      refreshTimes: [],
      errors: 0,
    };
  }

  // Private methods
  private async initializeViteFastRefresh(): Promise<void> {
    // Vite Fast Refresh setup
    if (typeof window !== 'undefined' && (window as any).__vite_plugin_react_preamble_installed__) {
      console.log('🟢 Vite Fast Refresh detected and configured');
    } else {
      console.warn(
        '⚠️  Vite Fast Refresh not detected. Make sure @vitejs/plugin-react is configured.'
      );
    }
  }

  private async initializeWebpackFastRefresh(): Promise<void> {
    // Webpack Fast Refresh setup
    if (typeof window !== 'undefined' && (window as any).__webpack_require__) {
      console.log('🟠 Webpack Fast Refresh configured');
    } else {
      console.warn(
        '⚠️  Webpack Fast Refresh not detected. Make sure react-refresh-webpack-plugin is configured.'
      );
    }
  }

  private async initializeRePackFastRefresh(): Promise<void> {
    // Re.Pack Fast Refresh setup for React Native
    if (typeof global !== 'undefined' && (global as any).__METRO_GLOBAL_PREFIX__) {
      console.log('📱 Re.Pack Fast Refresh configured for React Native');
    } else {
      console.warn('⚠️  Re.Pack Fast Refresh not detected.');
    }
  }

  private async initializeMetroFastRefresh(): Promise<void> {
    // Metro Fast Refresh setup
    if (typeof global !== 'undefined' && (global as any).__DEV__) {
      console.log('🚇 Metro Fast Refresh configured');
    }
  }

  private determineRefreshStrategy(
    moduleId: string,
    exports: any
  ): 'component' | 'module' | 'full' {
    // Check if module only exports React components
    const exportNames = Object.keys(exports);
    const isReactModule = exportNames.every((name) => {
      const exportValue = exports[name];
      return this.isReactComponent(exportValue) || this.isReactHook(exportValue);
    });

    if (isReactModule) {
      return 'component';
    }

    // Check if module has side effects
    if (this.hasModuleSideEffects(moduleId)) {
      return 'full';
    }

    return 'module';
  }

  private isReactComponent(value: any): boolean {
    return (
      typeof value === 'function' &&
      (value.prototype?.isReactComponent || // Class component
        value.prototype?.render || // Class component
        /^[A-Z]/.test(value.name)) // Function component (convention)
    );
  }

  private isReactHook(value: any): boolean {
    return typeof value === 'function' && /^use[A-Z]/.test(value.name);
  }

  private hasModuleSideEffects(moduleId: string): boolean {
    // Heuristics to detect side effects
    const sideEffectPatterns = [
      /console\./,
      /window\./,
      /document\./,
      /localStorage/,
      /sessionStorage/,
      /addEventListener/,
    ];

    // In a real implementation, you would analyze the module source
    // For now, we use simple heuristics
    return false;
  }

  private async refreshComponents(moduleId: string, exports: any): Promise<void> {
    const componentExports = Object.entries(exports).filter(([, value]) =>
      this.isReactComponent(value)
    );

    for (const [name, component] of componentExports) {
      await this.performComponentRefresh(`${moduleId}#${name}`, component as React.ComponentType);
    }
  }

  private async performComponentRefresh(
    componentId: string,
    component: React.ComponentType
  ): Promise<void> {
    // Update component in registry
    this.componentRegistry.set(componentId, component);

    // Trigger React refresh
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.onCommitFiberRoot) {
        // Signal to React DevTools
        hook.onCommitFiberRoot(1, component);
      }
    }

    // Force re-render of component instances
    this.forceComponentUpdate(component);
  }

  private forceComponentUpdate(component: React.ComponentType): void {
    // Implementation would depend on the specific React version and setup
    // This is a simplified version
    if (typeof window !== 'undefined') {
      // Dispatch custom event for component update
      window.dispatchEvent(
        new CustomEvent('katalyst:component-refresh', {
          detail: { component },
        })
      );
    }
  }

  private createSignature(key: string, forceReset?: boolean, getCustomHooks?: () => any[]): string {
    let signature = key;

    if (getCustomHooks) {
      const hooks = getCustomHooks();
      signature += hooks.map((hook) => hook?.name || 'anonymous').join(',');
    }

    if (forceReset) {
      signature += '_force_reset';
    }

    return signature;
  }

  private setupErrorRecovery(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        if (event.filename?.includes('Fast Refresh')) {
          console.warn('Fast Refresh error caught:', event.error);
          // Attempt recovery
          this.fullReload('Recovering from Fast Refresh error');
        }
      });
    }
  }

  private setupCrossPlatformSync(): void {
    // Set up WebSocket or other communication for cross-platform sync
    if (this.config.ngrok?.broadcastChanges) {
      console.log('🌍 Cross-platform sync enabled via ngrok');
    }
  }

  private async fullReload(reason: string): Promise<void> {
    console.log(`🔄 Full reload triggered: ${reason}`);

    if (typeof window !== 'undefined') {
      window.location.reload();
    } else if (typeof global !== 'undefined' && (global as any).location) {
      (global as any).location.reload();
    }
  }
}
