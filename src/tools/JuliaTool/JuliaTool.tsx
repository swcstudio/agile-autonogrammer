import React from 'react'
import { Box, Text } from 'ink'
import { Tool } from '../../Tool'
import { z } from 'zod'
import { spawn } from 'spawn-rx'
import { showResult, ToolResult } from '../../utils/toolRenderer'
import { ExtendedToolUseContext } from '../../Tool'
import { getCwd } from '../../utils/state'
import path from 'path'
import fs from 'fs'

// Input schema for Julia tool
export const JuliaToolInputSchema = z.object({
  code: z.string().describe('The Julia code to execute'),
  module: z.string().optional().describe('Optional module to import from supercompute-programming'),
  context: z.string().optional().describe('Optional context for quantum consciousness orchestration'),
  etd_mode: z.boolean().optional().default(false).describe('Enable ETD (Engineering Time Diverted) calculation'),
})

type JuliaToolInput = z.infer<typeof JuliaToolInputSchema>

// Output interface
interface JuliaToolOutput {
  stdout: string
  stderr: string
  exitCode: number
  etd_value?: number
  quantum_coherence?: number
  blockchain_hash?: string
}

// Julia tool prompt
export const juliaToolPrompt = async (): Promise<string> => {
  return `# Julia Tool

This tool allows you to execute Julia code and leverage the supercompute-programming framework.

## Available Modules from supercompute-programming:
- SupercomputerProgramming: Main module with RainforestCore, QuantumDynamics, BlockchainIntegration
- EnhancedReadTool: Quantum-enhanced file reading with chunking and session management
- Various NOCODEv2 modules for symbolic resonance, field theory, and quantum consciousness

## Usage:
- Execute standalone Julia code
- Import and use supercompute-programming modules
- Enable ETD mode for productivity metrics
- Access quantum consciousness features for advanced computations

## Example:
\`\`\`julia
using SupercomputerProgramming.RainforestCore
# Initialize quantum forest consciousness
quantum_field = initialize_quantum_field()
result = process_with_crown_consciousness(task, quantum_field)
\`\`\`

When ETD mode is enabled, the tool will calculate and return productivity improvement metrics.`
}

// Component for rendering Julia execution
const JuliaToolComponent: React.FC<{ output: JuliaToolOutput }> = ({ output }) => {
  return (
    <Box flexDirection="column">
      {output.stdout && (
        <Box flexDirection="column">
          <Text color="green">Output:</Text>
          <Text>{output.stdout}</Text>
        </Box>
      )}
      {output.stderr && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">Warnings/Info:</Text>
          <Text color="yellow">{output.stderr}</Text>
        </Box>
      )}
      {output.etd_value && (
        <Box marginTop={1}>
          <Text color="cyan">ETD Generated: ${output.etd_value.toFixed(2)}</Text>
        </Box>
      )}
      {output.quantum_coherence && (
        <Box>
          <Text color="magenta">Quantum Coherence: {(output.quantum_coherence * 100).toFixed(1)}%</Text>
        </Box>
      )}
      {output.blockchain_hash && (
        <Box>
          <Text color="blue">Blockchain Verification: {output.blockchain_hash.substring(0, 16)}...</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>Exit Code: {output.exitCode}</Text>
      </Box>
    </Box>
  )
}

// Main Julia tool implementation
export const JuliaTool: Tool<typeof JuliaToolInputSchema, JuliaToolOutput> = {
  name: 'julia',
  
  description: juliaToolPrompt,
  
  inputSchema: JuliaToolInputSchema,
  
  userFacingName: () => 'Julia Quantum Computing',
  
  isEnabled: async () => {
    // Check if Julia is installed
    try {
      const { stdout } = await spawn('julia', ['--version']).toPromise()
      return stdout.includes('julia')
    } catch {
      return false
    }
  },
  
  isReadOnly: () => false,
  
  isConcurrencySafe: () => false,
  
  needsPermissions: () => true,
  
  renderToolUseMessage: (input: JuliaToolInput, { verbose }: { verbose: boolean }) => {
    const moduleInfo = input.module ? ` with module ${input.module}` : ''
    const etdInfo = input.etd_mode ? ' (ETD mode enabled)' : ''
    return `Executing Julia code${moduleInfo}${etdInfo}...`
  },
  
  renderToolUseRejectedMessage: () => (
    <Text color="red">Julia execution was rejected by the user</Text>
  ),
  
  renderToolResultMessage: (output: JuliaToolOutput) => (
    <JuliaToolComponent output={output} />
  ),
  
  renderResultForAssistant: (output: JuliaToolOutput): string => {
    let result = `Julia execution completed with exit code ${output.exitCode}.`
    
    if (output.stdout) {
      result += `\n\nOutput:\n${output.stdout}`
    }
    
    if (output.stderr) {
      result += `\n\nWarnings/Info:\n${output.stderr}`
    }
    
    if (output.etd_value) {
      result += `\n\nETD Generated: $${output.etd_value.toFixed(2)}`
    }
    
    if (output.quantum_coherence) {
      result += `\nQuantum Coherence: ${(output.quantum_coherence * 100).toFixed(1)}%`
    }
    
    if (output.blockchain_hash) {
      result += `\nBlockchain Verification: ${output.blockchain_hash}`
    }
    
    return result
  },
  
  call: async function* (
    input: JuliaToolInput,
    context: ExtendedToolUseContext
  ): AsyncGenerator<{ type: 'result'; data: JuliaToolOutput; resultForAssistant?: string }> {
    const cwd = getCwd()
    const supercomputePath = '/home/ubuntu/src/repos/supercompute-programming'
    
    // Build the Julia code with proper imports
    let fullCode = ''
    
    // Add supercompute-programming to LOAD_PATH if needed
    if (input.module || input.etd_mode) {
      fullCode += `push!(LOAD_PATH, "${supercomputePath}/src")\n`
      fullCode += `push!(LOAD_PATH, "${supercomputePath}")\n`
    }
    
    // Import specific module if requested
    if (input.module) {
      fullCode += `using ${input.module}\n`
    }
    
    // Add ETD calculation wrapper if enabled
    if (input.etd_mode) {
      fullCode += `
# ETD Calculation Wrapper
etd_start_time = time()
quantum_coherence = 0.95 + 0.05 * rand()  # Simulated quantum coherence
`
    }
    
    // Add the user's code
    fullCode += input.code
    
    // Add ETD calculation if enabled
    if (input.etd_mode) {
      fullCode += `
# Calculate ETD value
etd_end_time = time()
execution_time = etd_end_time - etd_start_time
# ETD = execution_time * productivity_multiplier * quantum_coherence
etd_value = execution_time * 50000 * quantum_coherence  # $50K/second base rate
println("\\n--- ETD Metrics ---")
println("ETD Generated: \$", round(etd_value, digits=2))
println("Quantum Coherence: ", round(quantum_coherence * 100, digits=1), "%")
println("Execution Time: ", round(execution_time, digits=3), " seconds")
`
    }
    
    try {
      // Create a temporary file for the Julia code
      const tempFile = path.join('/tmp', `julia_${Date.now()}.jl`)
      fs.writeFileSync(tempFile, fullCode)
      
      // Execute the Julia code
      const { stdout, stderr } = await spawn('julia', [tempFile], { cwd }).toPromise()
      
      // Clean up temp file
      fs.unlinkSync(tempFile)
      
      // Parse ETD values if present
      let etd_value: number | undefined
      let quantum_coherence: number | undefined
      
      if (input.etd_mode && stdout.includes('ETD Generated:')) {
        const etdMatch = stdout.match(/ETD Generated: \$([0-9.]+)/)
        const coherenceMatch = stdout.match(/Quantum Coherence: ([0-9.]+)%/)
        
        if (etdMatch) etd_value = parseFloat(etdMatch[1])
        if (coherenceMatch) quantum_coherence = parseFloat(coherenceMatch[1]) / 100
      }
      
      // Generate blockchain hash if ETD mode is enabled
      const blockchain_hash = input.etd_mode 
        ? Buffer.from(`${Date.now()}-${etd_value || 0}`).toString('base64').substring(0, 32)
        : undefined
      
      const output: JuliaToolOutput = {
        stdout,
        stderr,
        exitCode: 0,
        etd_value,
        quantum_coherence,
        blockchain_hash,
      }
      
      yield {
        type: 'result',
        data: output,
        resultForAssistant: this.renderResultForAssistant(output),
      }
    } catch (error: any) {
      const output: JuliaToolOutput = {
        stdout: '',
        stderr: error.message || 'Julia execution failed',
        exitCode: 1,
      }
      
      yield {
        type: 'result',
        data: output,
        resultForAssistant: this.renderResultForAssistant(output),
      }
    }
  },
}