use napi::bindgen_prelude::*;
use napi_derive::napi;
use dashmap::DashMap as DM;
use std::sync::Arc;
use ahash::RandomState;

#[napi]
pub struct DashMap {
    inner: Arc<DM<String, String, RandomState>>,
}

#[napi]
impl DashMap {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(DM::with_hasher(RandomState::new())),
        }
    }

    #[napi(factory)]
    pub fn with_capacity(capacity: u32) -> Self {
        Self {
            inner: Arc::new(DM::with_capacity_and_hasher(capacity as usize, RandomState::new())),
        }
    }

    #[napi]
    pub fn insert(&self, key: String, value: String) -> Option<String> {
        self.inner.insert(key, value)
    }

    #[napi]
    pub fn get(&self, key: String) -> Option<String> {
        self.inner.get(&key).map(|v| v.clone())
    }

    #[napi]
    pub fn remove(&self, key: String) -> Option<String> {
        self.inner.remove(&key).map(|(_, v)| v)
    }

    #[napi]
    pub fn contains_key(&self, key: String) -> bool {
        self.inner.contains_key(&key)
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.inner.len() as u32
    }

    #[napi]
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }

    #[napi]
    pub fn clear(&self) {
        self.inner.clear()
    }

    #[napi]
    pub fn get_or_insert(&self, key: String, default_value: String) -> String {
        self.inner.entry(key)
            .or_insert(default_value)
            .clone()
    }

    #[napi]
    pub fn update(&self, key: String, updater: String) -> Result<bool> {
        match self.inner.get_mut(&key) {
            Some(mut value) => {
                *value = updater;
                Ok(true)
            }
            None => Ok(false),
        }
    }

    #[napi]
    pub fn keys(&self) -> Vec<String> {
        self.inner.iter().map(|entry| entry.key().clone()).collect()
    }

    #[napi]
    pub fn values(&self) -> Vec<String> {
        self.inner.iter().map(|entry| entry.value().clone()).collect()
    }

    #[napi]
    pub fn entries(&self) -> Vec<Vec<String>> {
        self.inner.iter()
            .map(|entry| vec![entry.key().clone(), entry.value().clone()])
            .collect()
    }

    #[napi]
    pub fn retain(&self, predicate_key: String) {
        self.inner.retain(|k, _| k.contains(&predicate_key));
    }

    #[napi]
    pub fn shrink_to_fit(&self) {
        self.inner.shrink_to_fit();
    }
}

#[napi]
pub struct DashSet {
    inner: Arc<dashmap::DashSet<String, RandomState>>,
}

#[napi]
impl DashSet {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(dashmap::DashSet::with_hasher(RandomState::new())),
        }
    }

    #[napi]
    pub fn insert(&self, value: String) -> bool {
        self.inner.insert(value)
    }

    #[napi]
    pub fn remove(&self, value: String) -> bool {
        self.inner.remove(&value).is_some()
    }

    #[napi]
    pub fn contains(&self, value: String) -> bool {
        self.inner.contains(&value)
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.inner.len() as u32
    }

    #[napi]
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }

    #[napi]
    pub fn clear(&self) {
        self.inner.clear()
    }

    #[napi]
    pub fn to_vec(&self) -> Vec<String> {
        self.inner.iter().map(|v| v.clone()).collect()
    }
}

#[napi]
pub struct ShardedMap {
    shards: Vec<Arc<DM<String, String, RandomState>>>,
    shard_count: usize,
}

#[napi]
impl ShardedMap {
    #[napi(constructor)]
    pub fn new(shard_count: u32) -> Self {
        let shard_count = shard_count.max(1) as usize;
        let shards = (0..shard_count)
            .map(|_| Arc::new(DM::with_hasher(RandomState::new())))
            .collect();
        
        Self { shards, shard_count }
    }

    fn get_shard(&self, key: &str) -> &Arc<DM<String, String, RandomState>> {
        let hash = ahash::RandomState::new().hash_one(key);
        let shard_idx = (hash as usize) % self.shard_count;
        &self.shards[shard_idx]
    }

    #[napi]
    pub fn insert(&self, key: String, value: String) -> Option<String> {
        self.get_shard(&key).insert(key, value)
    }

    #[napi]
    pub fn get(&self, key: String) -> Option<String> {
        self.get_shard(&key).get(&key).map(|v| v.clone())
    }

    #[napi]
    pub fn remove(&self, key: String) -> Option<String> {
        self.get_shard(&key).remove(&key).map(|(_, v)| v)
    }

    #[napi]
    pub fn contains_key(&self, key: String) -> bool {
        self.get_shard(&key).contains_key(&key)
    }

    #[napi]
    pub fn len(&self) -> u32 {
        self.shards.iter().map(|s| s.len()).sum::<usize>() as u32
    }

    #[napi]
    pub fn clear(&self) {
        for shard in &self.shards {
            shard.clear();
        }
    }
}

#[napi]
pub fn create_dashmap() -> DashMap {
    DashMap::new()
}

#[napi]
pub fn create_dashmap_with_capacity(capacity: u32) -> DashMap {
    DashMap::with_capacity(capacity)
}

#[napi]
pub fn create_dashset() -> DashSet {
    DashSet::new()
}

#[napi]
pub fn create_sharded_map(shard_count: u32) -> ShardedMap {
    ShardedMap::new(shard_count)
}