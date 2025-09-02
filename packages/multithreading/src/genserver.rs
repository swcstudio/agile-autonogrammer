use crate::actor::{Actor, ActorBehavior, ActorId, ActorState, Message, get_actor_system};
use async_channel::{bounded, Receiver, Sender};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;
use tracing::{debug, error, info};

// GenServer state and response types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GenServerResponse {
    Reply { value: Vec<u8>, new_state: Vec<u8> },
    NoReply { new_state: Vec<u8> },
    Stop { reason: String, reply: Option<Vec<u8>> },
}

// GenServer callbacks trait (similar to Elixir's GenServer behaviour)
#[async_trait::async_trait]
pub trait GenServerBehavior: Send + Sync + 'static {
    // Called when the server starts
    async fn init(&mut self, args: Vec<u8>) -> Result<Vec<u8>>;
    
    // Handle synchronous calls (like Elixir's handle_call)
    async fn handle_call(&mut self, request: Vec<u8>, from: ActorId, state: Vec<u8>) -> GenServerResponse;
    
    // Handle asynchronous casts (like Elixir's handle_cast)
    async fn handle_cast(&mut self, request: Vec<u8>, state: Vec<u8>) -> GenServerResponse;
    
    // Handle other messages (like Elixir's handle_info)
    async fn handle_info(&mut self, info: Vec<u8>, state: Vec<u8>) -> GenServerResponse;
    
    // Called when the server is about to terminate
    async fn terminate(&mut self, reason: String, state: Vec<u8>);
    
    // Optional: Handle code change for hot code swapping
    async fn code_change(&mut self, old_vsn: String, state: Vec<u8>, extra: Vec<u8>) -> Result<Vec<u8>> {
        Ok(state)
    }
}

// GenServer implementation wrapper
pub struct GenServer {
    behavior: Box<dyn GenServerBehavior>,
    state: Vec<u8>,
    actor_id: Option<ActorId>,
}

impl GenServer {
    pub fn new(behavior: Box<dyn GenServerBehavior>) -> Self {
        GenServer {
            behavior,
            state: Vec::new(),
            actor_id: None,
        }
    }
    
    pub async fn start(mut self, args: Vec<u8>) -> Result<ActorId> {
        // Initialize the GenServer
        self.state = self.behavior.init(args).await?;
        
        // Create an actor wrapper for the GenServer
        let genserver_actor = GenServerActor {
            genserver: Arc::new(tokio::sync::RwLock::new(self)),
        };
        
        // Spawn the actor in the actor system
        if let Some(system) = get_actor_system() {
            let actor_id = system.spawn(Box::new(genserver_actor));
            Ok(actor_id)
        } else {
            Err(Error::from_reason("Actor system not initialized"))
        }
    }
    
    pub async fn start_link(self, args: Vec<u8>) -> Result<ActorId> {
        // Start with linking to parent (supervisor pattern)
        self.start(args).await
    }
}

// Actor wrapper for GenServer
struct GenServerActor {
    genserver: Arc<tokio::sync::RwLock<GenServer>>,
}

#[async_trait::async_trait]
impl ActorBehavior for GenServerActor {
    async fn handle_message(&mut self, msg: Message) -> Option<Vec<u8>> {
        let mut genserver = self.genserver.write().await;
        
        match msg {
            Message::Call { payload, .. } => {
                // Deserialize the call request
                let from = ActorId::new(); // In real implementation, extract from message
                let response = genserver.behavior.handle_call(
                    payload,
                    from,
                    genserver.state.clone()
                ).await;
                
                match response {
                    GenServerResponse::Reply { value, new_state } => {
                        genserver.state = new_state;
                        Some(value)
                    }
                    GenServerResponse::NoReply { new_state } => {
                        genserver.state = new_state;
                        None
                    }
                    GenServerResponse::Stop { reason, reply } => {
                        genserver.behavior.terminate(reason, genserver.state.clone()).await;
                        reply
                    }
                }
            }
            Message::Cast { payload } => {
                let response = genserver.behavior.handle_cast(
                    payload,
                    genserver.state.clone()
                ).await;
                
                match response {
                    GenServerResponse::NoReply { new_state } => {
                        genserver.state = new_state;
                    }
                    GenServerResponse::Stop { reason, .. } => {
                        genserver.behavior.terminate(reason, genserver.state.clone()).await;
                    }
                    _ => {}
                }
                None
            }
            Message::Info { payload } => {
                let response = genserver.behavior.handle_info(
                    payload,
                    genserver.state.clone()
                ).await;
                
                match response {
                    GenServerResponse::NoReply { new_state } => {
                        genserver.state = new_state;
                    }
                    GenServerResponse::Stop { reason, .. } => {
                        genserver.behavior.terminate(reason, genserver.state.clone()).await;
                    }
                    _ => {}
                }
                None
            }
            _ => None,
        }
    }
    
    async fn on_stop(&mut self) {
        let genserver = self.genserver.write().await;
        genserver.behavior.terminate("normal".to_string(), genserver.state.clone()).await;
    }
}

// Example: Counter GenServer implementation
pub struct CounterServer {
    name: String,
}

#[async_trait::async_trait]
impl GenServerBehavior for CounterServer {
    async fn init(&mut self, args: Vec<u8>) -> Result<Vec<u8>> {
        // Initialize counter to 0
        let initial_count: i32 = 0;
        Ok(initial_count.to_ne_bytes().to_vec())
    }
    
    async fn handle_call(&mut self, request: Vec<u8>, _from: ActorId, state: Vec<u8>) -> GenServerResponse {
        let count = i32::from_ne_bytes(state.clone().try_into().unwrap_or([0; 4]));
        
        // Parse request type
        if request == b"get" {
            GenServerResponse::Reply {
                value: count.to_ne_bytes().to_vec(),
                new_state: state,
            }
        } else if request == b"increment" {
            let new_count = count + 1;
            GenServerResponse::Reply {
                value: new_count.to_ne_bytes().to_vec(),
                new_state: new_count.to_ne_bytes().to_vec(),
            }
        } else {
            GenServerResponse::NoReply { new_state: state }
        }
    }
    
    async fn handle_cast(&mut self, request: Vec<u8>, state: Vec<u8>) -> GenServerResponse {
        let count = i32::from_ne_bytes(state.clone().try_into().unwrap_or([0; 4]));
        
        if request == b"reset" {
            GenServerResponse::NoReply {
                new_state: 0i32.to_ne_bytes().to_vec(),
            }
        } else {
            GenServerResponse::NoReply { new_state: state }
        }
    }
    
    async fn handle_info(&mut self, _info: Vec<u8>, state: Vec<u8>) -> GenServerResponse {
        GenServerResponse::NoReply { new_state: state }
    }
    
    async fn terminate(&mut self, reason: String, _state: Vec<u8>) {
        info!("Counter server {} terminating: {}", self.name, reason);
    }
}

// NAPI bindings for JavaScript
#[napi]
pub struct JsGenServer {
    actor_id: Option<String>,
}

#[napi]
impl JsGenServer {
    #[napi(constructor)]
    pub fn new() -> Self {
        JsGenServer { actor_id: None }
    }
    
    #[napi]
    pub async fn start_counter(&mut self, name: String) -> Result<String> {
        let counter = CounterServer { name: name.clone() };
        let genserver = GenServer::new(Box::new(counter));
        
        match genserver.start(Vec::new()).await {
            Ok(actor_id) => {
                let id_str = format!("{:?}", actor_id);
                self.actor_id = Some(id_str.clone());
                
                // Register with a name for easy lookup
                if let Some(system) = get_actor_system() {
                    let _ = system.register(name, actor_id);
                }
                
                Ok(id_str)
            }
            Err(e) => Err(e)
        }
    }
    
    #[napi]
    pub async fn call(&self, actor_id: String, request: Vec<u8>, timeout_ms: u32) -> Result<Vec<u8>> {
        if let Some(system) = get_actor_system() {
            let id = ActorId::from_string(actor_id);
            let timeout = Duration::from_millis(timeout_ms as u64);
            system.call(&id, request, timeout).await
        } else {
            Err(Error::from_reason("Actor system not initialized"))
        }
    }
    
    #[napi]
    pub async fn cast(&self, actor_id: String, request: Vec<u8>) -> Result<()> {
        if let Some(system) = get_actor_system() {
            let id = ActorId::from_string(actor_id);
            system.cast(&id, request).await
        } else {
            Err(Error::from_reason("Actor system not initialized"))
        }
    }
    
    #[napi]
    pub async fn increment_counter(&self, counter_name: String) -> Result<i32> {
        if let Some(system) = get_actor_system() {
            if let Some(actor_id) = system.whereis(&counter_name) {
                let response = system.call(
                    &actor_id,
                    b"increment".to_vec(),
                    Duration::from_secs(5)
                ).await?;
                
                let count = i32::from_ne_bytes(response.try_into().unwrap_or([0; 4]));
                Ok(count)
            } else {
                Err(Error::from_reason(format!("Counter {} not found", counter_name)))
            }
        } else {
            Err(Error::from_reason("Actor system not initialized"))
        }
    }
    
    #[napi]
    pub async fn get_counter(&self, counter_name: String) -> Result<i32> {
        if let Some(system) = get_actor_system() {
            if let Some(actor_id) = system.whereis(&counter_name) {
                let response = system.call(
                    &actor_id,
                    b"get".to_vec(),
                    Duration::from_secs(5)
                ).await?;
                
                let count = i32::from_ne_bytes(response.try_into().unwrap_or([0; 4]));
                Ok(count)
            } else {
                Err(Error::from_reason(format!("Counter {} not found", counter_name)))
            }
        } else {
            Err(Error::from_reason("Actor system not initialized"))
        }
    }
    
    #[napi]
    pub async fn reset_counter(&self, counter_name: String) -> Result<()> {
        if let Some(system) = get_actor_system() {
            if let Some(actor_id) = system.whereis(&counter_name) {
                system.cast(&actor_id, b"reset".to_vec()).await
            } else {
                Err(Error::from_reason(format!("Counter {} not found", counter_name)))
            }
        } else {
            Err(Error::from_reason("Actor system not initialized"))
        }
    }
}

// Helper function to create a GenServer from JavaScript
#[napi]
pub async fn create_genserver(behavior_type: String, args: Vec<u8>) -> Result<String> {
    match behavior_type.as_str() {
        "counter" => {
            let counter = CounterServer { name: "default".to_string() };
            let genserver = GenServer::new(Box::new(counter));
            let actor_id = genserver.start(args).await?;
            Ok(format!("{:?}", actor_id))
        }
        _ => Err(Error::from_reason(format!("Unknown GenServer type: {}", behavior_type)))
    }
}