import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  ReactNode, 
  useCallback 
} from 'react'
import { ModelProfile, ModelPointerType, getGlobalConfig, saveGlobalConfig } from '../utils/config'
import { ModelManager, getModelManager, reloadModelManager } from '../utils/model'

// Model status enumeration
export type ModelStatus = 
  | 'unknown'
  | 'online' 
  | 'offline'
  | 'authenticating'
  | 'authenticated'
  | 'authentication_failed'
  | 'error'

// Model availability with health information
export interface ModelAvailability {
  modelName: string
  status: ModelStatus
  lastChecked: number
  error?: string
  latency?: number // Response time in ms
}

// Internal model state
export interface ModelState {
  // Current active model
  currentModel: ModelProfile | null
  
  // User's preferred default model (persisted)
  defaultModel: ModelProfile | null
  
  // All available models
  availableModels: ModelProfile[]
  
  // Model health status map
  modelStatus: Map<string, ModelAvailability>
  
  // Model pointers (main, task, reasoning, quick)
  modelPointers: Record<ModelPointerType, string>
  
  // Loading states
  isLoading: boolean
  isSwitching: boolean
  
  // Error state
  error: string | null
  
  // Last action timestamp
  lastUpdate: number
}

// Action types for model state management
export type ModelAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SWITCHING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_MODEL'; payload: ModelProfile | null }
  | { type: 'SET_DEFAULT_MODEL'; payload: ModelProfile }
  | { type: 'SET_AVAILABLE_MODELS'; payload: ModelProfile[] }
  | { type: 'UPDATE_MODEL_STATUS'; payload: { modelName: string; status: ModelAvailability } }
  | { type: 'SET_MODEL_POINTERS'; payload: Record<ModelPointerType, string> }
  | { type: 'RELOAD_STATE'; payload: ModelState }

// Initial state
const initialState: ModelState = {
  currentModel: null,
  defaultModel: null,
  availableModels: [],
  modelStatus: new Map(),
  modelPointers: { main: '', task: '', reasoning: '', quick: '' },
  isLoading: true,
  isSwitching: false,
  error: null,
  lastUpdate: Date.now(),
}

// Model state reducer
function modelReducer(state: ModelState, action: ModelAction): ModelState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_SWITCHING':
      return { ...state, isSwitching: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, lastUpdate: Date.now() }
    
    case 'SET_CURRENT_MODEL':
      return { 
        ...state, 
        currentModel: action.payload, 
        lastUpdate: Date.now() 
      }
    
    case 'SET_DEFAULT_MODEL':
      return { 
        ...state, 
        defaultModel: action.payload, 
        lastUpdate: Date.now() 
      }
    
    case 'SET_AVAILABLE_MODELS':
      return { 
        ...state, 
        availableModels: action.payload, 
        lastUpdate: Date.now() 
      }
    
    case 'UPDATE_MODEL_STATUS': {
      const newStatus = new Map(state.modelStatus)
      newStatus.set(action.payload.modelName, action.payload.status)
      return { 
        ...state, 
        modelStatus: newStatus, 
        lastUpdate: Date.now() 
      }
    }
    
    case 'SET_MODEL_POINTERS':
      return { 
        ...state, 
        modelPointers: action.payload, 
        lastUpdate: Date.now() 
      }
    
    case 'RELOAD_STATE':
      return { 
        ...action.payload, 
        lastUpdate: Date.now() 
      }
    
    default:
      return state
  }
}

// Context type for model operations
export interface ModelContextType {
  // State
  state: ModelState
  
  // Model selection
  switchModel: (modelName: string) => Promise<boolean>
  setDefaultModel: (modelName: string) => Promise<boolean>
  getCurrentModel: () => ModelProfile | null
  getDefaultModel: () => ModelProfile | null
  
  // Model management
  addModel: (config: Omit<ModelProfile, 'createdAt' | 'isActive'>) => Promise<string>
  removeModel: (modelName: string) => Promise<boolean>
  refreshModels: () => Promise<void>
  
  // Model health checking
  checkModelHealth: (modelName: string) => Promise<ModelAvailability>
  checkAllModelsHealth: () => Promise<void>
  getModelStatus: (modelName: string) => ModelStatus
  
  // Model pointers management
  setPointer: (pointer: ModelPointerType, modelName: string) => Promise<boolean>
  getPointer: (pointer: ModelPointerType) => string | null
  
  // Utility functions
  isModelAvailable: (modelName: string) => boolean
  getAvailableModels: () => ModelProfile[]
  getAllModels: () => ModelProfile[]
  
  // State management
  reload: () => Promise<void>
  clearError: () => void
}

// Create context
const ModelContext = createContext<ModelContextType | undefined>(undefined)

// Custom hook to use ModelContext
export const useModel = (): ModelContextType => {
  const context = useContext(ModelContext)
  if (!context) {
    throw new Error('useModel must be used within a ModelContextProvider')
  }
  return context
}

// Helper function to check self-hosted model health
async function checkSelfHostedModelHealth(model: ModelProfile): Promise<ModelAvailability> {
  const availability: ModelAvailability = {
    modelName: model.modelName,
    status: 'unknown',
    lastChecked: Date.now(),
  }
  
  try {
    // Check if this is a self-hosted model
    if (model.provider !== 'self-hosted' || !model.baseURL) {
      availability.status = 'online' // Assume cloud models are online
      return availability
    }
    
    availability.status = 'authenticating'
    
    // For self-hosted models, check health endpoint
    const startTime = Date.now()
    
    // Load API key from auth config
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
      availability.status = 'authentication_failed'
      availability.error = 'Failed to load API key'
      return availability
    }
    
    if (!apiKey) {
      availability.status = 'authentication_failed' 
      availability.error = 'No API key configured'
      return availability
    }
    
    // Health check with authentication
    const response = await fetch(`${model.baseURL}/health`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'agile-programmers/2.0.0'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    
    availability.latency = Date.now() - startTime
    
    if (response.ok) {
      availability.status = 'authenticated'
    } else if (response.status === 401) {
      availability.status = 'authentication_failed'
      availability.error = 'Invalid API key'
    } else {
      availability.status = 'error'
      availability.error = `HTTP ${response.status}`
    }
    
  } catch (error) {
    availability.status = 'offline'
    availability.error = error instanceof Error ? error.message : 'Connection failed'
  }
  
  return availability
}

// Helper function to load state from ModelManager
async function loadStateFromManager(): Promise<ModelState> {
  try {
    const manager = getModelManager()
    const config = getGlobalConfig()
    
    const availableModels = manager.getAvailableModels()
    const currentModelName = manager.getModelName('main')
    const currentModel = currentModelName ? manager.resolveModel(currentModelName) : null
    
    // Load default model from user preferences (new feature)
    const defaultModelName = config.defaultModelName
    const defaultModel = defaultModelName ? manager.resolveModel(defaultModelName) : currentModel
    
    return {
      currentModel,
      defaultModel,
      availableModels,
      modelStatus: new Map(),
      modelPointers: config.modelPointers || { main: '', task: '', reasoning: '', quick: '' },
      isLoading: false,
      isSwitching: false,
      error: null,
      lastUpdate: Date.now(),
    }
  } catch (error) {
    return {
      ...initialState,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Failed to load model configuration'
    }
  }
}

// ModelContextProvider component
export interface ModelContextProviderProps {
  children: ReactNode
}

export const ModelContextProvider: React.FC<ModelContextProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(modelReducer, initialState)
  
  // Initialize state from ModelManager
  useEffect(() => {
    async function initialize() {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      try {
        const initialState = await loadStateFromManager()
        dispatch({ type: 'RELOAD_STATE', payload: initialState })
        
        // Start health checks for all models
        setTimeout(() => {
          checkAllModelsHealth()
        }, 1000)
        
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: error instanceof Error ? error.message : 'Initialization failed' 
        })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
    
    initialize()
  }, [])
  
  // Switch to a specific model
  const switchModel = useCallback(async (modelName: string): Promise<boolean> => {
    dispatch({ type: 'SET_SWITCHING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    
    try {
      const manager = getModelManager()
      const model = manager.resolveModel(modelName)
      
      if (!model) {
        throw new Error(`Model '${modelName}' not found`)
      }
      
      if (!model.isActive) {
        throw new Error(`Model '${model.name}' is inactive`)
      }
      
      // Update model pointer
      manager.setPointer('main', model.modelName)
      
      // Update context state
      dispatch({ type: 'SET_CURRENT_MODEL', payload: model })
      
      // Update last used timestamp
      model.lastUsed = Date.now()
      const config = getGlobalConfig()
      saveGlobalConfig(config)
      
      return true
      
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to switch model' 
      })
      return false
    } finally {
      dispatch({ type: 'SET_SWITCHING', payload: false })
    }
  }, [])
  
  // Set default model (user preference)
  const setDefaultModel = useCallback(async (modelName: string): Promise<boolean> => {
    try {
      const manager = getModelManager()
      const model = manager.resolveModel(modelName)
      
      if (!model) {
        throw new Error(`Model '${modelName}' not found`)
      }
      
      // Update user preference in config
      const config = getGlobalConfig()
      config.defaultModelName = model.modelName
      saveGlobalConfig(config)
      
      // Update context state
      dispatch({ type: 'SET_DEFAULT_MODEL', payload: model })
      
      return true
      
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to set default model' 
      })
      return false
    }
  }, [])
  
  // Add a new model
  const addModel = useCallback(async (config: Omit<ModelProfile, 'createdAt' | 'isActive'>): Promise<string> => {
    try {
      const manager = getModelManager()
      const modelName = await manager.addModel(config)
      
      // Refresh available models
      await refreshModels()
      
      return modelName
      
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to add model' 
      })
      throw error
    }
  }, [])
  
  // Remove a model
  const removeModel = useCallback(async (modelName: string): Promise<boolean> => {
    try {
      const manager = getModelManager()
      manager.removeModel(modelName)
      
      // Refresh available models
      await refreshModels()
      
      return true
      
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to remove model' 
      })
      return false
    }
  }, [])
  
  // Refresh models from configuration
  const refreshModels = useCallback(async (): Promise<void> => {
    try {
      reloadModelManager() // Force reload
      const newState = await loadStateFromManager()
      dispatch({ type: 'SET_AVAILABLE_MODELS', payload: newState.availableModels })
      dispatch({ type: 'SET_MODEL_POINTERS', payload: newState.modelPointers })
      
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to refresh models' 
      })
    }
  }, [])
  
  // Check health of specific model
  const checkModelHealth = useCallback(async (modelName: string): Promise<ModelAvailability> => {
    const model = state.availableModels.find(m => m.modelName === modelName)
    
    if (!model) {
      const availability: ModelAvailability = {
        modelName,
        status: 'error',
        lastChecked: Date.now(),
        error: 'Model not found',
      }
      dispatch({ type: 'UPDATE_MODEL_STATUS', payload: { modelName, status: availability } })
      return availability
    }
    
    const availability = await checkSelfHostedModelHealth(model)
    dispatch({ type: 'UPDATE_MODEL_STATUS', payload: { modelName, status: availability } })
    
    return availability
  }, [state.availableModels])
  
  // Check health of all models
  const checkAllModelsHealth = useCallback(async (): Promise<void> => {
    const healthChecks = state.availableModels.map(async (model) => {
      try {
        await checkModelHealth(model.modelName)
      } catch (error) {
        console.warn(`Health check failed for ${model.modelName}:`, error)
      }
    })
    
    await Promise.allSettled(healthChecks)
  }, [state.availableModels, checkModelHealth])
  
  // Set model pointer
  const setPointer = useCallback(async (pointer: ModelPointerType, modelName: string): Promise<boolean> => {
    try {
      const manager = getModelManager()
      manager.setPointer(pointer, modelName)
      
      // Update context state
      const newPointers = { ...state.modelPointers, [pointer]: modelName }
      dispatch({ type: 'SET_MODEL_POINTERS', payload: newPointers })
      
      return true
      
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to set model pointer' 
      })
      return false
    }
  }, [state.modelPointers])
  
  // Get model pointer
  const getPointer = useCallback((pointer: ModelPointerType): string | null => {
    return state.modelPointers[pointer] || null
  }, [state.modelPointers])
  
  // Utility functions
  const getCurrentModel = useCallback(() => state.currentModel, [state.currentModel])
  const getDefaultModel = useCallback(() => state.defaultModel, [state.defaultModel])
  const isModelAvailable = useCallback((modelName: string) => {
    return state.availableModels.some(m => m.modelName === modelName && m.isActive)
  }, [state.availableModels])
  const getAvailableModels = useCallback(() => state.availableModels.filter(m => m.isActive), [state.availableModels])
  const getAllModels = useCallback(() => state.availableModels, [state.availableModels])
  const getModelStatus = useCallback((modelName: string): ModelStatus => {
    return state.modelStatus.get(modelName)?.status || 'unknown'
  }, [state.modelStatus])
  
  // Reload entire state
  const reload = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const newState = await loadStateFromManager()
      dispatch({ type: 'RELOAD_STATE', payload: newState })
      
      // Restart health checks
      setTimeout(() => {
        checkAllModelsHealth()
      }, 1000)
      
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to reload state' 
      })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [checkAllModelsHealth])
  
  // Clear error state
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])
  
  // Create context value
  const contextValue: ModelContextType = {
    state,
    switchModel,
    setDefaultModel,
    getCurrentModel,
    getDefaultModel,
    addModel,
    removeModel,
    refreshModels,
    checkModelHealth,
    checkAllModelsHealth,
    getModelStatus,
    setPointer,
    getPointer,
    isModelAvailable,
    getAvailableModels,
    getAllModels,
    reload,
    clearError,
  }
  
  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  )
}

// Export types and context
export { ModelContext }
export default ModelContextProvider