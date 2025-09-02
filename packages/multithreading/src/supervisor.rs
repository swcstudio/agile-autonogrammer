use crate::actor::{Actor, ActorBehavior, ActorId, Message, get_actor_system};
use crate::genserver::{GenServer, GenServerBehavior};
use async_channel::{bounded, unbounded, Receiver, Sender};
use dashmap::DashMap;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use parking_lot::RwLock;
use petgraph::graph::{DiGraph, NodeIndex};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::{interval, sleep};
use tracing::{debug, error, info, warn};

// Supervisor restart strategies (inspired by Elixir/OTP)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RestartStrategy {
    OneForOne,     // Restart only the failed child
    OneForAll,     // Restart all children if one fails
    RestForOne,    // Restart the failed child and all children started after it
    SimpleOneForOne, // For dynamically added children of the same type
}

// Child restart specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Restart {
    Permanent,   // Always restart
    Temporary,   // Never restart
    Transient,   // Restart only if abnormal termination
}

// Shutdown specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Shutdown {
    Brutal,           // Immediate termination
    Timeout(Duration), // Give time to clean up
    Infinity,         // Wait indefinitely
}

// Child specification
#[derive(Clone)]
pub struct ChildSpec {
    pub id: String,
    pub start: Arc<dyn Fn() -> ActorId + Send + Sync>,
    pub restart: Restart,
    pub shutdown: Shutdown,
    pub child_type: ChildType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChildType {
    Worker,
    Supervisor,
}

// Supervisor state
pub struct SupervisorState {
    children: Arc<DashMap<String, ChildInfo>>,
    restart_strategy: RestartStrategy,
    max_restarts: u32,
    max_seconds: u32,
    restart_counts: Arc<DashMap<String, Vec<std::time::Instant>>>,
}

struct ChildInfo {
    spec: ChildSpec,
    actor_id: ActorId,
    restart_count: u32,
    status: ChildStatus,
}

#[derive(Debug, Clone)]
enum ChildStatus {
    Running,
    Stopping,
    Stopped,
    Failed(String),
}

// Supervisor implementation
pub struct Supervisor {
    name: String,
    state: Arc<RwLock<SupervisorState>>,
    actor_id: Option<ActorId>,
}

impl Supervisor {
    pub fn new(
        name: String,
        restart_strategy: RestartStrategy,
        max_restarts: u32,
        max_seconds: u32,
    ) -> Self {
        Supervisor {
            name,
            state: Arc::new(RwLock::new(SupervisorState {
                children: Arc::new(DashMap::new()),
                restart_strategy,
                max_restarts,
                max_seconds,
                restart_counts: Arc::new(DashMap::new()),
            })),
            actor_id: None,
        }
    }

    pub fn add_child(&self, spec: ChildSpec) -> Result<()> {
        let state = self.state.read();
        
        if state.children.contains_key(&spec.id) {
            return Err(Error::from_reason(format!("Child {} already exists", spec.id)));
        }

        // Start the child
        let actor_id = (spec.start)();
        
        let child_info = ChildInfo {
            spec: spec.clone(),
            actor_id: actor_id.clone(),
            restart_count: 0,
            status: ChildStatus::Running,
        };

        state.children.insert(spec.id.clone(), child_info);
        
        // Monitor the child for failures
        self.monitor_child(spec.id, actor_id);
        
        Ok(())
    }

    pub fn remove_child(&self, child_id: String) -> Result<()> {
        let state = self.state.read();
        
        if let Some((_, child_info)) = state.children.remove(&child_id) {
            // Stop the child actor
            if let Some(system) = get_actor_system() {
                let _ = system.stop(&child_info.actor_id);
            }
            Ok(())
        } else {
            Err(Error::from_reason(format!("Child {} not found", child_id)))
        }
    }

    fn monitor_child(&self, child_id: String, actor_id: ActorId) {
        let state = self.state.clone();
        let supervisor_name = self.name.clone();
        
        tokio::spawn(async move {
            loop {
                sleep(Duration::from_secs(1)).await;
                
                // Check if child is still running
                if let Some(system) = get_actor_system() {
                    if system.get_actor(&actor_id).is_none() {
                        warn!("Child {} has failed in supervisor {}", child_id, supervisor_name);
                        
                        // Handle restart based on strategy
                        let should_restart = {
                            let state = state.read();
                            if let Some(child_info) = state.children.get(&child_id) {
                                match child_info.spec.restart {
                                    Restart::Permanent => true,
                                    Restart::Temporary => false,
                                    Restart::Transient => {
                                        // Check if it was an abnormal termination
                                        matches!(child_info.status, ChildStatus::Failed(_))
                                    }
                                }
                            } else {
                                false
                            }
                        };

                        if should_restart {
                            // Check restart frequency
                            let can_restart = {
                                let state = state.read();
                                let mut restart_counts = state.restart_counts.entry(child_id.clone())
                                    .or_insert_with(Vec::new);
                                
                                let now = std::time::Instant::now();
                                restart_counts.push(now);
                                
                                // Remove old restart times
                                let cutoff = now - Duration::from_secs(state.max_seconds as u64);
                                restart_counts.retain(|&time| time > cutoff);
                                
                                restart_counts.len() <= state.max_restarts as usize
                            };

                            if can_restart {
                                // Restart the child
                                let state = state.read();
                                if let Some(mut child_info) = state.children.get_mut(&child_id) {
                                    info!("Restarting child {} in supervisor {}", child_id, supervisor_name);
                                    
                                    let new_actor_id = (child_info.spec.start)();
                                    child_info.actor_id = new_actor_id;
                                    child_info.restart_count += 1;
                                    child_info.status = ChildStatus::Running;
                                }
                            } else {
                                error!(
                                    "Child {} in supervisor {} exceeded restart limit",
                                    child_id, supervisor_name
                                );
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                }
            }
        });
    }

    pub async fn start(mut self) -> Result<ActorId> {
        // Create supervisor actor
        let supervisor_actor = SupervisorActor {
            supervisor: Arc::new(self),
        };
        
        if let Some(system) = get_actor_system() {
            let actor_id = system.spawn(Box::new(supervisor_actor));
            Ok(actor_id)
        } else {
            Err(Error::from_reason("Actor system not initialized"))
        }
    }

    pub fn which_children(&self) -> Vec<(String, String, ChildType)> {
        let state = self.state.read();
        state.children.iter()
            .map(|entry| {
                let (id, info) = entry.pair();
                (id.clone(), format!("{:?}", info.actor_id), info.spec.child_type.clone())
            })
            .collect()
    }

    pub fn count_children(&self) -> (usize, usize, usize, usize) {
        let state = self.state.read();
        let total = state.children.len();
        let active = state.children.iter()
            .filter(|entry| matches!(entry.status, ChildStatus::Running))
            .count();
        let supervisors = state.children.iter()
            .filter(|entry| matches!(entry.spec.child_type, ChildType::Supervisor))
            .count();
        let workers = total - supervisors;
        
        (active, supervisors, workers, total)
    }
}

// Actor wrapper for Supervisor
struct SupervisorActor {
    supervisor: Arc<Supervisor>,
}

#[async_trait::async_trait]
impl ActorBehavior for SupervisorActor {
    async fn handle_message(&mut self, msg: Message) -> Option<Vec<u8>> {
        match msg {
            Message::Info { payload } => {
                // Handle child exit notifications
                info!("Supervisor received info: {:?}", payload);
                None
            }
            _ => None,
        }
    }
    
    async fn on_stop(&mut self) {
        // Stop all children
        let state = self.supervisor.state.read();
        for entry in state.children.iter() {
            if let Some(system) = get_actor_system() {
                let _ = system.stop(&entry.actor_id);
            }
        }
    }
}

// Dynamic supervisor for simple_one_for_one strategy
pub struct DynamicSupervisor {
    supervisor: Supervisor,
    child_factory: Arc<dyn Fn() -> ActorId + Send + Sync>,
}

impl DynamicSupervisor {
    pub fn new(
        name: String,
        max_restarts: u32,
        max_seconds: u32,
        child_factory: Arc<dyn Fn() -> ActorId + Send + Sync>,
    ) -> Self {
        DynamicSupervisor {
            supervisor: Supervisor::new(
                name,
                RestartStrategy::SimpleOneForOne,
                max_restarts,
                max_seconds,
            ),
            child_factory,
        }
    }

    pub fn start_child(&self) -> Result<ActorId> {
        let actor_id = (self.child_factory)();
        let child_id = format!("child_{}", uuid::Uuid::new_v4());
        
        let spec = ChildSpec {
            id: child_id.clone(),
            start: self.child_factory.clone(),
            restart: Restart::Permanent,
            shutdown: Shutdown::Timeout(Duration::from_secs(5)),
            child_type: ChildType::Worker,
        };
        
        self.supervisor.add_child(spec)?;
        Ok(actor_id)
    }

    pub fn terminate_child(&self, child_id: String) -> Result<()> {
        self.supervisor.remove_child(child_id)
    }
}

// NAPI bindings for JavaScript
#[napi]
pub struct JsSupervisor {
    supervisor: Option<Arc<Supervisor>>,
}

#[napi]
impl JsSupervisor {
    #[napi(constructor)]
    pub fn new() -> Self {
        JsSupervisor { supervisor: None }
    }
    
    #[napi]
    pub fn create(&mut self, name: String, strategy: String, max_restarts: u32, max_seconds: u32) -> Result<()> {
        let restart_strategy = match strategy.as_str() {
            "one_for_one" => RestartStrategy::OneForOne,
            "one_for_all" => RestartStrategy::OneForAll,
            "rest_for_one" => RestartStrategy::RestForOne,
            "simple_one_for_one" => RestartStrategy::SimpleOneForOne,
            _ => return Err(Error::from_reason(format!("Unknown strategy: {}", strategy))),
        };
        
        let supervisor = Supervisor::new(name, restart_strategy, max_restarts, max_seconds);
        self.supervisor = Some(Arc::new(supervisor));
        Ok(())
    }
    
    #[napi]
    pub async fn start(&self) -> Result<String> {
        if let Some(supervisor) = &self.supervisor {
            let supervisor_clone = Supervisor::new(
                supervisor.name.clone(),
                supervisor.state.read().restart_strategy.clone(),
                supervisor.state.read().max_restarts,
                supervisor.state.read().max_seconds,
            );
            
            let actor_id = supervisor_clone.start().await?;
            Ok(format!("{:?}", actor_id))
        } else {
            Err(Error::from_reason("Supervisor not created"))
        }
    }
    
    #[napi]
    pub fn add_worker(&self, child_id: String, restart_type: String) -> Result<()> {
        if let Some(supervisor) = &self.supervisor {
            let restart = match restart_type.as_str() {
                "permanent" => Restart::Permanent,
                "temporary" => Restart::Temporary,
                "transient" => Restart::Transient,
                _ => return Err(Error::from_reason(format!("Unknown restart type: {}", restart_type))),
            };
            
            // Create a simple worker actor factory
            let start: Arc<dyn Fn() -> ActorId + Send + Sync> = Arc::new(move || {
                if let Some(system) = get_actor_system() {
                    // Create a simple echo worker
                    struct EchoWorker;
                    
                    #[async_trait::async_trait]
                    impl ActorBehavior for EchoWorker {
                        async fn handle_message(&mut self, _msg: Message) -> Option<Vec<u8>> {
                            None
                        }
                    }
                    
                    system.spawn(Box::new(EchoWorker))
                } else {
                    ActorId::new()
                }
            });
            
            let spec = ChildSpec {
                id: child_id,
                start,
                restart,
                shutdown: Shutdown::Timeout(Duration::from_secs(5)),
                child_type: ChildType::Worker,
            };
            
            supervisor.add_child(spec)
        } else {
            Err(Error::from_reason("Supervisor not created"))
        }
    }
    
    #[napi]
    pub fn which_children(&self) -> Vec<String> {
        if let Some(supervisor) = &self.supervisor {
            supervisor.which_children()
                .into_iter()
                .map(|(id, actor_id, child_type)| {
                    format!("{}: {} ({:?})", id, actor_id, child_type)
                })
                .collect()
        } else {
            Vec::new()
        }
    }
    
    #[napi]
    pub fn count_children(&self) -> String {
        if let Some(supervisor) = &self.supervisor {
            let (active, supervisors, workers, total) = supervisor.count_children();
            format!(
                "Active: {}, Supervisors: {}, Workers: {}, Total: {}",
                active, supervisors, workers, total
            )
        } else {
            "No supervisor".to_string()
        }
    }
}