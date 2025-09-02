import { StyleProvider, createCache } from '@ant-design/cssinjs';
import { App, ConfigProvider, theme as antdTheme } from 'antd';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { cn } from '../utils';
import { useDesignSystemStore, useDeviceDetection } from './design-system-store';
import { ThemeProvider as KatalystThemeProvider } from './theme-provider';

// Import Ant Design Pro locale
import enUS from 'antd/locale/en_US';
import 'antd/dist/reset.css';

interface KatalystDesignSystemProps extends PropsWithChildren {
  prefixCls?: string;
  locale?: typeof enUS;
  container?: HTMLElement;
  enableSSR?: boolean;
  framework?: 'core' | 'next' | 'remix';
}

// Create style cache for SSR
const createStyleCache = (container?: HTMLElement) => {
  if (typeof window === 'undefined') return undefined;

  return createCache({
    container: container || document.head,
    key: 'katalyst',
    prepend: true,
  });
};

/**
 * KatalystDesignSystem - Unified design system provider
 * Combines Ant Design Pro, Aceternity UI, and Katalyst components
 */
export const KatalystDesignSystem: React.FC<KatalystDesignSystemProps> = ({
  children,
  prefixCls = 'katalyst',
  locale = enUS,
  container,
  enableSSR = true,
  framework = 'core',
}) => {
  // Initialize device detection
  useDeviceDetection();

  // Get design system state
  const {
    getActiveTheme,
    direction,
    componentSize,
    animations,
    reducedMotion,
    highContrast,
    focusVisible,
    debugMode,
    showGrid,
    showSpacing,
    showColors,
  } = useDesignSystemStore();

  // Get the active theme configuration
  const activeTheme = getActiveTheme();

  // Create style cache for SSR
  const styleCache = useMemo(() => createStyleCache(container), [container]);

  // Apply global styles based on state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Apply accessibility classes
    root.classList.toggle('reduce-motion', reducedMotion);
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('focus-visible', focusVisible);

    // Apply debug classes
    root.classList.toggle('debug-grid', showGrid);
    root.classList.toggle('debug-spacing', showSpacing);
    root.classList.toggle('debug-colors', showColors);

    // Apply direction
    root.setAttribute('dir', direction);

    // Apply component size as CSS variable
    root.style.setProperty('--katalyst-component-size', componentSize);

    // Apply animation preference
    root.style.setProperty('--katalyst-animations', animations ? '1' : '0');

    // Framework-specific class
    root.setAttribute('data-framework', framework);
  }, [
    reducedMotion,
    highContrast,
    focusVisible,
    showGrid,
    showSpacing,
    showColors,
    direction,
    componentSize,
    animations,
    framework,
  ]);

  // Render providers
  const content = (
    <ConfigProvider
      theme={activeTheme}
      locale={locale}
      direction={direction}
      prefixCls={prefixCls}
      componentSize={componentSize}
      // Enable CSS variables for dynamic theming
      cssVar={{ key: 'katalyst' }}
      // Wave effect configuration
      wave={{ disabled: reducedMotion }}
      // Form configuration
      form={{
        requiredMark: 'optional',
        colon: false,
      }}
      // Space configuration
      space={{
        size: componentSize,
      }}
      // Virtual scroll configuration
      virtual={true}
      // Warning configuration for development
      warning={{ strict: debugMode }}
    >
      <App
        className={cn('katalyst-app', `katalyst-${framework}`, {
          'katalyst-mobile': useDesignSystemStore.getState().isMobile,
          'katalyst-tablet': useDesignSystemStore.getState().isTablet,
          'katalyst-debug': debugMode,
        })}
        style={{
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        <KatalystThemeProvider>{children}</KatalystThemeProvider>
      </App>
    </ConfigProvider>
  );

  // Wrap with style provider for SSR
  if (enableSSR && styleCache) {
    return (
      <StyleProvider cache={styleCache} ssrInline>
        {content}
      </StyleProvider>
    );
  }

  return content;
};

/**
 * Hook to access Ant Design theme tokens within components
 */
export const useAntdToken = () => {
  const { token } = antdTheme.useToken();
  return token;
};

/**
 * Hook to access design system configuration
 */
export const useDesignSystem = () => {
  const store = useDesignSystemStore();
  const token = useAntdToken();

  return {
    ...store,
    token,
    isAccessible: store.isAccessibilityMode(),
    breakpoint: store.getBreakpoint(),
  };
};

// Export enhanced Ant Design Pro components with Aceternity UI integration
export * from './components';

// Re-export design system utilities
export {
  useDesignSystemStore,
  useTheme,
  useIsMobile,
  useIsTablet,
  useAnimations,
  useComponentSize,
  useDirection,
} from './design-system-store';
export { tokens } from './tokens';
export { cn } from '../utils';
