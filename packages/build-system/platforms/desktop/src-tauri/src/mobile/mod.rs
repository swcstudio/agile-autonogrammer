// Mobile platform integration for Katalyst Tauri
// Handles iOS and Android specific features, device APIs, and mobile optimizations

use tauri::{AppHandle, Manager, Window, WindowBuilder, WindowUrl};
use anyhow::Result;
use serde::{Deserialize, Serialize};

pub mod device_info;
pub mod permissions;
pub mod camera;
pub mod haptics;
pub mod notifications;
pub mod biometric;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub platform: String,
    pub model: String,
    pub version: String,
    pub manufacturer: String,
    pub is_virtual: bool,
    pub screen_width: u32,
    pub screen_height: u32,
    pub pixel_density: f32,
    pub capabilities: DeviceCapabilities,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCapabilities {
    pub has_camera: bool,
    pub has_microphone: bool,
    pub has_gps: bool,
    pub has_accelerometer: bool,
    pub has_gyroscope: bool,
    pub has_magnetometer: bool,
    pub has_biometric: bool,
    pub has_nfc: bool,
    pub has_telephony: bool,
    pub supports_haptics: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub name: String,
    pub status: PermissionStatus,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PermissionStatus {
    Granted,
    Denied,
    NotDetermined,
    Restricted,
}

// Mobile preview window launcher
pub fn launch_mobile_preview(app: AppHandle) -> Result<()> {
    let mobile_url = if cfg!(debug_assertions) {
        "http://localhost:20007/mobile"
    } else {
        "/mobile"
    };
    
    let window_url = if cfg!(debug_assertions) {
        WindowUrl::External(mobile_url.parse()?)
    } else {
        WindowUrl::App(mobile_url.into())
    };
    
    let window = WindowBuilder::new(&app, "mobile_preview", window_url)
        .title("Katalyst Mobile Preview")
        .inner_size(375.0, 812.0) // iPhone 12 dimensions
        .center()
        .resizable(true)
        .fullscreen(false)
        .always_on_top(false)
        .decorations(true)
        .transparent(false)
        .build()?;
    
    // Setup mobile-specific window features
    setup_mobile_preview_window(&window)?;
    
    Ok(())
}

// Mobile preview window setup
fn setup_mobile_preview_window(window: &Window) -> Result<()> {
    // Inject mobile viewport and touch simulation
    window.eval("
        // Set mobile viewport
        let viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(viewport);
        
        // Add mobile user agent class
        document.documentElement.classList.add('mobile-preview');
        
        // Simulate touch events
        let touchSupported = false;
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            touchSupported = true;
        }
        
        if (!touchSupported) {
            // Simulate touch events with mouse for desktop preview
            let mouseToTouch = (mouseEvent) => {
                let touch = new Touch({
                    identifier: Date.now(),
                    target: mouseEvent.target,
                    clientX: mouseEvent.clientX,
                    clientY: mouseEvent.clientY,
                    radiusX: 2.5,
                    radiusY: 2.5,
                    rotationAngle: 0,
                    force: 0.5,
                });
                
                return new TouchEvent(mouseEvent.type.replace('mouse', 'touch'), {
                    cancelable: true,
                    bubbles: true,
                    touches: [touch],
                    targetTouches: [],
                    changedTouches: [touch],
                    shiftKey: true,
                });
            };
            
            ['mousedown', 'mousemove', 'mouseup'].forEach(eventType => {
                window.addEventListener(eventType, (e) => {
                    if (e.shiftKey) {
                        let touchEvent = mouseToTouch(e);
                        e.target.dispatchEvent(touchEvent);
                        e.preventDefault();
                    }
                });
            });
        }
        
        console.log('Mobile preview window initialized');
    ")?;
    
    Ok(())
}

// Tauri command: Get device information
#[tauri::command]
pub async fn get_device_info() -> Result<DeviceInfo, String> {
    device_info::collect_device_info()
        .await
        .map_err(|e| format!("Failed to get device info: {}", e))
}

// Tauri command: Trigger haptic feedback
#[tauri::command]
pub async fn trigger_haptic_feedback(
    app: AppHandle,
    pattern: String,
    intensity: Option<f32>,
) -> Result<(), String> {
    #[cfg(mobile)]
    {
        haptics::trigger_haptic(&pattern, intensity.unwrap_or(0.5))
            .await
            .map_err(|e| format!("Failed to trigger haptic feedback: {}", e))
    }
    
    #[cfg(not(mobile))]
    {
        // Simulate haptic feedback on desktop
        println!("Haptic feedback simulated: {} (intensity: {})", pattern, intensity.unwrap_or(0.5));
        Ok(())
    }
}

// Tauri command: Request permissions
#[tauri::command]
pub async fn request_permissions(
    app: AppHandle,
    permissions: Vec<String>,
) -> Result<Vec<Permission>, String> {
    #[cfg(mobile)]
    {
        permissions::request_permissions(permissions)
            .await
            .map_err(|e| format!("Failed to request permissions: {}", e))
    }
    
    #[cfg(not(mobile))]
    {
        // Mock permissions for desktop
        let mock_permissions = permissions
            .into_iter()
            .map(|name| Permission {
                name: name.clone(),
                status: PermissionStatus::Granted,
                description: format!("Mock permission for {}", name),
            })
            .collect();
        Ok(mock_permissions)
    }
}

// Tauri command: Open camera
#[tauri::command]
pub async fn open_camera(
    app: AppHandle,
    camera_type: String,
) -> Result<String, String> {
    #[cfg(mobile)]
    {
        camera::open_camera(&camera_type)
            .await
            .map_err(|e| format!("Failed to open camera: {}", e))
    }
    
    #[cfg(not(mobile))]
    {
        // Mock camera for desktop
        Ok(format!("Mock camera opened: {}", camera_type))
    }
}

// Mobile application state
#[derive(Default)]
pub struct MobileState {
    pub device_info: Option<DeviceInfo>,
    pub permissions: Vec<Permission>,
    pub is_mobile_preview: bool,
    pub orientation: String,
    pub network_status: String,
}

impl MobileState {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn set_device_info(&mut self, info: DeviceInfo) {
        self.device_info = Some(info);
    }
    
    pub fn update_permissions(&mut self, permissions: Vec<Permission>) {
        self.permissions = permissions;
    }
    
    pub fn set_mobile_preview(&mut self, enabled: bool) {
        self.is_mobile_preview = enabled;
    }
    
    pub fn set_orientation(&mut self, orientation: String) {
        self.orientation = orientation;
    }
    
    pub fn set_network_status(&mut self, status: String) {
        self.network_status = status;
    }
}

// Platform-specific utilities
pub fn is_mobile_platform() -> bool {
    cfg!(any(target_os = "android", target_os = "ios"))
}

pub fn get_platform_name() -> &'static str {
    if cfg!(target_os = "android") {
        "Android"
    } else if cfg!(target_os = "ios") {
        "iOS"
    } else {
        "Desktop"
    }
}