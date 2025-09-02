/**
 * Model Registry Tests
 * Test the core AI model registry functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRegistry } from '../registry/ModelRegistry';
import type { ModelMetadata } from '../types';

describe('ModelRegistry', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = new ModelRegistry();
  });

  describe('Model Registration', () => {
    it('should register a new model', () => {
      const model: ModelMetadata = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'anthropic',
        capabilities: ['chat'],
        size: 'medium',
        contextLength: 8192,
        maxTokens: 4096,
        supportsStreaming: true,
        supportsFunction: false,
        supportsVision: false,
        supportsAudio: false,
        wasmSupported: true,
        edgeSupported: true,
      };

      registry.register(model);
      
      const retrieved = registry.getModel('test-model');
      expect(retrieved).toEqual(model);
    });

    it('should throw error when registering duplicate model', () => {
      const model: ModelMetadata = {
        id: 'duplicate-model',
        name: 'Duplicate Model',
        provider: 'openai',
        capabilities: ['chat'],
        size: 'large',
        contextLength: 16384,
        maxTokens: 4096,
        supportsStreaming: true,
        supportsFunction: true,
        supportsVision: false,
        supportsAudio: false,
        wasmSupported: false,
        edgeSupported: true,
      };

      registry.register(model);
      
      expect(() => {
        registry.register(model);
      }).toThrow('Model duplicate-model is already registered');
    });

    it('should unregister an existing model', () => {
      const model: ModelMetadata = {
        id: 'temp-model',
        name: 'Temporary Model',
        provider: 'google',
        capabilities: ['text-generation'],
        size: 'small',
        contextLength: 2048,
        maxTokens: 1024,
        supportsStreaming: false,
        supportsFunction: false,
        supportsVision: false,
        supportsAudio: false,
        wasmSupported: true,
        edgeSupported: false,
      };

      registry.register(model);
      expect(registry.getModel('temp-model')).toEqual(model);

      registry.unregister('temp-model');
      expect(registry.getModel('temp-model')).toBeUndefined();
    });
  });

  describe('Model Querying', () => {
    beforeEach(() => {
      // Register some test models
      const models: ModelMetadata[] = [
        {
          id: 'claude-test',
          name: 'Claude Test',
          provider: 'anthropic',
          capabilities: ['chat', 'code-generation'],
          size: 'large',
          contextLength: 200000,
          maxTokens: 4096,
          supportsStreaming: true,
          supportsFunction: true,
          supportsVision: true,
          supportsAudio: false,
          wasmSupported: true,
          edgeSupported: true,
        },
        {
          id: 'gpt-test',
          name: 'GPT Test',
          provider: 'openai',
          capabilities: ['chat', 'text-generation'],
          size: 'large',
          contextLength: 128000,
          maxTokens: 4096,
          supportsStreaming: true,
          supportsFunction: true,
          supportsVision: false,
          supportsAudio: false,
          wasmSupported: false,
          edgeSupported: true,
        },
        {
          id: 'embedding-model',
          name: 'Embedding Model',
          provider: 'huggingface',
          capabilities: ['embedding'],
          size: 'small',
          contextLength: 512,
          maxTokens: 512,
          supportsStreaming: false,
          supportsFunction: false,
          supportsVision: false,
          supportsAudio: false,
          wasmSupported: true,
          edgeSupported: true,
        },
      ];

      models.forEach(model => registry.register(model));
    });

    it('should get models by provider', () => {
      const anthropicModels = registry.getModelsByProvider('anthropic');
      expect(anthropicModels).toHaveLength(1);
      expect(anthropicModels[0].id).toBe('claude-test');

      const openaiModels = registry.getModelsByProvider('openai');
      expect(openaiModels).toHaveLength(1);
      expect(openaiModels[0].id).toBe('gpt-test');
    });

    it('should get models by capability', () => {
      const chatModels = registry.getModelsByCapability('chat');
      expect(chatModels).toHaveLength(2);
      expect(chatModels.map(m => m.id)).toEqual(['claude-test', 'gpt-test']);

      const embeddingModels = registry.getModelsByCapability('embedding');
      expect(embeddingModels).toHaveLength(1);
      expect(embeddingModels[0].id).toBe('embedding-model');
    });

    it('should get models by size', () => {
      const largeModels = registry.getModelsBySize('large');
      expect(largeModels).toHaveLength(2);

      const smallModels = registry.getModelsBySize('small');
      expect(smallModels).toHaveLength(1);
      expect(smallModels[0].id).toBe('embedding-model');
    });

    it('should filter models', () => {
      const wasmModels = registry.getModels({ wasmSupported: true });
      expect(wasmModels).toHaveLength(2);
      expect(wasmModels.map(m => m.id)).toEqual(['claude-test', 'embedding-model']);

      const anthropicChatModels = registry.getModels({
        provider: 'anthropic',
        capabilities: ['chat'],
      });
      expect(anthropicChatModels).toHaveLength(1);
      expect(anthropicChatModels[0].id).toBe('claude-test');
    });
  });

  describe('Best Model Selection', () => {
    it('should find best model for requirements', () => {
      const bestModel = registry.findBestModel({
        capability: 'chat',
        wasmSupported: true,
      });

      // Should find a model that supports chat and WASM
      expect(bestModel).toBeDefined();
      expect(bestModel?.capabilities).toContain('chat');
      expect(bestModel?.wasmSupported).toBe(true);
    });

    it('should return null when no model matches requirements', () => {
      const bestModel = registry.findBestModel({
        capability: 'video-analysis', // Non-existent capability
      });

      expect(bestModel).toBeNull();
    });
  });

  describe('Registry Statistics', () => {
    it('should provide accurate statistics', () => {
      const stats = registry.getStats();
      
      // Should include built-in models plus any registered in tests
      expect(stats.totalModels).toBeGreaterThan(0);
      expect(stats.totalProviders).toBeGreaterThan(0);
      expect(stats.modelsByProvider).toBeDefined();
      expect(stats.modelsByCapability).toBeDefined();
      expect(stats.wasmSupportedModels).toBeGreaterThan(0);
    });
  });

  describe('Export/Import', () => {
    it('should export and import registry configuration', () => {
      const originalStats = registry.getStats();
      
      // Export registry
      const exported = registry.export();
      expect(exported).toBeTruthy();
      expect(() => JSON.parse(exported)).not.toThrow();

      // Create new registry and import
      const newRegistry = new ModelRegistry();
      newRegistry.import(exported);

      const newStats = newRegistry.getStats();
      expect(newStats.totalModels).toBe(originalStats.totalModels);
      expect(newStats.totalProviders).toBe(originalStats.totalProviders);
    });
  });
});