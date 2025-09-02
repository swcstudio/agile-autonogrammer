import {
  type Mutation,
  MutationCache,
  type Query,
  QueryCache,
  QueryClient,
  type QueryClientConfig,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { type ReactNode } from 'react';

export interface QueryProviderProps {
  children: ReactNode;
  config?: QueryClientConfig;
  enableDevtools?: boolean;
  devtoolsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onError?: (
    error: Error,
    query: Query<unknown, unknown, unknown> | Mutation<unknown, unknown, unknown, unknown>
  ) => void;
  onSuccess?: (
    data: unknown,
    query: Query<unknown, unknown, unknown> | Mutation<unknown, unknown, unknown, unknown>
  ) => void;
  onSettled?: (
    data: unknown | undefined,
    error: Error | null,
    query: Query<unknown, unknown, unknown> | Mutation<unknown, unknown, unknown, unknown>
  ) => void;
}

const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      structuralSharing: true,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
};

export const createQueryClient = (
  config?: QueryClientConfig,
  onError?: QueryProviderProps['onError'],
  onSuccess?: QueryProviderProps['onSuccess'],
  onSettled?: QueryProviderProps['onSettled']
): QueryClient => {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      console.error('[QueryCache Error]', error);
      onError?.(error as Error, query);
    },
    onSuccess: (data, query) => {
      onSuccess?.(data, query);
    },
    onSettled: (data, error, query) => {
      onSettled?.(data, error, query);
    },
  });

  const mutationCache = new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      console.error('[MutationCache Error]', error);
      onError?.(error as Error, mutation);
    },
    onSuccess: (data, _variables, _context, mutation) => {
      onSuccess?.(data, mutation);
    },
    onSettled: (data, error, _variables, _context, mutation) => {
      onSettled?.(data, error, mutation);
    },
  });

  return new QueryClient({
    ...defaultQueryClientConfig,
    ...config,
    queryCache,
    mutationCache,
  });
};

export const QueryProvider: React.FC<QueryProviderProps> = ({
  children,
  config,
  enableDevtools = true,
  devtoolsPosition = 'bottom-right',
  onError,
  onSuccess,
  onSettled,
}) => {
  const [queryClient] = React.useState(() =>
    createQueryClient(config, onError, onSuccess, onSettled)
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {enableDevtools && process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position={devtoolsPosition}
          buttonPosition={devtoolsPosition}
        />
      )}
    </QueryClientProvider>
  );
};

// Export utility functions for manual query client control
export const invalidateQueries = (queryClient: QueryClient, queryKey: unknown[]) => {
  return queryClient.invalidateQueries({ queryKey });
};

export const prefetchQuery = async (
  queryClient: QueryClient,
  queryKey: unknown[],
  queryFn: () => Promise<unknown>,
  staleTime?: number
) => {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime,
  });
};

export const setQueryData = (
  queryClient: QueryClient,
  queryKey: unknown[],
  updater: unknown | ((oldData: unknown) => unknown)
) => {
  return queryClient.setQueryData(queryKey, updater);
};

export const getQueryData = (queryClient: QueryClient, queryKey: unknown[]) => {
  return queryClient.getQueryData(queryKey);
};

export const removeQueries = (queryClient: QueryClient, queryKey: unknown[]) => {
  return queryClient.removeQueries({ queryKey });
};
