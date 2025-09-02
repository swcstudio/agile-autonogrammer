/**
 * Katalyst Runtime Utilities
 * 
 * This package provides utilities for running Katalyst applications
 * in various runtime environments including WebAssembly.
 */

export * from "./wasm-compat.ts";
export * from "./vercel-adapter.ts";
export * from "./edge-runtime.ts";

// Re-export commonly used types and utilities
export type {
  WasmEnvironment,
} from "./wasm-compat.ts";

export type {
  VercelEdgeConfig,
  EdgeFunctionHandler,
} from "./vercel-adapter.ts";

export type {
  EdgeRuntimeConfig,
  RuntimeModule,
} from "./edge-runtime.ts";