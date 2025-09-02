/**
 * Ngrok Integration Provider for Katalyst
 *
 * Provides secure tunneling, traffic management, and development workflow automation
 * Integrates with Katalyst's federated architecture for seamless development experience
 */

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { FederationManager } from './federation-manager';
import { NgrokApi } from './ngrok-api';
import { TrafficPolicy } from './traffic-policy';

export interface NgrokConfig {
  // Authentication
  authToken: string;
  region?: 'us' | 'eu' | 'ap' | 'au' | 'sa' | 'jp' | 'in';

  // Development settings
  autoStart?: boolean;
  autoShare?: boolean;
  teamNotifications?: boolean;

  // Traffic policies
  defaultPolicy?: TrafficPolicyConfig;
  environmentPolicies?: Record<string, TrafficPolicyConfig>;

  // Federation integration
  federationConfig?: {
    autoUpdateRemotes?: boolean;
    shareModules?: boolean;
    enableCORS?: boolean;
  };

  // Mobile integration
  mobileConfig?: {
    generateQRCodes?: boolean;
    enableDeepLinks?: boolean;
    iosUniversalLinks?: boolean;
    androidAppLinks?: boolean;
  };
}

export interface NgrokContextValue {
  // Tunnel management
  createTunnel: (port: number, options?: TunnelOptions) => Promise<NgrokTunnel>;
  destroyTunnel: (tunnelId: string) => Promise<void>;
  getTunnels: () => NgrokTunnel[];
  getTunnelByPort: (port: number) => NgrokTunnel | undefined;

  // Cloud endpoints
  createCloudEndpoint: (config: CloudEndpointConfig) => Promise<CloudEndpoint>;
  updateCloudEndpoint: (id: string, config: Partial<CloudEndpointConfig>) => Promise<CloudEndpoint>;
  deleteCloudEndpoint: (id: string) => Promise<void>;

  // Traffic policies
  applyTrafficPolicy: (tunnelId: string, policy: TrafficPolicy) => Promise<void>;
  createABTest: (config: ABTestConfig) => Promise<ABTest>;
  enableFeatureFlag: (flag: string, condition: FeatureFlagCondition) => Promise<void>;

  // Federation integration
  updateFederationUrls: () => Promise<void>;
  shareModule: (moduleName: string, port: number) => Promise<string>;

  // Analytics and monitoring
  getTunnelMetrics: (tunnelId: string) => Promise<TunnelMetrics>;
  getTrafficAnalytics: (timeframe: string) => Promise<TrafficAnalytics>;

  // Development utilities
  generateQRCode: (url: string) => Promise<string>;
  notifyTeam: (message: string, channels?: string[]) => Promise<void>;
  copyToClipboard: (url: string) => Promise<void>;
}

const NgrokContext = createContext<NgrokContextValue | null>(null);

export function NgrokProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: NgrokConfig;
}) {
  const [api, setApi] = useState<NgrokApi | null>(null);
  const [tunnels, setTunnels] = useState<NgrokTunnel[]>([]);
  const [cloudEndpoints, setCloudEndpoints] = useState<CloudEndpoint[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeNgrok = async () => {
      try {
        const ngrokApi = new NgrokApi(config.authToken, config.region);
        await ngrokApi.initialize();

        setApi(ngrokApi);
        setIsInitialized(true);

        if (config.autoStart) {
          await autoStartTunnels();
        }
      } catch (error) {
        console.error('Failed to initialize ngrok:', error);
      }
    };

    initializeNgrok();
  }, [config]);

  const autoStartTunnels = async () => {
    const katalystPorts = [
      { port: 3000, name: 'web', description: 'Web application' },
      { port: 3001, name: 'shared', description: 'Shared components' },
      { port: 3002, name: 'mobile', description: 'Mobile application' },
      { port: 4000, name: 'api', description: 'API server' },
      { port: 5000, name: 'storybook', description: 'Component library' },
    ];

    for (const service of katalystPorts) {
      try {
        const tunnel = await createTunnel(service.port, {
          name: service.name,
          description: service.description,
          subdomain: `katalyst-${service.name}`,
        });

        console.log(`🚀 ${service.description} available at: ${tunnel.publicUrl}`);
      } catch (error) {
        console.warn(`Could not create tunnel for port ${service.port}:`, error);
      }
    }
  };

  const createTunnel = async (port: number, options: TunnelOptions = {}): Promise<NgrokTunnel> => {
    if (!api) throw new Error('Ngrok not initialized');

    const tunnel = await api.createTunnel({
      port,
      proto: options.proto || 'http',
      subdomain: options.subdomain,
      hostname: options.hostname,
      name: options.name,
      auth: options.auth,
      host_header: options.hostHeader || 'rewrite',
      bind_tls: options.bindTls !== false,
      metadata: JSON.stringify({
        katalyst: true,
        service: options.name || `port-${port}`,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        ...options.metadata,
      }),
    });

    // Apply default traffic policy if configured
    if (config.defaultPolicy) {
      await applyTrafficPolicy(tunnel.id, new TrafficPolicy(config.defaultPolicy));
    }

    // Update federation configuration if enabled
    if (config.federationConfig?.autoUpdateRemotes) {
      await updateFederationUrls();
    }

    // Generate QR code for mobile testing
    if (config.mobileConfig?.generateQRCodes && options.name === 'mobile') {
      const qrCode = await generateQRCode(tunnel.publicUrl);
      console.log(`📱 Mobile QR Code: ${qrCode}`);
    }

    // Notify team if enabled
    if (config.autoShare && config.teamNotifications) {
      await notifyTeam(
        `🚀 New tunnel created: ${tunnel.publicUrl} (${options.description || options.name})`
      );
    }

    setTunnels((prev) => [...prev, tunnel]);
    return tunnel;
  };

  const createCloudEndpoint = async (config: CloudEndpointConfig): Promise<CloudEndpoint> => {
    if (!api) throw new Error('Ngrok not initialized');

    const endpoint = await api.createCloudEndpoint({
      url: config.url,
      description: config.description,
      metadata: {
        katalyst: true,
        type: 'cloud-endpoint',
        ...config.metadata,
      },
      traffic_policy: config.trafficPolicy,
      forwards_to: config.forwardsTo,
    });

    setCloudEndpoints((prev) => [...prev, endpoint]);
    return endpoint;
  };

  const applyTrafficPolicy = async (tunnelId: string, policy: TrafficPolicy): Promise<void> => {
    if (!api) throw new Error('Ngrok not initialized');

    await api.updateTunnelPolicy(tunnelId, policy.compile());
  };

  const createABTest = async (config: ABTestConfig): Promise<ABTest> => {
    const policy = new TrafficPolicy().addRule({
      name: `ab-test-${config.name}`,
      match: config.match || [],
      actions: [
        {
          type: 'weighted-backends',
          config: config.variants.map((variant) => ({
            url: variant.url,
            weight: variant.weight,
            metadata: { variant: variant.name },
          })),
        },
      ],
    });

    await applyTrafficPolicy(config.tunnelId, policy);

    return {
      id: `ab-${config.name}`,
      name: config.name,
      variants: config.variants,
      metrics: await getTunnelMetrics(config.tunnelId),
    };
  };

  const shareModule = async (moduleName: string, port: number): Promise<string> => {
    const tunnel = await createTunnel(port, {
      name: `module-${moduleName}`,
      description: `Federated module: ${moduleName}`,
      subdomain: `katalyst-${moduleName}`,
    });

    const federationManager = new FederationManager();
    await federationManager.addRemote(moduleName, tunnel.publicUrl);

    return tunnel.publicUrl;
  };

  const updateFederationUrls = async (): Promise<void> => {
    const federationManager = new FederationManager();
    const activeTunnels = tunnels.filter((t) => t.config.metadata?.katalyst);

    for (const tunnel of activeTunnels) {
      const serviceName = tunnel.config.metadata?.service;
      if (serviceName) {
        await federationManager.updateRemote(serviceName, tunnel.publicUrl);
      }
    }
  };

  const generateQRCode = async (url: string): Promise<string> => {
    const qrApi = 'https://api.qrserver.com/v1/create-qr-code/';
    return `${qrApi}?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const notifyTeam = async (message: string, channels: string[] = []): Promise<void> => {
    console.log(`📢 Team notification: ${message}`);
  };

  const contextValue: NgrokContextValue = {
    createTunnel,
    destroyTunnel: async (tunnelId: string) => {
      if (!api) throw new Error('Ngrok not initialized');
      await api.destroyTunnel(tunnelId);
      setTunnels((prev) => prev.filter((t) => t.id !== tunnelId));
    },
    getTunnels: () => tunnels,
    getTunnelByPort: (port: number) => tunnels.find((t) => t.config.addr === port),
    createCloudEndpoint,
    updateCloudEndpoint: async (id: string, config: Partial<CloudEndpointConfig>) => {
      if (!api) throw new Error('Ngrok not initialized');
      const updated = await api.updateCloudEndpoint(id, config);
      setCloudEndpoints((prev) => prev.map((ep) => (ep.id === id ? updated : ep)));
      return updated;
    },
    deleteCloudEndpoint: async (id: string) => {
      if (!api) throw new Error('Ngrok not initialized');
      await api.deleteCloudEndpoint(id);
      setCloudEndpoints((prev) => prev.filter((ep) => ep.id !== id));
    },
    applyTrafficPolicy,
    createABTest,
    enableFeatureFlag: async (flag: string, condition: FeatureFlagCondition) => {
      const policy = new TrafficPolicy()
        .addRule({
          name: `feature-flag-${flag}`,
          match: [condition.match],
          actions: [
            {
              type: 'forward',
              config: { url: condition.enabledUrl },
            },
          ],
        })
        .addRule({
          name: `feature-flag-${flag}-default`,
          match: [],
          actions: [
            {
              type: 'forward',
              config: { url: condition.disabledUrl },
            },
          ],
        });

      await applyTrafficPolicy(condition.tunnelId, policy);
    },
    updateFederationUrls,
    shareModule,
    getTunnelMetrics: async (tunnelId: string) => {
      if (!api) throw new Error('Ngrok not initialized');
      return await api.getTunnelMetrics(tunnelId);
    },
    getTrafficAnalytics: async (timeframe: string) => {
      if (!api) throw new Error('Ngrok not initialized');
      return await api.getTrafficAnalytics(timeframe);
    },
    generateQRCode,
    notifyTeam,
    copyToClipboard: async (url: string) => {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        console.log(`📋 Copied to clipboard: ${url}`);
      }
    },
  };

  if (!isInitialized) {
    return <div>Initializing ngrok...</div>;
  }

  return <NgrokContext.Provider value={contextValue}>{children}</NgrokContext.Provider>;
}

export function useNgrok(): NgrokContextValue {
  const context = useContext(NgrokContext);
  if (!context) {
    throw new Error('useNgrok must be used within a NgrokProvider');
  }
  return context;
}

// Type definitions
export interface TunnelOptions {
  proto?: 'http' | 'https' | 'tcp' | 'tls';
  subdomain?: string;
  hostname?: string;
  name?: string;
  description?: string;
  auth?: string;
  hostHeader?: string;
  bindTls?: boolean;
  metadata?: Record<string, any>;
}

export interface NgrokTunnel {
  id: string;
  publicUrl: string;
  config: {
    addr: number;
    proto: string;
    name?: string;
    metadata?: Record<string, any>;
  };
  metrics: {
    conns: {
      count: number;
      gauge: number;
      rate1: number;
      rate5: number;
      rate15: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    http: {
      count: number;
      rate1: number;
      rate5: number;
      rate15: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
}

export interface CloudEndpointConfig {
  url: string;
  description?: string;
  metadata?: Record<string, any>;
  trafficPolicy?: any;
  forwardsTo?: string;
}

export interface CloudEndpoint {
  id: string;
  url: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  trafficPolicy?: any;
  forwardsTo?: string;
}

export interface ABTestConfig {
  name: string;
  tunnelId: string;
  match?: any[];
  variants: Array<{
    name: string;
    url: string;
    weight: number;
  }>;
}

export interface ABTest {
  id: string;
  name: string;
  variants: ABTestConfig['variants'];
  metrics: TunnelMetrics;
}

export interface FeatureFlagCondition {
  tunnelId: string;
  match: any;
  enabledUrl: string;
  disabledUrl: string;
}

export interface TunnelMetrics {
  requests: number;
  responses: number;
  bandwidth: number;
  latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface TrafficAnalytics {
  timeframe: string;
  totalRequests: number;
  uniqueVisitors: number;
  topPaths: Array<{ path: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
}

export interface TrafficPolicyConfig {
  name: string;
  rules: Array<{
    name: string;
    match: any[];
    actions: any[];
  }>;
}
