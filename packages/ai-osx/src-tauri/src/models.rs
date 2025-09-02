// AI-OSX Core Models and Data Structures
// Shared data structures for Brain-Braun-Beyond architecture

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

// Priority levels for processing requests
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
    Realtime,
}

impl Priority {
    pub fn to_numeric(&self) -> u8 {
        match self {
            Priority::Low => 1,
            Priority::Medium => 2,
            Priority::High => 3,
            Priority::Critical => 4,
            Priority::Realtime => 5,
        }
    }
}

// System-wide status indicators
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SystemStatus {
    Initializing,
    Running,
    Degraded,
    Maintenance,
    Error,
    Shutdown,
}

// Cognitive system state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CognitiveSystemState {
    pub working_memory_load: usize,
    pub long_term_memory_size: usize,
    pub active_processing_count: usize,
    pub cognitive_load: f32,
    pub attention_focus: Vec<String>,
    pub emotional_state: crate::brain::EmotionalState,
    pub neural_activity: usize,
}

// Performance metrics structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub cpu_usage: f32,
    pub memory_usage: f64,
    pub disk_io: f64,
    pub network_io: f64,
    pub gpu_usage: Option<f32>,
    pub temperature: Option<f32>,
    pub power_consumption: Option<f32>,
    pub response_time_ms: Vec<f64>,
    pub throughput_ops_per_sec: f64,
    pub error_rate: f32,
    pub uptime_seconds: u64,
    pub timestamp: DateTime<Utc>,
}

// Security status and metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityStatus {
    pub threat_level: ThreatLevel,
    pub active_threats: Vec<SecurityThreat>,
    pub security_events: Vec<SecurityEvent>,
    pub encryption_status: EncryptionStatus,
    pub access_control_status: AccessControlStatus,
    pub audit_log_integrity: bool,
    pub last_security_scan: DateTime<Utc>,
    pub vulnerabilities_found: usize,
    pub security_score: f32, // 0.0 to 100.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ThreatLevel {
    Green,    // No known threats
    Yellow,   // Potential threats detected
    Orange,   // Active threats detected
    Red,      // Critical threats - immediate action required
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityThreat {
    pub id: String,
    pub threat_type: ThreatType,
    pub severity: Severity,
    pub description: String,
    pub source: String,
    pub target: String,
    pub detected_at: DateTime<Utc>,
    pub status: ThreatStatus,
    pub mitigation_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ThreatType {
    Malware,
    UnauthorizedAccess,
    DataBreach,
    DenialOfService,
    PrivilegeEscalation,
    SocialEngineering,
    PhysicalSecurity,
    NetworkIntrusion,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Severity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ThreatStatus {
    Detected,
    Analyzing,
    Contained,
    Mitigated,
    Resolved,
    Escalated,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub id: String,
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub source_ip: Option<String>,
    pub description: String,
    pub risk_score: f32,
    pub automated_response: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionStatus {
    pub data_at_rest_encrypted: bool,
    pub data_in_transit_encrypted: bool,
    pub encryption_algorithms: Vec<String>,
    pub key_management_status: KeyManagementStatus,
    pub certificate_expiry_dates: HashMap<String, DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyManagementStatus {
    pub hsm_available: bool,
    pub key_rotation_enabled: bool,
    pub last_key_rotation: DateTime<Utc>,
    pub pending_key_rotations: usize,
    pub compromised_keys: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessControlStatus {
    pub authentication_enabled: bool,
    pub multi_factor_enabled: bool,
    pub role_based_access: bool,
    pub session_management: bool,
    pub failed_login_attempts: HashMap<String, usize>,
    pub active_sessions: usize,
    pub privileged_access_granted: usize,
}

// Storage and data management structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageRequest {
    pub operation: StorageOperation,
    pub key: String,
    pub value: Option<serde_json::Value>,
    pub metadata: HashMap<String, String>,
    pub expiration: Option<DateTime<Utc>>,
    pub encryption_required: bool,
    pub backup_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StorageOperation {
    Store,
    Retrieve,
    Update,
    Delete,
    List,
    Backup,
    Restore,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageResponse {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub metadata: HashMap<String, String>,
    pub error: Option<String>,
    pub operation_time_ms: u64,
    pub storage_usage: StorageUsage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageUsage {
    pub total_size_bytes: u64,
    pub used_size_bytes: u64,
    pub available_size_bytes: u64,
    pub item_count: usize,
    pub fragmentation_percent: f32,
}

// Network and edge computing structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeConnectionStatus {
    pub connected: bool,
    pub edge_location: String,
    pub latency_ms: f64,
    pub bandwidth_mbps: f64,
    pub last_heartbeat: DateTime<Utc>,
    pub connection_quality: ConnectionQuality,
    pub active_streams: usize,
    pub data_transferred_bytes: u64,
    pub error_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionQuality {
    Excellent,
    Good,
    Fair,
    Poor,
    Disconnected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkRequest {
    pub id: String,
    pub method: HttpMethod,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<serde_json::Value>,
    pub timeout_ms: u64,
    pub retry_count: usize,
    pub priority: Priority,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HttpMethod {
    GET,
    POST,
    PUT,
    DELETE,
    PATCH,
    HEAD,
    OPTIONS,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkResponse {
    pub id: String,
    pub status_code: u16,
    pub headers: HashMap<String, String>,
    pub body: Option<serde_json::Value>,
    pub response_time_ms: u64,
    pub bytes_transferred: u64,
    pub error: Option<String>,
}

// Audio and resonance structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResonanceState {
    pub active: bool,
    pub frequency: f32,
    pub amplitude: f32,
    pub phase: f32,
    pub harmonics: Vec<f32>,
    pub field_strength: f32,
    pub coherence_level: f32,
    pub entrainment_patterns: Vec<EntrainmentPattern>,
    pub last_analysis: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntrainmentPattern {
    pub frequency_hz: f32,
    pub amplitude_db: f32,
    pub phase_offset: f32,
    pub duration_ms: u64,
    pub pattern_type: PatternType,
    pub synchronization_strength: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PatternType {
    Binaural,
    Isochronic,
    Monaural,
    Stochastic,
    Harmonic,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioAnalysis {
    pub frequency_spectrum: Vec<f32>,
    pub spectral_centroid: f32,
    pub spectral_bandwidth: f32,
    pub spectral_rolloff: f32,
    pub zero_crossing_rate: f32,
    pub mfcc_coefficients: Vec<f32>,
    pub tempo_bpm: Option<f32>,
    pub key_signature: Option<String>,
    pub energy_level: f32,
    pub dynamic_range: f32,
}

// Session management structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSession {
    pub session_id: String,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub session_type: SessionType,
    pub permissions: Vec<String>,
    pub context_data: HashMap<String, serde_json::Value>,
    pub cognitive_state: Option<crate::brain::CognitiveContext>,
    pub preferences: UserPreferences,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SessionType {
    Interactive,
    Batch,
    Stream,
    Background,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub theme: String,
    pub language: String,
    pub timezone: String,
    pub notification_settings: NotificationSettings,
    pub cognitive_settings: CognitiveSettings,
    pub privacy_settings: PrivacySettings,
    pub accessibility_settings: AccessibilitySettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub desktop_notifications: bool,
    pub sound_notifications: bool,
    pub email_notifications: bool,
    pub priority_filter: Priority,
    pub quiet_hours_start: Option<String>, // HH:MM format
    pub quiet_hours_end: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CognitiveSettings {
    pub reasoning_depth: f32,        // 0.0 to 1.0
    pub creativity_level: f32,       // 0.0 to 1.0
    pub processing_speed: f32,       // 0.0 to 1.0
    pub memory_retention: f32,       // 0.0 to 1.0
    pub attention_span: f32,         // 0.0 to 1.0
    pub curiosity_level: f32,        // 0.0 to 1.0
    pub risk_tolerance: f32,         // 0.0 to 1.0
    pub preferred_explanation_depth: ExplanationDepth,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExplanationDepth {
    Minimal,
    Summary,
    Detailed,
    Comprehensive,
    Expert,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacySettings {
    pub data_collection_consent: bool,
    pub analytics_consent: bool,
    pub personalization_consent: bool,
    pub data_sharing_consent: bool,
    pub data_retention_days: u32,
    pub anonymization_level: AnonymizationLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AnonymizationLevel {
    None,
    Basic,
    Standard,
    High,
    Maximum,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessibilitySettings {
    pub screen_reader_support: bool,
    pub high_contrast_mode: bool,
    pub large_text_mode: bool,
    pub keyboard_navigation_only: bool,
    pub reduced_motion: bool,
    pub color_blind_support: ColorBlindSupport,
    pub text_to_speech_speed: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ColorBlindSupport {
    None,
    Protanopia,
    Deuteranopia,
    Tritanopia,
    Monochromacy,
}

// Window and UI management structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    pub label: String,
    pub title: String,
    pub url: String,
    pub width: f64,
    pub height: f64,
    pub min_width: Option<f64>,
    pub min_height: Option<f64>,
    pub max_width: Option<f64>,
    pub max_height: Option<f64>,
    pub resizable: bool,
    pub maximized: bool,
    pub fullscreen: bool,
    pub transparent: bool,
    pub decorations: bool,
    pub always_on_top: bool,
    pub visible: bool,
    pub center: bool,
    pub position: Option<(f64, f64)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub label: String,
    pub visible: bool,
    pub focused: bool,
    pub minimized: bool,
    pub maximized: bool,
    pub fullscreen: bool,
    pub position: (f64, f64),
    pub size: (f64, f64),
    pub scale_factor: f64,
}

// Error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub error_type: ErrorType,
    pub message: String,
    pub details: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub session_id: Option<String>,
    pub stack_trace: Option<String>,
    pub recovery_suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorType {
    CognitiveProcessingError,
    ComputationalError,
    TranscendenceError,
    NetworkError,
    StorageError,
    SecurityError,
    AudioError,
    SystemError,
    ValidationError,
    ConfigurationError,
    ResourceExhaustion,
    TimeoutError,
    PermissionDenied,
    NotFound,
    InternalError,
}

// API response wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<AppError>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub timestamp: DateTime<Utc>,
    pub request_id: String,
    pub processing_time_ms: u64,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            metadata: HashMap::new(),
            timestamp: Utc::now(),
            request_id: Uuid::new_v4().to_string(),
            processing_time_ms: 0,
        }
    }

    pub fn error(error: AppError) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
            metadata: HashMap::new(),
            timestamp: Utc::now(),
            request_id: Uuid::new_v4().to_string(),
            processing_time_ms: 0,
        }
    }

    pub fn with_metadata(mut self, key: String, value: serde_json::Value) -> Self {
        self.metadata.insert(key, value);
        self
    }

    pub fn with_processing_time(mut self, processing_time_ms: u64) -> Self {
        self.processing_time_ms = processing_time_ms;
        self
    }

    pub fn with_request_id(mut self, request_id: String) -> Self {
        self.request_id = request_id;
        self
    }
}

// Configuration structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub app_name: String,
    pub version: String,
    pub environment: Environment,
    pub logging: LoggingConfig,
    pub storage: StorageConfig,
    pub network: NetworkConfig,
    pub security: SecurityConfig,
    pub performance: PerformanceConfig,
    pub cognitive: CognitiveConfig,
    pub audio: AudioConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Environment {
    Development,
    Testing,
    Staging,
    Production,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: LogLevel,
    pub file_logging: bool,
    pub console_logging: bool,
    pub log_file_path: String,
    pub max_log_file_size_mb: u64,
    pub log_retention_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub data_directory: String,
    pub cache_directory: String,
    pub max_cache_size_mb: u64,
    pub backup_enabled: bool,
    pub backup_interval_hours: u32,
    pub encryption_enabled: bool,
    pub compression_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub edge_endpoint: String,
    pub api_timeout_ms: u64,
    pub max_concurrent_requests: usize,
    pub retry_attempts: usize,
    pub rate_limit_requests_per_minute: usize,
    pub connection_pool_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub encryption_algorithm: String,
    pub key_size_bits: usize,
    pub session_timeout_minutes: u32,
    pub max_failed_login_attempts: usize,
    pub password_complexity_required: bool,
    pub audit_logging_enabled: bool,
    pub intrusion_detection_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    pub max_cpu_usage_percent: f32,
    pub max_memory_usage_mb: u64,
    pub performance_monitoring_enabled: bool,
    pub metrics_collection_interval_seconds: u32,
    pub auto_optimization_enabled: bool,
    pub garbage_collection_threshold_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CognitiveConfig {
    pub max_concurrent_processes: usize,
    pub default_reasoning_depth: f32,
    pub memory_consolidation_enabled: bool,
    pub pattern_recognition_sensitivity: f32,
    pub creativity_boost_enabled: bool,
    pub emotional_processing_enabled: bool,
    pub metacognitive_monitoring: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioConfig {
    pub sample_rate_hz: u32,
    pub bit_depth: u8,
    pub channels: u8,
    pub buffer_size_frames: usize,
    pub resonance_analysis_enabled: bool,
    pub audio_enhancement_enabled: bool,
    pub noise_reduction_enabled: bool,
    pub spatial_audio_enabled: bool,
}

// Utility functions for model conversions and validations
impl From<&str> for Priority {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "low" => Priority::Low,
            "medium" => Priority::Medium,
            "high" => Priority::High,
            "critical" => Priority::Critical,
            "realtime" => Priority::Realtime,
            _ => Priority::Medium, // Default
        }
    }
}

impl From<Priority> for String {
    fn from(p: Priority) -> Self {
        match p {
            Priority::Low => "low".to_string(),
            Priority::Medium => "medium".to_string(),
            Priority::High => "high".to_string(),
            Priority::Critical => "critical".to_string(),
            Priority::Realtime => "realtime".to_string(),
        }
    }
}

// Default implementations for common structures
impl Default for PerformanceMetrics {
    fn default() -> Self {
        Self {
            cpu_usage: 0.0,
            memory_usage: 0.0,
            disk_io: 0.0,
            network_io: 0.0,
            gpu_usage: None,
            temperature: None,
            power_consumption: None,
            response_time_ms: Vec::new(),
            throughput_ops_per_sec: 0.0,
            error_rate: 0.0,
            uptime_seconds: 0,
            timestamp: Utc::now(),
        }
    }
}

impl Default for ResonanceState {
    fn default() -> Self {
        Self {
            active: false,
            frequency: 440.0, // A4 note
            amplitude: 0.0,
            phase: 0.0,
            harmonics: Vec::new(),
            field_strength: 0.0,
            coherence_level: 0.0,
            entrainment_patterns: Vec::new(),
            last_analysis: Utc::now(),
        }
    }
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            language: "en".to_string(),
            timezone: "UTC".to_string(),
            notification_settings: NotificationSettings::default(),
            cognitive_settings: CognitiveSettings::default(),
            privacy_settings: PrivacySettings::default(),
            accessibility_settings: AccessibilitySettings::default(),
        }
    }
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            desktop_notifications: true,
            sound_notifications: true,
            email_notifications: false,
            priority_filter: Priority::Medium,
            quiet_hours_start: None,
            quiet_hours_end: None,
        }
    }
}

impl Default for CognitiveSettings {
    fn default() -> Self {
        Self {
            reasoning_depth: 0.7,
            creativity_level: 0.5,
            processing_speed: 0.8,
            memory_retention: 0.9,
            attention_span: 0.6,
            curiosity_level: 0.7,
            risk_tolerance: 0.3,
            preferred_explanation_depth: ExplanationDepth::Detailed,
        }
    }
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            data_collection_consent: false,
            analytics_consent: false,
            personalization_consent: true,
            data_sharing_consent: false,
            data_retention_days: 30,
            anonymization_level: AnonymizationLevel::Standard,
        }
    }
}

impl Default for AccessibilitySettings {
    fn default() -> Self {
        Self {
            screen_reader_support: false,
            high_contrast_mode: false,
            large_text_mode: false,
            keyboard_navigation_only: false,
            reduced_motion: false,
            color_blind_support: ColorBlindSupport::None,
            text_to_speech_speed: 1.0,
        }
    }
}