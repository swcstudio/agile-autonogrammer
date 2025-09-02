/**
 * useModel Hook
 * React hook for AI model management and configuration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useExecutionEngine } from '@agile/core';
import type { 
  UseModelOptions, 
  UseModelReturn,
  ModelMetadata,
  PerformanceMetrics,
  AIError 
} from '../types';
import { ModelRegistry } from '../registry/ModelRegistry';
import { createAIError } from '../utils/errors';

// Global registry instance
const registry = new ModelRegistry();

export function useModel(
  initialModelId?: string,
  options: UseModelOptions = {}
): UseModelReturn {
  const {
    provider,
    autoRetry = true,
    maxRetries = 3,
    timeout = 30000,
    enableMetrics = true,
    preload = false,
    warmup = false,
  } = options;

  // State
  const [model, setModel] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AIError | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [modelMetrics, setModelMetrics] = useState<PerformanceMetrics | null>(null);
  const [usage, setUsage] = useState({
    totalTokens: 0,
    totalRequests: 0,
    totalCost: 0,
  });

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const preloadedModels = useRef(new Set<string>());

  // ExecutionEngine integration
  const executionEngine = useExecutionEngine({ 
    enableMetrics,
    timeout,
  });

  /**
   * Load and validate a model
   */
  const loadModel = useCallback(async (modelId: string): Promise<ModelMetadata> => {
    const startTime = performance.now();
    
    try {
      // Get model from registry
      const modelMetadata = registry.getModel(modelId);
      if (!modelMetadata) {
        throw createAIError(
          `Model ${modelId} not found in registry`,
          'UNKNOWN',
          modelMetadata?.provider || 'unknown'
        );
      }

      // Check if provider is configured
      if (!registry.isProviderConfigured(modelMetadata.provider)) {
        throw createAIError(
          `Provider ${modelMetadata.provider} is not configured`,
          'AUTH_ERROR',
          modelMetadata.provider
        );
      }

      // Warmup model if requested
      if (warmup && !preloadedModels.current.has(modelId)) {
        await performWarmup(modelMetadata);
        preloadedModels.current.add(modelId);
      }

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Update metrics
      if (enableMetrics) {
        const metrics: PerformanceMetrics = {
          latency: loadTime,
          throughput: 0,
          responseTime: loadTime,
          processingTime: loadTime,
          tokensPerSecond: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          costPerRequest: 0,
          costPer1kTokens: modelMetadata.pricingPer1kTokens?.input || 0,
          totalCost: 0,
          timestamp: new Date(),
          model: modelId,
          provider: modelMetadata.provider,
        };
        setModelMetrics(metrics);
      }

      return modelMetadata;
    } catch (error) {
      throw createAIError(
        `Failed to load model ${modelId}: ${error}`,
        'UNKNOWN',
        provider || 'unknown'
      );
    }
  }, [enableMetrics, warmup, provider]);

  /**
   * Switch to a different model
   */
  const switchModel = useCallback(async (modelId: string): Promise<void> => {
    if (loading) {
      abortControllerRef.current?.abort();
    }

    setLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const newModel = await executionEngine.execute(
        () => loadModel(modelId),
        {
          type: 'ai-model',
          metadata: { 
            action: 'switch-model',
            fromModel: model?.id,
            toModel: modelId,
          },
        }
      );

      setModel(newModel);
      setIsReady(true);
      setError(null);
    } catch (err) {
      const aiError = err instanceof Error 
        ? createAIError(err.message, 'UNKNOWN', provider || 'unknown')
        : createAIError('Unknown error occurred', 'UNKNOWN', provider || 'unknown');
      
      setError(aiError);
      setIsReady(false);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [loading, model?.id, provider, loadModel, executionEngine]);

  /**
   * Get available models with optional filtering
   */
  const getAvailableModels = useCallback((): ModelMetadata[] => {
    return registry.getModels(provider ? { provider } : undefined);
  }, [provider]);

  /**
   * Preload a model for faster switching
   */
  const preloadModel = useCallback(async (modelId: string): Promise<void> => {
    if (preloadedModels.current.has(modelId)) {
      return;
    }

    try {
      const modelToPreload = registry.getModel(modelId);
      if (!modelToPreload) {
        throw new Error(`Model ${modelId} not found`);
      }

      await performWarmup(modelToPreload);
      preloadedModels.current.add(modelId);
    } catch (err) {
      console.warn(`Failed to preload model ${modelId}:`, err);
    }
  }, []);

  /**
   * Unload a model from memory
   */
  const unloadModel = useCallback(async (modelId: string): Promise<void> => {
    preloadedModels.current.delete(modelId);
    
    if (model?.id === modelId) {
      setModel(null);
      setIsReady(false);
      setModelMetrics(null);
    }
  }, [model?.id]);

  /**
   * Update usage statistics
   */
  const updateUsage = useCallback((tokens: number, requests: number = 1, cost: number = 0) => {
    setUsage(prev => ({
      totalTokens: prev.totalTokens + tokens,
      totalRequests: prev.totalRequests + requests,
      totalCost: prev.totalCost + cost,
    }));
  }, []);

  /**
   * Get model capabilities as string array
   */
  const capabilities = model?.capabilities || [];

  /**
   * Perform model warmup
   */
  const performWarmup = async (modelMetadata: ModelMetadata): Promise<void> => {
    // This would typically make a small test request to the model
    // to ensure it's loaded and ready
    console.log(`Warming up model ${modelMetadata.id}...`);
    
    // Simulate warmup delay
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  // Initialize with initial model if provided
  useEffect(() => {
    if (initialModelId && !model) {
      switchModel(initialModelId);
    }
  }, [initialModelId, model, switchModel]);

  // Preload models if requested
  useEffect(() => {
    if (preload && model) {
      const relatedModels = registry.getModelsByProvider(model.provider)
        .filter(m => m.id !== model.id)
        .slice(0, 3); // Preload up to 3 related models

      relatedModels.forEach(m => preloadModel(m.id));
    }
  }, [preload, model, preloadModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    model,
    loading,
    error,
    isReady,
    capabilities,
    switchModel,
    getAvailableModels,
    preloadModel,
    unloadModel,
    modelMetrics,
    usage,
  };
}