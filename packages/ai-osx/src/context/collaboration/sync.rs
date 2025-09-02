use super::*;
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::{RwLock, Mutex};
use serde::{Deserialize, Serialize};

/// Operational Transformation (OT) based synchronization engine
pub struct SyncEngine {
    document_states: Arc<RwLock<HashMap<String, DocumentState>>>,
    operation_history: Arc<RwLock<HashMap<String, OperationHistory>>>,
    vector_clocks: Arc<RwLock<HashMap<Uuid, VectorClock>>>,
    pending_operations: Arc<Mutex<VecDeque<PendingOperation>>>,
    config: SyncConfig,
}

#[derive(Debug, Clone)]
pub struct DocumentState {
    pub file_path: String,
    pub content: String,
    pub version: u64,
    pub checksum: String,
    pub last_modified: DateTime<Utc>,
    pub active_editors: HashSet<Uuid>,
}

#[derive(Debug, Clone)]
pub struct OperationHistory {
    pub operations: VecDeque<Operation>,
    pub max_history_size: usize,
    pub checkpoint_interval: usize,
    pub checkpoints: Vec<Checkpoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub id: Uuid,
    pub participant_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub operation_type: OperationType,
    pub position: usize,
    pub content: String,
    pub length: usize,
    pub vector_clock: VectorClock,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorClock {
    pub clocks: HashMap<Uuid, u64>,
}

impl VectorClock {
    pub fn new() -> Self {
        VectorClock {
            clocks: HashMap::new(),
        }
    }

    pub fn increment(&mut self, participant_id: Uuid) {
        *self.clocks.entry(participant_id).or_insert(0) += 1;
    }

    pub fn update(&mut self, other: &VectorClock) {
        for (id, &clock) in &other.clocks {
            let entry = self.clocks.entry(*id).or_insert(0);
            *entry = (*entry).max(clock);
        }
    }

    pub fn happens_before(&self, other: &VectorClock) -> bool {
        for (id, &clock) in &self.clocks {
            if clock > *other.clocks.get(id).unwrap_or(&0) {
                return false;
            }
        }
        
        self.clocks.len() <= other.clocks.len()
    }

    pub fn concurrent_with(&self, other: &VectorClock) -> bool {
        !self.happens_before(other) && !other.happens_before(self)
    }
}

#[derive(Debug, Clone)]
pub struct Checkpoint {
    pub version: u64,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub operations_since: Vec<Operation>,
}

#[derive(Debug, Clone)]
pub struct PendingOperation {
    pub operation: Operation,
    pub retry_count: u32,
    pub max_retries: u32,
}

#[derive(Debug, Clone)]
pub struct SyncConfig {
    pub max_history_size: usize,
    pub checkpoint_interval: usize,
    pub max_pending_operations: usize,
    pub operation_timeout_ms: u64,
    pub conflict_resolution_strategy: ConflictResolutionStrategy,
}

#[derive(Debug, Clone)]
pub enum ConflictResolutionStrategy {
    LastWriterWins,
    OperationalTransform,
    ThreeWayMerge,
    Custom(fn(&Operation, &Operation) -> Operation),
}

impl Default for SyncConfig {
    fn default() -> Self {
        SyncConfig {
            max_history_size: 1000,
            checkpoint_interval: 100,
            max_pending_operations: 500,
            operation_timeout_ms: 5000,
            conflict_resolution_strategy: ConflictResolutionStrategy::OperationalTransform,
        }
    }
}

impl SyncEngine {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(SyncEngine {
            document_states: Arc::new(RwLock::new(HashMap::new())),
            operation_history: Arc::new(RwLock::new(HashMap::new())),
            vector_clocks: Arc::new(RwLock::new(HashMap::new())),
            pending_operations: Arc::new(Mutex::new(VecDeque::new())),
            config: SyncConfig::default(),
        })
    }

    pub async fn apply_operation(
        &self,
        file_path: &str,
        operation: Operation,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let mut states = self.document_states.write().await;
        let state = states.entry(file_path.to_string())
            .or_insert_with(|| DocumentState {
                file_path: file_path.to_string(),
                content: String::new(),
                version: 0,
                checksum: String::new(),
                last_modified: Utc::now(),
                active_editors: HashSet::new(),
            });

        // Apply operational transformation
        let transformed_op = self.transform_operation(&operation, &state.content).await?;
        
        // Apply the operation to the document
        let new_content = self.apply_operation_to_content(
            &state.content,
            &transformed_op,
        )?;

        // Update document state
        state.content = new_content.clone();
        state.version += 1;
        state.checksum = self.calculate_checksum(&new_content);
        state.last_modified = Utc::now();

        // Update operation history
        self.add_to_history(file_path, transformed_op).await?;

        // Update vector clock
        let mut clocks = self.vector_clocks.write().await;
        let clock = clocks.entry(operation.participant_id).or_insert_with(VectorClock::new);
        clock.increment(operation.participant_id);

        Ok(new_content)
    }

    async fn transform_operation(
        &self,
        operation: &Operation,
        current_content: &str,
    ) -> Result<Operation, Box<dyn std::error::Error>> {
        // Implement operational transformation
        let mut transformed = operation.clone();
        
        // Get concurrent operations from history
        let concurrent_ops = self.get_concurrent_operations(&operation.vector_clock).await?;
        
        for concurrent_op in concurrent_ops {
            transformed = self.transform_against(&transformed, &concurrent_op)?;
        }
        
        Ok(transformed)
    }

    fn transform_against(
        &self,
        op1: &Operation,
        op2: &Operation,
    ) -> Result<Operation, Box<dyn std::error::Error>> {
        let mut transformed = op1.clone();
        
        match (&op1.operation_type, &op2.operation_type) {
            (OperationType::Insert, OperationType::Insert) => {
                if op2.position <= op1.position {
                    transformed.position += op2.length;
                }
            }
            (OperationType::Insert, OperationType::Delete) => {
                if op2.position < op1.position {
                    transformed.position = transformed.position.saturating_sub(op2.length);
                }
            }
            (OperationType::Delete, OperationType::Insert) => {
                if op2.position <= op1.position {
                    transformed.position += op2.length;
                }
            }
            (OperationType::Delete, OperationType::Delete) => {
                if op2.position < op1.position {
                    transformed.position = transformed.position.saturating_sub(op2.length);
                } else if op2.position == op1.position {
                    // Overlapping deletes - adjust length
                    transformed.length = transformed.length.saturating_sub(op2.length);
                }
            }
            (OperationType::Replace, _) | (_, OperationType::Replace) => {
                // Handle replace operations specially
                transformed = self.transform_replace(op1, op2)?;
            }
        }
        
        Ok(transformed)
    }

    fn transform_replace(
        &self,
        op1: &Operation,
        op2: &Operation,
    ) -> Result<Operation, Box<dyn std::error::Error>> {
        let mut transformed = op1.clone();
        
        // Complex transformation logic for replace operations
        match &op2.operation_type {
            OperationType::Insert => {
                if op2.position <= op1.position {
                    transformed.position += op2.length;
                }
            }
            OperationType::Delete => {
                if op2.position < op1.position {
                    let adjustment = op2.length.min(op1.position - op2.position);
                    transformed.position -= adjustment;
                }
            }
            OperationType::Replace => {
                // When two replace operations conflict, use conflict resolution strategy
                match &self.config.conflict_resolution_strategy {
                    ConflictResolutionStrategy::LastWriterWins => {
                        if op2.timestamp > op1.timestamp {
                            transformed = op2.clone();
                        }
                    }
                    ConflictResolutionStrategy::OperationalTransform => {
                        // Adjust positions based on the operations
                        if op2.position < op1.position {
                            let length_diff = op2.content.len() as isize - op2.length as isize;
                            transformed.position = (op1.position as isize + length_diff).max(0) as usize;
                        }
                    }
                    _ => {}
                }
            }
        }
        
        Ok(transformed)
    }

    fn apply_operation_to_content(
        &self,
        content: &str,
        operation: &Operation,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let mut result = content.to_string();
        
        match operation.operation_type {
            OperationType::Insert => {
                if operation.position <= result.len() {
                    result.insert_str(operation.position, &operation.content);
                } else {
                    return Err("Insert position out of bounds".into());
                }
            }
            OperationType::Delete => {
                let end = (operation.position + operation.length).min(result.len());
                result.drain(operation.position..end);
            }
            OperationType::Replace => {
                let end = (operation.position + operation.length).min(result.len());
                result.replace_range(operation.position..end, &operation.content);
            }
        }
        
        Ok(result)
    }

    async fn add_to_history(
        &self,
        file_path: &str,
        operation: Operation,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut histories = self.operation_history.write().await;
        let history = histories.entry(file_path.to_string())
            .or_insert_with(|| OperationHistory {
                operations: VecDeque::new(),
                max_history_size: self.config.max_history_size,
                checkpoint_interval: self.config.checkpoint_interval,
                checkpoints: Vec::new(),
            });

        history.operations.push_back(operation.clone());
        
        // Limit history size
        while history.operations.len() > history.max_history_size {
            history.operations.pop_front();
        }
        
        // Create checkpoint if needed
        if history.operations.len() % history.checkpoint_interval == 0 {
            self.create_checkpoint(file_path, history).await?;
        }
        
        Ok(())
    }

    async fn create_checkpoint(
        &self,
        file_path: &str,
        history: &mut OperationHistory,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let states = self.document_states.read().await;
        if let Some(state) = states.get(file_path) {
            let checkpoint = Checkpoint {
                version: state.version,
                content: state.content.clone(),
                timestamp: Utc::now(),
                operations_since: Vec::new(),
            };
            
            history.checkpoints.push(checkpoint);
            
            // Keep only recent checkpoints
            if history.checkpoints.len() > 10 {
                history.checkpoints.remove(0);
            }
        }
        
        Ok(())
    }

    async fn get_concurrent_operations(
        &self,
        vector_clock: &VectorClock,
    ) -> Result<Vec<Operation>, Box<dyn std::error::Error>> {
        let histories = self.operation_history.read().await;
        let mut concurrent_ops = Vec::new();
        
        for history in histories.values() {
            for op in &history.operations {
                if op.vector_clock.concurrent_with(vector_clock) {
                    concurrent_ops.push(op.clone());
                }
            }
        }
        
        // Sort by timestamp for consistent ordering
        concurrent_ops.sort_by_key(|op| op.timestamp);
        
        Ok(concurrent_ops)
    }

    fn calculate_checksum(&self, content: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub async fn get_document_state(&self, file_path: &str) -> Option<DocumentState> {
        self.document_states.read().await.get(file_path).cloned()
    }

    pub async fn resolve_conflict(
        &self,
        file_path: &str,
        op1: &Operation,
        op2: &Operation,
    ) -> Result<Operation, Box<dyn std::error::Error>> {
        match &self.config.conflict_resolution_strategy {
            ConflictResolutionStrategy::LastWriterWins => {
                Ok(if op1.timestamp > op2.timestamp {
                    op1.clone()
                } else {
                    op2.clone()
                })
            }
            ConflictResolutionStrategy::OperationalTransform => {
                self.transform_against(op1, op2)
            }
            ConflictResolutionStrategy::ThreeWayMerge => {
                self.three_way_merge(file_path, op1, op2).await
            }
            ConflictResolutionStrategy::Custom(resolver) => {
                Ok(resolver(op1, op2))
            }
        }
    }

    async fn three_way_merge(
        &self,
        file_path: &str,
        op1: &Operation,
        op2: &Operation,
    ) -> Result<Operation, Box<dyn std::error::Error>> {
        // Find common ancestor from checkpoints
        let histories = self.operation_history.read().await;
        let history = histories.get(file_path)
            .ok_or("No history found for file")?;
        
        // Find the most recent checkpoint before both operations
        let common_ancestor = history.checkpoints.iter()
            .rev()
            .find(|cp| cp.timestamp < op1.timestamp.min(op2.timestamp))
            .map(|cp| cp.content.clone())
            .unwrap_or_default();
        
        // Apply operations to get both versions
        let version1 = self.apply_operation_to_content(&common_ancestor, op1)?;
        let version2 = self.apply_operation_to_content(&common_ancestor, op2)?;
        
        // Perform three-way merge
        let merged_content = self.merge_contents(&common_ancestor, &version1, &version2)?;
        
        // Create a new operation representing the merge
        Ok(Operation {
            id: Uuid::new_v4(),
            participant_id: Uuid::nil(), // System operation
            timestamp: Utc::now(),
            operation_type: OperationType::Replace,
            position: 0,
            content: merged_content,
            length: common_ancestor.len(),
            vector_clock: {
                let mut clock = op1.vector_clock.clone();
                clock.update(&op2.vector_clock);
                clock
            },
        })
    }

    fn merge_contents(
        &self,
        _base: &str,
        version1: &str,
        version2: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Simplified merge - in production, use a proper diff3 algorithm
        if version1 == version2 {
            Ok(version1.to_string())
        } else {
            // For now, concatenate both versions with conflict markers
            Ok(format!(
                "<<<<<<< Version 1\n{}\n=======\n{}\n>>>>>>> Version 2",
                version1, version2
            ))
        }
    }

    pub async fn synchronize_with_remote(
        &self,
        remote_operations: Vec<Operation>,
    ) -> Result<Vec<Operation>, Box<dyn std::error::Error>> {
        let mut transformed_operations = Vec::new();
        
        for remote_op in remote_operations {
            // Transform against local operations
            let transformed = self.transform_operation(
                &remote_op,
                "", // Current content would be fetched from document state
            ).await?;
            
            transformed_operations.push(transformed);
        }
        
        Ok(transformed_operations)
    }

    pub async fn get_operations_since(
        &self,
        file_path: &str,
        version: u64,
    ) -> Result<Vec<Operation>, Box<dyn std::error::Error>> {
        let histories = self.operation_history.read().await;
        
        if let Some(history) = histories.get(file_path) {
            let operations: Vec<Operation> = history.operations
                .iter()
                .filter(|op| {
                    // Filter operations after the given version
                    // This would need proper version tracking in production
                    true
                })
                .cloned()
                .collect();
            
            Ok(operations)
        } else {
            Ok(Vec::new())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_vector_clock_ordering() {
        let mut clock1 = VectorClock::new();
        let mut clock2 = VectorClock::new();
        
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        
        clock1.increment(id1);
        clock2.increment(id2);
        
        assert!(clock1.concurrent_with(&clock2));
        
        clock2.update(&clock1);
        clock2.increment(id2);
        
        assert!(clock1.happens_before(&clock2));
        assert!(!clock2.happens_before(&clock1));
    }

    #[tokio::test]
    async fn test_operational_transformation() {
        let engine = SyncEngine::new().await.unwrap();
        
        let op1 = Operation {
            id: Uuid::new_v4(),
            participant_id: Uuid::new_v4(),
            timestamp: Utc::now(),
            operation_type: OperationType::Insert,
            position: 5,
            content: "hello".to_string(),
            length: 0,
            vector_clock: VectorClock::new(),
        };
        
        let op2 = Operation {
            id: Uuid::new_v4(),
            participant_id: Uuid::new_v4(),
            timestamp: Utc::now(),
            operation_type: OperationType::Insert,
            position: 3,
            content: "world".to_string(),
            length: 0,
            vector_clock: VectorClock::new(),
        };
        
        let transformed = engine.transform_against(&op1, &op2).unwrap();
        assert_eq!(transformed.position, 10); // Adjusted for earlier insert
    }
}