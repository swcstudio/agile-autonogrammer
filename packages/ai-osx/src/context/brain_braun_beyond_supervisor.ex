defmodule AiOsx.BrainBraunBeyondSupervisor do
  @moduledoc """
  Main supervisor for Brain-Braun-Beyond architecture in AI-OSX.
  Coordinates cognitive processing (Brain), computational muscle (Braun), 
  and transcendent reasoning (Beyond) components.
  """

  use Supervisor
  require Logger

  alias AiOsx.Brain.CognitiveEngine
  alias AiOsx.Beyond.BamlRunner
  alias AiOsx.BrainBraunBeyond.{
    CoordinationEngine,
    LoadBalancer,
    HealthMonitor,
    PerformanceOptimizer,
    SecurityGuard
  }

  ## Public API

  def start_link(opts \\ []) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @spec get_system_health() :: map()
  def get_system_health do
    GenServer.call(HealthMonitor, :get_system_health)
  end

  @spec coordinate_request(map()) :: {:ok, any()} | {:error, term()}
  def coordinate_request(request) do
    GenServer.call(CoordinationEngine, {:coordinate_request, request})
  end

  @spec optimize_performance() :: :ok
  def optimize_performance do
    GenServer.cast(PerformanceOptimizer, :optimize_system)
  end

  @spec get_load_balance_status() :: map()
  def get_load_balance_status do
    GenServer.call(LoadBalancer, :get_status)
  end

  ## Supervisor Callbacks

  def init(_opts) do
    Logger.info("Initializing Brain-Braun-Beyond Supervisor")

    # Define child specifications with restart strategies
    children = [
      # Core cognitive engine (Brain)
      {CognitiveEngine, []},
      
      # BAML transcendent reasoning runner (Beyond)
      {BamlRunner, []},
      
      # Load balancer for distributing work across components
      {LoadBalancer, []},
      
      # Health monitoring for all components
      {HealthMonitor, []},
      
      # Performance optimizer for dynamic system tuning
      {PerformanceOptimizer, []},
      
      # Security guard for protecting all operations
      {SecurityGuard, []},
      
      # Main coordination engine that orchestrates everything
      {CoordinationEngine, []}
    ]

    # Supervision strategy: one_for_one with moderate restart intensity
    opts = [
      strategy: :one_for_one,
      max_restarts: 10,
      max_seconds: 60,
      name: __MODULE__
    ]

    Supervisor.init(children, opts)
  end
end

defmodule AiOsx.BrainBraunBeyond.CoordinationEngine do
  @moduledoc """
  Central coordination engine for Brain-Braun-Beyond architecture.
  Routes requests to appropriate components and manages cross-component workflows.
  """

  use GenServer
  require Logger

  alias AiOsx.Brain.CognitiveEngine
  alias AiOsx.Beyond.BamlRunner
  alias AiOsx.BrainBraunBeyond.{LoadBalancer, SecurityGuard}

  # State structure
  defstruct [
    :request_queue,
    :active_requests,
    :routing_rules,
    :performance_metrics,
    :component_health,
    :workflow_definitions
  ]

  ## Public API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @spec coordinate_request(map()) :: {:ok, any()} | {:error, term()}
  def coordinate_request(request) do
    GenServer.call(__MODULE__, {:coordinate_request, request}, :infinity)
  end

  @spec register_workflow(String.t(), map()) :: :ok
  def register_workflow(workflow_name, workflow_definition) do
    GenServer.call(__MODULE__, {:register_workflow, workflow_name, workflow_definition})
  end

  @spec get_coordination_stats() :: map()
  def get_coordination_stats do
    GenServer.call(__MODULE__, :get_coordination_stats)
  end

  ## GenServer Callbacks

  def init(_opts) do
    state = %__MODULE__{
      request_queue: :queue.new(),
      active_requests: %{},
      routing_rules: initialize_routing_rules(),
      performance_metrics: initialize_coordination_metrics(),
      component_health: %{brain: :healthy, braun: :healthy, beyond: :healthy},
      workflow_definitions: load_default_workflows()
    }

    # Schedule periodic health checks and optimizations
    :timer.send_interval(5_000, :health_check)
    :timer.send_interval(30_000, :performance_optimization)
    :timer.send_interval(60_000, :queue_maintenance)

    Logger.info("Brain-Braun-Beyond Coordination Engine initialized")
    {:ok, state}
  end

  def handle_call({:coordinate_request, request}, from, state) do
    case SecurityGuard.screen_request(request) do
      :allowed ->
        # Determine coordination strategy based on request type
        case determine_coordination_strategy(request, state) do
          {:single_component, component} ->
            handle_single_component_request(request, component, from, state)
            
          {:multi_component, workflow} ->
            handle_multi_component_workflow(request, workflow, from, state)
            
          {:error, reason} ->
            {:reply, {:error, reason}, state}
        end
        
      {:blocked, reason} ->
        Logger.warning("Request blocked by security: #{inspect(reason)}")
        {:reply, {:error, {:security_blocked, reason}}, state}
    end
  end

  def handle_call({:register_workflow, workflow_name, workflow_definition}, _from, state) do
    case validate_workflow_definition(workflow_definition) do
      :ok ->
        updated_workflows = Map.put(state.workflow_definitions, workflow_name, workflow_definition)
        new_state = %{state | workflow_definitions: updated_workflows}
        Logger.info("Registered workflow: #{workflow_name}")
        {:reply, :ok, new_state}
        
      {:error, reason} ->
        Logger.warning("Failed to register workflow #{workflow_name}: #{inspect(reason)}")
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call(:get_coordination_stats, _from, state) do
    stats = %{
      active_requests: map_size(state.active_requests),
      queue_length: :queue.len(state.request_queue),
      performance_metrics: state.performance_metrics,
      component_health: state.component_health,
      registered_workflows: map_size(state.workflow_definitions)
    }
    
    {:reply, stats, state}
  end

  def handle_info(:health_check, state) do
    # Check health of all components
    new_health = %{
      brain: check_component_health(CognitiveEngine),
      braun: check_braun_health(), # Would check Rust NIFs
      beyond: check_component_health(BamlRunner)
    }
    
    if new_health != state.component_health do
      Logger.info("Component health status updated: #{inspect(new_health)}")
    end
    
    updated_state = %{state | component_health: new_health}
    {:noreply, updated_state}
  end

  def handle_info(:performance_optimization, state) do
    # Trigger performance optimization
    spawn(fn ->
      optimize_component_allocation(state)
      optimize_routing_rules(state)
      cleanup_completed_requests(state)
    end)
    
    {:noreply, state}
  end

  def handle_info(:queue_maintenance, state) do
    # Clean up old completed requests and optimize queue
    cleaned_state = cleanup_request_queue(state)
    {:noreply, cleaned_state}
  end

  def handle_info({:request_completed, request_id, result}, state) do
    case Map.get(state.active_requests, request_id) do
      {from, request, start_time} ->
        completion_time = System.monotonic_time(:millisecond) - start_time
        
        # Reply to caller
        GenServer.reply(from, {:ok, result})
        
        # Update metrics and cleanup
        updated_active = Map.delete(state.active_requests, request_id)
        updated_metrics = update_completion_metrics(state.performance_metrics, request, completion_time, :success)
        
        new_state = %{state |
          active_requests: updated_active,
          performance_metrics: updated_metrics
        }
        
        {:noreply, new_state}
        
      nil ->
        Logger.warning("Received completion for unknown request: #{request_id}")
        {:noreply, state}
    end
  end

  def handle_info({:request_failed, request_id, reason}, state) do
    case Map.get(state.active_requests, request_id) do
      {from, request, start_time} ->
        completion_time = System.monotonic_time(:millisecond) - start_time
        
        # Reply to caller
        GenServer.reply(from, {:error, reason})
        
        # Update metrics and cleanup
        updated_active = Map.delete(state.active_requests, request_id)
        updated_metrics = update_completion_metrics(state.performance_metrics, request, completion_time, :error)
        
        new_state = %{state |
          active_requests: updated_active,
          performance_metrics: updated_metrics
        }
        
        {:noreply, new_state}
        
      nil ->
        Logger.warning("Received failure for unknown request: #{request_id}")
        {:noreply, state}
    end
  end

  ## Private Functions

  defp determine_coordination_strategy(request, state) do
    case request.type do
      # Single component operations
      :code_analysis -> {:single_component, :brain}
      :cognitive_reasoning -> {:single_component, :brain}
      :emergence_detection -> {:single_component, :brain}
      :baml_function_call -> {:single_component, :beyond}
      :quantum_optimization -> {:single_component, :braun}
      :matrix_computation -> {:single_component, :braun}
      :field_simulation -> {:single_component, :braun}
      
      # Multi-component workflows
      :comprehensive_analysis -> {:multi_component, "comprehensive_analysis_workflow"}
      :system_optimization -> {:multi_component, "system_optimization_workflow"}
      :security_audit -> {:multi_component, "security_audit_workflow"}
      :performance_analysis -> {:multi_component, "performance_analysis_workflow"}
      
      # Custom workflows
      :custom_workflow ->
        case Map.get(request, :workflow_name) do
          nil -> {:error, :workflow_name_required}
          workflow_name ->
            case Map.get(state.workflow_definitions, workflow_name) do
              nil -> {:error, :workflow_not_found}
              workflow -> {:multi_component, workflow_name}
            end
        end
        
      _ -> {:error, :unknown_request_type}
    end
  end

  defp handle_single_component_request(request, component, from, state) do
    request_id = generate_request_id()
    start_time = System.monotonic_time(:millisecond)
    
    # Add to active requests
    updated_active = Map.put(state.active_requests, request_id, {from, request, start_time})
    
    # Route to appropriate component
    case component do
      :brain ->
        spawn(fn ->
          result = route_to_brain(request)
          send(self(), {:request_completed, request_id, result})
        end)
        
      :braun ->
        spawn(fn ->
          result = route_to_braun(request)
          send(self(), {:request_completed, request_id, result})
        end)
        
      :beyond ->
        spawn(fn ->
          result = route_to_beyond(request)
          send(self(), {:request_completed, request_id, result})
        end)
    end
    
    updated_state = %{state | active_requests: updated_active}
    {:noreply, updated_state}
  end

  defp handle_multi_component_workflow(request, workflow_name, from, state) do
    request_id = generate_request_id()
    start_time = System.monotonic_time(:millisecond)
    
    # Add to active requests
    updated_active = Map.put(state.active_requests, request_id, {from, request, start_time})
    
    # Execute workflow asynchronously
    workflow_def = Map.get(state.workflow_definitions, workflow_name)
    
    spawn(fn ->
      result = execute_workflow(request, workflow_def, state)
      send(self(), {:request_completed, request_id, result})
    end)
    
    updated_state = %{state | active_requests: updated_active}
    {:noreply, updated_state}
  end

  defp route_to_brain(request) do
    case request.type do
      :code_analysis ->
        CognitiveEngine.analyze_code(request.payload.code, request.payload.context)
        
      :cognitive_reasoning ->
        CognitiveEngine.cognitive_reasoning(
          request.payload.problem, 
          request.payload.constraints, 
          request.payload.context
        )
        
      :emergence_detection ->
        CognitiveEngine.detect_emergence(request.payload.patterns, request.payload.threshold)
        
      _ ->
        {:error, :unsupported_brain_operation}
    end
  end

  defp route_to_braun(request) do
    # Route to Rust NIFs through appropriate Elixir wrapper
    case request.type do
      :quantum_optimization ->
        AiOsx.Braun.quantum_inspired_optimization(
          Jason.encode!(request.payload.problem),
          Jason.encode!(request.payload.parameters)
        )
        
      :matrix_computation ->
        AiOsx.Braun.compute_matrix_operations(
          request.payload.operation,
          Jason.encode!(request.payload.matrices)
        )
        
      :field_simulation ->
        AiOsx.Braun.simulate_field_dynamics(
          Jason.encode!(request.payload.field_state),
          Jason.encode!(request.payload.perturbation),
          request.payload.time_steps
        )
        
      _ ->
        {:error, :unsupported_braun_operation}
    end
  end

  defp route_to_beyond(request) do
    case request.type do
      :baml_function_call ->
        BamlRunner.call(request.payload.function_name, request.payload.parameters)
        
      _ ->
        {:error, :unsupported_beyond_operation}
    end
  end

  defp execute_workflow(request, workflow_def, state) do
    try do
      execute_workflow_steps(request, workflow_def.steps, %{}, state)
    rescue
      e ->
        Logger.error("Workflow execution failed: #{inspect(e)}")
        {:error, {:workflow_execution_failed, e}}
    end
  end

  defp execute_workflow_steps(_request, [], context, _state) do
    # All steps completed
    {:ok, context}
  end

  defp execute_workflow_steps(request, [step | remaining_steps], context, state) do
    case execute_workflow_step(request, step, context, state) do
      {:ok, updated_context} ->
        execute_workflow_steps(request, remaining_steps, updated_context, state)
        
      {:error, reason} ->
        Logger.error("Workflow step failed: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp execute_workflow_step(request, step, context, state) do
    case step.component do
      :brain ->
        brain_request = build_component_request(step, request, context)
        route_to_brain(brain_request)
        
      :braun ->
        braun_request = build_component_request(step, request, context)
        route_to_braun(braun_request)
        
      :beyond ->
        beyond_request = build_component_request(step, request, context)
        route_to_beyond(beyond_request)
        
      :coordination ->
        # Special coordination steps (e.g., data transformation, validation)
        execute_coordination_step(step, request, context, state)
    end
  end

  defp build_component_request(step, original_request, context) do
    %{
      type: step.operation,
      payload: merge_step_payload(step.payload, original_request.payload, context),
      context: Map.merge(original_request.context || %{}, context)
    }
  end

  defp merge_step_payload(step_payload, request_payload, context) do
    # Merge payloads with context variable substitution
    Map.merge(request_payload, step_payload)
    |> substitute_context_variables(context)
  end

  defp substitute_context_variables(payload, context) when is_map(payload) do
    Enum.into(payload, %{}, fn {key, value} ->
      {key, substitute_context_variables(value, context)}
    end)
  end

  defp substitute_context_variables(value, context) when is_binary(value) do
    # Simple variable substitution (e.g., "${step1.result}" -> context["step1"]["result"])
    case Regex.match?(~r/\$\{[^}]+\}/, value) do
      true ->
        Regex.replace(~r/\$\{([^}]+)\}/, value, fn _, var_path ->
          get_context_value(context, String.split(var_path, ".")) |> to_string()
        end)
      false ->
        value
    end
  end

  defp substitute_context_variables(value, _context), do: value

  defp get_context_value(context, [key]) do
    Map.get(context, key, "")
  end

  defp get_context_value(context, [key | rest]) when is_map(context) do
    case Map.get(context, key) do
      nil -> ""
      nested_context when is_map(nested_context) ->
        get_context_value(nested_context, rest)
      value ->
        value
    end
  end

  defp get_context_value(_context, _path), do: ""

  defp execute_coordination_step(step, request, context, state) do
    # Handle coordination-specific operations
    case step.operation do
      :validate_results ->
        validate_workflow_results(context, step.validation_rules)
        
      :transform_data ->
        transform_workflow_data(context, step.transformation_rules)
        
      :aggregate_results ->
        aggregate_workflow_results(context, step.aggregation_rules)
        
      _ ->
        {:error, :unknown_coordination_step}
    end
  end

  defp validate_workflow_results(context, validation_rules) do
    # Implement validation logic
    {:ok, context}
  end

  defp transform_workflow_data(context, transformation_rules) do
    # Implement data transformation logic
    {:ok, context}
  end

  defp aggregate_workflow_results(context, aggregation_rules) do
    # Implement result aggregation logic
    {:ok, context}
  end

  # Utility functions
  defp generate_request_id do
    :crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower)
  end

  defp initialize_routing_rules do
    %{
      # Component capabilities and load balancing rules
      brain: %{
        capabilities: [:code_analysis, :cognitive_reasoning, :emergence_detection],
        max_concurrent: 10,
        current_load: 0
      },
      braun: %{
        capabilities: [:quantum_optimization, :matrix_computation, :field_simulation],
        max_concurrent: 5,
        current_load: 0
      },
      beyond: %{
        capabilities: [:baml_function_call],
        max_concurrent: 15,
        current_load: 0
      }
    }
  end

  defp initialize_coordination_metrics do
    %{
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      average_response_time: 0.0,
      component_utilization: %{brain: 0.0, braun: 0.0, beyond: 0.0},
      workflow_execution_stats: %{}
    }
  end

  defp load_default_workflows do
    %{
      "comprehensive_analysis_workflow" => %{
        steps: [
          %{component: :brain, operation: :code_analysis, payload: %{}},
          %{component: :beyond, operation: :baml_function_call, payload: %{function_name: "SecurityAnalysis"}},
          %{component: :braun, operation: :quantum_optimization, payload: %{}},
          %{component: :coordination, operation: :aggregate_results, aggregation_rules: %{}}
        ]
      },
      "system_optimization_workflow" => %{
        steps: [
          %{component: :brain, operation: :emergence_detection, payload: %{}},
          %{component: :braun, operation: :field_simulation, payload: %{}},
          %{component: :beyond, operation: :baml_function_call, payload: %{function_name: "QuantumInspiredOptimization"}},
          %{component: :coordination, operation: :validate_results, validation_rules: %{}}
        ]
      }
    }
  end

  defp validate_workflow_definition(workflow_def) do
    case Map.get(workflow_def, :steps) do
      nil -> {:error, :missing_steps}
      steps when is_list(steps) -> :ok
      _ -> {:error, :invalid_steps_format}
    end
  end

  defp check_component_health(component_module) do
    try do
      case GenServer.call(component_module, :get_cognitive_state, 1000) do
        %{} -> :healthy
        _ -> :degraded
      end
    rescue
      _ -> :unhealthy
    catch
      :exit, _ -> :unhealthy
    end
  end

  defp check_braun_health do
    # Check Rust NIF health by attempting a simple computation
    try do
      case AiOsx.Braun.compute_matrix_operations("multiply", "[[1,2],[3,4]]") do
        {:ok, _} -> :healthy
        _ -> :degraded
      end
    rescue
      _ -> :unhealthy
    catch
      :exit, _ -> :unhealthy
    end
  end

  defp optimize_component_allocation(_state) do
    # Implement dynamic load balancing and resource allocation
    :ok
  end

  defp optimize_routing_rules(_state) do
    # Implement routing rule optimization based on performance metrics
    :ok
  end

  defp cleanup_completed_requests(_state) do
    # Clean up any completed request tracking data
    :ok
  end

  defp cleanup_request_queue(state) do
    # Remove any expired or invalid requests from queue
    state
  end

  defp update_completion_metrics(metrics, request, completion_time, outcome) do
    new_total = metrics.total_requests + 1
    
    {new_successful, new_failed} = case outcome do
      :success -> {metrics.successful_requests + 1, metrics.failed_requests}
      :error -> {metrics.successful_requests, metrics.failed_requests + 1}
    end
    
    new_avg_time = (metrics.average_response_time * metrics.total_requests + completion_time) / new_total
    
    %{metrics |
      total_requests: new_total,
      successful_requests: new_successful,
      failed_requests: new_failed,
      average_response_time: new_avg_time
    }
  end
end