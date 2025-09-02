/**
 * Green Hat Hacking Utilities Component
 * 
 * Provides ethical hacking tools and educational resources for security researchers
 * and developers to understand vulnerabilities and improve defensive measures.
 * 
 * Green Hat hackers focus on learning, education, and defensive security.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSecurityStore } from '../stores/securityStore';
import { useGreenHatUtilities } from '../hooks/useGreenHatUtilities';
import type { 
  SecurityLearningModule,
  VulnerabilityExploit,
  DefensiveTechnique,
  EthicalHackingScenario,
  SecurityChallenge 
} from '../types';

interface GreenHatUtilitiesProps {
  className?: string;
  onScenarioComplete?: (scenario: EthicalHackingScenario, results: any) => void;
  theme?: 'dark' | 'light';
}

export const GreenHatUtilities: React.FC<GreenHatUtilitiesProps> = ({
  className = '',
  onScenarioComplete,
  theme = 'dark'
}) => {
  const [activeTab, setActiveTab] = useState<'learning' | 'scenarios' | 'challenges' | 'tools'>('learning');
  const [selectedModule, setSelectedModule] = useState<SecurityLearningModule | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<SecurityChallenge | null>(null);
  
  const { securityEvents, addSecurityEvent } = useSecurityStore();
  
  const {
    learningModules,
    hackingScenarios,
    securityChallenges,
    defensiveTechniques,
    startLearningModule,
    executeScenario,
    submitChallengeSolution,
    getHintForChallenge,
    isLoading,
    error
  } = useGreenHatUtilities();

  // Learning Modules Section
  const renderLearningModules = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Security Learning Modules
        </h3>
        <select 
          className={`px-3 py-2 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          onChange={(e) => {
            const difficulty = e.target.value as 'beginner' | 'intermediate' | 'advanced';
            // Filter modules by difficulty
          }}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {learningModules.map((module) => (
          <div
            key={module.id}
            className={`p-6 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 hover:border-green-500' 
                : 'bg-white border-gray-200 hover:border-green-500'
            }`}
            onClick={() => setSelectedModule(module)}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {module.title}
              </h4>
              <span className={`px-2 py-1 text-xs rounded-full ${
                module.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                module.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {module.difficulty}
              </span>
            </div>
            
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {module.description}
            </p>
            
            <div className="flex items-center justify-between">
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {module.estimatedTime} • {module.completionRate}% completion rate
              </span>
              <div className="flex space-x-2">
                {module.tags.slice(0, 2).map((tag) => (
                  <span 
                    key={tag}
                    className={`px-2 py-1 text-xs rounded ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedModule && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
          <div className={`max-w-4xl w-full mx-4 p-8 rounded-2xl ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {selectedModule.title}
              </h3>
              <button
                onClick={() => setSelectedModule(null)}
                className={`text-2xl ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Learning Objectives
                </h4>
                <ul className="space-y-2">
                  {selectedModule.objectives.map((objective, index) => (
                    <li key={index} className={`flex items-start ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="text-green-500 mr-2">•</span>
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Course Content
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedModule.content.map((section, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      theme === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <h5 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {section.title}
                      </h5>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {section.type} • {section.duration}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedModule(null)}
                  className={`px-6 py-2 rounded-lg border ${
                    theme === 'dark' 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await startLearningModule(selectedModule.id);
                    addSecurityEvent({
                      type: 'green_hat_learning',
                      message: `Started learning module: ${selectedModule.title}`,
                      timestamp: Date.now(),
                      metadata: { moduleId: selectedModule.id, difficulty: selectedModule.difficulty }
                    });
                    setSelectedModule(null);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Start Learning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Ethical Hacking Scenarios
  const renderHackingScenarios = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Ethical Hacking Scenarios
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hackingScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`p-6 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {scenario.name}
              </h4>
              <span className={`px-3 py-1 text-sm rounded-full ${
                scenario.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                scenario.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {scenario.riskLevel} risk
              </span>
            </div>
            
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {scenario.description}
            </p>
            
            <div className="space-y-3">
              <div>
                <h5 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Target Environment
                </h5>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {scenario.targetEnvironment}
                </p>
              </div>
              
              <div>
                <h5 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Learning Goals
                </h5>
                <div className="flex flex-wrap gap-2 mt-2">
                  {scenario.learningGoals.map((goal) => (
                    <span 
                      key={goal}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={async () => {
                const results = await executeScenario(scenario.id);
                onScenarioComplete?.(scenario, results);
                addSecurityEvent({
                  type: 'green_hat_scenario',
                  message: `Executed ethical hacking scenario: ${scenario.name}`,
                  timestamp: Date.now(),
                  metadata: { scenarioId: scenario.id, riskLevel: scenario.riskLevel }
                });
              }}
              className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Start Scenario
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // Security Challenges
  const renderSecurityChallenges = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Security Challenges
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {securityChallenges.map((challenge) => (
          <div
            key={challenge.id}
            className={`p-6 rounded-xl border transition-all duration-200 ${
              currentChallenge?.id === challenge.id
                ? theme === 'dark' 
                  ? 'bg-gray-700 border-green-500' 
                  : 'bg-green-50 border-green-500'
                : theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {challenge.title}
              </h4>
              <span className={`text-xs px-2 py-1 rounded-full ${
                challenge.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                challenge.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {challenge.difficulty}
              </span>
            </div>
            
            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {challenge.description}
            </p>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Points: {challenge.points}
                </span>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {challenge.attempts} attempts
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {challenge.categories.map((category) => (
                  <span 
                    key={category}
                    className={`text-xs px-2 py-1 rounded ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => setCurrentChallenge(challenge)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {currentChallenge?.id === challenge.id ? 'Continue Challenge' : 'Start Challenge'}
              </button>
              
              {challenge.hints > 0 && (
                <button
                  onClick={async () => {
                    const hint = await getHintForChallenge(challenge.id);
                    // Show hint in a modal or notification
                  }}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark' 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Get Hint ({challenge.hints} available)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Security Tools
  const renderSecurityTools = () => (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Educational Security Tools
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Scanner */}
        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Network Discovery Tool
          </h4>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Learn network reconnaissance techniques in a safe, controlled environment.
          </p>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Target IP range (e.g., 192.168.1.0/24)"
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Start Network Scan (Educational)
            </button>
          </div>
        </div>

        {/* Payload Generator */}
        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Educational Payload Generator
          </h4>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Generate test payloads to understand how vulnerabilities work.
          </p>
          
          <div className="space-y-4">
            <select className={`w-full px-3 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}>
              <option>XSS Payload</option>
              <option>SQL Injection</option>
              <option>Command Injection</option>
              <option>LDAP Injection</option>
            </select>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Generate Educational Payload
            </button>
          </div>
        </div>

        {/* Report Generator */}
        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Vulnerability Report Template
          </h4>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Learn how to document findings professionally and ethically.
          </p>
          
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Generate Report Template
          </button>
        </div>

        {/* Learning Resources */}
        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Learning Resources Hub
          </h4>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Access curated security research papers, tutorials, and best practices.
          </p>
          
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Browse Resources
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${className} ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Green Hat Security Utilities
          </h1>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Educational security tools and ethical hacking resources for learning and defense improvement
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {(['learning', 'scenarios', 'challenges', 'tools'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-green-500 text-green-600'
                    : theme === 'dark'
                      ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mb-6 flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className={`ml-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Loading security utilities...
            </span>
          </div>
        )}

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'learning' && renderLearningModules()}
          {activeTab === 'scenarios' && renderHackingScenarios()}
          {activeTab === 'challenges' && renderSecurityChallenges()}
          {activeTab === 'tools' && renderSecurityTools()}
        </div>
      </div>
    </div>
  );
};

export default GreenHatUtilities;