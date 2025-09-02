// AI-OSX Desktop Application Entry Point
// Brain-Braun-Beyond Cognitive Architecture Native Implementation

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod brain;
mod braun;
mod beyond;
mod cognitive;
mod commands;
mod models;
mod storage;
mod networking;
mod audio;
mod security;
mod performance;
mod platform;

use brain::BrainProcessor;
use braun::BraunEngine;
use beyond::BeyondTranscender;
use cognitive::{CognitiveCoordinator, CognitiveState};
use commands::*;
use models::*;
use storage::LocalStorage;
use networking::EdgeConnector;
use audio::ResonanceEngine;
use security::SecurityManager;
use performance::PerformanceMonitor;

use tauri::{
    async_runtime, 
    generate_context, 
    generate_handler, 
    Builder, 
    Context, 
    Manager, 
    State, 
    SystemTray, 
    SystemTrayEvent, 
    SystemTrayMenu, 
    CustomMenuItem, 
    Menu, 
    MenuItem, 
    Submenu,
    WindowBuilder,
    WindowUrl
};
use tauri_plugin_store::StoreBuilder;
use tauri_plugin_fs::FsExt;
use tauri_plugin_shell::ShellExt;
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;
use tracing::{info, warn, error, debug};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;

// Application state that will be managed by Tauri
#[derive(Debug)]
pub struct AppState {
    pub brain: Arc<RwLock<BrainProcessor>>,
    pub braun: Arc<RwLock<BraunEngine>>,
    pub beyond: Arc<RwLock<BeyondTranscender>>,
    pub cognitive_coordinator: Arc<RwLock<CognitiveCoordinator>>,
    pub storage: Arc<RwLock<LocalStorage>>,
    pub edge_connector: Arc<RwLock<EdgeConnector>>,
    pub resonance_engine: Arc<RwLock<ResonanceEngine>>,
    pub security_manager: Arc<RwLock<SecurityManager>>,
    pub performance_monitor: Arc<RwLock<PerformanceMonitor>>,
    pub sessions: Arc<RwLock<HashMap<String, CognitiveState>>>,
}

impl AppState {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        info!("Initializing AI-OSX Brain-Braun-Beyond system...");

        let storage = LocalStorage::new().await?;
        let security_manager = SecurityManager::new().await?;
        let performance_monitor = PerformanceMonitor::new().await?;
        
        let brain = BrainProcessor::new().await?;
        let braun = BraunEngine::new().await?;
        let beyond = BeyondTranscender::new().await?;
        
        let cognitive_coordinator = CognitiveCoordinator::new(
            brain.clone(),
            braun.clone(), 
            beyond.clone()
        ).await?;

        let edge_connector = EdgeConnector::new().await?;
        let resonance_engine = ResonanceEngine::new().await?;

        Ok(Self {
            brain: Arc::new(RwLock::new(brain)),
            braun: Arc::new(RwLock::new(braun)),
            beyond: Arc::new(RwLock::new(beyond)),
            cognitive_coordinator: Arc::new(RwLock::new(cognitive_coordinator)),
            storage: Arc::new(RwLock::new(storage)),
            edge_connector: Arc::new(RwLock::new(edge_connector)),
            resonance_engine: Arc::new(RwLock::new(resonance_engine)),
            security_manager: Arc::new(RwLock::new(security_manager)),
            performance_monitor: Arc::new(RwLock::new(performance_monitor)),
            sessions: Arc::new(RwLock::new(HashMap::new())),
        })
    }
}

// System tray menu construction
fn create_system_tray() -> SystemTray {
    let cognitive_monitor = CustomMenuItem::new("cognitive_monitor", "Cognitive Monitor");
    let field_resonance = CustomMenuItem::new("field_resonance", "Field Resonance");
    let performance = CustomMenuItem::new("performance", "Performance Metrics");
    let separator = CustomMenuItem::new("separator", "").disabled();
    let settings = CustomMenuItem::new("settings", "Settings");
    let about = CustomMenuItem::new("about", "About AI-OSX");
    let quit = CustomMenuItem::new("quit", "Quit");

    let tray_menu = SystemTrayMenu::new()
        .add_item(cognitive_monitor)
        .add_item(field_resonance)
        .add_item(performance)
        .add_native_item(separator)
        .add_item(settings)
        .add_item(about)
        .add_native_item(separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

// Main application menu
fn create_app_menu() -> Menu {
    let app_menu = Submenu::new("AI-OSX", Menu::new()
        .add_native_item(MenuItem::About("AI-OSX".to_string(), Default::default()))
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Services)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Hide)
        .add_native_item(MenuItem::HideOthers)
        .add_native_item(MenuItem::ShowAll)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Quit)
    );

    let cognitive_menu = Submenu::new("Cognitive", Menu::new()
        .add_item(CustomMenuItem::new("brain_process", "Process with Brain"))
        .add_item(CustomMenuItem::new("braun_compute", "Execute with Braun"))
        .add_item(CustomMenuItem::new("beyond_transcend", "Transcend with Beyond"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("cognitive_state", "View Cognitive State"))
        .add_item(CustomMenuItem::new("field_dynamics", "Field Dynamics"))
    );

    let tools_menu = Submenu::new("Tools", Menu::new()
        .add_item(CustomMenuItem::new("terminal", "AI Terminal"))
        .add_item(CustomMenuItem::new("monitor", "Cognitive Monitor"))
        .add_item(CustomMenuItem::new("resonance", "Resonance Analyzer"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("performance", "Performance Monitor"))
        .add_item(CustomMenuItem::new("security", "Security Center"))
    );

    let window_menu = Submenu::new("Window", Menu::new()
        .add_native_item(MenuItem::Minimize)
        .add_native_item(MenuItem::Zoom)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::CloseWindow)
    );

    let help_menu = Submenu::new("Help", Menu::new()
        .add_item(CustomMenuItem::new("documentation", "Documentation"))
        .add_item(CustomMenuItem::new("tutorials", "Tutorials"))
        .add_item(CustomMenuItem::new("community", "Community"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("report_issue", "Report Issue"))
        .add_item(CustomMenuItem::new("feature_request", "Feature Request"))
    );

    Menu::new()
        .add_submenu(app_menu)
        .add_submenu(cognitive_menu)
        .add_submenu(tools_menu)
        .add_submenu(window_menu)
        .add_submenu(help_menu)
}

// System tray event handler
fn handle_system_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick {
            position: _,
            size: _,
            ..
        } => {
            info!("System tray left click");
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }
        SystemTrayEvent::RightClick {
            position: _,
            size: _,
            ..
        } => {
            info!("System tray right click");
        }
        SystemTrayEvent::DoubleClick {
            position: _,
            size: _,
            ..
        } => {
            info!("System tray double click");
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }
        SystemTrayEvent::MenuItemClick { id, .. } => {
            info!("System tray menu item clicked: {}", id);
            match id.as_str() {
                "cognitive_monitor" => {
                    open_cognitive_monitor(app).unwrap_or_else(|e| {
                        error!("Failed to open cognitive monitor: {}", e);
                    });
                }
                "field_resonance" => {
                    analyze_field_resonance(app).unwrap_or_else(|e| {
                        error!("Failed to analyze field resonance: {}", e);
                    });
                }
                "performance" => {
                    show_performance_metrics(app).unwrap_or_else(|e| {
                        error!("Failed to show performance metrics: {}", e);
                    });
                }
                "settings" => {
                    open_settings(app).unwrap_or_else(|e| {
                        error!("Failed to open settings: {}", e);
                    });
                }
                "about" => {
                    show_about_dialog(app).unwrap_or_else(|e| {
                        error!("Failed to show about dialog: {}", e);
                    });
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            }
        }
    }
}

// Helper functions for system tray actions
fn open_cognitive_monitor(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_window("cognitive-monitor");
    if let Some(window) = window {
        window.show()?;
        window.set_focus()?;
    } else {
        let _window = WindowBuilder::new(
            app,
            "cognitive-monitor",
            WindowUrl::App("cognitive-monitor.html".into())
        )
        .title("Cognitive Monitor")
        .inner_size(800.0, 600.0)
        .min_inner_size(600.0, 400.0)
        .transparent(true)
        .decorations(true)
        .always_on_top(true)
        .build()?;
    }
    Ok(())
}

fn analyze_field_resonance(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Trigger field resonance analysis
    let app_state: State<AppState> = app.state();
    let resonance_engine = app_state.resonance_engine.clone();
    
    async_runtime::spawn(async move {
        let resonance = resonance_engine.read().await;
        match resonance.analyze_current_field().await {
            Ok(analysis) => {
                info!("Field resonance analysis completed: {:?}", analysis);
            }
            Err(e) => {
                error!("Field resonance analysis failed: {}", e);
            }
        }
    });
    
    Ok(())
}

fn show_performance_metrics(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_state: State<AppState> = app.state();
    let performance_monitor = app_state.performance_monitor.clone();
    
    async_runtime::spawn(async move {
        let monitor = performance_monitor.read().await;
        let metrics = monitor.get_current_metrics().await;
        info!("Current performance metrics: {:?}", metrics);
    });
    
    Ok(())
}

fn open_settings(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Open settings window or navigate to settings page
    let window = app.get_window("main").unwrap();
    window.emit("navigate-to-settings", ())?;
    window.show()?;
    window.set_focus()?;
    Ok(())
}

fn show_about_dialog(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::api::dialog;
    
    let message = format!(
        "AI-OSX v{}\n\nBrain-Braun-Beyond Cognitive Architecture\n\nCopyright © 2024 AI-OSX Inc.\nAll rights reserved.",
        app.package_info().version
    );
    
    dialog::message(Some(&app.get_window("main").unwrap()), "About AI-OSX", message);
    Ok(())
}

// Global shortcut handlers
fn setup_global_shortcuts(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::GlobalShortcutManager;
    
    let app_handle = app.clone();
    app.global_shortcut_manager().register("CommandOrControl+Shift+A", move || {
        info!("Global shortcut: Show/Hide AI-OSX");
        let window = app_handle.get_window("main").unwrap();
        if window.is_visible().unwrap() {
            window.hide().unwrap();
        } else {
            window.show().unwrap();
            window.set_focus().unwrap();
        }
    })?;

    let app_handle = app.clone();
    app.global_shortcut_manager().register("CommandOrControl+Shift+T", move || {
        info!("Global shortcut: Open Terminal");
        let window = app_handle.get_window("terminal");
        if let Some(window) = window {
            window.show().unwrap();
            window.set_focus().unwrap();
        } else {
            let _window = WindowBuilder::new(
                &app_handle,
                "terminal",
                WindowUrl::App("terminal.html".into())
            )
            .title("AI-OSX Terminal")
            .inner_size(1000.0, 700.0)
            .min_inner_size(800.0, 500.0)
            .build()
            .unwrap();
        }
    })?;

    let app_handle = app.clone();
    app.global_shortcut_manager().register("CommandOrControl+Shift+M", move || {
        info!("Global shortcut: Open Cognitive Monitor");
        open_cognitive_monitor(&app_handle).unwrap_or_else(|e| {
            error!("Failed to open cognitive monitor via shortcut: {}", e);
        });
    })?;

    Ok(())
}

// Application initialization
async fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    info!("Setting up AI-OSX application...");

    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // Initialize application state
    let app_state = AppState::new().await?;
    app.manage(app_state);

    // Setup global shortcuts
    setup_global_shortcuts(&app.handle())?;

    // Initialize plugins
    let app_handle = app.handle();
    
    // Initialize the store plugin
    let _store = StoreBuilder::new(app.handle(), "settings.json".parse()?).build();

    info!("AI-OSX application setup completed successfully");
    Ok(())
}

#[tokio::main]
async fn main() {
    let context = generate_context!();
    
    Builder::default()
        .setup(|app| {
            async_runtime::block_on(async {
                setup_app(app).await.unwrap_or_else(|e| {
                    error!("Failed to setup application: {}", e);
                    std::process::exit(1);
                });
            });
            Ok(())
        })
        .menu(create_app_menu())
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_system_tray_event)
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(generate_handler![
            // Brain commands
            process_cognitive_request,
            get_cognitive_state,
            update_cognitive_context,
            
            // Braun commands
            execute_computation,
            get_computation_status,
            cancel_computation,
            
            // Beyond commands
            transcend_request,
            get_transcendence_state,
            explore_dimensions,
            
            // System commands
            get_system_info,
            get_performance_metrics,
            get_security_status,
            
            // Storage commands
            store_data,
            retrieve_data,
            delete_data,
            
            // Network commands
            connect_to_edge,
            disconnect_from_edge,
            get_edge_status,
            
            // Resonance commands
            start_resonance_analysis,
            stop_resonance_analysis,
            get_resonance_state,
            
            // Session management
            create_session,
            get_session,
            update_session,
            delete_session,
            
            // Window management
            open_window,
            close_window,
            toggle_window_visibility
        ])
        .run(context)
        .expect("error while running tauri application");
}