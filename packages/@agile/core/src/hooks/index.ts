/**
 * Core Hooks Exports
 * Central export point for all TypeScript hooks in the core framework
 */

export {
  useExecutionEngine,
  type ExecutionConfig,
  type ExecutionTask,
  type ExecutionResult,
  type ExecutionMetrics,
  type WasmModule,
  type UseExecutionEngine,
} from './useExecutionEngine';

// Future hooks will be exported here as they are implemented:
// export { useStateManager } from './useStateManager';
// export { useEventBus } from './useEventBus';
// export { usePerformanceMonitor } from './usePerformanceMonitor';
// export { useMemoryManager } from './useMemoryManager';
// export { useTaskScheduler } from './useTaskScheduler';