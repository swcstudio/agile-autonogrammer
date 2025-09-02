use super::*;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct SessionManager {
    sessions: Arc<RwLock<HashMap<Uuid, Session>>>,
    participant_manager: Arc<ParticipantManager>,
    permission_manager: Arc<PermissionManager>,
}

pub struct Session {
    pub id: Uuid,
    pub name: String,
    pub owner_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub state: SessionState,
    pub config: SessionConfig,
    pub participants: Vec<Participant>,
    pub files: HashMap<String, FileState>,
    pub chat_history: Vec<ChatMessage>,
    pub activity_log: Vec<ActivityEntry>,
}

#[derive(Debug, Clone)]
pub struct SessionConfig {
    pub max_participants: Option<usize>,
    pub allow_anonymous: bool,
    pub require_invitation: bool,
    pub auto_save_interval_ms: u64,
    pub idle_timeout_ms: u64,
    pub recording_enabled: bool,
    pub ai_features_enabled: bool,
    pub collaborative_debugging: bool,
}

impl Default for SessionConfig {
    fn default() -> Self {
        SessionConfig {
            max_participants: Some(20),
            allow_anonymous: false,
            require_invitation: false,
            auto_save_interval_ms: 5000,
            idle_timeout_ms: 1800000, // 30 minutes
            recording_enabled: false,
            ai_features_enabled: true,
            collaborative_debugging: true,
        }
    }
}

#[derive(Debug, Clone)]
pub struct FileState {
    pub path: String,
    pub content: String,
    pub version: u64,
    pub locked_by: Option<Uuid>,
    pub dirty: bool,
    pub last_modified: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ActivityEntry {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub activity_type: ActivityType,
    pub details: String,
    pub timestamp: DateTime<Utc>,
}

pub struct ParticipantManager {
    participants: Arc<RwLock<HashMap<Uuid, ParticipantInfo>>>,
}

#[derive(Debug, Clone)]
pub struct ParticipantInfo {
    pub participant: Participant,
    pub connection_info: ConnectionInfo,
    pub activity_stats: ActivityStats,
}

#[derive(Debug, Clone)]
pub struct ConnectionInfo {
    pub ip_address: String,
    pub user_agent: String,
    pub connected_at: DateTime<Utc>,
    pub last_ping: DateTime<Utc>,
    pub latency_ms: u32,
}

#[derive(Debug, Clone)]
pub struct ActivityStats {
    pub edits_made: u64,
    pub messages_sent: u64,
    pub files_opened: u64,
    pub ai_requests: u64,
    pub total_active_time_ms: u64,
}

pub struct PermissionManager {
    permissions: Arc<RwLock<HashMap<Uuid, PermissionSet>>>,
}

#[derive(Debug, Clone)]
pub struct PermissionSet {
    pub can_edit: bool,
    pub can_delete: bool,
    pub can_invite: bool,
    pub can_kick: bool,
    pub can_manage_settings: bool,
    pub can_use_ai: bool,
    pub can_record: bool,
}

impl SessionManager {
    pub async fn new() -> Self {
        SessionManager {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            participant_manager: Arc::new(ParticipantManager::new()),
            permission_manager: Arc::new(PermissionManager::new()),
        }
    }

    pub async fn create_session(
        &self,
        name: String,
        owner_id: String,
        config: SessionConfig,
    ) -> Result<Uuid, Box<dyn std::error::Error>> {
        let session_id = Uuid::new_v4();
        let now = Utc::now();

        let session = Session {
            id: session_id,
            name,
            owner_id,
            created_at: now,
            updated_at: now,
            state: SessionState::Active,
            config,
            participants: Vec::new(),
            files: HashMap::new(),
            chat_history: Vec::new(),
            activity_log: Vec::new(),
        };

        self.sessions.write().await.insert(session_id, session);
        
        Ok(session_id)
    }

    pub async fn join_session(
        &self,
        session_id: Uuid,
        participant: Participant,
        connection_info: ConnectionInfo,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.sessions.write().await;
        
        if let Some(session) = sessions.get_mut(&session_id) {
            // Check max participants
            if let Some(max) = session.config.max_participants {
                if session.participants.len() >= max {
                    return Err("Session is full".into());
                }
            }

            // Add participant
            session.participants.push(participant.clone());
            session.updated_at = Utc::now();

            // Log activity
            session.activity_log.push(ActivityEntry {
                id: Uuid::new_v4(),
                participant_id: participant.id,
                activity_type: ActivityType::Editing,
                details: format!("{} joined the session", participant.display_name),
                timestamp: Utc::now(),
            });

            // Register with participant manager
            self.participant_manager.register_participant(
                participant.clone(),
                connection_info,
            ).await?;

            // Set default permissions
            self.permission_manager.set_permissions(
                participant.id,
                PermissionSet::from_role(&participant.role),
            ).await?;

            Ok(())
        } else {
            Err("Session not found".into())
        }
    }

    pub async fn leave_session(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.sessions.write().await;
        
        if let Some(session) = sessions.get_mut(&session_id) {
            // Remove participant
            session.participants.retain(|p| p.id != participant_id);
            session.updated_at = Utc::now();

            // Unlock any files locked by this participant
            for file in session.files.values_mut() {
                if file.locked_by == Some(participant_id) {
                    file.locked_by = None;
                }
            }

            // Unregister from participant manager
            self.participant_manager.unregister_participant(participant_id).await?;

            // Remove permissions
            self.permission_manager.remove_permissions(participant_id).await?;

            // If session is empty, mark it for cleanup
            if session.participants.is_empty() {
                session.state = SessionState::Archived;
            }

            Ok(())
        } else {
            Err("Session not found".into())
        }
    }

    pub async fn update_file(
        &self,
        session_id: Uuid,
        file_path: String,
        content: String,
        participant_id: Uuid,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        let mut sessions = self.sessions.write().await;
        
        if let Some(session) = sessions.get_mut(&session_id) {
            let file = session.files.entry(file_path.clone())
                .or_insert_with(|| FileState {
                    path: file_path,
                    content: String::new(),
                    version: 0,
                    locked_by: None,
                    dirty: false,
                    last_modified: Utc::now(),
                });

            // Check if file is locked by another participant
            if let Some(lock_holder) = file.locked_by {
                if lock_holder != participant_id {
                    return Err("File is locked by another participant".into());
                }
            }

            // Update file
            file.content = content;
            file.version += 1;
            file.dirty = true;
            file.last_modified = Utc::now();

            session.updated_at = Utc::now();

            Ok(file.version)
        } else {
            Err("Session not found".into())
        }
    }

    pub async fn lock_file(
        &self,
        session_id: Uuid,
        file_path: String,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.sessions.write().await;
        
        if let Some(session) = sessions.get_mut(&session_id) {
            let file = session.files.entry(file_path.clone())
                .or_insert_with(|| FileState {
                    path: file_path,
                    content: String::new(),
                    version: 0,
                    locked_by: None,
                    dirty: false,
                    last_modified: Utc::now(),
                });

            if file.locked_by.is_some() && file.locked_by != Some(participant_id) {
                return Err("File is already locked".into());
            }

            file.locked_by = Some(participant_id);
            Ok(())
        } else {
            Err("Session not found".into())
        }
    }

    pub async fn unlock_file(
        &self,
        session_id: Uuid,
        file_path: String,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.sessions.write().await;
        
        if let Some(session) = sessions.get_mut(&session_id) {
            if let Some(file) = session.files.get_mut(&file_path) {
                if file.locked_by == Some(participant_id) {
                    file.locked_by = None;
                    Ok(())
                } else {
                    Err("File is not locked by this participant".into())
                }
            } else {
                Err("File not found".into())
            }
        } else {
            Err("Session not found".into())
        }
    }

    pub async fn add_chat_message(
        &self,
        session_id: Uuid,
        message: ChatMessage,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut sessions = self.sessions.write().await;
        
        if let Some(session) = sessions.get_mut(&session_id) {
            session.chat_history.push(message.clone());
            session.updated_at = Utc::now();

            // Update participant activity stats
            self.participant_manager.increment_messages(participant_id).await?;

            Ok(())
        } else {
            Err("Session not found".into())
        }
    }

    pub async fn get_session_state(&self, session_id: Uuid) -> Option<Session> {
        self.sessions.read().await.get(&session_id).cloned()
    }

    pub async fn get_active_sessions(&self) -> Vec<Session> {
        self.sessions.read().await
            .values()
            .filter(|s| matches!(s.state, SessionState::Active))
            .cloned()
            .collect()
    }

    pub async fn cleanup_inactive_sessions(&self) -> Result<usize, Box<dyn std::error::Error>> {
        let mut sessions = self.sessions.write().await;
        let now = Utc::now();
        let mut removed_count = 0;

        sessions.retain(|_, session| {
            let inactive_duration = now.timestamp_millis() - session.updated_at.timestamp_millis();
            let should_keep = inactive_duration < session.config.idle_timeout_ms as i64 ||
                            !session.participants.is_empty() ||
                            matches!(session.state, SessionState::Active);

            if !should_keep {
                removed_count += 1;
            }
            
            should_keep
        });

        Ok(removed_count)
    }
}

impl ParticipantManager {
    pub fn new() -> Self {
        ParticipantManager {
            participants: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn register_participant(
        &self,
        participant: Participant,
        connection_info: ConnectionInfo,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let info = ParticipantInfo {
            participant,
            connection_info,
            activity_stats: ActivityStats {
                edits_made: 0,
                messages_sent: 0,
                files_opened: 0,
                ai_requests: 0,
                total_active_time_ms: 0,
            },
        };

        self.participants.write().await.insert(info.participant.id, info);
        Ok(())
    }

    pub async fn unregister_participant(
        &self,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.participants.write().await.remove(&participant_id);
        Ok(())
    }

    pub async fn increment_messages(
        &self,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(info) = self.participants.write().await.get_mut(&participant_id) {
            info.activity_stats.messages_sent += 1;
        }
        Ok(())
    }

    pub async fn get_participant_info(&self, participant_id: Uuid) -> Option<ParticipantInfo> {
        self.participants.read().await.get(&participant_id).cloned()
    }

    pub async fn update_latency(
        &self,
        participant_id: Uuid,
        latency_ms: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(info) = self.participants.write().await.get_mut(&participant_id) {
            info.connection_info.latency_ms = latency_ms;
            info.connection_info.last_ping = Utc::now();
        }
        Ok(())
    }
}

impl PermissionManager {
    pub fn new() -> Self {
        PermissionManager {
            permissions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn set_permissions(
        &self,
        participant_id: Uuid,
        permissions: PermissionSet,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.permissions.write().await.insert(participant_id, permissions);
        Ok(())
    }

    pub async fn remove_permissions(
        &self,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.permissions.write().await.remove(&participant_id);
        Ok(())
    }

    pub async fn check_permission(
        &self,
        participant_id: Uuid,
        permission: &str,
    ) -> bool {
        if let Some(perms) = self.permissions.read().await.get(&participant_id) {
            match permission {
                "edit" => perms.can_edit,
                "delete" => perms.can_delete,
                "invite" => perms.can_invite,
                "kick" => perms.can_kick,
                "manage" => perms.can_manage_settings,
                "ai" => perms.can_use_ai,
                "record" => perms.can_record,
                _ => false,
            }
        } else {
            false
        }
    }
}

impl PermissionSet {
    pub fn from_role(role: &ParticipantRole) -> Self {
        match role {
            ParticipantRole::Owner => PermissionSet {
                can_edit: true,
                can_delete: true,
                can_invite: true,
                can_kick: true,
                can_manage_settings: true,
                can_use_ai: true,
                can_record: true,
            },
            ParticipantRole::Admin => PermissionSet {
                can_edit: true,
                can_delete: true,
                can_invite: true,
                can_kick: true,
                can_manage_settings: false,
                can_use_ai: true,
                can_record: true,
            },
            ParticipantRole::Editor => PermissionSet {
                can_edit: true,
                can_delete: false,
                can_invite: false,
                can_kick: false,
                can_manage_settings: false,
                can_use_ai: true,
                can_record: false,
            },
            ParticipantRole::Viewer => PermissionSet {
                can_edit: false,
                can_delete: false,
                can_invite: false,
                can_kick: false,
                can_manage_settings: false,
                can_use_ai: false,
                can_record: false,
            },
            ParticipantRole::Guest => PermissionSet {
                can_edit: false,
                can_delete: false,
                can_invite: false,
                can_kick: false,
                can_manage_settings: false,
                can_use_ai: false,
                can_record: false,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_session_lifecycle() {
        let manager = SessionManager::new().await;
        
        let session_id = manager.create_session(
            "Test Session".to_string(),
            "owner123".to_string(),
            SessionConfig::default(),
        ).await.unwrap();

        let participant = Participant {
            id: Uuid::new_v4(),
            user_id: "user456".to_string(),
            display_name: "Test User".to_string(),
            role: ParticipantRole::Editor,
            status: PresenceStatus::Online,
            cursor_position: None,
            selection: None,
            joined_at: Utc::now(),
            last_activity: Utc::now(),
        };

        let connection_info = ConnectionInfo {
            ip_address: "192.168.1.1".to_string(),
            user_agent: "Test Client".to_string(),
            connected_at: Utc::now(),
            last_ping: Utc::now(),
            latency_ms: 50,
        };

        manager.join_session(session_id, participant.clone(), connection_info).await.unwrap();

        let session = manager.get_session_state(session_id).await.unwrap();
        assert_eq!(session.participants.len(), 1);

        manager.leave_session(session_id, participant.id).await.unwrap();

        let session = manager.get_session_state(session_id).await.unwrap();
        assert_eq!(session.participants.len(), 0);
        assert_eq!(session.state, SessionState::Archived);
    }

    #[tokio::test]
    async fn test_file_locking() {
        let manager = SessionManager::new().await;
        
        let session_id = manager.create_session(
            "Test Session".to_string(),
            "owner123".to_string(),
            SessionConfig::default(),
        ).await.unwrap();

        let participant_id = Uuid::new_v4();
        let file_path = "test.rs".to_string();

        manager.lock_file(session_id, file_path.clone(), participant_id).await.unwrap();

        let another_participant = Uuid::new_v4();
        let result = manager.lock_file(session_id, file_path.clone(), another_participant).await;
        assert!(result.is_err());

        manager.unlock_file(session_id, file_path, participant_id).await.unwrap();
    }
}