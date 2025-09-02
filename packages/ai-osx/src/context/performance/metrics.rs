use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::{HashMap, VecDeque};
use chrono::{DateTime, Utc};
use prometheus::{
    Counter, CounterVec, Gauge, GaugeVec, Histogram, HistogramVec, 
    Registry, Encoder, TextEncoder
};
use sysinfo::{System, SystemExt, ProcessExt, CpuExt, NetworkExt, DiskExt};
use tracing::{info, warn, error};

/// High-performance metrics collection system
pub struct MetricsCollector {
    registry: Registry,
    system_info: Arc<RwLock<System>>,
    
    // System metrics
    cpu_usage_gauge: GaugeVec,
    memory_usage_gauge: GaugeVec,
    disk_io_gauge: GaugeVec,
    network_io_gauge: GaugeVec,
    
    // Application metrics
    request_duration: HistogramVec,
    request_count: CounterVec,
    error_count: CounterVec,
    active_connections: Gauge,
    
    // AI metrics
    ai_inference_duration: HistogramVec,
    ai_token_count: CounterVec,
    ai_cache_hit_ratio: Gauge,
    
    // Custom metrics
    custom_metrics: Arc<RwLock<HashMap<String, f64>>>,
    
    // Historical data
    historical_metrics: Arc<RwLock<VecDeque<SystemMetrics>>>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        let registry = Registry::new();
        
        // Initialize system metrics
        let cpu_usage_gauge = GaugeVec::new(
            prometheus::Opts::new("system_cpu_usage", "CPU usage percentage"),
            &["core"]
        ).unwrap();
        registry.register(Box::new(cpu_usage_gauge.clone())).unwrap();
        
        let memory_usage_gauge = GaugeVec::new(
            prometheus::Opts::new("system_memory_usage", "Memory usage in bytes"),
            &["type"]
        ).unwrap();
        registry.register(Box::new(memory_usage_gauge.clone())).unwrap();
        
        let disk_io_gauge = GaugeVec::new(
            prometheus::Opts::new("system_disk_io", "Disk I/O operations"),
            &["operation", "disk"]
        ).unwrap();
        registry.register(Box::new(disk_io_gauge.clone())).unwrap();
        
        let network_io_gauge = GaugeVec::new(
            prometheus::Opts::new("system_network_io", "Network I/O bytes"),
            &["interface", "direction"]
        ).unwrap();
        registry.register(Box::new(network_io_gauge.clone())).unwrap();
        
        // Initialize application metrics
        let request_duration = HistogramVec::new(
            prometheus::HistogramOpts::new("http_request_duration_seconds", "HTTP request duration"),
            &["method", "endpoint", "status"]
        ).unwrap();
        registry.register(Box::new(request_duration.clone())).unwrap();
        
        let request_count = CounterVec::new(
            prometheus::Opts::new("http_requests_total", "Total HTTP requests"),
            &["method", "endpoint", "status"]
        ).unwrap();
        registry.register(Box::new(request_count.clone())).unwrap();
        
        let error_count = CounterVec::new(
            prometheus::Opts::new("errors_total", "Total errors"),
            &["type", "severity"]
        ).unwrap();
        registry.register(Box::new(error_count.clone())).unwrap();
        
        let active_connections = Gauge::new(
            prometheus::Opts::new("active_connections", "Number of active connections")
        ).unwrap();
        registry.register(Box::new(active_connections.clone())).unwrap();
        
        // Initialize AI metrics
        let ai_inference_duration = HistogramVec::new(
            prometheus::HistogramOpts::new("ai_inference_duration_seconds", "AI model inference duration"),
            &["model", "task"]
        ).unwrap();
        registry.register(Box::new(ai_inference_duration.clone())).unwrap();
        
        let ai_token_count = CounterVec::new(
            prometheus::Opts::new("ai_tokens_total", "Total AI tokens processed"),
            &["model", "type"]
        ).unwrap();
        registry.register(Box::new(ai_token_count.clone())).unwrap();
        
        let ai_cache_hit_ratio = Gauge::new(
            prometheus::Opts::new("ai_cache_hit_ratio", "AI response cache hit ratio")
        ).unwrap();
        registry.register(Box::new(ai_cache_hit_ratio.clone())).unwrap();
        
        Self {
            registry,
            system_info: Arc::new(RwLock::new(System::new_all())),
            cpu_usage_gauge,
            memory_usage_gauge,
            disk_io_gauge,
            network_io_gauge,
            request_duration,
            request_count,
            error_count,
            active_connections,
            ai_inference_duration,
            ai_token_count,
            ai_cache_hit_ratio,
            custom_metrics: Arc::new(RwLock::new(HashMap::new())),
            historical_metrics: Arc::new(RwLock::new(VecDeque::with_capacity(1000))),
        }
    }

    pub async fn collect_system_metrics(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut system = self.system_info.write().await;
        system.refresh_all();
        
        // Collect CPU metrics
        for (i, cpu) in system.cpus().iter().enumerate() {
            self.cpu_usage_gauge
                .with_label_values(&[&i.to_string()])
                .set(cpu.cpu_usage() as f64);
        }
        
        // Collect memory metrics
        self.memory_usage_gauge
            .with_label_values(&["used"])
            .set(system.used_memory() as f64);
        
        self.memory_usage_gauge
            .with_label_values(&["total"])
            .set(system.total_memory() as f64);
        
        self.memory_usage_gauge
            .with_label_values(&["available"])
            .set(system.available_memory() as f64);
        
        self.memory_usage_gauge
            .with_label_values(&["swap_used"])
            .set(system.used_swap() as f64);
        
        // Collect disk I/O metrics
        for disk in system.disks() {
            let disk_name = disk.name().to_string_lossy();
            
            self.disk_io_gauge
                .with_label_values(&["read", &disk_name])
                .set(0.0); // Would need additional tracking for actual I/O rates
            
            self.disk_io_gauge
                .with_label_values(&["write", &disk_name])
                .set(0.0);
            
            self.disk_io_gauge
                .with_label_values(&["available", &disk_name])
                .set(disk.available_space() as f64);
        }
        
        // Collect network metrics
        for (interface_name, data) in system.networks() {
            self.network_io_gauge
                .with_label_values(&[interface_name, "received"])
                .set(data.received() as f64);
            
            self.network_io_gauge
                .with_label_values(&[interface_name, "transmitted"])
                .set(data.transmitted() as f64);
            
            self.network_io_gauge
                .with_label_values(&[interface_name, "packets_received"])
                .set(data.packets_received() as f64);
            
            self.network_io_gauge
                .with_label_values(&[interface_name, "packets_transmitted"])
                .set(data.packets_transmitted() as f64);
        }
        
        // Store historical snapshot
        let snapshot = self.create_system_snapshot(&system).await;
        let mut historical = self.historical_metrics.write().await;
        historical.push_back(snapshot);
        
        if historical.len() > 1000 {
            historical.pop_front();
        }
        
        Ok(())
    }

    async fn create_system_snapshot(&self, system: &System) -> SystemMetrics {
        use super::{SystemMetrics, DiskIO, NetworkIO, LatencyPercentiles};
        
        let cpu_usage = system.global_cpu_info().cpu_usage() as f64;
        let memory_usage = (system.used_memory() as f64 / system.total_memory() as f64) * 100.0;
        
        SystemMetrics {
            cpu_usage,
            memory_usage,
            disk_io: DiskIO {
                read_bytes_per_sec: 0,
                write_bytes_per_sec: 0,
                iops: 0,
            },
            network_io: NetworkIO {
                bytes_received_per_sec: 0,
                bytes_sent_per_sec: 0,
                packets_received_per_sec: 0,
                packets_sent_per_sec: 0,
            },
            latency_percentiles: LatencyPercentiles {
                p50: 0.0,
                p75: 0.0,
                p90: 0.0,
                p95: 0.0,
                p99: 0.0,
            },
            throughput: 0.0,
            error_rate: 0.0,
        }
    }

    pub async fn record_request(&self, method: &str, endpoint: &str, status: u16, duration: f64) {
        let status_str = status.to_string();
        
        self.request_duration
            .with_label_values(&[method, endpoint, &status_str])
            .observe(duration);
        
        self.request_count
            .with_label_values(&[method, endpoint, &status_str])
            .inc();
    }

    pub async fn record_error(&self, error_type: &str, severity: &str) {
        self.error_count
            .with_label_values(&[error_type, severity])
            .inc();
    }

    pub async fn record_ai_inference(&self, model: &str, task: &str, duration: f64, tokens: u64) {
        self.ai_inference_duration
            .with_label_values(&[model, task])
            .observe(duration);
        
        self.ai_token_count
            .with_label_values(&[model, "input"])
            .inc_by(tokens);
    }

    pub async fn update_ai_cache_ratio(&self, ratio: f64) {
        self.ai_cache_hit_ratio.set(ratio);
    }

    pub async fn update_active_connections(&self, count: f64) {
        self.active_connections.set(count);
    }

    pub async fn record_custom_metric(&self, name: &str, value: f64, _tags: HashMap<String, String>) {
        let mut metrics = self.custom_metrics.write().await;
        metrics.insert(name.to_string(), value);
    }

    pub async fn check_thresholds(&self, thresholds: &super::AlertThresholds) -> Result<(), Box<dyn std::error::Error>> {
        let system = self.system_info.read().await;
        
        let cpu_usage = system.global_cpu_info().cpu_usage();
        if cpu_usage > thresholds.cpu_percent as f32 {
            warn!("CPU usage {} exceeds threshold {}", cpu_usage, thresholds.cpu_percent);
            self.trigger_alert("cpu_high", &format!("CPU usage: {}%", cpu_usage)).await?;
        }
        
        let memory_percent = (system.used_memory() as f64 / system.total_memory() as f64) * 100.0;
        if memory_percent > thresholds.memory_percent {
            warn!("Memory usage {} exceeds threshold {}", memory_percent, thresholds.memory_percent);
            self.trigger_alert("memory_high", &format!("Memory usage: {:.2}%", memory_percent)).await?;
        }
        
        Ok(())
    }

    async fn trigger_alert(&self, alert_type: &str, message: &str) -> Result<(), Box<dyn std::error::Error>> {
        // In production, this would send to alerting systems (PagerDuty, Slack, etc.)
        error!("ALERT [{}]: {}", alert_type, message);
        
        // Record the alert as an error metric
        self.record_error(alert_type, "critical").await;
        
        Ok(())
    }

    pub async fn get_current_metrics(&self) -> super::SystemMetrics {
        let system = self.system_info.read().await;
        self.create_system_snapshot(&system).await
    }

    pub async fn get_historical_metrics(&self) -> Vec<super::SystemMetrics> {
        let historical = self.historical_metrics.read().await;
        historical.iter().cloned().collect()
    }

    pub async fn export_prometheus(&self) -> String {
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        let mut buffer = Vec::new();
        encoder.encode(&metric_families, &mut buffer).unwrap();
        String::from_utf8(buffer).unwrap_or_default()
    }

    pub async fn calculate_latency_percentiles(&self, latencies: Vec<f64>) -> super::LatencyPercentiles {
        let mut sorted = latencies.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        
        let len = sorted.len();
        if len == 0 {
            return super::LatencyPercentiles {
                p50: 0.0,
                p75: 0.0,
                p90: 0.0,
                p95: 0.0,
                p99: 0.0,
            };
        }
        
        super::LatencyPercentiles {
            p50: sorted[len * 50 / 100],
            p75: sorted[len * 75 / 100],
            p90: sorted[len * 90 / 100],
            p95: sorted[len * 95 / 100],
            p99: sorted[len * 99 / 100],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_metrics_collector() {
        let collector = MetricsCollector::new();
        
        // Test system metrics collection
        assert!(collector.collect_system_metrics().await.is_ok());
        
        // Test request recording
        collector.record_request("GET", "/api/v1/test", 200, 0.123).await;
        collector.record_request("POST", "/api/v1/create", 201, 0.456).await;
        
        // Test AI metrics
        collector.record_ai_inference("gpt-4", "completion", 1.234, 1500).await;
        collector.update_ai_cache_ratio(0.85).await;
        
        // Test custom metrics
        let mut tags = HashMap::new();
        tags.insert("service".to_string(), "test".to_string());
        collector.record_custom_metric("test_metric", 42.0, tags).await;
        
        // Export and verify Prometheus format
        let prometheus_output = collector.export_prometheus().await;
        assert!(prometheus_output.contains("system_cpu_usage"));
        assert!(prometheus_output.contains("http_request_duration_seconds"));
    }
}