// Store creation and components
export {
  createStore,
  StoreProvider,
  useStore,
  createAction,
  createReducer,
  createSlice,
  createAsyncThunk,
  useComputed,
  useStoreActions,
  StoreDevTools,
} from './Store';
export type {
  StoreOptions,
  StoreProviderProps,
  Action,
  ActionCreator,
  Reducer,
  CreateSliceOptions,
  AsyncThunk,
  StoreDevToolsProps,
} from './Store';

// Hooks
export {
  useStoreSlices,
  useImmerStore,
  useAsyncStore,
  useStoreHistory,
  useDerivedStore,
  useStoreWithMiddleware,
  createLoggerMiddleware,
  createPersistenceMiddleware,
  useStoreSubscription,
} from './hooks';
export type {
  UseStoreHistoryOptions,
  StoreMiddleware,
} from './hooks';

// Re-export core types from @tanstack/react-store
export type { Store } from '@tanstack/react-store';

import React from 'react';
// Example store setup
import { StoreProvider, createSlice, createStore, useStore } from './index';

// Example: Counter store
interface CounterState {
  count: number;
  incrementBy: number;
}

const counterSlice = createSlice({
  name: 'counter',
  initialState: {
    count: 0,
    incrementBy: 1,
  } as CounterState,
  reducers: {
    increment: (state) => ({
      ...state,
      count: state.count + state.incrementBy,
    }),
    decrement: (state) => ({
      ...state,
      count: state.count - state.incrementBy,
    }),
    setCount: (state, payload: number) => ({
      ...state,
      count: payload,
    }),
    setIncrementBy: (state, payload: number) => ({
      ...state,
      incrementBy: payload,
    }),
    reset: () => counterSlice.initialState,
  },
});

// Example: Todo store with async actions
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'active' | 'completed';
}

const todoStore = createStore<TodoState>({
  initialState: {
    todos: [],
    loading: false,
    error: null,
    filter: 'all',
  },
  name: 'todos',
  persist: true,
  devtools: true,
});

// Example component using store
export const ExampleCounter = () => {
  const count = useStore((state: CounterState) => state.count);
  const incrementBy = useStore((state: CounterState) => state.incrementBy);
  
  const store = React.useContext(React.createContext<any>(null));
  
  const handleIncrement = () => {
    store.setState((state: CounterState) => 
      counterSlice.reducers.increment(state)
    );
  };
  
  const handleDecrement = () => {
    store.setState((state: CounterState) => 
      counterSlice.reducers.decrement(state)
    );
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="text-2xl font-bold">Count: count</div>
      <div className="flex gap-2">
        <button
          onClick={handleDecrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          - {incrementBy}
        </button>
        <button
          onClick={handleIncrement}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          + {incrementBy}
        </button>
      </div>
    </div>
  );
};

// Example: Todo app with filtering
export const ExampleTodoApp = () => {
  const { todos, filter, loading, error } = useStore<TodoState>();
  const [newTodo, setNewTodo] = React.useState('');
  
  const filteredTodos = React.useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }, [todos, filter]);
  
  const addTodo = () => {
    if (!newTodo.trim()) return;
    
    todoStore.setState((state) => ({
      ...state,
      todos: [
        ...state.todos,
        {
          id: Date.now().toString(),
          text: newTodo,
          completed: false,
        },
      ],
    }));
    
    setNewTodo('');
  };
  
  const toggleTodo = (id: string) => {
    todoStore.setState((state) => ({
      ...state,
      todos: state.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    }));
  };
  
  const deleteTodo = (id: string) => {
    todoStore.setState((state) => ({
      ...state,
      todos: state.todos.filter(todo => todo.id !== id),
    }));
  };
  
  const setFilter = (newFilter: TodoState['filter']) => {
    todoStore.setState((state) => ({
      ...state,
      filter: newFilter,
    }));
  };
  
  if (loading) {
    return <div className="p-4">Loading...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">Error: error</div>;
  }
  
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Todo App</h1>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={addTodo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Todo list */}
      <div className="space-y-2">
        {filteredTodos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-2 p-2 border rounded"
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              className="cursor-pointer"
            />
            <span
              className={`flex-1 ${
                todo.completed ? 'line-through text-gray-500' : ''
              }`}
            >
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="px-2 py-1 text-sm text-red-500 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      
      {filteredTodos.length === 0 && (
        <p className="text-center text-gray-500 mt-4">
          No todos to display
        </p>
      )}
    </div>
  );
};