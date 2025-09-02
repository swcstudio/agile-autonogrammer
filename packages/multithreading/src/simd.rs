use napi::bindgen_prelude::*;
use napi_derive::napi;
use wide::{f32x4, f32x8, i32x4, i32x8, u32x4, u32x8};
use nalgebra::{DMatrix, DVector};
use rayon::prelude::*;

#[napi]
pub struct SimdF32x4 {
    data: f32x4,
}

#[napi]
impl SimdF32x4 {
    #[napi(constructor)]
    pub fn new(a: f64, b: f64, c: f64, d: f64) -> Self {
        Self {
            data: f32x4::new([a as f32, b as f32, c as f32, d as f32]),
        }
    }

    #[napi(factory)]
    pub fn from_array(values: Vec<f64>) -> Result<Self> {
        if values.len() != 4 {
            return Err(Error::from_reason("Array must have exactly 4 elements"));
        }
        Ok(Self {
            data: f32x4::new([
                values[0] as f32,
                values[1] as f32,
                values[2] as f32,
                values[3] as f32,
            ]),
        })
    }

    #[napi]
    pub fn add(&self, other: &SimdF32x4) -> SimdF32x4 {
        SimdF32x4 {
            data: self.data + other.data,
        }
    }

    #[napi]
    pub fn sub(&self, other: &SimdF32x4) -> SimdF32x4 {
        SimdF32x4 {
            data: self.data - other.data,
        }
    }

    #[napi]
    pub fn mul(&self, other: &SimdF32x4) -> SimdF32x4 {
        SimdF32x4 {
            data: self.data * other.data,
        }
    }

    #[napi]
    pub fn div(&self, other: &SimdF32x4) -> SimdF32x4 {
        SimdF32x4 {
            data: self.data / other.data,
        }
    }

    #[napi]
    pub fn dot(&self, other: &SimdF32x4) -> f64 {
        let product = self.data * other.data;
        let arr: [f32; 4] = product.into();
        arr.iter().sum::<f32>() as f64
    }

    #[napi]
    pub fn sqrt(&self) -> SimdF32x4 {
        SimdF32x4 {
            data: self.data.sqrt(),
        }
    }

    #[napi]
    pub fn abs(&self) -> SimdF32x4 {
        SimdF32x4 {
            data: self.data.abs(),
        }
    }

    #[napi]
    pub fn min(&self, other: &SimdF32x4) -> SimdF32x4 {
        SimdF32x4 {
            data: self.data.min(other.data),
        }
    }

    #[napi]
    pub fn max(&self, other: &SimdF32x4) -> SimdF32x4 {
        SimdF32x4 {
            data: self.data.max(other.data),
        }
    }

    #[napi]
    pub fn to_array(&self) -> Vec<f64> {
        let arr: [f32; 4] = self.data.into();
        arr.iter().map(|&x| x as f64).collect()
    }

    #[napi]
    pub fn sum(&self) -> f64 {
        let arr: [f32; 4] = self.data.into();
        arr.iter().sum::<f32>() as f64
    }

    #[napi]
    pub fn horizontal_sum(&self) -> f64 {
        self.sum()
    }
}

#[napi]
pub struct SimdF32x8 {
    data: f32x8,
}

#[napi]
impl SimdF32x8 {
    #[napi(constructor)]
    pub fn new(values: Vec<f64>) -> Result<Self> {
        if values.len() != 8 {
            return Err(Error::from_reason("Array must have exactly 8 elements"));
        }
        let arr: [f32; 8] = [
            values[0] as f32, values[1] as f32, values[2] as f32, values[3] as f32,
            values[4] as f32, values[5] as f32, values[6] as f32, values[7] as f32,
        ];
        Ok(Self {
            data: f32x8::from(arr),
        })
    }

    #[napi]
    pub fn add(&self, other: &SimdF32x8) -> SimdF32x8 {
        SimdF32x8 {
            data: self.data + other.data,
        }
    }

    #[napi]
    pub fn mul(&self, other: &SimdF32x8) -> SimdF32x8 {
        SimdF32x8 {
            data: self.data * other.data,
        }
    }

    #[napi]
    pub fn to_array(&self) -> Vec<f64> {
        let arr: [f32; 8] = self.data.into();
        arr.iter().map(|&x| x as f64).collect()
    }

    #[napi]
    pub fn sum(&self) -> f64 {
        let arr: [f32; 8] = self.data.into();
        arr.iter().sum::<f32>() as f64
    }
}

#[napi]
pub struct SimdMatrix {
    data: DMatrix<f32>,
}

#[napi]
impl SimdMatrix {
    #[napi(constructor)]
    pub fn new(rows: u32, cols: u32) -> Self {
        Self {
            data: DMatrix::zeros(rows as usize, cols as usize),
        }
    }

    #[napi(factory)]
    pub fn from_vec(rows: u32, cols: u32, values: Vec<f64>) -> Result<Self> {
        let expected_len = (rows * cols) as usize;
        if values.len() != expected_len {
            return Err(Error::from_reason(
                format!("Expected {} values, got {}", expected_len, values.len())
            ));
        }
        
        let float_values: Vec<f32> = values.iter().map(|&x| x as f32).collect();
        Ok(Self {
            data: DMatrix::from_vec(rows as usize, cols as usize, float_values),
        })
    }

    #[napi]
    pub fn add(&self, other: &SimdMatrix) -> Result<SimdMatrix> {
        if self.data.shape() != other.data.shape() {
            return Err(Error::from_reason("Matrix dimensions must match"));
        }
        Ok(SimdMatrix {
            data: &self.data + &other.data,
        })
    }

    #[napi]
    pub fn mul(&self, other: &SimdMatrix) -> Result<SimdMatrix> {
        if self.data.ncols() != other.data.nrows() {
            return Err(Error::from_reason(
                "Invalid matrix dimensions for multiplication"
            ));
        }
        Ok(SimdMatrix {
            data: &self.data * &other.data,
        })
    }

    #[napi]
    pub fn transpose(&self) -> SimdMatrix {
        SimdMatrix {
            data: self.data.transpose(),
        }
    }

    #[napi]
    pub fn scale(&self, scalar: f64) -> SimdMatrix {
        SimdMatrix {
            data: &self.data * (scalar as f32),
        }
    }

    #[napi]
    pub fn rows(&self) -> u32 {
        self.data.nrows() as u32
    }

    #[napi]
    pub fn cols(&self) -> u32 {
        self.data.ncols() as u32
    }

    #[napi]
    pub fn get(&self, row: u32, col: u32) -> Result<f64> {
        let row = row as usize;
        let col = col as usize;
        if row >= self.data.nrows() || col >= self.data.ncols() {
            return Err(Error::from_reason("Index out of bounds"));
        }
        Ok(self.data[(row, col)] as f64)
    }

    #[napi]
    pub fn set(&mut self, row: u32, col: u32, value: f64) -> Result<()> {
        let row = row as usize;
        let col = col as usize;
        if row >= self.data.nrows() || col >= self.data.ncols() {
            return Err(Error::from_reason("Index out of bounds"));
        }
        self.data[(row, col)] = value as f32;
        Ok(())
    }

    #[napi]
    pub fn to_vec(&self) -> Vec<f64> {
        self.data.iter().map(|&x| x as f64).collect()
    }
}

#[napi]
pub fn simd_dot_product(a: Vec<f64>, b: Vec<f64>) -> Result<f64> {
    if a.len() != b.len() {
        return Err(Error::from_reason("Vectors must have the same length"));
    }

    // Process in chunks of 4 for SIMD
    let mut sum = 0.0f32;
    let chunks = a.chunks_exact(4).zip(b.chunks_exact(4));
    
    for (chunk_a, chunk_b) in chunks {
        let simd_a = f32x4::new([
            chunk_a[0] as f32,
            chunk_a[1] as f32,
            chunk_a[2] as f32,
            chunk_a[3] as f32,
        ]);
        let simd_b = f32x4::new([
            chunk_b[0] as f32,
            chunk_b[1] as f32,
            chunk_b[2] as f32,
            chunk_b[3] as f32,
        ]);
        
        let product = simd_a * simd_b;
        let arr: [f32; 4] = product.into();
        sum += arr.iter().sum::<f32>();
    }

    // Handle remainder
    let remainder_a = a.chunks_exact(4).remainder();
    let remainder_b = b.chunks_exact(4).remainder();
    for (a, b) in remainder_a.iter().zip(remainder_b.iter()) {
        sum += (*a as f32) * (*b as f32);
    }

    Ok(sum as f64)
}

#[napi]
pub fn simd_vector_add(a: Vec<f64>, b: Vec<f64>) -> Result<Vec<f64>> {
    if a.len() != b.len() {
        return Err(Error::from_reason("Vectors must have the same length"));
    }

    let mut result = Vec::with_capacity(a.len());
    
    // Process in chunks of 4 for SIMD
    let chunks = a.chunks_exact(4).zip(b.chunks_exact(4));
    
    for (chunk_a, chunk_b) in chunks {
        let simd_a = f32x4::new([
            chunk_a[0] as f32,
            chunk_a[1] as f32,
            chunk_a[2] as f32,
            chunk_a[3] as f32,
        ]);
        let simd_b = f32x4::new([
            chunk_b[0] as f32,
            chunk_b[1] as f32,
            chunk_b[2] as f32,
            chunk_b[3] as f32,
        ]);
        
        let sum = simd_a + simd_b;
        let arr: [f32; 4] = sum.into();
        result.extend(arr.iter().map(|&x| x as f64));
    }

    // Handle remainder
    let remainder_a = a.chunks_exact(4).remainder();
    let remainder_b = b.chunks_exact(4).remainder();
    for (a, b) in remainder_a.iter().zip(remainder_b.iter()) {
        result.push(a + b);
    }

    Ok(result)
}

#[napi]
pub fn simd_vector_scale(vec: Vec<f64>, scalar: f64) -> Vec<f64> {
    let scalar_f32 = scalar as f32;
    let scalar_simd = f32x4::splat(scalar_f32);
    
    let mut result = Vec::with_capacity(vec.len());
    
    // Process in chunks of 4 for SIMD
    for chunk in vec.chunks_exact(4) {
        let simd_vec = f32x4::new([
            chunk[0] as f32,
            chunk[1] as f32,
            chunk[2] as f32,
            chunk[3] as f32,
        ]);
        
        let scaled = simd_vec * scalar_simd;
        let arr: [f32; 4] = scaled.into();
        result.extend(arr.iter().map(|&x| x as f64));
    }

    // Handle remainder
    for &val in vec.chunks_exact(4).remainder() {
        result.push(val * scalar);
    }

    result
}

#[napi]
pub fn simd_parallel_sum(data: Vec<f64>) -> f64 {
    // Use Rayon for parallel processing with SIMD
    data.par_chunks(1024)
        .map(|chunk| {
            let mut sum = 0.0f32;
            
            // SIMD processing for each chunk
            for simd_chunk in chunk.chunks_exact(4) {
                let simd_data = f32x4::new([
                    simd_chunk[0] as f32,
                    simd_chunk[1] as f32,
                    simd_chunk[2] as f32,
                    simd_chunk[3] as f32,
                ]);
                let arr: [f32; 4] = simd_data.into();
                sum += arr.iter().sum::<f32>();
            }
            
            // Handle remainder
            for &val in chunk.chunks_exact(4).remainder() {
                sum += val as f32;
            }
            
            sum as f64
        })
        .sum()
}

#[napi]
pub fn create_simd_f32x4(a: f64, b: f64, c: f64, d: f64) -> SimdF32x4 {
    SimdF32x4::new(a, b, c, d)
}

#[napi]
pub fn create_simd_matrix(rows: u32, cols: u32) -> SimdMatrix {
    SimdMatrix::new(rows, cols)
}