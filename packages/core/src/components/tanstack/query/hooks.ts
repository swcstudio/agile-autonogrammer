import {
  InfiniteData,
  type MutationKey,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

// Type-safe query key factory
export const createQueryKeys = <T extends Record<string, (...args: any[]) => QueryKey>>(
  keys: T
): T & { _def: T } => {
  return { ...keys, _def: keys };
};

// Enhanced useQuery with better error handling
export function useTypedQuery<
  TData = unknown,
  TError = AxiosError,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...options,
  });
}

// Enhanced useMutation with optimistic updates
export function useTypedMutation<
  TData = unknown,
  TError = AxiosError,
  TVariables = unknown,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    ...options,
    onMutate: async (variables) => {
      // Call the original onMutate if provided
      const context = await options?.onMutate?.(variables);
      return context;
    },
    onError: (error, variables, context) => {
      console.error('[Mutation Error]', error);
      options?.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      options?.onSettled?.(data, error, variables, context);
    },
  });
}

// Infinite query with pagination helpers
export function useTypedInfiniteQuery<
  TData = unknown,
  TError = AxiosError,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: ({ pageParam }: { pageParam?: any }) => Promise<TData>,
  options?: Omit<UseInfiniteQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useInfiniteQuery<TData, TError>({
    queryKey,
    queryFn,
    ...options,
  });
}

// Parallel queries with type safety
export function useTypedQueries<T extends readonly unknown[]>(
  queries: readonly [...{ [K in keyof T]: UseQueryOptions<T[K]> }]
) {
  return useQueries({ queries: queries as any });
}

// Custom hook for optimistic updates
export function useOptimisticMutation<
  TData = unknown,
  TError = AxiosError,
  TVariables = unknown,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    queryKey: QueryKey;
    optimisticUpdate: (oldData: any, variables: TVariables) => any;
  } & UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const queryClient = useQueryClient();

  return useTypedMutation<TData, TError, TVariables, TContext>(mutationFn, {
    ...options,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(options.queryKey);

      // Optimistically update
      queryClient.setQueryData(options.queryKey, (old: any) =>
        options.optimisticUpdate(old, variables)
      );

      // Return context with snapshot
      return { previousData, ...(await options.onMutate?.(variables)) };
    },
    onError: (error, variables, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }
      options.onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: options.queryKey });
      options.onSettled?.(data, error, variables, context);
    },
  });
}

// Hook for handling mutation states
export function useTypedMutationState<
  TData = unknown,
  TError = AxiosError,
  TVariables = unknown,
  TContext = unknown,
>(filters?: {
  mutationKey?: MutationKey;
  exact?: boolean;
  predicate?: (mutation: any) => boolean;
}) {
  return useMutationState<TData, TError, TVariables, TContext>({
    filters,
  });
}

// Subscription hook for real-time updates
export function useQuerySubscription<TData = unknown>(
  queryKey: QueryKey,
  subscribeFn: (callback: (data: TData) => void) => () => void
) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const unsubscribe = subscribeFn((data) => {
      queryClient.setQueryData(queryKey, data);
    });

    return unsubscribe;
  }, [queryKey, subscribeFn, queryClient]);
}

// Cache management hooks
export function useQueryCache() {
  const queryClient = useQueryClient();

  return {
    invalidate: (queryKey: QueryKey) => queryClient.invalidateQueries({ queryKey }),

    invalidateAll: () => queryClient.invalidateQueries(),

    refetch: (queryKey: QueryKey) => queryClient.refetchQueries({ queryKey }),

    remove: (queryKey: QueryKey) => queryClient.removeQueries({ queryKey }),

    reset: (queryKey: QueryKey) => queryClient.resetQueries({ queryKey }),

    setData: <TData>(queryKey: QueryKey, data: TData) => queryClient.setQueryData(queryKey, data),

    getData: <TData>(queryKey: QueryKey) => queryClient.getQueryData<TData>(queryKey),
  };
}

// Prefetching utilities
export function usePrefetch() {
  const queryClient = useQueryClient();

  return {
    prefetchQuery: async <TData>(
      queryKey: QueryKey,
      queryFn: () => Promise<TData>,
      staleTime?: number
    ) => {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
    },

    prefetchInfiniteQuery: async <TData>(
      queryKey: QueryKey,
      queryFn: ({ pageParam }: { pageParam?: any }) => Promise<TData>,
      options?: Omit<UseInfiniteQueryOptions<TData>, 'queryKey' | 'queryFn'>
    ) => {
      await queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn,
        ...options,
      });
    },
  };
}

// Error boundary integration
export function useQueryErrorResetBoundary() {
  const queryClient = useQueryClient();

  return {
    reset: () => {
      queryClient.resetQueries();
    },
    clearError: () => {
      queryClient.clear();
    },
  };
}

import React from 'react';
