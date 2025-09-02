/**
 * Model Configuration Migration Tools
 * 
 * Helps migrate users from CLI-based model selection to in-application model management.
 * Detects legacy CLI configurations and guides users through migration process.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { GlobalConfig, getGlobalConfigPath, readGlobalConfig, writeGlobalConfig } from './config'
import { ModelProfile } from './model'

export interface MigrationResult {
  success: boolean
  migratedModels: number
  defaultModel?: string
  errors: string[]
  warnings: string[]
}

export interface LegacyModelConfig {
  provider: string
  modelName: string
  baseURL?: string
  apiKey?: string
  contextLength?: number
  maxTokens?: number
}

/**
 * Detects if user is still using CLI-based model selection
 */
export function detectLegacyModelConfig(): boolean {
  try {
    const config = readGlobalConfig()
    
    // Check if user has configured models but no default model selected
    const hasModels = config.models && Object.keys(config.models).length > 0
    const hasDefaultModel = config.defaultModel
    
    // Legacy indicator: models configured but no default selected
    if (hasModels && !hasDefaultModel) {
      return true
    }
    
    // Check for command line arguments in shell history (basic detection)
    const shellHistoryPaths = [
      join(process.env.HOME || '', '.bash_history'),
      join(process.env.HOME || '', '.zsh_history'),
    ]
    
    for (const historyPath of shellHistoryPaths) {
      if (existsSync(historyPath)) {
        try {
          const history = readFileSync(historyPath, 'utf8')
          // Look for agile-programmers CLI with model flags
          if (history.includes('agile-programmers') && (
            history.includes('--model') ||
            history.includes('-m ') ||
            history.includes('--provider')
          )) {
            return true
          }
        } catch (error) {
          // Ignore history file read errors
        }
      }
    }
    
    return false
  } catch (error) {
    // If we can't read config, assume no legacy config
    return false
  }
}

/**
 * Extracts model configurations from various sources
 */
export function extractLegacyConfigurations(): LegacyModelConfig[] {
  const legacyConfigs: LegacyModelConfig[] = []
  
  try {
    // Check existing model configurations
    const config = readGlobalConfig()
    if (config.models) {
      for (const [modelName, modelConfig] of Object.entries(config.models)) {
        if (typeof modelConfig === 'object' && modelConfig !== null) {
          legacyConfigs.push({
            provider: modelConfig.provider || 'unknown',
            modelName: modelName,
            baseURL: modelConfig.baseURL,
            apiKey: modelConfig.apiKey,
            contextLength: modelConfig.contextLength,
            maxTokens: modelConfig.maxTokens
          })
        }
      }
    }
    
    // Check dual-model auth config
    const authConfigPath = '/home/ubuntu/workspace/.auth/auth_config.json'
    if (existsSync(authConfigPath)) {
      try {
        const authConfig = JSON.parse(readFileSync(authConfigPath, 'utf8'))
        const deploymentModels = authConfig.deployment?.models
        
        if (deploymentModels) {
          for (const [modelKey, modelData] of Object.entries(deploymentModels)) {
            if (typeof modelData === 'object' && modelData !== null) {
              const data = modelData as any
              legacyConfigs.push({
                provider: 'self-hosted',
                modelName: modelKey,
                baseURL: data.base_url,
                apiKey: data.api_key,
                contextLength: data.context_length || 32768,
                maxTokens: data.max_tokens || 8192
              })
            }
          }
        }
      } catch (error) {
        // Ignore auth config parsing errors
      }
    }
    
    return legacyConfigs
  } catch (error) {
    return []
  }
}

/**
 * Migrates legacy configurations to new model management system
 */
export function migrateLegacyConfigurations(legacyConfigs: LegacyModelConfig[]): MigrationResult {
  const result: MigrationResult = {
    success: false,
    migratedModels: 0,
    errors: [],
    warnings: []
  }
  
  try {
    const config = readGlobalConfig()
    
    // Ensure models section exists
    if (!config.models) {
      config.models = {}
    }
    
    let migratedCount = 0
    let suggestedDefaultModel: string | undefined
    
    for (const legacyConfig of legacyConfigs) {
      try {
        // Create model profile
        const modelProfile: ModelProfile = {
          name: legacyConfig.modelName,
          provider: legacyConfig.provider as any,
          modelName: legacyConfig.modelName,
          isActive: true,
          contextLength: legacyConfig.contextLength || 32768,
          maxTokens: legacyConfig.maxTokens || 8192
        }
        
        // Add provider-specific configuration
        if (legacyConfig.provider === 'self-hosted' && legacyConfig.baseURL) {
          modelProfile.baseURL = legacyConfig.baseURL
          modelProfile.apiKey = legacyConfig.apiKey
        }
        
        // Add to config
        config.models[legacyConfig.modelName] = modelProfile
        migratedCount++
        
        // Suggest first self-hosted model as default, or first model
        if (!suggestedDefaultModel) {
          if (legacyConfig.provider === 'self-hosted') {
            suggestedDefaultModel = legacyConfig.modelName
          } else if (!suggestedDefaultModel) {
            suggestedDefaultModel = legacyConfig.modelName
          }
        }
        
      } catch (error) {
        result.errors.push(`Failed to migrate ${legacyConfig.modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    // Set default model if none exists
    if (!config.defaultModel && suggestedDefaultModel) {
      config.defaultModel = suggestedDefaultModel
      result.defaultModel = suggestedDefaultModel
    }
    
    // Save updated configuration
    writeGlobalConfig(config)
    
    result.success = true
    result.migratedModels = migratedCount
    
    if (migratedCount > 0) {
      result.warnings.push(`Migrated ${migratedCount} model configurations to new system`)
      result.warnings.push('You can now switch models using /modelswitch command')
      result.warnings.push('Use /modelhealth to check model status')
      result.warnings.push('Use /modelstatus to view current configuration')
    }
    
  } catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return result
}

/**
 * Creates a backup of current configuration before migration
 */
export function backupCurrentConfig(): string | null {
  try {
    const configPath = getGlobalConfigPath()
    if (!existsSync(configPath)) {
      return null
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `${configPath}.backup.${timestamp}`
    
    const currentConfig = readFileSync(configPath, 'utf8')
    writeFileSync(backupPath, currentConfig)
    
    return backupPath
  } catch (error) {
    return null
  }
}

/**
 * Provides migration guidance to users
 */
export function getMigrationGuidance(): string[] {
  const guidance = [
    '🚀 Model Configuration Migration Available!',
    '',
    'We\'ve detected you\'re using CLI-based model selection.',
    'The new system allows you to:',
    '',
    '• Switch models instantly with /modelswitch command',
    '• Check model health with /modelhealth command',
    '• Set persistent default model preferences',
    '• Manage models within the application',
    '',
    'Migration Process:',
    '1. Your current configuration will be backed up',
    '2. Models will be registered in the new system',
    '3. A default model will be selected automatically',
    '4. You can start using slash commands immediately',
    '',
    'Run the migration by using /model command and following the prompts.',
  ]
  
  return guidance
}

/**
 * Validates migrated configuration
 */
export function validateMigratedConfig(): { isValid: boolean, issues: string[] } {
  const issues: string[] = []
  
  try {
    const config = readGlobalConfig()
    
    // Check if models section exists
    if (!config.models || Object.keys(config.models).length === 0) {
      issues.push('No models configured in new system')
    }
    
    // Check if default model is set
    if (!config.defaultModel) {
      issues.push('No default model selected')
    } else if (config.models && !config.models[config.defaultModel]) {
      issues.push(`Default model '${config.defaultModel}' not found in model list`)
    }
    
    // Validate each model configuration
    if (config.models) {
      for (const [modelName, modelProfile] of Object.entries(config.models)) {
        if (typeof modelProfile !== 'object' || modelProfile === null) {
          issues.push(`Invalid model configuration for '${modelName}'`)
          continue
        }
        
        if (!modelProfile.provider) {
          issues.push(`Model '${modelName}' missing provider`)
        }
        
        if (!modelProfile.modelName) {
          issues.push(`Model '${modelName}' missing modelName`)
        }
        
        // Validate self-hosted models
        if (modelProfile.provider === 'self-hosted') {
          if (!modelProfile.baseURL) {
            issues.push(`Self-hosted model '${modelName}' missing baseURL`)
          }
        }
      }
    }
    
  } catch (error) {
    issues.push(`Failed to validate configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}