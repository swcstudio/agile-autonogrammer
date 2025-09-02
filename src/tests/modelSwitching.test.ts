/**
 * End-to-End Model Switching and Authentication Tests
 * 
 * Tests the complete model management system including:
 * - ModelManager internal state management
 * - Model switching without restart
 * - Persistent default model preferences
 * - Authentication integration
 * - Health checking system
 * - Slash command integration
 */

import { ModelManager } from '../utils/model'
import { readGlobalConfig, writeGlobalConfig } from '../utils/config'
import { 
  detectLegacyModelConfig,
  migrateLegacyConfigurations,
  validateMigratedConfig
} from '../utils/modelConfigMigration'
import * as fs from 'fs'
import * as path from 'path'

describe('Model Switching and Authentication System', () => {
  let originalConfig: any
  let modelManager: ModelManager

  beforeEach(() => {
    // Backup original configuration
    try {
      originalConfig = readGlobalConfig()
    } catch {
      originalConfig = null
    }

    // Reset to clean state
    const testConfig = {
      models: {
        'test-claude': {
          name: 'Test Claude',
          provider: 'anthropic',
          modelName: 'claude-3-sonnet-20241022',
          isActive: true,
          contextLength: 200000,
          maxTokens: 8192
        },
        'test-qwen-42b': {
          name: 'Test Qwen3 42B',
          provider: 'self-hosted',
          modelName: 'qwen3-42b',
          baseURL: 'http://localhost:8000',
          apiKey: 'test-key-42b',
          isActive: true,
          contextLength: 32768,
          maxTokens: 8192
        },
        'test-qwen-moe': {
          name: 'Test Qwen3 MoE',
          provider: 'self-hosted',
          modelName: 'qwen3-moe',
          baseURL: 'http://localhost:8001',
          apiKey: 'test-key-moe',
          isActive: true,
          contextLength: 32768,
          maxTokens: 8192
        }
      },
      defaultModel: 'test-claude',
      modelPointers: {
        main: 'test-claude',
        task: 'test-qwen-42b',
        reasoning: 'test-qwen-42b',
        quick: 'test-qwen-moe'
      }
    }

    writeGlobalConfig(testConfig)
    
    // Create fresh ModelManager instance
    modelManager = new ModelManager()
  })

  afterEach(() => {
    // Restore original configuration
    if (originalConfig) {
      writeGlobalConfig(originalConfig)
    }
  })

  describe('ModelManager Internal State Management', () => {
    test('should load available models from configuration', () => {
      const availableModels = modelManager.getAvailableModels()
      
      expect(availableModels).toHaveLength(3)
      expect(availableModels.map(m => m.modelName)).toContain('test-claude')
      expect(availableModels.map(m => m.modelName)).toContain('qwen3-42b')
      expect(availableModels.map(m => m.modelName)).toContain('qwen3-moe')
    })

    test('should get current default model', () => {
      const currentModel = modelManager.getCurrentModel()
      expect(currentModel).toBe('test-claude')
    })

    test('should get model statistics', () => {
      const stats = modelManager.getModelStatistics()
      
      expect(stats.totalModels).toBe(3)
      expect(stats.activeModels).toBe(3)
      expect(stats.providerGroups).toEqual({
        'anthropic': 1,
        'self-hosted': 2
      })
    })

    test('should group models by provider', () => {
      const grouped = modelManager.getModelsByProvider()
      
      expect(grouped.get('anthropic')).toHaveLength(1)
      expect(grouped.get('self-hosted')).toHaveLength(2)
    })
  })

  describe('Runtime Model Switching', () => {
    test('should switch to existing model successfully', () => {
      const result = modelManager.switchToModel('test-qwen-42b')
      
      expect(result.success).toBe(true)
      expect(result.model).toBeDefined()
      expect(result.model?.modelName).toBe('qwen3-42b')
      expect(result.error).toBeUndefined()
      
      // Verify the switch persisted
      const currentModel = modelManager.getCurrentModel()
      expect(currentModel).toBe('test-qwen-42b')
    })

    test('should fail to switch to non-existent model', () => {
      const result = modelManager.switchToModel('non-existent-model')
      
      expect(result.success).toBe(false)
      expect(result.model).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Model not found')
    })

    test('should validate model configuration', () => {
      const validation = modelManager.validateModel('test-claude')
      expect(validation.isValid).toBe(true)
      expect(validation.issues).toHaveLength(0)
      
      const invalidValidation = modelManager.validateModel('invalid-model')
      expect(invalidValidation.isValid).toBe(false)
      expect(invalidValidation.issues.length).toBeGreaterThan(0)
    })
  })

  describe('Persistent Default Model Preferences', () => {
    test('should set and persist user default model', () => {
      modelManager.setUserDefaultModel('test-qwen-moe')
      
      // Verify it was set
      const currentDefault = modelManager.getCurrentModel()
      expect(currentDefault).toBe('test-qwen-moe')
      
      // Create new ModelManager instance to test persistence
      const newModelManager = new ModelManager()
      const persistedDefault = newModelManager.getCurrentModel()
      expect(persistedDefault).toBe('test-qwen-moe')
    })

    test('should handle invalid default model gracefully', () => {
      const result = modelManager.setUserDefaultModel('invalid-model')
      expect(result).toBe(false)
      
      // Should keep previous default
      const currentDefault = modelManager.getCurrentModel()
      expect(currentDefault).toBe('test-claude')
    })
  })

  describe('Health Checking System', () => {
    test('should generate health check URLs for self-hosted models', () => {
      const model = modelManager.getAvailableModels().find(m => m.modelName === 'qwen3-42b')
      expect(model).toBeDefined()
      
      if (model) {
        const healthUrl = modelManager.getModelHealthUrl(model)
        expect(healthUrl).toBe('http://localhost:8000/health')
      }
    })

    test('should return null health URL for cloud models', () => {
      const model = modelManager.getAvailableModels().find(m => m.modelName === 'test-claude')
      expect(model).toBeDefined()
      
      if (model) {
        const healthUrl = modelManager.getModelHealthUrl(model)
        expect(healthUrl).toBeNull()
      }
    })

    test('should get authentication headers for self-hosted models', () => {
      const model = modelManager.getAvailableModels().find(m => m.modelName === 'qwen3-42b')
      expect(model).toBeDefined()
      
      if (model) {
        const authHeaders = modelManager.getAuthenticationHeaders(model)
        expect(authHeaders).toEqual({
          'X-API-Key': 'test-key-42b',
          'User-Agent': 'agile-programmers/2.0.0'
        })
      }
    })
  })

  describe('Configuration Migration System', () => {
    test('should detect legacy configuration correctly', () => {
      // Set up a legacy-style config (models but no defaultModel)
      const legacyConfig = {
        models: {
          'legacy-model': {
            provider: 'anthropic',
            modelName: 'claude-3-sonnet'
          }
        }
        // No defaultModel property - this indicates legacy config
      }
      writeGlobalConfig(legacyConfig)
      
      const hasLegacy = detectLegacyModelConfig()
      expect(hasLegacy).toBe(true)
    })

    test('should not detect legacy configuration when properly configured', () => {
      // Current config has defaultModel set
      const hasLegacy = detectLegacyModelConfig()
      expect(hasLegacy).toBe(false)
    })

    test('should validate migrated configuration', () => {
      const validation = validateMigratedConfig()
      expect(validation.isValid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    test('should identify issues in invalid configuration', () => {
      // Create invalid config
      const invalidConfig = {
        models: {
          'invalid-model': {
            // Missing required fields
            name: 'Invalid Model'
          }
        },
        defaultModel: 'non-existent-model'
      }
      writeGlobalConfig(invalidConfig)
      
      const validation = validateMigratedConfig()
      expect(validation.isValid).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
    })
  })

  describe('Integration Tests', () => {
    test('should handle complete workflow: switch -> validate -> persist', () => {
      // Step 1: Switch model
      const switchResult = modelManager.switchToModel('test-qwen-moe')
      expect(switchResult.success).toBe(true)
      
      // Step 2: Validate the switch
      const validation = modelManager.validateModel('test-qwen-moe')
      expect(validation.isValid).toBe(true)
      
      // Step 3: Verify persistence
      const currentModel = modelManager.getCurrentModel()
      expect(currentModel).toBe('test-qwen-moe')
      
      // Step 4: Create new instance and verify persistence
      const newModelManager = new ModelManager()
      const persistedModel = newModelManager.getCurrentModel()
      expect(persistedModel).toBe('test-qwen-moe')
    })

    test('should handle authentication and health checking for self-hosted models', () => {
      const selfHostedModels = modelManager.getAvailableModels()
        .filter(m => m.provider === 'self-hosted')
      
      expect(selfHostedModels).toHaveLength(2)
      
      for (const model of selfHostedModels) {
        // Should have health URL
        const healthUrl = modelManager.getModelHealthUrl(model)
        expect(healthUrl).toBeDefined()
        expect(healthUrl).toContain('/health')
        
        // Should have authentication headers
        const authHeaders = modelManager.getAuthenticationHeaders(model)
        expect(authHeaders['X-API-Key']).toBeDefined()
        expect(authHeaders['User-Agent']).toBe('agile-programmers/2.0.0')
      }
    })

    test('should maintain model state consistency across operations', () => {
      const initialStats = modelManager.getModelStatistics()
      expect(initialStats.totalModels).toBe(3)
      expect(initialStats.activeModels).toBe(3)
      
      // Switch model
      modelManager.switchToModel('test-qwen-42b')
      
      // Stats should remain consistent
      const afterSwitchStats = modelManager.getModelStatistics()
      expect(afterSwitchStats.totalModels).toBe(3)
      expect(afterSwitchStats.activeModels).toBe(3)
      
      // But current model should change
      expect(modelManager.getCurrentModel()).toBe('test-qwen-42b')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing configuration gracefully', () => {
      // Create ModelManager with empty config
      writeGlobalConfig({})
      const emptyModelManager = new ModelManager()
      
      const availableModels = emptyModelManager.getAvailableModels()
      expect(availableModels).toHaveLength(0)
      
      const currentModel = emptyModelManager.getCurrentModel()
      expect(currentModel).toBeNull()
      
      const stats = emptyModelManager.getModelStatistics()
      expect(stats.totalModels).toBe(0)
      expect(stats.activeModels).toBe(0)
    })

    test('should handle invalid model configurations', () => {
      const invalidConfig = {
        models: {
          'invalid-model': {
            // Missing required provider field
            name: 'Invalid Model'
          }
        },
        defaultModel: 'invalid-model'
      }
      writeGlobalConfig(invalidConfig)
      
      const invalidModelManager = new ModelManager()
      const validation = invalidModelManager.validateModel('invalid-model')
      expect(validation.isValid).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
    })

    test('should handle concurrent model switches', () => {
      // Simulate multiple rapid switches
      const results = [
        modelManager.switchToModel('test-qwen-42b'),
        modelManager.switchToModel('test-qwen-moe'),
        modelManager.switchToModel('test-claude'),
      ]
      
      // All switches should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      
      // Final state should be consistent
      const finalModel = modelManager.getCurrentModel()
      expect(finalModel).toBe('test-claude')
    })
  })
})