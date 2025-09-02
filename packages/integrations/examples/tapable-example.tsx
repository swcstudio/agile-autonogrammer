/**
 * Tapable Plugin System Example for Katalyst Core
 * 
 * This example demonstrates the powerful Tapable plugin architecture
 * integrated with Katalyst's superior React 19 framework.
 * 
 * CRITICAL: Tapable enhances extensibility without replacing Katalyst patterns:
 * - Frontend: React 19 + TanStack Router + Zustand (Katalyst remains supreme)
 * - Plugin System: Tapable hooks for extensibility and build-time integrations
 * - Architecture: Plugin hooks complement Katalyst's superior component patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TapableHealthCheck,
  TapableRuntimeProvider, 
  createTapablePlugin,
  useTapable,
  withTapable
} from '../components/TapableRuntimeProvider.tsx';
import { 
  useTapableCompilation,
  useTapableHooks,
  useTapablePerformance,
  useTapablePluginDevelopment,
  useTapablePlugins,
  useTapableWatch
} from '../hooks/use-tapable.ts';
import type { TapableConfig, TapablePlugin } from '../integrations/tapable.ts';

// Example Tapable Configuration
const tapableConfig: TapableConfig = {
  enabled: true,
  development: true,
  production: false,
  plugins: [
    { name: 'logger-plugin', enabled: true },
    { name: 'performance-plugin', enabled: true },
    { name: 'katalyst-plugin', enabled: true }
  ],
  hooks: {
    lifecycle: true,
    compilation: true,
    optimization: true,
    assets: true,
    runtime: true,
    custom: true
  },
  features: {
    interceptors: true,
    context: true,
    performance: true,
    debugging: true,
    hotReload: true
  },
  optimization: {
    compileHooks: true,
    caching: true,
    parallelExecution: true,
    errorHandling: true
  },
  katalystIntegration: {
    preserveSuperiority: true,
    enhanceWithPlugins: true,
    buildTimePlugins: true,
    runtimePlugins: false
  }
};

// Example Plugin Classes
class LoggerPlugin implements TapablePlugin {
  name = 'LoggerPlugin';
  version = '1.0.0';
  
  apply(compiler: any) {
    // Log lifecycle events
    compiler.hooks.beforeRun.tap('LoggerPlugin', () => {
      console.log('🚀 LoggerPlugin: Compilation starting...');
    });
    
    compiler.hooks.afterCompile.tapAsync('LoggerPlugin', (compilation: any, callback: any) => {
      console.log(`📦 LoggerPlugin: Compilation complete - ${compilation.modules.length} modules, ${compilation.chunks.length} chunks`);
      callback();
    });
    
    compiler.hooks.done.tap('LoggerPlugin', (stats: any) => {
      console.log(`✅ LoggerPlugin: Build finished in ${stats.time}ms with hash ${stats.hash}`);
    });
    
    compiler.hooks.failed.tap('LoggerPlugin', (error: Error) => {
      console.error('❌ LoggerPlugin: Build failed:', error.message);
    });
  }
}

class PerformancePlugin implements TapablePlugin {
  name = 'PerformancePlugin';
  private timings = new Map<string, number>();
  
  apply(compiler: any) {
    // Track compilation performance
    compiler.hooks.beforeRun.tap('PerformancePlugin', () => {
      this.timings.set('compilation-start', performance.now());
      console.log('⏱️ PerformancePlugin: Starting performance monitoring');
    });
    
    compiler.hooks.beforeCompile.tap('PerformancePlugin', () => {
      this.timings.set('compile-start', performance.now());
    });
    
    compiler.hooks.afterCompile.tap('PerformancePlugin', () => {
      const compileStart = this.timings.get('compile-start');
      if (compileStart) {
        const compileTime = performance.now() - compileStart;
        console.log(`📈 PerformancePlugin: Compilation phase took ${compileTime.toFixed(2)}ms`);
      }
    });
    
    compiler.hooks.done.tap('PerformancePlugin', (stats: any) => {
      const start = this.timings.get('compilation-start');
      if (start) {
        const totalTime = performance.now() - start;
        const efficiency = (stats.modules / totalTime) * 1000; // modules per second
        
        console.log(`📊 PerformancePlugin: Total time ${totalTime.toFixed(2)}ms, efficiency ${efficiency.toFixed(2)} modules/sec`);
        
        if (totalTime > 5000) {
          console.warn('⚠️ PerformancePlugin: Slow compilation detected (>5s)');
        }
      }
    });
  }
}

class KatalystPlugin implements TapablePlugin {
  name = 'KatalystPlugin';
  
  apply(compiler: any) {
    // Katalyst-specific optimizations
    compiler.hooks.katalystInit.tapAsync('KatalystPlugin', (config: any, callback: any) => {
      console.log('⚛️ KatalystPlugin: Initializing Katalyst optimizations');
      
      // Simulate Katalyst-specific setup
      setTimeout(() => {
        console.log('✨ KatalystPlugin: Katalyst optimizations ready');
        callback();
      }, 100);
    });
    
    compiler.hooks.katalystCompile.tap('KatalystPlugin', (source: string) => {
      console.log('🔧 KatalystPlugin: Applying Katalyst transformations');
      
      // Example: Add Katalyst enhancements to components
      if (source.includes('function ') || source.includes('class ')) {
        return `// Katalyst Enhanced\n${source}`;
      }
      
      return source;
    });
    
    compiler.hooks.katalystOptimize.tapPromise('KatalystPlugin', async (compilation: any) => {
      console.log('🚀 KatalystPlugin: Running Katalyst-specific optimizations');
      
      // Simulate async optimization
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Add Katalyst metadata to modules
      compilation.modules.forEach((module: any) => {
        if (module.type === 'component') {
          module.katalystEnhanced = true;
        }
      });
      
      console.log('✅ KatalystPlugin: Katalyst optimizations complete');
    });
  }
}

class ValidationPlugin implements TapablePlugin {
  name = 'ValidationPlugin';
  
  apply(compiler: any) {
    compiler.hooks.afterCompile.tap('ValidationPlugin', (compilation: any) => {
      console.log('🔍 ValidationPlugin: Running validation checks');
      
      // Validate compilation results
      const errors = [];
      
      if (compilation.modules.length === 0) {
        errors.push('No modules found in compilation');
      }
      
      if (compilation.chunks.length === 0) {
        errors.push('No chunks generated');
      }
      
      // Check for large assets
      Object.entries(compilation.assets).forEach(([name, asset]: [string, any]) => {
        if (asset.size > 1000000) { // 1MB
          console.warn(`⚠️ ValidationPlugin: Large asset detected: ${name} (${asset.size} bytes)`);
        }
      });
      
      if (errors.length > 0) {
        compilation.errors.push(...errors.map(err => new Error(err)));
        console.error('❌ ValidationPlugin: Validation failed:', errors);
      } else {
        console.log('✅ ValidationPlugin: All validation checks passed');
      }
    });
  }
}

// Plugin Management Example
function PluginManagementExample() {
  const {
    registered,
    active,
    failed,
    history,
    registerPlugin,
    unregisterPlugin,
    createSyncPlugin,
    createAsyncPlugin,
    getPluginCount
  } = useTapablePlugins();
  
  const [customPluginName, setCustomPluginName] = useState('CustomPlugin');
  
  const registerBuiltinPlugins = useCallback(() => {
    registerPlugin(new LoggerPlugin());
    registerPlugin(new PerformancePlugin());
    registerPlugin(new KatalystPlugin());
    registerPlugin(new ValidationPlugin());
  }, [registerPlugin]);
  
  const createCustomSyncPlugin = useCallback(() => {
    const plugin = createSyncPlugin(
      customPluginName,
      'afterCompile',
      (compilation: any) => {
        console.log(`🔧 ${customPluginName}: Custom sync plugin executed`);
        console.log(`   Modules: ${compilation.modules.length}, Chunks: ${compilation.chunks.length}`);
      }
    );
    registerPlugin(plugin);
  }, [createSyncPlugin, registerPlugin, customPluginName]);
  
  const createCustomAsyncPlugin = useCallback(() => {
    const plugin = createAsyncPlugin(
      `${customPluginName}-Async`,
      'beforeRun',
      async (compiler: any) => {
        console.log(`⏳ ${customPluginName}-Async: Starting async work...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log(`✅ ${customPluginName}-Async: Async work completed`);
      }
    );
    registerPlugin(plugin);
  }, [createAsyncPlugin, registerPlugin, customPluginName]);
  
  return (
    <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>🔗 Plugin Management</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h4>Plugin Actions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={registerBuiltinPlugins}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px'
              }}
            >
              Register Built-in Plugins
            </button>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                value={customPluginName}
                onChange={(e) => setCustomPluginName(e.target.value)}
                placeholder="Custom Plugin Name"
                style={{ 
                  padding: '6px 10px', 
                  border: '1px solid #ced4da', 
                  borderRadius: '4px',
                  flex: 1
                }}
              />
            </div>
            
            <button 
              onClick={createCustomSyncPlugin}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px'
              }}
            >
              Create Sync Plugin
            </button>
            
            <button 
              onClick={createCustomAsyncPlugin}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#ffc107', 
                color: 'black', 
                border: 'none', 
                borderRadius: '4px'
              }}
            >
              Create Async Plugin
            </button>
          </div>
        </div>
        
        <div>
          <h4>Plugin Statistics</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>Registered:</strong> {getPluginCount()}
            </div>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>Active:</strong> {active.length}
            </div>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>Failed:</strong> {failed.length}
            </div>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>History:</strong> {history.length} actions
            </div>
          </div>
        </div>
      </div>
      
      {/* Registered Plugins List */}
      <div>
        <h4>Registered Plugins ({getPluginCount()})</h4>
        <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e9ecef', borderRadius: '4px', padding: '10px' }}>
          {Array.from(registered.entries()).map(([name, plugin]) => (
            <div 
              key={name}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px',
                marginBottom: '5px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px'
              }}
            >
              <div>
                <strong>{plugin.name}</strong>
                {plugin.version && <span style={{ color: '#6c757d' }}> v{plugin.version}</span>}
              </div>
              <button 
                onClick={() => unregisterPlugin(name)}
                style={{ 
                  padding: '4px 8px', 
                  backgroundColor: '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compilation Example
function CompilationExample() {
  const {
    isCompiling,
    lastStats,
    compilationHistory,
    runCompilation,
    clearStats,
    getCompilationSummary,
    modules,
    chunks,
    assets,
    errors,
    warnings
  } = useTapableCompilation();
  
  const [autoCompile, setAutoCompile] = useState(false);
  const [compileInterval, setCompileInterval] = useState<NodeJS.Timeout | null>(null);
  
  const handleRunCompilation = useCallback(async () => {
    try {
      await runCompilation();
    } catch (error) {
      console.error('Compilation failed:', error);
    }
  }, [runCompilation]);
  
  const toggleAutoCompile = useCallback(() => {
    if (autoCompile) {
      if (compileInterval) {
        clearInterval(compileInterval);
        setCompileInterval(null);
      }
      setAutoCompile(false);
    } else {
      const interval = setInterval(handleRunCompilation, 5000);
      setCompileInterval(interval);
      setAutoCompile(true);
    }
  }, [autoCompile, compileInterval, handleRunCompilation]);
  
  useEffect(() => {
    return () => {
      if (compileInterval) {
        clearInterval(compileInterval);
      }
    };
  }, [compileInterval]);
  
  const summary = getCompilationSummary();
  
  return (
    <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>⚙️ Compilation Management</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={handleRunCompilation}
          disabled={isCompiling}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: isCompiling ? '#6c757d' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isCompiling ? 'not-allowed' : 'pointer'
          }}
        >
          {isCompiling ? 'Compiling...' : 'Run Compilation'}
        </button>
        
        <button 
          onClick={toggleAutoCompile}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: autoCompile ? '#dc3545' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px'
          }}
        >
          {autoCompile ? 'Stop Auto-Compile' : 'Start Auto-Compile (5s)'}
        </button>
        
        <button 
          onClick={clearStats}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px'
          }}
        >
          Clear Stats
        </button>
      </div>
      
      {/* Compilation Summary */}
      {summary && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e7f3ff', 
          border: '1px solid #bee5eb',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4>Last Compilation Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
            <div><strong>Modules:</strong> {summary.modules}</div>
            <div><strong>Chunks:</strong> {summary.chunks}</div>
            <div><strong>Assets:</strong> {summary.assets}</div>
            <div><strong>Errors:</strong> {summary.errors}</div>
            <div><strong>Warnings:</strong> {summary.warnings}</div>
            <div><strong>Time:</strong> {summary.time.toFixed(2)}ms</div>
            <div><strong>Hash:</strong> {summary.hash}</div>
          </div>
        </div>
      )}
      
      {/* Compilation Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
        <div>
          <h5>Modules ({modules.length})</h5>
          <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #e9ecef', borderRadius: '4px', padding: '8px' }}>
            {modules.length === 0 ? (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No modules compiled yet</p>
            ) : (
              modules.map(module => (
                <div key={module.id} style={{ marginBottom: '5px', fontSize: '12px' }}>
                  <strong>{module.name}</strong> ({module.type})
                  <br />
                  <span style={{ color: '#6c757d' }}>Size: {module.size} bytes</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div>
          <h5>Chunks ({chunks.length})</h5>
          <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #e9ecef', borderRadius: '4px', padding: '8px' }}>
            {chunks.length === 0 ? (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No chunks generated yet</p>
            ) : (
              chunks.map(chunk => (
                <div key={chunk.id} style={{ marginBottom: '5px', fontSize: '12px' }}>
                  <strong>{chunk.name}</strong>
                  <br />
                  <span style={{ color: '#6c757d' }}>
                    {chunk.modules.length} modules, {chunk.size} bytes
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div>
          <h5>Assets ({Object.keys(assets).length})</h5>
          <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #e9ecef', borderRadius: '4px', padding: '8px' }}>
            {Object.keys(assets).length === 0 ? (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No assets generated yet</p>
            ) : (
              Object.entries(assets).map(([name, asset]) => (
                <div key={name} style={{ marginBottom: '5px', fontSize: '12px' }}>
                  <strong>{name}</strong>
                  <br />
                  <span style={{ color: '#6c757d' }}>
                    {asset.size} bytes {asset.emitted ? '(emitted)' : '(cached)'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Errors and Warnings */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div style={{ marginTop: '20px' }}>
          {errors.length > 0 && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#f8d7da', 
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              marginBottom: '10px'
            }}>
              <h5 style={{ color: '#721c24' }}>Errors ({errors.length})</h5>
              {errors.map((error, index) => (
                <div key={index} style={{ fontSize: '12px', color: '#721c24' }}>
                  {error.message}
                </div>
              ))}
            </div>
          )}
          
          {warnings.length > 0 && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeaa7',
              borderRadius: '4px'
            }}>
              <h5 style={{ color: '#856404' }}>Warnings ({warnings.length})</h5>
              {warnings.map((warning, index) => (
                <div key={index} style={{ fontSize: '12px', color: '#856404' }}>
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Performance Monitoring Example
function PerformanceExample() {
  const {
    enabled,
    stats,
    snapshots,
    takeSnapshot,
    clearSnapshots,
    getSlowHooks,
    getSlowPlugins,
    getTotalHookTime,
    getTotalPluginTime,
    hookExecutions,
    pluginExecutions,
    getAverageHookTime,
    getAveragePluginTime
  } = useTapablePerformance();
  
  return (
    <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>📊 Performance Monitoring</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            onClick={takeSnapshot}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px'
            }}
          >
            Take Performance Snapshot
          </button>
          <button 
            onClick={clearSnapshots}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px'
            }}
          >
            Clear Snapshots ({snapshots.length})
          </button>
        </div>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: enabled ? '#d4edda' : '#f8d7da', 
          border: `1px solid ${enabled ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '8px'
        }}>
          <strong>Performance Monitoring:</strong> {enabled ? '✅ Enabled' : '❌ Disabled'}
        </div>
      </div>
      
      {/* Performance Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h5>Hook Performance</h5>
          <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div><strong>Total Hook Time:</strong> {getTotalHookTime().toFixed(2)}ms</div>
            <div><strong>Average Hook Time:</strong> {getAverageHookTime().toFixed(2)}ms</div>
            <div><strong>Hook Executions:</strong> {hookExecutions.size}</div>
          </div>
          
          {getSlowHooks(1).length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Slow Hooks (>1ms):</strong>
              <div style={{ maxHeight: '100px', overflow: 'auto', fontSize: '12px' }}>
                {getSlowHooks(1).map(({ hook, time }) => (
                  <div key={hook} style={{ padding: '2px 0' }}>
                    {hook}: {time.toFixed(2)}ms
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <h5>Plugin Performance</h5>
          <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <div><strong>Total Plugin Time:</strong> {getTotalPluginTime().toFixed(2)}ms</div>
            <div><strong>Average Plugin Time:</strong> {getAveragePluginTime().toFixed(2)}ms</div>
            <div><strong>Plugin Executions:</strong> {pluginExecutions.size}</div>
          </div>
          
          {getSlowPlugins(1).length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Slow Plugins (>1ms):</strong>
              <div style={{ maxHeight: '100px', overflow: 'auto', fontSize: '12px' }}>
                {getSlowPlugins(1).map(({ plugin, time }) => (
                  <div key={plugin} style={{ padding: '2px 0' }}>
                    {plugin}: {time.toFixed(2)}ms
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Performance Snapshots */}
      {snapshots.length > 0 && (
        <div>
          <h5>Performance Snapshots ({snapshots.length})</h5>
          <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e9ecef', borderRadius: '4px', padding: '10px' }}>
            {snapshots.map((snapshot, index) => (
              <div key={index} style={{ 
                padding: '8px', 
                marginBottom: '8px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div><strong>Snapshot {index + 1}</strong> - {new Date(snapshot.timestamp).toLocaleTimeString()}</div>
                <div>Total Time: {snapshot.stats.totalTime.toFixed(2)}ms</div>
                <div>Hook Executions: {snapshot.stats.hookExecutions.size}</div>
                <div>Plugin Executions: {snapshot.stats.pluginExecutions.size}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Plugin Development Helper
function PluginDevelopmentExample() {
  const {
    developmentPlugins,
    createAndRegisterPlugin,
    createLoggerPlugin,
    createPerformancePlugin,
    createDebugPlugin,
    createValidationPlugin,
    clearDevelopmentPlugins
  } = useTapablePluginDevelopment();
  
  const [pluginName, setPluginName] = useState('MyCustomPlugin');
  const [hookName, setHookName] = useState('afterCompile');
  const [pluginType, setPluginType] = useState<'sync' | 'async' | 'callback'>('sync');
  
  const createCustomPlugin = useCallback(() => {
    const handler = (...args: any[]) => {
      console.log(`🎯 ${pluginName}: Custom plugin executed on ${hookName} with args:`, args);
    };
    
    createAndRegisterPlugin(pluginName, pluginType, hookName, handler);
  }, [pluginName, hookName, pluginType, createAndRegisterPlugin]);
  
  return (
    <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>🛠️ Plugin Development Helper</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h5>Quick Plugin Creation</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => createLoggerPlugin('QuickLogger', ['beforeRun', 'afterCompile', 'done'])}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px'
              }}
            >
              Create Logger Plugin
            </button>
            
            <button 
              onClick={() => createPerformancePlugin('QuickPerformance')}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px'
              }}
            >
              Create Performance Plugin
            </button>
            
            <button 
              onClick={() => createDebugPlugin('QuickDebug')}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#ffc107', 
                color: 'black', 
                border: 'none', 
                borderRadius: '4px'
              }}
            >
              Create Debug Plugin
            </button>
            
            <button 
              onClick={() => createValidationPlugin('QuickValidation', (compilation) => compilation.modules.length > 0)}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px'
              }}
            >
              Create Validation Plugin
            </button>
          </div>
        </div>
        
        <div>
          <h5>Custom Plugin Builder</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={pluginName}
              onChange={(e) => setPluginName(e.target.value)}
              placeholder="Plugin Name"
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #ced4da', 
                borderRadius: '4px'
              }}
            />
            
            <select
              value={hookName}
              onChange={(e) => setHookName(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #ced4da', 
                borderRadius: '4px'
              }}
            >
              <option value="beforeRun">beforeRun</option>
              <option value="afterCompile">afterCompile</option>
              <option value="done">done</option>
              <option value="katalystInit">katalystInit</option>
              <option value="katalystCompile">katalystCompile</option>
              <option value="katalystOptimize">katalystOptimize</option>
            </select>
            
            <select
              value={pluginType}
              onChange={(e) => setPluginType(e.target.value as 'sync' | 'async' | 'callback')}
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #ced4da', 
                borderRadius: '4px'
              }}
            >
              <option value="sync">Sync</option>
              <option value="async">Async</option>
              <option value="callback">Callback</option>
            </select>
            
            <button 
              onClick={createCustomPlugin}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#6f42c1', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px'
              }}
            >
              Create Custom Plugin
            </button>
          </div>
        </div>
      </div>
      
      {/* Development Plugins List */}
      {developmentPlugins.size > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h5>Development Plugins ({developmentPlugins.size})</h5>
            <button 
              onClick={clearDevelopmentPlugins}
              style={{ 
                padding: '6px 12px', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              Clear All
            </button>
          </div>
          <div style={{ 
            maxHeight: '150px', 
            overflow: 'auto', 
            border: '1px solid #e9ecef', 
            borderRadius: '4px', 
            padding: '10px' 
          }}>
            {Array.from(developmentPlugins.entries()).map(([name, plugin]) => (
              <div key={name} style={{ 
                padding: '6px', 
                marginBottom: '4px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <strong>{plugin.name}</strong>
                <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                  Development Plugin
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Integration Status Component
function TapableIntegrationStatus() {
  const tapable = useTapable();
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: tapable.isEnabled ? '#d4edda' : '#f8d7da',
      border: `1px solid ${tapable.isEnabled ? '#c3e6cb' : '#f5c6cb'}`,
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>Tapable Integration Status</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <p><strong>Status:</strong> {tapable.isEnabled ? '✅ Active' : '⚠️ Disabled'}</p>
          <p><strong>Framework:</strong> {tapable.integration.framework}</p>
          <p><strong>Role:</strong> {tapable.integration.role}</p>
          <p><strong>Version:</strong> {tapable.integration.version}</p>
          <p><strong>Features:</strong> {tapable.integration.features.length}</p>
        </div>
        <div>
          <p><strong>Hooks Available:</strong> {tapable.hooks.available.length}</p>
          <p><strong>Performance Monitoring:</strong> {tapable.hooks.performance ? '✅' : '❌'}</p>
          <p><strong>Interceptors:</strong> {tapable.hooks.interceptors ? '✅' : '❌'}</p>
          <p><strong>Debugging:</strong> {tapable.hooks.debugging ? '✅' : '❌'}</p>
          <p><strong>Katalyst Superior:</strong> ✅ Preserved</p>
        </div>
      </div>
    </div>
  );
}

// Main Example App Component
export function TapableKatalystExample() {
  return (
    <TapableRuntimeProvider 
      config={tapableConfig}
      developmentOnly={true}
      enableWatch={false}
      onError={(error) => console.error('Tapable Runtime Error:', error)}
      onStats={(stats) => console.log('Compilation Stats:', stats)}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        <h1>🔗 ⚛️ Tapable + Katalyst Integration Example</h1>
        
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          border: '1px solid '#1976d2', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <strong>🎯 Architecture:</strong> Katalyst (React 19 + TanStack + Zustand) with Tapable plugin extensibility.
          <br />
          <strong>✨ Key Principle:</strong> Tapable enhances extensibility - Katalyst remains architecturally superior.
          <br />
          <strong>🔗 Features:</strong> Plugin system, hook-based architecture, performance monitoring, webpack compatibility.
        </div>
        
        <TapableHealthCheck 
          fallback={
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8d7da', 
              border: '1px solid #f5c6cb', 
              borderRadius: '8px'
            }}>
              <h3>🔗 Tapable Setup Required</h3>
              <p>To use Tapable features, enable development mode and ensure Tapable is properly configured.</p>
              <code style={{ 
                display: 'block', 
                padding: '10px', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '4px',
                margin: '10px 0'
              }}>
                npm install tapable@2.2.1
              </code>
              <p>Currently running with mock provider for demonstration.</p>
            </div>
          }
        >
          <TapableIntegrationStatus />
          <PluginManagementExample />
          <CompilationExample />
          <PerformanceExample />
          <PluginDevelopmentExample />
        </TapableHealthCheck>
      </div>
    </TapableRuntimeProvider>
  );
}

// HOC Example - Enhanced component with Tapable
const EnhancedTapableComponent = withTapable<{ title: string }>(({ title, tapable }) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>Tapable Status: {tapable.isEnabled ? 'Plugin system active' : 'Disabled'}</p>
      <p>Features: {tapable.integration.features.join(', ')}</p>
      <p>Framework: {tapable.integration.framework} (Katalyst Superior)</p>
    </div>
  );
});

export default TapableKatalystExample;