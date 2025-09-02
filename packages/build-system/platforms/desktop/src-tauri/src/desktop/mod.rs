// Desktop-specific functionality for Katalyst Tauri
// Handles window management, system integration, and desktop features

use tauri::{
    AppHandle, GlobalShortcutManager, Manager, PhysicalPosition, PhysicalSize, Window, WindowBuilder,
    WindowUrl,
};
use anyhow::Result;
use serde_json::Value;

pub mod window_manager;
pub mod system_integration;
pub mod screenshot;
pub mod themes;
pub mod shortcuts;

use window_manager::WindowManager;

// Desktop feature setup
pub fn setup_desktop_features(app: AppHandle) -> Result<()> {
    // Initialize window manager
    let window_manager = WindowManager::new(app.clone());
    app.manage(window_manager);
    
    // Setup system integration
    system_integration::setup_system_features(&app)?;
    
    // Initialize screenshot capability
    screenshot::init_screenshot_service(&app)?;
    
    // Setup theme management
    themes::init_theme_system(&app)?;
    
    Ok(())
}

// Global shortcuts setup
pub fn setup_global_shortcuts(app: AppHandle) -> Result<()> {
    let mut shortcut_manager = app.global_shortcut_manager();
    
    // Register global shortcuts
    shortcut_manager.register("CmdOrCtrl+Shift+K", move || {
        if let Some(window) = app.get_window("main") {
            if window.is_visible().unwrap_or(false) {
                window.hide().unwrap();
            } else {
                window.show().unwrap();
                window.set_focus().unwrap();
            }
        }
    })?;
    
    // WebXR mode shortcut
    let app_clone = app.clone();
    shortcut_manager.register("CmdOrCtrl+Shift+X", move || {
        if let Err(e) = crate::webxr::launch_webxr_window(app_clone.clone()) {
            eprintln!("Failed to launch WebXR window: {}", e);
        }
    })?;
    
    // Developer tools shortcut
    let app_clone = app.clone();
    shortcut_manager.register("CmdOrCtrl+Shift+I", move || {
        if let Some(window) = app_clone.get_window("main") {
            window.open_devtools();
        }
    })?;
    
    // Screenshot shortcut
    let app_clone = app.clone();
    shortcut_manager.register("CmdOrCtrl+Shift+S", move || {
        if let Err(e) = screenshot::capture_window_screenshot(app_clone.clone(), "main") {
            eprintln!("Failed to capture screenshot: {}", e);
        }
    })?;
    
    Ok(())
}

// Tauri command: Create a new desktop window
#[tauri::command]
pub async fn create_desktop_window(
    app: AppHandle,
    label: String,
    title: String,
    url: String,
    width: Option<f64>,
    height: Option<f64>,
) -> Result<String, String> {
    let window_url = if url.starts_with("http") {
        WindowUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?)
    } else {
        WindowUrl::App(url.into())
    };
    
    let window = WindowBuilder::new(&app, &label, window_url)
        .title(&title)
        .inner_size(width.unwrap_or(800.0), height.unwrap_or(600.0))
        .center()
        .resizable(true)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;
    
    Ok(format!("Window '{}' created successfully", label))
}

// Tauri command: Toggle always on top
#[tauri::command]
pub async fn toggle_always_on_top(window: Window) -> Result<bool, String> {
    let is_always_on_top = window.is_always_on_top()
        .map_err(|e| format!("Failed to get always on top state: {}", e))?;
    
    window.set_always_on_top(!is_always_on_top)
        .map_err(|e| format!("Failed to set always on top: {}", e))?;
    
    Ok(!is_always_on_top)
}

// Tauri command: Set window transparency
#[tauri::command]
pub async fn set_window_transparency(window: Window, transparency: f64) -> Result<(), String> {
    // Clamp transparency between 0.0 and 1.0
    let alpha = transparency.max(0.0).min(1.0);
    
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSWindow, NSWindowTitleVisibility};
        use cocoa::base::id;
        use objc::{msg_send, sel, sel_impl};
        
        let ns_window = window.ns_window().map_err(|e| format!("Failed to get NSWindow: {}", e))?;
        unsafe {
            let _: () = msg_send![ns_window as id, setAlphaValue: alpha];
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{SetLayeredWindowAttributes, SetWindowLongW, GWL_EXSTYLE, WS_EX_LAYERED, LWA_ALPHA};
        
        let hwnd = HWND(window.hwnd().map_err(|e| format!("Failed to get HWND: {}", e))?.0);
        unsafe {
            SetWindowLongW(hwnd, GWL_EXSTYLE, WS_EX_LAYERED.0 as i32);
            SetLayeredWindowAttributes(hwnd, 0, (alpha * 255.0) as u8, LWA_ALPHA);
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // GTK transparency implementation
        // Note: This requires the window to be created with transparency support
        eprintln!("Window transparency not yet implemented for Linux");
    }
    
    Ok(())
}

// Tauri command: Capture screenshot
#[tauri::command]
pub async fn capture_screenshot(app: AppHandle, window_label: Option<String>) -> Result<String, String> {
    let label = window_label.unwrap_or_else(|| "main".to_string());
    screenshot::capture_window_screenshot(app, &label)
        .map_err(|e| format!("Failed to capture screenshot: {}", e))
}

// Tauri command: Set application theme
#[tauri::command]
pub async fn set_theme(app: AppHandle, theme: String) -> Result<(), String> {
    themes::apply_theme(&app, &theme)
        .map_err(|e| format!("Failed to set theme: {}", e))
}

// Window management utilities
pub fn get_primary_monitor_size(app: &AppHandle) -> Result<PhysicalSize<u32>> {
    let monitors = app.primary_monitor()?;
    if let Some(monitor) = monitors {
        Ok(monitor.size())
    } else {
        Ok(PhysicalSize::new(1920, 1080)) // Default fallback
    }
}

pub fn center_window_on_monitor(window: &Window, monitor_size: PhysicalSize<u32>) -> Result<()> {
    let window_size = window.inner_size()?;
    let x = (monitor_size.width as i32 - window_size.width as i32) / 2;
    let y = (monitor_size.height as i32 - window_size.height as i32) / 2;
    
    window.set_position(PhysicalPosition::new(x.max(0), y.max(0)))?;
    Ok(())
}