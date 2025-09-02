// Application state and data storage
// Provides persistent storage, configuration, and state management

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::Mutex;
use tauri::AppHandle;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ConfigValue {
    String(String),
    Number(f64),
    Boolean(bool),
    Array(Vec<ConfigValue>),
    Object(HashMap<String, ConfigValue>),
}

#[derive(Default)]
pub struct AppState {
    pub store: Mutex<HashMap<String, ConfigValue>>,
}

pub fn init_database(app: AppHandle) -> Result<()> {
    // Initialize SQLite database for persistent storage
    let app_dir = app.path_resolver()
        .app_data_dir()
        .ok_or_else(|| anyhow::anyhow!("Failed to get app data directory"))?;
    
    std::fs::create_dir_all(&app_dir)?;
    
    let db_path = app_dir.join("katalyst.db");
    
    // Initialize database tables
    let conn = rusqlite::Connection::open(db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            data_type TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    Ok(())
}