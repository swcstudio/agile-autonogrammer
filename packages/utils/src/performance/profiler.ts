/**
 * Advanced Performance Profiler
 * Comprehensive performance monitoring and profiling
 */

import { EventEmitter } from 'events';

export interface ProfilerOptions {
  enabled?: boolean;
  sampleRate?: number;
  maxSamples?: number;
  autoReport?: boolean;
  reportInterval?: number;
  enableMemoryProfiling?: boolean;
  enableCPUProfiling?: boolean;
  enableNetworkProfiling?: boolean;
  enableRenderProfiling?: boolean;
}

export interface PerformanceMark {
  name: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMeasure {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface CPUSnapshot {
  timestamp: number;
  usage: number;
  idle: number;
  cores: number;
}

export interface NetworkSnapshot {
  timestamp: number;
  requests: number;
  bytesReceived: number;
  bytesSent: number;
  latency: number;
}

export interface RenderSnapshot {
  timestamp: number;
  fps: number;
  frameTime: number;
  paintTime: number;
  layoutTime: number;
}

export interface ProfileReport {
  startTime: number;
  endTime: number;
  duration: number;
  marks: PerformanceMark[];
  measures: PerformanceMeasure[];
  memory?: MemorySnapshot[];
  cpu?: CPUSnapshot[];
  network?: NetworkSnapshot[];
  render?: RenderSnapshot[];
  slowFunctions: Array<{
    name: string;
    duration: number;
    calls: number;
    averageDuration: number;
  }>;
  recommendations: string[];
}

export class Profiler extends EventEmitter {
  private options: Required<ProfilerOptions>;
  private marks: Map<string, PerformanceMark> = new Map();
  private measures: Map<string, PerformanceMeasure[]> = new Map();
  private memorySnapshots: MemorySnapshot[] = [];
  private cpuSnapshots: CPUSnapshot[] = [];
  private networkSnapshots: NetworkSnapshot[] = [];
  private renderSnapshots: RenderSnapshot[] = [];
  private functionTimings: Map<string, { total: number; count: number }> = new Map();
  private startTime: number = 0;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private rafId?: number;
  private observerCallbacks: Map<string, Function> = new Map();

  constructor(options: ProfilerOptions = {}) {
    super();
    
    this.options = {
      enabled: options.enabled ?? true,
      sampleRate: options.sampleRate ?? 100, // ms
      maxSamples: options.maxSamples ?? 10000,
      autoReport: options.autoReport ?? false,
      reportInterval: options.reportInterval ?? 60000, // 1 minute
      enableMemoryProfiling: options.enableMemoryProfiling ?? true,
      enableCPUProfiling: options.enableCPUProfiling ?? true,
      enableNetworkProfiling: options.enableNetworkProfiling ?? true,
      enableRenderProfiling: options.enableRenderProfiling ?? true
    };

    if (this.options.enabled) {
      this.start();
    }
  }

  /**
   * Start profiling
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = performance.now();
    
    // Setup performance observer
    this.setupPerformanceObserver();
    
    // Start sampling
    this.startSampling();
    
    // Setup auto-reporting
    if (this.options.autoReport) {
      this.intervalId = setInterval(() => {
        this.report();
      }, this.options.reportInterval);
    }
    
    this.emit('started');
  }

  /**
   * Stop profiling
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    
    this.emit('stopped');
  }

  /**
   * Mark a point in time
   */
  mark(name: string, metadata?: Record<string, any>): void {
    if (!this.options.enabled) return;
    
    const mark: PerformanceMark = {
      name,
      timestamp: performance.now(),
      metadata
    };
    
    this.marks.set(name, mark);
    performance.mark(name);
    
    this.emit('mark', mark);
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark?: string): PerformanceMeasure | null {
    if (!this.options.enabled) return null;
    
    const start = this.marks.get(startMark);
    if (!start) {
      console.warn(`Start mark "${startMark}" not found`);
      return null;
    }
    
    const end = endMark ? this.marks.get(endMark) : { timestamp: performance.now() };
    if (!end) {
      console.warn(`End mark "${endMark}" not found`);
      return null;
    }
    
    const measure: PerformanceMeasure = {
      name,
      startTime: start.timestamp,
      endTime: end.timestamp || performance.now(),
      duration: (end.timestamp || performance.now()) - start.timestamp,
      metadata: { ...start.metadata, ...(end as any).metadata }
    };
    
    if (!this.measures.has(name)) {
      this.measures.set(name, []);
    }
    this.measures.get(name)!.push(measure);
    
    try {
      performance.measure(name, startMark, endMark);
    } catch (e) {
      // Fallback for environments without performance.measure
    }
    
    this.emit('measure', measure);
    return measure;
  }

  /**
   * Profile a function
   */
  profile<T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): T {
    const fnName = name || fn.name || 'anonymous';
    
    return ((...args: Parameters<T>) => {
      const startMark = `${fnName}-start-${Date.now()}`;
      const endMark = `${fnName}-end-${Date.now()}`;
      
      this.mark(startMark);
      
      try {
        const result = fn(...args);
        
        if (result instanceof Promise) {
          return result.finally(() => {
            this.mark(endMark);
            const measure = this.measure(fnName, startMark, endMark);
            if (measure) {
              this.updateFunctionTiming(fnName, measure.duration);
            }
          });
        }
        
        this.mark(endMark);
        const measure = this.measure(fnName, startMark, endMark);
        if (measure) {
          this.updateFunctionTiming(fnName, measure.duration);
        }
        
        return result;
      } catch (error) {
        this.mark(endMark);
        this.measure(`${fnName}-error`, startMark, endMark);
        throw error;
      }
    }) as T;
  }

  /**
   * Profile an async function
   */
  async profileAsync<T>(
    fn: () => Promise<T>,
    name: string
  ): Promise<T> {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    this.mark(startMark);
    
    try {
      const result = await fn();
      this.mark(endMark);
      const measure = this.measure(name, startMark, endMark);
      if (measure) {
        this.updateFunctionTiming(name, measure.duration);
      }
      return result;
    } catch (error) {
      this.mark(`${name}-error`);
      this.measure(`${name}-error`, startMark);
      throw error;
    }
  }

  /**
   * Setup performance observer
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    
    try {
      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.emit('long-task', {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      
      // Observe layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.emit('layout-shift', {
            value: (entry as any).value,
            startTime: entry.startTime
          });
        }
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      
      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.emit('lcp', {
          renderTime: lastEntry.startTime,
          size: (lastEntry as any).size
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      
    } catch (e) {
      console.warn('Performance Observer not available:', e);
    }
  }

  /**
   * Start sampling performance metrics
   */
  private startSampling(): void {
    // Memory sampling
    if (this.options.enableMemoryProfiling) {
      this.sampleMemory();
    }
    
    // CPU sampling (simplified)
    if (this.options.enableCPUProfiling) {
      this.sampleCPU();
    }
    
    // Network sampling
    if (this.options.enableNetworkProfiling) {
      this.sampleNetwork();
    }
    
    // Render sampling
    if (this.options.enableRenderProfiling && typeof window !== 'undefined') {
      this.sampleRender();
    }
  }

  /**
   * Sample memory usage
   */
  private sampleMemory(): void {
    if (!this.isRunning) return;
    
    if ((performance as any).memory) {
      const snapshot: MemorySnapshot = {
        timestamp: performance.now(),
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
      
      this.memorySnapshots.push(snapshot);
      this.trimSnapshots(this.memorySnapshots);
      
      this.emit('memory-sample', snapshot);
    }
    
    if (this.isRunning) {
      setTimeout(() => this.sampleMemory(), this.options.sampleRate);
    }
  }

  /**
   * Sample CPU usage (simplified)
   */
  private sampleCPU(): void {
    if (!this.isRunning) return;
    
    const snapshot: CPUSnapshot = {
      timestamp: performance.now(),
      usage: Math.random() * 100, // Placeholder - would need actual CPU metrics
      idle: Math.random() * 100,
      cores: navigator.hardwareConcurrency || 1
    };
    
    this.cpuSnapshots.push(snapshot);
    this.trimSnapshots(this.cpuSnapshots);
    
    this.emit('cpu-sample', snapshot);
    
    if (this.isRunning) {
      setTimeout(() => this.sampleCPU(), this.options.sampleRate);
    }
  }

  /**
   * Sample network activity
   */
  private sampleNetwork(): void {
    if (!this.isRunning) return;
    
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    const resources = performance.getEntriesByType('resource');
    
    const snapshot: NetworkSnapshot = {
      timestamp: performance.now(),
      requests: resources.length,
      bytesReceived: resources.reduce((sum, r: any) => sum + (r.transferSize || 0), 0),
      bytesSent: 0, // Would need actual data
      latency: navigation?.responseStart - navigation?.fetchStart || 0
    };
    
    this.networkSnapshots.push(snapshot);
    this.trimSnapshots(this.networkSnapshots);
    
    this.emit('network-sample', snapshot);
    
    if (this.isRunning) {
      setTimeout(() => this.sampleNetwork(), this.options.sampleRate);
    }
  }

  /**
   * Sample render performance
   */
  private sampleRender(): void {
    if (!this.isRunning) return;
    
    let lastTime = performance.now();
    let frames = 0;
    let frameTime = 0;
    
    const measureFrame = () => {
      if (!this.isRunning) return;
      
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      
      frames++;
      frameTime += delta;
      
      if (frameTime >= 1000) { // Every second
        const fps = (frames * 1000) / frameTime;
        
        const snapshot: RenderSnapshot = {
          timestamp: currentTime,
          fps,
          frameTime: frameTime / frames,
          paintTime: 0, // Would need actual paint metrics
          layoutTime: 0 // Would need actual layout metrics
        };
        
        this.renderSnapshots.push(snapshot);
        this.trimSnapshots(this.renderSnapshots);
        
        this.emit('render-sample', snapshot);
        
        frames = 0;
        frameTime = 0;
      }
      
      lastTime = currentTime;
      this.rafId = requestAnimationFrame(measureFrame);
    };
    
    this.rafId = requestAnimationFrame(measureFrame);
  }

  /**
   * Update function timing statistics
   */
  private updateFunctionTiming(name: string, duration: number): void {
    const timing = this.functionTimings.get(name) || { total: 0, count: 0 };
    timing.total += duration;
    timing.count++;
    this.functionTimings.set(name, timing);
  }

  /**
   * Trim snapshots to max size
   */
  private trimSnapshots(snapshots: any[]): void {
    if (snapshots.length > this.options.maxSamples) {
      snapshots.splice(0, snapshots.length - this.options.maxSamples);
    }
  }

  /**
   * Generate performance report
   */
  report(): ProfileReport {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    // Analyze slow functions
    const slowFunctions = Array.from(this.functionTimings.entries())
      .map(([name, timing]) => ({
        name,
        duration: timing.total,
        calls: timing.count,
        averageDuration: timing.total / timing.count
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    const report: ProfileReport = {
      startTime: this.startTime,
      endTime,
      duration,
      marks: Array.from(this.marks.values()),
      measures: Array.from(this.measures.values()).flat(),
      memory: this.memorySnapshots,
      cpu: this.cpuSnapshots,
      network: this.networkSnapshots,
      render: this.renderSnapshots,
      slowFunctions,
      recommendations
    };
    
    this.emit('report', report);
    return report;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Memory recommendations
    if (this.memorySnapshots.length > 0) {
      const avgMemory = this.memorySnapshots.reduce((sum, s) => sum + s.usedJSHeapSize, 0) / this.memorySnapshots.length;
      const maxMemory = Math.max(...this.memorySnapshots.map(s => s.usedJSHeapSize));
      
      if (maxMemory > 100 * 1024 * 1024) { // > 100MB
        recommendations.push('High memory usage detected. Consider optimizing data structures and clearing unused references.');
      }
      
      if (maxMemory - avgMemory > 50 * 1024 * 1024) { // > 50MB variance
        recommendations.push('Memory usage is highly variable. Check for memory leaks.');
      }
    }
    
    // FPS recommendations
    if (this.renderSnapshots.length > 0) {
      const avgFPS = this.renderSnapshots.reduce((sum, s) => sum + s.fps, 0) / this.renderSnapshots.length;
      
      if (avgFPS < 30) {
        recommendations.push('Low FPS detected. Optimize rendering and reduce DOM manipulations.');
      } else if (avgFPS < 60) {
        recommendations.push('FPS below 60. Consider optimizing animations and complex calculations.');
      }
    }
    
    // Function timing recommendations
    const slowFunctions = Array.from(this.functionTimings.entries())
      .filter(([_, timing]) => timing.total / timing.count > 100);
    
    if (slowFunctions.length > 0) {
      recommendations.push(`${slowFunctions.length} slow functions detected. Consider optimizing or moving to Web Workers.`);
    }
    
    return recommendations;
  }

  /**
   * Clear all profiling data
   */
  clear(): void {
    this.marks.clear();
    this.measures.clear();
    this.memorySnapshots = [];
    this.cpuSnapshots = [];
    this.networkSnapshots = [];
    this.renderSnapshots = [];
    this.functionTimings.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Destroy the profiler
   */
  destroy(): void {
    this.stop();
    this.clear();
    this.removeAllListeners();
  }
}