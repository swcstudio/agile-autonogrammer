/**
 * Typia Integration Hooks for Katalyst Core
 *
 * Comprehensive hook library for ultra-fast TypeScript validation/serialization.
 * Typia provides 30,000x faster validation than class-validator with zero runtime overhead.
 *
 * ARCHITECTURAL PRINCIPLE: These hooks enhance Katalyst's React patterns without replacement.
 * Katalyst remains superior for state management, routing, and components.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type TypiaContextValue, useTypia } from '../components/TypiaRuntimeProvider.tsx';

// Core Typia hook - main integration point
export function useTypiaCore() {
  const typia = useTypia();

  return useMemo(
    () => ({
      // Core status
      isEnabled: typia.isEnabled,
      isInitialized: typia.isInitialized,
      error: typia.error,
      config: typia.config,

      // Performance metrics
      performance: typia.performance,

      // Integration metadata
      integration: typia.integration,

      // Quick access to core methods
      assert: typia.validation.assert,
      is: typia.validation.is,
      validate: typia.validation.validate,
      equals: typia.validation.equals,
      stringify: typia.serialization.stringify,
      parse: typia.serialization.parse,
    }),
    [typia]
  );
}

// Validation hook with caching and error handling
export function useTypiaValidation<T = unknown>() {
  const typia = useTypia();
  const [lastValidation, setLastValidation] = useState<{
    input: unknown;
    result: { success: boolean; data: T; errors: any[] };
    timestamp: number;
  } | null>(null);

  const validate = useCallback(
    (input: unknown, cacheTime = 5000) => {
      // Simple caching to avoid redundant validations
      if (
        lastValidation &&
        JSON.stringify(lastValidation.input) === JSON.stringify(input) &&
        Date.now() - lastValidation.timestamp < cacheTime
      ) {
        return lastValidation.result;
      }

      const result = typia.validation.validate<T>(input);

      setLastValidation({
        input,
        result,
        timestamp: Date.now(),
      });

      return result;
    },
    [typia.validation, lastValidation]
  );

  const assert = useCallback(
    (input: unknown): T => {
      try {
        return typia.validation.assert<T>(input);
      } catch (error) {
        console.error('Typia assertion failed:', error);
        throw error;
      }
    },
    [typia.validation]
  );

  const is = useCallback(
    (input: unknown): input is T => {
      return typia.validation.is<T>(input);
    },
    [typia.validation]
  );

  const equals = useCallback(
    (a: T, b: T): boolean => {
      return typia.validation.equals(a, b);
    },
    [typia.validation]
  );

  return {
    validate,
    assert,
    is,
    equals,
    lastValidation: lastValidation?.result || null,
    performance: {
      speedup: typia.performance.validationSpeedup,
      zeroRuntime: typia.performance.zeroRuntimeOverhead,
    },
  };
}

// Serialization hook with automatic optimization
export function useTypiaSerialization<T = unknown>() {
  const typia = useTypia();
  const serializationCache = useRef(new Map<string, { result: string; timestamp: number }>());

  const stringify = useCallback(
    (input: T, options?: { space?: number; cache?: boolean; cacheTime?: number }): string => {
      const cacheKey = JSON.stringify(input);
      const cacheTime = options?.cacheTime || 10000; // 10 seconds default

      if (options?.cache !== false) {
        const cached = serializationCache.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheTime) {
          return cached.result;
        }
      }

      const result = typia.serialization.stringify(input);

      if (options?.cache !== false) {
        serializationCache.current.set(cacheKey, {
          result,
          timestamp: Date.now(),
        });
      }

      return result;
    },
    [typia.serialization]
  );

  const assertStringify = useCallback(
    (input: unknown): string => {
      try {
        return typia.serialization.assertStringify<T>(input);
      } catch (error) {
        console.error('Typia assertStringify failed:', error);
        throw error;
      }
    },
    [typia.serialization]
  );

  const isStringify = useCallback(
    (input: unknown): string | null => {
      return typia.serialization.isStringify<T>(input);
    },
    [typia.serialization]
  );

  const parse = useCallback(
    (json: string): T => {
      try {
        return typia.serialization.parse<T>(json);
      } catch (error) {
        console.error('Typia parse failed:', error);
        throw error;
      }
    },
    [typia.serialization]
  );

  const assertParse = useCallback(
    (json: string): T => {
      try {
        return typia.serialization.assertParse<T>(json);
      } catch (error) {
        console.error('Typia assertParse failed:', error);
        throw error;
      }
    },
    [typia.serialization]
  );

  // Cleanup cache periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const cache = serializationCache.current;

      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > 60000) {
          // 1 minute
          cache.delete(key);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(cleanup);
  }, []);

  return {
    stringify,
    assertStringify,
    isStringify,
    parse,
    assertParse,
    performance: {
      speedup: typia.performance.serializationSpeedup,
      compileTime: typia.performance.compileTimeOptimization,
    },
    cacheStats: {
      size: serializationCache.current.size,
      clear: () => serializationCache.current.clear(),
    },
  };
}

// Random data generation hook for testing
export function useTypiaGeneration<T = unknown>() {
  const typia = useTypia();
  const [generationHistory, setGenerationHistory] = useState<T[]>([]);

  const random = useCallback((): T => {
    const result = typia.generation.random<T>();
    setGenerationHistory((prev) => [...prev.slice(-9), result]); // Keep last 10
    return result;
  }, [typia.generation]);

  const createRandom = useCallback((): (() => T) => {
    return typia.generation.createRandom<T>();
  }, [typia.generation]);

  const randomBatch = useCallback(
    (count: number): T[] => {
      const generator = createRandom();
      return Array.from({ length: count }, () => generator());
    },
    [createRandom]
  );

  const clearHistory = useCallback(() => {
    setGenerationHistory([]);
  }, []);

  return {
    random,
    createRandom,
    randomBatch,
    history: generationHistory,
    clearHistory,
    performance: {
      speedup: '100x faster than faker.js',
      compileTime: typia.performance.compileTimeOptimization,
    },
  };
}

// Protocol Buffer hook for binary serialization
export function useTypiaProtobuf<T = unknown>() {
  const typia = useTypia();
  const [compressionStats, setCompressionStats] = useState<{
    jsonSize: number;
    protobufSize: number;
    compressionRatio: number;
  } | null>(null);

  const encode = useCallback(
    (input: T): Uint8Array => {
      const buffer = typia.protobuf.encode(input);

      // Calculate compression statistics
      const jsonString = JSON.stringify(input);
      const jsonSize = new TextEncoder().encode(jsonString).length;
      const protobufSize = buffer.length;

      setCompressionStats({
        jsonSize,
        protobufSize,
        compressionRatio: jsonSize / protobufSize,
      });

      return buffer;
    },
    [typia.protobuf]
  );

  const decode = useCallback(
    (buffer: Uint8Array): T => {
      return typia.protobuf.decode<T>(buffer);
    },
    [typia.protobuf]
  );

  const message = useCallback(() => {
    return typia.protobuf.message<T>();
  }, [typia.protobuf]);

  const encodeDecodeTest = useCallback(
    (input: T): { success: boolean; data?: T; error?: string } => {
      try {
        const encoded = encode(input);
        const decoded = decode(encoded);
        return { success: true, data: decoded };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [encode, decode]
  );

  return {
    encode,
    decode,
    message,
    encodeDecodeTest,
    compressionStats,
    performance: {
      speedup: '5x faster than protobuf.js',
      binaryEfficiency: true,
    },
  };
}

// JSON Schema generation hook
export function useTypiaJsonSchema<T = unknown>() {
  const typia = useTypia();
  const [schemaCache, setSchemaCache] = useState<Map<string, any>>(new Map());

  const schema = useCallback(
    (typeKey?: string): any => {
      if (typeKey && schemaCache.has(typeKey)) {
        return schemaCache.get(typeKey);
      }

      const result = typia.jsonSchema.schema<T>();

      if (typeKey) {
        setSchemaCache((prev) => new Map(prev).set(typeKey, result));
      }

      return result;
    },
    [typia.jsonSchema, schemaCache]
  );

  const application = useCallback(
    <TTypes extends readonly any[]>(typeKey?: string) => {
      if (typeKey && schemaCache.has(typeKey)) {
        return schemaCache.get(typeKey);
      }

      const result = typia.jsonSchema.application<TTypes>();

      if (typeKey) {
        setSchemaCache((prev) => new Map(prev).set(typeKey, result));
      }

      return result;
    },
    [typia.jsonSchema, schemaCache]
  );

  const clearCache = useCallback(() => {
    setSchemaCache(new Map());
  }, []);

  return {
    schema,
    application,
    clearCache,
    cacheSize: schemaCache.size,
    performance: {
      compileTime: true,
      zeroRuntime: typia.performance.zeroRuntimeOverhead,
    },
  };
}

// Form validation hook with Typia integration
export function useTypiaForm<T extends Record<string, any>>(initialValues: T) {
  const { validate, is } = useTypiaValidation<T>();
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Real-time validation
      const newValues = { ...values, [field]: value };
      const validation = validate(newValues);

      if (!validation.success && validation.errors.length > 0) {
        const fieldError = validation.errors.find((error) => error.path.includes(String(field)));

        if (fieldError) {
          setErrors((prev) => ({
            ...prev,
            [field]: fieldError.expected || 'Validation failed',
          }));
        }
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [values, validate]
  );

  const validateForm = useCallback((): boolean => {
    const validation = validate(values);

    if (!validation.success) {
      const formErrors: Record<keyof T, string> = {} as Record<keyof T, string>;

      validation.errors.forEach((error) => {
        const field = error.path.split('.').pop() as keyof T;
        if (field) {
          formErrors[field] = error.expected || 'Validation failed';
        }
      });

      setErrors(formErrors);
      return false;
    }

    setErrors({} as Record<keyof T, string>);
    return true;
  }, [values, validate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string>);
    setTouched({} as Record<keyof T, boolean>);
  }, [initialValues]);

  const isValid = useMemo(() => {
    return is(values) && Object.keys(errors).length === 0;
  }, [values, errors, is]);

  return {
    values,
    errors,
    touched,
    setValue,
    validateForm,
    reset,
    isValid,
    performance: {
      validationSpeed: '30,000x faster than alternatives',
      realTimeValidation: true,
    },
  };
}

// Performance monitoring hook
export function useTypiaPerformance() {
  const typia = useTypia();
  const [benchmarks, setBenchmarks] = useState<{
    validation: { start: number; end: number; duration: number } | null;
    serialization: { start: number; end: number; duration: number } | null;
    generation: { start: number; end: number; duration: number } | null;
  }>({
    validation: null,
    serialization: null,
    generation: null,
  });

  const benchmark = useCallback(
    (operation: 'validation' | 'serialization' | 'generation', fn: () => any) => {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      const duration = end - start;

      setBenchmarks((prev) => ({
        ...prev,
        [operation]: { start, end, duration },
      }));

      return result;
    },
    []
  );

  const clearBenchmarks = useCallback(() => {
    setBenchmarks({
      validation: null,
      serialization: null,
      generation: null,
    });
  }, []);

  return {
    benchmark,
    benchmarks,
    clearBenchmarks,
    performance: typia.performance,
    integration: typia.integration,
  };
}

// Export all hooks
export {
  useTypiaCore,
  useTypiaValidation,
  useTypiaSerialization,
  useTypiaGeneration,
  useTypiaProtobuf,
  useTypiaJsonSchema,
  useTypiaForm,
  useTypiaPerformance,
};

// Re-export the main useTypia hook for convenience
export { useTypia };
