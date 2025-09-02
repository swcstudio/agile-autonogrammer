/**
 * @agile/wasm-rust
 * Rust WASM runtime integration for high-performance computing
 * Part of Phase 2: WASM Runtime Integration (PRD-002)
 */

// Main hooks
export {
  useRustCompute,
  useRustMatrix,
  useRustSignalProcessing,
  useRustML,
  type UseRustComputeOptions,
} from './hooks/useRustCompute';

// Loader utilities
export {
  loadRustWasmModule,
  preloadRustWasm,
  clearModuleCache,
  getCacheStatus,
  type LoaderOptions,
  type LoaderResult,
} from './loaders/rustWasmLoader';

// SIMD detection
export {
  detectSIMDSupport,
  getSIMDSupport,
  createSIMDReport,
  clearSIMDCache,
  type SIMDSupport,
  type SIMDFeature,
  type SIMDPerformance,
} from './simd/detector';

// Type definitions
export type {
  RustCompute,
  UseRustComputeReturn,
  MatrixDimensions,
  MatrixMultiplyOptions,
  FFTOptions,
  FFTResult,
  KMeansConfig,
  KMeansResult,
  WasmCapabilities,
  PerformanceStats,
  BenchmarkResults,
} from './types/rust-compute';

// Version and metadata
export const VERSION = '0.0.1';
export const RUNTIME_NAME = 'Rust WASM Compute';
export const SUPPORTED_OPERATIONS = [
  'matrix_operations',
  'signal_processing', 
  'machine_learning',
  'vector_operations',
  'statistical_operations',
] as const;