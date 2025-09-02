/**
 * Re.Pack Fast Refresh Integration
 *
 * Provides intelligent Fast Refresh for Re.Pack federated modules:
 * - Hot reload for federated mobile components
 * - Cross-platform state synchronization
 * - Module federation hot updates
 */

import type { FastRefreshIntegration, RefreshUpdate } from '../KatalystFastRefreshProvider';

export interface RePackFastRefreshConfig {
  federatedModules?: boolean;
  mobileSync?: boolean;
  chunkRefresh?: boolean;
  debugMode?: boolean;
}

export class RePackFastRefresh implements FastRefreshIntegration {
  name = 'repack';
  private config: RePackFastRefreshConfig;
  private federatedModules: Map<string, any> = new Map();
  private moduleStates: Map<string, any> = new Map();
  private bridgeConnection: any = null;

  constructor(config: RePackFastRefreshConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Detect Re.Pack environment
    if (typeof global !== 'undefined') {
      const repackRuntime = (global as any).__REPACK__;

      if (repackRuntime) {
        console.log('📱 Re.Pack Fast Refresh initialized');

        // Initialize module federation tracking
        if (this.config.federatedModules) {
          this.setupFederatedModuleTracking();
        }

        // Set up mobile sync
        if (this.config.mobileSync) {
          this.setupMobileSync();
        }
      } else {
        if (this.config.debugMode) {
          console.warn('⚠️  Re.Pack runtime not detected');
        }
      }
    }
  }

  async refresh(moduleId: string, exports: any): Promise<void> {
    const isFederatedModule = this.isFederatedModule(exports);
    const isMobileComponent = this.isMobileComponent(exports);
    const isNativeModule = this.isNativeModule(exports);

    if (isFederatedModule && this.config.federatedModules) {
      await this.refreshFederatedModule(moduleId, exports);
    }

    if (isMobileComponent && this.config.mobileSync) {
      await this.refreshMobileComponent(moduleId, exports);
    }

    if (isNativeModule) {
      await this.refreshNativeModule(moduleId, exports);
    }

    if (this.config.chunkRefresh) {
      await this.refreshChunks(moduleId, exports);
    }
  }

  async cleanup(): Promise<void> {
    this.federatedModules.clear();
    this.moduleStates.clear();

    if (this.bridgeConnection) {
      this.bridgeConnection.disconnect();
    }
  }

  // Federated Module Management
  private isFederatedModule(exports: any): boolean {
    return Object.values(exports).some(
      (value: any) =>
        value &&
        typeof value === 'object' &&
        (value.__federation__ || value.__remote__ || value.__webpack_require__)
    );
  }

  private async refreshFederatedModule(moduleId: string, exports: any): Promise<void> {
    // Preserve federated module state
    const currentState = this.moduleStates.get(moduleId);

    // Update federated module cache
    if (typeof global !== 'undefined' && (global as any).__webpack_require__) {
      const webpackRequire = (global as any).__webpack_require__;

      // Clear module cache
      if (webpackRequire.cache && webpackRequire.cache[moduleId]) {
        delete webpackRequire.cache[moduleId];
      }

      // Clear chunk cache if it exists
      if (webpackRequire.hmrC) {
        Object.keys(webpackRequire.hmrC).forEach((chunkId) => {
          if (webpackRequire.hmrC[chunkId]) {
            delete webpackRequire.hmrC[chunkId][moduleId];
          }
        });
      }
    }

    // Re-register federated module
    this.federatedModules.set(moduleId, exports);

    // Restore state if available
    if (currentState) {
      this.moduleStates.set(moduleId, currentState);
    }

    // Notify remote hosts about the update
    await this.notifyRemoteHosts(moduleId, exports);

    if (this.config.debugMode) {
      console.log(`🔄 Refreshed federated module: ${moduleId}`);
    }
  }

  private async notifyRemoteHosts(moduleId: string, exports: any): Promise<void> {
    if (typeof global === 'undefined') return;

    const federationRuntime = (global as any).__webpack_federation__;

    if (federationRuntime && federationRuntime.instances) {
      federationRuntime.instances.forEach((instance: any) => {
        if (instance.moduleCache && instance.moduleCache.has(moduleId)) {
          // Update module in remote cache
          instance.moduleCache.set(moduleId, exports);

          // Trigger update event
          if (instance.eventBus) {
            instance.eventBus.emit('module-updated', {
              moduleId,
              exports,
              timestamp: Date.now(),
            });
          }
        }
      });
    }
  }

  // Mobile Component Management
  private isMobileComponent(exports: any): boolean {
    return Object.values(exports).some(
      (value: any) =>
        typeof value === 'function' &&
        (value.toString().includes('react-native') ||
          value.toString().includes('TouchableOpacity') ||
          value.toString().includes('SafeAreaView') ||
          value.toString().includes('useNativeDriver'))
    );
  }

  private async refreshMobileComponent(moduleId: string, exports: any): Promise<void> {
    // Preserve component state for React Native components
    const componentStates = this.extractComponentStates(exports);

    // Store states
    this.moduleStates.set(`${moduleId}:components`, componentStates);

    // Trigger React Native Fast Refresh
    if (typeof global !== 'undefined' && (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

      if (hook.onCommitFiberRoot) {
        // Signal component update to React DevTools
        Object.values(exports).forEach((component) => {
          if (typeof component === 'function') {
            hook.onCommitFiberRoot(1, component);
          }
        });
      }
    }

    // Sync with web if enabled
    if (this.config.mobileSync) {
      await this.syncWithWeb(moduleId, exports);
    }

    if (this.config.debugMode) {
      console.log(`📱 Refreshed mobile component: ${moduleId}`);
    }
  }

  private extractComponentStates(exports: any): any[] {
    const states: any[] = [];

    Object.values(exports).forEach((component: any) => {
      if (typeof component === 'function' && component.__fiber) {
        // Extract React Fiber state
        const fiber = component.__fiber;
        if (fiber.memoizedState) {
          states.push({
            component: component.name,
            state: fiber.memoizedState,
          });
        }
      }
    });

    return states;
  }

  private async syncWithWeb(moduleId: string, exports: any): Promise<void> {
    if (!this.bridgeConnection) return;

    // Send update to web platform via bridge
    const updatePayload = {
      type: 'mobile-component-update',
      moduleId,
      exports: this.serializeExports(exports),
      timestamp: Date.now(),
    };

    try {
      await this.bridgeConnection.send(updatePayload);
    } catch (error) {
      if (this.config.debugMode) {
        console.warn('Failed to sync with web:', error);
      }
    }
  }

  private serializeExports(exports: any): any {
    // Serialize exports for cross-platform transmission
    const serialized: any = {};

    Object.entries(exports).forEach(([key, value]) => {
      if (typeof value === 'function') {
        serialized[key] = {
          type: 'function',
          name: value.name,
          source: value.toString(),
        };
      } else if (typeof value === 'object' && value !== null) {
        serialized[key] = {
          type: 'object',
          value: JSON.stringify(value),
        };
      } else {
        serialized[key] = {
          type: typeof value,
          value,
        };
      }
    });

    return serialized;
  }

  // Native Module Management
  private isNativeModule(exports: any): boolean {
    return Object.values(exports).some(
      (value: any) =>
        value &&
        typeof value === 'object' &&
        (value.NativeModules || value.requireNativeComponent || value.NativeEventEmitter)
    );
  }

  private async refreshNativeModule(moduleId: string, exports: any): Promise<void> {
    // Native modules require special handling as they bridge to native code
    if (typeof global !== 'undefined') {
      const NativeModules = (global as any).NativeModules;

      if (NativeModules) {
        // Update native module registry
        Object.entries(exports).forEach(([key, value]) => {
          if (value && typeof value === 'object' && value.NativeModules) {
            Object.assign(NativeModules, value.NativeModules);
          }
        });
      }
    }

    if (this.config.debugMode) {
      console.log(`🔧 Refreshed native module: ${moduleId}`);
    }
  }

  // Chunk Management
  private async refreshChunks(moduleId: string, exports: any): Promise<void> {
    if (typeof global === 'undefined') return;

    const webpackRequire = (global as any).__webpack_require__;

    if (webpackRequire && webpackRequire.cache) {
      // Find related chunks
      const relatedChunks = this.findRelatedChunks(moduleId);

      // Refresh chunk cache
      relatedChunks.forEach((chunkId) => {
        if (webpackRequire.cache[chunkId]) {
          delete webpackRequire.cache[chunkId];
        }
      });

      // Trigger chunk reload
      if (webpackRequire.loadChunk) {
        relatedChunks.forEach((chunkId) => {
          webpackRequire.loadChunk(chunkId);
        });
      }
    }

    if (this.config.debugMode) {
      console.log(`📦 Refreshed chunks for: ${moduleId}`);
    }
  }

  private findRelatedChunks(moduleId: string): string[] {
    // Find chunks that contain the module
    const chunks: string[] = [];

    if (typeof global !== 'undefined') {
      const webpackRequire = (global as any).__webpack_require__;

      if (webpackRequire && webpackRequire.cache) {
        Object.keys(webpackRequire.cache).forEach((cacheKey) => {
          const module = webpackRequire.cache[cacheKey];
          if (module && module.exports && module.id === moduleId) {
            chunks.push(cacheKey);
          }
        });
      }
    }

    return chunks;
  }

  // Setup Methods
  private setupFederatedModuleTracking(): void {
    if (typeof global === 'undefined') return;

    // Hook into webpack federation events
    const federationRuntime = (global as any).__webpack_federation__;

    if (federationRuntime) {
      // Track module loads
      const originalGet = federationRuntime.get;

      federationRuntime.get = (moduleId: string) => {
        const result = originalGet.call(federationRuntime, moduleId);

        if (result) {
          this.federatedModules.set(moduleId, result);

          if (this.config.debugMode) {
            console.log(`📦 Tracked federated module: ${moduleId}`);
          }
        }

        return result;
      };
    }
  }

  private setupMobileSync(): void {
    // Set up bridge connection for mobile-web sync
    this.bridgeConnection = this.createBridgeConnection();

    if (this.bridgeConnection) {
      this.bridgeConnection.onMessage((message: any) => {
        if (message.type === 'web-component-update') {
          this.handleWebUpdate(message);
        }
      });
    }
  }

  private createBridgeConnection(): any {
    // This would be platform-specific implementation
    // For React Native, this might use WebSocket or native bridge
    if (typeof global !== 'undefined' && (global as any).WebSocket) {
      const ws = new (global as any).WebSocket('ws://localhost:8080/repack-sync');

      return {
        send: (data: any) => ws.send(JSON.stringify(data)),
        onMessage: (callback: (data: any) => void) => {
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              callback(data);
            } catch (error) {
              console.warn('Failed to parse bridge message:', error);
            }
          };
        },
        disconnect: () => ws.close(),
      };
    }

    return null;
  }

  private handleWebUpdate(message: any): void {
    const { moduleId, exports } = message;

    // Apply web updates to mobile if compatible
    if (this.federatedModules.has(moduleId)) {
      this.refreshFederatedModule(moduleId, exports);
    }
  }

  async broadcastUpdate(update: RefreshUpdate): Promise<void> {
    if (update.type === 'module-refresh' && this.bridgeConnection) {
      // Broadcast to other platforms
      await this.bridgeConnection.send({
        type: 'repack-update',
        ...update,
      });
    }
  }
}

// Helper hooks for Re.Pack Fast Refresh
export function useFederatedModulePreservation() {
  return {
    preserve: (moduleId: string, state: any) => {
      if (typeof global !== 'undefined') {
        (global as any).__repack_preserved_modules__ = {
          ...(global as any).__repack_preserved_modules__,
          [moduleId]: state,
        };
      }
    },
    restore: (moduleId: string) => {
      if (typeof global !== 'undefined') {
        return (global as any).__repack_preserved_modules__?.[moduleId];
      }
      return null;
    },
  };
}

export function useMobileStatePreservation() {
  return {
    preserve: (componentName: string, state: any) => {
      if (typeof global !== 'undefined') {
        (global as any).__repack_preserved_mobile_state__ = {
          ...(global as any).__repack_preserved_mobile_state__,
          [componentName]: state,
        };
      }
    },
    restore: (componentName: string) => {
      if (typeof global !== 'undefined') {
        return (global as any).__repack_preserved_mobile_state__?.[componentName];
      }
      return null;
    },
  };
}
