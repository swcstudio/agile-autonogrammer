/**
 * Syscall Dispatcher - High-performance system call interface for AI-OSX
 * 
 * Provides efficient syscall handling between WebAssembly processes and the
 * Linux environment emulation layer with security filtering and performance monitoring.
 */

import { LinuxEnvironment, VirtualProcess, SYSCALLS, SyscallContext } from './LinuxEnvironment';
import { SecurityAIClient } from '@katalyst/security-ai';

export interface SyscallHook {
  name: string;
  priority: number;
  pre?: (ctx: SyscallContext) => Promise<SyscallHookResult>;
  post?: (ctx: SyscallContext, result: number) => Promise<void>;
}

export interface SyscallHookResult {
  action: 'continue' | 'abort' | 'modify';
  modifiedArgs?: number[];
  returnValue?: number;
  errno?: number;
}

export interface SyscallStats {
  syscallNumber: number;
  name: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  securityBlocks: number;
  lastCalled: number;
}

export interface DispatcherMetrics {
  totalSyscalls: number;
  syscallsPerSecond: number;
  averageDispatchTime: number;
  securityChecks: number;
  securityBlocks: number;
  hookExecutions: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface SyscallCache {
  enabled: boolean;
  maxEntries: number;
  cache: Map<string, CacheEntry>;
  hits: number;
  misses: number;
}

export interface CacheEntry {
  key: string;
  result: number;
  errno: number;
  timestamp: number;
  ttl: number;
}

export interface DispatcherConfig {
  enableSecurity: boolean;
  enableHooks: boolean;
  enableCaching: boolean;
  enableProfiling: boolean;
  maxCacheEntries: number;
  cacheDefaultTTL: number;
  securityTimeout: number;
  hookTimeout: number;
}

export class SyscallDispatcher {
  private linuxEnv: LinuxEnvironment;
  private securityClient: SecurityAIClient;
  private config: DispatcherConfig;
  private hooks: Map<number, SyscallHook[]>;
  private stats: Map<number, SyscallStats>;
  private metrics: DispatcherMetrics;
  private cache: SyscallCache;
  private syscallNames: Map<number, string>;
  private isInitialized: boolean;

  constructor(
    linuxEnv: LinuxEnvironment, 
    securityClient: SecurityAIClient,
    config: DispatcherConfig
  ) {
    this.linuxEnv = linuxEnv;
    this.securityClient = securityClient;
    this.config = config;
    this.hooks = new Map();
    this.stats = new Map();
    this.isInitialized = false;
    
    this.initializeMetrics();
    this.initializeCache();
    this.initializeSyscallNames();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize built-in hooks
    await this.initializeBuiltinHooks();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    this.isInitialized = true;
    console.log('🚀 Syscall Dispatcher initialized');
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalSyscalls: 0,
      syscallsPerSecond: 0,
      averageDispatchTime: 0,
      securityChecks: 0,
      securityBlocks: 0,
      hookExecutions: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  private initializeCache(): void {
    this.cache = {
      enabled: this.config.enableCaching,
      maxEntries: this.config.maxCacheEntries,
      cache: new Map(),
      hits: 0,
      misses: 0
    };
  }

  private initializeSyscallNames(): void {
    this.syscallNames = new Map([
      [SYSCALLS.SYS_READ, 'read'],
      [SYSCALLS.SYS_WRITE, 'write'],
      [SYSCALLS.SYS_OPEN, 'open'],
      [SYSCALLS.SYS_CLOSE, 'close'],
      [SYSCALLS.SYS_STAT, 'stat'],
      [SYSCALLS.SYS_FSTAT, 'fstat'],
      [SYSCALLS.SYS_LSTAT, 'lstat'],
      [SYSCALLS.SYS_FORK, 'fork'],
      [SYSCALLS.SYS_EXECVE, 'execve'],
      [SYSCALLS.SYS_EXIT, 'exit'],
      [SYSCALLS.SYS_WAIT4, 'wait4'],
      [SYSCALLS.SYS_KILL, 'kill'],
      [SYSCALLS.SYS_GETPID, 'getpid'],
      [SYSCALLS.SYS_GETPPID, 'getppid'],
      [SYSCALLS.SYS_BRK, 'brk'],
      [SYSCALLS.SYS_MMAP, 'mmap'],
      [SYSCALLS.SYS_MUNMAP, 'munmap'],
      [SYSCALLS.SYS_MPROTECT, 'mprotect'],
      [SYSCALLS.SYS_SOCKET, 'socket'],
      [SYSCALLS.SYS_CONNECT, 'connect'],
      [SYSCALLS.SYS_BIND, 'bind'],
      [SYSCALLS.SYS_LISTEN, 'listen'],
      [SYSCALLS.SYS_ACCEPT, 'accept'],
      [SYSCALLS.SYS_CLONE, 'clone'],
      [SYSCALLS.SYS_FUTEX, 'futex'],
      [SYSCALLS.SYS_TIME, 'time'],
      [SYSCALLS.SYS_GETTIMEOFDAY, 'gettimeofday'],
      [SYSCALLS.SYS_CLOCK_GETTIME, 'clock_gettime']
    ]);
  }

  private async initializeBuiltinHooks(): Promise<void> {
    // Security monitoring hook
    await this.registerHook({
      name: 'security-monitor',
      priority: 100,
      pre: this.securityPreHook.bind(this),
      post: this.securityPostHook.bind(this)
    });

    // Performance profiling hook
    if (this.config.enableProfiling) {
      await this.registerHook({
        name: 'performance-profiler',
        priority: 50,
        pre: this.profilingPreHook.bind(this),
        post: this.profilingPostHook.bind(this)
      });
    }

    // Audit logging hook
    await this.registerHook({
      name: 'audit-logger',
      priority: 25,
      post: this.auditPostHook.bind(this)
    });

    console.log('🔧 Built-in syscall hooks initialized');
  }

  public async dispatch(
    process: VirtualProcess,
    syscallNumber: number,
    args: number[]
  ): Promise<number> {
    const startTime = performance.now();
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.checkCache(process, syscallNumber, args);
        if (cached !== null) {
          this.metrics.cacheHits++;
          return cached.result;
        }
        this.metrics.cacheMisses++;
      }

      const context: SyscallContext = {
        process,
        syscallNumber,
        args: [...args], // Clone args to prevent modifications
        returnValue: 0,
        errno: 0,
        timestamp: Date.now()
      };

      // Execute pre-hooks
      if (this.config.enableHooks) {
        const hookResult = await this.executePreHooks(context);
        if (hookResult.action === 'abort') {
          return this.handleAbortedSyscall(context, hookResult);
        }
        if (hookResult.action === 'modify' && hookResult.modifiedArgs) {
          context.args = hookResult.modifiedArgs;
        }
      }

      // Execute the actual syscall
      const result = await this.linuxEnv.handleSyscall(
        context.process,
        context.syscallNumber,
        context.args
      );

      context.returnValue = result;

      // Execute post-hooks
      if (this.config.enableHooks) {
        await this.executePostHooks(context, result);
      }

      // Update cache if successful
      if (this.config.enableCaching && result >= 0 && this.isCacheable(syscallNumber)) {
        this.updateCache(process, syscallNumber, args, result, context.errno);
      }

      // Update statistics
      this.updateStats(syscallNumber, performance.now() - startTime, result >= 0);
      this.metrics.totalSyscalls++;

      return result;

    } catch (error) {
      console.error(`💥 Syscall dispatch error: ${error}`);
      this.updateStats(syscallNumber, performance.now() - startTime, false);
      return -1; // Return generic error
    }
  }

  private checkCache(
    process: VirtualProcess,
    syscallNumber: number,
    args: number[]
  ): CacheEntry | null {
    if (!this.cache.enabled || !this.isCacheable(syscallNumber)) {
      return null;
    }

    const key = this.generateCacheKey(process, syscallNumber, args);
    const entry = this.cache.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.cache.delete(key);
      return null;
    }

    return entry;
  }

  private updateCache(
    process: VirtualProcess,
    syscallNumber: number,
    args: number[],
    result: number,
    errno: number
  ): void {
    if (!this.cache.enabled || !this.isCacheable(syscallNumber)) {
      return;
    }

    // Evict old entries if cache is full
    if (this.cache.cache.size >= this.cache.maxEntries) {
      const oldestKey = this.cache.cache.keys().next().value;
      this.cache.cache.delete(oldestKey);
    }

    const key = this.generateCacheKey(process, syscallNumber, args);
    const entry: CacheEntry = {
      key,
      result,
      errno,
      timestamp: Date.now(),
      ttl: this.getCacheTTL(syscallNumber)
    };

    this.cache.cache.set(key, entry);
  }

  private isCacheable(syscallNumber: number): boolean {
    // Only cache read-only syscalls or syscalls with deterministic results
    const cacheableSyscalls = [
      SYSCALLS.SYS_STAT,
      SYSCALLS.SYS_FSTAT,
      SYSCALLS.SYS_LSTAT,
      SYSCALLS.SYS_GETPID,
      SYSCALLS.SYS_GETPPID,
      SYSCALLS.SYS_TIME
    ];
    
    return cacheableSyscalls.includes(syscallNumber);
  }

  private generateCacheKey(
    process: VirtualProcess,
    syscallNumber: number,
    args: number[]
  ): string {
    // Generate a unique cache key
    return `${process.pid}-${syscallNumber}-${args.join('-')}`;
  }

  private getCacheTTL(syscallNumber: number): number {
    // Different TTLs for different syscalls
    switch (syscallNumber) {
      case SYSCALLS.SYS_STAT:
      case SYSCALLS.SYS_FSTAT:
      case SYSCALLS.SYS_LSTAT:
        return 5000; // 5 seconds for file stats
      case SYSCALLS.SYS_TIME:
        return 1000; // 1 second for time
      default:
        return this.config.cacheDefaultTTL;
    }
  }

  private async executePreHooks(context: SyscallContext): Promise<SyscallHookResult> {
    const hooks = this.hooks.get(context.syscallNumber) || [];
    let finalResult: SyscallHookResult = { action: 'continue' };
    
    // Execute hooks in priority order (highest first)
    const sortedHooks = [...hooks].sort((a, b) => b.priority - a.priority);
    
    for (const hook of sortedHooks) {
      if (!hook.pre) continue;
      
      try {
        const hookPromise = hook.pre(context);
        const timeoutPromise = new Promise<SyscallHookResult>((_, reject) => {
          setTimeout(() => reject(new Error('Hook timeout')), this.config.hookTimeout);
        });
        
        const result = await Promise.race([hookPromise, timeoutPromise]);
        
        this.metrics.hookExecutions++;
        
        if (result.action === 'abort') {
          console.log(`🚫 Syscall aborted by hook: ${hook.name}`);
          return result;
        }
        
        if (result.action === 'modify') {
          finalResult = result;
          context.args = result.modifiedArgs || context.args;
        }
        
      } catch (error) {
        console.warn(`⚠️ Hook ${hook.name} failed:`, error);
        // Continue execution on hook failure unless it's a security hook
        if (hook.name.includes('security')) {
          return { action: 'abort', returnValue: -1, errno: 1 };
        }
      }
    }
    
    return finalResult;
  }

  private async executePostHooks(context: SyscallContext, result: number): Promise<void> {
    const hooks = this.hooks.get(context.syscallNumber) || [];
    
    for (const hook of hooks) {
      if (!hook.post) continue;
      
      try {
        const hookPromise = hook.post(context, result);
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Hook timeout')), this.config.hookTimeout);
        });
        
        await Promise.race([hookPromise, timeoutPromise]);
        this.metrics.hookExecutions++;
        
      } catch (error) {
        console.warn(`⚠️ Post-hook ${hook.name} failed:`, error);
        // Post-hooks failing shouldn't affect the syscall result
      }
    }
  }

  private handleAbortedSyscall(
    context: SyscallContext, 
    hookResult: SyscallHookResult
  ): number {
    context.returnValue = hookResult.returnValue || -1;
    context.errno = hookResult.errno || 1;
    
    this.updateStats(context.syscallNumber, 0, false);
    
    return context.returnValue;
  }

  // Built-in hook implementations
  private async securityPreHook(context: SyscallContext): Promise<SyscallHookResult> {
    if (!this.config.enableSecurity) {
      return { action: 'continue' };
    }

    try {
      const securityPromise = this.securityClient.scanSystemCall({
        syscallNumber: context.syscallNumber,
        processId: context.process.pid,
        args: context.args,
        process: {
          command: context.process.command,
          uid: context.process.uid,
          gid: context.process.gid
        }
      });
      
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error('Security check timeout')), this.config.securityTimeout);
      });

      const scanResult = await Promise.race([securityPromise, timeoutPromise]);
      this.metrics.securityChecks++;

      if (scanResult.severity === 'high' || scanResult.severity === 'critical') {
        this.metrics.securityBlocks++;
        console.warn(`🔒 Security violation detected: ${scanResult.description}`);
        return { 
          action: 'abort', 
          returnValue: -1, 
          errno: 1 // EPERM
        };
      }

      return { action: 'continue' };

    } catch (error) {
      console.warn('⚠️ Security check failed:', error);
      // In strict mode, block on security check failure
      if (this.config.enableSecurity) {
        return { 
          action: 'abort', 
          returnValue: -1, 
          errno: 1 
        };
      }
      return { action: 'continue' };
    }
  }

  private async securityPostHook(context: SyscallContext, result: number): Promise<void> {
    // Log security-relevant syscalls
    const securityRelevant = [
      SYSCALLS.SYS_EXECVE,
      SYSCALLS.SYS_FORK,
      SYSCALLS.SYS_CLONE,
      SYSCALLS.SYS_KILL,
      SYSCALLS.SYS_MMAP,
      SYSCALLS.SYS_MPROTECT
    ];

    if (securityRelevant.includes(context.syscallNumber)) {
      console.log(`🔒 Security-relevant syscall: ${this.getSyscallName(context.syscallNumber)} by PID ${context.process.pid}, result: ${result}`);
    }
  }

  private async profilingPreHook(context: SyscallContext): Promise<SyscallHookResult> {
    // Store start time in context for post-hook profiling
    (context as any)._startTime = performance.now();
    return { action: 'continue' };
  }

  private async profilingPostHook(context: SyscallContext, result: number): Promise<void> {
    const startTime = (context as any)._startTime;
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`📊 ${this.getSyscallName(context.syscallNumber)} took ${duration.toFixed(2)}ms`);
    }
  }

  private async auditPostHook(context: SyscallContext, result: number): Promise<void> {
    // Audit log entry (simplified)
    const logEntry = {
      timestamp: context.timestamp,
      pid: context.process.pid,
      syscall: this.getSyscallName(context.syscallNumber),
      args: context.args,
      result,
      errno: context.errno
    };
    
    console.log(`📝 Audit: ${JSON.stringify(logEntry)}`);
  }

  private updateStats(syscallNumber: number, duration: number, success: boolean): void {
    let stats = this.stats.get(syscallNumber);
    
    if (!stats) {
      stats = {
        syscallNumber,
        name: this.getSyscallName(syscallNumber),
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        securityBlocks: 0,
        lastCalled: 0
      };
      this.stats.set(syscallNumber, stats);
    }
    
    stats.totalCalls++;
    stats.lastCalled = Date.now();
    
    if (success) {
      stats.successfulCalls++;
    } else {
      stats.failedCalls++;
    }
    
    stats.totalTime += duration;
    stats.averageTime = stats.totalTime / stats.totalCalls;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
  }

  private updatePerformanceMetrics(): void {
    // Calculate syscalls per second
    const now = Date.now();
    const recentSyscalls = Array.from(this.stats.values())
      .filter(s => now - s.lastCalled < 1000)
      .reduce((total, s) => total + s.totalCalls, 0);
    
    this.metrics.syscallsPerSecond = recentSyscalls;
    
    // Calculate average dispatch time
    const totalTime = Array.from(this.stats.values())
      .reduce((total, s) => total + s.totalTime, 0);
    
    this.metrics.averageDispatchTime = this.metrics.totalSyscalls > 0 
      ? totalTime / this.metrics.totalSyscalls 
      : 0;
  }

  // Public API methods
  public async registerHook(hook: SyscallHook): Promise<void> {
    // Register hook for all syscalls if no specific syscall number
    const syscallNumbers = Object.values(SYSCALLS);
    
    for (const syscallNumber of syscallNumbers) {
      if (!this.hooks.has(syscallNumber)) {
        this.hooks.set(syscallNumber, []);
      }
      
      const hooks = this.hooks.get(syscallNumber)!;
      hooks.push(hook);
      hooks.sort((a, b) => b.priority - a.priority);
    }
    
    console.log(`🔌 Registered hook: ${hook.name} with priority ${hook.priority}`);
  }

  public unregisterHook(hookName: string): void {
    for (const [syscallNumber, hooks] of this.hooks) {
      const index = hooks.findIndex(h => h.name === hookName);
      if (index !== -1) {
        hooks.splice(index, 1);
      }
    }
    
    console.log(`🔌 Unregistered hook: ${hookName}`);
  }

  public getStats(): Map<number, SyscallStats> {
    return new Map(this.stats);
  }

  public getMetrics(): DispatcherMetrics {
    return { ...this.metrics };
  }

  public getCacheStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.cache.hits,
      misses: this.cache.misses,
      size: this.cache.cache.size
    };
  }

  public clearCache(): void {
    this.cache.cache.clear();
    this.cache.hits = 0;
    this.cache.misses = 0;
    console.log('🧹 Syscall cache cleared');
  }

  public getSyscallName(syscallNumber: number): string {
    return this.syscallNames.get(syscallNumber) || `syscall_${syscallNumber}`;
  }

  public getTopSyscalls(limit: number = 10): SyscallStats[] {
    return Array.from(this.stats.values())
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, limit);
  }

  public getSlowestSyscalls(limit: number = 10): SyscallStats[] {
    return Array.from(this.stats.values())
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }

  public updateConfig(newConfig: Partial<DispatcherConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (!this.config.enableCaching) {
      this.clearCache();
    }
    
    console.log('⚙️ Dispatcher configuration updated');
  }

  public exportMetrics(): any {
    return {
      metrics: this.metrics,
      stats: Object.fromEntries(this.stats),
      cache: {
        hits: this.cache.hits,
        misses: this.cache.misses,
        size: this.cache.cache.size,
        enabled: this.cache.enabled
      },
      config: this.config
    };
  }
}

export default SyscallDispatcher;