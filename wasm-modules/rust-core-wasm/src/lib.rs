//! WebAssembly wrapper for Katalyst Rust Core
//! 
//! This crate provides the WASM bindings for the core Katalyst functionality.

use wasm_bindgen::prelude::*;

// Re-export the core WASM interface
pub use katalyst_rust_core::WasmKatalystCore;

// Set up panic hook and tracing for WASM
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    
    // Initialize tracing for WASM
    tracing_wasm::set_as_global_default();
}

// Export additional utilities for WASM environment
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen]
pub fn get_build_info() -> String {
    serde_json::json!({
        "name": env!("CARGO_PKG_NAME"),
        "version": env!("CARGO_PKG_VERSION"),
        "target": "wasm32-unknown-unknown",
        "optimization": if cfg!(debug_assertions) { "debug" } else { "release" }
    }).to_string()
}

// Memory management utilities
#[wasm_bindgen]
pub fn force_gc() {
    // This doesn't actually force GC in WASM, but provides an interface
    // for the host environment to request garbage collection
}

#[wasm_bindgen]
pub fn get_memory_usage() -> u32 {
    // Placeholder for memory usage reporting
    0
}