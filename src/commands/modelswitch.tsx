import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Command } from '../commands'
import { getModelManager, reloadModelManager } from '../utils/model'
import { triggerModelConfigChange } from '../messages'

interface ModelSwitchDisplayProps {
  targetModel?: string
  onClose: () => void
}

const ModelSwitchDisplay: React.FC<ModelSwitchDisplayProps> = ({ 
  targetModel, 
  onClose 
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    model?: any
  } | null>(null)

  useEffect(() => {
    async function switchModel() {
      try {
        const manager = getModelManager()
        
        if (!targetModel) {
          // Show available models if no target specified
          const available = manager.getAvailableModels()
          const current = manager.getCurrentModel()
          
          setResult({
            success: true,
            message: `Current model: ${current || 'None'}\n\nAvailable models:\n${
              available.length > 0 
                ? available.map(m => `  • ${m.name} [${m.provider}] ${m.isActive ? '(active)' : '(inactive)'}`).join('\n')
                : '  No models configured'
            }\n\nUsage: /modelswitch <model-name>`
          })
        } else {
          // Switch to specified model
          const switchResult = manager.switchToModel(targetModel)
          
          if (switchResult.success && switchResult.model) {
            // Trigger UI refresh
            reloadModelManager()
            triggerModelConfigChange()
            
            setResult({
              success: true,
              message: `✅ Switched to model: ${switchResult.model.name} [${switchResult.model.provider}]`,
              model: switchResult.model
            })
          } else {
            setResult({
              success: false,
              message: `❌ ${switchResult.error || 'Failed to switch model'}`
            })
          }
        }
      } catch (error) {
        setResult({
          success: false,
          message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      } finally {
        setIsLoading(false)
        // Auto-close after 3 seconds if successful
        setTimeout(() => {
          onClose()
        }, 3000)
      }
    }

    switchModel()
  }, [targetModel, onClose])

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="blue">Model Switch</Text>
        {isLoading && <Text color="yellow"> (switching...)</Text>}
      </Box>

      {isLoading ? (
        <Text>Switching models...</Text>
      ) : result ? (
        <Box flexDirection="column">
          <Text color={result.success ? 'green' : 'red'}>
            {result.message}
          </Text>
          
          {result.model && (
            <Box marginTop={1} padding={1} borderStyle="single" borderColor="green">
              <Box flexDirection="column">
                <Text bold>Model Details:</Text>
                <Text>Name: {result.model.name}</Text>
                <Text>Provider: {result.model.provider}</Text>
                <Text>Context: {result.model.contextLength?.toLocaleString() || 'Unknown'} tokens</Text>
                <Text>Max Output: {result.model.maxTokens?.toLocaleString() || 'Unknown'} tokens</Text>
              </Box>
            </Box>
          )}
          
          <Box marginTop={1}>
            <Text dimColor>(Closing in 3 seconds...)</Text>
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}

const modelswitch: Command = {
  name: 'modelswitch',
  description: 'Switch to a different model quickly',
  aliases: ['switch', 'sm'],
  isEnabled: true,
  isHidden: false,
  userFacingName() {
    return 'modelswitch'
  },
  type: 'local-jsx',
  call(onDone, context, ...args) {
    const targetModel = args[0]
    return Promise.resolve(
      <ModelSwitchDisplay 
        targetModel={targetModel} 
        onClose={onDone} 
      />
    )
  },
}

export default modelswitch