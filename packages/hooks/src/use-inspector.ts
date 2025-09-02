/**
 * Inspector Integration Hooks for Katalyst Core
 *
 * Comprehensive hook library for React component inspection and debugging.
 * Integrates rsbuild-plugin-react-inspector with Katalyst's superior React patterns.
 *
 * ARCHITECTURAL PRINCIPLE: These hooks enhance development workflow without replacement.
 * Katalyst remains superior for state management, routing, and components.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type InspectorContextValue,
  useInspector,
} from '../components/InspectorRuntimeProvider.tsx';
import type { InspectorComponent, InspectorSession } from '../integrations/inspector.ts';

// Core Inspector hook - main integration point
export function useInspectorCore() {
  const inspector = useInspector();

  return useMemo(
    () => ({
      // Core status
      isEnabled: inspector.isEnabled,
      isDevelopment: inspector.isDevelopment,
      isInitialized: inspector.isInitialized,
      error: inspector.error,
      config: inspector.config,

      // Integration metadata
      integration: inspector.integration,

      // Quick access to core methods
      selectComponent: inspector.actions.selectComponent,
      toggleInspectionMode: inspector.actions.toggleInspectionMode,
      navigateToSource: inspector.actions.navigateToSource,
      searchComponents: inspector.actions.searchComponents,
    }),
    [inspector]
  );
}

// Component inspection hook with state management
export function useComponentInspection() {
  const inspector = useInspector();
  const [inspectionHistory, setInspectionHistory] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const selectComponent = useCallback(
    (componentId: string) => {
      inspector.actions.selectComponent(componentId);
      setInspectionHistory((prev) => {
        const newHistory = [componentId, ...prev.filter((id) => id !== componentId)];
        return newHistory.slice(0, 10); // Keep last 10
      });
    },
    [inspector.actions]
  );

  const searchComponents = useCallback(
    (query: string) => {
      setSearchQuery(query);
      inspector.actions.searchComponents(query);
    },
    [inspector.actions]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    inspector.actions.clearSearch();
  }, [inspector.actions]);

  const navigateToSource = useCallback(
    (component?: InspectorComponent) => {
      const target = component || inspector.inspection.selectedComponent;
      if (target) {
        inspector.actions.navigateToSource(target);
      }
    },
    [inspector.actions, inspector.inspection.selectedComponent]
  );

  return {
    // Current state
    selectedComponent: inspector.inspection.selectedComponent,
    hoveredComponent: inspector.inspection.hoveredComponent,
    componentTree: inspector.inspection.componentTree,
    searchResults: inspector.inspection.searchResults,
    inspectionMode: inspector.inspection.inspectionMode,

    // Search state
    searchQuery,
    isSearching: searchQuery.length > 0,

    // History
    inspectionHistory,
    clearHistory: () => setInspectionHistory([]),

    // Actions
    selectComponent,
    hoverComponent: inspector.actions.hoverComponent,
    unhoverComponent: inspector.actions.unhoverComponent,
    toggleInspectionMode: inspector.actions.toggleInspectionMode,
    navigateToSource,
    searchComponents,
    clearSearch,

    // Utility
    getComponentById: (id: string) => inspector.inspection.componentTree.find((c) => c.id === id),
    getComponentsByName: (name: string) =>
      inspector.inspection.componentTree.filter((c) =>
        c.name.toLowerCase().includes(name.toLowerCase())
      ),
  };
}

// Performance monitoring hook
export function useInspectorPerformance() {
  const inspector = useInspector();
  const [performanceSnapshot, setPerformanceSnapshot] = useState<{
    timestamp: number;
    metrics: Array<{ component: string; renderTime: number; rerenderCount: number }>;
  } | null>(null);

  const takePerformanceSnapshot = useCallback(() => {
    const metrics = Array.from(inspector.performance.metrics.entries()).map(([id, data]) => ({
      component: data.name || id,
      renderTime: data.performance?.renderTime || 0,
      rerenderCount: data.performance?.rerenderCount || 0,
    }));

    setPerformanceSnapshot({
      timestamp: Date.now(),
      metrics,
    });
  }, [inspector.performance.metrics]);

  const getSlowComponents = useCallback(
    (threshold = 16) => {
      return Array.from(inspector.performance.metrics.entries())
        .filter(([, data]) => (data.performance?.renderTime || 0) > threshold)
        .map(([id, data]) => ({
          id,
          name: data.name,
          renderTime: data.performance?.renderTime || 0,
        }))
        .sort((a, b) => b.renderTime - a.renderTime);
    },
    [inspector.performance.metrics]
  );

  const getFrequentlyRerendering = useCallback(
    (threshold = 5) => {
      return Array.from(inspector.performance.metrics.entries())
        .filter(([, data]) => (data.performance?.rerenderCount || 0) > threshold)
        .map(([id, data]) => ({
          id,
          name: data.name,
          rerenderCount: data.performance?.rerenderCount || 0,
        }))
        .sort((a, b) => b.rerenderCount - a.rerenderCount);
    },
    [inspector.performance.metrics]
  );

  return {
    // Status
    enabled: inspector.performance.enabled,
    metrics: inspector.performance.metrics,
    alerts: inspector.performance.alerts,

    // Snapshot functionality
    performanceSnapshot,
    takePerformanceSnapshot,
    clearSnapshot: () => setPerformanceSnapshot(null),

    // Analysis
    getSlowComponents,
    getFrequentlyRerendering,
    getTotalComponents: () => inspector.performance.metrics.size,
    getAverageRenderTime: () => {
      const metrics = Array.from(inspector.performance.metrics.values());
      const totalTime = metrics.reduce((sum, data) => sum + (data.performance?.renderTime || 0), 0);
      return metrics.length > 0 ? totalTime / metrics.length : 0;
    },

    // Actions
    clearMetrics: inspector.performance.clearMetrics,
    clearAlerts: () => {
      inspector.performance.alerts.length = 0;
    },
  };
}

// Session management hook
export function useInspectorSession() {
  const inspector = useInspector();
  const [sessionStats, setSessionStats] = useState<{
    componentsInspected: number;
    averageInspectionTime: number;
    totalInspections: number;
  }>({
    componentsInspected: 0,
    averageInspectionTime: 0,
    totalInspections: 0,
  });

  const startSession = useCallback(() => {
    const session = inspector.session.startSession();
    setSessionStats({
      componentsInspected: 0,
      averageInspectionTime: 0,
      totalInspections: 0,
    });
    return session;
  }, [inspector.session]);

  const endSession = useCallback(() => {
    inspector.session.endSession();
    setSessionStats({
      componentsInspected: 0,
      averageInspectionTime: 0,
      totalInspections: 0,
    });
  }, [inspector.session]);

  const updateSessionStats = useCallback(() => {
    const current = inspector.session.current;
    if (current) {
      setSessionStats({
        componentsInspected: current.components.size,
        averageInspectionTime: current.performance.averageRenderTime,
        totalInspections: current.inspectionHistory.length,
      });
    }
  }, [inspector.session.current]);

  return {
    // Current session
    currentSession: inspector.session.current,
    sessionHistory: inspector.session.history,
    isSessionActive: inspector.session.current !== null,

    // Session stats
    sessionStats,
    updateSessionStats,

    // Actions
    startSession,
    endSession,
    clearHistory: inspector.session.clearHistory,
  };
}

// DevTools integration hook
export function useInspectorDevTools() {
  const inspector = useInspector();
  const [devtoolsVisible, setDevtoolsVisible] = useState(false);

  const toggleDevTools = useCallback(() => {
    setDevtoolsVisible((prev) => !prev);
  }, []);

  const openInReactDevTools = useCallback(
    (componentId?: string) => {
      if (inspector.devtools.reactDevtools) {
        console.log('Opening in React DevTools:', componentId);
        // In a real implementation, this would communicate with React DevTools
      }
    },
    [inspector.devtools.reactDevtools]
  );

  const openInZustandDevTools = useCallback(() => {
    if (inspector.devtools.zustandDevtools) {
      console.log('Opening Zustand DevTools');
      // In a real implementation, this would open Zustand DevTools
    }
  }, [inspector.devtools.zustandDevtools]);

  return {
    // DevTools status
    reactDevtools: inspector.devtools.reactDevtools,
    zustandDevtools: inspector.devtools.zustandDevtools,
    tanstackDevtools: inspector.devtools.tanstackDevtools,
    katalystEnhanced: inspector.devtools.katalystEnhanced,

    // UI state
    devtoolsVisible,
    toggleDevTools,

    // Integration actions
    openInReactDevTools,
    openInZustandDevTools,

    // Theme and UI
    theme: inspector.devtools.ui.theme,
    position: inspector.devtools.ui.position,
  };
}

// Component tracking hook for automatic inspection
export function useComponentTracking(componentName?: string) {
  const inspector = useInspector();
  const componentId = useRef<string>(`${componentName || 'Component'}-${Date.now()}`);
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    if (!inspector.isEnabled) return;

    renderCount.current++;
    lastRenderTime.current = Date.now();

    // Track component performance
    if (inspector.performance.enabled) {
      const renderTime = performance.now();

      inspector.performance.metrics.set(componentId.current, {
        id: componentId.current,
        name: componentName || 'Component',
        mountTime: mountTime.current,
        renderCount: renderCount.current,
        performance: {
          renderTime: renderTime,
          rerenderCount: renderCount.current,
          lastRenderTime: lastRenderTime.current,
        },
      });
    }
  });

  const markAsSelected = useCallback(() => {
    inspector.actions.selectComponent(componentId.current);
  }, [inspector.actions]);

  const markAsHovered = useCallback(() => {
    inspector.actions.hoverComponent(componentId.current);
  }, [inspector.actions]);

  const unmarkAsHovered = useCallback(() => {
    inspector.actions.unhoverComponent();
  }, [inspector.actions]);

  return {
    componentId: componentId.current,
    renderCount: renderCount.current,
    isSelected: inspector.inspection.selectedComponent?.id === componentId.current,
    isHovered: inspector.inspection.hoveredComponent?.id === componentId.current,
    markAsSelected,
    markAsHovered,
    unmarkAsHovered,
  };
}

// Source navigation hook
export function useSourceNavigation() {
  const inspector = useInspector();
  const [navigationHistory, setNavigationHistory] = useState<
    Array<{
      component: string;
      file: string;
      timestamp: number;
    }>
  >([]);

  const navigateToSource = useCallback(
    (component: InspectorComponent) => {
      if (inspector.config.features.sourceNavigation) {
        inspector.actions.navigateToSource(component);

        setNavigationHistory((prev) => [
          {
            component: component.name,
            file: component.file,
            timestamp: Date.now(),
          },
          ...prev.slice(0, 9), // Keep last 10
        ]);
      }
    },
    [inspector.actions, inspector.config.features.sourceNavigation]
  );

  const navigateToSelectedSource = useCallback(() => {
    if (inspector.inspection.selectedComponent) {
      navigateToSource(inspector.inspection.selectedComponent);
    }
  }, [inspector.inspection.selectedComponent, navigateToSource]);

  return {
    // Status
    enabled: inspector.config.features.sourceNavigation,
    editorCommand: inspector.config.editor.command,

    // History
    navigationHistory,
    clearHistory: () => setNavigationHistory([]),

    // Actions
    navigateToSource,
    navigateToSelectedSource,

    // Quick navigation
    navigateToFile: (file: string, line?: number, column?: number) => {
      const mockComponent: InspectorComponent = {
        id: 'temp',
        name: 'File',
        displayName: 'File',
        file,
        line: line || 1,
        column: column || 1,
        props: {},
        state: {},
        hooks: [],
        children: [],
        parent: null,
        source: { original: '', compiled: '' },
        performance: { renderTime: 0, rerenderCount: 0, lastRenderTime: 0 },
      };
      navigateToSource(mockComponent);
    },
  };
}

// Hot keys hook for keyboard shortcuts
export function useInspectorHotKeys() {
  const inspector = useInspector();

  useEffect(() => {
    if (!inspector.isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { hotKeys } = inspector.config;

      // Check for inspect hotkey
      if (
        hotKeys.inspect.every((key) =>
          key === 'ctrl'
            ? event.ctrlKey
            : key === 'shift'
              ? event.shiftKey
              : key === 'alt'
                ? event.altKey
                : event.key.toLowerCase() === key.toLowerCase()
        )
      ) {
        event.preventDefault();
        inspector.actions.toggleInspectionMode();
        return;
      }

      // Check for toggle hotkey
      if (
        hotKeys.toggle.every((key) =>
          key === 'ctrl'
            ? event.ctrlKey
            : key === 'shift'
              ? event.shiftKey
              : key === 'alt'
                ? event.altKey
                : event.key.toLowerCase() === key.toLowerCase()
        )
      ) {
        event.preventDefault();
        // Toggle DevTools UI
        return;
      }

      // Check for navigate hotkey
      if (
        hotKeys.navigate.every((key) =>
          key === 'ctrl'
            ? event.ctrlKey
            : key === 'shift'
              ? event.shiftKey
              : key === 'alt'
                ? event.altKey
                : event.key.toLowerCase() === key.toLowerCase()
        )
      ) {
        event.preventDefault();
        if (inspector.inspection.selectedComponent) {
          inspector.actions.navigateToSource(inspector.inspection.selectedComponent);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inspector]);

  return {
    hotKeys: inspector.config.hotKeys,
    enabled: inspector.isEnabled,
  };
}

// Export all hooks
export {
  useInspectorCore,
  useComponentInspection,
  useInspectorPerformance,
  useInspectorSession,
  useInspectorDevTools,
  useComponentTracking,
  useSourceNavigation,
  useInspectorHotKeys,
};

// Re-export the main useInspector hook for convenience
export { useInspector };
