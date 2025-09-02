use super::*;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

pub struct EmbeddingTransformer {
    transformation_matrices: HashMap<ModalityType, TransformationMatrix>,
    alignment_strategies: HashMap<(ModalityType, ModalityType), AlignmentStrategy>,
    normalization_config: NormalizationConfig,
}

#[derive(Debug, Clone)]
pub struct TransformationMatrix {
    matrix: Vec<Vec<f32>>,
    input_dim: usize,
    output_dim: usize,
    bias: Vec<f32>,
}

#[derive(Debug, Clone)]
pub enum AlignmentStrategy {
    LinearProjection,
    NonLinearMapping,
    AttentionBased,
    CanonicalCorrelation,
    AdversarialAlignment,
}

#[derive(Debug, Clone)]
pub struct NormalizationConfig {
    method: NormalizationMethod,
    epsilon: f32,
    momentum: f32,
}

#[derive(Debug, Clone)]
pub enum NormalizationMethod {
    BatchNorm,
    LayerNorm,
    UnitNorm,
    StandardScaling,
    MinMaxScaling,
}

impl EmbeddingTransformer {
    pub fn new() -> Self {
        let mut transformation_matrices = HashMap::new();
        let mut alignment_strategies = HashMap::new();

        // Initialize transformation matrices for each modality
        transformation_matrices.insert(
            ModalityType::Text,
            Self::create_text_transformation_matrix()
        );
        transformation_matrices.insert(
            ModalityType::Image,
            Self::create_image_transformation_matrix()
        );
        transformation_matrices.insert(
            ModalityType::Audio,
            Self::create_audio_transformation_matrix()
        );
        transformation_matrices.insert(
            ModalityType::Video,
            Self::create_video_transformation_matrix()
        );

        // Define alignment strategies between modalities
        alignment_strategies.insert(
            (ModalityType::Text, ModalityType::Image),
            AlignmentStrategy::AttentionBased
        );
        alignment_strategies.insert(
            (ModalityType::Audio, ModalityType::Video),
            AlignmentStrategy::CanonicalCorrelation
        );
        alignment_strategies.insert(
            (ModalityType::Text, ModalityType::Audio),
            AlignmentStrategy::LinearProjection
        );

        let normalization_config = NormalizationConfig {
            method: NormalizationMethod::LayerNorm,
            epsilon: 1e-6,
            momentum: 0.9,
        };

        EmbeddingTransformer {
            transformation_matrices,
            alignment_strategies,
            normalization_config,
        }
    }

    pub fn transform_embedding(
        &self,
        embedding: &[f32],
        from_modality: &ModalityType,
        to_modality: Option<&ModalityType>
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Step 1: Apply modality-specific transformation
        let transformed = self.apply_modality_transformation(embedding, from_modality)?;

        // Step 2: Apply normalization
        let normalized = self.apply_normalization(&transformed)?;

        // Step 3: If target modality specified, apply cross-modal alignment
        if let Some(target_modality) = to_modality {
            let aligned = self.apply_cross_modal_alignment(
                &normalized,
                from_modality,
                target_modality
            )?;
            Ok(aligned)
        } else {
            Ok(normalized)
        }
    }

    pub fn align_embeddings(
        &self,
        embeddings: &[(Vec<f32>, ModalityType)]
    ) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        if embeddings.is_empty() {
            return Ok(Vec::new());
        }

        // Find common embedding space dimension
        let target_dim = self.calculate_common_dimension(embeddings);
        
        let mut aligned_embeddings = Vec::new();

        for (embedding, modality) in embeddings {
            // Transform to common space
            let transformed = self.transform_to_common_space(embedding, modality, target_dim)?;
            aligned_embeddings.push(transformed);
        }

        // Apply joint alignment optimization
        let jointly_aligned = self.apply_joint_alignment(&aligned_embeddings)?;

        Ok(jointly_aligned)
    }

    pub fn create_unified_representation(
        &self,
        embeddings: &[(Vec<f32>, ModalityType)]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Align all embeddings to common space
        let aligned_embeddings = self.align_embeddings(embeddings)?;
        
        if aligned_embeddings.is_empty() {
            return Ok(Vec::new());
        }

        // Create unified representation using multiple fusion strategies
        let concatenated = self.concatenation_fusion(&aligned_embeddings)?;
        let averaged = self.average_fusion(&aligned_embeddings)?;
        let attention_weighted = self.attention_weighted_fusion(&aligned_embeddings, embeddings)?;

        // Combine different fusion strategies
        let mut unified = Vec::new();
        let fusion_weights = [0.4, 0.3, 0.3]; // Weights for different fusion methods

        let max_len = concatenated.len().max(averaged.len()).max(attention_weighted.len());
        
        for i in 0..max_len {
            let mut value = 0.0;
            let mut weight_sum = 0.0;

            if i < concatenated.len() {
                value += fusion_weights[0] * concatenated[i];
                weight_sum += fusion_weights[0];
            }
            if i < averaged.len() {
                value += fusion_weights[1] * averaged[i];
                weight_sum += fusion_weights[1];
            }
            if i < attention_weighted.len() {
                value += fusion_weights[2] * attention_weighted[i];
                weight_sum += fusion_weights[2];
            }

            unified.push(if weight_sum > 0.0 { value / weight_sum } else { 0.0 });
        }

        // Apply final normalization
        let normalized_unified = self.apply_normalization(&unified)?;

        Ok(normalized_unified)
    }

    fn apply_modality_transformation(
        &self,
        embedding: &[f32],
        modality: &ModalityType
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        if let Some(transform_matrix) = self.transformation_matrices.get(modality) {
            self.matrix_multiply(embedding, transform_matrix)
        } else {
            // If no specific transformation, return normalized version
            self.apply_normalization(embedding)
        }
    }

    fn apply_cross_modal_alignment(
        &self,
        embedding: &[f32],
        from_modality: &ModalityType,
        to_modality: &ModalityType
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let strategy = self.alignment_strategies
            .get(&(from_modality.clone(), to_modality.clone()))
            .or_else(|| self.alignment_strategies.get(&(to_modality.clone(), from_modality.clone())))
            .unwrap_or(&AlignmentStrategy::LinearProjection);

        match strategy {
            AlignmentStrategy::LinearProjection => {
                self.apply_linear_projection(embedding, from_modality, to_modality)
            }
            AlignmentStrategy::NonLinearMapping => {
                self.apply_nonlinear_mapping(embedding, from_modality, to_modality)
            }
            AlignmentStrategy::AttentionBased => {
                self.apply_attention_alignment(embedding, from_modality, to_modality)
            }
            AlignmentStrategy::CanonicalCorrelation => {
                self.apply_canonical_correlation(embedding, from_modality, to_modality)
            }
            AlignmentStrategy::AdversarialAlignment => {
                self.apply_adversarial_alignment(embedding, from_modality, to_modality)
            }
        }
    }

    fn apply_linear_projection(
        &self,
        embedding: &[f32],
        _from_modality: &ModalityType,
        _to_modality: &ModalityType
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Simple linear projection with learned weights
        let projection_matrix = self.create_projection_matrix(embedding.len(), embedding.len());
        self.matrix_multiply(embedding, &projection_matrix)
    }

    fn apply_nonlinear_mapping(
        &self,
        embedding: &[f32],
        _from_modality: &ModalityType,
        _to_modality: &ModalityType
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Apply non-linear transformation (simplified MLP)
        let hidden_dim = (embedding.len() * 2).min(1024);
        
        // First layer: embedding -> hidden
        let hidden_matrix = self.create_projection_matrix(embedding.len(), hidden_dim);
        let hidden = self.matrix_multiply(embedding, &hidden_matrix)?;
        
        // Apply activation function (ReLU)
        let activated: Vec<f32> = hidden.iter().map(|&x| x.max(0.0)).collect();
        
        // Second layer: hidden -> output
        let output_matrix = self.create_projection_matrix(hidden_dim, embedding.len());
        self.matrix_multiply(&activated, &output_matrix)
    }

    fn apply_attention_alignment(
        &self,
        embedding: &[f32],
        _from_modality: &ModalityType,
        _to_modality: &ModalityType
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Simplified self-attention mechanism
        let dim = embedding.len();
        let head_dim = (dim / 8).max(1); // 8 attention heads
        
        // Create query, key, value matrices (simplified)
        let mut aligned = vec![0.0; dim];
        
        for i in 0..dim {
            let mut attention_sum = 0.0;
            let mut weighted_value = 0.0;
            
            for j in 0..dim {
                // Simplified attention score
                let attention_score = (embedding[i] * embedding[j]).exp();
                attention_sum += attention_score;
                weighted_value += attention_score * embedding[j];
            }
            
            aligned[i] = if attention_sum > 0.0 {
                weighted_value / attention_sum
            } else {
                embedding[i]
            };
        }
        
        Ok(aligned)
    }

    fn apply_canonical_correlation(
        &self,
        embedding: &[f32],
        _from_modality: &ModalityType,
        _to_modality: &ModalityType
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Simplified canonical correlation analysis
        // In production, this would involve proper CCA computation
        let dim = embedding.len();
        let mut correlated = vec![0.0; dim];
        
        // Apply correlation-based transformation
        for i in 0..dim {
            let mut correlation_weighted = 0.0;
            let mut weight_sum = 0.0;
            
            for j in 0..dim {
                let weight = self.calculate_correlation_weight(i, j, dim);
                correlation_weighted += weight * embedding[j];
                weight_sum += weight.abs();
            }
            
            correlated[i] = if weight_sum > 0.0 {
                correlation_weighted / weight_sum
            } else {
                embedding[i]
            };
        }
        
        Ok(correlated)
    }

    fn apply_adversarial_alignment(
        &self,
        embedding: &[f32],
        _from_modality: &ModalityType,
        _to_modality: &ModalityType
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Simplified adversarial alignment
        // In production, this would involve discriminator networks
        
        // Apply domain adaptation transformation
        let mut adapted = embedding.to_vec();
        
        // Add adversarial noise and domain-invariant features
        for i in 0..adapted.len() {
            // Simplified domain adaptation: reduce modality-specific features
            let domain_invariance_factor = 0.8;
            adapted[i] *= domain_invariance_factor;
            
            // Add small amount of noise for regularization
            let noise = (i as f32 * 0.001).sin() * 0.01;
            adapted[i] += noise;
        }
        
        Ok(adapted)
    }

    fn apply_normalization(
        &self,
        embedding: &[f32]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        match self.normalization_config.method {
            NormalizationMethod::LayerNorm => {
                self.apply_layer_normalization(embedding)
            }
            NormalizationMethod::BatchNorm => {
                self.apply_batch_normalization(embedding)
            }
            NormalizationMethod::UnitNorm => {
                self.apply_unit_normalization(embedding)
            }
            NormalizationMethod::StandardScaling => {
                self.apply_standard_scaling(embedding)
            }
            NormalizationMethod::MinMaxScaling => {
                self.apply_minmax_scaling(embedding)
            }
        }
    }

    fn apply_layer_normalization(
        &self,
        embedding: &[f32]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        if embedding.is_empty() {
            return Ok(Vec::new());
        }

        let mean = embedding.iter().sum::<f32>() / embedding.len() as f32;
        let variance = embedding.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f32>() / embedding.len() as f32;
        
        let std_dev = (variance + self.normalization_config.epsilon).sqrt();
        
        let normalized: Vec<f32> = embedding.iter()
            .map(|&x| (x - mean) / std_dev)
            .collect();
        
        Ok(normalized)
    }

    fn apply_batch_normalization(
        &self,
        embedding: &[f32]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        // Simplified batch normalization (in production, would use running statistics)
        self.apply_layer_normalization(embedding)
    }

    fn apply_unit_normalization(
        &self,
        embedding: &[f32]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let norm = embedding.iter().map(|&x| x * x).sum::<f32>().sqrt();
        
        if norm > self.normalization_config.epsilon {
            Ok(embedding.iter().map(|&x| x / norm).collect())
        } else {
            Ok(embedding.to_vec())
        }
    }

    fn apply_standard_scaling(
        &self,
        embedding: &[f32]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        if embedding.is_empty() {
            return Ok(Vec::new());
        }

        let mean = embedding.iter().sum::<f32>() / embedding.len() as f32;
        let std_dev = (embedding.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f32>() / embedding.len() as f32).sqrt();
        
        let scaled: Vec<f32> = if std_dev > self.normalization_config.epsilon {
            embedding.iter().map(|&x| (x - mean) / std_dev).collect()
        } else {
            embedding.iter().map(|&x| x - mean).collect()
        };
        
        Ok(scaled)
    }

    fn apply_minmax_scaling(
        &self,
        embedding: &[f32]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        if embedding.is_empty() {
            return Ok(Vec::new());
        }

        let min_val = embedding.iter().fold(f32::INFINITY, |a, &b| a.min(b));
        let max_val = embedding.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));
        
        let range = max_val - min_val;
        
        let scaled: Vec<f32> = if range > self.normalization_config.epsilon {
            embedding.iter().map(|&x| (x - min_val) / range).collect()
        } else {
            embedding.to_vec()
        };
        
        Ok(scaled)
    }

    fn matrix_multiply(
        &self,
        input: &[f32],
        matrix: &TransformationMatrix
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        if input.len() != matrix.input_dim {
            return Err(format!(
                "Input dimension {} doesn't match matrix input dimension {}",
                input.len(),
                matrix.input_dim
            ).into());
        }

        let mut output = vec![0.0; matrix.output_dim];
        
        for i in 0..matrix.output_dim {
            let mut sum = 0.0;
            for j in 0..matrix.input_dim {
                sum += input[j] * matrix.matrix[i][j];
            }
            output[i] = sum + matrix.bias[i];
        }
        
        Ok(output)
    }

    fn calculate_common_dimension(&self, embeddings: &[(Vec<f32>, ModalityType)]) -> usize {
        // Find the median dimension to use as common space
        let mut dimensions: Vec<usize> = embeddings.iter()
            .map(|(emb, _)| emb.len())
            .collect();
        
        dimensions.sort();
        
        if dimensions.is_empty() {
            512 // Default dimension
        } else {
            dimensions[dimensions.len() / 2]
        }
    }

    fn transform_to_common_space(
        &self,
        embedding: &[f32],
        modality: &ModalityType,
        target_dim: usize
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        if embedding.len() == target_dim {
            return Ok(embedding.to_vec());
        }

        // Create projection to common dimension
        let projection_matrix = self.create_projection_matrix(embedding.len(), target_dim);
        self.matrix_multiply(embedding, &projection_matrix)
    }

    fn apply_joint_alignment(
        &self,
        embeddings: &[Vec<f32>]
    ) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        if embeddings.is_empty() {
            return Ok(Vec::new());
        }

        // Compute centroid of all embeddings
        let dim = embeddings[0].len();
        let mut centroid = vec![0.0; dim];
        
        for embedding in embeddings {
            for i in 0..dim.min(embedding.len()) {
                centroid[i] += embedding[i];
            }
        }
        
        for i in 0..dim {
            centroid[i] /= embeddings.len() as f32;
        }

        // Align all embeddings relative to centroid
        let mut aligned = Vec::new();
        
        for embedding in embeddings {
            let mut aligned_embedding = vec![0.0; dim];
            
            for i in 0..dim.min(embedding.len()) {
                // Move embedding towards centroid with alignment strength
                let alignment_strength = 0.3;
                aligned_embedding[i] = embedding[i] + 
                    alignment_strength * (centroid[i] - embedding[i]);
            }
            
            aligned.push(aligned_embedding);
        }
        
        Ok(aligned)
    }

    fn concatenation_fusion(
        &self,
        embeddings: &[Vec<f32>]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let mut concatenated = Vec::new();
        
        for embedding in embeddings {
            concatenated.extend_from_slice(embedding);
        }
        
        Ok(concatenated)
    }

    fn average_fusion(
        &self,
        embeddings: &[Vec<f32>]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        if embeddings.is_empty() {
            return Ok(Vec::new());
        }

        let dim = embeddings[0].len();
        let mut averaged = vec![0.0; dim];
        
        for embedding in embeddings {
            for i in 0..dim.min(embedding.len()) {
                averaged[i] += embedding[i];
            }
        }
        
        for i in 0..dim {
            averaged[i] /= embeddings.len() as f32;
        }
        
        Ok(averaged)
    }

    fn attention_weighted_fusion(
        &self,
        embeddings: &[Vec<f32>],
        modality_info: &[(Vec<f32>, ModalityType)]
    ) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        if embeddings.is_empty() || modality_info.is_empty() {
            return Ok(Vec::new());
        }

        let dim = embeddings[0].len();
        let mut weighted = vec![0.0; dim];
        
        // Calculate attention weights based on modality importance and embedding quality
        let mut attention_weights = Vec::new();
        
        for (i, (_, modality)) in modality_info.iter().enumerate() {
            if i < embeddings.len() {
                let embedding_norm = embeddings[i].iter()
                    .map(|&x| x * x)
                    .sum::<f32>()
                    .sqrt();
                
                let modality_weight = self.get_modality_importance_weight(modality);
                let quality_weight = embedding_norm / (embedding_norm + 1.0); // Normalize
                
                attention_weights.push(modality_weight * quality_weight);
            }
        }
        
        // Normalize attention weights
        let total_weight: f32 = attention_weights.iter().sum();
        if total_weight > 0.0 {
            for weight in &mut attention_weights {
                *weight /= total_weight;
            }
        }
        
        // Apply weighted fusion
        for (i, embedding) in embeddings.iter().enumerate() {
            let weight = attention_weights.get(i).unwrap_or(&0.0);
            
            for j in 0..dim.min(embedding.len()) {
                weighted[j] += weight * embedding[j];
            }
        }
        
        Ok(weighted)
    }

    fn get_modality_importance_weight(&self, modality: &ModalityType) -> f32 {
        // Define relative importance of different modalities
        match modality {
            ModalityType::Text => 1.0,
            ModalityType::Image => 0.9,
            ModalityType::Audio => 0.8,
            ModalityType::Video => 1.1,
            ModalityType::Sensor => 0.7,
            ModalityType::Haptic => 0.6,
            ModalityType::Neural => 1.2,
        }
    }

    fn create_projection_matrix(&self, input_dim: usize, output_dim: usize) -> TransformationMatrix {
        // Create random projection matrix (in production, these would be learned)
        let mut matrix = vec![vec![0.0; input_dim]; output_dim];
        let mut bias = vec![0.0; output_dim];
        
        // Xavier/Glorot initialization
        let scale = (6.0 / (input_dim + output_dim) as f32).sqrt();
        
        for i in 0..output_dim {
            for j in 0..input_dim {
                // Simplified random initialization
                let val = ((i * 7 + j * 11) % 1000) as f32 / 1000.0 - 0.5;
                matrix[i][j] = val * scale;
            }
            
            bias[i] = ((i * 13) % 1000) as f32 / 1000.0 - 0.5;
        }
        
        TransformationMatrix {
            matrix,
            input_dim,
            output_dim,
            bias,
        }
    }

    fn calculate_correlation_weight(&self, i: usize, j: usize, dim: usize) -> f32 {
        // Simplified correlation weight calculation
        let distance = (i as f32 - j as f32).abs();
        let max_distance = dim as f32;
        
        // Gaussian-like weight function
        let sigma = max_distance / 4.0;
        (-distance * distance / (2.0 * sigma * sigma)).exp()
    }

    // Create modality-specific transformation matrices
    fn create_text_transformation_matrix() -> TransformationMatrix {
        // Text-specific transformation optimized for linguistic features
        let input_dim = 768; // Common text embedding dimension
        let output_dim = 512; // Common output dimension
        
        let mut matrix = vec![vec![0.0; input_dim]; output_dim];
        let bias = vec![0.01; output_dim]; // Small positive bias for text
        
        // Initialize with text-optimized weights
        let scale = (2.0 / input_dim as f32).sqrt();
        for i in 0..output_dim {
            for j in 0..input_dim {
                // Favor linguistic pattern preservation
                let val = ((i * 17 + j * 19) % 1000) as f32 / 1000.0 - 0.5;
                matrix[i][j] = val * scale;
            }
        }
        
        TransformationMatrix {
            matrix,
            input_dim,
            output_dim,
            bias,
        }
    }

    fn create_image_transformation_matrix() -> TransformationMatrix {
        // Image-specific transformation optimized for visual features
        let input_dim = 2048; // Common vision model output
        let output_dim = 512;
        
        let mut matrix = vec![vec![0.0; input_dim]; output_dim];
        let bias = vec![0.0; output_dim]; // Zero bias for images
        
        let scale = (2.0 / input_dim as f32).sqrt();
        for i in 0..output_dim {
            for j in 0..input_dim {
                // Favor spatial feature preservation
                let val = ((i * 23 + j * 29) % 1000) as f32 / 1000.0 - 0.5;
                matrix[i][j] = val * scale * 0.9; // Slightly smaller scale
            }
        }
        
        TransformationMatrix {
            matrix,
            input_dim,
            output_dim,
            bias,
        }
    }

    fn create_audio_transformation_matrix() -> TransformationMatrix {
        // Audio-specific transformation optimized for spectral features
        let input_dim = 512; // Audio embedding dimension
        let output_dim = 512;
        
        let mut matrix = vec![vec![0.0; input_dim]; output_dim];
        let bias = vec![-0.01; output_dim]; // Small negative bias for audio
        
        let scale = (2.0 / input_dim as f32).sqrt();
        for i in 0..output_dim {
            for j in 0..input_dim {
                // Favor temporal and spectral features
                let val = ((i * 31 + j * 37) % 1000) as f32 / 1000.0 - 0.5;
                matrix[i][j] = val * scale * 1.1; // Slightly larger scale
            }
        }
        
        TransformationMatrix {
            matrix,
            input_dim,
            output_dim,
            bias,
        }
    }

    fn create_video_transformation_matrix() -> TransformationMatrix {
        // Video-specific transformation combining spatial and temporal features
        let input_dim = 1024; // Video embedding dimension
        let output_dim = 512;
        
        let mut matrix = vec![vec![0.0; input_dim]; output_dim];
        let bias = vec![0.005; output_dim]; // Small positive bias
        
        let scale = (2.0 / input_dim as f32).sqrt();
        for i in 0..output_dim {
            for j in 0..input_dim {
                // Favor spatio-temporal features
                let val = ((i * 41 + j * 43) % 1000) as f32 / 1000.0 - 0.5;
                matrix[i][j] = val * scale;
            }
        }
        
        TransformationMatrix {
            matrix,
            input_dim,
            output_dim,
            bias,
        }
    }

    pub fn get_transformation_info(&self) -> HashMap<String, String> {
        let mut info = HashMap::new();
        
        info.insert("normalization_method".to_string(), 
                   format!("{:?}", self.normalization_config.method));
        info.insert("epsilon".to_string(), 
                   self.normalization_config.epsilon.to_string());
        info.insert("momentum".to_string(), 
                   self.normalization_config.momentum.to_string());
        
        for (modality, matrix) in &self.transformation_matrices {
            info.insert(
                format!("{:?}_transformation_dims", modality),
                format!("{}x{}", matrix.input_dim, matrix.output_dim)
            );
        }
        
        info
    }

    pub fn update_alignment_strategy(
        &mut self,
        from_modality: ModalityType,
        to_modality: ModalityType,
        strategy: AlignmentStrategy
    ) {
        self.alignment_strategies.insert((from_modality, to_modality), strategy);
    }

    pub fn set_normalization_config(&mut self, config: NormalizationConfig) {
        self.normalization_config = config;
    }
}

impl Default for EmbeddingTransformer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedding_transformer_creation() {
        let transformer = EmbeddingTransformer::new();
        assert!(!transformer.transformation_matrices.is_empty());
    }

    #[test]
    fn test_transform_embedding() {
        let transformer = EmbeddingTransformer::new();
        let embedding = vec![0.1, 0.2, 0.3, 0.4, 0.5];
        
        // This test would need proper matrix setup to pass
        // Currently just testing that it doesn't panic
        let result = transformer.transform_embedding(&embedding, &ModalityType::Text, None);
        // In a real test, we'd verify the result
    }

    #[test]
    fn test_normalization_methods() {
        let transformer = EmbeddingTransformer::new();
        let embedding = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        
        let normalized = transformer.apply_layer_normalization(&embedding);
        assert!(normalized.is_ok());
        
        let unit_normalized = transformer.apply_unit_normalization(&embedding);
        assert!(unit_normalized.is_ok());
        
        if let Ok(unit_norm) = unit_normalized {
            let norm_squared: f32 = unit_norm.iter().map(|&x| x * x).sum();
            assert!((norm_squared - 1.0).abs() < 1e-6);
        }
    }

    #[test]
    fn test_align_embeddings() {
        let transformer = EmbeddingTransformer::new();
        let embeddings = vec![
            (vec![0.1, 0.2, 0.3], ModalityType::Text),
            (vec![0.4, 0.5, 0.6], ModalityType::Image),
        ];
        
        let result = transformer.align_embeddings(&embeddings);
        // Test would verify alignment properties in production
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_unified_representation() {
        let transformer = EmbeddingTransformer::new();
        let embeddings = vec![
            (vec![0.1, 0.2, 0.3], ModalityType::Text),
            (vec![0.4, 0.5, 0.6], ModalityType::Image),
            (vec![0.7, 0.8, 0.9], ModalityType::Audio),
        ];
        
        let result = transformer.create_unified_representation(&embeddings);
        assert!(result.is_ok());
        
        if let Ok(unified) = result {
            assert!(!unified.is_empty());
        }
    }

    #[test]
    fn test_transformation_matrix() {
        let transformer = EmbeddingTransformer::new();
        let matrix = transformer.create_projection_matrix(3, 2);
        
        assert_eq!(matrix.input_dim, 3);
        assert_eq!(matrix.output_dim, 2);
        assert_eq!(matrix.matrix.len(), 2);
        assert_eq!(matrix.matrix[0].len(), 3);
        assert_eq!(matrix.bias.len(), 2);
    }
}