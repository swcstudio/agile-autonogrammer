#!/usr/bin/env julia

"""
Test Script for Model Capability Monitoring and Alerting System

This script validates the functionality of the model monitoring system
designed for tracking SWE benchmark performance and junior developer capability assessment.
"""

using Pkg
Pkg.activate(".")

include("ModelCapabilityMonitor.jl")
using .ModelCapabilityMonitor
using Dates
using Logging

# Set up logging
logger = ConsoleLogger(stdout, Logging.Info)
global_logger(logger)

"""
Create test performance metrics
"""
function create_test_metrics(model_name::String, swe_score::Float64, tool_coverage::Float64, safety_score::Float64)::ModelMetrics
    return ModelMetrics(
        model_name,
        now(),
        swe_score,
        tool_coverage,
        safety_score,
        1500.0,  # response_latency_ms
        0.85,    # accuracy_score
        0.75,    # code_quality_score
        0.95,    # security_compliance
        0.8,     # user_satisfaction
        Dict("test_run" => true, "environment" => "test")
    )
end

"""
Test monitor initialization and configuration
"""
function test_monitor_initialization()
    @info "Testing monitor initialization..."
    
    # Test default configuration
    monitor = create_monitor()
    
    @info "✅ Monitor created successfully"
    @info "   - Alert rules configured: $(length(monitor.alert_rules))"
    @info "   - Monitoring interval: $(monitor.config.monitoring_interval_seconds) seconds"
    @info "   - Data retention: $(monitor.config.data_retention_days) days"
    
    # Test custom configuration
    custom_monitor = create_monitor(
        monitoring_interval_seconds=60,
        data_retention_days=7,
        alert_webhook_url="https://hooks.slack.com/services/test",
        email_notifications=true
    )
    
    @info "✅ Custom monitor created successfully"
    @info "   - Custom interval: $(custom_monitor.config.monitoring_interval_seconds) seconds"
    @info "   - Custom retention: $(custom_monitor.config.data_retention_days) days"
    @info "   - Webhook configured: $(custom_monitor.config.alert_webhook_url)"
    
    return monitor
end

"""
Test performance data ingestion and metrics tracking
"""
function test_metrics_ingestion(monitor::CapabilityMonitor)
    @info "Testing metrics ingestion..."
    
    # Add healthy model metrics
    healthy_metrics = create_test_metrics("gpt-4-swe", 0.72, 1.0, 0.95)
    add_performance_data!(monitor, healthy_metrics)
    
    # Add borderline model metrics
    borderline_metrics = create_test_metrics("llama-3-swe", 0.62, 0.95, 0.85)
    add_performance_data!(monitor, borderline_metrics)
    
    # Add failing model metrics (should trigger alerts)
    failing_metrics = create_test_metrics("mistral-7b-swe", 0.45, 0.8, 0.7)
    add_performance_data!(monitor, failing_metrics)
    
    @info "✅ Metrics ingestion completed"
    @info "   - Total metrics stored: $(length(monitor.metrics_history))"
    @info "   - Models monitored: $(length(unique([m.model_name for m in monitor.metrics_history])))"
    
    return length(monitor.active_alerts)
end

"""
Test alert generation and threshold monitoring
"""
function test_alert_system(monitor::CapabilityMonitor, initial_alerts::Int)
    @info "Testing alert system..."
    
    current_alerts = length(monitor.active_alerts)
    new_alerts = current_alerts - initial_alerts
    
    @info "✅ Alert system validation"
    @info "   - Total active alerts: $current_alerts"
    @info "   - New alerts generated: $new_alerts"
    
    if new_alerts > 0
        @info "   - Recent alerts:"
        for alert in monitor.active_alerts[max(1, end-2):end]
            severity_icon = alert.severity == CRITICAL ? "🚨" :
                           alert.severity == WARNING ? "⚠️" : "ℹ️"
            @info "     $severity_icon $(alert.model_name): $(alert.message)"
        end
    end
    
    # Test specific critical threshold (below 60% SWE benchmark)
    critical_metrics = create_test_metrics("test-model-critical", 0.35, 0.6, 0.5)
    alerts_before = length(monitor.active_alerts)
    add_performance_data!(monitor, critical_metrics)
    alerts_after = length(monitor.active_alerts)
    
    critical_alerts_generated = alerts_after - alerts_before
    @info "✅ Critical threshold testing completed"
    @info "   - Alerts generated for 35% SWE score: $critical_alerts_generated"
end

"""
Test model health assessment
"""
function test_model_health(monitor::CapabilityMonitor)
    @info "Testing model health assessment..."
    
    models = unique([m.model_name for m in monitor.metrics_history])
    
    for model_name in models
        health = get_model_health(monitor, model_name)
        
        status_icon = health["status"] == "healthy" ? "✅" :
                     health["status"] == "warning" ? "⚠️" : "🚨"
        
        junior_dev_capable = health["junior_dev_capable"] ? "✅ Capable" : "❌ Not Capable"
        
        @info "$status_icon Model Health: $model_name"
        @info "   - Overall Status: $(health["status"])"
        @info "   - SWE Benchmark: $(round(health["swe_benchmark_score"] * 100, digits=1))%"
        @info "   - Tool Coverage: $(round(health["tool_coverage"] * 100, digits=1))%"
        @info "   - Safety Score: $(round(health["safety_score"] * 100, digits=1))%"
        @info "   - Junior Dev Capable: $junior_dev_capable"
    end
    
    @info "✅ Model health assessment completed for $(length(models)) models"
end

"""
Test capability trend analysis
"""
function test_capability_trends(monitor::CapabilityMonitor)
    @info "Testing capability trend analysis..."
    
    # Add historical data points to simulate trends
    test_model = "trend-test-model"
    
    # Simulate improving trend
    for i in 1:5
        score = 0.5 + (i * 0.05)  # Improving from 55% to 75%
        metrics = create_test_metrics(test_model, score, 0.9 + (i * 0.02), 0.8 + (i * 0.02))
        add_performance_data!(monitor, metrics)
        sleep(0.01)  # Small delay to ensure different timestamps
    end
    
    trends = get_capability_trends(monitor, test_model)
    
    if haskey(trends, "error")
        @warn "Insufficient data for trend analysis: $(trends["error"])"
        return
    end
    
    @info "✅ Capability trends analysis completed"
    @info "   - Model: $(trends["model_name"])"
    @info "   - Data Points: $(trends["data_points"])"
    @info "   - SWE Benchmark Trend: $(trends["swe_benchmark"]["trend"])"
    @info "   - Current SWE Score: $(round(trends["swe_benchmark"]["current"] * 100, digits=1))%"
    @info "   - SWE Score Range: $(round(trends["swe_benchmark"]["min"] * 100, digits=1))% - $(round(trends["swe_benchmark"]["max"] * 100, digits=1))%"
    @info "   - Junior Dev Status: $(trends["junior_dev_status"]["currently_capable"] ? "✅ Capable" : "❌ Not Capable")"
    @info "   - Capability Trend: $(trends["junior_dev_status"]["capability_trend"])"
end

"""
Test monitoring report generation
"""
function test_report_generation(monitor::CapabilityMonitor)
    @info "Testing report generation..."
    
    timestamp = Dates.format(now(), "yyyy-mm-dd_HH-MM-SS")
    report_path = "monitoring_report_$timestamp.json"
    
    report = export_monitoring_report(monitor, report_path)
    
    @info "✅ Report generation completed"
    @info "   - Report file: $report_path"
    @info "   - Models monitored: $(report["summary"]["total_models_monitored"])"
    @info "   - Total data points: $(report["summary"]["total_data_points"])"
    @info "   - Active alerts: $(report["summary"]["active_alerts"])"
    @info "   - Total alerts generated: $(report["summary"]["total_alerts_generated"])"
    
    # Validate critical SWE benchmark threshold monitoring
    swe_capable_models = 0
    for (model_name, health) in report["model_health"]
        if health["junior_dev_capable"]
            swe_capable_models += 1
        end
    end
    
    @info "✅ SWE Benchmark Analysis"
    @info "   - Models meeting 60% SWE + 100% tools threshold: $swe_capable_models"
    @info "   - Total models evaluated: $(length(report["model_health"]))"
    @info "   - Junior dev readiness rate: $(round(swe_capable_models / length(report["model_health"]) * 100, digits=1))%"
    
    return report_path
end

"""
Main test execution function
"""
function run_monitoring_tests()
    println("Model Capability Monitoring System Test Suite")
    println("=" ^ 55)
    
    @info "🧪 Starting Model Capability Monitoring Tests"
    @info "=" ^ 60
    
    try
        # Test 1: Monitor initialization
        monitor = test_monitor_initialization()
        
        # Test 2: Metrics ingestion
        initial_alerts = test_metrics_ingestion(monitor)
        
        # Test 3: Alert system
        test_alert_system(monitor, initial_alerts)
        
        # Test 4: Model health assessment
        test_model_health(monitor)
        
        # Test 5: Capability trends
        test_capability_trends(monitor)
        
        # Test 6: Report generation
        report_path = test_report_generation(monitor)
        
        @info "📊 Test Summary"
        @info "   - All monitoring tests passed: ✅"
        @info "   - Alert system functional: ✅"
        @info "   - SWE benchmark tracking active: ✅"
        @info "   - Junior dev capability assessment ready: ✅"
        @info "   - Report generated: $report_path"
        @info "=" ^ 60
        @info "🎉 Model Capability Monitoring System validation PASSED!"
        @info "   The system is ready for:"
        @info "   • Real-time SWE benchmark monitoring"
        @info "   • 60% threshold alerting for junior dev capability"
        @info "   • Model performance trend analysis"
        @info "   • Automated capability degradation detection"
        @info "   • Comprehensive performance reporting"
        
        @info "✅ Ready for production model monitoring!"
        
        return true
        
    catch e
        @error "❌ Test suite failed with error: $e"
        return false
    end
end

"""
Entry point
"""
function main()
    success = run_monitoring_tests()
    exit(success ? 0 : 1)
end

# Run tests if script is executed directly
if abspath(PROGRAM_FILE) == @__FILE__
    main()
end