use async_channel::{unbounded, Receiver, Sender};
use dashmap::DashMap;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

// PubSub message type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PubSubMessage {
    pub topic: String,
    pub event: String,
    pub payload: Vec<u8>,
    pub from: String,
    pub metadata: HashMap<String, String>,
}

// Subscription info
#[derive(Clone)]
struct Subscription {
    id: String,
    subscriber_id: String,
    topic: String,
    pattern: Option<String>, // For pattern-based subscriptions
    sender: Sender<PubSubMessage>,
}

// PubSub system (inspired by Phoenix.PubSub)
pub struct PubSub {
    name: String,
    // Topic -> Set of subscription IDs
    topics: Arc<DashMap<String, HashSet<String>>>,
    // Subscription ID -> Subscription
    subscriptions: Arc<DashMap<String, Subscription>>,
    // Subscriber ID -> Set of subscription IDs
    subscribers: Arc<DashMap<String, HashSet<String>>>,
    // For pattern-based subscriptions
    patterns: Arc<DashMap<String, HashSet<String>>>,
    // Broadcast channel for all messages (for monitoring)
    broadcast_tx: broadcast::Sender<PubSubMessage>,
    // Metrics
    message_count: Arc<std::sync::atomic::AtomicU64>,
    subscription_count: Arc<std::sync::atomic::AtomicU32>,
}

impl PubSub {
    pub fn new(name: String) -> Self {
        let (broadcast_tx, _) = broadcast::channel(1000);
        
        PubSub {
            name,
            topics: Arc::new(DashMap::new()),
            subscriptions: Arc::new(DashMap::new()),
            subscribers: Arc::new(DashMap::new()),
            patterns: Arc::new(DashMap::new()),
            broadcast_tx,
            message_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            subscription_count: Arc::new(std::sync::atomic::AtomicU32::new(0)),
        }
    }

    pub async fn subscribe(&self, subscriber_id: String, topic: String) -> Result<Receiver<PubSubMessage>> {
        let subscription_id = Uuid::new_v4().to_string();
        let (sender, receiver) = unbounded();
        
        let subscription = Subscription {
            id: subscription_id.clone(),
            subscriber_id: subscriber_id.clone(),
            topic: topic.clone(),
            pattern: None,
            sender,
        };
        
        // Add to subscriptions
        self.subscriptions.insert(subscription_id.clone(), subscription);
        
        // Add to topics
        self.topics.entry(topic.clone())
            .or_insert_with(HashSet::new)
            .insert(subscription_id.clone());
        
        // Add to subscribers
        self.subscribers.entry(subscriber_id)
            .or_insert_with(HashSet::new)
            .insert(subscription_id);
        
        self.subscription_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        
        info!("Subscriber subscribed to topic {}", topic);
        Ok(receiver)
    }

    pub async fn subscribe_pattern(&self, subscriber_id: String, pattern: String) -> Result<Receiver<PubSubMessage>> {
        let subscription_id = Uuid::new_v4().to_string();
        let (sender, receiver) = unbounded();
        
        let subscription = Subscription {
            id: subscription_id.clone(),
            subscriber_id: subscriber_id.clone(),
            topic: String::new(),
            pattern: Some(pattern.clone()),
            sender,
        };
        
        // Add to subscriptions
        self.subscriptions.insert(subscription_id.clone(), subscription);
        
        // Add to patterns
        self.patterns.entry(pattern.clone())
            .or_insert_with(HashSet::new)
            .insert(subscription_id.clone());
        
        // Add to subscribers
        self.subscribers.entry(subscriber_id)
            .or_insert_with(HashSet::new)
            .insert(subscription_id);
        
        self.subscription_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        
        info!("Subscriber subscribed to pattern {}", pattern);
        Ok(receiver)
    }

    pub async fn unsubscribe(&self, subscriber_id: String, topic: String) -> Result<()> {
        // Find and remove subscriptions
        if let Some(subscription_ids) = self.subscribers.get(&subscriber_id) {
            for sub_id in subscription_ids.iter() {
                if let Some(subscription) = self.subscriptions.get(sub_id) {
                    if subscription.topic == topic {
                        // Remove from topics
                        if let Some(mut topic_subs) = self.topics.get_mut(&topic) {
                            topic_subs.remove(sub_id);
                        }
                        
                        // Remove subscription
                        self.subscriptions.remove(sub_id);
                        
                        self.subscription_count.fetch_sub(1, std::sync::atomic::Ordering::SeqCst);
                        info!("Subscriber {} unsubscribed from topic {}", subscriber_id, topic);
                        break;
                    }
                }
            }
        }
        
        Ok(())
    }

    pub async fn unsubscribe_all(&self, subscriber_id: String) -> Result<()> {
        if let Some((_, subscription_ids)) = self.subscribers.remove(&subscriber_id) {
            for sub_id in subscription_ids {
                // Remove from topics or patterns
                if let Some((_, subscription)) = self.subscriptions.remove(&sub_id) {
                    if !subscription.topic.is_empty() {
                        if let Some(mut topic_subs) = self.topics.get_mut(&subscription.topic) {
                            topic_subs.remove(&sub_id);
                        }
                    }
                    
                    if let Some(pattern) = subscription.pattern {
                        if let Some(mut pattern_subs) = self.patterns.get_mut(&pattern) {
                            pattern_subs.remove(&sub_id);
                        }
                    }
                    
                    self.subscription_count.fetch_sub(1, std::sync::atomic::Ordering::SeqCst);
                }
            }
            
            info!("Subscriber {} unsubscribed from all topics", subscriber_id);
        }
        
        Ok(())
    }

    pub async fn publish(&self, topic: String, event: String, payload: Vec<u8>, from: String) -> Result<u32> {
        let message = PubSubMessage {
            topic: topic.clone(),
            event,
            payload,
            from,
            metadata: HashMap::new(),
        };
        
        let mut delivered = 0u32;
        
        // Send to exact topic subscribers
        if let Some(subscription_ids) = self.topics.get(&topic) {
            for sub_id in subscription_ids.iter() {
                if let Some(subscription) = self.subscriptions.get(sub_id) {
                    if subscription.sender.send(message.clone()).await.is_ok() {
                        delivered += 1;
                    }
                }
            }
        }
        
        // Send to pattern subscribers
        for pattern_entry in self.patterns.iter() {
            let pattern = pattern_entry.key();
            if Self::matches_pattern(&topic, pattern) {
                for sub_id in pattern_entry.value() {
                    if let Some(subscription) = self.subscriptions.get(sub_id) {
                        if subscription.sender.send(message.clone()).await.is_ok() {
                            delivered += 1;
                        }
                    }
                }
            }
        }
        
        // Broadcast for monitoring
        let _ = self.broadcast_tx.send(message);
        
        self.message_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        
        debug!("Published to topic {} - delivered to {} subscribers", topic, delivered);
        Ok(delivered)
    }

    pub async fn broadcast(&self, event: String, payload: Vec<u8>, from: String) -> Result<u32> {
        // Broadcast to all subscribers
        let message = PubSubMessage {
            topic: "*".to_string(),
            event,
            payload,
            from,
            metadata: HashMap::new(),
        };
        
        let mut delivered = 0u32;
        
        for subscription_entry in self.subscriptions.iter() {
            if subscription_entry.sender.send(message.clone()).await.is_ok() {
                delivered += 1;
            }
        }
        
        self.message_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        
        info!("Broadcast delivered to {} subscribers", delivered);
        Ok(delivered)
    }

    fn matches_pattern(topic: &str, pattern: &str) -> bool {
        // Simple pattern matching: * matches any single segment, ** matches any number of segments
        if pattern == "*" || pattern == "**" {
            return true;
        }
        
        let topic_parts: Vec<&str> = topic.split('.').collect();
        let pattern_parts: Vec<&str> = pattern.split('.').collect();
        
        let mut t_idx = 0;
        let mut p_idx = 0;
        
        while t_idx < topic_parts.len() && p_idx < pattern_parts.len() {
            if pattern_parts[p_idx] == "**" {
                return true; // ** matches everything after
            } else if pattern_parts[p_idx] == "*" || pattern_parts[p_idx] == topic_parts[t_idx] {
                t_idx += 1;
                p_idx += 1;
            } else {
                return false;
            }
        }
        
        t_idx == topic_parts.len() && p_idx == pattern_parts.len()
    }

    pub fn get_metrics(&self) -> PubSubMetrics {
        PubSubMetrics {
            message_count: self.message_count.load(std::sync::atomic::Ordering::SeqCst),
            subscription_count: self.subscription_count.load(std::sync::atomic::Ordering::SeqCst),
            topic_count: self.topics.len() as u32,
            subscriber_count: self.subscribers.len() as u32,
        }
    }

    pub fn list_topics(&self) -> Vec<String> {
        self.topics.iter()
            .map(|entry| entry.key().clone())
            .collect()
    }

    pub fn subscribers_for_topic(&self, topic: &str) -> Vec<String> {
        if let Some(subscription_ids) = self.topics.get(topic) {
            subscription_ids.iter()
                .filter_map(|sub_id| {
                    self.subscriptions.get(sub_id)
                        .map(|sub| sub.subscriber_id.clone())
                })
                .collect()
        } else {
            Vec::new()
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PubSubMetrics {
    pub message_count: u64,
    pub subscription_count: u32,
    pub topic_count: u32,
    pub subscriber_count: u32,
}

// Global PubSub instance
lazy_static::lazy_static! {
    static ref GLOBAL_PUBSUB: Arc<RwLock<Option<Arc<PubSub>>>> = Arc::new(RwLock::new(None));
}

pub fn get_pubsub() -> Option<Arc<PubSub>> {
    GLOBAL_PUBSUB.read().clone()
}

// NAPI bindings for JavaScript
#[napi]
pub struct JsPubSub {
    pubsub: Arc<PubSub>,
    subscriber_id: String,
}

#[napi]
impl JsPubSub {
    #[napi(constructor)]
    pub fn new(name: Option<String>) -> Self {
        let pubsub_name = name.unwrap_or_else(|| "default".to_string());
        let pubsub = Arc::new(PubSub::new(pubsub_name));
        
        // Set global instance
        let mut global = GLOBAL_PUBSUB.write();
        *global = Some(pubsub.clone());
        
        JsPubSub {
            pubsub,
            subscriber_id: Uuid::new_v4().to_string(),
        }
    }

    #[napi]
    pub async fn subscribe(&self, topic: String) -> Result<()> {
        let _receiver = self.pubsub.subscribe(self.subscriber_id.clone(), topic).await?;
        // In a real implementation, we'd store the receiver and process messages
        Ok(())
    }

    #[napi]
    pub async fn subscribe_pattern(&self, pattern: String) -> Result<()> {
        let _receiver = self.pubsub.subscribe_pattern(self.subscriber_id.clone(), pattern).await?;
        Ok(())
    }

    #[napi]
    pub async fn unsubscribe(&self, topic: String) -> Result<()> {
        self.pubsub.unsubscribe(self.subscriber_id.clone(), topic).await
    }

    #[napi]
    pub async fn unsubscribe_all(&self) -> Result<()> {
        self.pubsub.unsubscribe_all(self.subscriber_id.clone()).await
    }

    #[napi]
    pub async fn publish(&self, topic: String, event: String, payload: Vec<u8>) -> Result<u32> {
        self.pubsub.publish(topic, event, payload, self.subscriber_id.clone()).await
    }

    #[napi]
    pub async fn broadcast(&self, event: String, payload: Vec<u8>) -> Result<u32> {
        self.pubsub.broadcast(event, payload, self.subscriber_id.clone()).await
    }

    #[napi]
    pub fn get_metrics(&self) -> JsPubSubMetrics {
        let metrics = self.pubsub.get_metrics();
        JsPubSubMetrics {
            message_count: metrics.message_count.to_string(),
            subscription_count: metrics.subscription_count,
            topic_count: metrics.topic_count,
            subscriber_count: metrics.subscriber_count,
        }
    }

    #[napi]
    pub fn list_topics(&self) -> Vec<String> {
        self.pubsub.list_topics()
    }

    #[napi]
    pub fn subscribers_for_topic(&self, topic: String) -> Vec<String> {
        self.pubsub.subscribers_for_topic(&topic)
    }
}

#[napi(object)]
pub struct JsPubSubMetrics {
    pub message_count: String,
    pub subscription_count: u32,
    pub topic_count: u32,
    pub subscriber_count: u32,
}

// Helper function for creating topic-based channels
#[napi]
pub async fn create_topic_channel(topic: String) -> Result<JsTopicChannel> {
    let pubsub = get_pubsub().ok_or_else(|| Error::from_reason("PubSub not initialized"))?;
    let subscriber_id = Uuid::new_v4().to_string();
    let receiver = pubsub.subscribe(subscriber_id.clone(), topic.clone()).await?;
    
    Ok(JsTopicChannel {
        topic,
        subscriber_id,
        receiver: Some(receiver),
    })
}

#[napi]
pub struct JsTopicChannel {
    topic: String,
    subscriber_id: String,
    receiver: Option<Receiver<PubSubMessage>>,
}

#[napi]
impl JsTopicChannel {
    #[napi]
    pub async fn receive(&mut self) -> Result<Vec<u8>> {
        if let Some(receiver) = &self.receiver {
            match receiver.recv().await {
                Ok(msg) => Ok(msg.payload),
                Err(e) => Err(Error::from_reason(format!("Receive error: {}", e))),
            }
        } else {
            Err(Error::from_reason("Channel not initialized"))
        }
    }
    
    #[napi]
    pub async fn send(&self, payload: Vec<u8>) -> Result<()> {
        if let Some(pubsub) = get_pubsub() {
            pubsub.publish(
                self.topic.clone(),
                "message".to_string(),
                payload,
                self.subscriber_id.clone()
            ).await?;
            Ok(())
        } else {
            Err(Error::from_reason("PubSub not initialized"))
        }
    }
}