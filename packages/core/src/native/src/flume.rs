use napi::bindgen_prelude::*;
use napi_derive::napi;
use flume;
use std::sync::Arc;
use std::time::Duration;

#[napi]
pub struct FlumeChannel {
    sender: Arc<flume::Sender<String>>,
    receiver: Arc<flume::Receiver<String>>,
}

#[napi]
impl FlumeChannel {
    #[napi(constructor)]
    pub fn unbounded() -> Self {
        let (sender, receiver) = flume::unbounded();
        Self {
            sender: Arc::new(sender),
            receiver: Arc::new(receiver),
        }
    }

    #[napi(factory)]
    pub fn bounded(capacity: u32) -> Self {
        let (sender, receiver) = flume::bounded(capacity as usize);
        Self {
            sender: Arc::new(sender),
            receiver: Arc::new(receiver),
        }
    }

    #[napi]
    pub fn send(&self, message: String) -> Result<()> {
        self.sender.send(message)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn try_send(&self, message: String) -> Result<bool> {
        match self.sender.try_send(message) {
            Ok(()) => Ok(true),
            Err(flume::TrySendError::Full(_)) => Ok(false),
            Err(e) => Err(Error::from_reason(e.to_string())),
        }
    }

    #[napi]
    pub async fn send_async(&self, message: String) -> Result<()> {
        self.sender.send_async(message).await
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn recv(&self) -> Result<Option<String>> {
        match self.receiver.recv() {
            Ok(msg) => Ok(Some(msg)),
            Err(flume::RecvError::Disconnected) => Ok(None),
        }
    }

    #[napi]
    pub fn try_recv(&self) -> Result<Option<String>> {
        match self.receiver.try_recv() {
            Ok(msg) => Ok(Some(msg)),
            Err(flume::TryRecvError::Empty) => Ok(None),
            Err(flume::TryRecvError::Disconnected) => Ok(None),
        }
    }

    #[napi]
    pub async fn recv_async(&self) -> Result<Option<String>> {
        match self.receiver.recv_async().await {
            Ok(msg) => Ok(Some(msg)),
            Err(flume::RecvError::Disconnected) => Ok(None),
        }
    }

    #[napi]
    pub fn recv_timeout(&self, timeout_ms: u32) -> Result<Option<String>> {
        match self.receiver.recv_timeout(Duration::from_millis(timeout_ms as u64)) {
            Ok(msg) => Ok(Some(msg)),
            Err(flume::RecvTimeoutError::Timeout) => Ok(None),
            Err(flume::RecvTimeoutError::Disconnected) => Ok(None),
        }
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.receiver.len() as u32
    }

    #[napi]
    pub fn is_empty(&self) -> bool {
        self.receiver.is_empty()
    }

    #[napi]
    pub fn is_full(&self) -> bool {
        self.receiver.is_full()
    }

    #[napi]
    pub fn capacity(&self) -> Option<u32> {
        self.receiver.capacity().map(|c| c as u32)
    }

    #[napi]
    pub fn sender_count(&self) -> u32 {
        self.sender.sender_count() as u32
    }

    #[napi]
    pub fn receiver_count(&self) -> u32 {
        self.receiver.receiver_count() as u32
    }

    #[napi]
    pub fn drain(&self) -> Vec<String> {
        self.receiver.drain().collect()
    }

    #[napi]
    pub fn clone_sender(&self) -> FlumeSender {
        FlumeSender {
            inner: Arc::clone(&self.sender),
        }
    }

    #[napi]
    pub fn clone_receiver(&self) -> FlumeReceiver {
        FlumeReceiver {
            inner: Arc::clone(&self.receiver),
        }
    }
}

#[napi]
pub struct FlumeSender {
    inner: Arc<flume::Sender<String>>,
}

#[napi]
impl FlumeSender {
    #[napi]
    pub fn send(&self, message: String) -> Result<()> {
        self.inner.send(message)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn try_send(&self, message: String) -> Result<bool> {
        match self.inner.try_send(message) {
            Ok(()) => Ok(true),
            Err(flume::TrySendError::Full(_)) => Ok(false),
            Err(e) => Err(Error::from_reason(e.to_string())),
        }
    }

    #[napi]
    pub async fn send_async(&self, message: String) -> Result<()> {
        self.inner.send_async(message).await
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn is_disconnected(&self) -> bool {
        self.inner.is_disconnected()
    }

    #[napi]
    pub fn sender_count(&self) -> u32 {
        self.inner.sender_count() as u32
    }
}

#[napi]
pub struct FlumeReceiver {
    inner: Arc<flume::Receiver<String>>,
}

#[napi]
impl FlumeReceiver {
    #[napi]
    pub fn recv(&self) -> Result<Option<String>> {
        match self.inner.recv() {
            Ok(msg) => Ok(Some(msg)),
            Err(flume::RecvError::Disconnected) => Ok(None),
        }
    }

    #[napi]
    pub fn try_recv(&self) -> Result<Option<String>> {
        match self.inner.try_recv() {
            Ok(msg) => Ok(Some(msg)),
            Err(flume::TryRecvError::Empty) => Ok(None),
            Err(flume::TryRecvError::Disconnected) => Ok(None),
        }
    }

    #[napi]
    pub async fn recv_async(&self) -> Result<Option<String>> {
        match self.inner.recv_async().await {
            Ok(msg) => Ok(Some(msg)),
            Err(flume::RecvError::Disconnected) => Ok(None),
        }
    }

    #[napi]
    pub fn recv_timeout(&self, timeout_ms: u32) -> Result<Option<String>> {
        match self.inner.recv_timeout(Duration::from_millis(timeout_ms as u64)) {
            Ok(msg) => Ok(Some(msg)),
            Err(flume::RecvTimeoutError::Timeout) => Ok(None),
            Err(flume::RecvTimeoutError::Disconnected) => Ok(None),
        }
    }

    #[napi]
    pub fn is_disconnected(&self) -> bool {
        self.inner.is_disconnected()
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.inner.len() as u32
    }

    #[napi]
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }

    #[napi]
    pub fn drain(&self) -> Vec<String> {
        self.inner.drain().collect()
    }
}

#[napi]
pub struct FlumeSelector {
    receivers: Vec<Arc<flume::Receiver<String>>>,
}

#[napi]
impl FlumeSelector {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            receivers: Vec::new(),
        }
    }

    #[napi]
    pub fn add_receiver(&mut self, receiver: &FlumeReceiver) {
        self.receivers.push(Arc::clone(&receiver.inner));
    }

    #[napi]
    pub fn select(&self) -> Result<Option<SelectResult>> {
        if self.receivers.is_empty() {
            return Ok(None);
        }

        // Note: Simplified implementation due to flume API changes
        // In a production system, you'd implement proper multi-channel selection
        if let Some(receiver) = self.receivers.first() {
            match receiver.recv() {
                Ok(msg) => Ok(Some(SelectResult {
                    channel_index: 0,
                    message: msg,
                })),
                Err(_) => Ok(None),
            }
        } else {
            Ok(None)
        }
    }

    #[napi]
    pub fn try_select(&self) -> Result<Option<SelectResult>> {
        if self.receivers.is_empty() {
            return Ok(None);
        }

        // Note: Simplified implementation due to flume API changes
        // In a production system, you'd implement proper multi-channel selection
        if let Some(receiver) = self.receivers.first() {
            match receiver.try_recv() {
                Ok(msg) => Ok(Some(SelectResult {
                    channel_index: 0,
                    message: msg,
                })),
                Err(_) => Ok(None),
            }
        } else {
            Ok(None)
        }
    }
}

#[napi(object)]
pub struct SelectResult {
    pub channel_index: u32,
    pub message: String,
}

#[napi]
pub fn create_flume_unbounded() -> FlumeChannel {
    FlumeChannel::unbounded()
}

#[napi]
pub fn create_flume_bounded(capacity: u32) -> FlumeChannel {
    FlumeChannel::bounded(capacity)
}

#[napi]
pub fn create_flume_selector() -> FlumeSelector {
    FlumeSelector::new()
}