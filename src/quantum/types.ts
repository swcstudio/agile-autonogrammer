/**
 * Quantum Computing Types for Kanban Code
 * These types represent quantum states, superpositions, and entanglements
 */

/**
 * Complex number representation for quantum amplitudes
 */
export interface ComplexNumber {
  real: number;
  imaginary: number;
}

/**
 * Quantum state with superposition properties
 */
export interface QuantumState {
  id: string;
  amplitude: ComplexNumber;
  phase: number;
  basisStates: string[];
  entangledWith: string[];
  coherence: number;
  metadata: Record<string, any>;
}

/**
 * Quantum task that can exist in multiple states simultaneously
 */
export interface QuantumTask {
  id: string;
  title: string;
  description: string;
  states: QuantumState[];
  probabilityDistribution: number[];
  entangledAgents: string[];
  measurementBasis: 'computational' | 'hadamard' | 'custom';
  collapsed: boolean;
  result?: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Quantum context for managing superposition and entanglement
 */
export interface QuantumContext {
  superposition: TaskState[];
  entanglement: AgentConnection[];
  coherence: number;
  measurement: () => CollapsedState;
  decoherenceRate: number;
}

/**
 * Task state in superposition
 */
export interface TaskState {
  taskId: string;
  possibleStates: string[];
  amplitudes: ComplexNumber[];
  probability: number;
  entanglements: string[];
}

/**
 * Agent connection for entanglement
 */
export interface AgentConnection {
  agent1: string;
  agent2: string;
  entanglementStrength: number;
  bellState: 'Φ+' | 'Φ-' | 'Ψ+' | 'Ψ-';
  correlationMatrix: number[][];
}

/**
 * Collapsed state after measurement
 */
export interface CollapsedState {
  taskId: string;
  finalState: string;
  probability: number;
  measurementTime: Date;
  observables: Record<string, any>;
}

/**
 * Quantum kernel for computation
 */
export interface QuantumKernel {
  name: string;
  computation: (input: any) => Promise<any>;
  inputDim: number;
  outputDim: number;
  cudaEnabled: boolean;
  wasmCompatible: boolean;
  optimizationLevel: number;
}

/**
 * Quantum agent message for inter-agent communication
 */
export interface QuantumAgentMessage {
  id: string;
  source: string;
  target: string;
  quantumState: {
    superposition: QuantumState[];
    entanglement: string[];
    coherence: number;
  };
  payload: any;
  timestamp: number;
  signature: string;
}

/**
 * Quantum circuit representation
 */
export interface QuantumCircuit {
  qubits: number;
  gates: QuantumGate[];
  measurements: Measurement[];
}

/**
 * Quantum gate operation
 */
export interface QuantumGate {
  type: 'H' | 'X' | 'Y' | 'Z' | 'CNOT' | 'T' | 'S' | 'RX' | 'RY' | 'RZ' | 'CUSTOM';
  targets: number[];
  controls?: number[];
  parameters?: number[];
  matrix?: ComplexNumber[][];
}

/**
 * Measurement operation
 */
export interface Measurement {
  qubit: number;
  basis: 'Z' | 'X' | 'Y' | 'custom';
  operator?: ComplexNumber[][];
}

/**
 * ZKML proof for quantum computation
 */
export interface ZKMLProof {
  model: string;
  proof: Uint8Array;
  publicInputs: any[];
  publicOutputs: any[];
  verificationKey: string;
  verify: () => Promise<boolean>;
}

/**
 * Quantum computation result
 */
export interface QuantumResult {
  taskId: string;
  measuredState: string;
  probability: number;
  computationTime: number;
  resourcesUsed: {
    qubits: number;
    gates: number;
    depth: number;
    shots: number;
  };
  metadata: Record<string, any>;
}