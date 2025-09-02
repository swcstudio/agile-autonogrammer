/**
 * Typia Integration Type Definitions for Katalyst Core
 *
 * Comprehensive TypeScript definitions for ultra-fast validation integration.
 * Typia provides 30,000x faster validation than class-validator with zero runtime overhead.
 *
 * These types ensure perfect integration with Katalyst's superior React architecture.
 */

// Core Typia configuration interface
export interface TypiaConfig {
  validation: boolean;
  serialization: boolean;
  randomGeneration: boolean;
  protobuf: boolean;
  jsonSchema: boolean;
  optimization: boolean;
  strictMode: boolean;
  target: 'es5' | 'es2015' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'es2022';
}

// Validation configuration options
export interface TypiaValidation {
  type: 'assert' | 'is' | 'validate';
  errorFactory?: (path: string, expected: string, value: any) => Error;
  customValidators?: Record<string, (value: any) => boolean>;
  cacheTime?: number;
  enableOptimisticValidation?: boolean;
}

// Serialization configuration options
export interface TypiaSerialization {
  type: 'stringify' | 'assertStringify' | 'isStringify';
  space?: number | string;
  replacer?: (key: string, value: any) => any;
  cacheEnabled?: boolean;
  cacheSize?: number;
  compressionEnabled?: boolean;
}

// Random generation configuration
export interface TypiaGeneration {
  type: 'random' | 'createRandom';
  seed?: number;
  constraints?: Record<string, any>;
  batchSize?: number;
  historySize?: number;
}

// Protocol Buffer configuration
export interface TypiaProtobuf {
  wireFormat: 'proto2' | 'proto3';
  compression: boolean;
  streaming: boolean;
  reflection: boolean;
  keepCase: boolean;
  longs: 'String' | 'Number';
  enums: 'String' | 'Number';
  bytes: 'Array' | 'Uint8Array';
  defaults: boolean;
}

// JSON Schema generation configuration
export interface TypiaJsonSchema {
  draft: '2019-09' | '2020-12';
  validation: boolean;
  serialization: boolean;
  documentation: boolean;
  examples: boolean;
  defaults: boolean;
  additionalProperties: boolean;
  title?: (type: string) => string;
  description?: (type: string) => string;
}

// Performance configuration and metrics
export interface TypiaPerformance {
  enableBenchmarking: boolean;
  enableCaching: boolean;
  enableOptimizations: boolean;
  target: string;
  strict: boolean;
  inlining: boolean;
  treeshaking: boolean;
  minification: boolean;
}

// Validation result interfaces
export interface TypiaValidationResult<T> {
  success: boolean;
  data: T;
  errors: TypiaValidationError[];
  performance?: {
    duration: number;
    timestamp: number;
  };
}

export interface TypiaValidationError {
  path: string;
  expected: string;
  value: any;
  message?: string;
}

// Serialization result interfaces
export interface TypiaSerializationResult {
  data: string;
  size: number;
  compressionRatio?: number;
  performance: {
    duration: number;
    cached: boolean;
  };
}

// Random generation result interfaces
export interface TypiaGenerationResult<T> {
  data: T;
  seed?: number;
  constraints?: Record<string, any>;
  performance: {
    duration: number;
    optimized: boolean;
  };
}

// Protocol Buffer result interfaces
export interface TypiaProtobufResult {
  buffer: Uint8Array;
  size: number;
  compressionRatio: number;
  wireFormat: string;
  performance: {
    duration: number;
    optimized: boolean;
  };
}

// JSON Schema result interfaces
export interface TypiaJsonSchemaResult {
  schema: any;
  draft: string;
  features: string[];
  performance: {
    compileTime: boolean;
    zeroRuntime: boolean;
  };
}

// Benchmark and performance monitoring interfaces
export interface TypiaBenchmark {
  operation: 'validation' | 'serialization' | 'generation' | 'protobuf' | 'schema';
  start: number;
  end: number;
  duration: number;
  iterations: number;
  throughput: number;
}

export interface TypiaPerformanceMetrics {
  validationSpeedup: string;
  serializationSpeedup: string;
  generationSpeedup: string;
  compileTimeOptimization: boolean;
  zeroRuntimeOverhead: boolean;
  benchmarks: TypiaBenchmark[];
}

// Integration metadata interfaces
export interface TypiaIntegration {
  framework: 'katalyst-react';
  version: string;
  features: string[];
  preserveKatalystSuperiority: true;
  role: 'validation-enhancement';
  performance: TypiaPerformanceMetrics;
  configuration: {
    target: string;
    strict: boolean;
    optimization: boolean;
    mockMode: boolean;
  };
}

// Runtime context interfaces
export interface TypiaRuntimeContext {
  isEnabled: boolean;
  isInitialized: boolean;
  error: Error | null;
  config: TypiaConfig;
  integration: TypiaIntegration;
  performance: TypiaPerformanceMetrics;
}

// Form validation interfaces
export interface TypiaFormState<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface TypiaFormConfig<T> {
  initialValues: T;
  validationMode: 'onChange' | 'onBlur' | 'onSubmit';
  revalidateMode: 'onChange' | 'onBlur';
  enableRealTimeValidation: boolean;
  cacheValidation: boolean;
  optimisticUpdates: boolean;
}

// Hook return types
export interface UseTypiaValidationReturn<T> {
  validate: (input: unknown, cacheTime?: number) => TypiaValidationResult<T>;
  assert: (input: unknown) => T;
  is: (input: unknown) => input is T;
  equals: (a: T, b: T) => boolean;
  lastValidation: TypiaValidationResult<T> | null;
  performance: {
    speedup: string;
    zeroRuntime: boolean;
  };
}

export interface UseTypiaSerializationReturn<T> {
  stringify: (
    input: T,
    options?: { space?: number; cache?: boolean; cacheTime?: number }
  ) => string;
  assertStringify: (input: unknown) => string;
  isStringify: (input: unknown) => string | null;
  parse: (json: string) => T;
  assertParse: (json: string) => T;
  performance: {
    speedup: string;
    compileTime: boolean;
  };
  cacheStats: {
    size: number;
    clear: () => void;
  };
}

export interface UseTypiaGenerationReturn<T> {
  random: () => T;
  createRandom: () => () => T;
  randomBatch: (count: number) => T[];
  history: T[];
  clearHistory: () => void;
  performance: {
    speedup: string;
    compileTime: boolean;
  };
}

export interface UseTypiaProtobufReturn<T> {
  encode: (input: T) => Uint8Array;
  decode: (buffer: Uint8Array) => T;
  message: () => any;
  encodeDecodeTest: (input: T) => { success: boolean; data?: T; error?: string };
  compressionStats: {
    jsonSize: number;
    protobufSize: number;
    compressionRatio: number;
  } | null;
  performance: {
    speedup: string;
    binaryEfficiency: boolean;
  };
}

export interface UseTypiaJsonSchemaReturn<T> {
  schema: (typeKey?: string) => any;
  application: <TTypes extends readonly any[]>(typeKey?: string) => any;
  clearCache: () => void;
  cacheSize: number;
  performance: {
    compileTime: boolean;
    zeroRuntime: boolean;
  };
}

export interface UseTypiaFormReturn<T extends Record<string, any>> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  setValue: (field: keyof T, value: any) => void;
  validateForm: () => boolean;
  reset: () => void;
  isValid: boolean;
  performance: {
    validationSpeed: string;
    realTimeValidation: boolean;
  };
}

export interface UseTypiaPerformanceReturn {
  benchmark: (operation: string, fn: () => any) => any;
  benchmarks: {
    validation: { start: number; end: number; duration: number } | null;
    serialization: { start: number; end: number; duration: number } | null;
    generation: { start: number; end: number; duration: number } | null;
  };
  clearBenchmarks: () => void;
  performance: TypiaPerformanceMetrics;
  integration: TypiaIntegration;
}

// Provider configuration interfaces
export interface TypiaRuntimeConfig {
  config: TypiaConfig;
  validation?: TypiaValidation;
  serialization?: TypiaSerialization;
  generation?: TypiaGeneration;
  protobuf?: TypiaProtobuf;
  jsonSchema?: TypiaJsonSchema;
  performance?: TypiaPerformance;
  onError?: (error: Error) => void;
  mockProvider?: boolean;
  enableHealthChecks?: boolean;
}

// Component prop interfaces
export interface TypiaHealthCheckProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
  enableFallback?: boolean;
  showPerformanceWarnings?: boolean;
}

export interface TypiaProviderProps extends TypiaRuntimeConfig {
  children: React.ReactNode;
}

// Advanced configuration interfaces
export interface TypiaAdvancedConfig {
  compiler: {
    target: string;
    strict: boolean;
    optimization: boolean;
    inlining: boolean;
    treeshaking: boolean;
    minification: boolean;
  };
  runtime: {
    enableCaching: boolean;
    cacheSize: number;
    enableBenchmarking: boolean;
    enableLogging: boolean;
  };
  integration: {
    framework: 'katalyst-react';
    preserveSuperiority: true;
    enhancementOnly: true;
    bridgeMode: boolean;
  };
}

// Error handling interfaces
export interface TypiaErrorHandler {
  onValidationError: (error: TypiaValidationError, context: any) => void;
  onSerializationError: (error: Error, data: any) => void;
  onGenerationError: (error: Error, type: string) => void;
  onProtobufError: (error: Error, operation: 'encode' | 'decode') => void;
  onSchemaError: (error: Error, type: string) => void;
}

// Plugin and extension interfaces
export interface TypiaPlugin {
  name: string;
  version: string;
  initialize: (config: TypiaConfig) => Promise<void>;
  destroy: () => Promise<void>;
  features: string[];
}

export interface TypiaExtension {
  validators: Record<string, (value: any) => boolean>;
  serializers: Record<string, (value: any) => string>;
  generators: Record<string, () => any>;
  transformers: Record<string, (code: string) => string>;
}

// Type utility interfaces for advanced usage
export type TypiaValidate<T> = (input: unknown) => TypiaValidationResult<T>;
export type TypiaAssert<T> = (input: unknown) => T;
export type TypiaIs<T> = (input: unknown) => input is T;
export type TypiaStringify<T> = (input: T) => string;
export type TypiaParse<T> = (json: string) => T;
export type TypiaRandom<T> = () => T;

// Export main class interface
export interface TypiaIntegrationClass {
  config: TypiaConfig;
  setupTypia(): Promise<any>;
  setupValidation(): Promise<any>;
  setupSerialization(): Promise<any>;
  setupRandomGeneration(): Promise<any>;
  setupProtobuf(): Promise<any>;
  setupJsonSchema(): Promise<any>;
  setupOptimization(): Promise<any>;
  initialize(): Promise<any[]>;
  getUsageExamples(): Record<string, string>;
  getTypeDefinitions(): string;
}

// Re-export main integration class
export { TypiaIntegration } from '../integrations/typia.ts';
