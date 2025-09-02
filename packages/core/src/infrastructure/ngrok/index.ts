/**
 * Ngrok Integration for Katalyst
 *
 * Main exports for the ngrok integration package
 */

// Core providers and hooks
export { NgrokProvider, useNgrok } from './NgrokProvider';
export type {
  NgrokConfig,
  NgrokContextValue,
  TunnelOptions,
  NgrokTunnel,
  CloudEndpointConfig,
  CloudEndpoint,
  ABTestConfig,
  ABTest,
  FeatureFlagCondition,
  TunnelMetrics,
  TrafficAnalytics,
  TrafficPolicyConfig,
} from './NgrokProvider';

// Development tools
export { NgrokDevTools } from './NgrokDevTools';

// API client
export { NgrokApi } from './ngrok-api';
export type {
  TunnelConfig,
  CloudEndpointConfig as ApiCloudEndpointConfig,
  TrafficPolicyPayload,
} from './ngrok-api';

// Traffic policy builder
export { TrafficPolicy } from './traffic-policy';
export type {
  TrafficPolicyRule,
  CORSConfig,
  BackendConfig,
  ABTestVariant,
  CircuitBreakerConfig,
  TransformConfig,
  KatalystAnalyticsConfig,
  ThemeRoutingConfig,
  ModuleFederationConfig,
} from './traffic-policy';

// Federation manager
export { FederationManager } from './federation-manager';
export type {
  FederationManagerOptions,
  RemoteConfig,
  RemoteOptions,
  ModuleFederationRuntimeConfig,
  HealthCheckResult,
} from './federation-manager';

// Utility functions
export const createKatalystNgrokConfig = (authToken: string): NgrokConfig => ({
  authToken,
  region: 'us',
  autoStart: true,
  autoShare: true,
  teamNotifications: true,

  defaultPolicy: {
    name: 'katalyst-dev',
    rules: [
      {
        name: 'cors',
        match: [],
        actions: [
          {
            type: 'add-headers',
            config: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': '*',
              'Access-Control-Allow-Headers': '*',
            },
          },
        ],
      },
    ],
  },

  federationConfig: {
    autoUpdateRemotes: true,
    shareModules: true,
    enableCORS: true,
  },

  mobileConfig: {
    generateQRCodes: true,
    enableDeepLinks: true,
    iosUniversalLinks: true,
    androidAppLinks: true,
  },
});

export const createProductionNgrokConfig = (authToken: string): NgrokConfig => ({
  authToken,
  region: 'us',
  autoStart: false,
  autoShare: false,
  teamNotifications: false,

  defaultPolicy: {
    name: 'katalyst-prod',
    rules: [
      {
        name: 'rate-limit',
        match: [],
        actions: [
          {
            type: 'rate-limit',
            config: {
              name: 'api-limit',
              algorithm: 'sliding_window',
              capacity: 1000,
              rate: '100r/m',
            },
          },
        ],
      },
    ],
  },
});

// Pre-configured traffic policies
export const createKatalystTrafficPolicy = () => {
  return new TrafficPolicy()
    .addCORS({
      allowOrigin: '*',
      allowMethods: 'GET,POST,PUT,DELETE,OPTIONS',
      allowHeaders: 'Content-Type,Authorization,X-Katalyst-*',
      allowCredentials: false,
    })
    .addKatalystAnalytics({
      component: 'unknown',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    })
    .addHeaders({
      'X-Powered-By': 'Katalyst + Ngrok',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    });
};

export const createDevelopmentTrafficPolicy = () => {
  return createKatalystTrafficPolicy().addHeaders({
    'X-Environment': 'development',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
};

export const createProductionTrafficPolicy = () => {
  return createKatalystTrafficPolicy().addRateLimit(1000, '100r/m').addHeaders({
    'X-Environment': 'production',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  });
};

// Integration helpers
export const setupKatalystFederation = async (federationManager: FederationManager) => {
  await Promise.all([
    federationManager.setupTanStackIntegration(),
    federationManager.setupRePackIntegration(),
    federationManager.setupStyleXIntegration(),
  ]);
};

// Common port configurations
export const KATALYST_PORTS = {
  WEB: 3000,
  SHARED: 3001,
  MOBILE: 3002,
  STYLEX: 3003,
  API: 4000,
  STORYBOOK: 5000,
  DOCS: 6000,
} as const;

export type KatalystPortName = keyof typeof KATALYST_PORTS;

export const getKatalystPortConfig = () => [
  { port: KATALYST_PORTS.WEB, name: 'web', description: 'Web application' },
  { port: KATALYST_PORTS.SHARED, name: 'shared', description: 'Shared components' },
  { port: KATALYST_PORTS.MOBILE, name: 'mobile', description: 'Mobile application' },
  { port: KATALYST_PORTS.STYLEX, name: 'stylex', description: 'StyleX themes' },
  { port: KATALYST_PORTS.API, name: 'api', description: 'API server' },
  { port: KATALYST_PORTS.STORYBOOK, name: 'storybook', description: 'Component library' },
  { port: KATALYST_PORTS.DOCS, name: 'docs', description: 'Documentation' },
];

// Export types for convenience
export type { NgrokConfig };
export type { NgrokContextValue };
export type { TrafficPolicy };
export type { FederationManager };
