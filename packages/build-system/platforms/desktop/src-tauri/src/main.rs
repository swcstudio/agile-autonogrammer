// Katalyst Tauri 2.0 - Unified Desktop, Mobile & WebXR Application
// main.rs - Application entry point and core setup

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{
    generate_context, generate_handler, AppHandle, CustomMenuItem, Manager, State, SystemTray,
    SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, Window, WindowBuilder, WindowUrl,
};

mod commands;
mod desktop;
mod mobile;
mod webxr;
mod utils;
mod store;

use commands::*;
use store::AppState;
use utils::logger;

// Application state management
#[derive(Default)]
struct KatalystState {
    app_handle: Option<AppHandle>,
    is_dev_mode: bool,
    platform: String,
    features: Vec<String>,
}

// Main entry point
fn main() {
    // Initialize logging
    logger::init_logger().expect("Failed to initialize logger");
    
    // Build system tray
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "Show Katalyst"))
        .add_item(CustomMenuItem::new("hide", "Hide Katalyst"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("webxr_mode", "Enter WebXR Mode"))
        .add_item(CustomMenuItem::new("mobile_preview", "Mobile Preview"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("devtools", "Open DevTools"))
        .add_item(CustomMenuItem::new("reload", "Reload"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "Quit"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    // Build the Tauri application
    let context = generate_context!();
    tauri::Builder::default()
        .manage(AppState::default())
        .manage(KatalystState::default())
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                "webxr_mode" => {
                    webxr::launch_webxr_window(app.handle()).unwrap();
                }
                "mobile_preview" => {
                    mobile::launch_mobile_preview(app.handle()).unwrap();
                }
                "devtools" => {
                    let window = app.get_window("main").unwrap();
                    window.open_devtools();
                }
                "reload" => {
                    let window = app.get_window("main").unwrap();
                    window.eval("window.location.reload()").unwrap();
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            // Initialize application state
            let mut state = app.state::<KatalystState>();
            let mut state_guard = state.0.lock().unwrap();
            state_guard.app_handle = Some(app.handle());
            state_guard.is_dev_mode = cfg!(debug_assertions);
            state_guard.platform = std::env::consts::OS.to_string();
            
            // Initialize desktop features
            desktop::setup_desktop_features(app.handle())?;
            
            // Setup global shortcuts
            desktop::setup_global_shortcuts(app.handle())?;
            
            // Initialize window state persistence
            #[cfg(desktop)]
            {
                tauri_plugin_window_state::Builder::default()
                    .build()
                    .initialize(app, "window-state.json")?;
            }
            
            // Initialize database
            store::init_database(app.handle())?;
            
            // Auto-updater setup
            #[cfg(not(debug_assertions))]
            {
                let handle = app.handle();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = update::check_for_updates(handle).await {
                        eprintln!("Failed to check for updates: {}", e);
                    }
                });
            }
            
            Ok(())
        })
        .plugin(tauri_plugin_webview::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        
        // Mobile plugins (conditional compilation)
        #[cfg(mobile)]
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_biometric::init())
        .plugin(tauri_plugin_camera::init())
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_notification::init())
        
        .invoke_handler(generate_handler![
            // General commands
            get_app_info,
            get_system_info,
            
            // Desktop commands
            desktop::create_desktop_window,
            desktop::toggle_always_on_top,
            desktop::set_window_transparency,
            desktop::capture_screenshot,
            desktop::set_theme,
            
            // WebXR commands
            webxr::initialize_webxr,
            webxr::create_webxr_session,
            webxr::get_xr_devices,
            webxr::toggle_xr_mode,
            
            // Mobile commands
            mobile::get_device_info,
            mobile::trigger_haptic_feedback,
            mobile::request_permissions,
            mobile::open_camera,
            
            // File system commands
            read_config_file,
            write_config_file,
            get_app_dir,
            
            // Store commands
            store_get,
            store_set,
            store_delete,
            store_clear,
            
            // Development commands
            toggle_dev_mode,
            reload_app,
            open_devtools,
            get_logs,
        ])
        .run(context)
        .expect("Error while running Katalyst Tauri application");
}

// Update module for auto-updater
#[cfg(not(debug_assertions))]
mod update {
    use tauri::{AppHandle, Manager, UpdaterEvent};
    use anyhow::Result;

    pub async fn check_for_updates(app: AppHandle) -> Result<()> {
        let handle = app.clone();
        app.updater().check().await?;
        
        app.updater().on_event(move |event| match event {
            UpdaterEvent::UpdateAvailable { body, date, version } => {
                println!("Update available: {} - {}", version, date.unwrap_or_default());
                println!("Release notes: {}", body.unwrap_or_default());
            }
            UpdaterEvent::Pending => {
                println!("Update is pending...");
            }
            UpdaterEvent::Downloaded => {
                println!("Update downloaded, will install on restart");
                // Optionally show notification to user
            }
            UpdaterEvent::Updated => {
                println!("App updated successfully");
                // Restart the application
                handle.restart();
            }
            UpdaterEvent::AlreadyUpToDate => {
                println!("App is already up to date");
            }
            UpdaterEvent::Error(error) => {
                eprintln!("Update error: {}", error);
            }
        });

        Ok(())
    }
}