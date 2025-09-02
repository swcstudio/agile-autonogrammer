import React, { useState, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'

// Simplified ModelSelector component for now
// This will integrate with ModelContext once context is integrated into REPL

export interface ModelSelectorProps {
  isVisible: boolean
  onClose: () => void
  onModelSelected: (modelName: string) => void
  availableModels?: Array<{ name: string, provider: string, status: string }>
  currentModel?: string
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  isVisible,
  onClose,
  onModelSelected,
  availableModels = [],
  currentModel
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Handle keyboard input
  useInput((input, key) => {
    if (!isVisible) return

    // Close selector
    if (key.escape || input === 'q') {
      onClose()
      return
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1))
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(availableModels.length - 1, prev + 1))
    }
    
    // Model selection
    else if (key.return || input === ' ') {
      const selectedModel = availableModels[selectedIndex]
      if (selectedModel) {
        onModelSelected(selectedModel.name)
        onClose()
      }
    }
  })

  if (!isVisible) return null

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="blue">Model Selection</Text>
      </Box>

      {availableModels.length === 0 ? (
        <Box>
          <Text color="red">No models configured. Use /model command to add models.</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {availableModels.map((model, index) => {
            const isSelected = index === selectedIndex
            const isCurrent = model.name === currentModel
            
            return (
              <Box key={model.name} flexDirection="row" justifyContent="space-between">
                <Box flexDirection="row" gap={1}>
                  <Text color={isSelected ? 'blue' : undefined}>
                    {isSelected ? '>' : ' '}
                  </Text>
                  <Text bold={isCurrent}>
                    {model.name}
                  </Text>
                  {isCurrent && <Text color="green">(current)</Text>}
                  <Text dimColor>
                    [{model.provider}]
                  </Text>
                </Box>
                <Text color={model.status === 'online' ? 'green' : 'gray'}>
                  ● {model.status}
                </Text>
              </Box>
            )
          })}
        </Box>
      )}

      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text bold>Controls:</Text>
        <Text dimColor>↑/↓ or j/k: Navigate models</Text>
        <Text dimColor>Enter/Space: Select model</Text>
        <Text dimColor>q/Esc: Close</Text>
      </Box>
    </Box>
  )
}

export default ModelSelector