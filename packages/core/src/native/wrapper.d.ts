// TypeScript definitions for @swcstudio/multithreading wrapper

import * as Native from './index';

export interface ThreadControllerOptions {
  rayon?: boolean;
  rayonThreads?: number;
  rayonThreadName?: string;
  rayonStackSize?: number;
  rayonPanicHandler?: boolean;
  tokio?: boolean;
  tokioWorkerThreads?: number;
  tokioMaxBlockingThreads?: number;
  tokioThreadName?: string;
  tokioThreadStackSize?: number;
  tokioEnableIo?: boolean;
  tokioEnableTime?: boolean;
}

export interface ThreadPoolConfig {
  threads?: number;
  threadName?: string;
  stackSize?: number;
  panicHandler?: boolean;
}

export interface ChannelConfig {
  type?: 'crossbeam' | 'crossbeam-array' | 'crossbeam-seg' | 'tokio-mpsc' | 'tokio-broadcast';
  bounded?: number;
  capacity?: number;
}

export interface RuntimeConfig {
  workerThreads?: number;
  maxBlockingThreads?: number;
  threadName?: string;
  threadStackSize?: number;
  enableIo?: boolean;
  enableTime?: boolean;
}

export interface BenchmarkOptions {
  dataSize?: number;
  operations?: string[];
}

export interface StressTestOptions {
  numTasks?: number;
  taskDurationMs?: number;
}

export interface ThreadPoolController {
  name: string;
  pool: Native.RayonThreadPool;
  config: ThreadPoolConfig;
  
  map(data: number[], operation: string): Promise<number[]>;
  reduce(data: number[], operation: string, initial?: number): Promise<number>;
  filter(data: number[], operation: string, threshold?: number): Promise<number[]>;
  sort(data: number[], descending?: boolean): Promise<number[]>;
  chunkProcess(data: number[], chunkSize: number, operation: string): Promise<number[]>;
  
  getThreadCount(): number;
  destroy(): void;
}

export interface ChannelController {
  name: string;
  type: string;
  channel: any;
  
  send?(message: string): boolean;
  receive?(): string | null;
  push?(item: string): boolean;
  pop?(): string | null;
  isEmpty(): boolean;
  length(): number;
  isFull?(): boolean;
  capacity?(): number;
  receiverCount?(): number;
  
  destroy(): void;
}

export interface AtomicCellController {
  name: string;
  cell: Native.CrossbeamAtomicCell;
  
  load(): number;
  store(value: number): void;
  swap(value: number): number;
  compareExchange(current: number, newValue: number): boolean;
  fetchAdd(value: number): number;
  fetchSub(value: number): number;
  
  increment(): number;
  decrement(): number;
  reset(): void;
  
  destroy(): void;
}

export interface RuntimeController {
  name: string;
  runtime: Native.TokioRuntime;
  config: RuntimeConfig;
  
  delay(durationMs: number, message?: string): Promise<string>;
  timeout(durationMs: number, timeoutMs: number, operation?: string): Promise<string>;
  parallelTasks(tasks: string[], delayMs?: number): Promise<string[]>;
  createTimer(): Native.TokioTimer;
  
  destroy(): void;
}

export interface SystemStatus {
  initialized: boolean;
  rayonInitialized: boolean;
  tokioInitialized: boolean;
  activeThreadPools: string[];
  activeChannels: string[];
  activeRuntimes: string[];
  activeAtomicCells: string[];
  systemInfo: Native.SystemInfo;
}

export declare class ThreadController {
  constructor();
  
  initialize(options?: ThreadControllerOptions): Promise<boolean>;
  
  createThreadPool(name: string, config?: ThreadPoolConfig): ThreadPoolController;
  createChannel(name: string, config?: ChannelConfig): ChannelController;
  createAtomicCell(name: string, initialValue?: number): AtomicCellController;
  createRuntime(name: string, config?: RuntimeConfig): RuntimeController;
  
  getSystemInfo(): Native.SystemInfo;
  getPerformanceMetrics(): Native.PerformanceMetrics;
  
  benchmark(options?: BenchmarkOptions): Promise<Record<string, Native.BenchmarkResult>>;
  stressTest(options?: StressTestOptions): Promise<Native.StressTestResult[]>;
  
  destroyThreadPool(name: string): void;
  destroyChannel(name: string): void;
  destroyAtomicCell(name: string): void;
  destroyRuntime(name: string): void;
  
  getStatus(): SystemStatus;
  shutdown(): Promise<void>;
}

export declare const threadController: ThreadController;

// Convenience functions
export declare function createThreadPool(name: string, config?: ThreadPoolConfig): ThreadPoolController;
export declare function createChannel(name: string, config?: ChannelConfig): ChannelController;
export declare function createAtomicCell(name: string, initialValue?: number): AtomicCellController;
export declare function createManagedRuntime(name: string, config?: RuntimeConfig): RuntimeController;

// Re-export all native bindings
export * from './index';

// Export the wrapper as default
export { ThreadController as default };