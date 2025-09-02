/**
 * WASM Acceleration Type Definitions
 * Types for AI inference acceleration through WebAssembly
 */

import type { InferenceRequest, InferenceResponse, PerformanceMetrics } from '@agile/ai-core';

// WASM Acceleration Engine Types
export type AccelerationType = 'tensor-ops' | 'inference' | 'embedding' | 'tokenization';

export interface WASMAccelerationEngine {
  readonly id: string;
  readonly name: string;
  readonly supportedOperations: AccelerationType[];
  readonly capabilities: WASMCapabilities;
  
  // Lifecycle
  initialize(config: AccelerationConfig): Promise<void>;
  dispose(): Promise<void>;
  
  // Acceleration
  accelerateInference(request: InferenceRequest): Promise<AcceleratedInferenceResult>;
  accelerateTensorOps(operations: TensorOperation[]): Promise<TensorResult[]>;
  accelerateEmbedding(texts: string[]): Promise<Float32Array[]>;
  
  // Performance
  benchmark(operations: BenchmarkOperation[]): Promise<BenchmarkResult>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  
  // Capability Detection
  supportsOperation(operation: AccelerationType): boolean;
  estimateSpeedup(operation: AccelerationType): number;
}

export interface WASMCapabilities {
  simd: boolean;
  threads: boolean;
  bulk_memory: boolean;
  reference_types: boolean;
  max_memory: number; // bytes
  supported_backends: WASMBackend[];
}

export type WASMBackend = 'tensorflow-wasm' | 'onnx-runtime' | 'rust-native' | 'custom';

export interface AccelerationConfig {
  backend: WASMBackend;
  memory_limit: number; // MB
  thread_count?: number;
  enable_simd: boolean;
  enable_bulk_memory: boolean;
  cache_models: boolean;
  optimization_level: 'fast' | 'balanced' | 'small';
}

// Acceleration Results
export interface AcceleratedInferenceResult {
  response: InferenceResponse;
  acceleration_used: boolean;
  speedup_ratio: number;
  memory_used: number; // bytes
  compute_time: number; // ms
  wasm_overhead: number; // ms
  fallback_reason?: string;
}

export interface TensorOperation {
  id: string;
  type: 'matmul' | 'conv2d' | 'softmax' | 'embedding' | 'attention';
  input_shape: number[];
  output_shape: number[];
  parameters: Record<string, any>;
  data: Float32Array | Int32Array | Uint8Array;
}

export interface TensorResult {
  operation_id: string;
  output_data: Float32Array | Int32Array | Uint8Array;
  compute_time: number; // ms
  memory_peak: number; // bytes
}

// Model Compilation Types
export interface ModelCompiler {
  compile(modelSource: ModelSource, target: CompilationTarget): Promise<CompiledModel>;
  validateModel(model: CompiledModel): Promise<ValidationResult>;
  optimizeModel(model: CompiledModel, optimizations: OptimizationOptions): Promise<CompiledModel>;
}

export interface ModelSource {
  type: 'huggingface' | 'onnx' | 'tensorflow' | 'pytorch';
  url: string;
  model_id: string;
  access_token?: string;
  local_path?: string;
}

export interface CompilationTarget {
  backend: WASMBackend;
  optimization_level: 'O0' | 'O1' | 'O2' | 'O3';
  target_size: 'small' | 'balanced' | 'fast';
  enable_quantization: boolean;
  quantization_type?: 'int8' | 'int16' | 'fp16';
}

export interface CompiledModel {
  id: string;
  source: ModelSource;
  target: CompilationTarget;
  wasm_binary: Uint8Array;
  metadata: ModelMetadata;
  size_bytes: number;
  estimated_speedup: number;
  compilation_time: number; // ms
}

export interface ModelMetadata {
  model_type: string;
  input_shapes: Record<string, number[]>;
  output_shapes: Record<string, number[]>;
  parameter_count: number;
  memory_requirements: number; // bytes
  supported_batch_sizes: number[];
  tokenizer_config?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  performance_estimate: PerformanceEstimate;
}

export interface PerformanceEstimate {
  expected_speedup: number;
  memory_usage: number; // bytes
  initialization_time: number; // ms
  inference_time_per_token: number; // ms
}

export interface OptimizationOptions {
  enable_dead_code_elimination: boolean;
  enable_constant_folding: boolean;
  enable_operator_fusion: boolean;
  enable_memory_optimization: boolean;
  enable_instruction_selection: boolean;
  target_cpu_features: string[];
}

// Benchmarking Types
export interface BenchmarkOperation {
  id: string;
  type: AccelerationType;
  description: string;
  input_data: any;
  expected_output?: any;
  iterations: number;
  warmup_iterations: number;
  timeout: number; // ms
}

export interface BenchmarkResult {
  operation_id: string;
  wasm_time: number; // ms
  js_baseline_time: number; // ms
  speedup_ratio: number;
  memory_usage: number; // bytes
  iterations_completed: number;
  success_rate: number; // 0-1
  errors: string[];
  detailed_timings: number[];
}

// Memory Management
export interface WASMMemoryManager {
  allocate(size: number): Promise<WASMPointer>;
  deallocate(pointer: WASMPointer): Promise<void>;
  copy(source: ArrayBuffer, dest: WASMPointer): Promise<void>;
  read(pointer: WASMPointer, size: number): Promise<ArrayBuffer>;
  getUsage(): Promise<MemoryUsage>;
  gc(): Promise<void>;
}

export interface WASMPointer {
  address: number;
  size: number;
  type: 'f32' | 'f64' | 'i32' | 'i64' | 'u8' | 'u16' | 'u32';
}

export interface MemoryUsage {
  allocated: number; // bytes
  free: number; // bytes
  peak_usage: number; // bytes
  gc_collections: number;
  fragmentation_ratio: number; // 0-1
}

// Error Types
export interface WASMAccelerationError extends Error {
  code: 'INIT_FAILED' | 'COMPILE_FAILED' | 'RUNTIME_ERROR' | 'MEMORY_ERROR' | 'UNSUPPORTED_OP';
  backend: WASMBackend;
  operation?: AccelerationType;
  context?: Record<string, any>;
}

// Hook Types
export interface UseWASMAccelerationOptions {
  backend?: WASMBackend;
  auto_detect_capabilities?: boolean;
  fallback_to_js?: boolean;
  enable_benchmarking?: boolean;
  memory_limit?: number; // MB
  optimization_level?: 'fast' | 'balanced' | 'small';
}

export interface UseWASMAccelerationReturn {
  engine: WASMAccelerationEngine | null;
  loading: boolean;
  error: WASMAccelerationError | null;
  capabilities: WASMCapabilities | null;
  
  // Actions
  accelerateInference: (request: InferenceRequest) => Promise<AcceleratedInferenceResult>;
  benchmarkOperation: (operation: BenchmarkOperation) => Promise<BenchmarkResult>;
  
  // Status
  isSupported: boolean;
  isInitialized: boolean;
  backend: WASMBackend | null;
  
  // Performance
  averageSpeedup: number;
  totalOperations: number;
  memoryUsage: MemoryUsage | null;
}

// Integration with AI Core
export interface AcceleratedProvider {
  accelerate_inference: boolean;
  acceleration_config: AccelerationConfig;
  fallback_strategy: 'js_only' | 'hybrid' | 'wasm_only';
  performance_monitoring: boolean;
}

export interface AcceleratedInferenceRequest extends InferenceRequest {
  acceleration?: {
    enable: boolean;
    backend?: WASMBackend;
    fallback_to_js: boolean;
    benchmark: boolean;
  };
}

// Model Registry Integration
export interface AcceleratedModelMetadata {
  wasm_supported: boolean;
  compiled_models: Record<WASMBackend, CompiledModel>;
  performance_benchmarks: Record<WASMBackend, BenchmarkResult[]>;
  optimization_profiles: OptimizationProfile[];
}

export interface OptimizationProfile {
  name: string;
  target_use_case: 'latency' | 'throughput' | 'memory';
  config: AccelerationConfig;
  expected_speedup: number;
  memory_overhead: number; // bytes
}