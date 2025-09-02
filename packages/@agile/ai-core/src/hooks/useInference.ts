/**
 * useInference Hook
 * React hook for AI inference with streaming and performance monitoring
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useExecutionEngine } from '@agile/core';
import type {
  UseInferenceOptions,
  UseInferenceReturn,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  AIError,
  PerformanceMetrics,
} from '../types';
import { ModelRegistry } from '../registry/ModelRegistry';
import { ProviderManager } from '../providers/ProviderManager';
import { createAIError } from '../utils/errors';

// Global instances
const registry = new ModelRegistry();
const providerManager = new ProviderManager();

export function useInference(options: UseInferenceOptions = {}): UseInferenceReturn {
  const {
    provider,
    model: defaultModel,
    autoRetry = true,
    maxRetries = 3,
    timeout = 30000,
    enableMetrics = true,
    onStream,
    onComplete,
    onError,
  } = options;

  // State
  const [data, setData] = useState<InferenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AIError | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamChunks, setStreamChunks] = useState<StreamChunk[]>([]);
  const [progress, setProgress] = useState({
    tokensGenerated: 0,
    estimatedTotal: 0,
    percentage: 0,
  });
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [lastRequest, setLastRequest] = useState<InferenceRequest | null>(null);

  // Refs for cleanup and state management
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader | null>(null);

  // ExecutionEngine integration
  const executionEngine = useExecutionEngine({
    enableMetrics,
    timeout,
  });

  /**
   * Perform inference with optional streaming
   */
  const infer = useCallback(async (request: InferenceRequest): Promise<InferenceResponse> => {
    // Cancel any ongoing inference
    cancel();

    const startTime = performance.now();
    setLoading(true);
    setError(null);
    setData(null);
    setStreamChunks([]);
    setProgress({ tokensGenerated: 0, estimatedTotal: 0, percentage: 0 });
    setLastRequest(request);

    abortControllerRef.current = new AbortController();

    try {
      // Determine model and provider
      const modelId = request.model || defaultModel;
      if (!modelId) {
        throw createAIError(
          'No model specified for inference',
          'UNKNOWN',
          provider || 'unknown'
        );
      }

      const modelMetadata = registry.getModel(modelId);
      if (!modelMetadata) {
        throw createAIError(
          `Model ${modelId} not found`,
          'UNKNOWN',
          provider || 'unknown'
        );
      }

      // Get provider instance
      const providerInstance = providerManager.getProvider(modelMetadata.provider);
      if (!providerInstance) {
        throw createAIError(
          `Provider ${modelMetadata.provider} not initialized`,
          'UNKNOWN',
          modelMetadata.provider
        );
      }

      let response: InferenceResponse;

      if (request.stream) {
        // Handle streaming inference
        response = await handleStreamingInference(
          providerInstance,
          request,
          startTime,
          abortControllerRef.current.signal
        );
      } else {
        // Handle regular inference
        response = await executionEngine.execute(
          () => providerInstance.infer(request),
          {
            type: 'ai-inference',
            metadata: {
              model: modelId,
              provider: modelMetadata.provider,
              streaming: false,
            },
          }
        );
      }

      const endTime = performance.now();
      
      // Update metrics
      if (enableMetrics) {
        const inferenceMetrics = calculateMetrics(response, startTime, endTime, modelMetadata);
        setMetrics(inferenceMetrics);
      }

      setData(response);
      onComplete?.(response);

      return response;

    } catch (err) {
      const aiError = err instanceof Error
        ? createAIError(
            err.message,
            'UNKNOWN',
            provider || 'unknown'
          )
        : createAIError(
            'Unknown inference error',
            'UNKNOWN', 
            provider || 'unknown'
          );

      setError(aiError);
      onError?.(aiError);
      throw aiError;

    } finally {
      setLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [
    defaultModel,
    provider,
    executionEngine,
    enableMetrics,
    onComplete,
    onError,
  ]);

  /**
   * Handle streaming inference
   */
  const handleStreamingInference = async (
    providerInstance: any,
    request: InferenceRequest,
    startTime: number,
    abortSignal: AbortSignal
  ): Promise<InferenceResponse> => {
    setIsStreaming(true);
    const chunks: StreamChunk[] = [];
    let accumulatedContent = '';
    let totalTokens = 0;

    try {
      const stream = providerInstance.stream(request);
      
      for await (const chunk of stream) {
        if (abortSignal.aborted) {
          throw new Error('Inference was cancelled');
        }

        chunks.push(chunk);
        setStreamChunks(prev => [...prev, chunk]);

        // Update progress
        if (chunk.choices?.[0]?.delta?.content) {
          accumulatedContent += chunk.choices[0].delta.content;
          totalTokens++;
          
          setProgress({
            tokensGenerated: totalTokens,
            estimatedTotal: request.maxTokens || 2000,
            percentage: Math.min((totalTokens / (request.maxTokens || 2000)) * 100, 100),
          });
        }

        // Call stream callback
        onStream?.(chunk);
      }

      // Construct final response from chunks
      const finalResponse: InferenceResponse = {
        id: chunks[0]?.id || `inference-${Date.now()}`,
        model: request.model || '',
        choices: [{
          index: 0,
          message: {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: accumulatedContent,
            timestamp: new Date(),
          },
          finishReason: 'stop',
        }],
        usage: {
          promptTokens: estimateTokens(request.prompt || ''),
          completionTokens: totalTokens,
          totalTokens: estimateTokens(request.prompt || '') + totalTokens,
        },
        created: Math.floor(Date.now() / 1000),
        object: 'chat.completion',
      };

      return finalResponse;

    } catch (error) {
      throw createAIError(
        `Streaming inference failed: ${error}`,
        'NETWORK_ERROR',
        provider || 'unknown'
      );
    }
  };

  /**
   * Cancel ongoing inference
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (streamReaderRef.current) {
      streamReaderRef.current.cancel();
      streamReaderRef.current = null;
    }

    setLoading(false);
    setIsStreaming(false);
  }, []);

  /**
   * Calculate performance metrics
   */
  const calculateMetrics = (
    response: InferenceResponse,
    startTime: number,
    endTime: number,
    modelMetadata: any
  ): PerformanceMetrics => {
    const duration = endTime - startTime;
    const tokens = response.usage?.totalTokens || 0;
    const tokensPerSecond = tokens > 0 ? (tokens / duration) * 1000 : 0;

    const pricing = modelMetadata.pricingPer1kTokens;
    const cost = pricing ? (
      (response.usage?.promptTokens || 0) * pricing.input / 1000 +
      (response.usage?.completionTokens || 0) * pricing.output / 1000
    ) : 0;

    return {
      latency: duration,
      throughput: 1000 / duration,
      responseTime: duration,
      processingTime: duration,
      tokensPerSecond,
      inputTokens: response.usage?.promptTokens || 0,
      outputTokens: response.usage?.completionTokens || 0,
      totalTokens: tokens,
      memoryUsage: 0, // Would need actual memory monitoring
      cpuUsage: 0, // Would need actual CPU monitoring
      costPerRequest: cost,
      costPer1kTokens: pricing ? (pricing.input + pricing.output) / 2 : 0,
      totalCost: cost,
      timestamp: new Date(),
      model: response.model,
      provider: modelMetadata.provider,
    };
  };

  /**
   * Estimate token count for text (rough approximation)
   */
  const estimateTokens = (text: string): number => {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    data,
    loading,
    error,
    progress,
    infer,
    cancel,
    isStreaming,
    streamChunks,
    metrics,
    lastRequest,
  };
}