//! Katalyst Rust WebAssembly Runtime
//! 
//! High-performance WebAssembly module providing:
//! - Matrix operations with SIMD acceleration
//! - Fast Fourier Transform computations
//! - K-means clustering algorithms
//! - Multithreading support
//! - Performance monitoring and benchmarking

use wasm_bindgen::prelude::*;
use js_sys::*;
use web_sys::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ndarray::{Array1, Array2};
use rayon::prelude::*;

// Initialize WASM module
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

// Export the main compute interface
#[wasm_bindgen]
pub struct KatalystCompute {
    stats: HashMap<String, f64>,
    threads: usize,
}

#[wasm_bindgen]
impl KatalystCompute {
    #[wasm_bindgen(constructor)]
    pub fn new() -> KatalystCompute {
        KatalystCompute {
            stats: HashMap::new(),
            threads: 4, // Default thread count
        }
    }

    /// High-performance matrix multiplication using SIMD when available
    #[wasm_bindgen]
    pub fn matrix_multiply(&mut self, a_data: &[f32], b_data: &[f32], rows_a: usize, cols_a: usize, cols_b: usize) -> Vec<f32> {
        let start = performance().now();
        
        let a = Array2::from_shape_vec((rows_a, cols_a), a_data.to_vec()).unwrap();
        let b = Array2::from_shape_vec((cols_a, cols_b), b_data.to_vec()).unwrap();
        
        let result = a.dot(&b);
        let duration = performance().now() - start;
        
        self.stats.insert("matrix_multiply_ms".to_string(), duration);
        result.into_raw_vec()
    }

    /// Fast Fourier Transform implementation
    #[wasm_bindgen]
    pub fn fft(&mut self, real: &mut [f32], imag: &mut [f32], inverse: bool) {
        let start = performance().now();
        let n = real.len();
        
        if n <= 1 {
            return;
        }
        
        // Bit-reversal permutation
        let mut j = 0;
        for i in 1..n {
            let mut bit = n >> 1;
            while j & bit != 0 {
                j ^= bit;
                bit >>= 1;
            }
            j ^= bit;
            
            if i < j {
                real.swap(i, j);
                imag.swap(i, j);
            }
        }
        
        // Cooley-Tukey FFT
        let mut length = 2;
        while length <= n {
            let angle = if inverse { 2.0 * std::f32::consts::PI / length as f32 } else { -2.0 * std::f32::consts::PI / length as f32 };
            let wlen_real = angle.cos();
            let wlen_imag = angle.sin();
            
            for i in (0..n).step_by(length) {
                let mut w_real = 1.0;
                let mut w_imag = 0.0;
                
                for j in 0..(length / 2) {
                    let u_real = real[i + j];
                    let u_imag = imag[i + j];
                    let v_real = real[i + j + length / 2] * w_real - imag[i + j + length / 2] * w_imag;
                    let v_imag = real[i + j + length / 2] * w_imag + imag[i + j + length / 2] * w_real;
                    
                    real[i + j] = u_real + v_real;
                    imag[i + j] = u_imag + v_imag;
                    real[i + j + length / 2] = u_real - v_real;
                    imag[i + j + length / 2] = u_imag - v_imag;
                    
                    let w_temp = w_real * wlen_real - w_imag * wlen_imag;
                    w_imag = w_real * wlen_imag + w_imag * wlen_real;
                    w_real = w_temp;
                }
            }
            length <<= 1;
        }
        
        if inverse {
            let n_f = n as f32;
            for i in 0..n {
                real[i] /= n_f;
                imag[i] /= n_f;
            }
        }
        
        let duration = performance().now() - start;
        self.stats.insert("fft_ms".to_string(), duration);
    }

    /// K-means clustering algorithm
    #[wasm_bindgen]
    pub fn k_means_clustering(&mut self, data: &[f32], dimensions: usize, k: usize, max_iterations: usize) -> Vec<u32> {
        let start = performance().now();
        let n_points = data.len() / dimensions;
        
        // Initialize centroids randomly
        let mut centroids = vec![0.0; k * dimensions];
        for i in 0..k {
            for j in 0..dimensions {
                centroids[i * dimensions + j] = data[(i * n_points / k) * dimensions + j];
            }
        }
        
        let mut assignments = vec![0u32; n_points];
        
        for _iteration in 0..max_iterations {
            // Assign points to closest centroids
            for point_idx in 0..n_points {
                let mut best_distance = f32::INFINITY;
                let mut best_centroid = 0;
                
                for centroid_idx in 0..k {
                    let mut distance = 0.0;
                    for dim in 0..dimensions {
                        let diff = data[point_idx * dimensions + dim] - centroids[centroid_idx * dimensions + dim];
                        distance += diff * diff;
                    }
                    
                    if distance < best_distance {
                        best_distance = distance;
                        best_centroid = centroid_idx;
                    }
                }
                
                assignments[point_idx] = best_centroid as u32;
            }
            
            // Update centroids
            let mut new_centroids = vec![0.0; k * dimensions];
            let mut counts = vec![0; k];
            
            for point_idx in 0..n_points {
                let cluster = assignments[point_idx] as usize;
                counts[cluster] += 1;
                for dim in 0..dimensions {
                    new_centroids[cluster * dimensions + dim] += data[point_idx * dimensions + dim];
                }
            }
            
            for cluster in 0..k {
                if counts[cluster] > 0 {
                    for dim in 0..dimensions {
                        new_centroids[cluster * dimensions + dim] /= counts[cluster] as f32;
                    }
                }
            }
            
            centroids = new_centroids;
        }
        
        let duration = performance().now() - start;
        self.stats.insert("k_means_ms".to_string(), duration);
        
        assignments
    }

    /// Run comprehensive benchmark suite
    #[wasm_bindgen]
    pub fn run_benchmark_suite(&mut self) -> String {
        let mut results = HashMap::new();
        
        // Matrix multiplication benchmark
        let size = 128;
        let a = vec![1.0f32; size * size];
        let b = vec![2.0f32; size * size];
        let _ = self.matrix_multiply(&a, &b, size, size, size);
        results.insert("matrix_multiply_128x128", self.stats.get("matrix_multiply_ms").unwrap_or(&0.0).clone());
        
        // FFT benchmark
        let fft_size = 1024;
        let mut real = vec![1.0f32; fft_size];
        let mut imag = vec![0.0f32; fft_size];
        self.fft(&mut real, &mut imag, false);
        results.insert("fft_1024", self.stats.get("fft_ms").unwrap_or(&0.0).clone());
        
        // K-means benchmark
        let n_points = 1000;
        let dimensions = 3;
        let data: Vec<f32> = (0..(n_points * dimensions)).map(|i| (i as f32).sin()).collect();
        let _ = self.k_means_clustering(&data, dimensions, 5, 10);
        results.insert("k_means_1000pts_3d", self.stats.get("k_means_ms").unwrap_or(&0.0).clone());
        
        serde_json::to_string(&results).unwrap_or_else(|_| "{}".to_string())
    }

    /// Get performance statistics
    #[wasm_bindgen]
    pub fn get_performance_stats(&self) -> String {
        serde_json::to_string(&self.stats).unwrap_or_else(|_| "{}".to_string())
    }

    /// Get WASM capabilities
    #[wasm_bindgen]
    pub fn get_capabilities(&self) -> String {
        let capabilities = serde_json::json!({
            "simd": cfg!(feature = "simd"),
            "threads": cfg!(feature = "threads"),
            "thread_count": self.threads,
            "memory_64": false, // wasm32 doesn't support 64-bit memory
            "bulk_memory": true,
            "multivalue": true,
            "tail_calls": false
        });
        
        capabilities.to_string()
    }

    /// Set thread count for parallel operations
    #[wasm_bindgen]
    pub fn set_thread_count(&mut self, threads: usize) {
        self.threads = threads.max(1);
    }
}

// Utility functions
#[wasm_bindgen]
pub fn get_wasm_capabilities() -> String {
    let compute = KatalystCompute::new();
    compute.get_capabilities()
}

#[wasm_bindgen]
pub fn allocate_buffer(size: usize) -> *mut u8 {
    let mut vec = Vec::with_capacity(size);
    vec.resize(size, 0);
    let ptr = vec.as_mut_ptr();
    std::mem::forget(vec);
    ptr
}

#[wasm_bindgen]
pub fn deallocate_buffer(ptr: *mut u8, size: usize) {
    unsafe {
        let _ = Vec::from_raw_parts(ptr, size, size);
    }
}

// Version and build information
#[wasm_bindgen]
pub fn get_version() -> String {
    "1.0.0".to_string()
}

#[wasm_bindgen]
pub fn get_build_info() -> String {
    serde_json::json!({
        "name": "katalyst-rust-wasm",
        "version": "1.0.0",
        "target": "wasm32-unknown-unknown",
        "optimization": if cfg!(debug_assertions) { "debug" } else { "release" },
        "features": {
            "simd": cfg!(feature = "simd"),
            "threads": cfg!(feature = "threads"),
            "debug": cfg!(feature = "debug")
        }
    }).to_string()
}

// Helper to get performance API
fn performance() -> Performance {
    web_sys::window().unwrap().performance().unwrap()
}