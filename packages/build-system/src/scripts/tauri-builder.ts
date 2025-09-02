#!/usr/bin/env deno run --allow-all

/**
 * Unified Tauri Builder Script
 * Replaces Vite with RSpack for Desktop, Mobile, and WebXR builds
 * Provides fast, optimized builds across all platforms
 */

import { parseArgs } from 'https://deno.land/std@0.208.0/cli/parse_args.ts';
import { ensureDir, exists } from 'https://deno.land/std@0.208.0/fs/mod.ts';
import { join, resolve } from 'https://deno.land/std@0.208.0/path/mod.ts';

interface BuildConfig {
  platform: 'desktop' | 'mobile' | 'webxr';
  mode: 'development' | 'production';
  features: string[];
  target?: string;
  bundleType?: 'app' | 'updater' | 'deb' | 'appimage' | 'msi' | 'nsis' | 'dmg' | 'aab' | 'apk';
}

class TauriBuilder {
  private config: BuildConfig;
  private projectRoot: string;
  private tauriDir: string;

  constructor(config: BuildConfig) {
    this.config = config;
    this.projectRoot = Deno.cwd();
    this.tauriDir = join(this.projectRoot, 'src-tauri');
  }

  async build(): Promise<void> {
    console.log(`🚀 Building Katalyst Tauri ${this.config.platform} app...`);

    // Ensure directories exist
    await this.ensureDirectories();

    // Setup environment
    await this.setupEnvironment();

    // Build frontend with RSpack
    await this.buildFrontend();

    // Build Rust backend
    await this.buildBackend();

    // Package application
    await this.packageApp();

    console.log(`✅ Build completed for ${this.config.platform}`);
  }

  async dev(): Promise<void> {
    console.log(`🛠️  Starting Katalyst Tauri ${this.config.platform} dev server...`);

    // Setup environment
    await this.setupEnvironment();

    // Start dev servers in parallel
    const frontendPromise = this.startFrontendDev();
    const backendPromise = this.startBackendDev();

    await Promise.all([frontendPromise, backendPromise]);
  }

  private async ensureDirectories(): Promise<void> {
    const directories = [
      join(this.projectRoot, 'dist'),
      join(this.projectRoot, 'dist', this.config.platform),
      join(this.tauriDir, 'target'),
      join(this.tauriDir, 'icons'),
    ];

    for (const dir of directories) {
      await ensureDir(dir);
    }
  }

  private async setupEnvironment(): Promise<void> {
    const env = {
      TAURI_PLATFORM: this.config.platform,
      NODE_ENV: this.config.mode,
      RUST_LOG: this.config.mode === 'development' ? 'debug' : 'info',
      TAURI_DEV: this.config.mode === 'development' ? 'true' : 'false',
    };

    // Platform-specific environment variables
    switch (this.config.platform) {
      case 'desktop':
        env['TAURI_TARGET'] = this.config.target || 'desktop';
        break;
      case 'mobile':
        env['TAURI_TARGET'] = this.config.target || 'mobile';
        env['TAURI_MOBILE'] = 'true';
        break;
      case 'webxr':
        env['TAURI_TARGET'] = 'desktop';
        env['TAURI_WEBXR'] = 'true';
        break;
    }

    // Set environment variables
    for (const [key, value] of Object.entries(env)) {
      Deno.env.set(key, value);
    }
  }

  private async buildFrontend(): Promise<void> {
    console.log('📦 Building frontend with RSpack...');

    const rsbuildConfig = join(this.projectRoot, 'tauri-rsbuild.config.ts');

    if (!(await exists(rsbuildConfig))) {
      throw new Error('RSpack configuration not found');
    }

    const cmd = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-all',
        'node_modules/@rsbuild/core/bin/rsbuild.js',
        'build',
        '--config',
        rsbuildConfig,
      ],
      cwd: this.projectRoot,
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const { success } = await cmd.output();

    if (!success) {
      throw new Error('Frontend build failed');
    }
  }

  private async buildBackend(): Promise<void> {
    console.log('🦀 Building Rust backend...');

    const features = this.getCargoFeatures();
    const target = this.getCargoTarget();

    const args = ['tauri', 'build'];

    if (features.length > 0) {
      args.push('--features', features.join(','));
    }

    if (target) {
      args.push('--target', target);
    }

    if (this.config.bundleType) {
      args.push('--bundles', this.config.bundleType);
    }

    const cmd = new Deno.Command('cargo', {
      args,
      cwd: this.projectRoot,
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const { success } = await cmd.output();

    if (!success) {
      throw new Error('Backend build failed');
    }
  }

  private async packageApp(): Promise<void> {
    console.log('📱 Packaging application...');

    const outputDir = join(this.projectRoot, 'dist', this.config.platform);
    const tauriTarget = join(this.tauriDir, 'target', 'release');

    // Copy built artifacts to dist directory
    await this.copyBuildArtifacts(tauriTarget, outputDir);

    // Generate metadata
    await this.generateMetadata(outputDir);
  }

  private async startFrontendDev(): Promise<void> {
    console.log('🌐 Starting frontend dev server...');

    const rsbuildConfig = join(this.projectRoot, 'tauri-rsbuild.config.ts');

    const cmd = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-all',
        'node_modules/@rsbuild/core/bin/rsbuild.js',
        'dev',
        '--config',
        rsbuildConfig,
      ],
      cwd: this.projectRoot,
      stdout: 'inherit',
      stderr: 'inherit',
    });

    await cmd.spawn();
  }

  private async startBackendDev(): Promise<void> {
    console.log('🦀 Starting Tauri dev server...');

    const features = this.getCargoFeatures();

    const args = ['tauri', 'dev'];

    if (features.length > 0) {
      args.push('--features', features.join(','));
    }

    const cmd = new Deno.Command('cargo', {
      args,
      cwd: this.projectRoot,
      stdout: 'inherit',
      stderr: 'inherit',
    });

    await cmd.spawn();
  }

  private getCargoFeatures(): string[] {
    const features = [...this.config.features];

    switch (this.config.platform) {
      case 'mobile':
        features.push('mobile');
        break;
      case 'webxr':
        features.push('webxr');
        break;
    }

    if (this.config.mode === 'development') {
      features.push('devtools');
    }

    return features;
  }

  private getCargoTarget(): string | undefined {
    if (this.config.target) {
      return this.config.target;
    }

    // Auto-detect target based on platform
    switch (this.config.platform) {
      case 'mobile':
        // Mobile targets are handled by Tauri mobile plugin
        return undefined;
      default:
        return undefined;
    }
  }

  private async copyBuildArtifacts(sourceDir: string, targetDir: string): Promise<void> {
    if (!(await exists(sourceDir))) {
      return;
    }

    // Copy platform-specific artifacts
    const artifacts = await this.getBuildArtifacts(sourceDir);

    for (const artifact of artifacts) {
      const sourcePath = join(sourceDir, artifact);
      const targetPath = join(targetDir, artifact);

      if (await exists(sourcePath)) {
        await Deno.copyFile(sourcePath, targetPath);
        console.log(`📋 Copied ${artifact}`);
      }
    }
  }

  private async getBuildArtifacts(sourceDir: string): Promise<string[]> {
    const artifacts: string[] = [];

    try {
      for await (const entry of Deno.readDir(sourceDir)) {
        if (entry.isFile) {
          const name = entry.name;

          // Platform-specific artifact detection
          if (this.config.platform === 'desktop') {
            if (
              name.endsWith('.exe') ||
              name.endsWith('.app') ||
              name.endsWith('.deb') ||
              name.endsWith('.dmg')
            ) {
              artifacts.push(name);
            }
          } else if (this.config.platform === 'mobile') {
            if (name.endsWith('.apk') || name.endsWith('.aab') || name.endsWith('.ipa')) {
              artifacts.push(name);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read artifacts directory: ${error.message}`);
    }

    return artifacts;
  }

  private async generateMetadata(outputDir: string): Promise<void> {
    const metadata = {
      platform: this.config.platform,
      mode: this.config.mode,
      features: this.config.features,
      buildTime: new Date().toISOString(),
      version: await this.getVersion(),
      bundleType: this.config.bundleType,
    };

    const metadataPath = join(outputDir, 'build-metadata.json');
    await Deno.writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`📄 Generated metadata: ${metadataPath}`);
  }

  private async getVersion(): Promise<string> {
    try {
      const cargoToml = await Deno.readTextFile(join(this.tauriDir, 'Cargo.toml'));
      const versionMatch = cargoToml.match(/version\s*=\s*"([^"]+)"/);
      return versionMatch?.[1] || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
}

// CLI interface
async function main() {
  const args = parseArgs(Deno.args, {
    string: ['platform', 'mode', 'features', 'target', 'bundle'],
    boolean: ['dev', 'build', 'help'],
    default: {
      platform: 'desktop',
      mode: 'development',
      features: 'default',
    },
    alias: {
      p: 'platform',
      m: 'mode',
      f: 'features',
      t: 'target',
      b: 'bundle',
      h: 'help',
    },
  });

  if (args.help) {
    console.log(`
Katalyst Tauri Builder - Unified build system for Desktop, Mobile, and WebXR

USAGE:
  tauri-builder [OPTIONS] <COMMAND>

COMMANDS:
  --dev     Start development server
  --build   Build for production

OPTIONS:
  -p, --platform <PLATFORM>    Target platform [desktop, mobile, webxr]
  -m, --mode <MODE>            Build mode [development, production]
  -f, --features <FEATURES>    Cargo features (comma-separated)
  -t, --target <TARGET>        Specific build target
  -b, --bundle <TYPE>          Bundle type [app, deb, dmg, apk, etc.]
  -h, --help                   Show this help message

EXAMPLES:
  # Development
  tauri-builder --dev --platform desktop
  tauri-builder --dev --platform mobile
  tauri-builder --dev --platform webxr

  # Production builds
  tauri-builder --build --platform desktop --mode production --bundle dmg
  tauri-builder --build --platform mobile --mode production --bundle apk
  tauri-builder --build --platform webxr --mode production

  # Feature-specific builds
  tauri-builder --build --platform desktop --features "webxr,mobile"
    `);
    return;
  }

  const config: BuildConfig = {
    platform: args.platform as 'desktop' | 'mobile' | 'webxr',
    mode: args.mode as 'development' | 'production',
    features: args.features.split(',').filter(Boolean),
    target: args.target,
    bundleType: args.bundle as any,
  };

  const builder = new TauriBuilder(config);

  try {
    if (args.dev) {
      await builder.dev();
    } else if (args.build) {
      await builder.build();
    } else {
      console.error('Error: Must specify either --dev or --build');
      Deno.exit(1);
    }
  } catch (error) {
    console.error(`❌ Build failed: ${error.message}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
