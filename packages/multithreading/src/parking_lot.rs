use napi::bindgen_prelude::*;
use napi_derive::napi;
use parking_lot::{
    Mutex as PLMutex, RwLock as PLRwLock, Condvar, Once, OnceState,
    FairMutex, ReentrantMutex
};
use std::sync::Arc;
use std::time::Duration;
use std::cell::RefCell;

#[napi]
pub struct Mutex {
    inner: Arc<PLMutex<String>>,
}

#[napi]
impl Mutex {
    #[napi(constructor)]
    pub fn new(initial_value: String) -> Self {
        Self {
            inner: Arc::new(PLMutex::new(initial_value)),
        }
    }

    #[napi]
    pub fn lock(&self) -> Result<String> {
        Ok(self.inner.lock().clone())
    }

    #[napi]
    pub fn try_lock(&self) -> Result<Option<String>> {
        match self.inner.try_lock() {
            Some(guard) => Ok(Some(guard.clone())),
            None => Ok(None),
        }
    }

    #[napi]
    pub fn lock_timeout(&self, timeout_ms: u32) -> Result<Option<String>> {
        match self.inner.try_lock_for(Duration::from_millis(timeout_ms as u64)) {
            Some(guard) => Ok(Some(guard.clone())),
            None => Ok(None),
        }
    }

    #[napi]
    pub fn set(&self, value: String) -> Result<()> {
        *self.inner.lock() = value;
        Ok(())
    }

    #[napi]
    pub fn is_locked(&self) -> bool {
        self.inner.is_locked()
    }
}

#[napi]
pub struct RwLock {
    inner: Arc<PLRwLock<String>>,
}

#[napi]
impl RwLock {
    #[napi(constructor)]
    pub fn new(initial_value: String) -> Self {
        Self {
            inner: Arc::new(PLRwLock::new(initial_value)),
        }
    }

    #[napi]
    pub fn read(&self) -> Result<String> {
        Ok(self.inner.read().clone())
    }

    #[napi]
    pub fn write(&self, value: String) -> Result<()> {
        *self.inner.write() = value;
        Ok(())
    }

    #[napi]
    pub fn try_read(&self) -> Result<Option<String>> {
        match self.inner.try_read() {
            Some(guard) => Ok(Some(guard.clone())),
            None => Ok(None),
        }
    }

    #[napi]
    pub fn try_write(&self, value: String) -> Result<bool> {
        match self.inner.try_write() {
            Some(mut guard) => {
                *guard = value;
                Ok(true)
            }
            None => Ok(false),
        }
    }

    #[napi]
    pub fn read_timeout(&self, timeout_ms: u32) -> Result<Option<String>> {
        match self.inner.try_read_for(Duration::from_millis(timeout_ms as u64)) {
            Some(guard) => Ok(Some(guard.clone())),
            None => Ok(None),
        }
    }

    #[napi]
    pub fn write_timeout(&self, value: String, timeout_ms: u32) -> Result<bool> {
        match self.inner.try_write_for(Duration::from_millis(timeout_ms as u64)) {
            Some(mut guard) => {
                *guard = value;
                Ok(true)
            }
            None => Ok(false),
        }
    }

    #[napi]
    pub fn reader_count(&self) -> u32 {
        // Note: reader_count() is not available in current parking_lot version
        // This is a simplified implementation
        0u32
    }

    #[napi]
    pub fn is_locked(&self) -> bool {
        self.inner.is_locked()
    }

    #[napi]
    pub fn is_locked_exclusive(&self) -> bool {
        self.inner.is_locked_exclusive()
    }
}

#[napi]
pub struct FairMutexWrapper {
    inner: Arc<FairMutex<String>>,
}

#[napi]
impl FairMutexWrapper {
    #[napi(constructor)]
    pub fn new(initial_value: String) -> Self {
        Self {
            inner: Arc::new(FairMutex::new(initial_value)),
        }
    }

    #[napi]
    pub fn lock(&self) -> Result<String> {
        Ok(self.inner.lock().clone())
    }

    #[napi]
    pub fn try_lock(&self) -> Result<Option<String>> {
        match self.inner.try_lock() {
            Some(guard) => Ok(Some(guard.clone())),
            None => Ok(None),
        }
    }

    #[napi]
    pub fn set(&self, value: String) -> Result<()> {
        *self.inner.lock() = value;
        Ok(())
    }

    #[napi]
    pub fn is_locked(&self) -> bool {
        self.inner.is_locked()
    }
}

#[napi]
pub struct OnceCell {
    inner: Arc<PLMutex<Option<String>>>,
    once: Arc<Once>,
}

#[napi]
impl OnceCell {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(PLMutex::new(None)),
            once: Arc::new(Once::new()),
        }
    }

    #[napi]
    pub fn get(&self) -> Option<String> {
        self.inner.lock().clone()
    }

    #[napi]
    pub fn set(&self, value: String) -> Result<bool> {
        let mut was_set = false;
        self.once.call_once(|| {
            *self.inner.lock() = Some(value.clone());
            was_set = true;
        });
        Ok(was_set)
    }

    #[napi]
    pub fn get_or_init(&self, init_value: String) -> String {
        self.once.call_once(|| {
            *self.inner.lock() = Some(init_value.clone());
        });
        self.inner.lock().as_ref().unwrap().clone()
    }

    #[napi]
    pub fn is_initialized(&self) -> bool {
        self.once.state() == OnceState::Done
    }
}

#[napi]
pub struct Barrier {
    inner: Arc<std::sync::Barrier>,
}

#[napi]
impl Barrier {
    #[napi(constructor)]
    pub fn new(n: u32) -> Self {
        Self {
            inner: Arc::new(std::sync::Barrier::new(n as usize)),
        }
    }

    #[napi]
    pub fn wait(&self) -> bool {
        self.inner.wait().is_leader()
    }
}

#[napi]
pub struct Semaphore {
    inner: Arc<tokio::sync::Semaphore>,
}

#[napi]
impl Semaphore {
    #[napi(constructor)]
    pub fn new(permits: u32) -> Self {
        Self {
            inner: Arc::new(tokio::sync::Semaphore::new(permits as usize)),
        }
    }

    #[napi]
    pub async fn acquire(&self) -> Result<()> {
        let _permit = self.inner.acquire().await
            .map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(())
    }

    #[napi]
    pub fn try_acquire(&self) -> Result<bool> {
        match self.inner.try_acquire() {
            Ok(_permit) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    #[napi]
    pub fn available_permits(&self) -> u32 {
        self.inner.available_permits() as u32
    }

    #[napi]
    pub fn release(&self, n: u32) {
        self.inner.add_permits(n as usize);
    }
}

#[napi]
pub fn create_parking_lot_mutex(initial_value: String) -> Mutex {
    Mutex::new(initial_value)
}

#[napi]
pub fn create_parking_lot_rwlock(initial_value: String) -> RwLock {
    RwLock::new(initial_value)
}

#[napi]
pub fn create_fair_mutex(initial_value: String) -> FairMutexWrapper {
    FairMutexWrapper::new(initial_value)
}

#[napi]
pub fn create_once_cell() -> OnceCell {
    OnceCell::new()
}

#[napi]
pub fn create_barrier(n: u32) -> Barrier {
    Barrier::new(n)
}

#[napi]
pub fn create_semaphore(permits: u32) -> Semaphore {
    Semaphore::new(permits)
}