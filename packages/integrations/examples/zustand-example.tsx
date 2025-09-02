import React from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Zustand State Management Integration Example
 * Demonstrates global state management with Zustand in Katalyst
 */

// Define the store interface
interface TodoStore {
  todos: Array<{ id: string; text: string; completed: boolean }>;
  filter: 'all' | 'active' | 'completed';
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  clearCompleted: () => void;
  stats: () => { total: number; active: number; completed: number };
}

// Create the store with middleware
const useTodoStore = create<TodoStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        todos: [],
        filter: 'all',
        
        addTodo: (text) =>
          set((state) => {
            state.todos.push({
              id: Date.now().toString(),
              text,
              completed: false,
            });
          }),
        
        toggleTodo: (id) =>
          set((state) => {
            const todo = state.todos.find((t) => t.id === id);
            if (todo) {
              todo.completed = !todo.completed;
            }
          }),
        
        removeTodo: (id) =>
          set((state) => {
            state.todos = state.todos.filter((t) => t.id !== id);
          }),
        
        setFilter: (filter) =>
          set((state) => {
            state.filter = filter;
          }),
        
        clearCompleted: () =>
          set((state) => {
            state.todos = state.todos.filter((t) => !t.completed);
          }),
        
        stats: () => {
          const todos = get().todos;
          return {
            total: todos.length,
            active: todos.filter((t) => !t.completed).length,
            completed: todos.filter((t) => t.completed).length,
          };
        },
      })),
      {
        name: 'todo-storage',
      }
    )
  )
);

export const ZustandExample: React.FC = () => {
  const [inputValue, setInputValue] = React.useState('');
  const { todos, filter, addTodo, toggleTodo, removeTodo, setFilter, clearCompleted, stats } = useTodoStore();
  
  const filteredTodos = React.useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.completed);
      case 'completed':
        return todos.filter((t) => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);
  
  const { total, active, completed } = stats();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addTodo(inputValue.trim());
      setInputValue('');
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Zustand Todo App</h2>
      
      {/* Add Todo Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What needs to be done?"
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </form>
      
      {/* Filter Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 15px',
              backgroundColor: filter === f ? '#4CAF50' : '#f0f0f0',
              color: filter === f ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>
      
      {/* Todo List */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {filteredTodos.map((todo) => (
          <li
            key={todo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              marginBottom: '5px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
            }}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              style={{ marginRight: '10px' }}
            />
            <span
              style={{
                flex: 1,
                textDecoration: todo.completed ? 'line-through' : 'none',
                opacity: todo.completed ? 0.6 : 1,
              }}
            >
              {todo.text}
            </span>
            <button
              onClick={() => removeTodo(todo.id)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      
      {/* Stats and Actions */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Stats:</strong> {active} active, {completed} completed, {total} total
        </div>
        {completed > 0 && (
          <button
            onClick={clearCompleted}
            style={{
              padding: '5px 15px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear Completed
          </button>
        )}
      </div>
    </div>
  );
};

export default ZustandExample;