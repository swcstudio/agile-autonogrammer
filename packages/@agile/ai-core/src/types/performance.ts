/**
 * AI Performance Type Definitions
 * Types for performance monitoring and optimization
 */

// Performance Metrics
export interface PerformanceMetrics {
  // Timing Metrics
  latency: number; // ms
  throughput: number; // requests/second
  responseTime: number; // ms
  queueTime?: number; // ms
  processingTime: number; // ms
  networkTime?: number; // ms
  
  // Token Metrics
  tokensPerSecond: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  
  // Resource Metrics
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  gpuUsage?: number; // percentage
  
  // Cost Metrics
  costPerRequest: number; // USD
  costPer1kTokens: number; // USD
  totalCost: number; // USD
  
  // Quality Metrics
  accuracy?: number; // 0-1
  relevance?: number; // 0-1
  coherence?: number; // 0-1
  
  // WASM Specific
  wasmSpeedup?: number; // multiplier vs JS baseline
  wasmOverhead?: number; // ms
  
  // Edge Specific
  edgeLatency?: number; // ms
  edgeHitRate?: number; // 0-1
  cdnLatency?: number; // ms
  
  // Metadata
  timestamp: Date;
  model: string;
  provider: string;
  region?: string;
  userId?: string;
  sessionId?: string;
}

// Performance Monitoring
export interface PerformanceMonitor {
  // Metrics Collection
  record(metrics: PerformanceMetrics): Promise<void>;
  recordBatch(metrics: PerformanceMetrics[]): Promise<void>;
  
  // Query Interface
  getMetrics(filter: PerformanceFilter): Promise<PerformanceMetrics[]>;
  getAggregates(filter: PerformanceFilter, groupBy: GroupBy[]): Promise<PerformanceAggregates>;
  
  // Real-time Monitoring
  startMonitoring(config: MonitoringConfig): void;
  stopMonitoring(): void;
  getRealtimeMetrics(): PerformanceMetrics | null;
  
  // Alerts
  configureAlerts(alerts: PerformanceAlert[]): void;
  getActiveAlerts(): PerformanceAlert[];
}

export interface PerformanceFilter {
  startTime?: Date;
  endTime?: Date;
  model?: string[];
  provider?: string[];
  region?: string[];
  userId?: string[];
  minLatency?: number;
  maxLatency?: number;
  minThroughput?: number;
  maxThroughput?: number;
}

export type GroupBy = 'model' | 'provider' | 'region' | 'hour' | 'day' | 'week';

export interface PerformanceAggregates {
  count: number;
  metrics: {
    latency: AggregateValues;
    throughput: AggregateValues;
    tokensPerSecond: AggregateValues;
    costPerRequest: AggregateValues;
    accuracy?: AggregateValues;
    wasmSpeedup?: AggregateValues;
  };
  groupedBy: Record<string, PerformanceAggregates>;
}

export interface AggregateValues {
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export interface MonitoringConfig {
  interval: number; // ms
  metrics: (keyof PerformanceMetrics)[];
  sampling: {
    enabled: boolean;
    rate: number; // 0-1
  };
  storage: {
    enabled: boolean;
    retention: number; // days
    aggregation: 'raw' | 'minute' | 'hour' | 'day';
  };
}

export interface PerformanceAlert {
  id: string;
  name: string;
  enabled: boolean;
  metric: keyof PerformanceMetrics;
  condition: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  threshold: number;
  window: number; // minutes
  actions: Array<{
    type: 'webhook' | 'email' | 'log';
    target: string;
  }>;
}

// Performance Optimization
export interface PerformanceOptimizer {
  // Analysis
  analyzePerformance(timeframe: TimeFrame): Promise<PerformanceAnalysis>;
  identifyBottlenecks(filter: PerformanceFilter): Promise<Bottleneck[]>;
  
  // Optimization
  getOptimizationRecommendations(analysis: PerformanceAnalysis): OptimizationRecommendation[];
  applyOptimization(recommendation: OptimizationRecommendation): Promise<OptimizationResult>;
  
  // A/B Testing
  createExperiment(config: ExperimentConfig): Promise<Experiment>;
  analyzeExperiment(experimentId: string): Promise<ExperimentResult>;
}

export interface TimeFrame {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day';
}

export interface PerformanceAnalysis {
  timeframe: TimeFrame;
  overallMetrics: PerformanceMetrics;
  trends: Array<{
    timestamp: Date;
    metrics: Partial<PerformanceMetrics>;
  }>;
  insights: string[];
  anomalies: Array<{
    timestamp: Date;
    metric: string;
    expected: number;
    actual: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface Bottleneck {
  component: 'network' | 'model' | 'provider' | 'wasm' | 'edge' | 'cache';
  severity: 'low' | 'medium' | 'high';
  impact: {
    latencyIncrease: number; // ms
    throughputDecrease: number; // percentage
    costIncrease: number; // percentage
  };
  description: string;
  frequency: number; // 0-1
  affectedRequests: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'caching' | 'model-switch' | 'load-balancing' | 'wasm-acceleration' | 'edge-deployment' | 'batching';
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImpact: {
    latencyImprovement: number; // percentage
    throughputImprovement: number; // percentage
    costReduction: number; // percentage
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
    rollbackPlan: string;
  };
  config: Record<string, any>;
}

export interface OptimizationResult {
  recommendation: OptimizationRecommendation;
  applied: Date;
  beforeMetrics: PerformanceMetrics;
  afterMetrics: PerformanceMetrics;
  actualImpact: {
    latencyImprovement: number;
    throughputImprovement: number;
    costReduction: number;
  };
  success: boolean;
  notes: string[];
}

// A/B Testing Framework
export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  
  // Configuration
  variants: ExperimentVariant[];
  trafficAllocation: Record<string, number>; // variant -> percentage
  successMetrics: (keyof PerformanceMetrics)[];
  
  // Timeline
  startDate: Date;
  endDate?: Date;
  duration?: number; // days
  
  // Targeting
  targeting: {
    userSegments?: string[];
    regions?: string[];
    models?: string[];
    percentage: number; // 0-100
  };
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  isControl: boolean;
}

export interface ExperimentResult {
  experiment: Experiment;
  status: 'running' | 'completed' | 'inconclusive';
  
  // Results by variant
  variants: Record<string, {
    variant: ExperimentVariant;
    metrics: PerformanceAggregates;
    sampleSize: number;
    confidenceInterval: [number, number];
  }>;
  
  // Statistical Analysis
  winner?: string; // variant ID
  confidence: number; // 0-1
  pValue: number;
  effect: {
    metric: string;
    magnitude: number;
    practical: boolean;
  };
  
  // Recommendations
  recommendation: 'deploy-winner' | 'continue-testing' | 'stop-inconclusive';
  notes: string[];
}

// Benchmarking
export interface BenchmarkSuite {
  // Test Execution
  runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult>;
  runComparison(models: string[], testCases: TestCase[]): Promise<ComparisonResult>;
  
  // Test Management
  createTestCase(testCase: TestCase): void;
  getTestCases(filter?: TestCaseFilter): TestCase[];
  updateTestCase(id: string, updates: Partial<TestCase>): void;
  deleteTestCase(id: string): void;
}

export interface BenchmarkConfig {
  name: string;
  models: string[];
  testCases: string[]; // test case IDs
  iterations: number;
  warmupIterations: number;
  concurrency: number;
  timeout: number; // ms
  collectMetrics: (keyof PerformanceMetrics)[];
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'latency' | 'throughput' | 'accuracy' | 'cost' | 'memory';
  
  // Test Data
  input: string | Record<string, any>;
  expectedOutput?: string | Record<string, any>;
  
  // Validation
  validator?: (output: any) => boolean;
  scorer?: (output: any, expected?: any) => number;
  
  // Metadata
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
  updatedAt: Date;
}

export interface TestCaseFilter {
  category?: string[];
  tags?: string[];
  difficulty?: string[];
  name?: string;
}

export interface BenchmarkResult {
  config: BenchmarkConfig;
  startTime: Date;
  endTime: Date;
  duration: number; // ms
  
  // Results by model
  modelResults: Record<string, ModelBenchmarkResult>;
  
  // Overall Statistics
  summary: {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averageLatency: number;
    totalCost: number;
  };
  
  // Rankings
  rankings: Array<{
    model: string;
    overallScore: number;
    rank: number;
    strengths: string[];
    weaknesses: string[];
  }>;
}

export interface ModelBenchmarkResult {
  model: string;
  testResults: TestResult[];
  aggregateMetrics: PerformanceAggregates;
  overallScore: number;
  categoryScores: Record<string, number>;
}

export interface TestResult {
  testCase: TestCase;
  success: boolean;
  metrics: PerformanceMetrics;
  output?: any;
  score?: number;
  error?: string;
}

export interface ComparisonResult {
  models: string[];
  testCases: TestCase[];
  results: Record<string, ModelBenchmarkResult>;
  
  // Statistical Comparison
  significance: Record<string, Record<string, {
    metric: string;
    pValue: number;
    significant: boolean;
    effectSize: number;
  }>>;
  
  // Recommendations
  bestModel: {
    overall: string;
    byCategory: Record<string, string>;
    byMetric: Record<string, string>;
  };
  
  // Visualization Data
  charts: {
    latencyComparison: ChartData;
    costComparison: ChartData;
    accuracyComparison: ChartData;
  };
}

export interface ChartData {
  type: 'bar' | 'line' | 'scatter' | 'radar';
  data: Array<{
    label: string;
    values: number[];
  }>;
  axes: {
    x: string;
    y: string;
  };
}

// Performance Profiling
export interface PerformanceProfiler {
  startProfiling(config: ProfilingConfig): void;
  stopProfiling(): ProfilingResult;
  profileFunction<T>(fn: () => Promise<T>): Promise<{ result: T; profile: ProfilingResult }>;
}

export interface ProfilingConfig {
  includeCallStack: boolean;
  includeMemory: boolean;
  samplingInterval: number; // ms
  maxDuration: number; // ms
}

export interface ProfilingResult {
  duration: number; // ms
  memoryUsage: {
    peak: number; // MB
    average: number; // MB
    gc: number; // garbage collection events
  };
  callStack?: Array<{
    function: string;
    duration: number;
    calls: number;
    percentage: number;
  }>;
  hotspots: Array<{
    location: string;
    type: 'cpu' | 'memory' | 'network';
    impact: number;
    suggestion: string;
  }>;
}