import { useCallback, useEffect, useRef, useState } from 'react';
import { useKatalystContext } from '../components/KatalystProvider.tsx';
import { useSailsRuntime } from '../components/SailsRuntimeProvider.tsx';
import type { SailsConfig } from '../integrations/sails.ts';

interface UseSailsOptions {
  onError?: (error: Error) => void;
  onSuccess?: (result: any) => void;
}

// Main Sails hook - bridges to Katalyst's superior state management
export function useSails(options: UseSailsOptions = {}) {
  const sailsRuntime = useSailsRuntime();
  const katalyst = useKatalystContext(); // Katalyst takes precedence for all state management
  const { onError, onSuccess } = options;

  return {
    // Sails backend connectivity
    isConnected: sailsRuntime.isInitialized,
    config: sailsRuntime.config,
    api: sailsRuntime.api,
    socket: sailsRuntime.socket,
    models: sailsRuntime.models,

    // Integration status - CRITICAL: Katalyst remains superior
    integration: {
      frontend: 'katalyst', // Katalyst handles all frontend concerns
      backend: 'sails', // Sails only provides backend API layer
      stateManagement: 'katalyst-zustand', // Katalyst's Zustand integration is superior
      routing: 'katalyst-tanstack', // Katalyst's TanStack Router is superior
      bridgeMode: true, // Always in bridge mode - never replace Katalyst
    },

    // Expose Katalyst context for integration
    katalyst,
  };
}

// Model hook - provides CRUD operations for Sails models
export function useSailsModel<T = any>(modelName: string) {
  const { models, api } = useSailsRuntime();
  const katalyst = useKatalystContext(); // Integrate with Katalyst state
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const model = models[modelName];

  const find = useCallback(
    async (criteria?: any): Promise<T[]> => {
      setLoading(true);
      setError(null);

      try {
        const result = await model.find(criteria);
        setData(result);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [model]
  );

  const findOne = useCallback(
    async (id: string | number): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await model.findOne(id);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [model]
  );

  const create = useCallback(
    async (data: Partial<T>): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const result = await model.create(data);
        // Update local state optimistically
        setData((prev) => [...prev, result]);

        // Optionally sync with Katalyst state management
        katalyst.updateConfig({
          // Update Katalyst state if needed
          lastCreated: result,
        });

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [model, katalyst]
  );

  const update = useCallback(
    async (id: string | number, data: Partial<T>): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const result = await model.update(id, data);
        // Update local state optimistically
        setData((prev) =>
          prev.map((item) => ((item as any).id === id ? { ...item, ...result } : item))
        );
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [model]
  );

  const destroy = useCallback(
    async (id: string | number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await model.destroy(id);
        // Update local state optimistically
        setData((prev) => prev.filter((item) => (item as any).id !== id));
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [model]
  );

  return {
    data,
    loading,
    error,
    find,
    findOne,
    create,
    update,
    destroy,
    // Direct model access for advanced operations
    model,
  };
}

// API hook - provides direct access to Sails REST endpoints
export function useSailsAPI() {
  const { api } = useSailsRuntime();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const request = useCallback(
    async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any) => {
      setLoading(true);
      setError(null);

      try {
        let result;
        switch (method) {
          case 'GET':
            result = await api.get(endpoint, data);
            break;
          case 'POST':
            result = await api.post(endpoint, data);
            break;
          case 'PUT':
            result = await api.put(endpoint, data);
            break;
          case 'DELETE':
            result = await api.delete(endpoint);
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${method}`);
        }
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const get = useCallback(
    (endpoint: string, params?: any) => request('GET', endpoint, params),
    [request]
  );

  const post = useCallback(
    (endpoint: string, data?: any) => request('POST', endpoint, data),
    [request]
  );

  const put = useCallback(
    (endpoint: string, data?: any) => request('PUT', endpoint, data),
    [request]
  );

  const del = useCallback((endpoint: string) => request('DELETE', endpoint), [request]);

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    delete: del,
    // Direct API access
    api,
  };
}

// WebSocket hook - provides real-time communication with Sails backend
export function useSailsSocket() {
  const { socket, config } = useSailsRuntime();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const connect = useCallback(() => {
    if (socket) {
      socket.connect();
      setConnected(true);
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setConnected(false);
    }
  }, [socket]);

  const emit = useCallback(
    (event: string, data?: any) => {
      if (socket && connected) {
        socket.emit(event, data);
      }
    },
    [socket, connected]
  );

  const on = useCallback(
    (event: string, callback: Function) => {
      if (socket) {
        socket.on(event, callback);
      }
    },
    [socket]
  );

  const off = useCallback(
    (event: string, callback?: Function) => {
      if (socket) {
        socket.off(event, callback);
      }
    },
    [socket]
  );

  useEffect(() => {
    if (config.websockets && socket) {
      // Auto-connect if WebSockets are enabled
      connect();

      return () => {
        disconnect();
      };
    }
  }, [config.websockets, socket, connect, disconnect]);

  return {
    connected,
    messages,
    connect,
    disconnect,
    emit,
    on,
    off,
    socket,
  };
}

// Query hook - similar to React Query but for Sails data
export function useSailsQuery<T = any>(
  queryKey: string | string[],
  queryFn: () => Promise<T>,
  options: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
    cacheTime?: number;
  } = {}
) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const {
    enabled = true,
    refetchOnWindowFocus = false,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
  } = options;

  const queryKeyString = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;

  const execute = useCallback(async () => {
    if (!enabled) return;

    // Check if data is still fresh
    const now = Date.now();
    if (data && now - lastFetch < staleTime) {
      return data;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
      setLastFetch(now);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [queryFn, enabled, data, lastFetch, staleTime]);

  const refetch = useCallback(() => {
    setLastFetch(0); // Force refetch
    return execute();
  }, [execute]);

  const invalidate = useCallback(() => {
    setData(undefined);
    setLastFetch(0);
  }, []);

  useEffect(() => {
    execute();
  }, [queryKeyString, execute]);

  useEffect(() => {
    if (refetchOnWindowFocus) {
      const handleFocus = () => execute();
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [refetchOnWindowFocus, execute]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isStale: data && Date.now() - lastFetch > staleTime,
  };
}

// Mutation hook - for data modifications
export function useSailsMutation<T = any, V = any>(
  mutationFn: (variables: V) => Promise<T>,
  options: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    onSettled?: (data: T | undefined, error: Error | null, variables: V) => void;
  } = {}
) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { onSuccess, onError, onSettled } = options;

  const mutate = useCallback(
    async (variables: V) => {
      setLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result);
        onSuccess?.(result, variables);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error, variables);
        throw error;
      } finally {
        setLoading(false);
        onSettled?.(data, error, variables);
      }
    },
    [mutationFn, onSuccess, onError, onSettled, data, error]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    mutate,
    reset,
  };
}

// Blueprint hook - for auto-generated Sails REST APIs
export function useSailsBlueprint<T = any>(modelName: string, enabled = true) {
  const { config } = useSailsRuntime();
  const apiPrefix = config.katalystBridge?.apiNamespace || '/api/v1';

  const { data, loading, error, refetch } = useSailsQuery(
    ['blueprint', modelName],
    async () => {
      const { api } = useSailsRuntime();
      return api.get(`${apiPrefix}/${modelName}`);
    },
    { enabled }
  );

  const createMutation = useSailsMutation<T, Partial<T>>(
    async (newData) => {
      const { api } = useSailsRuntime();
      return api.post(`${apiPrefix}/${modelName}`, newData);
    },
    {
      onSuccess: () => refetch(),
    }
  );

  const updateMutation = useSailsMutation<T, { id: string | number; data: Partial<T> }>(
    async ({ id, data }) => {
      const { api } = useSailsRuntime();
      return api.put(`${apiPrefix}/${modelName}/${id}`, data);
    },
    {
      onSuccess: () => refetch(),
    }
  );

  const deleteMutation = useSailsMutation<boolean, string | number>(
    async (id) => {
      const { api } = useSailsRuntime();
      await api.delete(`${apiPrefix}/${modelName}/${id}`);
      return true;
    },
    {
      onSuccess: () => refetch(),
    }
  );

  return {
    data: data as T[],
    loading,
    error,
    refetch,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    mutations: {
      create: createMutation,
      update: updateMutation,
      delete: deleteMutation,
    },
  };
}

// Configuration hook
export function useSailsConfig(): SailsConfig {
  const { config } = useSailsRuntime();
  return config;
}

// Status hook
export function useSailsStatus() {
  const { isInitialized, isLoading, error, config } = useSailsRuntime();

  return {
    isInitialized,
    isLoading,
    error,
    mode: config.mode,
    role: config.role,
    features: {
      models: !!config.models,
      controllers: !!config.controllers,
      services: !!config.services,
      policies: !!config.policies,
      helpers: !!config.helpers,
      websockets: !!config.websockets,
      blueprints: !!config.blueprints,
      security: !!config.security,
      i18n: !!config.i18n,
    },
    integration: {
      katalystBridge: config.katalystBridge,
      frontendFramework: 'katalyst', // Always Katalyst
      backendFramework: 'sails',
    },
  };
}

// Helper utilities
export function createSailsModel<T>(modelName: string, attributes: Record<string, any>) {
  return {
    identity: modelName,
    attributes: {
      ...attributes,
      id: { type: 'number', autoIncrement: true },
      createdAt: { type: 'number', autoCreatedAt: true },
      updatedAt: { type: 'number', autoUpdatedAt: true },
    },
  };
}

export function createSailsController(actions: Record<string, Function>) {
  return actions;
}

// Export all hooks for easy access
export const SailsHooks = {
  useSails,
  useSailsModel,
  useSailsAPI,
  useSailsSocket,
  useSailsQuery,
  useSailsMutation,
  useSailsBlueprint,
  useSailsConfig,
  useSailsStatus,
};

export default SailsHooks;
