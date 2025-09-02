import type { QueryClient } from '@tanstack/react-query';
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  onRequest?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>;
  onResponse?: (response: any) => any;
  onError?: (error: AxiosError) => void;
  retryConfig?: {
    retries?: number;
    retryDelay?: (retryCount: number) => number;
    retryCondition?: (error: AxiosError) => boolean;
  };
}

export interface ApiEndpoint<TData = unknown, TVariables = unknown> {
  queryKey: unknown[];
  queryFn: (variables?: TVariables) => Promise<TData>;
  mutationFn?: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: unknown[][];
}

export interface ApiDefinition {
  [key: string]: ApiEndpoint | ApiDefinition;
}

// Create a type-safe API client
export function createApiClient<T extends ApiDefinition>(
  config: ApiClientConfig,
  endpoints: T
): {
  client: AxiosInstance;
  api: T;
  prefetch: (queryClient: QueryClient, key: keyof T, variables?: any) => Promise<void>;
} {
  // Create axios instance
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    withCredentials: config.withCredentials || false,
  });

  // Request interceptor
  client.interceptors.request.use(
    async (requestConfig) => {
      if (config.onRequest) {
        return await config.onRequest(requestConfig);
      }
      return requestConfig;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      if (config.onResponse) {
        return config.onResponse(response);
      }
      return response.data;
    },
    async (error: AxiosError) => {
      // Retry logic
      const retryConfig = config.retryConfig;
      if (retryConfig && error.config) {
        const { retries = 3, retryDelay, retryCondition } = retryConfig;
        const currentRetry = (error.config as any).__retryCount || 0;

        const shouldRetry = retryCondition
          ? retryCondition(error)
          : error.response?.status
            ? error.response.status >= 500
            : false;

        if (currentRetry < retries && shouldRetry) {
          (error.config as any).__retryCount = currentRetry + 1;

          const delay = retryDelay
            ? retryDelay(currentRetry)
            : Math.min(1000 * 2 ** currentRetry, 30000);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return client.request(error.config);
        }
      }

      // Call error handler
      if (config.onError) {
        config.onError(error);
      }

      return Promise.reject(error);
    }
  );

  // Prefetch utility
  const prefetch = async (queryClient: QueryClient, key: keyof T, variables?: any) => {
    const endpoint = endpoints[key] as ApiEndpoint;
    if (endpoint && endpoint.queryFn) {
      await queryClient.prefetchQuery({
        queryKey: endpoint.queryKey,
        queryFn: () => endpoint.queryFn(variables),
      });
    }
  };

  return {
    client,
    api: endpoints,
    prefetch,
  };
}

// Helper to create API endpoints
export function createEndpoint<TData = unknown, TVariables = unknown>(config: {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string | ((variables: TVariables) => string);
  queryKey: unknown[] | ((variables: TVariables) => unknown[]);
  transformResponse?: (data: any) => TData;
  transformRequest?: (variables: TVariables) => any;
  invalidateKeys?: unknown[][];
}): ApiEndpoint<TData, TVariables> {
  const queryFn = async (variables?: TVariables): Promise<TData> => {
    const url = typeof config.url === 'function' ? config.url(variables!) : config.url;

    const requestConfig: AxiosRequestConfig = {
      method: config.method,
      url,
    };

    if (variables && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      requestConfig.data = config.transformRequest ? config.transformRequest(variables) : variables;
    }

    if (variables && config.method === 'GET') {
      requestConfig.params = variables;
    }

    const response = await axios.request(requestConfig);

    return config.transformResponse ? config.transformResponse(response.data) : response.data;
  };

  const mutationFn = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method)
    ? queryFn
    : undefined;

  return {
    queryKey:
      typeof config.queryKey === 'function' ? config.queryKey(undefined as any) : config.queryKey,
    queryFn,
    mutationFn,
    invalidateKeys: config.invalidateKeys,
  };
}

// Batch request utility
export function createBatchedApiClient<T extends ApiDefinition>(
  config: ApiClientConfig,
  endpoints: T,
  batchConfig?: {
    maxBatchSize?: number;
    batchDelay?: number;
  }
): ReturnType<typeof createApiClient<T>> & {
  batch: <K extends keyof T>(requests: Array<{ key: K; variables?: any }>) => Promise<Array<any>>;
} {
  const apiClient = createApiClient(config, endpoints);

  const batch = async <K extends keyof T>(
    requests: Array<{ key: K; variables?: any }>
  ): Promise<Array<any>> => {
    const maxBatchSize = batchConfig?.maxBatchSize || 10;
    const batchDelay = batchConfig?.batchDelay || 0;

    const results: any[] = [];

    for (let i = 0; i < requests.length; i += maxBatchSize) {
      const batch = requests.slice(i, i + maxBatchSize);

      const batchPromises = batch.map(({ key, variables }) => {
        const endpoint = endpoints[key] as ApiEndpoint;
        return endpoint.queryFn(variables);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (i + maxBatchSize < requests.length && batchDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, batchDelay));
      }
    }

    return results;
  };

  return {
    ...apiClient,
    batch,
  };
}

// Type-safe API factory
export function createTypedApi<T extends Record<string, any>>() {
  return {
    endpoint: <TData = unknown, TVariables = unknown>(
      config: Parameters<typeof createEndpoint<TData, TVariables>>[0]
    ) => createEndpoint<TData, TVariables>(config),

    resource: <TResource extends Record<string, any>>(
      basePath: string,
      options?: {
        idKey?: string;
        transformItem?: (item: any) => TResource;
        transformList?: (items: any[]) => TResource[];
      }
    ) => {
      const idKey = options?.idKey || 'id';

      return {
        list: createEndpoint<TResource[], { page?: number; limit?: number }>({
          method: 'GET',
          url: basePath,
          queryKey: [basePath, 'list'],
          transformResponse: options?.transformList,
        }),

        get: createEndpoint<TResource, { id: string | number }>({
          method: 'GET',
          url: (variables) => `${basePath}/${variables.id}`,
          queryKey: (variables) => [basePath, variables.id],
          transformResponse: options?.transformItem,
        }),

        create: createEndpoint<TResource, Omit<TResource, typeof idKey>>({
          method: 'POST',
          url: basePath,
          queryKey: [basePath, 'create'],
          invalidateKeys: [[basePath, 'list']],
          transformResponse: options?.transformItem,
        }),

        update: createEndpoint<TResource, TResource>({
          method: 'PUT',
          url: (variables) => `${basePath}/${(variables as any)[idKey]}`,
          queryKey: (variables) => [basePath, (variables as any)[idKey]],
          invalidateKeys: (variables) => [
            [basePath, 'list'],
            [basePath, (variables as any)[idKey]],
          ],
          transformResponse: options?.transformItem,
        }),

        patch: createEndpoint<TResource, Partial<TResource> & { [key: string]: any }>({
          method: 'PATCH',
          url: (variables) => `${basePath}/${variables[idKey]}`,
          queryKey: (variables) => [basePath, variables[idKey]],
          invalidateKeys: (variables) => [
            [basePath, 'list'],
            [basePath, variables[idKey]],
          ],
          transformResponse: options?.transformItem,
        }),

        delete: createEndpoint<void, { id: string | number }>({
          method: 'DELETE',
          url: (variables) => `${basePath}/${variables.id}`,
          queryKey: (variables) => [basePath, variables.id, 'delete'],
          invalidateKeys: [[basePath, 'list']],
        }),
      };
    },
  };
}
