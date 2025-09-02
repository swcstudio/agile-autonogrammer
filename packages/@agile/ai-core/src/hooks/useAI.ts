/**
 * useAI Hook
 * High-level React hook for AI interactions with conversation management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useExecutionEngine } from '@agile/core';
import type {
  UseAIOptions,
  UseAIReturn,
  Message,
  InferenceRequest,
  AIError,
  PerformanceMetrics,
} from '../types';
import { useModel } from './useModel';
import { useInference } from './useInference';
import { createAIError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const {
    provider,
    model: defaultModel,
    initialMessages = [],
    temperature = 0.7,
    maxTokens = 2000,
    stream = true,
    functions = [],
    autoRetry = true,
    maxRetries = 3,
    timeout = 30000,
    enableMetrics = true,
  } = options;

  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamingContent, setStreamingContent] = useState('');
  const [availableFunctions] = useState(functions.map(f => f.name));

  // Sub-hooks
  const {
    model,
    loading: modelLoading,
    error: modelError,
    isReady,
    switchModel,
  } = useModel(defaultModel, { 
    provider, 
    enableMetrics,
    preload: true,
  });

  const {
    data: inferenceData,
    loading: inferenceLoading,
    error: inferenceError,
    isStreaming,
    infer,
    cancel: cancelInference,
    metrics,
  } = useInference({
    provider,
    model: model?.id,
    enableMetrics,
    onStream: handleStreamChunk,
    onComplete: handleInferenceComplete,
    onError: handleInferenceError,
  });

  // Combined state
  const loading = modelLoading || inferenceLoading;
  const error = modelError || inferenceError;

  // Refs
  const functionHandlers = useRef(new Map(functions.map(f => [f.name, f.handler])));
  const retryCountRef = useRef(0);

  /**
   * Send a message and get AI response
   */
  const sendMessage = useCallback(async (
    content: string,
    options: Partial<InferenceRequest> = {}
  ): Promise<void> => {
    if (!model || !isReady) {
      throw createAIError(
        'No model is ready for inference',
        'UNKNOWN',
        provider || 'unknown'
      );
    }

    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Add user message to conversation
    setMessages(prev => [...prev, userMessage]);
    setStreamingContent('');

    // Prepare inference request
    const request: InferenceRequest = {
      model: model.id,
      messages: [...messages, userMessage],
      temperature: options.temperature ?? temperature,
      maxTokens: options.maxTokens ?? maxTokens,
      stream: stream,
      functions: functions.length > 0 ? functions.map(f => ({
        name: f.name,
        description: f.description,
        parameters: f.parameters,
      })) : undefined,
      ...options,
    };

    try {
      await infer(request);
    } catch (err) {
      // Handle retry logic
      if (autoRetry && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => sendMessage(content, options), 1000 * retryCountRef.current);
      } else {
        retryCountRef.current = 0;
        throw err;
      }
    }
  }, [
    model,
    isReady,
    provider,
    messages,
    temperature,
    maxTokens,
    stream,
    functions,
    autoRetry,
    maxRetries,
    infer,
  ]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    retryCountRef.current = 0;
  }, []);

  /**
   * Retry the last message
   */
  const retryLast = useCallback(async (): Promise<void> => {
    if (messages.length === 0) return;

    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');

    if (!lastUserMessage) return;

    // Remove messages after the last user message
    const lastUserIndex = messages.findLastIndex(msg => msg.id === lastUserMessage.id);
    setMessages(prev => prev.slice(0, lastUserIndex + 1));

    // Retry with the last user message
    await sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  /**
   * Call a function by name
   */
  const callFunction = useCallback(async (name: string, args: any): Promise<any> => {
    const handler = functionHandlers.current.get(name);
    if (!handler) {
      throw createAIError(
        `Function ${name} not found`,
        'UNKNOWN',
        provider || 'unknown'
      );
    }

    try {
      const result = await handler(args);
      return result;
    } catch (err) {
      throw createAIError(
        `Function ${name} execution failed: ${err}`,
        'UNKNOWN',
        provider || 'unknown'
      );
    }
  }, [provider]);

  /**
   * Handle streaming chunks
   */
  function handleStreamChunk(chunk: any): void {
    if (chunk.choices?.[0]?.delta?.content) {
      setStreamingContent(prev => prev + chunk.choices[0].delta.content);
    }

    // Handle function calls in streaming
    if (chunk.choices?.[0]?.delta?.functionCall) {
      // Handle function call streaming
      console.log('Function call in stream:', chunk.choices[0].delta.functionCall);
    }
  }

  /**
   * Handle inference completion
   */
  function handleInferenceComplete(response: any): void {
    retryCountRef.current = 0;

    const choice = response.choices?.[0];
    if (!choice) return;

    if (choice.message) {
      // Regular text response
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: choice.message.content || streamingContent,
        timestamp: new Date(),
        metadata: {
          finishReason: choice.finishReason,
          usage: response.usage,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
    }

    // Handle function calls
    if (choice.message?.functionCall) {
      const functionCall = choice.message.functionCall;
      handleFunctionCall(functionCall.name, functionCall.arguments);
    }

    setStreamingContent('');
  }

  /**
   * Handle inference errors
   */
  function handleInferenceError(error: AIError): void {
    console.error('Inference error:', error);
    
    // Add error message to conversation
    const errorMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: `Error: ${error.message}`,
      timestamp: new Date(),
      metadata: {
        error: true,
        errorCode: error.code,
      },
    };

    setMessages(prev => [...prev, errorMessage]);
    setStreamingContent('');
  }

  /**
   * Handle function call execution
   */
  const handleFunctionCall = useCallback(async (
    functionName: string,
    functionArgs: string
  ): Promise<void> => {
    try {
      // Parse function arguments
      const args = JSON.parse(functionArgs);
      
      // Add function call message
      const functionCallMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Calling function: ${functionName}`,
        timestamp: new Date(),
        metadata: {
          functionCall: {
            name: functionName,
            arguments: args,
          },
        },
      };
      setMessages(prev => [...prev, functionCallMessage]);

      // Execute function
      const result = await callFunction(functionName, args);

      // Add function result message
      const functionResultMessage: Message = {
        id: uuidv4(),
        role: 'function',
        content: JSON.stringify(result),
        timestamp: new Date(),
        metadata: {
          functionName,
          functionResult: result,
        },
      };
      setMessages(prev => [...prev, functionResultMessage]);

      // Continue conversation with function result
      const continueRequest: InferenceRequest = {
        model: model!.id,
        messages: [...messages, functionCallMessage, functionResultMessage],
        temperature,
        maxTokens,
        stream,
      };

      await infer(continueRequest);

    } catch (err) {
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Function call failed: ${err}`,
        timestamp: new Date(),
        metadata: {
          error: true,
          functionName,
        },
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [messages, model, temperature, maxTokens, stream, callFunction, infer]);

  /**
   * Update function handlers when functions change
   */
  useEffect(() => {
    functionHandlers.current = new Map(functions.map(f => [f.name, f.handler]));
  }, [functions]);

  return {
    messages,
    loading,
    error,
    metrics,
    sendMessage,
    clearMessages,
    retryLast,
    isStreaming,
    streamingContent,
    availableFunctions,
    callFunction,
  };
}