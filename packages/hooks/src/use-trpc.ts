import { trpc } from '../lib/trpc/client';

/**
 * Custom hook to use tRPC with additional utilities
 */
export function useTRPC() {
  const utils = trpc.useUtils();
  
  return {
    // Re-export the main trpc object
    trpc,
    
    // Utility functions
    utils,
    
    // Common invalidation patterns
    invalidateAll: () => utils.invalidate(),
    invalidateUser: () => utils.user.invalidate(),
    invalidatePosts: () => utils.post.invalidate(),
    invalidateAnalytics: () => utils.analytics.invalidate(),
    
    // Prefetch utilities
    prefetchUser: (id: string) => 
      utils.user.getById.prefetch({ id }),
    prefetchPost: (id: string) => 
      utils.post.getById.prefetch({ id }),
    prefetchPosts: () => 
      utils.post.list.prefetch({ limit: 10 }),
  };
}

// Export specific hooks for convenience
export const useUser = () => {
  const { data: user, isLoading, error } = trpc.user.me.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation();
  
  return {
    user,
    isLoading,
    error,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isLoading,
  };
};

export const usePosts = (options?: { limit?: number; cursor?: string }) => {
  const { data, isLoading, error, fetchNextPage, hasNextPage } = 
    trpc.post.list.useInfiniteQuery(
      { limit: options?.limit ?? 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );
  
  const posts = data?.pages.flatMap(page => page.posts) ?? [];
  
  return {
    posts,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
  };
};

export const useCreatePost = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.post.create.useMutation({
    onSuccess: () => {
      // Invalidate posts list after creating
      utils.post.list.invalidate();
      utils.post.myPosts.invalidate();
    },
  });
  
  return mutation;
};

export const useAnalytics = (dateRange: { startDate: string; endDate: string }) => {
  const pageViews = trpc.analytics.pageViews.useQuery({ 
    dateRange,
    groupBy: 'day',
  });
  
  const engagement = trpc.analytics.engagement.useQuery(dateRange);
  
  const conversions = trpc.analytics.conversions.useQuery({ dateRange });
  
  return {
    pageViews: pageViews.data,
    engagement: engagement.data,
    conversions: conversions.data,
    isLoading: pageViews.isLoading || engagement.isLoading || conversions.isLoading,
    error: pageViews.error || engagement.error || conversions.error,
  };
};

export const useAIChat = () => {
  const mutation = trpc.ai.chat.useMutation();
  
  return {
    sendMessage: mutation.mutate,
    isLoading: mutation.isLoading,
    response: mutation.data,
    error: mutation.error,
  };
};