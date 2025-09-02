use async_channel::{bounded, unbounded, Receiver, Sender};
use dashmap::DashMap;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::any::Any;
use std::collections::HashMap;
use std::fmt::Debug;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::task::JoinHandle;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

// Global actor system instance
lazy_static::lazy_static! {
    static ref ACTOR_SYSTEM: Arc<RwLock<Option<Arc<ActorSystem>>>> = Arc::new(RwLock::new(None));
}

// Actor ID type
#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct ActorId(String);

impl ActorId {
    pub fn new() -> Self {
        ActorId(Uuid::new_v4().to_string())
    }

    pub fn from_string(s: String) -> Self {
        ActorId(s)
    }
}

// Message types that actors can receive
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    Call { id: u64, payload: Vec<u8> },
    Cast { payload: Vec<u8> },
    Info { payload: Vec<u8> },
    Stop,
    Link(ActorId),
    Unlink(ActorId),
    Monitor(ActorId),
    Demonitor(ActorId),
    Exit { from: ActorId, reason: String },
}

// Actor state
#[derive(Debug, Clone, PartialEq)]
pub enum ActorState {
    Starting,
    Running,
    Stopping,
    Stopped,
    Failed(String),
}

// Actor behavior trait
#[async_trait::async_trait]
pub trait ActorBehavior: Send + Sync + 'static {
    async fn handle_message(&mut self, msg: Message) -> Option<Vec<u8>>;
    async fn on_start(&mut self) {}
    async fn on_stop(&mut self) {}
}

// Core actor structure
pub struct Actor {
    id: ActorId,
    state: Arc<RwLock<ActorState>>,
    mailbox: Receiver<Message>,
    sender: Sender<Message>,
    behavior: Box<dyn ActorBehavior>,
    links: Arc<RwLock<Vec<ActorId>>>,
    monitors: Arc<RwLock<Vec<ActorId>>>,
    call_counter: Arc<AtomicU64>,
    pending_calls: Arc<DashMap<u64, Sender<Vec<u8>>>>,
    running: Arc<AtomicBool>,
}

impl Actor {
    pub fn new(behavior: Box<dyn ActorBehavior>, bounded_size: Option<usize>) -> Self {
        let (sender, receiver) = match bounded_size {
            Some(size) => bounded(size),
            None => unbounded(),
        };

        Actor {
            id: ActorId::new(),
            state: Arc::new(RwLock::new(ActorState::Starting)),
            mailbox: receiver,
            sender,
            behavior,
            links: Arc::new(RwLock::new(Vec::new())),
            monitors: Arc::new(RwLock::new(Vec::new())),
            call_counter: Arc::new(AtomicU64::new(0)),
            pending_calls: Arc::new(DashMap::new()),
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn id(&self) -> ActorId {
        self.id.clone()
    }

    pub fn sender(&self) -> Sender<Message> {
        self.sender.clone()
    }

    pub async fn start(mut self) -> JoinHandle<()> {
        let id = self.id.clone();
        let state = self.state.clone();
        let running = self.running.clone();

        running.store(true, Ordering::SeqCst);
        *state.write() = ActorState::Running;

        tokio::spawn(async move {
            info!("Actor {:?} starting", id);
            self.behavior.on_start().await;

            while running.load(Ordering::SeqCst) {
                match self.mailbox.recv().await {
                    Ok(msg) => {
                        debug!("Actor {:?} received message: {:?}", id, msg);
                        match msg {
                            Message::Stop => {
                                running.store(false, Ordering::SeqCst);
                                break;
                            }
                            Message::Call { id: call_id, .. } => {
                                if let Some(response) = self.behavior.handle_message(msg).await {
                                    if let Some(sender) = self.pending_calls.get(&call_id) {
                                        let _ = sender.send(response).await;
                                    }
                                }
                            }
                            _ => {
                                self.behavior.handle_message(msg).await;
                            }
                        }
                    }
                    Err(e) => {
                        error!("Actor {:?} mailbox error: {:?}", id, e);
                        break;
                    }
                }
            }

            *state.write() = ActorState::Stopping;
            self.behavior.on_stop().await;
            *state.write() = ActorState::Stopped;
            info!("Actor {:?} stopped", id);
        })
    }

    pub async fn call(&self, payload: Vec<u8>, timeout: Duration) -> Result<Vec<u8>> {
        let call_id = self.call_counter.fetch_add(1, Ordering::SeqCst);
        let (response_tx, response_rx) = bounded(1);
        
        self.pending_calls.insert(call_id, response_tx);
        
        self.sender
            .send(Message::Call { id: call_id, payload })
            .await
            .map_err(|e| Error::from_reason(format!("Failed to send call: {}", e)))?;

        match tokio::time::timeout(timeout, response_rx.recv()).await {
            Ok(Ok(response)) => {
                self.pending_calls.remove(&call_id);
                Ok(response)
            }
            Ok(Err(e)) => {
                self.pending_calls.remove(&call_id);
                Err(Error::from_reason(format!("Call response error: {}", e)))
            }
            Err(_) => {
                self.pending_calls.remove(&call_id);
                Err(Error::from_reason("Call timeout"))
            }
        }
    }

    pub async fn cast(&self, payload: Vec<u8>) -> Result<()> {
        self.sender
            .send(Message::Cast { payload })
            .await
            .map_err(|e| Error::from_reason(format!("Failed to send cast: {}", e)))
    }
}

// Actor System manages all actors
pub struct ActorSystem {
    actors: Arc<DashMap<ActorId, Arc<Actor>>>,
    registry: Arc<DashMap<String, ActorId>>,
    supervisor_tree: Arc<RwLock<petgraph::Graph<ActorId, ()>>>,
}

impl ActorSystem {
    pub fn new() -> Self {
        ActorSystem {
            actors: Arc::new(DashMap::new()),
            registry: Arc::new(DashMap::new()),
            supervisor_tree: Arc::new(RwLock::new(petgraph::Graph::new())),
        }
    }

    pub fn spawn(&self, behavior: Box<dyn ActorBehavior>) -> ActorId {
        let actor = Actor::new(behavior, None);
        let id = actor.id();
        let actor = Arc::new(actor);
        
        self.actors.insert(id.clone(), actor.clone());
        
        let actor_clone = Arc::clone(&actor);
        tokio::spawn(async move {
            let _ = actor_clone.clone().start().await;
        });
        
        id
    }

    pub fn register(&self, name: String, actor_id: ActorId) -> Result<()> {
        if self.registry.contains_key(&name) {
            return Err(Error::from_reason(format!("Name {} already registered", name)));
        }
        self.registry.insert(name, actor_id);
        Ok(())
    }

    pub fn whereis(&self, name: &str) -> Option<ActorId> {
        self.registry.get(name).map(|entry| entry.clone())
    }

    pub fn get_actor(&self, id: &ActorId) -> Option<Arc<Actor>> {
        self.actors.get(id).map(|entry| entry.clone())
    }

    pub async fn call(&self, id: &ActorId, payload: Vec<u8>, timeout: Duration) -> Result<Vec<u8>> {
        self.get_actor(id)
            .ok_or_else(|| Error::from_reason("Actor not found"))?
            .call(payload, timeout)
            .await
    }

    pub async fn cast(&self, id: &ActorId, payload: Vec<u8>) -> Result<()> {
        self.get_actor(id)
            .ok_or_else(|| Error::from_reason("Actor not found"))?
            .cast(payload)
            .await
    }

    pub fn stop(&self, id: &ActorId) -> Result<()> {
        if let Some(actor) = self.get_actor(id) {
            let sender = actor.sender();
            tokio::spawn(async move {
                let _ = sender.send(Message::Stop).await;
            });
            Ok(())
        } else {
            Err(Error::from_reason("Actor not found"))
        }
    }

    pub fn count(&self) -> usize {
        self.actors.len()
    }
}

// NAPI bindings for JavaScript
#[napi]
pub struct JsActorSystem {
    system: Arc<ActorSystem>,
}

#[napi]
impl JsActorSystem {
    #[napi(constructor)]
    pub fn new() -> Result<Self> {
        let system = Arc::new(ActorSystem::new());
        let mut global = ACTOR_SYSTEM.write();
        *global = Some(system.clone());
        
        Ok(JsActorSystem { system })
    }

    #[napi]
    pub fn spawn_actor(&self, behavior_type: String) -> Result<String> {
        // Create a simple echo actor for demonstration
        struct EchoActor;
        
        #[async_trait::async_trait]
        impl ActorBehavior for EchoActor {
            async fn handle_message(&mut self, msg: Message) -> Option<Vec<u8>> {
                match msg {
                    Message::Call { payload, .. } => Some(payload),
                    Message::Cast { payload } => {
                        info!("EchoActor received cast: {:?}", payload);
                        None
                    }
                    _ => None,
                }
            }
        }
        
        let actor_id = self.system.spawn(Box::new(EchoActor));
        Ok(actor_id.0)
    }

    #[napi]
    pub async fn call_actor(&self, actor_id: String, message: Vec<u8>, timeout_ms: u32) -> Result<Vec<u8>> {
        let id = ActorId::from_string(actor_id);
        let timeout = Duration::from_millis(timeout_ms as u64);
        self.system.call(&id, message, timeout).await
    }

    #[napi]
    pub async fn cast_actor(&self, actor_id: String, message: Vec<u8>) -> Result<()> {
        let id = ActorId::from_string(actor_id);
        self.system.cast(&id, message).await
    }

    #[napi]
    pub fn register_actor(&self, name: String, actor_id: String) -> Result<()> {
        let id = ActorId::from_string(actor_id);
        self.system.register(name, id)
    }

    #[napi]
    pub fn whereis(&self, name: String) -> Option<String> {
        self.system.whereis(&name).map(|id| id.0)
    }

    #[napi]
    pub fn stop_actor(&self, actor_id: String) -> Result<()> {
        let id = ActorId::from_string(actor_id);
        self.system.stop(&id)
    }

    #[napi]
    pub fn actor_count(&self) -> u32 {
        self.system.count() as u32
    }
}

// Helper function to get the global actor system
pub fn get_actor_system() -> Option<Arc<ActorSystem>> {
    ACTOR_SYSTEM.read().clone()
}