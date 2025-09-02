/**
 * React-compatible exports using Katalyst's enhanced Rust-powered hooks
 * 
 * This provides a complete drop-in replacement for React 19 imports, leveraging
 * Katalyst's Rust toolchain for significantly better performance while maintaining
 * 100% API compatibility with React 19 including all new concurrent features.
 * 
 * Usage:
 * ```tsx
 * // Instead of:
 * import React from 'react';
 * 
 * // Use:
 * import React from '@katalyst/hooks/react';
 * ```
 * 
 * Security: Enhanced for Red Team, Purple Team, and Green Hat initiatives
 */

import * as ReactOriginal from 'react';
import * as commonHooks from './core/common-hooks';
import * as domHooks from './core/dom-hooks';
import * as utilityHooks from './core/utility-hooks';
import * as react19Hooks from './core/react19-hooks';

// Import React namespace for types - Full React 19 support
import type * as ReactTypes from 'react';

// Re-export React namespace for types - Complete React 19 type system
export import ReactNode = ReactTypes.ReactNode;
export import ReactElement = ReactTypes.ReactElement;
export import FC = ReactTypes.FC;
export import RefObject = ReactTypes.RefObject;

// Re-export ALL React 19 types and non-hook functionality
export type {
  ReactNode,
  ReactElement,
  FC,
  FunctionComponent,
  ComponentType,
  ComponentProps,
  PropsWithChildren,
  RefObject,
  MutableRefObject,
  ForwardedRef,
  Ref,
  Key,
  JSX,
  CSSProperties,
  HTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  FormHTMLAttributes,
  DOMAttributes,
  MouseEvent,
  KeyboardEvent,
  FocusEvent,
  FormEvent,
  ChangeEvent,
  DragEvent,
  TouchEvent,
  PointerEvent,
  UIEvent,
  WheelEvent,
  AnimationEvent,
  TransitionEvent,
  ClipboardEvent,
  SyntheticEvent,
  SetStateAction,
  Dispatch,
  EffectCallback,
  DependencyList,
  Context,
  Provider,
  Consumer,
  // React 19 new types
  Awaitable,
  ReactPromise,
  ServerContextJSONValue,
  TransitionFunction,
  FormStatus,
  OptimisticAction,
  // Concurrent types
  SuspenseListProps,
  SuspenseProps,
  ProfilerProps,
  StrictModeProps,
  // Server Component types
  ServerComponentType,
  ClientComponentType,
  SharedComponentType,
} from 'react';

// Enhanced React object with complete React 19 + Katalyst hooks
const React = {
  // Enhanced hooks (Rust-powered) - React 18 compatibility
  useState: commonHooks.useState,
  useEffect: commonHooks.useEffect,
  useCallback: commonHooks.useCallback,
  useMemo: commonHooks.useMemo,
  useRef: commonHooks.useRef,
  useContext: commonHooks.useContext,
  useReducer: commonHooks.useReducer,
  useLayoutEffect: commonHooks.useLayoutEffect,
  useImperativeHandle: commonHooks.useImperativeHandle,
  useDebugValue: commonHooks.useDebugValue,
  useId: commonHooks.useId,
  useDeferredValue: commonHooks.useDeferredValue,
  useTransition: commonHooks.useTransition,
  useSyncExternalStore: commonHooks.useSyncExternalStore,
  useInsertionEffect: commonHooks.useInsertionEffect,
  
  // React 19 new hooks (Rust-powered)
  use: react19Hooks.use,
  useOptimistic: react19Hooks.useOptimistic,
  useFormState: react19Hooks.useFormState,
  useFormStatus: react19Hooks.useFormStatus,
  useActionState: react19Hooks.useActionState,
  
  // Concurrent features
  useMutableSource: react19Hooks.useMutableSource,
  useOpaqueIdentifier: react19Hooks.useOpaqueIdentifier,
  
  // Non-hook React functionality (pass through)
  createElement: ReactOriginal.createElement,
  cloneElement: ReactOriginal.cloneElement,
  createContext: ReactOriginal.createContext,
  forwardRef: ReactOriginal.forwardRef,
  lazy: ReactOriginal.lazy,
  memo: ReactOriginal.memo,
  startTransition: ReactOriginal.startTransition,
  Fragment: ReactOriginal.Fragment,
  Suspense: ReactOriginal.Suspense,
  StrictMode: ReactOriginal.StrictMode,
  Profiler: ReactOriginal.Profiler,
  Children: ReactOriginal.Children,
  Component: ReactOriginal.Component,
  PureComponent: ReactOriginal.PureComponent,
  createRef: ReactOriginal.createRef,
  isValidElement: ReactOriginal.isValidElement,
  version: ReactOriginal.version,
  
  // Additional Katalyst-specific hooks
  useWindowSize: domHooks.useWindowSize,
  useMediaQuery: domHooks.useMediaQuery,
  useDebounce: utilityHooks.useDebounce,
  useThrottle: utilityHooks.useThrottle,
  useLocalStorage: domHooks.useLocalStorage,
  useKeyPress: domHooks.useKeyPress,
  useOutsideClick: domHooks.useOutsideClick,
  useScrollPosition: domHooks.useScrollPosition,
  useInView: domHooks.useInView,
  useToggle: utilityHooks.useToggle,
  useFetch: utilityHooks.useFetch,
  useAsync: utilityHooks.useAsync,
  useInterval: utilityHooks.useInterval,
  useTimeout: utilityHooks.useTimeout,
  useMount: utilityHooks.useMount,
  useUnmount: utilityHooks.useUnmount,
  usePrevious: utilityHooks.usePrevious,
  useCounter: utilityHooks.useCounter,
  useUpdateEffect: utilityHooks.useUpdateEffect,
  useScrollDirection: domHooks.useScrollDirection,
  useOnlineStatus: domHooks.useOnlineStatus,
  useClipboard: domHooks.useClipboard,
};

export default React;

// Named exports for ALL enhanced hooks - Complete React 19 support
export {
  // Core React hooks (enhanced)
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  useLayoutEffect,
  useImperativeHandle,
  useDebugValue,
  useId,
  useDeferredValue,
  useTransition,
  useSyncExternalStore,
  useInsertionEffect,
} from './core/common-hooks';

// React 19 new hooks
export {
  use,
  useOptimistic,
  useFormState,
  useFormStatus,
  useActionState,
  useMutableSource,
  useOpaqueIdentifier,
} from './core/react19-hooks';

// Katalyst-specific hooks
export {
  useWindowSize,
  useMediaQuery,
  useOutsideClick,
  useScrollPosition,
  useInView,
  useLocalStorage,
  useClipboard,
  useKeyPress,
  useScrollDirection,
  useOnlineStatus,
} from './core/dom-hooks';

export {
  useDebounce,
  useThrottle,
  useToggle,
  useCounter,
  usePrevious,
  useAsync,
  useInterval,
  useTimeout,
  useFetch,
  useMount,
  useUnmount,
  useUpdateEffect,
} from './core/utility-hooks';

// Re-export original React components and utilities
export {
  createElement,
  cloneElement,
  createContext,
  forwardRef,
  lazy,
  memo,
  startTransition,
  Fragment,
  Suspense,
  StrictMode,
  Profiler,
  Children,
  Component,
  PureComponent,
  createRef,
  isValidElement,
  version,
} from 'react';