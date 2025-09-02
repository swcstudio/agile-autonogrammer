/**
 * Quantum Kanban Board Component
 * Visualizes tasks in quantum superposition using React Flow
 */

import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { QuantumTask, QuantumState, AgentConnection } from '../types';
import { SuperpositionTaskManager } from '../SuperpositionManager';
import QuantumTaskNode from './QuantumTaskNode';
import EntanglementEdge from './EntanglementEdge';
import QuantumControlPanel from './QuantumControlPanel';
import './quantum-kanban.css';

// Custom node types
const nodeTypes: NodeTypes = {
  quantumTask: QuantumTaskNode,
};

// Custom edge types
const edgeTypes: EdgeTypes = {
  entanglement: EntanglementEdge,
};

interface QuantumKanbanBoardProps {
  initialTasks?: QuantumTask[];
  onTaskCollapse?: (taskId: string, result: any) => void;
  enableQuantumFeatures?: boolean;
}

const QuantumKanbanBoard: React.FC<QuantumKanbanBoardProps> = ({
  initialTasks = [],
  onTaskCollapse,
  enableQuantumFeatures = true,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [quantumManager] = useState(() => new SuperpositionTaskManager());
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [coherence, setCoherence] = useState(1.0);
  const [showSuperposition, setShowSuperposition] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  // Initialize quantum tasks
  useEffect(() => {
    const initializeTasks = async () => {
      const quantumNodes: Node[] = [];
      const entanglementEdges: Edge[] = [];

      for (const task of initialTasks) {
        // Create quantum task in manager
        const quantumTask = await quantumManager.createQuantumTask(
          task.title,
          task.description,
          task.states.map(s => s.basisStates[0])
        );

        // Create node for visualization
        const node: Node = {
          id: quantumTask.id,
          type: 'quantumTask',
          position: { 
            x: Math.random() * 800, 
            y: Math.random() * 600 
          },
          data: {
            task: quantumTask,
            superposition: quantumTask.states,
            probability: quantumTask.probabilityDistribution,
            entanglements: quantumTask.entangledAgents,
            coherence: coherence,
            showSuperposition,
            animationSpeed,
            onCollapse: handleTaskCollapse,
            onEntangle: handleEntangle,
            onApplyGate: handleApplyGate,
          },
        };

        quantumNodes.push(node);
      }

      setNodes(quantumNodes);
      
      // Start quantum coherence animation
      startCoherenceAnimation();
    };

    initializeTasks();

    return () => {
      quantumManager.dispose();
    };
  }, [initialTasks]);

  // Handle task collapse (measurement)
  const handleTaskCollapse = useCallback(async (taskId: string) => {
    const results = await quantumManager.executeInSuperposition([taskId]);
    const result = results[0];

    // Update node to show collapsed state
    setNodes(nodes => nodes.map(node => {
      if (node.id === taskId) {
        return {
          ...node,
          data: {
            ...node.data,
            collapsed: true,
            result: result.finalState,
            probability: result.probability,
          },
        };
      }
      return node;
    }));

    // Callback to parent
    if (onTaskCollapse) {
      onTaskCollapse(taskId, result);
    }
  }, [quantumManager, onTaskCollapse]);

  // Handle task entanglement
  const handleEntangle = useCallback((task1: string, task2: string) => {
    // Create entanglement edge
    const entanglementEdge: Edge = {
      id: `entangle_${task1}_${task2}`,
      source: task1,
      target: task2,
      type: 'entanglement',
      animated: true,
      style: {
        stroke: '#9333ea',
        strokeWidth: 2,
      },
      data: {
        strength: Math.random(),
        bellState: 'Φ+',
      },
    };

    setEdges(edges => [...edges, entanglementEdge]);

    // Update nodes to show entanglement
    setNodes(nodes => nodes.map(node => {
      if (node.id === task1 || node.id === task2) {
        const otherTask = node.id === task1 ? task2 : task1;
        return {
          ...node,
          data: {
            ...node.data,
            entanglements: [...(node.data.entanglements || []), otherTask],
          },
        };
      }
      return node;
    }));
  }, []);

  // Apply quantum gate to task
  const handleApplyGate = useCallback(async (taskId: string, gate: 'H' | 'X' | 'Y' | 'Z') => {
    await quantumManager.applyQuantumGate(taskId, gate);
    
    // Trigger visual update
    setNodes(nodes => nodes.map(node => {
      if (node.id === taskId) {
        return {
          ...node,
          data: {
            ...node.data,
            lastGate: gate,
            updateTrigger: Date.now(),
          },
        };
      }
      return node;
    }));
  }, [quantumManager]);

  // Animate coherence decay
  const startCoherenceAnimation = useCallback(() => {
    const interval = setInterval(() => {
      setCoherence(c => {
        const newCoherence = c * 0.99;
        if (newCoherence < 0.1) {
          clearInterval(interval);
          return 0.1;
        }
        return newCoherence;
      });
    }, 1000 / animationSpeed);

    return () => clearInterval(interval);
  }, [animationSpeed]);

  // Handle new edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        handleEntangle(connection.source, connection.target);
      }
    },
    [handleEntangle]
  );

  // Update nodes with coherence changes
  useEffect(() => {
    setNodes(nodes => nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        coherence,
      },
    })));
  }, [coherence, setNodes]);

  // Get quantum metrics
  const metrics = quantumManager.getQuantumMetrics();

  return (
    <div className="quantum-kanban-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="quantum-flow"
      >
        <Background 
          color="#4b5563" 
          gap={16} 
          className="quantum-background"
        />
        <Controls />
        <MiniMap 
          nodeColor={node => {
            if (node.data?.collapsed) return '#10b981';
            return '#8b5cf6';
          }}
        />
        
        {enableQuantumFeatures && (
          <Panel position="top-left">
            <QuantumControlPanel
              coherence={coherence}
              showSuperposition={showSuperposition}
              animationSpeed={animationSpeed}
              metrics={metrics}
              onCoherenceChange={setCoherence}
              onSuperpositionToggle={() => setShowSuperposition(!showSuperposition)}
              onAnimationSpeedChange={setAnimationSpeed}
              onMeasureAll={() => {
                nodes.forEach(node => {
                  if (!node.data.collapsed) {
                    handleTaskCollapse(node.id);
                  }
                });
              }}
            />
          </Panel>
        )}

        <Panel position="bottom-left" className="quantum-legend">
          <div className="legend-title">Quantum States</div>
          <div className="legend-item">
            <div className="legend-color superposition"></div>
            <span>Superposition</span>
          </div>
          <div className="legend-item">
            <div className="legend-color entangled"></div>
            <span>Entangled</span>
          </div>
          <div className="legend-item">
            <div className="legend-color collapsed"></div>
            <span>Collapsed</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default QuantumKanbanBoard;