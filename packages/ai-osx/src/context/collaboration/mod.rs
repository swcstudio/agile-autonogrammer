use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, mpsc, RwLock as TokioRwLock};
use uuid::Uuid;
use chrono::{DateTime, Utc};

pub mod session;
pub mod sync;
pub mod presence;
pub mod conflict;
pub mod streaming;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationSession {
    pub id: Uuid,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub participants: Vec<Participant>,
    pub state: SessionState,
    pub permissions: SessionPermissions,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Participant {
    pub id: Uuid,
    pub user_id: String,
    pub display_name: String,
    pub role: ParticipantRole,
    pub status: PresenceStatus,
    pub cursor_position: Option<CursorPosition>,
    pub selection: Option<Selection>,
    pub joined_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParticipantRole {
    Owner,
    Admin,
    Editor,
    Viewer,
    Guest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PresenceStatus {
    Online,
    Idle,
    Away,
    Busy,
    Offline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    pub file_path: String,
    pub line: u32,
    pub column: u32,
    pub viewport_start: u32,
    pub viewport_end: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Selection {
    pub file_path: String,
    pub start_line: u32,
    pub start_column: u32,
    pub end_line: u32,
    pub end_column: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SessionState {
    Active,
    Paused,
    ReadOnly,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionPermissions {
    pub allow_guests: bool,
    pub require_approval: bool,
    pub max_participants: Option<usize>,
    pub allowed_actions: HashSet<String>,
    pub recording_enabled: bool,
    pub ai_assistance_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CollaborationEvent {
    ParticipantJoined {
        participant: Participant,
        timestamp: DateTime<Utc>,
    },
    ParticipantLeft {
        participant_id: Uuid,
        timestamp: DateTime<Utc>,
    },
    CursorMoved {
        participant_id: Uuid,
        position: CursorPosition,
        timestamp: DateTime<Utc>,
    },
    SelectionChanged {
        participant_id: Uuid,
        selection: Selection,
        timestamp: DateTime<Utc>,
    },
    ContentChanged {
        participant_id: Uuid,
        change: ContentChange,
        timestamp: DateTime<Utc>,
    },
    ChatMessage {
        participant_id: Uuid,
        message: ChatMessage,
        timestamp: DateTime<Utc>,
    },
    AIAssistanceRequested {
        participant_id: Uuid,
        request: AIRequest,
        timestamp: DateTime<Utc>,
    },
    FileOperation {
        participant_id: Uuid,
        operation: FileOperation,
        timestamp: DateTime<Utc>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentChange {
    pub file_path: String,
    pub operation: OperationType,
    pub range: TextRange,
    pub text: String,
    pub version: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationType {
    Insert,
    Delete,
    Replace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextRange {
    pub start_line: u32,
    pub start_column: u32,
    pub end_line: u32,
    pub end_column: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: Uuid,
    pub content: String,
    pub reply_to: Option<Uuid>,
    pub mentions: Vec<String>,
    pub attachments: Vec<Attachment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: Uuid,
    pub name: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequest {
    pub id: Uuid,
    pub request_type: AIRequestType,
    pub context: String,
    pub parameters: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIRequestType {
    CodeCompletion,
    Explanation,
    Refactoring,
    BugFix,
    Documentation,
    Review,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileOperation {
    Create { path: String, content: String },
    Rename { old_path: String, new_path: String },
    Delete { path: String },
    Move { from: String, to: String },
}

pub struct CollaborationManager {
    sessions: Arc<TokioRwLock<HashMap<Uuid, CollaborationSession>>>,
    participant_sessions: Arc<TokioRwLock<HashMap<String, HashSet<Uuid>>>>,
    event_broadcaster: broadcast::Sender<CollaborationEvent>,
    command_sender: mpsc::Sender<CollaborationCommand>,
    conflict_resolver: Arc<conflict::ConflictResolver>,
    presence_tracker: Arc<presence::PresenceTracker>,
    sync_engine: Arc<sync::SyncEngine>,
    metrics: Arc<RwLock<CollaborationMetrics>>,
}

#[derive(Debug)]
pub enum CollaborationCommand {
    CreateSession {
        name: String,
        creator_id: String,
        permissions: SessionPermissions,
    },
    JoinSession {
        session_id: Uuid,
        participant: Participant,
    },
    LeaveSession {
        session_id: Uuid,
        participant_id: Uuid,
    },
    UpdatePresence {
        session_id: Uuid,
        participant_id: Uuid,
        status: PresenceStatus,
    },
    SendChange {
        session_id: Uuid,
        change: ContentChange,
        participant_id: Uuid,
    },
    SendMessage {
        session_id: Uuid,
        message: ChatMessage,
        participant_id: Uuid,
    },
    RequestAIAssistance {
        session_id: Uuid,
        request: AIRequest,
        participant_id: Uuid,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollaborationMetrics {
    pub total_sessions: u64,
    pub active_sessions: u64,
    pub total_participants: u64,
    pub events_processed: u64,
    pub conflicts_resolved: u64,
    pub ai_requests_processed: u64,
    pub average_session_duration_seconds: f64,
    pub peak_concurrent_participants: u64,
}

impl CollaborationManager {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let (event_tx, _event_rx) = broadcast::channel(10000);
        let (cmd_tx, mut cmd_rx) = mpsc::channel(1000);

        let sessions = Arc::new(TokioRwLock::new(HashMap::new()));
        let participant_sessions = Arc::new(TokioRwLock::new(HashMap::new()));

        let conflict_resolver = Arc::new(conflict::ConflictResolver::new());
        let presence_tracker = Arc::new(presence::PresenceTracker::new());
        let sync_engine = Arc::new(sync::SyncEngine::new().await?);

        let metrics = Arc::new(RwLock::new(CollaborationMetrics {
            total_sessions: 0,
            active_sessions: 0,
            total_participants: 0,
            events_processed: 0,
            conflicts_resolved: 0,
            ai_requests_processed: 0,
            average_session_duration_seconds: 0.0,
            peak_concurrent_participants: 0,
        }));

        let manager = CollaborationManager {
            sessions: sessions.clone(),
            participant_sessions: participant_sessions.clone(),
            event_broadcaster: event_tx.clone(),
            command_sender: cmd_tx,
            conflict_resolver: conflict_resolver.clone(),
            presence_tracker: presence_tracker.clone(),
            sync_engine: sync_engine.clone(),
            metrics: metrics.clone(),
        };

        // Start command processor
        let sessions_clone = sessions.clone();
        let participant_sessions_clone = participant_sessions.clone();
        let event_tx_clone = event_tx.clone();
        let metrics_clone = metrics.clone();

        tokio::spawn(async move {
            while let Some(cmd) = cmd_rx.recv().await {
                match cmd {
                    CollaborationCommand::CreateSession { name, creator_id, permissions } => {
                        let session = CollaborationSession {
                            id: Uuid::new_v4(),
                            name,
                            created_at: Utc::now(),
                            participants: Vec::new(),
                            state: SessionState::Active,
                            permissions,
                            metadata: HashMap::new(),
                        };

                        let session_id = session.id;
                        sessions_clone.write().await.insert(session_id, session);

                        // Update metrics
                        if let Ok(mut metrics) = metrics_clone.write() {
                            metrics.total_sessions += 1;
                            metrics.active_sessions += 1;
                        }
                    }

                    CollaborationCommand::JoinSession { session_id, participant } => {
                        let mut sessions = sessions_clone.write().await;
                        if let Some(session) = sessions.get_mut(&session_id) {
                            // Check permissions
                            if let Some(max) = session.permissions.max_participants {
                                if session.participants.len() >= max {
                                    continue; // Reject if at capacity
                                }
                            }

                            session.participants.push(participant.clone());

                            // Update participant tracking
                            participant_sessions_clone.write().await
                                .entry(participant.user_id.clone())
                                .or_insert_with(HashSet::new)
                                .insert(session_id);

                            // Broadcast event
                            let _ = event_tx_clone.send(CollaborationEvent::ParticipantJoined {
                                participant,
                                timestamp: Utc::now(),
                            });

                            // Update metrics
                            if let Ok(mut metrics) = metrics_clone.write() {
                                metrics.total_participants += 1;
                                metrics.peak_concurrent_participants = 
                                    metrics.peak_concurrent_participants.max(session.participants.len() as u64);
                            }
                        }
                    }

                    CollaborationCommand::LeaveSession { session_id, participant_id } => {
                        let mut sessions = sessions_clone.write().await;
                        if let Some(session) = sessions.get_mut(&session_id) {
                            session.participants.retain(|p| p.id != participant_id);

                            // Broadcast event
                            let _ = event_tx_clone.send(CollaborationEvent::ParticipantLeft {
                                participant_id,
                                timestamp: Utc::now(),
                            });

                            // Clean up empty sessions
                            if session.participants.is_empty() {
                                sessions.remove(&session_id);
                                
                                // Update metrics
                                if let Ok(mut metrics) = metrics_clone.write() {
                                    metrics.active_sessions = metrics.active_sessions.saturating_sub(1);
                                }
                            }
                        }
                    }

                    CollaborationCommand::UpdatePresence { session_id, participant_id, status } => {
                        let mut sessions = sessions_clone.write().await;
                        if let Some(session) = sessions.get_mut(&session_id) {
                            if let Some(participant) = session.participants.iter_mut()
                                .find(|p| p.id == participant_id) {
                                participant.status = status;
                                participant.last_activity = Utc::now();
                            }
                        }
                    }

                    CollaborationCommand::SendChange { session_id, change, participant_id } => {
                        // Broadcast change event
                        let _ = event_tx_clone.send(CollaborationEvent::ContentChanged {
                            participant_id,
                            change,
                            timestamp: Utc::now(),
                        });

                        // Update metrics
                        if let Ok(mut metrics) = metrics_clone.write() {
                            metrics.events_processed += 1;
                        }
                    }

                    CollaborationCommand::SendMessage { session_id, message, participant_id } => {
                        // Broadcast message event
                        let _ = event_tx_clone.send(CollaborationEvent::ChatMessage {
                            participant_id,
                            message,
                            timestamp: Utc::now(),
                        });

                        // Update metrics
                        if let Ok(mut metrics) = metrics_clone.write() {
                            metrics.events_processed += 1;
                        }
                    }

                    CollaborationCommand::RequestAIAssistance { session_id, request, participant_id } => {
                        // Broadcast AI request event
                        let _ = event_tx_clone.send(CollaborationEvent::AIAssistanceRequested {
                            participant_id,
                            request,
                            timestamp: Utc::now(),
                        });

                        // Update metrics
                        if let Ok(mut metrics) = metrics_clone.write() {
                            metrics.ai_requests_processed += 1;
                            metrics.events_processed += 1;
                        }
                    }
                }
            }
        });

        Ok(manager)
    }

    pub async fn create_session(
        &self,
        name: String,
        creator_id: String,
        permissions: SessionPermissions,
    ) -> Result<Uuid, Box<dyn std::error::Error>> {
        let session_id = Uuid::new_v4();
        
        self.command_sender.send(CollaborationCommand::CreateSession {
            name,
            creator_id,
            permissions,
        }).await?;

        Ok(session_id)
    }

    pub async fn join_session(
        &self,
        session_id: Uuid,
        participant: Participant,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.command_sender.send(CollaborationCommand::JoinSession {
            session_id,
            participant,
        }).await?;

        Ok(())
    }

    pub async fn leave_session(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.command_sender.send(CollaborationCommand::LeaveSession {
            session_id,
            participant_id,
        }).await?;

        Ok(())
    }

    pub async fn update_presence(
        &self,
        session_id: Uuid,
        participant_id: Uuid,
        status: PresenceStatus,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.command_sender.send(CollaborationCommand::UpdatePresence {
            session_id,
            participant_id,
            status,
        }).await?;

        Ok(())
    }

    pub async fn send_change(
        &self,
        session_id: Uuid,
        change: ContentChange,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Validate and potentially resolve conflicts
        let resolved_change = self.conflict_resolver
            .resolve_change(&change, session_id)
            .await?;

        self.command_sender.send(CollaborationCommand::SendChange {
            session_id,
            change: resolved_change,
            participant_id,
        }).await?;

        Ok(())
    }

    pub async fn send_message(
        &self,
        session_id: Uuid,
        message: ChatMessage,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.command_sender.send(CollaborationCommand::SendMessage {
            session_id,
            message,
            participant_id,
        }).await?;

        Ok(())
    }

    pub async fn request_ai_assistance(
        &self,
        session_id: Uuid,
        request: AIRequest,
        participant_id: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.command_sender.send(CollaborationCommand::RequestAIAssistance {
            session_id,
            request,
            participant_id,
        }).await?;

        Ok(())
    }

    pub fn subscribe_to_events(&self) -> broadcast::Receiver<CollaborationEvent> {
        self.event_broadcaster.subscribe()
    }

    pub async fn get_session(&self, session_id: Uuid) -> Option<CollaborationSession> {
        self.sessions.read().await.get(&session_id).cloned()
    }

    pub async fn get_active_sessions(&self) -> Vec<CollaborationSession> {
        self.sessions.read().await
            .values()
            .filter(|s| matches!(s.state, SessionState::Active))
            .cloned()
            .collect()
    }

    pub async fn get_participant_sessions(&self, user_id: &str) -> Vec<Uuid> {
        self.participant_sessions.read().await
            .get(user_id)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .collect()
    }

    pub fn get_metrics(&self) -> CollaborationMetrics {
        self.metrics.read().unwrap().clone()
    }
}

// Implement participant role permissions
impl ParticipantRole {
    pub fn can_edit(&self) -> bool {
        matches!(self, ParticipantRole::Owner | ParticipantRole::Admin | ParticipantRole::Editor)
    }

    pub fn can_manage_participants(&self) -> bool {
        matches!(self, ParticipantRole::Owner | ParticipantRole::Admin)
    }

    pub fn can_change_permissions(&self) -> bool {
        matches!(self, ParticipantRole::Owner)
    }

    pub fn can_view(&self) -> bool {
        true // All roles can view
    }

    pub fn can_chat(&self) -> bool {
        !matches!(self, ParticipantRole::Guest) // All except guests can chat
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_collaboration_session_creation() {
        let manager = CollaborationManager::new().await.unwrap();
        
        let permissions = SessionPermissions {
            allow_guests: false,
            require_approval: false,
            max_participants: Some(10),
            allowed_actions: HashSet::new(),
            recording_enabled: false,
            ai_assistance_enabled: true,
        };

        let session_id = manager.create_session(
            "Test Session".to_string(),
            "user123".to_string(),
            permissions,
        ).await.unwrap();

        // Give the async command processor time to process
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        let session = manager.get_session(session_id).await;
        assert!(session.is_some());
        assert_eq!(session.unwrap().name, "Test Session");
    }

    #[tokio::test]
    async fn test_participant_join_leave() {
        let manager = CollaborationManager::new().await.unwrap();
        
        let permissions = SessionPermissions {
            allow_guests: true,
            require_approval: false,
            max_participants: None,
            allowed_actions: HashSet::new(),
            recording_enabled: false,
            ai_assistance_enabled: true,
        };

        let session_id = manager.create_session(
            "Test Session".to_string(),
            "owner".to_string(),
            permissions,
        ).await.unwrap();

        // Give time for session creation
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

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

        manager.join_session(session_id, participant.clone()).await.unwrap();
        
        // Give time for join processing
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        let session = manager.get_session(session_id).await.unwrap();
        assert_eq!(session.participants.len(), 1);

        manager.leave_session(session_id, participant.id).await.unwrap();
        
        // Give time for leave processing
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Session should be removed when empty
        let session = manager.get_session(session_id).await;
        assert!(session.is_none());
    }
}