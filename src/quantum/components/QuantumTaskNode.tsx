/**
 * Quantum Task Node Component
 * Visualizes a single task in quantum superposition
 */

import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { QuantumTask, QuantumState } from '../types';
import './quantum-task-node.css';

interface QuantumTaskNodeData {
  task: QuantumTask;
  superposition: QuantumState[];
  probability: number[];
  entanglements: string[];
  coherence: number;
  collapsed?: boolean;
  result?: string;
  showSuperposition: boolean;
  animationSpeed: number;
  lastGate?: string;
  updateTrigger?: number;
  onCollapse: (taskId: string) => void;
  onEntangle: (task1: string, task2: string) => void;
  onApplyGate: (taskId: string, gate: 'H' | 'X' | 'Y' | 'Z') => void;
}

const QuantumTaskNode: React.FC<NodeProps<QuantumTaskNodeData>> = memo(({ 
  id, 
  data,
  selected 
}) => {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showStates, setShowStates] = useState(false);
  const [selectedGate, setSelectedGate] = useState<'H' | 'X' | 'Y' | 'Z' | null>(null);

  // Animate superposition states
  useEffect(() => {
    if (!data.collapsed && data.showSuperposition) {
      const interval = setInterval(() => {
        setAnimationPhase(phase => (phase + 1) % data.superposition.length);
      }, 1000 / data.animationSpeed);
      return () => clearInterval(interval);
    }
  }, [data.collapsed, data.showSuperposition, data.animationSpeed, data.superposition.length]);

  // Calculate visual properties based on quantum state
  const getNodeStyle = () => {
    const baseStyle: React.CSSProperties = {
      background: data.collapsed 
        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      border: `2px solid ${data.entanglements.length > 0 ? '#ec4899' : '#6b7280'}`,
      borderRadius: '12px',
      padding: '10px',
      minWidth: '200px',
      minHeight: '120px',
      opacity: data.coherence,
      transition: 'all 0.3s ease',
      boxShadow: selected ? '0 0 20px rgba(139, 92, 246, 0.5)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
    };

    if (data.entanglements.length > 0) {
      baseStyle.animation = 'entangle-pulse 2s infinite';
    }

    return baseStyle;
  };

  // Render superposition states
  const renderSuperpositionStates = () => {
    if (data.collapsed || !data.showSuperposition || !showStates) return null;

    return (
      <div className="superposition-states">
        {data.superposition.map((state, index) => (
          <div 
            key={state.id}
            className={`quantum-state ${index === animationPhase ? 'active' : ''}`}
            style={{ opacity: data.probability[index] }}
          >
            <div className="state-label">{state.basisStates[0]}</div>
            <div className="state-probability">
              {(data.probability[index] * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render quantum gates panel
  const renderQuantumGates = () => {
    if (data.collapsed) return null;

    const gates: Array<'H' | 'X' | 'Y' | 'Z'> = ['H', 'X', 'Y', 'Z'];
    
    return (
      <div className="quantum-gates">
        {gates.map(gate => (
          <button
            key={gate}
            className={`gate-button ${selectedGate === gate ? 'selected' : ''}`}
            onClick={() => {
              setSelectedGate(gate);
              data.onApplyGate(id, gate);
              setTimeout(() => setSelectedGate(null), 500);
            }}
            title={getGateDescription(gate)}
          >
            {gate}
          </button>
        ))}
      </div>
    );
  };

  // Get gate description for tooltip
  const getGateDescription = (gate: string): string => {
    const descriptions: Record<string, string> = {
      H: 'Hadamard - Creates superposition',
      X: 'Pauli-X - Bit flip',
      Y: 'Pauli-Y - Phase and bit flip',
      Z: 'Pauli-Z - Phase flip',
    };
    return descriptions[gate] || '';
  };

  // Render entanglement indicators
  const renderEntanglementIndicators = () => {
    if (data.entanglements.length === 0) return null;

    return (
      <div className="entanglement-indicators">
        {data.entanglements.map((entangled, index) => (
          <div key={index} className="entanglement-dot" title={`Entangled with ${entangled}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="quantum-task-node" style={getNodeStyle()}>
      <Handle type="target" position={Position.Top} className="quantum-handle" />
      
      <div className="task-header">
        <h3 className="task-title">{data.task.title}</h3>
        {renderEntanglementIndicators()}
      </div>

      {data.collapsed ? (
        <div className="collapsed-result">
          <div className="result-label">Collapsed to:</div>
          <div className="result-value">{data.result}</div>
          <div className="result-probability">
            Probability: {(data.probability[0] * 100).toFixed(1)}%
          </div>
        </div>
      ) : (
        <>
          <div className="task-description">{data.task.description}</div>
          
          <div className="quantum-info">
            <div className="coherence-bar">
              <div className="coherence-label">Coherence</div>
              <div className="coherence-track">
                <div 
                  className="coherence-fill" 
                  style={{ width: `${data.coherence * 100}%` }}
                />
              </div>
            </div>

            <button 
              className="show-states-button"
              onClick={() => setShowStates(!showStates)}
            >
              {showStates ? 'Hide' : 'Show'} States
            </button>
          </div>

          {renderSuperpositionStates()}
          {renderQuantumGates()}

          {data.lastGate && (
            <div className="gate-applied">
              Applied: {data.lastGate} gate
            </div>
          )}

          <div className="task-actions">
            <button 
              className="measure-button"
              onClick={() => data.onCollapse(id)}
            >
              Measure 📊
            </button>
          </div>
        </>
      )}

      <Handle type="source" position={Position.Bottom} className="quantum-handle" />
    </div>
  );
});

QuantumTaskNode.displayName = 'QuantumTaskNode';

export default QuantumTaskNode;