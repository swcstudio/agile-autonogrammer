/**
 * Enhanced OAuth Flow Component
 * Supports multiple providers with manual code copy/paste functionality
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from './TextInput'
import { SimpleSpinner } from './Spinner'
import { getTheme } from '../utils/theme'
import { authBridge } from '../services/multiProviderAuthBridge'
import { codeCopyBack } from '../services/codeCopyBackInterface'
import { AuthFlowState, AuthCode } from '../types/multiProviderAuth'
import { ProviderType } from '../utils/config'
import { logEvent } from '../services/statsig'
import { sendNotification } from '../services/notifier'
import clipboardy from 'clipboardy'

interface EnhancedOAuthProps {
  provider: ProviderType
  onComplete: (result: any) => void
  onCancel?: () => void
}

export const EnhancedOAuthFlow: React.FC<EnhancedOAuthProps> = ({
  provider,
  onComplete,
  onCancel,
}) => {
  const theme = getTheme()
  const [flowState, setFlowState] = useState<AuthFlowState>(AuthFlowState.IDLE)
  const [authCode, setAuthCode] = useState<AuthCode | null>(null)
  const [pastedCode, setPastedCode] = useState('')
  const [cursorOffset, setCursorOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number>(300) // 5 minutes
  
  // Start authentication flow
  const startFlow = useCallback(async () => {
    try {
      setFlowState(AuthFlowState.INITIATING)
      setError(null)
      
      const result = await authBridge.initiateProviderAuth(provider)
      
      if (result.success && result.requiresManualStep) {
        // Generate code for copying
        const code = await codeCopyBack.generateAuthCode(provider)
        setAuthCode(code)
        setFlowState(AuthFlowState.WAITING_FOR_CODE)
        
        // Try to copy to clipboard
        try {
          await clipboardy.write(code.code)
          setCopySuccess(true)
          sendNotification({
            message: `Authentication code copied to clipboard for ${provider}`,
          })
        } catch (err) {
          // Clipboard access failed, user will need to copy manually
          setCopySuccess(false)
        }
        
        logEvent('enhanced_oauth_manual_flow_started', { provider })
      } else if (result.success) {
        // Standard OAuth flow completed
        setFlowState(AuthFlowState.AUTHENTICATED)
        onComplete(result)
      } else {
        setError(result.error || 'Authentication failed')
        setFlowState(AuthFlowState.FAILED)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start authentication')
      setFlowState(AuthFlowState.FAILED)
    }
  }, [provider, onComplete])
  
  // Handle manual code entry
  const handleManualCodeEntry = useCallback(async (code: string) => {
    try {
      setFlowState(AuthFlowState.VALIDATING)
      setError(null)
      
      const result = await codeCopyBack.acceptPastedCode(code, provider)
      
      if (result.valid) {
        setFlowState(AuthFlowState.AUTHENTICATED)
        sendNotification({
          message: `Successfully authenticated with ${provider}`,
        })
        onComplete(result)
        
        logEvent('enhanced_oauth_manual_success', { provider })
      } else {
        setError(result.error || 'Invalid code')
        setFlowState(AuthFlowState.WAITING_FOR_CODE)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
      setFlowState(AuthFlowState.WAITING_FOR_CODE)
    }
  }, [provider, onComplete])
  
  // Update remaining time
  useEffect(() => {
    if (flowState === AuthFlowState.WAITING_FOR_CODE && authCode) {
      const interval = setInterval(() => {
        const remaining = codeCopyBack.getRemainingTime(authCode.code)
        setRemainingTime(remaining)
        
        if (remaining <= 0) {
          setError('Code expired. Please start a new authentication flow.')
          setFlowState(AuthFlowState.FAILED)
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [flowState, authCode])
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape && onCancel) {
      onCancel()
    } else if (key.return) {
      if (flowState === AuthFlowState.IDLE) {
        startFlow()
      } else if (flowState === AuthFlowState.FAILED && error) {
        // Retry
        setFlowState(AuthFlowState.IDLE)
        setError(null)
        startFlow()
      }
    }
  })
  
  // Auto-start on mount
  useEffect(() => {
    if (flowState === AuthFlowState.IDLE) {
      startFlow()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Format remaining time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Render different states
  const renderContent = () => {
    switch (flowState) {
      case AuthFlowState.INITIATING:
        return (
          <Box>
            <SimpleSpinner />
            <Text> Initiating authentication with {provider}...</Text>
          </Box>
        )
      
      case AuthFlowState.WAITING_FOR_CODE:
        return (
          <Box flexDirection="column" gap={1}>
            {authCode && (
              <>
                <Box flexDirection="column" borderStyle="round" padding={1}>
                  <Text bold color={theme.primary}>
                    Step 1: Copy this authentication code
                  </Text>
                  <Box marginTop={1}>
                    <Box borderStyle="single" padding={1}>
                      <Text color="cyan" bold>{authCode.code}</Text>
                    </Box>
                  </Box>
                  {copySuccess && (
                    <Text color={theme.success} dimColor>
                      ✓ Code copied to clipboard
                    </Text>
                  )}
                  <Text color={theme.muted} dimColor>
                    Expires in: {formatTime(remainingTime)}
                  </Text>
                </Box>
                
                <Box flexDirection="column" borderStyle="round" padding={1}>
                  <Text bold color={theme.primary}>
                    Step 2: Authenticate with {provider}
                  </Text>
                  <Text color={theme.muted}>
                    1. Go to your {provider} interface
                  </Text>
                  <Text color={theme.muted}>
                    2. Log in with your Pro account
                  </Text>
                  <Text color={theme.muted}>
                    3. When prompted, paste the code above
                  </Text>
                  <Text color={theme.muted}>
                    4. Copy the response code provided
                  </Text>
                </Box>
                
                <Box flexDirection="column" borderStyle="round" padding={1}>
                  <Text bold color={theme.primary}>
                    Step 3: Paste the response code here
                  </Text>
                  <Box marginTop={1}>
                    <Text>Response code: </Text>
                    <TextInput
                      value={pastedCode}
                      onChange={setPastedCode}
                      onSubmit={handleManualCodeEntry}
                      cursorOffset={cursorOffset}
                      onChangeCursorOffset={setCursorOffset}
                      placeholder="Paste code and press Enter..."
                    />
                  </Box>
                </Box>
              </>
            )}
            
            {error && (
              <Box marginTop={1}>
                <Text color={theme.error}>⚠ {error}</Text>
              </Box>
            )}
          </Box>
        )
      
      case AuthFlowState.VALIDATING:
        return (
          <Box>
            <SimpleSpinner />
            <Text> Validating authentication code...</Text>
          </Box>
        )
      
      case AuthFlowState.AUTHENTICATED:
        return (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.success} bold>
              ✓ Successfully authenticated with {provider}!
            </Text>
            <Text color={theme.muted}>
              Your session is now active and ready to use.
            </Text>
          </Box>
        )
      
      case AuthFlowState.FAILED:
        return (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.error} bold>
              ✗ Authentication failed
            </Text>
            {error && (
              <Text color={theme.error}>{error}</Text>
            )}
            <Text color={theme.muted}>
              Press Enter to retry or Escape to cancel
            </Text>
          </Box>
        )
      
      default:
        return null
    }
  }
  
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          🔐 Enhanced Multi-Provider Authentication
        </Text>
      </Box>
      
      {renderContent()}
      
      <Box marginTop={1}>
        <Text dimColor>
          Provider: {provider} | Status: {flowState}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Multi-Provider Authentication Manager Component
 * Manages authentication across multiple providers
 */
interface MultiProviderAuthProps {
  providers: ProviderType[]
  onComplete: (results: Map<ProviderType, any>) => void
  onCancel?: () => void
}

export const MultiProviderAuth: React.FC<MultiProviderAuthProps> = ({
  providers,
  onComplete,
  onCancel,
}) => {
  const theme = getTheme()
  const [currentProviderIndex, setCurrentProviderIndex] = useState(0)
  const [authResults, setAuthResults] = useState<Map<ProviderType, any>>(new Map())
  const [completed, setCompleted] = useState(false)
  
  const currentProvider = providers[currentProviderIndex]
  
  const handleProviderComplete = useCallback((result: any) => {
    // Store result for this provider
    authResults.set(currentProvider, result)
    
    // Move to next provider or complete
    if (currentProviderIndex < providers.length - 1) {
      setCurrentProviderIndex(currentProviderIndex + 1)
    } else {
      setCompleted(true)
      onComplete(authResults)
    }
  }, [currentProvider, currentProviderIndex, providers.length, authResults, onComplete])
  
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    }
  }, [onCancel])
  
  if (completed) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.success} bold>
          ✓ All providers authenticated successfully!
        </Text>
        <Box marginTop={1}>
          {Array.from(authResults.keys()).map(provider => (
            <Text key={provider} color={theme.muted}>
              • {provider}: Authenticated
            </Text>
          ))}
        </Box>
      </Box>
    )
  }
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} padding={1}>
        <Text bold>
          Authenticating {currentProviderIndex + 1} of {providers.length} providers
        </Text>
      </Box>
      
      <EnhancedOAuthFlow
        provider={currentProvider}
        onComplete={handleProviderComplete}
        onCancel={handleCancel}
      />
      
      <Box marginTop={1} padding={1}>
        <Text dimColor>
          Progress: [
          {providers.map((p, i) => {
            if (i < currentProviderIndex) return '✓'
            if (i === currentProviderIndex) return '●'
            return '○'
          }).join(' ')}
          ]
        </Text>
      </Box>
    </Box>
  )
}