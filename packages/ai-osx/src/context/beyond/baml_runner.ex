defmodule AiOsx.Beyond.BamlRunner do
  @moduledoc """
  BAML (Behavioral AI Markup Language) runner for AI-OSX Beyond component.
  Handles transcendent reasoning functions callable from both Brain and Braun.
  """

  use GenServer
  require Logger

  alias AiOsx.Beyond.{
    BamlCompiler,
    BamlRuntime,
    ModelManager,
    ResultValidator
  }

  # State structure for BAML runner
  defstruct [
    :runtime,
    :model_clients,
    :function_registry,
    :execution_cache,
    :performance_metrics,
    :security_sandbox
  ]

  @type baml_function :: String.t()
  @type function_params :: map()
  @type execution_result :: {:ok, any()} | {:error, term()}

  ## Public API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @spec call(baml_function(), function_params()) :: execution_result()
  def call(function_name, params) do
    GenServer.call(__MODULE__, {:execute_function, function_name, params}, :infinity)
  end

  @spec register_function(String.t(), map()) :: :ok | {:error, term()}
  def register_function(function_name, function_definition) do
    GenServer.call(__MODULE__, {:register_function, function_name, function_definition})
  end

  @spec compile_baml_file(String.t()) :: :ok | {:error, term()}
  def compile_baml_file(file_path) do
    GenServer.call(__MODULE__, {:compile_baml_file, file_path})
  end

  @spec get_runtime_stats() :: map()
  def get_runtime_stats do
    GenServer.call(__MODULE__, :get_runtime_stats)
  end

  @spec warm_up_models() :: :ok
  def warm_up_models do
    GenServer.cast(__MODULE__, :warm_up_models)
  end

  ## GenServer Callbacks

  def init(_opts) do
    # Initialize BAML runtime and compile built-in functions
    baml_file_path = Path.join([Application.app_dir(:ai_osx), "priv", "baml", "BamlFunctions.baml"])
    
    state = %__MODULE__{
      runtime: BamlRuntime.new(),
      model_clients: ModelManager.initialize_clients(),
      function_registry: %{},
      execution_cache: :ets.new(:baml_cache, [:set, :private]),
      performance_metrics: initialize_metrics(),
      security_sandbox: initialize_security_sandbox()
    }

    case compile_baml_file_sync(baml_file_path, state) do
      {:ok, updated_state} ->
        Logger.info("BAML Runner initialized successfully with #{map_size(updated_state.function_registry)} functions")
        {:ok, updated_state}
      
      {:error, reason} ->
        Logger.error("Failed to initialize BAML Runner: #{inspect(reason)}")
        {:stop, reason}
    end
  end

  def handle_call({:execute_function, function_name, params}, from, state) do
    case Map.get(state.function_registry, function_name) do
      nil ->
        {:reply, {:error, :function_not_found}, state}
        
      function_def ->
        # Check cache first
        cache_key = generate_cache_key(function_name, params)
        
        case :ets.lookup(state.execution_cache, cache_key) do
          [{^cache_key, cached_result, timestamp}] when (System.monotonic_time(:second) - timestamp) < 300 ->
            Logger.debug("Cache hit for function #{function_name}")
            {:reply, {:ok, cached_result}, update_cache_metrics(state)}
            
          _ ->
            # Execute function asynchronously
            task = Task.async(fn ->
              execute_baml_function_safely(function_name, function_def, params, state)
            end)
            
            # Don't reply immediately - will be handled in handle_info
            new_state = track_execution(state, task.ref, from, function_name, cache_key)
            {:noreply, new_state}
        end
    end
  end

  def handle_call({:register_function, function_name, function_definition}, _from, state) do
    case validate_function_definition(function_definition) do
      :ok ->
        updated_registry = Map.put(state.function_registry, function_name, function_definition)
        new_state = %{state | function_registry: updated_registry}
        Logger.info("Registered BAML function: #{function_name}")
        {:reply, :ok, new_state}
        
      {:error, reason} ->
        Logger.warning("Failed to register function #{function_name}: #{inspect(reason)}")
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call({:compile_baml_file, file_path}, _from, state) do
    case compile_baml_file_sync(file_path, state) do
      {:ok, updated_state} ->
        {:reply, :ok, updated_state}
      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call(:get_runtime_stats, _from, state) do
    stats = %{
      registered_functions: map_size(state.function_registry),
      cache_size: :ets.info(state.execution_cache, :size),
      performance_metrics: state.performance_metrics,
      model_clients: ModelManager.get_client_stats(state.model_clients),
      runtime_health: BamlRuntime.health_check(state.runtime)
    }
    
    {:reply, stats, state}
  end

  def handle_cast(:warm_up_models, state) do
    # Warm up model clients with simple requests
    spawn(fn ->
      ModelManager.warm_up_clients(state.model_clients)
    end)
    
    {:noreply, state}
  end

  def handle_info({ref, result}, state) when is_reference(ref) do
    case pop_execution_tracking(state, ref) do
      {from, function_name, cache_key, updated_state} ->
        case result do
          {:ok, function_result} ->
            # Cache successful results
            timestamp = System.monotonic_time(:second)
            :ets.insert(state.execution_cache, {cache_key, function_result, timestamp})
            
            GenServer.reply(from, {:ok, function_result})
            
            # Update performance metrics
            new_metrics = update_execution_metrics(updated_state.performance_metrics, function_name, :success)
            final_state = %{updated_state | performance_metrics: new_metrics}
            
            {:noreply, final_state}
            
          {:error, reason} ->
            Logger.warning("BAML function #{function_name} failed: #{inspect(reason)}")
            GenServer.reply(from, {:error, reason})
            
            # Update performance metrics
            new_metrics = update_execution_metrics(updated_state.performance_metrics, function_name, :error)
            final_state = %{updated_state | performance_metrics: new_metrics}
            
            {:noreply, final_state}
        end
        
      nil ->
        Logger.warning("Received result for unknown execution: #{inspect(ref)}")
        {:noreply, state}
    end
  end

  def handle_info({:DOWN, ref, :process, _pid, reason}, state) do
    case pop_execution_tracking(state, ref) do
      {from, function_name, _cache_key, updated_state} ->
        Logger.error("BAML function #{function_name} crashed: #{inspect(reason)}")
        GenServer.reply(from, {:error, :execution_crashed})
        
        new_metrics = update_execution_metrics(updated_state.performance_metrics, function_name, :crash)
        final_state = %{updated_state | performance_metrics: new_metrics}
        
        {:noreply, final_state}
        
      nil ->
        {:noreply, state}
    end
  end

  ## Private Functions

  defp compile_baml_file_sync(file_path, state) do
    case File.read(file_path) do
      {:ok, baml_content} ->
        case BamlCompiler.compile(baml_content, state.runtime) do
          {:ok, compiled_functions} ->
            updated_registry = Map.merge(state.function_registry, compiled_functions)
            updated_state = %{state | function_registry: updated_registry}
            
            Logger.info("Compiled #{map_size(compiled_functions)} BAML functions from #{file_path}")
            {:ok, updated_state}
            
          {:error, compilation_errors} ->
            Logger.error("BAML compilation failed: #{inspect(compilation_errors)}")
            {:error, {:compilation_failed, compilation_errors}}
        end
        
      {:error, reason} ->
        Logger.error("Failed to read BAML file #{file_path}: #{inspect(reason)}")
        {:error, {:file_read_failed, reason}}
    end
  end

  defp execute_baml_function_safely(function_name, function_def, params, state) do
    start_time = System.monotonic_time(:microsecond)
    
    try do
      # Validate parameters
      case validate_function_params(function_def, params) do
        :ok ->
          # Security screening
          case security_screen_execution(function_name, params, state.security_sandbox) do
            :allowed ->
              # Execute the function
              result = execute_baml_function_core(function_name, function_def, params, state)
              
              # Validate result
              case ResultValidator.validate(result, function_def.return_type) do
                {:ok, validated_result} ->
                  execution_time = System.monotonic_time(:microsecond) - start_time
                  Logger.debug("BAML function #{function_name} executed successfully in #{execution_time}μs")
                  {:ok, validated_result}
                  
                {:error, validation_error} ->
                  Logger.warning("BAML function #{function_name} result validation failed: #{inspect(validation_error)}")
                  {:error, {:result_validation_failed, validation_error}}
              end
              
            {:blocked, reason} ->
              Logger.warning("BAML function #{function_name} blocked by security: #{inspect(reason)}")
              {:error, {:security_blocked, reason}}
          end
          
        {:error, param_error} ->
          Logger.warning("BAML function #{function_name} parameter validation failed: #{inspect(param_error)}")
          {:error, {:parameter_validation_failed, param_error}}
      end
    rescue
      e ->
        Logger.error("BAML function #{function_name} raised exception: #{inspect(e)}")
        {:error, {:execution_exception, e}}
    catch
      :exit, reason ->
        Logger.error("BAML function #{function_name} exited: #{inspect(reason)}")
        {:error, {:execution_exit, reason}}
    end
  end

  defp execute_baml_function_core(function_name, function_def, params, state) do
    case function_name do
      "CodeAnalysis" ->
        execute_code_analysis(params, function_def, state)
        
      "CognitiveReasoning" ->
        execute_cognitive_reasoning(params, function_def, state)
        
      "TranscendentSynthesis" ->
        execute_transcendent_synthesis(params, function_def, state)
        
      "EmergenceDetection" ->
        execute_emergence_detection(params, function_def, state)
        
      "QuantumInspiredOptimization" ->
        execute_quantum_optimization(params, function_def, state)
        
      "FieldDynamicsCalculation" ->
        execute_field_dynamics(params, function_def, state)
        
      "MultiModalFusion" ->
        execute_multimodal_fusion(params, function_def, state)
        
      "SecurityAnalysis" ->
        execute_security_analysis(params, function_def, state)
        
      "AdaptiveLearning" ->
        execute_adaptive_learning(params, function_def, state)
        
      "ProtocolShellExecution" ->
        execute_protocol_shell(params, function_def, state)
        
      _ ->
        # Generic BAML function execution
        execute_generic_baml_function(function_name, function_def, params, state)
    end
  end

  # Specific function implementations
  defp execute_code_analysis(params, function_def, state) do
    %{"code" => code, "context" => context, "focus" => focus} = params
    
    # Select appropriate model client
    client = ModelManager.select_client(state.model_clients, function_def.client)
    
    # Construct prompt
    prompt = build_code_analysis_prompt(code, context, focus)
    
    # Execute with model
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        # Parse and structure the response
        parse_code_analysis_response(raw_response)
        
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  defp execute_cognitive_reasoning(params, function_def, state) do
    %{"problem" => problem, "constraints" => constraints, "context" => context} = params
    
    client = ModelManager.select_client(state.model_clients, function_def.client)
    prompt = build_cognitive_reasoning_prompt(problem, constraints, context)
    
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        parse_cognitive_reasoning_response(raw_response)
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  defp execute_transcendent_synthesis(params, function_def, state) do
    %{"inputs" => inputs, "domain" => domain, "objective" => objective} = params
    
    client = ModelManager.select_client(state.model_clients, function_def.client)
    prompt = build_transcendent_synthesis_prompt(inputs, domain, objective)
    
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        parse_transcendent_synthesis_response(raw_response)
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  defp execute_emergence_detection(params, function_def, state) do
    %{"patterns" => patterns, "threshold" => threshold} = params
    
    client = ModelManager.select_client(state.model_clients, function_def.client)
    prompt = build_emergence_detection_prompt(patterns, threshold)
    
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        case parse_emergence_detection_response(raw_response) do
          {:ok, emergence_event} ->
            # Check if emergence strength exceeds threshold
            if emergence_event["emergence_strength"] >= threshold do
              emergence_event
            else
              nil
            end
          error ->
            error
        end
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  defp execute_quantum_optimization(params, _function_def, _state) do
    # Placeholder for quantum optimization - would integrate with Braun computational engine
    %{
      "optimal_solution" => [],
      "optimization_path" => [],
      "quantum_effects" => [],
      "convergence_metrics" => %{},
      "solution_quality" => %{},
      "computational_cost" => %{}
    }
  end

  defp execute_field_dynamics(params, _function_def, _state) do
    # Placeholder for field dynamics - would integrate with Braun computational engine
    %{
      "trajectory" => [],
      "stability_analysis" => %{},
      "energy_landscape" => [],
      "critical_points" => [],
      "phase_transitions" => [],
      "evolution_confidence" => 0.8
    }
  end

  defp execute_multimodal_fusion(params, function_def, state) do
    %{"text_input" => text, "code_input" => code} = params
    visual_data = Map.get(params, "visual_data")
    audio_data = Map.get(params, "audio_data")
    
    client = ModelManager.select_client(state.model_clients, function_def.client)
    prompt = build_multimodal_fusion_prompt(text, code, visual_data, audio_data)
    
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        parse_multimodal_fusion_response(raw_response)
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  defp execute_security_analysis(params, function_def, state) do
    %{"system_description" => system, "threat_model" => threat_model, "attack_vectors" => attack_vectors} = params
    
    client = ModelManager.select_client(state.model_clients, function_def.client)
    prompt = build_security_analysis_prompt(system, threat_model, attack_vectors)
    
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        parse_security_analysis_response(raw_response)
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  defp execute_adaptive_learning(params, function_def, state) do
    %{"experience_data" => experience, "performance_metrics" => metrics, "learning_objective" => objective} = params
    
    client = ModelManager.select_client(state.model_clients, function_def.client)
    prompt = build_adaptive_learning_prompt(experience, metrics, objective)
    
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        parse_adaptive_learning_response(raw_response)
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  defp execute_protocol_shell(params, function_def, state) do
    %{"protocol_name" => protocol_name, "parameters" => parameters, "context_state" => context_state} = params
    
    client = ModelManager.select_client(state.model_clients, function_def.client)
    prompt = build_protocol_shell_prompt(protocol_name, parameters, context_state)
    
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        parse_protocol_shell_response(raw_response)
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  defp execute_generic_baml_function(function_name, function_def, params, state) do
    client = ModelManager.select_client(state.model_clients, function_def.client)
    prompt = build_generic_prompt(function_def.prompt_template, params)
    
    case ModelManager.execute_prompt(client, prompt) do
      {:ok, raw_response} ->
        # Generic response parsing based on return type
        parse_generic_response(raw_response, function_def.return_type)
      {:error, reason} ->
        {:error, {:model_execution_failed, reason}}
    end
  end

  # Utility functions
  defp generate_cache_key(function_name, params) do
    content = "#{function_name}:#{Jason.encode!(params)}"
    :crypto.hash(:sha256, content) |> Base.encode16(case: :lower)
  end

  defp validate_function_definition(function_def) do
    required_keys = [:name, :prompt_template, :client, :return_type]
    
    case Enum.all?(required_keys, &Map.has_key?(function_def, &1)) do
      true -> :ok
      false -> {:error, :missing_required_fields}
    end
  end

  defp validate_function_params(function_def, params) do
    # Validate parameters against function definition schema
    case Map.get(function_def, :parameter_schema) do
      nil -> :ok
      schema -> validate_against_schema(params, schema)
    end
  end

  defp validate_against_schema(params, schema) do
    # Placeholder for JSON schema validation
    :ok
  end

  defp security_screen_execution(function_name, params, sandbox) do
    # Implement security screening logic
    case contains_sensitive_data?(params) do
      true -> {:blocked, :sensitive_data_detected}
      false -> :allowed
    end
  end

  defp contains_sensitive_data?(params) do
    # Placeholder for sensitive data detection
    false
  end

  defp track_execution(state, task_ref, from, function_name, cache_key) do
    # Store execution tracking info in state
    # This would require modifying state structure to include tracking
    state
  end

  defp pop_execution_tracking(state, task_ref) do
    # Retrieve and remove execution tracking info
    # This would require implementing execution tracking storage
    {self(), "test_function", "cache_key", state}
  end

  defp initialize_metrics do
    %{
      total_executions: 0,
      successful_executions: 0,
      failed_executions: 0,
      average_execution_time: 0.0,
      function_call_counts: %{},
      model_usage_stats: %{}
    }
  end

  defp initialize_security_sandbox do
    %{
      enabled: true,
      sensitive_patterns: [],
      blocked_operations: []
    }
  end

  defp update_cache_metrics(state) do
    # Update cache hit metrics
    state
  end

  defp update_execution_metrics(metrics, function_name, outcome) do
    new_total = metrics.total_executions + 1
    
    {new_successful, new_failed} = case outcome do
      :success -> {metrics.successful_executions + 1, metrics.failed_executions}
      _ -> {metrics.successful_executions, metrics.failed_executions + 1}
    end
    
    new_call_counts = Map.update(metrics.function_call_counts, function_name, 1, &(&1 + 1))
    
    %{metrics |
      total_executions: new_total,
      successful_executions: new_successful,
      failed_executions: new_failed,
      function_call_counts: new_call_counts
    }
  end

  # Prompt building functions
  defp build_code_analysis_prompt(code, context, focus) do
    """
    Analyze the following code with deep understanding:
    
    Code: #{code}
    Context: #{context}
    Focus: #{focus}
    
    Provide comprehensive analysis including:
    1. Structural analysis - components, patterns, architecture
    2. Quality assessment - strengths, weaknesses, improvements
    3. Security implications - vulnerabilities, hardening
    4. Performance considerations - bottlenecks, optimizations
    5. Maintainability - readability, modularity, documentation
    
    Return structured analysis with actionable insights in JSON format.
    """
  end

  defp build_cognitive_reasoning_prompt(problem, constraints, context) do
    """
    Apply systematic reasoning to solve this problem:
    
    Problem: #{problem}
    Constraints: #{Jason.encode!(constraints)}
    Context: #{context}
    
    Use structured thinking:
    1. Problem decomposition - break into manageable components
    2. Analysis - examine each component thoroughly  
    3. Synthesis - integrate insights into coherent solution
    4. Validation - verify solution meets requirements
    5. Optimization - refine for maximum effectiveness
    
    Provide step-by-step reasoning with clear rationale in JSON format.
    """
  end

  defp build_transcendent_synthesis_prompt(inputs, domain, objective) do
    """
    Synthesize transcendent insights from multiple inputs:
    
    Inputs: #{Jason.encode!(inputs)}
    Domain: #{domain}
    Objective: #{objective}
    
    Apply higher-order reasoning to:
    1. Extract deep patterns across all inputs
    2. Identify emergent properties and relationships
    3. Generate novel insights beyond sum of parts
    4. Synthesize unified understanding
    5. Propose transformative solutions
    
    Return synthesis with breakthrough insights and implementation guidance in JSON format.
    """
  end

  defp build_emergence_detection_prompt(patterns, threshold) do
    """
    Detect emergent patterns from the following data:
    
    Patterns: #{Jason.encode!(patterns)}
    Threshold: #{threshold}
    
    Look for:
    1. Non-linear pattern formations
    2. Self-organizing behaviors
    3. Phase transitions and critical points
    4. Novel property emergence
    5. System-level coherence
    
    If emergence detected above threshold, return detailed event data in JSON format.
    Otherwise return null.
    """
  end

  defp build_multimodal_fusion_prompt(text, code, visual_data, audio_data) do
    """
    Fuse multi-modal inputs into unified understanding:
    
    Text: #{text}
    Code: #{code}
    Visual: #{visual_data || "None"}
    Audio: #{audio_data || "None"}
    
    Create coherent fusion through:
    1. Cross-modal pattern recognition
    2. Semantic alignment across modalities
    3. Temporal synchronization of signals
    4. Contextual integration and weighting
    5. Emergent meaning extraction
    
    Return unified multi-modal representation with confidence scores in JSON format.
    """
  end

  defp build_security_analysis_prompt(system, threat_model, attack_vectors) do
    """
    Conduct comprehensive security analysis:
    
    System: #{system}
    Threat Model: #{threat_model}
    Attack Vectors: #{Jason.encode!(attack_vectors)}
    
    Analyze security posture:
    1. Vulnerability identification and classification
    2. Attack surface analysis and mapping
    3. Risk assessment with impact/likelihood scoring
    4. Defense mechanism evaluation
    5. Hardening recommendations with priorities
    
    Return detailed security assessment with actionable remediation plan in JSON format.
    """
  end

  defp build_adaptive_learning_prompt(experience, metrics, objective) do
    """
    Generate adaptive learning updates from experience:
    
    Experience: #{Jason.encode!(experience)}
    Metrics: #{Jason.encode!(metrics)}
    Objective: #{objective}
    
    Apply adaptive learning principles:
    1. Experience pattern extraction and categorization
    2. Performance correlation analysis
    3. Strategy effectiveness evaluation
    4. Knowledge graph updates and refinements
    5. Future behavior optimization recommendations
    
    Return learning updates with confidence intervals and validation requirements in JSON format.
    """
  end

  defp build_protocol_shell_prompt(protocol_name, parameters, context_state) do
    """
    Execute protocol shell with specified parameters:
    
    Protocol: #{protocol_name}
    Parameters: #{Jason.encode!(parameters)}
    Context: #{Jason.encode!(context_state)}
    
    Follow protocol execution framework:
    1. Parameter validation and preprocessing
    2. Context state analysis and preparation
    3. Step-by-step protocol execution
    4. Result validation and post-processing
    5. Context state updates and side effects
    
    Return complete protocol execution results with state transitions in JSON format.
    """
  end

  defp build_generic_prompt(template, params) do
    # Simple template substitution
    Enum.reduce(params, template, fn {key, value}, acc ->
      String.replace(acc, "{{ #{key} }}", to_string(value))
    end)
  end

  # Response parsing functions
  defp parse_code_analysis_response(raw_response) do
    # Parse structured code analysis response
    case Jason.decode(raw_response) do
      {:ok, parsed} -> parsed
      {:error, _} -> %{"error" => "Failed to parse code analysis response"}
    end
  end

  defp parse_cognitive_reasoning_response(raw_response) do
    case Jason.decode(raw_response) do
      {:ok, parsed} -> parsed
      {:error, _} -> %{"error" => "Failed to parse cognitive reasoning response"}
    end
  end

  defp parse_transcendent_synthesis_response(raw_response) do
    case Jason.decode(raw_response) do
      {:ok, parsed} -> parsed
      {:error, _} -> %{"error" => "Failed to parse transcendent synthesis response"}
    end
  end

  defp parse_emergence_detection_response(raw_response) do
    case Jason.decode(raw_response) do
      {:ok, parsed} -> {:ok, parsed}
      {:error, reason} -> {:error, reason}
    end
  end

  defp parse_multimodal_fusion_response(raw_response) do
    case Jason.decode(raw_response) do
      {:ok, parsed} -> parsed
      {:error, _} -> %{"error" => "Failed to parse multimodal fusion response"}
    end
  end

  defp parse_security_analysis_response(raw_response) do
    case Jason.decode(raw_response) do
      {:ok, parsed} -> parsed
      {:error, _} -> %{"error" => "Failed to parse security analysis response"}
    end
  end

  defp parse_adaptive_learning_response(raw_response) do
    case Jason.decode(raw_response) do
      {:ok, parsed} -> parsed
      {:error, _} -> %{"error" => "Failed to parse adaptive learning response"}
    end
  end

  defp parse_protocol_shell_response(raw_response) do
    case Jason.decode(raw_response) do
      {:ok, parsed} -> parsed
      {:error, _} -> %{"error" => "Failed to parse protocol shell response"}
    end
  end

  defp parse_generic_response(raw_response, return_type) do
    # Generic response parsing based on expected return type
    case return_type do
      "json" ->
        case Jason.decode(raw_response) do
          {:ok, parsed} -> parsed
          {:error, _} -> %{"raw_response" => raw_response}
        end
      _ ->
        raw_response
    end
  end
end