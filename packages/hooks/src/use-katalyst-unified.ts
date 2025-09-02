/**
 * Unified Katalyst Hook
 * The only hook you need to remember!
 * Provides access to all Katalyst functionality through a single interface
 */

import { useMemo } from 'react';

// Import all hooks
import * as commonHooks from './core/common-hooks';
import * as domHooks from './core/dom-hooks';
import * as utilityHooks from './core/utility-hooks';

// Import existing Katalyst hooks
import { useKatalystRuntime } from './use-katalyst-runtime';
import { useAdvancedMultithreading } from './use-multithreading';
import { useEMP } from './use-emp';
import { useUmi } from './use-umi';
import { useRspack } from './use-rspack';
import { useZephyr } from './use-zephyr';
import { useArco } from './use-arco';
import { useTRPC } from './use-trpc';
import { useTypia } from './use-typia';
import { useSails } from './use-sails';
import { useInspector } from './use-inspector';
import { useServerActions } from './use-server-actions';
import { useUnifiedBuilder } from './use-unified-builder';
import { useHydration } from './use-hydration';
import { useIntegration } from './use-integration';
import { useTapable } from './use-tapable';
import { useRspeedy } from './use-rspeedy';
import { useConfig } from './use-config';

// Theme and UI hooks
const useTheme = () => {
  const [theme, setTheme] = commonHooks.useState<'light' | 'dark' | 'system'>('system', {
    persist: 'katalyst-theme'
  });
  
  return { theme, setTheme };
};

const useAnimation = () => {
  return {
    fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 } },
    slideIn: { initial: { x: -100 }, animate: { x: 0 } },
    scaleIn: { initial: { scale: 0 }, animate: { scale: 1 } },
  };
};

const useForm = <T = any>() => {
  const [values, setValues] = commonHooks.useState<T>({} as T);
  const [errors, setErrors] = commonHooks.useState<Record<string, string>>({});
  
  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };
  
  const validate = () => {
    // Basic validation logic
    return Object.keys(errors).length === 0;
  };
  
  return { values, errors, setValue, setErrors, validate };
};

/**
 * Main unified Katalyst hook
 * Provides ALL functionality through a single interface
 */
export function useKatalyst() {
  return useMemo(() => ({
    // ========== CORE REACT HOOKS ==========
    // Enhanced versions of standard React hooks
    state: commonHooks.useState,
    effect: commonHooks.useEffect,
    callback: commonHooks.useCallback,
    memo: commonHooks.useMemo,
    ref: commonHooks.useRef,
    context: commonHooks.useContext,
    reducer: commonHooks.useReducer,
    layoutEffect: commonHooks.useLayoutEffect,
    imperativeHandle: commonHooks.useImperativeHandle,
    debugValue: commonHooks.useDebugValue,
    id: commonHooks.useId,
    deferredValue: commonHooks.useDeferredValue,
    transition: commonHooks.useTransition,
    syncExternalStore: commonHooks.useSyncExternalStore,
    insertionEffect: commonHooks.useInsertionEffect,

    // ========== DOM & BROWSER HOOKS ==========
    dom: {
      windowSize: domHooks.useWindowSize,
      mediaQuery: domHooks.useMediaQuery,
      outsideClick: domHooks.useOutsideClick,
      scrollPosition: domHooks.useScrollPosition,
      inView: domHooks.useInView,
      localStorage: domHooks.useLocalStorage,
      clipboard: domHooks.useClipboard,
      keyPress: domHooks.useKeyPress,
      scrollDirection: domHooks.useScrollDirection,
      onlineStatus: domHooks.useOnlineStatus,
    },

    // ========== UTILITY HOOKS ==========
    utils: {
      debounce: utilityHooks.useDebounce,
      throttle: utilityHooks.useThrottle,
      toggle: utilityHooks.useToggle,
      counter: utilityHooks.useCounter,
      previous: utilityHooks.usePrevious,
      async: utilityHooks.useAsync,
      interval: utilityHooks.useInterval,
      timeout: utilityHooks.useTimeout,
      fetch: utilityHooks.useFetch,
      mount: utilityHooks.useMount,
      unmount: utilityHooks.useUnmount,
      updateEffect: utilityHooks.useUpdateEffect,
    },

    // ========== KATALYST RUNTIME ==========
    runtime: useKatalystRuntime,
    
    // ========== BUILD TOOLS ==========
    build: {
      emp: useEMP,
      umi: useUmi,
      rspack: useRspack,
      zephyr: useZephyr,
      rspeedy: useRspeedy,
      unified: useUnifiedBuilder,
    },

    // ========== FRAMEWORK INTEGRATIONS ==========
    integrations: {
      arco: useArco,
      trpc: useTRPC,
      typia: useTypia,
      sails: useSails,
      tapable: useTapable,
    },

    // ========== DEVELOPMENT TOOLS ==========
    dev: {
      inspector: useInspector,
      hydration: useHydration,
      config: useConfig,
    },

    // ========== SERVER & PERFORMANCE ==========
    server: {
      actions: useServerActions,
      multithreading: useAdvancedMultithreading,
    },

    // ========== UI & THEMING ==========
    ui: {
      theme: useTheme,
      animation: useAnimation,
      form: useForm,
    },

    // ========== COMMON PATTERNS ==========
    patterns: {
      // Data fetching pattern
      query: <T,>(url: string) => utilityHooks.useFetch<T>(url),
      
      // State management pattern
      store: <T,>(initialState: T) => commonHooks.useState(initialState, { persist: 'katalyst-store' }),
      
      // Form handling pattern
      formHandler: <T,>() => useForm<T>(),
      
      // Modal/Dialog pattern
      modal: () => utilityHooks.useToggle(false),
      
      // Pagination pattern
      pagination: (totalItems: number, itemsPerPage: number = 10) => {
        const [currentPage, setCurrentPage] = commonHooks.useState(1);
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        return {
          currentPage,
          totalPages,
          setPage: setCurrentPage,
          nextPage: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
          prevPage: () => setCurrentPage(p => Math.max(p - 1, 1)),
          firstPage: () => setCurrentPage(1),
          lastPage: () => setCurrentPage(totalPages),
        };
      },
      
      // Search pattern
      search: <T,>(items: T[], searchKey: keyof T) => {
        const [query, setQuery] = commonHooks.useState('');
        const debouncedQuery = utilityHooks.useDebounce(query, 300);
        
        const filtered = useMemo(() => {
          if (!debouncedQuery) return items;
          return items.filter(item => 
            String(item[searchKey]).toLowerCase().includes(debouncedQuery.toLowerCase())
          );
        }, [items, debouncedQuery, searchKey]);
        
        return { query, setQuery, filtered };
      },
      
      // Filter pattern
      filter: <T,>(items: T[], filters: Record<string, any>) => {
        const [activeFilters, setActiveFilters] = commonHooks.useState(filters);
        
        const filtered = useMemo(() => {
          return items.filter(item => {
            return Object.entries(activeFilters).every(([key, value]) => {
              if (!value) return true;
              return (item as any)[key] === value;
            });
          });
        }, [items, activeFilters]);
        
        return { activeFilters, setActiveFilters, filtered };
      },
      
      // Sort pattern
      sort: <T,>(items: T[], initialKey: keyof T) => {
        const [sortKey, setSortKey] = commonHooks.useState<keyof T>(initialKey);
        const [sortOrder, setSortOrder] = commonHooks.useState<'asc' | 'desc'>('asc');
        
        const sorted = useMemo(() => {
          return [...items].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }, [items, sortKey, sortOrder]);
        
        const toggleSort = () => setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        
        return { sorted, sortKey, sortOrder, setSortKey, toggleSort };
      },
    },

    // ========== QUICK ACCESS ==========
    // Most commonly used hooks for quick access
    $: {
      state: commonHooks.useState,
      effect: commonHooks.useEffect,
      memo: commonHooks.useMemo,
      callback: commonHooks.useCallback,
      ref: commonHooks.useRef,
      debounce: utilityHooks.useDebounce,
      fetch: utilityHooks.useFetch,
      toggle: utilityHooks.useToggle,
      localStorage: domHooks.useLocalStorage,
      mediaQuery: domHooks.useMediaQuery,
    },
  }), []);
}

// Type definitions for better IntelliSense
export type KatalystHook = ReturnType<typeof useKatalyst>;

// Export individual categories for tree-shaking
export const katalystCore = {
  useState: commonHooks.useState,
  useEffect: commonHooks.useEffect,
  useCallback: commonHooks.useCallback,
  useMemo: commonHooks.useMemo,
  useRef: commonHooks.useRef,
};

export const katalystDOM = {
  useWindowSize: domHooks.useWindowSize,
  useMediaQuery: domHooks.useMediaQuery,
  useOutsideClick: domHooks.useOutsideClick,
  useScrollPosition: domHooks.useScrollPosition,
  useInView: domHooks.useInView,
  useLocalStorage: domHooks.useLocalStorage,
  useClipboard: domHooks.useClipboard,
  useKeyPress: domHooks.useKeyPress,
  useScrollDirection: domHooks.useScrollDirection,
  useOnlineStatus: domHooks.useOnlineStatus,
};

export const katalystUtils = {
  useDebounce: utilityHooks.useDebounce,
  useThrottle: utilityHooks.useThrottle,
  useToggle: utilityHooks.useToggle,
  useCounter: utilityHooks.useCounter,
  usePrevious: utilityHooks.usePrevious,
  useAsync: utilityHooks.useAsync,
  useInterval: utilityHooks.useInterval,
  useTimeout: utilityHooks.useTimeout,
  useFetch: utilityHooks.useFetch,
  useMount: utilityHooks.useMount,
  useUnmount: utilityHooks.useUnmount,
  useUpdateEffect: utilityHooks.useUpdateEffect,
};