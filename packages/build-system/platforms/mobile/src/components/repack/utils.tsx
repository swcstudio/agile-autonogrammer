/**
 * Re.Pack Utility Components and Hooks
 *
 * Utility functions and components for working with Re.Pack
 */

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useRepack } from './RepackProvider';

// Hook for preloading multiple modules
export function usePreloadModules(
  modules: Array<{ remoteName: string; moduleName: string }>,
  options: {
    preloadOnMount?: boolean;
    preloadOnIdle?: boolean;
    priority?: 'high' | 'low';
  } = {}
) {
  const { preloadRemoteModule } = useRepack();
  const [preloadedModules, setPreloadedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const { preloadOnMount = true, preloadOnIdle = false, priority = 'low' } = options;

  const preloadModule = useCallback(
    async (remoteName: string, moduleName: string) => {
      const key = `${remoteName}/${moduleName}`;
      if (preloadedModules.has(key)) return;

      try {
        await preloadRemoteModule(remoteName, moduleName);
        setPreloadedModules((prev) => new Set([...prev, key]));
      } catch (error) {
        console.warn(`Failed to preload module ${key}:`, error);
      }
    },
    [preloadRemoteModule, preloadedModules]
  );

  const preloadAll = useCallback(async () => {
    setLoading(true);

    try {
      if (priority === 'high') {
        // Preload all modules in parallel for high priority
        await Promise.all(
          modules.map(({ remoteName, moduleName }) => preloadModule(remoteName, moduleName))
        );
      } else {
        // Preload modules sequentially for low priority
        for (const { remoteName, moduleName } of modules) {
          await preloadModule(remoteName, moduleName);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [modules, preloadModule, priority]);

  // Preload on mount
  useEffect(() => {
    if (preloadOnMount) {
      preloadAll();
    }
  }, [preloadOnMount, preloadAll]);

  // Preload on idle
  useEffect(() => {
    if (preloadOnIdle && 'requestIdleCallback' in window) {
      const idleCallback = window.requestIdleCallback(() => {
        preloadAll();
      });

      return () => window.cancelIdleCallback(idleCallback);
    }
  }, [preloadOnIdle, preloadAll]);

  return {
    preloadedModules: Array.from(preloadedModules),
    loading,
    preloadAll,
    preloadModule,
  };
}

// Component for conditional module loading based on feature flags
export interface ConditionalModuleLoaderProps {
  featureFlag: string;
  remoteName: string;
  moduleName: string;
  fallbackComponent?: React.ComponentType;
  props?: any;
  className?: string;
}

export function ConditionalModuleLoader({
  featureFlag,
  remoteName,
  moduleName,
  fallbackComponent: FallbackComponent,
  props,
  className,
}: ConditionalModuleLoaderProps) {
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);

  useEffect(() => {
    // Check feature flag - this would integrate with your feature flag service
    const checkFeatureFlag = async () => {
      try {
        // Mock feature flag check - replace with actual implementation
        const response = await fetch(`/api/features/${featureFlag}`);
        const { enabled } = await response.json();
        setIsFeatureEnabled(enabled);
      } catch (error) {
        console.warn(`Failed to check feature flag ${featureFlag}:`, error);
        setIsFeatureEnabled(false);
      }
    };

    checkFeatureFlag();
  }, [featureFlag]);

  if (!isFeatureEnabled) {
    if (FallbackComponent) {
      return <FallbackComponent {...props} />;
    }
    return null;
  }

  const { ModuleFederationLoader } = require('./ModuleFederationLoader');

  return (
    <ModuleFederationLoader
      remoteName={remoteName}
      moduleName={moduleName}
      props={props}
      className={className}
    />
  );
}

// Hook for dynamic module discovery
export function useModuleDiscovery(remoteUrl: string) {
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const discoverModules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch remote manifest
      const manifestUrl = remoteUrl.replace('/remoteEntry.js', '/manifest.json');
      const response = await fetch(manifestUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }

      const manifest = await response.json();
      setAvailableModules(manifest.exposes ? Object.keys(manifest.exposes) : []);
    } catch (err) {
      setError(err as Error);
      setAvailableModules([]);
    } finally {
      setLoading(false);
    }
  }, [remoteUrl]);

  useEffect(() => {
    discoverModules();
  }, [discoverModules]);

  return {
    availableModules,
    loading,
    error,
    refresh: discoverModules,
  };
}

// Component for A/B testing with federated modules
export interface ABTestModuleLoaderProps {
  testName: string;
  variants: Array<{
    name: string;
    remoteName: string;
    moduleName: string;
    weight?: number;
  }>;
  props?: any;
  className?: string;
}

export function ABTestModuleLoader({
  testName,
  variants,
  props,
  className,
}: ABTestModuleLoaderProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  useEffect(() => {
    // Determine which variant to show
    const selectVariant = () => {
      // Check if user already has a variant assigned
      const storageKey = `ab-test-${testName}`;
      const existingVariant = localStorage.getItem(storageKey);

      if (existingVariant && variants.find((v) => v.name === existingVariant)) {
        setSelectedVariant(existingVariant);
        return;
      }

      // Select new variant based on weights
      const totalWeight = variants.reduce((sum, variant) => sum + (variant.weight || 1), 0);
      let random = Math.random() * totalWeight;

      for (const variant of variants) {
        random -= variant.weight || 1;
        if (random <= 0) {
          setSelectedVariant(variant.name);
          localStorage.setItem(storageKey, variant.name);

          // Track the assignment
          if (typeof window !== 'undefined' && (window as any).analytics) {
            (window as any).analytics.track('AB Test Assignment', {
              testName,
              variant: variant.name,
            });
          }

          break;
        }
      }
    };

    selectVariant();
  }, [testName, variants]);

  const variant = variants.find((v) => v.name === selectedVariant);

  if (!variant) {
    return null;
  }

  const { ModuleFederationLoader } = require('./ModuleFederationLoader');

  return (
    <ModuleFederationLoader
      remoteName={variant.remoteName}
      moduleName={variant.moduleName}
      props={props}
      className={className}
    />
  );
}

// Component for progressive enhancement with federated modules
export interface ProgressiveEnhancementLoaderProps {
  baseComponent: React.ComponentType;
  enhancedRemoteName: string;
  enhancedModuleName: string;
  props?: any;
  timeout?: number;
  className?: string;
}

export function ProgressiveEnhancementLoader({
  baseComponent: BaseComponent,
  enhancedRemoteName,
  enhancedModuleName,
  props,
  timeout = 5000,
  className,
}: ProgressiveEnhancementLoaderProps) {
  const [useEnhanced, setUseEnhanced] = useState(false);
  const [enhancedFailed, setEnhancedFailed] = useState(false);

  useEffect(() => {
    // Try to load enhanced component with timeout
    const timeoutId = setTimeout(() => {
      if (!useEnhanced) {
        setEnhancedFailed(true);
      }
    }, timeout);

    // Attempt to preload enhanced component
    const loadEnhanced = async () => {
      try {
        const { useRepack } = await import('./RepackProvider');
        const { preloadRemoteModule } = useRepack();
        await preloadRemoteModule(enhancedRemoteName, enhancedModuleName);
        setUseEnhanced(true);
      } catch (error) {
        console.warn('Failed to load enhanced component, falling back to base:', error);
        setEnhancedFailed(true);
      }
    };

    loadEnhanced();

    return () => clearTimeout(timeoutId);
  }, [enhancedRemoteName, enhancedModuleName, timeout, useEnhanced]);

  // Use base component if enhanced failed or timed out
  if (enhancedFailed || (!useEnhanced && timeout > 0)) {
    return <BaseComponent {...props} className={className} />;
  }

  // Use enhanced component if available
  if (useEnhanced) {
    const { ModuleFederationLoader } = require('./ModuleFederationLoader');

    return (
      <ModuleFederationLoader
        remoteName={enhancedRemoteName}
        moduleName={enhancedModuleName}
        props={props}
        fallback={BaseComponent}
        className={className}
      />
    );
  }

  // Loading state
  return <BaseComponent {...props} className={className} />;
}

// Hook for module health monitoring
export function useModuleHealth(
  remoteName: string,
  moduleName: string,
  options: {
    healthCheckInterval?: number;
    maxRetries?: number;
    onHealthChange?: (isHealthy: boolean) => void;
  } = {}
) {
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { healthCheckInterval = 30000, maxRetries = 3, onHealthChange } = options;

  const { loadRemoteModule } = useRepack();

  const checkHealth = useCallback(async () => {
    try {
      // Simple health check - try to load the module
      await loadRemoteModule(remoteName, moduleName);

      if (!isHealthy) {
        setIsHealthy(true);
        setRetryCount(0);
        onHealthChange?.(true);
      }

      setLastCheck(new Date());
    } catch (error) {
      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
      } else if (isHealthy) {
        setIsHealthy(false);
        onHealthChange?.(false);
      }
    }
  }, [remoteName, moduleName, loadRemoteModule, isHealthy, retryCount, maxRetries, onHealthChange]);

  useEffect(() => {
    // Initial health check
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, healthCheckInterval);

    return () => clearInterval(interval);
  }, [checkHealth, healthCheckInterval]);

  return {
    isHealthy,
    lastCheck,
    retryCount,
    checkHealth,
  };
}

// Component for graceful degradation with multiple fallback levels
export interface GracefulDegradationLoaderProps {
  modules: Array<{
    remoteName: string;
    moduleName: string;
    priority: number;
  }>;
  fallbackComponent: React.ComponentType;
  props?: any;
  className?: string;
}

export function GracefulDegradationLoader({
  modules,
  fallbackComponent: FallbackComponent,
  props,
  className,
}: GracefulDegradationLoaderProps) {
  const [activeModule, setActiveModule] = useState<{
    remoteName: string;
    moduleName: string;
  } | null>(null);

  const sortedModules = modules.sort((a, b) => a.priority - b.priority);

  useEffect(() => {
    const tryLoadModules = async () => {
      const { useRepack } = await import('./RepackProvider');
      const { loadRemoteModule } = useRepack();

      for (const module of sortedModules) {
        try {
          await loadRemoteModule(module.remoteName, module.moduleName);
          setActiveModule(module);
          return;
        } catch (error) {
          console.warn(`Failed to load module ${module.remoteName}/${module.moduleName}:`, error);
          continue;
        }
      }

      // All modules failed, will use fallback
      setActiveModule(null);
    };

    tryLoadModules();
  }, [sortedModules]);

  if (!activeModule) {
    return <FallbackComponent {...props} className={className} />;
  }

  const { ModuleFederationLoader } = require('./ModuleFederationLoader');

  return (
    <ModuleFederationLoader
      remoteName={activeModule.remoteName}
      moduleName={activeModule.moduleName}
      props={props}
      fallback={FallbackComponent}
      className={className}
    />
  );
}

// Utility function for creating optimized module loading strategies
export function createLoadingStrategy(strategy: 'eager' | 'lazy' | 'idle' | 'viewport') {
  switch (strategy) {
    case 'eager':
      return { preload: true, timeout: 1000 };
    case 'lazy':
      return { preload: false, timeout: 5000 };
    case 'idle':
      return { preload: false, timeout: 10000 };
    case 'viewport':
      return { preload: false, timeout: 3000 };
    default:
      return { preload: false, timeout: 5000 };
  }
}
