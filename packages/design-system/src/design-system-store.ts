import type { ThemeConfig } from 'antd';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { getTheme } from './antd-config';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'default' | 'compact' | 'comfortable';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Direction = 'ltr' | 'rtl';

interface DesignSystemState {
  // Theme
  themeMode: ThemeMode;
  systemTheme: 'light' | 'dark';
  activeTheme: 'light' | 'dark';
  customTheme?: Partial<ThemeConfig>;

  // Layout
  colorScheme: ColorScheme;
  direction: Direction;
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;

  // Features
  animations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  focusVisible: boolean;

  // Component defaults
  componentSize: 'small' | 'middle' | 'large';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';

  // Mobile specific
  touchOptimized: boolean;
  gesturesEnabled: boolean;
  hapticFeedback: boolean;

  // Developer tools
  showGrid: boolean;
  showSpacing: boolean;
  showColors: boolean;
  debugMode: boolean;
}

interface DesignSystemActions {
  // Theme actions
  setThemeMode: (mode: ThemeMode) => void;
  setSystemTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  applyCustomTheme: (theme: Partial<ThemeConfig>) => void;
  resetTheme: () => void;

  // Layout actions
  setColorScheme: (scheme: ColorScheme) => void;
  setDirection: (dir: Direction) => void;
  setDeviceType: (type: DeviceType) => void;

  // Feature toggles
  toggleAnimations: () => void;
  setReducedMotion: (reduced: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setFocusVisible: (visible: boolean) => void;

  // Component actions
  setComponentSize: (size: 'small' | 'middle' | 'large') => void;
  setBorderRadius: (radius: 'none' | 'small' | 'medium' | 'large' | 'full') => void;

  // Mobile actions
  setTouchOptimized: (optimized: boolean) => void;
  setGesturesEnabled: (enabled: boolean) => void;
  setHapticFeedback: (enabled: boolean) => void;

  // Developer actions
  toggleDebugMode: () => void;
  toggleGrid: () => void;
  toggleSpacing: () => void;
  toggleColors: () => void;

  // Computed getters
  getActiveTheme: () => ThemeConfig;
  getBreakpoint: () => 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isAccessibilityMode: () => boolean;
}

export const useDesignSystemStore = create<DesignSystemState & DesignSystemActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        themeMode: 'system',
        systemTheme: 'light',
        activeTheme: 'light',
        colorScheme: 'default',
        direction: 'ltr',
        deviceType: 'desktop',
        isMobile: false,
        isTablet: false,
        animations: true,
        reducedMotion: false,
        highContrast: false,
        focusVisible: true,
        componentSize: 'middle',
        borderRadius: 'medium',
        touchOptimized: false,
        gesturesEnabled: true,
        hapticFeedback: true,
        showGrid: false,
        showSpacing: false,
        showColors: false,
        debugMode: false,

        // Theme actions
        setThemeMode: (mode) => {
          set((state) => {
            const activeTheme = mode === 'system' ? state.systemTheme : mode;
            return { themeMode: mode, activeTheme };
          });
        },

        setSystemTheme: (theme) => {
          set((state) => {
            const activeTheme = state.themeMode === 'system' ? theme : state.activeTheme;
            return { systemTheme: theme, activeTheme };
          });
        },

        toggleTheme: () => {
          set((state) => {
            const newTheme = state.activeTheme === 'light' ? 'dark' : 'light';
            return {
              themeMode: newTheme,
              activeTheme: newTheme,
            };
          });
        },

        applyCustomTheme: (theme) => set({ customTheme: theme }),

        resetTheme: () => set({ customTheme: undefined }),

        // Layout actions
        setColorScheme: (scheme) => set({ colorScheme: scheme }),

        setDirection: (dir) => set({ direction: dir }),

        setDeviceType: (type) => {
          set({
            deviceType: type,
            isMobile: type === 'mobile',
            isTablet: type === 'tablet',
            touchOptimized: type === 'mobile' || type === 'tablet',
          });
        },

        // Feature toggles
        toggleAnimations: () => set((state) => ({ animations: !state.animations })),

        setReducedMotion: (reduced) => set({ reducedMotion: reduced, animations: !reduced }),

        setHighContrast: (enabled) => set({ highContrast: enabled }),

        setFocusVisible: (visible) => set({ focusVisible: visible }),

        // Component actions
        setComponentSize: (size) => set({ componentSize: size }),

        setBorderRadius: (radius) => set({ borderRadius: radius }),

        // Mobile actions
        setTouchOptimized: (optimized) => set({ touchOptimized: optimized }),

        setGesturesEnabled: (enabled) => set({ gesturesEnabled: enabled }),

        setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),

        // Developer actions
        toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),

        toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

        toggleSpacing: () => set((state) => ({ showSpacing: !state.showSpacing })),

        toggleColors: () => set((state) => ({ showColors: !state.showColors })),

        // Computed getters
        getActiveTheme: () => {
          const state = get();
          const baseTheme = getTheme(state.activeTheme, state.isMobile || state.isTablet);

          if (state.customTheme) {
            return {
              ...baseTheme,
              token: { ...baseTheme.token, ...state.customTheme.token },
              components: { ...baseTheme.components, ...state.customTheme.components },
            };
          }

          return baseTheme;
        },

        getBreakpoint: () => {
          const width = typeof window !== 'undefined' ? window.innerWidth : 1024;

          if (width < 640) return 'xs';
          if (width < 768) return 'sm';
          if (width < 1024) return 'md';
          if (width < 1280) return 'lg';
          if (width < 1536) return 'xl';
          return '2xl';
        },

        isAccessibilityMode: () => {
          const state = get();
          return state.reducedMotion || state.highContrast;
        },
      }),
      {
        name: 'katalyst-design-system',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          themeMode: state.themeMode,
          colorScheme: state.colorScheme,
          direction: state.direction,
          animations: state.animations,
          componentSize: state.componentSize,
          borderRadius: state.borderRadius,
          customTheme: state.customTheme,
        }),
      }
    )
  )
);

// Selectors for common use cases
export const useTheme = () => useDesignSystemStore((state) => state.activeTheme);
export const useIsMobile = () => useDesignSystemStore((state) => state.isMobile);
export const useIsTablet = () => useDesignSystemStore((state) => state.isTablet);
export const useAnimations = () =>
  useDesignSystemStore((state) => state.animations && !state.reducedMotion);
export const useComponentSize = () => useDesignSystemStore((state) => state.componentSize);
export const useDirection = () => useDesignSystemStore((state) => state.direction);

// Device detection hook
export const useDeviceDetection = () => {
  const setDeviceType = useDesignSystemStore((state) => state.setDeviceType);
  const setSystemTheme = useDesignSystemStore((state) => state.setSystemTheme);

  if (typeof window !== 'undefined') {
    // Device type detection
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    // System theme detection
    const checkSystemTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setSystemTheme(isDark ? 'dark' : 'light');
    };

    // Reduced motion detection
    const checkReducedMotion = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      useDesignSystemStore.getState().setReducedMotion(prefersReducedMotion);
    };

    // Initial checks
    checkDevice();
    checkSystemTheme();
    checkReducedMotion();

    // Set up listeners
    window.addEventListener('resize', checkDevice);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', checkSystemTheme);
    window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', checkReducedMotion);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }
};
