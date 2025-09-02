# PRD-001: Core Framework Migration & TypeScript Hook Architecture

## Executive Summary

**Objective**: Migrate Katalyst's core framework packages to Agile-Programmers architecture with modern TypeScript Hook patterns, establishing the foundation for a high-performance, multi-runtime development platform.

**Success Metrics**:
- Core framework packages fully operational with hook-based architecture
- 100% TypeScript coverage with strict typing
- Performance benchmarks meet or exceed Katalyst baselines
- Complete API compatibility for seamless migration

## Package Scope

### Primary Core Packages
```
packages/core/           - Main framework entry point
packages/cli/            - Command line interface
packages/utils/          - Shared utilities 
packages/hooks/          - React Hook system
packages/shared-types/   - TypeScript definitions
```

## Architecture Requirements

### 1. TypeScript Hook Migration Strategy

**Current State Analysis**:
```typescript
// packages/core/src/index.ts - Current Export Pattern
export { ExecutionEngine, PipelineManager, ContextManager, CommandRegistry }
export type { ExecutionContext, ExecutionPlan, ExecutionResult }

// Target Hook Architecture
export { 
  useExecutionEngine, 
  usePipelineManager, 
  useContextManager, 
  useCommandRegistry 
}
```

**Hook Implementation Requirements**:
```typescript
// Target Implementation Structure
interface CoreHookSystem {
  useExecutionEngine: (config?: ExecutionEngineConfig) => {
    engine: ExecutionEngine;
    execute: (plan: ExecutionPlan) => Promise<ExecutionResult>;
    status: ExecutionStatus;
    metrics: ExecutionMetrics;
    reset: () => void;
  };
  
  usePipelineManager: (engineInstance?: ExecutionEngine) => {
    manager: PipelineManager;
    createPipeline: (id: string) => Pipeline;
    runPipeline: (pipeline: Pipeline) => Promise<PipelineResult>;
    pipelines: Pipeline[];
    status: Record<string, ExecutionStatus>;
  };
  
  useContextManager: () => {
    manager: ContextManager;
    createContext: (config?: any) => Promise<ExecutionContext>;
    activeContext: ExecutionContext | null;
    switchContext: (context: ExecutionContext) => void;
    contexts: ExecutionContext[];
  };
  
  useCommandRegistry: () => {
    registry: CommandRegistry;
    registerCommand: (definition: CommandDefinition) => void;
    executeCommand: (name: string, context: CommandContext) => Promise<CommandResult>;
    availableCommands: CommandDefinition[];
    commandHistory: CommandResult[];
  };
}
```

### 2. Performance Requirements

**Execution Benchmarks**:
- Hook initialization: < 10ms
- Context switching: < 5ms  
- Pipeline execution: < 50ms per stage
- Memory usage: < 50MB baseline

**WASM Integration Points**:
```typescript
// Core WASM Runtime Integration
interface CoreWasmInterface {
  initializeWasmRuntime: () => Promise<void>;
  executeInWasm: (operation: string, data: any) => Promise<any>;
  getRuntimeStats: () => WasmRuntimeStats;
}

// Hook Integration
const useCoreWithWasm = () => {
  const { engine } = useExecutionEngine();
  const [wasmRuntime, setWasmRuntime] = useState<CoreWasmInterface | null>(null);
  
  useEffect(() => {
    // Initialize WASM runtime alongside core engine
  }, [engine]);
  
  return { engine, wasmRuntime };
};
```

## Implementation Phases

### Phase 1: Core Hook Foundation (Week 1-2)
```typescript
// packages/hooks/src/core/useExecutionEngine.ts
export function useExecutionEngine(config?: ExecutionEngineConfig) {
  const [engine, setEngine] = useState<ExecutionEngine | null>(null);
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [metrics, setMetrics] = useState<ExecutionMetrics>({});
  
  const initializeEngine = useCallback(async () => {
    const engineInstance = new ExecutionEngine(config);
    await engineInstance.initialize();
    setEngine(engineInstance);
    setStatus('ready');
  }, [config]);
  
  const execute = useCallback(async (plan: ExecutionPlan) => {
    if (!engine) throw new Error('Engine not initialized');
    
    setStatus('executing');
    const startTime = performance.now();
    
    try {
      const result = await engine.execute(plan);
      const duration = performance.now() - startTime;
      
      setMetrics(prev => ({
        ...prev,
        lastExecutionTime: duration,
        totalExecutions: (prev.totalExecutions || 0) + 1
      }));
      
      setStatus('completed');
      return result;
    } catch (error) {
      setStatus('error');
      throw error;
    }
  }, [engine]);
  
  const reset = useCallback(() => {
    setStatus('idle');
    setMetrics({});
    engine?.reset?.();
  }, [engine]);
  
  useEffect(() => {
    initializeEngine();
  }, [initializeEngine]);
  
  return { engine, execute, status, metrics, reset };
}
```

### Phase 2: Pipeline Hook System (Week 2-3)
```typescript
// packages/hooks/src/core/usePipelineManager.ts
export function usePipelineManager(engineInstance?: ExecutionEngine) {
  const { engine: defaultEngine } = useExecutionEngine();
  const engine = engineInstance || defaultEngine;
  
  const [manager, setManager] = useState<PipelineManager | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [status, setStatus] = useState<Record<string, ExecutionStatus>>({});
  
  const createPipeline = useCallback((id: string) => {
    if (!manager) throw new Error('Pipeline manager not initialized');
    
    const pipeline = manager.createPipeline(id);
    setPipelines(prev => [...prev, pipeline]);
    setStatus(prev => ({ ...prev, [id]: 'created' }));
    
    return pipeline;
  }, [manager]);
  
  const runPipeline = useCallback(async (pipeline: Pipeline) => {
    if (!manager) throw new Error('Pipeline manager not initialized');
    
    setStatus(prev => ({ ...prev, [pipeline.id]: 'running' }));
    
    try {
      const result = await manager.runPipeline(pipeline);
      setStatus(prev => ({ ...prev, [pipeline.id]: 'completed' }));
      return result;
    } catch (error) {
      setStatus(prev => ({ ...prev, [pipeline.id]: 'error' }));
      throw error;
    }
  }, [manager]);
  
  useEffect(() => {
    if (engine) {
      const managerInstance = new PipelineManager(engine);
      setManager(managerInstance);
    }
  }, [engine]);
  
  return { manager, createPipeline, runPipeline, pipelines, status };
}
```

### Phase 3: Context & Command Hooks (Week 3-4)
```typescript
// Complete hook ecosystem with context management and command registry
// Integration with existing CLI infrastructure
// Performance optimization and memory management
```

## Integration Points

### CLI Integration
```typescript
// packages/cli/src/hooks/useCLICore.ts - CLI-specific hook layer
export function useCLICore() {
  const executionSystem = useExecutionEngine();
  const pipelineSystem = usePipelineManager(executionSystem.engine);
  const contextSystem = useContextManager();
  const commandSystem = useCommandRegistry();
  
  return {
    ...executionSystem,
    ...pipelineSystem,
    ...contextSystem,
    ...commandSystem
  };
}
```

### API Layer Integration
```typescript
// packages/api/src/hooks/useAPICore.ts - API-specific adaptations
export function useAPICore() {
  const core = useCLICore();
  
  const executeRemotePipeline = useCallback(async (pipeline: Pipeline, endpoint: string) => {
    // Remote execution logic with local fallback
  }, [core]);
  
  return { ...core, executeRemotePipeline };
}
```

## Testing Strategy

### Unit Testing Requirements
```typescript
// tests/hooks/core/useExecutionEngine.test.ts
describe('useExecutionEngine', () => {
  it('should initialize engine with default config', async () => {
    const { result } = renderHook(() => useExecutionEngine());
    
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
      expect(result.current.engine).toBeDefined();
    });
  });
  
  it('should execute plans and track metrics', async () => {
    const { result } = renderHook(() => useExecutionEngine());
    
    await waitFor(() => expect(result.current.status).toBe('ready'));
    
    const mockPlan: ExecutionPlan = { /* test plan */ };
    const resultPromise = result.current.execute(mockPlan);
    
    expect(result.current.status).toBe('executing');
    
    const executionResult = await resultPromise;
    expect(executionResult).toBeDefined();
    expect(result.current.status).toBe('completed');
    expect(result.current.metrics.totalExecutions).toBe(1);
  });
});
```

### Performance Testing
```typescript
// Performance benchmark suite for hook operations
const benchmarkSuite = {
  hookInitialization: async () => {
    const startTime = performance.now();
    const { result } = renderHook(() => useExecutionEngine());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    return performance.now() - startTime;
  },
  
  contextSwitching: async () => {
    // Context switch performance tests
  },
  
  pipelineExecution: async () => {
    // Pipeline execution benchmarks
  }
};
```

## Success Criteria

### Functional Requirements
- [ ] All core packages successfully migrated to hook architecture
- [ ] 100% backward compatibility with existing API surface
- [ ] Complete TypeScript coverage with strict mode
- [ ] All existing tests pass with hook implementation

### Performance Requirements
- [ ] Hook initialization < 10ms
- [ ] Memory usage stays within 50MB baseline
- [ ] No performance regression vs. class-based implementation
- [ ] WASM integration maintains sub-millisecond call overhead

### Quality Requirements
- [ ] Zero ESLint/Biome violations
- [ ] 100% test coverage for all hooks
- [ ] Comprehensive documentation for all public APIs
- [ ] Performance monitoring and metrics collection

## Migration Timeline

**Week 1-2**: Core execution engine hook implementation and testing
**Week 3-4**: Pipeline and context management hooks
**Week 5-6**: Command registry hooks and CLI integration
**Week 7-8**: Performance optimization and comprehensive testing
**Week 9-10**: Documentation, examples, and migration guides

## Risk Mitigation

### Technical Risks
- **State Management Complexity**: Implement state persistence layer
- **Memory Leaks**: Comprehensive cleanup in useEffect returns
- **Performance Regression**: Continuous benchmarking during development

### Migration Risks
- **Breaking Changes**: Maintain compatibility layer during transition
- **Learning Curve**: Extensive documentation and examples
- **Testing Gaps**: Implement parallel testing with both architectures

## Next Steps

1. **PRD-002**: WASM Runtime Integration & Performance Optimization
2. **PRD-003**: AI/ML Package Migration with Hook Architecture
3. **PRD-004**: Build System Integration & Development Workflow
4. **PRD-005**: UI/UX Package Migration & Design System Hooks