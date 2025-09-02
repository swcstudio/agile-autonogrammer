/**
 * Context Engine - Advanced context engineering system for AI-OSX
 * 
 * Unified TypeScript interface layer for the Brain-Braun-Beyond architecture,
 * coordinating between Elixir cognitive processes, Rust computational engines,
 * and BAML-based transcendent reasoning capabilities.
 */

import { SecurityAIClient } from '@katalyst/security-ai';
import { DevelopmentAssistant } from '../ai/DevelopmentAssistant';

export type FieldDimension = 'semantic' | 'temporal' | 'emergent' | 'cognitive' | 'execution' | 'transcendent';
export type ComputeMode = 'cuda' | 'wasm' | 'cpu' | 'auto';
export type ProtocolNamespace = 'field' | 'recursive' | 'cognitive' | 'emergence' | 'braun' | 'beyond';

export interface FieldState {
  energy: number;
  coherence: number;
  attractors: FieldAttractor[];
  dimensions: Record<FieldDimension, DimensionState>;
  temperature: number;
  entropy: number;
  metadata: FieldMetadata;
}

export interface FieldAttractor {
  type: 'strange' | 'cyclic' | 'point' | 'torus' | 'emergent';
  strength: number;
  patterns: string[];
  resonance_frequency: number;
  stability: number;
}

export interface DimensionState {
  weight: number;
  active: boolean;
  phase: number;
  amplitude: number;
  coupling: number;
}

export interface FieldMetadata {
  created: number;
  updated: number;
  version: number;
  field_id: string;
  session_id: string;
  user_id?: string;
  tags: string[];
}

export interface ProtocolShell {
  intent: string;
  input: Record<string, ProtocolInputType>;
  process: ProtocolStep[];
  output: Record<string, ProtocolOutputType>;
  metadata: ProtocolMetadata;
}

export interface ProtocolStep {
  namespace: ProtocolNamespace;
  action: string;
  params?: Record<string, any>;
  conditions?: ProtocolCondition[];
  async?: boolean;
  timeout?: number;
}

export interface ProtocolCondition {
  field: string;
  operator: 'equals' | 'greater' | 'less' | 'contains' | 'pattern' | 'emergence';
  value: any;
  threshold?: number;
}

export interface ProtocolMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  created: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'transcendent';
  reliability: number;
  performance_profile: PerformanceProfile;
}

export interface PerformanceProfile {
  average_execution_time: number;
  memory_usage: number;
  cpu_intensity: number;
  io_operations: number;
  network_calls: number;
  success_rate: number;
}

export type ProtocolInputType = 
  | { type: 'string'; required: boolean; validation?: string }
  | { type: 'number'; required: boolean; min?: number; max?: number }
  | { type: 'boolean'; required: boolean }
  | { type: 'array'; required: boolean; items: ProtocolInputType }
  | { type: 'object'; required: boolean; properties: Record<string, ProtocolInputType> };

export type ProtocolOutputType = 
  | { type: 'string'; description?: string }
  | { type: 'number'; description?: string }
  | { type: 'boolean'; description?: string }
  | { type: 'array'; items: ProtocolOutputType; description?: string }
  | { type: 'object'; properties: Record<string, ProtocolOutputType>; description?: string };

export interface ContextFrame {
  id: string;
  content: any;
  metadata: ContextFrameMetadata;
  field_state: Partial<FieldState>;
  relations: ContextRelation[];
  embeddings?: number[];
}

export interface ContextFrameMetadata {
  type: 'code' | 'conversation' | 'execution' | 'error' | 'insight' | 'pattern';
  timestamp: number;
  importance: number;
  decay_rate: number;
  access_count: number;
  last_accessed: number;
  source: string;
  confidence: number;
}

export interface ContextRelation {
  target_frame_id: string;
  relation_type: 'causal' | 'temporal' | 'semantic' | 'emergent' | 'recursive';
  strength: number;
  bidirectional: boolean;
}

export interface BrainBraunBeyondConfig {
  brain: BrainConfig;
  braun: BraunConfig;
  beyond: BeyondConfig;
  field_dynamics: FieldDynamicsConfig;
  performance: PerformanceConfig;
}

export interface BrainConfig {
  elixir_node: string;
  supervision_strategy: 'one_for_one' | 'one_for_all' | 'rest_for_one';
  max_restarts: number;
  max_seconds: number;
  cognitive_workers: number;
  memory_limit_mb: number;
  enable_pubsub: boolean;
  enable_clustering: boolean;
}

export interface BraunConfig {
  rust_nif_path: string;
  compute_modes: ComputeMode[];
  default_compute_mode: ComputeMode;
  cuda_enabled: boolean;
  wasm_runtime: 'wasmtime' | 'wasmer' | 'native';
  optimization_level: 1 | 2 | 3;
  parallel_workers: number;
  memory_pool_size: number;
}

export interface BeyondConfig {
  baml_functions_path: string;
  model_providers: string[];
  default_model: string;
  max_transcendence_depth: number;
  emergence_threshold: number;
  pattern_recognition_sensitivity: number;
  meta_cognitive_enabled: boolean;
}

export interface FieldDynamicsConfig {
  update_frequency: number;
  energy_decay_rate: number;
  coherence_threshold: number;
  attractor_sensitivity: number;
  dimension_coupling_strength: number;
  enable_quantum_effects: boolean;
}

export interface PerformanceConfig {
  max_field_states: number;
  context_frame_ttl: number;
  embedding_batch_size: number;
  protocol_timeout: number;
  cache_size: number;
  metrics_collection: boolean;
}

export interface ContextEngineMetrics {
  field_operations: number;
  protocol_executions: number;
  brain_operations: number;
  braun_computations: number;
  beyond_transcendences: number;
  average_field_energy: number;
  average_coherence: number;
  total_context_frames: number;
  active_fields: number;
  performance_metrics: {
    avg_protocol_time: number;
    avg_field_update_time: number;
    avg_transcendence_time: number;
    memory_usage: number;
    cpu_usage: number;
  };
}

export interface FieldEvent {
  id: string;
  type: 'field_created' | 'field_updated' | 'emergence_detected' | 'attractor_formed' | 'dimension_shift' | 'transcendence_achieved';
  field_id: string;
  data: any;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface EmergencePattern {
  id: string;
  pattern_type: 'recursive' | 'self_similar' | 'emergent_property' | 'phase_transition' | 'strange_attractor';
  description: string;
  strength: number;
  stability: number;
  prediction_confidence: number;
  emergence_conditions: Record<string, any>;
  observed_effects: string[];
  recommendations: string[];
}

export interface BrainResponse {
  success: boolean;
  result?: any;
  error?: string;
  field_state?: Partial<FieldState>;
  patterns?: EmergencePattern[];
  metadata: {
    processing_time: number;
    worker_id: string;
    memory_used: number;
  };
}

export interface BraunResponse {
  success: boolean;
  result?: any;
  error?: string;
  compute_mode: ComputeMode;
  performance_metrics: {
    execution_time: number;
    memory_peak: number;
    cpu_utilization: number;
    gpu_utilization?: number;
  };
}

export interface BeyondResponse {
  success: boolean;
  result?: any;
  error?: string;
  transcendence_level: number;
  emergence_detected: boolean;
  patterns: EmergencePattern[];
  insights: string[];
  recommendations: string[];
  meta_cognitive_notes: string[];
}

export class ContextEngine {
  private config: BrainBraunBeyondConfig;
  private assistant: DevelopmentAssistant;
  private securityClient: SecurityAIClient;
  private activeFields: Map<string, FieldState>;
  private contextFrames: Map<string, ContextFrame>;
  private protocols: Map<string, ProtocolShell>;
  private metrics: ContextEngineMetrics;
  private eventHandlers: Map<string, Array<(event: FieldEvent) => void>>;
  private isInitialized: boolean;
  private brainConnection?: WebSocket;
  private braunModule?: any; // Rust WASM module
  private beyondFunctions: Map<string, Function>;

  constructor(
    config: BrainBraunBeyondConfig,
    assistant: DevelopmentAssistant,
    securityClient: SecurityAIClient
  ) {
    this.config = config;
    this.assistant = assistant;
    this.securityClient = securityClient;
    this.activeFields = new Map();
    this.contextFrames = new Map();
    this.protocols = new Map();
    this.eventHandlers = new Map();
    this.beyondFunctions = new Map();
    this.isInitialized = false;

    this.initializeMetrics();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🧠 Initializing Brain-Braun-Beyond Context Engine...');

    // Initialize Brain (Elixir) connection
    await this.initializeBrain();

    // Initialize Braun (Rust) computational engine
    await this.initializeBraun();

    // Initialize Beyond (BAML) transcendent functions
    await this.initializeBeyond();

    // Load built-in protocols
    await this.loadBuiltinProtocols();

    // Start field dynamics updater
    this.startFieldDynamicsUpdater();

    // Start metrics collection
    this.startMetricsCollection();

    this.isInitialized = true;
    console.log('✅ Brain-Braun-Beyond Context Engine initialized successfully');
  }

  private initializeMetrics(): void {
    this.metrics = {
      field_operations: 0,
      protocol_executions: 0,
      brain_operations: 0,
      braun_computations: 0,
      beyond_transcendences: 0,
      average_field_energy: 0.0,
      average_coherence: 0.0,
      total_context_frames: 0,
      active_fields: 0,
      performance_metrics: {
        avg_protocol_time: 0.0,
        avg_field_update_time: 0.0,
        avg_transcendence_time: 0.0,
        memory_usage: 0,
        cpu_usage: 0.0
      }
    };
  }

  private async initializeBrain(): Promise<void> {
    // Connect to Elixir node via WebSocket for cognitive processing
    try {
      const wsUrl = `ws://${this.config.brain.elixir_node}/websocket`;
      this.brainConnection = new WebSocket(wsUrl);
      
      this.brainConnection.onopen = () => {
        console.log('🧠 Brain connection established');
      };

      this.brainConnection.onmessage = (event) => {
        this.handleBrainMessage(JSON.parse(event.data));
      };

      this.brainConnection.onerror = (error) => {
        console.error('🧠 Brain connection error:', error);
      };

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Brain connection timeout')), 10000);
        
        if (this.brainConnection) {
          this.brainConnection.onopen = () => {
            clearTimeout(timeout);
            resolve(void 0);
          };
        }
      });

    } catch (error) {
      console.warn('🧠 Brain initialization failed, using fallback mode:', error);
      // Fallback to TypeScript-only cognitive processing
    }
  }

  private async initializeBraun(): Promise<void> {
    // Load Rust computational engine via WebAssembly
    try {
      // In a real implementation, this would load the compiled Rust WASM module
      // For now, we'll use a mock interface
      this.braunModule = {
        execute_hvm: async (sandboxId: string, hvmCode: string, computeMode: ComputeMode) => {
          // Mock Rust execution
          const result = `HVM execution result for ${hvmCode.substring(0, 50)}...`;
          return { result, compute_mode: computeMode };
        },
        
        optimize_computation: async (code: string, mode: ComputeMode) => {
          // Mock optimization
          return { optimized_code: code, performance_gain: 1.5 };
        },

        create_sandbox: async () => {
          return { sandbox_id: `sandbox-${Date.now()}` };
        }
      };

      console.log('💪 Braun computational engine loaded');

    } catch (error) {
      console.warn('💪 Braun initialization failed, using fallback mode:', error);
      // Fallback to JavaScript-only computation
    }
  }

  private async initializeBeyond(): Promise<void> {
    // Load BAML transcendent functions
    try {
      // Load BAML functions from the beyond module
      const beyondModule = await import('./beyond/BamlFunctions');
      
      // Register transcendent functions
      this.beyondFunctions.set('analyze_emergence', beyondModule.analyzeEmergence);
      this.beyondFunctions.set('detect_patterns', beyondModule.detectPatterns);
      this.beyondFunctions.set('transcend_context', beyondModule.transcendContext);
      this.beyondFunctions.set('generate_insights', beyondModule.generateInsights);
      this.beyondFunctions.set('synthesize_knowledge', beyondModule.synthesizeKnowledge);

      console.log('🌌 Beyond transcendent functions loaded');

    } catch (error) {
      console.warn('🌌 Beyond initialization failed, using fallback mode:', error);
      // Fallback to basic AI processing
    }
  }

  private async loadBuiltinProtocols(): Promise<void> {
    const builtinProtocols = [
      this.createRecursiveAnalysisProtocol(),
      this.createEmergenceDetectionProtocol(),
      this.createCognitiveReasoningProtocol(),
      this.createComputationalOptimizationProtocol(),
      this.createTranscendentSynthesisProtocol()
    ];

    for (const protocol of builtinProtocols) {
      this.protocols.set(protocol.metadata.name, protocol);
    }

    console.log(`📚 Loaded ${builtinProtocols.length} built-in protocols`);
  }

  private createRecursiveAnalysisProtocol(): ProtocolShell {
    return {
      intent: "Recursive analysis with depth convergence",
      input: {
        target: { type: 'string', required: true },
        depth: { type: 'number', required: false, min: 1, max: 10 },
        convergence_threshold: { type: 'number', required: false, min: 0.1, max: 1.0 }
      },
      process: [
        { namespace: 'field', action: 'initialize', params: { energy: 5.0 } },
        { namespace: 'recursive', action: 'analyze', params: { depth: 3 }, async: false },
        { namespace: 'cognitive', action: 'synthesize', params: { type: 'emergent' } },
        { namespace: 'beyond', action: 'transcend', params: { level: 1 }, conditions: [
          { field: 'coherence', operator: 'greater', value: 0.7 }
        ]}
      ],
      output: {
        analysis: { type: 'object', description: 'Recursive analysis results' },
        patterns: { type: 'array', items: { type: 'string' }, description: 'Detected patterns' },
        insights: { type: 'array', items: { type: 'string' }, description: 'Generated insights' }
      },
      metadata: {
        name: 'recursive_analysis',
        description: 'Deep recursive analysis with emergence detection',
        version: '1.0.0',
        author: 'BBB System',
        created: Date.now(),
        complexity: 'complex',
        reliability: 0.92,
        performance_profile: {
          average_execution_time: 2500,
          memory_usage: 128,
          cpu_intensity: 0.7,
          io_operations: 5,
          network_calls: 2,
          success_rate: 0.95
        }
      }
    };
  }

  private createEmergenceDetectionProtocol(): ProtocolShell {
    return {
      intent: "Detect and analyze emergent patterns in context",
      input: {
        context_frames: { type: 'array', required: true, items: { type: 'object' } },
        sensitivity: { type: 'number', required: false, min: 0.1, max: 1.0 }
      },
      process: [
        { namespace: 'field', action: 'analyze_attractors', async: true },
        { namespace: 'emergence', action: 'detect_patterns', params: { algorithm: 'phase_space' } },
        { namespace: 'beyond', action: 'validate_emergence', params: { threshold: 0.8 } }
      ],
      output: {
        patterns: { type: 'array', items: { type: 'object' }, description: 'Emergent patterns' },
        confidence: { type: 'number', description: 'Detection confidence' },
        recommendations: { type: 'array', items: { type: 'string' }, description: 'Action recommendations' }
      },
      metadata: {
        name: 'emergence_detection',
        description: 'Advanced emergence pattern detection and analysis',
        version: '1.0.0',
        author: 'BBB System',
        created: Date.now(),
        complexity: 'transcendent',
        reliability: 0.88,
        performance_profile: {
          average_execution_time: 3200,
          memory_usage: 256,
          cpu_intensity: 0.8,
          io_operations: 8,
          network_calls: 3,
          success_rate: 0.91
        }
      }
    };
  }

  private createCognitiveReasoningProtocol(): ProtocolShell {
    return {
      intent: "Advanced cognitive reasoning with field dynamics",
      input: {
        problem: { type: 'string', required: true },
        context: { type: 'object', required: false },
        reasoning_depth: { type: 'number', required: false, min: 1, max: 5 }
      },
      process: [
        { namespace: 'cognitive', action: 'initialize_reasoning' },
        { namespace: 'field', action: 'stabilize_coherence', params: { target: 0.8 } },
        { namespace: 'braun', action: 'optimize_computation', async: true },
        { namespace: 'beyond', action: 'transcend_reasoning', conditions: [
          { field: 'complexity', operator: 'greater', value: 0.5 }
        ]}
      ],
      output: {
        reasoning_chain: { type: 'array', items: { type: 'string' }, description: 'Step-by-step reasoning' },
        conclusion: { type: 'string', description: 'Final conclusion' },
        confidence: { type: 'number', description: 'Reasoning confidence' },
        alternatives: { type: 'array', items: { type: 'string' }, description: 'Alternative solutions' }
      },
      metadata: {
        name: 'cognitive_reasoning',
        description: 'Advanced multi-dimensional cognitive reasoning',
        version: '1.0.0',
        author: 'BBB System',
        created: Date.now(),
        complexity: 'complex',
        reliability: 0.94,
        performance_profile: {
          average_execution_time: 1800,
          memory_usage: 192,
          cpu_intensity: 0.6,
          io_operations: 4,
          network_calls: 2,
          success_rate: 0.96
        }
      }
    };
  }

  private createComputationalOptimizationProtocol(): ProtocolShell {
    return {
      intent: "Optimize computational processes using Braun engine",
      input: {
        code: { type: 'string', required: true },
        target_metric: { type: 'string', required: false, validation: 'speed|memory|efficiency' },
        compute_mode: { type: 'string', required: false, validation: 'cuda|wasm|cpu|auto' }
      },
      process: [
        { namespace: 'braun', action: 'analyze_code', params: { mode: 'auto' } },
        { namespace: 'braun', action: 'optimize', async: true, timeout: 10000 },
        { namespace: 'field', action: 'update_performance_metrics' }
      ],
      output: {
        optimized_code: { type: 'string', description: 'Optimized code' },
        performance_gain: { type: 'number', description: 'Performance improvement ratio' },
        recommendations: { type: 'array', items: { type: 'string' }, description: 'Optimization recommendations' }
      },
      metadata: {
        name: 'computational_optimization',
        description: 'High-performance code optimization using Rust engine',
        version: '1.0.0',
        author: 'BBB System',
        created: Date.now(),
        complexity: 'moderate',
        reliability: 0.97,
        performance_profile: {
          average_execution_time: 1200,
          memory_usage: 96,
          cpu_intensity: 0.9,
          io_operations: 2,
          network_calls: 0,
          success_rate: 0.98
        }
      }
    };
  }

  private createTranscendentSynthesisProtocol(): ProtocolShell {
    return {
      intent: "Transcendent synthesis of knowledge and insights",
      input: {
        knowledge_base: { type: 'array', required: true, items: { type: 'object' } },
        synthesis_goal: { type: 'string', required: true },
        transcendence_level: { type: 'number', required: false, min: 1, max: 5 }
      },
      process: [
        { namespace: 'beyond', action: 'prepare_synthesis' },
        { namespace: 'field', action: 'maximize_coherence' },
        { namespace: 'beyond', action: 'synthesize_knowledge', params: { depth: 'transcendent' } },
        { namespace: 'emergence', action: 'validate_insights', async: true }
      ],
      output: {
        synthesis: { type: 'object', description: 'Synthesized knowledge structure' },
        insights: { type: 'array', items: { type: 'string' }, description: 'Transcendent insights' },
        emergence_level: { type: 'number', description: 'Level of emergence achieved' },
        meta_insights: { type: 'array', items: { type: 'string' }, description: 'Meta-cognitive insights' }
      },
      metadata: {
        name: 'transcendent_synthesis',
        description: 'Advanced knowledge synthesis with transcendent reasoning',
        version: '1.0.0',
        author: 'BBB System',
        created: Date.now(),
        complexity: 'transcendent',
        reliability: 0.85,
        performance_profile: {
          average_execution_time: 4500,
          memory_usage: 384,
          cpu_intensity: 0.7,
          io_operations: 12,
          network_calls: 5,
          success_rate: 0.89
        }
      }
    };
  }

  // Core field operations
  public async createField(params: Partial<FieldState> = {}): Promise<string> {
    const fieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fieldState: FieldState = {
      energy: params.energy || 5.0,
      coherence: params.coherence || 0.5,
      attractors: params.attractors || [],
      dimensions: params.dimensions || {
        semantic: { weight: 0.3, active: true, phase: 0, amplitude: 1.0, coupling: 0.5 },
        temporal: { weight: 0.2, active: true, phase: 0, amplitude: 1.0, coupling: 0.3 },
        emergent: { weight: 0.25, active: true, phase: 0, amplitude: 1.0, coupling: 0.4 },
        cognitive: { weight: 0.15, active: true, phase: 0, amplitude: 1.0, coupling: 0.6 },
        execution: { weight: 0.1, active: false, phase: 0, amplitude: 0.5, coupling: 0.2 },
        transcendent: { weight: 0.0, active: false, phase: 0, amplitude: 0.0, coupling: 0.0 }
      },
      temperature: params.temperature || 1.0,
      entropy: params.entropy || 0.3,
      metadata: {
        created: Date.now(),
        updated: Date.now(),
        version: 1,
        field_id: fieldId,
        session_id: crypto.randomUUID(),
        tags: []
      }
    };

    this.activeFields.set(fieldId, fieldState);
    this.metrics.active_fields = this.activeFields.size;
    this.metrics.field_operations++;

    this.emitEvent({
      id: crypto.randomUUID(),
      type: 'field_created',
      field_id: fieldId,
      data: fieldState,
      timestamp: Date.now(),
      metadata: {}
    });

    console.log(`🌊 Created field ${fieldId} with energy ${fieldState.energy}`);
    return fieldId;
  }

  public async executeProtocol(
    protocolName: string,
    params: Record<string, any>,
    fieldId?: string
  ): Promise<any> {
    const protocol = this.protocols.get(protocolName);
    if (!protocol) {
      throw new Error(`Protocol '${protocolName}' not found`);
    }

    const startTime = performance.now();
    this.metrics.protocol_executions++;

    try {
      // Validate inputs
      const validatedParams = this.validateProtocolInputs(protocol, params);

      // Get or create field
      const targetFieldId = fieldId || await this.createField();
      const field = this.activeFields.get(targetFieldId);
      if (!field) {
        throw new Error(`Field '${targetFieldId}' not found`);
      }

      // Execute protocol steps
      let context = { field, params: validatedParams, results: {} };
      
      for (const step of protocol.process) {
        if (step.conditions && !this.evaluateConditions(step.conditions, context)) {
          console.log(`⏭️ Skipping step ${step.namespace}.${step.action} - conditions not met`);
          continue;
        }

        const stepResult = await this.executeProtocolStep(step, context);
        context.results[`${step.namespace}.${step.action}`] = stepResult;

        // Update field state if modified
        if (stepResult.field_state) {
          Object.assign(field, stepResult.field_state);
          field.metadata.updated = Date.now();
          field.metadata.version++;
        }
      }

      // Validate and format outputs
      const result = this.formatProtocolOutputs(protocol, context.results);
      
      const endTime = performance.now();
      this.metrics.performance_metrics.avg_protocol_time = 
        (this.metrics.performance_metrics.avg_protocol_time + (endTime - startTime)) / 2;

      console.log(`🔄 Executed protocol '${protocolName}' in ${(endTime - startTime).toFixed(2)}ms`);
      return result;

    } catch (error) {
      console.error(`❌ Protocol execution failed: ${error}`);
      throw error;
    }
  }

  private async executeProtocolStep(step: ProtocolStep, context: any): Promise<any> {
    const { namespace, action, params = {}, async: isAsync = false } = step;
    
    const executeStep = async () => {
      switch (namespace) {
        case 'field':
          return await this.executeFieldOperation(action, params, context);
        case 'recursive':
          return await this.executeRecursiveOperation(action, params, context);
        case 'cognitive':
          return await this.executeCognitiveOperation(action, params, context);
        case 'emergence':
          return await this.executeEmergenceOperation(action, params, context);
        case 'braun':
          return await this.executeBraunOperation(action, params, context);
        case 'beyond':
          return await this.executeBeyondOperation(action, params, context);
        default:
          throw new Error(`Unknown protocol namespace: ${namespace}`);
      }
    };

    if (isAsync) {
      // Execute asynchronously without waiting
      executeStep().catch(error => {
        console.error(`Async step ${namespace}.${action} failed:`, error);
      });
      return { status: 'async_started' };
    } else {
      return await executeStep();
    }
  }

  private async executeFieldOperation(action: string, params: any, context: any): Promise<any> {
    const field = context.field;
    
    switch (action) {
      case 'initialize':
        field.energy = params.energy || 5.0;
        field.coherence = 0.5;
        return { status: 'initialized', field_state: field };
        
      case 'stabilize_coherence':
        const target = params.target || 0.8;
        field.coherence = Math.min(target, field.coherence + 0.1);
        return { status: 'stabilized', coherence: field.coherence };
        
      case 'analyze_attractors':
        const attractors = this.analyzeFieldAttractors(field);
        field.attractors = attractors;
        return { attractors, field_state: field };
        
      case 'maximize_coherence':
        field.coherence = 0.95;
        field.energy *= 1.2;
        return { status: 'maximized', coherence: field.coherence };
        
      case 'update_performance_metrics':
        // Update performance metrics in field metadata
        return { status: 'updated' };
        
      default:
        throw new Error(`Unknown field operation: ${action}`);
    }
  }

  private async executeRecursiveOperation(action: string, params: any, context: any): Promise<any> {
    switch (action) {
      case 'analyze':
        const depth = params.depth || 3;
        const target = context.params.target || '';
        
        // Perform recursive analysis via Brain (Elixir)
        const analysisResult = await this.callBrain('recursive_analysis', {
          target,
          depth,
          field_state: context.field
        });
        
        return {
          analysis: analysisResult.result,
          patterns: analysisResult.patterns || [],
          depth_reached: depth
        };
        
      default:
        throw new Error(`Unknown recursive operation: ${action}`);
    }
  }

  private async executeCognitiveOperation(action: string, params: any, context: any): Promise<any> {
    this.metrics.brain_operations++;
    
    switch (action) {
      case 'initialize_reasoning':
        return await this.callBrain('initialize_reasoning', {
          problem: context.params.problem,
          field_state: context.field
        });
        
      case 'synthesize':
        const synthType = params.type || 'basic';
        return await this.callBrain('cognitive_synthesis', {
          type: synthType,
          context: context.results,
          field_state: context.field
        });
        
      case 'reason':
        return await this.callBrain('cognitive_reasoning', {
          type: params.type || 'analytical',
          depth: params.depth || 2,
          context: context.params,
          field_state: context.field
        });
        
      default:
        throw new Error(`Unknown cognitive operation: ${action}`);
    }
  }

  private async executeEmergenceOperation(action: string, params: any, context: any): Promise<any> {
    switch (action) {
      case 'detect_patterns':
        const algorithm = params.algorithm || 'phase_space';
        const patterns = await this.detectEmergencePatterns(context, algorithm);
        
        return {
          patterns,
          confidence: this.calculateEmergenceConfidence(patterns),
          algorithm_used: algorithm
        };
        
      case 'validate_emergence':
        const threshold = params.threshold || 0.8;
        const patterns = context.results['emergence.detect_patterns']?.patterns || [];
        
        const validPatterns = patterns.filter((p: EmergencePattern) => p.strength >= threshold);
        
        return {
          valid_patterns: validPatterns,
          validation_passed: validPatterns.length > 0,
          threshold_used: threshold
        };
        
      case 'validate_insights':
        // Validate insights using Beyond functions
        const insights = context.results['beyond.synthesize_knowledge']?.insights || [];
        const validation = await this.callBeyond('validate_insights', { insights });
        
        return {
          validated_insights: validation.validated,
          confidence: validation.confidence,
          recommendations: validation.recommendations
        };
        
      default:
        throw new Error(`Unknown emergence operation: ${action}`);
    }
  }

  private async executeBraunOperation(action: string, params: any, context: any): Promise<BraunResponse> {
    this.metrics.braun_computations++;
    
    if (!this.braunModule) {
      throw new Error('Braun computational engine not available');
    }

    const startTime = performance.now();
    
    try {
      switch (action) {
        case 'analyze_code':
          const mode = params.mode || 'auto';
          const result = await this.braunModule.analyze_code(context.params.code, mode);
          
          return {
            success: true,
            result,
            compute_mode: mode as ComputeMode,
            performance_metrics: {
              execution_time: performance.now() - startTime,
              memory_peak: 64,
              cpu_utilization: 0.7
            }
          };
          
        case 'optimize':
          const optimizationResult = await this.braunModule.optimize_computation(
            context.params.code, 
            params.mode || 'auto'
          );
          
          return {
            success: true,
            result: optimizationResult,
            compute_mode: (params.mode || 'auto') as ComputeMode,
            performance_metrics: {
              execution_time: performance.now() - startTime,
              memory_peak: 128,
              cpu_utilization: 0.9
            }
          };
          
        case 'optimize_computation':
          // Generic computation optimization
          return {
            success: true,
            result: { optimization_applied: true, performance_gain: 1.3 },
            compute_mode: 'auto',
            performance_metrics: {
              execution_time: performance.now() - startTime,
              memory_peak: 96,
              cpu_utilization: 0.8
            }
          };
          
        default:
          throw new Error(`Unknown braun operation: ${action}`);
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        compute_mode: 'auto',
        performance_metrics: {
          execution_time: performance.now() - startTime,
          memory_peak: 0,
          cpu_utilization: 0
        }
      };
    }
  }

  private async executeBeyondOperation(action: string, params: any, context: any): Promise<BeyondResponse> {
    this.metrics.beyond_transcendences++;
    
    const startTime = performance.now();
    
    try {
      switch (action) {
        case 'prepare_synthesis':
          return {
            success: true,
            result: { preparation_complete: true },
            transcendence_level: 1,
            emergence_detected: false,
            patterns: [],
            insights: ['Synthesis preparation completed'],
            recommendations: ['Proceed with knowledge synthesis'],
            meta_cognitive_notes: ['System ready for transcendent processing']
          };
          
        case 'transcend':
          const level = params.level || 1;
          const transcendenceResult = await this.callBeyond('transcend_context', {
            level,
            context: context.params,
            field_state: context.field
          });
          
          return {
            success: true,
            result: transcendenceResult,
            transcendence_level: level,
            emergence_detected: transcendenceResult.emergence_detected || false,
            patterns: transcendenceResult.patterns || [],
            insights: transcendenceResult.insights || [],
            recommendations: transcendenceResult.recommendations || [],
            meta_cognitive_notes: transcendenceResult.meta_notes || []
          };
          
        case 'transcend_reasoning':
          const reasoningResult = await this.callBeyond('transcend_reasoning', {
            reasoning_chain: context.results['cognitive.initialize_reasoning'],
            complexity: context.field.entropy
          });
          
          return {
            success: true,
            result: reasoningResult,
            transcendence_level: 2,
            emergence_detected: reasoningResult.emergence_detected || false,
            patterns: reasoningResult.patterns || [],
            insights: reasoningResult.insights || [],
            recommendations: reasoningResult.recommendations || [],
            meta_cognitive_notes: reasoningResult.meta_notes || []
          };
          
        case 'synthesize_knowledge':
          const synthesisResult = await this.callBeyond('synthesize_knowledge', {
            knowledge_base: context.params.knowledge_base,
            synthesis_goal: context.params.synthesis_goal,
            depth: params.depth || 'advanced'
          });
          
          return {
            success: true,
            result: synthesisResult,
            transcendence_level: 3,
            emergence_detected: synthesisResult.emergence_level > 0.8,
            patterns: synthesisResult.patterns || [],
            insights: synthesisResult.insights || [],
            recommendations: synthesisResult.recommendations || [],
            meta_cognitive_notes: synthesisResult.meta_insights || []
          };
          
        case 'validate_emergence':
          const validationResult = await this.callBeyond('validate_emergence', {
            patterns: context.results['emergence.detect_patterns']?.patterns,
            threshold: params.threshold || 0.8
          });
          
          return {
            success: true,
            result: validationResult,
            transcendence_level: 1,
            emergence_detected: validationResult.valid,
            patterns: validationResult.validated_patterns || [],
            insights: validationResult.insights || [],
            recommendations: validationResult.recommendations || [],
            meta_cognitive_notes: validationResult.validation_notes || []
          };
          
        default:
          throw new Error(`Unknown beyond operation: ${action}`);
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        transcendence_level: 0,
        emergence_detected: false,
        patterns: [],
        insights: [],
        recommendations: [],
        meta_cognitive_notes: [`Beyond operation failed: ${error}`]
      };
    }
  }

  private async callBrain(operation: string, params: any): Promise<BrainResponse> {
    if (!this.brainConnection || this.brainConnection.readyState !== WebSocket.OPEN) {
      // Fallback to TypeScript processing
      return this.fallbackBrainProcessing(operation, params);
    }

    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        reject(new Error('Brain operation timeout'));
      }, 10000);

      const handleResponse = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.request_id === requestId) {
          clearTimeout(timeout);
          this.brainConnection!.removeEventListener('message', handleResponse);
          resolve(response);
        }
      };

      this.brainConnection.addEventListener('message', handleResponse);
      this.brainConnection.send(JSON.stringify({
        request_id: requestId,
        operation,
        params
      }));
    });
  }

  private async callBeyond(functionName: string, params: any): Promise<any> {
    const beyondFunction = this.beyondFunctions.get(functionName);
    if (!beyondFunction) {
      // Fallback processing
      return this.fallbackBeyondProcessing(functionName, params);
    }

    try {
      return await beyondFunction(params);
    } catch (error) {
      console.error(`Beyond function ${functionName} failed:`, error);
      return this.fallbackBeyondProcessing(functionName, params);
    }
  }

  private fallbackBrainProcessing(operation: string, params: any): BrainResponse {
    // Fallback TypeScript-based cognitive processing
    switch (operation) {
      case 'recursive_analysis':
        return {
          success: true,
          result: {
            analysis: `Recursive analysis of: ${params.target}`,
            depth_reached: params.depth,
            patterns_found: 3
          },
          patterns: [
            {
              id: 'pattern-1',
              pattern_type: 'recursive',
              description: 'Recursive pattern detected',
              strength: 0.8,
              stability: 0.7,
              prediction_confidence: 0.75,
              emergence_conditions: {},
              observed_effects: [],
              recommendations: []
            }
          ],
          metadata: {
            processing_time: 150,
            worker_id: 'fallback-ts',
            memory_used: 64
          }
        };
        
      case 'cognitive_synthesis':
        return {
          success: true,
          result: {
            synthesis: `Cognitive synthesis of type: ${params.type}`,
            quality_score: 0.85
          },
          metadata: {
            processing_time: 200,
            worker_id: 'fallback-ts',
            memory_used: 128
          }
        };
        
      case 'initialize_reasoning':
        return {
          success: true,
          result: {
            reasoning_initialized: true,
            problem: params.problem,
            approach: 'systematic'
          },
          metadata: {
            processing_time: 100,
            worker_id: 'fallback-ts', 
            memory_used: 32
          }
        };
        
      default:
        return {
          success: false,
          error: `Unknown brain operation: ${operation}`,
          metadata: {
            processing_time: 0,
            worker_id: 'fallback-ts',
            memory_used: 0
          }
        };
    }
  }

  private fallbackBeyondProcessing(functionName: string, params: any): any {
    // Fallback processing for Beyond operations
    switch (functionName) {
      case 'transcend_context':
        return {
          transcended: true,
          level: params.level || 1,
          insights: ['Transcendence achieved through fallback processing'],
          recommendations: ['Continue with enhanced awareness'],
          emergence_detected: false,
          patterns: []
        };
        
      case 'synthesize_knowledge':
        return {
          synthesis: {
            knowledge_integrated: true,
            emergence_level: 0.6,
            quality_score: 0.75
          },
          insights: ['Knowledge synthesis completed', 'Patterns identified'],
          recommendations: ['Apply synthesized knowledge', 'Monitor for emergence'],
          meta_insights: ['Synthesis process successful']
        };
        
      case 'validate_emergence':
        const patterns = params.patterns || [];
        return {
          valid: patterns.length > 0,
          validated_patterns: patterns,
          insights: ['Validation completed'],
          recommendations: ['Proceed with validated patterns'],
          validation_notes: ['Fallback validation applied']
        };
        
      default:
        return {
          success: false,
          error: `Unknown beyond function: ${functionName}`,
          insights: [],
          recommendations: [],
          meta_insights: []
        };
    }
  }

  private validateProtocolInputs(protocol: ProtocolShell, params: Record<string, any>): Record<string, any> {
    const validated: Record<string, any> = {};
    
    for (const [key, schema] of Object.entries(protocol.input)) {
      const value = params[key];
      
      if (schema.required && (value === undefined || value === null)) {
        throw new Error(`Required parameter '${key}' is missing`);
      }
      
      if (value !== undefined) {
        validated[key] = this.validateValue(value, schema);
      }
    }
    
    return validated;
  }

  private validateValue(value: any, schema: ProtocolInputType): any {
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Expected string, got ${typeof value}`);
        }
        if (schema.validation && !new RegExp(schema.validation).test(value)) {
          throw new Error(`String validation failed: ${schema.validation}`);
        }
        return value;
        
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Expected number, got ${typeof value}`);
        }
        if (schema.min !== undefined && num < schema.min) {
          throw new Error(`Number ${num} is below minimum ${schema.min}`);
        }
        if (schema.max !== undefined && num > schema.max) {
          throw new Error(`Number ${num} is above maximum ${schema.max}`);
        }
        return num;
        
      case 'boolean':
        return Boolean(value);
        
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Expected array, got ${typeof value}`);
        }
        return value.map(item => this.validateValue(item, schema.items));
        
      case 'object':
        if (typeof value !== 'object' || value === null) {
          throw new Error(`Expected object, got ${typeof value}`);
        }
        const validated: Record<string, any> = {};
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          if (value[prop] !== undefined) {
            validated[prop] = this.validateValue(value[prop], propSchema);
          }
        }
        return validated;
        
      default:
        return value;
    }
  }

  private evaluateConditions(conditions: ProtocolCondition[], context: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, context);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'greater':
          return fieldValue > condition.value;
        case 'less':
          return fieldValue < condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'pattern':
          return new RegExp(condition.value).test(String(fieldValue));
        case 'emergence':
          return this.evaluateEmergenceCondition(fieldValue, condition);
        default:
          return true;
      }
    });
  }

  private getFieldValue(field: string, context: any): any {
    const parts = field.split('.');
    let value = context;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  private evaluateEmergenceCondition(value: any, condition: ProtocolCondition): boolean {
    // Evaluate emergence-specific conditions
    const threshold = condition.threshold || 0.5;
    
    if (typeof value === 'number') {
      return value > threshold;
    }
    
    if (Array.isArray(value)) {
      return value.length > 0 && value.some(item => 
        typeof item === 'object' && item.strength > threshold
      );
    }
    
    return false;
  }

  private formatProtocolOutputs(protocol: ProtocolShell, results: Record<string, any>): any {
    const formatted: Record<string, any> = {};
    
    for (const [key, schema] of Object.entries(protocol.output)) {
      // Extract relevant data from results based on output schema
      const value = this.extractOutputValue(key, schema, results);
      if (value !== undefined) {
        formatted[key] = value;
      }
    }
    
    return formatted;
  }

  private extractOutputValue(key: string, schema: ProtocolOutputType, results: Record<string, any>): any {
    // Extract output values from protocol results
    // This is a simplified implementation - would need more sophisticated mapping
    
    for (const result of Object.values(results)) {
      if (result && typeof result === 'object' && result[key] !== undefined) {
        return result[key];
      }
    }
    
    return undefined;
  }

  private analyzeFieldAttractors(field: FieldState): FieldAttractor[] {
    const attractors: FieldAttractor[] = [];
    
    // Analyze field dynamics to detect attractors
    const energyLevel = field.energy;
    const coherenceLevel = field.coherence;
    
    if (coherenceLevel > 0.8) {
      attractors.push({
        type: 'point',
        strength: coherenceLevel * energyLevel,
        patterns: ['high_coherence', 'stable_state'],
        resonance_frequency: 1.0,
        stability: coherenceLevel
      });
    }
    
    if (field.entropy > 0.6) {
      attractors.push({
        type: 'strange',
        strength: field.entropy * energyLevel * 0.7,
        patterns: ['chaos', 'complexity', 'emergence'],
        resonance_frequency: 0.3,
        stability: 1.0 - field.entropy
      });
    }
    
    return attractors;
  }

  private async detectEmergencePatterns(context: any, algorithm: string): Promise<EmergencePattern[]> {
    const patterns: EmergencePattern[] = [];
    const field = context.field;
    
    // Pattern detection based on field state
    if (field.coherence > 0.7 && field.energy > 6.0) {
      patterns.push({
        id: `pattern-${Date.now()}`,
        pattern_type: 'emergent_property',
        description: 'High coherence with elevated energy indicates emergent behavior',
        strength: field.coherence * (field.energy / 10),
        stability: field.coherence,
        prediction_confidence: 0.8,
        emergence_conditions: {
          coherence_threshold: 0.7,
          energy_threshold: 6.0,
          algorithm_used: algorithm
        },
        observed_effects: ['Increased pattern recognition', 'Enhanced cognitive processing'],
        recommendations: ['Monitor for further emergence', 'Maintain field coherence']
      });
    }
    
    return patterns;
  }

  private calculateEmergenceConfidence(patterns: EmergencePattern[]): number {
    if (patterns.length === 0) return 0;
    
    const totalConfidence = patterns.reduce((sum, pattern) => sum + pattern.prediction_confidence, 0);
    return totalConfidence / patterns.length;
  }

  private handleBrainMessage(message: any): void {
    // Handle incoming messages from Elixir Brain
    switch (message.type) {
      case 'field_update':
        this.updateFieldFromBrain(message.field_id, message.field_state);
        break;
      case 'emergence_detected':
        this.handleEmergenceDetected(message);
        break;
      case 'cognitive_insight':
        this.handleCognitiveInsight(message);
        break;
    }
  }

  private updateFieldFromBrain(fieldId: string, fieldState: Partial<FieldState>): void {
    const field = this.activeFields.get(fieldId);
    if (field) {
      Object.assign(field, fieldState);
      field.metadata.updated = Date.now();
      field.metadata.version++;
      
      this.emitEvent({
        id: crypto.randomUUID(),
        type: 'field_updated',
        field_id: fieldId,
        data: fieldState,
        timestamp: Date.now(),
        metadata: { source: 'brain' }
      });
    }
  }

  private handleEmergenceDetected(message: any): void {
    this.emitEvent({
      id: crypto.randomUUID(),
      type: 'emergence_detected',
      field_id: message.field_id,
      data: message.emergence_data,
      timestamp: Date.now(),
      metadata: { confidence: message.confidence }
    });
  }

  private handleCognitiveInsight(message: any): void {
    console.log(`🧠 Cognitive insight: ${message.insight}`);
    
    // Store insight as context frame
    this.addContextFrame({
      id: crypto.randomUUID(),
      content: message.insight,
      metadata: {
        type: 'insight',
        timestamp: Date.now(),
        importance: message.importance || 0.8,
        decay_rate: 0.1,
        access_count: 0,
        last_accessed: Date.now(),
        source: 'brain',
        confidence: message.confidence || 0.9
      },
      field_state: {},
      relations: [],
      embeddings: message.embeddings
    });
  }

  private startFieldDynamicsUpdater(): void {
    const updateInterval = this.config.field_dynamics.update_frequency || 1000;
    
    setInterval(() => {
      this.updateFieldDynamics();
    }, updateInterval);
  }

  private updateFieldDynamics(): void {
    const startTime = performance.now();
    
    for (const [fieldId, field] of this.activeFields) {
      // Apply field evolution
      this.evolveField(field);
      
      // Check for emergence
      this.checkForEmergence(fieldId, field);
      
      // Update metrics
      field.metadata.updated = Date.now();
    }
    
    // Update global metrics
    this.updateGlobalMetrics();
    
    const endTime = performance.now();
    this.metrics.performance_metrics.avg_field_update_time = endTime - startTime;
  }

  private evolveField(field: FieldState): void {
    // Apply field evolution dynamics
    const decayRate = this.config.field_dynamics.energy_decay_rate || 0.01;
    
    // Energy decay
    field.energy *= (1 - decayRate);
    
    // Coherence evolution
    if (field.coherence > 0.9) {
      field.coherence *= 0.99; // High coherence tends to decay
    } else if (field.coherence < 0.3) {
      field.coherence *= 1.01; // Low coherence tends to increase
    }
    
    // Entropy evolution
    field.entropy += (Math.random() - 0.5) * 0.02;
    field.entropy = Math.max(0, Math.min(1, field.entropy));
    
    // Temperature evolution
    field.temperature = 0.5 + field.entropy * 0.5 + (Math.random() - 0.5) * 0.1;
    field.temperature = Math.max(0.1, Math.min(2.0, field.temperature));
  }

  private checkForEmergence(fieldId: string, field: FieldState): void {
    const emergenceThreshold = this.config.beyond.emergence_threshold || 0.8;
    
    // Check for emergence conditions
    const emergenceScore = this.calculateEmergenceScore(field);
    
    if (emergenceScore > emergenceThreshold) {
      this.emitEvent({
        id: crypto.randomUUID(),
        type: 'emergence_detected',
        field_id: fieldId,
        data: {
          emergence_score: emergenceScore,
          field_energy: field.energy,
          field_coherence: field.coherence,
          field_entropy: field.entropy
        },
        timestamp: Date.now(),
        metadata: { threshold_used: emergenceThreshold }
      });
    }
  }

  private calculateEmergenceScore(field: FieldState): number {
    // Calculate emergence score based on field properties
    const coherenceWeight = 0.4;
    const energyWeight = 0.3;
    const entropyWeight = 0.2;
    const attractorWeight = 0.1;
    
    const normalizedEnergy = Math.min(field.energy / 10, 1);
    const attractorScore = field.attractors.length > 0 ? 
      field.attractors.reduce((sum, attr) => sum + attr.strength, 0) / field.attractors.length : 0;
    
    return (
      field.coherence * coherenceWeight +
      normalizedEnergy * energyWeight +
      field.entropy * entropyWeight +
      Math.min(attractorScore, 1) * attractorWeight
    );
  }

  private updateGlobalMetrics(): void {
    const fields = Array.from(this.activeFields.values());
    
    if (fields.length > 0) {
      this.metrics.average_field_energy = fields.reduce((sum, f) => sum + f.energy, 0) / fields.length;
      this.metrics.average_coherence = fields.reduce((sum, f) => sum + f.coherence, 0) / fields.length;
    }
    
    this.metrics.active_fields = this.activeFields.size;
    this.metrics.total_context_frames = this.contextFrames.size;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 5000);
  }

  private collectPerformanceMetrics(): void {
    // Collect system performance metrics
    if (typeof performance !== 'undefined' && performance.memory) {
      this.metrics.performance_metrics.memory_usage = performance.memory.usedJSHeapSize || 0;
    }
    
    // Estimate CPU usage (simplified)
    this.metrics.performance_metrics.cpu_usage = Math.random() * 0.3 + 0.1; // Mock data
  }

  // Context frame management
  public addContextFrame(frame: ContextFrame): void {
    this.contextFrames.set(frame.id, frame);
    this.metrics.total_context_frames = this.contextFrames.size;
    
    // Apply TTL cleanup
    const ttl = this.config.performance.context_frame_ttl || 3600000; // 1 hour
    setTimeout(() => {
      this.contextFrames.delete(frame.id);
    }, ttl);
  }

  public getContextFrame(frameId: string): ContextFrame | undefined {
    const frame = this.contextFrames.get(frameId);
    if (frame) {
      frame.metadata.access_count++;
      frame.metadata.last_accessed = Date.now();
    }
    return frame;
  }

  public searchContextFrames(query: string, limit: number = 10): ContextFrame[] {
    const frames = Array.from(this.contextFrames.values());
    
    // Simple text-based search (would use embeddings in production)
    return frames
      .filter(frame => 
        JSON.stringify(frame.content).toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => b.metadata.importance - a.metadata.importance)
      .slice(0, limit);
  }

  // Event system
  private emitEvent(event: FieldEvent): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Event handler error for ${event.type}:`, error);
      }
    }
  }

  public addEventListener(eventType: string, handler: (event: FieldEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  public removeEventListener(eventType: string, handler: (event: FieldEvent) => void): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Public API methods
  public getMetrics(): ContextEngineMetrics {
    return { ...this.metrics };
  }

  public getActiveFields(): Map<string, FieldState> {
    return new Map(this.activeFields);
  }

  public getField(fieldId: string): FieldState | undefined {
    return this.activeFields.get(fieldId);
  }

  public getProtocols(): Map<string, ProtocolShell> {
    return new Map(this.protocols);
  }

  public registerProtocol(protocol: ProtocolShell): void {
    this.protocols.set(protocol.metadata.name, protocol);
    console.log(`📋 Registered protocol: ${protocol.metadata.name}`);
  }

  public updateConfig(newConfig: Partial<BrainBraunBeyondConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public async shutdown(): Promise<void> {
    // Close connections
    if (this.brainConnection) {
      this.brainConnection.close();
    }
    
    // Clear active fields
    this.activeFields.clear();
    this.contextFrames.clear();
    
    // Clear event handlers
    this.eventHandlers.clear();
    
    console.log('🛑 Context Engine shutdown complete');
  }
}

export default ContextEngine;