import { ChatCompletionsAdapter } from './chatCompletions'
import { ModelCapabilities } from '../../types/modelCapabilities'
import { ModelProfile } from '../../utils/config'
import * as crypto from 'crypto'

/**
 * Adapter for self-hosted models with authentication
 * Extends ChatCompletionsAdapter with API key authentication
 */
export class SelfHostedAdapter extends ChatCompletionsAdapter {
  private apiKey: string | null = null
  private modelEndpoint: string

  constructor(capabilities: ModelCapabilities, modelProfile: ModelProfile) {
    super(capabilities, modelProfile)
    
    // Load API key from environment or config
    this.apiKey = this.loadApiKey(modelProfile.modelName)
    
    // Determine model-specific endpoint
    this.modelEndpoint = this.getModelEndpoint(modelProfile.modelName)
  }

  /**
   * Load API key for the specific model
   */
  private loadApiKey(modelName: string): string | null {
    // Try environment variables first
    const envKey = process.env[`QWEN3_${modelName.includes('42b') ? '42B' : 'MOE'}_API_KEY`]
    if (envKey) return envKey

    // Try loading from auth config file
    try {
      const fs = require('fs')
      const path = require('path')
      
      const configPath = '/home/ubuntu/workspace/.auth/auth_config.json'
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const models = config.deployment?.models
        
        if (modelName.includes('42b')) {
          return models?.['qwen3-42b']?.api_key
        } else if (modelName.includes('moe')) {
          return models?.['qwen3-moe']?.api_key
        }
      }
    } catch (error) {
      console.warn('Failed to load API key from config:', error)
    }

    return null
  }

  /**
   * Get model-specific endpoint
   */
  private getModelEndpoint(modelName: string): string {
    if (modelName.includes('42b')) {
      return 'http://localhost:8001'
    } else if (modelName.includes('moe')) {
      return 'http://localhost:8000'
    }
    
    // Default fallback
    return 'http://localhost:8001'
  }

  /**
   * Generate HMAC signature for request authentication
   */
  private generateSignature(apiKey: string, timestamp: string): string {
    try {
      const fs = require('fs')
      const configPath = '/home/ubuntu/workspace/.auth/auth_config.json'
      
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        // In production, you'd load the secret from secure storage
        // For now, we'll use the API key as the secret (simplified)
        const message = `${apiKey}:${timestamp}`
        return crypto.createHmac('sha256', apiKey).update(message).digest('hex')
      }
    } catch (error) {
      console.warn('Failed to generate signature:', error)
    }
    
    return ''
  }

  /**
   * Override makeRequest to add authentication headers
   */
  protected async makeRequest(url: string, options: any): Promise<Response> {
    if (!this.apiKey) {
      throw new Error(`API key not found for self-hosted model. Please run: python3 /workspace/scripts/generate_api_keys.py`)
    }

    // Use model-specific endpoint
    const fullUrl = url.replace(this.modelProfile.baseURL || 'http://localhost', this.modelEndpoint)

    // Add authentication headers
    const timestamp = new Date().toISOString()
    const signature = this.generateSignature(this.apiKey, timestamp)

    const authenticatedOptions = {
      ...options,
      headers: {
        ...options.headers,
        'X-API-Key': this.apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'User-Agent': 'agile-programmers/2.0.0'
      }
    }

    try {
      const response = await fetch(fullUrl, authenticatedOptions)
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your API key or regenerate keys.')
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.')
        } else if (response.status === 502) {
          throw new Error('Model server is not available. Please ensure the model is running.')
        }
      }
      
      return response
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to self-hosted model at ${this.modelEndpoint}. Please ensure the model server is running.`)
      }
      throw error
    }
  }

  /**
   * Override to provide model-specific streaming capability check
   */
  supportsStreaming(): boolean {
    // Both models support streaming
    return true
  }

  /**
   * Check if model server is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${this.modelEndpoint}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey || '',
          'User-Agent': 'agile-programmers/2.0.0'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeout)
      
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Get model information and capabilities
   */
  async getModelInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.modelEndpoint}/v1/models`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey || '',
          'User-Agent': 'agile-programmers/2.0.0'
        }
      })
      
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.warn('Failed to get model info:', error)
    }
    
    return null
  }

  /**
   * Override to handle custom error messages
   */
  protected handleError(error: any): Error {
    if (error.message?.includes('API key')) {
      return new Error(
        `Self-hosted model authentication failed: ${error.message}\n\n` +
        `Troubleshooting steps:\n` +
        `1. Ensure API keys are generated: python3 scripts/generate_api_keys.py\n` +
        `2. Verify models are running: bash scripts/model_manager.sh status\n` +
        `3. Check auth config: ls -la /workspace/.auth/\n`
      )
    }

    if (error.message?.includes('connect') || error.message?.includes('502')) {
      return new Error(
        `Cannot connect to self-hosted model server.\n\n` +
        `Troubleshooting steps:\n` +
        `1. Start the models: bash scripts/model_manager.sh start all\n` +
        `2. Check server status: curl http://localhost:8001/health\n` +
        `3. Check logs: tail -f /workspace/logs/*.log\n`
      )
    }

    return error instanceof Error ? error : new Error(String(error))
  }
}