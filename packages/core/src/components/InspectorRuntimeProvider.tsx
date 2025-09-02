/**
 * Inspector Runtime Provider for Katalyst Core
 *
 * Integrates React Inspector debugging tools with Katalyst's superior React architecture.
 * Provides component inspection, performance monitoring, and development-time debugging.
 *
 * CRITICAL: This integration enhances development workflow without replacing Katalyst patterns:
 * - Frontend: React 19 + TanStack Router + Zustand (Katalyst remains supreme)
 * - Inspector: Development-time component debugging and inspection
 * - DevTools: Enhanced debugging without architectural compromise
 */

import type React from 'react';
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import type {
  InspectorComponent,
  InspectorConfig,
  InspectorDevtools,
  InspectorSession,
} from '../integrations/inspector.ts';

interface InspectorRuntimeConfig {
  config: InspectorConfig;
  onError?: (error: Error) => void;
  developmentOnly?: boolean;
  enableHotReload?: boolean;
}

interface InspectorContextValue {
  // Core integration status
  isEnabled: boolean;
  isDevelopment: boolean;
  isInitialized: boolean;
  error: Error | null;

  // Configuration access
  config: InspectorConfig;

  // Component inspection
  inspection: {
    selectedComponent: InspectorComponent | null;
    hoveredComponent: InspectorComponent | null;
    componentTree: InspectorComponent[];
    searchResults: InspectorComponent[];
    inspectionMode: boolean;
  };

  // Session management
  session: {
    current: InspectorSession | null;
    history: InspectorSession[];
    startSession: () => InspectorSession;
    endSession: () => void;
    clearHistory: () => void;
  };

  // Performance monitoring
  performance: {
    enabled: boolean;
    metrics: Map<string, any>;
    alerts: Array<{
      type: 'warning' | 'error';
      message: string;
      component: string;
      timestamp: number;
    }>;
    clearMetrics: () => void;
  };

  // DevTools integration
  devtools: {
    reactDevtools: boolean;
    zustandDevtools: boolean;
    tanstackDevtools: boolean;
    katalystEnhanced: boolean;
    ui: {
      visible: boolean;
      theme: string;
      position: string;
    };
  };

  // Actions
  actions: {
    selectComponent: (componentId: string) => void;
    hoverComponent: (componentId: string) => void;
    unhoverComponent: () => void;
    toggleInspectionMode: () => void;
    navigateToSource: (component: InspectorComponent) => void;
    searchComponents: (query: string) => void;
    clearSearch: () => void;
  };

  // Integration metadata
  integration: {
    framework: 'katalyst-react';
    version: string;
    features: string[];
    preserveKatalystSuperiority: true;
    role: 'development-enhancement';
  };
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

// Mock provider for production or when inspector is disabled
const createMockInspectorProvider = (config: InspectorConfig): InspectorContextValue => {
  console.log('🔧 Inspector disabled - production mode or config disabled');

  return {
    isEnabled: false,
    isDevelopment: false,
    isInitialized: true,
    error: null,
    config,
    inspection: {
      selectedComponent: null,
      hoveredComponent: null,
      componentTree: [],
      searchResults: [],
      inspectionMode: false,
    },
    session: {
      current: null,
      history: [],
      startSession: () => ({
        id: 'mock',
        startTime: Date.now(),
        components: new Map(),
        selectedComponent: null,
        inspectionHistory: [],
        performance: { totalComponents: 0, averageRenderTime: 0, totalRerenders: 0 },
        filters: { searchQuery: '', showHidden: false, componentsOnly: true },
      }),
      endSession: () => {},
      clearHistory: () => {},
    },
    performance: {
      enabled: false,
      metrics: new Map(),
      alerts: [],
      clearMetrics: () => {},
    },
    devtools: {
      reactDevtools: false,
      zustandDevtools: false,
      tanstackDevtools: false,
      katalystEnhanced: false,
      ui: {
        visible: false,
        theme: config.ui.theme,
        position: config.ui.position,
      },
    },
    actions: {
      selectComponent: () => {},
      hoverComponent: () => {},
      unhoverComponent: () => {},
      toggleInspectionMode: () => {},
      navigateToSource: () => {},
      searchComponents: () => {},
      clearSearch: () => {},
    },
    integration: {
      framework: 'katalyst-react',
      version: '1.0.0',
      features: ['mock-inspector'],
      preserveKatalystSuperiority: true,
      role: 'development-enhancement',
    },
  };
};

// Real inspector provider for development
const createRealInspectorProvider = (config: InspectorConfig): InspectorContextValue => {
  const componentRegistry = new Map<string, InspectorComponent>();
  const performanceMetrics = new Map<string, any>();
  const performanceAlerts: Array<{
    type: 'warning' | 'error';
    message: string;
    component: string;
    timestamp: number;
  }> = [];

  let currentSession: InspectorSession | null = null;
  let sessionHistory: InspectorSession[] = [];
  let selectedComponent: InspectorComponent | null = null;
  let hoveredComponent: InspectorComponent | null = null;
  let inspectionMode = false;
  let searchResults: InspectorComponent[] = [];

  return {
    isEnabled: true,
    isDevelopment: config.development,
    isInitialized: true,
    error: null,
    config,
    inspection: {
      selectedComponent,
      hoveredComponent,
      componentTree: Array.from(componentRegistry.values()),
      searchResults,
      inspectionMode,
    },
    session: {
      current: currentSession,
      history: sessionHistory,
      startSession: () => {
        const session: InspectorSession = {
          id: `session-${Date.now()}`,
          startTime: Date.now(),
          components: new Map(),
          selectedComponent: null,
          inspectionHistory: [],
          performance: {
            totalComponents: componentRegistry.size,
            averageRenderTime: 0,
            totalRerenders: 0,
          },
          filters: {
            searchQuery: '',
            showHidden: false,
            componentsOnly: true,
          },
        };
        currentSession = session;
        return session;
      },
      endSession: () => {
        if (currentSession) {
          sessionHistory.push(currentSession);
          currentSession = null;
        }
      },
      clearHistory: () => {
        sessionHistory = [];
      },
    },
    performance: {
      enabled: config.features.performanceMetrics,
      metrics: performanceMetrics,
      alerts: performanceAlerts,
      clearMetrics: () => {
        performanceMetrics.clear();
        performanceAlerts.length = 0;
      },
    },
    devtools: {
      reactDevtools: config.integration.reactDevtools,
      zustandDevtools: config.integration.zustandDevtools,
      tanstackDevtools: config.integration.tanstackDevtools,
      katalystEnhanced: config.integration.katalystEnhanced,
      ui: {
        visible: false,
        theme: config.ui.theme,
        position: config.ui.position,
      },
    },
    actions: {
      selectComponent: (componentId: string) => {
        selectedComponent = componentRegistry.get(componentId) || null;
      },
      hoverComponent: (componentId: string) => {
        hoveredComponent = componentRegistry.get(componentId) || null;
      },
      unhoverComponent: () => {
        hoveredComponent = null;
      },
      toggleInspectionMode: () => {
        inspectionMode = !inspectionMode;
      },
      navigateToSource: (component: InspectorComponent) => {
        if (config.features.sourceNavigation && config.editor.command) {
          const command = config.editor.command;
          const args = config.editor.args.map((arg) =>
            arg
              .replace('{file}', component.file)
              .replace('{line}', component.line.toString())
              .replace('{column}', component.column.toString())
          );

          console.log(`Opening in editor: ${command} ${args.join(' ')}`);
        }
      },
      searchComponents: (query: string) => {
        searchResults = Array.from(componentRegistry.values()).filter(
          (component) =>
            component.name.toLowerCase().includes(query.toLowerCase()) ||
            component.displayName.toLowerCase().includes(query.toLowerCase()) ||
            component.file.toLowerCase().includes(query.toLowerCase())
        );
      },
      clearSearch: () => {
        searchResults = [];
      },
    },
    integration: {
      framework: 'katalyst-react',
      version: config.ui.theme || '1.0.0',
      features: [
        'component-inspection',
        'performance-monitoring',
        'source-navigation',
        'devtools-integration',
        'katalyst-enhanced',
      ],
      preserveKatalystSuperiority: true,
      role: 'development-enhancement',
    },
  };
};

export function InspectorRuntimeProvider({
  config,
  onError,
  developmentOnly = true,
  enableHotReload = true,
  children,
}: InspectorRuntimeConfig & { children: ReactNode }) {
  const [contextValue, setContextValue] = useState<InspectorContextValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hotReloadRef = useRef<boolean>(enableHotReload);

  useEffect(() => {
    const initializeInspector = async () => {
      try {
        setIsLoading(true);

        // Check if inspector should be enabled
        const isProduction = process.env.NODE_ENV === 'production';
        const shouldEnable =
          config.enabled && config.development && (!developmentOnly || !isProduction);

        let provider: InspectorContextValue;

        if (shouldEnable) {
          provider = createRealInspectorProvider(config);

          // Setup hot reload if enabled
          if (hotReloadRef.current && (module as any).hot) {
            (module as any).hot.accept();
          }
        } else {
          provider = createMockInspectorProvider(config);
        }

        setContextValue(provider);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Inspector initialization failed');

        if (onError) {
          onError(err);
        } else {
          console.error('Inspector Runtime Error:', err.message);
        }

        // Fallback to mock provider on error
        setContextValue(createMockInspectorProvider(config));
      } finally {
        setIsLoading(false);
      }
    };

    initializeInspector();
  }, [config, developmentOnly, onError]);

  // Hot reload effect
  useEffect(() => {
    if (enableHotReload && contextValue?.isEnabled) {
      const handleHotReload = () => {
        console.log('🔄 Inspector hot reload triggered');
        setContextValue((prev) => (prev ? { ...prev } : prev));
      };

      if ((module as any).hot) {
        (module as any).hot.accept();
        (module as any).hot.addStatusHandler(handleHotReload);

        return () => {
          (module as any).hot.removeStatusHandler(handleHotReload);
        };
      }
    }
  }, [enableHotReload, contextValue?.isEnabled]);

  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}
      >
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>🔍 Initializing Inspector</div>
        <div style={{ color: '#6b7280' }}>Setting up component debugging tools...</div>
      </div>
    );
  }

  if (!contextValue) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#fef2f2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
        }}
      >
        <div style={{ fontSize: '18px', marginBottom: '10px', color: '#dc2626' }}>
          ❌ Inspector Failed
        </div>
        <div>Inspector integration could not be initialized. Check configuration.</div>
      </div>
    );
  }

  return <InspectorContext.Provider value={contextValue}>{children}</InspectorContext.Provider>;
}

// Health check component
export function InspectorHealthCheck({
  fallback,
  children,
  showDevWarning = true,
}: {
  fallback?: ReactNode;
  children: ReactNode;
  showDevWarning?: boolean;
}) {
  const inspector = useContext(InspectorContext);

  if (!inspector?.isEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showDevWarning && inspector?.isDevelopment === false) {
      return (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>🔍 Inspector Available</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Inspector is available but disabled. Enable in development for component debugging.
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// HOC for enhanced components with Inspector
export function withInspector<P extends object>(
  Component: React.ComponentType<P & { inspector: InspectorContextValue }>
) {
  return function InspectorEnhancedComponent(props: P) {
    const inspector = useContext(InspectorContext);

    if (!inspector) {
      throw new Error('withInspector must be used within InspectorRuntimeProvider');
    }

    return <Component {...props} inspector={inspector} />;
  };
}

// Component tracking HOC
export function withInspectorTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function TrackedComponent(props: P) {
    const inspector = useContext(InspectorContext);
    const componentRef = useRef<any>(null);
    const renderCountRef = useRef(0);
    const mountTimeRef = useRef(Date.now());

    useEffect(() => {
      if (inspector?.isEnabled) {
        renderCountRef.current++;

        const componentInfo: Partial<InspectorComponent> = {
          id: `${componentName || Component.name}-${mountTimeRef.current}`,
          name: componentName || Component.name || 'Anonymous',
          displayName: Component.displayName || componentName || Component.name || 'Anonymous',
          performance: {
            renderTime: 0,
            rerenderCount: renderCountRef.current,
            lastRenderTime: Date.now(),
          },
        };

        // Track component in performance metrics
        if (inspector.performance.enabled) {
          inspector.performance.metrics.set(componentInfo.id!, {
            ...componentInfo,
            mountTime: mountTimeRef.current,
            renderCount: renderCountRef.current,
          });
        }
      }
    });

    // Performance monitoring
    useEffect(() => {
      if (inspector?.performance.enabled) {
        const startTime = performance.now();

        return () => {
          const endTime = performance.now();
          const renderTime = endTime - startTime;

          // Alert if render time is too slow
          if (renderTime > 16) {
            // 16ms for 60fps
            inspector.performance.alerts.push({
              type: 'warning',
              message: `Slow render detected: ${renderTime.toFixed(2)}ms`,
              component: componentName || Component.name || 'Anonymous',
              timestamp: Date.now(),
            });
          }
        };
      }
    });

    return <Component ref={componentRef} {...props} />;
  };
}

// Hook to access Inspector context
export function useInspector(): InspectorContextValue {
  const context = useContext(InspectorContext);

  if (!context) {
    throw new Error('useInspector must be used within InspectorRuntimeProvider');
  }

  return context;
}

// Export context for advanced usage
export { InspectorContext };
export type { InspectorContextValue, InspectorRuntimeConfig };
