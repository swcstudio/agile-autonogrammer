/**
 * Inspector Integration Type Definitions for Katalyst Core
 *
 * Comprehensive TypeScript definitions for React component debugging and inspection.
 * Integrates rsbuild-plugin-react-inspector with Katalyst's superior React architecture.
 *
 * These types ensure perfect integration with Katalyst's development workflow.
 */

// Core Inspector configuration interface
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

// Component inspection interfaces
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

// Session management interfaces
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

// DevTools integration interfaces
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

// Performance monitoring interfaces
export interface InspectorPerformanceMetrics {
  renderTimes: Map<string, number>;
  rerenderCounts: Map<string, number>;
  memoryUsage: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
  }>;
  componentSizes: Map<string, number>;
}

export interface InspectorPerformanceAlert {
  type: 'warning' | 'error';
  message: string;
  component: string;
  timestamp: number;
  threshold?: number;
  actual?: number;
}

// Runtime context interfaces
export interface InspectorRuntimeContext {
  isEnabled: boolean;
  isDevelopment: boolean;
  isInitialized: boolean;
  error: Error | null;
  config: InspectorConfig;
  inspection: {
    selectedComponent: InspectorComponent | null;
    hoveredComponent: InspectorComponent | null;
    componentTree: InspectorComponent[];
    searchResults: InspectorComponent[];
    inspectionMode: boolean;
  };
  session: {
    current: InspectorSession | null;
    history: InspectorSession[];
    startSession: () => InspectorSession;
    endSession: () => void;
    clearHistory: () => void;
  };
  performance: {
    enabled: boolean;
    metrics: Map<string, any>;
    alerts: InspectorPerformanceAlert[];
    clearMetrics: () => void;
  };
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
  actions: {
    selectComponent: (componentId: string) => void;
    hoverComponent: (componentId: string) => void;
    unhoverComponent: () => void;
    toggleInspectionMode: () => void;
    navigateToSource: (component: InspectorComponent) => void;
    searchComponents: (query: string) => void;
    clearSearch: () => void;
  };
  integration: {
    framework: 'katalyst-react';
    version: string;
    features: string[];
    preserveKatalystSuperiority: true;
    role: 'development-enhancement';
  };
}

// Hook return types
export interface UseComponentInspectionReturn {
  selectedComponent: InspectorComponent | null;
  hoveredComponent: InspectorComponent | null;
  componentTree: InspectorComponent[];
  searchResults: InspectorComponent[];
  inspectionMode: boolean;
  searchQuery: string;
  isSearching: boolean;
  inspectionHistory: string[];
  clearHistory: () => void;
  selectComponent: (componentId: string) => void;
  hoverComponent: (componentId: string) => void;
  unhoverComponent: () => void;
  toggleInspectionMode: () => void;
  navigateToSource: (component?: InspectorComponent) => void;
  searchComponents: (query: string) => void;
  clearSearch: () => void;
  getComponentById: (id: string) => InspectorComponent | undefined;
  getComponentsByName: (name: string) => InspectorComponent[];
}

export interface UseInspectorPerformanceReturn {
  enabled: boolean;
  metrics: Map<string, any>;
  alerts: InspectorPerformanceAlert[];
  performanceSnapshot: {
    timestamp: number;
    metrics: Array<{ component: string; renderTime: number; rerenderCount: number }>;
  } | null;
  takePerformanceSnapshot: () => void;
  clearSnapshot: () => void;
  getSlowComponents: (threshold?: number) => Array<{
    id: string;
    name: string;
    renderTime: number;
  }>;
  getFrequentlyRerendering: (threshold?: number) => Array<{
    id: string;
    name: string;
    rerenderCount: number;
  }>;
  getTotalComponents: () => number;
  getAverageRenderTime: () => number;
  clearMetrics: () => void;
  clearAlerts: () => void;
}

export interface UseInspectorSessionReturn {
  currentSession: InspectorSession | null;
  sessionHistory: InspectorSession[];
  isSessionActive: boolean;
  sessionStats: {
    componentsInspected: number;
    averageInspectionTime: number;
    totalInspections: number;
  };
  updateSessionStats: () => void;
  startSession: () => InspectorSession;
  endSession: () => void;
  clearHistory: () => void;
}

export interface UseInspectorDevToolsReturn {
  reactDevtools: boolean;
  zustandDevtools: boolean;
  tanstackDevtools: boolean;
  katalystEnhanced: boolean;
  devtoolsVisible: boolean;
  toggleDevTools: () => void;
  openInReactDevTools: (componentId?: string) => void;
  openInZustandDevTools: () => void;
  theme: string;
  position: string;
}

export interface UseComponentTrackingReturn {
  componentId: string;
  renderCount: number;
  isSelected: boolean;
  isHovered: boolean;
  markAsSelected: () => void;
  markAsHovered: () => void;
  unmarkAsHovered: () => void;
}

export interface UseSourceNavigationReturn {
  enabled: boolean;
  editorCommand: string;
  navigationHistory: Array<{
    component: string;
    file: string;
    timestamp: number;
  }>;
  clearHistory: () => void;
  navigateToSource: (component: InspectorComponent) => void;
  navigateToSelectedSource: () => void;
  navigateToFile: (file: string, line?: number, column?: number) => void;
}

export interface UseInspectorHotKeysReturn {
  hotKeys: {
    inspect: string[];
    toggle: string[];
    navigate: string[];
  };
  enabled: boolean;
}

// Provider configuration interfaces
export interface InspectorRuntimeConfig {
  config: InspectorConfig;
  onError?: (error: Error) => void;
  developmentOnly?: boolean;
  enableHotReload?: boolean;
}

// Component prop interfaces
export interface InspectorHealthCheckProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showDevWarning?: boolean;
}

export interface InspectorProviderProps extends InspectorRuntimeConfig {
  children: React.ReactNode;
}

// HOC interfaces
export interface WithInspectorProps {
  inspector: InspectorRuntimeContext;
}

export interface WithInspectorTrackingProps {
  componentName?: string;
}

// Event system interfaces
export interface InspectorEventMap {
  componentRegistered: InspectorComponent;
  componentUnregistered: InspectorComponent;
  componentSelected: InspectorComponent;
  componentHovered: InspectorComponent;
  inspectionModeToggled: boolean;
  sessionStarted: InspectorSession;
  sessionEnded: InspectorSession;
  performanceAlert: InspectorPerformanceAlert;
  sourceNavigated: {
    component: InspectorComponent;
    editor: string;
  };
}

// RSBuild plugin integration interfaces
export interface InspectorRSBuildConfig {
  pluginName: 'rsbuild-plugin-react-inspector';
  configuration: {
    enabled: boolean;
    include: string[];
    exclude: string[];
    editor: {
      command: string;
      args: string[];
    };
    hotKeys: {
      inspect: string[];
      toggle: string[];
      navigate: string[];
    };
    ui: {
      theme: string;
      position: string;
      size: string;
      opacity: number;
    };
  };
  developmentOnly: boolean;
  integration: 'seamless';
}

// Advanced configuration interfaces
export interface InspectorAdvancedConfig {
  performance: {
    renderTimeThreshold: number;
    rerenderThreshold: number;
    memoryThreshold: number;
    enableProfiling: boolean;
    enableMemoryTracking: boolean;
  };
  search: {
    fuzzySearch: boolean;
    caseSensitive: boolean;
    includeProps: boolean;
    includeState: boolean;
    includeHooks: boolean;
  };
  interaction: {
    clickToInspect: boolean;
    hoverHighlight: boolean;
    keyboardShortcuts: boolean;
    touchSupport: boolean;
  };
  integration: {
    preserveKatalystSuperiority: true;
    enhancementOnly: true;
    bridgeMode: boolean;
    developmentOnly: boolean;
  };
}

// Plugin and extension interfaces
export interface InspectorPlugin {
  name: string;
  version: string;
  initialize: (config: InspectorConfig) => Promise<void>;
  destroy: () => Promise<void>;
  features: string[];
  dependencies: string[];
}

export interface InspectorExtension {
  inspectors: Record<string, (component: InspectorComponent) => any>;
  filters: Record<string, (components: InspectorComponent[]) => InspectorComponent[]>;
  renderers: Record<string, (data: any) => React.ReactNode>;
  actions: Record<string, (context: InspectorRuntimeContext) => void>;
}

// Type utility interfaces for advanced usage
export type InspectorSelectComponent = (componentId: string) => void;
export type InspectorNavigateToSource = (component: InspectorComponent) => void;
export type InspectorSearchComponents = (query: string) => void;
export type InspectorPerformanceAnalyzer = (
  metrics: Map<string, any>
) => InspectorPerformanceAlert[];

// Export main class interface
export interface InspectorIntegrationClass {
  config: InspectorConfig;
  devtools: InspectorDevtools;
  componentRegistry: Map<string, InspectorComponent>;
  setupInspector(): Promise<any>;
  setupComponentTracking(): Promise<any>;
  setupDevtools(): Promise<any>;
  setupHotKeys(): Promise<any>;
  setupFilters(): Promise<any>;
  setupPerformanceMonitoring(): Promise<any>;
  registerComponent(component: InspectorComponent): void;
  unregisterComponent(componentId: string): void;
  startSession(): InspectorSession;
  endSession(): void;
  initialize(): Promise<any[]>;
  getDefaultConfig(): InspectorConfig;
  getUsageExamples(): Record<string, string>;
  getRsbuildConfiguration(): InspectorRSBuildConfig;
}

// Re-export main integration class
export { InspectorIntegration } from '../integrations/inspector.ts';
