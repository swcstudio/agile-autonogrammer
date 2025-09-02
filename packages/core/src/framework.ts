/**
 * Katalyst Framework - Main Entry Point
 * 
 * A production-ready multi-runtime framework with WebAssembly acceleration,
 * AI integration, and unified development experience.
 */

// Re-export core functionality
export * from './runtime';
export * from './wasm';

// Re-export components and providers
export * from './components';
export * from './providers';
export * from './stores';

// Re-export integrations
export { AI } from '../ai/src/index';
export { PaymentProvider } from '../payments/src/index';
export { KatalystDesignSystem } from '../design-system/src/index';

// Types
export type {
  KatalystConfig,
  KatalystRuntime,
  WasmModule,
  RuntimeProvider,
  IntegrationConfig
} from './types';

// Main framework class
export class Katalyst {
  private static instance: Katalyst | null = null;
  private config: KatalystConfig;
  private runtime: KatalystRuntime | null = null;
  
  constructor(config: KatalystConfig) {
    this.config = {
      wasm: {
        rust: true,
        elixir: false,
        typescript: true,
        ...config.wasm
      },
      ai: {
        provider: 'cloudflare',
        models: ['@cf/meta/llama-3.1-8b-instruct'],
        ...config.ai
      },
      multithreading: {
        enabled: true,
        maxWorkers: navigator?.hardwareConcurrency || 4,
        ...config.multithreading
      },
      performance: {
        monitoring: true,
        optimization: 'balanced',
        ...config.performance
      },
      ...config
    };
  }

  /**
   * Get or create a singleton instance of Katalyst
   */
  static getInstance(config?: KatalystConfig): Katalyst {
    if (!Katalyst.instance) {
      if (!config) {
        throw new Error('Katalyst configuration required for first initialization');
      }
      Katalyst.instance = new Katalyst(config);
    }
    return Katalyst.instance;
  }

  /**
   * Initialize the Katalyst runtime
   */
  async initialize(): Promise<void> {
    if (this.runtime) {
      return; // Already initialized
    }

    const { KatalystRuntime } = await import('./runtime');
    this.runtime = new KatalystRuntime(this.config);
    
    await this.runtime.initialize();
    
    // Initialize WASM modules if enabled
    if (this.config.wasm?.rust || this.config.wasm?.elixir) {
      await this.initializeWasm();
    }

    console.log('🚀 Katalyst Framework initialized successfully');
  }

  /**
   * Initialize WebAssembly modules
   */
  private async initializeWasm(): Promise<void> {
    const { WasmLoader } = await import('./wasm');
    const loader = new WasmLoader();

    // Load modules from the unified WASM runtime
    if (this.config.wasm?.rust) {
      await loader.loadModule('rust-core', '/wasm/katalyst_rust_wasm_bg.wasm', 'rust');
    }

    if (this.config.wasm?.elixir) {
      await loader.loadModule('elixir-runtime', '/wasm/katalyst_elixir_wasm_bg.wasm', 'elixir');
    }

    if (this.config.wasm?.typescript) {
      await loader.loadModule('typescript-runtime', '/wasm/katalyst_typescript_wasm_bg.wasm', 'typescript');
    }

    // Load any custom modules specified in config
    if (this.config.wasm?.customModules) {
      for (const module of this.config.wasm.customModules) {
        await loader.loadModule(module.name, module.url);
      }
    }
  }

  /**
   * Get the runtime instance
   */
  getRuntime(): KatalystRuntime {
    if (!this.runtime) {
      throw new Error('Katalyst not initialized. Call initialize() first.');
    }
    return this.runtime;
  }

  /**
   * Get current configuration
   */
  getConfig(): KatalystConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<KatalystConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.runtime?.updateConfig(this.config);
  }

  /**
   * Cleanup and destroy the instance
   */
  destroy(): void {
    this.runtime?.destroy();
    this.runtime = null;
    Katalyst.instance = null;
  }
}

/**
 * Initialize Katalyst with configuration
 */
export async function initializeKatalyst(config: KatalystConfig): Promise<Katalyst> {
  const katalyst = Katalyst.getInstance(config);
  await katalyst.initialize();
  return katalyst;
}

/**
 * Get the current Katalyst instance
 */
export function getKatalyst(): Katalyst {
  const instance = Katalyst.getInstance();
  if (!instance) {
    throw new Error('Katalyst not initialized. Call initializeKatalyst() first.');
  }
  return instance;
}

// Configuration interfaces
export interface KatalystConfig {
  wasm?: {
    rust?: boolean;
    elixir?: boolean;
    typescript?: boolean;
    customModules?: Array<{
      name: string;
      url: string;
    }>;
  };
  ai?: {
    provider: 'cloudflare' | 'openai' | 'anthropic' | 'local';
    models?: string[];
    features?: string[];
    apiKey?: string;
  };
  multithreading?: {
    enabled?: boolean;
    maxWorkers?: number;
    strategy?: 'aggressive' | 'balanced' | 'conservative';
  };
  performance?: {
    monitoring?: boolean;
    optimization?: 'speed' | 'balanced' | 'memory';
    caching?: boolean;
  };
  integrations?: {
    payments?: boolean;
    analytics?: boolean;
    auth?: boolean;
  };
}