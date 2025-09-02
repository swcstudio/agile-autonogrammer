/**
 * Multi-Provider Authentication Bridge Types
 * Enables seamless authentication across multiple AI providers
 * with support for manual code copying between interfaces
 */

import { ProviderType } from '../utils/config'

// Authentication flow states
export enum AuthFlowState {
  IDLE = 'idle',
  INITIATING = 'initiating',
  WAITING_FOR_CODE = 'waiting_for_code',
  VALIDATING = 'validating',
  AUTHENTICATED = 'authenticated',
  FAILED = 'failed',
  EXPIRED = 'expired',
  BRIDGING = 'bridging'
}

// Authentication methods supported by providers
export type AuthMethod = 'oauth' | 'api_key' | 'session_token' | 'manual_bridge' | 'code_copy'

// Session token structure
export interface SessionToken {
  token: string
  refreshToken?: string
  expiresAt: Date
  provider: ProviderType
  scope?: string[]
  metadata?: Record<string, any>
}

// Authentication flow result
export interface AuthFlowResult {
  success: boolean
  provider: ProviderType
  session?: SessionToken
  error?: string
  requiresManualStep?: boolean
  bridgeCode?: string
}

// Validation result for external codes
export interface ValidationResult {
  valid: boolean
  token?: SessionToken
  error?: string
  expiresIn?: number
}

// Bridge result between providers
export interface BridgeResult {
  success: boolean
  sourceProvider: ProviderType
  targetProvider: ProviderType
  bridgedSession?: SessionToken
  error?: string
}

// Session status
export interface SessionStatus {
  active: boolean
  provider: ProviderType
  expiresAt?: Date
  remainingCalls?: number
  healthCheck?: {
    lastChecked: Date
    status: 'healthy' | 'degraded' | 'unavailable'
  }
}

// Sync result for provider states
export interface SyncResult {
  synced: boolean
  providers: ProviderType[]
  conflicts?: Array<{
    provider: ProviderType
    issue: string
  }>
  timestamp: Date
}

// Provider-specific authentication configuration
export interface ProviderAuthConfig {
  provider: ProviderType
  authType: AuthMethod
  displayName: string
  endpoints: {
    auth?: string
    token?: string
    refresh?: string
    validate?: string
    bridge?: string
  }
  features: {
    supportsCopyPaste: boolean
    supportsOAuth: boolean
    supportsAPIKey: boolean
    requiresManualIntervention: boolean
    supportsBridging: boolean
    maxSessionDuration?: number
  }
  rateLimits?: {
    daily?: number
    hourly?: number
    concurrent?: number
  }
}

// Authentication code structure for manual copying
export interface AuthCode {
  code: string
  provider: ProviderType
  generatedAt: Date
  expiresAt: Date
  format: 'base64' | 'hex' | 'alphanumeric' | 'jwt'
  signature?: string
}

// Credentials structure
export interface Credentials {
  type: 'api_key' | 'oauth_token' | 'session' | 'bridge_code'
  value: string
  provider: ProviderType
  metadata?: Record<string, any>
}

// Session structure
export interface Session {
  id: string
  provider: ProviderType
  token: SessionToken
  createdAt: Date
  lastUsed: Date
  status: AuthFlowState
  metadata?: Record<string, any>
}

// Coordination result for multi-provider sessions
export interface CoordinationResult {
  success: boolean
  activeSessions: Map<ProviderType, Session>
  primaryProvider: ProviderType
  fallbackProviders: ProviderType[]
}

// Capability map for providers
export interface CapabilityMap {
  providers: Map<ProviderType, {
    models: string[]
    features: string[]
    limits: Record<string, number>
    status: 'available' | 'limited' | 'unavailable'
  }>
  lastUpdated: Date
}

// Token structure
export interface Token {
  value: string
  type: 'bearer' | 'api_key' | 'session'
  provider: ProviderType
  expiresAt?: Date
  refreshToken?: string
  scope?: string[]
}

// Session export for backup/restore
export interface SessionExport {
  version: string
  exportedAt: Date
  sessions: Session[]
  encryptionMethod?: string
  checksum?: string
}

// Authentication event for logging
export interface AuthEvent {
  type: 'login' | 'logout' | 'refresh' | 'bridge' | 'expire'
  provider: ProviderType
  timestamp: Date
  success: boolean
  metadata?: Record<string, any>
}

// Security event for logging
export interface SecurityEvent {
  type: 'token_rotation' | 'session_limit' | 'invalid_code' | 'breach_attempt'
  provider?: ProviderType
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  details: string
}