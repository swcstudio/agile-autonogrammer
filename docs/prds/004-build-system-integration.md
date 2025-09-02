# PRD-004: Build System Integration & Development Workflow

## Executive Summary

**Objective**: Integrate Katalyst's advanced build system with Agile-Programmers, combining Biome code quality tooling, Deno runtime capabilities, Turbo monorepo architecture, and comprehensive WASM build pipeline for optimal developer experience.

**Success Metrics**:
- Build times reduced by 70% through intelligent caching
- Code quality scores improved with automated Biome integration
- WASM modules compile and deploy automatically
- Zero-configuration development environment setup

## Build System Architecture

### Core Build Components
```
biome.json              - Code formatting, linting, analysis (Biome 1.9.4)
deno.json              - Deno runtime configuration with WASM tasks
scripts/               - Build automation and deployment scripts
packages/build-system/ - Build system package
turbo.json            - Turbo monorepo configuration (to be created)
```

### Current Build Infrastructure Analysis

**Biome Configuration** (`biome.json`):
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": { 
    "enabled": true, 
    "rules": { "recommended": true, "style": { "useImportType": "error" } }
  },
  "formatter": { 
    "enabled": true, 
    "indentWidth": 2, 
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  }
}
```

**Deno Configuration** (`deno.json`):
```json
{
  "tasks": {
    "build": "turbo run build",
    "build:wasm": "deno run --allow-all ./scripts/build-wasm-modules.ts",
    "build:deno": "deno run --allow-all ./scripts/build-deno-wasm.ts",
    "dev": "turbo run dev",
    "dev:wasm": "deno run --allow-all --watch ./scripts/dev-wasm-server.ts",
    "deploy:vercel": "deno run --allow-all ./scripts/deploy-vercel.ts"
  },
  "imports": {
    "@katalyst/core": "./packages/core/mod.ts",
    "@katalyst/wasm-runtime": "./wasm-modules/dist/"
  }
}
```

## Hook-Based Build System

### Core Build Hook
```typescript
// packages/hooks/src/build/useBuildSystem.ts
export interface BuildSystemHook {
  // Build Management
  buildStatus: BuildStatus;
  buildLogs: BuildLog[];
  buildMetrics: BuildMetrics;
  
  // Build Operations
  buildAll: (config?: BuildConfig) => Promise<BuildResult>;
  buildPackage: (packageName: string, config?: PackageBuildConfig) => Promise<PackageBuildResult>;
  buildWasm: (config?: WasmBuildConfig) => Promise<WasmBuildResult>;
  
  // Development Tools
  startDevServer: (config?: DevServerConfig) => Promise<DevServer>;
  watchMode: boolean;
  toggleWatch: () => void;
  
  // Code Quality
  runLinter: (files?: string[]) => Promise<LintResult>;
  runFormatter: (files?: string[]) => Promise<FormatResult>;
  runTypecheck: (packages?: string[]) => Promise<TypecheckResult>;
  
  // Deployment
  deployToVercel: (config?: VercelDeployConfig) => Promise<DeploymentResult>;
  deployToEdge: (packages: string[], config?: EdgeDeployConfig) => Promise<EdgeDeployResult>;
  
  // Cache Management
  cacheStats: CacheStats;
  clearCache: (scope?: CacheScope) => Promise<void>;
  warmCache: (packages?: string[]) => Promise<void>;
}

export function useBuildSystem(config?: BuildSystemConfig): BuildSystemHook {
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle');
  const [buildLogs, setBuildLogs] = useState<BuildLog[]>([]);
  const [buildMetrics, setBuildMetrics] = useState<BuildMetrics>({});
  const [watchMode, setWatchMode] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats>({});
  
  // WASM build integration
  const wasmBuild = useWasmBuild();
  
  const buildAll = useCallback(async (buildConfig?: BuildConfig): Promise<BuildResult> => {
    setBuildStatus('building');
    setBuildLogs([]);
    
    const startTime = performance.now();
    
    try {
      // Phase 1: Code Quality Checks
      addBuildLog('info', 'Starting code quality checks...');
      const lintResult = await runLinter();
      const typeResult = await runTypecheck();
      
      if (lintResult.errorCount > 0 && !buildConfig?.skipLinting) {
        throw new BuildError('Linting failed', lintResult.errors);
      }
      
      if (typeResult.errorCount > 0 && !buildConfig?.skipTypecheck) {
        throw new BuildError('Type checking failed', typeResult.errors);
      }
      
      // Phase 2: Build Packages
      addBuildLog('info', 'Building packages...');
      const packageResults = await buildPackagesInParallel(buildConfig?.packages);
      
      // Phase 3: Build WASM Modules
      if (buildConfig?.includeWasm !== false) {
        addBuildLog('info', 'Building WASM modules...');
        const wasmResult = await wasmBuild.buildAllRuntimes({
          optimization: buildConfig?.wasmOptimization || 'release'
        });
      }
      
      // Phase 4: Bundle and Optimize
      addBuildLog('info', 'Bundling and optimizing...');
      const bundleResult = await createOptimizedBundles(packageResults);
      
      const duration = performance.now() - startTime;
      
      setBuildMetrics({
        totalBuildTime: duration,
        packageCount: packageResults.length,
        wasmModuleCount: wasmResult?.artifacts.length || 0,
        bundleSize: bundleResult.totalSize,
        cacheHitRate: calculateCacheHitRate()
      });
      
      setBuildStatus('success');
      addBuildLog('success', `Build completed in ${duration.toFixed(2)}ms`);
      
      return {
        status: 'success',
        duration,
        packages: packageResults,
        wasm: wasmResult,
        bundles: bundleResult
      };
      
    } catch (error) {
      setBuildStatus('error');
      addBuildLog('error', `Build failed: ${error.message}`);
      throw error;
    }
  }, [wasmBuild]);
  
  const runLinter = useCallback(async (files?: string[]): Promise<LintResult> => {
    addBuildLog('info', 'Running Biome linter...');
    
    const biomeCommand = [
      'biome', 'check',
      '--apply-unsafe', // Auto-fix when possible
      '--reporter=json'
    ];
    
    if (files?.length) {
      biomeCommand.push(...files);
    } else {
      biomeCommand.push('packages/**/*.{ts,tsx,js,jsx}');
    }
    
    try {
      const result = await executeCommand(biomeCommand.join(' '));
      const biomeResult = JSON.parse(result.stdout);
      
      return {
        errorCount: biomeResult.diagnostics?.filter(d => d.severity === 'error').length || 0,
        warningCount: biomeResult.diagnostics?.filter(d => d.severity === 'warning').length || 0,
        fixedCount: biomeResult.fixed || 0,
        errors: biomeResult.diagnostics || []
      };
    } catch (error) {
      addBuildLog('error', `Linter failed: ${error.message}`);
      throw error;
    }
  }, []);
  
  const runFormatter = useCallback(async (files?: string[]): Promise<FormatResult> => {
    addBuildLog('info', 'Running Biome formatter...');
    
    const formatCommand = [
      'biome', 'format',
      '--write',
      files?.join(' ') || 'packages/**/*.{ts,tsx,js,jsx,json}'
    ];
    
    try {
      const result = await executeCommand(formatCommand.join(' '));
      
      return {
        formattedFiles: result.formattedFiles || 0,
        skippedFiles: result.skippedFiles || 0
      };
    } catch (error) {
      addBuildLog('error', `Formatter failed: ${error.message}`);
      throw error;
    }
  }, []);
  
  const startDevServer = useCallback(async (devConfig?: DevServerConfig): Promise<DevServer> => {
    addBuildLog('info', 'Starting development server...');
    
    const server = new DevServer({
      port: devConfig?.port || 3000,
      hot: devConfig?.hot !== false,
      wasm: devConfig?.wasm !== false
    });
    
    // Set up file watchers
    const watcher = new FileWatcher({
      patterns: ['packages/**/*.{ts,tsx}', 'wasm-modules/**/*.rs'],
      onChange: async (changedFiles) => {
        addBuildLog('info', `Files changed: ${changedFiles.join(', ')}`);
        
        if (changedFiles.some(f => f.endsWith('.rs'))) {
          await wasmBuild.buildIndividual('rust', { optimization: 'debug' });
        }
        
        await server.reload();
      }
    });
    
    setWatchMode(true);
    
    await server.start();
    watcher.start();
    
    return server;
  }, [wasmBuild]);
  
  const addBuildLog = useCallback((level: LogLevel, message: string) => {
    setBuildLogs(prev => [...prev, {
      timestamp: new Date(),
      level,
      message
    }]);
  }, []);
  
  return {
    buildStatus,
    buildLogs,
    buildMetrics,
    buildAll,
    buildPackage: async (packageName, config) => { /* implementation */ },
    buildWasm: wasmBuild.buildAllRuntimes,
    startDevServer,
    watchMode,
    toggleWatch: () => setWatchMode(!watchMode),
    runLinter,
    runFormatter,
    runTypecheck: async (packages) => { /* implementation */ },
    deployToVercel: async (config) => { /* implementation */ },
    deployToEdge: async (packages, config) => { /* implementation */ },
    cacheStats,
    clearCache: async (scope) => { /* implementation */ },
    warmCache: async (packages) => { /* implementation */ }
  };
}
```

### Turbo Monorepo Integration
```typescript
// packages/hooks/src/build/useTurbo.ts
export function useTurbo(): TurboHook {
  const [turboConfig, setTurboConfig] = useState<TurboConfig | null>(null);
  const [cacheStats, setCacheStats] = useState<TurboCacheStats>({});
  
  useEffect(() => {
    // Load or create turbo.json configuration
    const loadTurboConfig = async () => {
      const config = await loadTurboConfiguration();
      setTurboConfig(config);
    };
    
    loadTurboConfig();
  }, []);
  
  const runTurboCommand = useCallback(async (
    command: string, 
    options?: TurboOptions
  ): Promise<TurboResult> => {
    const turboCommand = [
      'turbo',
      command,
      options?.scope && `--scope=${options.scope}`,
      options?.cache !== false && '--cache-dir=node_modules/.cache/turbo',
      options?.parallel && `--parallel=${options.parallel}`
    ].filter(Boolean).join(' ');
    
    const result = await executeCommand(turboCommand);
    
    // Update cache statistics
    if (result.cacheHits) {
      setCacheStats(prev => ({
        ...prev,
        totalCacheHits: (prev.totalCacheHits || 0) + result.cacheHits,
        cacheHitRate: calculateCacheHitRate(prev, result)
      }));
    }
    
    return result;
  }, []);
  
  return {
    turboConfig,
    cacheStats,
    runCommand: runTurboCommand,
    build: (scope?: string) => runTurboCommand('build', { scope }),
    dev: (scope?: string) => runTurboCommand('dev', { scope }),
    test: (scope?: string) => runTurboCommand('test', { scope }),
    lint: (scope?: string) => runTurboCommand('lint', { scope }),
    clean: () => runTurboCommand('clean')
  };
}
```

## Automated Build Pipeline

### CI/CD Integration Hook
```typescript
// packages/hooks/src/build/useCICD.ts
export function useCICD(): CICDHook {
  const buildSystem = useBuildSystem();
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle');
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  
  const runFullPipeline = useCallback(async (config: PipelineConfig) => {
    setPipelineStatus('running');
    
    try {
      // Stage 1: Code Quality & Security
      const qualityResult = await runQualityChecks(config.quality);
      if (!qualityResult.passed) {
        throw new PipelineError('Quality checks failed', qualityResult);
      }
      
      // Stage 2: Build
      const buildResult = await buildSystem.buildAll(config.build);
      
      // Stage 3: Test
      const testResult = await runTestSuite(config.test);
      if (!testResult.passed) {
        throw new PipelineError('Tests failed', testResult);
      }
      
      // Stage 4: Deploy
      if (config.deploy) {
        const deployResult = await deployArtifacts(buildResult, config.deploy);
        setDeployments(prev => [...prev, deployResult]);
      }
      
      setPipelineStatus('success');
      
    } catch (error) {
      setPipelineStatus('failed');
      throw error;
    }
  }, [buildSystem]);
  
  return {
    pipelineStatus,
    deployments,
    runFullPipeline,
    runQualityChecks: async (config) => { /* implementation */ },
    runTestSuite: async (config) => { /* implementation */ },
    deployArtifacts: async (artifacts, config) => { /* implementation */ }
  };
}
```

### Development Environment Hook
```typescript
// packages/hooks/src/build/useDevEnvironment.ts
export function useDevEnvironment(): DevEnvironmentHook {
  const [environment, setEnvironment] = useState<Environment>('development');
  const [services, setServices] = useState<Service[]>([]);
  const [environmentHealth, setEnvironmentHealth] = useState<HealthStatus>('unknown');
  
  const setupEnvironment = useCallback(async (config: EnvironmentConfig) => {
    // Install dependencies
    await installDependencies(config.dependencies);
    
    // Setup WASM toolchain
    await setupWasmToolchain();
    
    // Configure development tools
    await configureDevelopmentTools(config.tools);
    
    // Start required services
    const startedServices = await startServices(config.services);
    setServices(startedServices);
    
    // Verify environment health
    const health = await checkEnvironmentHealth();
    setEnvironmentHealth(health);
    
    if (health === 'healthy') {
      console.log('🚀 Development environment ready!');
    } else {
      console.warn('⚠️ Development environment has issues');
    }
  }, []);
  
  const checkHealth = useCallback(async (): Promise<HealthCheck> => {
    const checks = [
      { name: 'Node.js', check: () => checkNodeVersion() },
      { name: 'Deno', check: () => checkDenoInstallation() },
      { name: 'Rust', check: () => checkRustToolchain() },
      { name: 'Biome', check: () => checkBiomeInstallation() },
      { name: 'WASM', check: () => checkWasmTools() }
    ];
    
    const results = await Promise.all(
      checks.map(async ({ name, check }) => ({
        name,
        status: await check()
      }))
    );
    
    return {
      overall: results.every(r => r.status === 'ok') ? 'healthy' : 'unhealthy',
      checks: results
    };
  }, []);
  
  return {
    environment,
    services,
    environmentHealth,
    setupEnvironment,
    checkHealth,
    restartService: async (serviceName: string) => { /* implementation */ },
    getServiceLogs: (serviceName: string) => { /* implementation */ }
  };
}
```

## Performance Optimization

### Build Cache System
```typescript
// Intelligent caching system for builds
export interface BuildCacheSystem {
  // Cache Management
  getCacheKey: (inputs: BuildInputs) => string;
  isCacheValid: (key: string) => Promise<boolean>;
  getCachedResult: <T>(key: string) => Promise<T | null>;
  setCachedResult: <T>(key: string, result: T) => Promise<void>;
  
  // Cache Analytics
  getCacheStats: () => CacheStats;
  optimizeCache: () => Promise<void>;
  clearExpiredCache: () => Promise<void>;
}

class BuildCacheImpl implements BuildCacheSystem {
  private cache = new Map<string, CacheEntry>();
  
  getCacheKey(inputs: BuildInputs): string {
    const hasher = crypto.createHash('sha256');
    hasher.update(JSON.stringify(inputs));
    return hasher.digest('hex');
  }
  
  async isCacheValid(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if any input files have changed
    for (const file of entry.inputFiles) {
      const stat = await fs.stat(file);
      if (stat.mtime > entry.createdAt) {
        return false;
      }
    }
    
    return true;
  }
  
  // Additional implementation...
}
```

### Build Performance Monitoring
```typescript
// packages/hooks/src/build/useBuildMetrics.ts
export function useBuildMetrics(): BuildMetricsHook {
  const [metrics, setMetrics] = useState<BuildMetrics>({});
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceEntry[]>([]);
  
  const trackBuildPerformance = useCallback((buildResult: BuildResult) => {
    const entry: PerformanceEntry = {
      timestamp: new Date(),
      duration: buildResult.duration,
      packageCount: buildResult.packages.length,
      wasmModules: buildResult.wasm?.artifacts.length || 0,
      cacheHitRate: buildResult.cacheHitRate,
      bundleSize: buildResult.bundles.totalSize
    };
    
    setPerformanceHistory(prev => [...prev.slice(-99), entry]); // Keep last 100 builds
    
    // Calculate performance trends
    const avgDuration = calculateAverage(performanceHistory.map(e => e.duration));
    const trend = calculateTrend(performanceHistory, 'duration');
    
    setMetrics({
      averageBuildTime: avgDuration,
      buildTimesTrend: trend,
      cacheEfficiency: calculateAverage(performanceHistory.map(e => e.cacheHitRate)),
      bundleSizeGrowth: calculateTrend(performanceHistory, 'bundleSize')
    });
  }, [performanceHistory]);
  
  const generatePerformanceReport = useCallback((): PerformanceReport => {
    return {
      summary: {
        averageBuildTime: metrics.averageBuildTime,
        cacheHitRate: metrics.cacheEfficiency,
        trendsOverTime: {
          buildTime: metrics.buildTimesTrend,
          bundleSize: metrics.bundleSizeGrowth
        }
      },
      recommendations: generatePerformanceRecommendations(metrics),
      history: performanceHistory.slice(-30) // Last 30 builds
    };
  }, [metrics, performanceHistory]);
  
  return {
    metrics,
    trackBuildPerformance,
    generatePerformanceReport
  };
}
```

## Testing Strategy

### Build System Testing
```typescript
// tests/build/buildSystem.test.ts
describe('Build System Integration', () => {
  let buildSystem: BuildSystemHook;
  
  beforeEach(() => {
    const { result } = renderHook(() => useBuildSystem());
    buildSystem = result.current;
  });
  
  it('should complete full build successfully', async () => {
    const result = await buildSystem.buildAll({
      packages: ['core', 'utils', 'hooks'],
      includeWasm: true,
      skipLinting: false
    });
    
    expect(result.status).toBe('success');
    expect(result.packages).toHaveLength(3);
    expect(result.wasm.artifacts).toHaveLength(3);
  });
  
  it('should use build cache effectively', async () => {
    // First build
    await buildSystem.buildAll();
    
    // Second build should be faster due to caching
    const startTime = performance.now();
    await buildSystem.buildAll();
    const duration = performance.now() - startTime;
    
    expect(buildSystem.buildMetrics.cacheHitRate).toBeGreaterThan(0.5);
    expect(duration).toBeLessThan(5000); // Under 5 seconds with cache
  });
  
  it('should handle linting failures gracefully', async () => {
    // Create file with linting errors
    await createTestFileWithLintErrors();
    
    await expect(
      buildSystem.buildAll({ skipLinting: false })
    ).rejects.toThrow('Linting failed');
  });
});
```

## Success Criteria

### Performance Requirements
- [ ] Build time reduction of 70% through intelligent caching
- [ ] Hot reload time <2 seconds for code changes
- [ ] WASM compilation time <30 seconds for full rebuild
- [ ] Cache hit rate >80% for incremental builds

### Developer Experience
- [ ] Zero-configuration setup for new developers  
- [ ] Automatic code formatting on save
- [ ] Real-time error reporting and quick fixes
- [ ] Integrated debugging support for all runtimes

### Quality Assurance
- [ ] Automated code quality checks block bad commits
- [ ] 100% TypeScript coverage with strict mode
- [ ] Zero Biome violations in production builds
- [ ] Automated security scanning for dependencies

## Implementation Timeline

**Week 1-2**: Core build system hook implementation and Turbo integration
**Week 3-4**: Biome integration and code quality automation
**Week 5-6**: Development environment and hot reload system
**Week 7-8**: CI/CD pipeline and deployment automation
**Week 9-10**: Performance optimization and monitoring dashboard

## Next Steps

1. **PRD-005**: UI/UX Package Migration & Design System Hooks
2. **PRD-006**: Developer Tooling & Testing Infrastructure  
3. **PRD-007**: Deployment & Edge Computing Strategy