import { ModelAPIAdapter } from './adapters/base'
import { ResponsesAPIAdapter } from './adapters/responsesAPI'
import { ChatCompletionsAdapter } from './adapters/chatCompletions'
import { SelfHostedAdapter } from './adapters/selfHostedAdapter'
import { getModelCapabilities } from '../constants/modelCapabilities'
import { ModelProfile, getGlobalConfig } from '../utils/config'
import { ModelCapabilities } from '../types/modelCapabilities'

export class ModelAdapterFactory {
  /**
   * Create appropriate adapter based on model configuration
   */
  static createAdapter(modelProfile: ModelProfile): ModelAPIAdapter {
    const capabilities = getModelCapabilities(modelProfile.modelName)
    
    // Check if this is a self-hosted model
    if (this.isSelfHostedModel(modelProfile)) {
      return new SelfHostedAdapter(capabilities, modelProfile)
    }
    
    // Determine which API to use for cloud models
    const apiType = this.determineAPIType(modelProfile, capabilities)
    
    // Create corresponding adapter
    switch (apiType) {
      case 'responses_api':
        return new ResponsesAPIAdapter(capabilities, modelProfile)
      case 'chat_completions':
      default:
        return new ChatCompletionsAdapter(capabilities, modelProfile)
    }
  }

  /**
   * Check if model is self-hosted
   */
  private static isSelfHostedModel(modelProfile: ModelProfile): boolean {
    // Check by provider name
    if (modelProfile.provider === 'self-hosted') {
      return true
    }
    
    // Check by model name patterns
    const selfHostedModels = ['qwen3-42b-coder', 'qwen3-moe-redteam']
    if (selfHostedModels.includes(modelProfile.modelName)) {
      return true
    }
    
    // Check by endpoint
    if (modelProfile.baseURL?.includes('localhost:800')) {
      return true
    }
    
    return false
  }
  
  /**
   * Determine which API should be used
   */
  private static determineAPIType(
    modelProfile: ModelProfile,
    capabilities: ModelCapabilities
  ): 'responses_api' | 'chat_completions' {
    // If model doesn't support Responses API, use Chat Completions directly
    if (capabilities.apiArchitecture.primary !== 'responses_api') {
      return 'chat_completions'
    }
    
    // Check if this is official OpenAI endpoint
    const isOfficialOpenAI = !modelProfile.baseURL || 
      modelProfile.baseURL.includes('api.openai.com')
    
    // Non-official endpoints use Chat Completions (even if model supports Responses API)
    if (!isOfficialOpenAI) {
      // If there's a fallback option, use fallback
      if (capabilities.apiArchitecture.fallback === 'chat_completions') {
        return 'chat_completions'
      }
      // Otherwise use primary (might fail, but let it try)
      return capabilities.apiArchitecture.primary
    }
    
    // For now, always use Responses API for supported models when on official endpoint
    // Streaming fallback will be handled at runtime if needed
    
    // Use primary API type
    return capabilities.apiArchitecture.primary
  }
  
  /**
   * Check if model should use Responses API
   */
  static shouldUseResponsesAPI(modelProfile: ModelProfile): boolean {
    const capabilities = getModelCapabilities(modelProfile.modelName)
    const apiType = this.determineAPIType(modelProfile, capabilities)
    return apiType === 'responses_api'
  }
}