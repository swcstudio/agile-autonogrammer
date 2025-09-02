/**
 * useArco - Comprehensive Arco Design Integration Hook
 *
 * Provides full Arco Design system integration with theme management,
 * component configuration, and performance optimization for Katalyst
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDesignSystemStore } from '../design-system/design-system-store';
import {
  type ArcoComponent,
  type ArcoConfig,
  ArcoIntegration,
  type ArcoTheme,
} from '../integrations/arco';

export interface UseArcoConfig {
  // Theme Configuration
  theme?: Partial<ArcoTheme>;

  // Component Selection
  components?: string[];

  // Locale and RTL
  locale?: string;
  rtl?: boolean;

  // Performance
  lazyLoad?: boolean;
  treeShaking?: boolean;

  // Integration
  syncWithDesignSystem?: boolean;
  autoDetectTheme?: boolean;
}

export interface UseArcoReturn {
  // Theme State
  currentTheme: ArcoTheme;
  isDarkMode: boolean;

  // Component Management
  availableComponents: ArcoComponent[];
  loadedComponents: string[];

  // Theme Actions
  updateTheme: (theme: Partial<ArcoTheme>) => void;
  toggleDarkMode: () => void;
  resetTheme: () => void;

  // Component Actions
  loadComponent: (name: string) => Promise<void>;
  unloadComponent: (name: string) => void;
  getComponentProps: (name: string) => Record<string, any>;

  // Utilities
  generateCSS: () => string;
  exportTheme: () => string;
  importTheme: (themeString: string) => void;

  // Integration Status
  isInitialized: boolean;
  error: Error | null;

  // Performance Metrics
  loadTime: number;
  bundleSize: number;
}

export const useArco = (config: UseArcoConfig = {}): UseArcoReturn => {
  const {
    theme = {},
    components = [],
    locale = 'en-US',
    rtl = false,
    lazyLoad = true,
    treeShaking = true,
    syncWithDesignSystem = true,
    autoDetectTheme = true,
  } = config;

  // Design System Integration
  const { activeTheme, toggleTheme } = useDesignSystemStore();

  // State
  const [arcoIntegration, setArcoIntegration] = useState<ArcoIntegration | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ArcoTheme>({
    primaryColor: '#165DFF',
    successColor: '#00B42A',
    warningColor: '#FF7D00',
    errorColor: '#F53F3F',
    infoColor: '#722ED1',
    borderRadius: 2,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    ...theme,
  });

  const [loadedComponents, setLoadedComponents] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadTime, setLoadTime] = useState(0);
  const [bundleSize, setBundleSize] = useState(0);

  // Initialize Arco Integration
  useEffect(() => {
    const initializeArco = async () => {
      try {
        const startTime = performance.now();
        setError(null);

        const arcoConfig: ArcoConfig = {
          theme: currentTheme,
          components,
          icons: [], // Will be populated by ArcoIntegration
          locale,
          rtl,
          prefixCls: 'arco',
        };

        const integration = new ArcoIntegration(arcoConfig);
        await integration.initialize();

        setArcoIntegration(integration);
        setIsInitialized(true);

        const endTime = performance.now();
        setLoadTime(endTime - startTime);

        // Estimate bundle size (simplified)
        setBundleSize(components.length * 50 + 200); // KB estimate
      } catch (err) {
        setError(err as Error);
        console.error('Failed to initialize Arco Design:', err);
      }
    };

    initializeArco();
  }, [components, locale, rtl]);

  // Sync with Design System
  useEffect(() => {
    if (syncWithDesignSystem && autoDetectTheme) {
      const isDark = activeTheme === 'dark';
      updateThemeForMode(isDark);
    }
  }, [activeTheme, syncWithDesignSystem, autoDetectTheme]);

  // Available components from integration
  const availableComponents = useMemo(() => {
    return arcoIntegration?.getArcoComponents() || [];
  }, [arcoIntegration]);

  // Dark mode detection
  const isDarkMode = useMemo(() => {
    return activeTheme === 'dark' || currentTheme.primaryColor === '#165DFF'; // Simplified check
  }, [activeTheme, currentTheme.primaryColor]);

  // Update theme for dark/light mode
  const updateThemeForMode = useCallback((isDark: boolean) => {
    const modeTheme: Partial<ArcoTheme> = isDark
      ? {
          primaryColor: '#3370FF',
          successColor: '#23D160',
          warningColor: '#FF9500',
          errorColor: '#F56565',
          infoColor: '#9F7AEA',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        }
      : {
          primaryColor: '#165DFF',
          successColor: '#00B42A',
          warningColor: '#FF7D00',
          errorColor: '#F53F3F',
          infoColor: '#722ED1',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        };

    setCurrentTheme((prev) => ({ ...prev, ...modeTheme }));
  }, []);

  // Theme management
  const updateTheme = useCallback(
    (newTheme: Partial<ArcoTheme>) => {
      setCurrentTheme((prev) => ({ ...prev, ...newTheme }));

      // Update Arco integration
      if (arcoIntegration) {
        const updatedConfig: ArcoConfig = {
          theme: { ...currentTheme, ...newTheme },
          components,
          icons: [],
          locale,
          rtl,
          prefixCls: 'arco',
        };

        // Reinitialize with new theme (simplified - in production would be more optimized)
        arcoIntegration.setupCustomTheme();
      }
    },
    [arcoIntegration, currentTheme, components, locale, rtl]
  );

  const toggleDarkMode = useCallback(() => {
    if (syncWithDesignSystem) {
      toggleTheme();
    } else {
      updateThemeForMode(!isDarkMode);
    }
  }, [syncWithDesignSystem, toggleTheme, isDarkMode, updateThemeForMode]);

  const resetTheme = useCallback(() => {
    const defaultTheme: ArcoTheme = {
      primaryColor: '#165DFF',
      successColor: '#00B42A',
      warningColor: '#FF7D00',
      errorColor: '#F53F3F',
      infoColor: '#722ED1',
      borderRadius: 2,
      fontSize: 14,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    };

    setCurrentTheme(defaultTheme);
  }, []);

  // Component management
  const loadComponent = useCallback(
    async (name: string) => {
      if (loadedComponents.includes(name)) return;

      try {
        if (lazyLoad) {
          // Simulate lazy loading
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        setLoadedComponents((prev) => [...prev, name]);

        // Update bundle size estimate
        setBundleSize((prev) => prev + 25);
      } catch (err) {
        console.error(`Failed to load component ${name}:`, err);
        throw err;
      }
    },
    [loadedComponents, lazyLoad]
  );

  const unloadComponent = useCallback((name: string) => {
    setLoadedComponents((prev) => prev.filter((comp) => comp !== name));
    setBundleSize((prev) => Math.max(prev - 25, 0));
  }, []);

  const getComponentProps = useCallback(
    (name: string) => {
      const component = availableComponents.find((comp) => comp.name === name);
      return component?.props || {};
    },
    [availableComponents]
  );

  // Utilities
  const generateCSS = useCallback(() => {
    if (!arcoIntegration) return '';

    const tokens = {
      '--arco-primary': currentTheme.primaryColor,
      '--arco-success': currentTheme.successColor,
      '--arco-warning': currentTheme.warningColor,
      '--arco-error': currentTheme.errorColor,
      '--arco-info': currentTheme.infoColor,
      '--arco-border-radius': `${currentTheme.borderRadius}px`,
      '--arco-font-size': `${currentTheme.fontSize}px`,
      '--arco-font-family': currentTheme.fontFamily,
      '--arco-box-shadow': currentTheme.boxShadow,
    };

    return `:root {\n${Object.entries(tokens)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')}\n}`;
  }, [arcoIntegration, currentTheme]);

  const exportTheme = useCallback(() => {
    return JSON.stringify(currentTheme, null, 2);
  }, [currentTheme]);

  const importTheme = useCallback(
    (themeString: string) => {
      try {
        const importedTheme = JSON.parse(themeString);
        updateTheme(importedTheme);
      } catch (err) {
        console.error('Failed to import theme:', err);
        throw new Error('Invalid theme format');
      }
    },
    [updateTheme]
  );

  return {
    // Theme State
    currentTheme,
    isDarkMode,

    // Component Management
    availableComponents,
    loadedComponents,

    // Theme Actions
    updateTheme,
    toggleDarkMode,
    resetTheme,

    // Component Actions
    loadComponent,
    unloadComponent,
    getComponentProps,

    // Utilities
    generateCSS,
    exportTheme,
    importTheme,

    // Integration Status
    isInitialized,
    error,

    // Performance Metrics
    loadTime,
    bundleSize,
  };
};

export default useArco;
