#!/usr/bin/env julia

"""
Model Capability Monitoring and Alerting System

This module provides comprehensive monitoring for ML/LLM model capabilities,
specifically designed for SWE benchmark tracking and junior developer capability assessment.
Implements real-time performance monitoring, threshold alerting, and capability trend analysis.
"""

module ModelCapabilityMonitor

using Dates
using JSON3
using Statistics
using Logging
using HTTP

export CapabilityMonitor, ModelMetrics, AlertLevel, AlertRule, MonitoringConfig
export create_monitor, add_performance_data, check_thresholds, generate_alerts
export get_model_health, get_capability_trends, export_monitoring_report

"""
Alert severity levels for model capability monitoring
"""
@enum AlertLevel begin
    INFO = 1
    WARNING = 2
    CRITICAL = 3
    EMERGENCY = 4
end

"""
Model performance metrics structure
"""
struct ModelMetrics
    model_name::String
    timestamp::DateTime
    swe_benchmark_score::Float64
    tool_coverage::Float64
    safety_score::Float64
    response_latency_ms::Float64
    accuracy_score::Float64
    code_quality_score::Float64
    security_compliance::Float64
    user_satisfaction::Float64
    metadata::Dict{String, Any}
end

"""
Alert rule configuration for automated monitoring
"""
struct AlertRule
    name::String
    metric_name::String
    threshold::Float64
    operator::String  # "lt", "gt", "eq"
    severity::AlertLevel
    cooldown_minutes::Int
    enabled::Bool
end

"""
Generated alert from monitoring system
"""
struct Alert
    id::String
    rule_name::String
    model_name::String
    metric_name::String
    current_value::Float64
    threshold::Float64
    severity::AlertLevel
    timestamp::DateTime
    message::String
    acknowledged::Bool
end

"""
Monitoring system configuration
"""
struct MonitoringConfig
    monitoring_interval_seconds::Int
    data_retention_days::Int
    alert_webhook_url::String
    email_notifications::Bool
    dashboard_enabled::Bool
    export_format::String
    minimum_data_points::Int
    trend_analysis_window_hours::Int
end

"""
Main monitoring system state
"""
mutable struct CapabilityMonitor
    config::MonitoringConfig
    metrics_history::Vector{ModelMetrics}
    alert_rules::Vector{AlertRule}
    active_alerts::Vector{Alert}
    alert_history::Vector{Alert}
    model_health_cache::Dict{String, Dict{String, Any}}
    last_alert_times::Dict{String, DateTime}
    
    function CapabilityMonitor(config::MonitoringConfig)
        new(
            config,
            Vector{ModelMetrics}(),
            Vector{AlertRule}(),
            Vector{Alert}(),
            Vector{Alert}(),
            Dict{String, Dict{String, Any}}(),
            Dict{String, DateTime}()
        )
    end
end

"""
Create capability monitor with default configuration
"""
function create_monitor(;
    monitoring_interval_seconds::Int = 300,
    data_retention_days::Int = 30,
    alert_webhook_url::String = "",
    email_notifications::Bool = false,
    dashboard_enabled::Bool = true,
    export_format::String = "json",
    minimum_data_points::Int = 3,
    trend_analysis_window_hours::Int = 24
)::CapabilityMonitor
    
    config = MonitoringConfig(
        monitoring_interval_seconds,
        data_retention_days,
        alert_webhook_url,
        email_notifications,
        dashboard_enabled,
        export_format,
        minimum_data_points,
        trend_analysis_window_hours
    )
    
    monitor = CapabilityMonitor(config)
    
    # Add default alert rules for SWE benchmark monitoring
    add_default_alert_rules!(monitor)
    
    @info "Model capability monitor created with $(length(monitor.alert_rules)) alert rules"
    return monitor
end

"""
Add default alert rules for critical model capability monitoring
"""
function add_default_alert_rules!(monitor::CapabilityMonitor)
    default_rules = [
        AlertRule("swe_benchmark_critical", "swe_benchmark_score", 0.6, "lt", CRITICAL, 15, true),
        AlertRule("swe_benchmark_warning", "swe_benchmark_score", 0.65, "lt", WARNING, 5, true),
        AlertRule("tool_coverage_critical", "tool_coverage", 1.0, "lt", CRITICAL, 10, true),
        AlertRule("safety_compliance", "safety_score", 0.8, "lt", EMERGENCY, 0, true),
        AlertRule("response_latency", "response_latency_ms", 5000.0, "gt", WARNING, 30, true),
        AlertRule("accuracy_degradation", "accuracy_score", 0.7, "lt", WARNING, 20, true),
        AlertRule("code_quality_drop", "code_quality_score", 0.6, "lt", WARNING, 25, true),
        AlertRule("security_violation", "security_compliance", 0.9, "lt", CRITICAL, 5, true)
    ]
    
    append!(monitor.alert_rules, default_rules)
end

"""
Add performance data point to monitoring system
"""
function add_performance_data!(
    monitor::CapabilityMonitor, 
    metrics::ModelMetrics
)
    push!(monitor.metrics_history, metrics)
    
    # Clean up old data points
    cleanup_old_data!(monitor)
    
    # Update model health cache
    update_model_health_cache!(monitor, metrics)
    
    # Check thresholds and generate alerts
    check_thresholds(monitor, metrics)
    
    @info "Added performance data for model $(metrics.model_name)" swe_score=metrics.swe_benchmark_score
end

"""
Check alert thresholds and generate alerts if needed
"""
function check_thresholds(monitor::CapabilityMonitor, metrics::ModelMetrics)
    for rule in monitor.alert_rules
        if !rule.enabled
            continue
        end
        
        # Check cooldown period
        rule_key = "$(metrics.model_name)_$(rule.name)"
        if haskey(monitor.last_alert_times, rule_key)
            last_alert = monitor.last_alert_times[rule_key]
            cooldown = Dates.Minute(rule.cooldown_minutes)
            if now() - last_alert < cooldown
                continue
            end
        end
        
        # Extract metric value
        metric_value = get_metric_value(metrics, rule.metric_name)
        if metric_value === nothing
            continue
        end
        
        # Check threshold
        threshold_violated = false
        if rule.operator == "lt" && metric_value < rule.threshold
            threshold_violated = true
        elseif rule.operator == "gt" && metric_value > rule.threshold
            threshold_violated = true
        elseif rule.operator == "eq" && metric_value == rule.threshold
            threshold_violated = true
        end
        
        if threshold_violated
            generate_alert!(monitor, rule, metrics, metric_value)
        end
    end
end

"""
Generate alert for threshold violation
"""
function generate_alert!(
    monitor::CapabilityMonitor,
    rule::AlertRule,
    metrics::ModelMetrics,
    current_value::Float64
)
    alert_id = string(hash((rule.name, metrics.model_name, metrics.timestamp)))
    
    message = create_alert_message(rule, metrics, current_value)
    
    alert = Alert(
        alert_id,
        rule.name,
        metrics.model_name,
        rule.metric_name,
        current_value,
        rule.threshold,
        rule.severity,
        now(),
        message,
        false
    )
    
    push!(monitor.active_alerts, alert)
    push!(monitor.alert_history, alert)
    
    # Record alert time for cooldown
    rule_key = "$(metrics.model_name)_$(rule.name)"
    monitor.last_alert_times[rule_key] = now()
    
    # Send notifications
    send_alert_notifications(monitor, alert)
    
    @warn "Alert generated" rule=rule.name model=metrics.model_name severity=rule.severity
end

"""
Create human-readable alert message
"""
function create_alert_message(rule::AlertRule, metrics::ModelMetrics, current_value::Float64)::String
    severity_str = string(rule.severity)
    
    if rule.metric_name == "swe_benchmark_score"
        return "$(severity_str): Model $(metrics.model_name) SWE benchmark score dropped to $(round(current_value * 100, digits=1))% (threshold: $(round(rule.threshold * 100, digits=1))%). Junior developer capability may be compromised."
    elseif rule.metric_name == "tool_coverage"
        return "$(severity_str): Model $(metrics.model_name) tool coverage is $(round(current_value * 100, digits=1))% (threshold: $(round(rule.threshold * 100, digits=1))%). Missing tools may impact problem-solving ability."
    elseif rule.metric_name == "safety_score"
        return "$(severity_str): Model $(metrics.model_name) safety score dropped to $(round(current_value * 100, digits=1))% (threshold: $(round(rule.threshold * 100, digits=1))%). IMMEDIATE ATTENTION REQUIRED."
    else
        return "$(severity_str): Model $(metrics.model_name) $(rule.metric_name) is $(round(current_value, digits=3)) (threshold: $(rule.threshold))"
    end
end

"""
Send alert notifications via configured channels
"""
function send_alert_notifications(monitor::CapabilityMonitor, alert::Alert)
    # Webhook notification
    if !isempty(monitor.config.alert_webhook_url)
        send_webhook_alert(monitor.config.alert_webhook_url, alert)
    end
    
    # Console logging
    log_level = alert.severity == EMERGENCY ? Logging.Error : 
               alert.severity == CRITICAL ? Logging.Error :
               alert.severity == WARNING ? Logging.Warn : Logging.Info
    
    @logmsg log_level "🚨 ALERT: $(alert.message)"
end

"""
Send webhook alert notification
"""
function send_webhook_alert(webhook_url::String, alert::Alert)
    try
        payload = Dict(
            "alert_id" => alert.id,
            "model_name" => alert.model_name,
            "severity" => string(alert.severity),
            "message" => alert.message,
            "timestamp" => string(alert.timestamp),
            "metric_name" => alert.metric_name,
            "current_value" => alert.current_value,
            "threshold" => alert.threshold
        )
        
        response = HTTP.post(webhook_url, 
            headers=["Content-Type" => "application/json"],
            body=JSON3.write(payload)
        )
        
        @info "Alert webhook sent successfully" status=response.status
    catch e
        @error "Failed to send webhook alert" error=e
    end
end

"""
Get current model health summary
"""
function get_model_health(monitor::CapabilityMonitor, model_name::String)::Dict{String, Any}
    if haskey(monitor.model_health_cache, model_name)
        return monitor.model_health_cache[model_name]
    end
    
    # Calculate health from recent metrics
    recent_metrics = filter(m -> m.model_name == model_name, monitor.metrics_history)
    if isempty(recent_metrics)
        return Dict("status" => "unknown", "reason" => "no_data")
    end
    
    latest = recent_metrics[end]
    health = calculate_health_status(latest)
    
    monitor.model_health_cache[model_name] = health
    return health
end

"""
Calculate model health status from metrics
"""
function calculate_health_status(metrics::ModelMetrics)::Dict{String, Any}
    # Health scoring based on critical metrics
    swe_health = metrics.swe_benchmark_score >= 0.6 ? 1.0 : 0.0
    tool_health = metrics.tool_coverage >= 1.0 ? 1.0 : 0.0
    safety_health = metrics.safety_score >= 0.8 ? 1.0 : 0.0
    
    overall_health = (swe_health + tool_health + safety_health) / 3.0
    
    status = if overall_health >= 0.8
        "healthy"
    elseif overall_health >= 0.6
        "warning"
    else
        "critical"
    end
    
    return Dict(
        "status" => status,
        "overall_health" => overall_health,
        "swe_benchmark_score" => metrics.swe_benchmark_score,
        "tool_coverage" => metrics.tool_coverage,
        "safety_score" => metrics.safety_score,
        "last_updated" => metrics.timestamp,
        "junior_dev_capable" => metrics.swe_benchmark_score >= 0.6 && metrics.tool_coverage >= 1.0
    )
end

"""
Get capability trends for a model over time
"""
function get_capability_trends(monitor::CapabilityMonitor, model_name::String)::Dict{String, Any}
    model_metrics = filter(m -> m.model_name == model_name, monitor.metrics_history)
    
    if length(model_metrics) < monitor.config.minimum_data_points
        return Dict("error" => "insufficient_data", "required" => monitor.config.minimum_data_points)
    end
    
    # Sort by timestamp
    sort!(model_metrics, by=m -> m.timestamp)
    
    # Calculate trends
    swe_scores = [m.swe_benchmark_score for m in model_metrics]
    tool_coverage = [m.tool_coverage for m in model_metrics]
    safety_scores = [m.safety_score for m in model_metrics]
    
    return Dict(
        "model_name" => model_name,
        "data_points" => length(model_metrics),
        "time_range" => (model_metrics[1].timestamp, model_metrics[end].timestamp),
        "swe_benchmark" => Dict(
            "current" => swe_scores[end],
            "trend" => calculate_trend(swe_scores),
            "mean" => mean(swe_scores),
            "min" => minimum(swe_scores),
            "max" => maximum(swe_scores)
        ),
        "tool_coverage" => Dict(
            "current" => tool_coverage[end],
            "trend" => calculate_trend(tool_coverage),
            "mean" => mean(tool_coverage)
        ),
        "safety" => Dict(
            "current" => safety_scores[end],
            "trend" => calculate_trend(safety_scores),
            "mean" => mean(safety_scores)
        ),
        "junior_dev_status" => Dict(
            "currently_capable" => swe_scores[end] >= 0.6 && tool_coverage[end] >= 1.0,
            "capability_trend" => swe_scores[end] >= 0.6 ? "maintaining" : "degraded"
        )
    )
end

"""
Calculate trend direction from time series data
"""
function calculate_trend(values::Vector{Float64})::String
    if length(values) < 2
        return "insufficient_data"
    end
    
    # Simple linear trend calculation
    n = length(values)
    x = collect(1:n)
    y = values
    
    mean_x = mean(x)
    mean_y = mean(y)
    
    numerator = sum((x .- mean_x) .* (y .- mean_y))
    denominator = sum((x .- mean_x) .^ 2)
    
    if denominator == 0
        return "flat"
    end
    
    slope = numerator / denominator
    
    if slope > 0.01
        return "improving"
    elseif slope < -0.01
        return "declining"
    else
        return "stable"
    end
end

"""
Export comprehensive monitoring report
"""
function export_monitoring_report(monitor::CapabilityMonitor, filepath::String)
    report = Dict(
        "generated_at" => now(),
        "monitoring_config" => monitor.config,
        "summary" => Dict(
            "total_models_monitored" => length(unique([m.model_name for m in monitor.metrics_history])),
            "total_data_points" => length(monitor.metrics_history),
            "active_alerts" => length(monitor.active_alerts),
            "total_alerts_generated" => length(monitor.alert_history)
        ),
        "model_health" => Dict(
            model_name => get_model_health(monitor, model_name)
            for model_name in unique([m.model_name for m in monitor.metrics_history])
        ),
        "capability_trends" => Dict(
            model_name => get_capability_trends(monitor, model_name)
            for model_name in unique([m.model_name for m in monitor.metrics_history])
        ),
        "alert_summary" => Dict(
            "active" => [
                Dict(
                    "id" => a.id,
                    "model" => a.model_name,
                    "severity" => string(a.severity),
                    "message" => a.message,
                    "timestamp" => a.timestamp
                ) for a in monitor.active_alerts
            ],
            "recent_history" => [
                Dict(
                    "id" => a.id,
                    "model" => a.model_name,
                    "severity" => string(a.severity),
                    "message" => a.message,
                    "timestamp" => a.timestamp
                ) for a in monitor.alert_history[max(1, end-10):end]
            ]
        )
    )
    
    open(filepath, "w") do file
        write(file, JSON3.write(report, allow_inf=true))
    end
    
    @info "Monitoring report exported to $(filepath)"
    return report
end

"""
Utility functions
"""

function get_metric_value(metrics::ModelMetrics, metric_name::String)
    if metric_name == "swe_benchmark_score"
        return metrics.swe_benchmark_score
    elseif metric_name == "tool_coverage"
        return metrics.tool_coverage
    elseif metric_name == "safety_score"
        return metrics.safety_score
    elseif metric_name == "response_latency_ms"
        return metrics.response_latency_ms
    elseif metric_name == "accuracy_score"
        return metrics.accuracy_score
    elseif metric_name == "code_quality_score"
        return metrics.code_quality_score
    elseif metric_name == "security_compliance"
        return metrics.security_compliance
    elseif metric_name == "user_satisfaction"
        return metrics.user_satisfaction
    else
        return nothing
    end
end

function cleanup_old_data!(monitor::CapabilityMonitor)
    cutoff_date = now() - Dates.Day(monitor.config.data_retention_days)
    
    # Clean metrics history
    filter!(m -> m.timestamp >= cutoff_date, monitor.metrics_history)
    
    # Clean alert history (keep active alerts regardless of age)
    filter!(a -> a.timestamp >= cutoff_date, monitor.alert_history)
    
    # Clear health cache to force recalculation
    empty!(monitor.model_health_cache)
end

function update_model_health_cache!(monitor::CapabilityMonitor, metrics::ModelMetrics)
    monitor.model_health_cache[metrics.model_name] = calculate_health_status(metrics)
end

end # module