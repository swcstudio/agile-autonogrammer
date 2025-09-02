import { Store, useStore as useTanStackStore } from '@tanstack/react-store';
import React from 'react';

// Type-safe store creation
export interface StoreOptions<TState> {
  initialState: TState;
  name?: string;
  persist?:
    | boolean
    | {
        key: string;
        storage?: Storage;
        serialize?: (state: TState) => string;
        deserialize?: (value: string) => TState;
      };
  devtools?: boolean;
}

export function createStore<TState extends Record<string, any>>(
  options: StoreOptions<TState>
): Store<TState> {
  const { initialState, name, persist, devtools = true } = options;

  // Load persisted state if enabled
  let persistedState: Partial<TState> | undefined;
  if (persist) {
    const persistConfig =
      typeof persist === 'object'
        ? persist
        : {
            key: name || 'tanstack-store',
            storage: localStorage,
          };

    try {
      const saved = persistConfig.storage?.getItem(persistConfig.key);
      if (saved) {
        persistedState = persistConfig.deserialize
          ? persistConfig.deserialize(saved)
          : JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }

  // Create store
  const store = new Store<TState>({
    ...initialState,
    ...persistedState,
  });

  // Setup persistence
  if (persist) {
    const persistConfig =
      typeof persist === 'object'
        ? persist
        : {
            key: name || 'tanstack-store',
            storage: localStorage,
            serialize: JSON.stringify,
            deserialize: JSON.parse,
          };

    store.subscribe(() => {
      try {
        const state = store.state;
        const serialized = persistConfig.serialize
          ? persistConfig.serialize(state)
          : JSON.stringify(state);
        persistConfig.storage?.setItem(persistConfig.key, serialized);
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    });
  }

  // Setup devtools
  if (devtools && typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: name || 'TanStack Store',
    });

    devTools.init(store.state);

    store.subscribe(() => {
      devTools.send('STATE_UPDATE', store.state);
    });
  }

  return store;
}

// React Provider component
export interface StoreProviderProps<TState> {
  store: Store<TState>;
  children: React.ReactNode;
}

const StoreContext = React.createContext<Store<any> | null>(null);

export function StoreProvider<TState>({ store, children }: StoreProviderProps<TState>) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

// Enhanced useStore hook
export function useStore<TState, TSelected = TState>(
  selector?: (state: TState) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): TSelected {
  const store = React.useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }

  return useTanStackStore(store, selector as any, equalityFn);
}

// Action creators
export type Action<TPayload = void> = TPayload extends void
  ? { type: string }
  : { type: string; payload: TPayload };

export type ActionCreator<TPayload = void> = TPayload extends void
  ? () => Action<TPayload>
  : (payload: TPayload) => Action<TPayload>;

export function createAction<TPayload = void>(type: string): ActionCreator<TPayload> {
  return ((payload?: TPayload) => {
    if (payload === undefined) {
      return { type };
    }
    return { type, payload };
  }) as ActionCreator<TPayload>;
}

// Reducer utilities
export type Reducer<TState, TAction extends Action<any>> = (
  state: TState,
  action: TAction
) => TState;

export function createReducer<
  TState,
  TActionMap extends Record<string, (state: TState, action: any) => TState>,
>(initialState: TState, actionHandlers: TActionMap): Reducer<TState, Action<any>> {
  return (state = initialState, action) => {
    const handler = actionHandlers[action.type];
    if (handler) {
      return handler(state, action);
    }
    return state;
  };
}

// Slice creator (Redux Toolkit style)
export interface CreateSliceOptions<
  TState,
  TReducers extends Record<string, (state: TState, action?: any) => void | TState>,
> {
  name: string;
  initialState: TState;
  reducers: TReducers;
}

export function createSlice<
  TState,
  TReducers extends Record<string, (state: TState, action?: any) => void | TState>,
>(options: CreateSliceOptions<TState, TReducers>) {
  const { name, initialState, reducers } = options;

  // Create action creators
  const actions: Record<string, ActionCreator<any>> = {};
  for (const key in reducers) {
    actions[key] = createAction(`${name}/${key}`);
  }

  // Create reducer
  const reducer = createReducer(
    initialState,
    Object.entries(reducers).reduce(
      (acc, [key, handler]) => {
        acc[`${name}/${key}`] = (state, action) => {
          const result = handler(state, action?.payload);
          // Support both immutable and mutable updates
          return result === undefined ? state : result;
        };
        return acc;
      },
      {} as Record<string, (state: TState, action: any) => TState>
    )
  );

  return {
    name,
    actions: actions as {
      [K in keyof TReducers]: TReducers[K] extends (state: TState) => any
        ? () => Action<void>
        : TReducers[K] extends (state: TState, payload: infer P) => any
          ? (payload: P) => Action<P>
          : never;
    },
    reducer,
    initialState,
  };
}

// Async action support
export interface AsyncThunk<TPayload, TThunkArg = void> {
  pending: ActionCreator<{ arg: TThunkArg }>;
  fulfilled: ActionCreator<{ arg: TThunkArg; result: TPayload }>;
  rejected: ActionCreator<{ arg: TThunkArg; error: Error }>;
  (arg: TThunkArg): Promise<TPayload>;
}

export function createAsyncThunk<TPayload, TThunkArg = void>(
  typePrefix: string,
  payloadCreator: (arg: TThunkArg) => Promise<TPayload>
): AsyncThunk<TPayload, TThunkArg> {
  const pending = createAction<{ arg: TThunkArg }>(`${typePrefix}/pending`);
  const fulfilled = createAction<{ arg: TThunkArg; result: TPayload }>(`${typePrefix}/fulfilled`);
  const rejected = createAction<{ arg: TThunkArg; error: Error }>(`${typePrefix}/rejected`);

  const thunk = async (arg: TThunkArg) => {
    try {
      const result = await payloadCreator(arg);
      return result;
    } catch (error) {
      throw error;
    }
  };

  return Object.assign(thunk, {
    pending,
    fulfilled,
    rejected,
  });
}

// Computed values (derived state)
export function useComputed<TState, TComputed>(
  store: Store<TState>,
  computeFn: (state: TState) => TComputed,
  deps: React.DependencyList = []
): TComputed {
  return React.useMemo(
    () => computeFn(store.state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.state, ...deps]
  );
}

// Store utilities
export function useStoreActions<TState>(store: Store<TState>) {
  return React.useMemo(
    () => ({
      setState: (updater: Partial<TState> | ((state: TState) => Partial<TState>)) => {
        if (typeof updater === 'function') {
          store.setState((state) => ({
            ...state,
            ...updater(state),
          }));
        } else {
          store.setState((state) => ({
            ...state,
            ...updater,
          }));
        }
      },

      reset: (keys?: Array<keyof TState>) => {
        if (keys) {
          const updates: Partial<TState> = {};
          // Reset specific keys to initial values
          // Note: This requires storing initial state separately
          store.setState((state) => ({
            ...state,
            ...updates,
          }));
        } else {
          // Reset entire store
          // Note: This requires storing initial state separately
        }
      },

      subscribe: (callback: (state: TState) => void) => {
        return store.subscribe(() => callback(store.state));
      },
    }),
    [store]
  );
}

// DevTools component
export interface StoreDevToolsProps<TState> {
  store: Store<TState>;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function StoreDevTools<TState>({
  store,
  position = 'bottom-right',
}: StoreDevToolsProps<TState>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const state = useStore<TState>();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
      >
        {isOpen ? 'Hide' : 'Show'} Store
      </button>

      {isOpen && (
        <div className="mt-2 w-96 max-h-96 overflow-auto bg-white dark:bg-gray-900 border rounded-lg shadow-lg p-4">
          <h3 className="font-semibold mb-2">Store State</h3>
          <pre className="text-xs overflow-auto">{JSON.stringify(state, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
