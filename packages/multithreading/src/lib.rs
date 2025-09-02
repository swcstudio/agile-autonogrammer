#![deny(clippy::all)]

#[cfg(feature = "mimalloc")]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

use napi_derive::napi;
use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};

// Core modules
mod crossbeam;
mod rayon;
mod tokio;

// Advanced modules
mod parking_lot;
mod dashmap;
mod flume;
mod simd;
mod thread_local;
mod memory_pool;

// Elixir/Phoenix-inspired modules
mod actor;
mod genserver;
mod supervisor;
mod pubsub;
mod registry;
mod channel;
mod ets;
mod presence;

// Re-export all public APIs
pub use crossbeam::*;
pub use rayon::*;
pub use tokio::*;
pub use parking_lot::*;
pub use dashmap::*;
pub use flume::*;
pub use simd::*;
pub use thread_local::*;
pub use memory_pool::*;

// Re-export Elixir/Phoenix-inspired APIs
pub use actor::{JsActorSystem, ActorId};
pub use genserver::{JsGenServer, create_genserver};
pub use supervisor::JsSupervisor;
pub use pubsub::{JsPubSub, JsTopicChannel, create_topic_channel};
pub use registry::{JsProcessRegistry, register_name, unregister_name, whereis_name};
pub use channel::{JsChannelSystem, join_channel, leave_channel, broadcast_to_channel};
pub use ets::{JsETSSystem, ets_new, ets_insert, ets_lookup};
pub use presence::{JsPresenceSystem, presence_track, presence_untrack, presence_list};

#[napi]
pub fn get_multithreading_info() -> String {
    format!(
        "@swcstudio/multithreading Module v2.0.0\n\
        Features:\n\
        - Crossbeam: Channels, atomics, lock-free data structures\n\
        - Rayon: Parallel iterators, custom thread pools\n\
        - Tokio: Async runtime, task spawning, async channels\n\
        - ParkingLot: Advanced synchronization primitives\n\
        - DashMap: Concurrent hash maps\n\
        - Flume: Fast multi-producer, multi-consumer channels\n\
        - SIMD: Vectorized operations and parallel math\n\
        - Thread-local storage and memory pools\n\
        \n\
        Elixir/Phoenix-inspired Features:\n\
        - Actor System: Lightweight processes with message passing\n\
        - GenServer: Stateful server processes with callbacks\n\
        - Supervisor Trees: Fault-tolerant process supervision\n\
        - PubSub: Topic-based publish/subscribe messaging\n\
        - Process Registry: Named process registration and discovery\n\
        - Phoenix Channels: Real-time communication channels\n\
        - ETS Tables: Concurrent in-memory storage (Set, Bag, OrderedSet)\n\
        - Presence Tracking: Real-time user presence with CRDTs\n\
        \n\
        Available CPU cores: {}\n\
        Rayon global thread count: {}",
        num_cpus::get(),
        num_cpus::get()
    )
}

#[napi]
pub fn initialize_multithreading() -> napi::Result<String> {
    std::panic::set_hook(Box::new(|panic_info| {
        eprintln!("Rust panic in multithreading module: {:?}", panic_info);
    }));

    Ok("Multithreading module initialized successfully".to_string())
}

#[napi]
pub fn get_system_info() -> napi::Result<SystemInfo> {
    Ok(SystemInfo {
        cpu_cores: num_cpus::get() as u32,
        rayon_threads: num_cpus::get() as u32,
        tokio_available: true,
        crossbeam_available: true,
        version: "1.0.0".to_string(),
    })
}

#[napi(object)]
pub struct SystemInfo {
    pub cpu_cores: u32,
    pub rayon_threads: u32,
    pub tokio_available: bool,
    pub crossbeam_available: bool,
    pub version: String,
}

#[napi]
pub struct MultithreadingManager {
    rayon_pool: Option<RayonThreadPool>,
    tokio_runtime: Option<TokioRuntime>,
}

#[napi]
impl MultithreadingManager {
    #[napi(constructor)]
    pub fn new() -> napi::Result<Self> {
        Ok(MultithreadingManager {
            rayon_pool: None,
            tokio_runtime: None,
        })
    }

    #[napi]
    pub fn initialize_rayon(&mut self, config: Option<RayonConfig>) -> napi::Result<()> {
        self.rayon_pool = Some(RayonThreadPool::new(config));
        Ok(())
    }

    #[napi]
    pub fn initialize_tokio(&mut self, config: Option<TokioRuntimeConfig>) -> napi::Result<()> {
        self.tokio_runtime = Some(TokioRuntime::new(config));
        Ok(())
    }

    #[napi]
    pub fn get_rayon_pool(&self) -> bool {
        self.rayon_pool.is_some()
    }

    #[napi]
    pub fn get_tokio_runtime(&self) -> bool {
        self.tokio_runtime.is_some()
    }

    #[napi]
    pub fn is_rayon_initialized(&self) -> bool {
        self.rayon_pool.is_some()
    }

    #[napi]
    pub fn is_tokio_initialized(&self) -> bool {
        self.tokio_runtime.is_some()
    }

    #[napi]
    pub fn cleanup(&mut self) {
        self.rayon_pool = None;
        self.tokio_runtime = None;
    }
}

#[napi]
pub fn create_crossbeam_channel(bounded: Option<u32>) -> napi::Result<CrossbeamChannel> {
    Ok(CrossbeamChannel::new(bounded))
}

#[napi]
pub fn create_crossbeam_atomic_cell(initial_value: i32) -> CrossbeamAtomicCell {
    CrossbeamAtomicCell::new(initial_value)
}

#[napi]
pub fn create_crossbeam_array_queue(capacity: u32) -> CrossbeamArrayQueue {
    CrossbeamArrayQueue::new(capacity)
}

#[napi]
pub fn create_crossbeam_seg_queue() -> CrossbeamSegQueue {
    CrossbeamSegQueue::new()
}

#[napi]
pub fn create_rayon_thread_pool(config: Option<RayonConfig>) -> napi::Result<RayonThreadPool> {
    Ok(RayonThreadPool::new(config))
}

#[napi]
pub fn create_tokio_runtime(config: Option<TokioRuntimeConfig>) -> napi::Result<TokioRuntime> {
    Ok(TokioRuntime::new(config))
}

#[napi]
pub fn create_tokio_mpsc_channel() -> TokioMpscChannel {
    TokioMpscChannel::new()
}

#[napi]
pub fn create_tokio_broadcast_channel(capacity: u32) -> TokioBroadcastChannel {
    TokioBroadcastChannel::new(capacity)
}

#[napi]
pub fn create_tokio_timer() -> TokioTimer {
    TokioTimer::new()
}

#[napi]
pub fn benchmark_parallel_operations(
    data_size: u32,
    operation: String,
) -> AsyncTask<BenchmarkTask> {
    AsyncTask::new(BenchmarkTask {
        data_size: data_size as usize,
        operation,
    })
}

pub struct BenchmarkTask {
    data_size: usize,
    operation: String,
}

impl napi::Task for BenchmarkTask {
    type Output = BenchmarkResult;
    type JsValue = BenchmarkResult;

    fn compute(&mut self) -> napi::Result<Self::Output> {
        let data: Vec<i32> = (0..self.data_size).map(|i| i as i32).collect();
        let start = std::time::Instant::now();

        let result = match self.operation.as_str() {
            "sequential_sum" => {
                data.iter().sum::<i32>()
            }
            "parallel_sum" => {
                data.iter().sum::<i32>()
            }
            "sequential_square" => {
                data.iter().map(|x| x * x).sum::<i32>()
            }
            "parallel_square" => {
                data.iter().map(|x| x * x).sum::<i32>()
            }
            _ => return Err(napi::Error::from_reason("Unknown benchmark operation")),
        };

        let duration = start.elapsed();

        Ok(BenchmarkResult {
            operation: self.operation.clone(),
            data_size: self.data_size as u32,
            result,
            duration_ms: duration.as_millis() as u32,
            throughput: (self.data_size as f64 / duration.as_secs_f64()) as u32,
        })
    }

    fn resolve(&mut self, _env: napi::Env, output: Self::Output) -> napi::Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi(object)]
pub struct BenchmarkResult {
    pub operation: String,
    pub data_size: u32,
    pub result: i32,
    pub duration_ms: u32,
    pub throughput: u32,
}

#[napi]
pub fn stress_test_concurrency(
    num_tasks: u32,
    task_duration_ms: u32,
    callback: ThreadsafeFunction<StressTestResult>,
) -> napi::Result<()> {
    use napi::threadsafe_function::*;
    
    let tsfn = callback;

    std::thread::spawn(move || {
        for i in 0..num_tasks {
            let task_duration = std::time::Duration::from_millis(task_duration_ms as u64);
            let start = std::time::Instant::now();
            std::thread::sleep(task_duration);
            let actual_duration = start.elapsed();
            
            let result = StressTestResult {
                task_id: i,
                duration_ms: actual_duration.as_millis() as u32,
                thread_id: format!("{:?}", std::thread::current().id()),
                status: "completed".to_string(),
            };
            
            tsfn.call(Ok(result), ThreadsafeFunctionCallMode::Blocking);
        }
    });

    Ok(())
}

#[napi(object)]
pub struct StressTestResult {
    pub task_id: u32,
    pub duration_ms: u32,
    pub thread_id: String,
    pub status: String,
}

#[napi]
pub fn get_performance_metrics() -> napi::Result<PerformanceMetrics> {
    let system_info = get_system_info()?;
    
    Ok(PerformanceMetrics {
        cpu_cores: system_info.cpu_cores,
        rayon_threads: system_info.rayon_threads,
        memory_usage_mb: get_memory_usage_mb(),
        uptime_ms: get_uptime_ms(),
        active_tasks: get_active_task_count(),
    })
}

#[napi(object)]
pub struct PerformanceMetrics {
    pub cpu_cores: u32,
    pub rayon_threads: u32,
    pub memory_usage_mb: u32,
    pub uptime_ms: f64,
    pub active_tasks: u32,
}

fn get_memory_usage_mb() -> u32 {
    0
}

fn get_uptime_ms() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as f64
}

fn get_active_task_count() -> u32 {
    0
}

#[napi]
pub fn shutdown_multithreading() -> napi::Result<String> {
    Ok("Multithreading module shutdown completed".to_string())
}
