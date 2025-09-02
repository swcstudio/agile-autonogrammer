import React, { ReactNode, createContext, useContext } from 'react';
import { KatalystProvider, useKatalystContext } from '../KatalystProvider.tsx';
import { ConfigProvider } from '../ConfigProvider.tsx';
import { DesignSystem } from '../DesignSystem.tsx';
import { AccessibilityProvider } from '../AccessibilityProvider.tsx';
import { RuntimeProvider } from '../UnifiedRuntimeProvider.tsx';
import { MultithreadingProvider } from '../MultithreadingProvider.tsx';

interface CoreSystemConfig {
  katalyst: any;
  runtime: {
    enabledProviders: string[];
    multithreading?: {
      enableAITaskProcessing?: boolean;
      enableSubagentCoordination?: boolean;
      enableBatchProcessing?: boolean;
    };
  };
  accessibility: {
    enabled?: boolean;
    announceChanges?: boolean;
    keyboardNavigation?: boolean;
  };
  designSystem: {
    theme?: string;
    mode?: 'light' | 'dark' | 'auto';
    customTokens?: any;
  };
}

interface CoreSystemContextValue {
  isSystemReady: boolean;
  config: CoreSystemConfig;
  updateSystemConfig: (updates: Partial<CoreSystemConfig>) => void;
  restartSystem: () => Promise<void>;
}

const CoreSystemContext = createContext<CoreSystemContextValue | null>(null);

interface CoreSystemGroupProps {
  children: ReactNode;
  config: CoreSystemConfig;
  onSystemReady?: () => void;
  onSystemError?: (error: string) => void;
}

/**
 * CoreSystemGroup - Consolidated core system providers
 * 
 * Combines KatalystProvider, ConfigProvider, DesignSystem, AccessibilityProvider,
 * UnifiedRuntimeProvider, and MultithreadingProvider into a single, manageable component.
 * 
 * This reduces the need for multiple provider wrappers and provides a unified
 * initialization sequence for the entire Katalyst system.
 */
export function CoreSystemGroup({ 
  children, 
  config, 
  onSystemReady,
  onSystemError 
}: CoreSystemGroupProps) {
  const [isSystemReady, setIsSystemReady] = React.useState(false);
  const [systemConfig, setSystemConfig] = React.useState(config);

  const updateSystemConfig = React.useCallback((updates: Partial<CoreSystemConfig>) => {
    setSystemConfig(prev => ({
      ...prev,
      ...updates,
      // Deep merge nested objects
      runtime: { ...prev.runtime, ...updates.runtime },
      accessibility: { ...prev.accessibility, ...updates.accessibility },
      designSystem: { ...prev.designSystem, ...updates.designSystem },
    }));
  }, []);

  const restartSystem = React.useCallback(async () => {
    setIsSystemReady(false);
    try {
      // System restart logic would go here
      // For now, just simulate restart
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSystemReady(true);
      onSystemReady?.();
    } catch (error) {
      onSystemError?.(error instanceof Error ? error.message : 'System restart failed');
    }
  }, [onSystemReady, onSystemError]);

  React.useEffect(() => {
    // Initialize system
    const initializeSystem = async () => {
      try {
        // System initialization would happen here
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsSystemReady(true);
        onSystemReady?.();
      } catch (error) {
        onSystemError?.(error instanceof Error ? error.message : 'System initialization failed');
      }
    };

    initializeSystem();
  }, [onSystemReady, onSystemError]);

  const contextValue: CoreSystemContextValue = {
    isSystemReady,
    config: systemConfig,
    updateSystemConfig,
    restartSystem,
  };

  return (
    <CoreSystemContext.Provider value={contextValue}>
      <KatalystProvider config={systemConfig.katalyst}>
        <ConfigProvider>
          <MultithreadingProvider config={{
            autoInitialize: true,
            enableWebSocketMonitoring: true,
            enablePubSub: systemConfig.runtime.multithreading?.enableSubagentCoordination,
            ...systemConfig.runtime.multithreading,
          }}>
            <RuntimeProvider config={systemConfig.runtime}>
              <AccessibilityProvider 
                enabled={systemConfig.accessibility.enabled}
                announceChanges={systemConfig.accessibility.announceChanges}
                keyboardNavigation={systemConfig.accessibility.keyboardNavigation}
              >
                <DesignSystem 
                  theme={systemConfig.designSystem.theme}
                  mode={systemConfig.designSystem.mode}
                  customTokens={systemConfig.designSystem.customTokens}
                >
                  {children}
                </DesignSystem>
              </AccessibilityProvider>
            </RuntimeProvider>
          </MultithreadingProvider>
        </ConfigProvider>
      </KatalystProvider>
    </CoreSystemContext.Provider>
  );
}

export function useCoreSystem() {
  const context = useContext(CoreSystemContext);
  if (!context) {
    throw new Error('useCoreSystem must be used within a CoreSystemGroup');
  }
  return context;
}

/**
 * Hook to access all core system providers at once
 */
export function useCoreSystemProviders() {
  const coreSystem = useCoreSystem();
  const katalyst = useKatalystContext();
  
  return {
    ...coreSystem,
    katalyst,
    isFullyReady: coreSystem.isSystemReady && katalyst.isInitialized,
  };
}

/**
 * Higher-order component for automatic core system wrapping
 */
export function withCoreSystem(defaultConfig: CoreSystemConfig) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function CoreSystemWrappedComponent(props: P & { coreSystemConfig?: Partial<CoreSystemConfig> }) {
      const { coreSystemConfig, ...componentProps } = props;
      const finalConfig = {
        ...defaultConfig,
        ...coreSystemConfig,
        runtime: { ...defaultConfig.runtime, ...coreSystemConfig?.runtime },
        accessibility: { ...defaultConfig.accessibility, ...coreSystemConfig?.accessibility },
        designSystem: { ...defaultConfig.designSystem, ...coreSystemConfig?.designSystem },
      };

      return (
        <CoreSystemGroup config={finalConfig}>
          <Component {...componentProps as P} />
        </CoreSystemGroup>
      );
    };
  };
}

export default CoreSystemGroup;