import type { KatalystConfig } from '../types/index.ts';

export const defaultKatalystConfig: KatalystConfig = {
  variant: 'core',
  features: [
    { name: 'ssr', enabled: true },
    { name: 'streaming', enabled: true },
    { name: 'micro-frontends', enabled: true },
    { name: 'web3', enabled: true },
    { name: 'ai-automation', enabled: true },
    { name: 'desktop', enabled: false },
    { name: 'mobile', enabled: false },
  ],
  plugins: [
    { name: 'rspack', version: '1.0.17' },
    { name: 'biome', version: '1.9.4' },
    { name: 'tailwindcss', version: '4.0.0' },
    { name: 'typescript', version: '5.6.3' },
  ],
  integrations: [
    { name: 'tanstack', type: 'framework', enabled: true },
    { name: 'rspack', type: 'bundler', enabled: true },
    { name: 'emp', type: 'framework', enabled: true },
    { name: 'esmx', type: 'framework', enabled: true },
    { name: 'pareto', type: 'framework', enabled: true },
    { name: 'repack', type: 'framework', enabled: false },
    { name: 'umi', type: 'framework', enabled: true },
    { name: 'rspeedy', type: 'framework', enabled: false },
    { name: 'electron', type: 'framework', enabled: false },
    { name: 'nx', type: 'development', enabled: true },
    { name: 'arco', type: 'ui', enabled: true },
    { name: 'cosmos', type: 'framework', enabled: true },
    { name: 'stylex', type: 'ui', enabled: true },
    { name: 'zephyr', type: 'deployment', enabled: true },
    { name: 'virtual-modules', type: 'bundler', enabled: true },
    { name: 'asset-manifest', type: 'bundler', enabled: true },
    { name: 'fast-refresh', type: 'development', enabled: true },
    { name: 'typia', type: 'validation', enabled: true },
    { name: 'storybook', type: 'development', enabled: true },
    { name: 'ngrok', type: 'development', enabled: true },
    { name: 'inspector', type: 'development', enabled: true },
    { name: 'svgr', type: 'bundler', enabled: true },
    { name: 'sails', type: 'framework', enabled: true },
    { name: 'tapable', type: 'framework', enabled: true },
    { name: 'midscene', type: 'automation', enabled: true },
    { name: 'tauri', type: 'framework', enabled: false },
    { name: 'webxr', type: 'framework', enabled: false },
    { name: 'multithreading', type: 'automation', enabled: true },
  ],
  unifiedAppBuilder: {
    enabled: true,
    platforms: ['web', 'desktop', 'mobile', 'metaverse'],
    frameworks: {
      desktop: 'tauri',
      mobile: 'lynx',
      metaverse: 'webxr',
    },
    sharedComponents: true,
    rustBackend: true,
    features: {
      crossPlatformComponents: true,
      sharedStateManagement: true,
      unifiedBuildSystem: true,
      hotReload: true,
    },
  },
  platformConfigs: {
    desktop: {
      tauri: {
        enabled: true,
        features: ['nativeMenus', 'systemTray', 'notifications', 'fileSystem'],
      },
    },
    mobile: {
      rspeedy: {
        enabled: true,
        features: ['nativeNavigation', 'deviceAPIs', 'pushNotifications'],
      },
    },
    metaverse: {
      webxr: {
        enabled: true,
        features: ['vr', 'ar', 'mixedReality', 'spatialTracking'],
      },
    },
  },
};

export function createKatalystConfig(variant: 'core' | 'remix' | 'nextjs'): KatalystConfig {
  const config = { ...defaultKatalystConfig, variant };

  switch (variant) {
    case 'remix':
      config.features.push({ name: 'remix-routing', enabled: true });
      config.integrations.push({ name: 'remix', type: 'framework', enabled: true });
      break;
    case 'nextjs':
      config.features.push({ name: 'nextjs-routing', enabled: true });
      config.integrations.push({ name: 'nextjs', type: 'framework', enabled: true });
      break;
    default:
      break;
  }

  return config;
}
