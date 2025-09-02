use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tokio::runtime::Runtime;
use anyhow::{Result, anyhow};
use tracing::{info, warn, error, debug};
use baml_runtime::{BamlRuntime, BamlValue, ClientRegistry};

/// Rust-based BAML integration for high-performance computational tools
/// Provides native Rust interface to BAML functions for Braun component

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BamlCallRequest {
    pub function_name: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub context: HashMap<String, serde_json::Value>,
    pub timeout_ms: Option<u64>,
    pub priority: CallPriority,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CallPriority {
    Low,
    Normal,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BamlCallResponse {
    pub call_id: String,
    pub result: serde_json::Value,
    pub execution_time_ms: u64,
    pub success: bool,
    pub error: Option<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct PerformanceMetrics {
    pub total_calls: u64,
    pub successful_calls: u64,
    pub failed_calls: u64,
    pub average_execution_time: f64,
    pub function_call_counts: HashMap<String, u64>,
    pub error_patterns: HashMap<String, u64>,
}

pub struct RustBamlClient {
    runtime: Arc<BamlRuntime>,
    tokio_runtime: Arc<Runtime>,
    active_calls: Arc<Mutex<HashMap<String, Instant>>>,
    performance_metrics: Arc<Mutex<PerformanceMetrics>>,
    client_config: ClientConfig,
}

#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub max_concurrent_calls: usize,
    pub default_timeout_ms: u64,
    pub retry_attempts: u32,
    pub enable_caching: bool,
    pub enable_metrics: bool,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            max_concurrent_calls: 10,
            default_timeout_ms: 30000,
            retry_attempts: 3,
            enable_caching: true,
            enable_metrics: true,
        }
    }
}

impl RustBamlClient {
    /// Initialize the Rust BAML client with configuration
    pub fn new(baml_file_path: &str, config: Option<ClientConfig>) -> Result<Self> {
        let config = config.unwrap_or_default();
        
        // Initialize BAML runtime
        let baml_content = std::fs::read_to_string(baml_file_path)
            .map_err(|e| anyhow!("Failed to read BAML file: {}", e))?;
            
        let runtime = BamlRuntime::from_file_content(&baml_content, None)
            .map_err(|e| anyhow!("Failed to initialize BAML runtime: {}", e))?;
        
        // Initialize Tokio runtime for async operations
        let tokio_runtime = Runtime::new()
            .map_err(|e| anyhow!("Failed to initialize Tokio runtime: {}", e))?;
        
        let client = Self {
            runtime: Arc::new(runtime),
            tokio_runtime: Arc::new(tokio_runtime),
            active_calls: Arc::new(Mutex::new(HashMap::new())),
            performance_metrics: Arc::new(Mutex::new(PerformanceMetrics {
                total_calls: 0,
                successful_calls: 0,
                failed_calls: 0,
                average_execution_time: 0.0,
                function_call_counts: HashMap::new(),
                error_patterns: HashMap::new(),
            })),
            client_config: config,
        };
        
        info!("Initialized Rust BAML client with file: {}", baml_file_path);
        Ok(client)
    }

    /// Execute high-performance chain of thought reasoning
    pub fn chain_of_thought_reasoning(
        &self,
        task_description: &str,
        solution_approach: &str,
        context_information: &str,
        verification_required: bool,
    ) -> Result<BamlCallResponse> {
        let mut params = HashMap::new();
        params.insert("task_description".to_string(), 
                     serde_json::Value::String(task_description.to_string()));
        params.insert("solution_approach".to_string(), 
                     serde_json::Value::String(solution_approach.to_string()));
        params.insert("context_information".to_string(), 
                     serde_json::Value::String(context_information.to_string()));
        params.insert("verification_required".to_string(), 
                     serde_json::Value::Bool(verification_required));

        let request = BamlCallRequest {
            function_name: "ChainOfThoughtReasoning".to_string(),
            parameters: params,
            context: HashMap::new(),
            timeout_ms: Some(60000), // 1 minute for complex reasoning
            priority: CallPriority::High,
        };

        self.execute_baml_call(request)
    }

    /// Execute computational emergence detection
    pub fn emergence_detection(
        &self,
        system_data: &str,
        field_parameters: &str,
        analysis_timeframe: &str,
        emergence_threshold: f64,
    ) -> Result<BamlCallResponse> {
        let mut params = HashMap::new();
        params.insert("system_data".to_string(), 
                     serde_json::Value::String(system_data.to_string()));
        params.insert("field_parameters".to_string(), 
                     serde_json::Value::String(field_parameters.to_string()));
        params.insert("analysis_timeframe".to_string(), 
                     serde_json::Value::String(analysis_timeframe.to_string()));
        params.insert("emergence_threshold".to_string(), 
                     serde_json::Value::Number(serde_json::Number::from_f64(emergence_threshold).unwrap()));

        let request = BamlCallRequest {
            function_name: "EmergenceDetection".to_string(),
            parameters: params,
            context: HashMap::new(),
            timeout_ms: Some(120000), // 2 minutes for complex analysis
            priority: CallPriority::Critical,
        };

        self.execute_baml_call(request)
    }

    /// Execute high-performance security audit
    pub fn security_audit(
        &self,
        system_description: &str,
        architecture_overview: &str,
        threat_landscape: &str,
        compliance_requirements: &[String],
    ) -> Result<BamlCallResponse> {
        let mut params = HashMap::new();
        params.insert("system_description".to_string(), 
                     serde_json::Value::String(system_description.to_string()));
        params.insert("architecture_overview".to_string(), 
                     serde_json::Value::String(architecture_overview.to_string()));
        params.insert("threat_landscape".to_string(), 
                     serde_json::Value::String(threat_landscape.to_string()));
        
        let compliance_array: Vec<serde_json::Value> = compliance_requirements
            .iter()
            .map(|s| serde_json::Value::String(s.clone()))
            .collect();
        params.insert("compliance_requirements".to_string(), 
                     serde_json::Value::Array(compliance_array));

        let request = BamlCallRequest {
            function_name: "SecurityAudit".to_string(),
            parameters: params,
            context: HashMap::new(),
            timeout_ms: Some(180000), // 3 minutes for comprehensive audit
            priority: CallPriority::Critical,
        };

        self.execute_baml_call(request)
    }

    /// Execute multi-modal fusion with performance optimization
    pub fn multi_modal_fusion(
        &self,
        text_content: &str,
        code_content: &str,
        visual_description: Option<&str>,
        audio_description: Option<&str>,
        fusion_objectives: &[String],
    ) -> Result<BamlCallResponse> {
        let mut params = HashMap::new();
        params.insert("text_content".to_string(), 
                     serde_json::Value::String(text_content.to_string()));
        params.insert("code_content".to_string(), 
                     serde_json::Value::String(code_content.to_string()));
        
        if let Some(visual) = visual_description {
            params.insert("visual_description".to_string(), 
                         serde_json::Value::String(visual.to_string()));
        }
        
        if let Some(audio) = audio_description {
            params.insert("audio_description".to_string(), 
                         serde_json::Value::String(audio.to_string()));
        }

        let objectives_array: Vec<serde_json::Value> = fusion_objectives
            .iter()
            .map(|s| serde_json::Value::String(s.clone()))
            .collect();
        params.insert("fusion_objectives".to_string(), 
                     serde_json::Value::Array(objectives_array));

        let request = BamlCallRequest {
            function_name: "MultiModalFusion".to_string(),
            parameters: params,
            context: HashMap::new(),
            timeout_ms: Some(90000), // 1.5 minutes for fusion
            priority: CallPriority::High,
        };

        self.execute_baml_call(request)
    }

    /// Execute advanced code analysis with computational optimization
    pub fn code_analysis_advanced(
        &self,
        code_content: &str,
        analysis_objectives: &[String],
        context_information: &str,
    ) -> Result<BamlCallResponse> {
        let mut params = HashMap::new();
        params.insert("code_content".to_string(), 
                     serde_json::Value::String(code_content.to_string()));
        params.insert("context_information".to_string(), 
                     serde_json::Value::String(context_information.to_string()));
        
        let objectives_array: Vec<serde_json::Value> = analysis_objectives
            .iter()
            .map(|s| serde_json::Value::String(s.clone()))
            .collect();
        params.insert("analysis_objectives".to_string(), 
                     serde_json::Value::Array(objectives_array));

        let request = BamlCallRequest {
            function_name: "CodeAnalysisAdvanced".to_string(),
            parameters: params,
            context: HashMap::new(),
            timeout_ms: Some(60000), // 1 minute for code analysis
            priority: CallPriority::High,
        };

        self.execute_baml_call(request)
    }

    /// Execute system design with architectural optimization
    pub fn system_design(
        &self,
        requirements: &str,
        constraints: &[String],
        scale_parameters: &str,
        technology_preferences: &[String],
    ) -> Result<BamlCallResponse> {
        let mut params = HashMap::new();
        params.insert("requirements".to_string(), 
                     serde_json::Value::String(requirements.to_string()));
        params.insert("scale_parameters".to_string(), 
                     serde_json::Value::String(scale_parameters.to_string()));
        
        let constraints_array: Vec<serde_json::Value> = constraints
            .iter()
            .map(|s| serde_json::Value::String(s.clone()))
            .collect();
        params.insert("constraints".to_string(), 
                     serde_json::Value::Array(constraints_array));

        let tech_array: Vec<serde_json::Value> = technology_preferences
            .iter()
            .map(|s| serde_json::Value::String(s.clone()))
            .collect();
        params.insert("technology_preferences".to_string(), 
                     serde_json::Value::Array(tech_array));

        let request = BamlCallRequest {
            function_name: "SystemDesign".to_string(),
            parameters: params,
            context: HashMap::new(),
            timeout_ms: Some(120000), // 2 minutes for system design
            priority: CallPriority::High,
        };

        self.execute_baml_call(request)
    }

    /// Execute batch BAML calls for high-throughput processing
    pub fn batch_execute(&self, requests: Vec<BamlCallRequest>) -> Result<Vec<BamlCallResponse>> {
        let batch_id = generate_batch_id();
        info!("Starting batch execution with {} requests [{}]", requests.len(), batch_id);

        let mut handles = Vec::new();
        
        for request in requests {
            let client = self.clone();
            let handle = self.tokio_runtime.spawn(async move {
                client.execute_baml_call(request)
            });
            handles.push(handle);
        }

        let mut results = Vec::new();
        for handle in handles {
            match self.tokio_runtime.block_on(handle) {
                Ok(result) => results.push(result?),
                Err(e) => return Err(anyhow!("Batch execution task failed: {}", e)),
            }
        }

        info!("Completed batch execution [{}]", batch_id);
        Ok(results)
    }

    /// Execute BAML call with streaming for long-running operations
    pub fn stream_execute<F>(
        &self,
        request: BamlCallRequest,
        mut callback: F,
    ) -> Result<BamlCallResponse>
    where
        F: FnMut(&str) + Send + 'static,
    {
        let call_id = generate_call_id();
        info!("Starting streaming BAML execution: {} [{}]", request.function_name, call_id);

        let start_time = Instant::now();
        self.track_call_start(&call_id, &request.function_name)?;

        // Execute with streaming callback
        let result = self.tokio_runtime.block_on(async {
            // This would integrate with BAML's streaming API when available
            // For now, we simulate streaming by calling the callback with progress updates
            callback("Starting function execution...");
            
            let execution_result = self.execute_baml_call_internal(request.clone()).await?;
            
            callback("Function execution completed");
            Ok::<_, anyhow::Error>(execution_result)
        });

        let execution_time = start_time.elapsed().as_millis() as u64;
        
        match result {
            Ok(response) => {
                self.track_call_success(&call_id, &request.function_name, execution_time)?;
                info!("Completed streaming BAML execution: {} [{}]", request.function_name, call_id);
                Ok(response)
            }
            Err(e) => {
                self.track_call_failure(&call_id, &request.function_name, &e.to_string(), execution_time)?;
                error!("Failed streaming BAML execution: {} [{}] - {}", request.function_name, call_id, e);
                Err(e)
            }
        }
    }

    /// Get comprehensive performance metrics
    pub fn get_performance_metrics(&self) -> Result<PerformanceMetrics> {
        let metrics = self.performance_metrics.lock()
            .map_err(|e| anyhow!("Failed to acquire metrics lock: {}", e))?;
        Ok(metrics.clone())
    }

    /// Get currently active calls
    pub fn get_active_calls(&self) -> Result<Vec<(String, Duration)>> {
        let active_calls = self.active_calls.lock()
            .map_err(|e| anyhow!("Failed to acquire active calls lock: {}", e))?;
        
        let now = Instant::now();
        let calls: Vec<(String, Duration)> = active_calls
            .iter()
            .map(|(id, start_time)| (id.clone(), now.duration_since(*start_time)))
            .collect();
        
        Ok(calls)
    }

    /// Health check for BAML client
    pub fn health_check(&self) -> Result<HashMap<String, serde_json::Value>> {
        let mut health_info = HashMap::new();
        
        // Check basic functionality
        let test_result = self.chain_of_thought_reasoning(
            "Health check test",
            "Simple verification",
            "System health validation",
            false,
        );
        
        match test_result {
            Ok(_) => {
                health_info.insert("status".to_string(), 
                                 serde_json::Value::String("healthy".to_string()));
                health_info.insert("baml_connectivity".to_string(), 
                                 serde_json::Value::String("ok".to_string()));
            }
            Err(e) => {
                health_info.insert("status".to_string(), 
                                 serde_json::Value::String("unhealthy".to_string()));
                health_info.insert("baml_connectivity".to_string(), 
                                 serde_json::Value::String("failed".to_string()));
                health_info.insert("error".to_string(), 
                                 serde_json::Value::String(e.to_string()));
            }
        }
        
        // Add metrics
        if let Ok(metrics) = self.get_performance_metrics() {
            health_info.insert("total_calls".to_string(), 
                             serde_json::Value::Number(serde_json::Number::from(metrics.total_calls)));
            health_info.insert("success_rate".to_string(), 
                             serde_json::Value::Number(serde_json::Number::from_f64(
                                 metrics.successful_calls as f64 / metrics.total_calls as f64
                             ).unwrap_or_else(|| serde_json::Number::from(0))));
        }
        
        health_info.insert("timestamp".to_string(), 
                         serde_json::Value::String(chrono::Utc::now().to_rfc3339()));
        
        Ok(health_info)
    }

    /// Core BAML call execution with comprehensive error handling
    fn execute_baml_call(&self, request: BamlCallRequest) -> Result<BamlCallResponse> {
        self.tokio_runtime.block_on(self.execute_baml_call_internal(request))
    }

    async fn execute_baml_call_internal(&self, request: BamlCallRequest) -> Result<BamlCallResponse> {
        let call_id = generate_call_id();
        let start_time = Instant::now();
        
        self.track_call_start(&call_id, &request.function_name)?;
        
        // Convert parameters to BAML values
        let mut baml_params = HashMap::new();
        for (key, value) in request.parameters {
            let baml_value = convert_to_baml_value(value)?;
            baml_params.insert(key, baml_value);
        }
        
        // Execute BAML function
        let timeout_duration = Duration::from_millis(
            request.timeout_ms.unwrap_or(self.client_config.default_timeout_ms)
        );
        
        let result = tokio::time::timeout(
            timeout_duration,
            self.runtime.invoke_function(&request.function_name, &baml_params)
        ).await;
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        match result {
            Ok(Ok(baml_result)) => {
                let json_result = convert_from_baml_value(baml_result)?;
                let response = BamlCallResponse {
                    call_id: call_id.clone(),
                    result: json_result,
                    execution_time_ms: execution_time,
                    success: true,
                    error: None,
                    metadata: request.context,
                };
                
                self.track_call_success(&call_id, &request.function_name, execution_time)?;
                Ok(response)
            }
            Ok(Err(baml_error)) => {
                let error_msg = format!("BAML execution error: {}", baml_error);
                let response = BamlCallResponse {
                    call_id: call_id.clone(),
                    result: serde_json::Value::Null,
                    execution_time_ms: execution_time,
                    success: false,
                    error: Some(error_msg.clone()),
                    metadata: request.context,
                };
                
                self.track_call_failure(&call_id, &request.function_name, &error_msg, execution_time)?;
                Ok(response) // Return error response rather than failing
            }
            Err(_timeout) => {
                let error_msg = format!("BAML call timeout after {}ms", timeout_duration.as_millis());
                let response = BamlCallResponse {
                    call_id: call_id.clone(),
                    result: serde_json::Value::Null,
                    execution_time_ms: execution_time,
                    success: false,
                    error: Some(error_msg.clone()),
                    metadata: request.context,
                };
                
                self.track_call_failure(&call_id, &request.function_name, &error_msg, execution_time)?;
                Ok(response) // Return timeout response rather than failing
            }
        }
    }

    fn track_call_start(&self, call_id: &str, function_name: &str) -> Result<()> {
        let mut active_calls = self.active_calls.lock()
            .map_err(|e| anyhow!("Failed to acquire active calls lock: {}", e))?;
        active_calls.insert(call_id.to_string(), Instant::now());
        
        debug!("Started tracking BAML call: {} [{}]", function_name, call_id);
        Ok(())
    }

    fn track_call_success(&self, call_id: &str, function_name: &str, execution_time: u64) -> Result<()> {
        // Remove from active calls
        let mut active_calls = self.active_calls.lock()
            .map_err(|e| anyhow!("Failed to acquire active calls lock: {}", e))?;
        active_calls.remove(call_id);
        
        // Update metrics
        let mut metrics = self.performance_metrics.lock()
            .map_err(|e| anyhow!("Failed to acquire metrics lock: {}", e))?;
        
        metrics.total_calls += 1;
        metrics.successful_calls += 1;
        
        // Update average execution time
        let total_time = metrics.average_execution_time * (metrics.total_calls - 1) as f64 + execution_time as f64;
        metrics.average_execution_time = total_time / metrics.total_calls as f64;
        
        // Update function call counts
        *metrics.function_call_counts.entry(function_name.to_string()).or_insert(0) += 1;
        
        debug!("Tracked successful BAML call: {} [{}] - {}ms", function_name, call_id, execution_time);
        Ok(())
    }

    fn track_call_failure(&self, call_id: &str, function_name: &str, error: &str, execution_time: u64) -> Result<()> {
        // Remove from active calls
        let mut active_calls = self.active_calls.lock()
            .map_err(|e| anyhow!("Failed to acquire active calls lock: {}", e))?;
        active_calls.remove(call_id);
        
        // Update metrics
        let mut metrics = self.performance_metrics.lock()
            .map_err(|e| anyhow!("Failed to acquire metrics lock: {}", e))?;
        
        metrics.total_calls += 1;
        metrics.failed_calls += 1;
        
        // Update average execution time
        let total_time = metrics.average_execution_time * (metrics.total_calls - 1) as f64 + execution_time as f64;
        metrics.average_execution_time = total_time / metrics.total_calls as f64;
        
        // Update error patterns
        *metrics.error_patterns.entry(error.to_string()).or_insert(0) += 1;
        
        warn!("Tracked failed BAML call: {} [{}] - {} - {}ms", function_name, call_id, error, execution_time);
        Ok(())
    }
}

impl Clone for RustBamlClient {
    fn clone(&self) -> Self {
        Self {
            runtime: Arc::clone(&self.runtime),
            tokio_runtime: Arc::clone(&self.tokio_runtime),
            active_calls: Arc::clone(&self.active_calls),
            performance_metrics: Arc::clone(&self.performance_metrics),
            client_config: self.client_config.clone(),
        }
    }
}

// Utility functions
fn generate_call_id() -> String {
    format!("rust_baml_{:x}_{}", 
           std::time::SystemTime::now()
               .duration_since(std::time::UNIX_EPOCH)
               .unwrap()
               .as_nanos(),
           rand::random::<u32>())
}

fn generate_batch_id() -> String {
    format!("batch_{:x}_{}", 
           std::time::SystemTime::now()
               .duration_since(std::time::UNIX_EPOCH)
               .unwrap()
               .as_nanos(),
           rand::random::<u32>())
}

fn convert_to_baml_value(json_value: serde_json::Value) -> Result<BamlValue> {
    // Convert JSON value to BAML value
    // This is a simplified implementation - actual conversion would be more comprehensive
    match json_value {
        serde_json::Value::String(s) => Ok(BamlValue::String(s)),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(BamlValue::Int(i))
            } else if let Some(f) = n.as_f64() {
                Ok(BamlValue::Float(f))
            } else {
                Err(anyhow!("Invalid number format"))
            }
        }
        serde_json::Value::Bool(b) => Ok(BamlValue::Bool(b)),
        serde_json::Value::Array(arr) => {
            let baml_array: Result<Vec<BamlValue>> = arr.into_iter()
                .map(convert_to_baml_value)
                .collect();
            Ok(BamlValue::List(baml_array?))
        }
        serde_json::Value::Object(obj) => {
            let mut baml_map = HashMap::new();
            for (key, value) in obj {
                baml_map.insert(key, convert_to_baml_value(value)?);
            }
            Ok(BamlValue::Map(baml_map))
        }
        serde_json::Value::Null => Ok(BamlValue::Null),
    }
}

fn convert_from_baml_value(baml_value: BamlValue) -> Result<serde_json::Value> {
    // Convert BAML value to JSON value
    // This is a simplified implementation - actual conversion would be more comprehensive
    match baml_value {
        BamlValue::String(s) => Ok(serde_json::Value::String(s)),
        BamlValue::Int(i) => Ok(serde_json::Value::Number(serde_json::Number::from(i))),
        BamlValue::Float(f) => {
            let number = serde_json::Number::from_f64(f)
                .ok_or_else(|| anyhow!("Invalid float value"))?;
            Ok(serde_json::Value::Number(number))
        }
        BamlValue::Bool(b) => Ok(serde_json::Value::Bool(b)),
        BamlValue::List(arr) => {
            let json_array: Result<Vec<serde_json::Value>> = arr.into_iter()
                .map(convert_from_baml_value)
                .collect();
            Ok(serde_json::Value::Array(json_array?))
        }
        BamlValue::Map(map) => {
            let mut json_obj = serde_json::Map::new();
            for (key, value) in map {
                json_obj.insert(key, convert_from_baml_value(value)?);
            }
            Ok(serde_json::Value::Object(json_obj))
        }
        BamlValue::Null => Ok(serde_json::Value::Null),
    }
}