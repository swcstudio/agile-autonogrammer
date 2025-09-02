module KanbanQuantum

using PythonCall
using CUDA
using JSON3
using HTTP
using Distributed
using LinearAlgebra
using Statistics
using Random

# Export main types and functions
export QuantumTask, QuantumState, QuantumKernel, SuperpositionManager
export execute_quantum_kernel, compile_to_wasm, measure_and_collapse
export entangle_agents, quantum_parallel_execute

# Include submodules
include("types.jl")
include("quantum_core.jl")
include("superposition.jl")
include("entanglement.jl")
include("wasm_compiler.jl")
include("cuda_kernels.jl")
include("python_bridge.jl")

"""
Initialize the KanbanQuantum module with GPU support if available
"""
function __init__()
    if CUDA.functional()
        @info "CUDA GPU detected and initialized for quantum computations"
        CUDA.allowscalar(false)  # Disallow scalar operations on GPU for performance
    else
        @info "Running in CPU mode - GPU not available"
    end
    
    # Initialize Python bridge if needed
    init_python_bridge()
end

"""
Main entry point for quantum task execution
"""
function quantum_execute(task_json::String)
    task = JSON3.read(task_json, QuantumTask)
    manager = SuperpositionManager(task)
    
    # Execute in superposition
    quantum_states = prepare_superposition(manager)
    
    # Entangle with other agents if needed
    if !isempty(task.entangled_agents)
        quantum_states = entangle_agents(quantum_states, task.entangled_agents)
    end
    
    # Execute quantum kernel
    results = quantum_parallel_execute(quantum_states)
    
    # Measure and collapse to final state
    final_state = measure_and_collapse(results)
    
    return JSON3.write(final_state)
end

end # module