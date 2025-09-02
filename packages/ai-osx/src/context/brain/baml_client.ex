defmodule AiOsx.Brain.BamlClient do
  @moduledoc """
  Proper BAML client integration for AI-OSX Brain component.
  Uses baml_elixir for native BAML function calling with compile-time code generation.
  """

  use BamlElixir.Client, path: {:ai_osx, "src/context/baml_src"}
  
  require Logger

  alias AiOsx.Brain.{
    ToolCallTracker,
    ContextManager,
    PerformanceMonitor
  }

  # State for tracking BAML calls
  defstruct [
    :tracker,
    :context_manager,
    :performance_monitor,
    :active_calls,
    :call_history
  ]

  ## High-Level Tool Call Interface

  @doc """
  Execute chain of thought reasoning with systematic verification.
  """
  @spec chain_of_thought_reasoning(String.t(), String.t(), String.t(), boolean()) :: {:ok, map()} | {:error, term()}
  def chain_of_thought_reasoning(task_description, solution_approach, context_information, verification_required \\ true) do
    params = %{
      task_description: task_description,
      solution_approach: solution_approach,
      context_information: context_information,
      verification_required: verification_required
    }
    
    execute_with_tracking("ChainOfThoughtReasoning", params, %{
      tool_type: :reasoning,
      complexity: :high,
      verification_enabled: verification_required
    })
  end

  @doc """
  Conduct systematic research analysis with literature synthesis.
  """
  @spec research_analysis(String.t(), String.t(), String.t(), String.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def research_analysis(research_topic, focus_area, expertise_level, sources_context, analysis_depth \\ "comprehensive") do
    params = %{
      research_topic: research_topic,
      focus_area: focus_area,
      expertise_level: expertise_level,
      sources_context: sources_context,
      analysis_depth: analysis_depth
    }
    
    execute_with_tracking("ResearchAnalysis", params, %{
      tool_type: :research,
      complexity: :medium,
      domain: :scientific
    })
  end

  @doc """
  Design collaborative protocols with version control.
  """
  @spec protocol_design(String.t(), String.t(), String.t(), list(), list()) :: {:ok, map()} | {:error, term()}
  def protocol_design(protocol_name, protocol_type, objectives, constraints, stakeholders) do
    params = %{
      protocol_name: protocol_name,
      protocol_type: protocol_type,
      objectives: objectives,
      constraints: constraints,
      stakeholders: stakeholders
    }
    
    execute_with_tracking("ProtocolDesign", params, %{
      tool_type: :design,
      complexity: :high,
      collaborative: true
    })
  end

  @doc """
  Execute comprehensive security audit with threat modeling.
  """
  @spec security_audit(String.t(), String.t(), String.t(), list()) :: {:ok, map()} | {:error, term()}
  def security_audit(system_description, architecture_overview, threat_landscape, compliance_requirements) do
    params = %{
      system_description: system_description,
      architecture_overview: architecture_overview,
      threat_landscape: threat_landscape,
      compliance_requirements: compliance_requirements
    }
    
    execute_with_tracking("SecurityAudit", params, %{
      tool_type: :security,
      complexity: :very_high,
      critical: true
    })
  end

  @doc """
  Conduct ethical decision analysis with multi-framework evaluation.
  """
  @spec ethical_decision_analysis(String.t(), String.t(), list(), list()) :: {:ok, map()} | {:error, term()}
  def ethical_decision_analysis(decision_scenario, stakeholder_context, cultural_considerations, ethical_frameworks) do
    params = %{
      decision_scenario: decision_scenario,
      stakeholder_context: stakeholder_context,
      cultural_considerations: cultural_considerations,
      ethical_frameworks: ethical_frameworks
    }
    
    execute_with_tracking("EthicalDecisionAnalysis", params, %{
      tool_type: :ethics,
      complexity: :high,
      sensitive: true
    })
  end

  @doc """
  Detect emergent patterns using field dynamics analysis.
  """
  @spec emergence_detection(String.t(), String.t(), String.t(), float()) :: {:ok, map()} | {:error, term()}
  def emergence_detection(system_data, field_parameters, analysis_timeframe, emergence_threshold) do
    params = %{
      system_data: system_data,
      field_parameters: field_parameters,
      analysis_timeframe: analysis_timeframe,
      emergence_threshold: emergence_threshold
    }
    
    execute_with_tracking("EmergenceDetection", params, %{
      tool_type: :emergence,
      complexity: :very_high,
      scientific: true
    })
  end

  @doc """
  Fuse multi-modal inputs for unified understanding.
  """
  @spec multi_modal_fusion(String.t(), String.t(), String.t() | nil, String.t() | nil, list()) :: {:ok, map()} | {:error, term()}
  def multi_modal_fusion(text_content, code_content, visual_description, audio_description, fusion_objectives) do
    params = %{
      text_content: text_content,
      code_content: code_content,
      visual_description: visual_description,
      audio_description: audio_description,
      fusion_objectives: fusion_objectives
    }
    
    execute_with_tracking("MultiModalFusion", params, %{
      tool_type: :fusion,
      complexity: :high,
      multimodal: true
    })
  end

  @doc """
  Execute verification loop for critical accuracy validation.
  """
  @spec verification_loop(String.t(), list(), float()) :: {:ok, map()} | {:error, term()}
  def verification_loop(primary_analysis, verification_methods, confidence_threshold) do
    params = %{
      primary_analysis: primary_analysis,
      verification_methods: verification_methods,
      confidence_threshold: confidence_threshold
    }
    
    execute_with_tracking("VerificationLoop", params, %{
      tool_type: :verification,
      complexity: :medium,
      quality_gate: true
    })
  end

  @doc """
  Optimize cognitive load for better user experience.
  """
  @spec cognitive_load_optimization(String.t(), String.t(), String.t(), list()) :: {:ok, map()} | {:error, term()}
  def cognitive_load_optimization(task_description, user_profile, interface_context, optimization_goals) do
    params = %{
      task_description: task_description,
      user_profile: user_profile,
      interface_context: interface_context,
      optimization_goals: optimization_goals
    }
    
    execute_with_tracking("CognitiveLoadOptimization", params, %{
      tool_type: :ux_optimization,
      complexity: :medium,
      user_focused: true
    })
  end

  @doc """
  Advanced code analysis with comprehensive evaluation.
  """
  @spec code_analysis_advanced(String.t(), list(), String.t()) :: {:ok, map()} | {:error, term()}
  def code_analysis_advanced(code_content, analysis_objectives, context_information) do
    params = %{
      code_content: code_content,
      analysis_objectives: analysis_objectives,
      context_information: context_information
    }
    
    execute_with_tracking("CodeAnalysisAdvanced", params, %{
      tool_type: :code_analysis,
      complexity: :high,
      technical: true
    })
  end

  @doc """
  System design with comprehensive architecture planning.
  """
  @spec system_design(String.t(), list(), String.t(), list()) :: {:ok, map()} | {:error, term()}
  def system_design(requirements, constraints, scale_parameters, technology_preferences) do
    params = %{
      requirements: requirements,
      constraints: constraints,
      scale_parameters: scale_parameters,
      technology_preferences: technology_preferences
    }
    
    execute_with_tracking("SystemDesign", params, %{
      tool_type: :system_design,
      complexity: :very_high,
      architectural: true
    })
  end

  ## Streaming Interface for Long-Running Operations

  @doc """
  Execute BAML function with streaming response for long operations.
  """
  @spec stream_function_call(String.t(), map(), function()) :: {:ok, any()} | {:error, term()}
  def stream_function_call(function_name, params, result_handler) do
    call_id = generate_call_id()
    
    Logger.info("Starting streaming BAML call: #{function_name} [#{call_id}]")
    
    try do
      # Use the BAML streaming interface
      result = case function_name do
        "ChainOfThoughtReasoning" -> 
          __MODULE__.stream_chain_of_thought_reasoning(params, result_handler)
        "ResearchAnalysis" -> 
          __MODULE__.stream_research_analysis(params, result_handler)
        "SecurityAudit" -> 
          __MODULE__.stream_security_audit(params, result_handler)
        "EthicalDecisionAnalysis" -> 
          __MODULE__.stream_ethical_decision_analysis(params, result_handler)
        "EmergenceDetection" -> 
          __MODULE__.stream_emergence_detection(params, result_handler)
        "MultiModalFusion" -> 
          __MODULE__.stream_multi_modal_fusion(params, result_handler)
        _ -> 
          {:error, :function_not_streamable}
      end
      
      Logger.info("Completed streaming BAML call: #{function_name} [#{call_id}]")
      result
      
    rescue
      e ->
        Logger.error("Streaming BAML call failed: #{function_name} [#{call_id}] - #{inspect(e)}")
        {:error, {:streaming_failed, e}}
    end
  end

  ## Batch Processing Interface

  @doc """
  Execute multiple BAML functions in parallel for batch processing.
  """
  @spec batch_execute(list()) :: {:ok, list()} | {:error, term()}
  def batch_execute(function_calls) when is_list(function_calls) do
    batch_id = generate_batch_id()
    
    Logger.info("Starting batch BAML execution: #{length(function_calls)} calls [#{batch_id}]")
    
    try do
      # Execute all calls in parallel
      tasks = Enum.map(function_calls, fn {function_name, params, context} ->
        Task.async(fn ->
          execute_with_tracking(function_name, params, context)
        end)
      end)
      
      # Collect results
      results = Task.await_many(tasks, :infinity)
      
      Logger.info("Completed batch BAML execution [#{batch_id}]")
      {:ok, results}
      
    rescue
      e ->
        Logger.error("Batch BAML execution failed [#{batch_id}] - #{inspect(e)}")
        {:error, {:batch_execution_failed, e}}
    end
  end

  ## Performance and Monitoring Interface

  @doc """
  Get performance metrics for BAML function calls.
  """
  @spec get_performance_metrics() :: map()
  def get_performance_metrics do
    %{
      total_calls: PerformanceMonitor.get_total_calls(),
      average_response_time: PerformanceMonitor.get_average_response_time(),
      success_rate: PerformanceMonitor.get_success_rate(),
      function_usage: PerformanceMonitor.get_function_usage_stats(),
      error_patterns: PerformanceMonitor.get_error_patterns(),
      current_load: PerformanceMonitor.get_current_load()
    }
  end

  @doc """
  Get active BAML function calls.
  """
  @spec get_active_calls() :: list()
  def get_active_calls do
    ToolCallTracker.get_active_calls()
  end

  @doc """
  Get recent call history with filtering options.
  """
  @spec get_call_history(map()) :: list()
  def get_call_history(filters \\ %{}) do
    ToolCallTracker.get_call_history(filters)
  end

  ## Configuration and Health Interface

  @doc """
  Check BAML client health and connectivity.
  """
  @spec health_check() :: {:ok, map()} | {:error, term()}
  def health_check do
    try do
      # Test basic BAML connectivity
      test_params = %{
        task_description: "Health check test",
        solution_approach: "Simple verification",
        context_information: "System health validation",
        verification_required: false
      }
      
      case __MODULE__.chain_of_thought_reasoning(test_params) do
        {:ok, _result} ->
          {:ok, %{
            status: :healthy,
            baml_connectivity: :ok,
            client_version: get_client_version(),
            last_check: DateTime.utc_now()
          }}
        {:error, reason} ->
          {:error, %{
            status: :unhealthy,
            baml_connectivity: :failed,
            error: reason,
            last_check: DateTime.utc_now()
          }}
      end
      
    rescue
      e ->
        {:error, %{
          status: :error,
          baml_connectivity: :exception,
          error: inspect(e),
          last_check: DateTime.utc_now()
        }}
    end
  end

  ## Private Implementation Functions

  defp execute_with_tracking(function_name, params, context) do
    call_id = generate_call_id()
    start_time = System.monotonic_time(:microsecond)
    
    # Track call start
    ToolCallTracker.track_call_start(call_id, function_name, params, context)
    
    try do
      # Execute BAML function using the generated client
      result = case function_name do
        "ChainOfThoughtReasoning" -> 
          __MODULE__.chain_of_thought_reasoning(params)
        "ResearchAnalysis" -> 
          __MODULE__.research_analysis(params)
        "ProtocolDesign" -> 
          __MODULE__.protocol_design(params)
        "SecurityAudit" -> 
          __MODULE__.security_audit(params)
        "EthicalDecisionAnalysis" -> 
          __MODULE__.ethical_decision_analysis(params)
        "EmergenceDetection" -> 
          __MODULE__.emergence_detection(params)
        "MultiModalFusion" -> 
          __MODULE__.multi_modal_fusion(params)
        "VerificationLoop" -> 
          __MODULE__.verification_loop(params)
        "CognitiveLoadOptimization" -> 
          __MODULE__.cognitive_load_optimization(params)
        "CodeAnalysisAdvanced" -> 
          __MODULE__.code_analysis_advanced(params)
        "SystemDesign" -> 
          __MODULE__.system_design(params)
        _ -> 
          {:error, :unknown_function}
      end
      
      execution_time = System.monotonic_time(:microsecond) - start_time
      
      case result do
        {:ok, baml_result} ->
          # Track successful completion
          ToolCallTracker.track_call_success(call_id, baml_result, execution_time)
          PerformanceMonitor.record_success(function_name, execution_time)
          
          Logger.debug("BAML call completed: #{function_name} [#{call_id}] - #{execution_time}μs")
          {:ok, baml_result}
          
        {:error, reason} ->
          # Track failure
          ToolCallTracker.track_call_failure(call_id, reason, execution_time)
          PerformanceMonitor.record_failure(function_name, reason, execution_time)
          
          Logger.warning("BAML call failed: #{function_name} [#{call_id}] - #{inspect(reason)}")
          {:error, reason}
      end
      
    rescue
      e ->
        execution_time = System.monotonic_time(:microsecond) - start_time
        
        # Track exception
        ToolCallTracker.track_call_exception(call_id, e, execution_time)
        PerformanceMonitor.record_exception(function_name, e, execution_time)
        
        Logger.error("BAML call exception: #{function_name} [#{call_id}] - #{inspect(e)}")
        {:error, {:execution_exception, e}}
    end
  end

  defp generate_call_id do
    "baml_#{System.monotonic_time(:nanosecond) |> Integer.to_string(36)}_#{:rand.uniform(999999)}"
  end

  defp generate_batch_id do
    "batch_#{System.monotonic_time(:nanosecond) |> Integer.to_string(36)}_#{:rand.uniform(999999)}"
  end

  defp get_client_version do
    case Application.spec(:baml_elixir, :vsn) do
      nil -> "unknown"
      version -> List.to_string(version)
    end
  end
end