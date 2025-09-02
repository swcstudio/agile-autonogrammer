/**
 * @agile/core
 * Core framework package with TypeScript hooks architecture
 * Implements PRD-001: Core Framework Migration
 */

// Export all hooks
export * from './hooks';

// Version and metadata
export const VERSION = '0.0.1';
export const FRAMEWORK_NAME = 'Agile Core Framework';

// Core configuration types
export interface AgileConfig {
  enableMetrics?: boolean;
  enableCaching?: boolean;
  maxConcurrency?: number;
  memoryLimit?: number;
  wasmRuntime?: 'rust' | 'elixir' | 'typescript';
}

// Default configuration
export const DEFAULT_CONFIG: AgileConfig = {
  enableMetrics: true,
  enableCaching: true,
  maxConcurrency: 4,
  memoryLimit: 512 * 1024 * 1024, // 512MB
  wasmRuntime: 'rust',
};