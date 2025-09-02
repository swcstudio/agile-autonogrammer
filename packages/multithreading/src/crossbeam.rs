use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use crossbeam::channel::{self, Receiver, Sender};
use crossbeam::atomic::AtomicCell;
use crossbeam::queue::{ArrayQueue, SegQueue};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

#[napi]
pub struct CrossbeamChannel {
    sender: Arc<Sender<String>>,
    receiver: Arc<Receiver<String>>,
}

#[napi]
impl CrossbeamChannel {
    #[napi(constructor)]
    pub fn new(bounded: Option<u32>) -> Self {
        let (sender, receiver) = match bounded {
            Some(size) => channel::bounded(size as usize),
            None => channel::unbounded(),
        };

        CrossbeamChannel {
            sender: Arc::new(sender),
            receiver: Arc::new(receiver),
        }
    }

    #[napi]
    pub fn send(&self, message: String) -> Result<bool> {
        match self.sender.try_send(message) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    #[napi]
    pub fn receive(&self) -> Result<Option<String>> {
        match self.receiver.try_recv() {
            Ok(message) => Ok(Some(message)),
            Err(_) => Ok(None),
        }
    }


    #[napi]
    pub fn is_empty(&self) -> bool {
        self.receiver.is_empty()
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.receiver.len() as u32
    }
}

#[napi]
pub struct CrossbeamAtomicCell {
    cell: Arc<AtomicCell<i32>>,
}

#[napi]
impl CrossbeamAtomicCell {
    #[napi(constructor)]
    pub fn new(initial_value: i32) -> Self {
        CrossbeamAtomicCell {
            cell: Arc::new(AtomicCell::new(initial_value)),
        }
    }

    #[napi]
    pub fn load(&self) -> i32 {
        self.cell.load()
    }

    #[napi]
    pub fn store(&self, value: i32) {
        self.cell.store(value);
    }

    #[napi]
    pub fn swap(&self, value: i32) -> i32 {
        self.cell.swap(value)
    }

    #[napi]
    pub fn compare_exchange(&self, current: i32, new: i32) -> Result<bool> {
        match self.cell.compare_exchange(current, new) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    #[napi]
    pub fn fetch_add(&self, value: i32) -> i32 {
        let current = self.cell.load();
        self.cell.store(current + value);
        current
    }

    #[napi]
    pub fn fetch_sub(&self, value: i32) -> i32 {
        let current = self.cell.load();
        self.cell.store(current - value);
        current
    }
}

#[napi]
pub struct CrossbeamArrayQueue {
    queue: Arc<ArrayQueue<String>>,
}

#[napi]
impl CrossbeamArrayQueue {
    #[napi(constructor)]
    pub fn new(capacity: u32) -> Self {
        CrossbeamArrayQueue {
            queue: Arc::new(ArrayQueue::new(capacity as usize)),
        }
    }

    #[napi]
    pub fn push(&self, item: String) -> bool {
        self.queue.push(item).is_ok()
    }

    #[napi]
    pub fn pop(&self) -> Option<String> {
        self.queue.pop()
    }

    #[napi]
    pub fn is_empty(&self) -> bool {
        self.queue.is_empty()
    }

    #[napi]
    pub fn is_full(&self) -> bool {
        self.queue.is_full()
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.queue.len() as u32
    }

    #[napi]
    pub fn capacity(&self) -> u32 {
        self.queue.capacity() as u32
    }
}

#[napi]
pub struct CrossbeamSegQueue {
    queue: Arc<SegQueue<String>>,
}

#[napi]
impl CrossbeamSegQueue {
    #[napi(constructor)]
    pub fn new() -> Self {
        CrossbeamSegQueue {
            queue: Arc::new(SegQueue::new()),
        }
    }

    #[napi]
    pub fn push(&self, item: String) {
        self.queue.push(item);
    }

    #[napi]
    pub fn pop(&self) -> Option<String> {
        self.queue.pop()
    }

    #[napi]
    pub fn is_empty(&self) -> bool {
        self.queue.is_empty()
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.queue.len() as u32
    }
}
