import { Box, Text, useInput } from 'ink'
import * as React from 'react'
import { useState, useCallback } from 'react'
import figures from 'figures'
import { getTheme } from '../utils/theme'
import { getGlobalConfig, ModelPointerType } from '../utils/config.js'
import { getModelManager } from '../utils/model'
import { useExitOnCtrlCD } from '../hooks/useExitOnCtrlCD'
import { ModelSelector } from './ModelSelector'

type Props = {
  onClose: () => void
}

export function ModelListManager({ onClose }: Props): React.ReactNode {
  const config = getGlobalConfig()
  const theme = getTheme()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const exitState = useExitOnCtrlCD(onClose)

  const modelManager = getModelManager()
  const availableModels = modelManager.getAvailableModels()

  // Create menu items: existing models + "Add New Model"
  const menuItems = React.useMemo(() => {
    const modelItems = availableModels.map(model => ({
      id: model.modelName,
      name: model.name,
      provider: model.provider,
      usedBy: getModelUsage(model.modelName),
      type: 'model' as const,
    }))

    return [
      ...modelItems,
      {
        id: 'add-new',
        name: '+ Add New Model',
        provider: '',
        usedBy: [],
        type: 'action' as const,
      },
    ]
  }, [availableModels, config.modelPointers, refreshKey])

  // Check which pointers are using this model
  function getModelUsage(modelName: string): ModelPointerType[] {
    const usage: ModelPointerType[] = []
    const pointers: ModelPointerType[] = ['main', 'task', 'reasoning', 'quick']

    pointers.forEach(pointer => {
      if (config.modelPointers?.[pointer] === modelName) {
        usage.push(pointer)
      }
    })

    return usage
  }

  const handleDeleteModel = (modelName: string) => {
    // Remove the model
    modelManager.removeModel(modelName)

    // The removeModel function should already clear the pointers,
    // but let's ensure UI refreshes
    setRefreshKey(prev => prev + 1)
    setIsDeleteMode(false)
  }

  const handleAddNewModel = () => {
    setShowModelSelector(true)
  }

  const handleModelConfigurationComplete = () => {
    setShowModelSelector(false)
    setRefreshKey(prev => prev + 1)
  }

  // Handle keyboard input
  const handleInput = useCallback(
    (input: string, key: any) => {
      if (key.escape) {
        if (isDeleteMode) {
          setIsDeleteMode(false)
        } else {
          onClose()
        }
      } else if (input === 'd' && !isDeleteMode && availableModels.length > 1) {
        setIsDeleteMode(true)
      } else if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1))
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(menuItems.length - 1, prev + 1))
      } else if (key.return || input === ' ') {
        const item = menuItems[selectedIndex]

        if (isDeleteMode && item.type === 'model') {
          // Prevent deleting the last model
          if (availableModels.length <= 1) {
            setIsDeleteMode(false) // Exit delete mode
            return
          }
          handleDeleteModel(item.id)
        } else if (item.type === 'action') {
          handleAddNewModel()
        }
        // Note: Remove any pointer switching functionality here
      }
    },
    [selectedIndex, menuItems, onClose, isDeleteMode, availableModels.length],
  )

  useInput(handleInput)

  // If showing ModelSelector, render it directly
  if (showModelSelector) {
    return (
      <ModelSelector
        onDone={handleModelConfigurationComplete}
        onCancel={handleModelConfigurationComplete}
        skipModelType={true}
        isOnboarding={false}
        abortController={new AbortController()}
      />
    )
  }

  // Main model list screen
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isDeleteMode ? 'red' : theme.secondaryBorder}
      paddingX={1}
      marginTop={1}
    >
      <Box flexDirection="column" minHeight={2} marginBottom={1}>
        <Text bold color={isDeleteMode ? 'red' : undefined}>
          Manage Model List{isDeleteMode ? ' - DELETE MODE' : ''}
          {exitState.pending
            ? ` (press ${exitState.keyName} again to exit)`
            : ''}
        </Text>
        <Text dimColor>
          {isDeleteMode
            ? availableModels.length <= 1
              ? 'Cannot delete the last model, Esc to cancel'
              : 'Press Enter/Space to DELETE selected model, Esc to cancel'
            : 'Navigate: ↑↓ | Select: Enter | Delete: d | Exit: Esc'}
        </Text>
      </Box>

      {menuItems.map((item, i) => {
        const isSelected = i === selectedIndex

        return (
          <Box key={item.id} flexDirection="column" marginBottom={1}>
            <Box>
              <Box width={50}>
                <Text
                  color={
                    isSelected ? (isDeleteMode ? 'red' : 'blue') : undefined
                  }
                >
                  {isSelected ? figures.pointer : ' '} {item.name}
                </Text>
              </Box>
              <Box>
                {item.type === 'model' && (
                  <>
                    <Text color={theme.secondaryText}>({item.provider})</Text>
                    {item.usedBy.length > 0 && (
                      <Box marginLeft={1}>
                        <Text color={theme.success}>
                          [Active: {item.usedBy.join(', ')}]
                        </Text>
                      </Box>
                    )}
                    {item.usedBy.length === 0 && (
                      <Box marginLeft={1}>
                        <Text color={theme.secondaryText}>
                          [Available]
                        </Text>
                      </Box>
                    )}
                  </>
                )}
                {item.type === 'action' && (
                  <Text color={theme.suggestion}>
                    {isSelected ? '[Press Enter to add new model]' : ''}
                  </Text>
                )}
              </Box>
            </Box>
            {isSelected && item.type === 'action' && (
              <Box paddingLeft={2} marginTop={1}>
                <Text dimColor>
                  Configure a new model and add it to your library
                </Text>
              </Box>
            )}
          </Box>
        )
      })}

      <Box
        marginTop={1}
        paddingTop={1}
        borderTopColor={theme.secondaryBorder}
        borderTopStyle="single"
      >
        <Text dimColor>
          {isDeleteMode
            ? availableModels.length <= 1
              ? 'Cannot delete the last model - press Esc to cancel'
              : 'DELETE MODE: Press Enter/Space to delete model, Esc to cancel'
            : availableModels.length <= 1
              ? 'Use ↑/↓ to navigate, Enter to add new, Esc to exit (cannot delete last model)'
              : 'Use ↑/↓ to navigate, d to delete model, Enter to add new, Esc to exit'}
        </Text>
      </Box>
    </Box>
  )
}
