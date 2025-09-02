import { Box, Text, useInput } from 'ink'
import * as React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import figures from 'figures'
import { getTheme } from '../utils/theme'
import {
  getGlobalConfig,
  saveGlobalConfig,
  ModelPointerType,
  setModelPointer,
} from '../utils/config.js'
import { getModelManager } from '../utils/model'
import { useExitOnCtrlCD } from '../hooks/useExitOnCtrlCD'
import { ModelSelector } from './ModelSelector'
import { ModelListManager } from './ModelListManager'
import { detectLegacyModelConfig } from '../utils/modelConfigMigration'

type Props = {
  onClose: () => void
}

type ModelPointerSetting = {
  id: ModelPointerType | 'add-new'
  label: string
  description: string
  value: string
  options: Array<{ id: string; name: string }>
  type: 'modelPointer' | 'action'
  onChange(value?: string): void
}

export function ModelConfig({ onClose }: Props): React.ReactNode {
  const config = getGlobalConfig()
  const theme = getTheme()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showModelListManager, setShowModelListManager] = useState(false)
  const [currentPointer, setCurrentPointer] = useState<ModelPointerType | null>(
    null,
  )
  const [refreshKey, setRefreshKey] = useState(0) // 添加刷新键来强制更新
  const [isDeleteMode, setIsDeleteMode] = useState(false) // 保留用于清空指针的删除模式
  const [showMigrationBanner, setShowMigrationBanner] = useState(false) // Show migration banner
  const selectedIndexRef = useRef(selectedIndex) // 用ref保持焦点状态
  const exitState = useExitOnCtrlCD(() => process.exit(0))

  const modelManager = getModelManager()

  // 同步 selectedIndex 到 ref
  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  // Check for legacy configuration on mount
  useEffect(() => {
    const hasLegacyConfig = detectLegacyModelConfig()
    setShowMigrationBanner(hasLegacyConfig)
  }, [])

  // Get available models for cycling (memoized) - without "Add New Model" option
  const availableModels = React.useMemo((): Array<{
    id: string
    name: string
  }> => {
    const profiles = modelManager.getAvailableModels()
    return profiles.map(p => ({ id: p.modelName, name: p.name }))
  }, [modelManager, refreshKey]) // 依赖refreshKey来强制更新

  // Create menu items: model pointers + "Add New Model" as separate item
  const menuItems = React.useMemo(() => {
    const modelSettings: ModelPointerSetting[] = [
      {
        id: 'main',
        label: 'Main Model',
        description: 'Primary model for general tasks and conversations',
        value: config.modelPointers?.main || '',
        options: availableModels,
        type: 'modelPointer' as const,
        onChange: (value: string) => handleModelPointerChange('main', value),
      },
      {
        id: 'task',
        label: 'Task Model',
        description: 'Model for TaskTool sub-agents and automation',
        value: config.modelPointers?.task || '',
        options: availableModels,
        type: 'modelPointer' as const,
        onChange: (value: string) => handleModelPointerChange('task', value),
      },
      {
        id: 'reasoning',
        label: 'Reasoning Model',
        description: 'Model optimized for complex reasoning tasks',
        value: config.modelPointers?.reasoning || '',
        options: availableModels,
        type: 'modelPointer' as const,
        onChange: (value: string) =>
          handleModelPointerChange('reasoning', value),
      },
      {
        id: 'quick',
        label: 'Quick Model',
        description: 'Fast model for simple operations and utilities',
        value: config.modelPointers?.quick || '',
        options: availableModels,
        type: 'modelPointer' as const,
        onChange: (value: string) => handleModelPointerChange('quick', value),
      },
    ]

    // Add menu actions as separate menu items
    const actions: ModelPointerSetting[] = []
    
    // Add migration option if legacy config detected
    if (showMigrationBanner) {
      actions.push({
        id: 'migrate-config',
        label: '🚀 Migrate Configuration',
        description: 'Migrate from CLI-based model selection to in-app management',
        value: '',
        options: [],
        type: 'action' as const,
        onChange: () => handleMigrateConfig(),
      })
    }
    
    actions.push({
      id: 'manage-models',
      label: 'Manage Model List',
      description: 'View, add, and delete model configurations',
      value: '',
      options: [],
      type: 'action' as const,
      onChange: () => handleManageModels(),
    })

    return [
      ...modelSettings,
      ...actions,
    ]
  }, [config.modelPointers, availableModels, refreshKey, showMigrationBanner])

  const handleModelPointerChange = (
    pointer: ModelPointerType,
    modelId: string,
  ) => {
    // Direct model assignment
    setModelPointer(pointer, modelId)
    // Force re-render to show updated assignment
    setRefreshKey(prev => prev + 1)
  }

  const handleManageModels = () => {
    // Launch ModelListManager for model library management
    setShowModelListManager(true)
  }

  const handleMigrateConfig = () => {
    // Close current model config and launch migration
    onClose()
    // Note: The actual migration command would be launched by the caller
    // This is just a placeholder to close the current interface
  }

  const handleModelConfigurationComplete = () => {
    // Model configuration is complete, return to model config screen
    setShowModelSelector(false)
    setShowModelListManager(false)
    setCurrentPointer(null)
    // 触发组件刷新，重新加载可用模型列表
    setRefreshKey(prev => prev + 1)
    // 将焦点重置到 "Manage Model Library" 选项
    const manageIndex = menuItems.findIndex(item => item.id === 'manage-models')
    if (manageIndex !== -1) {
      setSelectedIndex(manageIndex)
    }
  }

  // Handle keyboard input - completely following Config component pattern
  const handleInput = useCallback(
    (input: string, key: any) => {
      if (key.escape) {
        if (isDeleteMode) {
          setIsDeleteMode(false) // Exit delete mode
        } else {
          onClose()
        }
      } else if (input === 'd' && !isDeleteMode) {
        setIsDeleteMode(true) // Enter delete mode
      } else if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1))
      } else if (key.downArrow) {
        setSelectedIndex(prev => Math.min(menuItems.length - 1, prev + 1))
      } else if (key.return || input === ' ') {
        const setting = menuItems[selectedIndex]

        if (isDeleteMode && setting.type === 'modelPointer' && setting.value) {
          // Delete mode: clear the pointer assignment (not delete the model config)
          setModelPointer(setting.id as ModelPointerType, '')
          setRefreshKey(prev => prev + 1)
          setIsDeleteMode(false) // Exit delete mode after clearing assignment
        } else if (setting.type === 'modelPointer') {
          // Normal mode: cycle through available models
          if (setting.options.length === 0) {
            // No models available, redirect to model library management
            handleManageModels()
            return
          }
          const currentIndex = setting.options.findIndex(
            opt => opt.id === setting.value,
          )
          const nextIndex = (currentIndex + 1) % setting.options.length
          const nextOption = setting.options[nextIndex]
          if (nextOption) {
            setting.onChange(nextOption.id)
          }
        } else if (setting.type === 'action') {
          // Execute action (like "Add New Model")
          setting.onChange()
        }
      }
    },
    [selectedIndex, menuItems, onClose, isDeleteMode, modelManager],
  )

  useInput(handleInput)

  // If showing ModelListManager, render it directly
  if (showModelListManager) {
    return <ModelListManager onClose={handleModelConfigurationComplete} />
  }

  // If showing ModelSelector, render it directly
  if (showModelSelector) {
    return (
      <ModelSelector
        onDone={handleModelConfigurationComplete}
        onCancel={handleModelConfigurationComplete} // Same as onDone - return to ModelConfig
        skipModelType={true}
        targetPointer={currentPointer || undefined}
        isOnboarding={false}
        abortController={new AbortController()}
      />
    )
  }

  // Main configuration screen - completely following Config component layout
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.secondaryBorder}
      paddingX={1}
      marginTop={1}
    >
      <Box flexDirection="column" minHeight={2} marginBottom={1}>
        <Text bold>
          Model Configuration{isDeleteMode ? ' - CLEAR MODE' : ''}
        </Text>
        <Text dimColor>
          {isDeleteMode
            ? 'Press Enter/Space to clear selected pointer assignment, Esc to cancel'
            : availableModels.length === 0
              ? 'No models configured. Use "Configure New Model" to add your first model.'
              : 'Configure which models to use for different tasks. Space to cycle, Enter to configure.'}
        </Text>
        {showMigrationBanner && !isDeleteMode && (
          <Box 
            flexDirection="column" 
            padding={1}
            marginTop={1}
            borderStyle="single"
            borderColor="yellow"
          >
            <Text color="yellow" bold>🚀 Migration Available!</Text>
            <Text dimColor>
              Legacy CLI-based model selection detected. Migrate to new in-app model management 
              for instant switching, health monitoring, and persistent preferences.
            </Text>
          </Box>
        )}
      </Box>

      {menuItems.map((setting, i) => {
        const isSelected = i === selectedIndex
        let displayValue = ''
        let actionText = ''

        if (setting.type === 'modelPointer') {
          const currentModel = setting.options.find(
            opt => opt.id === setting.value,
          )
          displayValue = currentModel?.name || '(not configured)'
          actionText = isSelected ? ' [Space to cycle]' : ''
        } else if (setting.type === 'action') {
          displayValue = ''
          actionText = isSelected ? ' [Enter to configure]' : ''
        }

        return (
          <Box key={setting.id} flexDirection="column">
            <Box>
              <Box width={44}>
                <Text color={isSelected ? 'blue' : undefined}>
                  {isSelected ? figures.pointer : ' '} {setting.label}
                </Text>
              </Box>
              <Box>
                {setting.type === 'modelPointer' && (
                  <Text
                    color={
                      displayValue !== '(not configured)'
                        ? theme.success
                        : theme.warning
                    }
                  >
                    {displayValue}
                  </Text>
                )}
                {actionText && <Text color="blue">{actionText}</Text>}
              </Box>
            </Box>
            {isSelected && (
              <Box paddingLeft={2} marginBottom={1}>
                <Text dimColor>{setting.description}</Text>
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
            ? 'CLEAR MODE: Press Enter/Space to clear assignment, Esc to cancel'
            : availableModels.length === 0
              ? 'Use ↑/↓ to navigate, Enter to configure new model, Esc to exit'
              : 'Use ↑/↓ to navigate, Space to cycle models, Enter to configure, d to clear, Esc to exit'}
        </Text>
      </Box>
    </Box>
  )
}
