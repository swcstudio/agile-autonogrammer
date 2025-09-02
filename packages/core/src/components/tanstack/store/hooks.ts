import type { Store } from '@tanstack/react-store';
import React from 'react';
import { useStore } from './Store';

// Hook for multiple store slices
export function useStoreSlices<TState, TSlices extends Record<string, (state: TState) => any>>(
  slices: TSlices
): { [K in keyof TSlices]: ReturnType<TSlices[K]> } {
  const result = {} as any;

  for (const key in slices) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    result[key] = useStore(slices[key]);
  }

  return result;
}

// Hook for store with immer-style updates
export function useImmerStore<TState>(
  store: Store<TState>
): [TState, (updater: (draft: TState) => void) => void] {
  const state = useStore<TState>();

  const setState = React.useCallback(
    (updater: (draft: TState) => void) => {
      store.setState((currentState) => {
        // Create a shallow copy for simple immer-like behavior
        const draft = { ...currentState };
        updater(draft);
        return draft;
      });
    },
    [store]
  );

  return [state, setState];
}

// Hook for async store operations
export function useAsyncStore<TState>(store: Store<TState>): {
  state: TState;
  execute: <T>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => Partial<TState>;
      onError?: (error: Error) => Partial<TState>;
      onLoading?: () => Partial<TState>;
    }
  ) => Promise<T>;
} {
  const state = useStore<TState>();

  const execute = React.useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options?: {
        onSuccess?: (result: T) => Partial<TState>;
        onError?: (error: Error) => Partial<TState>;
        onLoading?: () => Partial<TState>;
      }
    ): Promise<T> => {
      // Set loading state
      if (options?.onLoading) {
        store.setState((state) => ({
          ...state,
          ...options.onLoading(),
        }));
      }

      try {
        const result = await asyncFn();

        // Set success state
        if (options?.onSuccess) {
          store.setState((state) => ({
            ...state,
            ...options.onSuccess(result),
          }));
        }

        return result;
      } catch (error) {
        // Set error state
        if (options?.onError) {
          store.setState((state) => ({
            ...state,
            ...options.onError(error as Error),
          }));
        }
        throw error;
      }
    },
    [store]
  );

  return { state, execute };
}

// Hook for store history (undo/redo)
export interface UseStoreHistoryOptions {
  limit?: number;
  debounceMs?: number;
}

export function useStoreHistory<TState>(
  store: Store<TState>,
  options?: UseStoreHistoryOptions
): {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  history: TState[];
} {
  const { limit = 10, debounceMs = 500 } = options || {};

  const [history, setHistory] = React.useState<TState[]>([store.state]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const debounceTimerRef = React.useRef<NodeJS.Timeout>();

  // Subscribe to store changes
  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce history updates
      debounceTimerRef.current = setTimeout(() => {
        setHistory((prev) => {
          const newHistory = [...prev.slice(0, currentIndex + 1), store.state];
          // Limit history size
          if (newHistory.length > limit) {
            return newHistory.slice(-limit);
          }
          return newHistory;
        });
        setCurrentIndex((prev) => Math.min(prev + 1, limit - 1));
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [store, currentIndex, limit, debounceMs]);

  const undo = React.useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      store.setState(() => history[newIndex]);
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, history, store]);

  const redo = React.useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      store.setState(() => history[newIndex]);
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, history, store]);

  const clear = React.useCallback(() => {
    setHistory([store.state]);
    setCurrentIndex(0);
  }, [store.state]);

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    undo,
    redo,
    clear,
    history,
  };
}

// Hook for derived state with memoization
export function useDerivedStore<TState, TDerived>(
  store: Store<TState>,
  deriveFn: (state: TState) => TDerived,
  equalityFn?: (a: TDerived, b: TDerived) => boolean
): TDerived {
  const selector = React.useCallback(deriveFn, []);
  return useStore(selector, equalityFn);
}

// Hook for store middleware
export type StoreMiddleware<TState> = (
  store: Store<TState>,
  next: (updater: (state: TState) => TState) => void
) => (updater: (state: TState) => TState) => void;

export function useStoreWithMiddleware<TState>(
  store: Store<TState>,
  middleware: StoreMiddleware<TState>[]
): Store<TState> {
  const enhancedStore = React.useMemo(() => {
    // Create a proxy store with middleware
    const originalSetState = store.setState.bind(store);

    // Apply middleware in reverse order
    const enhancedSetState = middleware.reduceRight(
      (next, mw) => mw(store, next),
      originalSetState
    );

    // Override setState
    store.setState = enhancedSetState;

    return store;
  }, [store, middleware]);

  return enhancedStore;
}

// Logger middleware
export function createLoggerMiddleware<TState>(options?: {
  collapsed?: boolean;
  timestamp?: boolean;
  diff?: boolean;
}): StoreMiddleware<TState> {
  return (store, next) => (updater) => {
    const prevState = store.state;
    const startTime = performance.now();

    // Call next middleware
    next(updater);

    const nextState = store.state;
    const endTime = performance.now();

    // Log the update
    const groupMethod = options?.collapsed ? console.groupCollapsed : console.group;

    groupMethod(
      `%c Store Update ${options?.timestamp ? new Date().toISOString() : ''}`,
      'color: #7c3aed; font-weight: bold;'
    );

    console.log('%c prev state', 'color: #9ca3af', prevState);
    console.log('%c next state', 'color: #10b981', nextState);

    if (options?.diff) {
      console.log('%c diff', 'color: #f59e0b', getDiff(prevState, nextState));
    }

    console.log(`%c duration: ${(endTime - startTime).toFixed(2)}ms`, 'color: #6b7280');
    console.groupEnd();
  };
}

// Persistence middleware
export function createPersistenceMiddleware<TState>(
  key: string,
  options?: {
    storage?: Storage;
    serialize?: (state: TState) => string;
    deserialize?: (value: string) => TState;
    debounceMs?: number;
  }
): StoreMiddleware<TState> {
  const {
    storage = localStorage,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    debounceMs = 100,
  } = options || {};

  let debounceTimer: NodeJS.Timeout;

  return (store, next) => (updater) => {
    // Call next middleware
    next(updater);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce persistence
    debounceTimer = setTimeout(() => {
      try {
        const serialized = serialize(store.state);
        storage.setItem(key, serialized);
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    }, debounceMs);
  };
}

// Hook for subscribing to specific store changes
export function useStoreSubscription<TState, TSelected>(
  store: Store<TState>,
  selector: (state: TState) => TSelected,
  callback: (value: TSelected, prevValue: TSelected) => void,
  deps: React.DependencyList = []
) {
  const valueRef = React.useRef<TSelected>(selector(store.state));

  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newValue = selector(store.state);
      const prevValue = valueRef.current;

      if (newValue !== prevValue) {
        valueRef.current = newValue;
        callback(newValue, prevValue);
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps]);
}

// Utility function to get object diff
function getDiff(obj1: any, obj2: any): any {
  const diff: any = {};

  // Check removed and changed keys
  for (const key in obj1) {
    if (!(key in obj2)) {
      diff[key] = { removed: obj1[key] };
    } else if (obj1[key] !== obj2[key]) {
      diff[key] = { from: obj1[key], to: obj2[key] };
    }
  }

  // Check added keys
  for (const key in obj2) {
    if (!(key in obj1)) {
      diff[key] = { added: obj2[key] };
    }
  }

  return diff;
}
