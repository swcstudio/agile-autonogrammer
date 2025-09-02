/**
 * Vercel Edge Functions Adapter for Katalyst WASM Modules
 * 
 * This adapter enables Katalyst WASM modules to run efficiently
 * on Vercel Edge Functions with optimal performance and caching.
 */

import { WasmCompatibilityLayer } from "./wasm-compat";

export interface VercelEdgeConfig {
  wasmModules: string[];
  cacheStrategy: "aggressive" | "moderate" | "minimal";
  timeout: number;
  memory: number;
  regions?: string[];
}

export interface EdgeFunctionHandler {
  (request: Request, context: any): Promise<Response>;
}

export interface WasmModuleCache {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
}

export class VercelWasmAdapter {
  private config: VercelEdgeConfig;
  private wasmModules: Map<string, any> = new Map();
  private compatLayer: WasmCompatibilityLayer;
  private cache: WasmModuleCache;
  
  constructor(config: VercelEdgeConfig) {
    this.config = config;
    this.compatLayer = new WasmCompatibilityLayer();
    this.cache = new MemoryCache();
  }

  async initialize(): Promise<void> {
    console.log("Initializing Vercel WASM adapter...");
    
    // Initialize compatibility layer
    this.compatLayer.initialize();
    
    // Load WASM modules
    await this.loadWasmModules();
    
    console.log("Vercel WASM adapter initialized");
  }

  createEdgeHandler(moduleName: string): EdgeFunctionHandler {
    return async (request: Request, context: any): Promise<Response> => {
      const startTime = Date.now();
      
      try {
        // Get cached module or load it
        const module = await this.getWasmModule(moduleName);
        
        if (!module) {
          return new Response(
            JSON.stringify({ error: `WASM module '${moduleName}' not found` }),
            { 
              status: 404,
              headers: { "Content-Type": "application/json" }
            }
          );
        }

        // Parse request
        const url = new URL(request.url);
        const method = request.method;
        const pathParams = this.extractPathParams(url.pathname);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        
        let body;
        if (method !== 'GET' && method !== 'HEAD') {
          body = await request.text();
          try {
            body = JSON.parse(body);
          } catch {
            // Keep as string if not JSON
          }
        }

        // Call WASM module function based on route
        const result = await this.executeWasmFunction(module, {
          method,
          path: url.pathname,
          pathParams,
          queryParams,
          body,
          headers: Object.fromEntries(request.headers.entries()),
        });

        // Format response
        const response = this.formatResponse(result);
        
        // Add performance headers
        const duration = Date.now() - startTime;
        response.headers.set("X-Katalyst-Duration", `${duration}ms`);
        response.headers.set("X-Katalyst-Module", moduleName);
        
        return response;
        
      } catch (error) {
        console.error("Edge function error:", error);
        
        return new Response(
          JSON.stringify({ 
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error"
          }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    };
  }

  async renderReactApp(moduleName: string, props: any = {}): Promise<string> {
    const module = await this.getWasmModule(moduleName);
    
    if (!module) {
      throw new Error(`WASM module '${moduleName}' not found`);
    }

    // Generate unique container ID
    const containerId = `katalyst-${moduleName}-${Date.now()}`;
    
    // Render using compatibility layer
    this.compatLayer.render(containerId, props);
    
    // Get rendered HTML (in a real implementation, this would extract from virtual DOM)
    return this.extractRenderedHTML(containerId, props);
  }

  private async loadWasmModules(): Promise<void> {
    for (const moduleName of this.config.wasmModules) {
      try {
        console.log(`Loading WASM module: ${moduleName}`);
        
        // In a real implementation, this would load actual WASM files
        // For now, we'll simulate loading
        const module = await this.loadWasmModule(moduleName);
        this.wasmModules.set(moduleName, module);
        
        console.log(`WASM module '${moduleName}' loaded successfully`);
      } catch (error) {
        console.error(`Failed to load WASM module '${moduleName}':`, error);
        throw error;
      }
    }
  }

  private async loadWasmModule(moduleName: string): Promise<any> {
    // Check cache first
    if (this.cache.has(moduleName)) {
      return this.cache.get(moduleName);
    }

    // Simulate WASM module loading
    // In production, this would load from CDN or local files
    const module = {
      name: moduleName,
      initialized: false,
      exports: {},
      
      async initialize() {
        if (this.initialized) return;
        
        // Simulate initialization
        this.exports = {
          render: (props: any) => ({ html: `<div>WASM ${moduleName}</div>`, props }),
          processRequest: (request: any) => ({ status: 200, data: { message: "OK" } }),
          getVersion: () => "1.0.0",
        };
        
        this.initialized = true;
        console.log(`WASM module ${moduleName} initialized`);
      }
    };

    await module.initialize();
    
    // Cache the module
    this.cache.set(moduleName, module, 3600); // Cache for 1 hour
    
    return module;
  }

  private async getWasmModule(moduleName: string): Promise<any> {
    if (this.wasmModules.has(moduleName)) {
      return this.wasmModules.get(moduleName);
    }

    // Try to load on demand
    try {
      const module = await this.loadWasmModule(moduleName);
      this.wasmModules.set(moduleName, module);
      return module;
    } catch (error) {
      console.error(`Failed to load WASM module on demand: ${moduleName}`, error);
      return null;
    }
  }

  private extractPathParams(pathname: string): Record<string, string> {
    // Simple path parameter extraction
    // In production, you'd use a proper router
    const parts = pathname.split('/').filter(Boolean);
    return { path: parts.join('/') };
  }

  private async executeWasmFunction(module: any, request: any): Promise<any> {
    if (!module.initialized || !module.exports.processRequest) {
      throw new Error("WASM module not properly initialized");
    }

    return module.exports.processRequest(request);
  }

  private formatResponse(result: any): Response {
    if (result && typeof result === 'object' && result.status && result.data) {
      return new Response(
        JSON.stringify(result.data),
        {
          status: result.status,
          headers: {
            "Content-Type": "application/json",
            "X-Katalyst-Powered": "true",
          }
        }
      );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Katalyst-Powered": "true",
        }
      }
    );
  }

  private extractRenderedHTML(containerId: string, props: any): string {
    // In a real implementation, this would extract rendered HTML from virtual DOM
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Katalyst App</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
    .katalyst-app { max-width: 1200px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="${containerId}" class="katalyst-app">
    <div data-katalyst-app="true" data-props="${JSON.stringify(props)}">
      <h1>Katalyst App (WASM Rendered)</h1>
      <p>Props: ${JSON.stringify(props, null, 2)}</p>
      <p>Rendered at: ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;
  }
}

class MemoryCache implements WasmModuleCache {
  private cache: Map<string, { value: any; expires: number }> = new Map();

  get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: string, value: any, ttl: number = 3600): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }
}

export { MemoryCache };