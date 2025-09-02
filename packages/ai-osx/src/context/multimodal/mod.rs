use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use uuid::Uuid;

pub mod processor;
pub mod fusion;
pub mod extractors;
pub mod transformers;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModalityType {
    Text,
    Image,
    Audio,
    Video,
    Sensor,
    Haptic,
    Neural,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModalInput {
    pub id: Uuid,
    pub modality: ModalityType,
    pub data: Vec<u8>,
    pub metadata: HashMap<String, String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedModal {
    pub id: Uuid,
    pub input_id: Uuid,
    pub modality: ModalityType,
    pub features: Vec<f32>,
    pub embeddings: Vec<f32>,
    pub confidence: f32,
    pub metadata: HashMap<String, String>,
    pub processing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FusedOutput {
    pub id: Uuid,
    pub input_ids: Vec<Uuid>,
    pub modalities: Vec<ModalityType>,
    pub unified_embedding: Vec<f32>,
    pub cross_modal_attention: Vec<Vec<f32>>,
    pub fusion_confidence: f32,
    pub semantic_understanding: String,
    pub emergent_properties: HashMap<String, f32>,
}

pub trait ModalProcessor: Send + Sync {
    async fn process(&self, input: ModalInput) -> Result<ProcessedModal, Box<dyn std::error::Error>>;
    fn supported_modality(&self) -> ModalityType;
    fn get_performance_metrics(&self) -> ProcessorMetrics;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessorMetrics {
    pub total_processed: u64,
    pub average_processing_time: f64,
    pub accuracy_score: f32,
    pub resource_usage: ResourceUsage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUsage {
    pub cpu_usage_percent: f32,
    pub memory_usage_mb: f64,
    pub gpu_usage_percent: f32,
    pub vram_usage_mb: f64,
}

pub struct MultiModalPipeline {
    processors: HashMap<ModalityType, Arc<dyn ModalProcessor>>,
    fusion_engine: Arc<fusion::FusionEngine>,
    input_queue: mpsc::Sender<ModalInput>,
    output_queue: mpsc::Receiver<FusedOutput>,
    config: PipelineConfig,
    metrics: Arc<RwLock<PipelineMetrics>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineConfig {
    pub max_concurrent_processing: usize,
    pub fusion_threshold: f32,
    pub enable_cross_modal_attention: bool,
    pub enable_emergent_detection: bool,
    pub batch_size: usize,
    pub timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineMetrics {
    pub total_inputs_processed: u64,
    pub successful_fusions: u64,
    pub failed_processing: u64,
    pub average_pipeline_latency: f64,
    pub modality_distribution: HashMap<ModalityType, u64>,
    pub fusion_quality_scores: Vec<f32>,
}

impl MultiModalPipeline {
    pub async fn new(config: PipelineConfig) -> Result<Self, Box<dyn std::error::Error>> {
        let (input_tx, input_rx) = mpsc::channel(config.max_concurrent_processing);
        let (output_tx, output_rx) = mpsc::channel(config.max_concurrent_processing);

        let fusion_engine = Arc::new(fusion::FusionEngine::new().await?);
        let mut processors = HashMap::new();

        // Initialize modality-specific processors
        processors.insert(
            ModalityType::Text,
            Arc::new(processor::TextProcessor::new().await?) as Arc<dyn ModalProcessor>
        );
        processors.insert(
            ModalityType::Image,
            Arc::new(processor::ImageProcessor::new().await?) as Arc<dyn ModalProcessor>
        );
        processors.insert(
            ModalityType::Audio,
            Arc::new(processor::AudioProcessor::new().await?) as Arc<dyn ModalProcessor>
        );
        processors.insert(
            ModalityType::Video,
            Arc::new(processor::VideoProcessor::new().await?) as Arc<dyn ModalProcessor>
        );

        let metrics = Arc::new(RwLock::new(PipelineMetrics {
            total_inputs_processed: 0,
            successful_fusions: 0,
            failed_processing: 0,
            average_pipeline_latency: 0.0,
            modality_distribution: HashMap::new(),
            fusion_quality_scores: Vec::new(),
        }));

        let pipeline = MultiModalPipeline {
            processors,
            fusion_engine,
            input_queue: input_tx,
            output_queue: output_rx,
            config,
            metrics,
        };

        // Start processing loops
        pipeline.start_processing_loops(input_rx, output_tx).await;

        Ok(pipeline)
    }

    pub async fn process_input(&self, input: ModalInput) -> Result<(), Box<dyn std::error::Error>> {
        self.input_queue.send(input).await?;
        Ok(())
    }

    pub async fn get_next_output(&mut self) -> Option<FusedOutput> {
        self.output_queue.recv().await
    }

    async fn start_processing_loops(
        &self,
        mut input_rx: mpsc::Receiver<ModalInput>,
        output_tx: mpsc::Sender<FusedOutput>,
    ) {
        let processors = self.processors.clone();
        let fusion_engine = self.fusion_engine.clone();
        let config = self.config.clone();
        let metrics = self.metrics.clone();

        tokio::spawn(async move {
            let mut batch_buffer: HashMap<String, Vec<ProcessedModal>> = HashMap::new();
            let batch_timeout = tokio::time::Duration::from_secs(config.timeout_seconds);

            while let Some(input) = input_rx.recv().await {
                let start_time = std::time::Instant::now();
                
                // Update metrics
                {
                    let mut metrics = metrics.write().unwrap();
                    metrics.total_inputs_processed += 1;
                    *metrics.modality_distribution.entry(input.modality.clone()).or_insert(0) += 1;
                }

                // Process individual modality
                if let Some(processor) = processors.get(&input.modality) {
                    match processor.process(input.clone()).await {
                        Ok(processed) => {
                            // Group by session or correlation ID for batch fusion
                            let batch_key = input.metadata
                                .get("session_id")
                                .cloned()
                                .unwrap_or_else(|| "default".to_string());

                            batch_buffer
                                .entry(batch_key.clone())
                                .or_insert_with(Vec::new)
                                .push(processed);

                            // Check if we have enough modalities for fusion
                            if let Some(batch) = batch_buffer.get(&batch_key) {
                                if batch.len() >= config.batch_size || 
                                   should_trigger_fusion(batch, &config) {
                                    
                                    let batch_data = batch_buffer.remove(&batch_key).unwrap();
                                    
                                    // Perform multi-modal fusion
                                    match fusion_engine.fuse_modalities(batch_data).await {
                                        Ok(fused_output) => {
                                            let processing_time = start_time.elapsed().as_millis() as f64;
                                            
                                            // Update metrics
                                            {
                                                let mut metrics = metrics.write().unwrap();
                                                metrics.successful_fusions += 1;
                                                metrics.fusion_quality_scores.push(fused_output.fusion_confidence);
                                                
                                                // Update average latency
                                                let total_samples = metrics.successful_fusions as f64;
                                                metrics.average_pipeline_latency = 
                                                    (metrics.average_pipeline_latency * (total_samples - 1.0) + processing_time) / total_samples;
                                            }

                                            if let Err(_) = output_tx.send(fused_output).await {
                                                eprintln!("Failed to send fused output");
                                                break;
                                            }
                                        }
                                        Err(e) => {
                                            eprintln!("Fusion failed: {}", e);
                                            let mut metrics = metrics.write().unwrap();
                                            metrics.failed_processing += 1;
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Processing failed for {:?}: {}", input.modality, e);
                            let mut metrics = metrics.write().unwrap();
                            metrics.failed_processing += 1;
                        }
                    }
                }
            }
        });
    }

    pub fn get_metrics(&self) -> PipelineMetrics {
        self.metrics.read().unwrap().clone()
    }

    pub async fn shutdown(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Graceful shutdown logic
        Ok(())
    }
}

fn should_trigger_fusion(batch: &[ProcessedModal], config: &PipelineConfig) -> bool {
    if batch.is_empty() {
        return false;
    }

    // Check if we have diverse modalities
    let unique_modalities: std::collections::HashSet<_> = 
        batch.iter().map(|p| &p.modality).collect();
    
    // Trigger fusion if we have multiple modalities or high confidence single modality
    unique_modalities.len() > 1 || 
    batch.iter().any(|p| p.confidence > config.fusion_threshold)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_pipeline_creation() {
        let config = PipelineConfig {
            max_concurrent_processing: 10,
            fusion_threshold: 0.8,
            enable_cross_modal_attention: true,
            enable_emergent_detection: true,
            batch_size: 3,
            timeout_seconds: 5,
        };

        let pipeline = MultiModalPipeline::new(config).await;
        assert!(pipeline.is_ok());
    }

    #[tokio::test]
    async fn test_modal_input_processing() {
        // Test input processing workflow
        let input = ModalInput {
            id: Uuid::new_v4(),
            modality: ModalityType::Text,
            data: b"Hello, world!".to_vec(),
            metadata: HashMap::new(),
            timestamp: chrono::Utc::now(),
            source: "test".to_string(),
        };

        // Test would require full pipeline setup
        assert_eq!(input.modality, ModalityType::Text);
    }
}