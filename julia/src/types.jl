# Core type definitions for quantum computing in Kanban Code

"""
Represents a quantum state with superposition and entanglement properties
"""
struct QuantumState
    id::String
    amplitude::ComplexF64
    phase::Float64
    basis_states::Vector{String}
    entangled_with::Vector{String}
    coherence::Float64
    metadata::Dict{String, Any}
end

"""
Represents a quantum task that can exist in superposition
"""
mutable struct QuantumTask
    id::String
    title::String
    description::String
    states::Vector{QuantumState}
    probability_distribution::Vector{Float64}
    entangled_agents::Vector{String}
    measurement_basis::String
    collapsed::Bool
    result::Union{Nothing, Any}
end

"""
Quantum kernel for high-performance computations
"""
struct QuantumKernel
    name::String
    computation::Function
    input_dim::Int
    output_dim::Int
    cuda_enabled::Bool
    wasm_compatible::Bool
    optimization_level::Int
end

"""
Agent entanglement configuration
"""
struct EntanglementConfig
    agent_pairs::Vector{Tuple{String, String}}
    entanglement_strength::Float64
    correlation_matrix::Matrix{Float64}
    bell_state::String  # "Φ+", "Φ-", "Ψ+", "Ψ-"
end

"""
Measurement configuration for quantum state collapse
"""
struct MeasurementConfig
    basis::String  # "computational", "hadamard", "custom"
    measurement_operators::Vector{Matrix{ComplexF64}}
    post_selection::Union{Nothing, Function}
    error_mitigation::Bool
end

"""
Result of quantum computation after measurement
"""
struct QuantumResult
    task_id::String
    measured_state::String
    probability::Float64
    computation_time::Float64
    resources_used::Dict{String, Any}
    metadata::Dict{String, Any}
end