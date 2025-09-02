import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

// Utility to check if data is stale
export function isDataStale(queryClient: QueryClient, queryKey: QueryKey, staleTime = 0): boolean {
  const state = queryClient.getQueryState(queryKey);
  if (!state || !state.dataUpdatedAt) return true;

  return Date.now() - state.dataUpdatedAt > staleTime;
}

// Utility to get all query keys matching a pattern
export function getQueryKeysByPattern(queryClient: QueryClient, pattern: QueryKey): QueryKey[] {
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();

  return queries
    .filter((query) => {
      const queryKey = query.queryKey;
      return pattern.every((item, index) => {
        if (item === undefined) return true;
        return JSON.stringify(queryKey[index]) === JSON.stringify(item);
      });
    })
    .map((query) => query.queryKey);
}

// Utility to batch invalidate queries
export async function batchInvalidateQueries(
  queryClient: QueryClient,
  queryKeys: QueryKey[]
): Promise<void> {
  await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

// Utility to wait for queries to be fetched
export async function waitForQueries(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
  timeout = 5000
): Promise<void> {
  const promises = queryKeys.map((queryKey) => {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Query ${JSON.stringify(queryKey)} timed out`));
      }, timeout);

      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        if (
          event.type === 'updated' &&
          JSON.stringify(event.query.queryKey) === JSON.stringify(queryKey) &&
          event.action.type === 'success'
        ) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve();
        }
      });

      // Check if query is already successful
      const state = queryClient.getQueryState(queryKey);
      if (state?.status === 'success') {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      }
    });
  });

  await Promise.all(promises);
}

// Utility for optimistic infinite query updates
export function updateInfiniteQueryData<TData, TPageData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (oldData: InfiniteData<TPageData> | undefined) => InfiniteData<TPageData>
): void {
  queryClient.setQueryData<InfiniteData<TPageData>>(queryKey, updater);
}

// Utility to merge paginated data
export function mergeInfiniteData<TPageData>(
  oldData: InfiniteData<TPageData> | undefined,
  newPage: TPageData,
  options?: {
    prepend?: boolean;
    pageParamKey?: string;
  }
): InfiniteData<TPageData> {
  if (!oldData) {
    return {
      pages: [newPage],
      pageParams: [null],
    };
  }

  const { prepend = false } = options || {};

  return {
    pages: prepend ? [newPage, ...oldData.pages] : [...oldData.pages, newPage],
    pageParams: prepend ? [null, ...oldData.pageParams] : [...oldData.pageParams, null],
  };
}

// Utility to handle query errors
export function handleQueryError(
  error: unknown,
  options?: {
    showToast?: boolean;
    logError?: boolean;
    customMessage?: string;
  }
): string {
  const { showToast = true, logError = true, customMessage } = options || {};

  let errorMessage = 'An unexpected error occurred';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    errorMessage = String((error as any).message);
  }

  if (customMessage) {
    errorMessage = customMessage;
  }

  if (logError) {
    console.error('[Query Error]', error);
  }

  if (showToast && typeof window !== 'undefined') {
    // You can integrate with your toast library here
    console.error(errorMessage);
  }

  return errorMessage;
}

// Utility to create a query key factory
export function createQueryKeyFactory<T extends string>(namespace: T) {
  return {
    all: [namespace] as const,
    lists: () => [...this.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...this.lists(), filters] as const,
    details: () => [...this.all, 'detail'] as const,
    detail: (id: string | number) => [...this.details(), id] as const,
  };
}

// Utility for query persistence
export function createQueryPersister(options?: {
  storage?: Storage;
  key?: string;
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
}) {
  const {
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
    key = 'tanstack-query-cache',
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options || {};

  return {
    persistClient: async (client: QueryClient) => {
      if (!storage) return;

      const cache = client.getQueryCache();
      const queries = cache.getAll();

      const persistedData = queries.reduce(
        (acc, query) => {
          if (query.state.status === 'success') {
            acc[JSON.stringify(query.queryKey)] = {
              data: query.state.data,
              dataUpdatedAt: query.state.dataUpdatedAt,
            };
          }
          return acc;
        },
        {} as Record<string, any>
      );

      storage.setItem(key, serialize(persistedData));
    },

    restoreClient: async (client: QueryClient) => {
      if (!storage) return;

      const item = storage.getItem(key);
      if (!item) return;

      try {
        const persistedData = deserialize(item);

        Object.entries(persistedData).forEach(([queryKeyStr, value]) => {
          const queryKey = JSON.parse(queryKeyStr);
          client.setQueryData(queryKey, (value as any).data);
        });
      } catch (error) {
        console.error('Failed to restore query cache:', error);
      }
    },

    removeClient: async () => {
      if (!storage) return;
      storage.removeItem(key);
    },
  };
}

// Utility for query deduplication
export function dedupeInFlightRequests<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  const inFlightRequests = new Map<string, Promise<any>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key)!;
    }

    const promise = fn(...args)
      .then((result) => {
        inFlightRequests.delete(key);
        return result;
      })
      .catch((error) => {
        inFlightRequests.delete(key);
        throw error;
      });

    inFlightRequests.set(key, promise);
    return promise;
  }) as T;
}
