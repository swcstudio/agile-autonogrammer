import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ThreadTask {
  id: string;
  operation: string;
  data: any;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
  threadId?: string;
}

export interface ThreadPool {
  id: string;
  type: 'rayon' | 'tokio' | 'crossbeam';
  workerCount: number;
  activeTasks: number;
  totalTasks: number;
  isActive: boolean;
}

export interface MultithreadingMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  lastUpdated: number;
}

interface MultithreadingStore {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  tasks: Map<string, ThreadTask>;
  threadPools: Map<string, ThreadPool>;
  metrics: MultithreadingMetrics;

  channels: Map<string, any>;
  subscriptions: Map<string, Set<(data: any) => void>>;

  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  addTask: (task: ThreadTask) => void;
  updateTask: (id: string, updates: Partial<ThreadTask>) => void;
  removeTask: (id: string) => void;
  getTask: (id: string) => ThreadTask | undefined;
  getTasksByStatus: (status: ThreadTask['status']) => ThreadTask[];

  addThreadPool: (pool: ThreadPool) => void;
  updateThreadPool: (id: string, updates: Partial<ThreadPool>) => void;
  removeThreadPool: (id: string) => void;
  getThreadPool: (id: string) => ThreadPool | undefined;

  updateMetrics: (metrics: Partial<MultithreadingMetrics>) => void;
  resetMetrics: () => void;

  createChannel: (id: string, channel: any) => void;
  removeChannel: (id: string) => void;
  getChannel: (id: string) => any;

  subscribe: (channelId: string, callback: (data: any) => void) => () => void;
  publish: (channelId: string, data: any) => void;

  cleanup: () => void;
}

const initialMetrics: MultithreadingMetrics = {
  totalTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  averageTaskDuration: 0,
  throughput: 0,
  memoryUsage: 0,
  cpuUsage: 0,
  lastUpdated: Date.now(),
};

export const useMultithreadingStore = create<MultithreadingStore>()(
  subscribeWithSelector((set, get) => ({
    isInitialized: false,
    isLoading: false,
    error: null,

    tasks: new Map(),
    threadPools: new Map(),
    metrics: initialMetrics,

    channels: new Map(),
    subscriptions: new Map(),

    setInitialized: (initialized: boolean) => set({ isInitialized: initialized }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),

    addTask: (task: ThreadTask) =>
      set((state) => {
        const newTasks = new Map(state.tasks);
        newTasks.set(task.id, task);
        return { tasks: newTasks };
      }),

    updateTask: (id: string, updates: Partial<ThreadTask>) =>
      set((state) => {
        const newTasks = new Map(state.tasks);
        const existingTask = newTasks.get(id);
        if (existingTask) {
          newTasks.set(id, { ...existingTask, ...updates });
        }
        return { tasks: newTasks };
      }),

    removeTask: (id: string) =>
      set((state) => {
        const newTasks = new Map(state.tasks);
        newTasks.delete(id);
        return { tasks: newTasks };
      }),

    getTask: (id: string) => get().tasks.get(id),

    getTasksByStatus: (status: ThreadTask['status']) => {
      const tasks = Array.from(get().tasks.values());
      return tasks.filter((task) => task.status === status);
    },

    addThreadPool: (pool: ThreadPool) =>
      set((state) => {
        const newPools = new Map(state.threadPools);
        newPools.set(pool.id, pool);
        return { threadPools: newPools };
      }),

    updateThreadPool: (id: string, updates: Partial<ThreadPool>) =>
      set((state) => {
        const newPools = new Map(state.threadPools);
        const existingPool = newPools.get(id);
        if (existingPool) {
          newPools.set(id, { ...existingPool, ...updates });
        }
        return { threadPools: newPools };
      }),

    removeThreadPool: (id: string) =>
      set((state) => {
        const newPools = new Map(state.threadPools);
        newPools.delete(id);
        return { threadPools: newPools };
      }),

    getThreadPool: (id: string) => get().threadPools.get(id),

    updateMetrics: (metrics: Partial<MultithreadingMetrics>) =>
      set((state) => ({
        metrics: {
          ...state.metrics,
          ...metrics,
          lastUpdated: Date.now(),
        },
      })),

    resetMetrics: () => set({ metrics: { ...initialMetrics, lastUpdated: Date.now() } }),

    createChannel: (id: string, channel: any) =>
      set((state) => {
        const newChannels = new Map(state.channels);
        newChannels.set(id, channel);
        return { channels: newChannels };
      }),

    removeChannel: (id: string) =>
      set((state) => {
        const newChannels = new Map(state.channels);
        const newSubscriptions = new Map(state.subscriptions);
        newChannels.delete(id);
        newSubscriptions.delete(id);
        return { channels: newChannels, subscriptions: newSubscriptions };
      }),

    getChannel: (id: string) => get().channels.get(id),

    subscribe: (channelId: string, callback: (data: any) => void) => {
      const state = get();
      const newSubscriptions = new Map(state.subscriptions);

      if (!newSubscriptions.has(channelId)) {
        newSubscriptions.set(channelId, new Set());
      }

      newSubscriptions.get(channelId)!.add(callback);
      set({ subscriptions: newSubscriptions });

      return () => {
        const currentState = get();
        const currentSubscriptions = new Map(currentState.subscriptions);
        const channelSubs = currentSubscriptions.get(channelId);
        if (channelSubs) {
          channelSubs.delete(callback);
          if (channelSubs.size === 0) {
            currentSubscriptions.delete(channelId);
          }
        }
        set({ subscriptions: currentSubscriptions });
      };
    },

    publish: (channelId: string, data: any) => {
      const state = get();
      const subscribers = state.subscriptions.get(channelId);
      if (subscribers) {
        subscribers.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in subscription callback for channel ${channelId}:`, error);
          }
        });
      }
    },

    cleanup: () =>
      set({
        tasks: new Map(),
        threadPools: new Map(),
        channels: new Map(),
        subscriptions: new Map(),
        metrics: { ...initialMetrics, lastUpdated: Date.now() },
        error: null,
      }),
  }))
);

export const useTaskQueue = () => {
  const store = useMultithreadingStore();

  return {
    tasks: Array.from(store.tasks.values()),
    pendingTasks: store.getTasksByStatus('pending'),
    runningTasks: store.getTasksByStatus('running'),
    completedTasks: store.getTasksByStatus('completed'),
    failedTasks: store.getTasksByStatus('failed'),
    addTask: store.addTask,
    updateTask: store.updateTask,
    removeTask: store.removeTask,
    getTask: store.getTask,
  };
};

export const useThreadPools = () => {
  const store = useMultithreadingStore();

  return {
    pools: Array.from(store.threadPools.values()),
    addPool: store.addThreadPool,
    updatePool: store.updateThreadPool,
    removePool: store.removeThreadPool,
    getPool: store.getThreadPool,
  };
};

export const useMultithreadingMetrics = () => {
  const store = useMultithreadingStore();

  return {
    metrics: store.metrics,
    updateMetrics: store.updateMetrics,
    resetMetrics: store.resetMetrics,
  };
};

export const useChannelCommunication = () => {
  const store = useMultithreadingStore();

  return {
    createChannel: store.createChannel,
    removeChannel: store.removeChannel,
    getChannel: store.getChannel,
    subscribe: store.subscribe,
    publish: store.publish,
  };
};
