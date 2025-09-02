/**
 * ETS (Erlang Term Storage) - Concurrent In-Memory Storage
 * 
 * Provides Elixir ETS-style concurrent data structures with:
 * - High-performance concurrent access
 * - Multiple table types (set, bag, duplicate_bag, ordered_set)
 * - Named and anonymous tables
 * - Pattern matching and queries
 * - Atomic operations
 * - Memory management and limits
 */

use std::collections::{HashMap, BTreeMap, HashSet, BTreeSet};
use std::sync::{Arc, RwLock, atomic::{AtomicUsize, Ordering}};
use std::hash::{Hash, Hasher};
use std::cmp::Ordering as CmpOrdering;
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use napi::bindgen_prelude::*;
use napi_derive::napi;

/// Table identifier
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TableId {
    Named(String),
    Anonymous(Uuid),
}

/// Table types matching Elixir ETS
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TableType {
    /// Set - unique keys
    Set,
    /// Bag - multiple objects per key
    Bag,
    /// Duplicate bag - allows duplicate objects
    DuplicateBag,
    /// Ordered set - sorted by key
    OrderedSet,
}

/// Access rights
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Access {
    Public,
    Protected,
    Private,
}

/// ETS object (key-value pair with metadata)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ETSObject {
    pub key: ETSValue,
    pub value: ETSValue,
    pub metadata: HashMap<String, ETSValue>,
    pub created_at: u64,
    pub updated_at: u64,
}

/// ETS value types
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ETSValue {
    Nil,
    Boolean(bool),
    Integer(i64),
    Float(ordered_float::OrderedFloat<f64>),
    String(String),
    Binary(Vec<u8>),
    List(Vec<ETSValue>),
    Tuple(Vec<ETSValue>),
    Map(BTreeMap<String, ETSValue>),
}

impl ETSValue {
    pub fn type_name(&self) -> &'static str {
        match self {
            ETSValue::Nil => "nil",
            ETSValue::Boolean(_) => "boolean",
            ETSValue::Integer(_) => "integer",
            ETSValue::Float(_) => "float",
            ETSValue::String(_) => "string",
            ETSValue::Binary(_) => "binary",
            ETSValue::List(_) => "list",
            ETSValue::Tuple(_) => "tuple",
            ETSValue::Map(_) => "map",
        }
    }
}

impl PartialOrd for ETSValue {
    fn partial_cmp(&self, other: &Self) -> Option<CmpOrdering> {
        Some(self.cmp(other))
    }
}

impl Ord for ETSValue {
    fn cmp(&self, other: &Self) -> CmpOrdering {
        match (self, other) {
            (ETSValue::Nil, ETSValue::Nil) => CmpOrdering::Equal,
            (ETSValue::Nil, _) => CmpOrdering::Less,
            (_, ETSValue::Nil) => CmpOrdering::Greater,
            
            (ETSValue::Boolean(a), ETSValue::Boolean(b)) => a.cmp(b),
            (ETSValue::Integer(a), ETSValue::Integer(b)) => a.cmp(b),
            (ETSValue::Float(a), ETSValue::Float(b)) => a.cmp(b),
            (ETSValue::String(a), ETSValue::String(b)) => a.cmp(b),
            (ETSValue::Binary(a), ETSValue::Binary(b)) => a.cmp(b),
            (ETSValue::List(a), ETSValue::List(b)) => a.cmp(b),
            (ETSValue::Tuple(a), ETSValue::Tuple(b)) => a.cmp(b),
            (ETSValue::Map(a), ETSValue::Map(b)) => a.cmp(b),
            
            // Cross-type ordering
            (ETSValue::Boolean(_), _) => CmpOrdering::Less,
            (_, ETSValue::Boolean(_)) => CmpOrdering::Greater,
            (ETSValue::Integer(_), ETSValue::Float(_)) => CmpOrdering::Less,
            (ETSValue::Float(_), ETSValue::Integer(_)) => CmpOrdering::Greater,
            (ETSValue::Integer(_), _) => CmpOrdering::Less,
            (_, ETSValue::Integer(_)) => CmpOrdering::Greater,
            (ETSValue::Float(_), _) => CmpOrdering::Less,
            (_, ETSValue::Float(_)) => CmpOrdering::Greater,
            (ETSValue::String(_), _) => CmpOrdering::Less,
            (_, ETSValue::String(_)) => CmpOrdering::Greater,
            (ETSValue::Binary(_), _) => CmpOrdering::Less,
            (_, ETSValue::Binary(_)) => CmpOrdering::Greater,
            (ETSValue::List(_), _) => CmpOrdering::Less,
            (_, ETSValue::List(_)) => CmpOrdering::Greater,
            (ETSValue::Tuple(_), _) => CmpOrdering::Less,
            (_, ETSValue::Tuple(_)) => CmpOrdering::Greater,
        }
    }
}

/// Pattern for matching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Pattern {
    /// Exact value match
    Value(ETSValue),
    /// Wildcard (matches anything)
    Wildcard,
    /// Variable binding
    Variable(String),
    /// Guard conditions
    Guard {
        pattern: Box<Pattern>,
        condition: GuardCondition,
    },
}

/// Guard conditions for pattern matching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GuardCondition {
    Equal(ETSValue),
    Greater(ETSValue),
    Less(ETSValue),
    GreaterEqual(ETSValue),
    LessEqual(ETSValue),
    TypeCheck(String),
    And(Box<GuardCondition>, Box<GuardCondition>),
    Or(Box<GuardCondition>, Box<GuardCondition>),
    Not(Box<GuardCondition>),
}

/// Match specification for complex queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchSpec {
    pub head: Pattern,
    pub guards: Vec<GuardCondition>,
    pub body: MatchBody,
}

/// Match result actions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MatchBody {
    /// Return the whole object
    WholeObject,
    /// Return specific fields
    Fields(Vec<String>),
    /// Return computed result
    Computed(String), // Function expression
    /// Count matches
    Count,
    /// Delete matches
    Delete,
}

/// Table configuration
#[derive(Debug, Clone)]
pub struct TableConfig {
    pub table_type: TableType,
    pub access: Access,
    pub named: bool,
    pub heir: Option<String>,
    pub write_concurrency: bool,
    pub read_concurrency: bool,
    pub compressed: bool,
    pub memory_limit: Option<usize>,
}

impl Default for TableConfig {
    fn default() -> Self {
        Self {
            table_type: TableType::Set,
            access: Access::Protected,
            named: true,
            heir: None,
            write_concurrency: true,
            read_concurrency: true,
            compressed: false,
            memory_limit: None,
        }
    }
}

/// ETS table implementation
pub struct ETSTable {
    id: TableId,
    config: TableConfig,
    
    // Storage backends based on table type
    set_storage: Arc<RwLock<HashMap<ETSValue, ETSObject>>>,
    ordered_storage: Arc<RwLock<BTreeMap<ETSValue, ETSObject>>>,
    bag_storage: Arc<RwLock<HashMap<ETSValue, Vec<ETSObject>>>>,
    
    // Table statistics
    size: AtomicUsize,
    memory_used: AtomicUsize,
    read_count: AtomicUsize,
    write_count: AtomicUsize,
    
    // Creation metadata
    created_at: std::time::SystemTime,
    owner: String,
}

impl ETSTable {
    /// Create new ETS table
    pub fn new(id: TableId, config: TableConfig, owner: String) -> Self {
        Self {
            id,
            config,
            set_storage: Arc::new(RwLock::new(HashMap::new())),
            ordered_storage: Arc::new(RwLock::new(BTreeMap::new())),
            bag_storage: Arc::new(RwLock::new(HashMap::new())),
            size: AtomicUsize::new(0),
            memory_used: AtomicUsize::new(0),
            read_count: AtomicUsize::new(0),
            write_count: AtomicUsize::new(0),
            created_at: std::time::SystemTime::now(),
            owner,
        }
    }

    /// Insert object into table
    pub fn insert(&self, object: ETSObject) -> Result<bool, String> {
        self.write_count.fetch_add(1, Ordering::Relaxed);

        match self.config.table_type {
            TableType::Set => {
                let mut storage = self.set_storage.write().unwrap();
                let key = object.key.clone();
                let is_new = !storage.contains_key(&key);
                storage.insert(key, object);
                
                if is_new {
                    self.size.fetch_add(1, Ordering::Relaxed);
                }
                Ok(is_new)
            },
            
            TableType::OrderedSet => {
                let mut storage = self.ordered_storage.write().unwrap();
                let key = object.key.clone();
                let is_new = !storage.contains_key(&key);
                storage.insert(key, object);
                
                if is_new {
                    self.size.fetch_add(1, Ordering::Relaxed);
                }
                Ok(is_new)
            },
            
            TableType::Bag | TableType::DuplicateBag => {
                let mut storage = self.bag_storage.write().unwrap();
                let key = object.key.clone();
                
                storage.entry(key)
                    .or_insert_with(Vec::new)
                    .push(object);
                
                self.size.fetch_add(1, Ordering::Relaxed);
                Ok(true)
            },
        }
    }

    /// Look up objects by key
    pub fn lookup(&self, key: &ETSValue) -> Vec<ETSObject> {
        self.read_count.fetch_add(1, Ordering::Relaxed);

        match self.config.table_type {
            TableType::Set => {
                let storage = self.set_storage.read().unwrap();
                storage.get(key).cloned().into_iter().collect()
            },
            
            TableType::OrderedSet => {
                let storage = self.ordered_storage.read().unwrap();
                storage.get(key).cloned().into_iter().collect()
            },
            
            TableType::Bag | TableType::DuplicateBag => {
                let storage = self.bag_storage.read().unwrap();
                storage.get(key).cloned().unwrap_or_default()
            },
        }
    }

    /// Delete objects by key
    pub fn delete(&self, key: &ETSValue) -> usize {
        self.write_count.fetch_add(1, Ordering::Relaxed);

        match self.config.table_type {
            TableType::Set => {
                let mut storage = self.set_storage.write().unwrap();
                if storage.remove(key).is_some() {
                    self.size.fetch_sub(1, Ordering::Relaxed);
                    1
                } else {
                    0
                }
            },
            
            TableType::OrderedSet => {
                let mut storage = self.ordered_storage.write().unwrap();
                if storage.remove(key).is_some() {
                    self.size.fetch_sub(1, Ordering::Relaxed);
                    1
                } else {
                    0
                }
            },
            
            TableType::Bag | TableType::DuplicateBag => {
                let mut storage = self.bag_storage.write().unwrap();
                if let Some(objects) = storage.remove(key) {
                    let count = objects.len();
                    self.size.fetch_sub(count, Ordering::Relaxed);
                    count
                } else {
                    0
                }
            },
        }
    }

    /// Delete specific object
    pub fn delete_object(&self, object: &ETSObject) -> bool {
        self.write_count.fetch_add(1, Ordering::Relaxed);

        match self.config.table_type {
            TableType::Set | TableType::OrderedSet => {
                // For sets, delete by key if value matches
                let lookup_result = self.lookup(&object.key);
                if lookup_result.len() == 1 && lookup_result[0] == *object {
                    self.delete(&object.key) > 0
                } else {
                    false
                }
            },
            
            TableType::Bag | TableType::DuplicateBag => {
                let mut storage = self.bag_storage.write().unwrap();
                if let Some(objects) = storage.get_mut(&object.key) {
                    let before_len = objects.len();
                    objects.retain(|obj| obj != object);
                    let after_len = objects.len();
                    
                    if after_len < before_len {
                        self.size.fetch_sub(before_len - after_len, Ordering::Relaxed);
                        
                        // Remove key if no objects left
                        if objects.is_empty() {
                            storage.remove(&object.key);
                        }
                        
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            },
        }
    }

    /// Get first key (for iteration)
    pub fn first(&self) -> Option<ETSValue> {
        self.read_count.fetch_add(1, Ordering::Relaxed);

        match self.config.table_type {
            TableType::Set => {
                let storage = self.set_storage.read().unwrap();
                storage.keys().next().cloned()
            },
            
            TableType::OrderedSet => {
                let storage = self.ordered_storage.read().unwrap();
                storage.keys().next().cloned()
            },
            
            TableType::Bag | TableType::DuplicateBag => {
                let storage = self.bag_storage.read().unwrap();
                storage.keys().next().cloned()
            },
        }
    }

    /// Get next key after given key
    pub fn next(&self, key: &ETSValue) -> Option<ETSValue> {
        self.read_count.fetch_add(1, Ordering::Relaxed);

        match self.config.table_type {
            TableType::OrderedSet => {
                let storage = self.ordered_storage.read().unwrap();
                storage.range((std::ops::Bound::Excluded(key), std::ops::Bound::Unbounded))
                    .next()
                    .map(|(k, _)| k.clone())
            },
            
            _ => {
                // For unordered tables, this is less efficient
                let all_keys: Vec<ETSValue> = match self.config.table_type {
                    TableType::Set => {
                        let storage = self.set_storage.read().unwrap();
                        storage.keys().cloned().collect()
                    },
                    TableType::Bag | TableType::DuplicateBag => {
                        let storage = self.bag_storage.read().unwrap();
                        storage.keys().cloned().collect()
                    },
                    _ => unreachable!(),
                };

                // Find next key lexicographically
                all_keys.into_iter()
                    .filter(|k| k > key)
                    .min()
            },
        }
    }

    /// Get all keys
    pub fn keys(&self) -> Vec<ETSValue> {
        self.read_count.fetch_add(1, Ordering::Relaxed);

        match self.config.table_type {
            TableType::Set => {
                let storage = self.set_storage.read().unwrap();
                storage.keys().cloned().collect()
            },
            
            TableType::OrderedSet => {
                let storage = self.ordered_storage.read().unwrap();
                storage.keys().cloned().collect()
            },
            
            TableType::Bag | TableType::DuplicateBag => {
                let storage = self.bag_storage.read().unwrap();
                storage.keys().cloned().collect()
            },
        }
    }

    /// Get table info
    pub fn info(&self) -> TableInfo {
        TableInfo {
            id: self.id.clone(),
            table_type: self.config.table_type,
            access: self.config.access,
            size: self.size.load(Ordering::Relaxed),
            memory: self.memory_used.load(Ordering::Relaxed),
            owner: self.owner.clone(),
            heir: self.config.heir.clone(),
            read_concurrency: self.config.read_concurrency,
            write_concurrency: self.config.write_concurrency,
            compressed: self.config.compressed,
            read_count: self.read_count.load(Ordering::Relaxed),
            write_count: self.write_count.load(Ordering::Relaxed),
            created_at: self.created_at,
        }
    }

    /// Clear all objects
    pub fn delete_all_objects(&self) -> usize {
        self.write_count.fetch_add(1, Ordering::Relaxed);
        
        let old_size = self.size.swap(0, Ordering::Relaxed);
        
        match self.config.table_type {
            TableType::Set => {
                let mut storage = self.set_storage.write().unwrap();
                storage.clear();
            },
            
            TableType::OrderedSet => {
                let mut storage = self.ordered_storage.write().unwrap();
                storage.clear();
            },
            
            TableType::Bag | TableType::DuplicateBag => {
                let mut storage = self.bag_storage.write().unwrap();
                storage.clear();
            },
        }
        
        old_size
    }
}

/// Table information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub id: TableId,
    pub table_type: TableType,
    pub access: Access,
    pub size: usize,
    pub memory: usize,
    pub owner: String,
    pub heir: Option<String>,
    pub read_concurrency: bool,
    pub write_concurrency: bool,
    pub compressed: bool,
    pub read_count: usize,
    pub write_count: usize,
    pub created_at: std::time::SystemTime,
}

/// ETS system managing all tables
pub struct ETSSystem {
    tables: Arc<RwLock<HashMap<TableId, Arc<ETSTable>>>>,
    named_tables: Arc<RwLock<HashMap<String, TableId>>>,
    table_counter: AtomicUsize,
}

impl ETSSystem {
    /// Create new ETS system
    pub fn new() -> Self {
        Self {
            tables: Arc::new(RwLock::new(HashMap::new())),
            named_tables: Arc::new(RwLock::new(HashMap::new())),
            table_counter: AtomicUsize::new(0),
        }
    }

    /// Create new table
    pub fn new_table(&self, name: Option<String>, config: TableConfig, owner: String) -> Result<TableId, String> {
        let id = if let Some(name) = name {
            let table_id = TableId::Named(name.clone());
            
            // Check if name already exists
            {
                let named_tables = self.named_tables.read().unwrap();
                if named_tables.contains_key(&name) {
                    return Err(format!("Table name '{}' already exists", name));
                }
            }
            
            table_id
        } else {
            TableId::Anonymous(Uuid::new_v4())
        };

        let table = Arc::new(ETSTable::new(id.clone(), config, owner));
        
        // Insert into tables registry
        {
            let mut tables = self.tables.write().unwrap();
            tables.insert(id.clone(), table);
        }

        // Update named tables registry if needed
        if let TableId::Named(name) = &id {
            let mut named_tables = self.named_tables.write().unwrap();
            named_tables.insert(name.clone(), id.clone());
        }

        self.table_counter.fetch_add(1, Ordering::Relaxed);
        
        Ok(id)
    }

    /// Get table by ID
    pub fn get_table(&self, id: &TableId) -> Option<Arc<ETSTable>> {
        let tables = self.tables.read().unwrap();
        tables.get(id).cloned()
    }

    /// Get table by name
    pub fn get_table_by_name(&self, name: &str) -> Option<Arc<ETSTable>> {
        let named_tables = self.named_tables.read().unwrap();
        let id = named_tables.get(name)?;
        drop(named_tables);
        self.get_table(id)
    }

    /// Delete table
    pub fn delete_table(&self, id: &TableId) -> bool {
        let mut tables = self.tables.write().unwrap();
        
        if tables.remove(id).is_some() {
            // Remove from named tables if applicable
            if let TableId::Named(name) = id {
                let mut named_tables = self.named_tables.write().unwrap();
                named_tables.remove(name);
            }
            
            true
        } else {
            false
        }
    }

    /// List all tables
    pub fn list_tables(&self) -> Vec<TableInfo> {
        let tables = self.tables.read().unwrap();
        tables.values()
            .map(|table| table.info())
            .collect()
    }

    /// Get system statistics
    pub fn system_info(&self) -> SystemInfo {
        let tables = self.tables.read().unwrap();
        let table_count = tables.len();
        let total_objects: usize = tables.values()
            .map(|table| table.size.load(Ordering::Relaxed))
            .sum();
        let total_memory: usize = tables.values()
            .map(|table| table.memory_used.load(Ordering::Relaxed))
            .sum();

        SystemInfo {
            table_count,
            total_objects,
            total_memory,
            tables_created: self.table_counter.load(Ordering::Relaxed),
        }
    }
}

/// System information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub table_count: usize,
    pub total_objects: usize,
    pub total_memory: usize,
    pub tables_created: usize,
}

// NAPI JavaScript bindings
#[napi]
pub struct JsETSSystem {
    inner: Arc<ETSSystem>,
}

#[napi]
impl JsETSSystem {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(ETSSystem::new()),
        }
    }

    #[napi]
    pub fn new_table(&self, name: Option<String>, table_type: String, owner: String) -> Result<String> {
        let table_type = match table_type.as_str() {
            "set" => TableType::Set,
            "bag" => TableType::Bag,
            "duplicate_bag" => TableType::DuplicateBag,
            "ordered_set" => TableType::OrderedSet,
            _ => return Err(napi::Error::from_reason("Invalid table type")),
        };

        let config = TableConfig {
            table_type,
            ..Default::default()
        };

        let id = self.inner.new_table(name, config, owner)
            .map_err(|e| napi::Error::from_reason(e))?;

        match id {
            TableId::Named(name) => Ok(name),
            TableId::Anonymous(uuid) => Ok(uuid.to_string()),
        }
    }

    #[napi]
    pub fn insert(&self, table_name: String, key: String, value: String) -> Result<bool> {
        let table = self.inner.get_table_by_name(&table_name)
            .ok_or_else(|| napi::Error::from_reason("Table not found"))?;

        let object = ETSObject {
            key: ETSValue::String(key),
            value: ETSValue::String(value),
            metadata: HashMap::new(),
            created_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64,
            updated_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64,
        };

        table.insert(object)
            .map_err(|e| napi::Error::from_reason(e))
    }

    #[napi]
    pub fn lookup(&self, table_name: String, key: String) -> Result<Vec<String>> {
        let table = self.inner.get_table_by_name(&table_name)
            .ok_or_else(|| napi::Error::from_reason("Table not found"))?;

        let key_value = ETSValue::String(key);
        let objects = table.lookup(&key_value);

        let result = objects.into_iter()
            .filter_map(|obj| match obj.value {
                ETSValue::String(s) => Some(s),
                _ => None,
            })
            .collect();

        Ok(result)
    }

    #[napi]
    pub fn delete(&self, table_name: String, key: String) -> Result<u32> {
        let table = self.inner.get_table_by_name(&table_name)
            .ok_or_else(|| napi::Error::from_reason("Table not found"))?;

        let key_value = ETSValue::String(key);
        let count = table.delete(&key_value);

        Ok(count as u32)
    }

    #[napi]
    pub fn keys(&self, table_name: String) -> Result<Vec<String>> {
        let table = self.inner.get_table_by_name(&table_name)
            .ok_or_else(|| napi::Error::from_reason("Table not found"))?;

        let keys = table.keys()
            .into_iter()
            .filter_map(|key| match key {
                ETSValue::String(s) => Some(s),
                _ => None,
            })
            .collect();

        Ok(keys)
    }

    #[napi]
    pub fn info(&self, table_name: String) -> Result<Object> {
        let table = self.inner.get_table_by_name(&table_name)
            .ok_or_else(|| napi::Error::from_reason("Table not found"))?;

        let info = table.info();
        let mut obj = Object::new();

        obj.set("size", info.size as u32)?;
        obj.set("memory", info.memory as u32)?;
        obj.set("owner", info.owner)?;
        obj.set("type", match info.table_type {
            TableType::Set => "set",
            TableType::Bag => "bag",
            TableType::DuplicateBag => "duplicate_bag",
            TableType::OrderedSet => "ordered_set",
        })?;
        obj.set("readCount", info.read_count as u32)?;
        obj.set("writeCount", info.write_count as u32)?;

        Ok(obj)
    }
}

/// Global ETS system
static GLOBAL_ETS: std::sync::OnceLock<Arc<ETSSystem>> = std::sync::OnceLock::new();

pub fn global_ets() -> &'static Arc<ETSSystem> {
    GLOBAL_ETS.get_or_init(|| Arc::new(ETSSystem::new()))
}

/// Convenience functions
#[napi]
pub fn ets_new(name: String, table_type: String) -> Result<String> {
    let system = global_ets();
    let table_type = match table_type.as_str() {
        "set" => TableType::Set,
        "bag" => TableType::Bag,
        "duplicate_bag" => TableType::DuplicateBag,
        "ordered_set" => TableType::OrderedSet,
        _ => return Err(napi::Error::from_reason("Invalid table type")),
    };

    let config = TableConfig {
        table_type,
        ..Default::default()
    };

    let id = system.new_table(Some(name.clone()), config, "global".to_string())
        .map_err(|e| napi::Error::from_reason(e))?;

    Ok(name)
}

#[napi]
pub fn ets_insert(table: String, key: String, value: String) -> Result<bool> {
    let system = global_ets();
    let table = system.get_table_by_name(&table)
        .ok_or_else(|| napi::Error::from_reason("Table not found"))?;

    let object = ETSObject {
        key: ETSValue::String(key),
        value: ETSValue::String(value),
        metadata: HashMap::new(),
        created_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64,
        updated_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64,
    };

    table.insert(object)
        .map_err(|e| napi::Error::from_reason(e))
}

#[napi]
pub fn ets_lookup(table: String, key: String) -> Result<Vec<String>> {
    let system = global_ets();
    let table = system.get_table_by_name(&table)
        .ok_or_else(|| napi::Error::from_reason("Table not found"))?;

    let key_value = ETSValue::String(key);
    let objects = table.lookup(&key_value);

    let result = objects.into_iter()
        .filter_map(|obj| match obj.value {
            ETSValue::String(s) => Some(s),
            _ => None,
        })
        .collect();

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ets_basic_operations() {
        let system = ETSSystem::new();
        let config = TableConfig::default();
        let table_id = system.new_table(Some("test".to_string()), config, "test_owner".to_string()).unwrap();
        let table = system.get_table(&table_id).unwrap();

        // Insert
        let object = ETSObject {
            key: ETSValue::String("key1".to_string()),
            value: ETSValue::String("value1".to_string()),
            metadata: HashMap::new(),
            created_at: 0,
            updated_at: 0,
        };
        assert!(table.insert(object).unwrap());

        // Lookup
        let results = table.lookup(&ETSValue::String("key1".to_string()));
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].value, ETSValue::String("value1".to_string()));

        // Delete
        let deleted = table.delete(&ETSValue::String("key1".to_string()));
        assert_eq!(deleted, 1);

        // Lookup after delete
        let results = table.lookup(&ETSValue::String("key1".to_string()));
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_ets_ordered_set() {
        let system = ETSSystem::new();
        let config = TableConfig {
            table_type: TableType::OrderedSet,
            ..Default::default()
        };
        let table_id = system.new_table(Some("ordered".to_string()), config, "test_owner".to_string()).unwrap();
        let table = system.get_table(&table_id).unwrap();

        // Insert in random order
        for i in [3, 1, 4, 1, 5, 9, 2, 6] {
            let object = ETSObject {
                key: ETSValue::Integer(i),
                value: ETSValue::String(format!("value{}", i)),
                metadata: HashMap::new(),
                created_at: 0,
                updated_at: 0,
            };
            table.insert(object).unwrap();
        }

        // Check keys are ordered
        let keys = table.keys();
        let mut sorted_keys = keys.clone();
        sorted_keys.sort();
        assert_eq!(keys, sorted_keys);
    }
}