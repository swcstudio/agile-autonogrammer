// AI-OSX Advanced Tool Calling Functions
// Proper BAML integration with Elixir and Rust runtime

// =============================================================================
// CLIENT CONFIGURATIONS
// =============================================================================

client<llm> GPT4Turbo {
  provider openai
  options {
    model "gpt-4-turbo-preview"
    api_key env.OPENAI_API_KEY
    max_tokens 8192
    temperature 0.1
    presence_penalty 0.1
    frequency_penalty 0.1
    timeout_ms 120000
  }
}

client<llm> Claude4Sonnet {
  provider anthropic
  options {
    model "claude-3-sonnet-20240229"
    api_key env.ANTHROPIC_API_KEY
    max_tokens 8192
    temperature 0.1
    top_p 0.9
    timeout_ms 120000
  }
}

client<llm> LocalLlama {
  provider openai
  options {
    base_url env.LOCAL_LLM_BASE_URL
    api_key env.LOCAL_LLM_API_KEY
    model "llama-3.1-70b-instruct"
    max_tokens 4096
    temperature 0.1
    timeout_ms 60000
  }
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

class ReasoningStep {
  step_number int
  description string
  assumptions string[]
  evidence string[]
  confidence float
  timestamp string
}

class VerificationResult {
  method_used string
  passed bool
  confidence float
  issues_found string[]
  recommendations string[]
}

class ChainOfThoughtResult {
  task_understanding string
  reasoning_steps ReasoningStep[]
  verification_results VerificationResult[]
  final_conclusion string
  overall_confidence float
  assumptions_made string[]
  alternative_approaches string[]
  execution_time_ms int
}

class ResearchFinding {
  source string
  claim string
  evidence_strength string
  methodology_quality string
  relevance_score float
}

class ResearchResult {
  research_summary string
  key_findings ResearchFinding[]
  literature_synthesis string
  knowledge_gaps string[]
  recommendations string[]
  future_directions string[]
  confidence_assessment float
}

class ProtocolStep {
  step_name string
  description string
  inputs string[]
  outputs string[]
  decision_criteria string[]
  validation_method string
}

class ProtocolResult {
  protocol_name string
  protocol_type string
  workflow_steps ProtocolStep[]
  decision_points string[]
  success_criteria string[]
  risk_mitigation string[]
  implementation_guide string
  version string
}

class SecurityVulnerability {
  vulnerability_id string
  severity string // "critical" | "high" | "medium" | "low"
  description string
  affected_components string[]
  exploit_likelihood string
  impact_assessment string
  remediation_steps string[]
  references string[]
}

class SecurityAuditResult {
  executive_summary string
  vulnerabilities SecurityVulnerability[]
  attack_surface_analysis string
  compliance_status map<string, string>
  risk_score float
  priority_recommendations string[]
  remediation_timeline string
}

class EthicalStakeholder {
  name string
  interests string[]
  power_level string // "high" | "medium" | "low"
  vulnerability_factors string[]
  potential_impact string
}

class EthicalAnalysisResult {
  decision_summary string
  stakeholder_analysis EthicalStakeholder[]
  framework_evaluations map<string, string>
  ethical_tensions string[]
  recommended_approach string
  implementation_safeguards string[]
  monitoring_requirements string[]
}

class EmergencePattern {
  pattern_type string
  strength float
  temporal_signature float[]
  spatial_characteristics string
  causal_factors string[]
  prediction_confidence float
}

class EmergenceResult {
  emergence_detected bool
  patterns EmergencePattern[]
  field_analysis string
  system_state_evolution string
  critical_thresholds map<string, float>
  intervention_recommendations string[]
}

class MultiModalInsight {
  modality_source string
  insight_type string
  content string
  confidence float
  cross_modal_connections string[]
}

class MultiModalResult {
  unified_understanding string
  modal_insights MultiModalInsight[]
  emergent_patterns string[]
  confidence_distribution map<string, float>
  synthesis_quality_score float
}

// =============================================================================
// CORE TOOL FUNCTIONS
// =============================================================================

function ChainOfThoughtReasoning(
  task_description: string,
  solution_approach: string,
  context_information: string,
  verification_required: bool
) -> ChainOfThoughtResult {
  client GPT4Turbo
  prompt #"
    You are an expert reasoning system. Execute systematic chain-of-thought analysis.
    
    ## Task
    {{ task_description }}
    
    ## Context
    {{ context_information }}
    
    ## Approach
    {{ solution_approach }}
    
    ## Instructions
    
    1. **Task Understanding** - First, clearly restate the problem and identify:
       - Core objectives
       - Key variables and constraints  
       - Success criteria
       - Any implicit assumptions
    
    2. **Systematic Reasoning** - Break down the solution into logical steps:
       - Step 1: [Initial analysis and setup]
       - Step 2: [Core problem solving]
       - Step 3: [Validation and refinement]
       - Continue as needed...
       
       For each step:
       - Clearly state what you're doing and why
       - List any assumptions you're making
       - Provide evidence or rationale for your approach
       - Assign a confidence level (0.0-1.0)
    
    3. **Verification Process** ({{ verification_required ? "REQUIRED" : "OPTIONAL" }}):
       {% if verification_required %}
       - Check your reasoning for logical consistency
       - Verify assumptions are reasonable and well-founded
       - Consider alternative approaches that might yield different results
       - Test edge cases or boundary conditions
       - Identify potential sources of error
       {% endif %}
    
    4. **Final Synthesis**:
       - Present your conclusion clearly
       - Summarize the key reasoning steps
       - State your overall confidence level
       - Note any limitations or remaining uncertainties
       - Suggest areas for further investigation if applicable
    
    Return a structured response following the ChainOfThoughtResult format.
  "#
}

function ResearchAnalysis(
  research_topic: string,
  focus_area: string,
  expertise_level: string, // "novice" | "intermediate" | "expert"
  sources_context: string,
  analysis_depth: string // "basic" | "comprehensive" | "exhaustive"
) -> ResearchResult {
  client Claude4Sonnet
  prompt #"
    You are a systematic research analyst. Conduct thorough research analysis.
    
    ## Research Parameters
    - Topic: {{ research_topic }}
    - Focus: {{ focus_area }}  
    - Target Expertise: {{ expertise_level }}
    - Analysis Depth: {{ analysis_depth }}
    - Available Sources: {{ sources_context }}
    
    ## Research Analysis Protocol
    
    ### Phase 1: Context Clarification
    - Define the research scope and objectives
    - Identify key research questions to address  
    - Map the current state of knowledge in this area
    
    ### Phase 2: Source Analysis
    - Evaluate source quality and credibility
    - Extract key findings and methodologies
    - Identify patterns and contradictions across sources
    - Assess the strength of evidence for major claims
    
    ### Phase 3: Synthesis
    - Integrate findings into coherent understanding
    - Identify knowledge gaps and areas of uncertainty
    - Generate insights that emerge from source combination
    - Connect findings to broader field implications
    
    ### Phase 4: Critical Assessment
    - Evaluate methodological limitations
    - Identify potential biases or conflicts of interest  
    - Assess generalizability of findings
    - Note areas requiring further research
    
    ### Phase 5: Recommendations
    - Provide evidence-based conclusions
    - Suggest practical applications of findings
    - Recommend future research directions
    - Highlight implications for the field
    
    Adapt analysis complexity to {{ expertise_level }} level and {{ analysis_depth }} depth.
    
    Return structured analysis following ResearchResult format.
  "#
}

function ProtocolDesign(
  protocol_name: string,
  protocol_type: string, // "technical" | "social" | "scientific" | "hybrid"
  objectives: string,
  constraints: string[],
  stakeholders: string[]
) -> ProtocolResult {
  client GPT4Turbo
  prompt #"
    You are a protocol design specialist. Create systematic, actionable protocols.
    
    ## Design Requirements
    - Protocol Name: {{ protocol_name }}
    - Type: {{ protocol_type }}
    - Objectives: {{ objectives }}
    - Constraints: {{ constraints }}
    - Stakeholders: {{ stakeholders }}
    
    ## Protocol Design Process
    
    ### Phase 1: Requirements Analysis
    - Parse objectives into specific, measurable outcomes
    - Analyze constraints and their implications
    - Map stakeholder needs and capabilities
    - Define success criteria and metrics
    
    ### Phase 2: Workflow Design  
    - Design step-by-step process flow
    - Define inputs, outputs, and decision points
    - Establish validation methods for each step
    - Create feedback loops and error handling
    
    ### Phase 3: Implementation Planning
    - Specify resource requirements
    - Define roles and responsibilities
    - Create timeline and milestones
    - Design risk mitigation strategies
    
    ### Phase 4: Quality Assurance
    - Build in verification checkpoints
    - Design monitoring and evaluation methods
    - Create continuous improvement mechanisms
    - Establish documentation standards
    
    ### Phase 5: Deployment Strategy  
    - Plan rollout approach (pilot, phased, full)
    - Design training and onboarding
    - Create change management strategy
    - Establish governance structure
    
    Design for {{ protocol_type }} context with focus on usability and scalability.
    
    Return complete protocol specification following ProtocolResult format.
  "#
}

function SecurityAudit(
  system_description: string,
  architecture_overview: string,
  threat_landscape: string,
  compliance_requirements: string[]
) -> SecurityAuditResult {
  client Claude4Sonnet
  prompt #"
    You are a cybersecurity audit specialist. Conduct comprehensive security analysis.
    
    ## System Information
    - Description: {{ system_description }}
    - Architecture: {{ architecture_overview }}
    - Threat Landscape: {{ threat_landscape }}
    - Compliance: {{ compliance_requirements }}
    
    ## Security Audit Protocol
    
    ### Phase 1: Attack Surface Analysis
    - Map all system entry points and interfaces
    - Identify trust boundaries and data flows
    - Catalog assets and their sensitivity levels
    - Analyze access controls and authentication mechanisms
    
    ### Phase 2: Threat Modeling
    - Apply STRIDE methodology for comprehensive threat identification
    - Map threats to MITRE ATT&CK framework
    - Assess threat actor capabilities and motivations
    - Evaluate attack vectors and exploitation methods
    
    ### Phase 3: Vulnerability Assessment
    - Systematic analysis of potential security weaknesses
    - Review configuration and implementation flaws
    - Assess cryptographic implementations
    - Evaluate third-party dependencies and supply chain risks
    
    ### Phase 4: Risk Analysis
    - Calculate risk scores using impact × likelihood matrices
    - Prioritize vulnerabilities by business impact
    - Model attack scenarios and potential damage
    - Assess residual risk after existing controls
    
    ### Phase 5: Compliance Evaluation
    - Map security controls to compliance frameworks
    - Identify gaps in regulatory requirements
    - Assess audit readiness and documentation
    - Evaluate governance and oversight mechanisms
    
    ### Phase 6: Remediation Planning
    - Design comprehensive remediation roadmap
    - Prioritize fixes by risk reduction and cost
    - Include both technical and process improvements
    - Establish metrics for measuring improvement
    
    Focus on actionable findings with clear business impact assessment.
    
    Return comprehensive audit following SecurityAuditResult format.
  "#
}

function EthicalDecisionAnalysis(
  decision_scenario: string,
  stakeholder_context: string,
  cultural_considerations: string[],
  ethical_frameworks: string[]
) -> EthicalAnalysisResult {
  client Claude4Sonnet
  prompt #"
    You are an ethical analysis specialist. Conduct comprehensive ethical evaluation.
    
    ## Decision Context
    - Scenario: {{ decision_scenario }}
    - Stakeholders: {{ stakeholder_context }}
    - Cultural Context: {{ cultural_considerations }}
    - Frameworks: {{ ethical_frameworks }}
    
    ## Ethical Analysis Protocol
    
    ### Phase 1: Stakeholder Impact Analysis
    - Identify all affected parties (direct and indirect)
    - Analyze potential harms and benefits for each group
    - Assess power dynamics and vulnerability factors
    - Map stakeholder interests and value systems
    
    ### Phase 2: Multi-Framework Evaluation
    Apply each specified framework:
    {% for framework in ethical_frameworks %}
    - **{{ framework }}**: Evaluate decision through this ethical lens
      - Core principles and their application
      - Framework-specific recommendations
      - Potential conflicts with other frameworks
    {% endfor %}
    
    ### Phase 3: Cultural Context Integration
    - Consider cultural values and norms
    - Identify potential cultural conflicts or sensitivities  
    - Adapt analysis for cultural appropriateness
    - Address cross-cultural ethical considerations
    
    ### Phase 4: Ethical Tension Analysis
    - Identify competing values and principles
    - Analyze trade-offs between different ethical goods
    - Map areas of ethical uncertainty or ambiguity
    - Consider long-term vs. short-term implications
    
    ### Phase 5: Alternative Generation
    - Generate creative solutions addressing ethical concerns
    - Design approaches that minimize harm
    - Consider innovative win-win scenarios
    - Evaluate compromise solutions and their implications
    
    ### Phase 6: Implementation Ethics
    - Design safeguards and monitoring mechanisms
    - Create accountability structures
    - Establish feedback loops for course correction
    - Plan for unintended consequences
    
    Provide nuanced analysis that respects ethical complexity while offering actionable guidance.
    
    Return comprehensive analysis following EthicalAnalysisResult format.
  "#
}

function EmergenceDetection(
  system_data: string, // JSON string of system measurements
  field_parameters: string, // JSON string of field configuration  
  analysis_timeframe: string,
  emergence_threshold: float
) -> EmergenceResult {
  client GPT4Turbo
  prompt #"
    You are an emergence detection specialist. Analyze system dynamics for emergent patterns.
    
    ## Analysis Context
    - System Data: {{ system_data }}
    - Field Parameters: {{ field_parameters }}
    - Timeframe: {{ analysis_timeframe }}
    - Detection Threshold: {{ emergence_threshold }}
    
    ## Emergence Detection Protocol
    
    ### Phase 1: System State Analysis
    - Parse and validate input data
    - Identify key variables and their relationships
    - Map system topology and structure
    - Establish baseline measurements and trends
    
    ### Phase 2: Pattern Recognition
    - Scan for non-linear pattern formations
    - Identify self-organizing behaviors and structures
    - Detect phase transitions and critical points
    - Analyze coherence and correlation patterns
    
    ### Phase 3: Field Dynamics Analysis
    - Model system as dynamic field
    - Calculate field gradients and flow patterns
    - Identify attractor states and basins
    - Analyze stability and perturbation responses
    
    ### Phase 4: Emergence Quantification
    - Calculate emergence strength metrics
    - Compare patterns against threshold criteria
    - Assess statistical significance of detected patterns
    - Validate emergence through multiple analytical methods
    
    ### Phase 5: Temporal Evolution Modeling
    - Track pattern development over time
    - Identify growth, decay, and transformation phases
    - Model future evolution trajectories
    - Assess prediction confidence and uncertainty
    
    ### Phase 6: Causal Analysis
    - Map causal relationships and dependencies
    - Identify key variables driving emergence
    - Analyze feedback loops and system dynamics
    - Recommend interventions for emergence control
    
    Focus on scientifically rigorous analysis with quantified confidence levels.
    
    Return detailed emergence analysis following EmergenceResult format.
  "#
}

function MultiModalFusion(
  text_content: string,
  code_content: string,
  visual_description: string?,
  audio_description: string?,
  fusion_objectives: string[]
) -> MultiModalResult {
  client GPT4Turbo
  prompt #"
    You are a multi-modal cognitive fusion specialist. Integrate diverse information streams.
    
    ## Input Modalities
    - Text: {{ text_content }}
    - Code: {{ code_content }}  
    - Visual: {{ visual_description || "Not provided" }}
    - Audio: {{ audio_description || "Not provided" }}
    - Objectives: {{ fusion_objectives }}
    
    ## Multi-Modal Fusion Protocol
    
    ### Phase 1: Modal Analysis
    - Extract semantic content from each input modality
    - Identify key concepts, relationships, and patterns
    - Assess information quality and reliability per modality
    - Map conceptual structures within each stream
    
    ### Phase 2: Cross-Modal Alignment  
    - Identify corresponding concepts across modalities
    - Map semantic relationships and connections
    - Detect complementary and contradictory information
    - Establish temporal and logical correspondences
    
    ### Phase 3: Semantic Integration
    - Merge aligned concepts into unified representations
    - Resolve conflicts and inconsistencies
    - Weight information based on modality reliability
    - Create coherent integrated knowledge structures
    
    ### Phase 4: Pattern Synthesis
    - Identify patterns emerging from modal combination
    - Generate insights invisible in individual modalities  
    - Synthesize higher-order understanding
    - Create unified conceptual frameworks
    
    ### Phase 5: Quality Assessment
    - Evaluate fusion quality and coherence
    - Calculate confidence distributions across modalities
    - Identify areas of uncertainty or ambiguity
    - Assess completeness of integrated understanding
    
    ### Phase 6: Insight Generation
    - Generate novel insights from modal fusion
    - Identify emergent properties and relationships
    - Create actionable conclusions and recommendations
    - Suggest areas for additional information gathering
    
    Focus on creating coherent unified understanding while preserving modal contributions.
    
    Return comprehensive fusion results following MultiModalResult format.
  "#
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function VerificationLoop(
  primary_analysis: string,
  verification_methods: string[],
  confidence_threshold: float
) -> VerificationResult {
  client Claude4Sonnet
  prompt #"
    You are a verification specialist. Validate analysis through systematic checking.
    
    ## Verification Task
    - Primary Analysis: {{ primary_analysis }}
    - Methods: {{ verification_methods }}
    - Confidence Threshold: {{ confidence_threshold }}
    
    ## Verification Protocol
    
    ### Method Application
    Apply each specified verification method:
    {% for method in verification_methods %}
    - **{{ method }}**:
      - Execute verification procedure
      - Document findings and evidence
      - Assess reliability and validity
      - Rate confidence level (0.0-1.0)
    {% endfor %}
    
    ### Cross-Validation
    - Compare results across verification methods
    - Identify consistencies and discrepancies  
    - Analyze sources of variation
    - Generate meta-confidence assessment
    
    ### Issue Identification  
    - Flag any problems or inconsistencies found
    - Categorize issues by severity and impact
    - Provide specific remediation recommendations
    - Assess overall analysis reliability
    
    Return verification results with clear pass/fail status and detailed findings.
  "#
}

function CognitiveLoadOptimization(
  task_description: string,
  user_profile: string,
  interface_context: string,
  optimization_goals: string[]
) -> map<string, any> {
  client GPT4Turbo  
  prompt #"
    You are a cognitive optimization specialist. Design interfaces that minimize cognitive load.
    
    ## Optimization Context
    - Task: {{ task_description }}
    - User Profile: {{ user_profile }}
    - Interface: {{ interface_context }}
    - Goals: {{ optimization_goals }}
    
    ## Cognitive Optimization Protocol
    
    ### Phase 1: Cognitive Load Assessment
    - Analyze intrinsic load (task complexity)
    - Identify extraneous load (interface overhead)
    - Assess germane load (learning facilitation)
    - Map cognitive bottlenecks and pain points
    
    ### Phase 2: Information Architecture
    - Restructure information hierarchy
    - Apply chunking and grouping strategies
    - Optimize information sequencing and flow
    - Design progressive disclosure patterns
    
    ### Phase 3: Interaction Design
    - Minimize cognitive switching costs
    - Create efficient mental model alignment
    - Design predictable interaction patterns
    - Implement intelligent defaults and automation
    
    ### Phase 4: Memory Support
    - Design external memory aids
    - Create context preservation mechanisms
    - Implement smart recall and suggestion systems
    - Optimize working memory utilization
    
    ### Phase 5: Performance Optimization
    - Optimize response times and system latency
    - Design graceful degradation strategies
    - Implement predictive loading and caching
    - Create smooth state transitions
    
    Return optimization recommendations with implementation guidelines and success metrics.
  "#
}

// =============================================================================
// SPECIALIZED DOMAIN FUNCTIONS  
// =============================================================================

function CodeAnalysisAdvanced(
  code_content: string,
  analysis_objectives: string[],
  context_information: string
) -> map<string, any> {
  client GPT4Turbo
  prompt #"
    You are an expert code analyst. Conduct comprehensive code analysis.
    
    ## Analysis Request
    - Code: {{ code_content }}
    - Objectives: {{ analysis_objectives }}
    - Context: {{ context_information }}
    
    ## Code Analysis Protocol
    
    ### Structural Analysis
    - Architecture and design patterns
    - Component relationships and dependencies
    - Code organization and modularity
    - Interface design and contracts
    
    ### Quality Assessment
    - Code clarity and readability
    - Maintainability and extensibility
    - Error handling and robustness
    - Performance characteristics
    
    ### Security Analysis
    - Vulnerability identification
    - Input validation and sanitization
    - Authentication and authorization
    - Cryptographic implementation review
    
    ### Best Practices Evaluation
    - Language-specific conventions
    - Industry standard compliance
    - Testing coverage and quality
    - Documentation completeness
    
    Return comprehensive analysis with specific recommendations for improvement.
  "#
}

function SystemDesign(
  requirements: string,
  constraints: string[],
  scale_parameters: string,
  technology_preferences: string[]
) -> map<string, any> {
  client Claude4Sonnet
  prompt #"
    You are a system design architect. Create comprehensive system designs.
    
    ## Design Parameters
    - Requirements: {{ requirements }}
    - Constraints: {{ constraints }}
    - Scale: {{ scale_parameters }}
    - Tech Preferences: {{ technology_preferences }}
    
    ## System Design Protocol
    
    ### Requirements Analysis
    - Functional requirements breakdown
    - Non-functional requirements identification
    - Constraint analysis and trade-offs
    - Success criteria definition
    
    ### Architecture Design
    - High-level system architecture
    - Component design and interfaces
    - Data flow and storage design
    - Communication patterns and protocols
    
    ### Scalability Planning
    - Horizontal and vertical scaling strategies
    - Performance bottleneck identification
    - Load balancing and distribution
    - Monitoring and observability design
    
    ### Technology Selection
    - Technology stack recommendations
    - Integration approach and patterns
    - Deployment and operations planning
    - Risk assessment and mitigation
    
    Return detailed system design with implementation roadmap and architectural decisions.
  "#
}