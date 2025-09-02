use opentelemetry::{
    global,
    trace::{Tracer, TracerProvider, Span, SpanKind, StatusCode},
    metrics::{Meter, MeterProvider, Counter, Histogram, UpDownCounter},
    Context, KeyValue,
};
use opentelemetry_otlp::{WithExportConfig, WithTonicConfig};
use opentelemetry_sdk::{
    trace::{self as sdktrace, RandomIdGenerator, Sampler},
    metrics::{self as sdkmetrics},
    Resource,
};
use opentelemetry_semantic_conventions::resource::{SERVICE_NAME, SERVICE_VERSION};
use tracing::{info, error};
use std::time::Duration;

/// OpenTelemetry-based telemetry engine for distributed tracing and metrics
pub struct TelemetryEngine {
    tracer: Box<dyn Tracer + Send + Sync>,
    meter: Meter,
    endpoint: String,
}

impl TelemetryEngine {
    pub fn new(endpoint: &str) -> Self {
        // Initialize tracer with OTLP exporter
        let tracer = global::tracer("ai-osx-performance");
        
        // Initialize meter
        let meter = global::meter("ai-osx-performance");
        
        Self {
            tracer: Box::new(tracer),
            meter,
            endpoint: endpoint.to_string(),
        }
    }

    pub async fn initialize(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Initializing telemetry engine with endpoint: {}", self.endpoint);
        
        // Initialize OTLP pipeline for traces
        self.init_tracer().await?;
        
        // Initialize OTLP pipeline for metrics
        self.init_metrics().await?;
        
        info!("Telemetry engine initialized successfully");
        Ok(())
    }

    async fn init_tracer(&self) -> Result<(), Box<dyn std::error::Error>> {
        let resource = Resource::new(vec![
            KeyValue::new(SERVICE_NAME, "ai-osx"),
            KeyValue::new(SERVICE_VERSION, env!("CARGO_PKG_VERSION")),
            KeyValue::new("environment", "production"),
        ]);

        let tracer_config = sdktrace::Config::default()
            .with_sampler(Sampler::AlwaysOn)
            .with_id_generator(RandomIdGenerator::default())
            .with_max_events_per_span(64)
            .with_max_attributes_per_span(16)
            .with_resource(resource);

        // Configure OTLP exporter
        let exporter = opentelemetry_otlp::new_exporter()
            .tonic()
            .with_endpoint(&self.endpoint)
            .with_timeout(Duration::from_secs(3))
            .build_span_exporter()?;

        let tracer_provider = sdktrace::TracerProvider::builder()
            .with_batch_exporter(exporter, sdktrace::runtime::Tokio)
            .with_config(tracer_config)
            .build();

        global::set_tracer_provider(tracer_provider);
        
        Ok(())
    }

    async fn init_metrics(&self) -> Result<(), Box<dyn std::error::Error>> {
        let resource = Resource::new(vec![
            KeyValue::new(SERVICE_NAME, "ai-osx"),
            KeyValue::new(SERVICE_VERSION, env!("CARGO_PKG_VERSION")),
        ]);

        // Configure OTLP exporter for metrics
        let exporter = opentelemetry_otlp::new_exporter()
            .tonic()
            .with_endpoint(&self.endpoint)
            .with_timeout(Duration::from_secs(3))
            .build_metrics_exporter(
                Box::new(sdkmetrics::selectors::simple::histogram()),
                Box::new(sdkmetrics::aggregation::cumulative_temporality()),
            )?;

        let meter_provider = sdkmetrics::MeterProvider::builder()
            .with_reader(
                sdkmetrics::PeriodicReader::builder(exporter, opentelemetry_sdk::runtime::Tokio)
                    .with_interval(Duration::from_secs(60))
                    .build(),
            )
            .with_resource(resource)
            .build();

        global::set_meter_provider(meter_provider);
        
        Ok(())
    }

    pub fn create_span(&self, name: &str) -> Span {
        use opentelemetry::trace::TraceContextExt;
        
        let tracer = global::tracer("ai-osx-performance");
        tracer.span_builder(name)
            .with_kind(SpanKind::Internal)
            .with_attributes(vec![
                KeyValue::new("component", "performance-monitor"),
                KeyValue::new("span.type", "internal"),
            ])
            .start(&tracer)
    }

    pub fn create_http_span(&self, method: &str, path: &str) -> Span {
        let tracer = global::tracer("ai-osx-performance");
        tracer.span_builder(format!("{} {}", method, path))
            .with_kind(SpanKind::Server)
            .with_attributes(vec![
                KeyValue::new("http.method", method.to_string()),
                KeyValue::new("http.path", path.to_string()),
                KeyValue::new("component", "http-server"),
            ])
            .start(&tracer)
    }

    pub fn create_ai_span(&self, model: &str, task: &str) -> Span {
        let tracer = global::tracer("ai-osx-performance");
        tracer.span_builder(format!("ai.{}.{}", model, task))
            .with_kind(SpanKind::Internal)
            .with_attributes(vec![
                KeyValue::new("ai.model", model.to_string()),
                KeyValue::new("ai.task", task.to_string()),
                KeyValue::new("component", "ai-engine"),
            ])
            .start(&tracer)
    }

    pub fn record_span_event(span: &Span, name: &str, attributes: Vec<KeyValue>) {
        span.add_event(name.to_string(), attributes);
    }

    pub fn set_span_error(span: &Span, error: &str) {
        span.set_status(StatusCode::Error, error.to_string());
        span.record_error(&anyhow::anyhow!(error));
    }

    pub fn create_counter(&self, name: &str, description: &str) -> Counter<u64> {
        self.meter
            .u64_counter(name)
            .with_description(description)
            .init()
    }

    pub fn create_histogram(&self, name: &str, description: &str) -> Histogram<f64> {
        self.meter
            .f64_histogram(name)
            .with_description(description)
            .init()
    }

    pub fn create_updown_counter(&self, name: &str, description: &str) -> UpDownCounter<i64> {
        self.meter
            .i64_up_down_counter(name)
            .with_description(description)
            .init()
    }

    pub async fn flush(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Force flush all pending telemetry data
        global::shutdown_tracer_provider();
        Ok(())
    }
}

/// Distributed tracing context for cross-service correlation
pub struct TracingContext {
    trace_id: String,
    span_id: String,
    parent_span_id: Option<String>,
    baggage: HashMap<String, String>,
}

use std::collections::HashMap;

impl TracingContext {
    pub fn new() -> Self {
        let ctx = Context::current();
        let span = ctx.span();
        let span_context = span.span_context();
        
        Self {
            trace_id: format!("{:032x}", span_context.trace_id()),
            span_id: format!("{:016x}", span_context.span_id()),
            parent_span_id: None,
            baggage: HashMap::new(),
        }
    }

    pub fn from_headers(headers: &HashMap<String, String>) -> Option<Self> {
        // Extract W3C Trace Context from headers
        if let (Some(traceparent), Some(tracestate)) = 
            (headers.get("traceparent"), headers.get("tracestate")) {
            
            // Parse traceparent header
            let parts: Vec<&str> = traceparent.split('-').collect();
            if parts.len() == 4 {
                return Some(Self {
                    trace_id: parts[1].to_string(),
                    span_id: parts[2].to_string(),
                    parent_span_id: Some(parts[2].to_string()),
                    baggage: Self::parse_baggage(headers.get("baggage")),
                });
            }
        }
        None
    }

    pub fn to_headers(&self) -> HashMap<String, String> {
        let mut headers = HashMap::new();
        
        // W3C Trace Context headers
        headers.insert(
            "traceparent".to_string(),
            format!("00-{}-{}-01", self.trace_id, self.span_id)
        );
        
        // Add baggage if present
        if !self.baggage.is_empty() {
            let baggage_str = self.baggage.iter()
                .map(|(k, v)| format!("{}={}", k, v))
                .collect::<Vec<_>>()
                .join(",");
            headers.insert("baggage".to_string(), baggage_str);
        }
        
        headers
    }

    fn parse_baggage(baggage_header: Option<&String>) -> HashMap<String, String> {
        let mut baggage = HashMap::new();
        
        if let Some(header) = baggage_header {
            for item in header.split(',') {
                if let Some((key, value)) = item.split_once('=') {
                    baggage.insert(key.trim().to_string(), value.trim().to_string());
                }
            }
        }
        
        baggage
    }

    pub fn add_baggage(&mut self, key: String, value: String) {
        self.baggage.insert(key, value);
    }

    pub fn get_baggage(&self, key: &str) -> Option<&String> {
        self.baggage.get(key)
    }
}

/// Custom span processor for advanced telemetry processing
pub struct CustomSpanProcessor {
    export_threshold: Duration,
    batch_size: usize,
}

impl CustomSpanProcessor {
    pub fn new() -> Self {
        Self {
            export_threshold: Duration::from_secs(5),
            batch_size: 512,
        }
    }

    pub async fn process_span(&self, span_data: SpanData) {
        // Custom processing logic
        if span_data.duration > Duration::from_secs(1) {
            // Log slow operations
            error!("Slow operation detected: {} took {:?}", 
                span_data.name, span_data.duration);
        }
        
        // Check for errors
        if span_data.status == StatusCode::Error {
            // Alert on errors
            error!("Operation failed: {} - {}", 
                span_data.name, span_data.status_message);
        }
    }
}

struct SpanData {
    name: String,
    duration: Duration,
    status: StatusCode,
    status_message: String,
    attributes: HashMap<String, String>,
}

/// Metrics aggregator for efficient metric collection
pub struct MetricsAggregator {
    buffers: Arc<tokio::sync::RwLock<HashMap<String, MetricBuffer>>>,
    flush_interval: Duration,
}

use std::sync::Arc;

impl MetricsAggregator {
    pub fn new() -> Self {
        Self {
            buffers: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
            flush_interval: Duration::from_secs(10),
        }
    }

    pub async fn record(&self, metric_name: &str, value: f64, labels: HashMap<String, String>) {
        let mut buffers = self.buffers.write().await;
        let buffer = buffers.entry(metric_name.to_string())
            .or_insert_with(|| MetricBuffer::new(metric_name.to_string()));
        
        buffer.add(value, labels);
    }

    pub async fn flush(&self) -> Vec<AggregatedMetric> {
        let mut buffers = self.buffers.write().await;
        let mut aggregated = Vec::new();
        
        for (_, buffer) in buffers.drain() {
            aggregated.push(buffer.aggregate());
        }
        
        aggregated
    }

    pub async fn start_auto_flush(self: Arc<Self>) {
        let flush_interval = self.flush_interval;
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(flush_interval);
            
            loop {
                interval.tick().await;
                
                let aggregated = self.flush().await;
                for metric in aggregated {
                    // Export aggregated metrics
                    info!("Exporting metric: {} = {}", metric.name, metric.value);
                }
            }
        });
    }
}

struct MetricBuffer {
    name: String,
    values: Vec<f64>,
    labels: Vec<HashMap<String, String>>,
}

impl MetricBuffer {
    fn new(name: String) -> Self {
        Self {
            name,
            values: Vec::new(),
            labels: Vec::new(),
        }
    }

    fn add(&mut self, value: f64, labels: HashMap<String, String>) {
        self.values.push(value);
        self.labels.push(labels);
    }

    fn aggregate(&self) -> AggregatedMetric {
        let sum: f64 = self.values.iter().sum();
        let count = self.values.len() as f64;
        let avg = if count > 0.0 { sum / count } else { 0.0 };
        
        let min = self.values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = self.values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        
        AggregatedMetric {
            name: self.name.clone(),
            value: avg,
            count: count as u64,
            sum,
            min,
            max,
        }
    }
}

struct AggregatedMetric {
    name: String,
    value: f64,
    count: u64,
    sum: f64,
    min: f64,
    max: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_telemetry_engine() {
        let telemetry = TelemetryEngine::new("http://localhost:4317");
        
        // Note: Initialization will fail in test environment without OTLP collector
        // This is expected and fine for unit tests
        let _ = telemetry.initialize().await;
        
        // Create spans
        let span = telemetry.create_span("test_operation");
        TelemetryEngine::record_span_event(&span, "test_event", vec![
            KeyValue::new("test_key", "test_value"),
        ]);
        
        // Create metrics
        let counter = telemetry.create_counter("test_counter", "Test counter metric");
        counter.add(1, &[KeyValue::new("test", "true")]);
        
        let histogram = telemetry.create_histogram("test_histogram", "Test histogram metric");
        histogram.record(123.45, &[KeyValue::new("test", "true")]);
    }

    #[tokio::test]
    async fn test_tracing_context() {
        let mut context = TracingContext::new();
        context.add_baggage("user_id".to_string(), "12345".to_string());
        
        let headers = context.to_headers();
        assert!(headers.contains_key("traceparent"));
        assert!(headers.contains_key("baggage"));
        
        // Test parsing from headers
        let parsed = TracingContext::from_headers(&headers);
        assert!(parsed.is_some());
    }

    #[tokio::test]
    async fn test_metrics_aggregator() {
        let aggregator = Arc::new(MetricsAggregator::new());
        
        // Record some metrics
        let mut labels = HashMap::new();
        labels.insert("endpoint".to_string(), "/api/v1/test".to_string());
        
        aggregator.record("request_duration", 100.0, labels.clone()).await;
        aggregator.record("request_duration", 200.0, labels.clone()).await;
        aggregator.record("request_duration", 150.0, labels).await;
        
        // Flush and check aggregated metrics
        let aggregated = aggregator.flush().await;
        assert_eq!(aggregated.len(), 1);
        assert_eq!(aggregated[0].name, "request_duration");
        assert_eq!(aggregated[0].count, 3);
        assert_eq!(aggregated[0].value, 150.0); // Average
    }
}