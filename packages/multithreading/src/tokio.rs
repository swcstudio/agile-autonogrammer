use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use tokio::runtime::{Runtime, Builder};
use tokio::sync::{mpsc, broadcast};
use tokio::time::{sleep, timeout, Duration, Instant};
use tokio::task::spawn_blocking;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokioRuntimeConfig {
    pub worker_threads: Option<u32>,
    pub max_blocking_threads: Option<u32>,
    pub thread_name: Option<String>,
    pub thread_stack_size: Option<u32>,
    pub enable_io: Option<bool>,
    pub enable_time: Option<bool>,
}

#[napi]
pub struct TokioRuntime {
    runtime: Arc<Runtime>,
}

#[napi]
impl TokioRuntime {
    #[napi(constructor)]
    pub fn new(config: Option<TokioRuntimeConfig>) -> Self {
        let mut builder = Builder::new_multi_thread();

        if let Some(cfg) = config {
            if let Some(worker_threads) = cfg.worker_threads {
                builder.worker_threads(worker_threads as usize);
            }
            if let Some(max_blocking_threads) = cfg.max_blocking_threads {
                builder.max_blocking_threads(max_blocking_threads as usize);
            }
            if let Some(thread_name) = cfg.thread_name {
                builder.thread_name(thread_name);
            }
            if let Some(thread_stack_size) = cfg.thread_stack_size {
                builder.thread_stack_size(thread_stack_size as usize);
            }
            if cfg.enable_io.unwrap_or(true) {
                builder.enable_io();
            }
            if cfg.enable_time.unwrap_or(true) {
                builder.enable_time();
            }
        }

        let runtime = builder.enable_all().build().unwrap_or_else(|_| {
            Builder::new_multi_thread().enable_all().build().unwrap()
        });

        TokioRuntime {
            runtime: Arc::new(runtime),
        }
    }


}

#[napi]
pub struct TokioMpscChannel {
    sender: Arc<tokio::sync::Mutex<mpsc::UnboundedSender<String>>>,
    receiver: Arc<tokio::sync::Mutex<Option<mpsc::UnboundedReceiver<String>>>>,
}

#[napi]
impl TokioMpscChannel {
    #[napi(constructor)]
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();
        TokioMpscChannel {
            sender: Arc::new(tokio::sync::Mutex::new(sender)),
            receiver: Arc::new(tokio::sync::Mutex::new(Some(receiver))),
        }
    }


}

#[napi]
pub struct TokioBroadcastChannel {
    sender: Arc<broadcast::Sender<String>>,
}

#[napi]
impl TokioBroadcastChannel {
    #[napi(constructor)]
    pub fn new(capacity: u32) -> Self {
        let (sender, _) = broadcast::channel(capacity as usize);
        TokioBroadcastChannel {
            sender: Arc::new(sender),
        }
    }

    #[napi]
    pub fn send(&self, message: String) -> Result<u32> {
        match self.sender.send(message) {
            Ok(receiver_count) => Ok(receiver_count as u32),
            Err(_) => Err(Error::from_reason("No receivers available")),
        }
    }


    #[napi]
    pub fn receiver_count(&self) -> u32 {
        self.sender.receiver_count() as u32
    }
}

pub struct TokioDelayTask {
    duration_ms: u64,
    message: String,
}

impl Task for TokioDelayTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<Self::Output> {
        let rt = tokio::runtime::Runtime::new().map_err(|e| {
            Error::from_reason(format!("Failed to create runtime: {}", e))
        })?;

        let message = self.message.clone();
        let duration = Duration::from_millis(self.duration_ms);

        let result = rt.block_on(async move {
            sleep(duration).await;
            format!("Delayed message after {}ms: {}", duration.as_millis(), message)
        });

        Ok(result)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn tokio_delay(duration_ms: u32, message: String) -> AsyncTask<TokioDelayTask> {
    AsyncTask::new(TokioDelayTask {
        duration_ms: duration_ms as u64,
        message,
    })
}

pub struct TokioTimeoutTask {
    duration_ms: u64,
    timeout_ms: u64,
    operation: String,
}

impl Task for TokioTimeoutTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<Self::Output> {
        let rt = tokio::runtime::Runtime::new().map_err(|e| {
            Error::from_reason(format!("Failed to create runtime: {}", e))
        })?;

        let duration = Duration::from_millis(self.duration_ms);
        let timeout_duration = Duration::from_millis(self.timeout_ms);
        let operation = self.operation.clone();
        let operation_clone = operation.clone();

        let result = rt.block_on(async move {
            let task = async move {
                sleep(duration).await;
                format!("Operation '{}' completed after {}ms", operation_clone, duration.as_millis())
            };

            match timeout(timeout_duration, task).await {
                Ok(result) => result,
                Err(_) => format!("Operation '{}' timed out after {}ms", operation, timeout_duration.as_millis()),
            }
        });

        Ok(result)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn tokio_timeout(
    duration_ms: u32,
    timeout_ms: u32,
    operation: String,
) -> AsyncTask<TokioTimeoutTask> {
    AsyncTask::new(TokioTimeoutTask {
        duration_ms: duration_ms as u64,
        timeout_ms: timeout_ms as u64,
        operation,
    })
}

pub struct TokioParallelTask {
    tasks: Vec<String>,
    delay_ms: u64,
}

impl Task for TokioParallelTask {
    type Output = Vec<String>;
    type JsValue = Vec<String>;

    fn compute(&mut self) -> Result<Self::Output> {
        let rt = tokio::runtime::Runtime::new().map_err(|e| {
            Error::from_reason(format!("Failed to create runtime: {}", e))
        })?;

        let tasks = self.tasks.clone();
        let delay = Duration::from_millis(self.delay_ms);

        let result = rt.block_on(async move {
            let futures: Vec<_> = tasks
                .into_iter()
                .enumerate()
                .map(|(i, task)| {
                    let task_delay = delay + Duration::from_millis(i as u64 * 50);
                    async move {
                        sleep(task_delay).await;
                        format!("Task '{}' completed after {}ms", task, task_delay.as_millis())
                    }
                })
                .collect();

            futures::future::join_all(futures).await
        });

        Ok(result)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn tokio_parallel_tasks(
    tasks: Vec<String>,
    delay_ms: u32,
) -> AsyncTask<TokioParallelTask> {
    AsyncTask::new(TokioParallelTask {
        tasks,
        delay_ms: delay_ms as u64,
    })
}

#[napi]
pub struct TokioTimer {
    start_time: Instant,
}

#[napi]
impl TokioTimer {
    #[napi(constructor)]
    pub fn new() -> Self {
        TokioTimer {
            start_time: Instant::now(),
        }
    }

    #[napi]
    pub fn elapsed_ms(&self) -> f64 {
        self.start_time.elapsed().as_millis() as f64
    }

    #[napi]
    pub fn reset(&mut self) {
        self.start_time = Instant::now();
    }

}



#[napi]
pub fn get_tokio_runtime_metrics() -> Result<String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| {
        Error::from_reason(format!("Failed to create runtime: {}", e))
    })?;

    let metrics = rt.block_on(async {
        format!(
            "Tokio runtime active - worker threads available, async tasks can be spawned"
        )
    });

    Ok(metrics)
}
