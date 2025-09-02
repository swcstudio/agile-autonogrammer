/**
 * Katalyst Fast Refresh Provider
 * 
 * Unified Fast Refresh implementation across all Katalyst platforms
 * Integrates with TanStack, Re.Pack, StyleX, RSpeedy, and Ngrok
 */

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { FastRefreshRuntime } from './fast-refresh-runtime';
import { NgrokFastRefresh } from './integrations/ngrok-fast-refresh';
import { RePackFastRefresh } from './integrations/repack-fast-refresh';
import { StyleXFastRefresh } from './integrations/stylex-fast-refresh';
import { TanStackFastRefresh } from './integrations/tanstack-fast-refresh';

export interface FastRefreshConfig {
  // Platform detection
  platform: 'web' | 'mobile' | 'electron' | 'ssr';
  bundler: 'vite' | 'webpack' | 'repack' | 'metro';
  
  // Feature flags
  preserveState?: boolean;
  errorRecovery?: boolean;
  crossPlatformSync?: boolean;
  debugMode?: boolean;
  
  // Integration settings
  tanstack?: {
    refreshQueries?: boolean;
    preserveRouterState?: boolean;
    refreshTables?: boolean;
    refreshForms?: boolean;
  };
  
  stylex?: {
    hotThemes?: boolean;
    preserveThemeState?: boolean;
    refreshTokens?: boolean;
  };
  
  repack?: {
    federatedModules?: boolean;
    mobileSync?: boolean;
    chunkRefresh?: boolean;
  };
  
  ngrok?: {
    broadcastChanges?: boolean;
    teamSync?: boolean;
    tunnelRefresh?: boolean;
  };
  
  // Performance settings
  debounceMs?: number;
  maxRetries?: number;
  fallbackToReload?: boolean;
}

export interface FastRefreshContextValue {
  // Core refresh capabilities
  refresh: (moduleId: string, exports: any) => Promise<void>;
  refreshComponent: (component: React.ComponentType) => Promise<void>;
  refreshModule: (moduleId: string) => Promise<void>;
  
  // State management
  preserveState: <T>(key: string, value: T) => void;
  restoreState: <T>(key: string, defaultValue?: T) => T;
  clearPreservedState: (key?: string) => void;
  
  // Error handling
  reportError: (error: Error, moduleId?: string) => void;
  clearErrors: () => void;
  getErrors: () => FastRefreshError[];
  
  // Integration hooks
  registerIntegration: (name: string, integration: FastRefreshIntegration) => void;
  unregisterIntegration: (name: string) => void;
  
  // Performance monitoring
  getRefreshStats: () => FastRefreshStats;
  resetStats: () => void;
  
  // Development utilities
  isRefreshing: boolean;
  lastRefreshTime: number;
  refreshCount: number;
  
  // Team collaboration
  broadcastUpdate: (update: RefreshUpdate) => Promise<void>;
  subscribeToUpdates: (callback: (update: RefreshUpdate) => void) => () => void;
}

const FastRefreshContext = createContext<FastRefreshContextValue | null>(null);

export function KatalystFastRefreshProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: FastRefreshConfig;
}) {
  const [runtime, setRuntime] = useState<FastRefreshRuntime | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [errors, setErrors] = useState<FastRefreshError[]>([]);
  const [preservedState, setPreservedState] = useState<Map<string, any>>(new Map());
  const [integrations, setIntegrations] = useState<Map<string, FastRefreshIntegration>>(new Map());
  const [updateSubscribers, setUpdateSubscribers] = useState<Set<(update: RefreshUpdate) => void>>(new Set());

  useEffect(() => {
    const initializeFastRefresh = async () => {
      try {
        const fastRefreshRuntime = new FastRefreshRuntime(config);
        await fastRefreshRuntime.initialize();
        
        // Register built-in integrations
        const tanstackIntegration = new TanStackFastRefresh(config.tanstack || {});
        const stylexIntegration = new StyleXFastRefresh(config.stylex || {});
        const repackIntegration = new RePackFastRefresh(config.repack || {});
        const ngrokIntegration = new NgrokFastRefresh(config.ngrok || {});
        
        fastRefreshRuntime.registerIntegration('tanstack', tanstackIntegration);
        fastRefreshRuntime.registerIntegration('stylex', stylexIntegration);
        fastRefreshRuntime.registerIntegration('repack', repackIntegration);
        fastRefreshRuntime.registerIntegration('ngrok', ngrokIntegration);
        
        setRuntime(fastRefreshRuntime);
        
        // Set up global Fast Refresh functions
        if (typeof window !== 'undefined') {
          window.$RefreshReg$ = (type: any, id: string) => {
            fastRefreshRuntime.registerComponent(type, id);
          };
          
          window.$RefreshSig$ = () => {
            return (type: any, key: string, forceReset?: boolean, getCustomHooks?: () => any[]) => {
              fastRefreshRuntime.registerSignature(type, key, forceReset, getCustomHooks);
            };
          };
          
          window.$RefreshRuntime$ = fastRefreshRuntime;
        }
        
        console.log('🔥 Katalyst Fast Refresh initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Fast Refresh:', error);
      }
    };

    initializeFastRefresh();
  }, [config]);

  const refresh = async (moduleId: string, exports: any): Promise<void> => {
    if (!runtime) return;
    
    setIsRefreshing(true);
    const startTime = Date.now();
    
    try {
      await runtime.refresh(moduleId, exports);
      
      setLastRefreshTime(Date.now());
      setRefreshCount(prev => prev + 1);
      
      // Broadcast update to team if enabled
      if (config.ngrok?.broadcastChanges) {
        await broadcastUpdate({
          type: 'module-refresh',
          moduleId,
          timestamp: Date.now(),
          platform: config.platform,
        });
      }
    } catch (error) {
      reportError(error as Error, moduleId);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshComponent = async (component: React.ComponentType): Promise<void> => {
    if (!runtime) return;
    
    await runtime.refreshComponent(component);
  };

  const refreshModule = async (moduleId: string): Promise<void> => {
    if (!runtime) return;
    
    await runtime.refreshModule(moduleId);
  };

  const preserveState = <T>(key: string, value: T): void => {
    setPreservedState(prev => new Map(prev.set(key, value)));
  };

  const restoreState = <T>(key: string, defaultValue?: T): T => {
    return preservedState.get(key) ?? defaultValue;
  };

  const clearPreservedState = (key?: string): void => {
    if (key) {
      setPreservedState(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    } else {
      setPreservedState(new Map());
    }
  };

  const reportError = (error: Error, moduleId?: string): void => {
    const fastRefreshError: FastRefreshError = {
      id: Date.now().toString(),
      error,
      moduleId,
      timestamp: Date.now(),
      platform: config.platform,
    };
    
    setErrors(prev => [...prev, fastRefreshError]);
    
    if (config.debugMode) {
      console.error('Fast Refresh Error:', fastRefreshError);
    }
  };

  const clearErrors = (): void => {
    setErrors([]);
  };

  const getErrors = (): FastRefreshError[] => {
    return [...errors];
  };

  const registerIntegration = (name: string, integration: FastRefreshIntegration): void => {
    setIntegrations(prev => new Map(prev.set(name, integration)));
    runtime?.registerIntegration(name, integration);
  };

  const unregisterIntegration = (name: string): void => {
    setIntegrations(prev => {
      const newMap = new Map(prev);
      newMap.delete(name);
      return newMap;
    });
    runtime?.unregisterIntegration(name);
  };

  const getRefreshStats = (): FastRefreshStats => {
    return {
      totalRefreshes: refreshCount,
      lastRefreshTime,
      averageRefreshTime: runtime?.getAverageRefreshTime() || 0,
      errorCount: errors.length,
      platform: config.platform,
      integrations: Array.from(integrations.keys()),
    };
  };

  const resetStats = (): void => {
    setRefreshCount(0);
    setLastRefreshTime(0);
    setErrors([]);
    runtime?.resetStats();
  };

  const broadcastUpdate = async (update: RefreshUpdate): Promise<void> => {
    // Notify all subscribers
    updateSubscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.warn('Error in update subscriber:', error);
      }
    });
    
    // Send to ngrok integration for team sync
    const ngrokIntegration = integrations.get('ngrok');
    if (ngrokIntegration) {
      await ngrokIntegration.broadcastUpdate?.(update);
    }
  };

  const subscribeToUpdates = (callback: (update: RefreshUpdate) => void): (() => void) => {
    setUpdateSubscribers(prev => new Set(prev.add(callback)));
    
    return () => {
      setUpdateSubscribers(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  };

  const contextValue: FastRefreshContextValue = {
    refresh,
    refreshComponent,
    refreshModule,
    preserveState,
    restoreState,
    clearPreservedState,
    reportError,
    clearErrors,
    getErrors,
    registerIntegration,
    unregisterIntegration,
    getRefreshStats,
    resetStats,
    isRefreshing,
    lastRefreshTime,
    refreshCount,
    broadcastUpdate,
    subscribeToUpdates,
  };

  return (
    <FastRefreshContext.Provider value={contextValue}>
      {children}
    </FastRefreshContext.Provider>
  );
}

export function useFastRefresh(): FastRefreshContextValue {
  const context = useContext(FastRefreshContext);
  if (!context) {
    throw new Error('useFastRefresh must be used within a KatalystFastRefreshProvider');
  }
  return context;
}

// Type definitions
export interface FastRefreshError {
  id: string;
  error: Error;
  moduleId?: string;
  timestamp: number;
  platform: string;
}

export interface FastRefreshStats {
  totalRefreshes: number;
  lastRefreshTime: number;
  averageRefreshTime: number;
  errorCount: number;
  platform: string;
  integrations: string[];
}

export interface RefreshUpdate {
  type: 'module-refresh' | 'component-refresh' | 'theme-change' | 'route-change';
  moduleId?: string;
  componentName?: string;
  timestamp: number;
  platform: string;
  metadata?: Record<string, any>;
}

export interface FastRefreshIntegration {
  name: string;
  initialize(): Promise<void>;
  refresh(moduleId: string, exports: any): Promise<void>;
  cleanup(): Promise<void>;
  broadcastUpdate?(update: RefreshUpdate): Promise<void>;
}

// Global type augmentation
declare global {
  interface Window {
    $RefreshReg$?: (type: any, id: string) => void;
    $RefreshSig$?: () => (type: any, key: string, forceReset?: boolean, getCustomHooks?: () => any[]) => void;
    $RefreshRuntime$?: any;
  }
}