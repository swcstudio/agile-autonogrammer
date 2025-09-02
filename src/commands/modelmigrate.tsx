import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Command } from '../commands'
import { 
  detectLegacyModelConfig, 
  extractLegacyConfigurations,
  migrateLegacyConfigurations,
  backupCurrentConfig,
  getMigrationGuidance,
  validateMigratedConfig
} from '../utils/modelConfigMigration'

interface ModelMigrateDisplayProps {
  onClose: () => void
}

const ModelMigrateDisplay: React.FC<ModelMigrateDisplayProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [migrationState, setMigrationState] = useState<'checking' | 'guidance' | 'migrating' | 'completed' | 'no-migration-needed'>('checking')
  const [migrationResult, setMigrationResult] = useState<any>(null)
  const [backupPath, setBackupPath] = useState<string | null>(null)

  useEffect(() => {
    async function performMigrationCheck() {
      try {
        setMigrationState('checking')
        
        // Check if legacy configuration exists
        const hasLegacyConfig = detectLegacyModelConfig()
        
        if (!hasLegacyConfig) {
          setMigrationState('no-migration-needed')
          setIsLoading(false)
          // Auto-close after showing message
          setTimeout(() => {
            onClose()
          }, 3000)
          return
        }
        
        // Show guidance first
        setMigrationState('guidance')
        setIsLoading(false)
        
        // Auto-start migration after showing guidance
        setTimeout(async () => {
          setMigrationState('migrating')
          
          // Create backup
          const backup = backupCurrentConfig()
          setBackupPath(backup)
          
          // Extract legacy configurations
          const legacyConfigs = extractLegacyConfigurations()
          
          // Perform migration
          const result = migrateLegacyConfigurations(legacyConfigs)
          setMigrationResult(result)
          
          setMigrationState('completed')
          
          // Auto-close after 10 seconds
          setTimeout(() => {
            onClose()
          }, 10000)
          
        }, 5000) // Show guidance for 5 seconds
        
      } catch (error) {
        setMigrationResult({
          success: false,
          migratedModels: 0,
          errors: [error instanceof Error ? error.message : 'Migration failed'],
          warnings: []
        })
        setMigrationState('completed')
        setIsLoading(false)
        
        setTimeout(() => {
          onClose()
        }, 8000)
      }
    }

    performMigrationCheck()
  }, [onClose])

  const renderContent = () => {
    switch (migrationState) {
      case 'checking':
        return (
          <Box flexDirection="column">
            <Text>Checking for legacy model configurations...</Text>
          </Box>
        )
      
      case 'no-migration-needed':
        return (
          <Box flexDirection="column">
            <Text color="green">✅ Your model configuration is already up to date!</Text>
            <Text dimColor>No migration needed.</Text>
            <Box marginTop={1}>
              <Text dimColor>(Closing in 3 seconds...)</Text>
            </Box>
          </Box>
        )
      
      case 'guidance':
        const guidance = getMigrationGuidance()
        return (
          <Box flexDirection="column">
            {guidance.map((line, index) => (
              <Text key={index} color={line.startsWith('🚀') ? 'blue' : line.startsWith('•') ? 'green' : undefined}>
                {line}
              </Text>
            ))}
            <Box marginTop={1}>
              <Text color="yellow">Starting migration in 5 seconds...</Text>
            </Box>
          </Box>
        )
      
      case 'migrating':
        return (
          <Box flexDirection="column">
            <Text color="blue">🔄 Migrating model configurations...</Text>
            <Text dimColor>Creating backup and updating configuration...</Text>
            {backupPath && (
              <Text dimColor>Backup created: {backupPath}</Text>
            )}
          </Box>
        )
      
      case 'completed':
        if (!migrationResult) return <Text>Migration completed</Text>
        
        return (
          <Box flexDirection="column">
            {migrationResult.success ? (
              <Box flexDirection="column">
                <Text color="green">✅ Migration completed successfully!</Text>
                
                <Box marginTop={1}>
                  <Text bold>Summary:</Text>
                  <Text>• Migrated {migrationResult.migratedModels} model(s)</Text>
                  {migrationResult.defaultModel && (
                    <Text>• Default model: {migrationResult.defaultModel}</Text>
                  )}
                  {backupPath && (
                    <Text dimColor>• Backup saved: {backupPath.split('/').pop()}</Text>
                  )}
                </Box>
                
                {migrationResult.warnings.length > 0 && (
                  <Box marginTop={1}>
                    <Text bold color="blue">Available commands:</Text>
                    {migrationResult.warnings.filter((w: string) => w.includes('/')).map((warning: string, index: number) => (
                      <Text key={index} color="blue">• {warning}</Text>
                    ))}
                  </Box>
                )}
                
                <Box marginTop={1} padding={1} borderStyle="single" borderColor="green">
                  <Box flexDirection="column">
                    <Text bold color="green">Next Steps:</Text>
                    <Text>1. Use /modelswitch &lt;model-name&gt; to switch models</Text>
                    <Text>2. Use /modelhealth to check model status</Text>
                    <Text>3. Use /modelstatus to view current configuration</Text>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box flexDirection="column">
                <Text color="red">❌ Migration encountered issues:</Text>
                {migrationResult.errors.map((error: string, index: number) => (
                  <Text key={index} color="red">• {error}</Text>
                ))}
                <Box marginTop={1}>
                  <Text dimColor>You may need to configure models manually using /model command</Text>
                </Box>
              </Box>
            )}
            
            <Box marginTop={1}>
              <Text dimColor>(Closing in {migrationResult.success ? '10' : '8'} seconds...)</Text>
            </Box>
          </Box>
        )
      
      default:
        return <Text>Unknown migration state</Text>
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="blue">Model Configuration Migration</Text>
        {isLoading && <Text color="yellow"> (processing...)</Text>}
      </Box>

      {renderContent()}
    </Box>
  )
}

const modelmigrate: Command = {
  name: 'modelmigrate',
  description: 'Migrate from CLI-based model selection to in-app model management',
  aliases: ['migrate-models', 'mm'],
  isEnabled: true,
  isHidden: false,
  userFacingName() {
    return 'modelmigrate'
  },
  type: 'local-jsx',
  call(onDone) {
    return Promise.resolve(<ModelMigrateDisplay onClose={onDone} />)
  },
}

export default modelmigrate