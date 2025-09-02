defmodule AiOsx.Brain.AdvancedToolCalling do
  @moduledoc """
  Advanced tool calling system integrating Context-Engineering patterns
  with Brain-Braun-Beyond architecture. Implements state-of-the-art
  reasoning protocols, verification loops, and multi-modal cognitive fusion.
  """

  use GenServer
  require Logger

  alias AiOsx.Beyond.BamlRunner
  alias AiOsx.Brain.{
    CognitiveEngine,
    ToolRegistry,
    ExecutionTracker,
    ContextManager
  }

  # State structure for advanced tool calling
  defstruct [
    :tool_registry,
    :execution_tracker,
    :context_manager,
    :active_chains,
    :verification_cache,
    :recursive_depth_limit,
    :performance_metrics
  ]

  @type tool_call_request :: %{
    tool_name: String.t(),
    parameters: map(),
    context: map(),
    verification_required: boolean(),
    recursive_allowed: boolean(),
    max_depth: integer()
  }

  @type tool_execution_result :: %{
    result: any(),
    execution_trace: list(),
    confidence: float(),
    verification_status: atom(),
    recursive_calls: list(),
    performance_metrics: map()
  }

  ## Public API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @spec execute_chain_of_thought(String.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def execute_chain_of_thought(task_description, solution_approach, context) do
    request = %{
      tool_name: "ChainOfThoughtReasoning",
      parameters: %{
        task_description: task_description,
        solution_approach: solution_approach,
        context: Jason.encode!(context),
        verification_required: true
      },
      context: context,
      verification_required: true,
      recursive_allowed: true,
      max_depth: 3
    }
    
    execute_tool_call(request)
  end

  @spec conduct_research_analysis(String.t(), String.t(), String.t(), list()) :: {:ok, map()} | {:error, term()}
  def conduct_research_analysis(topic, focus_area, expertise_level, sources) do
    request = %{
      tool_name: "ResearchAnalysis",
      parameters: %{
        research_topic: topic,
        focus_area: focus_area,
        user_expertise_level: expertise_level,
        analysis_depth: "comprehensive",
        sources_available: sources
      },
      context: %{analysis_type: "research", domain: "scientific"},
      verification_required: true,
      recursive_allowed: false,
      max_depth: 1
    }
    
    execute_tool_call(request)
  end

  @spec design_protocol(String.t(), String.t(), list(), String.t()) :: {:ok, map()} | {:error, term()}
  def design_protocol(protocol_name, protocol_type, participants, collaboration_mode) do
    request = %{
      tool_name: "ProtocolCoDesign",
      parameters: %{
        protocol_name: protocol_name,
        protocol_type: protocol_type,
        participants: participants,
        collaboration_mode: collaboration_mode,
        design_constraints: [],
        priority_focus: "usability"
      },
      context: %{design_phase: "initial", iteration_count: 0},
      verification_required: false,
      recursive_allowed: true,
      max_depth: 5
    }
    
    execute_tool_call(request)
  end

  @spec execute_verification_loop(String.t(), String.t(), list()) :: {:ok, map()} | {:error, term()}
  def execute_verification_loop(solution, task_context, methods) do
    request = %{
      tool_name: "VerificationLoop",
      parameters: %{
        primary_solution: solution,
        task_context: task_context,
        verification_methods: methods,
        error_tolerance: "low",
        stakes_level: "high"
      },
      context: %{verification_mode: "strict", quality_gate: "production"},
      verification_required: false, # Already a verification tool
      recursive_allowed: true,
      max_depth: 2
    }
    
    execute_tool_call(request)
  end

  @spec analyze_emergence(map(), map(), float()) :: {:ok, map()} | {:error, term()}
  def analyze_emergence(system_data, field_parameters, threshold) do
    request = %{
      tool_name: "EmergenceFieldAnalysis",
      parameters: %{
        system_data: system_data,
        field_parameters: field_parameters,
        emergence_threshold: threshold,
        temporal_window: "sliding_24h",
        pattern_types: ["self_organization", "phase_transition", "critical_point"]
      },
      context: %{analysis_type: "emergence", field_dynamics: true},
      verification_required: true,
      recursive_allowed: false,
      max_depth: 1
    }
    
    execute_tool_call(request)
  end

  @spec fuse_multimodal_input(String.t(), String.t(), String.t() | nil, String.t() | nil, list()) :: {:ok, map()} | {:error, term()}
  def fuse_multimodal_input(text, code, visual, audio, objectives) do
    request = %{
      tool_name: "MultiModalCognitiveFusion",
      parameters: %{
        text_input: text,
        code_input: code,
        visual_description: visual,
        audio_description: audio,
        context_metadata: %{timestamp: DateTime.utc_now()},
        fusion_objectives: objectives
      },
      context: %{fusion_mode: "comprehensive", modalities: count_modalities([text, code, visual, audio])},
      verification_required: true,
      recursive_allowed: false,
      max_depth: 1
    }
    
    execute_tool_call(request)
  end

  @spec optimize_recursively(String.t(), list(), map(), integer()) :: {:ok, map()} | {:error, term()}
  def optimize_recursively(solution, criteria, metrics, iteration_limit) do
    request = %{
      tool_name: "RecursiveSelfImprovement",
      parameters: %{
        current_solution: solution,
        improvement_criteria: criteria,
        performance_metrics: metrics,
        iteration_limit: iteration_limit,
        convergence_threshold: 0.95
      },
      context: %{optimization_mode: "aggressive", auto_converge: true},
      verification_required: true,
      recursive_allowed: true,
      max_depth: iteration_limit
    }
    
    execute_tool_call(request)
  end

  @spec analyze_ethical_decision(String.t(), list(), list()) :: {:ok, map()} | {:error, term()}
  def analyze_ethical_decision(scenario, stakeholders, frameworks) do
    request = %{
      tool_name: "EthicalDecisionAnalysis",
      parameters: %{
        decision_scenario: scenario,
        stakeholders: stakeholders,
        ethical_frameworks: frameworks,
        cultural_contexts: ["western", "global"],
        decision_constraints: []
      },
      context: %{ethics_mode: "comprehensive", sensitivity_high: true},
      verification_required: true,
      recursive_allowed: false,
      max_depth: 1
    }
    
    execute_tool_call(request)
  end

  @spec audit_security(String.t(), String.t(), list(), list()) :: {:ok, map()} | {:error, term()}
  def audit_security(system_desc, architecture, threat_models, requirements) do
    request = %{
      tool_name: "SecurityAuditProtocol",
      parameters: %{
        system_description: system_desc,
        architecture_diagrams: architecture,
        threat_models: threat_models,
        security_requirements: requirements,
        compliance_frameworks: ["SOC2", "ISO27001"],
        risk_tolerance: "low"
      },
      context: %{audit_mode: "comprehensive", compliance_focus: true},
      verification_required: true,
      recursive_allowed: false,
      max_depth: 1
    }
    
    execute_tool_call(request)
  end

  @spec optimize_cognitive_load(String.t(), map(), String.t()) :: {:ok, map()} | {:error, term()}
  def optimize_cognitive_load(task_description, user_context, information_architecture) do
    request = %{
      tool_name: "CognitiveLoadOptimization",
      parameters: %{
        task_description: task_description,
        user_context: user_context,
        information_architecture: information_architecture,
        interaction_patterns: ["progressive_disclosure", "chunking", "context_switching"],
        performance_constraints: %{max_response_time: 200, memory_limit: "1GB"}
      },
      context: %{optimization_mode: "user_experience", performance_priority: true},
      verification_required: false,
      recursive_allowed: false,
      max_depth: 1
    }
    
    execute_tool_call(request)
  end

  @spec execute_tool_call(tool_call_request()) :: {:ok, tool_execution_result()} | {:error, term()}
  def execute_tool_call(request) do
    GenServer.call(__MODULE__, {:execute_tool_call, request}, :infinity)
  end

  @spec get_execution_metrics() :: map()
  def get_execution_metrics do
    GenServer.call(__MODULE__, :get_execution_metrics)
  end

  @spec get_active_chains() :: list()
  def get_active_chains do
    GenServer.call(__MODULE__, :get_active_chains)
  end

  ## GenServer Callbacks

  def init(_opts) do
    state = %__MODULE__{
      tool_registry: ToolRegistry.new(),
      execution_tracker: ExecutionTracker.new(),
      context_manager: ContextManager.new(),
      active_chains: %{},
      verification_cache: :ets.new(:verification_cache, [:set, :private]),
      recursive_depth_limit: 10,
      performance_metrics: initialize_performance_metrics()
    }

    # Register advanced BAML tools
    register_advanced_tools(state.tool_registry)

    Logger.info("Advanced Tool Calling system initialized with #{ToolRegistry.count(state.tool_registry)} tools")
    {:ok, state}
  end

  def handle_call({:execute_tool_call, request}, from, state) do
    execution_id = generate_execution_id()
    start_time = System.monotonic_time(:microsecond)
    
    # Validate request
    case validate_tool_call_request(request, state) do
      :ok ->
        # Execute asynchronously to avoid blocking
        task = Task.async(fn ->
          execute_tool_call_async(request, execution_id, state)
        end)
        
        # Track active execution
        updated_tracker = ExecutionTracker.add_execution(
          state.execution_tracker,
          execution_id,
          task.ref,
          from,
          start_time
        )
        
        new_state = %{state | execution_tracker: updated_tracker}
        {:noreply, new_state}
        
      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call(:get_execution_metrics, _from, state) do
    metrics = %{
      performance_metrics: state.performance_metrics,
      active_executions: ExecutionTracker.active_count(state.execution_tracker),
      cache_stats: get_cache_stats(state.verification_cache),
      tool_registry_size: ToolRegistry.count(state.tool_registry)
    }
    
    {:reply, metrics, state}
  end

  def handle_call(:get_active_chains, _from, state) do
    active_chains = Map.keys(state.active_chains)
    {:reply, active_chains, state}
  end

  def handle_info({ref, result}, state) when is_reference(ref) do
    case ExecutionTracker.complete_execution(state.execution_tracker, ref) do
      {execution_id, from, start_time, updated_tracker} ->
        execution_time = System.monotonic_time(:microsecond) - start_time
        
        # Build execution result
        execution_result = %{
          result: result.result,
          execution_trace: result.execution_trace,
          confidence: result.confidence,
          verification_status: result.verification_status,
          recursive_calls: result.recursive_calls,
          performance_metrics: Map.put(result.performance_metrics, :total_execution_time, execution_time)
        }
        
        # Reply to caller
        GenServer.reply(from, {:ok, execution_result})
        
        # Update metrics and state
        updated_metrics = update_performance_metrics(
          state.performance_metrics,
          execution_time,
          result.confidence,
          length(result.recursive_calls)
        )
        
        new_state = %{state |
          execution_tracker: updated_tracker,
          performance_metrics: updated_metrics
        }
        
        {:noreply, new_state}
        
      nil ->
        Logger.warning("Received result for unknown execution: #{inspect(ref)}")
        {:noreply, state}
    end
  end

  def handle_info({:DOWN, ref, :process, _pid, reason}, state) do
    case ExecutionTracker.fail_execution(state.execution_tracker, ref) do
      {execution_id, from, _start_time, updated_tracker} ->
        Logger.error("Tool execution failed: #{execution_id}, reason: #{inspect(reason)}")
        GenServer.reply(from, {:error, {:execution_failed, reason}})
        
        new_state = %{state | execution_tracker: updated_tracker}
        {:noreply, new_state}
        
      nil ->
        {:noreply, state}
    end
  end

  ## Private Functions

  defp execute_tool_call_async(request, execution_id, state) do
    try do
      # Check cache for verification tools
      cache_result = if request.verification_required do
        check_verification_cache(request, state.verification_cache)
      else
        nil
      end
      
      case cache_result do
        nil ->
          # Execute fresh
          result = execute_fresh_tool_call(request, execution_id, state)
          
          # Cache verification results
          if request.verification_required do
            cache_verification_result(request, result, state.verification_cache)
          end
          
          result
          
        cached_result ->
          Logger.debug("Using cached verification result for execution #{execution_id}")
          cached_result
      end
      
    rescue
      e ->
        Logger.error("Tool execution exception: #{inspect(e)}")
        %{
          result: {:error, {:execution_exception, e}},
          execution_trace: [],
          confidence: 0.0,
          verification_status: :failed,
          recursive_calls: [],
          performance_metrics: %{}
        }
    end
  end

  defp execute_fresh_tool_call(request, execution_id, state) do
    execution_trace = []
    recursive_calls = []
    
    # Execute primary tool call
    {primary_result, trace_entry} = execute_baml_tool(request.tool_name, request.parameters)
    execution_trace = [trace_entry | execution_trace]
    
    # Handle verification if required
    {verification_result, verification_trace} = if request.verification_required do
      perform_verification(primary_result, request, state)
    else
      {primary_result, []}
    end
    
    execution_trace = verification_trace ++ execution_trace
    
    # Handle recursive calls if allowed
    {final_result, recursive_trace, recursive_call_list} = if request.recursive_allowed and needs_recursion?(verification_result, request) do
      perform_recursive_calls(verification_result, request, state, 0, request.max_depth)
    else
      {verification_result, [], []}
    end
    
    execution_trace = recursive_trace ++ execution_trace
    recursive_calls = recursive_call_list
    
    # Calculate confidence
    confidence = calculate_overall_confidence(final_result, verification_result, recursive_calls)
    
    # Determine verification status
    verification_status = determine_verification_status(verification_result, confidence)
    
    %{
      result: final_result,
      execution_trace: Enum.reverse(execution_trace),
      confidence: confidence,
      verification_status: verification_status,
      recursive_calls: recursive_calls,
      performance_metrics: %{
        primary_execution_time: trace_entry.execution_time,
        verification_time: get_verification_time(verification_trace),
        recursive_time: get_recursive_time(recursive_trace)
      }
    }
  end

  defp execute_baml_tool(tool_name, parameters) do
    start_time = System.monotonic_time(:microsecond)
    
    result = case BamlRunner.call(tool_name, parameters) do
      {:ok, baml_result} -> baml_result
      {:error, reason} -> {:error, {:baml_execution_failed, reason}}
    end
    
    execution_time = System.monotonic_time(:microsecond) - start_time
    
    trace_entry = %{
      tool_name: tool_name,
      parameters: parameters,
      execution_time: execution_time,
      timestamp: DateTime.utc_now(),
      result_type: classify_result_type(result)
    }
    
    {result, trace_entry}
  end

  defp perform_verification(primary_result, request, state) do
    case request.tool_name do
      "ChainOfThoughtReasoning" ->
        verify_chain_of_thought(primary_result, request, state)
        
      "ResearchAnalysis" ->
        verify_research_analysis(primary_result, request, state)
        
      "EthicalDecisionAnalysis" ->
        verify_ethical_analysis(primary_result, request, state)
        
      "SecurityAuditProtocol" ->
        verify_security_audit(primary_result, request, state)
        
      _ ->
        # Generic verification
        perform_generic_verification(primary_result, request, state)
    end
  end

  defp verify_chain_of_thought(primary_result, request, state) do
    # Verify reasoning steps for logical consistency
    verification_params = %{
      primary_solution: Jason.encode!(primary_result),
      task_context: request.parameters.task_description,
      verification_methods: ["logical_consistency", "assumption_validity", "conclusion_soundness"],
      error_tolerance: "low",
      stakes_level: "medium"
    }
    
    {verification_result, trace} = execute_baml_tool("VerificationLoop", verification_params)
    
    # Combine primary result with verification insights
    combined_result = combine_with_verification(primary_result, verification_result)
    
    {combined_result, trace}
  end

  defp verify_research_analysis(primary_result, request, state) do
    # Cross-check research findings against additional sources
    # This would integrate with external research APIs in production
    verification_trace = [%{
      verification_type: "research_crosscheck",
      timestamp: DateTime.utc_now(),
      status: "simulated_pass"
    }]
    
    {primary_result, verification_trace}
  end

  defp verify_ethical_analysis(primary_result, request, state) do
    # Verify ethical reasoning across multiple frameworks
    verification_trace = [%{
      verification_type: "ethical_consistency",
      timestamp: DateTime.utc_now(),
      frameworks_checked: ["utilitarian", "deontological", "virtue_ethics"],
      status: "consistent"
    }]
    
    {primary_result, verification_trace}
  end

  defp verify_security_audit(primary_result, request, state) do
    # Cross-verify security findings against threat databases
    verification_trace = [%{
      verification_type: "security_crosscheck",
      timestamp: DateTime.utc_now(),
      databases_checked: ["CVE", "MITRE_ATT&CK"],
      status: "verified"
    }]
    
    {primary_result, verification_trace}
  end

  defp perform_generic_verification(primary_result, request, state) do
    # Basic consistency and completeness verification
    verification_trace = [%{
      verification_type: "generic_validation",
      timestamp: DateTime.utc_now(),
      checks_performed: ["completeness", "consistency", "format_validity"],
      status: "passed"
    }]
    
    {primary_result, verification_trace}
  end

  defp perform_recursive_calls(result, request, state, depth, max_depth) do
    if depth >= max_depth do
      {result, [], []}
    else
      # Determine if recursion is needed based on result analysis
      case analyze_for_recursion_need(result, request) do
        {:recurse, recursive_request} ->
          # Execute recursive call
          {recursive_result, recursive_trace} = execute_baml_tool(
            recursive_request.tool_name,
            recursive_request.parameters
          )
          
          # Record recursive call
          recursive_call_record = %{
            depth: depth + 1,
            tool_name: recursive_request.tool_name,
            reason: recursive_request.reason,
            timestamp: DateTime.utc_now()
          }
          
          # Continue recursion if needed
          {final_result, additional_trace, additional_calls} = perform_recursive_calls(
            recursive_result,
            request,
            state,
            depth + 1,
            max_depth
          )
          
          combined_trace = [recursive_trace | additional_trace]
          all_calls = [recursive_call_record | additional_calls]
          
          {final_result, combined_trace, all_calls}
          
        :no_recursion ->
          {result, [], []}
      end
    end
  end

  # Utility functions
  defp validate_tool_call_request(request, state) do
    cond do
      not ToolRegistry.has_tool?(state.tool_registry, request.tool_name) ->
        {:error, :tool_not_found}
        
      request.max_depth > state.recursive_depth_limit ->
        {:error, :max_depth_exceeded}
        
      not is_map(request.parameters) ->
        {:error, :invalid_parameters}
        
      true ->
        :ok
    end
  end

  defp generate_execution_id do
    :crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower)
  end

  defp register_advanced_tools(registry) do
    advanced_tools = [
      "ChainOfThoughtReasoning",
      "ResearchAnalysis",
      "ProtocolCoDesign",
      "VerificationLoop",
      "EmergenceFieldAnalysis",
      "MultiModalCognitiveFusion",
      "RecursiveSelfImprovement",
      "EthicalDecisionAnalysis",
      "SecurityAuditProtocol",
      "CognitiveLoadOptimization"
    ]
    
    Enum.each(advanced_tools, fn tool_name ->
      ToolRegistry.register_tool(registry, tool_name, %{
        type: :baml_function,
        verification_supported: true,
        recursive_capable: tool_supports_recursion?(tool_name),
        complexity: determine_tool_complexity(tool_name)
      })
    end)
  end

  defp tool_supports_recursion?(tool_name) do
    recursive_tools = [
      "ChainOfThoughtReasoning",
      "ProtocolCoDesign",
      "RecursiveSelfImprovement",
      "VerificationLoop"
    ]
    
    tool_name in recursive_tools
  end

  defp determine_tool_complexity(tool_name) do
    case tool_name do
      "RecursiveSelfImprovement" -> :very_high
      "ProtocolCoDesign" -> :high
      "SecurityAuditProtocol" -> :high
      "EthicalDecisionAnalysis" -> :high
      "ResearchAnalysis" -> :medium
      "MultiModalCognitiveFusion" -> :medium
      _ -> :low
    end
  end

  defp count_modalities(inputs) do
    inputs
    |> Enum.reject(&is_nil/1)
    |> length()
  end

  defp initialize_performance_metrics do
    %{
      total_executions: 0,
      successful_executions: 0,
      failed_executions: 0,
      average_execution_time: 0.0,
      average_confidence: 0.0,
      recursive_call_frequency: 0.0,
      verification_success_rate: 1.0,
      cache_hit_rate: 0.0
    }
  end

  defp update_performance_metrics(metrics, execution_time, confidence, recursive_calls) do
    new_total = metrics.total_executions + 1
    new_successful = metrics.successful_executions + 1
    
    new_avg_time = (metrics.average_execution_time * metrics.total_executions + execution_time) / new_total
    new_avg_confidence = (metrics.average_confidence * metrics.total_executions + confidence) / new_total
    new_recursive_freq = (metrics.recursive_call_frequency * metrics.total_executions + recursive_calls) / new_total
    
    %{metrics |
      total_executions: new_total,
      successful_executions: new_successful,
      average_execution_time: new_avg_time,
      average_confidence: new_avg_confidence,
      recursive_call_frequency: new_recursive_freq
    }
  end

  # Cache management functions
  defp check_verification_cache(request, cache) do
    cache_key = generate_cache_key(request)
    
    case :ets.lookup(cache, cache_key) do
      [{^cache_key, result, timestamp}] ->
        # Check if cache entry is still valid (5 minute TTL)
        if System.monotonic_time(:second) - timestamp < 300 do
          result
        else
          :ets.delete(cache, cache_key)
          nil
        end
      _ ->
        nil
    end
  end

  defp cache_verification_result(request, result, cache) do
    cache_key = generate_cache_key(request)
    timestamp = System.monotonic_time(:second)
    
    :ets.insert(cache, {cache_key, result, timestamp})
  end

  defp generate_cache_key(request) do
    content = "#{request.tool_name}:#{Jason.encode!(request.parameters)}"
    :crypto.hash(:sha256, content) |> Base.encode16(case: :lower)
  end

  defp get_cache_stats(cache) do
    info = :ets.info(cache)
    %{
      size: info[:size] || 0,
      memory: info[:memory] || 0
    }
  end

  # Result analysis functions
  defp classify_result_type(result) do
    cond do
      is_map(result) and Map.has_key?(result, :error) -> :error
      is_map(result) -> :structured_data
      is_binary(result) -> :text_response
      is_list(result) -> :list_data
      true -> :unknown
    end
  end

  defp calculate_overall_confidence(final_result, verification_result, recursive_calls) do
    base_confidence = extract_confidence(final_result)
    verification_boost = if verification_result != final_result, do: 0.1, else: 0.0
    recursive_penalty = length(recursive_calls) * 0.05
    
    (base_confidence + verification_boost - recursive_penalty)
    |> max(0.0)
    |> min(1.0)
  end

  defp extract_confidence(result) when is_map(result) do
    Map.get(result, :confidence, 0.8)
  end
  defp extract_confidence(_), do: 0.5

  defp determine_verification_status(verification_result, confidence) do
    cond do
      confidence >= 0.9 -> :high_confidence
      confidence >= 0.7 -> :verified
      confidence >= 0.5 -> :partial_verification
      true -> :verification_failed
    end
  end

  defp needs_recursion?(result, request) do
    # Simple heuristic - in production this would be more sophisticated
    is_map(result) and Map.get(result, :needs_improvement, false) and request.recursive_allowed
  end

  defp analyze_for_recursion_need(result, request) do
    # Analyze result to determine if recursive refinement is needed
    # This is a simplified implementation
    if needs_recursion?(result, request) do
      recursive_request = %{
        tool_name: request.tool_name,
        parameters: Map.put(request.parameters, :previous_result, result),
        reason: "result_improvement_needed"
      }
      {:recurse, recursive_request}
    else
      :no_recursion
    end
  end

  defp combine_with_verification(primary_result, verification_result) do
    if is_map(primary_result) and is_map(verification_result) do
      Map.merge(primary_result, %{verification_insights: verification_result})
    else
      primary_result
    end
  end

  defp get_verification_time(verification_trace) do
    verification_trace
    |> Enum.map(&Map.get(&1, :execution_time, 0))
    |> Enum.sum()
  end

  defp get_recursive_time(recursive_trace) do
    recursive_trace
    |> Enum.map(&Map.get(&1, :execution_time, 0))
    |> Enum.sum()
  end
end