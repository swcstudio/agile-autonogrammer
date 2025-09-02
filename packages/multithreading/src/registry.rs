/**
 * Process Registry - Advanced Process Naming and Discovery
 * 
 * Provides Elixir-style process registration and discovery with:
 * - Named process registration
 * - Global and local scopes
 * - Process groups and clustering
 * - Metadata and property storage
 * - Query and pattern matching
 */

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use async_channel::{Receiver, Sender};
use serde::{Serialize, Deserialize};
use napi::bindgen_prelude::*;
use napi_derive::napi;

use crate::actor::{ActorId, ActorRef};

/// Registry key types
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RegistryKey {
    /// Atom-style name (string identifier)
    Name(String),
    /// Tuple key for hierarchical naming
    Tuple(Vec<String>),
    /// Process ID
    Pid(ActorId),
    /// Via tuple for indirect naming
    Via(String, String), // (module, name)
}

/// Process metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessMeta {
    /// Process unique ID
    pub id: ActorId,
    /// Registration key
    pub key: RegistryKey,
    /// Registration timestamp
    pub registered_at: u64,
    /// Process metadata/properties
    pub properties: HashMap<String, String>,
    /// Process tags for grouping
    pub tags: HashSet<String>,
    /// Node ID for distributed systems
    pub node_id: Option<String>,
}

/// Registry entry
#[derive(Debug, Clone)]
struct RegistryEntry {
    actor_ref: ActorRef,
    meta: ProcessMeta,
}

/// Process query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessQuery {
    /// Match by key pattern
    pub key_pattern: Option<String>,
    /// Match by properties
    pub properties: Option<HashMap<String, String>>,
    /// Match by tags
    pub tags: Option<HashSet<String>>,
    /// Match by node
    pub node_id: Option<String>,
    /// Limit results
    pub limit: Option<usize>,
}

/// Registry statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryStats {
    pub total_processes: usize,
    pub processes_by_node: HashMap<String, usize>,
    pub processes_by_tag: HashMap<String, usize>,
    pub memory_usage: usize,
    pub uptime_ms: u64,
}

/// Core process registry
pub struct ProcessRegistry {
    /// Name -> Process mapping
    registry: Arc<RwLock<HashMap<RegistryKey, RegistryEntry>>>,
    /// Reverse lookup: ActorId -> Keys
    reverse_lookup: Arc<RwLock<HashMap<ActorId, HashSet<RegistryKey>>>>,
    /// Global properties store
    properties: Arc<RwLock<HashMap<String, String>>>,
    /// Registry creation time
    created_at: SystemTime,
    /// Event channel for registry changes
    event_sender: Sender<RegistryEvent>,
    event_receiver: Receiver<RegistryEvent>,
}

/// Registry events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RegistryEvent {
    ProcessRegistered {
        key: RegistryKey,
        actor_id: ActorId,
        properties: HashMap<String, String>,
    },
    ProcessUnregistered {
        key: RegistryKey,
        actor_id: ActorId,
    },
    ProcessUpdated {
        key: RegistryKey,
        actor_id: ActorId,
        properties: HashMap<String, String>,
    },
}

impl ProcessRegistry {
    /// Create new registry
    pub fn new() -> Self {
        let (event_sender, event_receiver) = async_channel::unbounded();
        
        Self {
            registry: Arc::new(RwLock::new(HashMap::new())),
            reverse_lookup: Arc::new(RwLock::new(HashMap::new())),
            properties: Arc::new(RwLock::new(HashMap::new())),
            created_at: SystemTime::now(),
            event_sender,
            event_receiver,
        }
    }

    /// Register a process with a name
    pub fn register(&self, key: RegistryKey, actor_ref: ActorRef, properties: Option<HashMap<String, String>>) -> Result<(), String> {
        let mut registry = self.registry.write().unwrap();
        let mut reverse = self.reverse_lookup.write().unwrap();

        // Check if key already exists
        if registry.contains_key(&key) {
            return Err(format!("Key {:?} already registered", key));
        }

        let actor_id = actor_ref.id;
        let props = properties.unwrap_or_default();
        
        let meta = ProcessMeta {
            id: actor_id,
            key: key.clone(),
            registered_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            properties: props.clone(),
            tags: HashSet::new(),
            node_id: None,
        };

        let entry = RegistryEntry {
            actor_ref,
            meta,
        };

        registry.insert(key.clone(), entry);
        reverse.entry(actor_id).or_insert_with(HashSet::new).insert(key.clone());

        // Send registration event
        let _ = self.event_sender.try_send(RegistryEvent::ProcessRegistered {
            key,
            actor_id,
            properties: props,
        });

        Ok(())
    }

    /// Unregister a process by key
    pub fn unregister(&self, key: &RegistryKey) -> Result<(), String> {
        let mut registry = self.registry.write().unwrap();
        let mut reverse = self.reverse_lookup.write().unwrap();

        if let Some(entry) = registry.remove(key) {
            let actor_id = entry.actor_ref.id;
            
            // Update reverse lookup
            if let Some(keys) = reverse.get_mut(&actor_id) {
                keys.remove(key);
                if keys.is_empty() {
                    reverse.remove(&actor_id);
                }
            }

            // Send unregistration event
            let _ = self.event_sender.try_send(RegistryEvent::ProcessUnregistered {
                key: key.clone(),
                actor_id,
            });

            Ok(())
        } else {
            Err(format!("Key {:?} not found", key))
        }
    }

    /// Unregister all keys for an actor
    pub fn unregister_actor(&self, actor_id: ActorId) -> Result<usize, String> {
        let reverse = self.reverse_lookup.read().unwrap();
        let keys_to_remove: Vec<RegistryKey> = reverse
            .get(&actor_id)
            .map(|keys| keys.iter().cloned().collect())
            .unwrap_or_default();

        drop(reverse);

        let mut count = 0;
        for key in keys_to_remove {
            if self.unregister(&key).is_ok() {
                count += 1;
            }
        }

        Ok(count)
    }

    /// Look up a process by key
    pub fn whereis(&self, key: &RegistryKey) -> Option<ActorRef> {
        let registry = self.registry.read().unwrap();
        registry.get(key).map(|entry| entry.actor_ref)
    }

    /// Get process metadata
    pub fn get_meta(&self, key: &RegistryKey) -> Option<ProcessMeta> {
        let registry = self.registry.read().unwrap();
        registry.get(key).map(|entry| entry.meta.clone())
    }

    /// Update process properties
    pub fn update_properties(&self, key: &RegistryKey, properties: HashMap<String, String>) -> Result<(), String> {
        let mut registry = self.registry.write().unwrap();
        
        if let Some(entry) = registry.get_mut(key) {
            entry.meta.properties.extend(properties.clone());

            // Send update event
            let _ = self.event_sender.try_send(RegistryEvent::ProcessUpdated {
                key: key.clone(),
                actor_id: entry.actor_ref.id,
                properties,
            });

            Ok(())
        } else {
            Err(format!("Key {:?} not found", key))
        }
    }

    /// Add tags to a process
    pub fn add_tags(&self, key: &RegistryKey, tags: HashSet<String>) -> Result<(), String> {
        let mut registry = self.registry.write().unwrap();
        
        if let Some(entry) = registry.get_mut(key) {
            entry.meta.tags.extend(tags);
            Ok(())
        } else {
            Err(format!("Key {:?} not found", key))
        }
    }

    /// Query processes
    pub fn query(&self, query: &ProcessQuery) -> Vec<ProcessMeta> {
        let registry = self.registry.read().unwrap();
        let mut results: Vec<ProcessMeta> = registry
            .values()
            .filter_map(|entry| {
                let meta = &entry.meta;

                // Match key pattern
                if let Some(pattern) = &query.key_pattern {
                    match &meta.key {
                        RegistryKey::Name(name) => {
                            if !name.contains(pattern) {
                                return None;
                            }
                        }
                        _ => return None,
                    }
                }

                // Match properties
                if let Some(props) = &query.properties {
                    for (key, value) in props {
                        if meta.properties.get(key) != Some(value) {
                            return None;
                        }
                    }
                }

                // Match tags
                if let Some(tags) = &query.tags {
                    if !tags.iter().all(|tag| meta.tags.contains(tag)) {
                        return None;
                    }
                }

                // Match node
                if let Some(node) = &query.node_id {
                    if meta.node_id.as_ref() != Some(node) {
                        return None;
                    }
                }

                Some(meta.clone())
            })
            .collect();

        // Apply limit
        if let Some(limit) = query.limit {
            results.truncate(limit);
        }

        results
    }

    /// List all registered keys
    pub fn keys(&self) -> Vec<RegistryKey> {
        let registry = self.registry.read().unwrap();
        registry.keys().cloned().collect()
    }

    /// Get registry statistics
    pub fn stats(&self) -> RegistryStats {
        let registry = self.registry.read().unwrap();
        let total_processes = registry.len();

        let mut processes_by_node = HashMap::new();
        let mut processes_by_tag = HashMap::new();

        for entry in registry.values() {
            // Count by node
            let node = entry.meta.node_id.as_deref().unwrap_or("local");
            *processes_by_node.entry(node.to_string()).or_insert(0) += 1;

            // Count by tags
            for tag in &entry.meta.tags {
                *processes_by_tag.entry(tag.clone()).or_insert(0) += 1;
            }
        }

        let memory_usage = std::mem::size_of_val(&*registry) + 
            registry.iter().map(|(k, v)| {
                std::mem::size_of_val(k) + std::mem::size_of_val(v)
            }).sum::<usize>();

        let uptime_ms = self.created_at
            .elapsed()
            .unwrap_or_default()
            .as_millis() as u64;

        RegistryStats {
            total_processes,
            processes_by_node,
            processes_by_tag,
            memory_usage,
            uptime_ms,
        }
    }

    /// Get event receiver for monitoring changes
    pub fn events(&self) -> Receiver<RegistryEvent> {
        self.event_receiver.clone()
    }

    /// Global registry instance (singleton pattern for default registry)
    pub fn global() -> &'static Arc<ProcessRegistry> {
        static GLOBAL_REGISTRY: std::sync::OnceLock<Arc<ProcessRegistry>> = std::sync::OnceLock::new();
        GLOBAL_REGISTRY.get_or_init(|| Arc::new(ProcessRegistry::new()))
    }
}

// NAPI JavaScript bindings
#[napi]
pub struct JsProcessRegistry {
    inner: Arc<ProcessRegistry>,
}

#[napi]
impl JsProcessRegistry {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(ProcessRegistry::new()),
        }
    }

    /// Register a process with a name
    #[napi]
    pub fn register(&self, name: String, actor_id: String, properties: Option<HashMap<String, String>>) -> Result<()> {
        let key = RegistryKey::Name(name);
        let actor_ref = ActorRef { id: ActorId(Uuid::parse_str(&actor_id).unwrap()) };
        
        self.inner.register(key, actor_ref, properties)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Register with tuple key
    #[napi]
    pub fn register_tuple(&self, tuple: Vec<String>, actor_id: String, properties: Option<HashMap<String, String>>) -> Result<()> {
        let key = RegistryKey::Tuple(tuple);
        let actor_ref = ActorRef { id: ActorId(Uuid::parse_str(&actor_id).unwrap()) };
        
        self.inner.register(key, actor_ref, properties)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Unregister by name
    #[napi]
    pub fn unregister(&self, name: String) -> Result<()> {
        let key = RegistryKey::Name(name);
        self.inner.unregister(&key)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Unregister by tuple
    #[napi]
    pub fn unregister_tuple(&self, tuple: Vec<String>) -> Result<()> {
        let key = RegistryKey::Tuple(tuple);
        self.inner.unregister(&key)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Look up by name
    #[napi]
    pub fn whereis(&self, name: String) -> Option<String> {
        let key = RegistryKey::Name(name);
        self.inner.whereis(&key).map(|actor_ref| actor_ref.id.0.to_string())
    }

    /// Look up by tuple
    #[napi]
    pub fn whereis_tuple(&self, tuple: Vec<String>) -> Option<String> {
        let key = RegistryKey::Tuple(tuple);
        self.inner.whereis(&key).map(|actor_ref| actor_ref.id.0.to_string())
    }

    /// Update process properties
    #[napi]
    pub fn update_properties(&self, name: String, properties: HashMap<String, String>) -> Result<()> {
        let key = RegistryKey::Name(name);
        self.inner.update_properties(&key, properties)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Add tags to process
    #[napi]
    pub fn add_tags(&self, name: String, tags: Vec<String>) -> Result<()> {
        let key = RegistryKey::Name(name);
        let tag_set: HashSet<String> = tags.into_iter().collect();
        self.inner.add_tags(&key, tag_set)
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Query processes
    #[napi]
    pub fn query(&self, query: Object) -> Result<Vec<Object>> {
        // Parse query object from JavaScript
        let query = ProcessQuery {
            key_pattern: None, // TODO: Parse from JS object
            properties: None,
            tags: None,
            node_id: None,
            limit: None,
        };

        let results = self.inner.query(&query);
        
        // Convert to JavaScript objects
        let js_results: Vec<Object> = results
            .into_iter()
            .map(|meta| {
                // TODO: Convert ProcessMeta to JavaScript object
                Object::new()
            })
            .collect();

        Ok(js_results)
    }

    /// Get all registered keys
    #[napi]
    pub fn keys(&self) -> Vec<String> {
        self.inner.keys()
            .into_iter()
            .filter_map(|key| match key {
                RegistryKey::Name(name) => Some(name),
                _ => None,
            })
            .collect()
    }

    /// Get registry statistics
    #[napi]
    pub fn stats(&self) -> Object {
        let stats = self.inner.stats();
        
        // TODO: Convert RegistryStats to JavaScript object
        Object::new()
    }
}

/// Global registry functions (convenience API)
#[napi]
pub fn register_name(name: String, actor_id: String) -> Result<()> {
    let registry = ProcessRegistry::global();
    let key = RegistryKey::Name(name);
    let actor_ref = ActorRef { id: ActorId(Uuid::parse_str(&actor_id).unwrap()) };
    
    registry.register(key, actor_ref, None)
        .map_err(|e| napi::Error::from_reason(e))
}

#[napi]
pub fn unregister_name(name: String) -> Result<()> {
    let registry = ProcessRegistry::global();
    let key = RegistryKey::Name(name);
    
    registry.unregister(&key)
        .map_err(|e| napi::Error::from_reason(e))
}

#[napi]
pub fn whereis_name(name: String) -> Option<String> {
    let registry = ProcessRegistry::global();
    let key = RegistryKey::Name(name);
    
    registry.whereis(&key).map(|actor_ref| actor_ref.id.0.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_basic_operations() {
        let registry = ProcessRegistry::new();
        let actor_ref = ActorRef { id: ActorId(Uuid::new_v4()) };
        let key = RegistryKey::Name("test_process".to_string());

        // Register
        assert!(registry.register(key.clone(), actor_ref, None).is_ok());

        // Look up
        assert!(registry.whereis(&key).is_some());

        // Unregister
        assert!(registry.unregister(&key).is_ok());

        // Should not be found
        assert!(registry.whereis(&key).is_none());
    }

    #[test]
    fn test_registry_duplicate_keys() {
        let registry = ProcessRegistry::new();
        let actor_ref1 = ActorRef { id: ActorId(Uuid::new_v4()) };
        let actor_ref2 = ActorRef { id: ActorId(Uuid::new_v4()) };
        let key = RegistryKey::Name("duplicate".to_string());

        // Register first
        assert!(registry.register(key.clone(), actor_ref1, None).is_ok());

        // Try to register duplicate
        assert!(registry.register(key, actor_ref2, None).is_err());
    }

    #[test]
    fn test_registry_query() {
        let registry = ProcessRegistry::new();
        let actor_ref = ActorRef { id: ActorId(Uuid::new_v4()) };
        let key = RegistryKey::Name("queryable".to_string());

        let mut props = HashMap::new();
        props.insert("type".to_string(), "worker".to_string());

        registry.register(key, actor_ref, Some(props)).unwrap();

        let mut query_props = HashMap::new();
        query_props.insert("type".to_string(), "worker".to_string());

        let query = ProcessQuery {
            key_pattern: None,
            properties: Some(query_props),
            tags: None,
            node_id: None,
            limit: None,
        };

        let results = registry.query(&query);
        assert_eq!(results.len(), 1);
    }
}