/**
 * Phoenix Presence - Real-time User Presence Tracking
 * 
 * Provides Phoenix-style presence tracking with:
 * - Real-time join/leave tracking
 * - Metadata synchronization
 * - Conflict-free replicated data types (CRDTs)
 * - Distributed presence across nodes
 * - Integration with channels
 */

use std::collections::{HashMap, HashSet, BTreeMap};
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use napi::bindgen_prelude::*;
use napi_derive::napi;

use crate::channel::{Topic, ChannelSystem};
use crate::pubsub::PubSubSystem;

/// Presence key (user identifier)
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PresenceKey(pub String);

/// Presence metadata for a single connection/session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceMeta {
    /// Unique connection ID
    pub connection_id: String,
    /// Node where the presence originates
    pub node_id: String,
    /// Timestamp when presence was established
    pub online_at: u64,
    /// Additional metadata (status, device info, etc.)
    pub metadata: HashMap<String, serde_json::Value>,
    /// Connection heartbeat timestamp
    pub last_heartbeat: u64,
    /// Connection quality metrics
    pub connection_quality: ConnectionQuality,
}

/// Connection quality information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionQuality {
    pub latency_ms: Option<u32>,
    pub signal_strength: Option<f32>, // 0.0 to 1.0
    pub connection_type: Option<String>, // "wifi", "cellular", "wired"
    pub bandwidth_kbps: Option<u32>,
}

impl Default for ConnectionQuality {
    fn default() -> Self {
        Self {
            latency_ms: None,
            signal_strength: None,
            connection_type: None,
            bandwidth_kbps: None,
        }
    }
}

/// Full presence state for a user (aggregated across connections)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceState {
    /// User/presence key
    pub key: PresenceKey,
    /// All active connections/sessions for this user
    pub connections: HashMap<String, PresenceMeta>,
    /// Merged metadata (latest wins or custom merge strategy)
    pub merged_metadata: HashMap<String, serde_json::Value>,
    /// First join timestamp (earliest connection)
    pub first_joined_at: u64,
    /// Last update timestamp
    pub updated_at: u64,
}

/// Presence diff for tracking changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceDiff {
    /// Users who joined
    pub joins: HashMap<PresenceKey, PresenceState>,
    /// Users who left
    pub leaves: HashMap<PresenceKey, PresenceState>,
    /// Users whose metadata changed
    pub updates: HashMap<PresenceKey, PresenceState>,
    /// Timestamp of this diff
    pub timestamp: u64,
}

impl PresenceDiff {
    pub fn new() -> Self {
        Self {
            joins: HashMap::new(),
            leaves: HashMap::new(),
            updates: HashMap::new(),
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.joins.is_empty() && self.leaves.is_empty() && self.updates.is_empty()
    }
}

/// Presence events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PresenceEvent {
    Join {
        topic: Topic,
        key: PresenceKey,
        meta: PresenceMeta,
    },
    Leave {
        topic: Topic,
        key: PresenceKey,
        connection_id: String,
    },
    Update {
        topic: Topic,
        key: PresenceKey,
        connection_id: String,
        meta: PresenceMeta,
    },
    StateSync {
        topic: Topic,
        state: HashMap<PresenceKey, PresenceState>,
    },
}

/// Presence configuration
#[derive(Debug, Clone)]
pub struct PresenceConfig {
    /// Heartbeat interval for connection liveness
    pub heartbeat_interval: Duration,
    /// Timeout for considering a connection dead
    pub connection_timeout: Duration,
    /// Enable automatic cleanup of stale connections
    pub auto_cleanup: bool,
    /// Node ID for distributed presence
    pub node_id: String,
    /// Custom metadata merge strategy
    pub merge_strategy: MergeStrategy,
}

/// Metadata merge strategies
#[derive(Debug, Clone)]
pub enum MergeStrategy {
    /// Latest value wins
    LatestWins,
    /// First value wins
    FirstWins,
    /// Custom merge function
    Custom(fn(&HashMap<String, serde_json::Value>, &HashMap<String, serde_json::Value>) -> HashMap<String, serde_json::Value>),
}

impl Default for PresenceConfig {
    fn default() -> Self {
        Self {
            heartbeat_interval: Duration::from_secs(30),
            connection_timeout: Duration::from_secs(90),
            auto_cleanup: true,
            node_id: format!("node_{}", Uuid::new_v4()),
            merge_strategy: MergeStrategy::LatestWins,
        }
    }
}

/// Phoenix Presence system
pub struct PresenceSystem {
    /// Topic -> Presence state mapping
    presence_state: Arc<RwLock<HashMap<Topic, HashMap<PresenceKey, PresenceState>>>>,
    /// Configuration
    config: PresenceConfig,
    /// Channel system integration
    channel_system: Option<Arc<ChannelSystem>>,
    /// PubSub for cross-node synchronization
    pubsub: Option<Arc<PubSubSystem>>,
    /// Statistics tracking
    stats: Arc<RwLock<PresenceStats>>,
}

/// Presence statistics
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct PresenceStats {
    pub total_topics: usize,
    pub total_users: usize,
    pub total_connections: usize,
    pub join_events: u64,
    pub leave_events: u64,
    pub update_events: u64,
    pub cleanup_runs: u64,
    pub stale_connections_removed: u64,
}

impl PresenceSystem {
    /// Create new presence system
    pub fn new(config: PresenceConfig) -> Self {
        Self {
            presence_state: Arc::new(RwLock::new(HashMap::new())),
            config,
            channel_system: None,
            pubsub: None,
            stats: Arc::new(RwLock::new(PresenceStats::default())),
        }
    }

    /// Create with channel system integration
    pub fn with_channels(mut self, channel_system: Arc<ChannelSystem>) -> Self {
        self.channel_system = Some(channel_system);
        self
    }

    /// Create with PubSub integration for distributed presence
    pub fn with_pubsub(mut self, pubsub: Arc<PubSubSystem>) -> Self {
        self.pubsub = Some(pubsub);
        self
    }

    /// Track user presence in a topic
    pub fn track(&self, topic: &Topic, key: PresenceKey, connection_id: String, metadata: HashMap<String, serde_json::Value>) -> Result<PresenceDiff, String> {
        let mut state = self.presence_state.write().unwrap();
        let topic_state = state.entry(topic.clone()).or_insert_with(HashMap::new);

        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;

        let meta = PresenceMeta {
            connection_id: connection_id.clone(),
            node_id: self.config.node_id.clone(),
            online_at: now,
            metadata: metadata.clone(),
            last_heartbeat: now,
            connection_quality: ConnectionQuality::default(),
        };

        let mut diff = PresenceDiff::new();

        if let Some(presence_state) = topic_state.get_mut(&key) {
            // User already present, add new connection
            let was_first_connection = presence_state.connections.is_empty();
            presence_state.connections.insert(connection_id.clone(), meta);
            
            // Update merged metadata
            presence_state.merged_metadata = self.merge_metadata(&presence_state.merged_metadata, &metadata);
            presence_state.updated_at = now;

            if was_first_connection {
                // First connection for this user
                presence_state.first_joined_at = now;
                diff.joins.insert(key.clone(), presence_state.clone());
                
                let mut stats = self.stats.write().unwrap();
                stats.join_events += 1;
            } else {
                // Additional connection or metadata update
                diff.updates.insert(key.clone(), presence_state.clone());
                
                let mut stats = self.stats.write().unwrap();
                stats.update_events += 1;
            }
        } else {
            // New user presence
            let new_state = PresenceState {
                key: key.clone(),
                connections: {
                    let mut connections = HashMap::new();
                    connections.insert(connection_id, meta);
                    connections
                },
                merged_metadata: metadata,
                first_joined_at: now,
                updated_at: now,
            };

            topic_state.insert(key.clone(), new_state.clone());
            diff.joins.insert(key, new_state);

            let mut stats = self.stats.write().unwrap();
            stats.join_events += 1;
            stats.total_users = self.count_unique_users();
        }

        // Update stats
        {
            let mut stats = self.stats.write().unwrap();
            stats.total_topics = state.len();
            stats.total_connections = self.count_total_connections(&state);
        }

        Ok(diff)
    }

    /// Untrack user presence (remove connection)
    pub fn untrack(&self, topic: &Topic, key: &PresenceKey, connection_id: &str) -> Result<PresenceDiff, String> {
        let mut state = self.presence_state.write().unwrap();
        let mut diff = PresenceDiff::new();

        if let Some(topic_state) = state.get_mut(topic) {
            if let Some(presence_state) = topic_state.get_mut(key) {
                if presence_state.connections.remove(connection_id).is_some() {
                    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
                    presence_state.updated_at = now;

                    if presence_state.connections.is_empty() {
                        // Last connection, user is leaving
                        let leaving_state = presence_state.clone();
                        topic_state.remove(key);
                        diff.leaves.insert(key.clone(), leaving_state);

                        // Clean up empty topics
                        if topic_state.is_empty() {
                            state.remove(topic);
                        }
                    } else {
                        // Still has other connections, just update
                        // Recompute merged metadata from remaining connections
                        presence_state.merged_metadata = self.recompute_merged_metadata(&presence_state.connections);
                        diff.updates.insert(key.clone(), presence_state.clone());
                    }

                    let mut stats = self.stats.write().unwrap();
                    stats.leave_events += 1;
                    stats.total_users = self.count_unique_users();
                    stats.total_connections = self.count_total_connections(&state);
                    
                    return Ok(diff);
                }
            }
        }

        Err(format!("Connection {} for user {:?} not found in topic {:?}", connection_id, key, topic))
    }

    /// Update presence metadata for a connection
    pub fn update(&self, topic: &Topic, key: &PresenceKey, connection_id: &str, metadata: HashMap<String, serde_json::Value>) -> Result<PresenceDiff, String> {
        let mut state = self.presence_state.write().unwrap();
        let mut diff = PresenceDiff::new();

        if let Some(topic_state) = state.get_mut(topic) {
            if let Some(presence_state) = topic_state.get_mut(key) {
                if let Some(connection_meta) = presence_state.connections.get_mut(connection_id) {
                    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
                    
                    connection_meta.metadata = metadata.clone();
                    connection_meta.last_heartbeat = now;
                    presence_state.updated_at = now;

                    // Update merged metadata
                    presence_state.merged_metadata = self.recompute_merged_metadata(&presence_state.connections);

                    diff.updates.insert(key.clone(), presence_state.clone());

                    let mut stats = self.stats.write().unwrap();
                    stats.update_events += 1;

                    return Ok(diff);
                }
            }
        }

        Err(format!("Connection {} for user {:?} not found in topic {:?}", connection_id, key, topic))
    }

    /// Heartbeat to keep connection alive
    pub fn heartbeat(&self, topic: &Topic, key: &PresenceKey, connection_id: &str) -> Result<(), String> {
        let mut state = self.presence_state.write().unwrap();

        if let Some(topic_state) = state.get_mut(topic) {
            if let Some(presence_state) = topic_state.get_mut(key) {
                if let Some(connection_meta) = presence_state.connections.get_mut(connection_id) {
                    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
                    connection_meta.last_heartbeat = now;
                    return Ok(());
                }
            }
        }

        Err(format!("Connection {} for user {:?} not found in topic {:?}", connection_id, key, topic))
    }

    /// Get current presence state for a topic
    pub fn list(&self, topic: &Topic) -> HashMap<PresenceKey, PresenceState> {
        let state = self.presence_state.read().unwrap();
        state.get(topic).cloned().unwrap_or_default()
    }

    /// Get presence state for specific user
    pub fn get(&self, topic: &Topic, key: &PresenceKey) -> Option<PresenceState> {
        let state = self.presence_state.read().unwrap();
        state.get(topic)?.get(key).cloned()
    }

    /// Clean up stale connections
    pub fn cleanup_stale_connections(&self) -> u64 {
        let mut state = self.presence_state.write().unwrap();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
        let timeout_ms = self.config.connection_timeout.as_millis() as u64;
        let mut removed_count = 0;

        let topics_to_remove: Vec<Topic> = Vec::new();
        
        for (topic, topic_state) in state.iter_mut() {
            let users_to_remove: Vec<PresenceKey> = Vec::new();

            for (user_key, presence_state) in topic_state.iter_mut() {
                let connections_to_remove: Vec<String> = presence_state
                    .connections
                    .iter()
                    .filter(|(_, meta)| now - meta.last_heartbeat > timeout_ms)
                    .map(|(conn_id, _)| conn_id.clone())
                    .collect();

                for conn_id in connections_to_remove {
                    presence_state.connections.remove(&conn_id);
                    removed_count += 1;
                }

                // Recompute merged metadata if connections remain
                if !presence_state.connections.is_empty() {
                    presence_state.merged_metadata = self.recompute_merged_metadata(&presence_state.connections);
                }
            }

            // Remove users with no connections
            topic_state.retain(|_, presence_state| !presence_state.connections.is_empty());
        }

        // Remove empty topics
        state.retain(|_, topic_state| !topic_state.is_empty());

        let mut stats = self.stats.write().unwrap();
        stats.cleanup_runs += 1;
        stats.stale_connections_removed += removed_count;

        removed_count
    }

    /// Get all topics with presence
    pub fn topics(&self) -> Vec<Topic> {
        let state = self.presence_state.read().unwrap();
        state.keys().cloned().collect()
    }

    /// Get system statistics
    pub fn stats(&self) -> PresenceStats {
        self.stats.read().unwrap().clone()
    }

    /// Helper: merge metadata according to strategy
    fn merge_metadata(&self, existing: &HashMap<String, serde_json::Value>, new: &HashMap<String, serde_json::Value>) -> HashMap<String, serde_json::Value> {
        match &self.config.merge_strategy {
            MergeStrategy::LatestWins => {
                let mut result = existing.clone();
                result.extend(new.clone());
                result
            },
            MergeStrategy::FirstWins => {
                let mut result = new.clone();
                result.extend(existing.clone());
                result
            },
            MergeStrategy::Custom(merge_fn) => merge_fn(existing, new),
        }
    }

    /// Helper: recompute merged metadata from all connections
    fn recompute_merged_metadata(&self, connections: &HashMap<String, PresenceMeta>) -> HashMap<String, serde_json::Value> {
        let mut merged = HashMap::new();

        for connection in connections.values() {
            merged = self.merge_metadata(&merged, &connection.metadata);
        }

        merged
    }

    /// Helper: count unique users across all topics
    fn count_unique_users(&self) -> usize {
        let state = self.presence_state.read().unwrap();
        state.values()
            .map(|topic_state| topic_state.len())
            .sum()
    }

    /// Helper: count total connections across all topics
    fn count_total_connections(&self, state: &HashMap<Topic, HashMap<PresenceKey, PresenceState>>) -> usize {
        state.values()
            .flat_map(|topic_state| topic_state.values())
            .map(|presence_state| presence_state.connections.len())
            .sum()
    }

    /// Start background cleanup task
    pub fn start_cleanup_task(&self) -> tokio::task::JoinHandle<()> {
        let presence_system = Arc::new(self.clone());
        let cleanup_interval = self.config.heartbeat_interval * 2;

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(cleanup_interval);
            
            loop {
                interval.tick().await;
                presence_system.cleanup_stale_connections();
            }
        })
    }
}

impl Clone for PresenceSystem {
    fn clone(&self) -> Self {
        Self {
            presence_state: Arc::clone(&self.presence_state),
            config: self.config.clone(),
            channel_system: self.channel_system.clone(),
            pubsub: self.pubsub.clone(),
            stats: Arc::clone(&self.stats),
        }
    }
}

// NAPI JavaScript bindings
#[napi]
pub struct JsPresenceSystem {
    inner: Arc<PresenceSystem>,
}

#[napi]
impl JsPresenceSystem {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(PresenceSystem::new(PresenceConfig::default())),
        }
    }

    /// Track user presence
    #[napi]
    pub fn track(&self, topic: String, user_key: String, connection_id: String, metadata: Object) -> Result<Object> {
        // Convert JavaScript object to HashMap
        let metadata_map: HashMap<String, serde_json::Value> = HashMap::new(); // TODO: Parse from JS object

        let topic = Topic(topic);
        let key = PresenceKey(user_key);

        let diff = self.inner.track(&topic, key, connection_id, metadata_map)
            .map_err(|e| napi::Error::from_reason(e))?;

        // Convert diff to JavaScript object
        let mut obj = Object::new();
        obj.set("joins", diff.joins.len() as u32)?;
        obj.set("leaves", diff.leaves.len() as u32)?;
        obj.set("updates", diff.updates.len() as u32)?;
        obj.set("timestamp", diff.timestamp as f64)?;

        Ok(obj)
    }

    /// Untrack user presence
    #[napi]
    pub fn untrack(&self, topic: String, user_key: String, connection_id: String) -> Result<Object> {
        let topic = Topic(topic);
        let key = PresenceKey(user_key);

        let diff = self.inner.untrack(&topic, &key, &connection_id)
            .map_err(|e| napi::Error::from_reason(e))?;

        // Convert diff to JavaScript object
        let mut obj = Object::new();
        obj.set("joins", diff.joins.len() as u32)?;
        obj.set("leaves", diff.leaves.len() as u32)?;
        obj.set("updates", diff.updates.len() as u32)?;
        obj.set("timestamp", diff.timestamp as f64)?;

        Ok(obj)
    }

    /// Update presence metadata
    #[napi]
    pub fn update(&self, topic: String, user_key: String, connection_id: String, metadata: Object) -> Result<Object> {
        // Convert JavaScript object to HashMap
        let metadata_map: HashMap<String, serde_json::Value> = HashMap::new(); // TODO: Parse from JS object

        let topic = Topic(topic);
        let key = PresenceKey(user_key);

        let diff = self.inner.update(&topic, &key, &connection_id, metadata_map)
            .map_err(|e| napi::Error::from_reason(e))?;

        // Convert diff to JavaScript object
        let mut obj = Object::new();
        obj.set("joins", diff.joins.len() as u32)?;
        obj.set("leaves", diff.leaves.len() as u32)?;
        obj.set("updates", diff.updates.len() as u32)?;
        obj.set("timestamp", diff.timestamp as f64)?;

        Ok(obj)
    }

    /// Send heartbeat
    #[napi]
    pub fn heartbeat(&self, topic: String, user_key: String, connection_id: String) -> Result<()> {
        let topic = Topic(topic);
        let key = PresenceKey(user_key);

        self.inner.heartbeat(&topic, &key, &connection_id)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// List all users in topic
    #[napi]
    pub fn list(&self, topic: String) -> Vec<String> {
        let topic = Topic(topic);
        let presence_state = self.inner.list(&topic);
        
        presence_state.keys()
            .map(|key| key.0.clone())
            .collect()
    }

    /// Get presence info for specific user
    #[napi]
    pub fn get(&self, topic: String, user_key: String) -> Option<Object> {
        let topic = Topic(topic);
        let key = PresenceKey(user_key);

        let presence = self.inner.get(&topic, &key)?;

        let mut obj = Object::new();
        obj.set("key", presence.key.0).ok()?;
        obj.set("connections", presence.connections.len() as u32).ok()?;
        obj.set("firstJoinedAt", presence.first_joined_at as f64).ok()?;
        obj.set("updatedAt", presence.updated_at as f64).ok()?;

        Some(obj)
    }

    /// Clean up stale connections
    #[napi]
    pub fn cleanup(&self) -> u32 {
        self.inner.cleanup_stale_connections() as u32
    }

    /// Get topics
    #[napi]
    pub fn topics(&self) -> Vec<String> {
        self.inner.topics()
            .into_iter()
            .map(|topic| topic.0)
            .collect()
    }

    /// Get statistics
    #[napi]
    pub fn stats(&self) -> Object {
        let stats = self.inner.stats();
        let mut obj = Object::new();

        obj.set("totalTopics", stats.total_topics as u32).unwrap();
        obj.set("totalUsers", stats.total_users as u32).unwrap();
        obj.set("totalConnections", stats.total_connections as u32).unwrap();
        obj.set("joinEvents", stats.join_events as u32).unwrap();
        obj.set("leaveEvents", stats.leave_events as u32).unwrap();
        obj.set("updateEvents", stats.update_events as u32).unwrap();
        obj.set("cleanupRuns", stats.cleanup_runs as u32).unwrap();
        obj.set("staleConnectionsRemoved", stats.stale_connections_removed as u32).unwrap();

        obj
    }
}

/// Global presence system
static GLOBAL_PRESENCE: std::sync::OnceLock<Arc<PresenceSystem>> = std::sync::OnceLock::new();

pub fn global_presence() -> &'static Arc<PresenceSystem> {
    GLOBAL_PRESENCE.get_or_init(|| Arc::new(PresenceSystem::new(PresenceConfig::default())))
}

/// Convenience functions
#[napi]
pub fn presence_track(topic: String, user_key: String, connection_id: String) -> Result<Object> {
    let system = global_presence();
    let topic = Topic(topic);
    let key = PresenceKey(user_key);
    let metadata = HashMap::new();

    let diff = system.track(&topic, key, connection_id, metadata)
        .map_err(|e| napi::Error::from_reason(e))?;

    let mut obj = Object::new();
    obj.set("success", true)?;
    Ok(obj)
}

#[napi]
pub fn presence_untrack(topic: String, user_key: String, connection_id: String) -> Result<Object> {
    let system = global_presence();
    let topic = Topic(topic);
    let key = PresenceKey(user_key);

    let diff = system.untrack(&topic, &key, &connection_id)
        .map_err(|e| napi::Error::from_reason(e))?;

    let mut obj = Object::new();
    obj.set("success", true)?;
    Ok(obj)
}

#[napi]
pub fn presence_list(topic: String) -> Vec<String> {
    let system = global_presence();
    let topic = Topic(topic);
    let presence_state = system.list(&topic);
    
    presence_state.keys()
        .map(|key| key.0.clone())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_presence_basic_operations() {
        let config = PresenceConfig::default();
        let system = PresenceSystem::new(config);
        let topic = Topic("room:1".to_string());
        let user_key = PresenceKey("user123".to_string());
        let connection_id = "conn_1".to_string();
        let metadata = HashMap::new();

        // Track user
        let diff = system.track(&topic, user_key.clone(), connection_id.clone(), metadata).unwrap();
        assert_eq!(diff.joins.len(), 1);
        assert_eq!(diff.leaves.len(), 0);

        // List users
        let users = system.list(&topic);
        assert_eq!(users.len(), 1);
        assert!(users.contains_key(&user_key));

        // Untrack user
        let diff = system.untrack(&topic, &user_key, &connection_id).unwrap();
        assert_eq!(diff.joins.len(), 0);
        assert_eq!(diff.leaves.len(), 1);

        // List users after untrack
        let users = system.list(&topic);
        assert_eq!(users.len(), 0);
    }

    #[test]
    fn test_presence_multiple_connections() {
        let config = PresenceConfig::default();
        let system = PresenceSystem::new(config);
        let topic = Topic("room:1".to_string());
        let user_key = PresenceKey("user123".to_string());
        
        // Track same user from multiple connections
        system.track(&topic, user_key.clone(), "conn_1".to_string(), HashMap::new()).unwrap();
        let diff = system.track(&topic, user_key.clone(), "conn_2".to_string(), HashMap::new()).unwrap();
        
        // Should be an update, not a new join
        assert_eq!(diff.joins.len(), 0);
        assert_eq!(diff.updates.len(), 1);

        // Get user state
        let presence = system.get(&topic, &user_key).unwrap();
        assert_eq!(presence.connections.len(), 2);

        // Remove one connection
        let diff = system.untrack(&topic, &user_key, "conn_1").unwrap();
        assert_eq!(diff.leaves.len(), 0);
        assert_eq!(diff.updates.len(), 1);

        // Remove last connection
        let diff = system.untrack(&topic, &user_key, "conn_2").unwrap();
        assert_eq!(diff.leaves.len(), 1);
    }
}