// Tauri commands - Unified API for desktop, mobile, and WebXR functionality
// Provides the bridge between Rust backend and React frontend

use tauri::{AppHandle, State, Window};
use serde::{Deserialize, Serialize};
use anyhow::Result;
use std::collections::HashMap;

use crate::store::{AppState, ConfigValue};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub platform: String,
    pub is_dev_mode: bool,
    pub features: Vec<String>,
    pub build_info: BuildInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildInfo {
    pub commit_hash: String,
    pub build_date: String,
    pub rust_version: String,
    pub target_triple: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub cpu_count: usize,
    pub total_memory: u64,
    pub available_memory: u64,
    pub hostname: String,
    pub username: String,
}

// General application commands

#[tauri::command]
pub async fn get_app_info(app: AppHandle) -> Result<AppInfo, String> {
    let package_info = app.package_info();
    
    Ok(AppInfo {
        name: package_info.name.clone(),
        version: package_info.version.to_string(),
        platform: std::env::consts::OS.to_string(),
        is_dev_mode: cfg!(debug_assertions),
        features: get_enabled_features(),
        build_info: BuildInfo {
            commit_hash: env!("VERGEN_GIT_SHA").to_string(),
            build_date: env!("VERGEN_BUILD_DATE").to_string(),
            rust_version: env!("VERGEN_RUSTC_SEMVER").to_string(),
            target_triple: std::env::consts::ARCH.to_string(),
        },
    })
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    use std::env;
    
    Ok(SystemInfo {
        os: env::consts::OS.to_string(),
        arch: env::consts::ARCH.to_string(),
        cpu_count: num_cpus::get(),
        total_memory: get_total_memory(),
        available_memory: get_available_memory(),
        hostname: gethostname::gethostname().to_string_lossy().to_string(),
        username: env::var("USER").or_else(|_| env::var("USERNAME")).unwrap_or_else(|_| "unknown".to_string()),
    })
}

// File system commands

#[tauri::command]
pub async fn read_config_file(app: AppHandle, file_path: String) -> Result<String, String> {
    use std::fs;
    
    let app_dir = app.path_resolver()
        .app_config_dir()
        .ok_or("Failed to get app config directory")?;
    
    let full_path = app_dir.join(&file_path);
    
    fs::read_to_string(full_path)
        .map_err(|e| format!("Failed to read config file '{}': {}", file_path, e))
}

#[tauri::command]
pub async fn write_config_file(
    app: AppHandle,
    file_path: String,
    content: String,
) -> Result<(), String> {
    use std::fs;
    
    let app_dir = app.path_resolver()
        .app_config_dir()
        .ok_or("Failed to get app config directory")?;
    
    let full_path = app_dir.join(&file_path);
    
    // Create parent directories if they don't exist
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }
    
    fs::write(full_path, content)
        .map_err(|e| format!("Failed to write config file '{}': {}", file_path, e))
}

#[tauri::command]
pub async fn get_app_dir(app: AppHandle, dir_type: String) -> Result<String, String> {
    let path = match dir_type.as_str() {
        "config" => app.path_resolver().app_config_dir(),
        "data" => app.path_resolver().app_data_dir(),
        "local_data" => app.path_resolver().app_local_data_dir(),
        "cache" => app.path_resolver().app_cache_dir(),
        "log" => app.path_resolver().app_log_dir(),
        _ => return Err(format!("Unknown directory type: {}", dir_type)),
    };
    
    path.ok_or_else(|| format!("Failed to get {} directory", dir_type))
        .map(|p| p.to_string_lossy().to_string())
}

// Store commands

#[tauri::command]
pub async fn store_get(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<ConfigValue>, String> {
    let store = state.store.lock().await;
    Ok(store.get(&key).cloned())
}

#[tauri::command]
pub async fn store_set(
    state: State<'_, AppState>,
    key: String,
    value: ConfigValue,
) -> Result<(), String> {
    let mut store = state.store.lock().await;
    store.insert(key, value);
    Ok(())
}

#[tauri::command]
pub async fn store_delete(
    state: State<'_, AppState>,
    key: String,
) -> Result<bool, String> {
    let mut store = state.store.lock().await;
    Ok(store.remove(&key).is_some())
}

#[tauri::command]
pub async fn store_clear(state: State<'_, AppState>) -> Result<(), String> {
    let mut store = state.store.lock().await;
    store.clear();
    Ok(())
}

// Development commands

#[tauri::command]
pub async fn toggle_dev_mode(app: AppHandle) -> Result<bool, String> {
    // Toggle development mode features
    let is_dev = cfg!(debug_assertions);
    
    if is_dev {
        // Enable development features
        if let Some(window) = app.get_window("main") {
            window.open_devtools();
        }
    }
    
    Ok(is_dev)
}

#[tauri::command]
pub async fn reload_app(window: Window) -> Result<(), String> {
    window.eval("window.location.reload()")
        .map_err(|e| format!("Failed to reload app: {}", e))
}

#[tauri::command]
pub async fn open_devtools(window: Window) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        window.open_devtools();
        Ok(())
    }
    
    #[cfg(not(debug_assertions))]
    {
        Err("DevTools not available in release mode".to_string())
    }
}

#[tauri::command]
pub async fn get_logs(app: AppHandle, lines: Option<usize>) -> Result<Vec<String>, String> {
    use std::fs;
    
    let log_dir = app.path_resolver()
        .app_log_dir()
        .ok_or("Failed to get log directory")?;
    
    let log_file = log_dir.join("katalyst.log");
    
    if !log_file.exists() {
        return Ok(vec!["No log file found".to_string()]);
    }
    
    let content = fs::read_to_string(log_file)
        .map_err(|e| format!("Failed to read log file: {}", e))?;
    
    let mut lines_vec: Vec<String> = content.lines().map(|s| s.to_string()).collect();
    
    if let Some(limit) = lines {
        if lines_vec.len() > limit {
            lines_vec = lines_vec.into_iter().rev().take(limit).rev().collect();
        }
    }
    
    Ok(lines_vec)
}

// Utility functions

fn get_enabled_features() -> Vec<String> {
    let mut features = vec![
        "desktop".to_string(),
        "webxr".to_string(),
        "mobile".to_string(),
        "multithreading".to_string(),
        "rspack".to_string(),
    ];
    
    #[cfg(debug_assertions)]
    features.push("devtools".to_string());
    
    #[cfg(feature = "mobile")]
    features.push("mobile-platform".to_string());
    
    #[cfg(feature = "webxr")]
    features.push("webxr-platform".to_string());
    
    features
}

fn get_total_memory() -> u64 {
    #[cfg(target_os = "linux")]
    {
        use std::fs;
        if let Ok(meminfo) = fs::read_to_string("/proc/meminfo") {
            for line in meminfo.lines() {
                if line.starts_with("MemTotal:") {
                    if let Some(kb) = line.split_whitespace().nth(1) {
                        if let Ok(kb_val) = kb.parse::<u64>() {
                            return kb_val * 1024; // Convert to bytes
                        }
                    }
                }
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if let Ok(output) = Command::new("sysctl").arg("-n").arg("hw.memsize").output() {
            if let Ok(mem_str) = String::from_utf8(output.stdout) {
                if let Ok(mem_val) = mem_str.trim().parse::<u64>() {
                    return mem_val;
                }
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows memory detection would go here
        // For now, return a default value
    }
    
    8_589_934_592 // 8GB default
}

fn get_available_memory() -> u64 {
    // Simplified implementation - in practice, you'd use platform-specific APIs
    get_total_memory() / 2 // Return roughly half as "available"
}