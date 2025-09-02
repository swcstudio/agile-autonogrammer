/**
 * Katalyst Multi-Runtime Framework
 * 
 * Main entry point for the WebAssembly-first multi-runtime framework
 * combining Elixir, Rust, and TypeScript for edge computing
 */

// Core exports
export { VercelWasmAdapter, MemoryCache } from './vercel-adapter';
export type { VercelEdgeConfig, EdgeFunctionHandler, WasmModuleCache } from './vercel-adapter';

export { WasmCompatibilityLayer } from './wasm-compat';

export { 
  EdgeRuntimeManager, 
  createEdgeRuntimeConfig, 
  optimizeWasmForEdge 
} from './edge-runtime';
export type { 
  EdgeRuntimeConfig, 
  RuntimeModule, 
  EdgeDeployment 
} from './edge-runtime';

// Utility functions for framework initialization
export class KatalystFramework {
  private static instance: KatalystFramework;
  private initialized: boolean = false;
  private adapters: Map<string, VercelWasmAdapter> = new Map();

  public static getInstance(): KatalystFramework {
    if (!KatalystFramework.instance) {
      KatalystFramework.instance = new KatalystFramework();
    }
    return KatalystFramework.instance;
  }

  public async initialize(config: KatalystConfig): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🚀 Initializing Katalyst Multi-Runtime Framework...');

    // Initialize Vercel adapter for each runtime
    for (const runtime of config.runtimes) {
      const adapter = new VercelWasmAdapter({
        wasmModules: runtime.modules,
        cacheStrategy: runtime.cacheStrategy || 'moderate',
        timeout: runtime.timeout || 10,
        memory: runtime.memory || 128,
        regions: runtime.regions
      });

      await adapter.initialize();
      this.adapters.set(runtime.name, adapter);
      
      console.log(`✅ ${runtime.name} runtime initialized`);
    }

    this.initialized = true;
    console.log('🎉 Katalyst Framework initialized successfully');
  }

  public getAdapter(runtimeName: string): VercelWasmAdapter | undefined {
    return this.adapters.get(runtimeName);
  }

  public async createEdgeHandler(runtimeName: string) {
    const adapter = this.getAdapter(runtimeName);
    if (!adapter) {
      throw new Error(`Runtime '${runtimeName}' not found`);
    }
    
    return adapter.createEdgeHandler(runtimeName);
  }

  public async renderApp(runtimeName: string, props: any = {}) {
    const adapter = this.getAdapter(runtimeName);
    if (!adapter) {
      throw new Error(`Runtime '${runtimeName}' not found`);
    }
    
    return adapter.renderReactApp(runtimeName, props);
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getAvailableRuntimes(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Configuration interfaces
export interface KatalystConfig {
  runtimes: RuntimeConfig[];
  deployment?: DeploymentConfig;
}

export interface RuntimeConfig {
  name: string;
  modules: string[];
  cacheStrategy?: 'aggressive' | 'moderate' | 'minimal';
  timeout?: number;
  memory?: number;
  regions?: string[];
}

export interface DeploymentConfig {
  platform: 'vercel' | 'cloudflare' | 'deno-deploy';
  environment: 'development' | 'staging' | 'production';
  optimization: 'size' | 'speed' | 'balanced';
}

// Helper functions for common use cases
export async function createKatalystApp(config: KatalystConfig) {
  const framework = KatalystFramework.getInstance();
  await framework.initialize(config);
  return framework;
}

export function createMultiRuntimeHandler(runtimeName: string) {
  return async (request: Request, context: any) => {
    const framework = KatalystFramework.getInstance();
    if (!framework.isInitialized()) {
      throw new Error('Katalyst Framework not initialized. Call createKatalystApp() first.');
    }
    
    const handler = await framework.createEdgeHandler(runtimeName);
    return handler(request, context);
  };
}

export function getFrameworkInfo() {
  return {
    name: '@katalyst/multi-runtime-framework',
    version: '1.0.0',
    runtimes: ['elixir', 'rust', 'typescript'],
    platforms: ['vercel', 'cloudflare', 'deno-deploy'],
    features: [
      'WebAssembly compilation',
      'Multi-runtime orchestration',  
      'Edge function deployment',
      'Real-time communication',
      'Phoenix LiveView integration',
      'Rust NIFs support',
      'React SSR/hydration'
    ]
  };
}

// Default export for convenience
export default KatalystFramework;