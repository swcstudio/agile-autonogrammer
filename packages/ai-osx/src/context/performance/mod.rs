use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::{HashMap, VecDeque};
use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use prometheus::{Counter, Gauge, Histogram, HistogramVec, Registry};
use opentelemetry::{
    global,
    trace::{Tracer, Span, StatusCode, TraceError},
    metrics::{Meter, MeterProvider},
    KeyValue,
};
use tracing::{info, warn, error, debug, instrument};

pub mod metrics;
pub mod profiler;
pub mod optimizer;
pub mod predictor;
pub mod telemetry;

use metrics::*;
use profiler::*;
use optimizer::*;
use predictor::*;
use telemetry::*;

/// Production-ready performance monitoring system with predictive analytics
pub struct PerformanceMonitor {
    metrics_collector: Arc<MetricsCollector>,
    profiler: Arc<PerformanceProfiler>,
    optimizer: Arc<AdaptiveOptimizer>,
    predictor: Arc<PerformancePredictor>,
    telemetry: Arc<TelemetryEngine>,
    config: PerformanceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    pub sampling_rate: f64,
    pub buffer_size: usize,
    pub alert_thresholds: AlertThresholds,
    pub optimization_enabled: bool,
    pub prediction_enabled: bool,
    pub telemetry_endpoint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertThresholds {
    pub cpu_percent: f64,
    pub memory_percent: f64,
    pub latency_p95_ms: u64,
    pub error_rate_percent: f64,
    pub throughput_rps: u64,
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            sampling_rate: 0.1,
            buffer_size: 10000,
            alert_thresholds: AlertThresholds {
                cpu_percent: 80.0,
                memory_percent: 85.0,
                latency_p95_ms: 1000,
                error_rate_percent: 1.0,
                throughput_rps: 100,
            },
            optimization_enabled: true,
            prediction_enabled: true,
            telemetry_endpoint: "http://localhost:4318".to_string(),
        }
    }
}

impl PerformanceMonitor {
    pub fn new(config: PerformanceConfig) -> Self {
        let metrics_collector = Arc::new(MetricsCollector::new());
        let profiler = Arc::new(PerformanceProfiler::new());
        let optimizer = Arc::new(AdaptiveOptimizer::new());
        let predictor = Arc::new(PerformancePredictor::new());
        let telemetry = Arc::new(TelemetryEngine::new(&config.telemetry_endpoint));

        Self {
            metrics_collector,
            profiler,
            optimizer,
            predictor,
            telemetry,
            config,
        }
    }

    /// Start comprehensive performance monitoring
    #[instrument(skip(self))]
    pub async fn start(&self) -> Result<(), PerformanceError> {
        info!("Starting performance monitoring system");
        
        // Initialize telemetry
        self.telemetry.initialize().await?;
        
        // Start metrics collection
        self.start_metrics_collection().await?;
        
        // Start profiling
        self.start_profiling().await?;
        
        // Start optimization engine if enabled
        if self.config.optimization_enabled {
            self.start_optimization().await?;
        }
        
        // Start predictive analytics if enabled
        if self.config.prediction_enabled {
            self.start_prediction().await?;
        }
        
        Ok(())
    }

    async fn start_metrics_collection(&self) -> Result<(), PerformanceError> {
        let collector = self.metrics_collector.clone();
        let config = self.config.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
            
            loop {
                interval.tick().await;
                
                // Collect system metrics
                if let Err(e) = collector.collect_system_metrics().await {
                    error!("Failed to collect system metrics: {}", e);
                }
                
                // Check thresholds and trigger alerts
                if let Err(e) = collector.check_thresholds(&config.alert_thresholds).await {
                    error!("Failed to check thresholds: {}", e);
                }
            }
        });
        
        Ok(())
    }

    async fn start_profiling(&self) -> Result<(), PerformanceError> {
        let profiler = self.profiler.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                // Profile application performance
                if let Err(e) = profiler.profile_application().await {
                    error!("Failed to profile application: {}", e);
                }
            }
        });
        
        Ok(())
    }

    async fn start_optimization(&self) -> Result<(), PerformanceError> {
        let optimizer = self.optimizer.clone();
        let metrics = self.metrics_collector.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
            
            loop {
                interval.tick().await;
                
                // Get current metrics
                let current_metrics = metrics.get_current_metrics().await;
                
                // Optimize based on metrics
                if let Err(e) = optimizer.optimize(current_metrics).await {
                    error!("Failed to optimize: {}", e);
                }
            }
        });
        
        Ok(())
    }

    async fn start_prediction(&self) -> Result<(), PerformanceError> {
        let predictor = self.predictor.clone();
        let metrics = self.metrics_collector.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300));
            
            loop {
                interval.tick().await;
                
                // Get historical metrics
                let historical_metrics = metrics.get_historical_metrics().await;
                
                // Predict future performance
                if let Err(e) = predictor.predict(historical_metrics).await {
                    error!("Failed to predict performance: {}", e);
                }
            }
        });
        
        Ok(())
    }

    /// Record custom metric
    pub async fn record_metric(&self, name: &str, value: f64, tags: HashMap<String, String>) {
        self.metrics_collector.record_custom_metric(name, value, tags).await;
    }

    /// Create span for distributed tracing
    pub fn create_span(&self, name: &str) -> Span {
        self.telemetry.create_span(name)
    }

    /// Get current performance snapshot
    pub async fn get_snapshot(&self) -> PerformanceSnapshot {
        PerformanceSnapshot {
            timestamp: Utc::now(),
            metrics: self.metrics_collector.get_current_metrics().await,
            profile: self.profiler.get_current_profile().await,
            optimizations: self.optimizer.get_active_optimizations().await,
            predictions: self.predictor.get_predictions().await,
        }
    }

    /// Export metrics in Prometheus format
    pub async fn export_prometheus(&self) -> String {
        self.metrics_collector.export_prometheus().await
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSnapshot {
    pub timestamp: DateTime<Utc>,
    pub metrics: SystemMetrics,
    pub profile: ApplicationProfile,
    pub optimizations: Vec<ActiveOptimization>,
    pub predictions: Vec<PerformancePrediction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_io: DiskIO,
    pub network_io: NetworkIO,
    pub latency_percentiles: LatencyPercentiles,
    pub throughput: f64,
    pub error_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskIO {
    pub read_bytes_per_sec: u64,
    pub write_bytes_per_sec: u64,
    pub iops: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkIO {
    pub bytes_received_per_sec: u64,
    pub bytes_sent_per_sec: u64,
    pub packets_received_per_sec: u64,
    pub packets_sent_per_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyPercentiles {
    pub p50: f64,
    pub p75: f64,
    pub p90: f64,
    pub p95: f64,
    pub p99: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationProfile {
    pub hot_paths: Vec<HotPath>,
    pub memory_allocations: MemoryProfile,
    pub database_queries: Vec<QueryProfile>,
    pub cache_stats: CacheStatistics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotPath {
    pub function_name: String,
    pub call_count: u64,
    pub total_time_ms: f64,
    pub avg_time_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryProfile {
    pub heap_allocated: u64,
    pub heap_freed: u64,
    pub gc_collections: u64,
    pub gc_pause_time_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryProfile {
    pub query: String,
    pub execution_count: u64,
    pub avg_time_ms: f64,
    pub rows_affected: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStatistics {
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveOptimization {
    pub name: String,
    pub applied_at: DateTime<Utc>,
    pub impact: OptimizationImpact,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationImpact {
    pub metric: String,
    pub before_value: f64,
    pub after_value: f64,
    pub improvement_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformancePrediction {
    pub metric: String,
    pub predicted_value: f64,
    pub confidence: f64,
    pub predicted_at: DateTime<Utc>,
    pub time_horizon: Duration,
}

#[derive(Debug)]
pub enum PerformanceError {
    InitializationError(String),
    CollectionError(String),
    ProfilingError(String),
    OptimizationError(String),
    PredictionError(String),
    TelemetryError(String),
}

impl std::fmt::Display for PerformanceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InitializationError(e) => write!(f, "Initialization error: {}", e),
            Self::CollectionError(e) => write!(f, "Collection error: {}", e),
            Self::ProfilingError(e) => write!(f, "Profiling error: {}", e),
            Self::OptimizationError(e) => write!(f, "Optimization error: {}", e),
            Self::PredictionError(e) => write!(f, "Prediction error: {}", e),
            Self::TelemetryError(e) => write!(f, "Telemetry error: {}", e),
        }
    }
}

impl std::error::Error for PerformanceError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_performance_monitor() {
        let config = PerformanceConfig::default();
        let monitor = PerformanceMonitor::new(config);
        
        assert!(monitor.start().await.is_ok());
        
        // Record custom metric
        let mut tags = HashMap::new();
        tags.insert("endpoint".to_string(), "/api/v1/process".to_string());
        monitor.record_metric("request_duration", 150.0, tags).await;
        
        // Get snapshot
        let snapshot = monitor.get_snapshot().await;
        assert!(snapshot.metrics.cpu_usage >= 0.0);
    }
}