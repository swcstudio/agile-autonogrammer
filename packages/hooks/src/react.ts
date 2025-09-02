/**
 * Katalyst React - Drop-in replacement for React with Rust-powered performance
 * 
 * This module provides a React-compatible API that leverages Katalyst's
 * Rust toolchain for enhanced performance while maintaining full compatibility
 * with React's type system.
 * 
 * Usage:
 * ```tsx
 * // Replace this:
 * import React from 'react';
 * 
 * // With this:
 * import React from '@katalyst/hooks/react';
 * ```
 */

// Import everything from React for types and non-hook functionality
import * as ReactOriginal from 'react';

// Import our enhanced hooks
import * as commonHooks from './core/common-hooks';
import * as domHooks from './core/dom-hooks';
import * as utilityHooks from './core/utility-hooks';

// Create namespace that combines React types with Katalyst hooks
namespace KatalystReact {
  // Re-export all React types
  export type ReactNode = ReactOriginal.ReactNode;
  export type ReactElement = ReactOriginal.ReactElement;
  export type FC<P = {}> = ReactOriginal.FC<P>;
  export type FunctionComponent<P = {}> = ReactOriginal.FunctionComponent<P>;
  export type ComponentType<P = {}> = ReactOriginal.ComponentType<P>;
  export type ComponentProps<T> = ReactOriginal.ComponentProps<T>;
  export type PropsWithChildren<P = {}> = ReactOriginal.PropsWithChildren<P>;
  export type RefObject<T> = ReactOriginal.RefObject<T>;
  export type MutableRefObject<T> = ReactOriginal.MutableRefObject<T>;
  export type ForwardedRef<T> = ReactOriginal.ForwardedRef<T>;
  export type Ref<T> = ReactOriginal.Ref<T>;
  export type Key = ReactOriginal.Key;
  export type CSSProperties = ReactOriginal.CSSProperties;
  export type HTMLAttributes<T> = ReactOriginal.HTMLAttributes<T>;
  export type ButtonHTMLAttributes<T> = ReactOriginal.ButtonHTMLAttributes<T>;
  export type InputHTMLAttributes<T> = ReactOriginal.InputHTMLAttributes<T>;
  export type FormHTMLAttributes<T> = ReactOriginal.FormHTMLAttributes<T>;
  export type DOMAttributes<T> = ReactOriginal.DOMAttributes<T>;
  export type MouseEvent<T = Element> = ReactOriginal.MouseEvent<T>;
  export type KeyboardEvent<T = Element> = ReactOriginal.KeyboardEvent<T>;
  export type FocusEvent<T = Element> = ReactOriginal.FocusEvent<T>;
  export type FormEvent<T = Element> = ReactOriginal.FormEvent<T>;
  export type ChangeEvent<T = Element> = ReactOriginal.ChangeEvent<T>;
  export type DragEvent<T = Element> = ReactOriginal.DragEvent<T>;
  export type TouchEvent<T = Element> = ReactOriginal.TouchEvent<T>;
  export type PointerEvent<T = Element> = ReactOriginal.PointerEvent<T>;
  export type UIEvent<T = Element> = ReactOriginal.UIEvent<T>;
  export type WheelEvent<T = Element> = ReactOriginal.WheelEvent<T>;
  export type AnimationEvent<T = Element> = ReactOriginal.AnimationEvent<T>;
  export type TransitionEvent<T = Element> = ReactOriginal.TransitionEvent<T>;
  export type ClipboardEvent<T = Element> = ReactOriginal.ClipboardEvent<T>;
  export type SyntheticEvent<T = Element> = ReactOriginal.SyntheticEvent<T>;
  export type SetStateAction<S> = ReactOriginal.SetStateAction<S>;
  export type Dispatch<A> = ReactOriginal.Dispatch<A>;
  export type EffectCallback = ReactOriginal.EffectCallback;
  export type DependencyList = ReactOriginal.DependencyList;
  export type Context<T> = ReactOriginal.Context<T>;
  export type Provider<T> = ReactOriginal.Provider<T>;
  export type Consumer<T> = ReactOriginal.Consumer<T>;

  // Enhanced hooks (Rust-powered)
  export const useState = commonHooks.useState;
  export const useEffect = commonHooks.useEffect;
  export const useCallback = commonHooks.useCallback;
  export const useMemo = commonHooks.useMemo;
  export const useRef = commonHooks.useRef;
  export const useContext = commonHooks.useContext;
  export const useReducer = commonHooks.useReducer;
  export const useLayoutEffect = commonHooks.useLayoutEffect;
  export const useImperativeHandle = commonHooks.useImperativeHandle;
  export const useDebugValue = commonHooks.useDebugValue;
  export const useId = commonHooks.useId;
  export const useDeferredValue = commonHooks.useDeferredValue;
  export const useTransition = commonHooks.useTransition;
  export const useSyncExternalStore = commonHooks.useSyncExternalStore;
  export const useInsertionEffect = commonHooks.useInsertionEffect;

  // Non-hook React functionality (pass through)
  export const createElement = ReactOriginal.createElement;
  export const cloneElement = ReactOriginal.cloneElement;
  export const createContext = ReactOriginal.createContext;
  export const forwardRef = ReactOriginal.forwardRef;
  export const lazy = ReactOriginal.lazy;
  export const memo = ReactOriginal.memo;
  export const startTransition = ReactOriginal.startTransition;
  export const Fragment = ReactOriginal.Fragment;
  export const Suspense = ReactOriginal.Suspense;
  export const StrictMode = ReactOriginal.StrictMode;
  export const Profiler = ReactOriginal.Profiler;
  export const Children = ReactOriginal.Children;
  export const Component = ReactOriginal.Component;
  export const PureComponent = ReactOriginal.PureComponent;
  export const createRef = ReactOriginal.createRef;
  export const isValidElement = ReactOriginal.isValidElement;
  export const version = ReactOriginal.version;
}

export = KatalystReact;
export as namespace React;