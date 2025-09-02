/**
 * Multi-Provider Authentication Command
 * Allows users to authenticate with multiple AI providers
 */

import React from 'react'
import { Box, Text } from 'ink'
import { MultiProviderAuth } from '../components/EnhancedOAuthFlow'
import { ProviderType } from '../utils/config'
import { getTheme } from '../utils/theme'
import { authBridge } from '../services/multiProviderAuthBridge'

interface MultiAuthCommandProps {
  providers?: string[]
  onComplete: () => void
}

export const MultiAuthCommand: React.FC<MultiAuthCommandProps> = ({
  providers = ['anthropic', 'google', 'openai'],
  onComplete,
}) => {
  const theme = getTheme()
  
  const handleComplete = (results: Map<ProviderType, any>) => {
    console.log('Authentication completed for all providers:', results)
    
    // Show summary
    const authenticated = authBridge.getActiveProviders()
    console.log('Active providers:', authenticated)
    
    onComplete()
  }
  
  const handleCancel = () => {
    console.log('Authentication cancelled')
    onComplete()
  }
  
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          🔐 Multi-Provider Authentication Setup
        </Text>
      </Box>
      
      <Text color={theme.muted}>
        This will help you authenticate with multiple AI providers to use your Pro subscriptions.
      </Text>
      
      <Box marginTop={1}>
        <MultiProviderAuth
          providers={providers as ProviderType[]}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </Box>
    </Box>
  )
}

// Export command registration
export const multiAuthCommand = {
  name: 'multiauth',
  description: 'Authenticate with multiple AI providers',
  component: MultiAuthCommand,
}