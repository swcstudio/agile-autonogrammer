/**
 * React Inspector Integration for Katalyst Core
 *
 * Integrates rsbuild-plugin-react-inspector for enhanced React component debugging
 * and development experience within Katalyst's superior architecture.
 *
 * CRITICAL: This integration enhances development workflow without replacing Katalyst patterns:
 * - Frontend: React 19 + TanStack Router + Zustand (Katalyst remains supreme)
 * - Inspector: Component inspection and debugging enhancement
 * - DevTools: Development-only tools that complement Katalyst's architecture
 */

export interface InspectorConfig {
  enabled: boolean;
  development: boolean;
  production: boolean;
  hotKeys: {
    inspect: string[];
    toggle: string[];
    navigate: string[];
  };
  editor: {
    command: string;
    args: string[];
    fallback?: string;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size: 'small' | 'medium' | 'large';
    opacity: number;
  };
  features: {
    componentTree: boolean;
    propsInspection: boolean;
    stateInspection: boolean;
    hooksInspection: boolean;
    performanceMetrics: boolean;
    sourceNavigation: boolean;
    componentSearch: boolean;
  };
  filters: {
    includePatterns: string[];
    excludePatterns: string[];
    ignoreNodeModules: boolean;
    ignoreAnonymous: boolean;
  };
  integration: {
    zustandDevtools: boolean;
    tanstackDevtools: boolean;
    reactDevtools: boolean;
    katalystEnhanced: boolean;
  };
}

export interface InspectorComponent {
  id: string;
  name: string;
  displayName: string;
  file: string;
  line: number;
  column: number;
  props: Record<string, any>;
  state: Record<string, any>;
  hooks: Array<{
    name: string;
    value: any;
    index: number;
  }>;
  children: InspectorComponent[];
  parent: InspectorComponent | null;
  source: {
    original: string;
    compiled: string;
    sourcemap?: string;
  };
  performance: {
    renderTime: number;
    rerenderCount: number;
    lastRenderTime: number;
  };
}

export interface InspectorSession {
  id: string;
  startTime: number;
  components: Map<string, InspectorComponent>;
  selectedComponent: string | null;
  inspectionHistory: string[];
  performance: {
    totalComponents: number;
    averageRenderTime: number;
    totalRerenders: number;
  };
  filters: {
    searchQuery: string;
    showHidden: boolean;
    componentsOnly: boolean;
  };
}

export interface InspectorDevtools {
  enabled: boolean;
  session: InspectorSession | null;
  ui: {
    visible: boolean;
    theme: string;
    position: string;
  };
  features: {
    realTimeInspection: boolean;
    performanceMonitoring: boolean;
    componentSearch: boolean;
    sourceNavigation: boolean;
  };
}

export class InspectorIntegration {
  private config: InspectorConfig;
  private devtools: InspectorDevtools;
  private componentRegistry: Map<string, InspectorComponent>;
  private eventListeners: Map<string, Function[]>;

  constructor(config: InspectorConfig) {
    this.config = config;
    this.componentRegistry = new Map();
    this.eventListeners = new Map();
    this.devtools = {
      enabled: config.enabled && config.development,
      session: null,
      ui: {
        visible: false,
        theme: config.ui.theme,
        position: config.ui.position,
      },
      features: {
        realTimeInspection: config.features.componentTree,
        performanceMonitoring: config.features.performanceMetrics,
        componentSearch: config.features.componentSearch,
        sourceNavigation: config.features.sourceNavigation,
      },
    };
  }

  async setupInspector() {
    return {
      name: 'react-inspector',
      framework: 'katalyst-react',
      setup: () => ({
        // Core inspector features
        components: this.componentRegistry,
        devtools: this.devtools,
        config: this.config,

        // Enhanced Katalyst integration
        katalystIntegration: {
          preserveSuperiority: true,
          enhanceDevExperience: true,
          integrateWithZustand: this.config.integration.zustandDevtools,
          integrateWithTanStack: this.config.integration.tanstackDevtools,
          katalystEnhanced: this.config.integration.katalystEnhanced,
        },

        // Inspector capabilities
        features: {
          componentInspection: {
            enabled: this.config.features.componentTree,
            realTime: true,
            deepInspection: true,
            sourceMapping: this.config.features.sourceNavigation,
          },
          propsInspection: {
            enabled: this.config.features.propsInspection,
            showFunctions: true,
            showComplexObjects: true,
            editableInDev: true,
          },
          stateInspection: {
            enabled: this.config.features.stateInspection,
            zustandStores: this.config.integration.zustandDevtools,
            localState: true,
            contextState: true,
          },
          hooksInspection: {
            enabled: this.config.features.hooksInspection,
            showHookTypes: true,
            showDependencies: true,
            performanceTracking: true,
          },
          performanceMetrics: {
            enabled: this.config.features.performanceMetrics,
            renderTimes: true,
            rerenderTracking: true,
            memoryUsage: true,
            componentProfiler: true,
          },
        },

        // Development tools
        devTools: {
          hotKeys: this.config.hotKeys,
          editor: this.config.editor,
          ui: this.config.ui,
          search: {
            enabled: this.config.features.componentSearch,
            fuzzySearch: true,
            fileSearch: true,
            componentSearch: true,
          },
        },

        // RSBuild plugin configuration
        rsbuildPlugin: {
          name: 'rsbuild-plugin-react-inspector',
          enabled: this.config.enabled,
          options: {
            include: this.config.filters.includePatterns,
            exclude: this.config.filters.excludePatterns,
            editor: this.config.editor.command,
            hotKeys: this.config.hotKeys,
          },
        },
      }),

      // Plugin dependencies
      dependencies: [
        'rsbuild-plugin-react-inspector',
        '@rsbuild/plugin-react-inspector',
        'react-devtools-core',
      ],

      // RSBuild integration
      rsbuildSetup: {
        plugin: 'rsbuild-plugin-react-inspector',
        config: {
          enabled: this.config.enabled && this.config.development,
          include: this.config.filters.includePatterns,
          exclude: this.config.filters.excludePatterns,
          editor: {
            command: this.config.editor.command,
            args: this.config.editor.args,
          },
          hotKeys: this.config.hotKeys,
          ui: {
            theme: this.config.ui.theme,
            position: this.config.ui.position,
          },
        },
      },
    };
  }

  async setupComponentTracking() {
    return {
      name: 'component-tracking',
      setup: () => ({
        // Component lifecycle tracking
        tracking: {
          enabled: this.config.features.componentTree,
          trackMounts: true,
          trackUpdates: true,
          trackUnmounts: true,
          trackRerenders: this.config.features.performanceMetrics,
        },

        // Performance monitoring
        performance: {
          enabled: this.config.features.performanceMetrics,
          measureRenderTime: true,
          trackRerenders: true,
          memoryTracking: true,
          componentProfiler: true,
        },

        // Source mapping
        sourceMapping: {
          enabled: this.config.features.sourceNavigation,
          preserveOriginalNames: true,
          enableClickToSource: true,
          mapMinifiedNames: true,
        },

        // Component registry
        registry: {
          components: this.componentRegistry,
          indexByName: true,
          indexByFile: true,
          trackHierarchy: true,
          enableSearch: this.config.features.componentSearch,
        },
      }),
    };
  }

  async setupDevtools() {
    return {
      name: 'inspector-devtools',
      setup: () => ({
        // Core devtools functionality
        devtools: {
          enabled: this.devtools.enabled,
          session: this.devtools.session,
          ui: this.devtools.ui,
          features: this.devtools.features,
        },

        // React DevTools integration
        reactDevtools: {
          enabled: this.config.integration.reactDevtools,
          bridge: true,
          backend: true,
          profiler: this.config.features.performanceMetrics,
        },

        // Zustand DevTools integration
        zustandDevtools: {
          enabled: this.config.integration.zustandDevtools,
          storeName: 'Katalyst Inspector Store',
          serialize: true,
          actionType: 'inspector-action',
          features: {
            timeTravel: true,
            persist: false,
            subscribe: true,
          },
        },

        // TanStack DevTools integration
        tanstackDevtools: {
          enabled: this.config.integration.tanstackDevtools,
          position: this.config.ui.position,
          initialIsOpen: false,
          panelProps: {
            style: { zIndex: 99999 },
          },
        },

        // Katalyst Enhanced DevTools
        katalystDevtools: {
          enabled: this.config.integration.katalystEnhanced,
          features: {
            routerInspection: true,
            storeInspection: true,
            componentInspection: true,
            performanceMonitoring: true,
          },
          integration: {
            preserveSuperiority: true,
            enhanceNotReplace: true,
            bridgeMode: true,
          },
        },
      }),
    };
  }

  async setupHotKeys() {
    return {
      name: 'inspector-hotkeys',
      setup: () => ({
        // Keyboard shortcuts
        hotKeys: {
          inspect: {
            keys: this.config.hotKeys.inspect,
            description: 'Toggle component inspection mode',
            action: 'toggleInspection',
          },
          toggle: {
            keys: this.config.hotKeys.toggle,
            description: 'Toggle inspector UI visibility',
            action: 'toggleUI',
          },
          navigate: {
            keys: this.config.hotKeys.navigate,
            description: 'Navigate to component source',
            action: 'navigateToSource',
          },
        },

        // Mouse interactions
        mouse: {
          clickToInspect: {
            enabled: true,
            modifier: 'ctrl',
            action: 'selectComponent',
          },
          hoverHighlight: {
            enabled: true,
            delay: 200,
            showTooltip: true,
          },
        },

        // Touch interactions (for mobile development)
        touch: {
          enabled: true,
          longPress: {
            duration: 500,
            action: 'selectComponent',
          },
        },
      }),
    };
  }

  async setupFilters() {
    return {
      name: 'inspector-filters',
      setup: () => ({
        // Component filtering
        filters: {
          include: this.config.filters.includePatterns,
          exclude: this.config.filters.excludePatterns,
          ignoreNodeModules: this.config.filters.ignoreNodeModules,
          ignoreAnonymous: this.config.filters.ignoreAnonymous,
        },

        // Search functionality
        search: {
          enabled: this.config.features.componentSearch,
          fuzzyMatch: true,
          searchBy: ['name', 'file', 'props', 'displayName'],
          caseSensitive: false,
          regex: true,
        },

        // Visibility controls
        visibility: {
          showHidden: false,
          showInternal: false,
          showSystemComponents: false,
          componentsOnly: true,
        },
      }),
    };
  }

  async setupPerformanceMonitoring() {
    return {
      name: 'inspector-performance',
      setup: () => ({
        // Performance tracking
        performance: {
          enabled: this.config.features.performanceMetrics,
          measureRenderTime: true,
          trackRerenders: true,
          memoryMonitoring: true,
          componentProfiler: true,
        },

        // Metrics collection
        metrics: {
          renderTimes: new Map(),
          rerenderCounts: new Map(),
          memoryUsage: [],
          componentSizes: new Map(),
        },

        // Performance alerts
        alerts: {
          slowRenders: {
            enabled: true,
            threshold: 16, // 16ms for 60fps
            action: 'warn',
          },
          excessiveRerenders: {
            enabled: true,
            threshold: 10,
            timeWindow: 1000,
            action: 'warn',
          },
          memoryLeaks: {
            enabled: true,
            threshold: 50, // MB
            action: 'error',
          },
        },
      }),
    };
  }

  // Component registration methods
  registerComponent(component: InspectorComponent): void {
    this.componentRegistry.set(component.id, component);
    this.emit('componentRegistered', component);
  }

  unregisterComponent(componentId: string): void {
    const component = this.componentRegistry.get(componentId);
    if (component) {
      this.componentRegistry.delete(componentId);
      this.emit('componentUnregistered', component);
    }
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((callback) => callback(data));
  }

  // Session management
  startSession(): InspectorSession {
    const session: InspectorSession = {
      id: `session-${Date.now()}`,
      startTime: Date.now(),
      components: new Map(),
      selectedComponent: null,
      inspectionHistory: [],
      performance: {
        totalComponents: 0,
        averageRenderTime: 0,
        totalRerenders: 0,
      },
      filters: {
        searchQuery: '',
        showHidden: false,
        componentsOnly: true,
      },
    };

    this.devtools.session = session;
    this.emit('sessionStarted', session);
    return session;
  }

  endSession(): void {
    if (this.devtools.session) {
      this.emit('sessionEnded', this.devtools.session);
      this.devtools.session = null;
    }
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupInspector(),
      this.setupComponentTracking(),
      this.setupDevtools(),
      this.setupHotKeys(),
      this.setupFilters(),
      this.setupPerformanceMonitoring(),
    ]);

    return integrations.filter(Boolean);
  }

  // Configuration helpers
  getDefaultConfig(): InspectorConfig {
    return {
      enabled: true,
      development: true,
      production: false,
      hotKeys: {
        inspect: ['ctrl', 'shift', 'i'],
        toggle: ['ctrl', 'shift', 'd'],
        navigate: ['ctrl', 'shift', 'o'],
      },
      editor: {
        command: 'code',
        args: ['--goto', '{file}:{line}:{column}'],
        fallback: 'cursor',
      },
      ui: {
        theme: 'auto',
        position: 'bottom-right',
        size: 'medium',
        opacity: 0.9,
      },
      features: {
        componentTree: true,
        propsInspection: true,
        stateInspection: true,
        hooksInspection: true,
        performanceMetrics: true,
        sourceNavigation: true,
        componentSearch: true,
      },
      filters: {
        includePatterns: ['src/**/*'],
        excludePatterns: ['node_modules/**/*', '**/*.test.*', '**/*.spec.*'],
        ignoreNodeModules: true,
        ignoreAnonymous: false,
      },
      integration: {
        zustandDevtools: true,
        tanstackDevtools: true,
        reactDevtools: true,
        katalystEnhanced: true,
      },
    };
  }

  // Utility methods
  getUsageExamples() {
    return {
      basicSetup: `
        import { InspectorIntegration } from '@katalyst/inspector';
        
        const inspector = new InspectorIntegration({
          enabled: true,
          development: true,
          features: {
            componentTree: true,
            performanceMetrics: true,
            sourceNavigation: true
          }
        });
        
        // Initialize in your app
        await inspector.initialize();
      `,

      rsbuildConfig: `
        // rsbuild.config.ts
        import { defineConfig } from '@rsbuild/core';
        import { pluginReactInspector } from '@rsbuild/plugin-react-inspector';
        
        export default defineConfig({
          plugins: [
            pluginReactInspector({
              include: ['src/**/*'],
              exclude: ['node_modules/**/*'],
              editor: {
                command: 'code',
                args: ['--goto', '{file}:{line}:{column}']
              }
            })
          ]
        });
      `,

      componentInspection: `
        // Usage in React components
        import { useInspector } from '@katalyst/inspector';
        
        function MyComponent() {
          const inspector = useInspector();
          
          // Component automatically tracked when inspector is enabled
          return (
            <div>
              {/* Inspector will track this component */}
              <h1>Hello World</h1>
            </div>
          );
        }
      `,
    };
  }

  getRsbuildConfiguration() {
    return {
      pluginName: 'rsbuild-plugin-react-inspector',
      configuration: {
        enabled: this.config.enabled && this.config.development,
        include: this.config.filters.includePatterns,
        exclude: this.config.filters.excludePatterns,
        editor: {
          command: this.config.editor.command,
          args: this.config.editor.args,
        },
        hotKeys: this.config.hotKeys,
        ui: {
          theme: this.config.ui.theme,
          position: this.config.ui.position,
          size: this.config.ui.size,
          opacity: this.config.ui.opacity,
        },
      },
      developmentOnly: true,
      integration: 'seamless',
    };
  }
}
