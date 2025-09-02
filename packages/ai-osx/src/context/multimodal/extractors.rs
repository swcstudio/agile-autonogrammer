use super::*;
use std::collections::HashMap;
use serde_json::Value;

pub struct FeatureExtractor;

impl FeatureExtractor {
    pub fn extract_text_features(text: &str) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Basic linguistic features
        let words: Vec<&str> = text.split_whitespace().collect();
        let sentences = text.split('.').filter(|s| !s.trim().is_empty()).count();
        let characters = text.len();
        
        features.insert("word_count".to_string(), words.len() as f32);
        features.insert("sentence_count".to_string(), sentences as f32);
        features.insert("character_count".to_string(), characters as f32);
        features.insert("avg_word_length".to_string(), 
            if !words.is_empty() { 
                characters as f32 / words.len() as f32 
            } else { 
                0.0 
            }
        );

        // Lexical diversity
        let unique_words: std::collections::HashSet<_> = 
            words.iter().map(|w| w.to_lowercase()).collect();
        let lexical_diversity = if !words.is_empty() {
            unique_words.len() as f32 / words.len() as f32
        } else {
            0.0
        };
        features.insert("lexical_diversity".to_string(), lexical_diversity);

        // Readability metrics (simplified Flesch-Kincaid)
        let avg_sentence_length = if sentences > 0 {
            words.len() as f32 / sentences as f32
        } else {
            0.0
        };
        
        let syllable_count = Self::estimate_syllables(&words);
        let avg_syllables_per_word = if !words.is_empty() {
            syllable_count as f32 / words.len() as f32
        } else {
            0.0
        };
        
        let flesch_score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables_per_word);
        features.insert("readability_score".to_string(), flesch_score);

        // Sentiment features
        let sentiment_scores = Self::analyze_sentiment(&words);
        features.extend(sentiment_scores);

        // Part of speech estimation
        let pos_features = Self::estimate_pos_distribution(&words);
        features.extend(pos_features);

        // Named entity estimation
        let ne_features = Self::estimate_named_entities(&text);
        features.extend(ne_features);

        features
    }

    pub fn extract_image_features(image_data: &[u8]) -> Result<HashMap<String, f32>, Box<dyn std::error::Error>> {
        let mut features = HashMap::new();
        
        // Load image
        let image = image::load_from_memory(image_data)?;
        let rgb_image = image.to_rgb8();
        let (width, height) = rgb_image.dimensions();
        
        // Basic image properties
        features.insert("width".to_string(), width as f32);
        features.insert("height".to_string(), height as f32);
        features.insert("aspect_ratio".to_string(), width as f32 / height as f32);
        features.insert("total_pixels".to_string(), (width * height) as f32);

        // Color statistics
        let color_stats = Self::analyze_color_distribution(&rgb_image);
        features.extend(color_stats);

        // Texture features
        let texture_features = Self::analyze_texture(&rgb_image);
        features.extend(texture_features);

        // Edge and contour features
        let edge_features = Self::analyze_edges(&rgb_image);
        features.extend(edge_features);

        // Spatial frequency analysis
        let frequency_features = Self::analyze_spatial_frequency(&rgb_image);
        features.extend(frequency_features);

        // Symmetry analysis
        let symmetry_features = Self::analyze_symmetry(&rgb_image);
        features.extend(symmetry_features);

        Ok(features)
    }

    pub fn extract_audio_features(audio_data: &[u8]) -> Result<HashMap<String, f32>, Box<dyn std::error::Error>> {
        let mut features = HashMap::new();
        
        // Convert bytes to audio samples (simplified - assumes 16-bit PCM)
        let samples: Vec<f32> = audio_data
            .chunks_exact(2)
            .map(|chunk| {
                let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
                sample as f32 / i16::MAX as f32
            })
            .collect();

        if samples.is_empty() {
            return Ok(features);
        }

        // Time domain features
        let time_features = Self::analyze_time_domain(&samples);
        features.extend(time_features);

        // Frequency domain features
        let freq_features = Self::analyze_frequency_domain(&samples);
        features.extend(freq_features);

        // Spectral features
        let spectral_features = Self::analyze_spectral_properties(&samples);
        features.extend(spectral_features);

        // Rhythm and tempo features
        let rhythm_features = Self::analyze_rhythm(&samples);
        features.extend(rhythm_features);

        // Harmonic features
        let harmonic_features = Self::analyze_harmonics(&samples);
        features.extend(harmonic_features);

        Ok(features)
    }

    pub fn extract_video_features(video_data: &[u8]) -> Result<HashMap<String, f32>, Box<dyn std::error::Error>> {
        let mut features = HashMap::new();
        
        // Basic video properties (estimated)
        features.insert("file_size".to_string(), video_data.len() as f32);
        
        // Estimate basic video properties from data
        let data_analysis = Self::analyze_video_data_patterns(video_data);
        features.extend(data_analysis);

        // Motion analysis (simplified)
        let motion_features = Self::estimate_motion_from_data(video_data);
        features.extend(motion_features);

        // Scene complexity estimation
        let complexity_features = Self::estimate_scene_complexity(video_data);
        features.extend(complexity_features);

        // Temporal features
        let temporal_features = Self::analyze_temporal_patterns(video_data);
        features.extend(temporal_features);

        Ok(features)
    }

    // Text analysis helper methods
    fn estimate_syllables(words: &[&str]) -> usize {
        words.iter()
            .map(|word| {
                let word = word.to_lowercase();
                let vowels = "aeiouy";
                let mut syllable_count = 0;
                let mut prev_was_vowel = false;
                
                for ch in word.chars() {
                    let is_vowel = vowels.contains(ch);
                    if is_vowel && !prev_was_vowel {
                        syllable_count += 1;
                    }
                    prev_was_vowel = is_vowel;
                }
                
                // Handle silent e
                if word.ends_with('e') && syllable_count > 1 {
                    syllable_count -= 1;
                }
                
                syllable_count.max(1)
            })
            .sum()
    }

    fn analyze_sentiment(words: &[&str]) -> HashMap<String, f32> {
        let positive_words = [
            "good", "great", "excellent", "amazing", "wonderful", "fantastic",
            "love", "best", "perfect", "awesome", "brilliant", "outstanding",
            "beautiful", "incredible", "superb", "magnificent", "remarkable"
        ];
        
        let negative_words = [
            "bad", "terrible", "awful", "horrible", "disappointing", "worst",
            "hate", "disgusting", "pathetic", "useless", "boring", "stupid",
            "ugly", "annoying", "frustrating", "painful", "sad", "angry"
        ];

        let positive_count = words.iter()
            .filter(|word| positive_words.contains(&word.to_lowercase().as_str()))
            .count() as f32;
        
        let negative_count = words.iter()
            .filter(|word| negative_words.contains(&word.to_lowercase().as_str()))
            .count() as f32;

        let total_words = words.len() as f32;
        
        let mut sentiment_features = HashMap::new();
        sentiment_features.insert("positive_word_ratio".to_string(), 
            if total_words > 0.0 { positive_count / total_words } else { 0.0 });
        sentiment_features.insert("negative_word_ratio".to_string(), 
            if total_words > 0.0 { negative_count / total_words } else { 0.0 });
        sentiment_features.insert("sentiment_polarity".to_string(), 
            positive_count - negative_count);
        sentiment_features.insert("sentiment_subjectivity".to_string(), 
            if total_words > 0.0 { (positive_count + negative_count) / total_words } else { 0.0 });

        sentiment_features
    }

    fn estimate_pos_distribution(words: &[&str]) -> HashMap<String, f32> {
        let mut pos_counts = HashMap::new();
        pos_counts.insert("noun_ratio".to_string(), 0.0);
        pos_counts.insert("verb_ratio".to_string(), 0.0);
        pos_counts.insert("adjective_ratio".to_string(), 0.0);
        pos_counts.insert("adverb_ratio".to_string(), 0.0);

        // Simple heuristics for POS tagging
        let common_nouns = ["person", "people", "time", "way", "day", "man", "thing", "woman", "life", "child", "world", "school", "state", "family", "student", "group", "country", "problem", "hand", "part", "place", "case", "week", "company", "system", "program", "question", "work", "government", "number", "night", "point", "home", "water", "room", "mother", "area", "money", "story", "fact", "month", "lot", "right", "study", "book", "eye", "job", "word", "business", "issue", "side", "kind", "head", "house", "service", "friend", "father", "power", "hour", "game", "line", "end", "member", "law", "car", "city", "community", "name", "president", "team", "minute", "idea", "kid", "body", "information", "back", "parent", "face", "others", "level", "office", "door", "health", "person", "art", "war", "history", "party", "within", "result", "change", "morning", "reason", "research", "girl", "guy", "moment", "air", "teacher", "force", "education"];
        
        let common_verbs = ["be", "have", "do", "say", "get", "make", "go", "know", "take", "see", "come", "think", "look", "want", "give", "use", "find", "tell", "ask", "work", "seem", "feel", "try", "leave", "call", "need", "become", "would", "could", "should", "might", "must", "will", "can", "may", "shall", "ought", "dare", "used", "going", "being", "having", "doing", "saying", "getting", "making", "knowing", "taking", "seeing", "coming", "thinking", "looking", "wanting", "giving", "using", "finding", "telling", "asking", "working", "seeming", "feeling", "trying", "leaving", "calling", "needing", "becoming"];
        
        let common_adjectives = ["good", "new", "first", "last", "long", "great", "little", "own", "other", "old", "right", "big", "high", "different", "small", "large", "next", "early", "young", "important", "few", "public", "bad", "same", "able", "human", "local", "sure", "without", "common", "poor", "possible", "social", "only", "national", "black", "white", "far", "hard", "open", "red", "easy", "strong", "real", "best", "left", "short", "clear", "hot", "cold", "nice", "beautiful", "happy", "sad", "angry", "tired", "hungry", "thirsty", "full", "empty", "clean", "dirty", "safe", "dangerous", "fast", "slow", "cheap", "expensive"];

        let total_words = words.len() as f32;
        if total_words == 0.0 {
            return pos_counts;
        }

        let noun_count = words.iter()
            .filter(|word| common_nouns.contains(&word.to_lowercase().as_str()))
            .count() as f32;
        
        let verb_count = words.iter()
            .filter(|word| common_verbs.contains(&word.to_lowercase().as_str()))
            .count() as f32;
        
        let adj_count = words.iter()
            .filter(|word| common_adjectives.contains(&word.to_lowercase().as_str()))
            .count() as f32;

        let adv_count = words.iter()
            .filter(|word| word.ends_with("ly"))
            .count() as f32;

        pos_counts.insert("noun_ratio".to_string(), noun_count / total_words);
        pos_counts.insert("verb_ratio".to_string(), verb_count / total_words);
        pos_counts.insert("adjective_ratio".to_string(), adj_count / total_words);
        pos_counts.insert("adverb_ratio".to_string(), adv_count / total_words);

        pos_counts
    }

    fn estimate_named_entities(text: &str) -> HashMap<String, f32> {
        let mut ne_features = HashMap::new();
        
        // Simple patterns for named entity recognition
        let capitalized_words = text.split_whitespace()
            .filter(|word| word.chars().next().map_or(false, |c| c.is_uppercase()))
            .count() as f32;
        
        let email_pattern = regex::Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap();
        let url_pattern = regex::Regex::new(r"https?://[^\s]+").unwrap();
        let phone_pattern = regex::Regex::new(r"\b\d{3}-\d{3}-\d{4}\b").unwrap();
        let date_pattern = regex::Regex::new(r"\b\d{1,2}/\d{1,2}/\d{4}\b").unwrap();

        ne_features.insert("capitalized_words".to_string(), capitalized_words);
        ne_features.insert("email_count".to_string(), email_pattern.find_iter(text).count() as f32);
        ne_features.insert("url_count".to_string(), url_pattern.find_iter(text).count() as f32);
        ne_features.insert("phone_count".to_string(), phone_pattern.find_iter(text).count() as f32);
        ne_features.insert("date_count".to_string(), date_pattern.find_iter(text).count() as f32);

        ne_features
    }

    // Image analysis helper methods
    fn analyze_color_distribution(image: &image::RgbImage) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        let (width, height) = image.dimensions();
        let total_pixels = (width * height) as f64;

        let mut r_sum = 0u64;
        let mut g_sum = 0u64;
        let mut b_sum = 0u64;
        let mut r_squared_sum = 0u64;
        let mut g_squared_sum = 0u64;
        let mut b_squared_sum = 0u64;

        for pixel in image.pixels() {
            r_sum += pixel[0] as u64;
            g_sum += pixel[1] as u64;
            b_sum += pixel[2] as u64;
            r_squared_sum += (pixel[0] as u64) * (pixel[0] as u64);
            g_squared_sum += (pixel[1] as u64) * (pixel[1] as u64);
            b_squared_sum += (pixel[2] as u64) * (pixel[2] as u64);
        }

        // Color means
        let r_mean = r_sum as f32 / total_pixels as f32;
        let g_mean = g_sum as f32 / total_pixels as f32;
        let b_mean = b_sum as f32 / total_pixels as f32;

        // Color variances
        let r_variance = (r_squared_sum as f32 / total_pixels as f32) - (r_mean * r_mean);
        let g_variance = (g_squared_sum as f32 / total_pixels as f32) - (g_mean * g_mean);
        let b_variance = (b_squared_sum as f32 / total_pixels as f32) - (b_mean * b_mean);

        features.insert("red_mean".to_string(), r_mean);
        features.insert("green_mean".to_string(), g_mean);
        features.insert("blue_mean".to_string(), b_mean);
        features.insert("red_variance".to_string(), r_variance);
        features.insert("green_variance".to_string(), g_variance);
        features.insert("blue_variance".to_string(), b_variance);

        // Overall brightness and saturation
        let brightness = (r_mean + g_mean + b_mean) / 3.0;
        let saturation = ((r_mean - g_mean).abs() + (g_mean - b_mean).abs() + (b_mean - r_mean).abs()) / 3.0;

        features.insert("brightness".to_string(), brightness);
        features.insert("saturation".to_string(), saturation);

        // Color histogram entropy
        let mut histogram = vec![vec![vec![0u32; 8]; 8]; 8];
        for pixel in image.pixels() {
            let r_bin = (pixel[0] / 32) as usize;
            let g_bin = (pixel[1] / 32) as usize;
            let b_bin = (pixel[2] / 32) as usize;
            histogram[r_bin][g_bin][b_bin] += 1;
        }

        let mut entropy = 0.0;
        for r in 0..8 {
            for g in 0..8 {
                for b in 0..8 {
                    if histogram[r][g][b] > 0 {
                        let p = histogram[r][g][b] as f32 / total_pixels as f32;
                        entropy -= p * p.log2();
                    }
                }
            }
        }

        features.insert("color_entropy".to_string(), entropy);

        features
    }

    fn analyze_texture(image: &image::RgbImage) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        let (width, height) = image.dimensions();

        // Convert to grayscale for texture analysis
        let gray_pixels: Vec<f32> = image.pixels()
            .map(|pixel| (pixel[0] as f32 + pixel[1] as f32 + pixel[2] as f32) / 3.0)
            .collect();

        // Local Binary Pattern approximation
        let mut lbp_histogram = vec![0u32; 256];
        for y in 1..height-1 {
            for x in 1..width-1 {
                let center_idx = (y * width + x) as usize;
                let center_val = gray_pixels[center_idx];
                
                let mut lbp_code = 0u8;
                let neighbors = [
                    (x-1, y-1), (x, y-1), (x+1, y-1),
                    (x+1, y),             (x+1, y+1),
                    (x, y+1), (x-1, y+1), (x-1, y)
                ];
                
                for (i, (nx, ny)) in neighbors.iter().enumerate() {
                    let neighbor_idx = (ny * width + nx) as usize;
                    if gray_pixels[neighbor_idx] >= center_val {
                        lbp_code |= 1 << i;
                    }
                }
                
                lbp_histogram[lbp_code as usize] += 1;
            }
        }

        // Calculate texture features from LBP histogram
        let total_patterns = lbp_histogram.iter().sum::<u32>() as f32;
        let mut texture_uniformity = 0.0;
        let mut texture_entropy = 0.0;

        for &count in &lbp_histogram {
            if count > 0 {
                let p = count as f32 / total_patterns;
                texture_uniformity += p * p;
                texture_entropy -= p * p.log2();
            }
        }

        features.insert("texture_uniformity".to_string(), texture_uniformity);
        features.insert("texture_entropy".to_string(), texture_entropy);

        // Contrast and energy from co-occurrence matrix approximation
        let mut contrast = 0.0;
        let mut energy = 0.0;
        let mut count = 0;

        for y in 0..height-1 {
            for x in 0..width-1 {
                let current_idx = (y * width + x) as usize;
                let right_idx = (y * width + x + 1) as usize;
                let bottom_idx = ((y + 1) * width + x) as usize;
                
                let current_val = gray_pixels[current_idx];
                let right_val = gray_pixels[right_idx];
                let bottom_val = gray_pixels[bottom_idx];
                
                contrast += (current_val - right_val).abs() + (current_val - bottom_val).abs();
                energy += current_val * current_val;
                count += 2;
            }
        }

        features.insert("texture_contrast".to_string(), contrast / count as f32);
        features.insert("texture_energy".to_string(), energy / (width * height) as f32);

        features
    }

    fn analyze_edges(image: &image::RgbImage) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        let (width, height) = image.dimensions();

        // Convert to grayscale
        let gray_pixels: Vec<f32> = image.pixels()
            .map(|pixel| (pixel[0] as f32 + pixel[1] as f32 + pixel[2] as f32) / 3.0)
            .collect();

        // Sobel edge detection
        let mut edge_magnitude_sum = 0.0;
        let mut edge_count = 0;

        for y in 1..height-1 {
            for x in 1..width-1 {
                // Sobel X kernel
                let gx = 
                    -1.0 * gray_pixels[((y-1) * width + (x-1)) as usize] +
                    -2.0 * gray_pixels[(y * width + (x-1)) as usize] +
                    -1.0 * gray_pixels[((y+1) * width + (x-1)) as usize] +
                    1.0 * gray_pixels[((y-1) * width + (x+1)) as usize] +
                    2.0 * gray_pixels[(y * width + (x+1)) as usize] +
                    1.0 * gray_pixels[((y+1) * width + (x+1)) as usize];

                // Sobel Y kernel
                let gy = 
                    -1.0 * gray_pixels[((y-1) * width + (x-1)) as usize] +
                    -2.0 * gray_pixels[((y-1) * width + x) as usize] +
                    -1.0 * gray_pixels[((y-1) * width + (x+1)) as usize] +
                    1.0 * gray_pixels[((y+1) * width + (x-1)) as usize] +
                    2.0 * gray_pixels[((y+1) * width + x) as usize] +
                    1.0 * gray_pixels[((y+1) * width + (x+1)) as usize];

                let magnitude = (gx * gx + gy * gy).sqrt();
                edge_magnitude_sum += magnitude;
                edge_count += 1;
            }
        }

        let average_edge_strength = if edge_count > 0 {
            edge_magnitude_sum / edge_count as f32
        } else {
            0.0
        };

        features.insert("edge_density".to_string(), average_edge_strength);
        features.insert("edge_strength".to_string(), edge_magnitude_sum);

        features
    }

    fn analyze_spatial_frequency(image: &image::RgbImage) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        let (width, height) = image.dimensions();

        // Convert to grayscale
        let gray_pixels: Vec<f32> = image.pixels()
            .map(|pixel| (pixel[0] as f32 + pixel[1] as f32 + pixel[2] as f32) / 3.0)
            .collect();

        // Calculate spatial frequency in horizontal and vertical directions
        let mut horizontal_freq = 0.0;
        let mut vertical_freq = 0.0;

        // Horizontal spatial frequency
        for y in 0..height {
            for x in 1..width {
                let current_idx = (y * width + x) as usize;
                let prev_idx = (y * width + (x - 1)) as usize;
                horizontal_freq += (gray_pixels[current_idx] - gray_pixels[prev_idx]).abs();
            }
        }

        // Vertical spatial frequency
        for y in 1..height {
            for x in 0..width {
                let current_idx = (y * width + x) as usize;
                let above_idx = ((y - 1) * width + x) as usize;
                vertical_freq += (gray_pixels[current_idx] - gray_pixels[above_idx]).abs();
            }
        }

        let total_horizontal_comparisons = (width - 1) * height;
        let total_vertical_comparisons = width * (height - 1);

        features.insert("horizontal_spatial_freq".to_string(), 
            horizontal_freq / total_horizontal_comparisons as f32);
        features.insert("vertical_spatial_freq".to_string(), 
            vertical_freq / total_vertical_comparisons as f32);
        features.insert("total_spatial_freq".to_string(), 
            (horizontal_freq + vertical_freq) / (total_horizontal_comparisons + total_vertical_comparisons) as f32);

        features
    }

    fn analyze_symmetry(image: &image::RgbImage) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        let (width, height) = image.dimensions();

        // Horizontal symmetry (left-right)
        let mut horizontal_symmetry_error = 0.0;
        let mut h_comparisons = 0;

        for y in 0..height {
            for x in 0..width/2 {
                let left_pixel = image.get_pixel(x, y);
                let right_pixel = image.get_pixel(width - 1 - x, y);
                
                let error = ((left_pixel[0] as i32 - right_pixel[0] as i32).abs() +
                           (left_pixel[1] as i32 - right_pixel[1] as i32).abs() +
                           (left_pixel[2] as i32 - right_pixel[2] as i32).abs()) as f32 / 3.0;
                
                horizontal_symmetry_error += error;
                h_comparisons += 1;
            }
        }

        // Vertical symmetry (top-bottom)
        let mut vertical_symmetry_error = 0.0;
        let mut v_comparisons = 0;

        for y in 0..height/2 {
            for x in 0..width {
                let top_pixel = image.get_pixel(x, y);
                let bottom_pixel = image.get_pixel(x, height - 1 - y);
                
                let error = ((top_pixel[0] as i32 - bottom_pixel[0] as i32).abs() +
                           (top_pixel[1] as i32 - bottom_pixel[1] as i32).abs() +
                           (top_pixel[2] as i32 - bottom_pixel[2] as i32).abs()) as f32 / 3.0;
                
                vertical_symmetry_error += error;
                v_comparisons += 1;
            }
        }

        let horizontal_symmetry = if h_comparisons > 0 {
            1.0 - (horizontal_symmetry_error / h_comparisons as f32) / 255.0
        } else {
            0.0
        };

        let vertical_symmetry = if v_comparisons > 0 {
            1.0 - (vertical_symmetry_error / v_comparisons as f32) / 255.0
        } else {
            0.0
        };

        features.insert("horizontal_symmetry".to_string(), horizontal_symmetry.max(0.0));
        features.insert("vertical_symmetry".to_string(), vertical_symmetry.max(0.0));
        features.insert("overall_symmetry".to_string(), (horizontal_symmetry + vertical_symmetry) / 2.0);

        features
    }

    // Audio analysis helper methods
    fn analyze_time_domain(samples: &[f32]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        if samples.is_empty() {
            return features;
        }

        // Basic time domain statistics
        let mean = samples.iter().sum::<f32>() / samples.len() as f32;
        let variance = samples.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f32>() / samples.len() as f32;
        let std_dev = variance.sqrt();

        // RMS (Root Mean Square)
        let rms = (samples.iter().map(|&x| x * x).sum::<f32>() / samples.len() as f32).sqrt();

        // Zero crossing rate
        let zero_crossings = samples.windows(2)
            .filter(|window| (window[0] > 0.0) != (window[1] > 0.0))
            .count();
        let zero_crossing_rate = zero_crossings as f32 / samples.len() as f32;

        // Peak detection
        let max_amplitude = samples.iter().map(|&x| x.abs()).fold(0.0, f32::max);
        let min_amplitude = samples.iter().map(|&x| x.abs()).fold(f32::INFINITY, f32::min);

        features.insert("mean_amplitude".to_string(), mean);
        features.insert("amplitude_variance".to_string(), variance);
        features.insert("amplitude_std_dev".to_string(), std_dev);
        features.insert("rms_amplitude".to_string(), rms);
        features.insert("zero_crossing_rate".to_string(), zero_crossing_rate);
        features.insert("max_amplitude".to_string(), max_amplitude);
        features.insert("min_amplitude".to_string(), min_amplitude);
        features.insert("dynamic_range".to_string(), max_amplitude - min_amplitude);

        features
    }

    fn analyze_frequency_domain(samples: &[f32]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Simplified frequency analysis (in production, use FFT)
        let sample_rate = 44100.0; // Assume standard sample rate
        let nyquist_freq = sample_rate / 2.0;
        
        // Estimate frequency content using autocorrelation
        let mut autocorr_peaks = Vec::new();
        let max_lag = samples.len().min(1000); // Limit for performance
        
        for lag in 1..max_lag {
            let mut correlation = 0.0;
            let valid_samples = samples.len() - lag;
            
            for i in 0..valid_samples {
                correlation += samples[i] * samples[i + lag];
            }
            
            correlation /= valid_samples as f32;
            autocorr_peaks.push(correlation);
        }

        // Find dominant frequency (simplified)
        if let Some((max_lag, _)) = autocorr_peaks.iter().enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal)) {
            let dominant_freq = sample_rate / (max_lag + 1) as f32;
            features.insert("dominant_frequency".to_string(), dominant_freq);
        } else {
            features.insert("dominant_frequency".to_string(), 0.0);
        }

        // Frequency band energy estimation
        let low_freq_energy = autocorr_peaks.iter().skip(100).take(50).sum::<f32>();
        let mid_freq_energy = autocorr_peaks.iter().skip(50).take(50).sum::<f32>();
        let high_freq_energy = autocorr_peaks.iter().take(50).sum::<f32>();
        
        let total_energy = low_freq_energy + mid_freq_energy + high_freq_energy;
        
        if total_energy > 0.0 {
            features.insert("low_freq_ratio".to_string(), low_freq_energy / total_energy);
            features.insert("mid_freq_ratio".to_string(), mid_freq_energy / total_energy);
            features.insert("high_freq_ratio".to_string(), high_freq_energy / total_energy);
        } else {
            features.insert("low_freq_ratio".to_string(), 0.0);
            features.insert("mid_freq_ratio".to_string(), 0.0);
            features.insert("high_freq_ratio".to_string(), 0.0);
        }

        features.insert("spectral_energy".to_string(), total_energy);

        features
    }

    fn analyze_spectral_properties(samples: &[f32]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Spectral centroid (center of mass of spectrum)
        let window_size = 1024.min(samples.len());
        let mut spectral_centroid = 0.0;
        let mut spectral_spread = 0.0;
        let mut spectral_skewness = 0.0;
        let mut spectral_kurtosis = 0.0;

        if window_size > 0 {
            // Simplified spectral analysis using windowed samples
            let mut weighted_freq_sum = 0.0;
            let mut magnitude_sum = 0.0;
            
            for i in 0..window_size {
                let magnitude = samples[i].abs();
                let frequency = i as f32;
                
                weighted_freq_sum += frequency * magnitude;
                magnitude_sum += magnitude;
            }
            
            if magnitude_sum > 0.0 {
                spectral_centroid = weighted_freq_sum / magnitude_sum;
                
                // Calculate spectral spread (variance)
                let mut variance_sum = 0.0;
                for i in 0..window_size {
                    let magnitude = samples[i].abs();
                    let frequency = i as f32;
                    variance_sum += magnitude * (frequency - spectral_centroid).powi(2);
                }
                spectral_spread = (variance_sum / magnitude_sum).sqrt();
            }
        }

        features.insert("spectral_centroid".to_string(), spectral_centroid);
        features.insert("spectral_spread".to_string(), spectral_spread);
        features.insert("spectral_skewness".to_string(), spectral_skewness);
        features.insert("spectral_kurtosis".to_string(), spectral_kurtosis);

        // Spectral rolloff (frequency below which 85% of energy is contained)
        let mut cumulative_energy = 0.0;
        let total_energy = samples.iter().map(|&x| x * x).sum::<f32>();
        let rolloff_threshold = 0.85 * total_energy;
        let mut rolloff_freq = 0.0;

        for (i, &sample) in samples.iter().enumerate() {
            cumulative_energy += sample * sample;
            if cumulative_energy >= rolloff_threshold {
                rolloff_freq = i as f32;
                break;
            }
        }

        features.insert("spectral_rolloff".to_string(), rolloff_freq);

        features
    }

    fn analyze_rhythm(samples: &[f32]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Onset detection using energy-based method
        let window_size = 1024;
        let hop_size = 512;
        let mut energy_windows = Vec::new();
        
        for i in (0..samples.len()).step_by(hop_size) {
            let end = (i + window_size).min(samples.len());
            let window_energy: f32 = samples[i..end]
                .iter()
                .map(|&x| x * x)
                .sum();
            energy_windows.push(window_energy);
        }

        // Detect energy peaks (simplified onset detection)
        let mut onset_times = Vec::new();
        for i in 1..energy_windows.len()-1 {
            if energy_windows[i] > energy_windows[i-1] && 
               energy_windows[i] > energy_windows[i+1] &&
               energy_windows[i] > 0.01 { // Threshold
                onset_times.push(i as f32 * hop_size as f32 / 44100.0); // Convert to seconds
            }
        }

        // Calculate tempo from onset intervals
        if onset_times.len() > 1 {
            let mut intervals = Vec::new();
            for i in 1..onset_times.len() {
                intervals.push(onset_times[i] - onset_times[i-1]);
            }
            
            let mean_interval = intervals.iter().sum::<f32>() / intervals.len() as f32;
            let tempo_bpm = if mean_interval > 0.0 {
                60.0 / mean_interval
            } else {
                0.0
            };
            
            // Calculate tempo stability (coefficient of variation)
            let interval_variance = intervals.iter()
                .map(|&x| (x - mean_interval).powi(2))
                .sum::<f32>() / intervals.len() as f32;
            let tempo_stability = if mean_interval > 0.0 {
                1.0 - (interval_variance.sqrt() / mean_interval)
            } else {
                0.0
            };
            
            features.insert("estimated_tempo_bpm".to_string(), tempo_bpm);
            features.insert("tempo_stability".to_string(), tempo_stability.max(0.0));
            features.insert("onset_density".to_string(), onset_times.len() as f32 / (samples.len() as f32 / 44100.0));
        } else {
            features.insert("estimated_tempo_bpm".to_string(), 0.0);
            features.insert("tempo_stability".to_string(), 0.0);
            features.insert("onset_density".to_string(), 0.0);
        }

        features
    }

    fn analyze_harmonics(samples: &[f32]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Simplified harmonic analysis
        // In production, this would use proper pitch detection and harmonic analysis
        
        // Estimate fundamental frequency using autocorrelation
        let max_lag = samples.len().min(2000);
        let mut best_correlation = 0.0;
        let mut best_period = 0;
        
        for period in 50..max_lag { // Assume fundamental frequency between ~22Hz and ~880Hz
            let mut correlation = 0.0;
            let valid_samples = samples.len() - period;
            
            for i in 0..valid_samples {
                correlation += samples[i] * samples[i + period];
            }
            
            correlation /= valid_samples as f32;
            
            if correlation > best_correlation {
                best_correlation = correlation;
                best_period = period;
            }
        }
        
        let fundamental_freq = if best_period > 0 {
            44100.0 / best_period as f32
        } else {
            0.0
        };
        
        features.insert("fundamental_frequency".to_string(), fundamental_freq);
        features.insert("harmonic_strength".to_string(), best_correlation);
        
        // Estimate harmonicity (how harmonic the signal is)
        let harmonicity = if fundamental_freq > 0.0 && best_correlation > 0.1 {
            best_correlation
        } else {
            0.0
        };
        
        features.insert("harmonicity".to_string(), harmonicity);
        
        // Inharmonicity (deviation from perfect harmonics)
        let inharmonicity = 1.0 - harmonicity;
        features.insert("inharmonicity".to_string(), inharmonicity);

        features
    }

    // Video analysis helper methods
    fn analyze_video_data_patterns(video_data: &[u8]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Basic data analysis
        if video_data.is_empty() {
            return features;
        }

        // Byte value distribution analysis
        let mut histogram = vec![0u32; 256];
        for &byte in video_data.iter().take(10000) { // Sample first 10k bytes for performance
            histogram[byte as usize] += 1;
        }

        // Calculate entropy of byte distribution
        let total_bytes = histogram.iter().sum::<u32>() as f32;
        let mut entropy = 0.0;
        for &count in &histogram {
            if count > 0 {
                let p = count as f32 / total_bytes;
                entropy -= p * p.log2();
            }
        }
        
        features.insert("data_entropy".to_string(), entropy / 8.0); // Normalize
        
        // Estimate compression ratio
        let unique_bytes = histogram.iter().filter(|&&x| x > 0).count();
        features.insert("byte_diversity".to_string(), unique_bytes as f32 / 256.0);
        
        // Estimate frame boundaries (simplified)
        let chunk_size = video_data.len() / 100; // Divide into 100 chunks
        let mut chunk_entropies = Vec::new();
        
        for chunk in video_data.chunks(chunk_size) {
            let mut chunk_hist = vec![0u32; 256];
            for &byte in chunk {
                chunk_hist[byte as usize] += 1;
            }
            
            let chunk_total = chunk_hist.iter().sum::<u32>() as f32;
            let mut chunk_entropy = 0.0;
            for &count in &chunk_hist {
                if count > 0 {
                    let p = count as f32 / chunk_total;
                    chunk_entropy -= p * p.log2();
                }
            }
            chunk_entropies.push(chunk_entropy);
        }
        
        // Variance in chunk entropies indicates scene changes
        if !chunk_entropies.is_empty() {
            let mean_entropy = chunk_entropies.iter().sum::<f32>() / chunk_entropies.len() as f32;
            let entropy_variance = chunk_entropies.iter()
                .map(|&x| (x - mean_entropy).powi(2))
                .sum::<f32>() / chunk_entropies.len() as f32;
            
            features.insert("scene_change_indicator".to_string(), entropy_variance);
        }

        features
    }

    fn estimate_motion_from_data(video_data: &[u8]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Motion estimation based on data variation patterns
        let window_size = 1000.min(video_data.len());
        let mut motion_indicators = Vec::new();
        
        for window in video_data.chunks(window_size) {
            // Calculate variation within window
            let mean = window.iter().map(|&b| b as f32).sum::<f32>() / window.len() as f32;
            let variance = window.iter()
                .map(|&b| (b as f32 - mean).powi(2))
                .sum::<f32>() / window.len() as f32;
            
            motion_indicators.push(variance);
        }
        
        if !motion_indicators.is_empty() {
            let mean_motion = motion_indicators.iter().sum::<f32>() / motion_indicators.len() as f32;
            let motion_variance = motion_indicators.iter()
                .map(|&x| (x - mean_motion).powi(2))
                .sum::<f32>() / motion_indicators.len() as f32;
            
            features.insert("motion_intensity".to_string(), mean_motion);
            features.insert("motion_variability".to_string(), motion_variance.sqrt());
            
            // Estimate motion type based on patterns
            let max_motion = motion_indicators.iter().fold(0.0, |a, &b| a.max(b));
            let min_motion = motion_indicators.iter().fold(f32::INFINITY, |a, &b| a.min(b));
            
            let motion_range = max_motion - min_motion;
            features.insert("motion_range".to_string(), motion_range);
            
            // Motion smoothness (low values indicate smooth motion)
            let motion_jerkiness = motion_indicators.windows(2)
                .map(|pair| (pair[1] - pair[0]).abs())
                .sum::<f32>() / motion_indicators.len() as f32;
            
            features.insert("motion_smoothness".to_string(), 1.0 / (1.0 + motion_jerkiness));
        }

        features
    }

    fn estimate_scene_complexity(video_data: &[u8]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Estimate scene complexity based on data patterns
        let chunk_size = video_data.len() / 50; // 50 chunks for analysis
        let mut complexity_scores = Vec::new();
        
        for chunk in video_data.chunks(chunk_size) {
            // Count unique byte patterns
            let mut pattern_set = std::collections::HashSet::new();
            for window in chunk.windows(4) {
                pattern_set.insert(window);
            }
            
            let complexity = pattern_set.len() as f32 / chunk.len() as f32;
            complexity_scores.push(complexity);
        }
        
        if !complexity_scores.is_empty() {
            let mean_complexity = complexity_scores.iter().sum::<f32>() / complexity_scores.len() as f32;
            let complexity_variance = complexity_scores.iter()
                .map(|&x| (x - mean_complexity).powi(2))
                .sum::<f32>() / complexity_scores.len() as f32;
            
            features.insert("scene_complexity".to_string(), mean_complexity);
            features.insert("complexity_variation".to_string(), complexity_variance.sqrt());
            
            // Estimate visual detail level
            let max_complexity = complexity_scores.iter().fold(0.0, |a, &b| a.max(b));
            features.insert("max_detail_level".to_string(), max_complexity);
            
            // Consistency of complexity (indicates scene stability)
            let complexity_consistency = 1.0 - (complexity_variance.sqrt() / mean_complexity.max(0.001));
            features.insert("scene_stability".to_string(), complexity_consistency.max(0.0));
        }

        features
    }

    fn analyze_temporal_patterns(video_data: &[u8]) -> HashMap<String, f32> {
        let mut features = HashMap::new();
        
        // Analyze temporal patterns in the data
        let frame_estimate = video_data.len() / 50000; // Very rough frame count estimate
        features.insert("estimated_frame_count".to_string(), frame_estimate as f32);
        
        // Temporal consistency analysis
        let segment_size = video_data.len() / 20; // 20 temporal segments
        let mut segment_characteristics = Vec::new();
        
        for segment in video_data.chunks(segment_size) {
            // Calculate segment signature
            let sum = segment.iter().map(|&b| b as u32).sum::<u32>();
            let mean = sum as f32 / segment.len() as f32;
            
            let variance = segment.iter()
                .map(|&b| (b as f32 - mean).powi(2))
                .sum::<f32>() / segment.len() as f32;
            
            segment_characteristics.push((mean, variance.sqrt()));
        }
        
        // Temporal consistency (how similar adjacent segments are)
        if segment_characteristics.len() > 1 {
            let mut consistency_sum = 0.0;
            let mut transition_strength = 0.0;
            
            for i in 1..segment_characteristics.len() {
                let (mean1, std1) = segment_characteristics[i-1];
                let (mean2, std2) = segment_characteristics[i];
                
                let mean_diff = (mean2 - mean1).abs();
                let std_diff = (std2 - std1).abs();
                
                consistency_sum += 1.0 / (1.0 + mean_diff + std_diff);
                transition_strength += mean_diff + std_diff;
            }
            
            let temporal_consistency = consistency_sum / (segment_characteristics.len() - 1) as f32;
            let avg_transition_strength = transition_strength / (segment_characteristics.len() - 1) as f32;
            
            features.insert("temporal_consistency".to_string(), temporal_consistency);
            features.insert("scene_transition_strength".to_string(), avg_transition_strength);
        }
        
        // Periodic pattern detection (very simplified)
        let period_sizes = [10, 25, 50]; // Test different potential periods
        let mut periodicity_scores = Vec::new();
        
        for &period in &period_sizes {
            if video_data.len() > period * 4 {
                let mut correlation = 0.0;
                let comparisons = video_data.len() - period;
                
                for i in 0..comparisons {
                    let similarity = 1.0 - (video_data[i] as i32 - video_data[i + period] as i32).abs() as f32 / 255.0;
                    correlation += similarity;
                }
                
                periodicity_scores.push(correlation / comparisons as f32);
            }
        }
        
        if !periodicity_scores.is_empty() {
            let max_periodicity = periodicity_scores.iter().fold(0.0, |a, &b| a.max(b));
            features.insert("temporal_periodicity".to_string(), max_periodicity);
        }

        features
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_text_feature_extraction() {
        let text = "This is a test sentence. It has multiple words and punctuation!";
        let features = FeatureExtractor::extract_text_features(text);
        
        assert!(features.contains_key("word_count"));
        assert!(features.contains_key("sentence_count"));
        assert!(features.contains_key("lexical_diversity"));
        assert!(*features.get("word_count").unwrap() > 0.0);
    }

    #[test]
    fn test_empty_text_features() {
        let features = FeatureExtractor::extract_text_features("");
        assert_eq!(*features.get("word_count").unwrap(), 0.0);
        assert_eq!(*features.get("character_count").unwrap(), 0.0);
    }
}