/**
 * Phoenix Channels - Real-time Communication System
 * 
 * Provides Phoenix-style channels with:
 * - Topic-based real-time messaging
 * - Client/server channel patterns
 * - Broadcast and unicast messaging
 * - Channel state management
 * - Authentication and authorization
 * - Presence tracking integration
 */

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use async_channel::{Receiver, Sender, unbounded};
use serde::{Serialize, Deserialize};
use napi::bindgen_prelude::*;
use napi_derive::napi;

use crate::actor::{ActorId, ActorRef};
use crate::registry::{ProcessRegistry, RegistryKey};

/// Channel topic identifier
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Topic(pub String);

/// Channel message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelMessage {
    /// Message ID
    pub id: String,
    /// Topic
    pub topic: Topic,
    /// Event name
    pub event: String,
    /// Message payload
    pub payload: serde_json::Value,
    /// Sender reference
    pub ref_id: Option<String>,
    /// Timestamp
    pub timestamp: u64,
    /// Message metadata
    pub metadata: HashMap<String, String>,
}

/// Channel join parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JoinParams {
    /// Authentication token
    pub auth_token: Option<String>,
    /// Client metadata
    pub metadata: HashMap<String, String>,
    /// Requested permissions
    pub permissions: HashSet<String>,
}

/// Channel reply
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelReply {
    /// Reference ID matching the request
    pub ref_id: String,
    /// Reply status
    pub status: ChannelStatus,
    /// Response payload
    pub response: serde_json::Value,
    /// Error message if any
    pub error: Option<String>,
}

/// Channel status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChannelStatus {
    Ok,
    Error,
    Timeout,
    Unauthorized,
    Forbidden,
}

/// Channel event types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChannelEvent {
    /// Client joins channel
    Join { topic: Topic, params: JoinParams },
    /// Client leaves channel
    Leave { topic: Topic },
    /// Message broadcast to channel
    Broadcast { message: ChannelMessage },
    /// Direct message to specific client
    Push { client_id: String, message: ChannelMessage },
    /// Channel state update
    StateUpdate { topic: Topic, state: serde_json::Value },
    /// Presence update
    PresenceUpdate { topic: Topic, joins: Vec<String>, leaves: Vec<String> },
}

/// Channel client
#[derive(Debug, Clone)]
pub struct ChannelClient {
    /// Client unique ID
    pub id: String,
    /// Connected topics
    pub topics: HashSet<Topic>,
    /// Client metadata
    pub metadata: HashMap<String, String>,
    /// Join timestamp
    pub joined_at: u64,
    /// Last activity timestamp
    pub last_seen: u64,
    /// Message sender
    pub sender: Sender<ChannelMessage>,
    /// Authentication status
    pub authenticated: bool,
    /// Permissions
    pub permissions: HashSet<String>,
}

/// Channel state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelState {
    /// Topic identifier
    pub topic: Topic,
    /// Connected clients
    pub client_count: usize,
    /// Channel metadata
    pub metadata: HashMap<String, String>,
    /// Channel state data
    pub state: serde_json::Value,
    /// Created timestamp
    pub created_at: u64,
    /// Last activity timestamp
    pub updated_at: u64,
}

/// Channel authorization callback
pub trait ChannelAuth: Send + Sync {
    /// Check if client can join topic
    fn can_join(&self, client_id: &str, topic: &Topic, params: &JoinParams) -> bool;
    
    /// Check if client can send to topic
    fn can_send(&self, client_id: &str, topic: &Topic, event: &str) -> bool;
    
    /// Check if client can receive from topic
    fn can_receive(&self, client_id: &str, topic: &Topic, event: &str) -> bool;
}

/// Default authorization (allow all)
#[derive(Default)]
pub struct DefaultAuth;

impl ChannelAuth for DefaultAuth {
    fn can_join(&self, _client_id: &str, _topic: &Topic, _params: &JoinParams) -> bool {
        true
    }
    
    fn can_send(&self, _client_id: &str, _topic: &Topic, _event: &str) -> bool {
        true
    }
    
    fn can_receive(&self, _client_id: &str, _topic: &Topic, _event: &str) -> bool {
        true
    }
}

/// Phoenix-style channel system
pub struct ChannelSystem {
    /// Topic -> Channel clients mapping
    channels: Arc<RwLock<HashMap<Topic, HashMap<String, ChannelClient>>>>,
    /// Client -> Topics mapping
    client_topics: Arc<RwLock<HashMap<String, HashSet<Topic>>>>,
    /// Channel states
    channel_states: Arc<RwLock<HashMap<Topic, ChannelState>>>,
    /// Message broker for inter-channel communication
    message_broker: Sender<ChannelEvent>,
    event_receiver: Receiver<ChannelEvent>,
    /// Authorization handler
    auth: Box<dyn ChannelAuth>,
    /// System statistics
    stats: Arc<RwLock<ChannelSystemStats>>,
}

/// Channel system statistics
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ChannelSystemStats {
    pub total_clients: usize,
    pub total_channels: usize,
    pub messages_sent: u64,
    pub messages_received: u64,
    pub joins_total: u64,
    pub leaves_total: u64,
}

impl ChannelSystem {
    /// Create new channel system
    pub fn new() -> Self {
        let (message_broker, event_receiver) = unbounded();
        
        Self {
            channels: Arc::new(RwLock::new(HashMap::new())),
            client_topics: Arc::new(RwLock::new(HashMap::new())),
            channel_states: Arc::new(RwLock::new(HashMap::new())),
            message_broker,
            event_receiver,
            auth: Box::new(DefaultAuth),
            stats: Arc::new(RwLock::new(ChannelSystemStats::default())),
        }
    }

    /// Set custom authorization handler
    pub fn with_auth<A: ChannelAuth + 'static>(mut self, auth: A) -> Self {
        self.auth = Box::new(auth);
        self
    }

    /// Join a client to a topic
    pub async fn join(&self, client_id: String, topic: Topic, params: JoinParams) -> Result<ChannelReply, String> {
        // Check authorization
        if !self.auth.can_join(&client_id, &topic, &params) {
            return Ok(ChannelReply {
                ref_id: Uuid::new_v4().to_string(),
                status: ChannelStatus::Unauthorized,
                response: serde_json::Value::Null,
                error: Some("Unauthorized to join channel".to_string()),
            });
        }

        let (sender, receiver) = unbounded();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;

        let client = ChannelClient {
            id: client_id.clone(),
            topics: {
                let mut topics = HashSet::new();
                topics.insert(topic.clone());
                topics
            },
            metadata: params.metadata,
            joined_at: now,
            last_seen: now,
            sender,
            authenticated: params.auth_token.is_some(),
            permissions: params.permissions,
        };

        // Add client to channel
        {
            let mut channels = self.channels.write().unwrap();
            channels.entry(topic.clone())
                .or_insert_with(HashMap::new)
                .insert(client_id.clone(), client);
        }

        // Update client topics mapping
        {
            let mut client_topics = self.client_topics.write().unwrap();
            client_topics.entry(client_id.clone())
                .or_insert_with(HashSet::new)
                .insert(topic.clone());
        }

        // Create or update channel state
        {
            let mut states = self.channel_states.write().unwrap();
            let channels_read = self.channels.read().unwrap();
            let client_count = channels_read.get(&topic).map(|c| c.len()).unwrap_or(0);
            
            states.entry(topic.clone())
                .and_modify(|state| {
                    state.client_count = client_count;
                    state.updated_at = now;
                })
                .or_insert_with(|| ChannelState {
                    topic: topic.clone(),
                    client_count,
                    metadata: HashMap::new(),
                    state: serde_json::Value::Null,
                    created_at: now,
                    updated_at: now,
                });
        }

        // Update statistics
        {
            let mut stats = self.stats.write().unwrap();
            stats.joins_total += 1;
            stats.total_clients = self.client_topics.read().unwrap().len();
            stats.total_channels = self.channels.read().unwrap().len();
        }

        // Send join event
        let _ = self.message_broker.send(ChannelEvent::Join {
            topic: topic.clone(),
            params,
        }).await;

        Ok(ChannelReply {
            ref_id: Uuid::new_v4().to_string(),
            status: ChannelStatus::Ok,
            response: serde_json::json!({
                "topic": topic.0,
                "joined_at": now
            }),
            error: None,
        })
    }

    /// Leave a topic
    pub async fn leave(&self, client_id: &str, topic: &Topic) -> Result<(), String> {
        // Remove client from channel
        {
            let mut channels = self.channels.write().unwrap();
            if let Some(channel_clients) = channels.get_mut(topic) {
                channel_clients.remove(client_id);
                
                // Remove empty channels
                if channel_clients.is_empty() {
                    channels.remove(topic);
                }
            }
        }

        // Update client topics mapping
        {
            let mut client_topics = self.client_topics.write().unwrap();
            if let Some(topics) = client_topics.get_mut(client_id) {
                topics.remove(topic);
                
                // Remove clients with no topics
                if topics.is_empty() {
                    client_topics.remove(client_id);
                }
            }
        }

        // Update channel state
        {
            let mut states = self.channel_states.write().unwrap();
            let channels_read = self.channels.read().unwrap();
            let client_count = channels_read.get(topic).map(|c| c.len()).unwrap_or(0);
            
            if let Some(state) = states.get_mut(topic) {
                state.client_count = client_count;
                state.updated_at = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
            }
            
            // Remove empty channel states
            if client_count == 0 {
                states.remove(topic);
            }
        }

        // Update statistics
        {
            let mut stats = self.stats.write().unwrap();
            stats.leaves_total += 1;
            stats.total_clients = self.client_topics.read().unwrap().len();
            stats.total_channels = self.channels.read().unwrap().len();
        }

        // Send leave event
        let _ = self.message_broker.send(ChannelEvent::Leave {
            topic: topic.clone(),
        }).await;

        Ok(())
    }

    /// Broadcast message to all clients in a topic
    pub async fn broadcast(&self, topic: &Topic, event: String, payload: serde_json::Value) -> Result<usize, String> {
        let message = ChannelMessage {
            id: Uuid::new_v4().to_string(),
            topic: topic.clone(),
            event,
            payload,
            ref_id: None,
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64,
            metadata: HashMap::new(),
        };

        let mut sent_count = 0;

        // Send to all clients in the topic
        {
            let channels = self.channels.read().unwrap();
            if let Some(channel_clients) = channels.get(topic) {
                for (client_id, client) in channel_clients {
                    if self.auth.can_receive(client_id, topic, &message.event) {
                        if client.sender.send(message.clone()).await.is_ok() {
                            sent_count += 1;
                        }
                    }
                }
            }
        }

        // Update statistics
        {
            let mut stats = self.stats.write().unwrap();
            stats.messages_sent += sent_count as u64;
        }

        // Send broadcast event
        let _ = self.message_broker.send(ChannelEvent::Broadcast {
            message,
        }).await;

        Ok(sent_count)
    }

    /// Send message to specific client
    pub async fn push(&self, client_id: &str, topic: &Topic, event: String, payload: serde_json::Value) -> Result<(), String> {
        let message = ChannelMessage {
            id: Uuid::new_v4().to_string(),
            topic: topic.clone(),
            event: event.clone(),
            payload,
            ref_id: None,
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64,
            metadata: HashMap::new(),
        };

        // Check authorization
        if !self.auth.can_receive(client_id, topic, &event) {
            return Err("Client not authorized to receive this message".to_string());
        }

        // Find and send to client
        {
            let channels = self.channels.read().unwrap();
            if let Some(channel_clients) = channels.get(topic) {
                if let Some(client) = channel_clients.get(client_id) {
                    client.sender.send(message.clone()).await
                        .map_err(|_| "Failed to send message to client".to_string())?;
                } else {
                    return Err("Client not found in topic".to_string());
                }
            } else {
                return Err("Topic not found".to_string());
            }
        }

        // Update statistics
        {
            let mut stats = self.stats.write().unwrap();
            stats.messages_sent += 1;
        }

        // Send push event
        let _ = self.message_broker.send(ChannelEvent::Push {
            client_id: client_id.to_string(),
            message,
        }).await;

        Ok(())
    }

    /// Get clients in a topic
    pub fn get_clients(&self, topic: &Topic) -> Vec<String> {
        let channels = self.channels.read().unwrap();
        channels.get(topic)
            .map(|clients| clients.keys().cloned().collect())
            .unwrap_or_default()
    }

    /// Get topics for a client
    pub fn get_client_topics(&self, client_id: &str) -> HashSet<Topic> {
        let client_topics = self.client_topics.read().unwrap();
        client_topics.get(client_id).cloned().unwrap_or_default()
    }

    /// Get channel state
    pub fn get_channel_state(&self, topic: &Topic) -> Option<ChannelState> {
        let states = self.channel_states.read().unwrap();
        states.get(topic).cloned()
    }

    /// Update channel state
    pub fn update_channel_state(&self, topic: &Topic, state: serde_json::Value) -> Result<(), String> {
        let mut states = self.channel_states.write().unwrap();
        if let Some(channel_state) = states.get_mut(topic) {
            channel_state.state = state.clone();
            channel_state.updated_at = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
            
            // Send state update event
            tokio::spawn({
                let broker = self.message_broker.clone();
                let topic = topic.clone();
                async move {
                    let _ = broker.send(ChannelEvent::StateUpdate { topic, state }).await;
                }
            });
            
            Ok(())
        } else {
            Err("Channel not found".to_string())
        }
    }

    /// Get system statistics
    pub fn get_stats(&self) -> ChannelSystemStats {
        self.stats.read().unwrap().clone()
    }

    /// Get event receiver for monitoring
    pub fn events(&self) -> Receiver<ChannelEvent> {
        self.event_receiver.clone()
    }

    /// List all active topics
    pub fn list_topics(&self) -> Vec<Topic> {
        let channels = self.channels.read().unwrap();
        channels.keys().cloned().collect()
    }
}

// NAPI JavaScript bindings
#[napi]
pub struct JsChannelSystem {
    inner: Arc<ChannelSystem>,
}

#[napi]
impl JsChannelSystem {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(ChannelSystem::new()),
        }
    }

    /// Join a topic
    #[napi]
    pub async fn join(&self, client_id: String, topic: String, auth_token: Option<String>) -> Result<Object> {
        let params = JoinParams {
            auth_token,
            metadata: HashMap::new(),
            permissions: HashSet::new(),
        };

        let reply = self.inner.join(client_id, Topic(topic), params).await
            .map_err(|e| napi::Error::from_reason(e))?;

        // Convert to JavaScript object
        let mut obj = Object::new();
        obj.set("status", match reply.status {
            ChannelStatus::Ok => "ok",
            ChannelStatus::Error => "error",
            ChannelStatus::Timeout => "timeout",
            ChannelStatus::Unauthorized => "unauthorized",
            ChannelStatus::Forbidden => "forbidden",
        })?;
        obj.set("response", reply.response.to_string())?;
        if let Some(error) = reply.error {
            obj.set("error", error)?;
        }

        Ok(obj)
    }

    /// Leave a topic
    #[napi]
    pub async fn leave(&self, client_id: String, topic: String) -> Result<()> {
        self.inner.leave(&client_id, &Topic(topic)).await
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Broadcast to topic
    #[napi]
    pub async fn broadcast(&self, topic: String, event: String, payload: String) -> Result<u32> {
        let payload_json: serde_json::Value = serde_json::from_str(&payload)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        let count = self.inner.broadcast(&Topic(topic), event, payload_json).await
            .map_err(|e| napi::Error::from_reason(e))?;

        Ok(count as u32)
    }

    /// Push to specific client
    #[napi]
    pub async fn push(&self, client_id: String, topic: String, event: String, payload: String) -> Result<()> {
        let payload_json: serde_json::Value = serde_json::from_str(&payload)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        self.inner.push(&client_id, &Topic(topic), event, payload_json).await
            .map_err(|e| napi::Error::from_reason(e))
    }

    /// Get clients in topic
    #[napi]
    pub fn get_clients(&self, topic: String) -> Vec<String> {
        self.inner.get_clients(&Topic(topic))
    }

    /// Get client topics
    #[napi]
    pub fn get_client_topics(&self, client_id: String) -> Vec<String> {
        self.inner.get_client_topics(&client_id)
            .into_iter()
            .map(|topic| topic.0)
            .collect()
    }

    /// List all topics
    #[napi]
    pub fn list_topics(&self) -> Vec<String> {
        self.inner.list_topics()
            .into_iter()
            .map(|topic| topic.0)
            .collect()
    }

    /// Get statistics
    #[napi]
    pub fn get_stats(&self) -> Object {
        let stats = self.inner.get_stats();
        let mut obj = Object::new();
        
        obj.set("totalClients", stats.total_clients as u32).unwrap();
        obj.set("totalChannels", stats.total_channels as u32).unwrap();
        obj.set("messagesSent", stats.messages_sent as u32).unwrap();
        obj.set("messagesReceived", stats.messages_received as u32).unwrap();
        obj.set("joinsTotal", stats.joins_total as u32).unwrap();
        obj.set("leavesTotal", stats.leaves_total as u32).unwrap();
        
        obj
    }
}

/// Global channel system
static GLOBAL_CHANNELS: std::sync::OnceLock<Arc<ChannelSystem>> = std::sync::OnceLock::new();

pub fn global_channel_system() -> &'static Arc<ChannelSystem> {
    GLOBAL_CHANNELS.get_or_init(|| Arc::new(ChannelSystem::new()))
}

/// Convenience functions for global channel system
#[napi]
pub async fn join_channel(client_id: String, topic: String) -> Result<Object> {
    let system = global_channel_system();
    let params = JoinParams {
        auth_token: None,
        metadata: HashMap::new(),
        permissions: HashSet::new(),
    };

    let reply = system.join(client_id, Topic(topic), params).await
        .map_err(|e| napi::Error::from_reason(e))?;

    let mut obj = Object::new();
    obj.set("status", "ok")?;
    Ok(obj)
}

#[napi]
pub async fn leave_channel(client_id: String, topic: String) -> Result<()> {
    let system = global_channel_system();
    system.leave(&client_id, &Topic(topic)).await
        .map_err(|e| napi::Error::from_reason(e))
}

#[napi]
pub async fn broadcast_to_channel(topic: String, event: String, payload: String) -> Result<u32> {
    let system = global_channel_system();
    let payload_json: serde_json::Value = serde_json::from_str(&payload)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let count = system.broadcast(&Topic(topic), event, payload_json).await
        .map_err(|e| napi::Error::from_reason(e))?;

    Ok(count as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_channel_join_leave() {
        let system = ChannelSystem::new();
        let topic = Topic("test:channel".to_string());
        let client_id = "client1".to_string();
        
        let params = JoinParams {
            auth_token: None,
            metadata: HashMap::new(),
            permissions: HashSet::new(),
        };

        // Join
        let reply = system.join(client_id.clone(), topic.clone(), params).await.unwrap();
        assert!(matches!(reply.status, ChannelStatus::Ok));

        // Check client is in channel
        let clients = system.get_clients(&topic);
        assert_eq!(clients.len(), 1);
        assert!(clients.contains(&client_id));

        // Leave
        system.leave(&client_id, &topic).await.unwrap();
        
        // Check client is removed
        let clients = system.get_clients(&topic);
        assert_eq!(clients.len(), 0);
    }

    #[tokio::test]
    async fn test_channel_broadcast() {
        let system = ChannelSystem::new();
        let topic = Topic("test:broadcast".to_string());
        let client_id = "client1".to_string();
        
        let params = JoinParams {
            auth_token: None,
            metadata: HashMap::new(),
            permissions: HashSet::new(),
        };

        // Join client
        system.join(client_id, topic.clone(), params).await.unwrap();

        // Broadcast message
        let count = system.broadcast(
            &topic,
            "test_event".to_string(),
            serde_json::json!({"message": "hello"})
        ).await.unwrap();

        assert_eq!(count, 1);
    }
}