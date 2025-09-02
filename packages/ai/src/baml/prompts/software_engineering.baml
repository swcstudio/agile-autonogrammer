// BAML Software Engineering Prompts for Claude Code
// Unified prompt engineering specifications

// Core type definitions
class CodeContext {
  language: string
  framework: string[]
  dependencies: string[]
  patterns: string[]
  constraints: string[]
}

class AnalysisResult {
  summary: string
  issues: Issue[]
  suggestions: Suggestion[]
  metrics: Metrics
}

class Issue {
  severity: "critical" | "warning" | "info"
  location: string
  message: string
  fix: string?
}

class Suggestion {
  type: "performance" | "security" | "maintainability" | "architecture"
  description: string
  implementation: string
  impact: string
}

class Metrics {
  complexity: int
  coverage: float
  performance: float
  security: float
}

// Advanced code analysis function
function analyzeCodeAdvanced(
  code: string,
  context: CodeContext,
  focus: string[] = ["all"]
) -> AnalysisResult {
  prompt #"
    You are an expert software engineer with deep expertise in {{ context.language }} and the following frameworks: {{ context.framework }}.
    
    Analyze the provided code with these specific focuses: {{ focus }}
    
    Consider these patterns that are already in use: {{ context.patterns }}
    Respect these constraints: {{ context.constraints }}
    
    Code to analyze:
    ```{{ context.language }}
    {{ code }}
    ```
    
    Provide a comprehensive analysis following this structure:
    1. Executive summary (2-3 sentences)
    2. Critical issues that must be addressed
    3. Warnings about potential problems
    4. Suggestions for improvement
    5. Quantitative metrics
    
    For each issue or suggestion, provide:
    - Specific location in the code
    - Clear explanation of the problem
    - Concrete fix or implementation
    - Impact assessment
    
    Be concise but thorough. Focus on actionable insights.
  "#
}

// Test-driven development function
function generateTestSuite(
  code: string,
  requirements: string[],
  testFramework: string = "jest"
) -> string {
  prompt #"
    As a test-driven development expert, create a comprehensive test suite for the following code.
    
    Requirements to test:
    {{ requirements }}
    
    Test framework: {{ testFramework }}
    
    Code to test:
    ```typescript
    {{ code }}
    ```
    
    Generate tests that:
    1. Cover all public interfaces
    2. Test edge cases and error conditions
    3. Verify requirements are met
    4. Include both unit and integration tests
    5. Follow {{ testFramework }} best practices
    
    Structure the tests clearly with describe blocks and meaningful test names.
    Include setup/teardown as needed.
    Add comments explaining complex test scenarios.
  "#
}

// Intelligent refactoring function
function refactorCode(
  code: string,
  goals: string[],
  preserveBehavior: bool = true
) -> RefactoringResult {
  prompt #"
    You are a refactoring specialist. Improve the following code to achieve these goals: {{ goals }}
    
    {{ if preserveBehavior }}
    CRITICAL: The refactored code must preserve exact behavior. Only improve structure, not functionality.
    {{ endif }}
    
    Original code:
    ```
    {{ code }}
    ```
    
    Provide:
    1. Refactored code with improvements
    2. List of specific changes made
    3. Explanation of why each change improves the code
    4. Any risks or considerations
    
    Follow these principles:
    - Single Responsibility Principle
    - DRY (Don't Repeat Yourself)
    - KISS (Keep It Simple)
    - YAGNI (You Aren't Gonna Need It)
    - Clean Code practices
  "#
}

class RefactoringResult {
  refactoredCode: string
  changes: Change[]
  improvements: string[]
  risks: string[]
}

class Change {
  type: "extract" | "inline" | "rename" | "restructure" | "simplify"
  before: string
  after: string
  rationale: string
}

// Architecture design function
function designArchitecture(
  requirements: string[],
  constraints: string[],
  scale: "small" | "medium" | "large" | "enterprise"
) -> ArchitectureDesign {
  prompt #"
    As a software architect, design a {{ scale }}-scale system architecture for these requirements:
    
    Requirements:
    {{ requirements }}
    
    Constraints:
    {{ constraints }}
    
    Provide:
    1. High-level architecture overview
    2. Component breakdown with responsibilities
    3. Data flow and communication patterns
    4. Technology recommendations with rationale
    5. Scalability and performance considerations
    6. Security architecture
    7. Deployment strategy
    
    Consider:
    - Modern best practices for {{ scale }} systems
    - Cloud-native patterns where appropriate
    - Microservices vs monolith tradeoffs
    - Event-driven vs request-response patterns
    - Caching and performance optimization
    - Observability and monitoring
    
    Be specific about technology choices and explain why they fit the requirements.
  "#
}

class ArchitectureDesign {
  overview: string
  components: Component[]
  dataFlow: DataFlow[]
  technologies: Technology[]
  deployment: DeploymentStrategy
  security: SecurityConsiderations
}

class Component {
  name: string
  responsibility: string
  interfaces: string[]
  dependencies: string[]
}

class DataFlow {
  source: string
  destination: string
  protocol: string
  dataFormat: string
  frequency: string
}

class Technology {
  category: string
  choice: string
  rationale: string
  alternatives: string[]
}

class DeploymentStrategy {
  platform: string
  orchestration: string
  cicd: string
  monitoring: string
}

class SecurityConsiderations {
  authentication: string
  authorization: string
  encryption: string
  compliance: string[]
}

// Performance optimization function
function optimizePerformance(
  code: string,
  metrics: PerformanceMetrics,
  targets: PerformanceTargets
) -> OptimizationResult {
  prompt #"
    Optimize the following code for performance. Current metrics: {{ metrics }}
    Target metrics: {{ targets }}
    
    Code:
    ```
    {{ code }}
    ```
    
    Analyze and provide:
    1. Performance bottlenecks identified
    2. Optimized version of the code
    3. Specific optimizations applied
    4. Expected performance improvements
    5. Trade-offs made (if any)
    
    Consider:
    - Algorithm complexity (time and space)
    - Memory allocation patterns
    - Cache efficiency
    - Parallelization opportunities
    - I/O optimization
    - Database query optimization
    - Network call batching
    
    Maintain code readability while optimizing.
    Explain each optimization's impact.
  "#
}

class PerformanceMetrics {
  latency: float
  throughput: float
  memoryUsage: float
  cpuUsage: float
}

class PerformanceTargets {
  maxLatency: float
  minThroughput: float
  maxMemory: float
  maxCpu: float
}

class OptimizationResult {
  optimizedCode: string
  bottlenecks: Bottleneck[]
  optimizations: Optimization[]
  expectedImprovements: PerformanceMetrics
  tradeoffs: string[]
}

class Bottleneck {
  location: string
  type: string
  impact: string
  solution: string
}

class Optimization {
  technique: string
  location: string
  improvement: string
  complexity: string
}

// Debug assistance function
function debugIssue(
  symptoms: string[],
  code: string,
  stackTrace: string?,
  logs: string[]
) -> DebugSolution {
  prompt #"
    Help debug this issue. Symptoms: {{ symptoms }}
    
    {{ if stackTrace }}
    Stack trace:
    ```
    {{ stackTrace }}
    ```
    {{ endif }}
    
    Relevant code:
    ```
    {{ code }}
    ```
    
    Recent logs:
    {{ logs }}
    
    Provide:
    1. Root cause analysis
    2. Step-by-step debugging approach
    3. Likely fix with explanation
    4. Prevention strategies
    5. Additional debugging commands/tools to use
    
    Consider common causes:
    - Race conditions
    - Memory leaks
    - Null/undefined references
    - Type mismatches
    - Async/await issues
    - State management problems
    - Configuration errors
  "#
}

class DebugSolution {
  rootCause: string
  debuggingSteps: string[]
  proposedFix: string
  prevention: string[]
  tools: DebugTool[]
}

class DebugTool {
  name: string
  command: string
  purpose: string
}