use napi::bindgen_prelude::*;
use napi_derive::napi;
use thread_local::ThreadLocal;
use std::sync::Arc;
use std::cell::RefCell;
use parking_lot::Mutex;
use std::collections::HashMap;

#[napi]
pub struct ThreadLocalStorage {
    storage: Arc<ThreadLocal<RefCell<String>>>,
    default_value: String,
}

#[napi]
impl ThreadLocalStorage {
    #[napi(constructor)]
    pub fn new(default_value: String) -> Self {
        Self {
            storage: Arc::new(ThreadLocal::new()),
            default_value,
        }
    }

    #[napi]
    pub fn get(&self) -> String {
        self.storage
            .get_or(|| RefCell::new(self.default_value.clone()))
            .borrow()
            .clone()
    }

    #[napi]
    pub fn set(&self, value: String) {
        let cell = self.storage
            .get_or(|| RefCell::new(self.default_value.clone()));
        *cell.borrow_mut() = value;
    }

    #[napi]
    pub fn update(&self, updater: String) -> String {
        let cell = self.storage
            .get_or(|| RefCell::new(self.default_value.clone()));
        let mut current = cell.borrow_mut();
        current.push_str(&updater);
        current.clone()
    }

    #[napi]
    pub fn clear(&self) {
        if let Some(cell) = self.storage.get() {
            *cell.borrow_mut() = self.default_value.clone();
        }
    }

    #[napi]
    pub fn iter_values(&self) -> Vec<String> {
        // Note: This is a simplified implementation since RefCell<String> is not Sync
        // In a production system, you'd use Arc<Mutex<String>> or other thread-safe types
        vec![self.get()]
    }
}

#[napi]
pub struct ThreadLocalMap {
    storage: Arc<ThreadLocal<RefCell<HashMap<String, String>>>>,
}

#[napi]
impl ThreadLocalMap {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            storage: Arc::new(ThreadLocal::new()),
        }
    }

    #[napi]
    pub fn get(&self, key: String) -> Option<String> {
        self.storage
            .get_or(|| RefCell::new(HashMap::new()))
            .borrow()
            .get(&key)
            .cloned()
    }

    #[napi]
    pub fn set(&self, key: String, value: String) {
        self.storage
            .get_or(|| RefCell::new(HashMap::new()))
            .borrow_mut()
            .insert(key, value);
    }

    #[napi]
    pub fn remove(&self, key: String) -> Option<String> {
        self.storage
            .get_or(|| RefCell::new(HashMap::new()))
            .borrow_mut()
            .remove(&key)
    }

    #[napi]
    pub fn contains_key(&self, key: String) -> bool {
        self.storage
            .get_or(|| RefCell::new(HashMap::new()))
            .borrow()
            .contains_key(&key)
    }

    #[napi]
    pub fn keys(&self) -> Vec<String> {
        self.storage
            .get_or(|| RefCell::new(HashMap::new()))
            .borrow()
            .keys()
            .cloned()
            .collect()
    }

    #[napi]
    pub fn values(&self) -> Vec<String> {
        self.storage
            .get_or(|| RefCell::new(HashMap::new()))
            .borrow()
            .values()
            .cloned()
            .collect()
    }

    #[napi]
    pub fn clear(&self) {
        if let Some(map) = self.storage.get() {
            map.borrow_mut().clear();
        }
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.storage
            .get_or(|| RefCell::new(HashMap::new()))
            .borrow()
            .len() as u32
    }
}

#[napi]
pub struct ThreadLocalCounter {
    storage: Arc<ThreadLocal<RefCell<i64>>>,
    initial_value: i64,
}

#[napi]
impl ThreadLocalCounter {
    #[napi(constructor)]
    pub fn new(initial_value: i64) -> Self {
        Self {
            storage: Arc::new(ThreadLocal::new()),
            initial_value,
        }
    }

    #[napi]
    pub fn get(&self) -> i64 {
        self.storage
            .get_or(|| RefCell::new(self.initial_value))
            .borrow()
            .clone()
    }

    #[napi]
    pub fn increment(&self) -> i64 {
        let cell = self.storage
            .get_or(|| RefCell::new(self.initial_value));
        let mut value = cell.borrow_mut();
        *value += 1;
        *value
    }

    #[napi]
    pub fn decrement(&self) -> i64 {
        let cell = self.storage
            .get_or(|| RefCell::new(self.initial_value));
        let mut value = cell.borrow_mut();
        *value -= 1;
        *value
    }

    #[napi]
    pub fn add(&self, amount: i64) -> i64 {
        let cell = self.storage
            .get_or(|| RefCell::new(self.initial_value));
        let mut value = cell.borrow_mut();
        *value += amount;
        *value
    }

    #[napi]
    pub fn reset(&self) {
        if let Some(cell) = self.storage.get() {
            *cell.borrow_mut() = self.initial_value;
        }
    }

    #[napi]
    pub fn get_all_values(&self) -> Vec<i64> {
        // Note: This is a simplified implementation since RefCell<i64> is not Sync
        // In a real implementation, you'd use Arc<Mutex<i64>> or atomic types
        vec![self.get()]
    }

    #[napi]
    pub fn sum_all(&self) -> i64 {
        // Note: This is a simplified implementation since RefCell<i64> is not Sync
        // In a real implementation, you'd use Arc<Mutex<i64>> or atomic types
        self.get()
    }
}

#[napi]
pub struct ThreadId {
    id: String,
}

#[napi]
impl ThreadId {
    #[napi]
    pub fn current() -> Self {
        Self {
            id: format!("{:?}", std::thread::current().id()),
        }
    }

    #[napi]
    pub fn get_id(&self) -> String {
        self.id.clone()
    }

    #[napi]
    pub fn get_name() -> Option<String> {
        std::thread::current().name().map(String::from)
    }

    #[napi]
    pub fn set_name(name: String) -> Result<()> {
        // Note: Can only set name for current thread at creation time in Rust
        // This is a limitation we document
        Err(Error::from_reason(
            "Thread names can only be set at thread creation time in Rust"
        ))
    }
}

// Global thread registry for tracking threads
lazy_static::lazy_static! {
    static ref THREAD_REGISTRY: Arc<Mutex<HashMap<String, String>>> = 
        Arc::new(Mutex::new(HashMap::new()));
}

#[napi]
pub fn register_current_thread(name: String) {
    let thread_id = format!("{:?}", std::thread::current().id());
    THREAD_REGISTRY.lock().insert(thread_id, name);
}

#[napi]
pub fn unregister_current_thread() {
    let thread_id = format!("{:?}", std::thread::current().id());
    THREAD_REGISTRY.lock().remove(&thread_id);
}

#[napi]
pub fn get_all_thread_names() -> Vec<Vec<String>> {
    THREAD_REGISTRY.lock()
        .iter()
        .map(|(id, name)| vec![id.clone(), name.clone()])
        .collect()
}

#[napi]
pub fn create_thread_local_storage(default_value: String) -> ThreadLocalStorage {
    ThreadLocalStorage::new(default_value)
}

#[napi]
pub fn create_thread_local_map() -> ThreadLocalMap {
    ThreadLocalMap::new()
}

#[napi]
pub fn create_thread_local_counter(initial_value: i64) -> ThreadLocalCounter {
    ThreadLocalCounter::new(initial_value)
}