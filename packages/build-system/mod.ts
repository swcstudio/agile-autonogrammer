// @katalyst/build-system - Unified build configurations
export * from './src/rsbuild.config.ts';
export * from './src/build.config.ts';
export * from './src/emp.config.ts';
export * from './src/tauri-rsbuild.config.ts';

// Script exports
export * from './src/scripts/setup-turbo-cache.ts';
export * from './src/scripts/tauri-builder.ts';
export * from './src/scripts/unified-runner.ts';

// Builder factory
export interface BuildConfig {
  target: 'web' | 'mobile' | 'desktop' | 'metaverse';
  mode: 'development' | 'production';
  features?: string[];
}

export class UnifiedBuilder {
  async build(config: BuildConfig): Promise<void> {
    switch (config.target) {
      case 'web':
        // Use RSBuild for web
        break;
      case 'mobile':
        // Use Repack for mobile
        break;
      case 'desktop':
        // Use Tauri for desktop
        break;
      case 'metaverse':
        // Use WASM pack for metaverse
        break;
    }
  }
}