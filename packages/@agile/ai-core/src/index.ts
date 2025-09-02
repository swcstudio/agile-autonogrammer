/**
 * @agile/ai-core
 * Core AI/ML integration package with 50+ model support and WASM acceleration
 */

// Export types
export * from './types';

// Export hooks
export { useAI } from './hooks/useAI';
export { useModel } from './hooks/useModel';
export { useInference } from './hooks/useInference';

// Export registry
export { ModelRegistry } from './registry/ModelRegistry';

// Export providers
export { ProviderManager } from './providers/ProviderManager';
export { AnthropicProvider } from './providers/anthropic/AnthropicProvider';
export { OpenAIProvider } from './providers/openai/OpenAIProvider';
export { GoogleAIProvider } from './providers/google/GoogleAIProvider';
export { HuggingFaceProvider } from './providers/huggingface/HuggingFaceProvider';

// Export utilities
export * from './utils/errors';