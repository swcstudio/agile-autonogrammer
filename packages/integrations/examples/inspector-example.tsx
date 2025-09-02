/**
 * Inspector Integration Example for Katalyst Core
 *
 * This example demonstrates React component inspection and debugging tools
 * integrated with Katalyst's superior React 19 framework architecture.
 *
 * CRITICAL: Inspector enhances development workflow without replacing Katalyst patterns:
 * - Frontend: React 19 + TanStack Router + Zustand (Katalyst Superior)
 * - Inspector: Development-time component debugging and inspection
 * - DevTools: Enhanced debugging that complements Katalyst's architecture
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  InspectorHealthCheck,
  InspectorRuntimeProvider,
  useInspector,
  withInspector,
  withInspectorTracking,
} from '../components/InspectorRuntimeProvider.tsx';
import {
  useComponentInspection,
  useComponentTracking,
  useInspectorDevTools,
  useInspectorHotKeys,
  useInspectorPerformance,
  useInspectorSession,
  useSourceNavigation,
} from '../hooks/use-inspector.ts';
import type { InspectorConfig } from '../integrations/inspector.ts';

// Example Inspector Configuration
const inspectorConfig: InspectorConfig = {
  enabled: true,
  development: true,
  production: false,
  hotKeys: {
    inspect: ['ctrl', 'shift', 'i'],
    toggle: ['ctrl', 'shift', 'd'],
    navigate: ['ctrl', 'shift', 'o'],
  },
  editor: {
    command: 'code',
    args: ['--goto', '{file}:{line}:{column}'],
    fallback: 'cursor',
  },
  ui: {
    theme: 'auto',
    position: 'bottom-right',
    size: 'medium',
    opacity: 0.9,
  },
  features: {
    componentTree: true,
    propsInspection: true,
    stateInspection: true,
    hooksInspection: true,
    performanceMetrics: true,
    sourceNavigation: true,
    componentSearch: true,
  },
  filters: {
    includePatterns: ['src/**/*'],
    excludePatterns: ['node_modules/**/*', '**/*.test.*', '**/*.spec.*'],
    ignoreNodeModules: true,
    ignoreAnonymous: false,
  },
  integration: {
    zustandDevtools: true,
    tanstackDevtools: true,
    reactDevtools: true,
    katalystEnhanced: true,
  },
};

// Example data types for demonstration
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  lastActive: Date;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

// Component Inspection Example
const InspectedUserCard = withInspectorTracking(function UserCard({ user }: { user: User }) {
  const tracking = useComponentTracking('UserCard');
  const [expanded, setExpanded] = useState(false);

  // Simulate some expensive operations to demonstrate performance monitoring
  const expensiveCalculation = useCallback(() => {
    const start = performance.now();
    let result = 0;
    for (let i = 0; i < 100000; i++) {
      result += Math.random();
    }
    const end = performance.now();
    console.log(`UserCard calculation took ${end - start}ms`);
    return result;
  }, []);

  useEffect(() => {
    expensiveCalculation();
  }, [expensiveCalculation]);

  return (
    <div
      style={{
        padding: '15px',
        border: tracking.isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: tracking.isHovered ? '#f8fafc' : 'white',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={tracking.markAsSelected}
      onMouseEnter={tracking.markAsHovered}
      onMouseLeave={tracking.unmarkAsHovered}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 5px 0' }}>{user.name}</h3>
          <p style={{ margin: '0', color: '#6b7280' }}>{user.email}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: user.role === 'admin' ? '#fef3c7' : '#f3f4f6',
              color: user.role === 'admin' ? '#92400e' : '#374151',
              fontSize: '12px',
            }}
          >
            {user.role}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        style={{
          marginTop: '10px',
          padding: '4px 8px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        {expanded ? 'Hide Details' : 'Show Details'}
      </button>

      {expanded && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
          }}
        >
          <p>
            <strong>ID:</strong> {user.id}
          </p>
          <p>
            <strong>Last Active:</strong> {user.lastActive.toLocaleDateString()}
          </p>
          <p>
            <strong>Render Count:</strong> {tracking.renderCount}
          </p>
          <p>
            <strong>Component ID:</strong> {tracking.componentId}
          </p>
        </div>
      )}
    </div>
  );
}, 'UserCard');

// Performance-Heavy Component for Testing
const SlowComponent = withInspectorTracking(function SlowComponent() {
  const [count, setCount] = useState(0);
  const tracking = useComponentTracking('SlowComponent');

  // Intentionally slow operation to trigger performance alerts
  useEffect(() => {
    const start = performance.now();

    // Simulate heavy computation
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i);
    }

    const end = performance.now();
    console.log(`SlowComponent render took ${end - start}ms`);
  }, [count]);

  return (
    <div
      style={{
        padding: '20px',
        border: tracking.isSelected ? '2px solid #ef4444' : '1px solid #f87171',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
      }}
    >
      <h3>Slow Component (Performance Test)</h3>
      <p>This component performs heavy calculations on each render.</p>
      <p>
        <strong>Count:</strong> {count}
      </p>
      <p>
        <strong>Renders:</strong> {tracking.renderCount}
      </p>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        Trigger Slow Render
      </button>
    </div>
  );
}, 'SlowComponent');

// Component Inspection Dashboard
function ComponentInspectionExample() {
  const {
    selectedComponent,
    componentTree,
    searchResults,
    inspectionMode,
    searchQuery,
    selectComponent,
    toggleInspectionMode,
    navigateToSource,
    searchComponents,
    clearSearch,
  } = useComponentInspection();

  const { getSlowComponents, getFrequentlyRerendering, alerts, clearAlerts } =
    useInspectorPerformance();

  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (query: string) => {
    setSearchInput(query);
    searchComponents(query);
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>🔍 Component Inspection Dashboard</h3>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={toggleInspectionMode}
          style={{
            padding: '8px 16px',
            backgroundColor: inspectionMode ? '#ef4444' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {inspectionMode ? 'Exit Inspection' : 'Start Inspection'}
        </button>

        <input
          type="text"
          placeholder="Search components..."
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            width: '200px',
          }}
        />

        {searchInput && (
          <button
            onClick={() => {
              setSearchInput('');
              clearSearch();
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Component Tree */}
        <div>
          <h4>Component Tree ({componentTree.length})</h4>
          <div
            style={{
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '10px',
            }}
          >
            {componentTree.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No components tracked yet</p>
            ) : (
              componentTree.map((component) => (
                <div
                  key={component.id}
                  onClick={() => selectComponent(component.id)}
                  style={{
                    padding: '5px',
                    cursor: 'pointer',
                    backgroundColor:
                      selectedComponent?.id === component.id ? '#dbeafe' : 'transparent',
                    borderRadius: '4px',
                    marginBottom: '2px',
                  }}
                >
                  <strong>{component.name}</strong>
                  <br />
                  <small style={{ color: '#6b7280' }}>{component.file}</small>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Search Results */}
        <div>
          <h4>Search Results ({searchResults.length})</h4>
          <div
            style={{
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '10px',
            }}
          >
            {searchResults.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                {searchInput ? 'No matches found' : 'Enter search query'}
              </p>
            ) : (
              searchResults.map((component) => (
                <div
                  key={component.id}
                  onClick={() => selectComponent(component.id)}
                  style={{
                    padding: '5px',
                    cursor: 'pointer',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '4px',
                    marginBottom: '2px',
                  }}
                >
                  <strong>{component.name}</strong>
                  <br />
                  <small style={{ color: '#16a34a' }}>Match found</small>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance Alerts */}
        <div>
          <h4>Performance Alerts ({alerts.length})</h4>
          <div
            style={{
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '10px',
            }}
          >
            {alerts.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No performance issues</p>
            ) : (
              alerts.map((alert, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px',
                    backgroundColor: alert.type === 'error' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${alert.type === 'error' ? '#fecaca' : '#fed7aa'}`,
                    borderRadius: '4px',
                    marginBottom: '5px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: alert.type === 'error' ? '#dc2626' : '#d97706',
                    }}
                  >
                    {alert.type.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px' }}>{alert.message}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    Component: {alert.component}
                  </div>
                </div>
              ))
            )}
            {alerts.length > 0 && (
              <button
                onClick={clearAlerts}
                style={{
                  marginTop: '10px',
                  padding: '4px 8px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                Clear Alerts
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Component Details */}
      {selectedComponent && (
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          <h4>Selected Component: {selectedComponent.name}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p>
                <strong>Display Name:</strong> {selectedComponent.displayName}
              </p>
              <p>
                <strong>File:</strong> {selectedComponent.file}
              </p>
              <p>
                <strong>Location:</strong> Line {selectedComponent.line}, Column{' '}
                {selectedComponent.column}
              </p>
            </div>
            <div>
              <p>
                <strong>Render Time:</strong> {selectedComponent.performance.renderTime}ms
              </p>
              <p>
                <strong>Rerender Count:</strong> {selectedComponent.performance.rerenderCount}
              </p>
              <p>
                <strong>Last Render:</strong>{' '}
                {new Date(selectedComponent.performance.lastRenderTime).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateToSource(selectedComponent)}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Open in Editor (Ctrl+Shift+O)
          </button>
        </div>
      )}
    </div>
  );
}

// DevTools Integration Example
function DevToolsIntegrationExample() {
  const {
    reactDevtools,
    zustandDevtools,
    tanstackDevtools,
    katalystEnhanced,
    devtoolsVisible,
    toggleDevTools,
    openInReactDevTools,
    openInZustandDevTools,
  } = useInspectorDevTools();

  const { hotKeys } = useInspectorHotKeys();

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>🛠️ DevTools Integration</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h4>Available DevTools</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                padding: '10px',
                backgroundColor: reactDevtools ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${reactDevtools ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '4px',
              }}
            >
              <strong>React DevTools:</strong> {reactDevtools ? '✅ Available' : '❌ Disabled'}
              {reactDevtools && (
                <button
                  onClick={() => openInReactDevTools()}
                  style={{
                    marginLeft: '10px',
                    padding: '4px 8px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  Open
                </button>
              )}
            </div>

            <div
              style={{
                padding: '10px',
                backgroundColor: zustandDevtools ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${zustandDevtools ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '4px',
              }}
            >
              <strong>Zustand DevTools:</strong> {zustandDevtools ? '✅ Available' : '❌ Disabled'}
              {zustandDevtools && (
                <button
                  onClick={openInZustandDevTools}
                  style={{
                    marginLeft: '10px',
                    padding: '4px 8px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  Open
                </button>
              )}
            </div>

            <div
              style={{
                padding: '10px',
                backgroundColor: tanstackDevtools ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${tanstackDevtools ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '4px',
              }}
            >
              <strong>TanStack DevTools:</strong>{' '}
              {tanstackDevtools ? '✅ Available' : '❌ Disabled'}
            </div>

            <div
              style={{
                padding: '10px',
                backgroundColor: katalystEnhanced ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${katalystEnhanced ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '4px',
              }}
            >
              <strong>Katalyst Enhanced:</strong>{' '}
              {katalystEnhanced ? '✅ Available' : '❌ Disabled'}
            </div>
          </div>
        </div>

        <div>
          <h4>Keyboard Shortcuts</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
              <strong>Toggle Inspection:</strong> {hotKeys.inspect.join(' + ')}
            </div>
            <div style={{ padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
              <strong>Toggle DevTools:</strong> {hotKeys.toggle.join(' + ')}
            </div>
            <div style={{ padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
              <strong>Navigate to Source:</strong> {hotKeys.navigate.join(' + ')}
            </div>
          </div>

          <button
            onClick={toggleDevTools}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: devtoolsVisible ? '#ef4444' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            {devtoolsVisible ? 'Hide DevTools' : 'Show DevTools'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Session Management Example
function SessionManagementExample() {
  const {
    currentSession,
    sessionHistory,
    isSessionActive,
    sessionStats,
    startSession,
    endSession,
    clearHistory,
  } = useInspectorSession();

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>📊 Session Management</h3>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={startSession}
          disabled={isSessionActive}
          style={{
            padding: '8px 16px',
            backgroundColor: isSessionActive ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSessionActive ? 'not-allowed' : 'pointer',
          }}
        >
          Start Session
        </button>

        <button
          onClick={endSession}
          disabled={!isSessionActive}
          style={{
            padding: '8px 16px',
            backgroundColor: !isSessionActive ? '#9ca3af' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isSessionActive ? 'not-allowed' : 'pointer',
          }}
        >
          End Session
        </button>

        <button
          onClick={clearHistory}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Clear History ({sessionHistory.length})
        </button>
      </div>

      {/* Current Session */}
      {currentSession && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            marginBottom: '15px',
          }}
        >
          <h4>Current Session: {currentSession.id}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <strong>Started:</strong> {new Date(currentSession.startTime).toLocaleTimeString()}
            </div>
            <div>
              <strong>Components:</strong> {sessionStats.componentsInspected}
            </div>
            <div>
              <strong>Inspections:</strong> {sessionStats.totalInspections}
            </div>
          </div>
        </div>
      )}

      {/* Session History */}
      {sessionHistory.length > 0 && (
        <div>
          <h4>Session History</h4>
          <div style={{ maxHeight: '150px', overflow: 'auto' }}>
            {sessionHistory.map((session) => (
              <div
                key={session.id}
                style={{
                  padding: '10px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '5px',
                }}
              >
                <div>
                  <strong>{session.id}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Started: {new Date(session.startTime).toLocaleString()} | Components:{' '}
                  {session.components.size} | Inspections: {session.inspectionHistory.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Integration Status Component
function InspectorIntegrationStatus() {
  const inspector = useInspector();

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: inspector.isEnabled ? '#f0fdf4' : '#fef3f2',
        border: `1px solid ${inspector.isEnabled ? '#bbf7d0' : '#fca5a5'}`,
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>Inspector Integration Status</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <p>
            <strong>Status:</strong> {inspector.isEnabled ? '✅ Active' : '⚠️ Disabled'}
          </p>
          <p>
            <strong>Development Mode:</strong> {inspector.isDevelopment ? '✅' : '❌'}
          </p>
          <p>
            <strong>Framework:</strong> {inspector.integration.framework}
          </p>
          <p>
            <strong>Role:</strong> {inspector.integration.role}
          </p>
          <p>
            <strong>Features:</strong> {inspector.integration.features.length}
          </p>
        </div>
        <div>
          <p>
            <strong>Performance Monitoring:</strong> {inspector.performance.enabled ? '✅' : '❌'}
          </p>
          <p>
            <strong>Source Navigation:</strong>{' '}
            {inspector.config.features.sourceNavigation ? '✅' : '❌'}
          </p>
          <p>
            <strong>Component Search:</strong>{' '}
            {inspector.config.features.componentSearch ? '✅' : '❌'}
          </p>
          <p>
            <strong>Katalyst Superior:</strong> ✅ Preserved
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Example App Component
export function InspectorKatalystExample() {
  const [users] = useState<User[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', lastActive: new Date() },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', lastActive: new Date() },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'moderator',
      lastActive: new Date(),
    },
  ]);

  return (
    <InspectorRuntimeProvider
      config={inspectorConfig}
      developmentOnly={true}
      enableHotReload={true}
      onError={(error) => console.error('Inspector Runtime Error:', error)}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        <h1>🔍 ⚛️ Inspector + Katalyst Integration Example</h1>

        <div
          style={{
            padding: '15px',
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <strong>🎯 Architecture:</strong> Katalyst (React 19 + TanStack + Zustand) with Inspector
          component debugging.
          <br />
          <strong>✨ Key Principle:</strong> Inspector enhances development workflow - Katalyst
          remains architecturally superior.
          <br />
          <strong>🔍 Features:</strong> Component inspection, performance monitoring, source
          navigation, DevTools integration.
        </div>

        <InspectorHealthCheck
          fallback={
            <div
              style={{
                padding: '20px',
                backgroundColor: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
              }}
            >
              <h3>🔍 Inspector Setup Required</h3>
              <p>
                To use Inspector features, enable development mode and configure
                rsbuild-plugin-react-inspector.
              </p>
              <code
                style={{
                  display: 'block',
                  padding: '10px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  margin: '10px 0',
                }}
              >
                npm install rsbuild-plugin-react-inspector
              </code>
              <p>Currently running with mock provider for demonstration.</p>
            </div>
          }
        >
          <InspectorIntegrationStatus />
          <DevToolsIntegrationExample />
          <SessionManagementExample />
          <ComponentInspectionExample />

          {/* Example Components to Inspect */}
          <div style={{ marginTop: '30px' }}>
            <h2>Example Components (Click to Inspect)</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              {users.map((user) => (
                <InspectedUserCard key={user.id} user={user} />
              ))}
            </div>

            <SlowComponent />
          </div>
        </InspectorHealthCheck>
      </div>
    </InspectorRuntimeProvider>
  );
}

// HOC Example - Enhanced component with Inspector
const EnhancedInspectorComponent = withInspector<{ title: string }>(({ title, inspector }) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>Inspector Status: {inspector.isEnabled ? 'Active' : 'Disabled'}</p>
      <p>Features: {inspector.integration.features.join(', ')}</p>
      <p>Framework: {inspector.integration.framework} (Katalyst Superior)</p>
    </div>
  );
});

export default InspectorKatalystExample;
