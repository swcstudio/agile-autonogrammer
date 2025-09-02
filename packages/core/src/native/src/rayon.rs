use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator, IntoParallelIterator};
use rayon::slice::{ParallelSlice, ParallelSliceMut};
use rayon::{ThreadPool, ThreadPoolBuilder};
use std::sync::Arc;
use serde::{Deserialize, Serialize};

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RayonConfig {
    pub num_threads: Option<u32>,
    pub thread_name: Option<String>,
    pub stack_size: Option<u32>,
    pub panic_handler: Option<bool>,
}

#[napi]
pub struct RayonThreadPool {
    pool: Arc<ThreadPool>,
}

#[napi]
impl RayonThreadPool {
    #[napi(constructor)]
    pub fn new(config: Option<RayonConfig>) -> Self {
        let mut builder = ThreadPoolBuilder::new();

        if let Some(cfg) = config {
            if let Some(num_threads) = cfg.num_threads {
                builder = builder.num_threads(num_threads as usize);
            }
            if let Some(thread_name) = cfg.thread_name {
                builder = builder.thread_name(move |index| format!("{}-{}", thread_name, index));
            }
            if let Some(stack_size) = cfg.stack_size {
                builder = builder.stack_size(stack_size as usize);
            }
            if cfg.panic_handler.unwrap_or(false) {
                builder = builder.panic_handler(|_| {});
            }
        }

        let pool = builder.build().unwrap_or_else(|_| {
            ThreadPoolBuilder::new().build().unwrap()
        });

        RayonThreadPool {
            pool: Arc::new(pool),
        }
    }

    #[napi]
    pub fn current_num_threads(&self) -> u32 {
        self.pool.current_num_threads() as u32
    }

}

pub struct ParallelMapTask {
    data: Vec<i32>,
    operation: String,
    pool: Option<Arc<ThreadPool>>,
}

impl Task for ParallelMapTask {
    type Output = Vec<i32>;
    type JsValue = Vec<i32>;

    fn compute(&mut self) -> Result<Self::Output> {
        let result = match self.operation.as_str() {
            "square" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().map(|x| x * x).collect()
                    })
                } else {
                    self.data.par_iter().map(|x| x * x).collect()
                }
            }
            "double" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().map(|x| x * 2).collect()
                    })
                } else {
                    self.data.par_iter().map(|x| x * 2).collect()
                }
            }
            "increment" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().map(|x| x + 1).collect()
                    })
                } else {
                    self.data.par_iter().map(|x| x + 1).collect()
                }
            }
            _ => return Err(Error::from_reason("Unknown operation")),
        };

        Ok(result)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn parallel_map(
    data: Vec<i32>,
    operation: String,
    pool: Option<&RayonThreadPool>,
) -> AsyncTask<ParallelMapTask> {
    AsyncTask::new(ParallelMapTask {
        data,
        operation,
        pool: pool.map(|p| Arc::clone(&p.pool)),
    })
}

pub struct ParallelReduceTask {
    data: Vec<i32>,
    operation: String,
    initial: i32,
    pool: Option<Arc<ThreadPool>>,
}

impl Task for ParallelReduceTask {
    type Output = i32;
    type JsValue = i32;

    fn compute(&mut self) -> Result<Self::Output> {
        let result = match self.operation.as_str() {
            "sum" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().sum()
                    })
                } else {
                    self.data.par_iter().sum()
                }
            }
            "product" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().product()
                    })
                } else {
                    self.data.par_iter().product()
                }
            }
            "max" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().max().copied().unwrap_or(self.initial)
                    })
                } else {
                    self.data.par_iter().max().copied().unwrap_or(self.initial)
                }
            }
            "min" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().min().copied().unwrap_or(self.initial)
                    })
                } else {
                    self.data.par_iter().min().copied().unwrap_or(self.initial)
                }
            }
            _ => return Err(Error::from_reason("Unknown operation")),
        };

        Ok(result)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn parallel_reduce(
    data: Vec<i32>,
    operation: String,
    initial: Option<i32>,
    pool: Option<&RayonThreadPool>,
) -> AsyncTask<ParallelReduceTask> {
    AsyncTask::new(ParallelReduceTask {
        data,
        operation,
        initial: initial.unwrap_or(0),
        pool: pool.map(|p| Arc::clone(&p.pool)),
    })
}

pub struct ParallelFilterTask {
    data: Vec<i32>,
    operation: String,
    threshold: i32,
    pool: Option<Arc<ThreadPool>>,
}

impl Task for ParallelFilterTask {
    type Output = Vec<i32>;
    type JsValue = Vec<i32>;

    fn compute(&mut self) -> Result<Self::Output> {
        let result = match self.operation.as_str() {
            "greater_than" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().filter(|&&x| x > self.threshold).copied().collect()
                    })
                } else {
                    self.data.par_iter().filter(|&&x| x > self.threshold).copied().collect()
                }
            }
            "less_than" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().filter(|&&x| x < self.threshold).copied().collect()
                    })
                } else {
                    self.data.par_iter().filter(|&&x| x < self.threshold).copied().collect()
                }
            }
            "equal_to" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().filter(|&&x| x == self.threshold).copied().collect()
                    })
                } else {
                    self.data.par_iter().filter(|&&x| x == self.threshold).copied().collect()
                }
            }
            "even" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().filter(|&&x| x % 2 == 0).copied().collect()
                    })
                } else {
                    self.data.par_iter().filter(|&&x| x % 2 == 0).copied().collect()
                }
            }
            "odd" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data.par_iter().filter(|&&x| x % 2 != 0).copied().collect()
                    })
                } else {
                    self.data.par_iter().filter(|&&x| x % 2 != 0).copied().collect()
                }
            }
            _ => return Err(Error::from_reason("Unknown filter operation")),
        };

        Ok(result)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn parallel_filter(
    data: Vec<i32>,
    operation: String,
    threshold: Option<i32>,
    pool: Option<&RayonThreadPool>,
) -> AsyncTask<ParallelFilterTask> {
    AsyncTask::new(ParallelFilterTask {
        data,
        operation,
        threshold: threshold.unwrap_or(0),
        pool: pool.map(|p| Arc::clone(&p.pool)),
    })
}

pub struct ParallelSortTask {
    data: Vec<i32>,
    descending: bool,
    pool: Option<Arc<ThreadPool>>,
}

impl Task for ParallelSortTask {
    type Output = Vec<i32>;
    type JsValue = Vec<i32>;

    fn compute(&mut self) -> Result<Self::Output> {
        let mut result = self.data.clone();
        
        if let Some(pool) = &self.pool {
            pool.install(|| {
                if self.descending {
                    result.par_sort_by(|a, b| b.cmp(a));
                } else {
                    result.par_sort();
                }
            });
        } else {
            if self.descending {
                result.par_sort_by(|a, b| b.cmp(a));
            } else {
                result.par_sort();
            }
        }

        Ok(result)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn parallel_sort(
    data: Vec<i32>,
    descending: Option<bool>,
    pool: Option<&RayonThreadPool>,
) -> AsyncTask<ParallelSortTask> {
    AsyncTask::new(ParallelSortTask {
        data,
        descending: descending.unwrap_or(false),
        pool: pool.map(|p| Arc::clone(&p.pool)),
    })
}

pub struct ParallelChunkTask {
    data: Vec<i32>,
    chunk_size: usize,
    operation: String,
    pool: Option<Arc<ThreadPool>>,
}

impl Task for ParallelChunkTask {
    type Output = Vec<i32>;
    type JsValue = Vec<i32>;

    fn compute(&mut self) -> Result<Self::Output> {
        let result = match self.operation.as_str() {
            "sum_chunks" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data
                            .par_chunks(self.chunk_size)
                            .map(|chunk| chunk.iter().sum())
                            .collect()
                    })
                } else {
                    self.data
                        .par_chunks(self.chunk_size)
                        .map(|chunk| chunk.iter().sum())
                        .collect()
                }
            }
            "max_chunks" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data
                            .par_chunks(self.chunk_size)
                            .map(|chunk| *chunk.iter().max().unwrap_or(&0))
                            .collect()
                    })
                } else {
                    self.data
                        .par_chunks(self.chunk_size)
                        .map(|chunk| *chunk.iter().max().unwrap_or(&0))
                        .collect()
                }
            }
            "min_chunks" => {
                if let Some(pool) = &self.pool {
                    pool.install(|| {
                        self.data
                            .par_chunks(self.chunk_size)
                            .map(|chunk| *chunk.iter().min().unwrap_or(&0))
                            .collect()
                    })
                } else {
                    self.data
                        .par_chunks(self.chunk_size)
                        .map(|chunk| *chunk.iter().min().unwrap_or(&0))
                        .collect()
                }
            }
            _ => return Err(Error::from_reason("Unknown chunk operation")),
        };

        Ok(result)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn parallel_chunk_process(
    data: Vec<i32>,
    chunk_size: u32,
    operation: String,
    pool: Option<&RayonThreadPool>,
) -> AsyncTask<ParallelChunkTask> {
    AsyncTask::new(ParallelChunkTask {
        data,
        chunk_size: chunk_size as usize,
        operation,
        pool: pool.map(|p| Arc::clone(&p.pool)),
    })
}

#[napi]
pub fn get_rayon_global_thread_count() -> u32 {
    rayon::current_num_threads() as u32
}
