import type { KatalystIntegration } from '../types/index';

export interface TauriConfig {
  autoInitialize?: boolean;
  platforms?: ('desktop' | 'mobile' | 'web')[];
  features?: {
    nativeMenus?: boolean;
    systemTray?: boolean;
    notifications?: boolean;
    fileSystem?: boolean;
    windowManagement?: boolean;
    nativeDialogs?: boolean;
    devtools?: boolean;
  };
  desktop?: {
    identifier?: string;
    productName?: string;
    version?: string;
    windowConfig?: {
      width?: number;
      height?: number;
      resizable?: boolean;
      fullscreen?: boolean;
      transparent?: boolean;
    };
  };
  mobile?: {
    ios?: {
      bundleIdentifier?: string;
      developmentTeam?: string;
    };
    android?: {
      packageName?: string;
      minSdkVersion?: number;
    };
  };
}

export class TauriIntegration implements KatalystIntegration {
  name = 'tauri' as const;
  type = 'framework' as const;
  enabled = true;
  config: TauriConfig & Record<string, unknown>;

  constructor(config: TauriConfig & Record<string, unknown> = {}) {
    this.config = this.mergeWithDefaults(config);
  }

  private mergeWithDefaults(
    config: TauriConfig & Record<string, unknown>
  ): TauriConfig & Record<string, unknown> {
    return {
      autoInitialize: true,
      platforms: ['desktop', 'mobile', 'web'],
      features: {
        nativeMenus: true,
        systemTray: true,
        notifications: true,
        fileSystem: true,
        windowManagement: true,
        nativeDialogs: true,
        devtools: true,
      },
      desktop: {
        identifier: 'com.katalyst.desktop',
        productName: 'Katalyst Desktop',
        version: '1.0.0',
        windowConfig: {
          width: 1200,
          height: 800,
          resizable: true,
          fullscreen: false,
          transparent: false,
        },
      },
      mobile: {
        ios: {
          bundleIdentifier: 'com.katalyst.mobile',
          developmentTeam: 'KATALYST_TEAM',
        },
        android: {
          packageName: 'com.katalyst.mobile',
          minSdkVersion: 24,
        },
      },
      ...config,
    };
  }

  setupDesktopApp() {
    return {
      name: 'tauri-desktop',
      setup: () => ({
        platform: 'desktop',
        frontend: 'react',
        backend: 'rust',
        features: {
          nativeMenus: this.config.features?.nativeMenus ?? true,
          systemTray: this.config.features?.systemTray ?? true,
          notifications: this.config.features?.notifications ?? true,
          fileSystem: this.config.features?.fileSystem ?? true,
          windowManagement: this.config.features?.windowManagement ?? true,
          nativeDialogs: this.config.features?.nativeDialogs ?? true,
          devtools: this.config.features?.devtools ?? true,
          globalShortcuts: true,
          clipboard: true,
          shell: true,
          updater: true,
          autostart: true,
        },
        buildConfig: {
          identifier: this.config.desktop?.identifier ?? 'com.katalyst.desktop',
          productName: this.config.desktop?.productName ?? 'Katalyst Desktop',
          version: this.config.desktop?.version ?? '1.0.0',
          windowConfig: this.config.desktop?.windowConfig ?? {
            width: 1200,
            height: 800,
            resizable: true,
            fullscreen: false,
            transparent: false,
          },
        },
        tauri: {
          bundle: {
            active: true,
            targets: ['deb', 'appimage', 'nsis', 'msi', 'app', 'dmg'],
            identifier: this.config.desktop?.identifier ?? 'com.katalyst.desktop',
            icon: ['icons/32x32.png', 'icons/128x128.png', 'icons/icon.icns', 'icons/icon.ico'],
            resources: ['resources/*'],
            externalBin: [],
            copyright: 'Copyright © 2025 Katalyst',
            category: 'DeveloperTool',
            shortDescription: 'Katalyst React Framework',
            longDescription: 'A unified React framework for building cross-platform applications',
          },
          security: {
            csp: "default-src 'self'; img-src 'self' asset: https://asset.localhost",
          },
          windows: [
            {
              fullscreen: false,
              resizable: true,
              title: this.config.desktop?.productName ?? 'Katalyst Desktop',
              width: this.config.desktop?.windowConfig?.width ?? 1200,
              height: this.config.desktop?.windowConfig?.height ?? 800,
            },
          ],
          systemTray: {
            iconPath: 'icons/icon.png',
            iconAsTemplate: true,
            menuOnLeftClick: false,
          },
        },
      }),
    };
  }

  setupMobileApp() {
    return {
      name: 'tauri-mobile',
      setup: () => ({
        platform: 'mobile',
        targets: ['ios', 'android'],
        frontend: 'react',
        backend: 'rust',
        features: {
          nativeNavigation: true,
          deviceAPIs: true,
          pushNotifications: true,
          biometricAuth: true,
          cameraAccess: true,
          locationServices: true,
          hapticFeedback: true,
          statusBar: true,
          orientation: true,
          deepLinking: true,
        },
        buildConfig: {
          ios: {
            bundleIdentifier: this.config.mobile?.ios?.bundleIdentifier ?? 'com.katalyst.mobile',
            developmentTeam: this.config.mobile?.ios?.developmentTeam ?? 'KATALYST_TEAM',
            minimumSystemVersion: '13.0',
            frameworks: ['WebKit', 'Security', 'CoreGraphics', 'MobileCoreServices'],
          },
          android: {
            packageName: this.config.mobile?.android?.packageName ?? 'com.katalyst.mobile',
            minSdkVersion: this.config.mobile?.android?.minSdkVersion ?? 24,
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            permissions: [
              'android.permission.INTERNET',
              'android.permission.CAMERA',
              'android.permission.ACCESS_FINE_LOCATION',
              'android.permission.ACCESS_COARSE_LOCATION',
              'android.permission.VIBRATE',
              'android.permission.USE_BIOMETRIC',
              'android.permission.USE_FINGERPRINT',
            ],
          },
        },
        tauri: {
          bundle: {
            active: true,
            targets: ['aab', 'apk'],
            identifier: this.config.mobile?.android?.packageName ?? 'com.katalyst.mobile',
            icon: ['icons/icon.png'],
          },
        },
      }),
    };
  }

  setupUnifiedBuilder() {
    return {
      name: 'tauri-unified',
      setup: () => ({
        platforms: this.config.platforms ?? ['web', 'desktop', 'mobile'],
        sharedCodebase: true,
        rustBackend: true,
        reactFrontend: true,
        features: {
          crossPlatformComponents: true,
          sharedStateManagement: true,
          unifiedBuildSystem: true,
          hotReload: true,
          codeSharing: true,
          universalComponents: true,
          platformAdaptation: true,
          buildOptimization: true,
        },
        architecture: {
          frontend: 'react-typescript',
          backend: 'rust-tauri',
          bundler: 'rspack',
          stateManagement: 'zustand',
          routing: 'react-router',
          styling: 'tailwind-css',
          testing: 'vitest',
        },
        buildTargets: {
          web: {
            bundler: 'rspack',
            output: 'dist/web',
            publicPath: '/',
          },
          desktop: {
            bundler: 'tauri',
            output: 'src-tauri/target',
            targets: ['x86_64-pc-windows-msvc', 'x86_64-apple-darwin', 'x86_64-unknown-linux-gnu'],
          },
          mobile: {
            bundler: 'tauri-mobile',
            output: 'gen/android',
            targets: ['aarch64-linux-android', 'aarch64-apple-ios'],
          },
        },
      }),
    };
  }

  setupWebXRIntegration() {
    return {
      name: 'tauri-webxr',
      setup: () => ({
        platform: 'metaverse',
        technologies: ['webxr', 'webgl', 'wasm', 'three.js'],
        features: {
          vr: true,
          ar: true,
          mixedReality: true,
          spatialTracking: true,
          handTracking: true,
          eyeTracking: true,
          roomScale: true,
          passthrough: true,
          anchors: true,
          planes: true,
          meshes: true,
          lighting: true,
        },
        runtime: {
          wasmOptimized: true,
          rustCompilation: true,
          performanceMode: 'high',
          multithreading: true,
          simdOptimization: true,
        },
        devices: {
          meta: {
            quest2: true,
            quest3: true,
            questPro: true,
          },
          apple: {
            visionPro: true,
          },
          openXR: true,
        },
        apis: {
          webxr: '1.0',
          webgl: '2.0',
          webgpu: true,
          gamepad: true,
          sensors: true,
        },
      }),
    };
  }

  setupDevelopmentTools() {
    return {
      name: 'tauri-devtools',
      setup: () => ({
        features: {
          hotReload: this.config.features?.devtools ?? true,
          debugger: true,
          inspector: true,
          profiler: true,
          logging: true,
          errorReporting: true,
          performanceMonitoring: true,
          memoryProfiling: true,
        },
        devServer: {
          port: 1420,
          host: 'localhost',
          cors: true,
          https: false,
          proxy: {},
        },
        build: {
          sourceMaps: true,
          minification: false,
          optimization: false,
          watch: true,
          incremental: true,
        },
        testing: {
          unit: 'vitest',
          integration: 'playwright',
          e2e: 'tauri-driver',
        },
        debugging: {
          rustAnalyzer: true,
          lldb: true,
          gdb: true,
          webInspector: true,
        },
      }),
    };
  }

  async initialize() {
    const configurations = [];

    if (this.config.platforms?.includes('desktop') || !this.config.platforms) {
      configurations.push(this.setupDesktopApp());
    }

    if (this.config.platforms?.includes('mobile') || !this.config.platforms) {
      configurations.push(this.setupMobileApp());
    }

    configurations.push(this.setupUnifiedBuilder());
    configurations.push(this.setupWebXRIntegration());

    if (this.config.features?.devtools !== false) {
      configurations.push(this.setupDevelopmentTools());
    }

    return configurations;
  }

  getTypeDefinitions() {
    return `
declare module '@tauri-apps/api' {
  export interface TauriConfig {
    autoInitialize?: boolean;
    platforms?: ('desktop' | 'mobile' | 'web')[];
    features?: {
      nativeMenus?: boolean;
      systemTray?: boolean;
      notifications?: boolean;
      fileSystem?: boolean;
      windowManagement?: boolean;
      nativeDialogs?: boolean;
      devtools?: boolean;
    };
    desktop?: {
      identifier?: string;
      productName?: string;
      version?: string;
      windowConfig?: {
        width?: number;
        height?: number;
        resizable?: boolean;
        fullscreen?: boolean;
        transparent?: boolean;
      };
    };
    mobile?: {
      ios?: {
        bundleIdentifier?: string;
        developmentTeam?: string;
      };
      android?: {
        packageName?: string;
        minSdkVersion?: number;
      };
    };
  }

  export class TauriIntegration {
    constructor(config?: TauriConfig);
    setupDesktopApp(): Promise<any>;
    setupMobileApp(): Promise<any>;
    setupUnifiedBuilder(): Promise<any>;
    setupWebXRIntegration(): Promise<any>;
    setupDevelopmentTools(): Promise<any>;
    initialize(): Promise<any[]>;
  }
}
    `;
  }
}
