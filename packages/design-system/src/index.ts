/**
 * Katalyst Design System
 *
 * A state-of-the-art React design system combining:
 * - Ant Design Pro for enterprise components
 * - Aceternity UI for modern animations and effects
 * - Native multithreading support
 * - Mobile-first responsive design
 * - Advanced theming with Zustand
 */

// Core exports
export { KatalystDesignSystem } from './KatalystDesignSystem';
export type { ThemeMode, ColorScheme, DeviceType, Direction } from './design-system-store';

// Primitives - Radix UI based components
export * from './primitives';

// Design Tokens
export * from './tokens';

// Theme and configuration
export { tokens } from './tokens';
export { themes, getTheme, createAntdTheme, createMobileTheme } from './antd-config';
export { ThemeProvider } from './theme-provider';

// State management
export {
  useDesignSystemStore,
  useTheme,
  useIsMobile,
  useIsTablet,
  useAnimations,
  useComponentSize,
  useDirection,
  useDeviceDetection,
} from './design-system-store';

// Design system hooks
export { useAntdToken, useDesignSystem } from './KatalystDesignSystem';

// Components - Re-export everything from components
export * from './components';

// Aceternity-enhanced components
export { AceternityCard, AceternityCardPresets } from './components/AceternityCard';
export { AceternityButton, AceternityButtonPresets } from './components/AceternityButton';

// Arco Design Integration
export { ArcoProvider, useArcoContext, withArco } from './components/ArcoProvider';
export {
  Button as ArcoButton,
  Input as ArcoInput,
  Select as ArcoSelect,
  Table as ArcoTable,
  Form as ArcoForm,
  Card as ArcoCard,
  Modal as ArcoModal,
  Drawer as ArcoDrawer,
  KatalystTypography,
} from './components/ArcoComponents';
export { ArcoThemeCustomizer } from './components/ArcoThemeCustomizer';
export { ArcoShowcase } from './components/ArcoShowcase';

// Original components
export { AnimatedButtonPresets } from './components/AnimatedButton';
export { GlowCardPresets } from './components/GlowCard';

// Animation system
export * from './animation-system';

// Utility functions
export { cn } from './utils/cn';

// Type exports
export type { ProFormField, ProFormSection, ProFormProps } from './components/ProForm';
export type { ProLayoutProps } from './components/ProLayout';
export type { MobileNavItem, MobileNavProps } from './components/MobileNav';
export type { AnimatedButtonProps } from './components/AnimatedButton';
export type { GlowCardProps } from './components/GlowCard';

// Constants
export const DESIGN_SYSTEM_VERSION = '1.0.0';
export const SUPPORTED_FRAMEWORKS = ['core', 'next', 'remix'] as const;
export const SUPPORTED_THEMES = ['light', 'dark', 'system'] as const;

// Feature flags
export const FEATURES = {
  ANIMATIONS: true,
  MOBILE_OPTIMIZATIONS: true,
  MULTITHREADING: true,
  ADVANCED_THEMING: true,
  GESTURE_SUPPORT: true,
  HAPTIC_FEEDBACK: true,
  OFFLINE_SUPPORT: false, // Coming soon
  AI_ASSISTANCE: false, // Coming soon
} as const;

// Default configuration
export const DEFAULT_CONFIG = {
  theme: 'system' as ThemeMode,
  colorScheme: 'default' as ColorScheme,
  animations: true,
  componentSize: 'middle' as const,
  direction: 'ltr' as Direction,
  mobile: {
    breakpoint: 768,
    touchOptimized: true,
    gesturesEnabled: true,
    hapticFeedback: true,
  },
  performance: {
    lazyLoad: true,
    virtualScroll: true,
    debounceDelay: 300,
  },
} as const;

// CSS injection for global styles
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* Katalyst Design System Global Styles */
    :root {
      --katalyst-version: '${DESIGN_SYSTEM_VERSION}';
    }
    
    /* Animation keyframes */
    @keyframes glow {
      0%, 100% { opacity: 0; transform: translateX(-100%); }
      50% { opacity: 1; transform: translateX(100%); }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes aurora {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    /* Utility classes */
    .katalyst-no-select {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    .katalyst-hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    .katalyst-hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    
    /* Mobile optimizations */
    .touch-manipulation {
      touch-action: manipulation;
    }
    
    /* Accessibility */
    .reduce-motion * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
    
    .high-contrast {
      filter: contrast(1.5);
    }
    
    /* Debug helpers */
    .debug-grid {
      background-image: 
        repeating-linear-gradient(0deg, rgba(255,0,0,0.1) 0px, transparent 1px, transparent 8px, rgba(255,0,0,0.1) 8px),
        repeating-linear-gradient(90deg, rgba(255,0,0,0.1) 0px, transparent 1px, transparent 8px, rgba(255,0,0,0.1) 8px);
    }
    
    .debug-spacing * {
      outline: 1px solid rgba(0,255,0,0.3);
    }
    
    .debug-colors * {
      filter: hue-rotate(90deg);
    }
  `;
  document.head.appendChild(style);
}

// Initialize design system
export function initializeKatalystDesignSystem(config?: Partial<typeof DEFAULT_CONFIG>) {
  if (typeof window === 'undefined') return;

  // Merge with default config
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Apply initial configuration
  const store = useDesignSystemStore.getState();

  if (finalConfig.theme !== 'system') {
    store.setThemeMode(finalConfig.theme);
  }

  store.setColorScheme(finalConfig.colorScheme);
  store.setComponentSize(finalConfig.componentSize);
  store.setDirection(finalConfig.direction);

  if (!finalConfig.animations) {
    store.toggleAnimations();
  }

  // Mobile configuration
  if (finalConfig.mobile.touchOptimized) {
    store.setTouchOptimized(true);
  }

  if (finalConfig.mobile.gesturesEnabled) {
    store.setGesturesEnabled(true);
  }

  if (finalConfig.mobile.hapticFeedback) {
    store.setHapticFeedback(true);
  }

  // Set up device detection
  useDeviceDetection();

  console.log(`🎨 Katalyst Design System v${DESIGN_SYSTEM_VERSION} initialized`);
}

// Auto-initialize if in browser
if (typeof window !== 'undefined' && typeof window.KATALYST_AUTO_INIT !== 'undefined') {
  initializeKatalystDesignSystem(window.KATALYST_AUTO_INIT);
}
