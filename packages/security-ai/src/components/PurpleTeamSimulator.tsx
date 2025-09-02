/**
 * Purple Team Simulator Component
 * 
 * Advanced attack simulation and defense validation for Purple Team operations
 * Combines automated attack vectors with real-time defense analysis
 */

import { useKatalyst } from '@katalyst/hooks';
import { usePurpleTeam } from '../hooks/usePurpleTeam';
import { useSecurityStore } from '../stores/securityStore';
import type { AttackTarget, AttackVector, AttackSimulationResult, AttackResult } from '../types';

interface PurpleTeamSimulatorProps {
  initialTarget?: AttackTarget;
  autoStart?: boolean;
  realTimeMode?: boolean;
  onSimulationComplete?: (result: AttackSimulationResult) => void;
  theme?: 'dark' | 'light';
}

export function PurpleTeamSimulator({
  initialTarget,
  autoStart = false,
  realTimeMode = false,
  onSimulationComplete,
  theme = 'dark'
}: PurpleTeamSimulatorProps) {
  const k = useKatalyst();
  const { addAttackSimulation } = useSecurityStore();
  
  // State management
  const [target, setTarget] = k.state<AttackTarget>(initialTarget || {
    type: 'api',
    endpoint: '',
    environment: 'testing'
  });
  const [selectedVectors, setSelectedVectors] = k.state<string[]>([]);
  const [simulationConfig, setSimulationConfig] = k.state({
    automated: true,
    realTime: realTimeMode,
    includeDefenseAnalysis: true,
    maxDuration: 300, // 5 minutes
    concurrentAttacks: 5
  });
  
  const {
    simulate,
    simulating,
    result,
    error,
    generateAttackVectors,
    generatingVectors,
    availableVectors,
    simulationProgress,
    stopSimulation
  } = usePurpleTeam();
  
  // Auto-generate attack vectors when target changes
  k.effect(() => {
    if (target.endpoint || target.type) {
      generateVectors();
    }
  }, [target]);
  
  // Auto-start simulation if enabled
  k.effect(() => {
    if (autoStart && availableVectors.length > 0 && !simulating) {
      handleStartSimulation();
    }
  }, [autoStart, availableVectors]);
  
  // Notify on completion
  k.effect(() => {
    if (result && onSimulationComplete) {
      onSimulationComplete(result);
    }
  }, [result]);
  
  const generateVectors = async () => {
    await generateAttackVectors(target);
  };
  
  const handleStartSimulation = async () => {
    if (!target.endpoint && target.type !== 'application') {
      return;
    }
    
    const vectorsToUse = selectedVectors.length > 0 
      ? availableVectors.filter(v => selectedVectors.includes(v.id))
      : availableVectors;
    
    try {
      const simulationResult = await simulate(target, vectorsToUse, simulationConfig);
      addAttackSimulation(simulationResult);
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  };
  
  const toggleVectorSelection = (vectorId: string) => {
    setSelectedVectors(prev => 
      prev.includes(vectorId)
        ? prev.filter(id => id !== vectorId)
        : [...prev, vectorId]
    );
  };
  
  const selectAllVectors = () => {
    setSelectedVectors(availableVectors.map(v => v.id));
  };
  
  const clearVectorSelection = () => {
    setSelectedVectors([]);
  };
  
  const getSeverityColor = (severity: string) => {
    const colors = {
      Critical: 'text-red-600 bg-red-100 border-red-300',
      High: 'text-orange-600 bg-orange-100 border-orange-300',
      Medium: 'text-yellow-600 bg-yellow-100 border-yellow-300',
      Low: 'text-blue-600 bg-blue-100 border-blue-300'
    };
    return colors[severity] || 'text-gray-600 bg-gray-100 border-gray-300';
  };
  
  return (
    <div className={`purple-team-simulator ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-xl p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Purple Team Simulator</h2>
            <p className="text-sm opacity-70">Attack simulation and defense validation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-purple-500 text-white rounded">Purple Team</span>
          <span className="text-xs px-2 py-1 bg-red-500 text-white rounded">Attack Sim</span>
          <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded">Defense Analysis</span>
        </div>
      </div>
      
      {/* Target Configuration */}
      <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <h3 className="text-lg font-semibold mb-4">Attack Target Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Type</label>
            <select
              value={target.type}
              onChange={(e) => setTarget(prev => ({ ...prev, type: e.target.value as any }))}
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="api">API Endpoint</option>
              <option value="web">Web Application</option>
              <option value="network">Network Service</option>
              <option value="application">Application</option>
              <option value="infrastructure">Infrastructure</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Environment</label>
            <select
              value={target.environment}
              onChange={(e) => setTarget(prev => ({ ...prev, environment: e.target.value as any }))}
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="development">Development</option>
              <option value="testing">Testing</option>
              <option value="staging">Staging</option>
              <option value="production">Production (Caution)</option>
            </select>
          </div>
          
          {target.type !== 'application' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Target Endpoint/URL</label>
              <input
                type="text"
                value={target.endpoint || ''}
                onChange={(e) => setTarget(prev => ({ ...prev, endpoint: e.target.value }))}
                placeholder="https://api.example.com or 192.168.1.1:80"
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Simulation Configuration */}
      <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <h3 className="text-lg font-semibold mb-4">Simulation Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="automated"
              checked={simulationConfig.automated}
              onChange={(e) => setSimulationConfig(prev => ({ ...prev, automated: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="automated" className="text-sm">Automated Execution</label>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="realTime"
              checked={simulationConfig.realTime}
              onChange={(e) => setSimulationConfig(prev => ({ ...prev, realTime: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="realTime" className="text-sm">Real-time Analysis</label>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="defenseAnalysis"
              checked={simulationConfig.includeDefenseAnalysis}
              onChange={(e) => setSimulationConfig(prev => ({ ...prev, includeDefenseAnalysis: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="defenseAnalysis" className="text-sm">Defense Analysis</label>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Max Duration (seconds)</label>
            <input
              type="number"
              value={simulationConfig.maxDuration}
              onChange={(e) => setSimulationConfig(prev => ({ ...prev, maxDuration: parseInt(e.target.value) }))}
              min="30"
              max="3600"
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Concurrent Attacks</label>
            <input
              type="number"
              value={simulationConfig.concurrentAttacks}
              onChange={(e) => setSimulationConfig(prev => ({ ...prev, concurrentAttacks: parseInt(e.target.value) }))}
              min="1"
              max="20"
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
      </div>
      
      {/* Attack Vectors */}
      <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Attack Vectors</h3>
          <div className="flex gap-2">
            <button
              onClick={generateVectors}
              disabled={generatingVectors}
              className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              {generatingVectors ? 'Generating...' : 'Generate Vectors'}
            </button>
            <button
              onClick={selectAllVectors}
              disabled={availableVectors.length === 0}
              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Select All
            </button>
            <button
              onClick={clearVectorSelection}
              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        
        {generatingVectors && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Generating AI-powered attack vectors...</span>
            </div>
          </div>
        )}
        
        {availableVectors.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availableVectors.map((vector) => (
              <AttackVectorCard
                key={vector.id}
                vector={vector}
                selected={selectedVectors.includes(vector.id)}
                onToggle={() => toggleVectorSelection(vector.id)}
                theme={theme}
              />
            ))}
          </div>
        )}
        
        {!generatingVectors && availableVectors.length === 0 && (
          <div className="text-center py-4 opacity-70">
            <p>No attack vectors available. Configure a target and click "Generate Vectors".</p>
          </div>
        )}
      </div>
      
      {/* Simulation Controls */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleStartSimulation}
          disabled={simulating || availableVectors.length === 0}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
            simulating || availableVectors.length === 0
              ? 'bg-gray-500 cursor-not-allowed opacity-50'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {simulating ? 'Simulation Running...' : 'Start Attack Simulation'}
        </button>
        
        {simulating && (
          <button
            onClick={stopSimulation}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Stop
          </button>
        )}
      </div>
      
      {/* Simulation Progress */}
      {simulating && simulationProgress && (
        <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h4 className="font-semibold mb-2">Simulation Progress</h4>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${simulationProgress.percentage}%` }}
            ></div>
          </div>
          <div className="text-sm opacity-70">
            {simulationProgress.current} / {simulationProgress.total} vectors executed
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Simulation Error:</span>
          </div>
          <p className="mt-2">{error}</p>
        </div>
      )}
      
      {/* Simulation Results */}
      {result && (
        <SimulationResults result={result} theme={theme} />
      )}
    </div>
  );
}

// Attack Vector Card Component
function AttackVectorCard({ 
  vector, 
  selected, 
  onToggle, 
  theme 
}: { 
  vector: AttackVector; 
  selected: boolean; 
  onToggle: () => void; 
  theme: 'dark' | 'light';
}) {
  const k = useKatalyst();
  const [isExpanded, setIsExpanded] = k.state(false);
  
  const getSeverityColor = (severity: string) => {
    const colors = {
      Critical: 'border-red-500 bg-red-500/10',
      High: 'border-orange-500 bg-orange-500/10',
      Medium: 'border-yellow-500 bg-yellow-500/10',
      Low: 'border-blue-500 bg-blue-500/10'
    };
    return colors[severity] || 'border-gray-500 bg-gray-500/10';
  };
  
  return (
    <div 
      className={`p-3 rounded-lg border transition-all ${
        selected ? 'border-purple-500 bg-purple-500/10' : getSeverityColor(vector.severity)
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="rounded"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{vector.type}</span>
              <span className={`px-2 py-1 text-xs rounded ${
                vector.severity === 'Critical' ? 'bg-red-600 text-white' :
                vector.severity === 'High' ? 'bg-orange-600 text-white' :
                vector.severity === 'Medium' ? 'bg-yellow-600 text-white' :
                'bg-blue-600 text-white'
              }`}>
                {vector.severity}
              </span>
              {vector.mitreId && (
                <span className="text-xs opacity-70">MITRE: {vector.mitreId}</span>
              )}
            </div>
            <p className="text-sm opacity-80">{vector.technique}</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-600 rounded"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">Payload Preview:</span>
              <pre className={`mt-1 p-2 rounded text-xs overflow-x-auto ${
                theme === 'dark' ? 'bg-gray-900' : 'bg-gray-200'
              }`}>
                {vector.payload.substring(0, 200)}{vector.payload.length > 200 ? '...' : ''}
              </pre>
            </div>
            <div>
              <span className="font-medium">Automated:</span> {vector.automated ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simulation Results Component
function SimulationResults({ 
  result, 
  theme 
}: { 
  result: AttackSimulationResult; 
  theme: 'dark' | 'light';
}) {
  const k = useKatalyst();
  const [activeTab, setActiveTab] = k.state<'summary' | 'attacks' | 'defense' | 'recommendations'>('summary');
  
  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <h3 className="text-lg font-semibold mb-4">Simulation Results</h3>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'attacks', label: 'Attack Results' },
          { id: 'defense', label: 'Defense Analysis' },
          { id: 'recommendations', label: 'Recommendations' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : theme === 'dark'
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {result.metrics.totalVectors}
              </div>
              <div className="text-sm opacity-70">Total Vectors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {result.metrics.successfulVectors}
              </div>
              <div className="text-sm opacity-70">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {result.metrics.detectedVectors}
              </div>
              <div className="text-sm opacity-70">Detected</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {result.metrics.riskScore}
              </div>
              <div className="text-sm opacity-70">Risk Score</div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm opacity-70">Duration</span>
                <div className="text-lg font-semibold">
                  {Math.round(result.metrics.totalDuration / 1000)}s
                </div>
              </div>
              <div>
                <span className="text-sm opacity-70">Avg Response Time</span>
                <div className="text-lg font-semibold">
                  {Math.round(result.metrics.averageResponseTime)}ms
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'attacks' && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {result.results.map((attackResult, index) => (
            <AttackResultCard key={index} result={attackResult} theme={theme} />
          ))}
        </div>
      )}
      
      {activeTab === 'defense' && result.defenseAnalysis && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(result.defenseAnalysis.detectionRate * 100)}%
              </div>
              <div className="text-sm opacity-70">Detection Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Math.round(result.defenseAnalysis.preventionRate * 100)}%
              </div>
              <div className="text-sm opacity-70">Prevention Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {Math.round(result.defenseAnalysis.responseTime)}ms
              </div>
              <div className="text-sm opacity-70">Response Time</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-red-400">Weaknesses</h4>
              <ul className="space-y-1">
                {result.defenseAnalysis.weaknesses.map((weakness, index) => (
                  <li key={index} className="text-sm opacity-80">
                    • {weakness.description}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-green-400">Strengths</h4>
              <ul className="space-y-1">
                {result.defenseAnalysis.strengths.map((strength, index) => (
                  <li key={index} className="text-sm opacity-80">
                    • {strength.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'recommendations' && (
        <div className="space-y-2">
          {result.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-2">
              <svg className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm">{rec}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Attack Result Card Component
function AttackResultCard({ 
  result, 
  theme 
}: { 
  result: AttackResult; 
  theme: 'dark' | 'light';
}) {
  return (
    <div className={`p-3 rounded-lg border ${
      result.success 
        ? 'border-red-500 bg-red-500/10' 
        : result.detection 
        ? 'border-yellow-500 bg-yellow-500/10'
        : 'border-green-500 bg-green-500/10'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{result.vector.type}</span>
            <span className={`px-2 py-1 text-xs rounded ${
              result.success 
                ? 'bg-red-600 text-white' 
                : result.detection
                ? 'bg-yellow-600 text-white'
                : 'bg-green-600 text-white'
            }`}>
              {result.success ? 'Success' : result.detection ? 'Detected' : 'Blocked'}
            </span>
          </div>
          <p className="text-sm opacity-80">{result.vector.technique}</p>
        </div>
        <div className="text-sm opacity-70">
          {Math.round(result.responseTime)}ms
        </div>
      </div>
      
      {result.evidence.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs">
            <span className="font-medium">Evidence:</span> {result.evidence.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}