/**
 * Code Copy-Back Interface
 * Manages the manual code copying flow between external providers and the CLI
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto'
import { AuthCode, ValidationResult, BridgeResult } from '../types/multiProviderAuth'
import { ProviderType } from '../utils/config'
import { authBridge } from './multiProviderAuthBridge'
import { logError } from '../utils/log'
import { logEvent } from './statsig'

export class CodeCopyBackInterface {
  private pendingCodes: Map<string, AuthCode>
  private encryptionKey: Buffer
  private initVector: Buffer
  
  constructor() {
    this.pendingCodes = new Map()
    
    // Initialize encryption keys (in production, these should be from secure storage)
    const secret = process.env.CODE_COPY_SECRET || 'default-code-copy-secret-key-32b'
    this.encryptionKey = Buffer.from(
      createHash('sha256').update(secret).digest('hex').slice(0, 32)
    )
    this.initVector = Buffer.alloc(16, 0)
  }
  
  /**
   * Generate an authentication code for manual copying
   */
  async generateAuthCode(provider: ProviderType): Promise<AuthCode> {
    try {
      // Generate a user-friendly code
      const rawCode = this.generateUserFriendlyCode()
      
      // Create auth code object
      const authCode: AuthCode = {
        code: rawCode,
        provider,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        format: 'alphanumeric',
        signature: this.generateSignature(rawCode, provider),
      }
      
      // Store the code
      this.pendingCodes.set(rawCode, authCode)
      
      // Set expiration cleanup
      setTimeout(() => {
        this.pendingCodes.delete(rawCode)
      }, 5 * 60 * 1000)
      
      // Log generation event
      logEvent('code_copy_generated', {
        provider,
        format: authCode.format,
      })
      
      return authCode
    } catch (error) {
      logError(error)
      throw new Error('Failed to generate authentication code')
    }
  }
  
  /**
   * Generate a user-friendly code (easier to copy/type)
   */
  private generateUserFriendlyCode(): string {
    // Generate 4 groups of 4 alphanumeric characters
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluding similar looking characters
    const groups: string[] = []
    
    for (let i = 0; i < 4; i++) {
      let group = ''
      for (let j = 0; j < 4; j++) {
        const randomIndex = Math.floor(Math.random() * charset.length)
        group += charset[randomIndex]
      }
      groups.push(group)
    }
    
    return groups.join('-') // Format: XXXX-XXXX-XXXX-XXXX
  }
  
  /**
   * Generate signature for code verification
   */
  private generateSignature(code: string, provider: ProviderType): string {
    const data = `${code}:${provider}:${Date.now()}`
    return createHash('sha256')
      .update(data)
      .digest('base64')
      .slice(0, 16)
  }
  
  /**
   * Display code for copying with formatted output
   */
  displayCodeForCopy(authCode: AuthCode): string {
    const display = `
╔════════════════════════════════════════════════════════════╗
║             AUTHENTICATION CODE FOR ${authCode.provider.toUpperCase()}              ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Copy this code:                                          ║
║                                                            ║
║            ┌────────────────────────────┐                 ║
║            │  ${authCode.code}  │                 ║
║            └────────────────────────────┘                 ║
║                                                            ║
║  Steps:                                                    ║
║  1. Copy the code above                                   ║
║  2. Go to your ${authCode.provider} interface                      ║
║  3. Paste when prompted for authentication                ║
║  4. Copy the response code                                ║
║  5. Return here and paste the response                    ║
║                                                            ║
║  Code expires at: ${authCode.expiresAt.toLocaleTimeString()}             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`
    return display
  }
  
  /**
   * Accept and validate pasted code from external provider
   */
  async acceptPastedCode(code: string, provider: ProviderType): Promise<ValidationResult> {
    try {
      // Clean the input
      const cleanedCode = code.trim().replace(/\s+/g, '')
      
      // Validate format
      if (!this.validateCodeFormat(cleanedCode)) {
        return {
          valid: false,
          error: 'Invalid code format. Please check and try again.',
        }
      }
      
      // Check if this is a response to our pending code
      const hasValidPending = this.hasPendingCodeForProvider(provider)
      
      if (!hasValidPending) {
        return {
          valid: false,
          error: 'No pending authentication request. Please start a new authentication flow.',
        }
      }
      
      // Verify code integrity
      const isValid = await this.verifyCodeIntegrity(cleanedCode, provider)
      
      if (!isValid) {
        logEvent('code_copy_validation_failed', {
          provider,
          reason: 'integrity_check_failed',
        })
        
        return {
          valid: false,
          error: 'Code verification failed. Please ensure you copied the complete code.',
        }
      }
      
      // Pass to auth bridge for session creation
      const result = await authBridge.captureExternalCode(provider, cleanedCode)
      
      if (result.valid) {
        // Clear pending codes for this provider
        this.clearPendingCodesForProvider(provider)
        
        logEvent('code_copy_validation_success', {
          provider,
        })
      }
      
      return result
    } catch (error) {
      logError(error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }
    }
  }
  
  /**
   * Validate code format based on expected patterns
   */
  validateCodeFormat(code: string): boolean {
    // Check for various valid formats
    const patterns = [
      /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, // Our format
      /^[A-Za-z0-9+/=]{20,}$/,                               // Base64
      /^[A-Fa-f0-9]{32,}$/,                                  // Hex
      /^[A-Za-z0-9-_]{20,}$/,                                // JWT-like
    ]
    
    return patterns.some(pattern => pattern.test(code))
  }
  
  /**
   * Verify code integrity and authenticity
   */
  async verifyCodeIntegrity(code: string, provider: ProviderType): Promise<boolean> {
    try {
      // For external codes, we primarily check format and provider matching
      // In a production system, this would include cryptographic verification
      
      // Check if code matches expected patterns for the provider
      const providerPatterns: Record<string, RegExp> = {
        google: /^[A-Za-z0-9-_]{20,}$/,
        anthropic: /^[A-Za-z0-9+/=]{20,}$/,
        openai: /^sk-[A-Za-z0-9]{48}$/,
      }
      
      const pattern = providerPatterns[provider]
      if (pattern && !pattern.test(code)) {
        return false
      }
      
      // Additional provider-specific validation could go here
      
      return true
    } catch (error) {
      logError(error)
      return false
    }
  }
  
  /**
   * Encrypt sensitive data for storage
   */
  encryptSensitiveData(data: string): string {
    try {
      const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, this.initVector)
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return encrypted
    } catch (error) {
      logError(error)
      throw new Error('Encryption failed')
    }
  }
  
  /**
   * Decrypt sensitive data
   */
  decryptSensitiveData(encryptedData: string): string {
    try {
      const decipher = createDecipheriv('aes-256-cbc', this.encryptionKey, this.initVector)
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      logError(error)
      throw new Error('Decryption failed')
    }
  }
  
  /**
   * Bridge session between providers using code copying
   */
  async bridgeSession(
    sourceProvider: ProviderType,
    targetProvider: ProviderType
  ): Promise<BridgeResult> {
    try {
      // Generate bridge code for the target provider
      const bridgeCode = await this.generateAuthCode(targetProvider)
      
      // Create bridge instruction
      const instructions = this.generateBridgeInstructions(sourceProvider, targetProvider, bridgeCode)
      
      // Return bridge result with instructions
      return {
        success: true,
        sourceProvider,
        targetProvider,
        error: instructions, // Using error field to pass instructions
      }
    } catch (error) {
      logError(error)
      return {
        success: false,
        sourceProvider,
        targetProvider,
        error: error instanceof Error ? error.message : 'Bridge failed',
      }
    }
  }
  
  /**
   * Generate bridge instructions for user
   */
  private generateBridgeInstructions(
    source: ProviderType,
    target: ProviderType,
    code: AuthCode
  ): string {
    return `
To bridge from ${source} to ${target}:

1. Copy this code: ${code.code}
2. Go to your ${target} interface
3. Use the code to authenticate
4. Copy the response code
5. Paste it back here

This will link your ${source} session with ${target}.
`
  }
  
  /**
   * Check if there's a pending code for a provider
   */
  private hasPendingCodeForProvider(provider: ProviderType): boolean {
    for (const code of this.pendingCodes.values()) {
      if (code.provider === provider && code.expiresAt > new Date()) {
        return true
      }
    }
    return false
  }
  
  /**
   * Clear pending codes for a provider
   */
  private clearPendingCodesForProvider(provider: ProviderType): void {
    const keysToDelete: string[] = []
    
    for (const [key, code] of this.pendingCodes.entries()) {
      if (code.provider === provider) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.pendingCodes.delete(key))
  }
  
  /**
   * Get remaining time for a pending code
   */
  getRemainingTime(code: string): number {
    const authCode = this.pendingCodes.get(code)
    if (!authCode) return 0
    
    const remaining = authCode.expiresAt.getTime() - Date.now()
    return Math.max(0, Math.floor(remaining / 1000)) // Return seconds
  }
  
  /**
   * Clean up expired codes
   */
  cleanupExpiredCodes(): void {
    const now = new Date()
    const keysToDelete: string[] = []
    
    for (const [key, code] of this.pendingCodes.entries()) {
      if (code.expiresAt < now) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.pendingCodes.delete(key))
  }
}

// Export singleton instance
export const codeCopyBack = new CodeCopyBackInterface()