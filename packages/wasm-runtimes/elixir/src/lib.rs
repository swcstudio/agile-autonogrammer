//! Katalyst Elixir WebAssembly Runtime
//! 
//! WebAssembly module providing Elixir/OTP-inspired functionality:
//! - Phoenix Socket connections
//! - GenServer-like process management
//! - LiveView channel management
//! - Message passing and supervision

use wasm_bindgen::prelude::*;
use js_sys::*;
use web_sys::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

// Initialize WASM module
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhoenixMessage {
    pub topic: String,
    pub event: String,
    pub payload: serde_json::Value,
    pub r#ref: Option<String>,
}

/// Phoenix Socket implementation for WebAssembly
#[wasm_bindgen]
pub struct PhoenixSocket {
    endpoint: String,
    params: HashMap<String, String>,
    channels: Arc<Mutex<HashMap<String, Channel>>>,
    socket: Option<WebSocket>,
    connected: bool,
}

#[wasm_bindgen]
impl PhoenixSocket {
    #[wasm_bindgen(constructor)]
    pub fn new(endpoint: &str, params: &str) -> Result<PhoenixSocket, JsValue> {
        let params_map: HashMap<String, String> = serde_json::from_str(params)
            .map_err(|e| JsValue::from_str(&format!("Invalid params JSON: {}", e)))?;

        Ok(PhoenixSocket {
            endpoint: endpoint.to_string(),
            params: params_map,
            channels: Arc::new(Mutex::new(HashMap::new())),
            socket: None,
            connected: false,
        })
    }

    /// Connect to the Phoenix server
    #[wasm_bindgen]
    pub fn connect(&mut self) -> Result<(), JsValue> {
        let socket = WebSocket::new(&self.endpoint)?;
        socket.set_binary_type(BinaryType::Arraybuffer);
        
        // Set up event handlers
        let onopen_callback = Closure::wrap(Box::new(move |_| {
            console::log_1(&"Phoenix socket connected".into());
        }) as Box<dyn FnMut(JsValue)>);
        socket.set_onopen(Some(onopen_callback.as_ref().unchecked_ref()));
        onopen_callback.forget();

        let onerror_callback = Closure::wrap(Box::new(move |e: ErrorEvent| {
            console::error_1(&format!("Phoenix socket error: {:?}", e).into());
        }) as Box<dyn FnMut(ErrorEvent)>);
        socket.set_onerror(Some(onerror_callback.as_ref().unchecked_ref()));
        onerror_callback.forget();

        self.socket = Some(socket);
        self.connected = true;
        
        Ok(())
    }

    /// Disconnect from the Phoenix server
    #[wasm_bindgen]
    pub fn disconnect(&mut self) -> Result<(), JsValue> {
        if let Some(socket) = &self.socket {
            socket.close()?;
        }
        self.connected = false;
        self.socket = None;
        Ok(())
    }

    /// Join a channel
    #[wasm_bindgen]
    pub fn channel(&mut self, topic: &str) -> Channel {
        let channel = Channel::new(topic.to_string());
        
        // Store channel reference
        if let Ok(mut channels) = self.channels.lock() {
            channels.insert(topic.to_string(), channel.clone());
        }
        
        channel
    }

    /// Send a message through the socket
    #[wasm_bindgen]
    pub fn push(&self, topic: &str, event: &str, payload: &str) -> Result<(), JsValue> {
        if let Some(socket) = &self.socket {
            let message = PhoenixMessage {
                topic: topic.to_string(),
                event: event.to_string(),
                payload: serde_json::from_str(payload).unwrap_or(serde_json::Value::Null),
                r#ref: Some(uuid::Uuid::new_v4().to_string()),
            };
            
            let message_json = serde_json::to_string(&message)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;
            
            socket.send_with_str(&message_json)?;
        }
        Ok(())
    }

    /// Get connection status
    #[wasm_bindgen]
    pub fn is_connected(&self) -> bool {
        self.connected
    }
}

/// Channel for Phoenix LiveView integration
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Channel {
    topic: String,
    joined: bool,
    binding: HashMap<String, String>,
}

#[wasm_bindgen]
impl Channel {
    #[wasm_bindgen(constructor)]
    pub fn new(topic: String) -> Channel {
        Channel {
            topic,
            joined: false,
            binding: HashMap::new(),
        }
    }

    /// Join the channel
    #[wasm_bindgen]
    pub fn join(&mut self, payload: &str) -> Result<(), JsValue> {
        // In a real implementation, this would send a join message
        console::log_1(&format!("Joining channel: {} with payload: {}", self.topic, payload).into());
        self.joined = true;
        Ok(())
    }

    /// Leave the channel
    #[wasm_bindgen]
    pub fn leave(&mut self) -> Result<(), JsValue> {
        console::log_1(&format!("Leaving channel: {}", self.topic).into());
        self.joined = false;
        Ok(())
    }

    /// Push event to channel
    #[wasm_bindgen]
    pub fn push(&self, event: &str, payload: &str) -> Result<(), JsValue> {
        console::log_1(&format!("Channel {} pushing event: {} with payload: {}", self.topic, event, payload).into());
        Ok(())
    }

    /// Bind event handler
    #[wasm_bindgen]
    pub fn on(&mut self, event: &str, callback: &str) {
        self.binding.insert(event.to_string(), callback.to_string());
    }

    /// Get channel topic
    #[wasm_bindgen]
    pub fn get_topic(&self) -> String {
        self.topic.clone()
    }

    /// Check if channel is joined
    #[wasm_bindgen]
    pub fn is_joined(&self) -> bool {
        self.joined
    }
}

/// GenServer-like process management
#[wasm_bindgen]
pub struct GenServerClient {
    processes: HashMap<String, Process>,
}

#[wasm_bindgen]
impl GenServerClient {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GenServerClient {
        GenServerClient {
            processes: HashMap::new(),
        }
    }

    /// Start a new process
    #[wasm_bindgen]
    pub fn start_link(&mut self, name: &str, initial_state: &str) -> Result<String, JsValue> {
        let process_id = uuid::Uuid::new_v4().to_string();
        let process = Process::new(process_id.clone(), initial_state.to_string());
        
        self.processes.insert(name.to_string(), process);
        console::log_1(&format!("Started GenServer process: {} ({})", name, process_id).into());
        
        Ok(process_id)
    }

    /// Send a call to a process
    #[wasm_bindgen]
    pub fn call(&self, name: &str, message: &str) -> Result<String, JsValue> {
        if let Some(process) = self.processes.get(name) {
            process.handle_call(message)
        } else {
            Err(JsValue::from_str(&format!("Process not found: {}", name)))
        }
    }

    /// Send a cast to a process
    #[wasm_bindgen]
    pub fn cast(&self, name: &str, message: &str) -> Result<(), JsValue> {
        if let Some(process) = self.processes.get(name) {
            process.handle_cast(message);
            Ok(())
        } else {
            Err(JsValue::from_str(&format!("Process not found: {}", name)))
        }
    }

    /// Stop a process
    #[wasm_bindgen]
    pub fn stop(&mut self, name: &str) -> Result<(), JsValue> {
        if self.processes.remove(name).is_some() {
            console::log_1(&format!("Stopped GenServer process: {}", name).into());
            Ok(())
        } else {
            Err(JsValue::from_str(&format!("Process not found: {}", name)))
        }
    }

    /// List all processes
    #[wasm_bindgen]
    pub fn list_processes(&self) -> Vec<String> {
        self.processes.keys().cloned().collect()
    }
}

/// Individual process representation
#[derive(Debug, Clone)]
pub struct Process {
    id: String,
    state: String,
}

impl Process {
    pub fn new(id: String, initial_state: String) -> Self {
        Process {
            id,
            state: initial_state,
        }
    }

    pub fn handle_call(&self, message: &str) -> Result<String, JsValue> {
        // Simple echo response for demonstration
        Ok(format!("Process {} received call: {}", self.id, message))
    }

    pub fn handle_cast(&self, message: &str) {
        console::log_1(&format!("Process {} received cast: {}", self.id, message).into());
    }
}

/// LiveView Channel for real-time updates
#[wasm_bindgen]
pub struct LiveViewChannel {
    topic: String,
    socket_id: String,
    view_state: HashMap<String, String>,
}

#[wasm_bindgen]
impl LiveViewChannel {
    #[wasm_bindgen(constructor)]
    pub fn new(topic: &str, socket_id: &str) -> LiveViewChannel {
        LiveViewChannel {
            topic: topic.to_string(),
            socket_id: socket_id.to_string(),
            view_state: HashMap::new(),
        }
    }

    /// Handle LiveView event
    #[wasm_bindgen]
    pub fn handle_event(&mut self, event: &str, payload: &str) -> Result<String, JsValue> {
        console::log_1(&format!("LiveView {} handling event: {} with payload: {}", self.topic, event, payload).into());
        
        // Update view state based on event
        self.view_state.insert(event.to_string(), payload.to_string());
        
        // Return diff response
        let response = serde_json::json!({
            "diff": {
                "updated": event,
                "payload": payload
            }
        });
        
        Ok(response.to_string())
    }

    /// Get current view state
    #[wasm_bindgen]
    pub fn get_state(&self) -> String {
        serde_json::to_string(&self.view_state).unwrap_or_else(|_| "{}".to_string())
    }

    /// Push update to view
    #[wasm_bindgen]
    pub fn push_update(&self, key: &str, value: &str) -> String {
        let update = serde_json::json!({
            "type": "update",
            "key": key,
            "value": value,
            "socket_id": self.socket_id
        });
        
        update.to_string()
    }
}

/// Get runtime information
#[wasm_bindgen]
pub fn get_elixir_runtime_info() -> String {
    let info = serde_json::json!({
        "runtime": "elixir-wasm",
        "version": "1.0.0",
        "otp_version": "simulated-26",
        "phoenix_version": "simulated-1.7",
        "features": {
            "channels": true,
            "live_view": true,
            "gen_server": true,
            "supervision": false,
            "distributed": false
        },
        "capabilities": {
            "websockets": true,
            "real_time": true,
            "state_management": true
        }
    });
    
    info.to_string()
}

/// Version information
#[wasm_bindgen]
pub fn get_version() -> String {
    "1.0.0".to_string()
}

#[wasm_bindgen]
pub fn get_build_info() -> String {
    serde_json::json!({
        "name": "katalyst-elixir-wasm",
        "version": "1.0.0",
        "target": "wasm32-unknown-unknown",
        "optimization": if cfg!(debug_assertions) { "debug" } else { "release" }
    }).to_string()
}