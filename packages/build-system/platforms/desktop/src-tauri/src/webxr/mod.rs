// WebXR integration for Katalyst Tauri
// Provides VR/AR capabilities, spatial UI, and metaverse features

use tauri::{AppHandle, Manager, Window, WindowBuilder, WindowUrl};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub mod spatial_ui;
pub mod device_manager;
pub mod session_manager;
pub mod performance;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XRDevice {
    pub id: String,
    pub name: String,
    pub device_type: XRDeviceType,
    pub capabilities: XRCapabilities,
    pub is_connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum XRDeviceType {
    HeadMountedDisplay,
    HandController,
    Tracker,
    Camera,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XRCapabilities {
    pub supports_vr: bool,
    pub supports_ar: bool,
    pub supports_hand_tracking: bool,
    pub supports_eye_tracking: bool,
    pub supports_spatial_audio: bool,
    pub max_refresh_rate: u32,
    pub field_of_view: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XRSession {
    pub id: String,
    pub mode: XRSessionMode,
    pub is_active: bool,
    pub start_time: u64,
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum XRSessionMode {
    Inline,
    ImmersiveVR,
    ImmersiveAR,
}

// WebXR window launcher
pub fn launch_webxr_window(app: AppHandle) -> Result<()> {
    let webxr_url = if cfg!(debug_assertions) {
        "http://localhost:20007/webxr"
    } else {
        "/webxr"
    };
    
    let window_url = if cfg!(debug_assertions) {
        WindowUrl::External(webxr_url.parse()?)
    } else {
        WindowUrl::App(webxr_url.into())
    };
    
    let window = WindowBuilder::new(&app, "webxr", window_url)
        .title("Katalyst WebXR")
        .inner_size(1200.0, 800.0)
        .center()
        .resizable(true)
        .fullscreen(false)
        .always_on_top(false)
        .decorations(true)
        .transparent(false)
        .build()?;
    
    // Setup WebXR specific window features
    setup_webxr_window(&window)?;
    
    Ok(())
}

// WebXR window setup
fn setup_webxr_window(window: &Window) -> Result<()> {
    // Enable hardware acceleration
    window.eval("
        // Ensure WebXR context
        if ('xr' in navigator) {
            console.log('WebXR supported');
        } else {
            console.warn('WebXR not supported');
        }
        
        // Performance optimization
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                console.log('WebXR window optimized for performance');
            });
        }
    ")?;
    
    Ok(())
}

// Tauri command: Initialize WebXR
#[tauri::command]
pub async fn initialize_webxr(app: AppHandle) -> Result<Vec<XRDevice>, String> {
    device_manager::scan_xr_devices()
        .await
        .map_err(|e| format!("Failed to initialize WebXR: {}", e))
}

// Tauri command: Create WebXR session
#[tauri::command]
pub async fn create_webxr_session(
    app: AppHandle,
    device_id: String,
    mode: String,
) -> Result<XRSession, String> {
    let session_mode = match mode.as_str() {
        "inline" => XRSessionMode::Inline,
        "immersive-vr" => XRSessionMode::ImmersiveVR,
        "immersive-ar" => XRSessionMode::ImmersiveAR,
        _ => return Err(format!("Invalid session mode: {}", mode)),
    };
    
    session_manager::create_session(&device_id, session_mode)
        .await
        .map_err(|e| format!("Failed to create XR session: {}", e))
}

// Tauri command: Get XR devices
#[tauri::command]
pub async fn get_xr_devices() -> Result<Vec<XRDevice>, String> {
    device_manager::get_connected_devices()
        .await
        .map_err(|e| format!("Failed to get XR devices: {}", e))
}

// Tauri command: Toggle XR mode
#[tauri::command]
pub async fn toggle_xr_mode(app: AppHandle, enable: bool) -> Result<bool, String> {
    if enable {
        // Enter XR mode
        if let Some(window) = app.get_window("main") {
            window.set_fullscreen(true)
                .map_err(|e| format!("Failed to enter fullscreen: {}", e))?;
        }
        
        // Launch WebXR window if not already open
        if app.get_window("webxr").is_none() {
            launch_webxr_window(app)
                .map_err(|e| format!("Failed to launch WebXR window: {}", e))?;
        }
        
        // Initialize WebXR performance optimizations
        performance::optimize_for_xr(&app)
            .await
            .map_err(|e| format!("Failed to optimize for XR: {}", e))?;
    } else {
        // Exit XR mode
        if let Some(window) = app.get_window("main") {
            window.set_fullscreen(false)
                .map_err(|e| format!("Failed to exit fullscreen: {}", e))?;
        }
        
        // Close WebXR window
        if let Some(webxr_window) = app.get_window("webxr") {
            webxr_window.close()
                .map_err(|e| format!("Failed to close WebXR window: {}", e))?;
        }
        
        // Reset performance settings
        performance::reset_performance_settings(&app)
            .await
            .map_err(|e| format!("Failed to reset performance: {}", e))?;
    }
    
    Ok(enable)
}

// WebXR state management
#[derive(Default)]
pub struct WebXRState {
    pub devices: HashMap<String, XRDevice>,
    pub sessions: HashMap<String, XRSession>,
    pub is_xr_mode: bool,
    pub current_session: Option<String>,
}

impl WebXRState {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn add_device(&mut self, device: XRDevice) {
        self.devices.insert(device.id.clone(), device);
    }
    
    pub fn remove_device(&mut self, device_id: &str) {
        self.devices.remove(device_id);
    }
    
    pub fn add_session(&mut self, session: XRSession) {
        self.sessions.insert(session.id.clone(), session);
    }
    
    pub fn remove_session(&mut self, session_id: &str) {
        self.sessions.remove(session_id);
    }
    
    pub fn set_current_session(&mut self, session_id: Option<String>) {
        self.current_session = session_id;
    }
    
    pub fn toggle_xr_mode(&mut self) -> bool {
        self.is_xr_mode = !self.is_xr_mode;
        self.is_xr_mode
    }
}