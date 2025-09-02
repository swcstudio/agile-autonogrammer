import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Consolidated interfaces for katalyst store
export interface KatalystState {
  // Core system state
  system: {
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    version: string;
    environment: 'development' | 'production' | 'test';
  };

  // Runtime providers state
  runtime: {
    activeProviders: Map<string, ProviderState>;
    providerRegistry: Map<string, ProviderConfig>;
    crossProviderTasks: Map<string, CrossProviderTask>;
  };

  // Multithreading state (enhanced)
  multithreading: {
    isEnabled: boolean;
    nativeModule: any;
    threadPools: Map<string, ThreadPoolState>;
    tasks: Map<string, ThreadTaskState>;
    metrics: MultithreadingMetrics;
    subagents: Map<string, SubagentState>;
    channels: Map<string, ChannelState>;
  };

  // Configuration state
  config: {
    katalyst: any;
    integrations: Map<string, IntegrationConfig>;
    theme: ThemeConfig;
    performance: PerformanceConfig;
  };

  // UI and component state
  ui: {
    designSystem: DesignSystemState;
    components: Map<string, ComponentState>;
    layouts: Map<string, LayoutState>;
  };

  // Analytics and monitoring
  analytics: {
    usage: UsageMetrics;
    performance: PerformanceMetrics;
    errors: ErrorLog[];
    healthStatus: SystemHealthStatus;
  };
}

export interface ProviderState {
  id: string;
  type: string;
  isEnabled: boolean;
  isInitialized: boolean;
  isHealthy: boolean;
  config: any;
  metrics: {
    tasksExecuted: number;
    avgExecutionTime: number;
    errorRate: number;
    lastActivity: number;
  };
}

export interface ThreadPoolState {
  id: string;
  type: 'rayon' | 'tokio' | 'crossbeam' | 'custom' | 'ai';
  workerCount: number;
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  isActive: boolean;
  utilization: number;
  health: 'healthy' | 'degraded' | 'critical';
}

export interface ThreadTaskState {
  id: string;
  type: 'cpu' | 'io' | 'gpu' | 'ai';
  operation: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  provider?: string;
  data: any;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  executionTime: number;
  threadId: string;
  retryCount: number;
  subagentId?: string;
}

export interface SubagentState {
  id: string;
  capabilities: string[];
  isActive: boolean;
  lastSeen: number;
  currentTasks: string[];
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
}

// Actions interface for the katalyst store
export interface KatalystActions {
  // System actions
  initializeSystem: (config: any) => Promise<void>;
  setSystemError: (error: string | null) => void;
  setSystemLoading: (loading: boolean) => void;

  // Runtime provider actions
  registerProvider: (provider: ProviderState) => void;
  unregisterProvider: (providerId: string) => void;
  updateProviderState: (providerId: string, updates: Partial<ProviderState>) => void;
  enableProvider: (providerId: string) => void;
  disableProvider: (providerId: string) => void;

  // Multithreading actions
  initializeMultithreading: (nativeModule: any) => void;
  addThreadPool: (pool: ThreadPoolState) => void;
  updateThreadPool: (poolId: string, updates: Partial<ThreadPoolState>) => void;
  removeThreadPool: (poolId: string) => void;
  addTask: (task: ThreadTaskState) => void;
  updateTask: (taskId: string, updates: Partial<ThreadTaskState>) => void;
  removeTask: (taskId: string) => void;
  updateMetrics: (metrics: Partial<MultithreadingMetrics>) => void;

  // Subagent actions
  registerSubagent: (subagent: SubagentState) => void;
  unregisterSubagent: (subagentId: string) => void;
  updateSubagentStatus: (subagentId: string, updates: Partial<SubagentState>) => void;

  // Configuration actions
  updateKatalystConfig: (updates: any) => void;
  updateIntegrationConfig: (integrationId: string, config: IntegrationConfig) => void;
  updateThemeConfig: (theme: ThemeConfig) => void;
  updatePerformanceConfig: (performance: PerformanceConfig) => void;

  // UI actions
  updateDesignSystem: (updates: Partial<DesignSystemState>) => void;
  registerComponent: (component: ComponentState) => void;
  updateComponentState: (componentId: string, updates: Partial<ComponentState>) => void;

  // Analytics actions
  recordUsage: (event: string, data: any) => void;
  recordError: (error: ErrorEntry) => void;
  updateHealthStatus: (status: SystemHealthStatus) => void;
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;

  // Utility actions
  cleanup: () => void;
  reset: () => void;
  exportState: () => KatalystState;
  importState: (state: Partial<KatalystState>) => void;
}

// Supporting interfaces
export interface CrossProviderTask {
  id: string;
  providers: string[];
  operation: string;
  data: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: Map<string, any>;
  errors: Map<string, string>;
  startTime: number;
  endTime?: number;
}

export interface IntegrationConfig {
  enabled: boolean;
  config: any;
  priority: number;
  dependencies: string[];
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  font: string;
  spacing: 'compact' | 'normal' | 'comfortable';
}

export interface PerformanceConfig {
  enableProfiling: boolean;
  enableMetrics: boolean;
  metricsInterval: number;
  enableCaching: boolean;
  cacheSize: number;
}

export interface DesignSystemState {
  theme: string;
  components: Map<string, any>;
  tokens: Map<string, any>;
  breakpoints: any;
}

export interface ComponentState {
  id: string;
  type: string;
  props: any;
  state: any;
  isVisible: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LayoutState {
  id: string;
  type: string;
  components: string[];
  config: any;
}

export interface UsageMetrics {
  sessionStart: number;
  totalInteractions: number;
  featureUsage: Map<string, number>;
  errorCount: number;
  performanceEvents: number;
}

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  renderTime: number;
  bundleSize: number;
  lastUpdated: number;
}

export interface ErrorEntry {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component?: string;
  provider?: string;
}

export interface ErrorLog extends ErrorEntry {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  components: Map<string, 'healthy' | 'degraded' | 'critical'>;
  lastCheck: number;
  uptime: number;
}

export interface MultithreadingMetrics {
  totalThreads: number;
  activeThreads: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  threadUtilization: number;
  errorRate: number;
  lastUpdated: number;
}

// Initial state
const initialState: KatalystState = {
  system: {
    isInitialized: false,
    isLoading: false,
    error: null,
    version: '1.0.0',
    environment: 'development',
  },
  runtime: {
    activeProviders: new Map(),
    providerRegistry: new Map(),
    crossProviderTasks: new Map(),
  },
  multithreading: {
    isEnabled: false,
    nativeModule: null,
    threadPools: new Map(),
    tasks: new Map(),
    metrics: {
      totalThreads: 0,
      activeThreads: 0,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      throughput: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      threadUtilization: 0,
      errorRate: 0,
      lastUpdated: Date.now(),
    },
    subagents: new Map(),
    channels: new Map(),
  },
  config: {
    katalyst: {},
    integrations: new Map(),
    theme: {
      mode: 'dark',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      font: 'Inter',
      spacing: 'normal',
    },
    performance: {
      enableProfiling: true,
      enableMetrics: true,
      metricsInterval: 5000,
      enableCaching: true,
      cacheSize: 100,
    },
  },
  ui: {
    designSystem: {
      theme: 'default',
      components: new Map(),
      tokens: new Map(),
      breakpoints: {},
    },
    components: new Map(),
    layouts: new Map(),
  },
  analytics: {
    usage: {
      sessionStart: Date.now(),
      totalInteractions: 0,
      featureUsage: new Map(),
      errorCount: 0,
      performanceEvents: 0,
    },
    performance: {
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      renderTime: 0,
      bundleSize: 0,
      lastUpdated: Date.now(),
    },
    errors: [],
    healthStatus: {
      overall: 'healthy',
      components: new Map(),
      lastCheck: Date.now(),
      uptime: 0,
    },
  },
};

export interface ChannelState {
  id: string;
  type: 'crossbeam' | 'tokio' | 'broadcast';
  isActive: boolean;
  capacity?: number;
  messageCount: number;
  subscribers: number;
}

// Create the katalyst store
export const useKatalystStore = create<KatalystState & KatalystActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // System actions
        initializeSystem: async (config: any) => {
          set((state) => {
            state.system.isLoading = true;
            state.system.error = null;
          });

          try {
            // Initialize system components
            set((state) => {
              state.config.katalyst = config;
              state.system.isInitialized = true;
              state.system.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.system.error = error instanceof Error ? error.message : 'Initialization failed';
              state.system.isLoading = false;
            });
          }
        },

        setSystemError: (error: string | null) => {
          set((state) => {
            state.system.error = error;
          });
        },

        setSystemLoading: (loading: boolean) => {
          set((state) => {
            state.system.isLoading = loading;
          });
        },

        // Runtime provider actions
        registerProvider: (provider: ProviderState) => {
          set((state) => {
            state.runtime.activeProviders.set(provider.id, provider);
          });
        },

        unregisterProvider: (providerId: string) => {
          set((state) => {
            state.runtime.activeProviders.delete(providerId);
          });
        },

        updateProviderState: (providerId: string, updates: Partial<ProviderState>) => {
          set((state) => {
            const provider = state.runtime.activeProviders.get(providerId);
            if (provider) {
              state.runtime.activeProviders.set(providerId, { ...provider, ...updates });
            }
          });
        },

        enableProvider: (providerId: string) => {
          set((state) => {
            const provider = state.runtime.activeProviders.get(providerId);
            if (provider) {
              provider.isEnabled = true;
            }
          });
        },

        disableProvider: (providerId: string) => {
          set((state) => {
            const provider = state.runtime.activeProviders.get(providerId);
            if (provider) {
              provider.isEnabled = false;
            }
          });
        },

        // Multithreading actions
        initializeMultithreading: (nativeModule: any) => {
          set((state) => {
            state.multithreading.isEnabled = true;
            state.multithreading.nativeModule = nativeModule;
          });
        },

        addThreadPool: (pool: ThreadPoolState) => {
          set((state) => {
            state.multithreading.threadPools.set(pool.id, pool);
          });
        },

        updateThreadPool: (poolId: string, updates: Partial<ThreadPoolState>) => {
          set((state) => {
            const pool = state.multithreading.threadPools.get(poolId);
            if (pool) {
              state.multithreading.threadPools.set(poolId, { ...pool, ...updates });
            }
          });
        },

        removeThreadPool: (poolId: string) => {
          set((state) => {
            state.multithreading.threadPools.delete(poolId);
          });
        },

        addTask: (task: ThreadTaskState) => {
          set((state) => {
            state.multithreading.tasks.set(task.id, task);
          });
        },

        updateTask: (taskId: string, updates: Partial<ThreadTaskState>) => {
          set((state) => {
            const task = state.multithreading.tasks.get(taskId);
            if (task) {
              state.multithreading.tasks.set(taskId, { ...task, ...updates });
            }
          });
        },

        removeTask: (taskId: string) => {
          set((state) => {
            state.multithreading.tasks.delete(taskId);
          });
        },

        updateMetrics: (metrics: Partial<MultithreadingMetrics>) => {
          set((state) => {
            state.multithreading.metrics = {
              ...state.multithreading.metrics,
              ...metrics,
              lastUpdated: Date.now(),
            };
          });
        },

        // Subagent actions
        registerSubagent: (subagent: SubagentState) => {
          set((state) => {
            state.multithreading.subagents.set(subagent.id, subagent);
          });
        },

        unregisterSubagent: (subagentId: string) => {
          set((state) => {
            state.multithreading.subagents.delete(subagentId);
          });
        },

        updateSubagentStatus: (subagentId: string, updates: Partial<SubagentState>) => {
          set((state) => {
            const subagent = state.multithreading.subagents.get(subagentId);
            if (subagent) {
              state.multithreading.subagents.set(subagentId, { ...subagent, ...updates });
            }
          });
        },

        // Configuration actions
        updateKatalystConfig: (updates: any) => {
          set((state) => {
            state.config.katalyst = { ...state.config.katalyst, ...updates };
          });
        },

        updateIntegrationConfig: (integrationId: string, config: IntegrationConfig) => {
          set((state) => {
            state.config.integrations.set(integrationId, config);
          });
        },

        updateThemeConfig: (theme: ThemeConfig) => {
          set((state) => {
            state.config.theme = theme;
          });
        },

        updatePerformanceConfig: (performance: PerformanceConfig) => {
          set((state) => {
            state.config.performance = performance;
          });
        },

        // UI actions
        updateDesignSystem: (updates: Partial<DesignSystemState>) => {
          set((state) => {
            state.ui.designSystem = { ...state.ui.designSystem, ...updates };
          });
        },

        registerComponent: (component: ComponentState) => {
          set((state) => {
            state.ui.components.set(component.id, component);
          });
        },

        updateComponentState: (componentId: string, updates: Partial<ComponentState>) => {
          set((state) => {
            const component = state.ui.components.get(componentId);
            if (component) {
              state.ui.components.set(componentId, { ...component, ...updates });
            }
          });
        },

        // Analytics actions
        recordUsage: (event: string, data: any) => {
          set((state) => {
            state.analytics.usage.totalInteractions++;
            const currentCount = state.analytics.usage.featureUsage.get(event) || 0;
            state.analytics.usage.featureUsage.set(event, currentCount + 1);
          });
        },

        recordError: (error: ErrorEntry) => {
          set((state) => {
            const existingError = state.analytics.errors.find(e => e.message === error.message);
            if (existingError) {
              existingError.count++;
              existingError.lastSeen = error.timestamp;
            } else {
              state.analytics.errors.push({
                ...error,
                count: 1,
                firstSeen: error.timestamp,
                lastSeen: error.timestamp,
              });
            }
            state.analytics.usage.errorCount++;
          });
        },

        updateHealthStatus: (status: SystemHealthStatus) => {
          set((state) => {
            state.analytics.healthStatus = status;
          });
        },

        updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => {
          set((state) => {
            state.analytics.performance = {
              ...state.analytics.performance,
              ...metrics,
              lastUpdated: Date.now(),
            };
            state.analytics.usage.performanceEvents++;
          });
        },

        // Utility actions
        cleanup: () => {
          set((state) => {
            state.multithreading.tasks.clear();
            state.multithreading.channels.clear();
            state.runtime.crossProviderTasks.clear();
            state.analytics.errors = [];
          });
        },

        reset: () => {
          set(initialState);
        },

        exportState: () => {
          return get();
        },

        importState: (importedState: Partial<KatalystState>) => {
          set((state) => {
            Object.assign(state, importedState);
          });
        },
      }))
    ),
    { name: 'katalyst-store' }
  )
);

// Selector hooks for specific store slices
export const useSystemState = () => useKatalystStore((state) => state.system);
export const useRuntimeState = () => useKatalystStore((state) => state.runtime);
export const useMultithreadingState = () => useKatalystStore((state) => state.multithreading);
export const useConfigState = () => useKatalystStore((state) => state.config);
export const useUIState = () => useKatalystStore((state) => state.ui);
export const useAnalyticsState = () => useKatalystStore((state) => state.analytics);