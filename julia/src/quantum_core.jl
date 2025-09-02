# Core quantum computing operations

"""
Initialize a quantum state in superposition
"""
function create_superposition(basis_states::Vector{String}, amplitudes::Vector{ComplexF64})
    @assert length(basis_states) == length(amplitudes) "Basis states and amplitudes must have same length"
    @assert abs(sum(abs2.(amplitudes)) - 1.0) < 1e-10 "Amplitudes must be normalized"
    
    states = QuantumState[]
    for (i, (state, amp)) in enumerate(zip(basis_states, amplitudes))
        push!(states, QuantumState(
            string(uuid4()),
            amp,
            angle(amp),
            [state],
            String[],
            1.0,
            Dict{String, Any}()
        ))
    end
    return states
end

"""
Apply a quantum gate operation to a state
"""
function apply_gate(state::QuantumState, gate::Matrix{ComplexF64})
    # Convert state to vector representation
    state_vec = [state.amplitude]
    
    # Apply gate
    new_vec = gate * state_vec
    
    # Create new state with updated amplitude
    return QuantumState(
        state.id,
        new_vec[1],
        angle(new_vec[1]),
        state.basis_states,
        state.entangled_with,
        state.coherence,
        state.metadata
    )
end

"""
Common quantum gates
"""
const HADAMARD = (1/√2) * [1 1; 1 -1]
const PAULI_X = [0 1; 1 0]
const PAULI_Y = [0 -im; im 0]
const PAULI_Z = [1 0; 0 -1]
const CNOT = [1 0 0 0; 0 1 0 0; 0 0 0 1; 0 0 1 0]

"""
Calculate quantum fidelity between two states
"""
function fidelity(state1::QuantumState, state2::QuantumState)
    return abs(conj(state1.amplitude) * state2.amplitude)^2
end

"""
Perform quantum state tomography
"""
function state_tomography(measurements::Vector{QuantumResult})
    # Reconstruct density matrix from measurements
    n_qubits = length(measurements[1].measured_state)
    dim = 2^n_qubits
    density_matrix = zeros(ComplexF64, dim, dim)
    
    for result in measurements
        state_vec = state_to_vector(result.measured_state)
        density_matrix += result.probability * (state_vec * state_vec')
    end
    
    return density_matrix
end

"""
Convert a basis state string to vector representation
"""
function state_to_vector(state::String)
    n = length(state)
    dim = 2^n
    vec = zeros(ComplexF64, dim)
    idx = parse(Int, state, base=2) + 1
    vec[idx] = 1.0
    return vec
end

"""
Calculate von Neumann entropy of a quantum state
"""
function von_neumann_entropy(density_matrix::Matrix{ComplexF64})
    eigenvals = eigvals(Hermitian(density_matrix))
    # Filter out numerical zeros
    eigenvals = filter(λ -> λ > 1e-10, real.(eigenvals))
    return -sum(λ * log(λ) for λ in eigenvals)
end

"""
Quantum phase estimation algorithm
"""
function phase_estimation(unitary::Matrix{ComplexF64}, eigenstate::Vector{ComplexF64}, n_bits::Int)
    dim = size(unitary, 1)
    n_samples = 2^n_bits
    
    phases = Float64[]
    for k in 0:(n_samples-1)
        # Apply controlled unitary k times
        phase = 0.0
        for j in 0:(n_bits-1)
            if (k >> j) & 1 == 1
                eigenstate = unitary^(2^j) * eigenstate
                phase += angle(eigenstate[1]) * 2^j
            end
        end
        push!(phases, mod(phase, 2π))
    end
    
    return phases
end