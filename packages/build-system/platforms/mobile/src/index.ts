/**
 * Katalyst Mobile System
 *
 * Complete mobile app development system using RSpeedy (Lynx)
 * Supports iOS and Android with native performance
 */

export * from './components';
export * from './native-modules';
export * from './build-system';
export * from './deployment';
export * from './bridge';

// Re-export RSpeedy hook
export { useRspeedy, type RspeedyConfig, type RspeedyBuildResult } from '../hooks/use-rspeedy';

// Mobile-specific types
export interface MobileApp {
  id: string;
  name: string;
  version: string;
  platform: 'ios' | 'android' | 'both';
  bundleId: string;
  icon: string;
  splashScreen: string;
  permissions: string[];
  features: string[];
}

export interface MobileConfig {
  app: MobileApp;
  build: {
    ios?: IOSBuildConfig;
    android?: AndroidBuildConfig;
  };
  runtime: {
    jsEngine: 'hermes' | 'jsc' | 'v8';
    enableMultithreading: boolean;
    enableWASM: boolean;
  };
  optimization: {
    bundleSize: boolean;
    startupTime: boolean;
    memoryUsage: boolean;
  };
}

export interface IOSBuildConfig {
  teamId: string;
  certificateType: 'development' | 'distribution';
  provisioningProfile?: string;
  deploymentTarget: string;
  supportedDevices: ('iphone' | 'ipad')[];
  capabilities: string[];
}

export interface AndroidBuildConfig {
  packageName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  compileSdkVersion: number;
  versionCode: number;
  signingConfig?: {
    keystore: string;
    keystorePassword: string;
    keyAlias: string;
    keyPassword: string;
  };
}

// Platform detection utilities
export const Platform = {
  OS:
    typeof window !== 'undefined' && window.navigator
      ? /iPhone|iPad|iPod/.test(window.navigator.userAgent)
        ? 'ios'
        : /Android/.test(window.navigator.userAgent)
          ? 'android'
          : 'web'
      : 'web',

  isIOS: () => Platform.OS === 'ios',
  isAndroid: () => Platform.OS === 'android',
  isWeb: () => Platform.OS === 'web',
  isMobile: () => Platform.OS !== 'web',

  select: <T extends Record<string, any>>(options: T): T[keyof T] => {
    return options[Platform.OS] || options.default;
  },
};

// Dimensions utilities
export const Dimensions = {
  get: (dimension: 'window' | 'screen') => {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }

    if (dimension === 'window') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    return {
      width: window.screen.width,
      height: window.screen.height,
    };
  },

  addEventListener: (
    type: 'change',
    handler: (dimensions: { window: any; screen: any }) => void
  ) => {
    if (typeof window === 'undefined') return;

    const listener = () => {
      handler({
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
      });
    };

    window.addEventListener('resize', listener);
    window.addEventListener('orientationchange', listener);

    return {
      remove: () => {
        window.removeEventListener('resize', listener);
        window.removeEventListener('orientationchange', listener);
      },
    };
  },
};

// Device utilities
export const Device = {
  getModel: () => {
    if (Platform.isIOS()) {
      // iOS device detection
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          // Parse iOS device from GPU info
          return renderer;
        }
      }
    }
    return navigator.userAgent;
  },

  hasNotch: () => {
    if (!Platform.isIOS()) return false;

    // Check for iPhone X and later notch
    const ratio = window.screen.height / window.screen.width;
    return ratio > 2;
  },

  hasDynamicIsland: () => {
    if (!Platform.isIOS()) return false;

    // Check for iPhone 14 Pro and later
    const width = window.screen.width;
    const height = window.screen.height;
    return (width === 393 && height === 852) || (width === 430 && height === 932);
  },

  getPixelRatio: () => window.devicePixelRatio || 1,
};

// Permission utilities
export const Permissions = {
  request: async (permission: string): Promise<boolean> => {
    if (Platform.isWeb()) {
      // Web permission API
      if (permission === 'camera') {
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    // Native permission handling through bridge
    const { bridgeToNative } = await import('../hooks/use-rspeedy');
    return bridgeToNative('Permissions', 'request', { permission });
  },

  check: async (permission: string): Promise<boolean> => {
    if (Platform.isWeb()) {
      // Web permission check
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: permission as any });
          return result.state === 'granted';
        } catch {
          return false;
        }
      }
      return false;
    }

    // Native permission check through bridge
    const { bridgeToNative } = await import('../hooks/use-rspeedy');
    return bridgeToNative('Permissions', 'check', { permission });
  },
};

// App lifecycle events
export const AppState = {
  currentState: 'active' as 'active' | 'background' | 'inactive',

  addEventListener: (type: 'change', handler: (state: string) => void) => {
    if (typeof document === 'undefined') return { remove: () => {} };

    const handleVisibilityChange = () => {
      AppState.currentState = document.hidden ? 'background' : 'active';
      handler(AppState.currentState);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return {
      remove: () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      },
    };
  },
};
