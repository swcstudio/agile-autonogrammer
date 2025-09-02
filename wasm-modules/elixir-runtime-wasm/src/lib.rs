//! WebAssembly wrapper for Katalyst Elixir Runtime
//! 
//! This crate provides WASM bindings for Phoenix LiveView and GenServer functionality.

use wasm_bindgen::prelude::*;

// Re-export the Elixir runtime WASM interface
pub use katalyst_elixir_runtime::WasmElixirRuntime;

// Set up panic hook for WASM
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

// Phoenix LiveView utilities for WASM
#[wasm_bindgen]
pub struct PhoenixSocket {
    endpoint: String,
    params: String,
}

#[wasm_bindgen]
impl PhoenixSocket {
    #[wasm_bindgen(constructor)]
    pub fn new(endpoint: &str, params: &str) -> PhoenixSocket {
        PhoenixSocket {
            endpoint: endpoint.to_string(),
            params: params.to_string(),
        }
    }

    #[wasm_bindgen(js_name = connect)]
    pub async fn connect(&self) -> Result<String, JsValue> {
        // In a real implementation, this would establish a WebSocket connection
        Ok(format!("Connected to {}", self.endpoint))
    }

    #[wasm_bindgen(js_name = disconnect)]
    pub fn disconnect(&self) {
        // Implementation for disconnecting
    }
}

// LiveView channel management
#[wasm_bindgen]
pub struct LiveViewChannel {
    topic: String,
    socket_id: String,
}

#[wasm_bindgen]
impl LiveViewChannel {
    #[wasm_bindgen(constructor)]
    pub fn new(topic: &str, socket_id: &str) -> LiveViewChannel {
        LiveViewChannel {
            topic: topic.to_string(),
            socket_id: socket_id.to_string(),
        }
    }

    #[wasm_bindgen(js_name = join)]
    pub async fn join(&self, params: &str) -> Result<String, JsValue> {
        // Implementation for joining a LiveView channel
        Ok(format!("Joined topic: {} with params: {}", self.topic, params))
    }

    #[wasm_bindgen(js_name = leave)]
    pub async fn leave(&self) -> Result<(), JsValue> {
        // Implementation for leaving a channel
        Ok(())
    }

    #[wasm_bindgen(js_name = push)]
    pub async fn push(&self, event: &str, payload: &str) -> Result<String, JsValue> {
        // Implementation for pushing events to the channel
        Ok(format!("Pushed event: {} with payload: {}", event, payload))
    }
}

// GenServer client for WASM
#[wasm_bindgen]
pub struct GenServerClient {
    runtime: WasmElixirRuntime,
}

#[wasm_bindgen]
impl GenServerClient {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GenServerClient {
        GenServerClient {
            runtime: WasmElixirRuntime::new(),
        }
    }

    #[wasm_bindgen(js_name = call)]
    pub async fn call(&self, module: &str, function: &str, args: &str) -> Result<String, JsValue> {
        let message = serde_json::json!({
            "GenServerCall": {
                "module": module,
                "function": function,
                "args": serde_json::from_str::<serde_json::Value>(args).unwrap_or_default(),
                "from": uuid::Uuid::new_v4().to_string()
            }
        });

        self.runtime.handle_message(&message.to_string()).await
    }

    #[wasm_bindgen(js_name = cast)]
    pub async fn cast(&self, module: &str, function: &str, args: &str) -> Result<String, JsValue> {
        let message = serde_json::json!({
            "GenServerCast": {
                "module": module,
                "function": function,
                "args": serde_json::from_str::<serde_json::Value>(args).unwrap_or_default()
            }
        });

        self.runtime.handle_message(&message.to_string()).await
    }
}

// Utility functions
#[wasm_bindgen]
pub fn create_socket_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[wasm_bindgen]
pub fn get_elixir_runtime_info() -> String {
    serde_json::json!({
        "name": "katalyst-elixir-runtime-wasm",
        "version": env!("CARGO_PKG_VERSION"),
        "features": ["phoenix_liveview", "genserver", "channels"],
        "target": "wasm32-unknown-unknown"
    }).to_string()
}