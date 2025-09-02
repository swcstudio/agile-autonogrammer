/**
 * Katalyst Mobile Build System
 *
 * Comprehensive build and deployment system for iOS and Android
 * Uses RSpeedy (Lynx) for native performance
 */

export * from './builder';
export * from './bundler';
export * from './optimizer';
export * from './packager';
export * from './signer';
export * from './deployer';

// Build configuration types
export interface BuildConfig {
  platform: 'ios' | 'android' | 'both';
  mode: 'debug' | 'release';
  target: 'device' | 'simulator' | 'emulator';
  arch: 'arm64' | 'x86_64' | 'universal';

  // Source configuration
  entry: string;
  outputDir: string;
  assetsDir: string;

  // Optimization
  minify: boolean;
  treeshake: boolean;
  sourceMaps: boolean;
  compress: boolean;

  // Native configuration
  nativeModules: string[];
  permissions: string[];
  capabilities: string[];

  // Signing (for release builds)
  signing?: {
    ios?: IOSSigningConfig;
    android?: AndroidSigningConfig;
  };

  // Environment
  env: Record<string, string>;
  defines: Record<string, any>;
}

export interface IOSSigningConfig {
  teamId: string;
  certificateType: 'development' | 'distribution';
  provisioningProfile?: string;
  bundleId: string;
  codeSignIdentity: string;
}

export interface AndroidSigningConfig {
  keystore: string;
  keystorePassword: string;
  keyAlias: string;
  keyPassword: string;
  storeFile: string;
}

export interface BuildResult {
  success: boolean;
  platform: 'ios' | 'android';
  mode: 'debug' | 'release';
  target: 'device' | 'simulator' | 'emulator';

  // Output artifacts
  artifacts: {
    app?: string; // iOS .app bundle
    ipa?: string; // iOS .ipa file
    apk?: string; // Android .apk file
    aab?: string; // Android .aab file
    symbols?: string; // Debug symbols
    sourceMaps?: string; // Source maps
    manifest?: string; // Build manifest
  };

  // Build metadata
  buildTime: number;
  bundleSize: number;
  assetsSize: number;

  // Logs and diagnostics
  logs: string[];
  warnings: string[];
  errors: string[];

  // Performance metrics
  metrics: {
    buildDuration: number;
    bundleDuration: number;
    signDuration?: number;
    packageDuration: number;
  };
}

// Build target configurations
export const BuildTargets = {
  // iOS Targets
  'ios-device-debug': {
    platform: 'ios' as const,
    mode: 'debug' as const,
    target: 'device' as const,
    arch: 'arm64' as const,
  },
  'ios-device-release': {
    platform: 'ios' as const,
    mode: 'release' as const,
    target: 'device' as const,
    arch: 'arm64' as const,
  },
  'ios-simulator-debug': {
    platform: 'ios' as const,
    mode: 'debug' as const,
    target: 'simulator' as const,
    arch: 'x86_64' as const,
  },

  // Android Targets
  'android-device-debug': {
    platform: 'android' as const,
    mode: 'debug' as const,
    target: 'device' as const,
    arch: 'arm64' as const,
  },
  'android-device-release': {
    platform: 'android' as const,
    mode: 'release' as const,
    target: 'device' as const,
    arch: 'arm64' as const,
  },
  'android-emulator-debug': {
    platform: 'android' as const,
    mode: 'debug' as const,
    target: 'emulator' as const,
    arch: 'x86_64' as const,
  },
} as const;

// Build commands
export interface BuildCommands {
  clean: () => Promise<void>;
  build: (config: BuildConfig) => Promise<BuildResult>;
  package: (config: BuildConfig, artifacts: BuildResult['artifacts']) => Promise<string>;
  sign: (config: BuildConfig, artifact: string) => Promise<string>;
  deploy: (config: BuildConfig, artifact: string, target: string) => Promise<void>;
}

// Utility functions
export function createBuildConfig(overrides: Partial<BuildConfig> = {}): BuildConfig {
  return {
    platform: 'ios',
    mode: 'debug',
    target: 'simulator',
    arch: 'arm64',
    entry: './src/index.tsx',
    outputDir: './build',
    assetsDir: './assets',
    minify: false,
    treeshake: true,
    sourceMaps: true,
    compress: false,
    nativeModules: [],
    permissions: [],
    capabilities: [],
    env: {},
    defines: {},
    ...overrides,
  };
}

export function getBuildTarget(
  platform: 'ios' | 'android',
  mode: 'debug' | 'release',
  target: 'device' | 'simulator' | 'emulator'
) {
  const key = `${platform}-${target}-${mode}` as keyof typeof BuildTargets;
  return BuildTargets[key];
}

export function validateBuildConfig(config: BuildConfig): string[] {
  const errors: string[] = [];

  // Required fields
  if (!config.entry) errors.push('Entry point is required');
  if (!config.outputDir) errors.push('Output directory is required');

  // Platform-specific validation
  if (config.platform === 'ios') {
    if (config.mode === 'release' && !config.signing?.ios) {
      errors.push('iOS release builds require signing configuration');
    }
  }

  if (config.platform === 'android') {
    if (config.mode === 'release' && !config.signing?.android) {
      errors.push('Android release builds require signing configuration');
    }
  }

  return errors;
}

// Performance optimization presets
export const OptimizationPresets = {
  development: {
    minify: false,
    treeshake: false,
    sourceMaps: true,
    compress: false,
  },
  production: {
    minify: true,
    treeshake: true,
    sourceMaps: false,
    compress: true,
  },
  'size-optimized': {
    minify: true,
    treeshake: true,
    sourceMaps: false,
    compress: true,
  },
  'speed-optimized': {
    minify: false,
    treeshake: true,
    sourceMaps: true,
    compress: false,
  },
} as const;

// Build environment configurations
export const EnvironmentConfigs = {
  development: {
    NODE_ENV: 'development',
    __DEV__: true,
    ENABLE_DEBUGGING: true,
    ENABLE_HOT_RELOAD: true,
  },
  staging: {
    NODE_ENV: 'production',
    __DEV__: false,
    ENABLE_DEBUGGING: true,
    ENABLE_HOT_RELOAD: false,
    API_BASE_URL: 'https://staging-api.katalyst.com',
  },
  production: {
    NODE_ENV: 'production',
    __DEV__: false,
    ENABLE_DEBUGGING: false,
    ENABLE_HOT_RELOAD: false,
    API_BASE_URL: 'https://api.katalyst.com',
  },
} as const;
