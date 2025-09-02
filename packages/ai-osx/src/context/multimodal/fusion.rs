use super::*;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use nalgebra::{DMatrix, DVector};

pub struct FusionEngine {
    attention_mechanism: Arc<RwLock<CrossModalAttention>>,
    fusion_strategy: FusionStrategy,
    emergent_detector: Arc<RwLock<EmergentPropertyDetector>>,
    metrics: Arc<RwLock<FusionMetrics>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FusionStrategy {
    EarlyFusion,      // Concatenate features before processing
    LateFusion,       // Process modalities separately, fuse outputs
    HybridFusion,     // Combination of early and late fusion
    AttentionFusion,  // Cross-modal attention-based fusion
    HierarchicalFusion, // Multi-level fusion with increasing abstraction
}

struct CrossModalAttention {
    attention_weights: HashMap<(ModalityType, ModalityType), DMatrix<f32>>,
    temperature: f32,
    dropout_rate: f32,
}

struct EmergentPropertyDetector {
    emergence_threshold: f32,
    property_templates: Vec<EmergenceTemplate>,
    detected_properties: Vec<EmergentProperty>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmergenceTemplate {
    name: String,
    required_modalities: Vec<ModalityType>,
    pattern_signature: Vec<f32>,
    confidence_threshold: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmergentProperty {
    id: Uuid,
    name: String,
    modalities_involved: Vec<ModalityType>,
    strength: f32,
    description: String,
    timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FusionMetrics {
    total_fusions: u64,
    successful_fusions: u64,
    average_fusion_time: f64,
    cross_modal_coherence_score: f32,
    emergent_properties_detected: u64,
    modality_contribution_scores: HashMap<ModalityType, f32>,
}

impl FusionEngine {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let attention_mechanism = Arc::new(RwLock::new(CrossModalAttention {
            attention_weights: HashMap::new(),
            temperature: 1.0,
            dropout_rate: 0.1,
        }));

        let emergent_detector = Arc::new(RwLock::new(EmergentPropertyDetector {
            emergence_threshold: 0.7,
            property_templates: Self::create_emergence_templates(),
            detected_properties: Vec::new(),
        }));

        let metrics = Arc::new(RwLock::new(FusionMetrics {
            total_fusions: 0,
            successful_fusions: 0,
            average_fusion_time: 0.0,
            cross_modal_coherence_score: 0.0,
            emergent_properties_detected: 0,
            modality_contribution_scores: HashMap::new(),
        }));

        Ok(FusionEngine {
            attention_mechanism,
            fusion_strategy: FusionStrategy::HybridFusion,
            emergent_detector,
            metrics,
        })
    }

    pub async fn fuse_modalities(&self, processed_modals: Vec<ProcessedModal>) -> Result<FusedOutput, Box<dyn std::error::Error>> {
        let start_time = std::time::Instant::now();
        
        if processed_modals.is_empty() {
            return Err("No modalities to fuse".into());
        }

        // Update metrics
        {
            let mut metrics = self.metrics.write().unwrap();
            metrics.total_fusions += 1;
        }

        // Perform fusion based on strategy
        let fused_result = match self.fusion_strategy {
            FusionStrategy::EarlyFusion => self.early_fusion(&processed_modals).await?,
            FusionStrategy::LateFusion => self.late_fusion(&processed_modals).await?,
            FusionStrategy::HybridFusion => self.hybrid_fusion(&processed_modals).await?,
            FusionStrategy::AttentionFusion => self.attention_fusion(&processed_modals).await?,
            FusionStrategy::HierarchicalFusion => self.hierarchical_fusion(&processed_modals).await?,
        };

        // Detect emergent properties
        let emergent_properties = self.detect_emergent_properties(&processed_modals, &fused_result).await?;

        // Calculate cross-modal coherence
        let coherence_score = self.calculate_cross_modal_coherence(&processed_modals, &fused_result);

        // Generate semantic understanding
        let semantic_understanding = self.generate_semantic_understanding(&processed_modals, &fused_result).await?;

        let fusion_time = start_time.elapsed().as_millis() as f64;

        // Update metrics
        {
            let mut metrics = self.metrics.write().unwrap();
            metrics.successful_fusions += 1;
            metrics.average_fusion_time = 
                (metrics.average_fusion_time * (metrics.successful_fusions - 1) as f64 + fusion_time) 
                / metrics.successful_fusions as f64;
            metrics.cross_modal_coherence_score = 
                (metrics.cross_modal_coherence_score + coherence_score) / 2.0;
            metrics.emergent_properties_detected += emergent_properties.len() as u64;

            // Update modality contribution scores
            for modal in &processed_modals {
                *metrics.modality_contribution_scores
                    .entry(modal.modality.clone())
                    .or_insert(0.0) += modal.confidence;
            }
        }

        Ok(FusedOutput {
            id: Uuid::new_v4(),
            input_ids: processed_modals.iter().map(|m| m.input_id).collect(),
            modalities: processed_modals.iter().map(|m| m.modality.clone()).collect(),
            unified_embedding: fused_result.unified_embedding,
            cross_modal_attention: fused_result.attention_weights,
            fusion_confidence: fused_result.confidence,
            semantic_understanding,
            emergent_properties: emergent_properties.into_iter()
                .map(|prop| (prop.name.clone(), prop.strength))
                .collect(),
        })
    }

    async fn early_fusion(&self, modals: &[ProcessedModal]) -> Result<FusionResult, Box<dyn std::error::Error>> {
        // Concatenate all features and embeddings
        let mut unified_features = Vec::new();
        let mut unified_embeddings = Vec::new();
        let mut total_confidence = 0.0;

        for modal in modals {
            unified_features.extend_from_slice(&modal.features);
            unified_embeddings.extend_from_slice(&modal.embeddings);
            total_confidence += modal.confidence;
        }

        let confidence = total_confidence / modals.len() as f32;

        // Apply dimensionality reduction if needed
        let target_dim = 1024;
        if unified_embeddings.len() > target_dim {
            unified_embeddings = self.apply_dimensionality_reduction(&unified_embeddings, target_dim)?;
        }

        // Generate attention weights (simplified for early fusion)
        let attention_weights = vec![vec![1.0 / modals.len() as f32; modals.len()]; modals.len()];

        Ok(FusionResult {
            unified_embedding: unified_embeddings,
            attention_weights,
            confidence,
        })
    }

    async fn late_fusion(&self, modals: &[ProcessedModal]) -> Result<FusionResult, Box<dyn std::error::Error>> {
        // Process each modality separately, then combine outputs
        let mut modal_outputs = Vec::new();
        let mut confidences = Vec::new();

        for modal in modals {
            // Apply modality-specific transformation
            let transformed = self.apply_modality_transform(modal).await?;
            modal_outputs.push(transformed.embedding);
            confidences.push(transformed.confidence);
        }

        // Weighted fusion based on confidence scores
        let total_confidence: f32 = confidences.iter().sum();
        let weights: Vec<f32> = confidences.iter()
            .map(|c| c / total_confidence)
            .collect();

        let mut unified_embedding = vec![0.0; modal_outputs[0].len()];
        for (i, output) in modal_outputs.iter().enumerate() {
            for (j, &value) in output.iter().enumerate() {
                unified_embedding[j] += weights[i] * value;
            }
        }

        // Generate cross-modal attention
        let attention_weights = self.calculate_late_fusion_attention(&modal_outputs, &weights)?;

        Ok(FusionResult {
            unified_embedding,
            attention_weights,
            confidence: total_confidence / modals.len() as f32,
        })
    }

    async fn hybrid_fusion(&self, modals: &[ProcessedModal]) -> Result<FusionResult, Box<dyn std::error::Error>> {
        // Combine early and late fusion strategies
        let early_result = self.early_fusion(modals).await?;
        let late_result = self.late_fusion(modals).await?;

        // Blend the results
        let blend_ratio = 0.6; // Favor early fusion slightly
        let mut unified_embedding = Vec::new();

        for i in 0..early_result.unified_embedding.len().min(late_result.unified_embedding.len()) {
            let blended_value = blend_ratio * early_result.unified_embedding[i] + 
                              (1.0 - blend_ratio) * late_result.unified_embedding[i];
            unified_embedding.push(blended_value);
        }

        // Blend attention weights
        let mut attention_weights = Vec::new();
        for i in 0..early_result.attention_weights.len().min(late_result.attention_weights.len()) {
            let mut row = Vec::new();
            for j in 0..early_result.attention_weights[i].len().min(late_result.attention_weights[i].len()) {
                let blended_weight = blend_ratio * early_result.attention_weights[i][j] + 
                                   (1.0 - blend_ratio) * late_result.attention_weights[i][j];
                row.push(blended_weight);
            }
            attention_weights.push(row);
        }

        Ok(FusionResult {
            unified_embedding,
            attention_weights,
            confidence: (early_result.confidence + late_result.confidence) / 2.0,
        })
    }

    async fn attention_fusion(&self, modals: &[ProcessedModal]) -> Result<FusionResult, Box<dyn std::error::Error>> {
        // Implement cross-modal attention mechanism
        let embeddings: Vec<&Vec<f32>> = modals.iter().map(|m| &m.embeddings).collect();
        let modality_types: Vec<&ModalityType> = modals.iter().map(|m| &m.modality).collect();

        // Calculate attention scores between all pairs of modalities
        let mut attention_matrix = vec![vec![0.0f32; modals.len()]; modals.len()];
        
        for i in 0..modals.len() {
            for j in 0..modals.len() {
                if i != j {
                    attention_matrix[i][j] = self.calculate_attention_score(
                        &embeddings[i], 
                        &embeddings[j],
                        &modality_types[i],
                        &modality_types[j]
                    )?;
                } else {
                    attention_matrix[i][j] = 1.0; // Self-attention
                }
            }
        }

        // Apply softmax to attention scores
        for row in &mut attention_matrix {
            let max_val = row.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));
            let sum: f32 = row.iter().map(|&x| (x - max_val).exp()).sum();
            for val in row.iter_mut() {
                *val = (*val - max_val).exp() / sum;
            }
        }

        // Apply attention to create unified embedding
        let embedding_dim = embeddings[0].len();
        let mut unified_embedding = vec![0.0; embedding_dim];

        for i in 0..modals.len() {
            for j in 0..embedding_dim {
                for k in 0..modals.len() {
                    unified_embedding[j] += attention_matrix[i][k] * embeddings[k][j];
                }
            }
        }

        // Normalize
        let norm: f32 = unified_embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm > 0.0 {
            for val in &mut unified_embedding {
                *val /= norm;
            }
        }

        let confidence = modals.iter().map(|m| m.confidence).sum::<f32>() / modals.len() as f32;

        Ok(FusionResult {
            unified_embedding,
            attention_weights: attention_matrix,
            confidence,
        })
    }

    async fn hierarchical_fusion(&self, modals: &[ProcessedModal]) -> Result<FusionResult, Box<dyn std::error::Error>> {
        // Multi-level fusion with increasing abstraction
        
        // Level 1: Low-level feature fusion within similar modalities
        let mut level1_results = HashMap::new();
        let mut modalities_by_type: HashMap<ModalityType, Vec<&ProcessedModal>> = HashMap::new();
        
        for modal in modals {
            modalities_by_type.entry(modal.modality.clone())
                .or_insert_with(Vec::new)
                .push(modal);
        }

        for (modality_type, modality_group) in modalities_by_type {
            if modality_group.len() > 1 {
                let group_result = self.fuse_same_modality_group(&modality_group).await?;
                level1_results.insert(modality_type, group_result);
            } else {
                level1_results.insert(modality_type, ModalityGroupResult {
                    embedding: modality_group[0].embeddings.clone(),
                    confidence: modality_group[0].confidence,
                });
            }
        }

        // Level 2: Cross-modal fusion between different modality types
        let level1_modals: Vec<ProcessedModal> = level1_results.into_iter()
            .map(|(modality_type, result)| ProcessedModal {
                id: Uuid::new_v4(),
                input_id: Uuid::new_v4(),
                modality: modality_type,
                features: result.embedding.clone(),
                embeddings: result.embedding,
                confidence: result.confidence,
                metadata: HashMap::new(),
                processing_time_ms: 0,
            })
            .collect();

        // Apply attention fusion to level 2
        let level2_result = self.attention_fusion(&level1_modals).await?;

        // Level 3: Abstract semantic fusion
        let semantic_features = self.extract_semantic_features(&level2_result).await?;
        let mut final_embedding = level2_result.unified_embedding;
        final_embedding.extend(semantic_features);

        Ok(FusionResult {
            unified_embedding: final_embedding,
            attention_weights: level2_result.attention_weights,
            confidence: level2_result.confidence,
        })
    }

    fn calculate_attention_score(
        &self,
        emb1: &[f32], 
        emb2: &[f32],
        mod1: &ModalityType,
        mod2: &ModalityType
    ) -> Result<f32, Box<dyn std::error::Error>> {
        // Calculate similarity between embeddings
        let mut dot_product = 0.0;
        let mut norm1 = 0.0;
        let mut norm2 = 0.0;

        let min_len = emb1.len().min(emb2.len());
        for i in 0..min_len {
            dot_product += emb1[i] * emb2[i];
            norm1 += emb1[i] * emb1[i];
            norm2 += emb2[i] * emb2[i];
        }

        let cosine_similarity = if norm1 > 0.0 && norm2 > 0.0 {
            dot_product / (norm1.sqrt() * norm2.sqrt())
        } else {
            0.0
        };

        // Apply modality-specific attention bias
        let modality_bias = self.get_modality_interaction_bias(mod1, mod2);
        
        Ok((cosine_similarity + modality_bias) / 2.0)
    }

    fn get_modality_interaction_bias(&self, mod1: &ModalityType, mod2: &ModalityType) -> f32 {
        // Define how well different modalities interact
        match (mod1, mod2) {
            (ModalityType::Text, ModalityType::Image) => 0.8,  // High complementarity
            (ModalityType::Image, ModalityType::Text) => 0.8,
            (ModalityType::Audio, ModalityType::Video) => 0.9, // Very high complementarity
            (ModalityType::Video, ModalityType::Audio) => 0.9,
            (ModalityType::Text, ModalityType::Audio) => 0.7,  // Moderate complementarity
            (ModalityType::Audio, ModalityType::Text) => 0.7,
            (ModalityType::Text, ModalityType::Video) => 0.75,
            (ModalityType::Video, ModalityType::Text) => 0.75,
            (ModalityType::Image, ModalityType::Audio) => 0.6,
            (ModalityType::Audio, ModalityType::Image) => 0.6,
            (ModalityType::Image, ModalityType::Video) => 0.85, // High visual similarity
            (ModalityType::Video, ModalityType::Image) => 0.85,
            _ => 0.5, // Default for unknown combinations
        }
    }

    async fn detect_emergent_properties(
        &self, 
        modals: &[ProcessedModal], 
        fusion_result: &FusionResult
    ) -> Result<Vec<EmergentProperty>, Box<dyn std::error::Error>> {
        let mut detected_properties = Vec::new();
        let detector = self.emergent_detector.read().unwrap();

        for template in &detector.property_templates {
            // Check if required modalities are present
            let has_required_modalities = template.required_modalities.iter()
                .all(|req_mod| modals.iter().any(|m| &m.modality == req_mod));

            if !has_required_modalities {
                continue;
            }

            // Calculate pattern match score
            let match_score = self.calculate_pattern_match_score(
                &fusion_result.unified_embedding,
                &template.pattern_signature
            );

            if match_score > template.confidence_threshold {
                detected_properties.push(EmergentProperty {
                    id: Uuid::new_v4(),
                    name: template.name.clone(),
                    modalities_involved: template.required_modalities.clone(),
                    strength: match_score,
                    description: self.generate_property_description(&template.name, match_score),
                    timestamp: chrono::Utc::now(),
                });
            }
        }

        Ok(detected_properties)
    }

    fn calculate_pattern_match_score(&self, embedding: &[f32], pattern: &[f32]) -> f32 {
        let min_len = embedding.len().min(pattern.len());
        if min_len == 0 {
            return 0.0;
        }

        let mut dot_product = 0.0;
        let mut norm1 = 0.0;
        let mut norm2 = 0.0;

        for i in 0..min_len {
            dot_product += embedding[i] * pattern[i];
            norm1 += embedding[i] * embedding[i];
            norm2 += pattern[i] * pattern[i];
        }

        if norm1 > 0.0 && norm2 > 0.0 {
            dot_product / (norm1.sqrt() * norm2.sqrt())
        } else {
            0.0
        }
    }

    fn generate_property_description(&self, property_name: &str, strength: f32) -> String {
        match property_name {
            "synesthesia" => format!("Cross-modal sensory blending detected with strength {:.2}", strength),
            "narrative_coherence" => format!("Coherent narrative structure identified with confidence {:.2}", strength),
            "emotional_resonance" => format!("Strong emotional connection across modalities: {:.2}", strength),
            "cognitive_load" => format!("High cognitive complexity requiring attention: {:.2}", strength),
            "aesthetic_harmony" => format!("Harmonious aesthetic composition detected: {:.2}", strength),
            _ => format!("Emergent property '{}' detected with strength {:.2}", property_name, strength),
        }
    }

    fn calculate_cross_modal_coherence(&self, modals: &[ProcessedModal], fusion_result: &FusionResult) -> f32 {
        if modals.len() < 2 {
            return 1.0; // Perfect coherence for single modality
        }

        // Calculate average attention strength as coherence metric
        let mut total_attention = 0.0;
        let mut attention_count = 0;

        for row in &fusion_result.attention_weights {
            for &weight in row {
                total_attention += weight;
                attention_count += 1;
            }
        }

        if attention_count > 0 {
            let average_attention = total_attention / attention_count as f32;
            // Normalize to [0,1] range
            average_attention.min(1.0).max(0.0)
        } else {
            0.5 // Default coherence
        }
    }

    async fn generate_semantic_understanding(
        &self, 
        modals: &[ProcessedModal], 
        fusion_result: &FusionResult
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Generate human-readable description of the fused content
        let modality_descriptions: Vec<String> = modals.iter()
            .map(|m| self.describe_modality(m))
            .collect();

        let coherence_score = self.calculate_cross_modal_coherence(modals, fusion_result);
        let confidence = fusion_result.confidence;

        let understanding = format!(
            "Multi-modal fusion of {} modalities: {}. Cross-modal coherence: {:.2}, Overall confidence: {:.2}. {}",
            modals.len(),
            modality_descriptions.join(", "),
            coherence_score,
            confidence,
            if coherence_score > 0.8 { 
                "High coherence indicates strong semantic alignment across modalities." 
            } else if coherence_score > 0.6 {
                "Moderate coherence suggests partial semantic alignment."
            } else {
                "Low coherence may indicate conflicting or unrelated content."
            }
        );

        Ok(understanding)
    }

    fn describe_modality(&self, modal: &ProcessedModal) -> String {
        match modal.modality {
            ModalityType::Text => format!("textual content (conf: {:.2})", modal.confidence),
            ModalityType::Image => format!("visual imagery (conf: {:.2})", modal.confidence),
            ModalityType::Audio => format!("audio content (conf: {:.2})", modal.confidence),
            ModalityType::Video => format!("video sequence (conf: {:.2})", modal.confidence),
            ModalityType::Sensor => format!("sensor data (conf: {:.2})", modal.confidence),
            ModalityType::Haptic => format!("haptic feedback (conf: {:.2})", modal.confidence),
            ModalityType::Neural => format!("neural signals (conf: {:.2})", modal.confidence),
        }
    }

    fn create_emergence_templates() -> Vec<EmergenceTemplate> {
        vec![
            EmergenceTemplate {
                name: "synesthesia".to_string(),
                required_modalities: vec![ModalityType::Audio, ModalityType::Image],
                pattern_signature: vec![0.8, 0.6, 0.9, 0.7, 0.5], // Simplified pattern
                confidence_threshold: 0.75,
            },
            EmergenceTemplate {
                name: "narrative_coherence".to_string(),
                required_modalities: vec![ModalityType::Text, ModalityType::Video],
                pattern_signature: vec![0.9, 0.8, 0.7, 0.8, 0.9],
                confidence_threshold: 0.8,
            },
            EmergenceTemplate {
                name: "emotional_resonance".to_string(),
                required_modalities: vec![ModalityType::Text, ModalityType::Audio, ModalityType::Image],
                pattern_signature: vec![0.7, 0.9, 0.8, 0.6, 0.8],
                confidence_threshold: 0.7,
            },
            EmergenceTemplate {
                name: "cognitive_load".to_string(),
                required_modalities: vec![ModalityType::Text, ModalityType::Image, ModalityType::Audio],
                pattern_signature: vec![0.6, 0.7, 0.9, 0.8, 0.7],
                confidence_threshold: 0.65,
            },
            EmergenceTemplate {
                name: "aesthetic_harmony".to_string(),
                required_modalities: vec![ModalityType::Image, ModalityType::Audio],
                pattern_signature: vec![0.9, 0.8, 0.7, 0.9, 0.8],
                confidence_threshold: 0.8,
            },
        ]
    }

    fn apply_dimensionality_reduction(&self, embeddings: &[f32], target_dim: usize) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Simple truncation (in production, use PCA or other methods)
        Ok(embeddings.iter().take(target_dim).cloned().collect())
    }

    async fn apply_modality_transform(&self, modal: &ProcessedModal) -> Result<ModalityTransformResult, Box<dyn std::error::Error>> {
        // Apply modality-specific transformations
        let transformed_embedding = match modal.modality {
            ModalityType::Text => self.transform_text_embedding(&modal.embeddings),
            ModalityType::Image => self.transform_image_embedding(&modal.embeddings),
            ModalityType::Audio => self.transform_audio_embedding(&modal.embeddings),
            ModalityType::Video => self.transform_video_embedding(&modal.embeddings),
            _ => modal.embeddings.clone(),
        };

        Ok(ModalityTransformResult {
            embedding: transformed_embedding,
            confidence: modal.confidence * 0.95, // Slight confidence decay from transformation
        })
    }

    fn transform_text_embedding(&self, embedding: &[f32]) -> Vec<f32> {
        // Apply text-specific transformation (e.g., linguistic normalization)
        embedding.iter().map(|&x| x.tanh()).collect()
    }

    fn transform_image_embedding(&self, embedding: &[f32]) -> Vec<f32> {
        // Apply image-specific transformation (e.g., visual feature enhancement)
        embedding.iter().map(|&x| (x * 1.1).min(1.0).max(-1.0)).collect()
    }

    fn transform_audio_embedding(&self, embedding: &[f32]) -> Vec<f32> {
        // Apply audio-specific transformation (e.g., spectral normalization)
        let mean = embedding.iter().sum::<f32>() / embedding.len() as f32;
        embedding.iter().map(|&x| x - mean).collect()
    }

    fn transform_video_embedding(&self, embedding: &[f32]) -> Vec<f32> {
        // Apply video-specific transformation (e.g., temporal smoothing)
        let window_size = 3;
        let mut transformed = Vec::new();
        
        for i in 0..embedding.len() {
            let start = i.saturating_sub(window_size / 2);
            let end = (i + window_size / 2 + 1).min(embedding.len());
            let window_sum: f32 = embedding[start..end].iter().sum();
            let window_avg = window_sum / (end - start) as f32;
            transformed.push(window_avg);
        }
        
        transformed
    }

    fn calculate_late_fusion_attention(&self, outputs: &[Vec<f32>], weights: &[f32]) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        let n = outputs.len();
        let mut attention_matrix = vec![vec![0.0; n]; n];
        
        for i in 0..n {
            for j in 0..n {
                if i == j {
                    attention_matrix[i][j] = weights[i];
                } else {
                    // Cross-attention based on embedding similarity and confidence
                    let similarity = self.calculate_embedding_similarity(&outputs[i], &outputs[j]);
                    attention_matrix[i][j] = similarity * weights[i] * weights[j];
                }
            }
        }
        
        Ok(attention_matrix)
    }

    fn calculate_embedding_similarity(&self, emb1: &[f32], emb2: &[f32]) -> f32 {
        let min_len = emb1.len().min(emb2.len());
        if min_len == 0 {
            return 0.0;
        }

        let mut dot_product = 0.0;
        let mut norm1 = 0.0;
        let mut norm2 = 0.0;

        for i in 0..min_len {
            dot_product += emb1[i] * emb2[i];
            norm1 += emb1[i] * emb1[i];
            norm2 += emb2[i] * emb2[i];
        }

        if norm1 > 0.0 && norm2 > 0.0 {
            dot_product / (norm1.sqrt() * norm2.sqrt())
        } else {
            0.0
        }
    }

    async fn fuse_same_modality_group(&self, group: &[&ProcessedModal]) -> Result<ModalityGroupResult, Box<dyn std::error::Error>> {
        // Fuse multiple instances of the same modality type
        let mut combined_embedding = vec![0.0; group[0].embeddings.len()];
        let mut total_confidence = 0.0;

        for modal in group {
            let weight = modal.confidence;
            for (i, &value) in modal.embeddings.iter().enumerate() {
                if i < combined_embedding.len() {
                    combined_embedding[i] += weight * value;
                }
            }
            total_confidence += weight;
        }

        // Normalize by total weight
        if total_confidence > 0.0 {
            for value in &mut combined_embedding {
                *value /= total_confidence;
            }
        }

        Ok(ModalityGroupResult {
            embedding: combined_embedding,
            confidence: total_confidence / group.len() as f32,
        })
    }

    async fn extract_semantic_features(&self, fusion_result: &FusionResult) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Extract high-level semantic features from the fusion result
        let embedding = &fusion_result.unified_embedding;
        let mut semantic_features = Vec::new();

        // Statistical moments
        let mean = embedding.iter().sum::<f32>() / embedding.len() as f32;
        let variance = embedding.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f32>() / embedding.len() as f32;
        let skewness = embedding.iter()
            .map(|&x| ((x - mean) / variance.sqrt()).powi(3))
            .sum::<f32>() / embedding.len() as f32;

        semantic_features.push(mean);
        semantic_features.push(variance);
        semantic_features.push(skewness);

        // Entropy measure
        let entropy = self.calculate_embedding_entropy(embedding);
        semantic_features.push(entropy);

        // Attention coherence
        let attention_coherence = self.calculate_attention_coherence(&fusion_result.attention_weights);
        semantic_features.push(attention_coherence);

        Ok(semantic_features)
    }

    fn calculate_embedding_entropy(&self, embedding: &[f32]) -> f32 {
        // Calculate information entropy of embedding values
        let mut histogram = vec![0u32; 100];
        let min_val = embedding.iter().fold(f32::INFINITY, |a, &b| a.min(b));
        let max_val = embedding.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));
        
        if max_val > min_val {
            for &value in embedding {
                let normalized = (value - min_val) / (max_val - min_val);
                let bin = ((normalized * 99.0) as usize).min(99);
                histogram[bin] += 1;
            }
            
            let total = embedding.len() as f32;
            let entropy = histogram.iter()
                .filter(|&&count| count > 0)
                .map(|&count| {
                    let p = count as f32 / total;
                    -p * p.log2()
                })
                .sum::<f32>();
            
            entropy / 100.0_f32.log2() // Normalize
        } else {
            0.0
        }
    }

    fn calculate_attention_coherence(&self, attention_weights: &[Vec<f32>]) -> f32 {
        // Measure how coherent the attention pattern is
        let mut total_variance = 0.0;
        let n = attention_weights.len();
        
        if n == 0 {
            return 0.0;
        }

        for row in attention_weights {
            if !row.is_empty() {
                let mean = row.iter().sum::<f32>() / row.len() as f32;
                let variance = row.iter()
                    .map(|&x| (x - mean).powi(2))
                    .sum::<f32>() / row.len() as f32;
                total_variance += variance;
            }
        }

        let average_variance = total_variance / n as f32;
        1.0 / (1.0 + average_variance) // Inverse relationship with variance
    }

    pub fn get_metrics(&self) -> FusionMetrics {
        self.metrics.read().unwrap().clone()
    }
}

struct FusionResult {
    unified_embedding: Vec<f32>,
    attention_weights: Vec<Vec<f32>>,
    confidence: f32,
}

struct ModalityTransformResult {
    embedding: Vec<f32>,
    confidence: f32,
}

struct ModalityGroupResult {
    embedding: Vec<f32>,
    confidence: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fusion_engine_creation() {
        let engine = FusionEngine::new().await;
        assert!(engine.is_ok());
    }

    #[tokio::test]
    async fn test_cross_modal_attention() {
        let engine = FusionEngine::new().await.unwrap();
        let emb1 = vec![0.1, 0.2, 0.3];
        let emb2 = vec![0.4, 0.5, 0.6];
        
        let score = engine.calculate_attention_score(
            &emb1, 
            &emb2, 
            &ModalityType::Text, 
            &ModalityType::Image
        );
        
        assert!(score.is_ok());
        assert!(score.unwrap() >= 0.0 && score.unwrap() <= 1.0);
    }
}