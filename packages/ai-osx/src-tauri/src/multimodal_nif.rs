use rustler::{Atom, Encoder, Env, NifResult, Resource, ResourceArc, Term};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::runtime::Runtime;
use uuid::Uuid;

mod atoms {
    rustler::atoms! {
        ok,
        error,
        nil,
        
        // Error atoms
        invalid_input,
        pipeline_error,
        timeout,
        resource_not_found,
    }
}

// Resource types for managing pipeline state
pub struct PipelineResource {
    handle: Arc<Mutex<crate::context::multimodal::MultiModalPipeline>>,
    runtime: Arc<Runtime>,
}

impl PipelineResource {
    fn new(pipeline: crate::context::multimodal::MultiModalPipeline, runtime: Runtime) -> Self {
        Self {
            handle: Arc::new(Mutex::new(pipeline)),
            runtime: Arc::new(runtime),
        }
    }
}

// Elixir-compatible data structures
#[derive(Debug, Serialize, Deserialize)]
struct ElixirModalInput {
    id: String,
    modality: String,
    data: Vec<u8>,
    metadata: HashMap<String, String>,
    timestamp: String,
    source: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ElixirPipelineConfig {
    max_concurrent_processing: usize,
    fusion_threshold: f32,
    enable_cross_modal_attention: bool,
    enable_emergent_detection: bool,
    batch_size: usize,
    timeout_seconds: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ElixirFusedOutput {
    id: String,
    input_ids: Vec<String>,
    modalities: Vec<String>,
    unified_embedding: Vec<f32>,
    cross_modal_attention: Vec<Vec<f32>>,
    fusion_confidence: f32,
    semantic_understanding: String,
    emergent_properties: HashMap<String, f32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ElixirPipelineMetrics {
    total_inputs_processed: u64,
    successful_fusions: u64,
    failed_processing: u64,
    average_pipeline_latency: f64,
    modality_distribution: HashMap<String, u64>,
    fusion_quality_scores: Vec<f32>,
}

// NIF functions
#[rustler::nif]
fn create_pipeline(config_term: Term) -> NifResult<ResourceArc<PipelineResource>> {
    let config: ElixirPipelineConfig = config_term.decode()?;
    
    // Convert Elixir config to Rust config
    let rust_config = crate::context::multimodal::PipelineConfig {
        max_concurrent_processing: config.max_concurrent_processing,
        fusion_threshold: config.fusion_threshold,
        enable_cross_modal_attention: config.enable_cross_modal_attention,
        enable_emergent_detection: config.enable_emergent_detection,
        batch_size: config.batch_size,
        timeout_seconds: config.timeout_seconds,
    };

    // Create async runtime
    let runtime = Runtime::new().map_err(|_| atoms::pipeline_error())?;
    
    // Create pipeline asynchronously
    let pipeline = runtime
        .block_on(async {
            crate::context::multimodal::MultiModalPipeline::new(rust_config).await
        })
        .map_err(|_| atoms::pipeline_error())?;

    let resource = PipelineResource::new(pipeline, runtime);
    Ok(ResourceArc::new(resource))
}

#[rustler::nif]
fn process_batch(
    pipeline_resource: ResourceArc<PipelineResource>,
    inputs_term: Term,
    _options_term: Term,
) -> NifResult<Term> {
    let inputs: Vec<ElixirModalInput> = inputs_term.decode()?;
    
    // Convert Elixir inputs to Rust inputs
    let rust_inputs: Vec<crate::context::multimodal::ModalInput> = inputs
        .into_iter()
        .map(|input| {
            let modality = match input.modality.as_str() {
                "Text" => crate::context::multimodal::ModalityType::Text,
                "Image" => crate::context::multimodal::ModalityType::Image,
                "Audio" => crate::context::multimodal::ModalityType::Audio,
                "Video" => crate::context::multimodal::ModalityType::Video,
                "Sensor" => crate::context::multimodal::ModalityType::Sensor,
                "Haptic" => crate::context::multimodal::ModalityType::Haptic,
                "Neural" => crate::context::multimodal::ModalityType::Neural,
                _ => crate::context::multimodal::ModalityType::Text, // Default fallback
            };

            crate::context::multimodal::ModalInput {
                id: Uuid::parse_str(&input.id).unwrap_or_else(|_| Uuid::new_v4()),
                modality,
                data: input.data,
                metadata: input.metadata,
                timestamp: chrono::DateTime::parse_from_rfc3339(&input.timestamp)
                    .unwrap_or_else(|_| chrono::Utc::now().into())
                    .with_timezone(&chrono::Utc),
                source: input.source,
            }
        })
        .collect();

    // Process the batch
    let pipeline_guard = pipeline_resource.handle.lock().map_err(|_| atoms::pipeline_error())?;
    
    let results = pipeline_resource.runtime.block_on(async {
        let mut outputs = Vec::new();
        
        // Process inputs through pipeline
        for input in rust_inputs {
            match pipeline_guard.process_input(input).await {
                Ok(_) => {
                    // Wait for output - in a real implementation, this would be more sophisticated
                    // For now, we'll simulate processing
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                }
                Err(e) => {
                    eprintln!("Failed to process input: {}", e);
                    continue;
                }
            }
        }
        
        // Collect outputs - simplified for this implementation
        // In practice, you'd collect actual pipeline outputs
        let mock_output = create_mock_fused_output();
        outputs.push(mock_output);
        
        outputs
    });

    // Convert results back to Elixir format
    let elixir_results: Vec<ElixirFusedOutput> = results
        .into_iter()
        .map(convert_fused_output_to_elixir)
        .collect();

    Ok(elixir_results.encode(Env::new()))
}

#[rustler::nif]
fn get_pipeline_metrics(
    pipeline_resource: ResourceArc<PipelineResource>
) -> NifResult<Term> {
    let pipeline_guard = pipeline_resource.handle.lock().map_err(|_| atoms::pipeline_error())?;
    
    let metrics = pipeline_guard.get_metrics();
    
    let elixir_metrics = ElixirPipelineMetrics {
        total_inputs_processed: metrics.total_inputs_processed,
        successful_fusions: metrics.successful_fusions,
        failed_processing: metrics.failed_processing,
        average_pipeline_latency: metrics.average_pipeline_latency,
        modality_distribution: metrics.modality_distribution
            .into_iter()
            .map(|(k, v)| (format!("{:?}", k), v))
            .collect(),
        fusion_quality_scores: metrics.fusion_quality_scores,
    };

    Ok(elixir_metrics.encode(Env::new()))
}

#[rustler::nif]
fn shutdown_pipeline(pipeline_resource: ResourceArc<PipelineResource>) -> NifResult<Atom> {
    let pipeline_guard = pipeline_resource.handle.lock().map_err(|_| atoms::pipeline_error())?;
    
    pipeline_resource.runtime.block_on(async {
        match pipeline_guard.shutdown().await {
            Ok(_) => Ok(atoms::ok()),
            Err(_) => Err(atoms::pipeline_error()),
        }
    })
}

// Feature extraction NIFs
#[rustler::nif]
fn extract_text_features(text: String) -> NifResult<Term> {
    let features = crate::context::multimodal::extractors::FeatureExtractor::extract_text_features(&text);
    
    // Convert HashMap<String, f32> to Elixir map
    let elixir_features: HashMap<String, f32> = features;
    Ok(elixir_features.encode(Env::new()))
}

#[rustler::nif]
fn extract_image_features(image_data: Vec<u8>) -> NifResult<Term> {
    match crate::context::multimodal::extractors::FeatureExtractor::extract_image_features(&image_data) {
        Ok(features) => {
            let elixir_features: HashMap<String, f32> = features;
            Ok(elixir_features.encode(Env::new()))
        }
        Err(_) => Err(atoms::invalid_input().into()),
    }
}

#[rustler::nif]
fn extract_audio_features(audio_data: Vec<u8>) -> NifResult<Term> {
    match crate::context::multimodal::extractors::FeatureExtractor::extract_audio_features(&audio_data) {
        Ok(features) => {
            let elixir_features: HashMap<String, f32> = features;
            Ok(elixir_features.encode(Env::new()))
        }
        Err(_) => Err(atoms::invalid_input().into()),
    }
}

#[rustler::nif]
fn extract_video_features(video_data: Vec<u8>) -> NifResult<Term> {
    match crate::context::multimodal::extractors::FeatureExtractor::extract_video_features(&video_data) {
        Ok(features) => {
            let elixir_features: HashMap<String, f32> = features;
            Ok(elixir_features.encode(Env::new()))
        }
        Err(_) => Err(atoms::invalid_input().into()),
    }
}

// Embedding transformation NIFs
#[rustler::nif]
fn transform_embedding(
    embedding: Vec<f32>,
    from_modality: String,
    to_modality: Option<String>
) -> NifResult<Term> {
    let transformer = crate::context::multimodal::transformers::EmbeddingTransformer::new();
    
    let from_mod = string_to_modality_type(&from_modality);
    let to_mod = to_modality.as_ref().map(|s| string_to_modality_type(s));
    
    match transformer.transform_embedding(&embedding, &from_mod, to_mod.as_ref()) {
        Ok(transformed) => Ok(transformed.encode(Env::new())),
        Err(_) => Err(atoms::pipeline_error().into()),
    }
}

#[rustler::nif]
fn align_embeddings(embeddings_with_modalities: Vec<(Vec<f32>, String)>) -> NifResult<Term> {
    let transformer = crate::context::multimodal::transformers::EmbeddingTransformer::new();
    
    let rust_embeddings: Vec<(Vec<f32>, crate::context::multimodal::ModalityType)> = 
        embeddings_with_modalities
            .into_iter()
            .map(|(emb, mod_str)| (emb, string_to_modality_type(&mod_str)))
            .collect();
    
    match transformer.align_embeddings(&rust_embeddings) {
        Ok(aligned) => Ok(aligned.encode(Env::new())),
        Err(_) => Err(atoms::pipeline_error().into()),
    }
}

#[rustler::nif]
fn create_unified_representation(embeddings_with_modalities: Vec<(Vec<f32>, String)>) -> NifResult<Term> {
    let transformer = crate::context::multimodal::transformers::EmbeddingTransformer::new();
    
    let rust_embeddings: Vec<(Vec<f32>, crate::context::multimodal::ModalityType)> = 
        embeddings_with_modalities
            .into_iter()
            .map(|(emb, mod_str)| (emb, string_to_modality_type(&mod_str)))
            .collect();
    
    match transformer.create_unified_representation(&rust_embeddings) {
        Ok(unified) => Ok(unified.encode(Env::new())),
        Err(_) => Err(atoms::pipeline_error().into()),
    }
}

// Utility functions
fn string_to_modality_type(s: &str) -> crate::context::multimodal::ModalityType {
    match s {
        "Text" => crate::context::multimodal::ModalityType::Text,
        "Image" => crate::context::multimodal::ModalityType::Image,
        "Audio" => crate::context::multimodal::ModalityType::Audio,
        "Video" => crate::context::multimodal::ModalityType::Video,
        "Sensor" => crate::context::multimodal::ModalityType::Sensor,
        "Haptic" => crate::context::multimodal::ModalityType::Haptic,
        "Neural" => crate::context::multimodal::ModalityType::Neural,
        _ => crate::context::multimodal::ModalityType::Text,
    }
}

fn create_mock_fused_output() -> crate::context::multimodal::FusedOutput {
    // Create a mock fused output for testing
    crate::context::multimodal::FusedOutput {
        id: Uuid::new_v4(),
        input_ids: vec![Uuid::new_v4()],
        modalities: vec![crate::context::multimodal::ModalityType::Text],
        unified_embedding: vec![0.1, 0.2, 0.3, 0.4, 0.5],
        cross_modal_attention: vec![vec![0.8, 0.2], vec![0.3, 0.7]],
        fusion_confidence: 0.85,
        semantic_understanding: "Mock semantic understanding".to_string(),
        emergent_properties: {
            let mut props = HashMap::new();
            props.insert("creativity".to_string(), 0.7);
            props.insert("coherence".to_string(), 0.8);
            props
        },
    }
}

fn convert_fused_output_to_elixir(output: crate::context::multimodal::FusedOutput) -> ElixirFusedOutput {
    ElixirFusedOutput {
        id: output.id.to_string(),
        input_ids: output.input_ids.iter().map(|id| id.to_string()).collect(),
        modalities: output.modalities.iter().map(|m| format!("{:?}", m)).collect(),
        unified_embedding: output.unified_embedding,
        cross_modal_attention: output.cross_modal_attention,
        fusion_confidence: output.fusion_confidence,
        semantic_understanding: output.semantic_understanding,
        emergent_properties: output.emergent_properties,
    }
}

// Initialize the NIF
rustler::init!(
    "ai_osx_multimodal",
    [
        create_pipeline,
        process_batch,
        get_pipeline_metrics,
        shutdown_pipeline,
        extract_text_features,
        extract_image_features,
        extract_audio_features,
        extract_video_features,
        transform_embedding,
        align_embeddings,
        create_unified_representation
    ],
    load = on_load
);

fn on_load(_env: Env, _info: Term) -> bool {
    true
}