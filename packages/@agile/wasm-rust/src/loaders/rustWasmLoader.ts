/**
 * Rust WASM Module Loader
 * Handles loading, initialization, and management of Rust WASM modules
 */

import type { RustCompute, WasmCapabilities } from '../types/rust-compute';
import { getSIMDSupport } from '../simd/detector';

export interface LoaderOptions {
  wasmPath?: string;
  memory?: {
    initial: number;
    maximum: number;
    shared?: boolean;
  };
  importObject?: WebAssembly.Imports;
  enableSIMD?: boolean;
  enableThreads?: boolean;
  cacheModule?: boolean;
}

export interface LoaderResult {
  module: WebAssembly.Module;
  instance: WebAssembly.Instance;
  compute: RustCompute;
  memory: WebAssembly.Memory;
  capabilities: WasmCapabilities;
}

// Module cache for faster subsequent loads
const moduleCache = new Map<string, WebAssembly.Module>();

/**
 * Load and initialize the Rust WASM module
 */
export async function loadRustWasmModule(
  options: LoaderOptions = {}
): Promise<LoaderResult> {
  const {
    wasmPath = '/wasm/rust-compute.wasm',
    memory = { initial: 256, maximum: 4096 },
    importObject = {},
    enableSIMD = true,
    enableThreads = false,
    cacheModule = true,
  } = options;
  
  try {
    // Check SIMD support if required
    if (enableSIMD) {
      const simdSupport = await getSIMDSupport();
      if (!simdSupport.available) {
        console.warn('SIMD requested but not available, falling back to scalar operations');
      }
    }
    
    // Load or retrieve cached module
    const module = await loadModule(wasmPath, cacheModule);
    
    // Create memory instance
    const wasmMemory = new WebAssembly.Memory({
      initial: memory.initial,
      maximum: memory.maximum,
      shared: memory.shared && enableThreads,
    });
    
    // Create import object with our memory and utilities
    const imports = createImportObject(wasmMemory, importObject);
    
    // Instantiate the module
    const instance = await WebAssembly.instantiate(module, imports);
    
    // Validate and wrap exports
    const compute = wrapExports(instance.exports);
    
    // Initialize the WASM module
    await compute.initialize();
    
    // Get capabilities
    const capabilities = compute.getCapabilities();
    
    return {
      module,
      instance,
      compute,
      memory: wasmMemory,
      capabilities,
    };
  } catch (error) {
    throw new Error(`Failed to load Rust WASM module: ${error}`);
  }
}

/**
 * Load WASM module from path or cache
 */
async function loadModule(
  wasmPath: string,
  useCache: boolean
): Promise<WebAssembly.Module> {
  // Check cache first
  if (useCache && moduleCache.has(wasmPath)) {
    return moduleCache.get(wasmPath)!;
  }
  
  // Fetch and compile the module
  const response = await fetch(wasmPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM module: ${response.statusText}`);
  }
  
  const wasmBuffer = await response.arrayBuffer();
  
  // Use streaming compilation if available
  let module: WebAssembly.Module;
  if (WebAssembly.compileStreaming) {
    module = await WebAssembly.compileStreaming(response);
  } else {
    module = await WebAssembly.compile(wasmBuffer);
  }
  
  // Cache the compiled module
  if (useCache) {
    moduleCache.set(wasmPath, module);
  }
  
  return module;
}

/**
 * Create import object for WASM module
 */
function createImportObject(
  memory: WebAssembly.Memory,
  userImports: WebAssembly.Imports
): WebAssembly.Imports {
  return {
    env: {
      memory,
      
      // Logging utilities
      log_message: (ptr: number, len: number) => {
        const buffer = new Uint8Array(memory.buffer, ptr, len);
        const message = new TextDecoder().decode(buffer);
        console.log('[WASM]:', message);
      },
      
      log_error: (ptr: number, len: number) => {
        const buffer = new Uint8Array(memory.buffer, ptr, len);
        const message = new TextDecoder().decode(buffer);
        console.error('[WASM Error]:', message);
      },
      
      // Performance utilities
      performance_now: () => performance.now(),
      
      // Math utilities (fallbacks for missing WASM intrinsics)
      Math_sin: Math.sin,
      Math_cos: Math.cos,
      Math_tan: Math.tan,
      Math_exp: Math.exp,
      Math_log: Math.log,
      Math_pow: Math.pow,
      Math_sqrt: Math.sqrt,
      
      // Abort handler
      abort: (msg: number, file: number, line: number, column: number) => {
        const getMessage = (ptr: number) => {
          if (ptr === 0) return 'null';
          const buffer = new Uint8Array(memory.buffer);
          let end = ptr;
          while (buffer[end] !== 0) end++;
          return new TextDecoder().decode(buffer.slice(ptr, end));
        };
        
        const msgStr = getMessage(msg);
        const fileStr = getMessage(file);
        throw new Error(`WASM abort: ${msgStr} at ${fileStr}:${line}:${column}`);
      },
      
      // Memory management callbacks
      notify_allocation: (size: number) => {
        // Track memory allocations if needed
      },
      
      notify_deallocation: (size: number) => {
        // Track memory deallocations if needed
      },
      
      // User-provided imports
      ...(userImports.env || {}),
    },
    
    // WASI imports (if needed)
    wasi_snapshot_preview1: {
      proc_exit: (code: number) => {
        throw new Error(`WASM process exit with code: ${code}`);
      },
      ...(userImports.wasi_snapshot_preview1 || {}),
    },
    
    // Additional user imports
    ...Object.keys(userImports)
      .filter(key => key !== 'env' && key !== 'wasi_snapshot_preview1')
      .reduce((acc, key) => {
        acc[key] = userImports[key];
        return acc;
      }, {} as WebAssembly.Imports),
  };
}

/**
 * Wrap WASM exports in TypeScript interface
 */
function wrapExports(exports: WebAssembly.Exports): RustCompute {
  // Validate required exports
  const requiredExports = [
    'initialize',
    'matrix_multiply',
    'fft',
    'k_means_clustering',
    'allocate_buffer',
    'deallocate_buffer',
    'get_capabilities',
    'get_stats',
  ];
  
  for (const name of requiredExports) {
    if (!(name in exports)) {
      throw new Error(`Missing required export: ${name}`);
    }
  }
  
  // Type assertion after validation
  const wasmExports = exports as any;
  
  return {
    // Matrix operations
    matrixMultiply: (a, b, options) => {
      const result = wasmExports.matrix_multiply(
        a,
        b,
        options.dimensions.rows,
        options.dimensions.cols,
        options.useSimd ?? true,
        options.transpose?.a ?? false,
        options.transpose?.b ?? false
      );
      return result;
    },
    
    matrixTranspose: (matrix, dimensions) => {
      return wasmExports.matrix_transpose(
        matrix,
        dimensions.rows,
        dimensions.cols
      );
    },
    
    matrixInverse: (matrix, dimensions) => {
      return wasmExports.matrix_inverse(
        matrix,
        dimensions.rows,
        dimensions.cols
      );
    },
    
    matrixDeterminant: (matrix, dimensions) => {
      return wasmExports.matrix_determinant(
        matrix,
        dimensions.rows,
        dimensions.cols
      );
    },
    
    // Signal processing
    fft: (real, imag, options) => {
      wasmExports.fft(
        real,
        imag,
        options?.inverse ?? false,
        options?.normalize ?? true
      );
      return { real, imag };
    },
    
    ifft: (real, imag, options) => {
      wasmExports.ifft(real, imag, options?.normalize ?? true);
      return { real, imag };
    },
    
    convolution: (signal, kernel) => {
      return wasmExports.convolution(signal, kernel);
    },
    
    correlation: (signal1, signal2) => {
      return wasmExports.correlation(signal1, signal2);
    },
    
    // Machine learning
    kMeansClustering: (data, config) => {
      const result = wasmExports.k_means_clustering(
        data,
        config.k,
        config.dimensions,
        config.maxIterations ?? 100,
        config.tolerance ?? 0.0001,
        config.seed ?? Date.now()
      );
      
      return {
        clusters: result.clusters,
        centroids: result.centroids,
        iterations: result.iterations,
        inertia: result.inertia,
        converged: result.converged,
      };
    },
    
    pca: (data, components, dimensions) => {
      return wasmExports.pca(data, components, dimensions.rows, dimensions.cols);
    },
    
    // Vector operations
    vectorAdd: (a, b) => wasmExports.vector_add(a, b),
    vectorSubtract: (a, b) => wasmExports.vector_subtract(a, b),
    vectorMultiply: (a, b) => wasmExports.vector_multiply(a, b),
    vectorDivide: (a, b) => wasmExports.vector_divide(a, b),
    vectorDot: (a, b) => wasmExports.vector_dot(a, b),
    vectorNorm: (vector, p) => wasmExports.vector_norm(vector, p ?? 2),
    vectorNormalize: (vector) => wasmExports.vector_normalize(vector),
    
    // Statistical operations
    mean: (data) => wasmExports.mean(data),
    variance: (data) => wasmExports.variance(data),
    standardDeviation: (data) => wasmExports.standard_deviation(data),
    covariance: (x, y) => wasmExports.covariance(x, y),
    correlation: (x, y) => wasmExports.correlation(x, y),
    
    // Memory management
    allocateBuffer: (size) => wasmExports.allocate_buffer(size),
    deallocateBuffer: (ptr, size) => wasmExports.deallocate_buffer(ptr, size),
    copyToWasm: (data, ptr) => wasmExports.copy_to_wasm(data, ptr),
    copyFromWasm: (ptr, size) => wasmExports.copy_from_wasm(ptr, size),
    
    // Performance and diagnostics
    runBenchmark: () => wasmExports.run_benchmark(),
    getCapabilities: () => wasmExports.get_capabilities(),
    getStats: () => wasmExports.get_stats(),
    resetStats: () => wasmExports.reset_stats(),
    
    // Lifecycle
    initialize: async () => {
      if (wasmExports.initialize) {
        await wasmExports.initialize();
      }
    },
    
    dispose: () => {
      if (wasmExports.dispose) {
        wasmExports.dispose();
      }
    },
  };
}

/**
 * Preload WASM module for faster first use
 */
export async function preloadRustWasm(wasmPath = '/wasm/rust-compute.wasm'): Promise<void> {
  try {
    await loadModule(wasmPath, true);
  } catch (error) {
    console.warn('Failed to preload Rust WASM module:', error);
  }
}

/**
 * Clear module cache
 */
export function clearModuleCache(): void {
  moduleCache.clear();
}

/**
 * Get cache status
 */
export function getCacheStatus(): {
  size: number;
  modules: string[];
} {
  return {
    size: moduleCache.size,
    modules: Array.from(moduleCache.keys()),
  };
}