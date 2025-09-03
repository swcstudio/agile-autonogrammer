import { EventEmitter } from 'events';
import { Subject, Observable, BehaviorSubject, filter, map } from 'rxjs';
import { BaseAgent } from '../core/BaseAgent';
import {
  AgentMessage,
  MessageType,
  CollaborationMode,
  Task,
  TaskResult
} from '../types/agents';

export interface CollaborationConfig {
  mode: CollaborationMode;
  max_collaboration_depth: number;
  message_timeout_ms: number;
  consensus_threshold: number;
  enable_voting: boolean;
  enable_negotiation: boolean;
  conflict_resolution_strategy: 'voting' | 'seniority' | 'performance' | 'random';
  communication_protocol: 'direct' | 'broadcast' | 'pub_sub' | 'blackboard';
}

interface CollaborationSession {
  id: string;
  participants: Set<string>;
  mode: CollaborationMode;
  task: Task;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  created_at: Date;
  messages: AgentMessage[];
  decisions: Decision[];
  result?: any;
}

interface Decision {
  id: string;
  type: 'consensus' | 'voting' | 'delegation' | 'negotiation';
  participants: string[];
  proposal: any;
  votes?: Map<string, Vote>;
  outcome: any;
  timestamp: Date;
}

interface Vote {
  agent_id: string;
  choice: 'approve' | 'reject' | 'abstain';
  confidence: number;
  reasoning?: string;
}

interface NegotiationState {
  session_id: string;
  round: number;
  proposals: Map<string, Proposal>;
  current_best: Proposal | null;
  consensus_reached: boolean;
}

interface Proposal {
  id: string;
  agent_id: string;
  content: any;
  score: number;
  supporters: Set<string>;
  objections: Map<string, string>;
}

interface Blackboard {
  id: string;
  content: Map<string, any>;
  contributors: Map<string, number>;
  version: number;
  lock?: {
    agent_id: string;
    expires_at: Date;
  };
}

export class CollaborationManager extends EventEmitter {
  private config: CollaborationConfig;
  private agents: Map<string, BaseAgent>;
  private sessions: Map<string, CollaborationSession>;
  private messageHub: Subject<AgentMessage>;
  private blackboards: Map<string, Blackboard>;
  private negotiationStates: Map<string, NegotiationState>;
  private collaborationMetrics: CollaborationMetrics;

  constructor(config: CollaborationConfig) {
    super();
    this.config = config;
    this.agents = new Map();
    this.sessions = new Map();
    this.messageHub = new Subject();
    this.blackboards = new Map();
    this.negotiationStates = new Map();
    this.collaborationMetrics = this.initializeMetrics();

    this.setupMessageRouting();
  }

  public registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.config.id, agent);
    
    // Subscribe agent to message hub based on protocol
    if (this.config.communication_protocol === 'pub_sub') {
      this.subscribeAgentToHub(agent);
    }
    
    this.emit('agent:registered', agent.config.id);
  }

  public unregisterAgent(agentId: string): void {
    // Clean up agent from active sessions
    for (const session of this.sessions.values()) {
      session.participants.delete(agentId);
      
      if (session.participants.size === 0) {
        session.status = 'cancelled';
      }
    }
    
    this.agents.delete(agentId);
    this.emit('agent:unregistered', agentId);
  }

  public async initiateCollaboration(
    task: Task,
    participants: string[],
    mode?: CollaborationMode
  ): Promise<CollaborationSession> {
    const sessionId = this.generateSessionId();
    
    const session: CollaborationSession = {
      id: sessionId,
      participants: new Set(participants),
      mode: mode || this.config.mode,
      task,
      status: 'active',
      created_at: new Date(),
      messages: [],
      decisions: []
    };
    
    this.sessions.set(sessionId, session);
    
    // Initialize collaboration based on mode
    switch (session.mode) {
      case 'hierarchical':
        await this.initiateHierarchicalCollaboration(session);
        break;
      
      case 'peer_to_peer':
        await this.initiatePeerToPeerCollaboration(session);
        break;
      
      case 'swarm':
        await this.initiateSwarmCollaboration(session);
        break;
      
      case 'pipeline':
        await this.initiatePipelineCollaboration(session);
        break;
      
      case 'competitive':
        await this.initiateCompetitiveCollaboration(session);
        break;
      
      case 'cooperative':
        await this.initiateCooperativeCollaboration(session);
        break;
    }
    
    this.emit('collaboration:started', {
      session_id: sessionId,
      participants: Array.from(participants),
      mode: session.mode
    });
    
    return session;
  }

  private async initiateHierarchicalCollaboration(
    session: CollaborationSession
  ): Promise<void> {
    // Identify coordinator (highest seniority or best performance)
    const coordinator = this.selectCoordinator(session.participants);
    
    // Send task to coordinator
    await this.sendMessage({
      id: this.generateMessageId(),
      from: 'system',
      to: coordinator,
      type: 'task_assignment',
      content: {
        task: session.task,
        role: 'coordinator',
        subordinates: Array.from(session.participants).filter(p => p !== coordinator)
      },
      timestamp: new Date(),
      session_id: session.id
    });
    
    // Notify subordinates
    for (const participant of session.participants) {
      if (participant !== coordinator) {
        await this.sendMessage({
          id: this.generateMessageId(),
          from: 'system',
          to: participant,
          type: 'collaboration_request',
          content: {
            task: session.task,
            role: 'subordinate',
            coordinator
          },
          timestamp: new Date(),
          session_id: session.id
        });
      }
    }
  }

  private async initiatePeerToPeerCollaboration(
    session: CollaborationSession
  ): Promise<void> {
    // Broadcast task to all participants
    for (const participant of session.participants) {
      await this.sendMessage({
        id: this.generateMessageId(),
        from: 'system',
        to: participant,
        type: 'collaboration_request',
        content: {
          task: session.task,
          role: 'peer',
          peers: Array.from(session.participants).filter(p => p !== participant)
        },
        timestamp: new Date(),
        session_id: session.id
      });
    }
    
    // Initialize consensus mechanism if voting enabled
    if (this.config.enable_voting) {
      this.initializeVoting(session);
    }
  }

  private async initiateSwarmCollaboration(
    session: CollaborationSession
  ): Promise<void> {
    // Create shared blackboard for swarm intelligence
    const blackboardId = `blackboard_${session.id}`;
    this.blackboards.set(blackboardId, {
      id: blackboardId,
      content: new Map([['task', session.task]]),
      contributors: new Map(),
      version: 0
    });
    
    // Notify all agents about the blackboard
    for (const participant of session.participants) {
      await this.sendMessage({
        id: this.generateMessageId(),
        from: 'system',
        to: participant,
        type: 'collaboration_request',
        content: {
          task: session.task,
          role: 'swarm_member',
          blackboard_id: blackboardId,
          swarm_size: session.participants.size
        },
        timestamp: new Date(),
        session_id: session.id
      });
    }
  }

  private async initiatePipelineCollaboration(
    session: CollaborationSession
  ): Promise<void> {
    // Arrange participants in pipeline order
    const pipeline = this.arrangePipeline(session.participants);
    
    // Notify each agent of their position in the pipeline
    for (let i = 0; i < pipeline.length; i++) {
      const participant = pipeline[i];
      const prev = i > 0 ? pipeline[i - 1] : null;
      const next = i < pipeline.length - 1 ? pipeline[i + 1] : null;
      
      await this.sendMessage({
        id: this.generateMessageId(),
        from: 'system',
        to: participant,
        type: 'collaboration_request',
        content: {
          task: session.task,
          role: 'pipeline_stage',
          stage: i + 1,
          total_stages: pipeline.length,
          previous_stage: prev,
          next_stage: next
        },
        timestamp: new Date(),
        session_id: session.id
      });
    }
  }

  private async initiateCompetitiveCollaboration(
    session: CollaborationSession
  ): Promise<void> {
    // Each agent works independently, best solution wins
    for (const participant of session.participants) {
      await this.sendMessage({
        id: this.generateMessageId(),
        from: 'system',
        to: participant,
        type: 'collaboration_request',
        content: {
          task: session.task,
          role: 'competitor',
          competition_id: session.id,
          deadline: new Date(Date.now() + this.config.message_timeout_ms)
        },
        timestamp: new Date(),
        session_id: session.id
      });
    }
    
    // Set up evaluation timer
    setTimeout(() => {
      this.evaluateCompetitiveResults(session);
    }, this.config.message_timeout_ms);
  }

  private async initiateCooperativeCollaboration(
    session: CollaborationSession
  ): Promise<void> {
    // Agents work together with shared goals
    const sharedGoal = this.defineSharedGoal(session.task);
    
    for (const participant of session.participants) {
      await this.sendMessage({
        id: this.generateMessageId(),
        from: 'system',
        to: participant,
        type: 'collaboration_request',
        content: {
          task: session.task,
          role: 'cooperator',
          shared_goal: sharedGoal,
          partners: Array.from(session.participants).filter(p => p !== participant)
        },
        timestamp: new Date(),
        session_id: session.id
      });
    }
    
    // Enable negotiation if configured
    if (this.config.enable_negotiation) {
      this.initializeNegotiation(session);
    }
  }

  public async sendMessage(message: AgentMessage): Promise<void> {
    // Store message in session
    const session = this.sessions.get(message.session_id || '');
    if (session) {
      session.messages.push(message);
    }
    
    // Route message based on protocol
    switch (this.config.communication_protocol) {
      case 'direct':
        await this.sendDirectMessage(message);
        break;
      
      case 'broadcast':
        await this.broadcastMessage(message);
        break;
      
      case 'pub_sub':
        this.publishMessage(message);
        break;
      
      case 'blackboard':
        await this.postToBlackboard(message);
        break;
    }
    
    this.collaborationMetrics.total_messages++;
    
    this.emit('message:sent', message);
  }

  private async sendDirectMessage(message: AgentMessage): Promise<void> {
    const recipient = this.agents.get(message.to);
    if (!recipient) {
      throw new Error(`Agent ${message.to} not found`);
    }
    
    // Direct agent-to-agent communication
    await recipient.receiveMessage(message);
  }

  private async broadcastMessage(message: AgentMessage): Promise<void> {
    const session = this.sessions.get(message.session_id || '');
    if (!session) return;
    
    // Broadcast to all session participants except sender
    for (const participantId of session.participants) {
      if (participantId !== message.from) {
        const participant = this.agents.get(participantId);
        if (participant) {
          await participant.receiveMessage(message);
        }
      }
    }
  }

  private publishMessage(message: AgentMessage): void {
    // Publish to message hub for subscribers
    this.messageHub.next(message);
  }

  private async postToBlackboard(message: AgentMessage): Promise<void> {
    const session = this.sessions.get(message.session_id || '');
    if (!session) return;
    
    const blackboardId = `blackboard_${session.id}`;
    const blackboard = this.blackboards.get(blackboardId);
    if (!blackboard) return;
    
    // Check for lock
    if (blackboard.lock && 
        blackboard.lock.agent_id !== message.from &&
        blackboard.lock.expires_at > new Date()) {
      throw new Error('Blackboard is locked');
    }
    
    // Update blackboard content
    blackboard.content.set(`${message.from}_${Date.now()}`, message.content);
    blackboard.contributors.set(
      message.from,
      (blackboard.contributors.get(message.from) || 0) + 1
    );
    blackboard.version++;
    
    // Notify all participants of update
    for (const participantId of session.participants) {
      if (participantId !== message.from) {
        const participant = this.agents.get(participantId);
        if (participant) {
          await participant.receiveMessage({
            ...message,
            type: 'status_update',
            content: {
              blackboard_updated: true,
              version: blackboard.version
            }
          });
        }
      }
    }
  }

  private subscribeAgentToHub(agent: BaseAgent): void {
    // Create filtered observable for this agent
    const agentMessages$ = this.messageHub.pipe(
      filter(msg => 
        msg.to === agent.config.id || 
        msg.to === 'all' ||
        (msg.session_id && this.sessions.get(msg.session_id)?.participants.has(agent.config.id))
      )
    );
    
    // Subscribe agent to receive relevant messages
    agentMessages$.subscribe(async (message) => {
      await agent.receiveMessage(message);
    });
  }

  public async requestConsensus(
    sessionId: string,
    proposal: any
  ): Promise<Decision> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const decisionId = this.generateDecisionId();
    const votes = new Map<string, Vote>();
    
    // Request votes from all participants
    const votePromises = Array.from(session.participants).map(async (participantId) => {
      const agent = this.agents.get(participantId);
      if (!agent) return;
      
      const voteMessage: AgentMessage = {
        id: this.generateMessageId(),
        from: 'system',
        to: participantId,
        type: 'information_request',
        content: {
          request_type: 'vote',
          proposal,
          decision_id: decisionId
        },
        timestamp: new Date(),
        session_id: sessionId
      };
      
      await this.sendMessage(voteMessage);
    });
    
    await Promise.all(votePromises);
    
    // Wait for votes with timeout
    await this.waitForVotes(votes, session.participants.size, this.config.message_timeout_ms);
    
    // Calculate consensus
    const consensus = this.calculateConsensus(votes);
    
    const decision: Decision = {
      id: decisionId,
      type: 'consensus',
      participants: Array.from(session.participants),
      proposal,
      votes,
      outcome: consensus,
      timestamp: new Date()
    };
    
    session.decisions.push(decision);
    
    this.emit('decision:made', decision);
    
    return decision;
  }

  public async negotiate(
    sessionId: string,
    initialProposal: any
  ): Promise<Proposal | null> {
    const session = this.sessions.get(sessionId);
    if (!session || !this.config.enable_negotiation) {
      return null;
    }
    
    const negotiationState: NegotiationState = {
      session_id: sessionId,
      round: 0,
      proposals: new Map(),
      current_best: null,
      consensus_reached: false
    };
    
    this.negotiationStates.set(sessionId, negotiationState);
    
    // Start negotiation rounds
    while (negotiationState.round < this.config.max_collaboration_depth && 
           !negotiationState.consensus_reached) {
      negotiationState.round++;
      
      // Collect proposals from all participants
      await this.collectProposals(session, negotiationState);
      
      // Evaluate proposals
      this.evaluateProposals(negotiationState);
      
      // Check for consensus
      if (this.checkNegotiationConsensus(negotiationState)) {
        negotiationState.consensus_reached = true;
        break;
      }
      
      // Share current best with all participants for next round
      await this.shareNegotiationState(session, negotiationState);
    }
    
    return negotiationState.current_best;
  }

  private async collectProposals(
    session: CollaborationSession,
    state: NegotiationState
  ): Promise<void> {
    const proposalPromises = Array.from(session.participants).map(async (participantId) => {
      const agent = this.agents.get(participantId);
      if (!agent) return;
      
      const requestMessage: AgentMessage = {
        id: this.generateMessageId(),
        from: 'system',
        to: participantId,
        type: 'information_request',
        content: {
          request_type: 'proposal',
          round: state.round,
          current_best: state.current_best
        },
        timestamp: new Date(),
        session_id: session.id
      };
      
      await this.sendMessage(requestMessage);
      
      // In a real implementation, we'd wait for and collect the response
      // For now, we'll simulate a proposal
      const proposal: Proposal = {
        id: this.generateProposalId(),
        agent_id: participantId,
        content: { /* proposal content */ },
        score: Math.random(),
        supporters: new Set([participantId]),
        objections: new Map()
      };
      
      state.proposals.set(proposal.id, proposal);
    });
    
    await Promise.all(proposalPromises);
  }

  private evaluateProposals(state: NegotiationState): void {
    let bestScore = 0;
    let bestProposal: Proposal | null = null;
    
    for (const proposal of state.proposals.values()) {
      // Calculate weighted score based on supporters and objections
      const supportWeight = proposal.supporters.size;
      const objectionWeight = proposal.objections.size;
      
      const weightedScore = proposal.score * 
        (supportWeight / (supportWeight + objectionWeight + 1));
      
      if (weightedScore > bestScore) {
        bestScore = weightedScore;
        bestProposal = proposal;
      }
    }
    
    state.current_best = bestProposal;
  }

  private checkNegotiationConsensus(state: NegotiationState): boolean {
    if (!state.current_best) return false;
    
    const totalParticipants = this.sessions.get(state.session_id)?.participants.size || 0;
    const supportRatio = state.current_best.supporters.size / totalParticipants;
    
    return supportRatio >= this.config.consensus_threshold;
  }

  private async shareNegotiationState(
    session: CollaborationSession,
    state: NegotiationState
  ): Promise<void> {
    for (const participantId of session.participants) {
      const agent = this.agents.get(participantId);
      if (!agent) continue;
      
      await this.sendMessage({
        id: this.generateMessageId(),
        from: 'system',
        to: participantId,
        type: 'status_update',
        content: {
          negotiation_round: state.round,
          current_best: state.current_best,
          consensus_reached: state.consensus_reached
        },
        timestamp: new Date(),
        session_id: session.id
      });
    }
  }

  public resolveConflict(
    sessionId: string,
    conflictingProposals: any[]
  ): any {
    const strategy = this.config.conflict_resolution_strategy;
    
    switch (strategy) {
      case 'voting':
        return this.resolveByVoting(sessionId, conflictingProposals);
      
      case 'seniority':
        return this.resolveBySeniority(sessionId, conflictingProposals);
      
      case 'performance':
        return this.resolveByPerformance(sessionId, conflictingProposals);
      
      case 'random':
      default:
        return conflictingProposals[Math.floor(Math.random() * conflictingProposals.length)];
    }
  }

  private async resolveByVoting(
    sessionId: string,
    proposals: any[]
  ): Promise<any> {
    // Simplified voting resolution
    const decision = await this.requestConsensus(sessionId, {
      type: 'conflict_resolution',
      options: proposals
    });
    
    return decision.outcome;
  }

  private resolveBySeniority(sessionId: string, proposals: any[]): any {
    // Select proposal from most senior agent
    // In a real implementation, we'd track agent seniority
    return proposals[0];
  }

  private resolveByPerformance(sessionId: string, proposals: any[]): any {
    // Select proposal from best-performing agent
    // In a real implementation, we'd track agent performance metrics
    return proposals[0];
  }

  public completeCollaboration(
    sessionId: string,
    result: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.status = 'completed';
    session.result = result;
    
    // Update metrics
    this.collaborationMetrics.completed_collaborations++;
    
    const duration = Date.now() - session.created_at.getTime();
    this.collaborationMetrics.average_collaboration_time = 
      (this.collaborationMetrics.average_collaboration_time * 
       (this.collaborationMetrics.completed_collaborations - 1) + 
       duration) / 
      this.collaborationMetrics.completed_collaborations;
    
    this.emit('collaboration:completed', {
      session_id: sessionId,
      result,
      duration
    });
  }

  private selectCoordinator(participants: Set<string>): string {
    // Select coordinator based on agent capabilities and performance
    // For now, return first participant
    return Array.from(participants)[0];
  }

  private arrangePipeline(participants: Set<string>): string[] {
    // Arrange agents in optimal pipeline order based on capabilities
    // For now, return participants in order
    return Array.from(participants);
  }

  private defineSharedGoal(task: Task): any {
    // Define shared goal based on task
    return {
      objective: task.type,
      success_criteria: task.metadata?.success_criteria || {},
      constraints: task.metadata?.constraints || {}
    };
  }

  private async evaluateCompetitiveResults(session: CollaborationSession): Promise<void> {
    // Evaluate and select best competitive result
    // In a real implementation, we'd collect and compare results
    
    const winner = Array.from(session.participants)[0]; // Simplified
    
    this.completeCollaboration(session.id, {
      winner,
      strategy: 'competitive'
    });
  }

  private initializeVoting(session: CollaborationSession): void {
    // Set up voting mechanism for session
    // Implementation would track voting state
  }

  private initializeNegotiation(session: CollaborationSession): void {
    // Set up negotiation mechanism for session
    // Implementation would track negotiation state
  }

  private async waitForVotes(
    votes: Map<string, Vote>,
    expectedCount: number,
    timeout: number
  ): Promise<void> {
    // In a real implementation, we'd wait for actual vote messages
    // For now, simulate votes
    for (let i = 0; i < expectedCount; i++) {
      votes.set(`agent_${i}`, {
        agent_id: `agent_${i}`,
        choice: Math.random() > 0.5 ? 'approve' : 'reject',
        confidence: Math.random()
      });
    }
  }

  private calculateConsensus(votes: Map<string, Vote>): any {
    let approvals = 0;
    let rejections = 0;
    let totalConfidence = 0;
    
    for (const vote of votes.values()) {
      if (vote.choice === 'approve') {
        approvals++;
        totalConfidence += vote.confidence;
      } else if (vote.choice === 'reject') {
        rejections++;
      }
    }
    
    const consensusReached = approvals / votes.size >= this.config.consensus_threshold;
    
    return {
      consensus: consensusReached,
      approval_rate: approvals / votes.size,
      average_confidence: totalConfidence / approvals
    };
  }

  private setupMessageRouting(): void {
    // Set up message routing infrastructure
    this.messageHub.subscribe((message) => {
      this.collaborationMetrics.total_messages++;
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDecisionId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProposalId(): string {
    return `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(): CollaborationMetrics {
    return {
      total_messages: 0,
      total_collaborations: 0,
      completed_collaborations: 0,
      failed_collaborations: 0,
      average_collaboration_time: 0,
      consensus_success_rate: 0,
      message_latency_ms: 0
    };
  }

  public getMetrics(): CollaborationMetrics {
    return { ...this.collaborationMetrics };
  }

  public getSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  public getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }
}

interface CollaborationMetrics {
  total_messages: number;
  total_collaborations: number;
  completed_collaborations: number;
  failed_collaborations: number;
  average_collaboration_time: number;
  consensus_success_rate: number;
  message_latency_ms: number;
}