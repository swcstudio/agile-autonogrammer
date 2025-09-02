/**
 * Katalyst Framework Build Configuration
 *
 * Orchestrates NX, Turborepo, Deno, and Bun for a unified build system
 * Supporting 3 meta frameworks: Core (TanStack), Remix (Admin), Next.js (Marketing)
 */

export interface BuildTarget {
  name: string;
  frameworks: string[];
  platforms: string[];
  dependencies: string[];
  cacheEnabled: boolean;
  cloudCacheEnabled: boolean;
  parallel: boolean;
  env?: Record<string, string>;
  outputs: string[];
  runner: 'nx' | 'turbo' | 'deno' | 'bun' | 'auto';
  fallbacks?: Array<{ runner: string; command: string }>;
  timeout?: number;
  retries?: number;
}

export interface FrameworkConfig {
  name: string;
  type: 'core' | 'remix' | 'nextjs' | 'shared';
  path: string;
  buildCommand: string;
  devCommand: string;
  testCommand: string;
  lintCommand: string;
  previewCommand: string;
  dependencies: string[];
  env: Record<string, string>;
  platforms: string[];
  bundler: 'rspack' | 'vite' | 'webpack' | 'esbuild';
  runtime: 'deno' | 'node' | 'bun';
}

export interface PackageManagerConfig {
  primary: 'deno' | 'bun' | 'npm' | 'yarn' | 'pnpm';
  fallbacks: string[];
  lockfile: string;
  nodeModulesStrategy: 'auto' | 'manual' | 'none';
  registries: Record<string, string>;
}

export interface TaskRunnerConfig {
  primary: 'turbo' | 'nx' | 'deno' | 'bun';
  fallbacks: string[];
  cacheStrategy: 'aggressive' | 'conservative' | 'disabled';
  cloudCache: {
    enabled: boolean;
    turbo: {
      team?: string;
      token?: string;
    };
    nx: {
      accessToken?: string;
    };
  };
  parallel: {
    enabled: boolean;
    maxConcurrency: number;
  };
}

export interface PlatformConfig {
  name: string;
  enabled: boolean;
  targets: string[];
  buildCommand: string;
  env: Record<string, string>;
  dependencies: string[];
  outputs: string[];
}

export interface TestingConfig {
  runner: 'deno' | 'vitest' | 'jest' | 'playwright';
  coverage: {
    enabled: boolean;
    threshold: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    reporters: string[];
    outputDir: string;
  };
  e2e: {
    enabled: boolean;
    browsers: string[];
    baseUrl: string;
    timeout: number;
  };
  performance: {
    enabled: boolean;
    benchmarks: string[];
    thresholds: Record<string, number>;
  };
}

export interface DeploymentConfig {
  environments: {
    development: {
      url: string;
      branch: string;
      autoDeployEnabled: boolean;
    };
    staging: {
      url: string;
      branch: string;
      autoDeployEnabled: boolean;
    };
    production: {
      url: string;
      branch: string;
      autoDeployEnabled: boolean;
    };
  };
  providers: {
    vercel: {
      enabled: boolean;
      projectId?: string;
      orgId?: string;
    };
    netlify: {
      enabled: boolean;
      siteId?: string;
    };
    aws: {
      enabled: boolean;
      region?: string;
      bucket?: string;
    };
  };
}

// Main Build Configuration
export const buildConfig = {
  // Package Manager Configuration
  packageManager: {
    primary: 'deno',
    fallbacks: ['bun', 'npm'],
    lockfile: 'deno.lock',
    nodeModulesStrategy: 'auto',
    registries: {
      npm: 'https://registry.npmjs.org',
      jsr: 'https://jsr.io',
      deno: 'https://deno.land/x',
    },
  } as PackageManagerConfig,

  // Task Runner Configuration
  taskRunner: {
    primary: 'turbo',
    fallbacks: ['nx', 'deno', 'bun'],
    cacheStrategy: 'aggressive',
    cloudCache: {
      enabled: true,
      turbo: {
        team: process.env.TURBO_TEAM,
        token: process.env.TURBO_TOKEN,
      },
      nx: {
        accessToken: process.env.NX_CLOUD_ACCESS_TOKEN,
      },
    },
    parallel: {
      enabled: true,
      maxConcurrency: 8,
    },
  } as TaskRunnerConfig,

  // Framework Configurations
  frameworks: {
    shared: {
      name: 'shared',
      type: 'shared',
      path: './shared',
      buildCommand: 'deno run --allow-all build.ts',
      devCommand: 'deno run --allow-all dev.ts',
      testCommand: 'deno test --allow-all',
      lintCommand: 'deno lint && deno fmt --check',
      previewCommand: 'deno run --allow-all preview.ts',
      dependencies: [],
      env: {
        DENO_ENV: 'development',
      },
      platforms: ['web', 'desktop', 'mobile'],
      bundler: 'esbuild',
      runtime: 'deno',
    },
    core: {
      name: 'core',
      type: 'core',
      path: './core',
      buildCommand: 'rsbuild build',
      devCommand: 'rsbuild dev',
      testCommand: 'deno test --allow-all',
      lintCommand: 'biome check .',
      previewCommand: 'rsbuild preview',
      dependencies: ['shared'],
      env: {
        NODE_ENV: 'development',
        RSPACK_ENV: 'development',
      },
      platforms: ['web', 'desktop', 'mobile'],
      bundler: 'rspack',
      runtime: 'deno',
    },
    remix: {
      name: 'remix',
      type: 'remix',
      path: './remix',
      buildCommand: 'remix build',
      devCommand: 'remix dev',
      testCommand: 'deno test --allow-all',
      lintCommand: 'biome check .',
      previewCommand: 'remix-serve build',
      dependencies: ['shared'],
      env: {
        NODE_ENV: 'development',
        REMIX_DEV_HTTP_ORIGIN: 'http://localhost:3002',
      },
      platforms: ['web'],
      bundler: 'esbuild',
      runtime: 'node',
    },
    nextjs: {
      name: 'nextjs',
      type: 'nextjs',
      path: './next',
      buildCommand: 'next build',
      devCommand: 'next dev',
      testCommand: 'deno test --allow-all',
      lintCommand: 'biome check .',
      previewCommand: 'next start',
      dependencies: ['shared'],
      env: {
        NODE_ENV: 'development',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      platforms: ['web'],
      bundler: 'webpack',
      runtime: 'node',
    },
  } as Record<string, FrameworkConfig>,

  // Platform Configurations
  platforms: {
    web: {
      name: 'web',
      enabled: true,
      targets: ['core', 'remix', 'nextjs'],
      buildCommand: 'turbo build:web',
      env: {
        TARGET_PLATFORM: 'web',
        NODE_ENV: 'production',
      },
      dependencies: ['shared'],
      outputs: ['dist/**', 'build/**', '.next/**', '.remix/**'],
    },
    desktop: {
      name: 'desktop',
      enabled: true,
      targets: ['core'],
      buildCommand: 'turbo build:desktop',
      env: {
        TARGET_PLATFORM: 'desktop',
        TAURI_ENV: 'production',
      },
      dependencies: ['shared', 'build-native', 'build:web'],
      outputs: ['src-tauri/target/**', 'dist/desktop/**'],
    },
    mobile: {
      name: 'mobile',
      enabled: true,
      targets: ['core'],
      buildCommand: 'turbo build:mobile',
      env: {
        TARGET_PLATFORM: 'mobile',
        TAURI_ENV: 'production',
      },
      dependencies: ['shared', 'build-native', 'build:web'],
      outputs: ['src-tauri/gen/android/**', 'src-tauri/gen/apple/**', 'dist/mobile/**'],
    },
    linux: {
      name: 'linux',
      enabled: true,
      targets: ['core'],
      buildCommand: 'turbo build:linux',
      env: {
        TARGET_PLATFORM: 'linux',
        TAURI_ENV: 'production',
      },
      dependencies: ['shared', 'build-native', 'build:desktop'],
      outputs: ['src-tauri/target/release/bundle/appimage/**', 'dist/linux/**'],
    },
    mac: {
      name: 'mac',
      enabled: true,
      targets: ['core'],
      buildCommand: 'turbo build:mac',
      env: {
        TARGET_PLATFORM: 'mac',
        TAURI_ENV: 'production',
      },
      dependencies: ['shared', 'build-native', 'build:desktop'],
      outputs: ['src-tauri/target/release/bundle/macos/**', 'dist/mac/**'],
    },
    windows: {
      name: 'windows',
      enabled: true,
      targets: ['core'],
      buildCommand: 'turbo build:windows',
      env: {
        TARGET_PLATFORM: 'windows',
        TAURI_ENV: 'production',
      },
      dependencies: ['shared', 'build-native', 'build:desktop'],
      outputs: ['src-tauri/target/release/bundle/msi/**', 'dist/windows/**'],
    },
  } as Record<string, PlatformConfig>,

  // Build Targets
  targets: {
    'build-native': {
      name: 'build-native',
      frameworks: ['shared'],
      platforms: ['web', 'desktop', 'mobile'],
      dependencies: [],
      cacheEnabled: true,
      cloudCacheEnabled: true,
      parallel: false,
      env: {
        RUST_ENV: 'production',
        CARGO_ENV: 'production',
      },
      outputs: ['shared/src/native/target/**', 'shared/src/native/index.node'],
      runner: 'deno',
      timeout: 300000,
      retries: 2,
    },
    dev: {
      name: 'dev',
      frameworks: ['core', 'remix', 'nextjs'],
      platforms: ['web'],
      dependencies: ['build-native'],
      cacheEnabled: false,
      cloudCacheEnabled: false,
      parallel: true,
      outputs: [],
      runner: 'nx',
      fallbacks: [
        { runner: 'turbo', command: 'dev' },
        { runner: 'bun', command: 'run dev' },
      ],
    },
    build: {
      name: 'build',
      frameworks: ['core', 'remix', 'nextjs'],
      platforms: ['web'],
      dependencies: ['build-native', 'lint', 'typecheck'],
      cacheEnabled: true,
      cloudCacheEnabled: true,
      parallel: true,
      env: {
        NODE_ENV: 'production',
      },
      outputs: ['dist/**', 'build/**', '.next/**', '.remix/**'],
      runner: 'turbo',
      timeout: 600000,
      retries: 2,
    },
    'build:web': {
      name: 'build:web',
      frameworks: ['core', 'remix', 'nextjs'],
      platforms: ['web'],
      dependencies: ['build-native'],
      cacheEnabled: true,
      cloudCacheEnabled: true,
      parallel: true,
      env: {
        NODE_ENV: 'production',
        TARGET_PLATFORM: 'web',
      },
      outputs: ['dist/**', 'build/**', '.next/**', '.remix/**'],
      runner: 'turbo',
      timeout: 600000,
    },
    'build:desktop': {
      name: 'build:desktop',
      frameworks: ['core'],
      platforms: ['desktop'],
      dependencies: ['build-native', 'build:web'],
      cacheEnabled: true,
      cloudCacheEnabled: true,
      parallel: false,
      env: {
        NODE_ENV: 'production',
        TARGET_PLATFORM: 'desktop',
        TAURI_ENV: 'production',
      },
      outputs: ['src-tauri/target/**', 'dist/desktop/**'],
      runner: 'turbo',
      timeout: 1800000,
    },
    'build:mobile': {
      name: 'build:mobile',
      frameworks: ['core'],
      platforms: ['mobile'],
      dependencies: ['build-native', 'build:web'],
      cacheEnabled: true,
      cloudCacheEnabled: true,
      parallel: false,
      env: {
        NODE_ENV: 'production',
        TARGET_PLATFORM: 'mobile',
        TAURI_ENV: 'production',
      },
      outputs: ['src-tauri/gen/android/**', 'src-tauri/gen/apple/**', 'dist/mobile/**'],
      runner: 'turbo',
      timeout: 1800000,
    },
    test: {
      name: 'test',
      frameworks: ['core', 'remix', 'nextjs', 'shared'],
      platforms: ['web'],
      dependencies: ['build-native'],
      cacheEnabled: true,
      cloudCacheEnabled: false,
      parallel: true,
      env: {
        NODE_ENV: 'test',
        DENO_ENV: 'test',
      },
      outputs: ['coverage/**', 'tests/output/**'],
      runner: 'deno',
      timeout: 300000,
    },
    'test:unit': {
      name: 'test:unit',
      frameworks: ['core', 'remix', 'nextjs', 'shared'],
      platforms: ['web'],
      dependencies: [],
      cacheEnabled: true,
      cloudCacheEnabled: false,
      parallel: true,
      outputs: ['coverage/**'],
      runner: 'deno',
      timeout: 180000,
    },
    'test:integration': {
      name: 'test:integration',
      frameworks: ['core', 'remix', 'nextjs', 'shared'],
      platforms: ['web'],
      dependencies: ['build-native'],
      cacheEnabled: true,
      cloudCacheEnabled: false,
      parallel: false,
      outputs: ['coverage/**'],
      runner: 'deno',
      timeout: 300000,
    },
    'test:e2e': {
      name: 'test:e2e',
      frameworks: ['core', 'remix', 'nextjs'],
      platforms: ['web'],
      dependencies: ['build'],
      cacheEnabled: false,
      cloudCacheEnabled: false,
      parallel: false,
      outputs: ['tests/output/e2e/**'],
      runner: 'deno',
      timeout: 600000,
    },
    lint: {
      name: 'lint',
      frameworks: ['core', 'remix', 'nextjs', 'shared'],
      platforms: ['web'],
      dependencies: [],
      cacheEnabled: true,
      cloudCacheEnabled: true,
      parallel: true,
      outputs: [],
      runner: 'turbo',
      fallbacks: [
        {
          runner: 'nx',
          command: 'run-many --target=lint --projects=core,remix,nextjs,shared --parallel',
        },
        { runner: 'deno', command: 'lint && fmt --check' },
      ],
      timeout: 120000,
    },
    typecheck: {
      name: 'typecheck',
      frameworks: ['core', 'remix', 'nextjs', 'shared'],
      platforms: ['web'],
      dependencies: [],
      cacheEnabled: true,
      cloudCacheEnabled: true,
      parallel: true,
      outputs: [],
      runner: 'turbo',
      timeout: 180000,
    },
    deploy: {
      name: 'deploy',
      frameworks: ['core', 'remix', 'nextjs'],
      platforms: ['web'],
      dependencies: ['build', 'test:ci'],
      cacheEnabled: false,
      cloudCacheEnabled: false,
      parallel: true,
      env: {
        NODE_ENV: 'production',
      },
      outputs: [],
      runner: 'nx',
      timeout: 900000,
    },
  } as Record<string, BuildTarget>,

  // Testing Configuration
  testing: {
    runner: 'deno',
    coverage: {
      enabled: true,
      threshold: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      reporters: ['text', 'json', 'html', 'lcov'],
      outputDir: 'tests/output/coverage',
    },
    e2e: {
      enabled: true,
      browsers: ['chromium', 'firefox', 'webkit'],
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
    },
    performance: {
      enabled: true,
      benchmarks: ['multithreading', 'webassembly', 'bundle-size'],
      thresholds: {
        renderTime: 16,
        bundleSize: 512000,
        memoryUsage: 104857600,
      },
    },
  } as TestingConfig,

  // Deployment Configuration
  deployment: {
    environments: {
      development: {
        url: 'https://dev.katalyst.framework',
        branch: 'develop',
        autoDeployEnabled: true,
      },
      staging: {
        url: 'https://staging.katalyst.framework',
        branch: 'staging',
        autoDeployEnabled: true,
      },
      production: {
        url: 'https://katalyst.framework',
        branch: 'main',
        autoDeployEnabled: false,
      },
    },
    providers: {
      vercel: {
        enabled: true,
        projectId: process.env.VERCEL_PROJECT_ID,
        orgId: process.env.VERCEL_ORG_ID,
      },
      netlify: {
        enabled: true,
        siteId: process.env.NETLIFY_SITE_ID,
      },
      aws: {
        enabled: false,
        region: 'us-east-1',
        bucket: process.env.AWS_S3_BUCKET,
      },
    },
  } as DeploymentConfig,

  // Global Environment Variables
  env: {
    global: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DENO_ENV: process.env.DENO_ENV || 'development',
      CI: process.env.CI || 'false',
      VERBOSE: process.env.VERBOSE || 'false',
    },
    development: {
      DEBUG: '1',
      HOT_RELOAD: 'true',
      SOURCE_MAPS: 'true',
    },
    production: {
      OPTIMIZE: 'true',
      MINIFY: 'true',
      SOURCE_MAPS: 'false',
    },
    test: {
      NODE_ENV: 'test',
      DENO_ENV: 'test',
      TEST_TIMEOUT: '30000',
    },
  },

  // Cache Configuration
  cache: {
    buildCache: {
      enabled: true,
      directory: '.cache/build',
      maxSize: '10GB',
      maxAge: '7d',
    },
    testCache: {
      enabled: true,
      directory: '.cache/test',
      maxSize: '2GB',
      maxAge: '3d',
    },
    nodeModulesCache: {
      enabled: true,
      directory: 'node_modules/.cache',
      maxSize: '5GB',
      maxAge: '30d',
    },
  },

  // Performance Optimization
  performance: {
    bundleSplitting: {
      enabled: true,
      chunks: ['vendor', 'common', 'runtime'],
      maxSize: 500000,
    },
    treeShaking: {
      enabled: true,
      sideEffects: false,
    },
    minification: {
      enabled: true,
      targets: ['js', 'css', 'html'],
    },
    compression: {
      enabled: true,
      algorithms: ['gzip', 'brotli'],
    },
  },

  // Security Configuration
  security: {
    contentSecurityPolicy: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
    permissions: {
      deno: ['--allow-net', '--allow-read', '--allow-write', '--allow-env', '--allow-run'],
      node: ['--experimental-permissions'],
    },
  },
};

export default buildConfig;

// Utility functions for accessing configuration
export function getFrameworkConfig(name: string): FrameworkConfig | undefined {
  return buildConfig.frameworks[name];
}

export function getPlatformConfig(name: string): PlatformConfig | undefined {
  return buildConfig.platforms[name];
}

export function getBuildTarget(name: string): BuildTarget | undefined {
  return buildConfig.targets[name];
}

export function getFrameworksForPlatform(platform: string): string[] {
  const platformConfig = getPlatformConfig(platform);
  return platformConfig?.targets || [];
}

export function getDependenciesForTarget(targetName: string): string[] {
  const target = getBuildTarget(targetName);
  return target?.dependencies || [];
}

export function getEnvironmentForTarget(
  targetName: string,
  environment: 'development' | 'production' | 'test' = 'development'
): Record<string, string> {
  const target = getBuildTarget(targetName);
  const globalEnv = buildConfig.env.global;
  const envSpecific = buildConfig.env[environment];
  const targetEnv = target?.env || {};

  return {
    ...globalEnv,
    ...envSpecific,
    ...targetEnv,
  };
}

export function isCloudCacheEnabled(targetName: string): boolean {
  const target = getBuildTarget(targetName);
  return target?.cloudCacheEnabled && buildConfig.taskRunner.cloudCache.enabled;
}

export function getOutputsForTarget(targetName: string): string[] {
  const target = getBuildTarget(targetName);
  return target?.outputs || [];
}

export function getTimeoutForTarget(targetName: string): number {
  const target = getBuildTarget(targetName);
  return target?.timeout || 300000; // 5 minutes default
}

export function getRetriesForTarget(targetName: string): number {
  const target = getBuildTarget(targetName);
  return target?.retries || 0;
}

export function shouldRunInParallel(targetName: string): boolean {
  const target = getBuildTarget(targetName);
  return target?.parallel && buildConfig.taskRunner.parallel.enabled;
}
