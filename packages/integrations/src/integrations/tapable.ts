/**
 * Tapable Plugin System Integration for Katalyst Core
 *
 * Integrates Tapable's powerful plugin architecture with Katalyst's superior React framework.
 * Provides extensible hook-based system for plugins and build-time integrations.
 *
 * CRITICAL: This integration enhances extensibility without replacing Katalyst patterns:
 * - Frontend: React 19 + TanStack Router + Zustand (Katalyst remains supreme)
 * - Plugin System: Tapable hooks for extensibility and build-time plugins
 * - Architecture: Plugin hooks complement Katalyst's superior component patterns
 */

import {
  AsyncParallelBailHook,
  AsyncParallelHook,
  AsyncSeriesBailHook,
  AsyncSeriesHook,
  AsyncSeriesWaterfallHook,
  HookMap,
  MultiHook,
  SyncBailHook,
  SyncHook,
  SyncLoopHook,
  SyncWaterfallHook,
} from 'tapable';

export interface TapableConfig {
  enabled: boolean;
  development: boolean;
  production: boolean;
  plugins: TapablePluginConfig[];
  hooks: {
    lifecycle: boolean;
    compilation: boolean;
    optimization: boolean;
    assets: boolean;
    runtime: boolean;
    custom: boolean;
  };
  features: {
    interceptors: boolean;
    context: boolean;
    performance: boolean;
    debugging: boolean;
    hotReload: boolean;
  };
  optimization: {
    compileHooks: boolean;
    caching: boolean;
    parallelExecution: boolean;
    errorHandling: boolean;
  };
  katalystIntegration: {
    preserveSuperiority: true;
    enhanceWithPlugins: boolean;
    buildTimePlugins: boolean;
    runtimePlugins: boolean;
  };
}

export interface TapablePluginConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, any>;
  stage?: number;
  hooks?: string[];
}

export interface TapablePlugin {
  name: string;
  version?: string;
  apply: (compiler: TapableCompiler) => void;
  options?: Record<string, any>;
}

export interface TapableCompiler {
  hooks: TapableHookSystem;
  options: TapableConfig;
  context: string;
  plugins: TapablePlugin[];
  apply: (plugin: TapablePlugin) => void;
  run: () => Promise<TapableStats>;
  watch: (watchOptions?: any) => TapableWatcher;
}

export interface TapableCompilation {
  hooks: TapableCompilationHooks;
  compiler: TapableCompiler;
  modules: TapableModule[];
  chunks: TapableChunk[];
  assets: Record<string, TapableAsset>;
  errors: Error[];
  warnings: string[];
  context: Record<string, any>;
}

export interface TapableModule {
  id: string;
  name: string;
  type: 'entry' | 'dependency' | 'asset' | 'component';
  source: string;
  dependencies: string[];
  size: number;
  compiled?: boolean;
}

export interface TapableChunk {
  id: string;
  name: string;
  modules: TapableModule[];
  size: number;
  hash: string;
  rendered?: boolean;
}

export interface TapableAsset {
  name: string;
  source: string;
  size: number;
  emitted: boolean;
  info?: Record<string, any>;
}

export interface TapableStats {
  compilation: TapableCompilation;
  time: number;
  hash: string;
  errors: Error[];
  warnings: string[];
  modules: number;
  chunks: number;
  assets: number;
  performance: TapablePerformanceStats;
}

export interface TapablePerformanceStats {
  hookExecutions: Map<string, number>;
  pluginExecutions: Map<string, number>;
  totalTime: number;
  compilationTime: number;
  pluginTime: number;
}

export interface TapableWatcher {
  watch: (files: string[], options?: any) => void;
  close: () => void;
  suspend: () => void;
  resume: () => void;
}

// Hook system interfaces
export interface TapableHookSystem {
  // Lifecycle hooks
  environment: SyncHook<[]>;
  afterEnvironment: SyncHook<[]>;
  initialize: AsyncSeriesHook<[TapableCompiler]>;
  beforeRun: AsyncSeriesHook<[TapableCompiler]>;
  run: AsyncSeriesHook<[TapableCompiler]>;
  watchRun: AsyncSeriesHook<[TapableCompiler]>;
  beforeCompile: AsyncSeriesHook<[any]>;
  compile: SyncHook<[any]>;
  thisCompilation: SyncHook<[TapableCompilation, any]>;
  compilation: SyncHook<[TapableCompilation, any]>;
  make: AsyncParallelHook<[TapableCompilation]>;
  afterCompile: AsyncSeriesHook<[TapableCompilation]>;
  emit: AsyncSeriesHook<[TapableCompilation]>;
  afterEmit: AsyncSeriesHook<[TapableCompilation]>;
  done: AsyncSeriesHook<[TapableStats]>;
  failed: SyncHook<[Error]>;
  invalid: SyncHook<[string, number]>;
  watchClose: SyncHook<[]>;

  // Katalyst-specific hooks
  katalystInit: AsyncSeriesHook<[any]>;
  katalystCompile: SyncWaterfallHook<[any]>;
  katalystOptimize: AsyncParallelHook<[TapableCompilation]>;
  katalystRuntime: SyncHook<[any]>;

  // Custom extension hooks
  customHook: HookMap<SyncHook<[any]>>;
  pluginHook: MultiHook<[string, any]>;
}

export interface TapableCompilationHooks {
  buildModule: SyncHook<[TapableModule]>;
  rebuildModule: SyncHook<[TapableModule]>;
  failedModule: SyncHook<[TapableModule, Error]>;
  succeedModule: SyncHook<[TapableModule]>;
  addEntry: SyncHook<[any, string]>;
  failedEntry: SyncHook<[any, string, Error]>;
  succeedEntry: SyncHook<[any, string, TapableModule]>;
  dependencyReference: SyncWaterfallHook<[any, any, TapableModule]>;
  finishModules: AsyncSeriesHook<[TapableModule[]]>;
  finishRebuildingModule: AsyncSeriesHook<[TapableModule]>;
  seal: SyncHook<[]>;
  unseal: SyncHook<[]>;
  optimizeDependencies: SyncBailHook<[TapableModule[]]>;
  afterOptimizeDependencies: SyncHook<[TapableModule[]]>;
  optimize: SyncHook<[]>;
  optimizeModules: SyncBailHook<[TapableModule[]]>;
  afterOptimizeModules: SyncHook<[TapableModule[]]>;
  optimizeChunks: SyncBailHook<[TapableChunk[]]>;
  afterOptimizeChunks: SyncHook<[TapableChunk[]]>;
  optimizeTree: AsyncSeriesHook<[TapableChunk[], TapableModule[]]>;
  afterOptimizeTree: SyncHook<[TapableChunk[], TapableModule[]]>;
  optimizeChunkModules: AsyncSeriesBailHook<[TapableChunk[], TapableModule[]]>;
  afterOptimizeChunkModules: SyncHook<[TapableChunk[], TapableModule[]]>;
  shouldRecord: SyncBailHook<[]>;
  reviveModules: SyncHook<[TapableModule[], any[]]>;
  beforeModuleIds: SyncHook<[TapableModule[]]>;
  moduleIds: SyncHook<[TapableModule[]]>;
  optimizeModuleIds: SyncHook<[TapableModule[]]>;
  afterOptimizeModuleIds: SyncHook<[TapableModule[]]>;
  reviveChunks: SyncHook<[TapableChunk[], any[]]>;
  beforeChunkIds: SyncHook<[TapableChunk[]]>;
  chunkIds: SyncHook<[TapableChunk[]]>;
  optimizeChunkIds: SyncHook<[TapableChunk[]]>;
  afterOptimizeChunkIds: SyncHook<[TapableChunk[]]>;
  recordModules: SyncHook<[TapableModule[], any[]]>;
  recordChunks: SyncHook<[TapableChunk[], any[]]>;
  beforeHash: SyncHook<[]>;
  afterHash: SyncHook<[]>;
  recordHash: SyncHook<[any[]]>;
  beforeModuleAssets: SyncHook<[]>;
  shouldGenerateChunkAssets: SyncBailHook<[]>;
  beforeChunkAssets: SyncHook<[]>;
  additionalChunkAssets: SyncHook<[TapableChunk[]]>;
  additionalAssets: AsyncSeriesHook<[]>;
  optimizeChunkAssets: AsyncSeriesHook<[TapableChunk[]]>;
  afterOptimizeChunkAssets: SyncHook<[TapableChunk[]]>;
  optimizeAssets: AsyncSeriesHook<[Record<string, TapableAsset>]>;
  afterOptimizeAssets: SyncHook<[Record<string, TapableAsset>]>;
  needAdditionalSeal: SyncBailHook<[]>;
  afterSeal: AsyncSeriesHook<[]>;
  chunkHash: SyncHook<[TapableChunk, any]>;
  moduleAsset: SyncHook<[TapableModule, string]>;
  chunkAsset: SyncHook<[TapableChunk, string]>;
  assetPath: SyncWaterfallHook<[string, any]>;
  needAdditionalPass: SyncBailHook<[]>;
  childCompiler: SyncHook<[TapableCompiler, string, number]>;

  // Katalyst-specific compilation hooks
  katalystModule: SyncHook<[TapableModule]>;
  katalystComponent: SyncWaterfallHook<[any, TapableModule]>;
  katalystOptimizeComponent: AsyncSeriesHook<[any]>;
}

export class TapableIntegration {
  private config: TapableConfig;
  private compiler: TapableCompiler | null = null;
  private plugins: Map<string, TapablePlugin> = new Map();
  private performance: TapablePerformanceStats;

  constructor(config: TapableConfig) {
    this.config = config;
    this.performance = {
      hookExecutions: new Map(),
      pluginExecutions: new Map(),
      totalTime: 0,
      compilationTime: 0,
      pluginTime: 0,
    };
  }

  async setupTapable() {
    return {
      name: 'tapable-hooks',
      framework: 'katalyst-react',
      setup: () => ({
        // Core Tapable integration
        enabled: this.config.enabled,
        compiler: this.createCompiler(),
        plugins: this.plugins,

        // Katalyst integration
        katalystIntegration: {
          preserveSuperiority: this.config.katalystIntegration.preserveSuperiority,
          enhanceWithPlugins: this.config.katalystIntegration.enhanceWithPlugins,
          buildTimePlugins: this.config.katalystIntegration.buildTimePlugins,
          runtimePlugins: this.config.katalystIntegration.runtimePlugins,
        },

        // Hook system
        hooks: this.createHookSystem(),

        // Plugin management
        pluginSystem: {
          register: this.registerPlugin.bind(this),
          unregister: this.unregisterPlugin.bind(this),
          list: () => Array.from(this.plugins.values()),
          apply: this.applyPlugin.bind(this),
        },

        // Performance monitoring
        performance: {
          enabled: this.config.features.performance,
          stats: this.performance,
          measure: this.measureHookExecution.bind(this),
        },
      }),

      // Dependencies
      dependencies: ['tapable'],

      // Features
      features: {
        lifecycle: this.config.hooks.lifecycle,
        compilation: this.config.hooks.compilation,
        optimization: this.config.hooks.optimization,
        assets: this.config.hooks.assets,
        runtime: this.config.hooks.runtime,
        custom: this.config.hooks.custom,
        interceptors: this.config.features.interceptors,
        context: this.config.features.context,
        performance: this.config.features.performance,
        debugging: this.config.features.debugging,
        hotReload: this.config.features.hotReload,
      },
    };
  }

  private createCompiler(): TapableCompiler {
    const hooks = this.createHookSystem();

    const compiler: TapableCompiler = {
      hooks,
      options: this.config,
      context: process.cwd(),
      plugins: [],

      apply: (plugin: TapablePlugin) => {
        this.applyPlugin(plugin);
      },

      run: async () => {
        return this.runCompilation(compiler);
      },

      watch: (watchOptions?: any) => {
        return this.createWatcher(compiler, watchOptions);
      },
    };

    this.compiler = compiler;
    return compiler;
  }

  private createHookSystem(): TapableHookSystem {
    const hooks: TapableHookSystem = {
      // Lifecycle hooks
      environment: new SyncHook([]),
      afterEnvironment: new SyncHook([]),
      initialize: new AsyncSeriesHook(['compiler']),
      beforeRun: new AsyncSeriesHook(['compiler']),
      run: new AsyncSeriesHook(['compiler']),
      watchRun: new AsyncSeriesHook(['compiler']),
      beforeCompile: new AsyncSeriesHook(['params']),
      compile: new SyncHook(['params']),
      thisCompilation: new SyncHook(['compilation', 'params']),
      compilation: new SyncHook(['compilation', 'params']),
      make: new AsyncParallelHook(['compilation']),
      afterCompile: new AsyncSeriesHook(['compilation']),
      emit: new AsyncSeriesHook(['compilation']),
      afterEmit: new AsyncSeriesHook(['compilation']),
      done: new AsyncSeriesHook(['stats']),
      failed: new SyncHook(['error']),
      invalid: new SyncHook(['filename', 'changeTime']),
      watchClose: new SyncHook([]),

      // Katalyst-specific hooks
      katalystInit: new AsyncSeriesHook(['config']),
      katalystCompile: new SyncWaterfallHook(['source']),
      katalystOptimize: new AsyncParallelHook(['compilation']),
      katalystRuntime: new SyncHook(['runtime']),

      // Custom extension hooks
      customHook: new HookMap(() => new SyncHook(['data'])),
      pluginHook: new MultiHook([
        new SyncHook(['name', 'data']),
        new AsyncSeriesHook(['name', 'data']),
      ]),
    };

    // Setup interceptors if enabled
    if (this.config.features.interceptors) {
      this.setupInterceptors(hooks);
    }

    return hooks;
  }

  private createCompilationHooks(): TapableCompilationHooks {
    return {
      buildModule: new SyncHook(['module']),
      rebuildModule: new SyncHook(['module']),
      failedModule: new SyncHook(['module', 'error']),
      succeedModule: new SyncHook(['module']),
      addEntry: new SyncHook(['entry', 'name']),
      failedEntry: new SyncHook(['entry', 'name', 'error']),
      succeedEntry: new SyncHook(['entry', 'name', 'module']),
      dependencyReference: new SyncWaterfallHook(['depRef', 'dependency', 'module']),
      finishModules: new AsyncSeriesHook(['modules']),
      finishRebuildingModule: new AsyncSeriesHook(['module']),
      seal: new SyncHook([]),
      unseal: new SyncHook([]),
      optimizeDependencies: new SyncBailHook(['modules']),
      afterOptimizeDependencies: new SyncHook(['modules']),
      optimize: new SyncHook([]),
      optimizeModules: new SyncBailHook(['modules']),
      afterOptimizeModules: new SyncHook(['modules']),
      optimizeChunks: new SyncBailHook(['chunks']),
      afterOptimizeChunks: new SyncHook(['chunks']),
      optimizeTree: new AsyncSeriesHook(['chunks', 'modules']),
      afterOptimizeTree: new SyncHook(['chunks', 'modules']),
      optimizeChunkModules: new AsyncSeriesBailHook(['chunks', 'modules']),
      afterOptimizeChunkModules: new SyncHook(['chunks', 'modules']),
      shouldRecord: new SyncBailHook([]),
      reviveModules: new SyncHook(['modules', 'records']),
      beforeModuleIds: new SyncHook(['modules']),
      moduleIds: new SyncHook(['modules']),
      optimizeModuleIds: new SyncHook(['modules']),
      afterOptimizeModuleIds: new SyncHook(['modules']),
      reviveChunks: new SyncHook(['chunks', 'records']),
      beforeChunkIds: new SyncHook(['chunks']),
      chunkIds: new SyncHook(['chunks']),
      optimizeChunkIds: new SyncHook(['chunks']),
      afterOptimizeChunkIds: new SyncHook(['chunks']),
      recordModules: new SyncHook(['modules', 'records']),
      recordChunks: new SyncHook(['chunks', 'records']),
      beforeHash: new SyncHook([]),
      afterHash: new SyncHook([]),
      recordHash: new SyncHook(['records']),
      beforeModuleAssets: new SyncHook([]),
      shouldGenerateChunkAssets: new SyncBailHook([]),
      beforeChunkAssets: new SyncHook([]),
      additionalChunkAssets: new SyncHook(['chunks']),
      additionalAssets: new AsyncSeriesHook([]),
      optimizeChunkAssets: new AsyncSeriesHook(['chunks']),
      afterOptimizeChunkAssets: new SyncHook(['chunks']),
      optimizeAssets: new AsyncSeriesHook(['assets']),
      afterOptimizeAssets: new SyncHook(['assets']),
      needAdditionalSeal: new SyncBailHook([]),
      afterSeal: new AsyncSeriesHook([]),
      chunkHash: new SyncHook(['chunk', 'chunkHash']),
      moduleAsset: new SyncHook(['module', 'filename']),
      chunkAsset: new SyncHook(['chunk', 'filename']),
      assetPath: new SyncWaterfallHook(['path', 'data']),
      needAdditionalPass: new SyncBailHook([]),
      childCompiler: new SyncHook(['childCompiler', 'compilerName', 'compilerIndex']),

      // Katalyst-specific compilation hooks
      katalystModule: new SyncHook(['module']),
      katalystComponent: new SyncWaterfallHook(['component', 'module']),
      katalystOptimizeComponent: new AsyncSeriesHook(['component']),
    };
  }

  private setupInterceptors(hooks: TapableHookSystem) {
    const interceptor = {
      register: (tapInfo: any) => {
        if (this.config.features.debugging) {
          console.log(`Tapable: Registering tap "${tapInfo.name}" on hook "${tapInfo.type}"`);
        }
        return tapInfo;
      },
      call: (...args: any[]) => {
        if (this.config.features.debugging) {
          console.log(`Tapable: Hook called with args:`, args);
        }
      },
      tap: (tapInfo: any) => {
        if (this.config.features.performance) {
          this.measureHookExecution(tapInfo.name, () => {});
        }
      },
    };

    // Apply interceptor to all hooks
    Object.values(hooks).forEach((hook) => {
      if (hook && typeof hook.intercept === 'function') {
        hook.intercept(interceptor);
      }
    });
  }

  private measureHookExecution(hookName: string, fn: () => any) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    const current = this.performance.hookExecutions.get(hookName) || 0;
    this.performance.hookExecutions.set(hookName, current + (end - start));

    return result;
  }

  private registerPlugin(plugin: TapablePlugin) {
    this.plugins.set(plugin.name, plugin);

    if (this.compiler) {
      this.applyPlugin(plugin);
    }
  }

  private unregisterPlugin(pluginName: string) {
    this.plugins.delete(pluginName);
  }

  private applyPlugin(plugin: TapablePlugin) {
    if (!this.compiler) return;

    const start = performance.now();

    try {
      plugin.apply(this.compiler);
      this.compiler.plugins.push(plugin);

      const end = performance.now();
      const current = this.performance.pluginExecutions.get(plugin.name) || 0;
      this.performance.pluginExecutions.set(plugin.name, current + (end - start));
    } catch (error) {
      console.error(`Failed to apply plugin ${plugin.name}:`, error);
    }
  }

  private async runCompilation(compiler: TapableCompiler): Promise<TapableStats> {
    const startTime = performance.now();

    try {
      // Environment setup
      compiler.hooks.environment.call();
      compiler.hooks.afterEnvironment.call();

      // Initialize
      await compiler.hooks.initialize.promise(compiler);

      // Katalyst initialization
      await compiler.hooks.katalystInit.promise(this.config);

      // Before run
      await compiler.hooks.beforeRun.promise(compiler);
      await compiler.hooks.run.promise(compiler);

      // Create compilation
      const compilation = await this.createCompilation(compiler);

      // Build
      await this.runBuild(compilation);

      // Generate stats
      const endTime = performance.now();
      this.performance.totalTime = endTime - startTime;

      const stats: TapableStats = {
        compilation,
        time: endTime - startTime,
        hash: this.generateHash(),
        errors: compilation.errors,
        warnings: compilation.warnings,
        modules: compilation.modules.length,
        chunks: compilation.chunks.length,
        assets: Object.keys(compilation.assets).length,
        performance: this.performance,
      };

      // Complete
      await compiler.hooks.done.promise(stats);

      return stats;
    } catch (error) {
      compiler.hooks.failed.call(error as Error);
      throw error;
    }
  }

  private async createCompilation(compiler: TapableCompiler): Promise<TapableCompilation> {
    const params = {
      normalModuleFactory: {},
      contextModuleFactory: {},
      compilationDependencies: new Set(),
    };

    await compiler.hooks.beforeCompile.promise(params);
    compiler.hooks.compile.call(params);

    const compilation: TapableCompilation = {
      hooks: this.createCompilationHooks(),
      compiler,
      modules: [],
      chunks: [],
      assets: {},
      errors: [],
      warnings: [],
      context: {},
    };

    compiler.hooks.thisCompilation.call(compilation, params);
    compiler.hooks.compilation.call(compilation, params);

    return compilation;
  }

  private async runBuild(compilation: TapableCompilation) {
    // Make (discover and process modules)
    await compilation.compiler.hooks.make.promise(compilation);

    // Finish modules
    await compilation.hooks.finishModules.promise(compilation.modules);

    // Seal compilation
    compilation.hooks.seal.call();

    // Optimize
    compilation.hooks.optimize.call();

    // Optimize modules
    const optimizeModulesResult = compilation.hooks.optimizeModules.call(compilation.modules);
    if (optimizeModulesResult) {
      console.log('Module optimization bailed:', optimizeModulesResult);
    }

    // Optimize chunks
    const optimizeChunksResult = compilation.hooks.optimizeChunks.call(compilation.chunks);
    if (optimizeChunksResult) {
      console.log('Chunk optimization bailed:', optimizeChunksResult);
    }

    // Katalyst optimization
    await compilation.compiler.hooks.katalystOptimize.promise(compilation);

    // Optimize assets
    await compilation.hooks.optimizeAssets.promise(compilation.assets);

    // After seal
    await compilation.hooks.afterSeal.promise();

    // Emit
    await compilation.compiler.hooks.emit.promise(compilation);
    await compilation.compiler.hooks.afterEmit.promise(compilation);

    await compilation.compiler.hooks.afterCompile.promise(compilation);
  }

  private createWatcher(compiler: TapableCompiler, watchOptions?: any): TapableWatcher {
    return {
      watch: (files: string[], options?: any) => {
        console.log('Watching files:', files);
        // Implementation would set up file watching
      },
      close: () => {
        compiler.hooks.watchClose.call();
      },
      suspend: () => {
        console.log('Watcher suspended');
      },
      resume: () => {
        console.log('Watcher resumed');
      },
    };
  }

  private generateHash(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  async initialize() {
    const integrations = await Promise.all([this.setupTapable()]);

    return integrations.filter(Boolean);
  }

  getDefaultConfig(): TapableConfig {
    return {
      enabled: true,
      development: true,
      production: false,
      plugins: [],
      hooks: {
        lifecycle: true,
        compilation: true,
        optimization: true,
        assets: true,
        runtime: true,
        custom: true,
      },
      features: {
        interceptors: true,
        context: true,
        performance: true,
        debugging: false,
        hotReload: true,
      },
      optimization: {
        compileHooks: true,
        caching: true,
        parallelExecution: true,
        errorHandling: true,
      },
      katalystIntegration: {
        preserveSuperiority: true,
        enhanceWithPlugins: true,
        buildTimePlugins: true,
        runtimePlugins: false,
      },
    };
  }

  getUsageExamples() {
    return {
      basicPlugin: `
        import { TapableIntegration } from '@katalyst/tapable';
        
        class MyPlugin {
          apply(compiler) {
            compiler.hooks.beforeRun.tapAsync('MyPlugin', (compiler, callback) => {
              console.log('Plugin executed before compilation');
              callback();
            });
          }
        }
        
        const tapable = new TapableIntegration(config);
        const compiler = tapable.createCompiler();
        compiler.apply(new MyPlugin());
      `,

      katalystPlugin: `
        class KatalystComponentPlugin {
          apply(compiler) {
            compiler.hooks.katalystCompile.tap('ComponentPlugin', (source) => {
              // Transform component source
              return source.replace(/class /g, 'class Katalyst');
            });
            
            compiler.hooks.katalystOptimize.tapAsync('ComponentPlugin', (compilation, callback) => {
              // Optimize Katalyst components
              compilation.modules.forEach(module => {
                if (module.type === 'component') {
                  // Optimize component
                }
              });
              callback();
            });
          }
        }
      `,

      asyncPlugin: `
        class AsyncProcessingPlugin {
          apply(compiler) {
            compiler.hooks.make.tapPromise('AsyncProcessingPlugin', async (compilation) => {
              const modules = await this.discoverModules();
              modules.forEach(module => compilation.modules.push(module));
            });
          }
          
          async discoverModules() {
            // Async module discovery
            return [];
          }
        }
      `,
    };
  }

  getCompiler(): TapableCompiler | null {
    return this.compiler;
  }

  getPerformanceStats(): TapablePerformanceStats {
    return this.performance;
  }
}
