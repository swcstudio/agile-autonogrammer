import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Command } from '../commands'
import { getModelManager } from '../utils/model'

interface ModelHealthResult {
  modelName: string
  name: string
  provider: string
  status: 'online' | 'offline' | 'error' | 'checking'
  latency?: number
  error?: string
}

interface ModelHealthDisplayProps {
  onClose: () => void
}

const ModelHealthDisplay: React.FC<ModelHealthDisplayProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [results, setResults] = useState<ModelHealthResult[]>([])

  useEffect(() => {
    async function checkHealth() {
      try {
        const manager = getModelManager()
        const models = manager.getAvailableModels()
        
        if (models.length === 0) {
          setIsLoading(false)
          return
        }

        // Initialize results with "checking" status
        const initialResults: ModelHealthResult[] = models.map(model => ({
          modelName: model.modelName,
          name: model.name,
          provider: model.provider,
          status: 'checking'
        }))
        setResults(initialResults)

        // Check each model health
        const healthChecks = models.map(async (model, index) => {
          try {
            if (model.provider === 'self-hosted' && model.baseURL) {
              // Check self-hosted model health
              const startTime = Date.now()
              
              // Load API key
              let apiKey = ''
              try {
                const fs = require('fs')
                const configPath = '/home/ubuntu/workspace/.auth/auth_config.json'
                if (fs.existsSync(configPath)) {
                  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                  const models = config.deployment?.models
                  
                  if (model.modelName.includes('42b')) {
                    apiKey = models?.['qwen3-42b']?.api_key || ''
                  } else if (model.modelName.includes('moe')) {
                    apiKey = models?.['qwen3-moe']?.api_key || ''
                  }
                }
              } catch (error) {
                setResults(prev => prev.map((r, i) => i === index ? {
                  ...r,
                  status: 'error' as const,
                  error: 'Failed to load API key'
                } : r))
                return
              }
              
              if (!apiKey) {
                setResults(prev => prev.map((r, i) => i === index ? {
                  ...r,
                  status: 'error' as const,
                  error: 'No API key configured'
                } : r))
                return
              }
              
              // Health check with authentication
              const response = await fetch(`${model.baseURL}/health`, {
                method: 'GET',
                headers: {
                  'X-API-Key': apiKey,
                  'User-Agent': 'agile-programmers/2.0.0'
                },
                signal: AbortSignal.timeout(5000)
              })
              
              const latency = Date.now() - startTime
              
              if (response.ok) {
                setResults(prev => prev.map((r, i) => i === index ? {
                  ...r,
                  status: 'online' as const,
                  latency
                } : r))
              } else {
                setResults(prev => prev.map((r, i) => i === index ? {
                  ...r,
                  status: 'error' as const,
                  error: `HTTP ${response.status}`,
                  latency
                } : r))
              }
            } else {
              // Cloud models - assume online
              setResults(prev => prev.map((r, i) => i === index ? {
                ...r,
                status: 'online' as const,
                latency: 50 // Estimated latency for cloud models
              } : r))
            }
          } catch (error) {
            setResults(prev => prev.map((r, i) => i === index ? {
              ...r,
              status: 'offline' as const,
              error: error instanceof Error ? error.message : 'Connection failed'
            } : r))
          }
        })

        await Promise.allSettled(healthChecks)
        
      } catch (error) {
        console.error('Health check error:', error)
      } finally {
        setIsLoading(false)
        // Auto-close after 10 seconds
        setTimeout(() => {
          onClose()
        }, 10000)
      }
    }

    checkHealth()
  }, [onClose])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'green'
      case 'offline': return 'red'
      case 'error': return 'red'
      case 'checking': return 'yellow'
      default: return 'gray'
    }
  }

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case 'online': return '●'
      case 'offline': return '●'
      case 'error': return '●'
      case 'checking': return '◐'
      default: return '◯'
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="blue">Model Health Status</Text>
        {isLoading && <Text color="yellow"> (checking...)</Text>}
      </Box>

      {results.length === 0 ? (
        <Text color="red">No models configured. Use /model to add models.</Text>
      ) : (
        <Box flexDirection="column">
          {results.map((result, index) => (
            <Box key={result.modelName} flexDirection="row" justifyContent="space-between" marginBottom={1}>
              <Box flexDirection="row" gap={1}>
                <Text bold>{result.name}</Text>
                <Text dimColor>[{result.provider}]</Text>
              </Box>
              
              <Box flexDirection="row" gap={1}>
                <Text color={getStatusColor(result.status)}>
                  {getStatusSymbol(result.status)}
                </Text>
                
                <Text color={getStatusColor(result.status)}>
                  {result.status}
                </Text>
                
                {result.latency && (
                  <Text dimColor>({result.latency}ms)</Text>
                )}
                
                {result.error && (
                  <Text color="red">- {result.error}</Text>
                )}
              </Box>
            </Box>
          ))}
          
          <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
            <Box flexDirection="column">
              <Text bold>Legend:</Text>
              <Text><Text color="green">● online</Text> - Model is responding</Text>
              <Text><Text color="red">● offline</Text> - Model is not reachable</Text>
              <Text><Text color="red">● error</Text> - Model returned an error</Text>
              <Text><Text color="yellow">◐ checking</Text> - Health check in progress</Text>
            </Box>
          </Box>
          
          <Box marginTop={1}>
            <Text dimColor>(Auto-closing in 10 seconds...)</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}

const modelhealth: Command = {
  name: 'modelhealth',
  description: 'Check health status of all configured models',
  aliases: ['health', 'mh'],
  isEnabled: true,
  isHidden: false,
  userFacingName() {
    return 'modelhealth'
  },
  type: 'local-jsx',
  call(onDone) {
    return Promise.resolve(<ModelHealthDisplay onClose={onDone} />)
  },
}

export default modelhealth