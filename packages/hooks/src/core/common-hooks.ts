/**
 * Common React-like hooks for Katalyst
 * These replace standard React hooks with enhanced functionality
 */

import { 
  useState as reactUseState, 
  useEffect as reactUseEffect,
  useCallback as reactUseCallback,
  useMemo as reactUseMemo,
  useRef as reactUseRef,
  useContext as reactUseContext,
  useReducer as reactUseReducer,
  useLayoutEffect as reactUseLayoutEffect,
  useImperativeHandle as reactUseImperativeHandle,
  useDebugValue as reactUseDebugValue,
  useId as reactUseId,
  useDeferredValue as reactUseDeferredValue,
  useTransition as reactUseTransition,
  useSyncExternalStore as reactUseSyncExternalStore,
  useInsertionEffect as reactUseInsertionEffect
} from 'react';

// Enhanced state with persistence and history
export function useState<T>(
  initialState: T | (() => T),
  options?: {
    persist?: string; // localStorage key
    history?: boolean; // track state history
    debounce?: number; // debounce state updates
  }
) {
  const [state, setState] = reactUseState(initialState);
  const [history, setHistory] = reactUseState<T[]>([]);
  const timeoutRef = reactUseRef<NodeJS.Timeout>();

  // Load from localStorage if persist key provided
  reactUseEffect(() => {
    if (options?.persist) {
      const stored = localStorage.getItem(options.persist);
      if (stored) {
        try {
          setState(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored state:', e);
        }
      }
    }
  }, []);

  // Enhanced setState with options
  const enhancedSetState = reactUseCallback((newState: T | ((prev: T) => T)) => {
    const update = () => {
      setState((prev) => {
        const next = typeof newState === 'function' 
          ? (newState as (prev: T) => T)(prev) 
          : newState;
        
        // Track history
        if (options?.history) {
          setHistory((h) => [...h, prev]);
        }
        
        // Persist to localStorage
        if (options?.persist) {
          localStorage.setItem(options.persist, JSON.stringify(next));
        }
        
        return next;
      });
    };

    // Debounce if specified
    if (options?.debounce) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(update, options.debounce);
    } else {
      update();
    }
  }, [options?.persist, options?.history, options?.debounce]);

  return [state, enhancedSetState, history] as const;
}

// Enhanced effect with cleanup and dependencies tracking
export function useEffect(
  effect: () => void | (() => void),
  deps?: any[],
  options?: {
    debounce?: number;
    throttle?: number;
    condition?: boolean; // only run if true
  }
) {
  const timeoutRef = reactUseRef<NodeJS.Timeout>();
  const lastRun = reactUseRef<number>(0);

  reactUseEffect(() => {
    if (options?.condition === false) return;

    const runEffect = () => {
      const cleanup = effect();
      return cleanup;
    };

    if (options?.debounce) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(runEffect, options.debounce);
      return () => clearTimeout(timeoutRef.current!);
    }

    if (options?.throttle) {
      const now = Date.now();
      if (now - lastRun.current >= options.throttle) {
        lastRun.current = now;
        return runEffect();
      }
      return;
    }

    return runEffect();
  }, deps);
}

// Export enhanced versions of all React hooks
export const useCallback = reactUseCallback;
export const useMemo = reactUseMemo;
export const useRef = reactUseRef;
export const useContext = reactUseContext;
export const useReducer = reactUseReducer;
export const useLayoutEffect = reactUseLayoutEffect;
export const useImperativeHandle = reactUseImperativeHandle;
export const useDebugValue = reactUseDebugValue;
export const useId = reactUseId;
export const useDeferredValue = reactUseDeferredValue;
export const useTransition = reactUseTransition;
export const useSyncExternalStore = reactUseSyncExternalStore;
export const useInsertionEffect = reactUseInsertionEffect;