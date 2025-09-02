/**
 * Process Scheduler - Advanced scheduling system for AI-OSX
 * 
 * Implements multiple scheduling algorithms optimized for WebAssembly workloads,
 * AI processing tasks, and interactive development environments.
 */

import { VirtualProcess, VirtualThread } from './LinuxEnvironment';
import { WasmInstance } from './WasmRuntimeManager';

export type SchedulingPolicy = 
  | 'round-robin'
  | 'priority'
  | 'cfs'          // Completely Fair Scheduler
  | 'ai-optimized' // AI workload optimized
  | 'realtime'
  | 'interactive';

export type ProcessPriority = 
  | 'idle'       // -20 to -16
  | 'low'        // -15 to -6
  | 'normal'     // -5 to 5
  | 'high'       // 6 to 15
  | 'realtime';  // 16 to 20

export type ProcessClass =
  | 'system'
  | 'interactive'
  | 'background'
  | 'ai-compute'
  | 'io-bound'
  | 'cpu-bound';

export interface SchedulingMetrics {
  processId: number;
  cpuTime: number;
  waitTime: number;
  responseTime: number;
  turnaroundTime: number;
  contextSwitches: number;
  memoryUsage: number;
  ioOperations: number;
  aiOperations: number;
  priority: number;
  niceness: number;
  lastScheduled: number;
  totalScheduled: number;
}

export interface SchedulerConfig {
  policy: SchedulingPolicy;
  timeSliceMs: number;
  maxProcesses: number;
  enablePreemption: boolean;
  enablePriorityBoost: boolean;
  ioBoostDuration: number;
  aiTaskPriority: ProcessPriority;
  interactiveThreshold: number;
  cpuAffinityEnabled: boolean;
  numaAware: boolean;
}

export interface RunQueue {
  processes: VirtualProcess[];
  currentIndex: number;
  totalWeight: number;
  minVruntime: number; // For CFS
}

export interface LoadBalancer {
  cpuQueues: Map<number, RunQueue>;
  migrations: number;
  lastBalance: number;
  balanceInterval: number;
}

export interface SchedulerState {
  runQueues: Map<ProcessPriority, RunQueue>;
  currentProcess: VirtualProcess | null;
  totalProcesses: number;
  activeProcesses: number;
  totalCpuTime: number;
  contextSwitches: number;
  averageLoad: number[];
  lastScheduleTime: number;
  schedulingOverhead: number;
}

export interface ProcessClassifier {
  patterns: Map<ProcessClass, ClassificationRule[]>;
  history: Map<number, ProcessBehavior>;
  learningEnabled: boolean;
}

export interface ClassificationRule {
  cpuUsageThreshold?: number;
  ioRatio?: number;
  aiOperationRatio?: number;
  interactionFrequency?: number;
  memoryPattern?: 'linear' | 'burst' | 'stable';
  confidence: number;
}

export interface ProcessBehavior {
  processId: number;
  cpuBursts: number[];
  ioBursts: number[];
  aiOperations: number[];
  responsePatterns: number[];
  memoryPattern: 'linear' | 'burst' | 'stable';
  classification: ProcessClass;
  confidence: number;
  lastUpdate: number;
}

export interface SchedulingDecision {
  selectedProcess: VirtualProcess;
  reason: string;
  timeSlice: number;
  preemptCurrent: boolean;
  affinityCpu?: number;
  expectedRuntime: number;
}

export class ProcessScheduler {
  private config: SchedulerConfig;
  private state: SchedulerState;
  private metrics: Map<number, SchedulingMetrics>;
  private classifier: ProcessClassifier;
  private loadBalancer: LoadBalancer;
  private isRunning: boolean;
  private schedulerTimer?: number;
  private quantumTimer?: number;
  private performanceCounters: Map<string, number>;

  constructor(config: SchedulerConfig) {
    this.config = config;
    this.isRunning = false;
    this.performanceCounters = new Map();
    
    this.initializeState();
    this.initializeClassifier();
    this.initializeLoadBalancer();
    this.initializeMetrics();
  }

  private initializeState(): void {
    this.state = {
      runQueues: new Map([
        ['idle', { processes: [], currentIndex: 0, totalWeight: 0, minVruntime: 0 }],
        ['low', { processes: [], currentIndex: 0, totalWeight: 0, minVruntime: 0 }],
        ['normal', { processes: [], currentIndex: 0, totalWeight: 0, minVruntime: 0 }],
        ['high', { processes: [], currentIndex: 0, totalWeight: 0, minVruntime: 0 }],
        ['realtime', { processes: [], currentIndex: 0, totalWeight: 0, minVruntime: 0 }]
      ]),
      currentProcess: null,
      totalProcesses: 0,
      activeProcesses: 0,
      totalCpuTime: 0,
      contextSwitches: 0,
      averageLoad: [0, 0, 0], // 1min, 5min, 15min
      lastScheduleTime: 0,
      schedulingOverhead: 0
    };
  }

  private initializeClassifier(): void {
    this.classifier = {
      patterns: new Map([
        ['system', [
          { cpuUsageThreshold: 0.1, ioRatio: 0.2, confidence: 0.9 }
        ]],
        ['interactive', [
          { interactionFrequency: 10, cpuUsageThreshold: 0.3, confidence: 0.8 }
        ]],
        ['background', [
          { cpuUsageThreshold: 0.05, ioRatio: 0.1, confidence: 0.7 }
        ]],
        ['ai-compute', [
          { aiOperationRatio: 0.5, cpuUsageThreshold: 0.7, confidence: 0.9 }
        ]],
        ['io-bound', [
          { ioRatio: 0.6, cpuUsageThreshold: 0.3, confidence: 0.8 }
        ]],
        ['cpu-bound', [
          { cpuUsageThreshold: 0.8, ioRatio: 0.2, confidence: 0.85 }
        ]]
      ]),
      history: new Map(),
      learningEnabled: true
    };
  }

  private initializeLoadBalancer(): void {
    const numCpus = navigator.hardwareConcurrency || 4;
    this.loadBalancer = {
      cpuQueues: new Map(),
      migrations: 0,
      lastBalance: 0,
      balanceInterval: 100 // 100ms
    };

    for (let i = 0; i < numCpus; i++) {
      this.loadBalancer.cpuQueues.set(i, {
        processes: [],
        currentIndex: 0,
        totalWeight: 0,
        minVruntime: 0
      });
    }
  }

  private initializeMetrics(): void {
    this.metrics = new Map();
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.scheduleNext();
    
    // Start load averaging
    setInterval(() => {
      this.updateLoadAverage();
    }, 5000); // Update every 5 seconds

    console.log(`⚡ Process Scheduler started with policy: ${this.config.policy}`);
  }

  public stop(): void {
    this.isRunning = false;
    
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
    }
    
    if (this.quantumTimer) {
      clearTimeout(this.quantumTimer);
    }

    console.log('🛑 Process Scheduler stopped');
  }

  public addProcess(process: VirtualProcess): void {
    const priority = this.classifyAndPrioritize(process);
    const runQueue = this.state.runQueues.get(priority);
    
    if (!runQueue) {
      console.error(`Invalid priority: ${priority}`);
      return;
    }

    runQueue.processes.push(process);
    this.state.totalProcesses++;
    this.state.activeProcesses++;
    
    // Initialize metrics for this process
    this.metrics.set(process.pid, {
      processId: process.pid,
      cpuTime: 0,
      waitTime: 0,
      responseTime: 0,
      turnaroundTime: 0,
      contextSwitches: 0,
      memoryUsage: process.memory.buffer.byteLength,
      ioOperations: 0,
      aiOperations: 0,
      priority: this.priorityToNumber(priority),
      niceness: 0,
      lastScheduled: 0,
      totalScheduled: 0
    });

    // Update CFS virtual runtime if using CFS
    if (this.config.policy === 'cfs') {
      this.updateVruntime(process, runQueue);
    }

    console.log(`📝 Added process PID ${process.pid} to ${priority} priority queue`);
    
    // Trigger immediate reschedule if higher priority process added
    if (priority === 'realtime' || priority === 'high') {
      this.preemptCurrent();
    }
  }

  public removeProcess(pid: number): void {
    let found = false;
    
    for (const [priority, runQueue] of this.state.runQueues) {
      const index = runQueue.processes.findIndex(p => p.pid === pid);
      if (index !== -1) {
        runQueue.processes.splice(index, 1);
        found = true;
        break;
      }
    }

    if (found) {
      this.state.totalProcesses--;
      this.state.activeProcesses--;
      this.metrics.delete(pid);
      
      // If this was the current process, schedule next
      if (this.state.currentProcess?.pid === pid) {
        this.state.currentProcess = null;
        this.scheduleNext();
      }
      
      console.log(`🗑️ Removed process PID ${pid}`);
    }
  }

  private scheduleNext(): void {
    if (!this.isRunning) {
      return;
    }

    const startTime = performance.now();
    const decision = this.makeSchedulingDecision();
    const endTime = performance.now();
    
    this.state.schedulingOverhead += endTime - startTime;

    if (!decision) {
      // No process to run, schedule idle
      this.scheduleIdleTask();
      return;
    }

    // Context switch if necessary
    if (this.state.currentProcess && this.state.currentProcess.pid !== decision.selectedProcess.pid) {
      this.performContextSwitch(decision.selectedProcess);
    } else {
      this.state.currentProcess = decision.selectedProcess;
    }

    // Set up quantum timer
    this.setupQuantumTimer(decision.timeSlice);
    
    // Update metrics
    this.updateSchedulingMetrics(decision);
    
    console.log(`🎯 Scheduled PID ${decision.selectedProcess.pid} for ${decision.timeSlice}ms (${decision.reason})`);
  }

  private makeSchedulingDecision(): SchedulingDecision | null {
    switch (this.config.policy) {
      case 'round-robin':
        return this.roundRobinSchedule();
      case 'priority':
        return this.prioritySchedule();
      case 'cfs':
        return this.cfsSchedule();
      case 'ai-optimized':
        return this.aiOptimizedSchedule();
      case 'realtime':
        return this.realtimeSchedule();
      case 'interactive':
        return this.interactiveSchedule();
      default:
        return this.roundRobinSchedule();
    }
  }

  private roundRobinSchedule(): SchedulingDecision | null {
    // Find next process in round-robin fashion
    for (const [priority, runQueue] of this.state.runQueues) {
      if (runQueue.processes.length === 0) continue;
      
      const process = runQueue.processes[runQueue.currentIndex];
      runQueue.currentIndex = (runQueue.currentIndex + 1) % runQueue.processes.length;
      
      return {
        selectedProcess: process,
        reason: 'round-robin',
        timeSlice: this.config.timeSliceMs,
        preemptCurrent: false,
        expectedRuntime: this.estimateRuntime(process)
      };
    }
    
    return null;
  }

  private prioritySchedule(): SchedulingDecision | null {
    // Schedule highest priority runnable process
    const priorities: ProcessPriority[] = ['realtime', 'high', 'normal', 'low', 'idle'];
    
    for (const priority of priorities) {
      const runQueue = this.state.runQueues.get(priority)!;
      if (runQueue.processes.length > 0) {
        const process = runQueue.processes[0];
        
        return {
          selectedProcess: process,
          reason: `priority-${priority}`,
          timeSlice: this.getTimeSliceForPriority(priority),
          preemptCurrent: priority === 'realtime',
          expectedRuntime: this.estimateRuntime(process)
        };
      }
    }
    
    return null;
  }

  private cfsSchedule(): SchedulingDecision | null {
    // Completely Fair Scheduler - schedule process with lowest vruntime
    let selectedProcess: VirtualProcess | null = null;
    let lowestVruntime = Infinity;
    let selectedQueue: RunQueue | null = null;
    
    for (const [priority, runQueue] of this.state.runQueues) {
      for (const process of runQueue.processes) {
        const vruntime = this.getVruntime(process);
        if (vruntime < lowestVruntime) {
          lowestVruntime = vruntime;
          selectedProcess = process;
          selectedQueue = runQueue;
        }
      }
    }
    
    if (!selectedProcess || !selectedQueue) {
      return null;
    }
    
    return {
      selectedProcess,
      reason: 'cfs-lowest-vruntime',
      timeSlice: this.calculateCfsTimeSlice(selectedProcess, selectedQueue),
      preemptCurrent: false,
      expectedRuntime: this.estimateRuntime(selectedProcess)
    };
  }

  private aiOptimizedSchedule(): SchedulingDecision | null {
    // AI-optimized scheduling prioritizes AI compute tasks
    const aiProcesses = [];
    const regularProcesses = [];
    
    for (const [priority, runQueue] of this.state.runQueues) {
      for (const process of runQueue.processes) {
        const behavior = this.classifier.history.get(process.pid);
        if (behavior?.classification === 'ai-compute') {
          aiProcesses.push({ process, priority });
        } else {
          regularProcesses.push({ process, priority });
        }
      }
    }
    
    // Prioritize AI processes but ensure fairness
    const processPool = aiProcesses.length > 0 ? aiProcesses : regularProcesses;
    if (processPool.length === 0) {
      return null;
    }
    
    // Use weighted fair scheduling for AI processes
    const selected = this.selectWeightedProcess(processPool);
    
    return {
      selectedProcess: selected.process,
      reason: 'ai-optimized',
      timeSlice: this.getAiOptimizedTimeSlice(selected.process),
      preemptCurrent: false,
      expectedRuntime: this.estimateRuntime(selected.process)
    };
  }

  private realtimeSchedule(): SchedulingDecision | null {
    // Real-time scheduling with strict priority
    const realtimeQueue = this.state.runQueues.get('realtime')!;
    if (realtimeQueue.processes.length > 0) {
      const process = realtimeQueue.processes[0];
      
      return {
        selectedProcess: process,
        reason: 'realtime-priority',
        timeSlice: Math.min(this.config.timeSliceMs, 10), // Short slices for RT
        preemptCurrent: true,
        expectedRuntime: this.estimateRuntime(process)
      };
    }
    
    // Fall back to regular priority scheduling
    return this.prioritySchedule();
  }

  private interactiveSchedule(): SchedulingDecision | null {
    // Interactive scheduling optimizes for response time
    const interactiveProcesses = [];
    
    for (const [priority, runQueue] of this.state.runQueues) {
      for (const process of runQueue.processes) {
        const behavior = this.classifier.history.get(process.pid);
        if (behavior?.classification === 'interactive') {
          interactiveProcesses.push({ process, priority, responseTime: behavior.responsePatterns[0] || 0 });
        }
      }
    }
    
    if (interactiveProcesses.length === 0) {
      return this.prioritySchedule();
    }
    
    // Sort by response time (lower is better)
    interactiveProcesses.sort((a, b) => a.responseTime - b.responseTime);
    const selected = interactiveProcesses[0];
    
    return {
      selectedProcess: selected.process,
      reason: 'interactive-response-optimized',
      timeSlice: Math.max(this.config.timeSliceMs / 2, 5), // Shorter slices for interactivity
      preemptCurrent: false,
      expectedRuntime: this.estimateRuntime(selected.process)
    };
  }

  private performContextSwitch(newProcess: VirtualProcess): void {
    const startTime = performance.now();
    
    // Save current process state
    if (this.state.currentProcess) {
      this.saveProcessState(this.state.currentProcess);
    }
    
    // Load new process state
    this.loadProcessState(newProcess);
    
    // Update current process
    this.state.currentProcess = newProcess;
    this.state.contextSwitches++;
    
    // Update metrics
    const metrics = this.metrics.get(newProcess.pid);
    if (metrics) {
      metrics.contextSwitches++;
      metrics.lastScheduled = Date.now();
    }
    
    const endTime = performance.now();
    this.state.schedulingOverhead += endTime - startTime;
    
    console.log(`🔄 Context switch to PID ${newProcess.pid}`);
  }

  private setupQuantumTimer(timeSlice: number): void {
    if (this.quantumTimer) {
      clearTimeout(this.quantumTimer);
    }
    
    this.quantumTimer = window.setTimeout(() => {
      this.onQuantumExpired();
    }, timeSlice);
  }

  private onQuantumExpired(): void {
    console.log('⏰ Quantum expired, preempting current process');
    this.preemptCurrent();
  }

  private preemptCurrent(): void {
    if (this.state.currentProcess && this.config.enablePreemption) {
      console.log(`⏸️ Preempting PID ${this.state.currentProcess.pid}`);
      this.scheduleNext();
    }
  }

  private classifyAndPrioritize(process: VirtualProcess): ProcessPriority {
    // Classify the process based on its characteristics
    const behavior = this.analyzeProcessBehavior(process);
    this.classifier.history.set(process.pid, behavior);
    
    switch (behavior.classification) {
      case 'realtime':
        return 'realtime';
      case 'ai-compute':
        return this.config.aiTaskPriority;
      case 'interactive':
        return 'high';
      case 'system':
        return 'normal';
      case 'background':
        return 'low';
      case 'io-bound':
        return 'normal';
      case 'cpu-bound':
        return 'low';
      default:
        return 'normal';
    }
  }

  private analyzeProcessBehavior(process: VirtualProcess): ProcessBehavior {
    // Analyze process behavior patterns
    return {
      processId: process.pid,
      cpuBursts: [],
      ioBursts: [],
      aiOperations: [],
      responsePatterns: [],
      memoryPattern: 'stable',
      classification: 'system', // Default classification
      confidence: 0.5,
      lastUpdate: Date.now()
    };
  }

  private estimateRuntime(process: VirtualProcess): number {
    const metrics = this.metrics.get(process.pid);
    if (!metrics || metrics.totalScheduled === 0) {
      return this.config.timeSliceMs;
    }
    
    return metrics.cpuTime / metrics.totalScheduled;
  }

  private getTimeSliceForPriority(priority: ProcessPriority): number {
    const baseSlice = this.config.timeSliceMs;
    
    switch (priority) {
      case 'realtime':
        return Math.min(baseSlice, 10);
      case 'high':
        return baseSlice * 2;
      case 'normal':
        return baseSlice;
      case 'low':
        return baseSlice / 2;
      case 'idle':
        return baseSlice / 4;
    }
  }

  private calculateCfsTimeSlice(process: VirtualProcess, runQueue: RunQueue): number {
    const targetLatency = 20; // 20ms target latency
    const minGranularity = 1;  // 1ms minimum granularity
    
    if (runQueue.processes.length === 0) {
      return this.config.timeSliceMs;
    }
    
    const timeSlice = Math.max(
      minGranularity,
      targetLatency / runQueue.processes.length
    );
    
    return timeSlice;
  }

  private getAiOptimizedTimeSlice(process: VirtualProcess): number {
    const behavior = this.classifier.history.get(process.pid);
    if (behavior?.classification === 'ai-compute') {
      // AI tasks get longer slices to amortize context switching
      return this.config.timeSliceMs * 4;
    }
    
    return this.config.timeSliceMs;
  }

  private selectWeightedProcess(processes: { process: VirtualProcess, priority: ProcessPriority }[]): { process: VirtualProcess, priority: ProcessPriority } {
    // Simple weighted selection - could be enhanced with more sophisticated algorithms
    return processes[Math.floor(Math.random() * processes.length)];
  }

  private priorityToNumber(priority: ProcessPriority): number {
    switch (priority) {
      case 'realtime': return 20;
      case 'high': return 10;
      case 'normal': return 0;
      case 'low': return -10;
      case 'idle': return -20;
    }
  }

  private saveProcessState(process: VirtualProcess): void {
    // Save process state for context switching
    // In a real implementation, this would save registers, memory mappings, etc.
  }

  private loadProcessState(process: VirtualProcess): void {
    // Load process state for context switching
    // In a real implementation, this would restore registers, memory mappings, etc.
  }

  private getVruntime(process: VirtualProcess): number {
    // Get virtual runtime for CFS
    const metrics = this.metrics.get(process.pid);
    return metrics?.cpuTime || 0;
  }

  private updateVruntime(process: VirtualProcess, runQueue: RunQueue): void {
    // Update virtual runtime for CFS
    const metrics = this.metrics.get(process.pid);
    if (metrics) {
      runQueue.minVruntime = Math.max(runQueue.minVruntime, metrics.cpuTime);
    }
  }

  private updateSchedulingMetrics(decision: SchedulingDecision): void {
    const metrics = this.metrics.get(decision.selectedProcess.pid);
    if (metrics) {
      metrics.totalScheduled++;
      metrics.lastScheduled = Date.now();
    }
  }

  private updateLoadAverage(): void {
    const activeProcesses = this.state.activeProcesses;
    const load = activeProcesses / (navigator.hardwareConcurrency || 1);
    
    // Exponential moving average
    this.state.averageLoad[0] = this.state.averageLoad[0] * 0.92 + load * 0.08;  // 1 min
    this.state.averageLoad[1] = this.state.averageLoad[1] * 0.98 + load * 0.02;  // 5 min
    this.state.averageLoad[2] = this.state.averageLoad[2] * 0.99 + load * 0.01;  // 15 min
  }

  private scheduleIdleTask(): void {
    // Schedule idle task when no processes are runnable
    this.schedulerTimer = window.setTimeout(() => {
      this.scheduleNext();
    }, 10); // Check again in 10ms
  }

  // Public API methods
  public getSchedulerState(): SchedulerState {
    return { ...this.state };
  }

  public getProcessMetrics(pid: number): SchedulingMetrics | undefined {
    return this.metrics.get(pid);
  }

  public getAllMetrics(): Map<number, SchedulingMetrics> {
    return new Map(this.metrics);
  }

  public updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Scheduler configuration updated');
  }

  public getLoadAverage(): number[] {
    return [...this.state.averageLoad];
  }

  public getCurrentProcess(): VirtualProcess | null {
    return this.state.currentProcess;
  }

  public getRunQueueSizes(): Map<ProcessPriority, number> {
    const sizes = new Map<ProcessPriority, number>();
    for (const [priority, runQueue] of this.state.runQueues) {
      sizes.set(priority, runQueue.processes.length);
    }
    return sizes;
  }

  public setProcessPriority(pid: number, priority: ProcessPriority): boolean {
    // Move process to different run queue
    let process: VirtualProcess | undefined;
    
    // Find and remove from current queue
    for (const [currentPriority, runQueue] of this.state.runQueues) {
      const index = runQueue.processes.findIndex(p => p.pid === pid);
      if (index !== -1) {
        process = runQueue.processes.splice(index, 1)[0];
        break;
      }
    }
    
    if (!process) {
      return false;
    }
    
    // Add to new queue
    const newQueue = this.state.runQueues.get(priority);
    if (newQueue) {
      newQueue.processes.push(process);
      
      // Update metrics
      const metrics = this.metrics.get(pid);
      if (metrics) {
        metrics.priority = this.priorityToNumber(priority);
      }
      
      console.log(`📊 Changed PID ${pid} priority to ${priority}`);
      return true;
    }
    
    return false;
  }

  public enableLearning(): void {
    this.classifier.learningEnabled = true;
    console.log('🧠 Process classification learning enabled');
  }

  public disableLearning(): void {
    this.classifier.learningEnabled = false;
    console.log('🧠 Process classification learning disabled');
  }

  public getPerformanceCounters(): Map<string, number> {
    return new Map(this.performanceCounters);
  }
}

export default ProcessScheduler;