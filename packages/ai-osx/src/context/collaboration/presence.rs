use super::*;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};

pub struct PresenceTracker {
    presence_data: Arc<RwLock<HashMap<Uuid, PresenceData>>>,
    session_presence: Arc<RwLock<HashMap<Uuid, HashMap<Uuid, PresenceInfo>>>>,
    heartbeat_config: HeartbeatConfig,
}

#[derive(Debug, Clone)]
pub struct PresenceData {
    pub participant_id: Uuid,
    pub session_id: Uuid,
    pub status: PresenceStatus,
    pub location: LocationInfo,
    pub activity: ActivityInfo,
    pub last_heartbeat: DateTime<Utc>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceInfo {
    pub participant_id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub status: PresenceStatus,
    pub status_message: Option<String>,
    pub cursor: Option<CursorInfo>,
    pub selection: Option<SelectionInfo>,
    pub typing_indicator: bool,
    pub last_activity: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorInfo {
    pub file_path: String,
    pub position: Position,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub line: u32,
    pub column: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionInfo {
    pub file_path: String,
    pub start: Position,
    pub end: Position,
    pub color: String,
}

#[derive(Debug, Clone)]
pub struct LocationInfo {
    pub file_path: Option<String>,
    pub viewport: Option<ViewportInfo>,
    pub scroll_position: Option<ScrollPosition>,
}

#[derive(Debug, Clone)]
pub struct ViewportInfo {
    pub start_line: u32,
    pub end_line: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone)]
pub struct ScrollPosition {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone)]
pub struct ActivityInfo {
    pub activity_type: ActivityType,
    pub started_at: DateTime<Utc>,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActivityType {
    Editing,
    Reading,
    Debugging,
    Testing,
    Reviewing,
    Idle,
}

#[derive(Debug, Clone)]
pub struct HeartbeatConfig {
    pub interval_ms: u64,
    pub timeout_ms: u64,
    pub idle_threshold_ms: u64,
    pub away_threshold_ms: u64,
}

impl Default for HeartbeatConfig {
    fn default() -> Self {
        HeartbeatConfig {
            interval_ms: 5000,      // 5 seconds
            timeout_ms: 15000,      // 15 seconds
            idle_threshold_ms: 60000,  // 1 minute
            away_threshold_ms: 300000, // 5 minutes
        }
    }
}

impl PresenceTracker {
    pub fn new() -> Self {
        let tracker = PresenceTracker {
            presence_data: Arc::new(RwLock::new(HashMap::new())),
            session_presence: Arc::new(RwLock::new(HashMap::new())),
            heartbeat_config: HeartbeatConfig::default(),
        };

        // Start heartbeat monitor
        let presence_data_clone = tracker.presence_data.clone();
        let config = tracker.heartbeat_config.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_millis(config.interval_ms));
            
            loop {
                interval.tick().await;
                Self::check_heartbeats(presence_data_clone.clone(), &config).await;
            }
        });

        tracker
    }

    pub async fn update_presence(
        &self,
        participant_id: Uuid,
        session_id: Uuid,
        status: PresenceStatus,
        location: LocationInfo,
        activity: ActivityInfo,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut presence_map = self.presence_data.write().await;
        
        let presence = PresenceData {
            participant_id,
            session_id,
            status,
            location,
            activity,
            last_heartbeat: Utc::now(),
            metadata: HashMap::new(),
        };
        
        presence_map.insert(participant_id, presence);
        
        // Update session presence
        self.update_session_presence(session_id, participant_id).await?;
        
        Ok(())
    }

    pub async fn update_cursor(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
        cursor_info: CursorInfo,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut session_presence = self.session_presence.write().await;
        
        if let Some(session_map) = session_presence.get_mut(&session_id) {
            if let Some(presence_info) = session_map.get_mut(&participant_id) {
                presence_info.cursor = Some(cursor_info);
                presence_info.last_activity = Utc::now();
            }
        }
        
        Ok(())
    }

    pub async fn update_selection(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
        selection_info: Option<SelectionInfo>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut session_presence = self.session_presence.write().await;
        
        if let Some(session_map) = session_presence.get_mut(&session_id) {
            if let Some(presence_info) = session_map.get_mut(&participant_id) {
                presence_info.selection = selection_info;
                presence_info.last_activity = Utc::now();
            }
        }
        
        Ok(())
    }

    pub async fn set_typing_indicator(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
        is_typing: bool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut session_presence = self.session_presence.write().await;
        
        if let Some(session_map) = session_presence.get_mut(&session_id) {
            if let Some(presence_info) = session_map.get_mut(&participant_id) {
                presence_info.typing_indicator = is_typing;
                presence_info.last_activity = Utc::now();
            }
        }
        
        Ok(())
    }

    async fn update_session_presence(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut session_presence = self.session_presence.write().await;
        let session_map = session_presence.entry(session_id).or_insert_with(HashMap::new);
        
        // Create or update presence info
        let presence_info = PresenceInfo {
            participant_id,
            display_name: format!("User {}", &participant_id.to_string()[..8]),
            avatar_url: None,
            status: PresenceStatus::Online,
            status_message: None,
            cursor: None,
            selection: None,
            typing_indicator: false,
            last_activity: Utc::now(),
        };
        
        session_map.insert(participant_id, presence_info);
        
        Ok(())
    }

    async fn check_heartbeats(
        presence_data: Arc<RwLock<HashMap<Uuid, PresenceData>>>,
        config: &HeartbeatConfig,
    ) {
        let mut data = presence_data.write().await;
        let now = Utc::now();
        let mut to_remove = Vec::new();
        
        for (participant_id, presence) in data.iter_mut() {
            let elapsed = now.timestamp_millis() - presence.last_heartbeat.timestamp_millis();
            
            if elapsed > config.timeout_ms as i64 {
                // Mark as offline
                presence.status = PresenceStatus::Offline;
                to_remove.push(*participant_id);
            } else if elapsed > config.away_threshold_ms as i64 {
                // Mark as away
                if !matches!(presence.status, PresenceStatus::Offline) {
                    presence.status = PresenceStatus::Away;
                }
            } else if elapsed > config.idle_threshold_ms as i64 {
                // Mark as idle
                if matches!(presence.status, PresenceStatus::Online | PresenceStatus::Busy) {
                    presence.status = PresenceStatus::Idle;
                }
            }
        }
        
        // Remove offline participants
        for id in to_remove {
            data.remove(&id);
        }
    }

    pub async fn heartbeat(
        &self,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut presence_map = self.presence_data.write().await;
        
        if let Some(presence) = presence_map.get_mut(&participant_id) {
            presence.last_heartbeat = Utc::now();
            
            // Update status based on activity
            let elapsed = Utc::now().timestamp_millis() - 
                         presence.activity.started_at.timestamp_millis();
            
            if elapsed < self.heartbeat_config.idle_threshold_ms as i64 {
                if matches!(presence.status, PresenceStatus::Idle | PresenceStatus::Away) {
                    presence.status = PresenceStatus::Online;
                }
            }
        }
        
        Ok(())
    }

    pub async fn get_session_presence(
        &self,
        session_id: Uuid,
    ) -> HashMap<Uuid, PresenceInfo> {
        self.session_presence.read().await
            .get(&session_id)
            .cloned()
            .unwrap_or_default()
    }

    pub async fn get_participant_presence(
        &self,
        participant_id: Uuid,
    ) -> Option<PresenceData> {
        self.presence_data.read().await.get(&participant_id).cloned()
    }

    pub async fn remove_participant(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Remove from presence data
        self.presence_data.write().await.remove(&participant_id);
        
        // Remove from session presence
        let mut session_presence = self.session_presence.write().await;
        if let Some(session_map) = session_presence.get_mut(&session_id) {
            session_map.remove(&participant_id);
            
            // Clean up empty sessions
            if session_map.is_empty() {
                session_presence.remove(&session_id);
            }
        }
        
        Ok(())
    }

    pub async fn get_active_participants(
        &self,
        session_id: Uuid,
    ) -> Vec<PresenceInfo> {
        self.session_presence.read().await
            .get(&session_id)
            .map(|session_map| {
                session_map.values()
                    .filter(|p| !matches!(p.status, PresenceStatus::Offline))
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }

    pub async fn get_participant_locations(
        &self,
        session_id: Uuid,
    ) -> HashMap<Uuid, LocationInfo> {
        let presence_data = self.presence_data.read().await;
        let mut locations = HashMap::new();
        
        for (participant_id, presence) in presence_data.iter() {
            if presence.session_id == session_id {
                locations.insert(*participant_id, presence.location.clone());
            }
        }
        
        locations
    }

    pub fn generate_participant_color(participant_id: &Uuid) -> String {
        // Generate a consistent color based on participant ID
        let hash = participant_id.as_bytes().iter().fold(0u32, |acc, &b| {
            acc.wrapping_add(b as u32).wrapping_mul(31)
        });
        
        let hue = (hash % 360) as f32;
        let saturation = 70.0;
        let lightness = 50.0;
        
        format!("hsl({}, {}%, {}%)", hue, saturation, lightness)
    }

    pub async fn broadcast_presence_update(
        &self,
        session_id: Uuid,
    ) -> Result<Vec<PresenceInfo>, Box<dyn std::error::Error>> {
        let participants = self.get_active_participants(session_id).await;
        
        // In a real implementation, this would broadcast to all connected clients
        // For now, just return the current presence state
        Ok(participants)
    }
}

// Awareness protocol for real-time collaboration
pub struct AwarenessProtocol {
    awareness_states: Arc<RwLock<HashMap<Uuid, AwarenessState>>>,
    update_broadcaster: broadcast::Sender<AwarenessUpdate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwarenessState {
    pub client_id: Uuid,
    pub user: UserInfo,
    pub cursor: Option<AwarenessCursor>,
    pub selection: Option<AwarenessSelection>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub name: String,
    pub color: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwarenessCursor {
    pub anchor: Position,
    pub head: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwarenessSelection {
    pub anchor: Position,
    pub head: Position,
    pub ranges: Vec<SelectionRange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionRange {
    pub start: Position,
    pub end: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwarenessUpdate {
    pub client_id: Uuid,
    pub added: Vec<Uuid>,
    pub updated: Vec<Uuid>,
    pub removed: Vec<Uuid>,
    pub states: HashMap<Uuid, AwarenessState>,
}

impl AwarenessProtocol {
    pub fn new() -> Self {
        let (tx, _rx) = broadcast::channel(1000);
        
        AwarenessProtocol {
            awareness_states: Arc::new(RwLock::new(HashMap::new())),
            update_broadcaster: tx,
        }
    }

    pub async fn update_awareness(
        &self,
        client_id: Uuid,
        state: AwarenessState,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut states = self.awareness_states.write().await;
        let is_new = !states.contains_key(&client_id);
        
        states.insert(client_id, state.clone());
        
        // Broadcast update
        let update = AwarenessUpdate {
            client_id,
            added: if is_new { vec![client_id] } else { vec![] },
            updated: if !is_new { vec![client_id] } else { vec![] },
            removed: vec![],
            states: [(client_id, state)].into_iter().collect(),
        };
        
        let _ = self.update_broadcaster.send(update);
        
        Ok(())
    }

    pub async fn remove_awareness(
        &self,
        client_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut states = self.awareness_states.write().await;
        
        if states.remove(&client_id).is_some() {
            // Broadcast removal
            let update = AwarenessUpdate {
                client_id,
                added: vec![],
                updated: vec![],
                removed: vec![client_id],
                states: HashMap::new(),
            };
            
            let _ = self.update_broadcaster.send(update);
        }
        
        Ok(())
    }

    pub async fn get_all_awareness_states(&self) -> HashMap<Uuid, AwarenessState> {
        self.awareness_states.read().await.clone()
    }

    pub fn subscribe_to_updates(&self) -> broadcast::Receiver<AwarenessUpdate> {
        self.update_broadcaster.subscribe()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_presence_tracking() {
        let tracker = PresenceTracker::new();
        
        let participant_id = Uuid::new_v4();
        let session_id = Uuid::new_v4();
        
        let location = LocationInfo {
            file_path: Some("test.rs".to_string()),
            viewport: None,
            scroll_position: None,
        };
        
        let activity = ActivityInfo {
            activity_type: ActivityType::Editing,
            started_at: Utc::now(),
            details: Some("Editing test file".to_string()),
        };
        
        tracker.update_presence(
            participant_id,
            session_id,
            PresenceStatus::Online,
            location,
            activity,
        ).await.unwrap();
        
        let presence = tracker.get_participant_presence(participant_id).await;
        assert!(presence.is_some());
        assert_eq!(presence.unwrap().status, PresenceStatus::Online);
    }

    #[tokio::test]
    async fn test_awareness_protocol() {
        let protocol = AwarenessProtocol::new();
        
        let client_id = Uuid::new_v4();
        let state = AwarenessState {
            client_id,
            user: UserInfo {
                name: "Test User".to_string(),
                color: "#FF0000".to_string(),
                avatar: None,
            },
            cursor: Some(AwarenessCursor {
                anchor: Position { line: 10, column: 5 },
                head: Position { line: 10, column: 5 },
            }),
            selection: None,
            metadata: HashMap::new(),
        };
        
        protocol.update_awareness(client_id, state.clone()).await.unwrap();
        
        let states = protocol.get_all_awareness_states().await;
        assert_eq!(states.len(), 1);
        assert!(states.contains_key(&client_id));
    }
}