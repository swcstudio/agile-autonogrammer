/**
 * Multi-Provider Authentication Bridge
 * Core service for managing authentication across multiple AI providers
 */

import { EventEmitter } from 'events'
import { randomBytes, createHash } from 'crypto'
import {
  AuthFlowState,
  AuthFlowResult,
  ValidationResult,
  BridgeResult,
  SessionStatus,
  SyncResult,
  ProviderAuthConfig,
  SessionToken,
  AuthCode,
  Session,
  AuthEvent,
  SecurityEvent,
  AuthMethod,
} from '../types/multiProviderAuth'
import { ProviderType } from '../utils/config'
import { logEvent } from './statsig'
import { logError } from '../utils/log'

export class MultiProviderAuthBridge extends EventEmitter {
  private authenticationFlows: Map<ProviderType, AuthFlowState>
  private activeProviders: Set<ProviderType>
  private sessionTokens: Map<ProviderType, SessionToken>
  private providerConfigs: Map<ProviderType, ProviderAuthConfig>
  private pendingCodes: Map<string, AuthCode>
  
  constructor() {
    super()
    this.authenticationFlows = new Map()
    this.activeProviders = new Set()
    this.sessionTokens = new Map()
    this.providerConfigs = new Map()
    this.pendingCodes = new Map()
    
    this.initializeProviderConfigs()
  }
  
  /**
   * Initialize provider configurations
   */
  private initializeProviderConfigs(): void {
    // Anthropic/Claude configuration
    this.providerConfigs.set('anthropic', {
      provider: 'anthropic',
      authType: 'oauth',
      displayName: 'Claude (Anthropic)',
      endpoints: {
        auth: 'https://console.anthropic.com/oauth/authorize',
        token: 'https://console.anthropic.com/oauth/token',
        refresh: 'https://console.anthropic.com/oauth/refresh',
        validate: 'https://console.anthropic.com/oauth/validate',
      },
      features: {
        supportsCopyPaste: true,
        supportsOAuth: true,
        supportsAPIKey: true,
        requiresManualIntervention: false,
        supportsBridging: true,
        maxSessionDuration: 86400000, // 24 hours
      },
      rateLimits: {
        daily: 1000000,
        hourly: 50000,
        concurrent: 20,
      },
    })
    
    // Google configuration (requires manual bridging)
    this.providerConfigs.set('google', {
      provider: 'google',
      authType: 'manual_bridge',
      displayName: 'Google AI (Gemini)',
      endpoints: {
        bridge: 'manual',
      },
      features: {
        supportsCopyPaste: true,
        supportsOAuth: false,
        supportsAPIKey: false,
        requiresManualIntervention: true,
        supportsBridging: true,
        maxSessionDuration: 7200000, // 2 hours
      },
      rateLimits: {
        daily: 500000,
        hourly: 25000,
        concurrent: 10,
      },
    })
    
    // OpenAI configuration
    this.providerConfigs.set('openai', {
      provider: 'openai',
      authType: 'api_key',
      displayName: 'OpenAI (GPT)',
      endpoints: {
        auth: 'https://api.openai.com/v1/auth',
        validate: 'https://api.openai.com/v1/models',
      },
      features: {
        supportsCopyPaste: true,
        supportsOAuth: false,
        supportsAPIKey: true,
        requiresManualIntervention: false,
        supportsBridging: true,
        maxSessionDuration: undefined, // API keys don't expire
      },
      rateLimits: {
        daily: 1000000,
        hourly: 50000,
        concurrent: 50,
      },
    })
  }
  
  /**
   * Initiate authentication flow for a provider
   */
  async initiateProviderAuth(provider: ProviderType): Promise<AuthFlowResult> {
    try {
      const config = this.providerConfigs.get(provider)
      if (!config) {
        return {
          success: false,
          provider,
          error: `Provider ${provider} not configured`,
        }
      }
      
      this.authenticationFlows.set(provider, AuthFlowState.INITIATING)
      this.emit('auth:started', { provider })
      
      // Check if manual intervention is required
      if (config.features.requiresManualIntervention) {
        // Generate bridge code for manual copying
        const bridgeCode = await this.generateBridgeCode(provider)
        
        this.authenticationFlows.set(provider, AuthFlowState.WAITING_FOR_CODE)
        
        return {
          success: true,
          provider,
          requiresManualStep: true,
          bridgeCode: bridgeCode.code,
        }
      }
      
      // Standard OAuth or API key flow
      return await this.performStandardAuth(provider, config)
    } catch (error) {
      logError(error)
      this.authenticationFlows.set(provider, AuthFlowState.FAILED)
      
      return {
        success: false,
        provider,
        error: error instanceof Error ? error.message : 'Authentication failed',
      }
    }
  }
  
  /**
   * Generate a secure bridge code for manual copying
   */
  private async generateBridgeCode(provider: ProviderType): Promise<AuthCode> {
    const code = randomBytes(32).toString('base64url')
    const authCode: AuthCode = {
      code,
      provider,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      format: 'base64',
      signature: this.generateSignature(code),
    }
    
    // Store the pending code
    this.pendingCodes.set(code, authCode)
    
    // Set expiration cleanup
    setTimeout(() => {
      this.pendingCodes.delete(code)
    }, 5 * 60 * 1000)
    
    return authCode
  }
  
  /**
   * Generate signature for code verification
   */
  private generateSignature(code: string): string {
    const secret = process.env.AUTH_BRIDGE_SECRET || 'default-secret'
    return createHash('sha256')
      .update(code + secret)
      .digest('hex')
  }
  
  /**
   * Capture and validate external code from manual entry
   */
  async captureExternalCode(provider: ProviderType, code: string): Promise<ValidationResult> {
    try {
      // Check if this is a response to a pending bridge code
      const pendingCode = Array.from(this.pendingCodes.values())
        .find(pc => pc.provider === provider)
      
      if (!pendingCode) {
        return {
          valid: false,
          error: 'No pending authentication for this provider',
        }
      }
      
      // Validate code format
      if (!this.validateCodeFormat(code)) {
        return {
          valid: false,
          error: 'Invalid code format',
        }
      }
      
      // Create session token
      const sessionToken: SessionToken = {
        token: code,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        provider,
        metadata: {
          bridged: true,
          originalCode: pendingCode.code,
        },
      }
      
      // Store the session
      this.sessionTokens.set(provider, sessionToken)
      this.activeProviders.add(provider)
      this.authenticationFlows.set(provider, AuthFlowState.AUTHENTICATED)
      
      // Emit success event
      this.emit('auth:completed', { provider, bridged: true })
      
      // Log the event
      await this.logAuthEvent({
        type: 'bridge',
        provider,
        timestamp: new Date(),
        success: true,
        metadata: { method: 'manual_code' },
      })
      
      return {
        valid: true,
        token: sessionToken,
        expiresIn: 7200, // 2 hours in seconds
      }
    } catch (error) {
      logError(error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }
    }
  }
  
  /**
   * Validate code format
   */
  private validateCodeFormat(code: string): boolean {
    // Basic validation - can be enhanced based on provider requirements
    if (!code || code.length < 10) return false
    
    // Check for common patterns
    const patterns = [
      /^[A-Za-z0-9+/=]+$/, // Base64
      /^[A-Fa-f0-9]+$/,    // Hex
      /^[A-Za-z0-9-_]+$/,  // URL-safe
    ]
    
    return patterns.some(pattern => pattern.test(code))
  }
  
  /**
   * Bridge authentication between providers
   */
  async bridgeAuthentication(from: ProviderType, to: ProviderType): Promise<BridgeResult> {
    try {
      // Check if source provider is authenticated
      if (!this.activeProviders.has(from)) {
        return {
          success: false,
          sourceProvider: from,
          targetProvider: to,
          error: `Source provider ${from} is not authenticated`,
        }
      }
      
      const sourceToken = this.sessionTokens.get(from)
      if (!sourceToken) {
        return {
          success: false,
          sourceProvider: from,
          targetProvider: to,
          error: 'No valid session for source provider',
        }
      }
      
      this.authenticationFlows.set(to, AuthFlowState.BRIDGING)
      
      // Create bridged session for target provider
      const bridgedToken: SessionToken = {
        token: `bridged_${sourceToken.token}_${Date.now()}`,
        expiresAt: sourceToken.expiresAt,
        provider: to,
        metadata: {
          bridgedFrom: from,
          bridgedAt: new Date(),
        },
      }
      
      this.sessionTokens.set(to, bridgedToken)
      this.activeProviders.add(to)
      this.authenticationFlows.set(to, AuthFlowState.AUTHENTICATED)
      
      // Emit bridge event
      this.emit('auth:bridged', { from, to })
      
      return {
        success: true,
        sourceProvider: from,
        targetProvider: to,
        bridgedSession: bridgedToken,
      }
    } catch (error) {
      logError(error)
      return {
        success: false,
        sourceProvider: from,
        targetProvider: to,
        error: error instanceof Error ? error.message : 'Bridging failed',
      }
    }
  }
  
  /**
   * Maintain session for a provider
   */
  async maintainSession(provider: ProviderType): Promise<SessionStatus> {
    const token = this.sessionTokens.get(provider)
    
    if (!token) {
      return {
        active: false,
        provider,
      }
    }
    
    // Check if token is expired
    if (token.expiresAt && token.expiresAt < new Date()) {
      // Attempt to refresh
      const refreshed = await this.refreshSession(provider)
      
      if (!refreshed) {
        this.activeProviders.delete(provider)
        this.sessionTokens.delete(provider)
        this.authenticationFlows.set(provider, AuthFlowState.EXPIRED)
        
        return {
          active: false,
          provider,
        }
      }
    }
    
    return {
      active: true,
      provider,
      expiresAt: token.expiresAt,
      healthCheck: {
        lastChecked: new Date(),
        status: 'healthy',
      },
    }
  }
  
  /**
   * Refresh session for a provider
   */
  private async refreshSession(provider: ProviderType): Promise<boolean> {
    const config = this.providerConfigs.get(provider)
    const token = this.sessionTokens.get(provider)
    
    if (!config || !token || !token.refreshToken) {
      return false
    }
    
    // For manual bridge providers, require new code
    if (config.authType === 'manual_bridge') {
      this.authenticationFlows.set(provider, AuthFlowState.WAITING_FOR_CODE)
      this.emit('auth:refresh_required', { provider, manual: true })
      return false
    }
    
    // Standard refresh flow would go here
    // For now, extend the expiration
    token.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
    return true
  }
  
  /**
   * Rotate credentials for all providers
   */
  async rotateCredentials(): Promise<void> {
    for (const provider of this.activeProviders) {
      await this.rotateProviderCredentials(provider)
    }
    
    await this.logSecurityEvent({
      type: 'token_rotation',
      severity: 'low',
      timestamp: new Date(),
      details: 'Routine credential rotation completed',
    })
  }
  
  /**
   * Rotate credentials for a specific provider
   */
  private async rotateProviderCredentials(provider: ProviderType): Promise<void> {
    const token = this.sessionTokens.get(provider)
    if (!token) return
    
    // Generate new token value while preserving metadata
    const newToken: SessionToken = {
      ...token,
      token: `rotated_${randomBytes(32).toString('hex')}_${Date.now()}`,
    }
    
    this.sessionTokens.set(provider, newToken)
    this.emit('auth:rotated', { provider })
  }
  
  /**
   * Sync provider states
   */
  async syncProviderStates(): Promise<SyncResult> {
    const conflicts: Array<{ provider: ProviderType; issue: string }> = []
    
    for (const [provider, state] of this.authenticationFlows) {
      const token = this.sessionTokens.get(provider)
      const isActive = this.activeProviders.has(provider)
      
      // Check for inconsistencies
      if (state === AuthFlowState.AUTHENTICATED && !token) {
        conflicts.push({
          provider,
          issue: 'Authenticated state but no token found',
        })
      }
      
      if (isActive && !token) {
        conflicts.push({
          provider,
          issue: 'Active provider but no token found',
        })
      }
      
      if (token && token.expiresAt < new Date()) {
        conflicts.push({
          provider,
          issue: 'Token expired',
        })
      }
    }
    
    return {
      synced: conflicts.length === 0,
      providers: Array.from(this.activeProviders),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      timestamp: new Date(),
    }
  }
  
  /**
   * Perform standard authentication (OAuth or API key)
   */
  private async performStandardAuth(
    provider: ProviderType,
    config: ProviderAuthConfig
  ): Promise<AuthFlowResult> {
    // This would integrate with existing OAuth flow
    // For now, return a placeholder
    return {
      success: false,
      provider,
      error: 'Standard auth not yet implemented',
    }
  }
  
  /**
   * Log authentication event
   */
  private async logAuthEvent(event: AuthEvent): Promise<void> {
    logEvent('multi_provider_auth_event', {
      type: event.type,
      provider: event.provider,
      success: event.success,
      ...event.metadata,
    })
  }
  
  /**
   * Log security event
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    logEvent('multi_provider_security_event', {
      type: event.type,
      severity: event.severity,
      provider: event.provider,
      details: event.details,
    })
  }
  
  /**
   * Get current authentication state for a provider
   */
  getAuthState(provider: ProviderType): AuthFlowState {
    return this.authenticationFlows.get(provider) || AuthFlowState.IDLE
  }
  
  /**
   * Check if provider is authenticated
   */
  isAuthenticated(provider: ProviderType): boolean {
    return this.activeProviders.has(provider) && 
           this.authenticationFlows.get(provider) === AuthFlowState.AUTHENTICATED
  }
  
  /**
   * Get all active providers
   */
  getActiveProviders(): ProviderType[] {
    return Array.from(this.activeProviders)
  }
  
  /**
   * Clear authentication for a provider
   */
  async clearAuthentication(provider: ProviderType): Promise<void> {
    this.activeProviders.delete(provider)
    this.sessionTokens.delete(provider)
    this.authenticationFlows.set(provider, AuthFlowState.IDLE)
    
    await this.logAuthEvent({
      type: 'logout',
      provider,
      timestamp: new Date(),
      success: true,
    })
    
    this.emit('auth:cleared', { provider })
  }
}

// Export singleton instance
export const authBridge = new MultiProviderAuthBridge()