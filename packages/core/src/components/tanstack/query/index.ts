// Core exports
export { QueryProvider, createQueryClient } from './QueryProvider';
export type { QueryProviderProps } from './QueryProvider';

// Boundary exports
export { QueryBoundary, AsyncBoundary, ListBoundary, ModalBoundary } from './QueryBoundary';
export type { QueryBoundaryProps } from './QueryBoundary';

// Hooks exports
export {
  createQueryKeys,
  useTypedQuery,
  useTypedMutation,
  useTypedInfiniteQuery,
  useTypedQueries,
  useOptimisticMutation,
  useTypedMutationState,
  useQuerySubscription,
  useQueryCache,
  usePrefetch,
  useQueryErrorResetBoundary,
} from './hooks';

// API client exports
export {
  createApiClient,
  createEndpoint,
  createBatchedApiClient,
  createTypedApi,
} from './createApiClient';
export type {
  ApiClientConfig,
  ApiEndpoint,
  ApiDefinition,
} from './createApiClient';

// Re-export commonly used types from @tanstack/react-query
export type {
  QueryKey,
  QueryFunction,
  QueryOptions,
  UseQueryOptions,
  UseQueryResult,
  MutationKey,
  MutationFunction,
  MutationOptions,
  UseMutationOptions,
  UseMutationResult,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  QueryClient,
  QueryClientConfig,
  InfiniteData,
} from '@tanstack/react-query';

// Export utility functions
export * from './utils';

// Export example query keys factory
export const queryKeys = {
  all: ['queries'] as const,
  users: () => [...queryKeys.all, 'users'] as const,
  user: (id: string) => [...queryKeys.users(), id] as const,
  posts: () => [...queryKeys.all, 'posts'] as const,
  post: (id: string) => [...queryKeys.posts(), id] as const,
  postComments: (postId: string) => [...queryKeys.post(postId), 'comments'] as const,
} as const;
